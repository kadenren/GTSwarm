import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { saveContactPrefs } from '@/lib/people';

/** Members choose who may contact them, whether to share their city, and what they can help with. */
export async function POST(req: Request) {
  const viewerId = await getViewerId();
  const b = await req.json();
  return handle(() => saveContactPrefs(viewerId, b));
}
