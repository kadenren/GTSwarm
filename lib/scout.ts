import Anthropic from '@anthropic-ai/sdk';
import { rankForExpertise, rankForProblem } from './graph/rank';
import { snapshot, ROLES, type Audience, type Role } from './data';

/**
 * GT Swarm Scout: an agent that takes a plain-language need and searches
 *   1. the GT Swarm graph (our tools: people by expertise, solved problems), then
 *   2. the public web for Georgia Tech alumni with that expertise (Anthropic server-side web search),
 * and reports people with evidence. Every step is streamed to the UI as an event.
 * Without ANTHROPIC_API_KEY (or on an API error) a deterministic graph-only scout runs instead.
 */

export type ScoutEvent =
  | { type: 'mode'; ai: boolean; note: string }
  | { type: 'step'; kind: 'think' | 'graph' | 'web' | 'done' | 'skip' | 'error'; label: string; detail?: string }
  | { type: 'people'; source: string; people: ScoutPerson[] }
  | { type: 'problems'; problems: ScoutProblem[] }
  | { type: 'web'; query: string; results: { title: string; url: string }[] }
  | { type: 'note'; text: string }
  | { type: 'report'; report: ScoutReport };

export interface ScoutPerson { id: string; name: string; label: string; type: 'student' | 'alum'; why: string; hops: number | null; score?: number }
export interface ScoutProblem { id: string; description: string; solution: string; solver: string; solverId: string; project: string }
export interface ScoutReport {
  summary: string;
  swarm: ScoutPerson[];
  web: { name: string; context: string; url: string; why: string }[];
  nextSteps: string[];
  source: 'ai' | 'graph';
}

type Emit = (e: ScoutEvent) => void;

// ---------- graph tools (shared by the AI and the fallback) ----------
async function searchPeople(viewerId: string, query: string, role: Role, audience: Audience) {
  const out = await rankForExpertise(query, role, viewerId, audience);
  return out.results.slice(0, 6).map<ScoutPerson>((r) => ({
    id: r.personId, name: r.name, label: r.label, type: r.type, why: r.description.short, hops: r.path?.hops ?? null, score: r.score,
  }));
}
async function searchProblems(viewerId: string, query: string) {
  const out = await rankForProblem(query, viewerId);
  const people = out.results.slice(0, 6).map<ScoutPerson>((r) => ({
    id: r.personId, name: r.name, label: r.label, type: r.type, why: r.description.short, hops: r.path?.hops ?? null, score: r.score,
  }));
  const problems = out.results.filter((r) => r.matchedProblem).slice(0, 4).map<ScoutProblem>((r) => ({
    id: r.matchedProblem!.id, description: r.matchedProblem!.description, solution: r.matchedProblem!.solution,
    solver: r.name, solverId: r.personId, project: `${r.matchedProblem!.projectName} (${r.matchedProblem!.year})`,
  }));
  return { people, problems };
}

// ---------- deterministic fallback ----------
/** Infer the role and audience a request is asking for, from plain words. */
export function readNeed(need: string): { role: Role; audience: Audience; roleWhy: string } {
  const t = need.toLowerCase();
  const role: Role = /co-?founder|partner to build|start (a|the) company/.test(t) ? 'Cofounder'
    : /advis|mentor|regulat|fda|guidance|been through/.test(t) ? 'Advisor'
    : /hire|intern|early engineer|join (our|the) team|part-time engineer/.test(t) ? 'Early engineer'
    : /customer|pilot user|beta tester|buyer/.test(t) ? 'First customer'
    : 'Helper';
  const audience: Audience = /\bstudents?\b/.test(t) && !/alum/.test(t) ? 'students' : /\balum(ni|nus|na)?\b/.test(t) && !/student/.test(t) ? 'alumni' : 'both';
  return { role, audience, roleWhy: role === 'Helper' ? 'someone who can help' : `${/^[aeiou]/i.test(role) ? 'an' : 'a'} ${role.toLowerCase()}` };
}

