import Link from 'next/link';
import { impactStats } from '@/lib/impact';
import PageHero from '@/components/PageHero';
import { ready } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** Impact for GT: a few live numbers a program office would report on. */
export default async function ImpactPage() {
  await ready();
  const st = impactStats();
  const tiles: [number, string][] = [
    [st.claimed, 'students and alumni opted in'],
    [st.startups, 'startups on the network'],
    [st.problems, 'solved problems searchable'],
    [st.connections, 'connections made, each accepted by both people'],
  ];
  const engagement: [number, string][] = [
    [st.alumniOpen, `of ${st.alumni} alumni are open to advising or helping`],
    [st.alumniSolvers, 'alumni have a solved problem founders can search'],
    [st.helpAsks, 'help requests sent through Get Unstuck'],
  ];
  return (
    <div>
      <PageHero eyebrow="Impact for GT" title="What Georgia Tech gets"
        subtitle="Live numbers from opt-in profiles and accepted connections: who is helping whom, and what it leads to." />

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map(([n, l]) => (
            <div key={l} className="card p-5" data-testid="impact-tile">
              <dd className="font-display text-4xl font-bold text-navy tabular-nums">{n}</dd>
              <dt className="mt-1 text-sm text-ink/70">{l}</dt>
            </div>
          ))}
        </dl>

        <section aria-label="Alumni engagement">
          <h2 className="text-2xl font-bold text-navy">Alumni help in minutes, not semesters</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink/70">Most alumni will never join a startup, but many will answer a 15-minute question about something they already solved.</p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3" data-tour="impact">
            {engagement.map(([n, l]) => (
              <div key={l} className="card p-5" data-testid="engagement-tile">
                <dd className="font-display text-4xl font-bold text-navy tabular-nums">{n}</dd>
                <dt className="mt-1 text-sm text-ink/70">{l}</dt>
              </div>
            ))}
          </dl>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card p-5" aria-label="Connections by direction">
            <h2 className="text-lg font-bold text-navy">Connections by direction</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              {(['alum to alum', 'student to alum', 'alum to student', 'student to student'] as const).map((d) => (
                <div key={d} className="rounded-lg bg-paper p-3" data-testid={`direction-${d.replace(/ /g, '-')}`}>
                  <dd className="font-display text-2xl font-bold text-navy tabular-nums">{st.byDirection[d]}</dd>
                  <dt className="text-xs text-ink/60">{d.charAt(0).toUpperCase() + d.slice(1)}</dt>
                </div>
              ))}
            </dl>
          </section>
          <section className="card p-5" aria-label="Recent outcomes">
            <h2 className="text-lg font-bold text-navy">Recent outcomes</h2>
            <ul className="mt-3 space-y-2">
              {st.outcomes.slice(0, 5).map((o) => (
                <li key={o.id} className="flex gap-2 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal" aria-hidden="true" />
                  <span><Link href={`/projects/${encodeURIComponent(o.id)}`} className="font-semibold text-navy hover:underline">{o.name} ({o.year})</Link>: {o.outcome}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
