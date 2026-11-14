import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { getDb, perDb } from './db';
import { geminiEnabled } from './gemini';
import type { Snapshot } from './data';

/**
 * Gemini embeddings (Layer B of the hybrid matcher): meaning-based vectors for opted-in people, projects and solved problems.
 * - Computed in batches by `npm run ai:warm` and stored in the gemini_vec table, which is mirrored to Postgres for the
 *   hosted site, so searches only embed the query (and pre-warmed demo queries are cached too).
 * - The stored hash records the model, the dimensions and a hash of the exact text sent, so a vector is reused only
 *   when all three still match; changed records or a model change are re-embedded, unchanged ones are never re-sent.
 * - Only professional, opt-in fields are sent (no names, contact details or anything private).
 */
export const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
export const EMBED_DIM = 768;
const DIM = EMBED_DIM;
/** Metadata-carrying content hash: model, dimensions and source-text version in one value (no schema change needed). */
const hash = (t: string) => `${EMBED_MODEL}:${DIM}:${crypto.createHash('sha256').update(t).digest('hex').slice(0, 24)}`;
const QUERY_TIMEOUT_MS = Number(process.env.GTSWARM_SEMANTIC_TIMEOUT_MS ?? 3500);

/** Semantic matching runs only when a key is configured AND the feature flag is on; otherwise everything is keyword-only, as before. */
export const semanticEnabled = () => geminiEnabled() && process.env.GTSWARM_SEMANTIC_MATCHING_ENABLED === 'true';

/** Records that may be sent to an external service: opted-in (claimed) people, and all projects and solved problems. */
function embeddableIds(s: Snapshot): string[] {
  return [...s.people.filter((p) => p.claimed).map((p) => p.id), ...s.projects.map((p) => p.id), ...s.problems.map((p) => p.id)];
}

export function geminiDocText(s: Snapshot, id: string): string {
  if (id.startsWith('person:')) {
    const p = s.person.get(id)!;
    const projects = (s.projectsOf.get(id) ?? []).map((m) => { const pr = s.project.get(m.project_id)!; return `${m.role} on ${pr.name} (${pr.year}): ${pr.summary}`; });
    const solved = (s.problemsBy.get(id) ?? []).map((pb) => `Solved: ${pb.description}`);
    // professional fields only: no name, email, grades or anything the person has not chosen to show
    return [`${p.type === 'alum' ? 'Georgia Tech alum' : 'Georgia Tech student'}, ${p.major}. ${p.current_role ?? ''}`, p.bio, `Skills: ${(s.skillsOf.get(id) ?? []).join(', ')}`, ...projects, ...solved].join('\n').slice(0, 6000);
  }
  if (id.startsWith('project:')) {
    const p = s.project.get(id)!;
    return `${p.name} (${p.team_type}, ${p.team_name}, ${p.year}). ${p.summary} Technologies: ${p.technologies.join(', ')}.${p.outcome ? ` Outcome: ${p.outcome}.` : ''}`;
  }
  const pb = s.problem.get(id)!;
  return `Problem: ${pb.description}\nSolution: ${pb.solution}`;
}

const client = (timeout = 30_000) => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout } });
const toUnit = (v: number[]) => { const a = Float32Array.from(v); let n = 0; for (const x of a) n += x * x; n = Math.sqrt(n) || 1; for (let i = 0; i < a.length; i++) a[i] /= n; return a; };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function embedBatch(texts: string[], taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY', patient = false, timeout = 30_000): Promise<Float32Array[]> {
  let res;
  for (let attempt = 0; ; attempt++) {
    try {
      res = await client(timeout).models.embedContent({ model: EMBED_MODEL, contents: texts, config: { taskType, outputDimensionality: DIM } });
      break;
    } catch (e) {
      // free-tier keys are rate limited per minute: wait as long as Gemini asks, then continue (batch jobs only)
      const msg = e instanceof Error ? e.message : String(e);
      const wait = Number(msg.match(/retry in ([\d.]+)s/i)?.[1] ?? msg.match(/"retryDelay":"(\d+)s"/)?.[1] ?? 0);
      if (!patient || !/429|RESOURCE_EXHAUSTED/.test(msg) || attempt >= 8) throw e;
      await sleep(Math.min(70, Math.max(5, wait + 1)) * 1000);
    }
  }
  const out = (res.embeddings ?? []).map((e) => toUnit(e.values ?? []));
  if (out.length !== texts.length || out.some((v) => v.length !== DIM)) throw new Error('unexpected embedding response');
  return out;
}

