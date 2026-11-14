import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { sendRequest } from '@/lib/actions';

export async function POST(req: Request) {
  const viewerId = await getViewerId();
  const b = await req.json();
  return handle(() => sendRequest({ from: viewerId, to: b.to, kind: b.kind === 'stuck' ? 'stuck' : 'expertise', role: b.role ?? null, message: String(b.message ?? ''), projectId: b.projectId || null }));
}
