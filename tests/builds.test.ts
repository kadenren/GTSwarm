import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetFromSeed } from '@/lib/db';
import { snapshot } from '@/lib/data';
import { listBuilds, buildFor, updateBuildStatus } from '@/lib/builds';
import { interpretBuild, recommendBuilds, recommendCollaborators } from '@/lib/matching';
import { sendRequest, acceptRequest, addToProject, addMilestone, ActionError } from '@/lib/actions';
import { rankForProblem } from '@/lib/graph/rank';
import { buildRecord } from '@/lib/project';
import { byName, projectByName } from './helpers';
import { createPerson, saveProfile } from '@/lib/profile';

const count = (sql: string, ...a: unknown[]) => (getDb().prepare(sql).get(...a) as { n: number }).n;

describe('startup exchange: discovery and collaboration', () => {
  beforeEach(() => { delete process.env.GEMINI_API_KEY; resetFromSeed(); });

  it('lists active builds with at least five alumni-founded and five student-led open builds', () => {
    const open = listBuilds().filter((b) => b.open);
    expect(open.filter((b) => b.owner?.type === 'alum').length).toBeGreaterThanOrEqual(5);
    expect(open.filter((b) => b.owner?.type === 'student').length).toBeGreaterThanOrEqual(5);
    for (const b of open) {
      expect(['Idea', 'Prototype', 'Testing', 'Pilot', 'Launched']).toContain(b.stage);
      expect(b.rolesNeeded.length).toBeGreaterThan(0);
      expect(b.helpNeeded.length).toBeGreaterThan(10);
    }
    const restwell = buildFor(projectByName('Restwell Patch'))!;
    expect(restwell.owner?.name).toBe('Elena Brooks');
    expect(restwell.open).toBe(true);
  });

  it('interprets a plain-language build description', () => {
    const i = interpretBuild("I'm building a wearable medical device startup and need someone experienced in embedded firmware and FDA regulation.");
    expect(i.roles).toEqual(expect.arrayContaining(['Advisor', 'Early engineer']));
    expect(i.domains).toEqual(expect.arrayContaining(['Wearables', 'Medical devices']));
    expect(i.building).toMatch(/wearable medical device startup/);
  });

  it("recommends alumni and student collaborators for an alumni founder's build", async () => {
    const recs = await recommendCollaborators(projectByName('Restwell Patch'), byName('Elena Brooks'));
    const advisors = recs.find((r) => r.role === 'Advisor')!.people.map((p) => p.name);
    const engineers = recs.find((r) => r.role === 'Early engineer')!.people.map((p) => p.name);
    expect(advisors[0]).toBe('Priya Natarajan');
    expect(engineers).toEqual(expect.arrayContaining(['Maya Okafor']));
    for (const r of recs) for (const p of r.people) { expect(p.reasons.length).toBeGreaterThan(0); expect(p.description.full.length).toBeGreaterThan(20); }
  });

  it('recommends an alumni-founded build to a student, with reasons', async () => {
    const maya = byName('Maya Okafor');
    const recs = await recommendBuilds({ viewerId: maya, personId: maya, limit: 5 });
    const restwell = recs.find((r) => r.build.name === 'Restwell Patch');
    expect(restwell).toBeDefined();
    expect(restwell!.build.owner?.type).toBe('alum');
    expect(restwell!.matchedRoles).toContain('Early engineer');
    expect(restwell!.reasons.length).toBeGreaterThan(0);
    expect(recs.every((r) => !snapshot().membersOf.get(r.build.id)!.some((m) => m.person_id === maya))).toBe(true);
  });

  it('matches "I want to build something" descriptions to builds that need those skills', async () => {
    const recs = await recommendBuilds({ viewerId: byName('Isabel Moreno'), text: "I'm an electrical engineering student interested in robotics, embedded systems, and autonomous vehicles.", limit: 3 });
    expect(recs.map((r) => r.build.name)).toEqual(expect.arrayContaining(['AutoNav Campus Shuttle']));
    expect(recs.some((r) => r.build.owner?.type === 'alum')).toBe(true);
    for (const r of recs) expect(r.why.length).toBeGreaterThan(20);
  });

  it('collaboration request: student asks, owner accepts (connection only), membership is a separate owner step', () => {
    const maya = byName('Maya Okafor'), elena = byName('Elena Brooks'), restwell = projectByName('Restwell Patch');
    const { id } = sendRequest({ from: maya, to: elena, kind: 'expertise', role: 'Early engineer', message: 'I write wearable firmware.', projectId: restwell });
    const conns = count('SELECT COUNT(*) n FROM connections');
    expect(() => acceptRequest(id, maya)).toThrow(ActionError);
    acceptRequest(id, elena);
    expect(count('SELECT COUNT(*) n FROM connections')).toBe(conns + 1);
    expect(snapshot().membersOf.get(restwell)!.some((m) => m.person_id === maya)).toBe(false); // accepting does not add anyone
    expect(() => addToProject(id, maya, 'Early engineer')).toThrow(ActionError); // only the owner can add
    addToProject(id, elena, 'Early engineer');
    expect(snapshot().membersOf.get(restwell)!.find((m) => m.person_id === maya)?.title).toBe('Early engineer');
  });

  it('the build blocker finds Marcus, and a simulated milestone is labeled in the build record', async () => {
    const out = await rankForProblem('Bluetooth disconnects when the microcontroller enters sleep mode', byName('Elena Brooks'));
    expect(out.results[0].name).toBe('Marcus Reyes');
    const restwell = projectByName('Restwell Patch');
    const before = buildRecord(restwell);
    expect(before.every((e) => !e.simulated)).toBe(true);
    addMilestone({ viewerId: byName('Elena Brooks'), projectId: restwell, title: 'BLE sleep fix verified on the bench', helperId: byName('Marcus Reyes') });
    const added = buildRecord(restwell).find((e) => e.title.includes('BLE sleep fix'));
    expect(added?.simulated).toBe(true);
    expect(added?.title).toMatch(/Help from Marcus Reyes/);
  });

  it('only the team can update a build status', () => {
    const restwell = projectByName('Restwell Patch');
    expect(() => updateBuildStatus(byName('Maya Okafor'), restwell, { stage: 'Launched', open: true, roles: [], help: '' })).toThrow(ActionError);
    updateBuildStatus(byName('Elena Brooks'), restwell, { stage: 'Testing', open: true, roles: ['Early engineer'], help: 'Firmware help wanted.' });
    expect(buildFor(restwell)!.stage).toBe('Testing');
  });
});

