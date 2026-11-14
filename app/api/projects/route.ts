import { handle } from '@/lib/api';
import { getViewerId } from '@/lib/viewer';
import { createProject } from '@/lib/actions';
import { snapshot } from '@/lib/data';
import { similarity } from '@/lib/search';

export async function POST(req: Request) {
  const viewerId = await getViewerId();
  const body = await req.json();
  return handle(async () => {
    const { id } = await createProject(viewerId, body);
    // nearest existing projects, so the new node can animate into its neighborhood
    const s = snapshot();
    const p = s.project.get(id)!;
    const { sims } = await similarity(`${p.name} ${p.summary} ${p.technologies.join(' ')}`);
    const neighbors = s.projects.filter((x) => x.id !== id).map((x) => ({ id: x.id, name: x.name, year: x.year, teamType: x.team_type, sim: sims.get(x.id) ?? 0 }))
      .sort((a, b) => b.sim - a.sim).slice(0, 10);
    return { id, name: p.name, teamType: p.team_type, neighbors };
  });
}
