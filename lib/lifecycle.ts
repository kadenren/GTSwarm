import { getDb, bumpDataVersion } from './db';
import { snapshot } from './data';
import { ActionError } from './actions';
import { membershipOf, requireCapability, type MembershipStatus } from './access';

/**
 * Student → alumni lifecycle.
 *   CURRENT_STUDENT → ALUMNI_PENDING_VERIFICATION → VERIFIED_ALUMNI
 * A member can only move themselves to "pending" (by asking for verification). The final step needs verified graduation
 * evidence from an authorized reviewer (an ADMIN today; in a real pilot, an approved source such as the Alumni Association).
 * Nothing about the person is copied or rebuilt: the same profile, projects, connections, mentorships and groups carry on.
 *
 * Demo only: one fictional persona can run a clearly labeled simulated verification so judges can see the transition.
 * It is disabled when GTSWARM_DEMO_DATA=false, and it only ever affects that persona inside the visitor's private demo session.
 */

const now = () => new Date().toISOString();
export const DEMO_TRANSITION_PERSONA = 'Sofia Alvarez';
export const SIMULATED_SOURCE = 'Simulated demo verification (not a real university check)';
export const demoDataEnabled = () => process.env.GTSWARM_DEMO_DATA !== 'false';

function setStatus(personId: string, status: MembershipStatus, source: string | null) {
  const db = getDb();
  const verifiedAt = status === 'VERIFIED_ALUMNI' ? now() : null;
  db.prepare(`INSERT INTO membership (person_id, status, verified_source, verified_at, expected_graduation) VALUES (?,?,?,?,NULL)
    ON CONFLICT(person_id) DO UPDATE SET status = excluded.status, verified_source = excluded.verified_source, verified_at = excluded.verified_at`).run(personId, status, source, verifiedAt);
  // the person record is updated in place (no new profile), so every link to it stays intact
  if (status === 'VERIFIED_ALUMNI') db.prepare("UPDATE people SET type = 'alum' WHERE id = ?").run(personId);
}

export function pendingRequestOf(personId: string) {
  return getDb().prepare("SELECT id, evidence, created_at FROM verification_request WHERE person_id = ? AND status = 'pending' ORDER BY created_at DESC").get(personId) as { id: string; evidence: string; created_at: string } | undefined;
}

/** A student says they graduated. This only marks them pending; no alumni privileges until an authorized decision. */
export function requestGraduationVerification(viewerId: string, evidence: string) {
  requireCapability(viewerId, 'verification.request', 'You cannot request verification.');
  const m = membershipOf(viewerId);
  if (m.status === 'VERIFIED_ALUMNI' || m.status === 'ADMIN') throw new ActionError('You are already verified.', 409);
  const existing = pendingRequestOf(viewerId);
  if (existing) return { id: existing.id, status: 'pending' as const, duplicate: true };
  const db = getDb();
  const n = (db.prepare('SELECT COUNT(*) n FROM verification_request').get() as { n: number }).n + 1;
  const id = `verify:v${String(n).padStart(3, '0')}-${viewerId.split(':')[1]}`;
  db.prepare("INSERT INTO verification_request (id, person_id, kind, evidence, status, created_at) VALUES (?,?, 'graduation', ?, 'pending', ?)").run(id, viewerId, (evidence || 'Graduation reported by member').slice(0, 280), now());
  setStatus(viewerId, 'ALUMNI_PENDING_VERIFICATION', null);
  bumpDataVersion();
  return { id, status: 'pending' as const, duplicate: false };
}

/** An authorized reviewer records the decision. Approval makes the member a verified alum; denial keeps them pending. */
export function decideVerification(deciderId: string, requestId: string, approve: boolean, source = 'Authorized reviewer') {
  requireCapability(deciderId, 'verification.decide', 'Only an authorized reviewer can verify graduation.');
  const db = getDb();
  const r = db.prepare('SELECT person_id, status FROM verification_request WHERE id = ?').get(requestId) as { person_id: string; status: string } | undefined;
  if (!r) throw new ActionError('Verification request not found.', 404);
  if (r.status !== 'pending') throw new ActionError('This request was already decided.', 409);
  if (r.person_id === deciderId) throw new ActionError('You cannot verify yourself.', 403);
  db.transaction(() => {
    db.prepare('UPDATE verification_request SET status = ?, decided_by = ?, decided_source = ?, decided_at = ? WHERE id = ?').run(approve ? 'approved' : 'denied', deciderId, source, now(), requestId);
    if (approve) setStatus(r.person_id, 'VERIFIED_ALUMNI', source);
  })();
  bumpDataVersion();
  return { status: approve ? 'approved' : 'denied' };
}

/** Demo only: the fictional transition persona runs a labeled, simulated verification. Never available to anyone else. */
export function simulateVerifiedGraduation(viewerId: string) {
  if (!demoDataEnabled()) throw new ActionError('Simulated verification is turned off.', 403);
  const p = snapshot().person.get(viewerId);
  if (!p || p.name !== DEMO_TRANSITION_PERSONA) throw new ActionError('Only the demo graduation persona can run a simulated verification.', 403);
  const m = membershipOf(viewerId);
  if (m.status === 'VERIFIED_ALUMNI') return { status: 'VERIFIED_ALUMNI' as const, already: true };
  const req = pendingRequestOf(viewerId) ?? (requestGraduationVerification(viewerId, 'Completed degree (fictional demo)'), pendingRequestOf(viewerId)!);
  const db = getDb();
  db.transaction(() => {
    db.prepare("UPDATE verification_request SET status = 'approved', decided_by = NULL, decided_source = ?, decided_at = ? WHERE id = ?").run(SIMULATED_SOURCE, now(), req.id);
    setStatus(viewerId, 'VERIFIED_ALUMNI', SIMULATED_SOURCE);
  })();
  bumpDataVersion();
  return { status: 'VERIFIED_ALUMNI' as const, already: false };
}

/** What carries over: used by the profile to show that nothing is lost at graduation. */
export function continuityOf(personId: string) {
  const db = getDb();
  const s = snapshot();
  const count = (sql: string) => (db.prepare(sql).get(personId, personId) as { n: number }).n;
  return {
    projects: (s.projectsOf.get(personId) ?? []).length,
    solvedProblems: (s.problemsBy.get(personId) ?? []).length,
    connections: count("SELECT COUNT(*) n FROM connections WHERE status = 'active' AND source != 'shared-project' AND (from_person = ? OR to_person = ?)"),
    mentorships: count("SELECT COUNT(*) n FROM mentorship WHERE status = 'active' AND (mentor_id = ? OR mentee_id = ?)"),
    groups: (db.prepare("SELECT COUNT(*) n FROM group_member WHERE person_id = ? AND status = 'active'").get(personId) as { n: number }).n,
  };
}
