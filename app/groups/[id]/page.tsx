import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHero from '@/components/PageHero';
import GroupAction from '@/components/GroupAction';
import ActionButton from '@/components/ActionButton';
import { getViewerId } from '@/lib/viewer';
import { getGroup, listEvents, EVENT_AUDIENCE_LABEL } from '@/lib/community';
import { ELIGIBILITY_LABEL } from '@/lib/access';

export const dynamic = 'force-dynamic';

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const viewerId = await getViewerId();
  const g = getGroup(viewerId, decodeURIComponent((await params).id));
  if (!g) notFound();
  const events = listEvents(viewerId).filter((e) => e.groupName === g.name);
  return (
    <>
      <PageHero eyebrow={`${g.category} group`} title={g.name} subtitle={g.description} />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card p-5" aria-label="Upcoming events">
            <h2 className="text-lg font-bold text-navy">Group events</h2>
            {events.length ? (
              <ul className="mt-3 space-y-2">
                {events.map((e) => (
                  <li key={e.id} className="rounded-lg bg-paper p-3">
                    <p className="font-semibold text-navy">{e.title}</p>
                    <p className="text-xs text-ink/60">{new Date(e.startsAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: e.timezone })} · {EVENT_AUDIENCE_LABEL[e.audience]}{e.access === 'teaser' ? ' · details hidden' : ''}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-ink/60">No events scheduled.</p>}
            <Link href="/events" className="mt-3 inline-block text-xs font-semibold text-navy underline decoration-gold underline-offset-4">All events</Link>
          </section>
          {g.pending.length > 0 && (
            <section className="card p-5" aria-label="Join requests" data-testid="group-requests">
              <h2 className="text-lg font-bold text-navy">Join requests</h2>
              <p className="text-xs text-ink/60">Only group admins see these.</p>
              <ul className="mt-3 space-y-2">
                {g.pending.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-paper p-3">
                    <span className="font-semibold text-navy">{p.name}</span>
                    <span className="flex gap-2">
                      <ActionButton endpoint={`/api/groups/${encodeURIComponent(g.id)}`} body={{ action: 'approve', personId: p.id }} label="Approve" className="btn-primary px-3 py-1 text-xs" />
                      <ActionButton endpoint={`/api/groups/${encodeURIComponent(g.id)}`} body={{ action: 'deny', personId: p.id }} label="Decline" className="btn-ghost px-3 py-1 text-xs" />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside className="space-y-4">
          <section className="card p-5">
            <dl className="space-y-1 text-sm">
              <div><dt className="inline font-semibold text-navy">Who can join: </dt><dd className="inline text-ink/75">{ELIGIBILITY_LABEL[g.eligibility]}</dd></div>
              <div><dt className="inline font-semibold text-navy">How: </dt><dd className="inline text-ink/75">{g.access === 'open' ? 'Open: join instantly' : 'Request: an admin approves'}</dd></div>
              <div><dt className="inline font-semibold text-navy">Admin: </dt><dd className="inline text-ink/75">{g.adminName ?? 'None'}</dd></div>
            </dl>
            <div className="mt-3"><GroupAction g={g} /></div>
          </section>
          <section className="card p-5" aria-label="Members">
            <h2 className="text-lg font-bold text-navy">Members ({g.memberCount})</h2>
            {g.members ? (
              <ul className="mt-2 space-y-1 text-sm" data-testid="group-members">{g.members.map((x) => <li key={x.id}><span className="font-medium text-navy">{x.name}</span> <span className="text-xs text-ink/55">{x.label}</span></li>)}</ul>
            ) : <p className="mt-2 text-sm text-ink/60" data-testid="group-members-hidden">The member list is visible to members of this group.</p>}
          </section>
        </aside>
      </div>
    </>
  );
}
