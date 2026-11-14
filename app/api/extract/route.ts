import { handle } from '@/lib/api';
import { extractProject } from '@/lib/extract';
import { textFromFile, textFromLink, type SourceInfo } from '@/lib/ingest';
import { ActionError } from '@/lib/actions';

export const maxDuration = 60;

/** Accepts a description, uploaded files and links (multipart form), and returns extracted project fields for confirmation. */
export async function POST(req: Request) {
  return handle(async () => {
    const ct = req.headers.get('content-type') ?? '';
    let description = '';
    let files: File[] = [];
    let links: string[] = [];
    if (ct.includes('multipart/form-data')) {
      const form = await req.formData();
      description = String(form.get('description') ?? '');
      files = form.getAll('files').filter((f): f is File => typeof f === 'object' && 'arrayBuffer' in f).slice(0, 6);
      links = String(form.get('links') ?? '').split(/\s+/).map((l) => l.trim()).filter(Boolean).slice(0, 5);
    } else {
      const b = await req.json();
      description = String(b.abstract ?? b.description ?? '');
    }

    const parts: string[] = [];
    const sources: SourceInfo[] = [];
    if (description.trim()) {
      parts.push(description.trim());
      sources.push({ name: 'Your description', kind: 'description', chars: description.trim().length, ok: true });
    }
    for (const f of files) {
      const { text, info } = await textFromFile(f.name, Buffer.from(await f.arrayBuffer()));
      sources.push(info);
      if (text) parts.push(`From ${f.name}:\n${text}`);
    }
    const savedLinks: { url: string; title: string }[] = [];
    for (const l of links) {
      const { text, title, info } = await textFromLink(l);
      sources.push(info);
      savedLinks.push({ url: l, title });
      if (text) parts.push(`From ${title}:\n${text}`);
    }
    const combined = parts.join('\n\n');
    if (combined.trim().length < 40) throw new ActionError(sources.some((s) => !s.ok) ? 'Could not read enough text from what you added. Add a short description too.' : 'Add a few sentences, a file or a link.');
    const out = await extractProject(combined);
    return { ...out, sources, links: savedLinks };
  });
}
