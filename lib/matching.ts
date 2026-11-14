import { snapshot, ROLES, type Role, type Snapshot } from './data';
import { similarity } from './search';
import { listBuilds, INDUSTRY_BY_DOMAIN, type BuildCard } from './builds';
import { rankForExpertise, sharedTies, type RankedPerson } from './graph/rank';
import { warmPath } from './graph/path';
import { prefsOf } from './prefs';

/**
 * Two-sided matching for the startup exchange (deterministic and testable):
 *  - interpretBuild: what someone is building or wants to build -> domains, skills, roles
 *  - recommendBuilds: person or description -> active builds that need them
 *  - recommendCollaborators: build -> people for each open role (reuses the existing ranking)
 * Weights favour demonstrated work, skills and willingness to collaborate over shared majors or years.
 */
// S text similarity · K skills they need that you have · R a role they need that you are open to
// I industry and startup interest · O open and at an early stage · T shared ties
export const BUILD_WEIGHTS = { S: 0.35, K: 0.25, R: 0.2, I: 0.1, O: 0.05, T: 0.05 } as const;

const ROLE_WORDS: [RegExp, Role][] = [
  [/co-?founder|founding (partner|team)|partner to (build|start)/i, 'Cofounder'],
  [/advis|mentor|regulat|fda|been through|guidance|expert/i, 'Advisor'],
  [/engineer|developer|firmware|hire|intern|teammate|designer|build(er)?s? (to join|for)/i, 'Early engineer'],
  [/customer|pilot (user|site)|beta|early adopter/i, 'First customer'],
  [/help|stuck|review|feedback/i, 'Helper'],
];

const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function mentionedSkills(s: Snapshot, text: string): string[] {
  const lower = text.toLowerCase();
  const found = s.skills.map((k) => k.name).filter((n) => n.length > 2 && new RegExp(`(^|[^a-z0-9])${escapeRe(n.toLowerCase())}([^a-z0-9]|$)`).test(lower));
  // synonyms people actually type
  const extra: [RegExp, string][] = [[/\bfirmware\b/i, 'Firmware'], [/bluetooth|\bble\b/i, 'BLE'], [/fda|510\(?k\)?|regulatory/i, 'FDA regulatory'], [/medical/i, 'Medical devices'], [/wearable/i, 'Wearables'], [/robot/i, 'Robotics'], [/embedded/i, 'Embedded systems'], [/machine learning|\bml\b|\bai\b/i, 'Machine learning and software'], [/autonomous|self-driving/i, 'LiDAR'], [/drone|satellite|cubesat|aerospace/i, 'Aerospace'], [/solar|grid|battery|energy/i, 'Energy systems'], [/manufactur/i, 'Manufacturing']];
  for (const [re, name] of extra) if (re.test(text) && s.skills.some((k) => k.name === name)) found.push(name);
  return [...new Set(found)];
}

export interface Interpretation { domains: string[]; industries: string[]; skills: string[]; roles: Role[]; need: string; building: string }

/** "I'm building X and need Y" -> domains, skills and the roles being asked for. */
export function interpretBuild(text: string, mode: 'build' | 'join' = 'build'): Interpretation {
  const s = snapshot();
  const t = text.trim();
  const split = t.split(/\b(?:and |but |so )?(?:i |we )?(?:need|looking for|want|seeking|searching for|hiring)\b/i);
  const building = split[0].replace(/^(i'?m|i am|we'?re|we are)\s+(building|making|creating|working on)\s+/i, '').trim();
  const need = split.length > 1 ? split.slice(1).join(' ').trim() : t;
  const skills = mentionedSkills(s, t);
  const domains = [...new Set(skills.filter((k) => k in INDUSTRY_BY_DOMAIN))];
  let roles = [...new Set(ROLE_WORDS.filter(([re]) => re.test(mode === 'join' ? t : need)).map(([, r]) => r))];
  if (mode === 'build' && /startup|company|venture/i.test(t) && !roles.includes('Cofounder') && roles.length < 2) roles = ['Cofounder', ...roles];
  if (!roles.length) roles = mode === 'join' ? ['Early engineer', 'Helper'] : ['Cofounder', 'Early engineer', 'Advisor'];
  return { domains, industries: [...new Set(domains.map((d) => INDUSTRY_BY_DOMAIN[d]))], skills: skills.filter((k) => !(k in INDUSTRY_BY_DOMAIN)), roles: roles.slice(0, 3), need: need || t, building: building || t };
}

