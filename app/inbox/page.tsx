import Link from 'next/link';
import { getDb } from '@/lib/db';
import { getViewerId } from '@/lib/viewer';
import { snapshot } from '@/lib/data';
import { isOwner } from '@/lib/actions';
import { AcceptDecline, AddToProject } from '@/components/RequestActions';
import PageHero from '@/components/PageHero';
import { roleLabel } from '@/lib/roles';
import ActionButton from '@/components/ActionButton';
import { mentorshipsOf } from '@/lib/community';

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
  const mentorship = mentorshipsOf(viewerId).filter((x) => x.status === 'requested' || x.status === 'active');
  // join requests waiting for this member as a group admin
  const groupRequests = db.prepare("SELECT g.id, g.name, gm.person_id FROM group_member gm JOIN community_group g ON g.id = gm.group_id WHERE gm.status = 'pending' AND g.id IN (SELECT group_id FROM group_member WHERE person_id = ? AND role = 'admin' AND status = 'active')").all(viewerId) as { id: string; name: string; person_id: string }[];
  const me = s.person.get(viewerId)!;
  // consented connections (accepted requests); both people see them
  const connections = (db.prepare("SELECT from_person, to_person, created_at FROM connections WHERE source = 'request' AND status = 'active' AND (from_person = ? OR to_person = ?) ORDER BY created_at DESC").all(viewerId, viewerId) as { from_person: string; to_person: string; created_at: string }[])
    .map((c) => ({ person: s.person.get(c.from_person === viewerId ? c.to_person : c.from_person)!, at: c.created_at })).filter((c) => c.person);
  const kindOf = (id: string) => (s.person.get(id)!.type === 'alum' ? 'alum' : 'student');
  const dir = (a: string, b: string) => `${kindOf(a) === 'alum' ? 'Alum' : 'Student'} to ${kindOf(b)}`;

  const card = (r: Req, mode: 'received' | 'sent') => {
    const other = s.person.get(mode === 'received' ? r.from_person : r.to_person)!;
    const proj = r.project_id ? s.project.get(r.project_id) : null;
    const onTeam = proj ? (s.membersOf.get(proj.id) ?? []).some((m) => m.person_id === other.id) : false;
    // the project owner can add the other person once the request is accepted (help request they sent, or collaboration request they received)
    const canAdd = r.status === 'accepted' && !r.added_as && !!proj && isOwner(viewerId, proj.id) && !onTeam;
    const isCollab = !!proj && (s.membersOf.get(proj.id) ?? []).some((m) => m.person_id === r.to_person) && !(s.membersOf.get(proj.id) ?? []).some((m) => m.person_id === r.from_person && m.role !== 'advisor');
    const isInvite = !!proj && !isCollab && (s.membersOf.get(proj.id) ?? []).some((m) => m.person_id === r.from_person && m.role !== 'advisor');
    const statusText = r.status === 'sent' ? (mode === 'received' ? 'Waiting for you' : 'Pending') : r.status === 'accepted' ? 'Accepted · connected' : 'Declined';
    const statusClass = r.status === 'accepted' ? 'bg-teal-light text-teal' : r.status === 'declined' ? 'bg-navy/5 text-ink/50' : 'bg-gold/20 text-gold-dark';
    const who = other.type === 'alum' ? `Alum, class of ${other.grad_year}` : 'Student';
    return (
      <li key={r.id} className="card p-5" data-testid={`request-${mode}`} data-status={r.status}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${other.type === 'alum' ? 'bg-teal' : 'bg-plum'}`}>{initials(other.name)}</span>
            <div>
              <div className="font-display font-bold text-navy">{mode === 'received' ? `From ${other.name}` : `To ${other.name}`}</div>
              <div className="text-xs text-ink/60">
                {who} · {r.kind === 'stuck' ? 'Asking for help' : isCollab ? `Wants to join as ${roleLabel(r.role ?? 'Helper').toLowerCase()}` : isInvite ? `Invite: ${roleLabel(r.role ?? 'Helper').toLowerCase()} role` : `${roleLabel(r.role ?? 'Helper')} conversation`}
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
          {mode === 'received' && r.status === 'accepted' && !r.added_as && !canAdd && (
            <p className="text-xs text-ink/55">Accepting created a connection. Joining a project is a separate step the project owner takes.</p>
          )}
        </div>
      </li>
    );
  };

  return (
    <>
      <PageHero eyebrow="Inbox" title="Requests, mentorship and connections" subtitle={`For ${me.name}. Each request type is separate: accepting a connection creates a connection, accepting mentorship creates a mentorship, and neither grants a role, job or group membership.`} />
    <div className="mx-auto max-w-4xl px-4 py-8">
      <section aria-label="Your connections" data-testid="connections">
        <h2 className="label">Your connections ({connections.length})</h2>
        {connections.length ? (
          <ul className="flex flex-wrap gap-2">
            {connections.map((c) => (
              <li key={c.person.id} className="flex items-center gap-2 rounded-full border border-navy/10 bg-white py-1 pl-1 pr-3 text-sm">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white ${c.person.type === 'alum' ? 'bg-teal' : 'bg-plum'}`}>{initials(c.person.name)}</span>
                <span className="font-semibold text-navy">{c.person.name}</span><span className="text-xs text-ink/50">{c.person.type === 'alum' ? 'Alum' : 'Student'} · since {fmt(c.at)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink/60">No connections yet. When someone accepts your request, or you accept theirs, they show up here.</p>}
      </section>
      {mentorship.length > 0 && (
        <section className="mt-8" aria-label="Mentorship" data-testid="inbox-mentorship">
          <h2 className="label">Mentorship ({mentorship.length})</h2>
          <ul className="space-y-3">
            {mentorship.map((x) => (
              <li key={x.id} className="card p-4" data-testid="mentorship-request" data-status={x.status}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy">{x.iAmMentor ? `${x.menteeName} asked you for mentorship` : `You asked ${x.mentorName} for mentorship`}</p>
                    <p className="text-xs text-ink/60">{x.topic} · {x.status === 'requested' ? 'waiting for the mentor' : 'active mentorship'} · {fmt(x.created_at)}</p>
                  </div>
                  {x.iAmMentor && x.status === 'requested' && (
                    <span className="flex gap-2">
                      <ActionButton endpoint={`/api/mentorship/${encodeURIComponent(x.id)}`} body={{ action: 'accept' }} label="Accept" className="btn-primary px-3 py-1 text-xs" testId="mentorship-accept" />
                      <ActionButton endpoint={`/api/mentorship/${encodeURIComponent(x.id)}`} body={{ action: 'decline' }} label="Decline" className="btn-ghost px-3 py-1 text-xs" />
                    </span>
                  )}
                </div>
                <p className="mt-2 rounded-lg bg-paper p-3 text-sm text-ink/80">{x.message}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {groupRequests.length > 0 && (
        <section className="mt-8" aria-label="Group requests" data-testid="inbox-groups">
          <h2 className="label">Group join requests ({groupRequests.length})</h2>
          <ul className="space-y-2">
            {groupRequests.map((g) => (
              <li key={g.id + g.person_id} className="card flex flex-wrap items-center justify-between gap-2 p-4">
                <span className="text-sm"><strong className="text-navy">{s.person.get(g.person_id)?.name ?? 'A member'}</strong> wants to join <Link href={`/groups/${encodeURIComponent(g.id)}`} className="font-semibold text-navy underline decoration-gold underline-offset-2">{g.name}</Link></span>
                <span className="flex gap-2">
                  <ActionButton endpoint={`/api/groups/${encodeURIComponent(g.id)}`} body={{ action: 'approve', personId: g.person_id }} label="Approve" className="btn-primary px-3 py-1 text-xs" />
                  <ActionButton endpoint={`/api/groups/${encodeURIComponent(g.id)}`} body={{ action: 'deny', personId: g.person_id }} label="Decline" className="btn-ghost px-3 py-1 text-xs" />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="mt-8">
        <h2 className="label">Connection and startup requests ({received.length})</h2>
        {received.length ? <ul className="space-y-3">{received.map((r) => card(r, 'received'))}</ul> : <p className="card p-6 text-sm text-ink/60">No requests yet.</p>}
      </section>
      <section className="mt-8">
        <h2 className="label">Sent ({sent.length})</h2>
        {sent.length ? (
          <ul className="space-y-3">{sent.map((r) => card(r, 'sent'))}</ul>
        ) : (
          <p className="card p-6 text-sm text-ink/60">
            You have not sent any requests. Find someone in <Link className="underline" href="/match">Find Matches</Link>.
          </p>
        )}
      </section>
    </div>
    </>
  );
}
