import Link from 'next/link';
import PageHero from '@/components/PageHero';
import { getViewerId } from '@/lib/viewer';
import { listGroups, listEvents, EVENT_AUDIENCE_LABEL } from '@/lib/community';
import { suggestCircles } from '@/lib/circles';
import { ELIGIBILITY_LABEL } from '@/lib/access';

export const dynamic = 'force-dynamic';

/** Communities: a few curated groups of Yellow Jackets (Swarm Circles), what is suggested and why, and upcoming events. */
export default async function CommunitiesPage() {
  const viewerId = await getViewerId();
  const circles = listGroups(viewerId);
  const suggested = suggestCircles(viewerId);
  const suggestedIds = new Set(suggested.map((x) => x.circle.id));
  const events = listEvents(viewerId).filter((e) => !e.past).slice(0, 6);
  const when = (iso: string, tz: string) => new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tz, timeZoneName: 'short' });

  const card = (c: (typeof circles)[number], reason?: string) => (
    <li key={c.id} className="card flex flex-col p-5" data-testid="circle-card" data-id={c.id}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">{c.category} · {ELIGIBILITY_LABEL[c.eligibility]}</p>
      <h3 className="mt-1 font-display text-lg font-bold text-navy">{c.name}</h3>
      <p className="mt-1 text-sm text-ink/70">{c.description}</p>
      {reason && <p className="mt-2 text-sm font-medium text-teal" data-testid="circle-reason">{reason}</p>}
      <div className="mt-auto pt-4">
        {c.standing === 'ineligible' ? <p className="text-sm text-ink/60">Available to {ELIGIBILITY_LABEL[c.eligibility].toLowerCase().replace(' only', '')}.</p>
          : <Link href={`/communities/${encodeURIComponent(c.id)}`} className="btn-primary px-4 py-2 text-sm" data-testid="explore-community">Explore community</Link>}
      </div>
    </li>
  );

  return (
    <>
      <PageHero eyebrow="Communities" title="Find where you belong"
        subtitle="Find groups of Yellow Jackets who share your interests, career, or city." />
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        <p className="text-sm text-ink/70">Communities (we call them Swarm Circles) bring together Yellow Jackets with something in common: where they live, what they study, or what interests them. These are fictional demo communities, not official Georgia Tech groups.</p>

        <section aria-label={suggested.length ? 'Suggested for you' : 'Browse communities'} data-tour="circles-suggested">
          <h2 className="text-xl font-bold text-navy">{suggested.length ? 'Suggested for you' : 'Browse communities'}</h2>
          <ul className="mt-3 grid gap-4 md:grid-cols-3">{(suggested.length ? suggested.map((x) => card(x.circle, x.reason)) : circles.slice(0, 3).map((c) => card(c)))}</ul>
        </section>

        <section aria-label="All communities">
          <h2 className="text-xl font-bold text-navy">All communities</h2>
          <ul className="mt-3 grid gap-4 md:grid-cols-3">{circles.filter((c) => !suggestedIds.has(c.id)).map((c) => card(c))}</ul>
        </section>

        <section id="events" aria-label="Events">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold text-navy">Upcoming events</h2>
            <Link href="/events" className="text-sm font-semibold text-navy underline decoration-gold underline-offset-4">All events</Link>
          </div>
          <ul className="mt-3 divide-y divide-navy/5 rounded-xl border border-navy/10 bg-white">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 p-4" data-testid="community-event">
                <div>
                  <p className="font-semibold text-navy">{e.title}</p>
                  <p className="text-xs text-ink/60">{when(e.startsAt, e.timezone)}{e.groupName ? ` · ${e.groupName}` : ''}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${e.audience === 'all' ? 'bg-paper text-ink/60' : 'bg-gold/20 text-gold-dark'}`}>{EVENT_AUDIENCE_LABEL[e.audience]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink/50">Fictional demo events.</p>
        </section>
      </div>
    </>
  );
}
