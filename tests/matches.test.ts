import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb, resetFromSeed } from '@/lib/db';
import { snapshot } from '@/lib/data';
import { rankForExpertise } from '@/lib/graph/rank';
import { recommendBuilds } from '@/lib/matching';
import { runSearch } from '@/lib/searchApi';
import { sendRequest, acceptRequest, declineRequest, addToProject, ActionError } from '@/lib/actions';
import { prefsOf, savePrefs } from '@/lib/prefs';
import { demoToolsEnabled } from '@/lib/demoMode';
import { byName, projectByName } from './helpers';

const count = (sql: string, ...a: unknown[]) => (getDb().prepare(sql).get(...a) as { n: number }).n;
const SCENE2 = "I'm building a wearable medical device startup and need an alumni cofounder with embedded hardware or medical-device expertise.";
const SCENE4 = "I'm a computer engineering student interested in embedded systems, wearable devices, and early-stage hardware startups.";

describe('Find Matches: eligibility', () => {
  beforeEach(() => { delete process.env.GEMINI_API_KEY; resetFromSeed(); });

  it('a chosen role is an eligibility check: everyone returned said they are open to it', async () => {
    for (const role of ['Cofounder', 'Advisor', 'Early engineer', 'Helper'] as const) {
      const out = await rankForExpertise('embedded hardware for a wearable', role, byName('Elena Brooks'), 'both', { ai: false, requireRole: true });
      expect(out.results.length).toBeGreaterThan(0);
      for (const r of out.results) expect(r.openTo).toContain(role);
    }
  });

  it('the audience filter returns only alumni or only students, and never the viewer', async () => {
    const elena = byName('Elena Brooks');
    const alumni = await rankForExpertise(SCENE2, 'Cofounder', elena, 'alumni', { ai: false, requireRole: true });
    expect(alumni.results.every((r) => r.type === 'alum' && r.personId !== elena)).toBe(true);
    const students = await rankForExpertise('wearable firmware', 'Early engineer', elena, 'students', { ai: false, requireRole: true });
    expect(students.results.every((r) => r.type === 'student')).toBe(true);
  });

  it('startup recommendations from a profile only include startups seeking a role the person is open to', async () => {
    const maya = byName('Maya Okafor');
    const open = new Set(snapshot().person.get(maya)!.open_to);
    const out = await recommendBuilds({ viewerId: maya, personId: maya, requireRoles: true, limit: 9 });
    expect(out.length).toBeGreaterThan(0);
    for (const m of out) expect(m.build.rolesNeeded.some((r) => open.has(r))).toBe(true);
  });
});

describe('Find Matches: both directions', () => {
  beforeEach(() => { delete process.env.GEMINI_API_KEY; resetFromSeed(); });

  it('founder → people (alum to alum): an alumni cofounder search puts Dana Whitfield near the top', async () => {
    const out = await runSearch(byName('Elena Brooks'), { kind: 'expertise', match: true, query: SCENE2, role: 'Cofounder', audience: 'alumni' });
    expect(out.results.slice(0, 3).map((r) => r.name)).toContain('Dana Whitfield');
  });

  it('founder → people (alum to student): student engineers with firmware work lead', async () => {
    const out = await runSearch(byName('Elena Brooks'), { kind: 'expertise', match: true, query: 'wearable firmware engineer', role: 'Early engineer', audience: 'students' });
    const top = out.results.slice(0, 3).map((r) => r.name);
    expect(top).toContain('Maya Okafor');
    expect(out.results.every((r) => r.type === 'student')).toBe(true);
  });

  it('person → startups (student to alum): Restwell Patch is a leading recommendation for the scene-4 description', async () => {
    const maya = byName('Maya Okafor');
    const out = await recommendBuilds({ viewerId: maya, personId: maya, text: SCENE4, limit: 6 });
    expect(out.slice(0, 3).map((m) => m.build.name)).toContain('Restwell Patch');
  });

  it('explanations are grounded: matched skills are on the person’s record and the reason names their own work', async () => {
    const s = snapshot();
    const out = await runSearch(byName('Elena Brooks'), { kind: 'expertise', match: true, query: SCENE2, role: 'Cofounder', audience: 'alumni' });
    for (const r of out.results.slice(0, 5)) {
      const skills = s.skillsOf.get(r.personId) ?? [];
      for (const k of r.matchedSkills) expect(skills).toContain(k);
      const own = [...(s.projectsOf.get(r.personId) ?? []).map((m) => s.project.get(m.project_id)!.name), ...(s.problemsBy.get(r.personId) ?? []).map((p) => p.description)];
      const mentionsOwn = own.some((x) => r.why.includes(x)) || (!own.length && r.why.includes('profile close to what you described'));
      expect(mentionsOwn).toBe(true);
      expect(r.why).toMatch(/^(Strong|Good|Possible) match: /);
    }
    const maya = byName('Maya Okafor');
    for (const m of await recommendBuilds({ viewerId: maya, personId: maya, text: SCENE4, limit: 5 })) {
      for (const k of m.matchedSkills) expect(s.skillsOf.get(maya)).toContain(k);
      expect(m.why).toContain(m.build.name);
    }
  });
});

