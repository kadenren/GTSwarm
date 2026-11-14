import type { MembershipStatus } from '@/lib/access';
import { STATUS_LABEL } from '@/lib/access';

const STYLE: Record<MembershipStatus, string> = {
  CURRENT_STUDENT: 'bg-plum-light text-plum',
  ALUMNI_PENDING_VERIFICATION: 'bg-amber-100 text-amber-800',
  VERIFIED_ALUMNI: 'bg-teal-light text-teal',
  ADMIN: 'bg-navy text-white',
};

/** Membership status chip. "Verified" here reflects the demo's simulated verification, labeled wherever it matters. */
export default function MemberBadge({ status, className = '' }: { status: MembershipStatus; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STYLE[status]} ${className}`} data-testid="member-badge" data-status={status}>
      {status === 'VERIFIED_ALUMNI' && <svg width="11" height="11" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      {STATUS_LABEL[status]}
    </span>
  );
}
