import Graph from 'graphology';
import { snapshot, type Snapshot } from '../data';

export type NodeKind = 'person' | 'project' | 'problem' | 'skill';
export interface EdgeAttrs { weight: number; kind: string; label?: string }

/**
 * Undirected weighted graph of people, projects, problems and skills.
 * Weights are costs for shortest paths (lower = stronger tie).
 */
const ROLE_WEIGHT: Record<string, number> = { builder: 1.0, founder: 1.0, maintainer: 1.2, advisor: 1.5 };
const g = globalThis as unknown as { __gtGraph?: { version: string; graph: Graph } };

export function buildGraph(s: Snapshot): Graph {
  const graph = new Graph({ type: 'undirected', multi: false });
  const node = (id: string, kind: NodeKind, label: string) => { if (!graph.hasNode(id)) graph.addNode(id, { kind, label }); };
  const edge = (a: string, b: string, weight: number, kind: string, label?: string) => {
    if (a === b || !graph.hasNode(a) || !graph.hasNode(b)) return;
    if (graph.hasEdge(a, b)) {
      if (graph.getEdgeAttribute(a, b, 'weight') > weight) graph.mergeEdgeAttributes(a, b, { weight, kind, label });
      return;
    }
    graph.addEdge(a, b, { weight, kind, label });
  };
  for (const p of s.people) node(p.id, 'person', p.name);
  for (const p of s.projects) node(p.id, 'project', `${p.name} (${p.year})`);
  for (const p of s.problems) node(p.id, 'problem', p.description);
  for (const k of s.skills) node(k.id, 'skill', k.name);

  for (const m of s.memberships) edge(m.person_id, m.project_id, ROLE_WEIGHT[m.role] ?? 1.0, m.role);
  for (const p of s.problems) {
    edge(p.id, p.project_id, 1.0, 'problem-of');
    if (p.solved_by) edge(p.solved_by, p.id, 1.0, 'solved');
    if (p.helper_id) edge(p.helper_id, p.id, 1.0, 'helped');
  }
  for (const p of s.projects) if (p.continued_from) edge(p.id, p.continued_from, 1.0, 'continued');
  for (const ps of s.projectSkills) edge(ps.project_id, ps.skill_id, 2.0, 'uses');
  for (const ps of s.personSkills) edge(ps.person_id, ps.skill_id, 2.0, 'skill');
  for (const c of s.connections) {
    if (c.status !== 'active') continue;
    edge(c.from_person, c.to_person, 1.0, c.source === 'shared-project' ? 'teammates' : 'connected', c.source);
  }
  return graph;
}

export function getGraph(): Graph {
  const s = snapshot();
  if (g.__gtGraph?.version !== s.version) g.__gtGraph = { version: s.version, graph: buildGraph(s) };
  return g.__gtGraph.graph;
}
