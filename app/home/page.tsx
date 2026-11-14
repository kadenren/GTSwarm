import Link from 'next/link';
import { getViewerId } from '@/lib/viewer';
import { snapshot } from '@/lib/data';
import { getDb } from '@/lib/db';
import { membershipOf, isVerifiedAlum } from '@/lib/access';
import { recommendMentors, recommendOpportunities, recommendEvents, recommendGroups, memberProfileText, mentorshipsOf, alreadyKnown, personReason } from '@/lib/community';
import { recommendBuilds } from '@/lib/matching';
import { rankForExpertise } from '@/lib/graph/rank';
import { RELEVANT_TEXT_MATCH } from '@/lib/searchApi';
import MemberBadge from '@/components/MemberBadge';
import { HeroPattern } from '@/components/PageHero';

export const dynamic = 'force-dynamic';

const fmtDate = (iso: string, tz: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tz, timeZoneName: 'short' });

function Section({ title, href, cta, children, testId }: { title: string; href: string; cta: string; children: React.ReactNode; testId?: string }) {
  return (
    <section className="card flex flex-col p-5" data-testid={testId}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-navy">{title}</h2>
        <Link href={href} className="text-xs font-semibold text-navy underline decoration-gold underline-offset-4">{cta}</Link>
      </div>
      <ul className="mt-3 flex-1 space-y-3">{children}</ul>
    </section>
  );
}
const Item = ({ title, sub, why, href }: { title: string; sub?: string; why: string; href: string }) => (
  <li>
    <Link href={href} className="block rounded-lg p-2 transition hover:bg-paper">
      <p className="font-semibold text-navy">{title}{sub && <span className="ml-1.5 text-xs font-normal text-ink/55">{sub}</span>}</p>
      <p className="text-xs text-ink/70">{why}</p>
    </Link>
  </li>
);
const Empty = ({ text }: { text: string }) => <li className="text-sm text-ink/55">{text}</li>;

