import { snapshot, lineageRoot, personLabel, type Audience, type Person, type Role, type Snapshot } from '../data';
import { similarity, type SearchMode } from '../search';
import { warmPath, type WarmPath } from './path';
import { describeFromEvidence, type Description } from './describe';
import { geminiMatch } from '../matchmaker';
import { geminiEnabled } from '../gemini';

/**
 * Ranking = a transparent weighted sum of five normalized components.
 *   score = 0.55 E + 0.20 X + 0.10 T + 0.10 R + 0.05 A
 * E  text match: max similarity of the query vs the person's profile, projects and solved problems (min-max scaled)
 * X  documented experience: how much of their record is among the 20 closest projects/problems
 * T  shared ties with the viewer (same project, team, project family or major), capped
 * R  role fit: 1 if they are open to the role, 0.3 otherwise
 * A  availability: hours per week relative to the most available candidate
 * Eligibility filters (claimed, not the viewer, audience) are applied before scoring. No per-person boosts exist.
 */
export const WEIGHTS = { E: 0.55, X: 0.2, T: 0.1, R: 0.1, A: 0.05 } as const;
const TOP_DOCS = 20;
const TIE_CAP = 3;
const RESULT_COUNT = 12;

export interface Evidence { kind: 'person' | 'project' | 'problem'; id: string; sim: number; role?: string }
export interface Components { E: number; X: number; T: number; R: number; A: number }
export interface RankedPerson {
  personId: string;
  name: string;
  type: 'student' | 'alum';
  label: string;
  major: string;
  gradYear: number;
  currentRole: string | null;
  score: number;
  rank: number;
  ring: 1 | 2 | 3;
  components: Components;
  reasons: string[];
  evidence: Evidence[];
  matchedProblem: { id: string; description: string; solution: string; projectId: string; projectName: string; year: number; credit: 'solved' | 'helped' } | null;
  description: Description;
  aiReason: string | null;
  path: WarmPath | null;
  openTo: Role[];
}
export interface RankOutput { query: string; role: Role | null; audience: Audience; mode: SearchMode; matcher: 'gemini' | 'graph'; results: RankedPerson[] }

const MATCH_POOL = 16;

/** Compact, factual record of a candidate for the Gemini matchmaker. */
function candidateSummary(s: Snapshot, p: Person): string {
  const lines = [
    `${p.type === 'alum' ? `Alum, ${p.major} ${p.grad_year}` : `${p.major} student, class of ${p.grad_year}`}${p.current_role ? `; ${p.current_role}` : ''}. Open to: ${p.open_to.join(', ') || 'not set'}. ${p.availability_hours} h/week.`,
    `Bio: ${p.bio}`,
    ...(s.projectsOf.get(p.id) ?? []).slice(0, 5).map((m) => { const pr = s.project.get(m.project_id)!; return `Project (${m.role}, ${pr.year}): ${pr.name}: ${pr.summary}${pr.outcome ? ` Outcome: ${pr.outcome}.` : ''}`; }),
    ...(s.problemsBy.get(p.id) ?? []).slice(0, 4).map((pb) => `Solved: ${pb.description}. Fix: ${pb.solution}`),
  ];
  return lines.join('\n').slice(0, 1800);
}

interface Ctx { s: Snapshot; sims: Map<string, number>; viewerId: string; topDocs: Set<string> }

function eligible(s: Snapshot, viewerId: string, audience: Audience): Person[] {
  return s.people.filter((p) => p.claimed && p.id !== viewerId && (audience === 'both' || (audience === 'students' ? p.type === 'student' : p.type === 'alum')));
}

function evidenceFor(ctx: Ctx, p: Person): Evidence[] {
  const { s, sims } = ctx;
  const ev: Evidence[] = [{ kind: 'person', id: p.id, sim: sims.get(p.id) ?? 0 }];
  for (const m of s.projectsOf.get(p.id) ?? []) ev.push({ kind: 'project', id: m.project_id, sim: sims.get(m.project_id) ?? 0, role: m.role });
  for (const pb of s.problemsBy.get(p.id) ?? []) ev.push({ kind: 'problem', id: pb.id, sim: sims.get(pb.id) ?? 0, role: pb.solved_by === p.id ? 'solved' : 'helped' });
  return ev.sort((a, b) => b.sim - a.sim);
}

