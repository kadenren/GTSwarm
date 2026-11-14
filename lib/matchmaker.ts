import crypto from 'node:crypto';
import { getDb } from './db';
import { geminiJson, geminiEnabled, GEMINI_MODEL } from './gemini';

/**
 * Gemini matchmaker: the graph shortlists candidates, then Gemini reads each candidate's documented record
 * against the request and returns a fit score (0 to 1) and a one-sentence reason grounded in that record.
 * Results are cached by request + candidate set, so repeated and pre-warmed demo searches are instant.
 */
export interface MatchCandidate { id: string; name: string; summary: string }
export interface MatchVerdict { id: string; fit: number; reason: string }

const SCHEMA = {
  type: 'object',
  required: ['matches'],
  properties: {
    matches: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'fit', 'reason'],
        properties: {
          id: { type: 'string', description: 'Candidate id exactly as given' },
          fit: { type: 'number', description: '0 to 1: how well this person can help with the request, based only on their record' },
          reason: { type: 'string', description: 'One sentence citing the specific project, problem or role from their record that makes them a fit (or not). Use their first name, no pronouns.' },
        },
      },
    },
  },
};

const SYSTEM =
  'You match Georgia Tech students and alumni to a builder\'s request. Judge each candidate only from the record provided: ' +
  'projects they built or advised, problems they solved, current role, and what they say they are open to. ' +
  'Directly relevant hands-on work beats adjacent experience. Being open to the requested role matters. ' +
  'Never invent facts. Score every candidate.';

export async function geminiMatch(input: { request: string; role: string | null; kind: 'expertise' | 'problem'; candidates: MatchCandidate[] }): Promise<Map<string, MatchVerdict> | null> {
  if (!geminiEnabled() || !input.candidates.length) return null;
  const db = getDb();
  const key = 'mm:' + crypto.createHash('sha256').update(JSON.stringify([GEMINI_MODEL, input.request.trim().toLowerCase(), input.role, input.kind, input.candidates.map((c) => c.id + c.summary)])).digest('hex').slice(0, 32);
  const cached = db.prepare('SELECT value FROM cache WHERE key = ?').get(key) as { value: string } | undefined;
  let verdicts: MatchVerdict[] | null = cached ? (JSON.parse(cached.value) as MatchVerdict[]) : null;
  if (!verdicts) {
    const ask = input.kind === 'problem'
      ? `A builder is stuck on this problem: "${input.request}". Who is most likely to help, based on problems they solved and what they built?`
      : `A builder is looking for a ${input.role ?? 'helper'} with this expertise: "${input.request}".`;
    const out = await geminiJson<{ matches: MatchVerdict[] }>({
      system: SYSTEM,
      text: `${ask}\n\nCandidates:\n${input.candidates.map((c) => `[${c.id}] ${c.name}\n${c.summary}`).join('\n\n')}`,
      schema: SCHEMA,
      timeoutMs: 20_000,
    });
    if (!out?.matches?.length) return null;
    const ids = new Set(input.candidates.map((c) => c.id));
    verdicts = out.matches
      .filter((m) => ids.has(m.id) && typeof m.fit === 'number')
      .map((m) => ({ id: m.id, fit: Math.max(0, Math.min(1, m.fit)), reason: String(m.reason ?? '').slice(0, 300) }));
    if (verdicts.length < input.candidates.length * 0.6) return null; // incomplete answer: keep the graph ranking
    db.prepare('INSERT OR REPLACE INTO cache (key, value) VALUES (?, ?)').run(key, JSON.stringify(verdicts));
  }
  return new Map(verdicts.map((v) => [v.id, v]));
}
