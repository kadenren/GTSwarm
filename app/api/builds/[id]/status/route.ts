import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { updateBuildStatus } from '@/lib/builds';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewerId = await getViewerId();
  const id = decodeURIComponent((await params).id);
  const b = await req.json();
  return handle(() => (updateBuildStatus(viewerId, id, { stage: String(b.stage ?? ''), open: !!b.open, roles: Array.isArray(b.roles) ? b.roles : [], help: String(b.help ?? '') }), { ok: true }));
}