/** Shared ties between the viewer and a candidate, as readable strings. */
export function sharedTies(s: Snapshot, viewerId: string, personId: string): string[] {
  const ties: string[] = [];
  const mine = s.projectsOf.get(viewerId) ?? [];
  const theirs = s.projectsOf.get(personId) ?? [];
  const theirIds = new Set(theirs.map((m) => m.project_id));
  const counted = new Set<string>();
  for (const m of mine) if (theirIds.has(m.project_id)) {
    const pr = s.project.get(m.project_id)!;
    ties.push(`Worked with you on ${pr.name} (${pr.year})`);
    counted.add(pr.team_name);
  }
  const myTeams = new Set(mine.map((m) => s.project.get(m.project_id)!.team_name));
  for (const m of theirs) {
    const pr = s.project.get(m.project_id)!;
    if (myTeams.has(pr.team_name) && !counted.has(pr.team_name)) { ties.push(`Same team as you: ${pr.team_name}`); counted.add(pr.team_name); }
  }
  const myRoots = new Map(mine.map((m) => [lineageRoot(s, m.project_id), m.project_id]));
  const seenRoots = new Set<string>();
  for (const m of theirs) {
    const root = lineageRoot(s, m.project_id);
    if (myRoots.has(root) && !theirIds.has(myRoots.get(root)!) && !seenRoots.has(root)) {
      seenRoots.add(root);
      const pr = s.project.get(m.project_id)!;
      ties.push(`Same project family as ${s.project.get(myRoots.get(root)!)!.name}: built ${pr.name} (${pr.year})`);
    }
  }
  const me = s.person.get(viewerId), them = s.person.get(personId);
  if (me && them && me.major === them.major) ties.push(`Same major (${me.major})`);
  const direct = s.connections.find((c) => c.source !== 'shared-project' && ((c.from_person === viewerId && c.to_person === personId) || (c.from_person === personId && c.to_person === viewerId)));
  if (direct) ties.push('Already connected with you');
  return ties;
}

function describeEvidence(s: Snapshot, e: Evidence, query: string): string {
  if (e.kind === 'problem') {
    const pb = s.problem.get(e.id)!;
    const pr = s.project.get(pb.project_id)!;
    return `${e.role === 'helped' ? 'Helped solve' : 'Solved'} "${pb.description}" on ${pr.name} (${pr.year})`;
  }
  if (e.kind === 'project') {
    const pr = s.project.get(e.id)!;
    const verb = e.role === 'advisor' ? 'Advised' : e.role === 'founder' ? 'Founded' : e.role === 'maintainer' ? 'Maintains' : 'Built';
    return `${verb} ${pr.name} (${pr.team_name}, ${pr.year}), a close match for "${query}"`;
  }
  return `Profile and skills match "${query}"`;
}

