import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { describeConnection } from '@/lib/graph/describe';
import { polishDescription } from '@/lib/polish';
import { ActionError } from '@/lib/actions';
import { ROLES, type Role } from '@/lib/data';

/** Rephrase a connection description. The template is rebuilt from the database here, never taken from the client. */
export async function POST(req: Request) {
  const viewerId = await getViewerId();
  const b = await req.json();
  return handle(async () => {
    const role = ROLES.includes(b.role) ? (b.role as Role) : null;
    const d = await describeConnection(String(b.personId ?? ''), String(b.query ?? ''), role, viewerId);
    if (!d) throw new ActionError('Person not found.', 404);
    return { template: d.full, ...(await polishDescription(d.full)) };
  });
}
