import { snapshot, personLabel } from '../data';
import { getGraph } from './build';
import { edgesAmong } from './edges';
import { warmPath } from './path';

/**
 * Re-center on one person: their nearest people by weighted graph distance (skills excluded, so ties are real work or real
 * connections). Ring 1 = closest three, ring 2 = next four, ring 3 = the rest, mostly second-degree.
 */
export function personNetwork(personId: string, viewerId: string, limit = 12) {
  const s = snapshot();
  const graph = getGraph();
  const center = s.person.get(personId);
  if (!center || !graph.hasNode(personId)) return null;
  const dist = new Map<string, number>([[personId, 0]]);
  const prev = new Map<string, string>();
  const done = new Set<string>();
  const people: { id: string; cost: number }[] = [];
  while (people.length < limit) {
    let cur: string | null = null, best = Infinity;
    for (const [k, v] of dist) if (!done.has(k) && v < best) { best = v; cur = k; }
    if (!cur || best > 8) break;
    done.add(cur);
    if (cur !== personId && cur.startsWith('person:') && s.person.get(cur)!.claimed) people.push({ id: cur, cost: best });
    graph.forEachNeighbor(cur, (nb, attrs) => {
      if (attrs.kind === 'skill' || done.has(nb)) return;
      const w = graph.getEdgeAttribute(cur!, nb, 'weight') as number;
      const d = best + w;
      if (d < (dist.get(nb) ?? Infinity)) { dist.set(nb, d); prev.set(nb, cur!); }
    });
  }
  const maxCost = Math.max(...people.map((p) => p.cost), 1);
  const nodes = people.map((p, i) => {
    const person = s.person.get(p.id)!;
    // explain the tie from the path back to the center
    const chain: string[] = [];
    for (let x = prev.get(p.id); x && x !== personId; x = prev.get(x)) chain.unshift(x);
    const viaProject = chain.find((x) => x.startsWith('project:'));
    const viaPerson = chain.find((x) => x.startsWith('person:'));
    const short = !chain.length
      ? 'Directly connected'
      : chain.length === 1 && viaProject
        ? `Built ${s.project.get(viaProject)!.name} (${s.project.get(viaProject)!.year}) together`
        : viaPerson
          ? `Second degree, through ${s.person.get(viaPerson)!.name}`
          : viaProject ? `Linked through ${s.project.get(viaProject)!.name} (${s.project.get(viaProject)!.year})` : 'Nearby in the swarm';
    return { id: p.id, name: person.name, label: personLabel(person), type: person.type, score: Math.round((1 - (p.cost - 1) / (maxCost + 1)) * 1000) / 1000, rank: i + 1, ring: (i < 3 ? 1 : i < 7 ? 2 : 3) as 1 | 2 | 3, short };
  });
  return {
    center: { id: center.id, name: center.name, label: personLabel(center) },
    nodes,
    edges: edgesAmong([personId, ...nodes.map((n) => n.id)]).filter((e) => e.source !== personId && e.target !== personId),
    pathFromViewer: personId === viewerId ? null : warmPath(viewerId, personId),
  };
}
