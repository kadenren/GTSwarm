import { handle } from '@/lib/api';
import { problemFromEvidence } from '@/lib/problem';
import { geminiEnabled, mediaFor, isImageName, type MediaPart } from '@/lib/gemini';
import { ActionError } from '@/lib/actions';

export const maxDuration = 60;

/** Log text and/or a screenshot -> a one-line problem statement for the solved-problem search. */
export async function POST(req: Request) {
  return handle(async () => {
    const form = await req.formData();
    let log = String(form.get('log') ?? '');
    const media: MediaPart[] = [];
    const notes: string[] = [];
    for (const f of form.getAll('files').filter((f): f is File => typeof f === 'object' && 'arrayBuffer' in f).slice(0, 3)) {
      const buf = Buffer.from(await f.arrayBuffer());
      if (isImageName(f.name)) {
        const m = geminiEnabled() ? mediaFor(f.name, buf) : null;
        if (m) media.push(m); else notes.push(`${f.name}: reading screenshots needs GEMINI_API_KEY`);
      } else if (buf.length < 2_000_000) {
        log += `\n${buf.toString('utf8')}`;
      }
    }
    if (!log.trim() && !media.length) throw new ActionError(notes[0] ?? 'Paste a log or attach a screenshot.');
    return { ...(await problemFromEvidence(log, media)), notes };
  });
}
