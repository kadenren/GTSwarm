import PageHero from '@/components/PageHero';
import MatchFinder from '@/components/MatchFinder';
import { viewerContext } from '@/lib/context';
import { listBuilds } from '@/lib/builds';
import { snapshot } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** Find Matches: founder → people, and person → startups, on one page. */
export default async function MatchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { id, me, projects } = await viewerContext();
  const s = snapshot();
  // builds the viewer is on (not as an advisor) can be attached to an invite
  const ownedBuilds = listBuilds().filter((b) => (s.membersOf.get(b.id) ?? []).some((m) => m.person_id === id && m.role !== 'advisor')).map((b) => ({ id: b.id, name: b.name }));
  const mode = sp.mode === 'startups' || sp.mode === 'join' ? 'startups' : 'people';
  return (
    <>
      <PageHero eyebrow="Find matches" title="Find your next cofounder, collaborator, or startup."
        subtitle="Describe what you are building and who you need, or what you can offer. GT Swarm matches what one person needs with what another can do, and shows why." />
      <MatchFinder initialMode={mode} initialQuery={sp.q ?? ''} initialRole={sp.role ?? 'any'} initialAudience={sp.aud ?? 'both'}
        viewer={{ name: me.name, type: me.type, openTo: me.open_to }} viewerProjects={projects} ownedBuilds={ownedBuilds} />
    </>
  );
}
