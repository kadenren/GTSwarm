import Link from 'next/link';
import { snapshot } from '@/lib/data';
import { getViewerId } from '@/lib/viewer';
import PageHero from '@/components/PageHero';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const viewerId = await getViewerId();
  const s = snapshot();
  const mine = (s.projectsOf.get(viewerId) ?? []).map((m) => ({ m, p: s.project.get(m.project_id)! })).sort((a, b) => b.p.year - a.p.year);
  const byYear = new Map<number, typeof s.projects>();
  for (const p of [...s.projects].sort((a, b) => b.year - a.year || a.name.localeCompare(b.name))) {
    if (!byYear.has(p.year)) byYear.set(p.year, []);
    byYear.get(p.year)!.push(p);
  }
  return (
    <>
      <PageHero eyebrow="The swarm" title="Every project, connected" subtitle={`${s.projects.length} projects from 2011 to 2026, linked by the people who built them and the teams that carried them forward.`} />
    <div className="mx-auto max-w-7xl px-4 py-8">
      <section className="mt-6">
        <h2 className="label">Your projects</h2>
        {mine.length === 0 ? <p className="text-sm text-ink/60">You are not on any projects yet.</p> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map(({ m, p }) => (
              <Link key={p.id} href={`/projects/${encodeURIComponent(p.id)}`} className="card p-5 transition hover:border-gold hover:shadow-md">
                <div className="text-xs font-semibold uppercase tracking-wide text-gold-dark">{p.team_type} · {p.year} · {m.title ?? m.role}</div>
                <div className="mt-1 font-display text-xl font-bold text-navy">{p.name}</div>
                <p className="mt-1 line-clamp-2 text-sm text-ink/70">{p.summary}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
      <section className="mt-10">
        <h2 className="label">Every project in the swarm ({s.projects.length})</h2>
        <div className="space-y-5">
          {[...byYear].map(([year, ps]) => (
            <div key={year} className="grid gap-3 sm:grid-cols-[80px_1fr]">
              <div className="font-display text-2xl font-bold text-navy/40">{year}</div>
              <ul className="flex flex-wrap gap-2">
                {ps.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projects/${encodeURIComponent(p.id)}`} className="inline-flex items-center gap-2 rounded-lg border border-navy/10 bg-white px-3 py-1.5 text-sm hover:border-gold">
                      <span className="font-medium text-navy">{p.name}</span>
                      <span className="text-xs text-ink/50">{p.team_type}</span>
                      {p.continued_from && <span className="text-[10px] text-gold-dark" title="Continues an earlier project">lineage</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
    </>
  );
}
