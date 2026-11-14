import { describe, it, expect, vi, beforeAll } from 'vitest';

// Stand in for the Gemini API: the matchmaker prefers Tom Brennan, to prove its verdicts drive the order.
vi.mock('@/lib/gemini', async (orig) => {
  const real = await orig<typeof import('@/lib/gemini')>();
  return {
    ...real,
    geminiEnabled: () => true,
    geminiJson: vi.fn(async (opts: { text: string }) => {
      const ids = [...opts.text.matchAll(/\[(person:p\d+)\] ([^\n]+)/g)].map((m) => ({ id: m[1], name: m[2] }));
      return { matches: ids.map(({ id, name }) => ({ id, fit: name === 'Tom Brennan' ? 0.97 : name === 'Dana Whitfield' ? 0.6 : 0.2, reason: `${name.split(' ')[0]} has relevant hands-on work.` })) };
    }),
  };
});
// no embeddings in tests: keep the keyword similarity path
vi.mock('@/lib/geminiVec', () => ({ geminiVectors: () => new Map(), geminiQueryVector: async () => null, embedNewInBackground: () => undefined }));

import { resetFromSeed } from '@/lib/db';
import { rankForExpertise } from '@/lib/graph/rank';
import { byName } from './helpers';

describe('Gemini matchmaker integration', () => {
  beforeAll(() => resetFromSeed());

  it('reorders the shortlist by Gemini fit and attaches its reasons', async () => {
    const out = await rankForExpertise('low-power embedded hardware, has shipped a product', 'Cofounder', byName('Leo Martinez'));
    expect(out.matcher).toBe('gemini');
    const tom = out.results.findIndex((r) => r.name === 'Tom Brennan');
    const dana = out.results.findIndex((r) => r.name === 'Dana Whitfield');
    expect(tom).toBeGreaterThanOrEqual(0);
    expect(tom).toBeLessThan(dana); // Gemini's verdict, not keywords, decided this order
    expect(out.results[tom].components.E).toBeCloseTo(0.97);
    expect(out.results[tom].aiReason).toMatch(/Tom has relevant/);
    for (const r of out.results) { expect(r.components.E).toBeGreaterThanOrEqual(0); expect(r.components.E).toBeLessThanOrEqual(1); }
  });
});
