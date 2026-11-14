import crypto from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { getDb } from './db';
import { geminiJson, geminiEnabled } from './gemini';

/**
 * Optional wording polish for connection descriptions. The deterministic template stays the source of truth:
 * Claude may only rephrase it, every result is fact-checked against the template, and results are cached.
 */
export const POLISH_PREFIX = 'polish:';

const SYSTEM =
  'You rewrite short descriptions of how a Georgia Tech student or alum relates to a search. ' +
  'Rewrite the given description into 2 or 3 natural sentences. Use only facts that appear in it: keep every name, project, year, role and number exactly as written, and add nothing new. ' +
  'Refer to people by first name and do not use gendered pronouns. Keep the warm path if it is mentioned. Reply with the rewritten description only.';

const key = (text: string) => POLISH_PREFIX + crypto.createHash('sha256').update(text).digest('hex').slice(0, 32);

/** Every year, number and capitalized term in the rewrite must already appear in the template. */
export function factCheck(template: string, polished: string): boolean {
  const lower = template.toLowerCase();
  const numbers = polished.match(/\d+(?:\.\d+)?/g) ?? [];
  if (numbers.some((n) => !template.includes(n))) return false;
  const sentenceStarts = new Set<number>();
  polished.replace(/(^|[.!?]\s+)(\S)/g, (_m, p: string, _c: string, off: number) => { sentenceStarts.add(off + p.length); return ''; });
  for (const m of polished.matchAll(/\b[A-Z][\w'()-]*/g)) {
    if (sentenceStarts.has(m.index!) && !/^[A-Z]{2,}/.test(m[0])) continue; // ordinary sentence-initial word
    if (!lower.includes(m[0].toLowerCase().replace(/'s$/, ''))) return false;
  }
  if (/\b(he|she|him|her|his|hers)\b/i.test(polished)) return false;
  return polished.length > 40 && polished.length < template.length * 1.6;
}

export async function polishDescription(template: string): Promise<{ text: string; source: 'polished' | 'template' }> {
  const db = getDb();
  const k = key(template);
  const cached = db.prepare('SELECT value FROM cache WHERE key = ?').get(k) as { value: string } | undefined;
  if (cached) return { text: cached.value, source: 'polished' };
  if (geminiEnabled()) {
    const out = await geminiJson<{ text: string }>({ system: SYSTEM, text: template, schema: { type: 'object', required: ['text'], properties: { text: { type: 'string', description: 'The rewritten description' } } }, timeoutMs: 15_000 });
    const text = out?.text?.trim() ?? '';
    if (text && factCheck(template, text)) {
      db.prepare('INSERT OR REPLACE INTO cache (key, value) VALUES (?, ?)').run(k, text);
      return { text, source: 'polished' };
    }
    return { text: template, source: 'template' };
  }
  if (!process.env.ANTHROPIC_API_KEY) return { text: template, source: 'template' };
  try {
    const client = new Anthropic({ timeout: 15_000, maxRetries: 1 });
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 1000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: SYSTEM,
      messages: [{ role: 'user', content: template }],
    } as Anthropic.Beta.MessageCreateParamsNonStreaming);
    if (response.stop_reason === 'refusal') return { text: template, source: 'template' };
    const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join(' ').trim();
    if (!factCheck(template, text)) return { text: template, source: 'template' };
    db.prepare('INSERT OR REPLACE INTO cache (key, value) VALUES (?, ?)').run(k, text);
    return { text, source: 'polished' };
  } catch (e) {
    if (e instanceof Anthropic.APIError) console.warn(`[gt-swarm] polish failed (${e.status}); showing template`);
    else console.warn('[gt-swarm] polish failed; showing template', e instanceof Error ? e.message : e);
    return { text: template, source: 'template' };
  }
}
