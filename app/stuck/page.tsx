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

/** Get Unstuck: one search over problems the community has already solved, and the people who solved them. */
export default async function StuckPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { me, projects } = await viewerContext();
  const s = snapshot();
  return (
    <>
      <PageHero eyebrow="Get unstuck" title={<>Hit a wall? <span className="text-gold">Someone at GT already got past it.</span></>}
        subtitle={`Not every connection is a hire. Describe the problem in plain words, a bug, a security review, a fundraising question, and GT Swarm finds the students and alumni who solved it, from ${s.problems.length} solved problems on record.`} />
      <div className="pt-6">
        <SearchClient kind="stuck" viewerName={me.name} viewerProjects={projects}
          suggestions={STUCK_EXAMPLES}
          initial={{ q: sp.q ?? '', role: 'Helper', audience: sp.aud ?? 'both' }} />
      </div>
    </>
  );
}