/** Home: a personalized dashboard that changes with the member's stage (student, pending, verified alum). */
export default async function HomeDashboard() {
  const viewerId = await getViewerId();
  const s = snapshot();
  const me = s.person.get(viewerId)!;
  const m = membershipOf(viewerId);
  const alum = isVerifiedAlum(m.status);
  const { text } = memberProfileText(viewerId);
  const db = getDb();

  const [mentorRecs, peopleOut, builds] = await Promise.all([
    alum ? Promise.resolve([]) : recommendMentors(viewerId, 3),
    rankForExpertise(text.slice(0, 1200) || me.bio, alum ? 'Cofounder' : 'Advisor', viewerId, 'alumni', { ai: false }),
    recommendBuilds({ viewerId, personId: viewerId, requireRoles: true, roles: alum ? ['Advisor', 'Cofounder'] : undefined, limit: 3 }),
  ]);
  const known = alreadyKnown(viewerId);
  // new people only (not teammates or existing connections), best documented matches first
  const fresh = peopleOut.results.filter((r) => !known.has(r.personId));
  const people = (fresh.some((r) => r.components.E >= RELEVANT_TEXT_MATCH) ? fresh.filter((r) => r.components.E >= RELEVANT_TEXT_MATCH * 0.6) : fresh).slice(0, 3);
  const opps = recommendOpportunities(viewerId, 3);
  const events = recommendEvents(viewerId, 3);
  const groups = recommendGroups(viewerId, 3);
  const waitingOnMe = mentorshipsOf(viewerId).filter((x) => x.iAmMentor && x.status === 'requested');
  const requestsToMe = (db.prepare("SELECT COUNT(*) n FROM requests WHERE to_person = ? AND status = 'sent'").get(viewerId) as { n: number }).n;
  const upcoming = (db.prepare("SELECT e.id, e.title, e.starts_at, e.timezone FROM event_rsvp r JOIN community_event e ON e.id = r.event_id WHERE r.person_id = ? AND r.status = 'going' ORDER BY e.starts_at LIMIT 3").all(viewerId)) as { id: string; title: string; starts_at: string; timezone: string }[];
  const graduatingSoon = m.status === 'CURRENT_STUDENT' && !!m.expectedGraduation && m.expectedGraduation <= `${new Date().getFullYear()}-12`;

  return (
    <div>
      <section className="relative overflow-hidden bg-navy text-white">
        <HeroPattern opacity={0.08} />
        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-9">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Home</p>
            <MemberBadge status={m.status} />
          </div>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Welcome back, {me.name.split(' ')[0]}.</h1>
          <p className="mt-2 max-w-2xl text-white/75">
            {alum ? 'Professional peers, alumni with complementary experience, opportunities and alumni events, picked from your record.' : 'Mentors, internships, alumni, groups and events picked from your skills, projects and goals.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            {requestsToMe + waitingOnMe.length > 0 && <Link href="/inbox" className="rounded-full bg-gold px-3 py-1 font-semibold text-navy-900">{requestsToMe + waitingOnMe.length} waiting in your inbox</Link>}
            {upcoming.map((u) => <Link key={u.id} href="/events" className="rounded-full border border-white/25 px-3 py-1 text-white/85">Going: {u.title} · {fmtDate(u.starts_at, u.timezone)}</Link>)}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {m.status === 'ALUMNI_PENDING_VERIFICATION' && (
          <p className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="pending-banner">
            Your alumni verification is pending. You keep everything you had as a student; alumni-only groups and events open once an authorized reviewer verifies your graduation. <Link href="/profile" className="font-semibold underline">See status</Link>
          </p>
        )}
        {graduatingSoon && (
          <p className="mb-6 rounded-xl border border-gold/50 bg-gold/10 px-4 py-3 text-sm text-navy" data-testid="graduating-banner">
            You graduate soon. Your profile, projects and connections continue after graduation. <Link href="/profile#lifecycle" className="font-semibold underline">See how your network carries over</Link>
          </p>
        )}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" data-tour="dashboard">
          {!alum && (
            <Section title="Recommended mentors" href="/mentorship" cta="All mentors" testId="dash-mentors">
              {mentorRecs.length ? mentorRecs.map((r) => <Item key={r.mentor.id} title={r.mentor.name} sub={r.mentor.label} why={r.why} href="/mentorship" />) : <Empty text="No mentors with open capacity match yet." />}
            </Section>
          )}
          {alum && (
            <Section title="Mentorship" href="/mentorship" cta="Mentorship" testId="dash-mentoring">
              {waitingOnMe.length ? waitingOnMe.map((x) => <Item key={x.id} title={`${x.menteeName} asked for mentorship`} why={`${x.topic}: “${x.message.slice(0, 90)}”`} href="/inbox" />) : <Empty text="No requests waiting. Offer mentorship from the Mentorship page." />}
            </Section>
          )}
          <Section title={alum ? 'Opportunities for you' : 'Internships for you'} href="/opportunities" cta="All opportunities" testId="dash-opportunities">
            {opps.length ? opps.map((r) => <Item key={r.opportunity.id} title={r.opportunity.title} sub={r.opportunity.org} why={r.why} href="/opportunities" />) : <Empty text="Nothing matches your profile right now." />}
          </Section>
          <Section title={alum ? 'Alumni with complementary experience' : 'Alumni with related experience'} href="/people" cta="Find people" testId="dash-people">
            {people.length ? people.map((r) => <Item key={r.personId} title={r.name} sub={r.label} why={personReason(viewerId, r.personId, r.reasons[0])} href={`/match?mode=people&aud=alumni&q=${encodeURIComponent(r.name)}`} />) : <Empty text="Add skills or projects to get people recommendations." />}
          </Section>
          <Section title={alum ? 'Alumni and professional events' : 'Events you can attend'} href="/events" cta="All events" testId="dash-events">
            {events.length ? events.map((r) => <Item key={r.event.id} title={r.event.title} sub={fmtDate(r.event.startsAt, r.event.timezone)} why={r.why} href="/events" />) : <Empty text="No upcoming events match yet." />}
          </Section>
          <Section title={alum ? 'Professional groups to join' : 'Groups to join'} href="/groups" cta="All groups" testId="dash-groups">
            {groups.length ? groups.map((r) => <Item key={r.group.id} title={r.group.name} sub={r.group.access === 'request' ? 'Request to join' : 'Open'} why={r.why} href={`/groups/${encodeURIComponent(r.group.id)}`} />) : <Empty text="You are in every group that matches your interests." />}
          </Section>
          <Section title={alum ? 'Startups seeking advisors or cofounders' : 'Startups that need your skills'} href="/startups" cta="All startups" testId="dash-startups">
            {builds.length ? builds.map((b) => <Item key={b.build.id} title={b.build.name} sub={b.build.stage} why={b.why} href={`/projects/${encodeURIComponent(b.build.id)}`} />) : <Empty text="No startups match your roles right now." />}
          </Section>
        </div>
        <p className="mt-6 text-xs text-ink/50">Recommendations are computed from fictional demo records: skills, projects, stated interests and eligibility. Each reason comes from stored data.</p>
      </div>
    </div>
  );
}
