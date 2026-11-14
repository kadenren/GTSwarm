import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { saveProfile } from '@/lib/profile';

export async function POST(req: Request) {
  const viewerId = await getViewerId();
  const body = await req.json();
  return handle(() => saveProfile(viewerId, body));
}
