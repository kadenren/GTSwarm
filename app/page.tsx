import Link from 'next/link';
import DiscoverBuilds from '@/components/DiscoverBuilds';
import DemoButton from '@/components/DemoButton';
import { getViewerId } from '@/lib/viewer';
import { HeroPattern } from '@/components/PageHero';
import { listBuilds } from '@/lib/builds';
import { snapshot } from '@/lib/data';
import { roleLabel } from '@/lib/roles';
import { PHASES, PRIVACY, REAL, SIMULATED, PROGRAMS, PROPOSED_NOTE } from '@/lib/pitch';

export const dynamic = 'force-dynamic';

const FIND_COFOUNDER = "/match?mode=people&q=I%27m+building+a+wearable+medical+device+startup+and+need+an+alumni+cofounder+with+embedded+hardware+or+medical-device+expertise.&role=Cofounder&aud=alumni";

const PROBLEM = [
  { who: 'The founder', quote: 'I know what I want to build, but I don’t know who can help.', tone: 'bg-teal',
    icon: <path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2l.9-5.5-4-3.9 5.5-.8z" /> },
  { who: 'The builder', quote: 'I have valuable experience, but I don’t know which startups need it.', tone: 'bg-plum',
    icon: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-2.5z" /> },
  { who: 'The alumni network', quote: 'The expertise already exists at Georgia Tech. The connections are missing.', tone: 'bg-gold',
    icon: <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5m-.6-4.6c.9-.3 1.9-.4 3.1-.4 2.7 0 4.9 2 5.5 5" /> },
];


/** Home: the problem, what makes GT Swarm different, the two ways it works, how GT could pilot it, then the startup feed. */
export default async function Home() {
  const viewerId = await getViewerId(); // also loads this visitor's demo session
  const builds = listBuilds();
  const s = snapshot();
  const openRoles = builds.filter((b) => b.open).reduce((n, b) => n + b.rolesNeeded.length, 0);
  const builders = s.people.filter((p) => p.claimed).length;

  // the examples below are real records from the demo database, looked up live (no hard-coded experience)
  const byName = (n: string) => s.people.find((p) => p.name === n);
  const dana = byName('Dana Whitfield');
  const danaBuilt = dana ? (s.projectsOf.get(dana.id) ?? []).map((m) => s.project.get(m.project_id)!).filter((p) => p.outcome && /shipped|sold/i.test(p.outcome))[0] : undefined;
  const danaSolved = dana ? (s.problemsBy.get(dana.id) ?? []).find((pb) => /battery/i.test(pb.description)) : undefined;
  const danaSolvedOn = danaSolved ? s.project.get(danaSolved.project_id) : undefined;
  const maya = byName('Maya Okafor');
  const mayaBuilt = maya ? (s.projectsOf.get(maya.id) ?? []).map((m) => s.project.get(m.project_id)!).sort((a, b) => b.year - a.year)[0] : undefined;
  const restwell = builds.find((b) => b.name === 'Restwell Patch');

  return (
    <div>
      {/* 1. Hero: the problem and the two ways in */}
      <section className="relative overflow-hidden bg-navy text-white">
        <HeroPattern opacity={0.1} />
        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-12 sm:pt-14">
          <h1 className="max-w-4xl text-4xl font-bold leading-[1.06] tracking-tight sm:text-[3.4rem]">
            Georgia Tech has the talent. <span className="text-gold">GT Swarm makes the connections.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
            An intelligent entrepreneurship network matching Georgia Tech founders with the students and alumni who have the expertise they need, while helping builders discover startups where their skills matter.
          </p>
          <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
            <Link href="/match?mode=people" className="group rounded-xl bg-gold px-5 py-4 text-navy-900 shadow-lg transition hover:bg-gold-light" data-testid="find-match-cta">
              <span className="block font-display text-lg font-bold">Find Your People <span aria-hidden="true" className="inline-block transition group-hover:translate-x-0.5">→</span></span>
              <span className="block text-sm text-navy-900/75">For founders who need a cofounder, engineer or advisor</span>
            </Link>
            <Link href="/match?mode=startups" className="group rounded-xl border border-white/25 bg-white/[0.06] px-5 py-4 transition hover:border-gold hover:bg-white/10" data-testid="find-startup-cta">
              <span className="block font-display text-lg font-bold">Find Your Startup <span aria-hidden="true" className="inline-block transition group-hover:translate-x-0.5">→</span></span>
              <span className="block text-sm text-white/70">For students and alumni who want to contribute</span>
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <DemoButton variant="hero" />
            <a href="#startups" className="text-sm font-semibold text-white/80 underline decoration-gold underline-offset-4 hover:text-white">Or browse startups, no sign-up needed</a>
          </div>
          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-3" data-tour="stats">
            {[[builders, 'students and alumni'], [builds.length, 'startups and projects'], [openRoles, 'open roles'], [s.problems.length, 'solved problems']].map(([n, l]) => (
              <div key={l as string}>
                <dd className="font-display text-3xl font-bold">{n}</dd>
                <dt className="text-xs uppercase tracking-wide text-white/55">{l}</dt>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[11px] text-white/45">Fictional demo data, not live users.</p>
        </div>
      </section>

      {/* 2. The problem */}
      <section className="mx-auto max-w-7xl px-4 py-14" aria-labelledby="problem-h" data-tour="problem">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">The problem</p>
        <h2 id="problem-h" className="mt-2 max-w-3xl text-3xl font-bold text-navy">Everyone needed for a startup is already here. They just can’t find each other.</h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {PROBLEM.map((p) => (
            <li key={p.who} className="card relative p-6">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${p.tone}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p.icon}</svg>
              </span>
              <p className="mt-4 font-display text-lg font-semibold leading-snug text-navy">&ldquo;{p.quote}&rdquo;</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink/50">{p.who}</p>
            </li>
          ))}
        </ul>
        <div className="mt-6 rounded-xl border-l-4 border-gold bg-white px-5 py-4 text-ink/80 shadow-sm">
          <strong className="text-navy">GT Swarm closes the gap.</strong> Students and alumni opt in with what they have built and how they want to help. Founders describe what they need. GT Swarm matches the two in both directions and explains every match, so the first message is already relevant.
        </div>
      </section>

      {/* 3. The differentiator */}
      <section className="border-y border-navy/10 bg-white" aria-labelledby="diff-h">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">What makes it different</p>
            <h2 id="diff-h" className="mt-2 text-3xl font-bold text-navy">Beyond networking. Match experience to opportunity.</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-navy/10 bg-paper p-5">
                <h3 className="text-sm font-bold uppercase tracking-wide text-ink/55">Traditional directories</h3>
                <ul className="mt-3 space-y-2.5 text-sm text-ink/75">
                  {['Search by name, major, company or keywords', 'You read and judge every profile yourself', 'Nothing links a startup’s needs to proven experience'].map((x) => (
                    <li key={x} className="flex gap-2"><span className="mt-0.5 text-ink/35" aria-hidden="true">✕</span>{x}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border-2 border-gold/60 bg-gold/[0.07] p-5">
                <h3 className="text-sm font-bold uppercase tracking-wide text-gold-dark">GT Swarm</h3>
                <ul className="mt-3 space-y-2.5 text-sm text-ink/85">
                  {['Understands what a startup specifically needs', 'Searches skills, projects and problems people actually solved', 'Respects the roles people want and their available hours', 'Explains why each match is relevant', 'Recommends startups to builders, not just builders to founders'].map((x) => (
                    <li key={x} className="flex gap-2"><span className="mt-0.5 font-bold text-teal" aria-hidden="true">✓</span>{x}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-4 rounded-lg bg-paper px-4 py-3 text-sm text-ink/75"><strong className="text-navy">And it does not replace CREATE-X or Startup Exchange.</strong> Programs run cohorts and events a few times a year; GT Swarm keeps the matching going between them.</p>
            <Link href="/match#how" className="mt-4 inline-block text-sm font-semibold text-navy underline decoration-gold underline-offset-4">How the matching works →</Link>
          </div>

          {dana && (
            <figure className="self-center rounded-2xl bg-navy p-5 text-white shadow-xl sm:p-6" aria-label="Example match from the demo data" data-testid="home-example">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-light">A real match from the demo data</p>
              <div className="mt-3 rounded-xl bg-white/10 p-4">
                <p className="text-xs text-white/60">Elena Brooks, alumni founder of Restwell Patch</p>
                <p className="mt-1 font-display text-lg font-semibold">&ldquo;I need an alumni cofounder with wearable-device experience.&rdquo;</p>
              </div>
              <div className="mt-3 rounded-xl bg-white p-4 text-ink">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal font-bold text-white ring-2 ring-gold">DW</span>
                  <div>
                    <p className="font-display text-lg font-bold text-navy">{dana.name} <span className="text-sm font-medium text-ink/55">alum &apos;{String(dana.grad_year).slice(2)}</span></p>
                    <p className="text-xs text-ink/60">{dana.current_role}</p>
                  </div>
                  <span className="ml-auto rounded-full bg-teal px-2.5 py-1 text-xs font-semibold text-white">Top match</span>
                </div>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink/50">Why, from her record</p>
                <ul className="mt-1.5 space-y-1.5 text-sm">
                  {danaBuilt && <li className="flex gap-2"><span className="tag shrink-0 bg-navy/5">Built</span><span>{danaBuilt.name} ({danaBuilt.year}): {danaBuilt.outcome}</span></li>}
                  {danaSolved && danaSolvedOn && <li className="flex gap-2"><span className="tag shrink-0 bg-navy/5">Solved</span><span>&ldquo;{danaSolved.description}&rdquo; on {danaSolvedOn.name} ({danaSolvedOn.year})</span></li>}
                  <li className="flex gap-2"><span className="tag shrink-0 bg-navy/5">Wants</span><span>Open to {dana.open_to.map((r) => roleLabel(r).toLowerCase()).join(' or ')} roles · {dana.availability_hours} h/week</span></li>
                </ul>
              </div>
              <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
                <span>Fictional people; every line above is read from the database.</span>
                <Link href={FIND_COFOUNDER} className="font-semibold text-gold-light underline underline-offset-4">Run this search live →</Link>
              </figcaption>
            </figure>
          )}
        </div>
      </section>

      {/* 4. Two ways to build */}
      <section className="mx-auto max-w-7xl px-4 py-14" aria-labelledby="flows-h">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">How it works</p>
        <h2 id="flows-h" className="mt-2 text-3xl font-bold text-navy">One network. Two ways to build.</h2>
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_auto_1fr]">
          <Flow title="Founder → Expertise" tone="teal" cta={{ href: '/match?mode=people', label: 'Find Your People' }}
            steps={[
              { h: 'Founder names a need', d: 'Elena needs an alumni cofounder with wearable hardware experience.' },
              { h: 'GT Swarm finds qualified people', d: dana && danaBuilt ? `${dana.name} ranks first: she built ${danaBuilt.name} and is open to cofounding.` : 'Ranked on what people have built.' },
              { h: 'Founder sends an invitation', d: 'The reason travels with the invite. Dana can accept or decline.' },
            ]} />
          <div className="flex items-center justify-center" aria-hidden="true">
            <div className="flex flex-row items-center gap-2 lg:flex-col">
              <span className="h-px w-10 bg-navy/20 lg:h-10 lg:w-px" />
              <span className="rounded-full border border-navy/15 bg-white px-3 py-2 text-center text-[11px] font-semibold leading-tight text-navy shadow-sm">Same<br />inbox</span>
              <span className="h-px w-10 bg-navy/20 lg:h-10 lg:w-px" />
            </div>
          </div>
          <Flow title="Builder → Opportunity" tone="plum" cta={{ href: '/match?mode=startups', label: 'Find Your Startup' }}
            steps={[
              { h: 'Builder creates a profile', d: maya && mayaBuilt ? `${maya.name}, a student, starts from her resume: ${mayaBuilt.name} (${mayaBuilt.year}).` : 'Starts from a resume.' },
              { h: 'GT Swarm recommends startups', d: restwell ? `${restwell.name} is recommended: it needs the BLE firmware experience she already has.` : 'Startups that need her skills.' },
              { h: 'Builder requests to connect', d: 'Elena sees the request with the reason and decides.' },
            ]} />
        </div>
        <p className="mt-6 text-center text-sm text-ink/65">
          Nothing happens until the other person says yes. Stuck on a specific problem instead? <Link href="/stuck" className="font-semibold text-navy underline decoration-gold underline-offset-4">Get Unstuck</Link> finds who can help, based on their record and experience, and how you're connected to them.
        </p>
      </section>

      {/* 5. Feasibility */}
      <section className="bg-navy-900 text-white" aria-labelledby="plan-h">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Implementation plan</p>
          <h2 id="plan-h" className="mt-2 text-3xl font-bold">Built for Georgia Tech. Designed to grow.</h2>
          <p className="mt-2 max-w-2xl text-white/70">The Student Government Association runs it as a one-semester, opt-in pilot. Existing programs bring the people. It needs no university records and no new university systems to start.</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="How GT Swarm fits existing programs (proposed)">
            {PROGRAMS.map((p) => (
              <li key={p.name} className="rounded-xl border border-gold/30 bg-gold/[0.07] p-4">
                <p className="font-display font-bold text-gold-light">{p.name}</p>
                <p className="mt-1 text-sm text-white/75">{p.adds}</p>
              </li>
            ))}
          </ul>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {PHASES.map((p) => (
              <li key={p.n} className="relative rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold font-display font-bold text-navy-900">{p.n}</span>
                  <div>
                    <h3 className="font-display font-bold">{p.title}</h3>
                    <p className="text-[11px] uppercase tracking-wide text-white/45">{p.when}</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-white/75">{p.items.map((x) => <li key={x} className="flex gap-2"><span className="text-gold" aria-hidden="true">·</span>{x}</li>)}</ul>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-white/50">{PROPOSED_NOTE}</p>
            <Link href="/pilot" className="btn-gold" data-testid="pilot-link">See the full SGA pilot plan →</Link>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl bg-white p-5 text-ink">
              <h3 className="font-display font-bold text-navy">Privacy by design</h3>
              <ul className="mt-3 space-y-2 text-sm">{PRIVACY.map((x) => <li key={x} className="flex gap-2"><span className="font-bold text-teal" aria-hidden="true">✓</span>{x}</li>)}</ul>
            </div>
            <div className="rounded-xl bg-white p-5 text-ink" data-testid="built-today">
              <h3 className="font-display font-bold text-navy">Working in this demo</h3>
              <ul className="mt-3 space-y-2 text-sm">{REAL.map((x) => <li key={x} className="flex gap-2"><span className="font-bold text-teal" aria-hidden="true">✓</span>{x}</li>)}</ul>
            </div>
            <div className="rounded-xl bg-white p-5 text-ink" data-testid="simulated">
              <h3 className="font-display font-bold text-navy">Simulated for the demo</h3>
              <ul className="mt-3 space-y-2 text-sm">{SIMULATED.map((x) => <li key={x} className="flex gap-2"><span className="font-bold text-gold-dark" aria-hidden="true">○</span>{x}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Browse */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Browse</p>
            <h2 className="mt-1 text-2xl font-bold text-navy">Startups building now</h2>
            <p className="text-sm text-ink/60">No sign-up needed. Request to join any team that is recruiting.</p>
          </div>
          <Link href="/add" className="btn-ghost">Post your startup</Link>
        </div>
        <DiscoverBuilds builds={builds} viewerId={viewerId} />
      </div>
    </div>
  );
}

function Flow({ title, tone, steps, cta }: { title: string; tone: 'teal' | 'plum'; steps: { h: string; d: string }[]; cta: { href: string; label: string } }) {
  const dot = tone === 'teal' ? 'bg-teal' : 'bg-plum';
  return (
    <div className="card flex flex-col p-6">
      <h3 className={`font-display text-xl font-bold ${tone === 'teal' ? 'text-teal' : 'text-plum'}`}>{title}</h3>
      <ol className="mt-4 flex-1 space-y-4">
        {steps.map((s, i) => (
          <li key={s.h} className="relative flex gap-3">
            <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${dot}`}>{i + 1}</span>
            {i < steps.length - 1 && <span className="absolute left-[13px] top-7 h-[calc(100%-4px)] w-px bg-navy/15" aria-hidden="true" />}
            <div>
              <p className="font-semibold text-navy">{s.h}</p>
              <p className="text-sm text-ink/70">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link href={cta.href} className="btn-primary mt-5 self-start">{cta.label} →</Link>
    </div>
  );
}
