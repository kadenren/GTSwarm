import { getDb, bumpDataVersion } from './db';
import { snapshot, ROLES, type Role } from './data';
import { ActionError } from './actions';

/**
 * What a builder is here for. Stored only when the person saves it; until then it is derived from
 * what they already told us (the roles they are open to and the builds they own), never invented.
 */
export const INTERESTS = [
  { v: 'explore', l: 'Exploring startups' },
  { v: 'cofounders', l: 'Looking for cofounders' },
  { v: 'join', l: 'Looking for a startup to join' },
  { v: 'advise', l: 'Open to advising' },
  { v: 'collaborate', l: 'Open to technical collaboration' },
  { v: 'invest', l: 'Interested in investment opportunities' },
] as const;
export type Interest = (typeof INTERESTS)[number]['v'];
const VALID = new Set<string>(INTERESTS.map((i) => i.v));

import { ROLE_LABEL } from './roles';
export { ROLE_LABEL };

export interface Prefs { interests: Interest[]; lookingFor: string; saved: boolean }

export function prefsOf(personId: string): Prefs {
  const row = getDb().prepare('SELECT interests, looking_for FROM person_pref WHERE person_id = ?').get(personId) as { interests: string; looking_for: string } | undefined;
  if (row) return { interests: (JSON.parse(row.interests) as string[]).filter((x): x is Interest => VALID.has(x)), lookingFor: row.looking_for, saved: true };
  const s = snapshot();
  const p = s.person.get(personId);
  if (!p) return { interests: [], lookingFor: '', saved: false };
  const ownsOpenBuild = getDb().prepare('SELECT 1 FROM project_status WHERE owner_id = ? AND open_to_collab = 1 LIMIT 1').get(personId);
  const interests = new Set<Interest>(['explore']);
  if (ownsOpenBuild) interests.add('cofounders');
  if (p.open_to.includes('Cofounder') || p.open_to.includes('Early engineer')) interests.add('join');
  if (p.open_to.includes('Advisor')) interests.add('advise');
  if (p.open_to.includes('Helper')) interests.add('collaborate');
  return { interests: [...interests], lookingFor: '', saved: false };
}

/** A grounded one-line "what they want to work on", from their own words or their stated roles and record. */
export function wantsLine(personId: string): string {
  const s = snapshot();
  const p = s.person.get(personId);
  if (!p) return '';
  const pr = prefsOf(personId);
  if (pr.lookingFor.trim()) return pr.lookingFor.trim();
  const roles = p.open_to.map((r) => ROLE_LABEL[r].toLowerCase());
  const areas = (s.skillsOf.get(personId) ?? []).slice(0, 2);
  if (!roles.length) return areas.length ? `Exploring ${areas.join(' and ')} startups` : 'Exploring GT startups';
  return `Open to ${roles.length > 1 ? roles.slice(0, -1).join(', ') + ' or ' + roles.at(-1) : roles[0]} roles${areas.length ? ` in ${areas.join(' and ')}` : ''}`;
}

export function savePrefs(personId: string, input: { interests: string[]; lookingFor: string; openTo: string[]; hours: number }) {
  const s = snapshot();
  if (!s.person.get(personId)) throw new ActionError('Unknown person.', 404);
  const interests = [...new Set(input.interests.filter((x) => VALID.has(x)))];
  const openTo = [...new Set(input.openTo.filter((r) => ROLES.includes(r as Role)))];
  const hours = Math.max(0, Math.min(40, Math.round(Number(input.hours) || 0)));
  const lookingFor = String(input.lookingFor ?? '').trim().slice(0, 280);
  const db = getDb();
  db.transaction(() => {
    db.prepare('INSERT INTO person_pref (person_id, interests, looking_for) VALUES (?, ?, ?) ON CONFLICT(person_id) DO UPDATE SET interests = excluded.interests, looking_for = excluded.looking_for')
      .run(personId, JSON.stringify(interests), lookingFor);
    db.prepare('UPDATE people SET open_to = ?, availability_hours = ? WHERE id = ?').run(JSON.stringify(openTo), hours, personId);
  })();
  bumpDataVersion();
  return { ok: true };
}
