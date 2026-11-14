import SearchClient from '@/components/SearchClient';
import PageHero from '@/components/PageHero';
import { viewerContext } from '@/lib/context';
import { snapshot } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** Get Unstuck: one search over problems the community has already solved, and the people who solved them. */
export default async function StuckPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { me, projects } = await viewerContext();
  const s = snapshot();
  return (
    <>
      <PageHero eyebrow="Get unstuck" title="I'm stuck on a problem"
        subtitle={`Someone at Georgia Tech has probably hit this before. Describe the problem and GT Swarm finds who solved it, from ${s.problems.length} solved problems on record.`} />
      <div className="pt-6">
        <SearchClient kind="stuck" aiPolish={false} viewerName={me.name} viewerProjects={projects}
          suggestions={[{ q: 'Bluetooth disconnects when the microcontroller enters sleep mode' }]}
          initial={{ q: sp.q ?? '', role: 'Helper', audience: sp.aud ?? 'both', log: '' }} />
      </div>
    </>
  );
}
