import { snapshot } from './data';
import { listGroups, type GroupView } from './community';
import { contactPrefsOf, visibleTo, canRequest } from './people';

/**
 * Communities ("Swarm Circles"): curated groups of Yellow Jackets with something in common.
 * Suggestions use only what the member has shared: a city they chose to show, interests they listed, or career stage.
 * With nothing to go on, we say "Browse communities" instead of pretending to personalize.
 */

const CITY_CIRCLES: Record<string, string> = { 'group:g04': 'Seattle' };
const EARLY_CAREER = 'group:g06';

export interface Suggestion { circle: GroupView; reason: string }

export function suggestCircles(viewerId: string): Suggestion[] {
  const s = snapshot();
  const me = s.person.get(viewerId);
  if (!me) return [];
  const prefs = contactPrefsOf(viewerId);
  const mine = new Map([...prefs.interests, ...(s.skillsOf.get(viewerId) ?? [])].map((x) => [x.toLowerCase(), x]));
  const recentGrad = me.type === 'student' || (me.type === 'alum' && new Date().getFullYear() - me.grad_year <= 3);
  const out: (Suggestion & { score: number })[] = [];
  for (const c of listGroups(viewerId)) {
    if (c.standing === 'ineligible') continue;
    const city = CITY_CIRCLES[c.id];
    if (city && prefs.shareCity && me.city === city) { out.push({ circle: c, reason: `You selected ${city}.`, score: 3 }); continue; }
    const shared = c.interests.map((t) => mine.get(t.toLowerCase())).filter(Boolean) as string[];
    if (shared.length) { out.push({ circle: c, reason: `Suggested because you listed ${shared.slice(0, 2).join(' and ')}.`, score: 1 + shared.length }); continue; }
    if (c.id === EARLY_CAREER && recentGrad) out.push({ circle: c, reason: me.type === 'student' ? 'Suggested because you are a current student.' : `Suggested because you graduated in ${me.grad_year}.`, score: 1 });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 3).map(({ circle, reason }) => ({ circle, reason }));
}

/** Members of a community the viewer may see and contact, people who welcome requests first. */
export function circleMembers(viewerId: string, circleId: string, limit = 6) {
  const s = snapshot();
  const c = listGroups(viewerId).find((g) => g.id === circleId);
  if (!c?.members) return [];
  return c.members
    .map((m) => s.person.get(m.id)!)
    .filter((p) => p && visibleTo(viewerId, p))
    .map((p) => ({ p, ok: canRequest(viewerId, p.id, 'meet').ok }))
    .sort((a, b) => Number(b.ok) - Number(a.ok))
    .slice(0, limit)
    .map(({ p, ok }) => ({ id: p.id, name: p.name, type: p.type, line: `${p.type === 'alum' ? `Alum '${String(p.grad_year).slice(2)}` : 'Student'}${p.current_role ? ` · ${p.current_role}` : ''}`, city: contactPrefsOf(p.id).shareCity ? p.city : null, canMeet: ok }));
}
