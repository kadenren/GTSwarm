import Link from 'next/link';
import SwarmBackground from '@/components/SwarmBackground';
import { snapshot } from '@/lib/data';

export default function Home() {
  const s = snapshot();
  const stats = [
    { n: s.projects.length, l: 'projects mapped' },
    { n: s.people.filter((p) => p.claimed).length, l: 'builders claimed' },
    { n: s.problems.length, l: 'solved problems' },
    { n: s.projects.filter((p) => p.continued_from).length, l: 'project handoffs' },
  ];
  return (
    <div className="relative overflow-hidden">
      <SwarmBackground />
      <section className="relative mx-auto max-w-5xl px-4 pb-16 pt-20 text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold-dark">GT Swarm</p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight text-navy sm:text-5xl">
          Whatever you&apos;re building, someone at GT has the expertise.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink/70">
          GT Swarm maps every capstone, VIP team, CREATE-X startup, lab and club as a graph of people, projects, skills and
          solved problems, so students and alumni can find the right person at every step of building.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link href="/search" className="group card p-6 text-left transition hover:-translate-y-0.5 hover:border-gold hover:shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-wide text-gold-dark">Find expertise</span>
            <h2 className="mt-2 text-2xl font-bold text-navy">Find a cofounder, advisor or early engineer</h2>
            <p className="mt-2 text-sm text-ink/70">
              Search a skill, pick a role, and see who has actually built it, ranked by match and by how you are connected.
            </p>
            <span className="mt-4 inline-block font-semibold text-navy group-hover:text-gold-dark">Search the swarm →</span>
          </Link>
          <Link href="/stuck" className="group card p-6 text-left transition hover:-translate-y-0.5 hover:border-gold hover:shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-wide text-gold-dark">Get unstuck</span>
            <h2 className="mt-2 text-2xl font-bold text-navy">I&apos;m stuck on a problem</h2>
            <p className="mt-2 text-sm text-ink/70">
              Describe the bug or blocker, paste a log, and find the Yellow Jackets who already solved something like it.
            </p>
            <span className="mt-4 inline-block font-semibold text-navy group-hover:text-gold-dark">Find who solved it →</span>
          </Link>
        </div>
        <dl className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((x) => (
            <div key={x.l} className="rounded-xl bg-white/70 px-3 py-4 backdrop-blur">
              <dt className="sr-only">{x.l}</dt>
              <dd className="font-display text-3xl font-bold text-navy">{x.n}</dd>
              <dd className="text-xs text-ink/60">{x.l}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-10 text-sm text-ink/60">
          Students to alumni, alumni to alumni, alumni to students, students to students: every direction counts.
        </p>
      </section>
    </div>
  );
}
