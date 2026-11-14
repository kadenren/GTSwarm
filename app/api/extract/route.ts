import { handle } from '@/lib/api';
import { extractProject } from '@/lib/extract';
import { ActionError } from '@/lib/actions';

export async function POST(req: Request) {
  const { abstract } = await req.json();
  return handle(async () => {
    if (typeof abstract !== 'string' || abstract.trim().length < 40) throw new ActionError('Paste at least a few sentences.');
    return extractProject(abstract);
  });
}
