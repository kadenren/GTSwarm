import { handle } from '@/lib/api';
import { draftProfile } from '@/lib/profile';
import { textFromFile, type SourceInfo } from '@/lib/ingest';
import { geminiEnabled, mediaFor, isImageName, type MediaPart } from '@/lib/gemini';
import { ActionError } from '@/lib/actions';
import { ready } from '@/lib/session';

export const maxDuration = 60;

/** Reads the user's own resume (PDF, Word, text or a photo) and returns a draft profile for them to confirm. */
export async function POST(req: Request) {
  await ready();
  return handle(async () => {
    const form = await req.formData();
    const pasted = String(form.get('text') ?? '').trim();
    const files = form.getAll('files').filter((f): f is File => typeof f === 'object' && 'arrayBuffer' in f).slice(0, 3);
    const gemini = geminiEnabled();
    const parts: string[] = pasted ? [pasted] : [];
    const media: MediaPart[] = [];
    const sources: SourceInfo[] = pasted ? [{ name: 'Pasted text', kind: 'description', chars: pasted.length, ok: true }] : [];
    for (const f of files) {
      const buf = Buffer.from(await f.arrayBuffer());
      const m = gemini ? mediaFor(f.name, buf) : null;
      if (m) media.push(m);
      if (isImageName(f.name)) { sources.push({ name: f.name, kind: 'text', chars: 0, ok: !!m, note: m ? 'photo, read by Gemini' : 'Reading photos needs GEMINI_API_KEY' }); continue; }
      const { text, info } = await textFromFile(f.name, buf);
      sources.push(info);
      if (text) parts.push(text);
    }
    const text = parts.join('\n\n');
    const hasLinks = ['github', 'website'].some((k) => String(form.get(k) ?? '').trim());
    if (text.length < 40 && !media.length && !hasLinks) throw new ActionError('Upload your resume (PDF, Word, text or a photo), or add your GitHub or website.');
    const links = { linkedin: String(form.get('linkedin') ?? ''), github: String(form.get('github') ?? ''), scholar: String(form.get('scholar') ?? ''), website: String(form.get('website') ?? '') };
    const out = await draftProfile(text, media, links);
    return { ...out, sources: [...sources, ...out.sources] };
  });
}
