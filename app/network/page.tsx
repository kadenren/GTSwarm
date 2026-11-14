import Link from 'next/link';
import PageHero from '@/components/PageHero';
import LifecyclePanel from '@/components/LifecyclePanel';
import ContactPrefsForm from '@/components/ContactPrefsForm';
import { getDb } from '@/lib/db';
import { getViewerId } from '@/lib/viewer';
import { snapshot } from '@/lib/data';
import { contactPrefsOf } from '@/lib/people';
import { mentorshipsOf } from '@/lib/community';

export const dynamic = 'force-dynamic';

/** My Network: my profile, who may contact me, my requests and connections, and my membership. */
export default async function MyNetworkPage() {
  const viewerId = await getViewerId();
  const s = snapshot();
  const db = getDb();
  const me = s.person.get(viewerId)!;
  const count = (sql: string) => (db.prepare(sql).get(viewerId) as { n: number }).n;
  const received = count("SELECT COUNT(*) n FROM requests WHERE to_person = ? AND status = 'sent'");
  const sent = count("SELECT COUNT(*) n FROM requests WHERE from_person = ? AND status = 'sent'");
  const mentorship = mentorshipsOf(viewerId).filter((x) => x.status === 'requested' || x.status === 'active');
  const connections = (db.prepare("SELECT from_person, to_person FROM connections WHERE source = 'request' AND status = 'active' AND (from_person = ? OR to_person = ?) ORDER BY created_at DESC").all(viewerId, viewerId) as { from_person: string; to_person: string }[])
    .map((c) => s.person.get(c.from_person === viewerId ? c.to_person : c.from_person)).filter(Boolean);

  return (
    <>
      <PageHero eyebrow="My Network" title={`${me.name.split(' ')[0]}'s network`} subtitle="Your profile, connections, requests, and membership." />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <LifecyclePanel personId={viewerId} />
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-6">
            <section className="card p-5" aria-label="Requests">
              <h2 className="text-lg font-bold text-navy">Requests</h2>
              <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-paper p-3"><dt className="text-xs text-ink/60">Waiting for you</dt><dd className="font-display text-2xl font-bold text-navy" data-testid="received-count">{received}</dd></div>
                <div className="rounded-lg bg-paper p-3"><dt className="text-xs text-ink/60">You sent</dt><dd className="font-display text-2xl font-bold text-navy">{sent}</dd></div>
                <div className="rounded-lg bg-paper p-3"><dt className="text-xs text-ink/60">Mentorships</dt><dd className="font-display text-2xl font-bold text-navy">{mentorship.length}</dd></div>
              </dl>
              <Link href="/inbox" className="btn-primary mt-4 px-4 py-2 text-sm" data-testid="open-inbox">Open requests</Link>
            </section>
            <section className="card p-5" aria-label="Connections">
              <h2 className="text-lg font-bold text-navy">Connections</h2>
              {connections.length ? (
                <ul className="mt-2 divide-y divide-navy/5">
                  {connections.map((p) => (
                    <li key={p!.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="font-semibold text-navy">{p!.name} <span className="font-normal text-ink/55">{p!.type === 'alum' ? `Alum '${String(p!.grad_year).slice(2)}` : 'Student'}</span></span>
                      <Link href={`/people/${encodeURIComponent(p!.id)}`} className="text-xs font-semibold text-navy underline decoration-gold underline-offset-4">Profile</Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-2 text-sm text-ink/60">No connections yet. When someone accepts your request, they show up here. <Link href="/people" className="font-semibold text-navy underline decoration-gold underline-offset-4">Find people</Link></p>}
            </section>
            <section className="card p-5" aria-label="Profile">
              <h2 className="text-lg font-bold text-navy">Profile</h2>
              <p className="mt-1 text-sm text-ink/70">{me.type === 'alum' ? `Alum, ${me.major} '${String(me.grad_year).slice(2)}` : `${me.major} student, class of ${me.grad_year}`}{me.current_role ? ` · ${me.current_role}` : ''}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link href={`/people/${encodeURIComponent(viewerId)}`} className="font-semibold text-navy underline decoration-gold underline-offset-4">See how others see you</Link>
                <Link href="/profile" className="font-semibold text-navy underline decoration-gold underline-offset-4">Edit skills and projects</Link>
              </div>
            </section>
          </div>
          <section className="card p-5" aria-label="Contact preferences">
            <h2 className="text-lg font-bold text-navy">Contact preferences</h2>
            <p className="mt-1 text-sm text-ink/65">You decide who can reach you. People who can&apos;t send you a request see a short, polite note instead.</p>
            <div className="mt-4"><ContactPrefsForm initial={contactPrefsOf(viewerId)} isAlum={me.type === 'alum'} /></div>
          </section>
        </div>
      </div>
    </>
  );
}
