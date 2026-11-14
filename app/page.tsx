import Link from 'next/link';
import DiscoverBuilds from '@/components/DiscoverBuilds';
import DemoButton from '@/components/DemoButton';
import { getViewerId } from '@/lib/viewer';
import { HeroPattern } from '@/components/PageHero';
import { listBuilds } from '@/lib/builds';
import { snapshot } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** The three things GT Swarm does. Each card opens the page that does it. */
const WAYS = [
  { key: 'team', title: 'Build your team', href: '/match', cta: 'Find people',
    body: 'Find a cofounder, engineer or advisor who has already built what you need.' },
  { key: 'stuck', title: 'Get unstuck', href: '/stuck', cta: 'Describe a problem',
    body: 'Find the student or alum who already solved the problem you are stuck on.' },
  { key: 'join', title: 'Join a startup', href: '/match?mode=startups', cta: 'Find startups',
    body: 'See the GT startups that need the skills you already have.' },
] as const;

/** Discover: the homepage. What GT Swarm is for, then what Yellow Jackets are building. */
export default async function Discover() {
  const viewerId = await getViewerId(); // also loads this visitor's demo session
  const builds = listBuilds();
  const s = snapshot();
  const openRoles = builds.filter((b) => b.open).reduce((n, b) => n + b.rolesNeeded.length, 0);
  const builders = s.people.filter((p) => p.claimed).length;

  return (
    <div>
      <section className="relative overflow-hidden bg-navy text-white">
        <HeroPattern opacity={0.1} />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Georgia Tech&apos;s builder network</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
            Connect with the Yellow Jacket who <span className="text-gold">can help</span>.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/75">
            Students and alumni opt in with what they have built. GT Swarm matches them to the teammates, startups and answers they need.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <DemoButton variant="hero" />
            <Link href="/match" className="btn border border-gold/70 px-6 py-3 text-base text-gold hover:bg-gold/10" data-testid="find-match-cta">Find Your Match</Link>
          </div>
          <dl className="mt-9 flex flex-wrap gap-x-10 gap-y-3" data-tour="stats">
            {[[builders, 'students and alumni'], [builds.length, 'startups and projects'], [openRoles, 'open roles'], [s.problems.length, 'solved problems']].map(([n, l]) => (
              <div key={l as string}>
                <dd className="font-display text-3xl font-bold">{n}</dd>
                <dt className="text-xs uppercase tracking-wide text-white/55">{l}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-10 max-w-7xl px-4" aria-label="What GT Swarm does" data-tour="ways">
        <ul className="grid gap-4 md:grid-cols-3">
          {WAYS.map((w, i) => (
            <li key={w.key}>
              <Link href={w.href} className="card group flex h-full flex-col p-5 shadow-md transition hover:border-gold" data-testid={`way-${w.key}`}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold font-display text-sm font-bold text-navy-900">{i + 1}</span>
                <h2 className="mt-3 text-lg font-bold text-navy">{w.title}</h2>
                <p className="mt-1 flex-1 text-sm text-ink/70">{w.body}</p>
                <span className="mt-3 text-sm font-semibold text-navy group-hover:text-gold-dark">{w.cta} <span aria-hidden="true">→</span></span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-center text-xs text-ink/55">Opt-in profiles only, nothing scraped. Every match shows why, and no one is contacted without a request they can decline.</p>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-2xl font-bold text-navy">Startups building now</h2>
          <Link href="/add" className="btn-ghost">Post your startup</Link>
        </div>
        <DiscoverBuilds builds={builds} viewerId={viewerId} />
      </div>
    </div>
  );
}
