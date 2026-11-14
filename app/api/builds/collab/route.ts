import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { sendRequest, ActionError } from '@/lib/actions';
import { buildFor } from '@/lib/builds';
import { snapshot, ROLES, type Role } from '@/lib/data';

/** Request to join or collaborate on a build: goes to the build's owner, with the role you want to contribute. */
export async function POST(req: Request) {
  const viewerId = await getViewerId();
  const b = await req.json();
  return handle(() => {
    const build = buildFor(String(b.projectId ?? ''));
    if (!build) throw new ActionError('Build not found.', 404);
    if (!build.owner) throw new ActionError('This build has no owner yet.');
    if (build.owner.id === viewerId) throw new ActionError('This is your build.');
    if ((snapshot().membersOf.get(build.id) ?? []).some((m) => m.person_id === viewerId && m.role !== 'advisor')) throw new ActionError('You are already on this team.');
    const role: Role = ROLES.includes(b.role) ? b.role : 'Helper';
    const message = String(b.message ?? '').trim() || `I'd like to help ${build.name} as ${role === 'Early engineer' ? 'an engineer' : role === 'Advisor' ? 'an advisor' : role === 'Helper' ? 'a collaborator' : `a ${role.toLowerCase()}`}.`;
    return sendRequest({ from: viewerId, to: build.owner.id, kind: 'expertise', role, message, projectId: build.id });
  });
}
