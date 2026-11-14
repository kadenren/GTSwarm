import { cookies } from 'next/headers';
import { getDb } from './db';

export const VIEWERS = [
  { id: 'person:p001', label: 'Leo Martinez', sub: 'PulseBand student' },
  { id: 'person:p008', label: 'Elena Brooks', sub: 'Alum founder' },
  { id: 'person:p005', label: 'Dana Whitfield', sub: 'Alum' },
] as const;
export const DEFAULT_VIEWER = VIEWERS[0].id;
export const VIEWER_COOKIE = 'gtswarm_viewer';

/** The demo identity. Any real person can be the viewer (for example someone who just joined); unknown ids fall back to Leo. */
export async function getViewerId(): Promise<string> {
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
