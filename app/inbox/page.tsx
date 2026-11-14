import Link from 'next/link';
import { getDb } from '@/lib/db';
import { getViewerId } from '@/lib/viewer';
import { snapshot } from '@/lib/data';
import { isOwner } from '@/lib/actions';
import { AcceptDecline, AddToProject } from '@/components/RequestActions';

export const dynamic = 'force-dynamic';

interface Req { id: string; from_person: string; to_person: string; project_id: string | null; kind: string; role: string | null; message: string; status: string; added_as: string | null; created_at: string }

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const initials = (n: string) => n.split(' ').map((w) => w[0]).join('');

export default async function InboxPage() {
  const viewerId = await getViewerId();
  const s = snapshot();
  const db = getDb();
  const received = db.prepare('SELECT * FROM requests WHERE to_person = ? ORDER BY created_at DESC').all(viewerId) as Req[];
  const sent = db.prepare('SELECT * FROM requests WHERE from_person = ? ORDER BY created_at DESC').all(viewerId) as Req[];
  const me = s.person.get(viewerId)!;
  const kindOf = (id: string) => (s.person.get(id)!.type === 'alum' ? 'alum' : 'student');
  const dir = (a: string, b: string) => `${kindOf(a) === 'alum' ? 'Alum' : 'Student'} to ${kindOf(b)}`;

  const card = (r: Req, mode: 'received' | 'sent') => {
    const other = s.person.get(mode === 'received' ? r.from_person : r.to_person)!;
    const proj = r.project_id ? s.project.get(r.project_id) : null;
    const onTeam = proj ? (s.membersOf.get(proj.id) ?? []).some((m) => m.person_id === other.id) : false;
    const canAdd = mode === 'sent' && r.status === 'accepted' && !r.added_as && !!proj && isOwner(viewerId, proj.id) && !onTeam;
    const statusText = r.status === 'sent' ? (mode === 'received' ? 'Waiting for you' : 'Pending') : r.status === 'accepted' ? 'Accepted · connected' : 'Declined';
    const statusClass = r.status === 'accepted' ? 'bg-teal-light text-teal' : r.status === 'declined' ? 'bg-navy/5 text-ink/50' : 'bg-gold/20 text-gold-dark';
    const who = other.type === 'alum' ? `Alum, class of ${other.grad_year}` : 'Student';
    return (
      <li key={r.id} className="card p-5" data-testid={`request-${mode}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${other.type === 'alum' ? 'bg-teal' : 'bg-plum'}`}>{initials(other.name)}</span>
            <div>
              <div className="font-display font-bold text-navy">{mode === 'received' ? `From ${other.name}` : `To ${other.name}`}</div>
              <div className="text-xs text-ink/60">
                {who} · {r.kind === 'stuck' ? 'Asking for help' : `${r.role ?? 'Expertise'} conversation`}
                {proj ? (
                  <>
                    {' · '}
                    <Link className="underline decoration-gold underline-offset-2" href={`/projects/${encodeURIComponent(proj.id)}`}>{proj.name}</Link>
                  </>
                ) : null}
                {' · '}
                {dir(r.from_person, r.to_person)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass}`}>{statusText}</span>
            <div className="mt-1 text-[11px] text-ink/50">{fmt(r.created_at)}</div>
          </div>
        </div>
        <p className="mt-3 rounded-lg bg-paper p-3 text-sm leading-relaxed text-ink/85">{r.message}</p>
        <div className="mt-3 space-y-2">
          {mode === 'received' && r.status === 'sent' && <AcceptDecline id={r.id} name={other.name} />}
          {canAdd && <AddToProject id={r.id} name={other.name} projectName={proj!.name} suggested={r.role} />}
          {r.added_as && <p className="text-sm font-medium text-teal">Added to {proj?.name} as {r.added_as}.</p>}
          {mode === 'received' && r.status === 'accepted' && !r.added_as && (
            <p className="text-xs text-ink/55">Accepting created a connection. Joining a project is a separate step the project owner takes.</p>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold text-navy">Inbox</h1>
      <p className="mt-1 text-sm text-ink/70">Requests for {me.name}. Accepting creates a consented connection, nothing more.</p>
      <section className="mt-6">
        <h2 className="label">Received ({received.length})</h2>
        {received.length ? <ul className="space-y-3">{received.map((r) => card(r, 'received'))}</ul> : <p className="card p-6 text-sm text-ink/60">No requests yet.</p>}
      </section>
      <section className="mt-8">
        <h2 className="label">Sent ({sent.length})</h2>
        {sent.length ? (
          <ul className="space-y-3">{sent.map((r) => card(r, 'sent'))}</ul>
        ) : (
          <p className="card p-6 text-sm text-ink/60">
            You have not sent any requests. Find someone in <Link className="underline" href="/search">Find expertise</Link>.
          </p>
        )}
      </section>
    </div>
  );
}
