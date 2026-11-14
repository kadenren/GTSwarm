import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Hybrid matching with a stand-in for Gemini: vectors are made up so that one target record is a perfect semantic match
 * for the query and shares no keywords with it. No network calls are made.
 */
const DIM = 8;
const unit = (i: number) => { const v = new Float32Array(DIM); v[i % DIM] = 1; return v; };
const state: { aligned: Set<string>; queryFails: boolean; queryCalls: number } = { aligned: new Set(), queryFails: false, queryCalls: 0 };

vi.mock('@/lib/geminiVec', async () => {
  const { snapshot } = await import('@/lib/data');
  return {
    semanticEnabled: () => true,
    geminiVectors: () => {
      const s = snapshot();
      const ids = [...s.people.filter((p) => p.claimed).map((p) => p.id), ...s.projects.map((p) => p.id), ...s.problems.map((p) => p.id)];
      // aligned records point the same way as the query; everything else points elsewhere
      return new Map(ids.map((id, i) => [id, state.aligned.has(id) ? unit(0) : unit(1 + (i % (DIM - 1)))]));
    },
    geminiQueryVector: async () => { state.queryCalls++; return state.queryFails ? null : unit(0); },
  };
});

import { resetFromSeed } from '@/lib/db';
import { snapshot } from '@/lib/data';
import { similarity } from '@/lib/search';
import { rankForExpertise, rankForProblem } from '@/lib/graph/rank';
import { byName } from './helpers';

const problemSolvedBy = (name: string, re: RegExp) => snapshot().problems.find((p) => p.solved_by === byName(name) && re.test(p.description))!.id;

describe('Hybrid semantic matching (Gemini stand-in)', () => {
  beforeEach(() => { delete process.env.GEMINI_API_KEY; resetFromSeed(); state.aligned = new Set(); state.queryFails = false; state.queryCalls = 0; delete process.env.GTSWARM_SEMANTIC_WEIGHT; });
  afterEach(() => { delete process.env.GTSWARM_SEMANTIC_WEIGHT; });

  it('finds a solved problem described in completely different words (no keyword overlap)', async () => {
    state.aligned = new Set([problemSolvedBy('Marcus Reyes', /Bluetooth/)]);
    const out = await rankForProblem('the radio link dies whenever the chip naps to save battery', byName('Elena Brooks'));
    expect(out.mode).toBe('gemini');
    expect(out.results[0].name).toBe('Marcus Reyes');
    expect(out.results[0].matchedProblem?.description).toMatch(/Bluetooth Low Energy connection drops/); // the real record, not generated text
    expect(out.results[0].signals.semantic).toBeGreaterThan(0.9);
  });

  it('never lets semantic similarity override role eligibility', async () => {
    // Daniel Wu is not open to cofounding; make his record a perfect semantic match anyway
    state.aligned = new Set([byName('Daniel Wu'), byName('Dana Whitfield')]);
    const out = await rankForExpertise('someone to start a company with', 'Cofounder', byName('Elena Brooks'), 'both', { ai: false, requireRole: true });
    expect(out.results.some((r) => r.name === 'Daniel Wu')).toBe(false);
    expect(out.results.every((r) => r.openTo.includes('Cofounder'))).toBe(true);
  });

  it('keyword relevance still breaks ties between equally similar records (default 30% keyword share)', async () => {
    state.aligned = new Set([byName('Grace Liu'), byName('Dana Whitfield')]); // both semantically "perfect"; only Dana matches the words
    const out = await rankForExpertise("I'm building a wearable medical device startup and need an alumni cofounder with embedded hardware or medical-device expertise.", 'Cofounder', byName('Elena Brooks'), 'alumni', { ai: false, requireRole: true });
    expect(out.results[0].name).toBe('Dana Whitfield');
  });

  it('does not call Gemini when the semantic weight is zero', async () => {
    process.env.GTSWARM_SEMANTIC_WEIGHT = '0';
    const sim = await similarity('Bluetooth drops when the sensor sleeps');
    expect(sim.mode).not.toBe('gemini');
    expect(sim.semantic).toBeNull();
    expect(state.queryCalls).toBe(0);
  });

  it('falls back to keyword matching when the query embedding fails', async () => {
    state.queryFails = true;
    const out = await rankForProblem('Bluetooth disconnects when the microcontroller enters sleep mode', byName('Elena Brooks'));
    expect(out.mode).toBe('keyword');
    expect(out.results[0].name).toBe('Marcus Reyes');
    expect(out.results[0].signals.semantic).toBeNull();
  });

  it('blends both signals within the existing 55% work-match weight (no extra category)', async () => {
    state.aligned = new Set([byName('Dana Whitfield')]);
    const out = await rankForExpertise('low-power embedded hardware', 'Cofounder', byName('Elena Brooks'), 'both', { ai: false });
    for (const r of out.results) {
      expect(Object.keys(r.components).sort()).toEqual(['A', 'E', 'R', 'T', 'X']);
      expect(r.components.E).toBeLessThanOrEqual(1);
      expect(r.score).toBeLessThanOrEqual(1.0001);
    }
  });
});

describe('Semantic matching switch', () => {
  it('is off without a key or without the flag', async () => {
    const real = await vi.importActual<typeof import('@/lib/geminiVec')>('@/lib/geminiVec');
    const key = process.env.GEMINI_API_KEY, flag = process.env.GTSWARM_SEMANTIC_MATCHING_ENABLED;
    process.env.GTSWARM_SEMANTIC_MATCHING_ENABLED = 'true'; delete process.env.GEMINI_API_KEY;
    expect(real.semanticEnabled()).toBe(false);
    process.env.GEMINI_API_KEY = 'test-key'; delete process.env.GTSWARM_SEMANTIC_MATCHING_ENABLED;
    expect(real.semanticEnabled()).toBe(false);
    process.env.GTSWARM_SEMANTIC_MATCHING_ENABLED = 'true';
    expect(real.semanticEnabled()).toBe(true);
    if (key) process.env.GEMINI_API_KEY = key; else delete process.env.GEMINI_API_KEY;
    if (flag) process.env.GTSWARM_SEMANTIC_MATCHING_ENABLED = flag; else delete process.env.GTSWARM_SEMANTIC_MATCHING_ENABLED;
  });

  it('never sends names to the embedding model', async () => {
    const real = await vi.importActual<typeof import('@/lib/geminiVec')>('@/lib/geminiVec');
    resetFromSeed();
    const s = snapshot();
    const dana = s.person.get(byName('Dana Whitfield'))!;
    expect(real.geminiDocText(s, dana.id)).not.toContain('Dana');
    expect(real.geminiDocText(s, dana.id)).not.toContain('Whitfield');
  });
});
