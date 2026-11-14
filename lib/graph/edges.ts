import { snapshot } from '../data';

export interface PersonEdge { source: string; target: string; kind: 'connected' | 'shared-project' | 'shared-team' | 'advised'; label: string }

/** Person-to-person links among a set of people: direct connections, shared projects, advising, shared teams. */
export function edgesAmong(personIds: string[]): PersonEdge[] {
  const s = snapshot();
  const set = new Set(personIds);
  const out = new Map<string, PersonEdge>();
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const add = (e: PersonEdge) => { const k = key(e.source, e.target); if (!out.has(k)) out.set(k, e); };

  // 1. shared projects (strongest evidence: they actually built something together)
  for (let i = 0; i < personIds.length; i++) {
    const a = personIds[i];
    const pa = new Map((s.projectsOf.get(a) ?? []).map((m) => [m.project_id, m.role]));
    for (let j = i + 1; j < personIds.length; j++) {
      const b = personIds[j];
      for (const m of s.projectsOf.get(b) ?? []) {
        const ra = pa.get(m.project_id);
        if (!ra) continue;
        const pr = s.project.get(m.project_id)!;
        const advised = ra === 'advisor' || m.role === 'advisor';
        add({ source: a, target: b, kind: advised ? 'advised' : 'shared-project', label: `${advised ? 'Advisor and builder on' : 'Both built'} ${pr.name} (${pr.year})` });
        break;
      }
    }
  }
  // 2. direct consented connections
  for (const c of s.connections) {
    if (c.source === 'shared-project' || c.status !== 'active') continue;
    if (set.has(c.from_person) && set.has(c.to_person)) {
      add({ source: c.from_person, target: c.to_person, kind: 'connected', label: c.source === 'co-advisor' ? 'Co-advisors' : c.source === 'intro' ? 'Connected through an intro' : 'Connected' });
    }
  }
  // 3. same team in different years
  const teams = new Map<string, Set<string>>();
  for (const id of personIds) for (const m of s.projectsOf.get(id) ?? []) {
    const t = s.project.get(m.project_id)!.team_name;
    if (/Senior Design|Capstone|Junior Design|Invention Studio|CREATE-X/.test(t)) continue; // too broad to be a real tie
    if (!teams.has(t)) teams.set(t, new Set());
    teams.get(t)!.add(id);
  }
  for (const [t, ids] of teams) {
    const arr = [...ids];
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) add({ source: arr[i], target: arr[j], kind: 'shared-team', label: `Both on ${t}` });
  }
  return [...out.values()];
}
