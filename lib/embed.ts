import path from 'node:path';
import fs from 'node:fs';

/**
 * Local sentence embeddings (Xenova/all-MiniLM-L6-v2, 384 dims).
 * The model is downloaded once during `npm run seed` into data/models and loaded from disk afterwards.
 * If it cannot load, callers fall back to the BM25 keyword scorer (see lib/search.ts).
 */
export const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
export const EMBED_DIM = 384;
const MODEL_DIR = path.join(process.cwd(), 'data', 'models');

type Extractor = (text: string | string[], opts: { pooling: 'mean'; normalize: boolean }) => Promise<{ data: Float32Array; dims: number[] }>;

const g = globalThis as unknown as { __gtEmbed?: Promise<Extractor | null>; __gtEmbedError?: string };

export function loadEmbedder(allowDownload = false): Promise<Extractor | null> {
  if (process.env.GTSWARM_FORCE_KEYWORD === '1' || process.env.DATABASE_URL || process.env.VERCEL) return Promise.resolve(null);
  if (!g.__gtEmbed) {
    g.__gtEmbed = (async () => {
      try {
        const t = await import('@xenova/transformers');
        t.env.cacheDir = MODEL_DIR;
        t.env.localModelPath = MODEL_DIR;
        const haveLocal = fs.existsSync(path.join(MODEL_DIR, ...MODEL_ID.split('/')));
        t.env.allowRemoteModels = allowDownload || !haveLocal;
        const pipe = await t.pipeline('feature-extraction', MODEL_ID, { quantized: true });
        return pipe as unknown as Extractor;
      } catch (e) {
        g.__gtEmbedError = e instanceof Error ? e.message : String(e);
        console.warn('[gt-swarm] embedding model unavailable, using keyword fallback:', g.__gtEmbedError);
        return null;
      }
    })();
  }
  return g.__gtEmbed;
}

export async function embedTexts(texts: string[]): Promise<Float32Array[] | null> {
  const ex = await loadEmbedder();
  if (!ex) return null;
  const out: Float32Array[] = [];
  const BATCH = 32;
  for (let i = 0; i < texts.length; i += BATCH) {
    const chunk = texts.slice(i, i + BATCH);
    const res = await ex(chunk, { pooling: 'mean', normalize: true });
    for (let j = 0; j < chunk.length; j++) out.push(Float32Array.from(res.data.subarray(j * EMBED_DIM, (j + 1) * EMBED_DIM)));
  }
  return out;
}

export async function embedText(text: string): Promise<Float32Array | null> {
  const r = await embedTexts([text]);
  return r ? r[0] : null;
}

export const toBlob = (v: Float32Array) => Buffer.from(v.buffer, v.byteOffset, v.byteLength);
export const fromBlob = (b: Buffer | null | undefined): Float32Array | null =>
  b && b.length === EMBED_DIM * 4 ? new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)) : null;

/** Vectors are L2-normalized, so cosine similarity is the dot product. */
export function cosine(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
