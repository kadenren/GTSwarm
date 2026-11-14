import { getDb, dataVersion, parseJson, perDb } from './db';
import { fromBlob } from './embed';

export type Role = 'Cofounder' | 'Advisor' | 'Helper' | 'Early engineer' | 'First customer';
export const ROLES: Role[] = ['Cofounder', 'Advisor', 'Helper', 'Early engineer', 'First customer'];
export type Audience = 'students' | 'alumni' | 'both';

export interface Person {
  id: string; name: string; type: 'student' | 'alum'; major: string; grad_year: number; current_role: string | null;
  company_type: string | null; city: string | null; bio: string; claimed: boolean; availability_hours: number; open_to: Role[];
  embedding: Float32Array | null;
}
export interface Project {
  id: string; name: string; year: number; team_type: string; team_name: string; summary: string; technologies: string[];
  outcome: string | null; is_startup: boolean; continued_from: string | null; embedding: Float32Array | null;
}
export interface Membership { person_id: string; project_id: string; role: 'builder' | 'advisor' | 'maintainer' | 'founder'; title: string | null }
export interface Problem {
  id: string; project_id: string; description: string; solution: string; solved_by: string | null; helper_id: string | null;
  created_at: string; embedding: Float32Array | null;
}
export interface Connection { id: string; from_person: string; to_person: string; source: string; status: string; created_at: string }
export interface Skill { id: string; name: string }

export interface Snapshot {
  version: string;
  people: Person[];
  projects: Project[];
  memberships: Membership[];
  problems: Problem[];
  connections: Connection[];
  skills: Skill[];
  personSkills: { person_id: string; skill_id: string }[];
  projectSkills: { project_id: string; skill_id: string }[];
  person: Map<string, Person>;
  project: Map<string, Project>;
  problem: Map<string, Problem>;
  skill: Map<string, Skill>;
  projectsOf: Map<string, Membership[]>; // person -> memberships
  membersOf: Map<string, Membership[]>; // project -> memberships
  problemsBy: Map<string, Problem[]>; // person -> problems solved or helped
  problemsOf: Map<string, Problem[]>; // project -> problems
  skillsOf: Map<string, string[]>; // person -> skill names
  projectSkillNames: Map<string, string[]>;
  continuations: Map<string, string[]>; // project -> projects continued from it
  searchMode: 'semantic' | 'keyword';
}

const g = perDb<{ __gtSnap?: Snapshot }>(); // one cache per database (each demo session has its own)

const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => {
  const a = m.get(k);
  if (a) a.push(v);
  else m.set(k, [v]);
};

export function snapshot(): Snapshot {
  const version = dataVersion();
  if (g.__gtSnap && g.__gtSnap.version === version) return g.__gtSnap;
  const db = getDb();
  type Raw = Record<string, unknown>;
  const people: Person[] = (db.prepare('SELECT * FROM people').all() as Raw[]).map((r) => ({
    ...(r as unknown as Person),
    claimed: !!r.claimed,
    open_to: parseJson<Role[]>(r.open_to as string, []),
    embedding: fromBlob(r.embedding as Buffer),
  }));
  const projects: Project[] = (db.prepare('SELECT * FROM projects').all() as Raw[]).map((r) => ({
    ...(r as unknown as Project),
    is_startup: !!r.is_startup,
    technologies: parseJson<string[]>(r.technologies as string, []),
    embedding: fromBlob(r.embedding as Buffer),
  }));
  const problems: Problem[] = (db.prepare('SELECT * FROM problems').all() as Raw[]).map((r) => ({
    ...(r as unknown as Problem),
    embedding: fromBlob(r.embedding as Buffer),
  }));
  const memberships = db.prepare('SELECT * FROM person_project').all() as Membership[];
  const connections = db.prepare('SELECT * FROM connections').all() as Connection[];
  const skills = db.prepare('SELECT * FROM skills').all() as Skill[];
  const personSkills = db.prepare('SELECT * FROM person_skill').all() as { person_id: string; skill_id: string }[];
  const projectSkills = db.prepare('SELECT * FROM project_skill').all() as { project_id: string; skill_id: string }[];
  const modeRow = db.prepare("SELECT value FROM meta WHERE key='search_mode'").get() as { value: string } | undefined;

  const s: Snapshot = {
    version, people, projects, memberships, problems, connections, skills, personSkills, projectSkills,
    person: new Map(people.map((p) => [p.id, p])),
    project: new Map(projects.map((p) => [p.id, p])),
    problem: new Map(problems.map((p) => [p.id, p])),
    skill: new Map(skills.map((p) => [p.id, p])),
    projectsOf: new Map(), membersOf: new Map(), problemsBy: new Map(), problemsOf: new Map(),
    skillsOf: new Map(), projectSkillNames: new Map(), continuations: new Map(),
    searchMode: modeRow?.value === 'semantic' && people.some((p) => p.embedding) ? 'semantic' : 'keyword',
  };
  for (const m of memberships) { push(s.projectsOf, m.person_id, m); push(s.membersOf, m.project_id, m); }
  for (const p of problems) {
    push(s.problemsOf, p.project_id, p);
    if (p.solved_by) push(s.problemsBy, p.solved_by, p);
    if (p.helper_id && p.helper_id !== p.solved_by) push(s.problemsBy, p.helper_id, p);
  }
  for (const ps of personSkills) push(s.skillsOf, ps.person_id, s.skill.get(ps.skill_id)!.name);
  for (const ps of projectSkills) push(s.projectSkillNames, ps.project_id, s.skill.get(ps.skill_id)!.name);
  for (const p of projects) if (p.continued_from) push(s.continuations, p.continued_from, p.id);
  g.__gtSnap = s;
  return s;
}

export const firstName = (p: Person) => p.name.split(' ')[0];
export const shortYear = (y: number) => `'${String(y).slice(2)}`;
export const personLabel = (p: Person) => (p.type === 'alum' ? `${firstName(p)}, alum ${shortYear(p.grad_year)}` : `${firstName(p)}, student`);
export const personSubtitle = (p: Person) =>
  p.type === 'alum' ? `${p.major} ${shortYear(p.grad_year)} · ${p.current_role ?? 'Alum'}` : `${p.major} student · class of ${p.grad_year}`;
export const projectLabel = (p: Project) => `${p.name} (${p.year})`;

/** Lineage root of a project (follows continued_from to the first version). */
export function lineageRoot(s: Snapshot, projectId: string): string {
  let cur = s.project.get(projectId);
  const seen = new Set<string>();
  while (cur?.continued_from && !seen.has(cur.id)) {
    seen.add(cur.id);
    cur = s.project.get(cur.continued_from);
  }
  return cur?.id ?? projectId;
}
