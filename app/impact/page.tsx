import Link from 'next/link';
import { impactStats, DIRECTIONS } from '@/lib/impact';
import ConnectionsChart from '@/components/ConnectionsChart';

export const dynamic = 'force-dynamic';

const DIR_STYLE: Record<string, { from: string; to: string }> = {
  'student to alum': { from: 'bg-plum', to: 'bg-teal' },
  'alum to alum': { from: 'bg-teal', to: 'bg-teal' },
  'alum to student': { from: 'bg-teal', to: 'bg-plum' },
  'student to student': { from: 'bg-plum', to: 'bg-plum' },
};

export default function ImpactPage() {
  const st = impactStats();
  const tiles = [
    { n: st.projects, l: 'Projects mapped' },
    { n: st.claimed, l: 'People claimed' },
    { n: st.problems, l: 'Problems solved' },
    { n: st.startups, l: 'Startups formed' },
  ];
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold text-navy">Network impact</h1>
      <p className="mt-1 text-sm text-ink/70">What the swarm has built, and the connections it has made in every direction.</p>

      <dl className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.l} className="card p-5" data-testid="impact-tile">
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">{t.l}</dt>
            <dd className="mt-1 font-display text-4xl font-bold text-navy tabular-nums">{t.n}</dd>
          </div>
        ))}
      </dl>

      <section className="card mt-6 p-5" aria-label="Connections by direction">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-navy">Connections made through GT Swarm</h2>
          <span className="font-display text-3xl font-bold text-navy tabular-nums" data-testid="connections-total">{st.connections}</span>
        </div>
        <p className="text-xs text-ink/60">Consented connections from accepted requests, intros, circles and co-advising, split by direction.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {DIRECTIONS.map((d) => (
            <div key={d} className="rounded-lg border border-navy/10 bg-paper p-4" data-testid={`direction-${d.replace(/ /g, '-')}`}>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink/70">
                <span className={`h-2.5 w-2.5 rounded-full ${DIR_STYLE[d].from}`} aria-hidden="true" />
                <span aria-hidden="true">→</span>
                <span className={`h-2.5 w-2.5 rounded-full ${DIR_STYLE[d].to}`} aria-hidden="true" />
                <span className="ml-1">{d.charAt(0).toUpperCase() + d.slice(1)}</span>
              </div>
              <div className="mt-1 font-display text-3xl font-bold text-navy tabular-nums">{st.byDirection[d]}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-5" aria-label="Connections over time">
          <h2 className="text-lg font-bold text-navy">New connections per quarter</h2>
          <ConnectionsChart data={st.overTime} />
        </section>
        <section className="card p-5" aria-label="Recent outcomes">
          <h2 className="text-lg font-bold text-navy">Recent outcomes</h2>
          <ul className="mt-3 space-y-2.5">
            {st.recentMilestones.slice(0, 4).map((m) => (
              <li key={m.title + m.pid} className="flex gap-2 text-sm">
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${m.confirmed_by ? 'bg-gold' : 'bg-navy/20'}`} aria-hidden="true" />
                <span><Link href={`/projects/${encodeURIComponent(m.pid)}`} className="font-semibold text-navy hover:underline">{m.name}</Link>: {m.title} <span className="text-xs text-ink/50">{m.date}</span></span>
              </li>
            ))}
            {st.outcomes.slice(0, 4).map((o) => (
              <li key={o.id} className="flex gap-2 text-sm">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-teal" aria-hidden="true" />
                <span><Link href={`/projects/${encodeURIComponent(o.id)}`} className="font-semibold text-navy hover:underline">{o.name} ({o.year})</Link>: {o.outcome}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink/55">{st.lineages} projects continue earlier work, and {st.acceptedRequests} requests have been accepted.</p>
        </section>
      </div>
    </div>
  );
}
