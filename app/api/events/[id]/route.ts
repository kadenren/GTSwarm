import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { ActionError } from '@/lib/actions';
import { rsvp, cancelRsvp } from '@/lib/community';

/** RSVP or cancel. Eligibility, capacity, deadlines and duplicates are enforced in lib/community. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewerId = await getViewerId();
  const id = decodeURIComponent((await params).id);
  const b = await req.json();
  return handle(() => {
    if (b.action === 'rsvp') return rsvp(viewerId, id);
    if (b.action === 'cancel') return cancelRsvp(viewerId, id);
    throw new ActionError('Unknown action.');
  });
}
