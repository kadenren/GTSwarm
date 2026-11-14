import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { postOpportunity, listOpportunities, type NewOpportunity } from '@/lib/community';

/** GET: opportunities this member may see (filtered on the server). POST: propose a posting (verified alumni; moderated). */
export async function GET() {
  const viewerId = await getViewerId();
  return handle(() => listOpportunities(viewerId));
}
export async function POST(req: Request) {
  const viewerId = await getViewerId();
  const b = (await req.json()) as NewOpportunity;
  return handle(() => postOpportunity(viewerId, b));
}
