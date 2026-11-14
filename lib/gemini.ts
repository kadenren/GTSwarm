import { GoogleGenAI } from '@google/genai';

/**
 * Gemini is GT Swarm's AI: it reads project sources, resumes and error evidence, plans scout searches,
 * scores matches and polishes wording. Gemini reads images and PDFs directly (posters, scanned reports).
 * Calls try a chain of models, so a busy or retired model never blocks the product; every caller has a
 * deterministic fallback, and this returns null only when every model fails.
 */
export const geminiEnabled = () => { const k = process.env.GEMINI_API_KEY?.trim(); return !!k && !/paste|your-key/i.test(k); };
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
/** Tried in order after GEMINI_MODEL when a model is busy, slow or unavailable. Override with GEMINI_FALLBACK_MODELS (comma separated). */
export const GEMINI_FALLBACKS = (process.env.GEMINI_FALLBACK_MODELS ?? 'gemini-3.5-flash,gemini-3.8-flash').split(',').map((m) => m.trim()).filter(Boolean);

export interface MediaPart { name: string; mimeType: string; data: Buffer }

const IMAGE_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif' };
const MAX_INLINE_BYTES = 15 * 1024 * 1024; // Gemini accepts about 20 MB of inline data per request

/** Files Gemini can read directly (images and PDFs). */
export function mediaFor(name: string, data: Buffer): MediaPart | null {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  const mimeType = ext === 'pdf' ? 'application/pdf' : IMAGE_TYPES[ext];
  if (!mimeType || data.length > MAX_INLINE_BYTES) return null;
  return { name, mimeType, data };
}
export const isImageName = (name: string) => (name.toLowerCase().split('.').pop() ?? '') in IMAGE_TYPES;

// remember models that just failed so the next request skips straight to one that works
const g = globalThis as unknown as { __gtGemDown?: Map<string, number> };
const down = (g.__gtGemDown ??= new Map());
const COOLDOWN_MS = 2 * 60_000;

function modelChain() {
  const all = [...new Set([GEMINI_MODEL, ...GEMINI_FALLBACKS])];
  const now = Date.now();
  const healthy = all.filter((m) => (down.get(m) ?? 0) < now);
  return healthy.length ? healthy : all;
}

/** Structured JSON from Gemini, trying each model in the chain within an overall time budget. */
export async function geminiJson<T>(opts: { system: string; text: string; media?: MediaPart[]; schema: object; timeoutMs?: number }): Promise<T | null> {
  if (!geminiEnabled()) return null;
  let budget = MAX_INLINE_BYTES;
  const media = (opts.media ?? []).filter((m) => (budget -= m.data.length) >= 0);
  const contents = [{
    role: 'user',
    parts: [
      ...media.flatMap((m) => [{ text: `Attached file: ${m.name}` }, { inlineData: { mimeType: m.mimeType, data: m.data.toString('base64') } }]),
      { text: opts.text || '(See the attached files.)' },
    ],
  }];
  const deadline = Date.now() + (opts.timeoutMs ?? 30_000);
  for (const model of modelChain()) {
    const left = deadline - Date.now();
    if (left < 1500) break;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: left } });
      const res = await ai.models.generateContent({
        model,
        contents,
        config: { systemInstruction: opts.system, responseMimeType: 'application/json', responseJsonSchema: opts.schema, temperature: 0.2 },
      });
      const out = res.text;
      if (out) return JSON.parse(out) as T;
    } catch (e) {
      down.set(model, Date.now() + COOLDOWN_MS);
      console.warn(`[gt-swarm] Gemini ${model} failed (${e instanceof Error ? e.message.slice(0, 120) : e}); trying the next model`);
    }
  }
  return null;
}
