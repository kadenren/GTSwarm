import ActionButton from './ActionButton';
import MemberBadge from './MemberBadge';
import { membershipOf, isVerifiedAlum } from '@/lib/access';
import { continuityOf, pendingRequestOf, DEMO_TRANSITION_PERSONA, demoDataEnabled } from '@/lib/lifecycle';
import { snapshot } from '@/lib/data';

/** Membership status, verification state and what carries over at graduation. Actions are permission-checked on the server. */
export default function LifecyclePanel({ personId }: { personId: string }) {
  const m = membershipOf(personId);
  const c = continuityOf(personId);
  const pending = pendingRequestOf(personId);
  const isDemoGrad = demoDataEnabled() && snapshot().person.get(personId)?.name === DEMO_TRANSITION_PERSONA;
  const simulated = m.verifiedSource?.toLowerCase().includes('simulated');
  const steps: { key: string; label: string }[] = [
    { key: 'CURRENT_STUDENT', label: 'Current student' },
    { key: 'ALUMNI_PENDING_VERIFICATION', label: 'Graduation reported' },
    { key: 'VERIFIED_ALUMNI', label: 'Verified alum' },
  ];
  const at = steps.findIndex((s) => s.key === (m.status === 'ADMIN' ? 'VERIFIED_ALUMNI' : m.status));
  return (
    <section id="lifecycle" className="card scroll-mt-20 p-5" aria-label="Membership and graduation" data-testid="lifecycle-panel" data-status={m.status}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-navy">Membership</h2>
        <MemberBadge status={m.status} />
      </div>
      <ol className="mt-4 flex items-center gap-2 text-xs" aria-label="Lifecycle">
        {steps.map((s, i) => (
          <li key={s.key} className="flex flex-1 items-center gap-2">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${i <= at ? 'bg-gold text-navy-900' : 'bg-navy/10 text-ink/50'}`}>{i + 1}</span>
            <span className={i <= at ? 'font-semibold text-navy' : 'text-ink/50'}>{s.label}</span>
            {i < steps.length - 1 && <span className={`h-px flex-1 ${i < at ? 'bg-gold' : 'bg-navy/15'}`} aria-hidden="true" />}
          </li>
        ))}
      </ol>
      {isVerifiedAlum(m.status) && (
        <p className="mt-3 text-sm text-ink/75" data-testid="verified-source">{simulated ? 'Verified alum through a simulated demo verification. This is not a real university check.' : `Verified alum · source: ${m.verifiedSource ?? 'authorized reviewer'}`}</p>
      )}
      {m.status === 'ALUMNI_PENDING_VERIFICATION' && (
        <p className="mt-3 text-sm text-amber-900">Graduation reported{pending ? ` on ${pending.created_at.slice(0, 10)}` : ''}. Waiting for an authorized reviewer. Until then you keep everything you had as a student, and alumni-only groups and events stay closed.</p>
      )}
      {m.status === 'CURRENT_STUDENT' && m.expectedGraduation && <p className="mt-3 text-sm text-ink/70">Expected graduation: {m.expectedGraduation}.</p>}

      <div className="mt-4 rounded-lg bg-paper p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/55">Your Georgia Tech network continues after graduation</p>
        <dl className="mt-2 grid grid-cols-5 gap-2 text-center" data-testid="continuity">
          {[[c.projects, 'projects'], [c.solvedProblems, 'solved problems'], [c.connections, 'connections'], [c.mentorships, 'mentorships'], [c.groups, 'groups']].map(([n, l]) => (
            <div key={l as string}><dd className="font-display text-xl font-bold text-navy">{n}</dd><dt className="text-[10px] text-ink/55">{l}</dt></div>
          ))}
        </dl>
        <p className="mt-2 text-[11px] text-ink/55">The same record carries over. Nothing is copied or rebuilt when your status changes.</p>
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-3">
        {m.status === 'CURRENT_STUDENT' && !isDemoGrad && (
          <ActionButton endpoint="/api/lifecycle" body={{ action: 'request', evidence: 'Reported by member' }} label="Report my graduation" className="btn-ghost text-sm" testId="report-graduation"
            done="Reported. An authorized reviewer must verify it before alumni features open." />
        )}
        {isDemoGrad && !isVerifiedAlum(m.status) && (
          <div className="rounded-lg border border-gold/50 bg-gold/10 p-3">
            <p className="text-xs text-navy"><strong>Demo:</strong> simulate the verified graduation an authorized source would provide. Labeled as simulated; it only changes this fictional persona in your private demo session.</p>
            <div className="mt-2"><ActionButton endpoint="/api/lifecycle" body={{ action: 'simulate' }} label="Simulate verified graduation" className="btn-gold text-sm" testId="simulate-graduation" /></div>
          </div>
        )}
      </div>
      <p className="mt-3 text-[11px] text-ink/50">In a real pilot, graduation would be verified through an approved source such as the Alumni Association or a Georgia Tech identity provider. GT Swarm does not have that access today.</p>
    </section>
  );
}
