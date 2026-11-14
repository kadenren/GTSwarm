import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { ActionError } from '@/lib/actions';
import { requestGraduationVerification, simulateVerifiedGraduation } from '@/lib/lifecycle';

/**
 * request: a member reports graduation (moves them to pending only).
 * simulate: demo-only verification for the fictional graduation persona (refused for everyone else, and when demo data is off).
 * There is deliberately no route that lets a member approve their own verification.
 */
export async function POST(req: Request) {
  const viewerId = await getViewerId();
  const b = await req.json();
  return handle(() => {
    if (b.action === 'request') return requestGraduationVerification(viewerId, String(b.evidence ?? ''));
    if (b.action === 'simulate') return simulateVerifiedGraduation(viewerId);
    throw new ActionError('Unknown action.');
  });
}
