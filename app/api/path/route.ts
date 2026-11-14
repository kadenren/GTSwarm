import { handle } from '@/lib/api';
import { warmPath } from '@/lib/graph/path';
import { ActionError } from '@/lib/actions';
import { ready } from '@/lib/session';

export async function GET(req: Request) {
  await ready();
  const u = new URL(req.url);
  return handle(() => {
    const p = warmPath(u.searchParams.get('from') ?? '', u.searchParams.get('to') ?? '');
    if (!p) throw new ActionError('No path found.', 404);
    return p;
  });
}
