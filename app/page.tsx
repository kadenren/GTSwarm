import Link from 'next/link';
import DemoButton from '@/components/DemoButton';
import { HeroPattern } from '@/components/PageHero';
import { getViewerId } from '@/lib/viewer';
import { snapshot } from '@/lib/data';
import { suggestCircles, circleMembers } from '@/lib/circles';
import { whyConnect } from '@/lib/people';

export const dynamic = 'force-dynamic';

const SEATTLE = 'group:g04';

/** Welcome page: who it's for, why it matters, and one obvious first step. Short on purpose. */
export default async function Landing() {
  await getViewerId(); // loads this visitor's demo session
  const s = snapshot();
  // a small live preview: what a fictional Seattle alum (Noah) sees, computed from demo records
  const noah = s.people.find((p) => p.name === 'Noah Bennett');
  const circle = noah ? suggestCircles(noah.id).find((x) => x.circle.id === SEATTLE) : undefined;
  const people = noah && circle ? circleMembers(noah.id, SEATTLE, 2).filter((m) => m.canMeet) : [];

  const steps = [
    ['Find your community.', 'Discover groups, interests, and events relevant to you.', 'Example: GT in Seattle, or AI & Robotics.'],
    ['Meet the right people.', 'See who shares your interests and why they may be a good connection.', 'Example: “You both listed robotics.”'],
    ['Stay connected.', 'Send a request and keep your network after graduation.', 'Example: a student asks an alum for career advice.'],
  ];

  return (
    <div>
      <section className="relative overflow-hidden bg-navy text-white">
        <HeroPattern opacity={0.08} />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:py-14 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">For Georgia Tech students &amp; alumni</p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-[3.4rem]">Your Georgia Tech community, for life.</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">Being a Yellow Jacket connects you to people long after graduation. GT Swarm helps you find them, meet them, and stay involved.</p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link href="/people" className="btn-gold px-6 py-3 text-base" data-testid="find-your-people">Find your people</Link>
              <a href="#how" className="text-base font-semibold text-white underline decoration-gold underline-offset-4 hover:text-gold">See how it works</a>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/65">
              <span>Explore with fictional demo members.</span>
              <DemoButton variant="hero" label="Start guided demo" />
            </div>
          </div>

          {circle && (
            <div className="rounded-2xl bg-white p-5 text-ink shadow-xl" aria-label="Example of what a member sees" data-testid="hero-preview">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">Example · Noah, alum ’24, just moved to Seattle</p>
              <div className="mt-3 rounded-xl border border-navy/10 p-4">
                <p className="text-xs font-semibold text-ink/55">Suggested community</p>
                <p className="font-display text-lg font-bold text-navy">{circle.circle.name}</p>
                <p className="text-sm font-medium text-teal">{circle.reason}</p>
              </div>
              <ul className="mt-3 space-y-2">
                {people.map((m) => (
                  <li key={m.id} className="rounded-xl border border-navy/10 p-4">
                    <p className="font-semibold text-navy">{m.name} <span className="text-sm font-normal text-ink/55">{m.line}</span></p>
                    <p className="mt-1 text-sm text-ink/75"><span className="font-semibold text-navy">Why this person? </span>{whyConnect(noah!.id, s.person.get(m.id)!, 'meet')}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-ink/45">Fictional demo members. Shown only because they chose to welcome requests.</p>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="why-h">
        <h2 id="why-h" className="max-w-3xl text-3xl font-bold text-navy">The community is already here. Finding your place should be easier.</h2>
        <p className="mt-3 max-w-2xl text-lg text-ink/75">Georgia Tech brings people together across generations, industries, and cities. GT Swarm makes it easier to find Yellow Jackets who share your interests and are open to connecting.</p>
      </section>

      <section id="how" className="scroll-mt-20 border-y border-navy/10 bg-white" aria-labelledby="how-h" data-tour="how">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 id="how-h" className="text-2xl font-bold text-navy">How it works</h2>
          <ol className="mt-6 grid gap-6 md:grid-cols-3">
            {steps.map(([title, text, ex], i) => (
              <li key={title}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy font-display text-sm font-bold text-white">{i + 1}</span>
                <h3 className="mt-3 font-display text-lg font-bold text-navy">{title}</h3>
                <p className="mt-1 text-ink/75">{text}</p>
                <p className="mt-1 text-sm text-ink/55">{ex}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2" aria-label="Example and lifelong membership">
        <div className="rounded-2xl border-l-4 border-gold bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">A short example</p>
          <p className="mt-2 text-lg text-ink/85">You graduated from Georgia Tech and moved to Seattle. You want to meet other Yellow Jackets nearby. GT Swarm suggests a local community, shows alumni who welcome networking, and gives you a way to say hello.</p>
          <Link href={`/communities/${encodeURIComponent(SEATTLE)}`} className="btn-primary mt-4 px-4 py-2 text-sm" data-testid="seattle-example">Explore communities</Link>
        </div>
        <div className="p-2">
          <p className="font-display text-2xl font-bold text-navy">Student <span className="text-gold" aria-hidden="true">→</span> Alum <span className="text-gold" aria-hidden="true">→</span> A Yellow Jacket for life</p>
          <p className="mt-3 text-ink/75">Your profile and connections stay with you. Verified graduation simply changes which alumni benefits you can access.</p>
          <p className="mt-2 text-sm text-ink/55">Alumni are people who attended Georgia Tech and have graduated. In this demo, verification is simulated.</p>
        </div>
      </section>

      <section className="border-t border-navy/10 bg-paper" aria-label="Trust">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-ink/75">
          <ul className="space-y-1.5">
            <li>Members choose what they share and which requests they accept.</li>
            <li>GT Swarm is a proposed opt-in platform, not an official university directory or a replacement for existing GT programs.</li>
          </ul>
          <Link href="/pilot" className="mt-3 inline-block font-semibold text-navy underline decoration-gold underline-offset-4">How a student government pilot could work</Link>
        </div>
      </section>
    </div>
  );
}
