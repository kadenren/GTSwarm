import { getDb } from './db';
import { ActionError } from './actions';

/**
 * Membership and permissions: one place that decides what each member may do. Every protected read and write on the
 * server calls these helpers; hiding a button in the UI is never the only check.
 *
 * Membership status is separate from capabilities, so a status can gain or lose a capability without code spread around
 * the app. Least privilege: anyone without a membership record is treated as unverified.
 */
export type MembershipStatus = 'CURRENT_STUDENT' | 'ALUMNI_PENDING_VERIFICATION' | 'VERIFIED_ALUMNI' | 'ADMIN';
export type Eligibility = 'all' | 'students' | 'verified_alumni';

export type Capability =
  | 'profile.edit' | 'network.connect' | 'mentorship.request' | 'mentorship.offer'
  | 'opportunity.view' | 'opportunity.post' | 'opportunity.moderate'
  | 'directory.alumni.full' | 'verification.request' | 'verification.decide'
  | 'group.manage.any' | 'moderation.review';

const BASE: Capability[] = ['profile.edit', 'network.connect', 'mentorship.request', 'opportunity.view'];
const CAPABILITIES: Record<MembershipStatus, Capability[]> = {
  CURRENT_STUDENT: [...BASE, 'verification.request'],
  ALUMNI_PENDING_VERIFICATION: [...BASE, 'verification.request'],
  VERIFIED_ALUMNI: [...BASE, 'mentorship.offer', 'opportunity.post', 'directory.alumni.full'],
  ADMIN: [...BASE, 'mentorship.offer', 'opportunity.post', 'opportunity.moderate', 'directory.alumni.full', 'verification.decide', 'group.manage.any', 'moderation.review'],
};

export const STATUS_LABEL: Record<MembershipStatus, string> = {
  CURRENT_STUDENT: 'Current student',
  ALUMNI_PENDING_VERIFICATION: 'Alum · verification pending',
  VERIFIED_ALUMNI: 'Verified alum',
  ADMIN: 'Administrator',
};

export interface Membership { personId: string; status: MembershipStatus; verifiedSource: string | null; verifiedAt: string | null; expectedGraduation: string | null }

export function membershipOf(personId: string): Membership {
  const row = getDb().prepare('SELECT status, verified_source, verified_at, expected_graduation FROM membership WHERE person_id = ?').get(personId) as
    { status: MembershipStatus; verified_source: string | null; verified_at: string | null; expected_graduation: string | null } | undefined;
  if (row) return { personId, status: row.status, verifiedSource: row.verified_source, verifiedAt: row.verified_at, expectedGraduation: row.expected_graduation };
  // no record (for example someone who joined during this session): students are students; alumni must be verified first
  const p = getDb().prepare('SELECT type FROM people WHERE id = ?').get(personId) as { type: string } | undefined;
  return { personId, status: p?.type === 'student' ? 'CURRENT_STUDENT' : 'ALUMNI_PENDING_VERIFICATION', verifiedSource: null, verifiedAt: null, expectedGraduation: null };
}

export const isVerifiedAlum = (s: MembershipStatus) => s === 'VERIFIED_ALUMNI' || s === 'ADMIN';
export const capabilitiesOf = (status: MembershipStatus) => CAPABILITIES[status];
export const can = (personId: string, cap: Capability) => CAPABILITIES[membershipOf(personId).status].includes(cap);

export function requireCapability(personId: string, cap: Capability, message: string) {
  if (!can(personId, cap)) throw new ActionError(message, 403);
}

/** Who an eligibility rule admits. Alumni waiting for verification keep the student-era access they already had. */
export function meetsEligibility(status: MembershipStatus, eligibility: Eligibility): boolean {
  if (eligibility === 'all') return true;
  if (eligibility === 'verified_alumni') return isVerifiedAlum(status);
  return status === 'CURRENT_STUDENT' || status === 'ALUMNI_PENDING_VERIFICATION' || status === 'ADMIN';
}

export const ELIGIBILITY_LABEL: Record<Eligibility, string> = { all: 'Students and alumni', students: 'Students only', verified_alumni: 'Verified alumni only' };

/** The audience a member belongs to for opportunities and recommendations. */
export const audienceOf = (status: MembershipStatus): 'students' | 'alumni' => (isVerifiedAlum(status) ? 'alumni' : 'students');
