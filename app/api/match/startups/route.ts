import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { recommendBuilds } from '@/lib/matching';
import { ROLES, type Role } from '@/lib/data';

/**
 * Find Startups: recommend active builds for the viewer.
 * With text, it matches what they wrote (plus their record); without, it uses their saved profile and roles.
 * A chosen role, or the roles on their profile, is an eligibility check.
 */
export async function POST(req: Request) {
  const viewerId = await getViewerId();
  const b = await req.json();
  const text = String(b.text ?? '').trim().slice(0, 1000);
  const role = ROLES.includes(b.role as Role) ? (b.role as Role) : null;
  return handle(async () => {
    const matches = await recommendBuilds({ viewerId, personId: viewerId, text: text || undefined, roles: role ? [role] : undefined, requireRoles: !!role || !text, limit: 9 });
    return { usedProfile: !text, matches };
  });
}
