import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { ActionError } from '@/lib/actions';
import { decideMentorship, endMentorship } from '@/lib/community';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewerId = await getViewerId();
  const id = decodeURIComponent((await params).id);
  const b = await req.json();
  return handle(() => {
    if (b.action === 'accept' || b.action === 'decline') return decideMentorship(viewerId, id, b.action === 'accept');
    if (b.action === 'end') return endMentorship(viewerId, id);
    throw new ActionError('Unknown action.');
  });
}