export interface BuildMatch { build: BuildCard; score: number; components: Record<keyof typeof BUILD_WEIGHTS, number>; reasons: string[]; why: string; summary: string; matchedSkills: string[]; matchedRoles: Role[]; hops: number | null }

/** Person-to-project: which open builds need this person (or the person described in the text). */
export async function recommendBuilds(input: { viewerId: string; personId?: string; text?: string; roles?: Role[]; limit?: number; includeClosed?: boolean; requireRoles?: boolean }): Promise<BuildMatch[]> {
  const s = snapshot();
  const person = input.personId ? s.person.get(input.personId) : undefined;
  const prefs = person ? prefsOf(person.id) : null;
  const text = input.text?.trim() || (person ? [prefs?.lookingFor ?? '', person.bio, ...(s.skillsOf.get(person.id) ?? []), ...(s.projectsOf.get(person.id) ?? []).map((m) => s.project.get(m.project_id)!.summary)].join(' ') : '');
  if (!text) return [];
  const { sims } = await similarity(text);
  const mySkills = new Set((person ? s.skillsOf.get(person.id) ?? [] : []).concat(mentionedSkills(s, text)));
  const myRoles = new Set<Role>(input.roles ?? (person?.open_to.length ? person.open_to : interpretBuild(text, 'join').roles));
  const mine = new Set((s.projectsOf.get(input.personId ?? input.viewerId) ?? []).map((m) => m.project_id));
  // role willingness is an eligibility check when the roles come from the person or an explicit choice
  const builds = listBuilds().filter((b) => (input.includeClosed || b.open) && !mine.has(b.id) && !(input.requireRoles && myRoles.size && !b.rolesNeeded.some((r) => myRoles.has(r))));
  const wantIndustries = new Set(interpretBuild(text, 'join').industries);
  const wantsStartup = /startup|company|venture|founding/i.test(input.text ?? '') || !!prefs?.interests.includes('join');
  const maxSim = Math.max(1e-6, ...builds.map((b) => sims.get(b.id) ?? 0));
  const rows = builds.map((b) => {
    const projectSkills = new Set([...(s.projectSkillNames.get(b.id) ?? []), ...mentionedSkills(s, b.helpNeeded)]);
    const matchedSkills = [...mySkills].filter((k) => projectSkills.has(k));
    const matchedRoles = b.rolesNeeded.filter((r) => myRoles.has(r));
    const ties = input.personId && b.owner ? sharedTies(s, input.personId, b.owner.id).filter((t) => t !== 'Already connected with you') : [];
    const c = {
      S: (sims.get(b.id) ?? 0) / maxSim,
      K: Math.min(1, matchedSkills.length / Math.min(3, Math.max(1, projectSkills.size))),
      R: matchedRoles.length ? 1 : 0.3,
      O: (b.open ? 0.7 : 0) + (['Prototype', 'Testing', 'Pilot'].includes(b.stage) ? 0.3 : 0.1),
      T: Math.min(ties.length, 2) / 2,
      I: 0.5 * (wantIndustries.has(b.industry) ? 1 : 0) + 0.5 * (wantsStartup && b.isStartup ? 1 : 0),
    };
    const score = BUILD_WEIGHTS.S * c.S + BUILD_WEIGHTS.K * c.K + BUILD_WEIGHTS.R * c.R + BUILD_WEIGHTS.I * c.I + BUILD_WEIGHTS.O * c.O + BUILD_WEIGHTS.T * c.T;
    return { b, c, score, matchedSkills, matchedRoles, ties };
  }).sort((x, y) => y.score - x.score || x.b.name.localeCompare(y.b.name)).slice(0, input.limit ?? 6);

  return rows.map(({ b, c, score, matchedSkills, matchedRoles, ties }) => {
    const path = b.owner ? warmPath(input.viewerId, b.owner.id) : null;
    const reasons: string[] = [];
    if (matchedRoles.length) reasons.push(`Looking for ${matchedRoles.map((r) => r.toLowerCase()).join(' and ')}${person ? `, which ${person.name.split(' ')[0]} is open to` : ''}`);
    if (matchedSkills.length) reasons.push(`Needs ${matchedSkills.slice(0, 3).join(', ')}${person ? ', which is on your record' : ', which you mentioned'}`);
    if (c.S > 0.5) reasons.push(`What they are building is close to ${person ? 'your past work' : 'what you described'}`);
    if (ties.length) reasons.push(ties[0]);
    if (path && path.hops > 0 && path.hops <= 4) reasons.push(`${path.hops} ${path.hops === 1 ? 'introduction' : 'introductions'} away: ${path.text}`);
    if (b.helpNeeded) reasons.push(`They need: ${b.helpNeeded}`);
    const owner = b.owner ? `${b.owner.name} (${b.owner.type === 'alum' ? b.owner.label : 'student'})` : 'the team';
    const roleText = (r: Role) => (r === 'Early engineer' ? 'an engineer' : r === 'Advisor' ? 'an advisor' : r === 'Helper' ? 'a collaborator' : `a ${r.toLowerCase()}`);
    const strength = score >= 0.7 ? 'Strong match' : score >= 0.5 ? 'Good match' : 'Possible match';
    const yours = person ? 'you have' : 'you mentioned';
    const sentence = matchedSkills.length && matchedRoles.length ? `${strength} because ${yours} ${matchedSkills.slice(0, 3).join(', ')} experience and ${b.name} is seeking ${roleText(matchedRoles[0])}.`
      : matchedRoles.length ? `${strength} because ${b.name} is seeking ${roleText(matchedRoles[0])}, a role you are open to${c.S > 0.5 ? ', and its work is close to yours' : ''}.`
      : matchedSkills.length ? `${strength} because ${b.name} needs ${matchedSkills.slice(0, 3).join(', ')}, which ${person ? 'is on your record' : 'you mentioned'}.`
      : `${strength} because what ${b.name} is building is close to ${person ? 'your past work' : 'what you described'}.`;
    const summary = `${b.name} is a ${b.stage.toLowerCase()}-stage ${b.isStartup ? 'startup' : b.teamType + ' project'} led by ${owner}` +
      (matchedRoles.length ? ` that needs ${matchedRoles[0] === 'Early engineer' ? 'an early engineer' : `a ${matchedRoles[0].toLowerCase()}`}` : '') +
      (matchedSkills.length ? ` with ${matchedSkills.slice(0, 2).join(' and ')}` : '') + '.';
    return { build: b, score: Math.round(score * 1000) / 1000, components: c, reasons, why: sentence, summary, matchedSkills, matchedRoles, hops: path?.hops ?? null };
  });
}

