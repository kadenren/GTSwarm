import { snapshot } from '@/lib/data';

import NetworkExplorer from '@/components/NetworkExplorer';

export const dynamic = 'force-dynamic';

export default function GraphPage() {
  const s = snapshot();
  const pulse = s.projects.find((p) => p.name === 'PulseBand')!;
  const dana = s.people.find((p) => p.name === 'Dana Whitfield')!;
  return (
    <div className="bg-navy">
      <div className="mx-auto max-w-[1600px] px-4 py-6">
        <h1 className="text-3xl font-bold text-white">Network explorer</h1>
        <p className="mb-4 mt-1 text-sm text-white/70">The whole swarm: projects colored by team type, people as rings, skills as small dots. Pick two nodes to light up the warm path between them, and slide through the years to watch the swarm grow.</p>
        <NetworkExplorer defaultFrom={pulse.id} defaultTo={dana.id} />
      </div>
    </div>
  );
}
