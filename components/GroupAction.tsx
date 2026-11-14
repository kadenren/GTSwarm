import ActionButton from './ActionButton';
import type { GroupView } from '@/lib/community';
import { ELIGIBILITY_LABEL } from '@/lib/access';

/** The one action a member can take on a group, decided by their standing (computed on the server). */
export default function GroupAction({ g }: { g: GroupView }) {
  const ep = `/api/groups/${encodeURIComponent(g.id)}`;
  if (g.standing === 'admin') return <span className="rounded-full bg-gold/20 px-2.5 py-1 text-xs font-semibold text-gold-dark">You admin this group</span>;
  if (g.standing === 'member') return <ActionButton endpoint={ep} body={{ action: 'leave' }} label="Leave group" className="btn-ghost px-3 py-1.5 text-xs" testId="group-leave" />;
  if (g.standing === 'pending') return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800" data-testid="group-pending">Request pending</span>;
  if (g.standing === 'ineligible') return <span className="rounded-full bg-navy/5 px-2.5 py-1 text-xs font-semibold text-ink/55" data-testid="group-restricted">{ELIGIBILITY_LABEL[g.eligibility]}</span>;
  return <ActionButton endpoint={ep} body={{ action: 'join' }} label={g.standing === 'can-join' ? 'Join group' : 'Request to join'} className="btn-gold px-3 py-1.5 text-xs" testId="group-join"
    done={g.standing === 'can-request' ? 'Request sent to the group admin.' : undefined} />;
}
