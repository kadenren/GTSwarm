import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { requestMentorship } from '@/lib/community';

/** Request mentorship from an opted-in mentor. The mentor decides in their inbox. */
export async function POST(req: Request) {
  const viewerId = await getViewerId();
  const b = await req.json();
  return handle(() => requestMentorship(viewerId, String(b.mentorId ?? ''), String(b.topic ?? ''), String(b.message ?? '')));
}
