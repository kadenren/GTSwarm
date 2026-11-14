import { snapshot } from './data';
import { getViewerId } from './viewer';

export async function viewerContext() {
  const id = await getViewerId();
  const s = snapshot();
  const me = s.person.get(id)!;
  const projects = (s.projectsOf.get(id) ?? [])
    .filter((m) => m.role !== 'advisor')
    .map((m) => s.project.get(m.project_id)!)
    .sort((a, b) => b.year - a.year)
    .map((p) => ({ id: p.id, name: p.name, year: p.year }));
  return { id, me, projects };
}
