import { getDb, bumpDataVersion } from './db';
import { snapshot, type Role } from './data';
import { embedText, toBlob } from './embed';

/** All writes go through here. Each enforces the demo-user rules and bumps the data version so the graph rebuilds. */
export class ActionError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const nextId = (table: string, prefix: string, width = 3) => {
  const rows = getDb().prepare(`SELECT id FROM ${table} WHERE id LIKE ?`).all(`${prefix}%`) as { id: string }[];
  const max = rows.reduce((m, r) => Math.max(m, parseInt(r.id.slice(prefix.length), 10) || 0), 0);
  return `${prefix}${String(max + 1).padStart(width, '0')}`;
};
const now = () => new Date().toISOString();

export function isMember(personId: string, projectId: string) {
  return !!getDb().prepare('SELECT 1 FROM person_project WHERE person_id = ? AND project_id = ?').get(personId, projectId);
}
export function isOwner(personId: string, projectId: string) {
  return !!getDb().prepare("SELECT 1 FROM person_project WHERE person_id = ? AND project_id = ? AND role IN ('founder','maintainer')").get(personId, projectId)
    || !!getDb().prepare("SELECT 1 FROM person_project WHERE person_id = ? AND project_id = ? AND role = 'builder'").get(personId, projectId)
      && !getDb().prepare("SELECT 1 FROM person_project WHERE project_id = ? AND role IN ('founder','maintainer')").get(projectId);
}
export function isAdvisor(personId: string, projectId: string) {
  return !!getDb().prepare("SELECT 1 FROM person_project WHERE person_id = ? AND project_id = ? AND role = 'advisor'").get(personId, projectId);
}

export function sendRequest(input: { from: string; to: string; kind: 'expertise' | 'stuck'; role: Role | null; message: string; projectId: string | null }) {
  const db = getDb();
  if (input.from === input.to) throw new ActionError('You cannot send a request to yourself.');
  if (!snapshot().person.get(input.to)) throw new ActionError('Unknown person.', 404);
  if (input.projectId && !isMember(input.from, input.projectId)) throw new ActionError('You can only send requests for projects you belong to.', 403);
  const existing = db.prepare("SELECT id FROM requests WHERE from_person = ? AND to_person = ? AND status = 'sent'").get(input.from, input.to) as { id: string } | undefined;
  if (existing) return { id: existing.id, duplicate: true };
  const id = nextId('requests', 'request:r');
  db.prepare('INSERT INTO requests (id, from_person, to_person, project_id, kind, role, message, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, input.from, input.to, input.projectId, input.kind, input.role, input.message.trim() || 'Would you be open to a short conversation?', 'sent', now());
  bumpDataVersion();
  return { id, duplicate: false };
}

/** Accepting only creates a consented connection. It never adds anyone to a project. */
export function acceptRequest(requestId: string, viewerId: string) {
  const db = getDb();
  const r = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId) as { id: string; from_person: string; to_person: string; status: string } | undefined;
  if (!r) throw new ActionError('Request not found.', 404);
  if (r.to_person !== viewerId) throw new ActionError('You can only accept requests sent to you.', 403);
  if (r.status !== 'sent') throw new ActionError(`This request was already ${r.status}.`);
  const connId = nextId('connections', 'conn:c', 4);
  db.transaction(() => {
    db.prepare("UPDATE requests SET status = 'accepted' WHERE id = ?").run(requestId);
    db.prepare("INSERT INTO connections (id, from_person, to_person, source, status, created_at) VALUES (?,?,?,'request','active',?)").run(connId, r.from_person, r.to_person, now());
  })();
  bumpDataVersion();
  return { connectionId: connId };
}

export function declineRequest(requestId: string, viewerId: string) {
  const db = getDb();
  const r = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId) as { to_person: string; status: string } | undefined;
  if (!r) throw new ActionError('Request not found.', 404);
  if (r.to_person !== viewerId) throw new ActionError('You can only decline requests sent to you.', 403);
  if (r.status !== 'sent') throw new ActionError(`This request was already ${r.status}.`);
  db.prepare("UPDATE requests SET status = 'declined' WHERE id = ?").run(requestId);
  bumpDataVersion();
}

export const ADD_AS = { Advisor: 'advisor', Cofounder: 'founder', Helper: 'builder', 'Early engineer': 'builder' } as const;
export type AddAs = keyof typeof ADD_AS;

