import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { ActionError } from '@/lib/actions';
import { joinGroup, leaveGroup, decideGroupRequest } from '@/lib/community';

/** Join, leave, or (group admins) approve and decline requests. Every permission is checked in lib/community. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewerId = await getViewerId();
  const id = decodeURIComponent((await params).id);
  const b = await req.json();
  return handle(() => {
    if (b.action === 'join') return joinGroup(viewerId, id);
    if (b.action === 'leave') return leaveGroup(viewerId, id);
    if (b.action === 'approve' || b.action === 'deny') return decideGroupRequest(viewerId, id, String(b.personId ?? ''), b.action === 'approve');
    throw new ActionError('Unknown action.');
  });
}
