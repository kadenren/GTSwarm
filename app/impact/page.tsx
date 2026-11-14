import Link from 'next/link';
import { impactStats, networkStats } from '@/lib/impact';
import ConnectionsChart from '@/components/ConnectionsChart';
import DirectionFlow from '@/components/DirectionFlow';
import CountUp from '@/components/CountUp';
import { HeroPattern } from '@/components/PageHero';
import { ready } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function ImpactPage() {
  await ready();
  const st = impactStats();
  const net = networkStats();
  const hero = [
    { n: st.projects, l: 'Projects mapped', d: 'capstones, VIP teams, CREATE-X startups, labs and clubs' },
    { n: st.claimed, l: 'Builders on the network', d: 'students and alumni with documented work' },
    { n: st.problems, l: 'Solved problems searchable', d: 'each one with the fix and who found it' },
    { n: st.startups, l: 'Startups formed', d: 'student and alumni ventures in the graph' },
  ];
  return (
    <div>
      <section className="relative overflow-hidden bg-navy text-white">
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Network impact</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Georgia Tech&apos;s builders, <span className="text-gold">one introduction apart</span>.
          </h1>
          <p className="mt-3 max-w-2xl text-white/70">What Georgia Tech gets: a live view of who is helping whom. Every number is computed from opt-in profiles and accepted connections.</p>
          <dl className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {hero.map((h) => (
              <div key={h.l} className="border-l-2 border-gold/70 pl-4" data-testid="impact-tile">
                <dd className="font-display text-5xl font-bold"><CountUp value={h.n} /></dd>
                <dt className="mt-1 font-semibold text-white">{h.l}</dt>
                <dd className="text-sm text-white/55">{h.d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* reach */}
      <section className="mx-auto -mt-8 max-w-7xl px-4">
        <div className="relative grid gap-4 md:grid-cols-3">
          {[
            { big: <CountUp value={net.pctWithin3} suffix="%" />, t: 'of alumni are within 3 introductions of a current student', d: `${net.alumniWithin3} of ${net.alumniTotal} alumni, through shared projects and consented connections.` },
            { big: <CountUp value={net.avgHops} decimals={1} />, t: 'introductions on average from a student to an alum', d: 'Warm paths run through real teammates, advisors and project lineages.' },
            { big: <CountUp value={net.crossMajorPct} suffix="%" />, t: 'of connections cross majors', d: 'Engineers meet business, design and medical expertise they would not find in their own department.' },
          ].map((x) => (
            <div key={x.t} className="card p-6 shadow-lg">
              <div className="font-display text-5xl font-bold text-navy">{x.big}</div>
              <div className="mt-2 font-semibold text-navy">{x.t}</div>
              <p className="mt-1 text-sm text-ink/60">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* alumni engagement */}
      <section className="mx-auto max-w-7xl px-4 pt-14" aria-label="Alumni engagement">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Alumni engagement</p>
        <h2 className="mt-2 text-3xl font-bold text-navy">Alumni help in minutes, not semesters</h2>
        <p className="mt-2 max-w-2xl text-ink/70">Most alumni will never join a startup, but many will take a 15-minute question about something they have already solved. GT Swarm makes that ask easy and specific.</p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3" data-tour="impact">
          {[
            [st.alumniOpen, `of ${st.alumni} alumni on the network are open to advising or helping`],
            [st.alumniSolvers, 'alumni have a solved problem on record that founders can search'],
            [st.helpAsks, 'help requests sent through Get Unstuck, each with the problem attached'],
          ].map(([n, l]) => (
            <div key={l as string} className="card p-5" data-testid="engagement-tile">
              <dd className="font-display text-4xl font-bold text-navy tabular-nums">{n}</dd>
              <dt className="mt-1 text-sm text-ink/70">{l}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* directions */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Every direction</p>
            <h2 className="mt-2 text-3xl font-bold text-navy">{st.connections} connections made through GT Swarm</h2>
            <p className="mt-3 text-ink/70">Each one started as a request, an introduction, a circle or co-advising, and each was accepted by both people. Arrow thickness shows volume.</p>
            <dl className="mt-6 grid grid-cols-2 gap-3">
              {(['student to alum', 'alum to student', 'alum to alum', 'student to student'] as const).map((d) => (
                <div key={d} className="rounded-lg border border-navy/10 bg-white p-3" data-testid={`direction-${d.replace(/ /g, '-')}`}>
                  <dd className="font-display text-2xl font-bold text-navy tabular-nums">{st.byDirection[d]}</dd>
                  <dt className="text-xs text-ink/60">{d.charAt(0).toUpperCase() + d.slice(1)}</dt>
                </div>
              ))}
            </dl>
          </div>
          <div className="card p-4"><DirectionFlow counts={st.byDirection} /></div>
        </div>
      </section>

      {/* knowledge carried forward */}
      <section className="border-y border-navy/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Knowledge carried forward</p>
              <h2 className="mt-2 text-3xl font-bold text-navy">Teams stop starting from zero</h2>
              <p className="mt-2 max-w-2xl text-ink/70">
                {st.lineages} projects continue earlier work, and <strong className="text-navy">{net.inheritedProblems} solved problems</strong> were handed to the team that came next, together with the people who solved them.
              </p>
            </div>
          </div>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {net.lineages.map((l) => (
              <li key={l.id}>
                <Link href={`/projects/${encodeURIComponent(l.latest.id)}`} className="card block h-full p-5 transition hover:border-gold hover:shadow-md">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gold-dark">{l.team}</div>
                  <div className="mt-1 font-display text-xl font-bold text-navy">{l.name}</div>
                  <div className="mt-3 flex items-center gap-1" aria-hidden="true">
                    {Array.from({ length: l.versions }).map((_, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className={`h-3 w-3 rounded-full ${i === l.versions - 1 ? 'bg-gold' : 'bg-navy'}`} />
                        {i < l.versions - 1 && <span className="h-0.5 w-6 bg-navy/25" />}
                      </span>
                    ))}
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div><dd className="font-display text-xl font-bold text-navy">{l.versions}</dd><dt className="text-[11px] text-ink/55">teams since {l.from}</dt></div>
                    <div><dd className="font-display text-xl font-bold text-navy">{l.builders}</dd><dt className="text-[11px] text-ink/55">builders</dt></div>
                    <div><dd className="font-display text-xl font-bold text-navy">{l.problems}</dd><dt className="text-[11px] text-ink/55">problems solved</dt></div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* growth + outcomes */}
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-14 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-5">
          <h2 className="text-lg font-bold text-navy">Network growth</h2>
          <p className="text-xs text-ink/60">Total consented connections over time</p>
          <ConnectionsChart data={st.overTime} />
        </div>
        <div className="card p-5">
          <h2 className="text-lg font-bold text-navy">Recent outcomes</h2>
          <ul className="mt-3 space-y-2.5">
            {st.recentMilestones.slice(0, 4).map((m) => (
              <li key={m.title + m.pid} className="flex gap-2 text-sm">
                <span className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${m.confirmed_by ? 'bg-gold text-navy-900' : 'bg-navy/15'}`} aria-hidden="true">
                  {m.confirmed_by && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5.5l2 2L8 3" stroke="currentColor" strokeWidth="1.6" fill="none" /></svg>}
                </span>
                <span><Link href={`/projects/${encodeURIComponent(m.pid)}`} className="font-semibold text-navy hover:underline">{m.name}</Link>: {m.title} <span className="text-xs text-ink/50">{m.date}</span></span>
              </li>
            ))}
            {st.outcomes.slice(0, 4).map((o) => (
              <li key={o.id} className="flex gap-2 text-sm">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-teal" aria-hidden="true" />
                <span><Link href={`/projects/${encodeURIComponent(o.id)}`} className="font-semibold text-navy hover:underline">{o.name} ({o.year})</Link>: {o.outcome}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink/55">A gold check means an advisor confirmed the milestone. {st.acceptedRequests} requests have been accepted so far.</p>
        </div>
      </section>
    </div>
  );
}
