import { handle } from '@/lib/api';
import { snapshot } from '@/lib/data';
import { ready } from '@/lib/session';

/** Whole-swarm graph for the network explorer: projects, people and skills (problems are summarized on project pages). */
export async function GET() {
  await ready();
  return handle(() => {
    const s = snapshot();
    const nodes = [
      ...s.projects.map((p) => ({ id: p.id, kind: 'project' as const, label: `${p.name} (${p.year})`, year: p.year, teamType: p.team_type })),
      ...s.people.filter((p) => p.claimed).map((p) => ({ id: p.id, kind: 'person' as const, label: p.name, personType: p.type, year: 0 })),
      ...s.skills.map((k) => ({ id: k.id, kind: 'skill' as const, label: k.name, year: 0 })),
    ];
    const ids = new Set(nodes.map((n) => n.id));
    const links: { source: string; target: string; kind: string }[] = [];
    for (const m of s.memberships) if (ids.has(m.person_id)) links.push({ source: m.person_id, target: m.project_id, kind: m.role });
    for (const p of s.projects) if (p.continued_from) links.push({ source: p.id, target: p.continued_from, kind: 'continued' });
    for (const ps of s.projectSkills) links.push({ source: ps.project_id, target: ps.skill_id, kind: 'uses' });
    for (const c of s.connections) if (c.source !== 'shared-project' && ids.has(c.from_person) && ids.has(c.to_person)) links.push({ source: c.from_person, target: c.to_person, kind: 'connected' });
    return { nodes, links, pulseband: s.projects.find((p) => p.name === 'PulseBand')?.id ?? null };
  });
}
