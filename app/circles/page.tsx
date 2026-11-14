import Link from 'next/link';
import { detectCircles, circleOf, suggestIntros } from '@/lib/graph/circles';
import { snapshot, personLabel } from '@/lib/data';
import { getViewerId } from '@/lib/viewer';
import YouShouldMeet from '@/components/YouShouldMeet';
import PageHero from '@/components/PageHero';

export const dynamic = 'force-dynamic';

export default async function CirclesPage() {
  const viewerId = await getViewerId();
  const s = snapshot();
  const circles = detectCircles();
  const mine = circleOf(viewerId);
  const intros = suggestIntros(viewerId).map((i) => ({ ...i, label: personLabel(s.person.get(i.personId)!) }));
  return (
    <>
      <PageHero eyebrow="Circles" title="Communities that formed on their own" subtitle="Detected with Louvain community detection on the graph of people, projects and skills. Nobody signs up for a circle; it emerges from what people built together." />
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div><YouShouldMeet intros={intros} title={`You should meet${mine ? ` (from ${mine.name})` : ''}`} /></div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {circles.map((c) => {
          const alumni = c.people.filter((p) => s.person.get(p)!.type === 'alum').length;
          return (
            <li key={c.id}>
              <Link href={`/circles/${c.id}`} className={`card block h-full p-5 transition hover:border-gold hover:shadow-md ${mine?.id === c.id ? 'border-gold ring-2 ring-gold/30' : ''}`}>
                {mine?.id === c.id && <span className="tag mb-2 bg-gold/20 text-gold-dark">Your circle</span>}
                <h2 className="font-display text-xl font-bold text-navy">{c.name}</h2>
                <p className="mt-1 text-sm text-ink/70">{c.people.length} people ({alumni} alumni, {c.people.length - alumni} students) · {c.projects.length} projects</p>
                <div className="mt-3 flex flex-wrap gap-1">{c.topSkills.map((k) => <span key={k} className="tag">{k}</span>)}</div>
                <div className="mt-3 flex -space-x-2">
                  {c.people.slice(0, 10).map((p) => {
                    const person = s.person.get(p)!;
                    return <span key={p} title={person.name} className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white ${person.type === 'alum' ? 'bg-teal' : 'bg-plum'}`}>{person.name.split(' ').map((w) => w[0]).join('')}</span>;
                  })}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
    </>
  );
}
