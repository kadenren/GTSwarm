import Link from 'next/link';
import { notFound } from 'next/navigation';
import { projectView } from '@/lib/project';
import { getViewerId } from '@/lib/viewer';
import { snapshot, personLabel } from '@/lib/data';
import LogProgress from '@/components/LogProgress';
import BuildStatusEditor from '@/components/BuildStatusEditor';
import { CollaborateButton } from '@/components/BuildCard';
import { StageBar, STAGE_STYLE } from '@/components/stage';
import { buildFor } from '@/lib/builds';
import { recommendCollaborators } from '@/lib/matching';
import { getDb } from '@/lib/db';
import { InviteButton } from '@/components/MatchFinder';
import { roleLabel } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const TYPE_COLORS: Record<string, string> = {
  VIP: 'bg-navy text-white', Capstone: 'bg-gold text-navy-900', 'CREATE-X': 'bg-teal text-white', Lab: 'bg-plum text-white',
  Club: 'bg-sky-700 text-white', 'Invention Studio': 'bg-orange-700 text-white', Startup: 'bg-emerald-700 text-white',
};
const ROLE_LABEL: Record<string, string> = { builder: 'Builder', founder: 'Founder', advisor: 'Advisor', maintainer: 'Maintainer' };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const viewerId = await getViewerId();
  const v = projectView(id, viewerId);
  if (!v) notFound();
  const { project: p, team, problems, viewerRole } = v;
  const s = snapshot();
  const people = s.people.filter((x) => x.claimed && x.id !== viewerId).map((x) => ({ id: x.id, name: x.name, label: personLabel(x) })).sort((a, b) => a.name.localeCompare(b.name));
  const builders = team.filter((t) => t.role !== 'advisor');
  const advisors = team.filter((t) => t.role === 'advisor');
  const canLog = !!viewerRole;
  const build = buildFor(p.id);
  const onTeam = !!viewerRole && viewerRole !== 'advisor';
  const me = s.person.get(viewerId);
  const viewer = me ? { name: me.name, type: me.type, openTo: me.open_to } : null;
  const recs = build && build.open ? await recommendCollaborators(p.id, viewerId) : [];
  const joinRequests = build && onTeam
    ? (getDb().prepare("SELECT id, from_person, role, status, created_at FROM requests WHERE project_id = ? AND to_person = ? ORDER BY created_at DESC").all(p.id, viewerId) as { id: string; from_person: string; role: string | null; status: string; created_at: string }[])
        .filter((r) => !(s.membersOf.get(p.id) ?? []).some((m) => m.person_id === r.from_person))
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link href="/" className="text-sm text-navy/70 hover:text-navy">← Discover</Link>
      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${TYPE_COLORS[p.team_type] ?? 'bg-navy text-white'}`}>{p.team_type}</span>
            <span className="text-sm text-ink/60">{p.team_name} · {p.year}</span>
            {p.is_startup && p.team_type !== 'Startup' && <span className="tag bg-emerald-50 text-emerald-800">Startup</span>}
            {viewerRole && <span className="tag bg-gold/20 text-gold-dark">You are {viewerRole === 'advisor' ? 'an advisor' : `a ${ROLE_LABEL[viewerRole].toLowerCase()}`} here</span>}
          </div>
          <h1 className="mt-2 text-4xl font-bold text-navy">{p.name}</h1>
          <p className="mt-2 text-lg leading-relaxed text-ink/80">{p.summary}</p>
          {p.outcome && <p className="mt-2 text-sm font-medium text-teal">Outcome: {p.outcome}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.technologies.map((t) => <span key={t} className="tag">{t}</span>)}
          </div>
          {v.links.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2 text-sm">
              {v.links.map((l) => (
                <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-navy/15 bg-white px-2.5 py-1 text-navy hover:border-gold">{l.title || l.url} <span aria-hidden="true">↗</span></a></li>
              ))}
            </ul>
          )}
        </div>
      </header>

      {build && (
        <section className="card mt-6 overflow-hidden" aria-label="Collaboration hub" data-testid="collab-hub">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/10 bg-paper/60 px-5 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STAGE_STYLE[build.stage]}`}>{build.stage}</span>
              <StageBar stage={build.stage} />
              <span className="text-xs text-ink/60">{build.industry} · {build.domain}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${build.open ? 'bg-gold/20 text-gold-dark' : 'bg-navy/5 text-ink/50'}`}>{build.open ? 'Open to collaborators' : 'Not taking collaborators'}</span>
            </div>
            {onTeam ? <BuildStatusEditor projectId={p.id} initial={{ stage: build.stage, open: build.open, roles: build.rolesNeeded, help: build.helpNeeded }} /> : <CollaborateButton build={build} />}
          </div>
          <div className="grid gap-6 p-5 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <h2 className="label">Looking for</h2>
              <div className="flex flex-wrap gap-1.5">{build.rolesNeeded.map((r) => <span key={r} className="tag bg-gold/20 text-gold-dark">{r}</span>)}</div>
              {build.helpNeeded && <p className="mt-2 text-sm text-ink/80">{build.helpNeeded}</p>}
              {joinRequests.length > 0 && (
                <div className="mt-4">
                  <h3 className="label">Requests to collaborate ({joinRequests.length})</h3>
                  <ul className="space-y-1 text-sm">
                    {joinRequests.map((r) => <li key={r.id} className="flex justify-between gap-2"><span className="text-navy">{s.person.get(r.from_person)?.name} <span className="text-ink/50">as {r.role ?? 'collaborator'}</span></span><Link href="/inbox" className="text-xs font-semibold text-navy underline decoration-gold underline-offset-4">{r.status === 'sent' ? 'Review' : r.status}</Link></li>)}
                  </ul>
                </div>
              )}
            </div>
            {recs.length > 0 && (
              <div data-tour="hub-recommended">
                <h2 className="label">Recommended collaborators</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {recs.filter((r) => r.people.length).map(({ role, people }) => (
                    <div key={role}>
                      <div className="text-xs font-semibold text-navy">{roleLabel(role)}s</div>
                      <ul className="mt-1 space-y-1.5">
                        {people.map((r) => (
                          <li key={r.personId} className="text-xs">
                            <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${r.type === 'alum' ? 'bg-teal' : 'bg-plum'}`} aria-hidden="true" />
                            <span className="font-semibold text-navy">{r.name}</span> <span className="text-ink/50">{r.label}</span>
                            <div className="pl-3.5 text-ink/65">{r.description.short.split(' · ')[0]}</div>
                            {onTeam && viewer && <div className="mt-1 pl-3.5"><InviteButton person={{ id: r.personId, name: r.name }} role={role} query="" viewer={viewer} ownedBuilds={[{ id: p.id, name: p.name }]} /></div>}
                          </li>
                        ))}
                      </ul>
                      <Link href={`/match?mode=people&q=${encodeURIComponent(build.helpNeeded || p.summary)}&role=${encodeURIComponent(role)}&aud=both`} className="mt-1 inline-block pl-3.5 text-[11px] font-semibold text-navy underline decoration-gold underline-offset-4">See all matches</Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <section className="card p-5" aria-label="Solved problems">
            <h2 className="text-lg font-bold text-navy">Solved problems</h2>
            {problems.length === 0 ? <p className="mt-2 text-sm text-ink/60">None documented yet.</p> : (
              <ul className="mt-3 divide-y divide-navy/5">
                {problems.map((pb) => (
                  <li key={pb.id} className="py-3">
                    <p className="font-medium text-navy">{pb.description}</p>
                    <p className="text-sm text-ink/75">{pb.solution}</p>
                    <p className="text-xs text-ink/55">Solved by {pb.by ?? 'the team'}{pb.helper ? ` with help from ${pb.helper}` : ''}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5" aria-label="Team">
            <h2 className="text-lg font-bold text-navy">Team</h2>
            <ul className="mt-3 space-y-2">
              {builders.map((t) => (
                <li key={t.id} className="flex items-center gap-3" data-testid="team-member">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${t.type === 'alum' ? 'bg-teal' : 'bg-plum'}`}>{t.name.split(' ').map((w) => w[0]).join('')}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-navy">{t.name}{t.id === viewerId ? ' (you)' : ''}</div>
                    <div className="text-xs text-ink/60">{t.title ?? ROLE_LABEL[t.role]} · {t.type === 'alum' ? `alum '${String(t.gradYear).slice(2)}` : 'student'} · {t.major}</div>
                  </div>
                </li>
              ))}
            </ul>
            {advisors.length > 0 && (
              <>
                <h3 className="mt-4 label">Advisors</h3>
                <ul className="space-y-2">
                  {advisors.map((t) => (
                    <li key={t.id} className="flex items-center gap-3" data-testid="team-member">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gold bg-white text-xs font-bold text-navy">{t.name.split(' ').map((w) => w[0]).join('')}</span>
                      <div>
                        <div className="text-sm font-semibold text-navy">{t.name}{t.id === viewerId ? ' (you)' : ''}</div>
                        <div className="text-xs text-ink/60">{t.title ?? 'Advisor'} · {t.type === 'alum' ? `alum '${String(t.gradYear).slice(2)}` : 'student'}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
          {canLog ? (
            <LogProgress projectId={p.id} projectName={p.name} people={people} />
          ) : (
            <p className="card p-5 text-sm text-ink/60">Team members add the problems they solve here, so the next builder can find them in Get Unstuck.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
