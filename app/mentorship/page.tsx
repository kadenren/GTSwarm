import Link from 'next/link';
import PageHero from '@/components/PageHero';
import MentorRequest from '@/components/MentorRequest';
import MentorSettings from '@/components/MentorSettings';
import ActionButton from '@/components/ActionButton';
import { getViewerId } from '@/lib/viewer';
import { membershipOf, can, isVerifiedAlum } from '@/lib/access';
import { mentors, recommendMentors, mentorshipsOf, myMentorProfile, MENTOR_TOPICS, type MentorView } from '@/lib/community';

export const dynamic = 'force-dynamic';

/** Mentorship: find opted-in mentors (ranked and explained), request with a note, manage relationships, or offer mentoring. */
export default async function MentorshipPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const viewerId = await getViewerId();
  const topic = (await searchParams).topic;
  const m = membershipOf(viewerId);
  const recs = await recommendMentors(viewerId, 3);
  const validTopic = topic && (MENTOR_TOPICS as readonly string[]).includes(topic) ? topic : undefined;
  const all = mentors(viewerId, { topic: validTopic, includeFull: true });
  const mine = mentorshipsOf(viewerId);
  const pendingWith = new Set(mine.filter((x) => !x.iAmMentor && (x.status === 'requested' || x.status === 'active')).map((x) => x.mentor_id));
  const canOffer = can(viewerId, 'mentorship.offer');

  const card = (x: MentorView, why?: string) => {
    const open = x.accepting && x.active < x.capacity;
    return (
      <li key={x.id} className="card flex flex-col p-5" data-testid="mentor-card">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-bold text-navy">{x.name} <span className="text-sm font-medium text-ink/55">{x.label}</span></h3>
            <p className="text-sm text-ink/65">{x.currentRole ?? x.major}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${open ? 'bg-teal-light text-teal' : 'bg-navy/5 text-ink/50'}`}>
            {!x.accepting ? 'Not accepting' : open ? `${x.capacity - x.active} spot${x.capacity - x.active === 1 ? '' : 's'} open` : 'Full right now'}
          </span>
        </div>
        {why && <p className="mt-2 text-sm text-navy" data-testid="mentor-why">{why}</p>}
        <div className="mt-2 flex flex-wrap gap-1">{x.topics.map((t) => <span key={t} className="tag">{t}</span>)}</div>
        {x.note && <p className="mt-2 text-xs text-ink/65">“{x.note}”</p>}
        <p className="mt-1 text-[11px] text-ink/50">Mentors {x.mentees.join(' and ')} · {x.contact}</p>
        <div className="mt-auto pt-3">
          {pendingWith.has(x.id) ? <span className="text-sm font-medium text-teal">Request sent or mentorship active</span>
            : open ? <MentorRequest mentorId={x.id} firstName={x.name.split(' ')[0]} topics={x.topics} /> : null}
        </div>
      </li>
    );
  };

  return (
    <>
      <PageHero eyebrow="Mentorship" title="Learn from Yellow Jackets who have done it."
        subtitle="Alumni opt in with the topics they help with and how many mentees they can take. Matches use the same experience-based engine as the rest of GT Swarm, and nothing starts without the mentor's yes." />
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10">
        {mine.length > 0 && (
          <section aria-label="Your mentorships">
            <h2 className="text-xl font-bold text-navy">Your mentorships</h2>
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {mine.map((x) => (
                <li key={x.id} className="card flex items-center justify-between gap-3 p-4" data-testid="my-mentorship" data-status={x.status}>
                  <div>
                    <p className="font-semibold text-navy">{x.iAmMentor ? `Mentoring ${x.menteeName}` : `Mentored by ${x.mentorName}`}</p>
                    <p className="text-xs text-ink/60">{x.topic} · {x.status === 'requested' ? (x.iAmMentor ? 'waiting for your answer in Inbox' : 'waiting for their answer') : x.status}</p>
                  </div>
                  {x.status === 'active' && <ActionButton endpoint={`/api/mentorship/${encodeURIComponent(x.id)}`} body={{ action: 'end' }} label="End" className="btn-ghost px-3 py-1 text-xs" />}
                </li>
              ))}
            </ul>
          </section>
        )}

        {recs.length > 0 && (
          <section aria-label="Recommended mentors" data-tour="mentor-recs">
            <h2 className="text-xl font-bold text-navy">Recommended for you</h2>
            <p className="text-sm text-ink/60">Ranked by how their documented work and mentoring topics match your skills, projects and goals.</p>
            <ul className="mt-4 grid gap-4 md:grid-cols-3">{recs.map((r) => card(r.mentor, r.why))}</ul>
          </section>
        )}

        <section aria-label="All mentors">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-xl font-bold text-navy">All mentors{validTopic ? `: ${validTopic}` : ''}</h2>
            <nav className="flex flex-wrap gap-1.5" aria-label="Filter by topic">
              <Link href="/mentorship" className={`chip text-xs ${!validTopic ? 'border-navy bg-navy text-white' : 'border-navy/20 bg-white text-navy'}`}>All</Link>
              {MENTOR_TOPICS.map((t) => <Link key={t} href={`/mentorship?topic=${encodeURIComponent(t)}`} className={`chip text-xs ${validTopic === t ? 'border-navy bg-navy text-white' : 'border-navy/20 bg-white text-navy'}`}>{t}</Link>)}
            </nav>
          </div>
          {all.length ? <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{all.map((x) => card(x))}</ul>
            : <p className="card mt-4 p-8 text-center text-sm text-ink/60">No mentors offer this topic to {isVerifiedAlum(m.status) ? 'alumni' : 'students'} yet.</p>}
        </section>

        {canOffer ? <MentorSettings initial={myMentorProfile(viewerId)} topics={MENTOR_TOPICS} /> : (
          <p className="rounded-xl bg-paper px-4 py-3 text-sm text-ink/70">Offering mentorship opens to verified alumni. {m.status === 'ALUMNI_PENDING_VERIFICATION' ? 'Yours is pending verification.' : 'Students can request mentorship from any mentor above.'}</p>
        )}
        <p className="text-xs text-ink/50">All mentors and mentorships shown are fictional demo records.</p>
      </div>
    </>
  );
}
