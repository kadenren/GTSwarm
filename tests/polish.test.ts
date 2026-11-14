import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, resetFromSeed } from '@/lib/db';
import { factCheck, polishDescription, POLISH_PREFIX } from '@/lib/polish';
import { describeConnection } from '@/lib/graph/describe';
import { byName } from './helpers';

const TEMPLATE =
  'Dana built Lumen Band on Lumen Wearables in 2021: consumer fitness wearable with a seven-day battery. Earlier, Dana built Wearable Sensing (2017). PulseBand continued from that project. Dana is now Hardware Engineering Lead at a consumer wearables startup.';

describe('AI-polished descriptions (optional)', () => {
  beforeAll(() => { delete process.env.ANTHROPIC_API_KEY; resetFromSeed(); });

  it('accepts a faithful rephrasing', () => {
    expect(factCheck(TEMPLATE, 'Dana built Lumen Band at Lumen Wearables in 2021, a consumer fitness wearable with a seven-day battery. Before that, Dana built Wearable Sensing (2017), which PulseBand continued from.')).toBe(true);
  });
  it('rejects invented facts, changed numbers and gendered pronouns', () => {
    expect(factCheck(TEMPLATE, 'Dana built Lumen Band at Lumen Wearables in 2021 and later raised money from Sequoia for a new company.')).toBe(false);
    expect(factCheck(TEMPLATE, 'Dana built Lumen Band on Lumen Wearables in 2019, a consumer fitness wearable with a seven-day battery.')).toBe(false);
    expect(factCheck(TEMPLATE, 'Dana built Lumen Band on Lumen Wearables in 2021. She is now Hardware Engineering Lead at a consumer wearables startup.')).toBe(false);
  });
  it('without an API key, returns the deterministic template unchanged', async () => {
    const d = await describeConnection(byName('Dana Whitfield'), 'low-power embedded hardware, has shipped a product', 'Cofounder', byName('Leo Martinez'));
    const out = await polishDescription(d!.full);
    expect(out).toEqual({ text: d!.full, source: 'template' });
  });
  it('cached polished wording is served and survives a demo reset', async () => {
    const d = await describeConnection(byName('Marcus Reyes'), 'Bluetooth drops when the sensor sleeps', null, byName('Leo Martinez'));
    const { createHash } = await import('node:crypto');
    const k = POLISH_PREFIX + createHash('sha256').update(d!.full).digest('hex').slice(0, 32);
    getDb().prepare('INSERT OR REPLACE INTO cache (key, value) VALUES (?, ?)').run(k, 'Cached polished text for Marcus.');
    resetFromSeed();
    expect(await polishDescription(d!.full)).toEqual({ text: 'Cached polished text for Marcus.', source: 'polished' });
    // seeded cache entries (handoff briefs) are restored too
    expect((getDb().prepare("SELECT COUNT(*) n FROM cache WHERE key LIKE 'handoff:%'").get() as { n: number }).n).toBeGreaterThan(0);
  });
});
