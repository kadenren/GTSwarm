import SearchClient from '@/components/SearchClient';
import PageHero from '@/components/PageHero';
import { geminiEnabled } from '@/lib/gemini';
import { viewerContext } from '@/lib/context';
import { suggestIntros } from '@/lib/graph/circles';
import { snapshot, personLabel } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { me, projects } = await viewerContext();
  const s = snapshot();
  const intros = suggestIntros(me.id).map((i) => ({ ...i, label: personLabel(s.person.get(i.personId)!) }));
  const suggestions =
    me.type === 'student'
      ? [{ q: 'low-power embedded hardware, has shipped a product', role: 'Cofounder', audience: 'both' }]
      : [
          { q: 'FDA approval for a wearable medical device', role: 'Advisor', audience: 'both' },
          { q: 'wearable firmware', role: 'Early engineer', audience: 'students', label: 'wearable firmware (Early engineer, students)' },
        ];
  return (
    <>
      <PageHero eyebrow="Find expertise" title="Who at GT has built what you need?"
        subtitle={`Search ${s.projects.length} projects and ${s.people.filter((p) => p.claimed).length} builders by what they actually did. Pick the role you are filling and see how you are connected.`} />
      <SearchClient kind="expertise" aiPolish={geminiEnabled() || !!process.env.ANTHROPIC_API_KEY} intros={intros} viewerName={me.name} viewerProjects={projects} suggestions={suggestions}
        initial={{ q: sp.q ?? '', role: sp.role ?? 'Cofounder', audience: sp.aud ?? 'both', log: '' }} />
    </>
  );
}
