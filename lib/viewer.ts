import { cookies } from 'next/headers';
import { getDb } from './db';
import { ready } from './session';

/** Fictional demo personas across career stages. The first is the default. */
export const VIEWERS = [
  { id: 'person:p008', label: 'Elena Brooks', sub: 'Alumni founder seeking an alumni cofounder (demo)' },
  { id: 'person:p010', label: 'Maya Okafor', sub: 'Upper-year student seeking an internship (demo)' },
  { id: 'person:p005', label: 'Dana Whitfield', sub: 'Alum open to cofounding (demo)' },
  { id: 'person:p177', label: 'Mei Ramirez', sub: 'First-year student looking for a mentor (demo)' },
  { id: 'person:p012', label: 'Sofia Alvarez', sub: 'Student graduating in December (demo)' },
  { id: 'person:p004', label: 'Samuel Grant', sub: 'Experienced alum and mentor (demo)' },
  { id: 'person:p039', label: 'Noah Bennett', sub: 'Recent alum building a network (demo)' },
  { id: 'person:p028', label: 'Amelia Diallo', sub: 'Recent alum, verification pending (demo)' },
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

/** Switcher options: the demo personas plus the current viewer if they joined during the demo. */
export function viewerOptions(currentId: string): { id: string; label: string; sub: string }[] {
  const base = VIEWERS.map((v) => ({ ...v }));
  if (base.some((v) => v.id === currentId)) return base;
  const p = getDb().prepare('SELECT name, type FROM people WHERE id = ?').get(currentId) as { name: string; type: string } | undefined;
  return p ? [...base, { id: currentId, label: p.name, sub: p.type === 'alum' ? 'Alum, joined today' : 'Student, joined today' }] : base;
}
