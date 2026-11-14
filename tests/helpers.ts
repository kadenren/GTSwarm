import { snapshot } from '@/lib/data';
export const byName = (name: string) => {
  const p = snapshot().people.find((x) => x.name === name);
  if (!p) throw new Error(`No person named ${name}`);
  return p.id;
};
export const projectByName = (name: string, year?: number) => {
  const p = snapshot().projects.find((x) => x.name === name && (year === undefined || x.year === year));
  if (!p) throw new Error(`No project ${name}`);
  return p.id;
};
