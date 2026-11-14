import Link from 'next/link';
import { notFound } from 'next/navigation';
import { projectView } from '@/lib/project';
import { getViewerId } from '@/lib/viewer';
import { snapshot, personLabel } from '@/lib/data';
import LogProgress from '@/components/LogProgress';
import ConfirmMilestone from '@/components/ConfirmMilestone';
import TeamBuilder from '@/components/TeamBuilder';

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
  const { project: p, team, lineage, record, handoff, problems, viewerRole } = v;
  const s = snapshot();
  const people = s.people.filter((x) => x.claimed && x.id !== viewerId).map((x) => ({ id: x.id, name: x.name, label: personLabel(x) })).sort((a, b) => a.name.localeCompare(b.name));
  const builders = team.filter((t) => t.role !== 'advisor');
  const advisors = team.filter((t) => t.role === 'advisor');
  const canLog = !!viewerRole;
  const isAdvisor = viewerRole === 'advisor';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link href="/projects" className="text-sm text-navy/70 hover:text-navy">← All projects</Link>
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

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          {lineage.length > 1 && (
            <section className="card p-5" aria-label="Lineage timeline">
              <h2 className="text-lg font-bold text-navy">Lineage</h2>
              <p className="text-xs text-ink/60">This project continues across years. Each team inherits the last one&apos;s work and builders.</p>
              <ol className="mt-4 flex gap-0 overflow-x-auto pb-2">
                {lineage.map((l, i) => (
                  <li key={l.id} className="relative min-w-[180px] flex-1 pr-4">
                    <div className="flex items-center">
                      <span className={`z-10 h-4 w-4 shrink-0 rounded-full border-2 ${l.id === p.id ? 'border-gold bg-gold' : 'border-navy bg-white'}`} />
                      {i < lineage.length - 1 && <span className="h-0.5 flex-1 bg-navy/20" />}
                    </div>
                    <Link href={`/projects/${encodeURIComponent(l.id)}`} className={`mt-2 block rounded-lg p-2 hover:bg-paper ${l.id === p.id ? 'bg-gold/10' : ''}`}>
                      <div className="font-display text-xl font-bold text-navy">{l.year}</div>
                      <div className="text-sm font-medium text-navy">{l.name}</div>
                      <div className="text-xs text-ink/60">{l.team}</div>
                      {l.parent && l.parent !== lineage[i - 1]?.id && <div className="text-[11px] text-ink/50">branches from {s.project.get(l.parent)!.name} ({s.project.get(l.parent)!.year})</div>}
                      <div className="mt-1 text-[11px] text-ink/60">{l.builders.slice(0, 3).join(', ')}{l.builders.length > 3 ? ` +${l.builders.length - 3}` : ''}</div>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="card p-5" aria-label="Handoff brief">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">Handoff brief</h2>
              <span className="text-[11px] text-ink/50">{handoff.source === 'cached' ? 'AI-polished, cached from graph facts' : 'Generated from graph facts'}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink/85">{handoff.text}</p>
            {handoff.contacts.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                {handoff.contacts.map((c) => (
                  <li key={c.id} className="rounded-full border border-navy/15 bg-white px-3 py-1"><span className="font-semibold text-navy">{c.name}</span> <span className="text-ink/60">{c.why}</span></li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5" aria-label="Build record">
            <h2 className="text-lg font-bold text-navy">Build record</h2>
            <p className="text-xs text-ink/60">Milestones and solved problems. A gold check means an advisor confirmed it.</p>
            {record.length === 0 ? (
              <p className="mt-4 text-sm text-ink/60">Nothing logged yet.</p>
            ) : (
              <ol className="mt-4 space-y-3" data-testid="build-record">
                {record.map((r) => (
                  <li key={r.id} className="flex gap-3">
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${r.kind === 'milestone' && r.confirmedBy ? 'bg-gold text-navy-900' : r.kind === 'problem' ? 'bg-teal-light text-teal' : 'bg-navy/10 text-navy/50'}`} aria-hidden="true">
                      {r.kind === 'milestone' && r.confirmedBy ? (
                        <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 7.5l2.5 2.5L11 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
                      ) : r.kind === 'problem' ? (
                        <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="3.5" fill="currentColor" /></svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium text-navy">{r.title}</span>
                        <span className="text-xs tabular-nums text-ink/50">{r.date}</span>
                      </div>
                      {r.detail && <p className="text-sm text-ink/75">{r.detail}</p>}
                      <p className="text-xs text-ink/55">
                        {r.kind === 'milestone' ? (r.confirmedBy ? `Confirmed by ${r.confirmedBy}` : 'Not yet confirmed') : `Solved by ${r.by ?? 'the team'}${r.helper ? ` with help from ${r.helper}` : ''}`}
                      </p>
                      {r.kind === 'milestone' && !r.confirmedBy && isAdvisor && <div className="mt-1"><ConfirmMilestone id={r.id} /></div>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {p.is_startup && <TeamBuilder projectId={p.id} />}

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
            <p className="card p-5 text-sm text-ink/60">Only members of this project can log progress. Switch &ldquo;Viewing as&rdquo; to a team member to try it.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
