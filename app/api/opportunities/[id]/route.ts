import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { ActionError } from '@/lib/actions';
import { setSaved, moderateOpportunity } from '@/lib/community';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewerId = await getViewerId();
  const id = decodeURIComponent((await params).id);
  const b = await req.json();
  return handle(() => {
    if (b.action === 'save' || b.action === 'unsave') return setSaved(viewerId, id, b.action === 'save');
    if (b.action === 'approve' || b.action === 'reject') return moderateOpportunity(viewerId, id, b.action === 'approve');
    throw new ActionError('Unknown action.');
  });
}
