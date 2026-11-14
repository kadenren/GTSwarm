import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { saveMentorProfile } from '@/lib/community';

export async function POST(req: Request) {
  const viewerId = await getViewerId();
  const b = await req.json();
  return handle(() => saveMentorProfile(viewerId, b));
}
