import { describe, it, expect } from 'vitest';
import { rankForExpertise, rankForProblem, WEIGHTS } from '@/lib/graph/rank';
import { warmPath } from '@/lib/graph/path';
import { edgesAmong } from '@/lib/graph/edges';
import { snapshot } from '@/lib/data';
import { byName, projectByName } from './helpers';

const LEO = () => byName('Leo Martinez');
const ELENA = () => byName('Elena Brooks');

describe('hero demo queries rank first on real data', () => {
  it('cofounder query as the PulseBand student returns Dana Whitfield at rank 1, inner ring', async () => {
    const out = await rankForExpertise('low-power embedded hardware, has shipped a product', 'Cofounder', LEO(), 'both');
    expect(out.results[0].name).toBe('Dana Whitfield');
    expect(out.results[0].ring).toBe(1);
    expect(out.results.length).toBeGreaterThanOrEqual(8);
    expect(new Set(out.results.map((r) => r.ring))).toEqual(new Set([1, 2, 3]));
  });
  it("stuck query returns Marcus Reyes's BLE sleep problem at rank 1", async () => {
    const out = await rankForProblem('Bluetooth drops when the sensor sleeps', LEO(), 'both');
    expect(out.results[0].name).toBe('Marcus Reyes');
    expect(out.results[0].matchedProblem?.description).toBe('Bluetooth Low Energy connection drops when the MCU enters sleep mode');
  });
  it('FDA advisor query as Elena returns Priya Natarajan at rank 1 (alum to alum)', async () => {
    const out = await rankForExpertise('FDA approval for a wearable medical device', 'Advisor', ELENA(), 'both');
    expect(out.results[0].name).toBe('Priya Natarajan');
    expect(out.results[0].description.short).toContain('alum to alum');
  });
  it('early engineer, students only, as Elena puts all three hero students in the top 5', async () => {
    const out = await rankForExpertise('wearable firmware', 'Early engineer', ELENA(), 'students');
    const top5 = out.results.slice(0, 5).map((r) => r.name);
    for (const n of ['Maya Okafor', 'Jordan Kim', 'Sofia Alvarez']) expect(top5).toContain(n);
    expect(out.results.every((r) => r.type === 'student')).toBe(true);
  });
});

describe('result integrity', () => {
  const queries: [string, () => Promise<Awaited<ReturnType<typeof rankForExpertise>>>][] = [
    ['cofounder', () => rankForExpertise('low-power embedded hardware, has shipped a product', 'Cofounder', LEO())],
    ['stuck', () => rankForProblem('Bluetooth drops when the sensor sleeps', LEO())],
    ['fda', () => rankForExpertise('FDA approval for a wearable medical device', 'Advisor', ELENA())],
    ['firmware', () => rankForExpertise('wearable firmware', 'Early engineer', ELENA(), 'students')],
  ];
  for (const [name, run] of queries) {
    it(`${name}: reasons, bounded components, factual descriptions`, async () => {
      const s = snapshot();
      const out = await run();
      const allNames = new Set([...s.projects.map((p) => p.name)]);
      for (const r of out.results) {
        expect(r.reasons.length).toBeGreaterThan(0);
        for (const v of Object.values(r.components)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
        const recomputed = WEIGHTS.E * r.components.E + WEIGHTS.X * r.components.X + WEIGHTS.T * r.components.T + WEIGHTS.R * r.components.R + WEIGHTS.A * r.components.A;
        expect(Math.abs(recomputed - r.score)).toBeLessThan(0.002);
        expect(r.description.short.length).toBeGreaterThan(0);
        expect(r.description.full).toContain(r.name.split(' ')[0]);
        // every fact cited exists in the database and belongs to this person
        for (const id of r.description.facts) {
          const ok = id.startsWith('problem:')
            ? (() => { const pb = s.problem.get(id); return !!pb && (pb.solved_by === r.personId || pb.helper_id === r.personId); })()
            : (s.projectsOf.get(r.personId) ?? []).some((m) => m.project_id === id);
          expect(ok, `${r.name} fact ${id}`).toBe(true);
        }
        // project names mentioned are real projects
        for (const m of r.description.full.matchAll(/(?:built|founded|advised|on) ([A-Z][\w-]+(?: [A-Z][\w-]+)*) \((?:[^)]*, )?(\d{4})\)/g)) {
          if (!allNames.has(m[1]) && !s.people.some((p) => p.name === m[1])) throw new Error(`Unknown project "${m[1]}" in description of ${r.name}`);
        }
        // the current role, if stated, is the real one
        if (r.description.full.includes(' is now ')) expect(r.description.full).toContain(s.person.get(r.personId)!.current_role!);
      }
    });
  }
  it('viewer is never in their own results and unclaimed people are excluded', async () => {
    const s = snapshot();
    const out = await rankForExpertise('wearable', 'Helper', LEO());
    expect(out.results.some((r) => r.personId === LEO())).toBe(false);
    expect(out.results.every((r) => s.person.get(r.personId)!.claimed)).toBe(true);
  });
  it('empty or nonsense queries return no results gracefully', async () => {
    expect((await rankForExpertise('   ', 'Advisor', LEO())).results).toEqual([]);
    expect((await rankForProblem('qwzxv plorgh', LEO())).results).toEqual([]);
  });
});

describe('graph', () => {
  it('warmPath from PulseBand to Dana is 6 hops or fewer', () => {
    const p = warmPath(projectByName('PulseBand'), byName('Dana Whitfield'));
    expect(p).not.toBeNull();
    expect(p!.hops).toBeLessThanOrEqual(6);
    expect(p!.text).toContain('Dana Whitfield');
  });
  it('warmPath from the PulseBand student to Dana is short and readable', () => {
    const p = warmPath(LEO(), byName('Dana Whitfield'))!;
    expect(p.hops).toBeLessThanOrEqual(4);
    expect(p.text.startsWith('You')).toBe(true);
  });
  it('edgesAmong finds person-to-person links among results', async () => {
    const out = await rankForExpertise('low-power embedded hardware, has shipped a product', 'Cofounder', LEO());
    const edges = edgesAmong(out.results.map((r) => r.personId));
    expect(edges.length).toBeGreaterThan(0);
    const ids = new Set(out.results.map((r) => r.personId));
    for (const e of edges) { expect(ids.has(e.source)).toBe(true); expect(ids.has(e.target)).toBe(true); }
  });
});
