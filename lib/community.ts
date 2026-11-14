import { getDb, bumpDataVersion } from './db';
import { snapshot } from './data';
import { ActionError } from './actions';
import { tokenize } from './search';
import { prefsOf } from './prefs';
import { rankForExpertise } from './graph/rank';
import { membershipOf, meetsEligibility, isVerifiedAlum, requireCapability, can, audienceOf, type Eligibility, type MembershipStatus } from './access';

/**
 * GT Swarm 2.0 community features: groups, events, opportunities and mentorship.
 * Every write checks permissions here, on the server. Recommendations are deterministic and explained with stored facts;
 * mentor ranking reuses the hybrid people matcher (keyword + optional Gemini semantic relevance).
 */

const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const parse = <T,>(s: string | null | undefined, d: T): T => { try { return s ? (JSON.parse(s) as T) : d; } catch { return d; } };
const nextId = (table: string, prefix: string) => {
  const n = (getDb().prepare(`SELECT COUNT(*) n FROM ${table}`).get() as { n: number }).n + 1;
  let id = `${prefix}${String(n).padStart(3, '0')}`;
  for (let i = n + 1; getDb().prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(id); i++) id = `${prefix}${String(i).padStart(3, '0')}`;
  return id;
};
const andList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** People the member already knows: teammates on shared projects and accepted connections (excluded from "new people" lists). */
export function alreadyKnown(personId: string): Set<string> {
  const s = snapshot();
  const out = new Set<string>([personId]);
  for (const m of s.projectsOf.get(personId) ?? []) for (const x of s.membersOf.get(m.project_id) ?? []) out.add(x.person_id);
  for (const c of s.connections) if (c.status === 'active' && (c.from_person === personId || c.to_person === personId)) out.add(c.from_person === personId ? c.to_person : c.from_person);
  return out;
}

/** A short, factual reason for a recommended person: their closest record plus skills you share (no query text echoed back). */
export function personReason(viewerId: string, otherId: string, lead: string | undefined) {
  const s = snapshot();
  const shared = overlap(s.skillsOf.get(viewerId) ?? [], s.skillsOf.get(otherId) ?? []);
  const record = (lead ?? '').replace(/, a close match for "[\s\S]*$/, '').replace(/^Profile and skills match "[\s\S]*$/, '');
  const parts = [record, shared.length ? `shares your ${andList(shared.slice(0, 3))} experience` : ''].filter(Boolean);
  return parts.length ? parts.join('; ') + '.' : 'Related documented work.';
}

/** What a member has said about themselves: skills, bio, projects and what they are looking for. Used to rank and explain. */
export function memberProfileText(personId: string) {
  const s = snapshot();
  const p = s.person.get(personId);
  if (!p) return { skills: [] as string[], text: '' };
  const skills = s.skillsOf.get(personId) ?? [];
  const projects = (s.projectsOf.get(personId) ?? []).map((m) => s.project.get(m.project_id)!).map((pr) => `${pr.name}: ${pr.summary}`);
  const prefs = prefsOf(personId);
  return { skills, text: [p.bio, prefs.lookingFor, skills.join(', '), ...projects].join('\n') };
}

const overlap = (mine: string[], theirs: string[]) => {
  const set = new Set(mine.map((x) => x.toLowerCase()));
  return theirs.filter((x) => set.has(x.toLowerCase()));
};
const tokenOverlap = (a: string, b: string) => {
  const ta = new Set(tokenize(a).filter((t) => !t.includes('_')));
  const tb = new Set(tokenize(b).filter((t) => !t.includes('_')));
  if (!tb.size) return 0;
  let n = 0;
  for (const t of tb) if (ta.has(t)) n++;
  return n / tb.size;
};

// ---------------------------------------------------------------- groups

export interface GroupRow { id: string; name: string; description: string; category: string; access: 'open' | 'request'; eligibility: Eligibility; admin_id: string | null; interests: string }
export type GroupStanding = 'admin' | 'member' | 'pending' | 'can-join' | 'can-request' | 'ineligible';

export interface GroupView {
  id: string; name: string; description: string; category: string; access: 'open' | 'request'; eligibility: Eligibility; interests: string[];
  memberCount: number; standing: GroupStanding; adminName: string | null;
  members: { id: string; name: string; label: string }[] | null; // null when the viewer may not see the list
  pending: { id: string; name: string }[]; // join requests, only for admins
}

