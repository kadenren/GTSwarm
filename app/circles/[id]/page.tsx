import Link from 'next/link';
import { notFound } from 'next/navigation';
import { detectCircles, suggestIntros } from '@/lib/graph/circles';
import { edgesAmong } from '@/lib/graph/edges';
import { snapshot, personLabel } from '@/lib/data';
import { getViewerId } from '@/lib/viewer';
import CircleWeb from '@/components/CircleWeb';
import YouShouldMeet from '@/components/YouShouldMeet';

export const dynamic = 'force-dynamic';

export default async function CirclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = detectCircles().find((x) => x.id === id);
  if (!c) notFound();
  const viewerId = await getViewerId();
  const s = snapshot();
  const inCircle = new Set([...c.people, ...c.projects]);
  // core members: most ties inside the circle (projects built here + connections to other members)
  const ranked = c.people
    .filter((p) => s.person.get(p)!.claimed)
    .map((p) => {
      const projects = (s.projectsOf.get(p) ?? []).filter((m) => inCircle.has(m.project_id)).length;
      const conns = s.connections.filter((x) => (x.from_person === p && inCircle.has(x.to_person)) || (x.to_person === p && inCircle.has(x.from_person))).length;
      return { p, ties: projects * 2 + conns };
    })
    .sort((a, b) => b.ties - a.ties)
    .slice(0, 12);
  const maxT = Math.max(1, ...ranked.map((r) => r.ties));
  const members = ranked.map((r, i) => {
    const person = s.person.get(r.p)!;
    const projects = (s.projectsOf.get(r.p) ?? []).filter((m) => inCircle.has(m.project_id)).map((m) => s.project.get(m.project_id)!).map((p) => ({ id: p.id, name: p.name, year: p.year }));
    return {
      id: person.id, name: person.name, label: personLabel(person), type: person.type, score: Math.round((0.35 + 0.65 * (r.ties / maxT)) * 1000) / 1000,
      rank: i + 1, ring: (i < 3 ? 1 : i < 7 ? 2 : 3) as 1 | 2 | 3, short: `${r.ties} ties inside the circle · ${projects.slice(0, 2).map((p) => p.name).join(', ')}`, projects,
    };
  });
  const intros = suggestIntros(viewerId, 3, c.people).map((i) => ({ ...i, label: personLabel(s.person.get(i.personId)!) }));
  const projects = c.projects.map((p) => s.project.get(p)!).sort((a, b) => b.year - a.year);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link href="/circles" className="text-sm text-navy/70 hover:text-navy">← All circles</Link>
      <h1 className="mt-2 text-3xl font-bold text-navy">{c.name}</h1>
      <p className="mt-1 text-sm text-ink/70">{c.people.length} people · {c.projects.length} projects · {c.topSkills.join(', ')}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="card min-w-0 p-4">
          <h2 className="text-lg font-bold text-navy">Core members</h2>
          <p className="text-xs text-ink/60">Closer to the center = more projects and connections inside this circle.</p>
          <CircleWeb name={c.name} members={members} edges={edgesAmong(members.map((m) => m.id))} />
        </section>
        <div className="space-y-6">
          <YouShouldMeet intros={intros} title="You should meet, in this circle" compact />
          <section className="card p-5">
            <h2 className="text-lg font-bold text-navy">Projects</h2>
            <ul className="mt-2 max-h-80 space-y-1 overflow-y-auto text-sm">
              {projects.map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <Link href={`/projects/${encodeURIComponent(p.id)}`} className="text-navy hover:underline">{p.name}</Link>
                  <span className="shrink-0 text-xs text-ink/50">{p.team_type} · {p.year}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
