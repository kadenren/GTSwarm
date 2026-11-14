import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { savePrefs } from '@/lib/prefs';

/** Save what the viewer is here for: interests, roles they are open to, hours and a short "looking for" line. */
export async function POST(req: Request) {
  const viewerId = await getViewerId();
  const b = await req.json();
  return handle(() => savePrefs(viewerId, { interests: b.interests ?? [], lookingFor: b.lookingFor ?? '', openTo: b.openTo ?? [], hours: b.hours ?? 0 }));
}
