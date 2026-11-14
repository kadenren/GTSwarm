import { perDb } from '../db';
import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';
import { snapshot, type Snapshot } from '../data';
import { getGraph } from './build';

/**
 * Circles = Louvain communities over people, projects and domain skills.
 * Edge strengths: built/advised a project 1, project continued from project 1, consented connection 1,
 * project uses a domain skill 0.6. Each circle is named from its most common skills.
 */
export interface Circle { id: string; name: string; people: string[]; projects: string[]; topSkills: string[] }

const DOMAINS = new Set(['Robotics', 'Power electronics', 'Wearables', 'Embedded systems', 'Aerospace', 'Energy systems', 'Machine learning and software', 'Manufacturing', 'Medical devices', 'FDA regulatory']);
const g = perDb<{ __gtCircles?: { version: string; circles: Circle[]; of: Map<string, string> } }>(); // one cache per database (each demo session has its own)

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function compute(s: Snapshot) {
  const graph = new Graph({ type: 'undirected' });
  const add = (id: string) => { if (!graph.hasNode(id)) graph.addNode(id); };
  const link = (a: string, b: string, w: number) => {
    add(a); add(b);
    if (graph.hasEdge(a, b)) graph.updateEdgeAttribute(a, b, 'strength', (x: number) => x + w);
    else graph.addEdge(a, b, { strength: w });
  };
  for (const p of s.people) add(p.id);
  for (const m of s.memberships) link(m.person_id, m.project_id, m.role === 'advisor' ? 0.7 : 1);
  for (const p of s.projects) if (p.continued_from) link(p.id, p.continued_from, 1);
  for (const c of s.connections) if (c.source !== 'shared-project') link(c.from_person, c.to_person, 1);
  for (const ps of s.projectSkills) { const name = s.skill.get(ps.skill_id)!.name; if (DOMAINS.has(name)) link(ps.project_id, ps.skill_id, 0.6); }
  for (const ps of s.personSkills) { const name = s.skill.get(ps.skill_id)!.name; if (DOMAINS.has(name)) link(ps.person_id, ps.skill_id, 0.4); }
  const parts = louvain(graph, { getEdgeWeight: 'strength', rng: seeded(42), resolution: 1 }) as Record<string, number>;
  const groups = new Map<number, string[]>();
  for (const [node, c] of Object.entries(parts)) { if (!groups.has(c)) groups.set(c, []); groups.get(c)!.push(node); }
  const circles: Circle[] = [];
  for (const nodes of groups.values()) {
    const people = nodes.filter((n) => n.startsWith('person:'));
    const projects = nodes.filter((n) => n.startsWith('project:'));
    if (people.length < 4) continue;
    const counts = new Map<string, number>();
    for (const pr of projects) for (const sk of s.projectSkillNames.get(pr) ?? []) counts.set(sk, (counts.get(sk) ?? 0) + (DOMAINS.has(sk) ? 3 : 1));
    for (const pe of people) for (const sk of s.skillsOf.get(pe) ?? []) counts.set(sk, (counts.get(sk) ?? 0) + (DOMAINS.has(sk) ? 1 : 0.3));
    const ranked = [...counts].sort((a, b) => b[1] - a[1]).map(([k]) => k);
    const domains = ranked.filter((k) => DOMAINS.has(k)).slice(0, 2);
    const name = domains.length === 2 ? `${domains[0]} and ${domains[1]}` : domains[0] ?? ranked[0] ?? 'Builders';
    circles.push({ id: '', name, people, projects, topSkills: ranked.filter((k) => !domains.includes(k)).slice(0, 5) });
  }
  circles.sort((a, b) => b.people.length - a.people.length);
  // stable ids; disambiguate repeated names
  const seen = new Map<string, number>();
  circles.forEach((c, i) => {
    c.id = `circle-${i + 1}`;
    const n = (seen.get(c.name) ?? 0) + 1;
    seen.set(c.name, n);
    if (n > 1) c.name = `${c.name} ${['', '', 'II', 'III', 'IV', 'V', 'VI'][n] ?? n}`;
  });
  const of = new Map<string, string>();
  for (const c of circles) for (const p of [...c.people, ...c.projects]) of.set(p, c.id);
  return { circles, of };
}

export function detectCircles(): Circle[] {
  const s = snapshot();
  if (g.__gtCircles?.version !== s.version) g.__gtCircles = { version: s.version, ...compute(s) };
  return g.__gtCircles.circles;
}
export function circleOf(nodeId: string): Circle | undefined {
  detectCircles();
  const id = g.__gtCircles!.of.get(nodeId);
  return g.__gtCircles!.circles.find((c) => c.id === id);
}

export interface Intro { personId: string; name: string; type: 'student' | 'alum'; score: number; reasons: string[]; sameCircle: boolean }

/**
 * "You should meet": Adamic-Adar link prediction over the full graph (people, projects, problems, skills).
 * score(a, b) = sum over shared neighbors z of 1 / log(degree(z)). Only people not yet connected are suggested.
 */
export function suggestIntros(personId: string, limit = 3, within?: string[]): Intro[] {
  const s = snapshot();
  const graph = getGraph();
  if (!graph.hasNode(personId)) return [];
  const mine = new Set(graph.neighbors(personId));
  const cand = new Map<string, { score: number; via: string[] }>();
  for (const z of mine) {
    const deg = graph.degree(z);
    if (deg < 2) continue;
    const w = 1 / Math.log(deg + 1);
    for (const b of graph.neighbors(z)) {
      if (b === personId || !b.startsWith('person:') || mine.has(b)) continue; // mine.has(b) = already directly linked
      const p = s.person.get(b)!;
      if (!p.claimed) continue;
      const c = cand.get(b) ?? { score: 0, via: [] };
      c.score += w;
      c.via.push(z);
      cand.set(b, c);
    }
  }
  // default scope: the person's own circle (introductions come from circles), topped up from the whole swarm
  const myCircle = circleOf(personId)?.id;
  const scope = within ?? circleOf(personId)?.people;
  const allow = scope ? new Set(scope) : null;
  const ranked = [...cand].sort((a, b) => b[1].score - a[1].score);
  const picked = ranked.filter(([id]) => !allow || allow.has(id)).slice(0, limit);
  if (!within && picked.length < limit) picked.push(...ranked.filter((r) => !picked.includes(r)).slice(0, limit - picked.length));
  return picked
    .map(([id, c]) => {
      const p = s.person.get(id)!;
      const people = c.via.filter((v) => v.startsWith('person:')).map((v) => s.person.get(v)!.name);
      const skills = c.via.filter((v) => v.startsWith('skill:')).map((v) => s.skill.get(v)!.name);
      const projects = c.via.filter((v) => v.startsWith('project:')).map((v) => `${s.project.get(v)!.name} (${s.project.get(v)!.year})`);
      const reasons: string[] = [];
      if (people.length) reasons.push(`You both know ${people.slice(0, 2).join(' and ')}${people.length > 2 ? ` and ${people.length - 2} more` : ''}`);
      if (projects.length) reasons.push(`Linked through ${projects.slice(0, 2).join(' and ')}`);
      if (skills.length) reasons.push(`Shared skills: ${skills.slice(0, 4).join(', ')}`);
      if (circleOf(id)?.id === myCircle && myCircle) reasons.push(`Same circle: ${circleOf(id)!.name}`);
      return { personId: id, name: p.name, type: p.type, score: Math.round(c.score * 100) / 100, reasons, sameCircle: circleOf(id)?.id === myCircle };
    });
}
