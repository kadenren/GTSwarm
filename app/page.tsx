import Link from 'next/link';
import HomeSearch from '@/components/HomeSearch';
import HeroWeb from '@/components/HeroWeb';
import { HeroPattern } from '@/components/PageHero';
import { impactStats, DIRECTIONS } from '@/lib/impact';

export const dynamic = 'force-dynamic';

const JOURNEY = [
  { stage: 'Idea', need: 'Find a cofounder who has shipped hardware', href: '/search?q=low-power+embedded+hardware%2C+has+shipped+a+product&role=Cofounder&aud=both' },
  { stage: 'Prototype', need: 'Get unstuck on a Bluetooth bug someone already fixed', href: '/stuck?q=Bluetooth+drops+when+the+sensor+sleeps' },
  { stage: 'Team', need: 'Hire students with real wearable firmware experience', href: '/search?q=wearable+firmware&role=Early+engineer&aud=students' },
  { stage: 'Regulatory', need: 'Find an alum who has been through FDA clearance', href: '/search?q=FDA+approval+for+a+wearable+medical+device&role=Advisor&aud=both' },
  { stage: 'Handoff', need: 'Inherit last year’s team, its fixes and its builders', href: '/projects/project%3Apr004' },
];

export default function Home() {
  const st = impactStats();
  return (
    <div>
      {/* hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <HeroPattern opacity={0.1} />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Georgia Tech students and alumni
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-[3.4rem]">
              Whatever you&apos;re building, <span className="text-gold">someone at GT</span> has the expertise.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75">
              GT Swarm maps every capstone, VIP team, CREATE-X startup, lab and club into one graph of people, projects and solved problems, so you can find the right Yellow Jacket at every step of building.
            </p>
            <div className="mt-8 max-w-xl"><HomeSearch /></div>
            <p className="mt-4 text-sm text-white/70">GT alum or student? <Link href="/join" className="font-semibold text-gold underline decoration-gold/50 underline-offset-4 hover:text-gold-light">Add yourself to the swarm in two minutes →</Link></p>
            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
              {[[st.projects, 'projects mapped'], [st.claimed, 'builders'], [st.problems, 'solved problems'], [st.lineages, 'project handoffs']].map(([n, l]) => (
                <div key={l as string}>
                  <dd className="font-display text-3xl font-bold text-white">{n}</dd>
                  <dt className="text-xs uppercase tracking-wide text-white/50">{l}</dt>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3 shadow-2xl backdrop-blur-sm">
              <HeroWeb />
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pb-2 text-[11px] text-white/60">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-teal" />Alumni</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-plum" />Students</span>
                <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded bg-gold" />Best match</span>
                <span>Closer to center = stronger match</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">How it works</p>
        <h2 className="mt-2 text-center text-3xl font-bold text-navy">From a question to a warm introduction in three steps</h2>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { n: '1', t: 'Search by what you need', d: 'Type a skill or paste the bug you are stuck on, and pick a role: cofounder, advisor, helper, early engineer or first customer.' },
            { n: '2', t: 'See who has actually built it', d: 'Results form a relevance web ranked on documented work, not self-reported skills. Every person comes with a plain-English reason and a score breakdown.' },
            { n: '3', t: 'Connect through people you know', d: 'Each match shows the warm path from you. Requests need consent, and everything you build and solve feeds back into the swarm.' },
          ].map((s) => (
            <li key={s.n} className="card relative p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy font-display text-lg font-bold text-gold">{s.n}</span>
              <h3 className="mt-4 text-lg font-bold text-navy">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* journey */}
      <section className="border-y border-navy/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Throughout the building process</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-bold text-navy">The right person at every stage of a startup</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-5">
            {JOURNEY.map((j, i) => (
              <li key={j.stage} className="relative">
                {i < JOURNEY.length - 1 && <span className="absolute left-10 right-0 top-5 hidden h-0.5 bg-gradient-to-r from-gold to-gold/20 md:block" aria-hidden="true" />}
                <Link href={j.href} className="group relative block">
                  <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-gold bg-white font-display font-bold text-navy transition group-hover:bg-gold">{i + 1}</span>
                  <div className="mt-3 font-display text-lg font-bold text-navy">{j.stage}</div>
                  <p className="mt-1 text-sm leading-snug text-ink/70">{j.need}</p>
                  <span className="mt-2 inline-block text-xs font-semibold text-gold-dark opacity-0 transition group-hover:opacity-100">Try it →</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* every direction */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Every direction</p>
            <h2 className="mt-2 text-3xl font-bold text-navy">Not just mentoring. A network that runs both ways.</h2>
            <p className="mt-3 text-ink/70">
              Students find alumni who solved their problem years ago. Alumni founders hire students with proven build records. Alumni find each other. Students team up across majors. {st.connections} connections so far, every one of them consented.
            </p>
            <Link href="/impact" className="btn-primary mt-6">See the impact →</Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {DIRECTIONS.map((d) => {
              const [a, , b] = d.split(' ');
              return (
                <div key={d} className="card p-5">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold uppercase text-white ${a === 'alum' ? 'bg-teal' : 'bg-plum'}`}>{a === 'alum' ? 'Alum' : 'Stu'}</span>
                    <svg width="28" height="10" viewBox="0 0 28 10" aria-hidden="true"><path d="M0 5h24M20 1l4 4-4 4" stroke="#B3A369" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold uppercase text-white ${b === 'alum' ? 'bg-teal' : 'bg-plum'}`}>{b === 'alum' ? 'Alum' : 'Stu'}</span>
                  </div>
                  <div className="mt-3 font-display text-4xl font-bold text-navy">{st.byDirection[d]}</div>
                  <div className="text-sm capitalize text-ink/60">{d}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* graph is the product */}
      <section className="relative overflow-hidden bg-navy text-white">
        <HeroPattern opacity={0.08} />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-3">
          {[
            { t: 'The graph is the product', d: 'Ranking, warm paths, circles and introductions are transparent graph algorithms. AI only helps with wording and data entry.' },
            { t: 'Explainable by design', d: 'Every match shows why: what they built, the score breakdown and the path from you. No black-box recommendations.' },
            { t: 'Grows as you build', d: 'Logging a solved problem or a helper makes your expertise searchable for the next team. Projects carry forward across years.' },
          ].map((x) => (
            <div key={x.t}>
              <div className="h-1 w-10 rounded bg-gold" />
              <h3 className="mt-4 text-xl font-bold">{x.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{x.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
