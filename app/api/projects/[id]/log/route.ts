import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { logProblem, addTechnology, addMilestone, ActionError } from '@/lib/actions';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewerId = await getViewerId();
  const projectId = decodeURIComponent((await params).id);
  const b = await req.json();
  return handle(async () => {
    if (b.type === 'problem') return logProblem({ viewerId, projectId, description: String(b.description ?? ''), solution: String(b.solution ?? ''), helperId: b.helperId || null });
    if (b.type === 'technology') return (addTechnology({ viewerId, projectId, name: String(b.name ?? '') }), { ok: true });
    if (b.type === 'milestone') return addMilestone({ viewerId, projectId, title: String(b.title ?? ''), helperId: b.helperId || null });
    throw new ActionError('Unknown log type.');
  });
}
