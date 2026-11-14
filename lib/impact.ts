import { getDb } from './db';
import { snapshot } from './data';

export type Direction = 'student to alum' | 'alum to alum' | 'alum to student' | 'student to student';
export const DIRECTIONS: Direction[] = ['student to alum', 'alum to alum', 'alum to student', 'student to student'];

/** Network impact. Connections count only consented links made through the swarm (not derived teammate links). */
export function impactStats() {
  const s = snapshot();
  const made = s.connections.filter((c) => c.source !== 'shared-project' && c.status === 'active');
  const byDirection = Object.fromEntries(DIRECTIONS.map((d) => [d, 0])) as Record<Direction, number>;
  for (const c of made) {
    const a = s.person.get(c.from_person)!, b = s.person.get(c.to_person)!;
    byDirection[`${a.type === 'alum' ? 'alum' : 'student'} to ${b.type === 'alum' ? 'alum' : 'student'}` as Direction]++;
  }
  const quarters = new Map<string, number>();
  for (const c of made) {
    const d = new Date(c.created_at);
    const key = `${d.getUTCFullYear()} Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
    quarters.set(key, (quarters.get(key) ?? 0) + 1);
  }
  let running = 0;
  const overTime = [...quarters].sort((a, b) => a[0].localeCompare(b[0])).map(([period, count]) => ({ period, count, cumulative: (running += count) }));
  const db = getDb();
  const accepted = (db.prepare("SELECT COUNT(*) n FROM requests WHERE status = 'accepted'").get() as { n: number }).n;
  const helpAsks = (db.prepare("SELECT COUNT(*) n FROM requests WHERE kind = 'stuck'").get() as { n: number }).n;
  const alumni = s.people.filter((p) => p.type === 'alum' && p.claimed);
  const alumniOpen = alumni.filter((p) => p.open_to.some((r) => r === 'Advisor' || r === 'Helper')).length;
  const solvers = new Set(s.problems.map((p) => p.solved_by));
  const alumniSolvers = alumni.filter((p) => solvers.has(p.id)).length;
  const recentMilestones = db.prepare('SELECT m.title, m.date, m.confirmed_by, p.id pid, p.name FROM milestones m JOIN projects p ON p.id = m.project_id ORDER BY m.date DESC LIMIT 6').all() as { title: string; date: string; confirmed_by: string | null; pid: string; name: string }[];
  const outcomes = s.projects.filter((p) => p.outcome).sort((a, b) => b.year - a.year).slice(0, 6).map((p) => ({ id: p.id, name: p.name, year: p.year, outcome: p.outcome!, team: p.team_name }));
  return {
    projects: s.projects.length,
    claimed: s.people.filter((p) => p.claimed).length,
    problems: s.problems.length,
    startups: s.projects.filter((p) => p.is_startup).length,
    lineages: s.projects.filter((p) => p.continued_from).length,
    connections: made.length,
    acceptedRequests: accepted,
    helpAsks,
    alumni: alumni.length,
    alumniOpen,
    alumniSolvers,
    byDirection,
    overTime,
    recentMilestones,
    outcomes,
  };
}

/** Network-level stats computed from the graph (no hand-entered numbers). */
export function networkStats() {
  const s = snapshot();
  // people/project graph without skill nodes (skills would make everyone two hops apart)
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)!.add(b); adj.get(b)!.add(a);
  };
  for (const m of s.memberships) link(m.person_id, m.project_id);
  for (const p of s.projects) if (p.continued_from) link(p.id, p.continued_from);
  for (const c of s.connections) if (c.status === 'active') link(c.from_person, c.to_person);

  // multi-source BFS from every current student, counting person-to-person hops (a shared project counts as one hop)
  const students = s.people.filter((p) => p.type === 'student' && p.claimed).map((p) => p.id);
  const dist = new Map<string, number>(students.map((id) => [id, 0]));
  let frontier = [...students];
  while (frontier.length) {
    const next: string[] = [];
    for (const x of frontier) for (const y of adj.get(x) ?? []) {
      const step = y.startsWith('project:') || x.startsWith('project:') ? 0.5 : 1;
      const d = dist.get(x)! + step;
      if (d < (dist.get(y) ?? Infinity)) { dist.set(y, d); next.push(y); }
    }
    frontier = next;
  }
  const alumni = s.people.filter((p) => p.type === 'alum' && p.claimed);
  const alumHops = alumni.map((a) => Math.ceil(dist.get(a.id) ?? Infinity));
  const within3 = alumHops.filter((h) => h <= 3).length;
  const reachable = alumHops.filter((h) => Number.isFinite(h));
  const avgHops = reachable.reduce((x, y) => x + y, 0) / Math.max(1, reachable.length);

  const made = s.connections.filter((c) => c.source !== 'shared-project' && c.status === 'active');
  const crossMajor = made.filter((c) => s.person.get(c.from_person)!.major !== s.person.get(c.to_person)!.major).length;

  // knowledge carried forward: problems solved on a project that a later version continued from
  const inherited = s.problems.filter((pb) => (s.continuations.get(pb.project_id) ?? []).length > 0).length;

  // longest lineages
  const roots = s.projects.filter((p) => !p.continued_from && (s.continuations.get(p.id) ?? []).length > 0);
  const lineages = roots.map((r) => {
    const fam: string[] = [];
    const walk = (id: string) => { fam.push(id); for (const c of s.continuations.get(id) ?? []) walk(c); };
    walk(r.id);
    const people = new Set(fam.flatMap((id) => (s.membersOf.get(id) ?? []).map((m) => m.person_id)));
    const years = fam.map((id) => s.project.get(id)!.year);
    return {
      id: r.id, name: r.name, team: r.team_name, versions: fam.length, from: Math.min(...years), to: Math.max(...years),
      builders: people.size, problems: fam.reduce((n, id) => n + (s.problemsOf.get(id) ?? []).length, 0),
      latest: fam.map((id) => s.project.get(id)!).sort((a, b) => b.year - a.year)[0],
    };
  }).sort((a, b) => b.versions - a.versions || b.builders - a.builders).slice(0, 3);

  return {
    alumniTotal: alumni.length, alumniWithin3: within3, pctWithin3: Math.round((within3 / Math.max(1, alumni.length)) * 100),
    avgHops: Math.round(avgHops * 10) / 10,
    crossMajorPct: Math.round((crossMajor / Math.max(1, made.length)) * 100),
    inheritedProblems: inherited,
    lineages,
  };
}
