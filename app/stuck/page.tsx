import SearchClient from '@/components/SearchClient';
import ScoutPanel from '@/components/ScoutPanel';
import StuckTabs from '@/components/StuckTabs';
import PageHero from '@/components/PageHero';
import { viewerContext } from '@/lib/context';
import { snapshot } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function StuckPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { me, projects } = await viewerContext();
  const s = snapshot();
  return (
    <>
      <PageHero eyebrow="Get unstuck" title="I'm stuck on a problem"
        subtitle={`Someone at Georgia Tech has probably hit this before. GT Swarm indexes ${s.problems.length} solved problems and the ${s.people.filter((p) => p.claimed).length} builders who solved them.`} />
      <StuckTabs
        initial={sp.q ? 'web' : 'scout'}
        scout={<ScoutPanel webAvailable={!!process.env.ANTHROPIC_API_KEY} initialNeed={sp.scout ?? ''} />}
        web={
          <SearchClient kind="stuck" aiPolish={!!process.env.ANTHROPIC_API_KEY} viewerName={me.name} viewerProjects={projects}
            suggestions={[{ q: "Bluetooth drops when the sensor sleeps" }]}
            initial={{ q: sp.q ?? '', role: 'Helper', audience: sp.aud ?? 'both', log: '' }} />
        }
      />
    </>
  );
}
