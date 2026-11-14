import { cookies } from 'next/headers';
import { getDb } from './db';
import { ready } from './session';

/** The fictional demo personas a visitor can switch between. */
export const VIEWERS = [
  { id: 'person:p008', label: 'Elena Brooks', sub: 'Alumni founder (demo)' },
  { id: 'person:p010', label: 'Maya Okafor', sub: 'Student looking for startups (demo)' },
  { id: 'person:p005', label: 'Dana Whitfield', sub: 'Alumni cofounder candidate (demo)' },
  { id: 'person:p223', label: 'Tara Holloway', sub: 'Alumni founder who solved a hospital security review (demo)' },
] as const;
export const DEFAULT_VIEWER = VIEWERS[0].id;
export const VIEWER_COOKIE = 'gtswarm_viewer';

/** The demo identity: a persona, or someone who joined during this visitor's session. Unknown ids fall back to Elena. */
export async function getViewerId(): Promise<string> {
  await ready();
  const c = (await cookies()).get(VIEWER_COOKIE)?.value;
  if (!c) return DEFAULT_VIEWER;
  if (VIEWERS.some((v) => v.id === c)) return c;
  const row = getDb().prepare('SELECT id FROM people WHERE id = ?').get(c) as { id: string } | undefined;
  return row ? row.id : DEFAULT_VIEWER;
}

/** Switcher options: the three demo personas plus the current viewer if they joined during the demo. */
export function viewerOptions(currentId: string): { id: string; label: string; sub: string }[] {
  const base = VIEWERS.map((v) => ({ ...v }));
  if (base.some((v) => v.id === currentId)) return base;
  const p = getDb().prepare('SELECT name, type FROM people WHERE id = ?').get(currentId) as { name: string; type: string } | undefined;
  return p ? [...base, { id: currentId, label: p.name, sub: p.type === 'alum' ? 'Alum, joined today' : 'Student, joined today' }] : base;
}
