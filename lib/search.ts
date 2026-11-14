import { snapshot, type Snapshot } from './data';
import { embedText, cosine, loadEmbedder } from './embed';

/**
 * Text similarity over three document kinds: people (bio + skills), projects and solved problems.
 * - semantic mode: cosine similarity of MiniLM embeddings, blended with BM25 so exact technical terms still count
 * - keyword mode (fallback): BM25 alone
 * Similarities are scaled to 0..1 per query.
 */

const STOP = new Set('a an and are as at be by for from has have i in into is it its me my of on or our that the their them this to was we when where which who will with you your need needs looking someone help how what can do does after before during get got'.split(' '));
// small engineering thesaurus: abbreviations and near-synonyms map to one canonical token
const CANON: Record<string, string> = {
  ble: 'bluetooth', bt: 'bluetooth', mcu: 'microcontroller', microcontrollers: 'microcontroller', uc: 'microcontroller',
  disconnect: 'drop', disconnects: 'drop', disconnecting: 'drop', disconnected: 'drop', dropout: 'drop', dropouts: 'drop',
  clearance: 'approval', cleared: 'approval', approved: 'approval', approve: 'approval',
  lowpower: 'low power', ultralow: 'low', fw: 'firmware', hw: 'hardware', pcb: 'board', boards: 'board',
  launched: 'ship', launch: 'ship', shipping: 'ship', shipped: 'ship', ships: 'ship', products: 'product',
  cofounder: 'founder', cofounders: 'founder', founders: 'founder', startups: 'startup',
};

function stem(w: string): string {
  if (w.length <= 3 || /\d/.test(w)) return w;
  let s = w;
  if (s.endsWith('ies') && s.length > 4) s = s.slice(0, -3) + 'y';
  else if (s.endsWith('sses')) s = s.slice(0, -2);
  else if (s.endsWith('ing') && s.length > 5) s = s.slice(0, -3);
  else if (s.endsWith('ed') && s.length > 4) s = s.slice(0, -2);
  else if (s.endsWith('s') && !s.endsWith('ss') && !s.endsWith('us')) s = s.slice(0, -1);
  if (/([b-df-hj-np-tv-z])\1$/.test(s) && !/(ll|ss|zz)$/.test(s)) s = s.slice(0, -1);
  return s;
}

export function tokenize(text: string): string[] {
  const raw = text.toLowerCase().replace(/510\(k\)/g, '510k').replace(/low-power/g, 'low power').split(/[^a-z0-9]+/).filter(Boolean);
  const out: string[] = [];
  for (const w of raw) {
    const c = CANON[w] ?? w;
    for (const part of c.split(' ')) {
      if (STOP.has(part)) continue;
      out.push(stem(part));
    }
  }
  // bigrams reward phrase matches like "low power", "wearable firmware", "medical device"
  const n = out.length;
  for (let i = 0; i + 1 < n; i++) out.push(`${out[i]}_${out[i + 1]}`);
  return out;
}

interface Bm25Index { version: string; docs: { id: string; tf: Map<string, number>; len: number }[]; df: Map<string, number>; avgLen: number }
const g = globalThis as unknown as { __gtBm25?: Bm25Index };

export function docText(s: Snapshot, id: string): string {
  if (id.startsWith('person:')) {
    const p = s.person.get(id)!;
    return `${p.bio} ${(s.skillsOf.get(id) ?? []).join(' ')}`;
  }
  if (id.startsWith('project:')) {
    const p = s.project.get(id)!;
    return `${p.name} ${p.summary} ${p.technologies.join(' ')}`;
  }
  const p = s.problem.get(id)!;
  return `${p.description} ${p.description} ${p.solution}`; // the problem statement is what people search for
}

function bm25Index(s: Snapshot): Bm25Index {
  if (g.__gtBm25?.version === s.version) return g.__gtBm25;
  const ids = [...s.people.map((p) => p.id), ...s.projects.map((p) => p.id), ...s.problems.map((p) => p.id)];
  const df = new Map<string, number>();
  const docs = ids.map((id) => {
    const toks = tokenize(docText(s, id));
    const tf = new Map<string, number>();
    for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    return { id, tf, len: toks.length };
  });
  const avgLen = docs.reduce((a, d) => a + d.len, 0) / docs.length;
  g.__gtBm25 = { version: s.version, docs, df, avgLen };
  return g.__gtBm25;
}

function bm25(s: Snapshot, query: string): Map<string, number> {
  const idx = bm25Index(s);
  const q = [...new Set(tokenize(query))];
  const N = idx.docs.length, k1 = 1.2, b = 0.75;
  const scores = new Map<string, number>();
  let max = 0;
  for (const d of idx.docs) {
    let sc = 0;
    for (const t of q) {
      const f = d.tf.get(t);
      if (!f) continue;
      const n = idx.df.get(t)!;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      sc += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.len) / idx.avgLen)));
    }
    if (sc > 0) { scores.set(d.id, sc); if (sc > max) max = sc; }
  }
  if (max > 0) for (const [k, v] of scores) scores.set(k, v / max);
  return scores;
}

export type SearchMode = 'semantic' | 'keyword';

export async function similarity(query: string): Promise<{ sims: Map<string, number>; mode: SearchMode }> {
  const s = snapshot();
  const kw = bm25(s, query);
  if (s.searchMode !== 'semantic') return { sims: kw, mode: 'keyword' };
  const qv = await embedText(query);
  if (!qv) return { sims: kw, mode: 'keyword' };
  const cos = new Map<string, number>();
  let max = 0;
  const add = (id: string, v: Float32Array | null) => {
    if (!v) return;
    const c = Math.max(0, cosine(qv, v));
    cos.set(id, c);
    if (c > max) max = c;
  };
  for (const p of s.people) add(p.id, p.embedding);
  for (const p of s.projects) add(p.id, p.embedding);
  for (const p of s.problems) add(p.id, p.embedding);
  const sims = new Map<string, number>();
  for (const [id, c] of cos) sims.set(id, 0.6 * (max > 0 ? c / max : 0) + 0.4 * (kw.get(id) ?? 0));
  return { sims, mode: 'semantic' };
}

export async function currentSearchMode(): Promise<SearchMode> {
  const s = snapshot();
  if (s.searchMode !== 'semantic') return 'keyword';
  return (await loadEmbedder()) ? 'semantic' : 'keyword';
}