function standingIn(viewerId: string, g: GroupRow, status: MembershipStatus): GroupStanding {
  const row = getDb().prepare('SELECT role, status FROM group_member WHERE group_id = ? AND person_id = ?').get(g.id, viewerId) as { role: string; status: string } | undefined;
  if (row?.status === 'active') return row.role === 'admin' ? 'admin' : 'member';
  if (row?.status === 'pending') return 'pending';
  if (!meetsEligibility(status, g.eligibility)) return 'ineligible';
  return g.access === 'open' ? 'can-join' : 'can-request';
}

export function groupView(viewerId: string, g: GroupRow): GroupView {
  const db = getDb();
  const s = snapshot();
  const status = membershipOf(viewerId).status;
  const standing = standingIn(viewerId, g, status);
  const rows = db.prepare("SELECT person_id FROM group_member WHERE group_id = ? AND status = 'active' ORDER BY role DESC, created_at").all(g.id) as { person_id: string }[];
  // member lists: visible to members, and to eligible members of the community for groups they could join
  const mayList = standing === 'admin' || standing === 'member' || (standing !== 'ineligible' && g.eligibility === 'all') || can(viewerId, 'group.manage.any');
  const label = (id: string) => { const p = s.person.get(id); return p ? (p.type === 'alum' ? `alum '${String(p.grad_year).slice(2)}` : 'student') : ''; };
  const isAdmin = standing === 'admin' || can(viewerId, 'group.manage.any');
  return {
    id: g.id, name: g.name, description: g.description, category: g.category, access: g.access, eligibility: g.eligibility, interests: parse<string[]>(g.interests, []),
    memberCount: rows.length, standing, adminName: g.admin_id ? s.person.get(g.admin_id)?.name ?? null : null,
    members: mayList ? rows.map((r) => ({ id: r.person_id, name: s.person.get(r.person_id)?.name ?? 'Member', label: label(r.person_id) })) : null,
    pending: isAdmin ? (db.prepare("SELECT person_id FROM group_member WHERE group_id = ? AND status = 'pending'").all(g.id) as { person_id: string }[]).map((r) => ({ id: r.person_id, name: s.person.get(r.person_id)?.name ?? 'Member' })) : [],
  };
}

const groupRow = (id: string) => getDb().prepare('SELECT * FROM community_group WHERE id = ?').get(id) as GroupRow | undefined;
export const listGroups = (viewerId: string) => (getDb().prepare('SELECT * FROM community_group ORDER BY name').all() as GroupRow[]).map((g) => groupView(viewerId, g));
export function getGroup(viewerId: string, id: string) { const g = groupRow(id); return g ? groupView(viewerId, g) : null; }

export function joinGroup(viewerId: string, groupId: string): { status: 'active' | 'pending' } {
  const g = groupRow(groupId);
  if (!g) throw new ActionError('Group not found.', 404);
  const status = membershipOf(viewerId).status;
  const standing = standingIn(viewerId, g, status);
  if (standing === 'admin' || standing === 'member') return { status: 'active' };
  if (standing === 'pending') return { status: 'pending' };
  if (standing === 'ineligible') throw new ActionError(g.eligibility === 'verified_alumni' ? 'This group is for verified alumni.' : 'This group is for current students.', 403);
  const next = g.access === 'open' ? 'active' : 'pending';
  getDb().prepare('INSERT INTO group_member (group_id, person_id, role, status, created_at) VALUES (?,?,?,?,?)').run(groupId, viewerId, 'member', next, now());
  bumpDataVersion();
  return { status: next };
}

export function leaveGroup(viewerId: string, groupId: string) {
  const db = getDb();
  const row = db.prepare('SELECT role FROM group_member WHERE group_id = ? AND person_id = ?').get(groupId, viewerId) as { role: string } | undefined;
  if (!row) return { left: false };
  if (row.role === 'admin') {
    const admins = (db.prepare("SELECT COUNT(*) n FROM group_member WHERE group_id = ? AND role = 'admin' AND status = 'active'").get(groupId) as { n: number }).n;
    if (admins <= 1) throw new ActionError('Hand the group to another admin before leaving.', 409);
  }
  db.prepare('DELETE FROM group_member WHERE group_id = ? AND person_id = ?').run(groupId, viewerId);
  bumpDataVersion();
  return { left: true };
}

