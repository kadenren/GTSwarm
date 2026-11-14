import PageHero from '@/components/PageHero';
import MySwarmWeb from '@/components/MySwarmWeb';
import { getViewerId } from '@/lib/viewer';
import { mySwarm } from '@/lib/graph/myswarm';

export const dynamic = 'force-dynamic';

export default async function MySwarmPage() {
  const viewerId = await getViewerId();
  const data = await mySwarm(viewerId);
  if (!data) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-ink/60">Create your profile to see your swarm.</div>;
  return (
    <>
      <PageHero eyebrow="My swarm" title={`Everyone and everything around ${data.me.name.split(' ')[0]}`}
        subtitle={`The people and projects that relate to you most, placed by how closely: ${data.counts.people} people and ${data.counts.projects} projects, ${data.counts.matches} of them matched to what you can do${data.myBuild ? ` or what ${data.myBuild.name} needs` : ''}. Closer to the center means closer to you.`} />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <MySwarmWeb me={data.me} nodes={data.nodes} edges={data.edges} />
      </div>
    </>
  );
}
