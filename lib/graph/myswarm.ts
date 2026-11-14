import { snapshot, personLabel } from '../data';
import { getGraph } from './build';
import { recommendBuilds, recommendCollaborators } from '../matching';
import { listBuilds } from '../builds';

/**
 * My Swarm: everyone and every project around the viewer, placed by how closely they relate.
 * closeness = real graph ties (teammates, consented connections, lineages; skills excluded) via weighted distance
 * relevance = two-sided matching (builds that need the viewer; people who fit the viewer's open build)
 * score = max(closeness, relevance) blended so both kinds of relationship surface; links are stored facts.
 */
export interface SwarmNode {
  id: string; kind: 'person' | 'project'; name: string; label: string; type: 'student' | 'alum' | 'project';
  score: number; rank: number; ring: 1 | 2 | 3; short: string; why: string[]; href: string; relation: 'yours' | 'tie' | 'match';
}
export interface SwarmEdge { source: string; target: string; kind: string; label: string }

export async function mySwarm(viewerId: string, people = 11, projects = 8) {
  const s = snapshot();
  const graph = getGraph();
  const me = s.person.get(viewerId);
  if (!me || !graph.hasNode(viewerId)) return null;

  // 1. closeness: Dijkstra from the viewer over people and projects only
  const dist = new Map<string, number>([[viewerId, 0]]);
  const prev = new Map<string, string>();
  const done = new Set<string>();
  for (let step = 0; step < 400; step++) {
    let cur: string | null = null, best = Infinity;
    for (const [k, v] of dist) if (!done.has(k) && v < best) { best = v; cur = k; }
    if (!cur || best > 7) break;
    done.add(cur);
    graph.forEachNeighbor(cur, (nb, attrs) => {
      if (attrs.kind === 'skill' || attrs.kind === 'problem' || done.has(nb)) return;
      const d = best + (graph.getEdgeAttribute(cur!, nb, 'weight') as number);
      if (d < (dist.get(nb) ?? Infinity)) { dist.set(nb, d); prev.set(nb, cur!); }
    });
  }
  const closeness = (id: string) => (dist.has(id) ? 1 / (1 + (dist.get(id)! - 1) * 0.6) : 0);

  // 2. relevance: builds that need me, and people who fit my own open build
  const buildMatches = await recommendBuilds({ viewerId, personId: viewerId, limit: 6 });
  const myBuild = listBuilds().find((b) => b.open && (s.membersOf.get(b.id) ?? []).some((m) => m.person_id === viewerId && m.role !== 'advisor'));
  const collab = myBuild ? await recommendCollaborators(myBuild.id, viewerId, 2) : [];
  const relevance = new Map<string, { score: number; why: string }>();
  const maxB = Math.max(1e-6, ...buildMatches.map((m) => m.score));
  for (const m of buildMatches) relevance.set(m.build.id, { score: 0.55 + 0.45 * (m.score / maxB), why: m.reasons[0] ?? m.why });
  for (const r of collab) for (const p of r.people) {
    const cur = relevance.get(p.personId);
    const sc = 0.5 + 0.45 * p.score;
    if (!cur || cur.score < sc) relevance.set(p.personId, { score: sc, why: `Fits ${myBuild!.name}'s need for ${r.role === 'Early engineer' ? 'an early engineer' : `a ${r.role.toLowerCase()}`}: ${p.description.short.split(' · ')[0]}` });
  }

  // 3. explain graph ties from the shortest path back to me
  const tieWhy = (id: string): string => {
    const chain: string[] = [];
    for (let x = prev.get(id); x && x !== viewerId; x = prev.get(x)) chain.unshift(x);
    if (id.startsWith('project:')) {
      if ((s.membersOf.get(id) ?? []).some((m) => m.person_id === viewerId)) return 'Your project';
      const viaProject = chain.find((x) => x.startsWith('project:'));
      if (viaProject) return `Continues from or into ${s.project.get(viaProject)!.name} (${s.project.get(viaProject)!.year})`;
      const viaPerson = chain.find((x) => x.startsWith('person:'));
      return viaPerson ? `${s.person.get(viaPerson)!.name} works on it` : 'Linked to your work';
    }
    if (!chain.length) return 'Directly connected to you';
    const viaProject = chain.find((x) => x.startsWith('project:'));
    const viaPerson = chain.find((x) => x.startsWith('person:'));
    if (chain.length === 1 && viaProject) return `Built ${s.project.get(viaProject)!.name} with you`;
    if (viaPerson) return `You both know ${s.person.get(viaPerson)!.name}`;
    return viaProject ? `Linked through ${s.project.get(viaProject)!.name}` : 'Nearby in the swarm';
  };

  const score = (id: string) => Math.max(closeness(id) * 0.95, relevance.get(id)?.score ?? 0);
  const candidates = new Set<string>([...dist.keys(), ...relevance.keys()]);
  candidates.delete(viewerId);
  const pickTop = (prefix: string, n: number) => [...candidates]
    .filter((id) => id.startsWith(prefix) && (prefix !== 'person:' || s.person.get(id)?.claimed))
    .sort((a, b) => score(b) - score(a) || a.localeCompare(b)).slice(0, n);
  const chosen = [...pickTop('person:', people), ...pickTop('project:', projects)].sort((a, b) => score(b) - score(a));

  const nodes: SwarmNode[] = chosen.map((id, i) => {
    const rel = relevance.get(id);
    const tie = dist.has(id) ? tieWhy(id) : null;
    const relation: SwarmNode['relation'] = tie === 'Your project' ? 'yours' : rel && (!tie || rel.score > closeness(id)) ? 'match' : 'tie';
    const why = [tie, rel?.why].filter((x): x is string => !!x);
    if (id.startsWith('project:')) {
      const p = s.project.get(id)!;
      return { id, kind: 'project', name: p.name, label: `${p.name} (${p.year})`, type: 'project', score: Math.round(score(id) * 1000) / 1000, rank: i + 1, ring: (i < 4 ? 1 : i < 10 ? 2 : 3) as 1 | 2 | 3, short: why[0] ?? p.summary, why, href: `/projects/${encodeURIComponent(id)}`, relation };
    }
    const p = s.person.get(id)!;
    return { id, kind: 'person', name: p.name, label: personLabel(p), type: p.type, score: Math.round(score(id) * 1000) / 1000, rank: i + 1, ring: (i < 4 ? 1 : i < 10 ? 2 : 3) as 1 | 2 | 3, short: why[0] ?? (p.current_role ?? p.major), why, href: `/search?q=${encodeURIComponent(p.bio.split('. ')[0])}&role=Helper&aud=both`, relation };
  });

  // 4. links among everything shown (and me): built-on, connected, continued-from
  const ids = new Set([viewerId, ...chosen]);
  const edges: SwarmEdge[] = [];
  const seen = new Set<string>();
  const add = (a: string, b: string, kind: string, label: string) => { const k = a < b ? `${a}|${b}` : `${b}|${a}`; if (!seen.has(k) && a !== b) { seen.add(k); edges.push({ source: a, target: b, kind, label }); } };
  for (const m of s.memberships) if (ids.has(m.person_id) && ids.has(m.project_id)) add(m.person_id, m.project_id, 'built', m.role === 'advisor' ? 'Advises' : 'Builds');
  for (const c of s.connections) if (c.status === 'active' && ids.has(c.from_person) && ids.has(c.to_person)) add(c.from_person, c.to_person, c.source === 'shared-project' ? 'teammates' : 'connected', c.source === 'shared-project' ? 'Teammates' : 'Connected');
  for (const p of s.projects) if (p.continued_from && ids.has(p.id) && ids.has(p.continued_from)) add(p.id, p.continued_from, 'continued', 'Continued from');

  return {
    me: { id: me.id, name: me.name, label: personLabel(me), type: me.type },
    nodes, edges,
    counts: { people: nodes.filter((n) => n.kind === 'person').length, projects: nodes.filter((n) => n.kind === 'project').length, matches: nodes.filter((n) => n.relation === 'match').length },
    myBuild: myBuild ? { id: myBuild.id, name: myBuild.name } : null,
  };
}
