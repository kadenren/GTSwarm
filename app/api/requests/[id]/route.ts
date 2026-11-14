import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { acceptRequest, declineRequest, addToProject, ActionError, type AddAs } from '@/lib/actions';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewerId = await getViewerId();
  const { id } = await params;
  const b = await req.json();
  return handle(() => {
    const rid = decodeURIComponent(id);
    if (b.action === 'accept') return acceptRequest(rid, viewerId);
    if (b.action === 'decline') return (declineRequest(rid, viewerId), { ok: true });
    if (b.action === 'add') return (addToProject(rid, viewerId, b.addAs as AddAs), { ok: true });
    throw new ActionError('Unknown action.');
  });
}
