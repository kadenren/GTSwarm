import { getDb, bumpDataVersion } from './db';
import { snapshot, type Person } from './data';
import { ActionError, sendRequest } from './actions';
import { tokenize, similarity } from './search';
import { membershipOf, audienceOf, isVerifiedAlum } from './access';
import { requestMentorship } from './community';
import { warmPath } from './graph/path';

/**
 * Find People: purpose-based discovery with consent built in.
 * Order of operations, always: visibility and contact preferences first, then relevance, then a plain-English reason
 * built only from stored facts. Requests are checked again on the server when sent.
 */

export const PURPOSES = [
  { id: 'meet', label: 'Meet fellow Yellow Jackets', hint: 'Shared city or interests' },
  { id: 'mentorship', label: 'Career advice or mentorship', hint: 'Only alumni who chose to mentor' },
  { id: 'networking', label: 'Industry networking', hint: 'Peers in a field you work in or want to explore' },
  { id: 'collaborate', label: 'Work on something together', hint: 'Startups, research or projects' },
] as const;
export type Purpose = (typeof PURPOSES)[number]['id'];
export const purposeLabel = (p: string) => PURPOSES.find((x) => x.id === p || x.label === p)?.label ?? p;
const isPurpose = (p: unknown): p is Purpose => PURPOSES.some((x) => x.id === p);

export interface ContactPrefs { openToStudents: boolean; openToAlumni: boolean; openToCollab: boolean; unavailable: boolean; shareCity: boolean; interests: string[]; canHelp: string; interestedIn: string }
const parse = <T,>(s: string | null | undefined, d: T): T => { try { return s ? (JSON.parse(s) as T) : d; } catch { return d; } };

export function contactPrefsOf(personId: string): ContactPrefs {
  const r = getDb().prepare('SELECT * FROM contact_pref WHERE person_id = ?').get(personId) as Record<string, unknown> | undefined;
  if (!r) return { openToStudents: true, openToAlumni: true, openToCollab: true, unavailable: false, shareCity: false, interests: [], canHelp: '', interestedIn: '' };
  return { openToStudents: !!r.open_to_students, openToAlumni: !!r.open_to_alumni, openToCollab: !!r.open_to_collab, unavailable: !!r.unavailable, shareCity: !!r.share_city,
    interests: parse<string[]>(r.interests as string, []), canHelp: String(r.can_help ?? ''), interestedIn: String(r.interested_in ?? '') };
}