/** Explicit, separate step: the project owner adds an accepted contact to the team. */
export function addToProject(requestId: string, viewerId: string, addAs: AddAs) {
  const db = getDb();
  const r = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId) as { from_person: string; to_person: string; project_id: string | null; status: string; added_as: string | null } | undefined;
  if (!r) throw new ActionError('Request not found.', 404);
  if (r.status !== 'accepted') throw new ActionError('Only accepted requests can lead to adding someone.');
  if (!r.project_id) throw new ActionError('This request is not tied to a project.');
  if (!(addAs in ADD_AS)) throw new ActionError('Unknown role.');
  const sender = r.from_person === viewerId;
  if (!sender || !isOwner(viewerId, r.project_id)) throw new ActionError('Only the project owner who sent the request can add people to the project.', 403);
  const person = r.to_person;
  if (isMember(person, r.project_id)) throw new ActionError('Already on the project team.');
  db.transaction(() => {
    db.prepare('INSERT INTO person_project (person_id, project_id, role, title) VALUES (?,?,?,?)').run(person, r.project_id, ADD_AS[addAs], addAs);
    db.prepare('UPDATE requests SET added_as = ? WHERE id = ?').run(addAs, requestId);
  })();
  bumpDataVersion();
}

export async function logProblem(input: { viewerId: string; projectId: string; description: string; solution: string; helperId: string | null }) {
  const db = getDb();
  if (!isMember(input.viewerId, input.projectId)) throw new ActionError('You can only log progress on projects you belong to.', 403);
  const description = input.description.trim(), solution = input.solution.trim();
  if (description.length < 5 || solution.length < 5) throw new ActionError('Describe both the problem and how it was solved.');
  if (input.helperId && !snapshot().person.get(input.helperId)) throw new ActionError('Unknown helper.');
  const id = nextId('problems', 'problem:pb');
  const vec = snapshot().searchMode === 'semantic' ? await embedText(`${description}. ${solution}`) : null;
  db.prepare('INSERT INTO problems (id, project_id, description, solution, solved_by, helper_id, created_at, embedding) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, input.projectId, description, solution, input.viewerId, input.helperId, now(), vec ? toBlob(vec) : null);
  bumpDataVersion();
  return { id };
}

export function addTechnology(input: { viewerId: string; projectId: string; name: string }) {
  const db = getDb();
  if (!isMember(input.viewerId, input.projectId)) throw new ActionError('You can only log progress on projects you belong to.', 403);
  const name = input.name.trim();
  if (!name) throw new ActionError('Enter a technology.');
  let skill = db.prepare('SELECT id FROM skills WHERE lower(name) = lower(?)').get(name) as { id: string } | undefined;
  db.transaction(() => {
    if (!skill) {
      skill = { id: nextId('skills', 'skill:s') };
      db.prepare('INSERT INTO skills (id, name) VALUES (?,?)').run(skill.id, name);
    }
    db.prepare('INSERT OR IGNORE INTO project_skill (project_id, skill_id) VALUES (?,?)').run(input.projectId, skill.id);
    db.prepare('INSERT OR IGNORE INTO person_skill (person_id, skill_id) VALUES (?,?)').run(input.viewerId, skill.id);
    const row = db.prepare('SELECT technologies FROM projects WHERE id = ?').get(input.projectId) as { technologies: string };
    const techs: string[] = JSON.parse(row.technologies);
    if (!techs.some((t) => t.toLowerCase() === name.toLowerCase())) db.prepare('UPDATE projects SET technologies = ? WHERE id = ?').run(JSON.stringify([...techs, name]), input.projectId);
  })();
  bumpDataVersion();
}

export function addMilestone(input: { viewerId: string; projectId: string; title: string; helperId?: string | null }) {
  const db = getDb();
  if (!isMember(input.viewerId, input.projectId)) throw new ActionError('You can only log progress on projects you belong to.', 403);
  const helper = input.helperId ? snapshot().person.get(input.helperId) : null;
  const title = (helper ? `Help from ${helper.name}: ${input.title.trim()}` : input.title.trim());
  if (title.length < 3) throw new ActionError('Enter a milestone.');
  const id = nextId('milestones', 'milestone:m');
  db.prepare('INSERT INTO milestones (id, project_id, title, date, confirmed_by) VALUES (?,?,?,?,NULL)').run(id, input.projectId, title, now().slice(0, 10));
  bumpDataVersion();
  return { id };
}

export function confirmMilestone(milestoneId: string, viewerId: string) {
  const db = getDb();
  const m = db.prepare('SELECT * FROM milestones WHERE id = ?').get(milestoneId) as { project_id: string; confirmed_by: string | null } | undefined;
  if (!m) throw new ActionError('Milestone not found.', 404);
  if (!isAdvisor(viewerId, m.project_id)) throw new ActionError('Only advisors of this project can confirm milestones.', 403);
  db.prepare('UPDATE milestones SET confirmed_by = ? WHERE id = ?').run(viewerId, milestoneId);
  bumpDataVersion();
}
