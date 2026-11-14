import { rankForExpertise, rankForProblem } from './graph/rank';
import { edgesAmong } from './graph/edges';
import { snapshot, ROLES, type Audience, type Role } from './data';
import { linksOf } from './profile';
import { interpretBuild, mentionedSkills } from './matching';
import { wantsLine, ROLE_LABEL } from './prefs';
import type { RankedPerson } from './graph/rank';
import type { Snapshot } from './data';

/** Their most relevant project (by similarity to the request), as "built X (year)"; used when the profile text matched best. */
function projectLead(s: Snapshot, r: RankedPerson): string {
  const ev = r.evidence.find((e) => e.kind === 'project');
  if (!ev) return 'has a profile close to what you described';
  const p = s.project.get(ev.id)!;
  const verb = ev.role === 'advisor' ? 'advised' : ev.role === 'founder' ? 'founded' : 'built';
  return `${verb} ${p.name} (${p.year})`;
}

/** Card fields for a ranked person: skills (the asked-for ones first), what they want, and a one-sentence reason from stored facts. */
function explainPerson(s: Snapshot, r: RankedPerson, asked: Set<string>, role: Role | null) {
  const skills = s.skillsOf.get(r.personId) ?? [];
  const matchedSkills = skills.filter((k) => asked.has(k));
  const first = r.name.split(' ')[0];
  const strength = r.score >= 0.7 ? 'Strong match' : r.score >= 0.5 ? 'Good match' : 'Possible match';
  const lead = r.matchedProblem
    ? `${r.matchedProblem.credit === 'helped' ? 'helped solve' : 'solved'} "${r.matchedProblem.description}" on ${r.matchedProblem.projectName} (${r.matchedProblem.year})`
    : /^Profile and skills match/.test(r.reasons[0] ?? '') ? projectLead(s, r) : (r.reasons[0] ?? '').replace(/, a close match for ".*"$/, '');
  const leadText = lead ? lead.charAt(0).toLowerCase() + lead.slice(1) : 'has related work on record';
  const parts = [`${first} ${leadText}`];
  if (matchedSkills.length) parts.push(`has ${matchedSkills.slice(0, 3).join(', ')} experience`);
  if (role && r.openTo.includes(role)) parts.push(`is open to ${ROLE_LABEL[role].toLowerCase()} roles`);
  const why = `${strength}: ${parts.length > 1 ? parts.slice(0, -1).join(', ') + ', and ' + parts.at(-1) : parts[0]}.`;
  const ties = r.reasons.filter((x) => /^(Worked with you|Same team as you|Same project family|Same major|Already connected)/.test(x));
  return { skills: [...matchedSkills, ...skills.filter((k) => !asked.has(k))].slice(0, 6), matchedSkills, wants: wantsLine(r.personId), why, strength, hours: s.person.get(r.personId)?.availability_hours ?? 0, ties };
}

/** match: Find Matches mode: the role (when chosen) is an eligibility check and ranking is deterministic (no Gemini rerank). */
export interface SearchRequest { kind: 'expertise' | 'stuck'; query: string; role?: Role | 'any'; audience?: Audience; log?: string; match?: boolean }

/** Ranking plus everything the relevance web and side panel need, in one payload. */
export async function runSearch(viewerId: string, req: SearchRequest) {
  const audience: Audience = req.audience === 'students' || req.audience === 'alumni' ? req.audience : 'both';
  const chosen = ROLES.includes(req.role as Role) ? (req.role as Role) : null;
  // "any role" in Find Matches: score role fit against what the text asks for, without filtering anyone out
  const role: Role = chosen ?? (req.match ? interpretBuild(req.query, 'build').roles[0] ?? 'Helper' : 'Advisor');
  const opts = req.match ? { ai: false, requireRole: !!chosen } : {};
  const text = req.kind === 'stuck' && req.log?.trim() ? `${req.query}\n${req.log.slice(0, 2000)}` : req.query;
  const out = req.kind === 'stuck' ? await rankForProblem(text, viewerId, audience) : await rankForExpertise(text, role, viewerId, audience, opts);
  const s = snapshot();
  const asked = new Set(mentionedSkills(s, text));
  const results = out.results.map((r) => ({
    ...r,
    ...explainPerson(s, r, asked, req.kind === 'stuck' ? null : role),
    built: (s.projectsOf.get(r.personId) ?? [])
      .map((m) => ({ ...m, p: s.project.get(m.project_id)! }))
      .sort((a, b) => b.p.year - a.p.year)
      .map(({ p, role, title }) => ({ id: p.id, name: p.name, year: p.year, team: p.team_name, teamType: p.team_type, role, title, outcome: p.outcome })),
    solved: (s.problemsBy.get(r.personId) ?? []).slice(0, 4).map((pb) => ({ id: pb.id, description: pb.description })),
    links: linksOf(r.personId),
  }));
  return {
    kind: req.kind,
    query: req.query,
    role: req.kind === 'stuck' ? null : role,
    audience,
    mode: out.mode,
    matcher: out.matcher,
    results,
    edges: edgesAmong(results.map((r) => r.personId)),
  };
}
export type SearchResponse = Awaited<ReturnType<typeof runSearch>>;
export type SearchResult = SearchResponse['results'][number];
