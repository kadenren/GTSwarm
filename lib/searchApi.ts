import { rankForExpertise, rankForProblem } from './graph/rank';
import { edgesAmong } from './graph/edges';
import { snapshot, ROLES, type Audience, type Role } from './data';

export interface SearchRequest { kind: 'expertise' | 'stuck'; query: string; role?: Role; audience?: Audience; log?: string }

/** Ranking plus everything the relevance web and side panel need, in one payload. */
export async function runSearch(viewerId: string, req: SearchRequest) {
  const audience: Audience = req.audience === 'students' || req.audience === 'alumni' ? req.audience : 'both';
  const role: Role = ROLES.includes(req.role as Role) ? (req.role as Role) : 'Advisor';
  const text = req.kind === 'stuck' && req.log?.trim() ? `${req.query}\n${req.log.slice(0, 2000)}` : req.query;
  const out = req.kind === 'stuck' ? await rankForProblem(text, viewerId, audience) : await rankForExpertise(text, role, viewerId, audience);
  const s = snapshot();
  const results = out.results.map((r) => ({
    ...r,
    built: (s.projectsOf.get(r.personId) ?? [])
      .map((m) => ({ ...m, p: s.project.get(m.project_id)! }))
      .sort((a, b) => b.p.year - a.p.year)
      .map(({ p, role, title }) => ({ id: p.id, name: p.name, year: p.year, team: p.team_name, teamType: p.team_type, role, title, outcome: p.outcome })),
    solved: (s.problemsBy.get(r.personId) ?? []).slice(0, 4).map((pb) => ({ id: pb.id, description: pb.description })),
  }));
  return {
    kind: req.kind,
    query: req.query,
    role: req.kind === 'stuck' ? null : role,
    audience,
    mode: out.mode,
    results,
    edges: edgesAmong(results.map((r) => r.personId)),
  };
}
export type SearchResponse = Awaited<ReturnType<typeof runSearch>>;
export type SearchResult = SearchResponse['results'][number];
