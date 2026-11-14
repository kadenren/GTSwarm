import { GoogleGenAI } from '@google/genai';

/**
 * Thin wrapper around the Gemini API for the three reading tasks (project sources, resumes, error evidence).
 * Gemini reads images and PDFs directly, so photos of posters and scanned documents work.
 * Every caller has a deterministic fallback; this returns null on any failure.
 */
export const geminiEnabled = () => { const k = process.env.GEMINI_API_KEY?.trim(); return !!k && !/paste|your-key/i.test(k); };
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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

export async function geminiJson<T>(opts: { system: string; text: string; media?: MediaPart[]; schema: object; timeoutMs?: number }): Promise<T | null> {
  if (!geminiEnabled()) return null;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: opts.timeoutMs ?? 30_000 } });
    let budget = MAX_INLINE_BYTES;
    const media = (opts.media ?? []).filter((m) => (budget -= m.data.length) >= 0);
    const res = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{
        role: 'user',
        parts: [
          ...media.flatMap((m) => [{ text: `Attached file: ${m.name}` }, { inlineData: { mimeType: m.mimeType, data: m.data.toString('base64') } }]),
          { text: opts.text || '(See the attached files.)' },
        ],
      }],
      config: {
        systemInstruction: opts.system,
        responseMimeType: 'application/json',
        responseJsonSchema: opts.schema,
        temperature: 0.2,
      },
    });
    const out = res.text;
    return out ? (JSON.parse(out) as T) : null;
  } catch (e) {
    console.warn('[gt-swarm] Gemini call failed; using fallback:', e instanceof Error ? e.message : e);
    return null;
  }
}