async function graphOnlyScout(need: string, viewerId: string, emit: Emit, reason: string | null) {
  const s = snapshot();
  const { role, audience, roleWhy } = readNeed(need);
  emit({ type: 'step', kind: 'think', label: `Reading your request: looking for ${roleWhy}${audience !== 'both' ? ` among ${audience}` : ''}`, detail: need.length > 140 ? need.slice(0, 137) + '…' : need });
  emit({ type: 'step', kind: 'graph', label: `Searching ${s.problems.length} solved problems` });
  const { people: solvers, problems } = await searchProblems(viewerId, need);
  emit({ type: 'problems', problems });
  emit({ type: 'step', kind: 'graph', label: `Ranking ${s.people.filter((p) => p.claimed).length} builders for ${roleWhy}` });
  const experts = await searchPeople(viewerId, need, role, audience);
  const merged = [...solvers, ...experts].filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i)
    .filter((p) => audience === 'both' || (audience === 'students' ? p.type === 'student' : p.type === 'alum'))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 6);
  emit({ type: 'step', kind: 'graph', label: 'Checking warm paths from you', detail: merged.filter((p) => p.hops !== null && p.hops <= 3).length + ' of the top matches are within 3 hops' });
  emit({ type: 'people', source: 'GT Swarm network', people: merged });
  if (reason) emit({ type: 'step', kind: 'skip', label: 'Live web search is off', detail: reason });
  emit({
    type: 'report',
    report: {
      source: 'graph',
      summary: merged.length
        ? `Found ${merged.length} people in GT Swarm whose documented work matches. ${problems[0] ? `${problems[0].solver} solved the closest problem: "${problems[0].description}".` : ''}`.trim()
        : 'Nobody in GT Swarm has documented work close to this yet.',
      swarm: merged,
      web: [],
      nextSteps: merged.length
        ? [`Open ${merged[0].name}'s panel in I'm stuck and send a help request.`, 'Log the fix on your project once solved, so the next builder finds it.']
        : ['Try broader wording, or describe the outcome you need instead of the tool.', 'Post the question to your circle so someone can claim it.'],
    },
  });
  emit({ type: 'step', kind: 'done', label: 'Scout finished' });
}

// ---------- AI scout ----------
const TOOLS: Anthropic.ToolUnion[] = [
  {
    name: 'search_swarm_people',
    description: 'Search the GT Swarm graph of Georgia Tech students and alumni and their documented projects. Returns ranked people with the evidence for each match and the number of hops in the warm path from the user. Use first, before the web.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Skills or experience to look for, in plain words' },
        role: { type: 'string', enum: [...ROLES], description: 'The kind of help needed' },
        audience: { type: 'string', enum: ['students', 'alumni', 'both'] },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_solved_problems',
    description: 'Search problems that GT Swarm builders already solved (description and solution) and who solved them. Use when the user is stuck on a specific technical problem.',
    input_schema: { type: 'object', properties: { query: { type: 'string', description: 'The problem in plain words' } }, required: ['query'] },
  },
  { type: 'web_search_20260209', name: 'web_search', max_uses: 4 },
  {
    name: 'report_findings',
    description: 'Call exactly once at the end with the final answer for the user.',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Two or three sentences answering the need' },
        swarm_matches: {
          type: 'array',
          items: { type: 'object', properties: { person_id: { type: 'string' }, why: { type: 'string' } }, required: ['person_id', 'why'] },
          description: 'Best GT Swarm people, using ids returned by the swarm tools',
        },
        web_leads: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Person or group name exactly as the source states it' },
              context: { type: 'string', description: 'Their Georgia Tech connection and current role, as the source states it' },
              url: { type: 'string', description: 'A URL returned by web_search that supports this lead' },
              why: { type: 'string' },
            },
            required: ['name', 'context', 'url', 'why'],
          },
        },
        next_steps: { type: 'array', items: { type: 'string' } },
      },
      required: ['summary', 'swarm_matches', 'web_leads', 'next_steps'],
    },
  },
];

