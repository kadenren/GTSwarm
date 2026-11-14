import { describe, it, expect, beforeAll } from 'vitest';
import { resetFromSeed } from '@/lib/db';
import { snapshot } from '@/lib/data';
import { detectCircles, circleOf, suggestIntros } from '@/lib/graph/circles';
import { skillGaps } from '@/lib/graph/gaps';
import { personNetwork } from '@/lib/graph/network';
import { lineageOf, handoffBrief } from '@/lib/project';
import { byName, projectByName } from './helpers';

describe('tier 2', () => {
  beforeAll(() => resetFromSeed());

  it('detects named circles; Elena and Priya share one but are not connected', () => {
    const circles = detectCircles();
    expect(circles.length).toBeGreaterThanOrEqual(4);
    for (const c of circles) expect(c.name.length).toBeGreaterThan(3);
    const elena = byName('Elena Brooks'), priya = byName('Priya Natarajan');
    expect(circleOf(elena)?.id).toBe(circleOf(priya)?.id);
    const s = snapshot();
    expect(s.connections.some((c) => (c.from_person === elena && c.to_person === priya) || (c.from_person === priya && c.to_person === elena))).toBe(false);
  });

  it('suggests Priya as someone Elena should meet, with reasons', () => {
    const intros = suggestIntros(byName('Elena Brooks'));
    const priya = intros.find((i) => i.name === 'Priya Natarajan');
    expect(priya).toBeDefined();
    expect(priya!.reasons.length).toBeGreaterThan(0);
  });

  it('finds skill gaps with suggested people for PulseBand', () => {
    const r = skillGaps(projectByName('PulseBand'))!;
    expect(r.gaps.some((g) => g.covered)).toBe(true);
    const missing = r.gaps.filter((g) => !g.covered);
    expect(missing.length).toBeGreaterThan(0);
    expect(missing[0].suggestions.length).toBeGreaterThan(0);
  });

  it('expands a person into their network', () => {
    const net = personNetwork(byName('Dana Whitfield'), byName('Leo Martinez'))!;
    expect(net.nodes.length).toBeGreaterThanOrEqual(8);
    expect(net.nodes.every((n) => n.id !== byName('Dana Whitfield'))).toBe(true);
  });

  it('builds the Wearable Sensing lineage and a handoff brief', () => {
    const fam = lineageOf(snapshot(), projectByName('PulseBand'));
    expect(fam.map((f) => f.year)).toEqual([2014, 2017, 2024, 2025]);
    const brief = handoffBrief(projectByName('Wearable Sensing', 2017));
    expect(brief.text).toContain('Wearable Sensing');
    expect(brief.contacts.length).toBeGreaterThan(0);
  });
});
