import SearchClient from '@/components/SearchClient';
import PageHero from '@/components/PageHero';
import { viewerContext } from '@/lib/context';
import { snapshot } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** Find People: search by the role you are filling; results show what each person actually built and how you are connected. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { me, projects } = await viewerContext();
  const s = snapshot();
  const suggestions =
    me.type === 'student'
      ? [{ q: 'low-power embedded hardware, has shipped a product', role: 'Cofounder', audience: 'both' }]
      : [
          { q: 'FDA approval for a wearable medical device', role: 'Advisor', audience: 'both' },
          { q: 'wearable firmware', role: 'Early engineer', audience: 'students', label: 'wearable firmware (Early engineer, students)' },
        ];
  return (
    <>
      <PageHero eyebrow="Find people" title="Who at GT can help build what you're building?"
        subtitle={`Search ${s.people.filter((p) => p.claimed).length} alumni and students by what they actually did. Pick the role you are filling and see how you are connected.`} />
      <SearchClient kind="expertise" aiPolish={false} viewerName={me.name} viewerProjects={projects} suggestions={suggestions}
        initial={{ q: sp.q ?? '', role: sp.role ?? 'Cofounder', audience: sp.aud ?? 'both', log: '' }} />
    </>
  );
}
