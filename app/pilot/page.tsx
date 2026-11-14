import Link from 'next/link';
import PageHero from '@/components/PageHero';
import DemoButton from '@/components/DemoButton';
import { ready } from '@/lib/session';
import { OPERATING_MODEL, PROGRAMS, PRIVACY, REAL, SIMULATED, PROPOSED_NOTE } from '@/lib/pitch';

export const dynamic = 'force-dynamic';

const TIMELINE = [
  { weeks: 'Weeks 1–3', title: 'Set up', items: ['SGA approves the pilot and a short data policy', 'Add verified gatech.edu email sign-in (planned; the demo uses a persona switcher)', 'Recruit a first cohort of startups through student organizations'] },
  { weeks: 'Weeks 4–6', title: 'Launch', items: ['Founders post their stage, open roles and needs', 'Students and alumni build profiles from a resume in about two minutes', 'Invite links shared through student orgs and, if they agree, partner programs'] },
  { weeks: 'Weeks 7–12', title: 'Match', items: ['Founders search for people; builders get startup recommendations', 'Every introduction goes through a request the other person accepts', 'Teams log solved problems so Get Unstuck grows'] },
  { weeks: 'Weeks 13–15', title: 'Report', items: ['Pilot numbers and feedback go to SGA', 'SGA decides whether to continue', 'Only then approach programs about a partnership'] },
];

const MEASURES = [
  { m: 'Accepted introductions', how: 'Requests and invites accepted by both people' },
  { m: 'Roles filled', how: 'Open roles a founder marks as filled through GT Swarm' },
  { m: 'Collaborations started', how: 'People added to a team after a match' },
  { m: 'Match quality', how: 'A one-question rating after each introduction' },
];

const RESOURCES = [
  { r: 'Hosting', d: 'One web app and one Postgres database, the same setup this demo runs on. Small monthly cost at pilot scale.' },
  { r: 'People', d: 'A student program lead appointed by SGA for a few hours a week, plus a small student developer team.' },
  { r: 'University systems', d: 'None required for the pilot. Georgia Tech single sign-on only later, and only if approved.' },
  { r: 'AI services', d: 'Not required. Matching runs on the knowledge graph and keyword search; Gemini is an optional add-on.' },
];

const RISKS = [
  { risk: 'An empty network on day one', fix: 'Start with a cohort of startups that post their needs first, so the first builders get recommendations right away.' },
  { risk: 'Stale profiles and startup pages', fix: 'Founders update stage and roles in one click; the program lead sends a monthly reminder.' },
  { risk: 'Unwanted contact', fix: 'Every contact is a request that can be declined, and duplicate requests are blocked.' },
  { risk: 'Privacy and startup IP', fix: 'Opt-in only, no university records, and founders choose what is public. Profile removal on request during the pilot.' },
  { risk: 'Students graduate', fix: 'SGA owns the accounts and domain; the code and docs are handed to the next student team each year.' },
];

