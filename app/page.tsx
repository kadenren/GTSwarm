import Link from 'next/link';
import DiscoverBuilds from '@/components/DiscoverBuilds';
import DemoButton from '@/components/DemoButton';
import PersonaPicker from '@/components/PersonaPicker';
import { getViewerId } from '@/lib/viewer';
import { HeroPattern } from '@/components/PageHero';
import { listBuilds } from '@/lib/builds';
import { snapshot } from '@/lib/data';

export const dynamic = 'force-dynamic';

const SECURITY_Q = 'Hospital IT security review stalled our pilot';

const WAYS = [
  {
    key: 'team', title: 'Build your team', accent: 'bg-teal', href: '/match',
    body: 'Find a cofounder, an engineer or an advisor who has already built what you need.',
    example: 'Alumni cofounder for a medical wearable', who: 'Alum → alum · alum → student',
    icon: <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5m-.6-4.6c.9-.3 1.9-.4 3.1-.4 2.7 0 4.9 2 5.5 5" />,
  },
  {
    key: 'join', title: 'Join a startup', accent: 'bg-plum', href: '/match?mode=startups',
    body: 'Students and alumni see the startups that need the skills they already have. Your profile is the search.',
    example: 'Restwell needs BLE firmware, and Maya has built it', who: 'Student → alum founder',
    icon: <path d="M4 9h16v10H4zM9 9V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V9M4 13h16" />,
  },
  {
    key: 'stuck', title: 'Get unstuck', accent: 'bg-gold', href: `/stuck?q=${encodeURIComponent(SECURITY_Q)}`,
    body: 'Hit a wall? Describe it. GT Swarm finds the student or alum who already solved it, technical or business.',
    example: SECURITY_Q, who: 'Anyone → whoever solved it',
    icon: <path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3Zm-2.5 16h5M10.5 21h3" />,
  },
] as const;

const TRUST = [
  { t: 'Opt-in only', d: 'Profiles come from what people upload or confirm. Nothing is scraped.' },
  { t: 'Every match explains itself', d: 'You see the project, the solved problem and the score behind each match.' },
  { t: 'Nothing happens without a yes', d: 'Invites and requests can be declined. Accepting never adds anyone to a team.' },
  { t: 'Fits how GT already works', d: 'Alumni join from an Alumni Association invite; CREATE-X and VIP teams post their projects.' },
];

