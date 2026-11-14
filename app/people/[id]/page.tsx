import Link from 'next/link';
import { notFound } from 'next/navigation';
import AskToConnect from '@/components/AskToConnect';
import MemberBadge from '@/components/MemberBadge';
import { getViewerId } from '@/lib/viewer';
import { snapshot } from '@/lib/data';
import { profileFor } from '@/lib/people';
import { membershipOf } from '@/lib/access';

export const dynamic = 'force-dynamic';

/** A member profile: only what they chose to share, why you might connect, and a way to ask. */
export default async function PersonProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const viewerId = await getViewerId();
  const id = decodeURIComponent((await params).id);
  const from = (await searchParams).from;
  const p = profileFor(viewerId, id);
  if (!p) notFound();
  const me = snapshot().person.get(viewerId)!;
  const first = p.name.split(' ')[0];
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href={from === 'community' ? '/communities' : '/people'} className="text-sm text-navy/70 hover:text-navy">← Back to {from === 'community' ? 'communities' : 'Find people'}</Link>
      <header className="mt-3 flex flex-wrap items-start gap-4">
        <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full font-display text-xl font-bold text-white ${p.type === 'alum' ? 'bg-teal' : 'bg-plum'}`} aria-hidden="true">{p.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-navy">{p.name}</h1>
          <p className="text-ink/70">{p.affiliation} · {p.major}{p.city ? ` · ${p.city}` : ''}</p>
          {p.currentRole && <p className="text-ink/70">{p.currentRole}</p>}
          <div className="mt-2"><MemberBadge status={membershipOf(p.id).status} /></div>
        </div>
      </header>

      <section className="mt-6 rounded-xl border-l-4 border-gold bg-white px-5 py-4 shadow-sm" data-testid="why-connect">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gold-dark">Why you might connect</h2>
        <p className="mt-1 text-navy">{p.why}</p>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="card p-5" aria-label="About">
          <h2 className="text-lg font-bold text-navy">About</h2>
          <p className="mt-2 text-sm text-ink/80">{p.bio}</p>
          {p.interests.length > 0 && <><h3 className="label mt-3">Interests</h3><div className="flex flex-wrap gap-1">{p.interests.map((x) => <span key={x} className="tag">{x}</span>)}</div></>}
          {p.skills.length > 0 && <><h3 className="label mt-3">Experience</h3><div className="flex flex-wrap gap-1">{p.skills.map((x) => <span key={x} className="tag">{x}</span>)}</div></>}
        </section>
        <section className="card p-5" aria-label="Open to">
          <h2 className="text-lg font-bold text-navy">Open to</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink/80">{p.welcomes.map((w) => <li key={w}>· {w}</li>)}</ul>
          {p.mentorTopics.length > 0 && <p className="mt-2 text-sm text-ink/80">Mentors on: {p.mentorTopics.join(', ')}</p>}
          {p.canHelp && <p className="mt-2 text-sm text-ink/80"><span className="font-semibold text-navy">Can help with: </span>{p.canHelp}</p>}
          {p.interestedIn && <p className="mt-1 text-sm text-ink/80"><span className="font-semibold text-navy">Looking for: </span>{p.interestedIn}</p>}
          <div className="mt-4">
            <AskToConnect personId={p.id} firstName={first} purposes={p.purposes.map((x) => ({ id: x.id, label: x.label, ok: x.ok, reason: x.reason }))}
              suggestedNote={`Hi ${first}, I'm ${me.name.split(' ')[0]}${me.type === 'student' ? `, a Georgia Tech student` : `, GT class of ${me.grad_year}`}. ${p.why} I'd love to connect.`} />
          </div>
        </section>
      </div>

      <section className="card mt-6 p-5" aria-label="How you're connected" data-testid="connection-path">
        <h2 className="text-lg font-bold text-navy">How you&apos;re connected</h2>
        {p.path ? <p className="mt-1 text-sm text-ink/80">{p.path}</p> : <p className="mt-1 text-sm text-ink/70">No confirmed connection path found. You can still ask to connect directly.</p>}
        <p className="mt-2 text-[11px] text-ink/50">Only confirmed ties count: shared projects and accepted connections. Shared interests never count as knowing someone.</p>
      </section>
      <p className="mt-4 text-xs text-ink/50">Fictional demo member. Contact details are never shown; requests go through GT Swarm and can be declined.</p>
    </div>
  );
}
