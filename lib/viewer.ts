import { cookies } from 'next/headers';

export const VIEWERS = [
  { id: 'person:p001', label: 'Leo Martinez', sub: 'PulseBand student' },
  { id: 'person:p008', label: 'Elena Brooks', sub: 'Alum founder' },
  { id: 'person:p005', label: 'Dana Whitfield', sub: 'Alum' },
] as const;
export const DEFAULT_VIEWER = VIEWERS[0].id;
export const VIEWER_COOKIE = 'gtswarm_viewer';

export async function getViewerId(): Promise<string> {
  const c = (await cookies()).get(VIEWER_COOKIE)?.value;
  return VIEWERS.some((v) => v.id === c) ? c! : DEFAULT_VIEWER;
}