describe('alumni join and get matched both ways', () => {
  beforeEach(() => { delete process.env.GEMINI_API_KEY; resetFromSeed(); });

  it('a newly joined alum is recommended Restwell, and Restwell sees her as a collaborator', async () => {
    const id = createPerson({ name: 'Test Alum Firmware', type: 'alum', major: 'Electrical Engineering', grad_year: 2014 });
    await saveProfile(id, {
      bio: 'Firmware lead for BLE wearables. Fixed BLE disconnects during MCU sleep on nRF52 and doubled battery life on a medical wearable.',
      major: 'Electrical Engineering', grad_year: 2014, current_role: 'Firmware lead at a wearables company',
      skills: ['nRF52', 'BLE', 'Embedded C', 'Low-power firmware', 'Wearables'], projects: [],
      open_to: ['Early engineer', 'Helper', 'Advisor'], availability_hours: 3, addProjects: [],
    });
    const restwell = projectByName('Restwell Patch', 2024);
    const builds = await recommendBuilds({ viewerId: id, personId: id, limit: 6 });
    expect(builds.map((b) => b.build.id)).toContain(restwell);
    const recs = await recommendCollaborators(restwell, byName('Elena Brooks'), 5, { ai: false });
    expect(recs.flatMap((r) => r.people.map((p) => p.personId))).toContain(id);
  });
});