const SYSTEM = `You are GT Swarm Scout. A Georgia Tech student or alum tells you what they need help with while building something. Find the right people.

Work in this order:
1. Search the GT Swarm graph first with search_solved_problems (for a specific technical problem) and/or search_swarm_people (for expertise or a role).
2. Then use web_search to find Georgia Tech alumni, faculty labs or student teams with public evidence of this expertise, for example queries combining "Georgia Tech" with the skill. Prefer professional sources: gatech.edu pages, public LinkedIn profile pages, GitHub, company pages, papers and news.
3. Call report_findings once with your answer.

Rules:
- Only report a web lead when a search result shows both the expertise and a Georgia Tech connection, and cite that result's URL. Never invent people, links or affiliations.
- Share only public professional information. Never include emails, phone numbers or home addresses.
- Refer to people by name; do not guess pronouns.
- GT Swarm people use ids like person:p005. Use those ids in swarm_matches.
- Keep it fast: at most two swarm searches and four web searches.`;

const SYSTEM_NO_WEB = SYSTEM
  .replace(/2\. Then use web_search[\s\S]*?news\.\n/, '2. Search again with different wording or a different role if the first results are thin.\n')
  .replace('Keep it fast: at most two swarm searches and four web searches.', 'Keep it fast: at most three swarm searches. Leave web_leads empty.');

