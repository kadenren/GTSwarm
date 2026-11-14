import Anthropic from '@anthropic-ai/sdk';
import { snapshot } from './data';

/**
 * Turn a pasted project abstract into structured fields for confirmation.
 * AI is a helper: with ANTHROPIC_API_KEY set, Claude extracts the fields (structured outputs);
 * otherwise, or on any error or timeout, a deterministic keyword extractor runs. The user confirms either way.
 */
export interface Extracted {
  name: string;
  year: number;
  team_type: 'VIP' | 'Capstone' | 'CREATE-X' | 'Lab' | 'Club' | 'Invention Studio' | 'Startup';
  team_name: string;
  summary: string;
  technologies: string[];
  problems: { description: string; solution: string }[];
}
export const TEAM_TYPES: Extracted['team_type'][] = ['VIP', 'Capstone', 'CREATE-X', 'Lab', 'Club', 'Invention Studio', 'Startup'];

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'year', 'team_type', 'team_name', 'summary', 'technologies', 'problems'],
  properties: {
    name: { type: 'string', description: 'Short project name' },
    year: { type: 'integer', description: 'Year the project ran' },
    team_type: { type: 'string', enum: TEAM_TYPES },
    team_name: { type: 'string', description: 'Team, course, lab or company name as written; empty if not stated' },
    summary: { type: 'string', description: 'One or two plain sentences on what was built' },
    technologies: { type: 'array', items: { type: 'string' } },
    problems: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['description', 'solution'], properties: { description: { type: 'string' }, solution: { type: 'string' } } },
    },
  },
} as const;

export async function extractProject(abstract: string): Promise<{ data: Extracted; source: 'ai' | 'keyword' }> {
  const text = abstract.trim().slice(0, 8000);
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ timeout: 20_000, maxRetries: 1 });
      const response = await client.beta.messages.create({
        model: 'claude-opus-5-5',
        max_tokens: 2000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
        system:
          'You extract Georgia Tech student project records from abstracts. Use only facts stated in the abstract; never invent names, years or results. ' +
          'List only problems the abstract says were solved, each with its stated solution. If the year is not stated, use the current year.',
        messages: [{ role: 'user', content: `Abstract:\n${text}` }],
      } as Anthropic.Beta.MessageCreateParamsNonStreaming);
      if (response.stop_reason !== 'refusal') {
        const block = response.content.find((b) => b.type === 'text');
        if (block && block.type === 'text') {
          const parsed = JSON.parse(block.text) as Extracted;
          return { data: normalize(parsed, text), source: 'ai' };
        }
      }
    } catch (e) {
      if (e instanceof Anthropic.APIError) console.warn(`[gt-swarm] AI extraction failed (${e.status}); using keyword fallback`);
      else console.warn('[gt-swarm] AI extraction failed; using keyword fallback', e instanceof Error ? e.message : e);
    }
  }
  return { data: keywordExtract(text), source: 'keyword' };
}

function normalize(x: Extracted, text: string): Extracted {
  const fallback = keywordExtract(text);
  return {
    name: x.name?.trim() || fallback.name,
    year: Number.isInteger(x.year) && x.year >= 2000 && x.year <= 2030 ? x.year : fallback.year,
    team_type: TEAM_TYPES.includes(x.team_type) ? x.team_type : fallback.team_type,
    team_name: x.team_name?.trim() || fallback.team_name,
    summary: x.summary?.trim() || fallback.summary,
    technologies: [...new Set((x.technologies ?? []).map((t) => t.trim()).filter(Boolean))].slice(0, 10),
    problems: (x.problems ?? []).filter((p) => p.description?.trim() && p.solution?.trim()).slice(0, 5),
  };
}

const sentences = (t: string) => t.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);

/** Deterministic extractor: regexes for year and team type, the swarm's own skill list for technologies. */
export function keywordExtract(text: string): Extracted {
  const s = snapshot();
  const sents = sentences(text);
  const lower = text.toLowerCase();
  const yearMatch = text.match(/\b(20[0-3]\d)\b/);
  const team_type: Extracted['team_type'] =
    /\bvip\b|vertically integrated/i.test(text) ? 'VIP'
    : /create-?x/i.test(text) ? 'CREATE-X'
    : /capstone|senior design|junior design/i.test(text) ? 'Capstone'
    : /invention studio/i.test(text) ? 'Invention Studio'
    : /\bstartup\b|founded|company/i.test(text) ? 'Startup'
    : /\blab\b|laboratory|research group/i.test(text) ? 'Lab'
    : /\bclub\b|society|team competes|competition team/i.test(text) ? 'Club'
    : 'Capstone';
  const teamName = text.match(/\b(VIP [A-Z][\w ]{2,40}?|[A-Z]{2,4} (?:Senior|Junior) Design|[A-Z]{2,4} Capstone|[A-Z][\w ]{2,30} Lab)\b/)?.[1]?.trim() ?? (team_type === 'Invention Studio' ? 'Invention Studio' : team_type === 'CREATE-X' ? 'CREATE-X Startup Launch' : '');
  const named = text.match(/^\s*([A-Z][\w-]*(?: [A-Z][\w-]*){0,4})\s*[:\-–]/)?.[1] ?? text.match(/\b(?:called|named|project,?)\s+([A-Z][\w-]+(?: [A-Z][\w-]+){0,3})/)?.[1];
  const technologies = s.skills
    .map((k) => k.name)
    .filter((n) => n.length > 2 && new RegExp(`(^|[^a-z0-9])${n.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(lower))
    .slice(0, 10);
  const problems: Extracted['problems'] = [];
  for (let i = 0; i < sents.length; i++) {
    const t = sents[i];
    if (!/(problem|issue|challenge|struggl|fail|drop|noise|drift|overheat|crash|unstable|broke|couldn't|could not)/i.test(t)) continue;
    const sol = t.match(/(?:,|;)?\s*(?:so we|we fixed (?:it|this) by|fixed by|solved (?:it |this )?by|which we solved by|we solved (?:it|this) by)\s+(.+)$/i);
    const next = sents[i + 1];
    const description = (sol ? t.slice(0, sol.index) : t).replace(/^(the )?(main |biggest |key )?(problem|issue|challenge) (was|is) (that )?/i, '').replace(/[.,;]$/, '');
    const solution = sol?.[1] ?? (next && /(fix|solv|switch|added|replac|redesign|moved|used|implemented)/i.test(next) ? next : '');
    if (description.length > 8 && solution) problems.push({ description: description.charAt(0).toUpperCase() + description.slice(1), solution });
    if (problems.length >= 3) break;
  }
  return {
    name: named ?? sents[0]?.split(/[,.]/)[0]?.split(' ').slice(0, 5).join(' ') ?? 'New project',
    year: yearMatch ? +yearMatch[1] : new Date().getFullYear(),
    team_type,
    team_name: teamName,
    summary: sents.slice(0, 2).join(' ').slice(0, 400),
    technologies,
    problems,
  };
}