/** Discover: the homepage. Three ways the network helps, then what Yellow Jackets are building. */
export default async function Discover() {
  const viewerId = await getViewerId(); // also loads this visitor's demo session
  const builds = listBuilds();
  const s = snapshot();
  const open = builds.filter((b) => b.open);
  const openRoles = open.reduce((n, b) => n + b.rolesNeeded.length, 0);
  const builders = s.people.filter((p) => p.claimed).length;

  // the hero example is a real record: a solved problem and the person who solved it
  const example = s.problems.find((p) => p.description.startsWith('Bluetooth Low Energy connection drops'));
  const solver = example && s.people.find((p) => p.id === example.solved_by);
  const exProject = example && s.projects.find((p) => p.id === example.project_id);

  return (
    <div>
      <section className="relative overflow-hidden bg-navy text-white">
        <HeroPattern opacity={0.1} />
        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-12">
          <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Georgia Tech&apos;s builder network</p>
              <h1 className="mt-3 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
                Whatever you&apos;re building, a Yellow Jacket has <span className="text-gold">done it before</span>.
              </h1>
              <p className="mt-4 max-w-xl text-lg text-white/75">
                GT Swarm matches students and alumni on what they have actually built. Find a cofounder, a startup to join, or the person who already solved the problem you&apos;re stuck on.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <DemoButton variant="hero" />
                <Link href="/match" className="btn border border-gold/70 px-6 py-3 text-base text-gold hover:bg-gold/10" data-testid="find-match-cta">Find Your Match</Link>
                <Link href="/stuck" className="btn border border-white/30 px-5 py-3 text-base text-white hover:border-white">Get Unstuck</Link>
              </div>
            </div>

            {example && solver && exProject && (
              <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-sm" aria-label="Example: a problem matched to who solved it">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-light">A real match from the network</p>
                <div className="mt-3 rounded-xl bg-white/10 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">A founder is stuck on</p>
                  <p className="mt-1 font-display font-semibold">&ldquo;Our wearable drops Bluetooth when the chip sleeps&rdquo;</p>
                </div>
                <div className="my-2 flex justify-center" aria-hidden="true">
                  <svg width="20" height="26" viewBox="0 0 20 26"><path d="M10 1v22m-6-6 6 6 6-6" stroke="#B3A369" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div className="flex gap-3 rounded-xl bg-white p-3.5 text-ink">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal text-sm font-bold text-white ring-2 ring-gold">{solver.name.split(' ').map((w) => w[0]).join('')}</span>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-navy">{solver.name} <span className="text-sm font-medium text-ink/55">alum &apos;{String(solver.grad_year).slice(2)}</span></p>
                    <p className="text-sm text-ink/75">Solved this exact bug on <strong className="text-navy">{exProject.name}</strong> ({exProject.year}). Open to helping, {solver.availability_hours} hrs a month.</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-white/55">Not a job board. Matched on the problem, with the fix on record.</p>
              </div>
            )}
          </div>

          <dl className="mt-10 grid max-w-3xl grid-cols-2 gap-x-10 gap-y-4 sm:grid-cols-4" data-tour="stats">
            {[[builds.length, 'startups and projects'], [openRoles, 'open roles'], [s.problems.length, 'solved problems on record'], [builders, 'students and alumni opted in']].map(([n, l]) => (
              <div key={l as string} className="border-l-2 border-gold/60 pl-3">
                <dd className="font-display text-3xl font-bold">{n}</dd>
                <dt className="text-xs uppercase tracking-wide text-white/55">{l}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* three ways in */}
      <section className="relative z-10 mx-auto -mt-14 max-w-7xl px-4" aria-label="Three ways GT Swarm connects you" data-tour="ways">
        <ul className="grid gap-4 md:grid-cols-3">
          {WAYS.map((w) => (
            <li key={w.key}>
              <Link href={w.href} className="card group flex h-full flex-col overflow-hidden shadow-lg transition hover:-translate-y-0.5 hover:border-gold hover:shadow-xl" data-testid={`way-${w.key}`}>
                <span className={`h-1.5 ${w.accent}`} aria-hidden="true" />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy/5 text-navy">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{w.icon}</svg>
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-navy">{w.title}</h2>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-dark">{w.who}</p>
                    </div>
                  </div>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/70">{w.body}</p>
                  <p className="mt-4 rounded-lg bg-paper px-3 py-2 text-xs text-ink/70"><span className="font-semibold text-navy">e.g. </span>{w.example}</p>
                  <span className="mt-3 text-sm font-semibold text-navy group-hover:text-gold-dark">Try it <span aria-hidden="true">→</span></span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* trust */}
      <section className="mx-auto max-w-7xl px-4 pt-10" aria-label="Privacy and consent">
        <div className="grid gap-x-8 gap-y-4 rounded-2xl border border-navy/10 bg-white px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((x) => (
            <div key={x.t} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-light text-teal" aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <div>
                <h3 className="text-sm font-bold text-navy">{x.t}</h3>
                <p className="text-xs leading-relaxed text-ink/65">{x.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Discover</p>
            <h2 className="mt-1 text-2xl font-bold text-navy">What Yellow Jackets are building now</h2>
          </div>
          <Link href="/add" className="btn-ghost">Post your startup</Link>
        </div>
        <DiscoverBuilds builds={builds} />
      </div>

      <section className="bg-navy-900">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <PersonaPicker current={viewerId} />
        </div>
      </section>
    </div>
  );
}
