import Link from 'next/link';
import PageHero from '@/components/PageHero';
import ActionButton from '@/components/ActionButton';
import { getViewerId } from '@/lib/viewer';
import { listEvents, recommendEvents, EVENT_AUDIENCE_LABEL, type EventView } from '@/lib/community';

export const dynamic = 'force-dynamic';

const when = (e: EventView) => new Date(e.startsAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: e.timezone, timeZoneName: 'short' });

function EventCard({ e, why }: { e: EventView; why?: string }) {
  const ep = `/api/events/${encodeURIComponent(e.id)}`;
  return (
    <li className={`card flex flex-col p-5 ${e.past ? 'opacity-60' : ''}`} data-testid="event-card" data-id={e.id} data-access={e.access}>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded-md bg-navy px-2 py-0.5 font-semibold text-white">{e.category}</span>
        <span className={`rounded-md px-2 py-0.5 font-semibold ${e.audience === 'all' ? 'bg-paper text-ink/60' : 'bg-gold/20 text-gold-dark'}`}>{EVENT_AUDIENCE_LABEL[e.audience]}</span>
        {e.past && <span className="rounded-md bg-paper px-2 py-0.5 font-semibold text-ink/60">Past</span>}
      </div>
      <h3 className="mt-2 font-display text-lg font-bold text-navy">{e.title}</h3>
      <p className="text-sm text-ink/70">{when(e)}</p>
      {e.access === 'full' ? (
        <>
          <p className="text-sm text-ink/70">{e.virtual ? 'Online' : e.location}</p>
          <p className="mt-2 text-sm text-ink/75">{e.description}</p>
        </>
      ) : (
        <p className="mt-2 rounded-md bg-paper px-3 py-2 text-xs text-ink/65" data-testid="event-restricted">Details are visible to {EVENT_AUDIENCE_LABEL[e.audience].replace(/ only$/, '').toLowerCase()}.</p>
      )}
      {why && <p className="mt-2 rounded-md bg-teal-light/50 px-2.5 py-1.5 text-xs text-ink/85">{why}</p>}
      <p className="mt-2 text-[11px] text-ink/50">{e.organizer}{e.groupName ? ` · ${e.groupName}` : ''}{e.capacity != null ? ` · ${e.spotsLeft} of ${e.capacity} spots left` : ''}{e.regDeadline ? ` · register by ${e.regDeadline}` : ''}</p>
      <div className="mt-auto pt-3">
        {e.myRsvp === 'going' ? (
          <span className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-teal" data-testid="rsvp-going">You are going</span>
            {!e.past && <ActionButton endpoint={ep} body={{ action: 'cancel' }} label="Cancel RSVP" className="btn-ghost px-3 py-1 text-xs" testId="rsvp-cancel" />}</span>
        ) : e.access !== 'full' || e.registrationClosed ? null : e.spotsLeft === 0 ? <span className="text-sm text-ink/60">Full</span>
          : <ActionButton endpoint={ep} body={{ action: 'rsvp' }} label="RSVP" className="btn-gold px-3 py-1.5 text-xs" testId="rsvp" />}
      </div>
    </li>
  );
}

/** Events: networking, panels, workshops and alumni gatherings with explicit audiences, capacity and deadlines. */
export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const viewerId = await getViewerId();
  const filter = (await searchParams).show;
  const events = listEvents(viewerId);
  const recs = recommendEvents(viewerId, 3);
  const recWhy = new Map(recs.map((r) => [r.event.id, r.why]));
  const mine = events.filter((e) => e.myRsvp === 'going' && !e.past);
  const shown = events.filter((e) => (filter === 'alumni' ? e.audience === 'verified_alumni' || e.audience === 'group' : filter === 'students' ? e.audience === 'students' : filter === 'open' ? e.audience === 'all' : true));
  const tab = (v: string | undefined, l: string) => <Link href={v ? `/events?show=${v}` : '/events'} className={`chip text-xs ${filter === v ? 'border-navy bg-navy text-white' : 'border-navy/20 bg-white text-navy'}`}>{l}</Link>;
  return (
    <>
      <PageHero eyebrow="Events" title="Meet the network in person and online."
        subtitle="Student mixers, alumni dinners, industry panels and workshops. Each event says who it is for; restricted details stay hidden from members who are not eligible." />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
        {mine.length > 0 && (
          <section aria-label="Your upcoming events">
            <h2 className="text-xl font-bold text-navy">Your upcoming events</h2>
            <ul className="mt-3 flex flex-wrap gap-2">{mine.map((e) => <li key={e.id} className="rounded-full bg-teal-light px-3 py-1 text-sm font-medium text-teal">{e.title} · {when(e)}</li>)}</ul>
          </section>
        )}
        {recs.length > 0 && (
          <section aria-label="Recommended events" data-tour="event-recs">
            <h2 className="text-xl font-bold text-navy">Recommended for you</h2>
            <ul className="mt-3 grid gap-4 md:grid-cols-3">{recs.map((r) => <EventCard key={r.event.id} e={r.event} why={r.why} />)}</ul>
          </section>
        )}
        <section aria-label="All events">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-navy">All events</h2>
            <nav className="flex flex-wrap gap-1.5" aria-label="Filter events">{tab(undefined, 'All')}{tab('open', 'Open to all')}{tab('students', 'Student')}{tab('alumni', 'Alumni and group')}</nav>
          </div>
          <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{shown.map((e) => <EventCard key={e.id} e={e} why={recWhy.get(e.id)} />)}</ul>
        </section>
        <p className="text-xs text-ink/50">All events are fictional demo events, not official Georgia Tech events.</p>
      </div>
    </>
  );
}
