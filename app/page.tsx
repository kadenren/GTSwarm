import Link from 'next/link';
import DemoButton from '@/components/DemoButton';
import { HeroPattern } from '@/components/PageHero';
import { getViewerId } from '@/lib/viewer';
import { snapshot } from '@/lib/data';
import { getDb } from '@/lib/db';
import { recommendMentors, recommendOpportunities, recommendGroups, recommendEvents } from '@/lib/community';
import { PROPOSED_NOTE } from '@/lib/pitch';

export const dynamic = 'force-dynamic';

/** Landing: what GT Swarm is (a lifelong GT network), the student-to-alum lifecycle, and live examples of intelligent discovery. */
export default async function Landing() {
  await getViewerId(); // loads this visitor's demo session
  const s = snapshot();
  const db = getDb();
  const id = (name: string) => s.people.find((p) => p.name === name)?.id ?? '';
  const count = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  const today = new Date().toISOString().slice(0, 10);

  // every example below is computed live from fictional demo records
  const [mentorFor] = await recommendMentors(id('Mei Ramirez'), 1);
  const [internship] = recommendOpportunities(id('Maya Okafor'), 1);
  const [group] = recommendGroups(id('Noah Bennett'), 1);
  const [event] = recommendEvents(id('Maya Okafor'), 1);
  const dana = s.person.get(id('Dana Whitfield'));
  const danaBuilt = dana ? (s.projectsOf.get(dana.id) ?? []).map((m) => s.project.get(m.project_id)!).find((p) => /sold|shipped/i.test(p.outcome ?? '')) : undefined;
  const ble = s.problems.find((p) => /Bluetooth Low Energy connection drops/.test(p.description));
  const bleBy = ble?.solved_by ? s.person.get(ble.solved_by) : undefined;

  const stats: [number, string][] = [
    [s.people.filter((p) => p.claimed).length, 'students and alumni'],
    [count('SELECT COUNT(*) n FROM mentor_profile WHERE accepting = 1'), 'mentors accepting requests'],
    [count(`SELECT COUNT(*) n FROM opportunity WHERE status = 'published' AND expires_at >= '${today}'`), 'open opportunities'],
    [count('SELECT COUNT(*) n FROM community_group'), 'groups'],
    [count('SELECT COUNT(*) n FROM community_event'), 'upcoming events'],
  ];

  const stages = [
    { stage: 'Student', who: 'Mei Ramirez, first-year CS', does: 'Finds a mentor, a first project team and student groups.' },
    { stage: 'Early career', who: 'Noah Bennett, alum ’24', does: 'Builds a professional network and joins alumni groups.' },
    { stage: 'Experienced alum', who: 'Samuel Grant, alum ’09', does: 'Mentors students and posts roles for the next class.' },
    { stage: 'Founder, mentor or collaborator', who: 'Elena Brooks, alum ’15', does: 'Finds an alumni cofounder and student engineers.' },
  ];

  const examples = [
    mentorFor && { tag: 'Student → alumni mentor', title: `Mei is matched with ${mentorFor.mentor.name}`, why: mentorFor.why },
    internship && { tag: 'Student → internship', title: `Maya is matched with ${internship.opportunity.title}`, why: internship.why },
    group && { tag: 'Alum → professional group', title: `Noah is matched with ${group.group.name}`, why: group.why },
    dana && danaBuilt && { tag: 'Alum → alumni cofounder', title: `Elena is matched with ${dana.name}`, why: `Dana built ${danaBuilt.name} (${danaBuilt.outcome}) and is open to cofounding.` },
    event && { tag: 'Member → event', title: `Maya is matched with ${event.event.title}`, why: event.why },
    ble && bleBy && { tag: 'Engineer → problem solver', title: `A founder stuck on Bluetooth finds ${bleBy.name}`, why: `${bleBy.name.split(' ')[0]} solved “${ble.description}” and the fix is on record.` },
  ].filter(Boolean) as { tag: string; title: string; why: string }[];

  return (
    <div>
      <section className="relative overflow-hidden bg-navy text-white">
        <HeroPattern opacity={0.1} />
        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-12 sm:pt-14">
          <p className="inline-flex flex-wrap items-center gap-x-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold-light">
            <span className="uppercase tracking-[0.16em] text-gold">Campus Solutions proposal</span>
            <span className="text-white/70">Designed for SGA to run with existing GT programs</span>
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-[3.6rem]">
            Your Georgia Tech network. <span className="text-gold">For life.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
            Discover the people, opportunities and expertise across generations of Yellow Jackets. Find mentors, internships, careers, collaborators and communities intelligently matched to you.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/home" className="btn-gold px-6 py-3 text-base" data-testid="explore-network">Explore Your Network</Link>
            <Link href="/opportunities" className="btn border border-gold/70 px-6 py-3 text-base text-gold hover:bg-gold/10">Find Opportunities</Link>
            <Link href="/join" className="btn border border-white/30 px-5 py-3 text-base text-white hover:border-white">Join GT Swarm</Link>
            <DemoButton variant="hero" />
          </div>
          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-3" data-tour="stats">
            {stats.map(([n, l]) => (
              <div key={l}><dd className="font-display text-3xl font-bold">{n}</dd><dt className="text-xs uppercase tracking-wide text-white/55">{l}</dt></div>
            ))}
          </dl>
          <p className="mt-2 text-[11px] text-white/45">Fictional demo data, not live users.</p>
        </div>
      </section>

      {/* lifecycle */}
      <section className="mx-auto max-w-7xl px-4 py-14" aria-labelledby="life-h" data-tour="lifecycle">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">One profile for life</p>
        <h2 id="life-h" className="mt-2 max-w-3xl text-3xl font-bold text-navy">Your network shouldn’t end at graduation. It should grow with you.</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {stages.map((x, i) => (
            <li key={x.stage} className="relative">
              <div className="card h-full p-5">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full font-display font-bold text-white ${i === 0 ? 'bg-plum' : 'bg-teal'}`}>{i + 1}</span>
                <h3 className="mt-3 font-display text-lg font-bold text-navy">{x.stage}</h3>
                <p className="text-xs font-semibold text-gold-dark">{x.who}</p>
                <p className="mt-1 text-sm text-ink/70">{x.does}</p>
              </div>
              {i < stages.length - 1 && <span className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-2xl text-gold md:block" aria-hidden="true">→</span>}
            </li>
          ))}
        </ol>
        <p className="mt-6 rounded-xl border-l-4 border-gold bg-white px-5 py-4 text-ink/80 shadow-sm">
          <strong className="text-navy">The same profile, projects, connections and communities carry through every stage.</strong> When graduation is verified by an authorized source, a student becomes a verified alum without rebuilding anything, and alumni groups, events and posting privileges open up.
        </p>
      </section>

      {/* intelligent discovery */}
      <section className="border-y border-navy/10 bg-white" aria-labelledby="disc-h">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Intelligent discovery</p>
          <h2 id="disc-h" className="mt-2 text-3xl font-bold text-navy">The right people. The right opportunities. At every stage.</h2>
          <p className="mt-2 max-w-2xl text-ink/70">Matched on demonstrated experience, interests, eligibility and availability, not just a shared school. Each example below is computed live from the demo records, with the reason the engine gives.</p>
          <ul className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="discovery-examples">
            {examples.map((x) => (
              <li key={x.tag} className="rounded-xl border border-navy/10 bg-paper p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-dark">{x.tag}</p>
                <p className="mt-1 font-display text-lg font-bold text-navy">{x.title}</p>
                <p className="mt-1 text-sm text-ink/75">{x.why}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link href="/match#how" className="font-semibold text-navy underline decoration-gold underline-offset-4">How the matching works →</Link>
            <Link href="/startups" className="font-semibold text-navy underline decoration-gold underline-offset-4">Startups and cofounder matching →</Link>
          </div>
        </div>
      </section>

      {/* trust and implementation */}
      <section className="bg-navy-900 text-white" aria-labelledby="trust-h">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Built on consent</p>
            <h2 id="trust-h" className="mt-2 text-3xl font-bold">Verified where it matters. Private by default.</h2>
            <ul className="mt-5 space-y-2 text-sm text-white/80">
              {['Opt-in profiles; members choose what is visible, and contact details are never shown', 'Students, verified alumni and administrators get different access, enforced on the server', 'Graduation is verified by an authorized source, never by a member clicking “I graduated”', 'Every connection, mentorship and group request can be declined', 'No scraping and no assumed access to university records'].map((x) => (
                <li key={x} className="flex gap-2"><span className="font-bold text-gold" aria-hidden="true">✓</span>{x}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <h3 className="font-display text-xl font-bold">A realistic pilot</h3>
            <p className="mt-2 text-sm text-white/75">SGA runs a one-semester opt-in pilot with students, interested alumni, mentors, student organizations and founders. Possible collaborators include the Alumni Association, Career Center, CREATE-X and the College of Lifetime Learning.</p>
            <p className="mt-2 text-xs text-white/50">{PROPOSED_NOTE} Alumni verification and Georgia Tech sign-in are simulated in this demo.</p>
            <Link href="/pilot" className="btn-gold mt-4">See the pilot plan →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
