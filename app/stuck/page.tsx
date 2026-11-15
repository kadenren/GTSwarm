import SearchClient from '@/components/SearchClient';
import PageHero from '@/components/PageHero';
import { viewerContext } from '@/lib/context';
import { snapshot } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** Example problems across engineering, security, fundraising and the founder side. */
const STUCK_EXAMPLES = [
  { q: 'Bluetooth disconnects when the microcontroller enters sleep mode', label: 'Bluetooth drops when the chip sleeps' },
  { q: 'Hospital IT security review stalled our pilot', label: 'Hospital security review stalled our pilot' },
  { q: 'Investors want clinical evidence before our pre-seed round', label: 'Investors want evidence before pre-seed' },
  { q: 'Splitting equity with a cofounder who joined late', label: 'Splitting equity with a late cofounder' },
  { q: 'Preparing an FDA 510(k) submission for a wearable', label: 'FDA 510(k) for a wearable' },
];

/** Get Unstuck: describe a problem, find who can help based on their record and experience, and see how you are connected. */
export default async function StuckPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { me, projects } = await viewerContext();
  const s = snapshot();
  return (
    <>
      <PageHero eyebrow="Get unstuck" title={<>Stuck? <span className="text-gold">Find who can help you solve it.</span></>}
        subtitle={`Describe the problem in plain words. GT Swarm finds alumni and students who have worked on similar issues before (in their projects, roles and ${s.problems.length} problems on record) and maps how you're connected, so the connection starts from shared experience.`} />
      <div className="pt-6">
        <SearchClient kind="stuck" viewerName={me.name} viewerProjects={projects}
          suggestions={STUCK_EXAMPLES}
          initial={{ q: sp.q ?? '', role: 'Helper', audience: sp.aud ?? 'both' }} />
      </div>
    </>
  );
}