async function rank(kind: 'expertise' | 'problem', query: string, role: Role | null, viewerId: string, audience: Audience, opts: RankOptions = {}): Promise<RankOutput> {
  const s = snapshot();
  const q = query.trim();
  if (!q) return { query: q, role, audience, mode: s.searchMode, matcher: 'graph', results: [] };
  const { sims, mode } = await similarity(q);
  const docs = [...s.projects.map((p) => p.id), ...s.problems.map((p) => p.id)]
    .map((id) => [id, sims.get(id) ?? 0] as const)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_DOCS);
  const ctx: Ctx = { s, sims, viewerId, topDocs: new Set(docs.map(([id]) => id)) };
  const people = eligible(s, viewerId, audience).filter((p) => !(opts.requireRole && role && kind === 'expertise') || p.open_to.includes(role!));
  const maxHours = Math.max(1, ...people.map((p) => p.availability_hours));
  const fitRole: Role = kind === 'problem' ? 'Helper' : role ?? 'Helper';

  const rows = people.map((p) => {
    const evidence = evidenceFor(ctx, p);
    let eRaw: number;
    if (kind === 'problem') {
      const probSim = Math.max(0, ...evidence.filter((e) => e.kind === 'problem').map((e) => e.sim));
      const otherSim = Math.max(0, ...evidence.filter((e) => e.kind !== 'problem').map((e) => e.sim));
      eRaw = Math.max(probSim, 0.5 * otherSim);
    } else {
      eRaw = Math.max(0, evidence[0]?.sim ?? 0);
    }
    const records = evidence.filter((e) => e.kind !== 'person');
    const inTop = records.filter((e) => ctx.topDocs.has(e.id)).length;
    const X = records.length ? 0.5 * (inTop / records.length) + 0.5 * (Math.min(inTop, 3) / 3) : 0;
    const ties = sharedTies(s, viewerId, p.id);
    const T = Math.min(ties.filter((t) => t !== 'Already connected with you').length, TIE_CAP) / TIE_CAP;
    const R = p.open_to.includes(fitRole) ? 1 : 0.3;
    const A = p.availability_hours / maxHours;
    return { p, evidence, eRaw, X, T, R, A, ties, inTop, records: records.length };
  });

  const eMax = Math.max(...rows.map((r) => r.eRaw)), eMin = Math.min(...rows.map((r) => r.eRaw));
  if (eMax <= 0) return { query: q, role, audience, mode, matcher: 'graph', results: [] };
  let scored = rows.map((r) => {
    const E = eMax > eMin ? (r.eRaw - eMin) / (eMax - eMin) : 0;
    const c: Components = { E, X: r.X, T: r.T, R: r.R, A: r.A };
    const score = WEIGHTS.E * c.E + WEIGHTS.X * c.X + WEIGHTS.T * c.T + WEIGHTS.R * c.R + WEIGHTS.A * c.A;
    return { ...r, c, score };
  });
  scored.sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name));

  // Gemini matchmaker: rescore the graph's shortlist by reading each candidate's record against the request
  let matcher: 'gemini' | 'graph' = 'graph';
  const aiReasons = new Map<string, string>();
  if (geminiEnabled() && opts.ai !== false) {
    const pool = scored.slice(0, MATCH_POOL).filter((r) => r.eRaw > 0);
    const verdicts = await geminiMatch({ request: q, role: kind === 'problem' ? null : role, kind, candidates: pool.map((r) => ({ id: r.p.id, name: r.p.name, summary: candidateSummary(s, r.p) })) });
    if (verdicts) {
      matcher = 'gemini';
      for (const r of pool) {
        const v = verdicts.get(r.p.id);
        if (!v) continue;
        r.c = { ...r.c, E: v.fit };
        r.score = WEIGHTS.E * r.c.E + WEIGHTS.X * r.c.X + WEIGHTS.T * r.c.T + WEIGHTS.R * r.c.R + WEIGHTS.A * r.c.A;
        if (v.reason) aiReasons.set(r.p.id, v.reason);
      }
      pool.sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name));
      const inPool = new Set(pool.map((r) => r.p.id));
      scored = [...pool, ...scored.filter((r) => !inPool.has(r.p.id))];
    }
  }
  const top = scored.slice(0, RESULT_COUNT).filter((r) => r.eRaw > 0);

  const results: RankedPerson[] = top.map((r, i) => {
    const best = r.evidence[0];
    const problemEv = r.evidence.find((e) => e.kind === 'problem' && e.sim > 0);
    const leadEv = kind === 'problem' && problemEv ? problemEv : best;
    const reasons: string[] = [describeEvidence(s, leadEv, q)];
    const second = r.evidence.find((e) => e !== leadEv && e.kind !== 'person' && e.sim > 0.25);
    if (second) reasons.push(describeEvidence(s, second, q).replace(/, a close match for ".*"$/, ''));
    if (r.inTop) reasons.push(`${r.inTop} of ${r.records} documented projects and problems are among the ${TOP_DOCS} closest matches`);
    else reasons.push('No documented projects among the closest matches yet');
    reasons.push(r.R === 1 ? `Open to ${fitRole} conversations` : `Not listed as open to ${fitRole}, so role fit is lower`);
    reasons.push(...r.ties.slice(0, 2));
    reasons.push(`About ${r.p.availability_hours} hours a week available`);

    let matchedProblem: RankedPerson['matchedProblem'] = null;
    if (problemEv) {
      const pb = s.problem.get(problemEv.id)!;
      const pr = s.project.get(pb.project_id)!;
      matchedProblem = { id: pb.id, description: pb.description, solution: pb.solution, projectId: pr.id, projectName: pr.name, year: pr.year, credit: problemEv.role === 'helped' ? 'helped' : 'solved' };
    }
    const path = warmPath(viewerId, r.p.id);
    const description = describeFromEvidence({ s, person: r.p, viewerId, query: q, role: kind === 'problem' ? null : role, lead: leadEv, evidence: r.evidence, ties: r.ties, path, openToRole: r.R === 1 });
    return {
      personId: r.p.id, name: r.p.name, type: r.p.type, label: personLabel(r.p), major: r.p.major, gradYear: r.p.grad_year, currentRole: r.p.current_role,
      score: Math.round(r.score * 1000) / 1000, rank: i + 1, ring: i < 3 ? 1 : i < 7 ? 2 : 3,
      components: r.c, reasons, evidence: r.evidence.slice(0, 5), matchedProblem: kind === 'problem' ? matchedProblem : matchedProblem && problemEv!.sim > 0.4 ? matchedProblem : null,
      description, path, openTo: r.p.open_to, aiReason: aiReasons.get(r.p.id) ?? null,
    };
  });
  return { query: q, role, audience, mode, matcher, results };
}

/** ai: false skips the Gemini matchmaker (used for pages that run several rankings at once). exclude: people to leave out. */
/** ai: allow the Gemini rerank. requireRole: only people who said they are open to the role (an eligibility check, not a score). */
export interface RankOptions { ai?: boolean; requireRole?: boolean }

export function rankForExpertise(query: string, role: Role, viewerId: string, audience: Audience = 'both', opts: RankOptions = {}) {
  return rank('expertise', query, role, viewerId, audience, opts);
}
export function rankForProblem(problemText: string, viewerId: string, audience: Audience = 'both', opts: RankOptions = {}) {
  return rank('problem', problemText, null, viewerId, audience, opts);
}
