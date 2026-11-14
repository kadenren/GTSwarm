import Link from 'next/link';
import DiscoverBuilds from '@/components/DiscoverBuilds';
import DemoButton from '@/components/DemoButton';
import PersonaPicker from '@/components/PersonaPicker';
import { getViewerId } from '@/lib/viewer';
import { HeroPattern } from '@/components/PageHero';
import { listBuilds } from '@/lib/builds';

export const dynamic = 'force-dynamic';

/** Discover: the homepage. Browse what Yellow Jackets are building, no commitment needed. */
export default async function Discover() {
  const viewerId = await getViewerId(); // also loads this visitor's demo session
  const builds = listBuilds();
  const open = builds.filter((b) => b.open);
  const alumni = builds.filter((b) => b.owner?.type === 'alum').length;
  const openRoles = open.reduce((n, b) => n + b.rolesNeeded.length, 0);
  return (
    <div>
      <section className="relative overflow-hidden bg-navy text-white">
        <HeroPattern opacity={0.1} />
        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Discover</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
            Discover what <span className="text-gold">Yellow Jackets</span> are building.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/75">
            Explore startups, discover founders, and find opportunities across Georgia Tech&apos;s innovation network.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <DemoButton variant="hero" />
            <Link href="/match" className="btn border border-gold/70 px-6 py-3 text-base text-gold hover:bg-gold/10" data-testid="find-match-cta">Find Your Match</Link>
            <Link href="/add" className="btn border border-white/30 px-5 py-3 text-white hover:border-white">Post your startup</Link>
          </div>
          <dl className="mt-9 flex flex-wrap gap-x-10 gap-y-3">
            {[[builds.length, 'active startups and projects'], [alumni, 'alumni-founded'], [builds.length - alumni, 'student-founded'], [openRoles, 'open roles']].map(([n, l]) => (
              <div key={l as string}>
                <dd className="font-display text-3xl font-bold">{n}</dd>
                <dt className="text-xs uppercase tracking-wide text-white/50">{l}</dt>
              </div>
            ))}
          </dl>
          <PersonaPicker current={viewerId} />
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-10">
        <DiscoverBuilds builds={builds} />
      </div>
    </div>
  );
}