export function saveContactPrefs(viewerId: string, input: Partial<ContactPrefs>) {
  const cur = contactPrefsOf(viewerId);
  const v = { ...cur, ...input };
  const interests = (Array.isArray(v.interests) ? v.interests : []).map((x) => String(x).trim()).filter(Boolean).slice(0, 12);
  getDb().prepare('INSERT OR REPLACE INTO contact_pref (person_id, open_to_students, open_to_alumni, open_to_collab, unavailable, share_city, interests, can_help, interested_in) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(viewerId, v.openToStudents ? 1 : 0, v.openToAlumni ? 1 : 0, v.openToCollab ? 1 : 0, v.unavailable ? 1 : 0, v.shareCity ? 1 : 0, JSON.stringify(interests), String(v.canHelp ?? '').slice(0, 200), String(v.interestedIn ?? '').slice(0, 200));
  bumpDataVersion();
  return { saved: true };
}

/** An available mentor: opted in, accepting, has capacity, and mentors people like the viewer. */
function mentorFor(viewerId: string, personId: string): { topics: string[] } | null {
  const db = getDb();
  const m = db.prepare('SELECT accepting, topics, mentees, capacity FROM mentor_profile WHERE person_id = ?').get(personId) as { accepting: number; topics: string; mentees: string; capacity: number } | undefined;
  if (!m || !m.accepting) return null;
  const active = (db.prepare("SELECT COUNT(*) n FROM mentorship WHERE mentor_id = ? AND status = 'active'").get(personId) as { n: number }).n;
  if (active >= m.capacity) return null;
  if (!parse<string[]>(m.mentees, []).includes(audienceOf(membershipOf(viewerId).status))) return null;
  return { topics: parse<string[]>(m.topics, []) };
}

/** Students see students and alumni who welcome students; verified alumni see every participating member. */
export function visibleTo(viewerId: string, p: Person): boolean {
  if (!p.claimed || p.id === viewerId) return false;
  if (isVerifiedAlum(membershipOf(viewerId).status)) return true;
  return p.type === 'student' || contactPrefsOf(p.id).openToStudents;
}

/** Whether this viewer may send this person this kind of request. Used for display and enforced again on send. */
export function canRequest(viewerId: string, personId: string, purpose: Purpose): { ok: boolean; reason: string | null } {
  const p = snapshot().person.get(personId);
  if (!p || !p.claimed) return { ok: false, reason: 'This person is not on GT Swarm.' };
  const first = p.name.split(' ')[0];
  const prefs = contactPrefsOf(personId);
  if (prefs.unavailable) return { ok: false, reason: `${first} is not taking requests right now.` };
  const viewerIsAlum = isVerifiedAlum(membershipOf(viewerId).status);
  if (!viewerIsAlum && !prefs.openToStudents) return { ok: false, reason: `${first} is not taking requests from students right now.` };
  if (viewerIsAlum && !prefs.openToAlumni) return { ok: false, reason: `${first} is not taking requests from alumni right now.` };
  if (purpose === 'mentorship' && !mentorFor(viewerId, personId)) return { ok: false, reason: `${first} is not offering mentorship to ${viewerIsAlum ? 'alumni' : 'students'} right now.` };
  if (purpose === 'collaborate' && !prefs.openToCollab) return { ok: false, reason: `${first} is not looking to collaborate right now.` };
  return { ok: true, reason: null };
}

const andList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const affiliation = (p: Person) => (p.type === 'alum' ? `Alum, class of ${p.grad_year}` : `Student, class of ${p.grad_year}`);

/** One or two plain sentences, only from stored facts: shared city, shared interests, their work, what they welcome. */
export function whyConnect(viewerId: string, p: Person, purpose: Purpose | null): string {
  const s = snapshot();
  const me = s.person.get(viewerId);
  const mine = contactPrefsOf(viewerId), theirs = contactPrefsOf(p.id);
  const first = p.name.split(' ')[0];
  const myTags = new Set([...mine.interests, ...(s.skillsOf.get(viewerId) ?? [])].map((x) => x.toLowerCase()));
  const sameCity = mine.shareCity && theirs.shareCity && me?.city && p.city === me.city;
  const shared = [...new Set([...theirs.interests, ...(s.skillsOf.get(p.id) ?? [])])].filter((x) => myTags.has(x.toLowerCase()) && !(sameCity && x.toLowerCase() === (p.city ?? "").toLowerCase())).slice(0, 2);
  // lowercase the job title ("Clinical Engineer" -> "clinical engineer") but keep acronyms and the organization after at/of/for
  const role = p.current_role ? (() => { let org = false; return p.current_role.split(' ').map((w) => { if (/^(at|of|for)$/.test(w)) org = true; return !org && /^[A-Z][a-z]+$/.test(w) ? w.toLowerCase() : w; }).join(' '); })() : '';
  const work = role ? `is ${/^[aeiou]/i.test(role) ? 'an' : 'a'} ${role}` : p.type === 'student' ? `studies ${p.major}` : `studied ${p.major}`;
  const facts = [sameCity ? `lives in ${p.city}, like you` : null, shared.length ? `you both listed ${andList(shared)}` : null].filter(Boolean) as string[];
  const mentor = mentorFor(viewerId, p.id);
  const welcome = purpose === 'mentorship' && mentor ? `is open to mentoring ${audienceOf(membershipOf(viewerId).status)} on ${andList(mentor.topics.slice(0, 2).map(lower))}`
    : theirs.canHelp ? `can help with ${lower(theirs.canHelp)}` : '';
  const one = `${first} ${work}${welcome ? ` and ${welcome}` : ''}.`;
  return facts.length ? `${one} ${facts.map((f, i) => (i === 0 ? f.charAt(0).toUpperCase() + f.slice(1) : f)).join('; ')}.` : one;
}

export interface PersonResult { id: string; name: string; affiliation: string; type: 'student' | 'alum'; summary: string; reason: string; welcomes: string[]; available: boolean; blockedReason: string | null; city: string | null; score: number }

function welcomes(viewerId: string, personId: string): string[] {
  const p = contactPrefsOf(personId);
  if (p.unavailable) return ['Not taking requests right now'];
  const out: string[] = [];
  if (p.openToStudents) out.push('students');
  if (p.openToAlumni) out.push('alumni');
  const list = out.length ? [`Open to ${out.join(' and ')}`] : [];
  if (mentorFor(viewerId, personId)) list.push('Mentoring');
  if (p.openToCollab) list.push('Open to collaborating');
  return list;
}

export interface FindOptions { q?: string; purpose?: string; who?: string; industry?: string; city?: string; mentor?: boolean }

export async function findPeople(viewerId: string, o: FindOptions): Promise<PersonResult[]> {
  const s = snapshot();
  const me = s.person.get(viewerId);
  const purpose: Purpose | null = isPurpose(o.purpose) ? o.purpose : null;
  const wantMentor = o.mentor || purpose === 'mentorship';
  const mine = contactPrefsOf(viewerId);
  // 1. eligibility and visibility first
  let pool = s.people.filter((p) => visibleTo(viewerId, p));
  if (o.who === 'alumni') pool = pool.filter((p) => p.type === 'alum');
  if (o.who === 'students') pool = pool.filter((p) => p.type === 'student');
  if (o.industry) pool = pool.filter((p) => p.company_type === o.industry);
  if (o.city) pool = pool.filter((p) => contactPrefsOf(p.id).shareCity && p.city === o.city);
  if (wantMentor) pool = pool.filter((p) => !!mentorFor(viewerId, p.id) && !contactPrefsOf(p.id).unavailable);

  // 2. relevance: the search text (keyword + synonyms, plus Gemini when enabled) or the member's own interests
  const q = (o.q ?? '').trim();
  const sims = q ? (await similarity(q)).sims : null;
  const qTokens = new Set(tokenize(q).filter((t) => !t.includes('_')));
  const myTags = new Set([...mine.interests, ...(s.skillsOf.get(viewerId) ?? [])].map((x) => x.toLowerCase()));
  const scored = pool.map((p) => {
    const prefs = contactPrefsOf(p.id);
    const docs = [p.id, ...(s.projectsOf.get(p.id) ?? []).map((m) => m.project_id), ...(s.problemsBy.get(p.id) ?? []).map((pb) => pb.id)];
    const tags = [...prefs.interests, ...(s.skillsOf.get(p.id) ?? [])];
    const extra = tokenize(`${prefs.interests.join(' ')} ${prefs.canHelp} ${prefs.interestedIn} ${p.current_role ?? ''} ${prefs.shareCity ? p.city ?? '' : ''}`).filter((t) => !t.includes('_'));
    let score: number;
    if (q) {
      const doc = Math.max(0, ...docs.map((id) => sims!.get(id) ?? 0));
      const hit = qTokens.size ? extra.filter((t) => qTokens.has(t)).length / qTokens.size : 0;
      score = 0.6 * doc + 0.4 * Math.min(1, hit);
    } else {
      const shared = tags.filter((t) => myTags.has(t.toLowerCase())).length;
      const city = mine.shareCity && prefs.shareCity && me?.city && p.city === me.city ? 1 : 0;
      score = 0.15 * Math.min(shared, 4) + 0.4 * city;
    }
    return { p, score };
  }).filter((x) => (q ? x.score > 0.05 : true));

  // 3. available people first, then by relevance; explain with stored facts
  return scored
    .map(({ p, score }) => {
      const check = canRequest(viewerId, p.id, purpose ?? 'meet');
      const prefs = contactPrefsOf(p.id);
      return {
        id: p.id, name: p.name, affiliation: affiliation(p), type: p.type, summary: p.current_role ?? `${p.major} student`,
        reason: whyConnect(viewerId, p, purpose), welcomes: welcomes(viewerId, p.id), available: check.ok, blockedReason: check.reason,
        city: prefs.shareCity ? p.city : null, score,
      };
    })
    .sort((a, b) => Number(b.available) - Number(a.available) || b.score - a.score || a.name.localeCompare(b.name));
}

/** A member's profile as this viewer may see it: only consented fields, plus how they are connected (documented ties only). */
export function profileFor(viewerId: string, personId: string) {
  const s = snapshot();
  const p = s.person.get(personId);
  if (!p || !visibleTo(viewerId, p)) return null;
  const prefs = contactPrefsOf(personId);
  const mentor = mentorFor(viewerId, personId);
  const path = warmPath(viewerId, personId);
  return {
    id: p.id, name: p.name, type: p.type, affiliation: affiliation(p), major: p.major, currentRole: p.current_role, bio: p.bio,
    city: prefs.shareCity ? p.city : null, interests: prefs.interests, canHelp: prefs.canHelp, interestedIn: prefs.interestedIn,
    skills: (s.skillsOf.get(personId) ?? []).slice(0, 8), welcomes: welcomes(viewerId, personId), mentorTopics: mentor?.topics ?? [],
    why: whyConnect(viewerId, p, null),
    path: path && path.hops > 0 && path.hops <= 4 ? path.text : null,
    purposes: PURPOSES.map((x) => ({ ...x, ...canRequest(viewerId, personId, x.id) })),
  };
}

/** Send a request with a purpose and the sender's own note. Mentorship uses the mentorship workflow; the rest use the Inbox. */
export function sendConnectRequest(viewerId: string, personId: string, purpose: string, note: string) {
  if (!isPurpose(purpose)) throw new ActionError('Pick what you want to connect about.');
  if (viewerId === personId) throw new ActionError('You cannot send a request to yourself.');
  const p = snapshot().person.get(personId);
  if (!p || !visibleTo(viewerId, p)) throw new ActionError('This person is not available.', 404);
  const check = canRequest(viewerId, personId, purpose);
  if (!check.ok) throw new ActionError(check.reason ?? 'Not available.', 403);
  const message = note.trim().slice(0, 600) || `Hi ${p.name.split(' ')[0]}, I found you on GT Swarm and would like to connect.`;
  if (purpose === 'mentorship') {
    const topic = mentorFor(viewerId, personId)?.topics[0] ?? 'Career advice';
    const r = requestMentorship(viewerId, personId, topic, message);
    return { kind: 'mentorship', id: r.id, duplicate: r.duplicate };
  }
  const r = sendRequest({ from: viewerId, to: personId, kind: 'expertise', role: purposeLabel(purpose) as never, message, projectId: null });
  return { kind: 'connection', id: r.id, duplicate: r.duplicate };
}