export async function runScout(need: string, viewerId: string, emit: Emit, opts: { web?: boolean } = {}) {
  const text = need.trim().slice(0, 3000);
  if (!text) { emit({ type: 'step', kind: 'error', label: 'Describe what you need first.' }); return; }
  // Default: search only the indexed GT Swarm network (no live web calls). Claude plans the search when a key is set.
  if (!process.env.ANTHROPIC_API_KEY) {
    emit({ type: 'mode', ai: false, note: 'Searching the indexed GT Swarm network.' });
    return graphOnlyScout(text, viewerId, emit, null);
  }
  const web = !!opts.web;
  emit({ type: 'mode', ai: true, note: web ? 'AI scout: GT Swarm network, then the live public web.' : 'AI scout: plans and runs searches over the indexed GT Swarm network.' });
  const s = snapshot();
  const client = new Anthropic({ timeout: 90_000, maxRetries: 1 });
  const seenUrls = new Set<string>();
  const seenPeople = new Map<string, ScoutPerson>();
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: `What I need:\n${text}` }];
  emit({ type: 'step', kind: 'think', label: 'Reading your request', detail: text.length > 140 ? text.slice(0, 137) + '…' : text });

  try {
    for (let turn = 0; turn < 8; turn++) {
      const stream = client.messages.stream({
        model: 'claude-opus-5-5',
        max_tokens: 16000,
        output_config: { effort: 'low' },
        system: web ? SYSTEM : SYSTEM_NO_WEB,
        tools: web ? TOOLS : TOOLS.filter((t) => !('type' in t && t.type === 'web_search_20260209')),
        messages,
      });
      stream.on('contentBlock', (block) => {
        if (block.type === 'server_tool_use' && block.name === 'web_search') {
          const q = (block.input as { query?: string })?.query ?? '';
          emit({ type: 'step', kind: 'web', label: `Searching the web: "${q}"` });
        } else if (block.type === 'web_search_tool_result') {
          const c = block.content;
          if (Array.isArray(c)) {
            const results = c.slice(0, 6).map((r) => ({ title: r.title, url: r.url }));
            results.forEach((r) => seenUrls.add(r.url));
            emit({ type: 'web', query: '', results });
          } else {
            emit({ type: 'step', kind: 'error', label: 'A web search failed', detail: c.error_code });
          }
        } else if (block.type === 'text' && block.text.trim()) {
          emit({ type: 'note', text: block.text.trim().slice(0, 400) });
        }
      });
      const message = await stream.finalMessage();

      if (message.stop_reason === 'refusal') throw new Error('The model declined this request.');
      if (message.stop_reason === 'pause_turn') { messages.push({ role: 'assistant', content: message.content }); continue; }
      const toolUses = message.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
      if (!toolUses.length) break;
      messages.push({ role: 'assistant', content: message.content });

      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const t of toolUses) {
        const input = (t.input ?? {}) as Record<string, unknown>;
        if (t.name === 'search_swarm_people') {
          const query = String(input.query ?? '');
          const role = ROLES.includes(input.role as Role) ? (input.role as Role) : 'Helper';
          const audience = (['students', 'alumni', 'both'] as const).includes(input.audience as Audience) ? (input.audience as Audience) : 'both';
          emit({ type: 'step', kind: 'graph', label: `Searching GT Swarm for ${role.toLowerCase()}s: "${query}"` });
          const people = await searchPeople(viewerId, query, role, audience);
          people.forEach((p) => seenPeople.set(p.id, p));
          emit({ type: 'people', source: 'GT Swarm graph', people });
          results.push({ type: 'tool_result', tool_use_id: t.id, content: JSON.stringify(people.map(({ id, name, label, why, hops }) => ({ id, name, label, why, warm_path_hops: hops }))) });
        } else if (t.name === 'search_solved_problems') {
          const query = String(input.query ?? '');
          emit({ type: 'step', kind: 'graph', label: `Searching solved problems: "${query}"` });
          const { people, problems } = await searchProblems(viewerId, query);
          people.forEach((p) => seenPeople.set(p.id, p));
          emit({ type: 'problems', problems });
          results.push({ type: 'tool_result', tool_use_id: t.id, content: JSON.stringify({ problems: problems.map((p) => ({ problem: p.description, solution: p.solution, solved_by: p.solver, solver_id: p.solverId, project: p.project })), people: people.map(({ id, name, label, why }) => ({ id, name, label, why })) }) });
        } else if (t.name === 'report_findings') {
          const r = input as { summary?: string; swarm_matches?: { person_id: string; why: string }[]; web_leads?: { name: string; context: string; url: string; why: string }[]; next_steps?: string[] };
          const swarm = (r.swarm_matches ?? []).flatMap((m) => {
            const p = seenPeople.get(m.person_id) ?? (s.person.get(m.person_id) ? undefined : undefined);
            return p ? [{ ...p, why: m.why || p.why }] : [];
          });
          // only keep web leads whose URL actually came back from a search
          const web = (r.web_leads ?? []).filter((w) => seenUrls.has(w.url) && w.name && w.url.startsWith('http')).slice(0, 6);
          emit({ type: 'report', report: { source: 'ai', summary: String(r.summary ?? ''), swarm, web, nextSteps: (r.next_steps ?? []).slice(0, 4).map(String) } });
          emit({ type: 'step', kind: 'done', label: 'Scout finished' });
          return;
        } else {
          results.push({ type: 'tool_result', tool_use_id: t.id, is_error: true, content: 'Unknown tool' });
        }
      }
      messages.push({ role: 'user', content: results });
    }
    // the model ended without calling report_findings: report what was found
    const swarm = [...seenPeople.values()].slice(0, 6);
    emit({ type: 'report', report: { source: 'ai', summary: swarm.length ? `Here are the closest matches in GT Swarm.` : 'No strong matches found.', swarm, web: [], nextSteps: [] } });
    emit({ type: 'step', kind: 'done', label: 'Scout finished' });
  } catch (e) {
    const msg = e instanceof Anthropic.APIError ? `API error ${e.status}` : e instanceof Error ? e.message : 'Unknown error';
    emit({ type: 'step', kind: 'error', label: 'The AI scout hit a problem, so it switched to a graph-only search', detail: msg });
    await graphOnlyScout(text, viewerId, emit, null);
  }
}
