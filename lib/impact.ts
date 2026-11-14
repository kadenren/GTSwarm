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
    byDirection,
    overTime,
    recentMilestones,
    outcomes,
  };
}
