import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { personNetwork } from '@/lib/graph/network';
import { ActionError } from '@/lib/actions';

export async function GET(req: Request) {
  const viewerId = await getViewerId();
  const id = new URL(req.url).searchParams.get('person') ?? '';
  return handle(() => {
    const out = personNetwork(id, viewerId);
    if (!out) throw new ActionError('Person not found.', 404);
    return out;
  });
}
