import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetFromSeed } from '@/lib/db';
import { snapshot } from '@/lib/data';
import { sendRequest, acceptRequest, addToProject, logProblem, confirmMilestone, ActionError } from '@/lib/actions';
import { rankForProblem } from '@/lib/graph/rank';
import { impactStats } from '@/lib/impact';
import { byName, projectByName } from './helpers';

const count = (sql: string, ...args: unknown[]) => (getDb().prepare(sql).get(...args) as { n: number }).n;

describe('demo workflow', () => {
  beforeEach(() => resetFromSeed());

  it('accepting a request creates exactly one connection and adds no one to a project', () => {
    const leo = byName('Leo Martinez'), dana = byName('Dana Whitfield'), pulse = projectByName('PulseBand');
    const { id } = sendRequest({ from: leo, to: dana, kind: 'expertise', role: 'Cofounder', message: 'Hi Dana', projectId: pulse });
    const conns = count('SELECT COUNT(*) n FROM connections');
    const members = count('SELECT COUNT(*) n FROM person_project');
    const before = impactStats().byDirection['student to alum'];
    expect(() => acceptRequest(id, leo)).toThrow(ActionError); // only the recipient may accept
    acceptRequest(id, dana);
    expect(count('SELECT COUNT(*) n FROM connections')).toBe(conns + 1);
    expect(count('SELECT COUNT(*) n FROM person_project')).toBe(members);
    expect(snapshot().membersOf.get(pulse)!.some((m) => m.person_id === dana)).toBe(false);
    expect(impactStats().byDirection['student to alum']).toBe(before + 1);
    // joining is a separate, explicit step by the project owner
    expect(() => addToProject(id, dana, 'Cofounder')).toThrow(ActionError);
    addToProject(id, leo, 'Cofounder');
    expect(snapshot().membersOf.get(pulse)!.find((m) => m.person_id === dana)?.role).toBe('founder');
  });

  it('logging a solved problem makes it the rank 1 result for its exact description', async () => {
    const leo = byName('Leo Martinez'), marcus = byName('Marcus Reyes'), pulse = projectByName('PulseBand');
    const description = 'PulseBand heart rate spikes when athletes sprint on the turf field';
    const { id } = await logProblem({ viewerId: leo, projectId: pulse, description, solution: 'Tightened the strap and filtered PPG motion artifacts with the accelerometer.', helperId: marcus });
    const out = await rankForProblem(description, leo);
    expect(out.results[0].matchedProblem?.id).toBe(id);
    expect(out.results[0].name).toBe('Marcus Reyes'); // the helper is credited (the viewer is excluded from their own search)
    const asElena = await rankForProblem(description, byName('Elena Brooks'));
    expect(asElena.results[0].matchedProblem?.id).toBe(id);
  });

  it('enforces demo-user rules', async () => {
    const dana = byName('Dana Whitfield'), pulse = projectByName('PulseBand');
    await expect(logProblem({ viewerId: dana, projectId: pulse, description: 'Something broke badly', solution: 'Fixed it carefully', helperId: null })).rejects.toThrow(ActionError);
    const m = getDb().prepare("SELECT id FROM milestones WHERE project_id = ? AND confirmed_by IS NULL").get(pulse) as { id: string };
    expect(() => confirmMilestone(m.id, dana)).toThrow(ActionError);
    confirmMilestone(m.id, byName('Samuel Grant'));
  });

  it('demo reset restores the seed state', () => {
    const leo = byName('Leo Martinez'), dana = byName('Dana Whitfield');
    const reqs = count('SELECT COUNT(*) n FROM requests');
    sendRequest({ from: leo, to: dana, kind: 'expertise', role: 'Cofounder', message: 'x', projectId: null });
    expect(count('SELECT COUNT(*) n FROM requests')).toBe(reqs + 1);
    resetFromSeed();
    expect(count('SELECT COUNT(*) n FROM requests')).toBe(reqs);
    expect(snapshot().people.length).toBe(220);
  });
});