export interface RoleRecommendation { role: Role; people: RankedPerson[] }

/** Project-to-person: for each role a build needs, who in the swarm fits (the team itself is excluded). */
export async function recommendCollaborators(projectId: string, viewerId: string, perRole = 3, opts: { ai?: boolean } = {}): Promise<RoleRecommendation[]> {
  const s = snapshot();
  const b = listBuilds().find((x) => x.id === projectId);
  const p = s.project.get(projectId);
  if (!p) return [];
  const team = new Set((s.membersOf.get(projectId) ?? []).map((m) => m.person_id));
  const roles: Role[] = (b?.rolesNeeded.length ? b.rolesNeeded : (['Early engineer', 'Advisor'] as Role[])).filter((r) => ROLES.includes(r)).slice(0, 3);
  const query = [b?.helpNeeded || p.summary, p.technologies.join(', ')].filter(Boolean).join(' ');
  const out: RoleRecommendation[] = [];
  for (const role of roles) {
    const audience = role === 'Early engineer' ? 'both' : role === 'Advisor' ? 'alumni' : 'both';
    const ranked = await rankForExpertise(query, role, viewerId, audience, { ai: opts.ai ?? false });
    out.push({ role, people: ranked.results.filter((r) => !team.has(r.personId) && r.openTo.includes(role)).slice(0, perRole) });
  }
  return out;
}