/** The SGA pilot plan: who runs GT Swarm, how it fits existing GT programs, the semester timeline, and how success is measured. */
export default async function PilotPage() {
  await ready();
  return (
    <div>
      <PageHero eyebrow="Implementation plan" title="How SGA could pilot GT Swarm next semester"
        subtitle="A low-cost, opt-in pilot run by the Student Government Association, working alongside programs Georgia Tech already has. Nothing here requires access to university records." />

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-12">
        {/* who does what */}
        <section aria-labelledby="who-h">
          <h2 id="who-h" className="text-2xl font-bold text-navy">Who does what</h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {OPERATING_MODEL.map((o, i) => (
              <li key={o.who} className={`card p-5 ${i === 0 ? 'border-gold ring-2 ring-gold/30' : ''}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-dark">{o.role}</p>
                <h3 className="mt-1 font-display text-lg font-bold text-navy">{o.who}</h3>
                <ul className="mt-3 space-y-1.5 text-sm text-ink/75">{o.does.map((d) => <li key={d} className="flex gap-2"><span className="text-gold-dark" aria-hidden="true">·</span>{d}</li>)}</ul>
              </li>
            ))}
          </ul>
        </section>

        {/* existing programs */}
        <section aria-labelledby="programs-h">
          <h2 id="programs-h" className="text-2xl font-bold text-navy">Works with the programs Georgia Tech already has</h2>
          <p className="mt-1 max-w-3xl text-sm text-ink/70">Programs run cohorts, events and courses a few times a year. GT Swarm is the always-on matching layer between them. It complements them; it does not replace them.</p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {PROGRAMS.map((p) => (
              <li key={p.name} className="card p-5">
                <h3 className="font-display text-lg font-bold text-navy">{p.name}</h3>
                <dl className="mt-2 space-y-2 text-sm">
                  <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Today</dt><dd className="text-ink/75">{p.today}</dd></div>
                  <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-teal">With GT Swarm</dt><dd className="text-ink/90">{p.adds}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink/55">{PROPOSED_NOTE}</p>
        </section>

        {/* timeline */}
        <section aria-labelledby="timeline-h" data-tour="pilot-timeline">
          <h2 id="timeline-h" className="text-2xl font-bold text-navy">One semester, four steps</h2>
          <ol className="mt-5 grid gap-4 md:grid-cols-4">
            {TIMELINE.map((t, i) => (
              <li key={t.weeks} className="relative rounded-xl border border-navy/10 bg-white p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy font-display text-sm font-bold text-white">{i + 1}</span>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gold-dark">{t.weeks}</p>
                <h3 className="font-display text-lg font-bold text-navy">{t.title}</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-ink/75">{t.items.map((x) => <li key={x} className="flex gap-2"><span className="text-gold-dark" aria-hidden="true">·</span>{x}</li>)}</ul>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* measures */}
          <section className="card p-6" aria-labelledby="measure-h">
            <h2 id="measure-h" className="text-xl font-bold text-navy">How SGA would measure success</h2>
            <dl className="mt-4 space-y-3">
              {MEASURES.map((m) => (
                <div key={m.m} className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-teal" aria-hidden="true" />
                  <div><dt className="font-semibold text-navy">{m.m}</dt><dd className="text-sm text-ink/70">{m.how}</dd></div>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-ink/65">The first two are already counted live on <Link href="/impact" className="font-semibold text-navy underline decoration-gold underline-offset-4">Impact for GT</Link> (on demo data). Ratings and roles-filled tracking would be added for the pilot.</p>
          </section>

          {/* resources */}
          <section className="card p-6" aria-labelledby="res-h">
            <h2 id="res-h" className="text-xl font-bold text-navy">What it takes</h2>
            <dl className="mt-4 space-y-3">
              {RESOURCES.map((r) => (
                <div key={r.r}><dt className="font-semibold text-navy">{r.r}</dt><dd className="text-sm text-ink/70">{r.d}</dd></div>
              ))}
            </dl>
          </section>
        </div>

        {/* risks */}
        <section aria-labelledby="risk-h">
          <h2 id="risk-h" className="text-2xl font-bold text-navy">Risks we have planned for</h2>
          <div className="mt-5 overflow-hidden rounded-xl border border-navy/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-[11px] uppercase tracking-wide text-ink/55"><tr><th scope="col" className="px-4 py-2.5">Risk</th><th scope="col" className="px-4 py-2.5">How the plan handles it</th></tr></thead>
              <tbody className="divide-y divide-navy/5">
                {RISKS.map((r) => <tr key={r.risk}><th scope="row" className="px-4 py-3 align-top font-semibold text-navy">{r.risk}</th><td className="px-4 py-3 text-ink/75">{r.fix}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>

        {/* privacy + honesty */}
        <section className="grid gap-4 lg:grid-cols-3" aria-label="Privacy and what is built">
          <div className="card p-5">
            <h2 className="font-display text-lg font-bold text-navy">Privacy by design</h2>
            <ul className="mt-3 space-y-2 text-sm">{PRIVACY.map((x) => <li key={x} className="flex gap-2"><span className="font-bold text-teal" aria-hidden="true">✓</span>{x}</li>)}</ul>
            <p className="mt-3 text-xs text-ink/55">We do not claim FERPA certification or university approval; the pilot is designed so neither is needed to start.</p>
          </div>
          <div className="card p-5">
            <h2 className="font-display text-lg font-bold text-navy">Working in this demo</h2>
            <ul className="mt-3 space-y-2 text-sm">{REAL.map((x) => <li key={x} className="flex gap-2"><span className="font-bold text-teal" aria-hidden="true">✓</span>{x}</li>)}</ul>
          </div>
          <div className="card p-5">
            <h2 className="font-display text-lg font-bold text-navy">Simulated for the demo</h2>
            <ul className="mt-3 space-y-2 text-sm">{SIMULATED.map((x) => <li key={x} className="flex gap-2"><span className="font-bold text-gold-dark" aria-hidden="true">○</span>{x}</li>)}</ul>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-navy px-6 py-5 text-white">
          <p className="mr-auto font-display text-lg font-bold">See the working product in about a minute.</p>
          <DemoButton variant="hero" />
          <Link href="/match?mode=people" className="btn-gold px-5 py-2.5 text-base">Find Your People</Link>
        </div>
      </div>
    </div>
  );
}
