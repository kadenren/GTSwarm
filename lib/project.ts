import { getDb } from './db';
import { snapshot, firstName, type Snapshot } from './data';

export interface BuildEntry { kind: 'milestone' | 'problem'; id: string; date: string; title: string; detail?: string; confirmedBy?: string | null; helper?: string | null; by?: string | null }

/** Full lineage tree around a project: walk back to the root, then list every version in the family, oldest first. */
export function lineageOf(s: Snapshot, projectId: string) {
  let root = s.project.get(projectId)!;
  while (root.continued_from && s.project.get(root.continued_from)) root = s.project.get(root.continued_from)!;
  const family: { id: string; name: string; year: number; team: string; parent: string | null; builders: string[] }[] = [];
  const walk = (id: string) => {
    const p = s.project.get(id)!;
    family.push({
      id, name: p.name, year: p.year, team: p.team_name, parent: p.continued_from,
      builders: (s.membersOf.get(id) ?? []).filter((m) => m.role !== 'advisor').map((m) => s.person.get(m.person_id)!.name),
    });
    for (const c of s.continuations.get(id) ?? []) walk(c);
  };
  walk(root.id);
  return family.sort((a, b) => a.year - b.year);
}

/**
 * Handoff brief for the team that inherits a project. Cached AI-polished text is used when present;
 * otherwise a deterministic brief is built from the lineage's real problems, technologies and builders.
 */
export function handoffBrief(projectId: string): { text: string; source: 'cached' | 'generated'; contacts: { id: string; name: string; why: string }[] } {
  const s = snapshot();
  const p = s.project.get(projectId)!;
  const ancestors: string[] = [];
  for (let cur = p.continued_from; cur; cur = s.project.get(cur)?.continued_from ?? null) ancestors.push(cur);
  const contacts = ancestors.flatMap((a) =>
    (s.membersOf.get(a) ?? []).filter((m) => m.role !== 'advisor' && s.person.get(m.person_id)!.claimed).map((m) => ({
      id: m.person_id, name: s.person.get(m.person_id)!.name, why: `Built ${s.project.get(a)!.name} (${s.project.get(a)!.year})`,
    })),
  ).slice(0, 5);
  const row = getDb().prepare('SELECT value FROM cache WHERE key = ?').get(`handoff:${projectId}`) as { value: string } | undefined;
  if (row) {
    try {
      const v = JSON.parse(row.value) as { text: string };
      return { text: v.text, source: 'cached', contacts };
    } catch { /* fall through to the template */ }
  }
  if (!ancestors.length) {
    const probs = s.problemsOf.get(projectId) ?? [];
    const text = `${p.name} is the first version in its line. A team picking it up should start from its technologies (${p.technologies.join(', ')})` +
      (probs.length ? ` and the ${probs.length} documented ${probs.length === 1 ? 'problem' : 'problems'} below, starting with "${probs[0].description}".` : '.') +
      ' Log solved problems as you go so the next team inherits them.';
    return { text, source: 'generated', contacts };
  }
  const parent = s.project.get(ancestors[0])!;
  const inherited = ancestors.flatMap((a) => s.problemsOf.get(a) ?? []).slice(0, 3);
  const newTech = p.technologies.filter((t) => !parent.technologies.includes(t));
  const parts = [
    `${p.name} (${p.year}) continues ${parent.name} (${parent.year})${ancestors.length > 1 ? `, part of a ${ancestors.length + 1}-version line that started in ${s.project.get(ancestors[ancestors.length - 1])!.year}` : ''}.`,
    `Carry over: ${parent.technologies.join(', ')}.${newTech.length ? ` New in this version: ${newTech.join(', ')}.` : ''}`,
    inherited.length ? `Problems earlier teams already solved: ${inherited.map((x) => `"${x.description}" (${lowerFirst(x.solution.split('. ')[0].replace(/\.$/, ''))})`).join('; ')}.` : '',
    contacts.length ? `Earlier builders to contact: ${contacts.slice(0, 3).map((c) => c.name).join(', ')}.` : '',
  ];
  return { text: parts.filter(Boolean).join(' '), source: 'generated', contacts };
}
const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

export function buildRecord(projectId: string): BuildEntry[] {
  const s = snapshot();
  const name = (id: string | null | undefined) => (id ? s.person.get(id)?.name ?? null : null);
  const ms = getDb().prepare('SELECT * FROM milestones WHERE project_id = ?').all(projectId) as { id: string; title: string; date: string; confirmed_by: string | null }[];
  const entries: BuildEntry[] = ms.map((m) => ({ kind: 'milestone', id: m.id, date: m.date, title: m.title, confirmedBy: name(m.confirmed_by) }));
  for (const pb of s.problemsOf.get(projectId) ?? []) {
    entries.push({ kind: 'problem', id: pb.id, date: pb.created_at.slice(0, 10), title: `Solved: ${pb.description}`, detail: pb.solution, by: name(pb.solved_by), helper: name(pb.helper_id) });
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

export function projectView(projectId: string, viewerId: string) {
  const s = snapshot();
  const p = s.project.get(projectId);
  if (!p) return null;
  const team = (s.membersOf.get(projectId) ?? []).map((m) => {
    const person = s.person.get(m.person_id)!;
    return { id: person.id, name: person.name, first: firstName(person), type: person.type, major: person.major, gradYear: person.grad_year, role: m.role, title: m.title };
  });
  const viewerRole = team.find((t) => t.id === viewerId)?.role ?? null;
  return {
    project: { ...p, embedding: undefined },
    skills: s.projectSkillNames.get(projectId) ?? [],
    team,
    viewerRole,
    lineage: lineageOf(s, projectId),
    problems: (s.problemsOf.get(projectId) ?? []).map((pb) => ({ id: pb.id, description: pb.description, solution: pb.solution, by: pb.solved_by ? s.person.get(pb.solved_by)?.name : null, helper: pb.helper_id ? s.person.get(pb.helper_id)?.name : null })),
    record: buildRecord(projectId),
    handoff: handoffBrief(projectId),
    links: getDb().prepare('SELECT url, title FROM project_link WHERE project_id = ?').all(projectId) as { url: string; title: string | null }[],
  };
}