describe('Invites and requests: permissions', () => {
  beforeEach(() => resetFromSeed());

  it('a founder can invite someone about their own startup, but not about a startup they are not on', () => {
    const elena = byName('Elena Brooks'), dana = byName('Dana Whitfield');
    const restwell = projectByName('Restwell Patch', 2024);
    expect(() => sendRequest({ from: elena, to: dana, kind: 'expertise', role: 'Cofounder', message: 'Hi', projectId: restwell })).not.toThrow();
    const notMine = snapshot().projects.find((p) => !(snapshot().membersOf.get(p.id) ?? []).some((m) => m.person_id === elena || m.person_id === byName('Marcus Reyes')))!;
    expect(() => sendRequest({ from: elena, to: byName('Marcus Reyes'), kind: 'expertise', role: 'Helper', message: 'Hi', projectId: notMine.id })).toThrow(ActionError);
  });

  it('a student request to join persists, only the founder can accept or decline, and accepting adds no one to the team', () => {
    const maya = byName('Maya Okafor'), elena = byName('Elena Brooks'), marcus = byName('Marcus Reyes');
    const restwell = projectByName('Restwell Patch', 2024);
    const { id } = sendRequest({ from: maya, to: elena, kind: 'expertise', role: 'Early engineer', message: 'I would like to join', projectId: restwell });
    expect(count('SELECT COUNT(*) n FROM requests WHERE id = ? AND status = \'sent\'', id)).toBe(1);
    expect(() => acceptRequest(id, maya)).toThrow(ActionError);
    expect(() => acceptRequest(id, marcus)).toThrow(ActionError);
    expect(() => declineRequest(id, marcus)).toThrow(ActionError);
    const members = count('SELECT COUNT(*) n FROM person_project WHERE project_id = ?', restwell);
    acceptRequest(id, elena);
    expect(count('SELECT COUNT(*) n FROM person_project WHERE project_id = ?', restwell)).toBe(members);
    expect(count("SELECT COUNT(*) n FROM connections WHERE source = 'request' AND ((from_person = ? AND to_person = ?) OR (from_person = ? AND to_person = ?))", maya, elena, elena, maya)).toBe(1);
    // membership is a separate step only the owner can take
    expect(() => addToProject(id, maya, 'Early engineer')).toThrow(ActionError);
    addToProject(id, elena, 'Early engineer');
    expect(snapshot().membersOf.get(restwell)!.some((m) => m.person_id === maya)).toBe(true);
  });
});

describe('Profiles and demo tools', () => {
  beforeEach(() => resetFromSeed());
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it('interests are derived from stated roles until saved, then persist; reset clears them', () => {
    const maya = byName('Maya Okafor');
    expect(prefsOf(maya).saved).toBe(false);
    expect(prefsOf(maya).interests).toContain('join');
    savePrefs(maya, { interests: ['explore', 'invest', 'bogus'], lookingFor: 'Health hardware', openTo: ['Advisor', 'Nope'], hours: 99 });
    const p = prefsOf(maya);
    expect(p).toMatchObject({ saved: true, interests: ['explore', 'invest'], lookingFor: 'Health hardware' });
    expect(snapshot().person.get(maya)!.open_to).toEqual(['Advisor']);
    expect(snapshot().person.get(maya)!.availability_hours).toBe(40);
    resetFromSeed();
    expect(prefsOf(maya).saved).toBe(false);
  });

  it('the demo reset is disabled in production unless GTSWARM_DEMO=1', () => {
    const e = process.env as Record<string, string | undefined>;
    e.NODE_ENV = 'production'; delete e.GTSWARM_DEMO;
    expect(demoToolsEnabled()).toBe(false);
    e.GTSWARM_DEMO = '1';
    expect(demoToolsEnabled()).toBe(true);
    e.NODE_ENV = 'test';
    delete e.GTSWARM_DEMO;
    expect(demoToolsEnabled()).toBe(true);
  });
});
