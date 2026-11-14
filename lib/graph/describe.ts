import { snapshot, firstName, lineageRoot, shortYear, type Person, type Role, type Snapshot } from '../data';
import type { Evidence } from './rank';
import type { WarmPath } from './path';

/**
 * Plain-English description of how a person relates to a search and to the viewer.
 * Deterministic template built only from database facts, so it works offline and never invents details.
 */
export interface Description { short: string; full: string; facts: string[] }

const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
const stripDot = (t: string) => t.replace(/[.\s]+$/, '');
const article = (w: string) => (/^[aeiou]/i.test(w) ? 'an' : 'a');

export function directionLabel(viewer: Person | undefined, p: Person): string {
  if (!viewer) return '';
  const a = viewer.type === 'alum' ? 'alum' : 'student';
  const b = p.type === 'alum' ? 'alum' : 'student';
  return `${a} to ${b}`;
}

interface Input {
  s: Snapshot; person: Person; viewerId: string; query: string; role: Role | null; lead: Evidence; evidence: Evidence[];
  ties: string[]; path: WarmPath | null; openToRole: boolean;
}

export function describeFromEvidence({ s, person, viewerId, query, role, lead, evidence, ties, path, openToRole }: Input): Description {
  const name = firstName(person);
  const facts: string[] = [];
  const sentences: string[] = [];
  let short = '';
  const viewer = s.person.get(viewerId);
  const viewerProjects = (s.projectsOf.get(viewerId) ?? []).map((m) => s.project.get(m.project_id)!);

  const lineageNote = (projectId: string): string | null => {
    const pr = s.project.get(projectId)!;
    for (const vp of viewerProjects) {
      if (vp.id === projectId) return `You work on ${vp.name} together.`;
      if (vp.continued_from === projectId) return `${vp.name} continued from that project.`;
      if (pr.continued_from === vp.id) return `That project continued from your ${vp.name}.`;
      if (lineageRoot(s, vp.id) === lineageRoot(s, projectId)) return `It is in the same project family as ${vp.name}.`;
    }
    return null;
  };
  const verbFor = (role?: string) => (role === 'advisor' ? 'advised' : role === 'founder' ? 'founded' : role === 'maintainer' ? 'maintains' : role === 'helped' ? 'helped solve' : 'built');
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

  // narrative lead: the matched problem, else the best-matching project, else the profile
  const records = evidence.filter((e) => e.kind !== 'person' && e.sim > 0);
  const narrativeLead = lead.kind === 'person' ? records[0] ?? lead : lead;

  if (narrativeLead.kind === 'problem') {
    const pb = s.problem.get(narrativeLead.id)!;
    const pr = s.project.get(pb.project_id)!;
    const verb = narrativeLead.role === 'helped' ? 'helped solve' : 'solved';
    short = `${cap(verb)} "${pb.description}" (${pr.name}, ${pr.year})`;
    sentences.push(`${name} ${verb} "${pb.description}" on ${pr.name} (${pr.team_name}, ${pr.year}).`);
    sentences.push(`The fix: ${lowerFirst(stripDot(pb.solution))}.`);
    facts.push(pb.id, pr.id);
    const ln = lineageNote(pr.id);
    if (ln) sentences.push(ln);
  } else if (narrativeLead.kind === 'project') {
    const pr = s.project.get(narrativeLead.id)!;
    const verb = verbFor(narrativeLead.role);
    short = `${cap(verb)} ${pr.name} on ${pr.team_name} (${pr.year})`;
    sentences.push(`${name} ${verb} ${pr.name} on ${pr.team_name} in ${pr.year}: ${lowerFirst(stripDot(pr.summary))}.`);
    facts.push(pr.id);
    const ln = lineageNote(pr.id);
    if (ln) sentences.push(ln);
  } else {
    short = person.current_role ?? `${person.major} ${person.type}`;
    sentences.push(`${name}'s profile: ${lowerFirst(stripDot(person.bio.split('. ')[0]))}.`);
  }

  // a second documented record, if it is also relevant (for example, a shipped product or the original project)
  const leadYear = narrativeLead.kind === 'project' ? s.project.get(narrativeLead.id)!.year : narrativeLead.kind === 'problem' ? s.project.get(s.problem.get(narrativeLead.id)!.project_id)!.year : null;
  const second = records.find((e) => e.id !== narrativeLead.id && e.sim > 0.2 && !facts.includes(e.id) && !(e.kind === 'problem' && facts.includes(s.problem.get(e.id)!.project_id)));
  if (second) {
    if (second.kind === 'project') {
      const pr = s.project.get(second.id)!;
      const when = leadYear === null ? 'Also' : pr.year < leadYear ? 'Earlier' : pr.year > leadYear ? 'Later' : 'Also';
      const ln = lineageNote(pr.id);
      sentences.push(`${when}, ${name} ${verbFor(second.role)} ${pr.name} (${pr.year})${pr.outcome ? `, with the outcome "${pr.outcome}"` : ''}.${ln ? ' ' + ln : ''}`);
      facts.push(pr.id);
    } else {
      const pb = s.problem.get(second.id)!;
      sentences.push(`${name} also ${verbFor(second.role)} "${pb.description}".`);
      facts.push(pb.id);
    }
  }

  if (person.type === 'alum' && person.current_role) sentences.push(`${name} is now ${person.current_role}.`);
  else if (person.type === 'student') sentences.push(`${name} is a ${person.major} student, class of ${person.grad_year}.`);

  if (role) {
    sentences.push(
      openToRole
        ? `That matches your search for ${article(role)} ${role.toLowerCase()} ("${query}"), and ${name} is open to ${role} conversations.`
        : `That is relevant to "${query}", although ${name} has not listed ${role} as an open role.`,
    );
  } else {
    sentences.push(`That is close to the problem you described ("${query.length > 80 ? query.slice(0, 77) + '...' : query}").`);
  }

  if (path && path.hops > 0 && path.hops <= 5) {
    sentences.push(path.hops === 1 ? 'You are already directly connected.' : `Warm path: ${path.text}.`);
  } else if (ties.length) {
    sentences.push(`Shared ties: ${ties[0].toLowerCase()}.`);
  } else {
    sentences.push('There is no close warm path yet, so this would be a new connection.');
  }

  const dir = directionLabel(viewer, person);
  const tag = person.type === 'alum' ? `alum ${shortYear(person.grad_year)}` : 'student';
  return { short: `${short} · ${tag}${dir ? ` · ${dir}` : ''}`, full: sentences.join(' '), facts };
}

/** Standalone entry point matching the spec: recomputes evidence for one person. */
export async function describeConnection(personId: string, query: string, role: Role | null, viewerId: string): Promise<Description | null> {
  const { rankForExpertise, rankForProblem } = await import('./rank');
  const out = role ? await rankForExpertise(query, role, viewerId) : await rankForProblem(query, viewerId);
  const hit = out.results.find((r) => r.personId === personId);
  if (hit) return hit.description;
  const s = snapshot();
  const p = s.person.get(personId);
  if (!p) return null;
  const { similarity } = await import('../search');
  const { sims } = await similarity(query);
  const evidence: Evidence[] = [{ kind: 'person' as const, id: p.id, sim: sims.get(p.id) ?? 0 }, ...(s.projectsOf.get(p.id) ?? []).map((m) => ({ kind: 'project' as const, id: m.project_id, sim: sims.get(m.project_id) ?? 0, role: m.role }))].sort((a, b) => b.sim - a.sim);
  const { warmPath } = await import('./path');
  return describeFromEvidence({ s, person: p, viewerId, query, role, lead: evidence[0], evidence, ties: [], path: warmPath(viewerId, p.id), openToRole: role ? p.open_to.includes(role) : false });
}
