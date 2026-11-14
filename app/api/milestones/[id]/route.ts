import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { confirmMilestone } from '@/lib/actions';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewerId = await getViewerId();
  const id = decodeURIComponent((await params).id);
  return handle(() => (confirmMilestone(id, viewerId), { ok: true }));
}
