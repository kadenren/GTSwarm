import Link from 'next/link';
import { notFound } from 'next/navigation';
import GroupAction from '@/components/GroupAction';
import ActionButton from '@/components/ActionButton';
import AskToConnect from '@/components/AskToConnect';
import { getViewerId } from '@/lib/viewer';
import { snapshot } from '@/lib/data';
import { getGroup, listEvents, EVENT_AUDIENCE_LABEL } from '@/lib/community';
import { suggestCircles, circleMembers } from '@/lib/circles';
import { PURPOSES, canRequest, whyConnect } from '@/lib/people';
import { ELIGIBILITY_LABEL } from '@/lib/access';

export const dynamic = 'force-dynamic';

/** One template for every community: what it is, who it's for, why it's suggested, members you can meet, and events. */
export default async function CommunityPage({ params }: { params: Promise<{ id: string }> }) {
  const viewerId = await getViewerId();
  const id = decodeURIComponent((await params).id);
  const c = getGroup(viewerId, id);
  if (!c) notFound();
  const s = snapshot();
  const me = s.person.get(viewerId)!;
  const reason = suggestCircles(viewerId).find((x) => x.circle.id === id)?.reason;
  const members = circleMembers(viewerId, id);
  // c.members is null when the list is only shown to joined members (restricted communities)
  const events = listEvents(viewerId).filter((e) => e.groupName === c.name && !e.past);
  const when = (iso: string, tz: string) => new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tz, timeZoneName: 'short' });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/communities" className="text-sm text-navy/70 hover:text-navy">← All communities</Link>
      <header className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">{c.category} · {ELIGIBILITY_LABEL[c.eligibility]}</p>
        <h1 className="mt-1 text-3xl font-bold text-navy">{c.name}</h1>
        <p className="mt-2 max-w-2xl text-ink/75">{c.description}</p>
        {reason && <p className="mt-2 font-medium text-teal" data-testid="circle-reason">{reason}</p>}
        <div className="mt-3"><GroupAction g={c} /></div>
      </header>

      {c.standing === 'ineligible' ? (
        <p className="card mt-6 p-6 text-sm text-ink/70" data-testid="circle-restricted">This community is for {ELIGIBILITY_LABEL[c.eligibility].toLowerCase().replace(' only', '')}. Its members and events are visible to them.</p>
      ) : (
        <>
          <section className="mt-8" aria-label="Members you can meet" data-tour="circle-members">
            <h2 className="text-xl font-bold text-navy">People you can meet</h2>
            {members.length ? (
              <ul className="mt-3 grid gap-3 md:grid-cols-2" data-testid="circle-members">
                {members.map((m) => {
                  const person = s.person.get(m.id)!;
                  const why = whyConnect(viewerId, person, 'meet');
                  const purposes = PURPOSES.map((x) => ({ id: x.id, label: x.label, ...canRequest(viewerId, m.id, x.id) }));
                  return (
                    <li key={m.id} className="card p-4" data-testid="circle-member" data-id={m.id}>
                      <p className="font-display font-bold text-navy">{m.name} <span className="text-sm font-medium text-ink/55">{m.line}{m.city ? ` · ${m.city}` : ''}</span></p>
                      <p className="mt-1 text-sm text-navy"><span className="font-semibold">Why this person? </span>{why}</p>
                      <div className="mt-3 flex flex-wrap items-start gap-3">
                        <Link href={`/people/${encodeURIComponent(m.id)}?from=community`} className="pt-1.5 text-sm font-semibold text-navy underline decoration-gold underline-offset-4" data-testid="view-profile">View profile</Link>
                        {m.canMeet ? <AskToConnect personId={m.id} firstName={m.name.split(' ')[0]} purposes={purposes} defaultPurpose="meet" compact
                          suggestedNote={`Hi ${m.name.split(' ')[0]}, I'm ${me.name.split(' ')[0]} from ${c.name} on GT Swarm. ${why} Would you like to connect?`} /> : <span className="pt-1.5 text-xs text-ink/55">Not taking requests right now</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="mt-2 text-sm text-ink/60">{c.members === null ? 'Join this community to see who is here.' : 'No members are open to new connections here yet.'}</p>}
          </section>

          <section className="mt-8" aria-label="Events">
            <h2 className="text-xl font-bold text-navy">Events</h2>
            {events.length ? (
              <ul className="mt-3 space-y-2">
                {events.map((e) => (
                  <li key={e.id} className="card flex flex-wrap items-center justify-between gap-3 p-4" data-testid="circle-event" data-id={e.id}>
                    <div>
                      <p className="font-semibold text-navy">{e.title}</p>
                      <p className="text-xs text-ink/60">{when(e.startsAt, e.timezone)} · {e.access === 'full' ? (e.virtual ? 'Online' : e.location) : 'Details for eligible members'} · {EVENT_AUDIENCE_LABEL[e.audience]}</p>
                    </div>
                    {e.myRsvp === 'going' ? <span className="text-sm font-semibold text-teal">You&apos;re going</span>
                      : e.access === 'full' && !e.registrationClosed && e.spotsLeft !== 0 ? <ActionButton endpoint={`/api/events/${encodeURIComponent(e.id)}`} body={{ action: 'rsvp' }} label="RSVP" className="btn-ghost px-3 py-1.5 text-xs" testId="rsvp" />
                      : e.access !== 'full' ? <span className="text-xs text-ink/60">{EVENT_AUDIENCE_LABEL[e.audience]}</span> : null}
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-ink/60">No upcoming events.</p>}
          </section>
        </>
      )}
      <p className="mt-8 text-xs text-ink/50">A fictional demo community, not an official Georgia Tech group. No member counts or attendance are real.</p>
    </div>
  );
}
