import { bidirectional } from 'graphology-shortest-path/dijkstra';
import { snapshot, type Snapshot } from '../data';
import { getGraph } from './build';

export interface PathStep { id: string; kind: 'person' | 'project' | 'problem' | 'skill'; label: string; via?: string }
export interface WarmPath { ids: string[]; steps: PathStep[]; hops: number; text: string }

function stepLabel(s: Snapshot, id: string, viewerId: string): PathStep {
  if (id === viewerId && id.startsWith('person:')) return { id, kind: 'person', label: 'You' };
  if (id.startsWith('person:')) return { id, kind: 'person', label: s.person.get(id)!.name };
  if (id.startsWith('project:')) {
    const p = s.project.get(id)!;
    return { id, kind: 'project', label: `${p.name} (${p.year})` };
  }
  if (id.startsWith('problem:')) return { id, kind: 'problem', label: `solved "${s.problem.get(id)!.description}"` };
  return { id, kind: 'skill', label: `shared skill: ${s.skill.get(id)!.name}` };
}

/** How the edge between two consecutive path nodes reads in plain English. */
function via(s: Snapshot, a: string, b: string): string | undefined {
  const pa = s.project.get(a), pb = s.project.get(b);
  if (pa && pb) {
    if (pb.continued_from === pa.id) return 'continued as';
    if (pa.continued_from === pb.id) return 'continued from';
  }
  if (a.startsWith('person:') && b.startsWith('person:')) {
    const c = s.connections.find((c) => (c.from_person === a && c.to_person === b) || (c.from_person === b && c.to_person === a));
    if (c) return c.source === 'shared-project' ? 'teammate' : c.source === 'co-advisor' ? 'co-advisor' : 'connected';
  }
  return undefined;
}

export function warmPath(viewerId: string, targetId: string): WarmPath | null {
  const s = snapshot();
  const graph = getGraph();
  if (!graph.hasNode(viewerId) || !graph.hasNode(targetId)) return null;
  if (viewerId === targetId) return { ids: [viewerId], steps: [stepLabel(s, viewerId, viewerId)], hops: 0, text: 'You' };
  const ids = bidirectional(graph, viewerId, targetId, 'weight');
  if (!ids) return null;
  const steps = ids.map((id, i) => ({ ...stepLabel(s, id, viewerId), via: i > 0 ? via(s, ids[i - 1], id) : undefined }));
  const text = steps
    .map((st, i) => (i === 0 ? st.label : st.via?.startsWith('continued') ? `${st.via} ${st.label}` : st.via ? `${st.label} (${st.via})` : st.label))
    .join(' → ');
  return { ids, steps, hops: ids.length - 1, text };
}
