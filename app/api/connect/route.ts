import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { sendConnectRequest } from '@/lib/people';

/** Ask to connect: the purpose and the sender's own note. Consent and eligibility are checked in lib/people on the server. */
export async function POST(req: Request) {
  const viewerId = await getViewerId();
  const b = await req.json();
  return handle(() => sendConnectRequest(viewerId, String(b.personId ?? ''), String(b.purpose ?? ''), String(b.note ?? '')));
}
