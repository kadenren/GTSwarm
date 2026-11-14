import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { getDb } from './db';
import { geminiEnabled } from './gemini';
import type { Snapshot } from './data';

/**
 * Gemini embeddings: meaning-based vectors for every person, project and solved problem.
 * Computed once by `npm run ai:warm` and stored in SQLite (table gemini_vec), so searches only embed the query,
 * and demo queries are cached too. A vector is used only if the text it was computed from is unchanged.
 */
export const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
const DIM = 768;
const hash = (t: string) => crypto.createHash('sha256').update(t).digest('hex').slice(0, 24);

export function geminiDocText(s: Snapshot, id: string): string {
  if (id.startsWith('person:')) {
    const p = s.person.get(id)!;
    const projects = (s.projectsOf.get(id) ?? []).map((m) => { const pr = s.project.get(m.project_id)!; return `${m.role} on ${pr.name} (${pr.year}): ${pr.summary}`; });
    const solved = (s.problemsBy.get(id) ?? []).map((pb) => `Solved: ${pb.description}`);
    return [`${p.name}, ${p.type === 'alum' ? `Georgia Tech alum ${p.grad_year}` : 'Georgia Tech student'}, ${p.major}. ${p.current_role ?? ''}`, p.bio, `Skills: ${(s.skillsOf.get(id) ?? []).join(', ')}`, ...projects, ...solved].join('\n').slice(0, 6000);
  }
  if (id.startsWith('project:')) {
    const p = s.project.get(id)!;
    return `${p.name} (${p.team_type}, ${p.team_name}, ${p.year}). ${p.summary} Technologies: ${p.technologies.join(', ')}.${p.outcome ? ` Outcome: ${p.outcome}.` : ''}`;
  }
  const pb = s.problem.get(id)!;
  return `Problem: ${pb.description}\nSolution: ${pb.solution}`;
}

const client = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 30_000 } });
const toUnit = (v: number[]) => { const a = Float32Array.from(v); let n = 0; for (const x of a) n += x * x; n = Math.sqrt(n) || 1; for (let i = 0; i < a.length; i++) a[i] /= n; return a; };

async function embedBatch(texts: string[], taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'): Promise<Float32Array[]> {
  const res = await client().models.embedContent({ model: EMBED_MODEL, contents: texts, config: { taskType, outputDimensionality: DIM } });
  const out = (res.embeddings ?? []).map((e) => toUnit(e.values ?? []));
  if (out.length !== texts.length || out.some((v) => v.length !== DIM)) throw new Error('unexpected embedding response');
  return out;
}

/** Embed every document whose text changed since its stored vector. Returns how many were (re)embedded. */
export async function embedMissing(s: Snapshot, onProgress?: (done: number, total: number) => void): Promise<number> {
  if (!geminiEnabled()) return 0;
  const db = getDb();
  const stored = new Map((db.prepare('SELECT id, text_hash FROM gemini_vec').all() as { id: string; text_hash: string }[]).map((r) => [r.id, r.text_hash]));
  const ids = [...s.people.filter((p) => p.claimed).map((p) => p.id), ...s.projects.map((p) => p.id), ...s.problems.map((p) => p.id)];
  const todo = ids.map((id) => ({ id, text: geminiDocText(s, id) })).filter((d) => stored.get(d.id) !== hash(d.text));
  const put = db.prepare('INSERT OR REPLACE INTO gemini_vec (id, text_hash, vec) VALUES (?,?,?)');
  for (let i = 0; i < todo.length; i += 90) {
    const chunk = todo.slice(i, i + 90);
    const vecs = await embedBatch(chunk.map((d) => d.text), 'RETRIEVAL_DOCUMENT');
    db.transaction(() => chunk.forEach((d, j) => put.run(d.id, hash(d.text), Buffer.from(vecs[j].buffer))))();
    onProgress?.(Math.min(i + 90, todo.length), todo.length);
  }
  return todo.length;
}

/** Stored vectors that still match their document text. */
const g = globalThis as unknown as { __gtGemVec?: { version: string; vecs: Map<string, Float32Array> } };
export function geminiVectors(s: Snapshot): Map<string, Float32Array> {
  if (g.__gtGemVec?.version === s.version) return g.__gtGemVec.vecs;
  const rows = getDb().prepare('SELECT id, text_hash, vec FROM gemini_vec').all() as { id: string; text_hash: string; vec: Buffer }[];
  const vecs = new Map<string, Float32Array>();
  for (const r of rows) {
    const exists = s.person.has(r.id) || s.project.has(r.id) || s.problem.has(r.id);
    if (!exists || r.vec.length !== DIM * 4) continue;
    if (hash(geminiDocText(s, r.id)) !== r.text_hash) continue;
    vecs.set(r.id, new Float32Array(r.vec.buffer.slice(r.vec.byteOffset, r.vec.byteOffset + r.vec.byteLength)));
  }
  g.__gtGemVec = { version: s.version, vecs };
  return vecs;
}

/** Query vector, cached by query text so repeated (and pre-warmed demo) searches never wait on the network. */
export async function geminiQueryVector(query: string): Promise<Float32Array | null> {
  if (!geminiEnabled()) return null;
  const db = getDb();
  const k = `gq:${EMBED_MODEL}:${hash(query.trim().toLowerCase())}`;
  const row = db.prepare('SELECT value FROM cache WHERE key = ?').get(k) as { value: string } | undefined;
  if (row) return Float32Array.from(JSON.parse(row.value) as number[]);
  try {
    const [v] = await embedBatch([query.trim()], 'RETRIEVAL_QUERY');
    db.prepare('INSERT OR REPLACE INTO cache (key, value) VALUES (?, ?)').run(k, JSON.stringify(Array.from(v)));
    return v;
  } catch (e) {
    console.warn('[gt-swarm] Gemini query embedding failed; using fallback:', e instanceof Error ? e.message : e);
    return null;
  }
}

/** After a write, embed whatever is new in the background (never blocks the request). */
let pending: Promise<unknown> | null = null;
export function embedNewInBackground() {
  if (!geminiEnabled() || pending) return;
  pending = import('./data')
    .then(({ snapshot }) => embedMissing(snapshot()))
    .catch((e) => console.warn('[gt-swarm] background Gemini embedding failed:', e instanceof Error ? e.message : e))
    .finally(() => { pending = null; });
}