/** Group admins (or platform admins) approve or decline join requests. */
export function decideGroupRequest(viewerId: string, groupId: string, personId: string, approve: boolean) {
  const db = getDb();
  const mine = db.prepare("SELECT role FROM group_member WHERE group_id = ? AND person_id = ? AND status = 'active'").get(groupId, viewerId) as { role: string } | undefined;
  if (mine?.role !== 'admin' && !can(viewerId, 'group.manage.any')) throw new ActionError('Only group admins can review requests.', 403);
  const req = db.prepare("SELECT 1 FROM group_member WHERE group_id = ? AND person_id = ? AND status = 'pending'").get(groupId, personId);
  if (!req) throw new ActionError('No pending request.', 404);
  const g = groupRow(groupId)!;
  if (approve && !meetsEligibility(membershipOf(personId).status, g.eligibility)) throw new ActionError('This person is not eligible for the group.', 403);
  if (approve) db.prepare("UPDATE group_member SET status = 'active' WHERE group_id = ? AND person_id = ?").run(groupId, personId);
  else db.prepare('DELETE FROM group_member WHERE group_id = ? AND person_id = ?').run(groupId, personId);
  bumpDataVersion();
  return { approved: approve };
}

export function recommendGroups(viewerId: string, limit = 3) {
  const { skills, text } = memberProfileText(viewerId);
  return listGroups(viewerId)
    .filter((g) => g.standing === 'can-join' || g.standing === 'can-request')
    .map((g) => {
      const shared = overlap(skills, g.interests);
      const score = shared.length * 0.6 + tokenOverlap(text, `${g.name} ${g.description} ${g.interests.join(' ')}`);
      const why = shared.length ? `Shares your interest in ${andList(shared.slice(0, 3))}.` : `Open to ${g.eligibility === 'all' ? 'students and alumni' : g.eligibility === 'students' ? 'students' : 'verified alumni'}; matches topics in your profile.`;
      return { group: g, score, why };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ---------------------------------------------------------------- events

interface EventRow { id: string; title: string; description: string; organizer: string; group_id: string | null; category: string; starts_at: string; ends_at: string; timezone: string; location: string; virtual: number; audience: 'all' | 'students' | 'verified_alumni' | 'group'; capacity: number | null; reg_deadline: string | null; interests: string }
export interface EventView {
  id: string; title: string; category: string; startsAt: string; endsAt: string; timezone: string; audience: EventRow['audience']; groupName: string | null;
  access: 'full' | 'teaser'; organizer: string;
  description: string | null; location: string | null; virtual: boolean | null; // null when the viewer is not eligible to see details
  capacity: number | null; going: number; spotsLeft: number | null; regDeadline: string | null; past: boolean; registrationClosed: boolean;
  myRsvp: 'going' | 'cancelled' | null; interests: string[];
}

function eventAccess(viewerId: string, e: EventRow): 'full' | 'teaser' {
  if (can(viewerId, 'group.manage.any')) return 'full';
  const status = membershipOf(viewerId).status;
  if (e.audience === 'all') return 'full';
  if (e.audience === 'students') return meetsEligibility(status, 'students') ? 'full' : 'teaser';
  if (e.audience === 'verified_alumni') return isVerifiedAlum(status) ? 'full' : 'teaser';
  const member = e.group_id && getDb().prepare("SELECT 1 FROM group_member WHERE group_id = ? AND person_id = ? AND status = 'active'").get(e.group_id, viewerId);
  return member ? 'full' : 'teaser';
}

export const EVENT_AUDIENCE_LABEL: Record<EventRow['audience'], string> = { all: 'Open to students and alumni', students: 'Students only', verified_alumni: 'Verified alumni only', group: 'Group members only' };

function eventView(viewerId: string, e: EventRow): EventView {
  const db = getDb();
  const access = eventAccess(viewerId, e);
  const going = (db.prepare("SELECT COUNT(*) n FROM event_rsvp WHERE event_id = ? AND status = 'going'").get(e.id) as { n: number }).n;
  const mine = db.prepare('SELECT status FROM event_rsvp WHERE event_id = ? AND person_id = ?').get(e.id, viewerId) as { status: 'going' | 'cancelled' } | undefined;
  const t = today();
  const past = e.ends_at.slice(0, 10) < t;
  const group = e.group_id ? (db.prepare('SELECT name FROM community_group WHERE id = ?').get(e.group_id) as { name: string } | undefined)?.name ?? null : null;
  return {
    id: e.id, title: e.title, category: e.category, startsAt: e.starts_at, endsAt: e.ends_at, timezone: e.timezone, audience: e.audience, groupName: group, access, organizer: e.organizer,
    description: access === 'full' ? e.description : null, location: access === 'full' ? e.location : null, virtual: access === 'full' ? !!e.virtual : null,
    capacity: e.capacity, going, spotsLeft: e.capacity == null ? null : Math.max(0, e.capacity - going), regDeadline: e.reg_deadline,
    past, registrationClosed: past || (!!e.reg_deadline && e.reg_deadline < t), myRsvp: mine?.status ?? null, interests: parse<string[]>(e.interests, []),
  };
}

const eventRow = (id: string) => getDb().prepare('SELECT * FROM community_event WHERE id = ?').get(id) as EventRow | undefined;
export const listEvents = (viewerId: string) => (getDb().prepare('SELECT * FROM community_event ORDER BY starts_at').all() as EventRow[]).map((e) => eventView(viewerId, e));
export function getEvent(viewerId: string, id: string) { const e = eventRow(id); return e ? eventView(viewerId, e) : null; }

export function rsvp(viewerId: string, eventId: string) {
  const db = getDb();
  const e = eventRow(eventId);
  if (!e) throw new ActionError('Event not found.', 404);
  const v = eventView(viewerId, e);
  if (v.access !== 'full') throw new ActionError(`This event is for ${EVENT_AUDIENCE_LABEL[e.audience].replace(/ only$/, '').toLowerCase()}.`, 403);
  if (v.registrationClosed) throw new ActionError('Registration for this event has closed.', 409);
  if (v.myRsvp === 'going') throw new ActionError('You are already registered.', 409);
  if (v.spotsLeft !== null && v.spotsLeft <= 0) throw new ActionError('This event is full.', 409);
  if (v.myRsvp === 'cancelled') db.prepare("UPDATE event_rsvp SET status = 'going', created_at = ? WHERE event_id = ? AND person_id = ?").run(now(), eventId, viewerId);
  else db.prepare("INSERT INTO event_rsvp (event_id, person_id, status, created_at) VALUES (?,?,'going',?)").run(eventId, viewerId, now());
  bumpDataVersion();
  return { status: 'going' as const };
}

export function cancelRsvp(viewerId: string, eventId: string) {
  const r = getDb().prepare("UPDATE event_rsvp SET status = 'cancelled' WHERE event_id = ? AND person_id = ? AND status = 'going'").run(eventId, viewerId);
  if (!r.changes) throw new ActionError('You are not registered for this event.', 404);
  bumpDataVersion();
  return { status: 'cancelled' as const };
}

export function recommendEvents(viewerId: string, limit = 3) {
  const { skills, text } = memberProfileText(viewerId);
  const myGroups = new Set((getDb().prepare("SELECT group_id FROM group_member WHERE person_id = ? AND status = 'active'").all(viewerId) as { group_id: string }[]).map((r) => r.group_id));
  return (getDb().prepare('SELECT * FROM community_event ORDER BY starts_at').all() as EventRow[])
    .map((e) => ({ e, v: eventView(viewerId, e) }))
    .filter(({ v }) => v.access === 'full' && !v.past && v.myRsvp !== 'going')
    .map(({ e, v }) => {
      const shared = overlap(skills, v.interests);
      const inGroup = !!e.group_id && myGroups.has(e.group_id);
      const score = shared.length * 0.5 + (inGroup ? 0.6 : 0) + tokenOverlap(text, `${e.title} ${e.description} ${v.interests.join(' ')}`) + (v.audience !== 'all' ? 0.2 : 0);
      const why = inGroup ? `From ${v.groupName}, a group you are in.` : shared.length ? `Matches your interest in ${andList(shared.slice(0, 3))}.` : `${EVENT_AUDIENCE_LABEL[v.audience]}; related to your profile.`;
      return { event: v, score, why };
    })
    .filter((x) => x.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ---------------------------------------------------------------- opportunities

interface OppRow { id: string; kind: 'internship' | 'full-time' | 'part-time' | 'startup'; title: string; org: string; description: string; location: string; mode: string; skills: string; majors: string; audience: 'students' | 'alumni' | 'both'; class_years: string; deadline: string | null; apply: string; posted_by: string | null; project_id: string | null; status: 'published' | 'pending' | 'rejected'; published_at: string; expires_at: string; synthetic: number }
export interface OpportunityView {
  id: string; kind: OppRow['kind']; title: string; org: string; description: string; location: string; mode: string; skills: string[]; majors: string[];
  audience: OppRow['audience']; classYears: string; deadline: string | null; apply: string; postedBy: string | null; projectId: string | null;
  status: OppRow['status']; publishedAt: string; expiresAt: string; expired: boolean; synthetic: boolean; saved: boolean; eligible: boolean; ineligibleReason: string | null;
}

/** Whether the viewer meets an opportunity's audience and class-year requirements. */
function eligibility(viewerId: string, o: OppRow): { ok: boolean; reason: string | null } {
  const status = membershipOf(viewerId).status;
  const aud = audienceOf(status);
  if (o.audience !== 'both' && o.audience !== aud) return { ok: false, reason: o.audience === 'students' ? 'For current students' : 'For verified alumni' };
  if (o.class_years && aud === 'students') {
    const [a, b] = o.class_years.split('-').map(Number);
    const year = snapshot().person.get(viewerId)?.grad_year ?? 0;
    if (a && b && (year < a || year > b)) return { ok: false, reason: `For classes of ${a} to ${b}` };
  }
  return { ok: true, reason: null };
}

/** Students see student and shared postings; alumni see alumni and shared postings. Pending postings are visible to their author and moderators. */
function visible(viewerId: string, o: OppRow): boolean {
  if (o.status === 'published') {
    const aud = audienceOf(membershipOf(viewerId).status);
    return o.audience === 'both' || o.audience === aud || can(viewerId, 'opportunity.moderate');
  }
  return o.posted_by === viewerId || can(viewerId, 'opportunity.moderate');
}

function oppView(viewerId: string, o: OppRow): OpportunityView {
  const saved = !!getDb().prepare('SELECT 1 FROM saved_opportunity WHERE person_id = ? AND opportunity_id = ?').get(viewerId, o.id);
  const el = eligibility(viewerId, o);
  return {
    id: o.id, kind: o.kind, title: o.title, org: o.org, description: o.description, location: o.location, mode: o.mode, skills: parse<string[]>(o.skills, []), majors: parse<string[]>(o.majors, []),
    audience: o.audience, classYears: o.class_years, deadline: o.deadline, apply: o.apply, postedBy: o.posted_by ? snapshot().person.get(o.posted_by)?.name ?? null : null, projectId: o.project_id,
    status: o.status, publishedAt: o.published_at, expiresAt: o.expires_at, expired: o.expires_at < today(), synthetic: !!o.synthetic, saved, eligible: el.ok, ineligibleReason: el.reason,
  };
}

const oppRow = (id: string) => getDb().prepare('SELECT * FROM opportunity WHERE id = ?').get(id) as OppRow | undefined;
export function listOpportunities(viewerId: string) {
  requireCapability(viewerId, 'opportunity.view', 'Sign in to see opportunities.');
  return (getDb().prepare('SELECT * FROM opportunity ORDER BY published_at DESC').all() as OppRow[]).filter((o) => visible(viewerId, o)).map((o) => oppView(viewerId, o));
}

export function recommendOpportunities(viewerId: string, limit = 3) {
  const { skills, text } = memberProfileText(viewerId);
  const major = snapshot().person.get(viewerId)?.major ?? '';
  return listOpportunities(viewerId)
    .filter((o) => o.status === 'published' && !o.expired && o.eligible)
    .map((o) => {
      const shared = overlap(skills, o.skills);
      const majorFit = o.majors.includes(major);
      const textFit = tokenOverlap(text, `${o.title} ${o.description}`);
      // a major or loosely related wording is not a reason: a recommendation needs at least one shared skill
      const score = shared.length ? 0.55 * Math.min(1, shared.length / Math.min(3, Math.max(1, o.skills.length))) + 0.3 * textFit + (majorFit ? 0.15 : 0) : 0;
      const parts = [shared.length ? `your ${andList(shared.slice(0, 3))} experience aligns with this ${o.kind === 'internship' ? 'internship' : 'role'}` : null, majorFit ? `it lists your major (${major})` : null].filter(Boolean) as string[];
      const why = parts.length ? `Recommended because ${andList(parts)}.` : 'Related to topics in your profile.';
      return { opportunity: o, score, why, matchedSkills: shared };
    })
    .filter((x) => x.score > 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function setSaved(viewerId: string, oppId: string, save: boolean) {
  const o = oppRow(oppId);
  if (!o || !visible(viewerId, o)) throw new ActionError('Opportunity not found.', 404);
  if (save) getDb().prepare('INSERT OR IGNORE INTO saved_opportunity (person_id, opportunity_id, created_at) VALUES (?,?,?)').run(viewerId, oppId, now());
  else getDb().prepare('DELETE FROM saved_opportunity WHERE person_id = ? AND opportunity_id = ?').run(viewerId, oppId);
  bumpDataVersion();
  return { saved: save };
}

export interface NewOpportunity { kind: OppRow['kind']; title: string; org: string; description: string; location: string; mode: string; skills: string[]; audience: OppRow['audience']; deadline?: string | null; apply: string }

/** Verified alumni may propose postings; they wait for a moderator. Only moderators publish directly. */
export function postOpportunity(viewerId: string, input: NewOpportunity) {
  requireCapability(viewerId, 'opportunity.post', 'Only verified alumni can post opportunities.');
  if (!['internship', 'full-time', 'part-time', 'startup'].includes(input.kind)) throw new ActionError('Pick a type.');
  if (!input.title?.trim() || !input.org?.trim() || !input.description?.trim() || !input.apply?.trim()) throw new ActionError('Title, organization, description and how to apply are required.');
  const published = can(viewerId, 'opportunity.moderate');
  const id = nextId('opportunity', 'opp:o');
  const expires = input.deadline || new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);
  getDb().prepare('INSERT INTO opportunity (id, kind, title, org, description, location, mode, skills, majors, audience, class_years, deadline, apply, posted_by, project_id, status, published_at, expires_at, synthetic) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)')
    .run(id, input.kind, input.title.trim(), input.org.trim(), input.description.trim(), input.location?.trim() || 'Not specified', input.mode?.trim() || 'Not specified',
      JSON.stringify((input.skills ?? []).map((x) => x.trim()).filter(Boolean)), '[]', ['students', 'alumni', 'both'].includes(input.audience) ? input.audience : 'both', '', input.deadline || null, input.apply.trim(), viewerId, null, published ? 'published' : 'pending', today(), expires);
  bumpDataVersion();
  return { id, status: published ? 'published' : 'pending' };
}

export function moderateOpportunity(viewerId: string, oppId: string, approve: boolean) {
  requireCapability(viewerId, 'opportunity.moderate', 'Only moderators can review postings.');
  const r = getDb().prepare("UPDATE opportunity SET status = ? WHERE id = ? AND status = 'pending'").run(approve ? 'published' : 'rejected', oppId);
  if (!r.changes) throw new ActionError('No pending posting.', 404);
  bumpDataVersion();
  return { status: approve ? 'published' : 'rejected' };
}

// ---------------------------------------------------------------- mentorship

export interface MentorView {
  id: string; name: string; label: string; currentRole: string | null; major: string; topics: string[]; mentees: string[]; capacity: number; active: number;
  accepting: boolean; contact: string; note: string; skills: string[];
}

function mentorRows() {
  return getDb().prepare('SELECT * FROM mentor_profile').all() as { person_id: string; accepting: number; topics: string; mentees: string; capacity: number; contact: string; note: string }[];
}
const activeMentees = (mentorId: string) => (getDb().prepare("SELECT COUNT(*) n FROM mentorship WHERE mentor_id = ? AND status = 'active'").get(mentorId) as { n: number }).n;

export function mentors(viewerId: string, opts: { topic?: string; includeFull?: boolean } = {}): MentorView[] {
  const s = snapshot();
  const myAudience = audienceOf(membershipOf(viewerId).status);
  return mentorRows()
    .filter((m) => m.person_id !== viewerId && s.person.get(m.person_id))
    .map((m) => {
      const p = s.person.get(m.person_id)!;
      return { id: p.id, name: p.name, label: p.type === 'alum' ? `alum '${String(p.grad_year).slice(2)}` : 'student', currentRole: p.current_role, major: p.major,
        topics: parse<string[]>(m.topics, []), mentees: parse<string[]>(m.mentees, []), capacity: m.capacity, active: activeMentees(p.id), accepting: !!m.accepting, contact: m.contact, note: m.note, skills: s.skillsOf.get(p.id) ?? [] };
    })
    .filter((m) => m.mentees.includes(myAudience))
    .filter((m) => opts.includeFull || (m.accepting && m.active < m.capacity))
    .filter((m) => !opts.topic || m.topics.includes(opts.topic));
}

/** Mentors ranked for this member with the same hybrid matcher used for people search, explained with real records. */
export async function recommendMentors(viewerId: string, limit = 3) {
  const list = mentors(viewerId);
  if (!list.length) return [];
  const { skills, text } = memberProfileText(viewerId);
  const byId = new Map(list.map((m) => [m.id, m]));
  let ranked: { id: string; score: number; reason: string | null }[] = [];
  if (text.trim()) {
    const out = await rankForExpertise(text.slice(0, 1200), 'Advisor', viewerId, 'both', { ai: false });
    ranked = out.results.filter((r) => byId.has(r.personId)).map((r) => ({ id: r.personId, score: r.score, reason: r.reasons[0] ?? null }));
  }
  const seen = new Set(ranked.map((r) => r.id));
  for (const m of list) if (!seen.has(m.id)) ranked.push({ id: m.id, score: 0.1 * overlap(skills, m.skills).length, reason: null });
  return ranked
    .map((r) => {
      const m = byId.get(r.id)!;
      const shared = overlap(skills, m.skills);
      const lead = shared.length ? `${andList(shared.slice(0, 3))} experience` : m.currentRole ? `work as ${m.currentRole.charAt(0).toLowerCase()}${m.currentRole.slice(1)}` : 'documented projects';
      return { mentor: m, score: r.score + 0.05 * shared.length, why: `Relevant mentor because of ${lead}, and mentors on ${andList(m.topics.slice(0, 2).map((t) => t.toLowerCase()))}.`, evidence: r.reason };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function requestMentorship(viewerId: string, mentorId: string, topic: string, message: string) {
  requireCapability(viewerId, 'mentorship.request', 'You cannot request mentorship.');
  if (viewerId === mentorId) throw new ActionError('You cannot mentor yourself.');
  const m = mentors(viewerId, { includeFull: true }).find((x) => x.id === mentorId);
  if (!m) throw new ActionError('This person is not offering mentorship to members like you.', 403);
  if (!m.accepting) throw new ActionError(`${m.name.split(' ')[0]} is not taking new mentees right now.`, 409);
  if (m.active >= m.capacity) throw new ActionError(`${m.name.split(' ')[0]} has no mentoring capacity right now.`, 409);
  const dup = getDb().prepare("SELECT id, status FROM mentorship WHERE mentor_id = ? AND mentee_id = ? AND status IN ('requested','active')").get(mentorId, viewerId) as { id: string; status: string } | undefined;
  if (dup) return { id: dup.id, duplicate: true };
  const id = nextId('mentorship', 'mentorship:m');
  getDb().prepare("INSERT INTO mentorship (id, mentor_id, mentee_id, topic, message, status, created_at) VALUES (?,?,?,?,?,'requested',?)")
    .run(id, mentorId, viewerId, topic || m.topics[0] || '', message.trim() || 'Would you be open to mentoring me?', now());
  bumpDataVersion();
  return { id, duplicate: false };
}

/** Only the mentor can accept or decline; accepting creates a mentorship, nothing else (no connection, role or job). */
export function decideMentorship(viewerId: string, id: string, accept: boolean) {
  const db = getDb();
  const r = db.prepare('SELECT * FROM mentorship WHERE id = ?').get(id) as { mentor_id: string; status: string } | undefined;
  if (!r) throw new ActionError('Request not found.', 404);
  if (r.mentor_id !== viewerId) throw new ActionError('Only the mentor can respond.', 403);
  if (r.status !== 'requested') throw new ActionError('This request was already answered.', 409);
  if (accept) {
    const cap = (db.prepare('SELECT capacity FROM mentor_profile WHERE person_id = ?').get(viewerId) as { capacity: number } | undefined)?.capacity ?? 0;
    if (activeMentees(viewerId) >= cap) throw new ActionError('You are at your mentoring capacity. Raise it or end a mentorship first.', 409);
  }
  db.prepare('UPDATE mentorship SET status = ?, decided_at = ? WHERE id = ?').run(accept ? 'active' : 'declined', now(), id);
  bumpDataVersion();
  return { status: accept ? 'active' : 'declined' };
}

export function endMentorship(viewerId: string, id: string) {
  const r = getDb().prepare('SELECT mentor_id, mentee_id, status FROM mentorship WHERE id = ?').get(id) as { mentor_id: string; mentee_id: string; status: string } | undefined;
  if (!r || (r.mentor_id !== viewerId && r.mentee_id !== viewerId)) throw new ActionError('Mentorship not found.', 404);
  if (r.status !== 'active') throw new ActionError('This mentorship is not active.', 409);
  getDb().prepare("UPDATE mentorship SET status = 'ended', decided_at = ? WHERE id = ?").run(now(), id);
  bumpDataVersion();
  return { status: 'ended' };
}

export function mentorshipsOf(viewerId: string) {
  const s = snapshot();
  const rows = getDb().prepare('SELECT * FROM mentorship WHERE mentor_id = ? OR mentee_id = ? ORDER BY created_at DESC').all(viewerId, viewerId) as { id: string; mentor_id: string; mentee_id: string; topic: string; message: string; status: string; created_at: string }[];
  return rows.map((r) => ({ ...r, mentorName: s.person.get(r.mentor_id)?.name ?? 'Mentor', menteeName: s.person.get(r.mentee_id)?.name ?? 'Member', iAmMentor: r.mentor_id === viewerId }));
}

export function myMentorProfile(viewerId: string) {
  const r = getDb().prepare('SELECT * FROM mentor_profile WHERE person_id = ?').get(viewerId) as { accepting: number; topics: string; mentees: string; capacity: number; contact: string; note: string } | undefined;
  return r ? { accepting: !!r.accepting, topics: parse<string[]>(r.topics, []), mentees: parse<string[]>(r.mentees, []), capacity: r.capacity, contact: r.contact, note: r.note } : null;
}

export const MENTOR_TOPICS = ['Career advice', 'Industry exploration', 'Graduate school', 'Engineering guidance', 'Entrepreneurship', 'Product management', 'Research', 'Interview preparation', 'Technical project guidance'] as const;

export function saveMentorProfile(viewerId: string, input: { accepting: boolean; topics: string[]; mentees: string[]; capacity: number; contact: string; note: string }) {
  requireCapability(viewerId, 'mentorship.offer', 'Mentoring is open to verified alumni.');
  const topics = (input.topics ?? []).filter((t) => (MENTOR_TOPICS as readonly string[]).includes(t));
  const mentees = (input.mentees ?? []).filter((t) => t === 'students' || t === 'alumni');
  const capacity = Math.max(0, Math.min(10, Math.round(Number(input.capacity) || 0)));
  getDb().prepare('INSERT OR REPLACE INTO mentor_profile (person_id, accepting, topics, mentees, capacity, contact, note) VALUES (?,?,?,?,?,?,?)')
    .run(viewerId, input.accepting ? 1 : 0, JSON.stringify(topics), JSON.stringify(mentees.length ? mentees : ['students']), capacity, (input.contact || 'In-app messages').slice(0, 80), (input.note || '').slice(0, 280));
  bumpDataVersion();
  return { saved: true };
}