/** Embed every document whose text changed since its stored vector. Returns how many were (re)embedded. */
export async function embedMissing(s: Snapshot, onProgress?: (done: number, total: number) => void): Promise<number> {
  if (!semanticEnabled()) return 0;
  const db = getDb();
  const ids = embeddableIds(s);
  // drop vectors for records that were deleted or withdrew consent, so nothing stale is kept
  const keep = new Set(ids);
  const del = db.prepare('DELETE FROM gemini_vec WHERE id = ?');
  for (const r of db.prepare('SELECT id FROM gemini_vec').all() as { id: string }[]) if (!keep.has(r.id)) del.run(r.id);
  const stored = new Map((db.prepare('SELECT id, text_hash FROM gemini_vec').all() as { id: string; text_hash: string }[]).map((r) => [r.id, r.text_hash]));
  const todo = ids.map((id) => ({ id, text: geminiDocText(s, id) })).filter((d) => stored.get(d.id) !== hash(d.text));
  const put = db.prepare('INSERT OR REPLACE INTO gemini_vec (id, text_hash, vec) VALUES (?,?,?)');
  for (let i = 0; i < todo.length; i += 90) { // free tier: 100 embedding requests per minute
    const chunk = todo.slice(i, i + 90);
    const vecs = await embedBatch(chunk.map((d) => d.text), 'RETRIEVAL_DOCUMENT', true);
    db.transaction(() => chunk.forEach((d, j) => put.run(d.id, hash(d.text), Buffer.from(vecs[j].buffer))))();
    onProgress?.(Math.min(i + 90, todo.length), todo.length);
  }
  return todo.length;
}

/** Stored vectors that still match their document text. */
const g = perDb<{ __gtGemVec?: { version: string; vecs: Map<string, Float32Array> } }>(); // one cache per database (each demo session has its own)
export function geminiVectors(s: Snapshot): Map<string, Float32Array> {
  if (g.__gtGemVec?.version === s.version) return g.__gtGemVec.vecs;
  const rows = getDb().prepare('SELECT id, text_hash, vec FROM gemini_vec').all() as { id: string; text_hash: string; vec: Buffer }[];
  const vecs = new Map<string, Float32Array>();
  const allowed = new Set(embeddableIds(s));
  for (const r of rows) {
    if (!allowed.has(r.id) || r.vec.length !== DIM * 4) continue;
    if (hash(geminiDocText(s, r.id)) !== r.text_hash) continue;
    vecs.set(r.id, new Float32Array(r.vec.buffer.slice(r.vec.byteOffset, r.vec.byteOffset + r.vec.byteLength)));
  }
  g.__gtGemVec = { version: s.version, vecs };
  return vecs;
}

/** Query vector, cached by query text so repeated (and pre-warmed demo) searches never wait on the network. */
export async function geminiQueryVector(query: string): Promise<Float32Array | null> {
  if (!semanticEnabled()) return null;
  const db = getDb();
  const k = `gq:${EMBED_MODEL}:${hash(query.trim().toLowerCase())}`;
  const row = db.prepare('SELECT value FROM cache WHERE key = ?').get(k) as { value: string } | undefined;
  if (row) return Float32Array.from(JSON.parse(row.value) as number[]);
  try {
    // short timeout: a slow or failed call falls back to keyword matching instead of delaying the search
    const [v] = await Promise.race([
      embedBatch([query.trim()], 'RETRIEVAL_QUERY', false, QUERY_TIMEOUT_MS),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('query embedding timed out')), QUERY_TIMEOUT_MS + 250)),
    ]);
    db.prepare('INSERT OR REPLACE INTO cache (key, value) VALUES (?, ?)').run(k, JSON.stringify(Array.from(v)));
    return v;
  } catch (e) {
    console.warn('[gt-swarm] Gemini query embedding unavailable; using keyword matching:', (e instanceof Error ? e.message : String(e)).slice(0, 120));
    return null;
  }
}

/** After a write, embed whatever is new in the background (never blocks the request). */
let pending: Promise<unknown> | null = null;
export function embedNewInBackground() {
  if (!semanticEnabled() || pending) return;
  pending = import('./data')
    .then(({ snapshot }) => embedMissing(snapshot()))
    .catch((e) => console.warn('[gt-swarm] background Gemini embedding failed:', e instanceof Error ? e.message : e))
    .finally(() => { pending = null; });
}
