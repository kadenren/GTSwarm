import { describe, it, expect, beforeEach } from 'vitest';
import { resetFromSeed } from '@/lib/db';
import { keywordExtract } from '@/lib/extract';
import { createProject } from '@/lib/actions';
import { rankForProblem } from '@/lib/graph/rank';
import { byName } from './helpers';

const SAMPLE = 'ThermoCuff: In the 2026 ECE Senior Design capstone, our team built a wearable cuff that tracks skin temperature and heart rate. The firmware runs on an nRF52 with BLE and a PPG sensor. The main problem was that readings drifted when the cuff warmed up against the skin, so we fixed it by adding a reference thermistor and a two-point calibration at startup.';

describe('add a project (keyword fallback, no network)', () => {
  beforeEach(() => resetFromSeed());
  it('extracts name, year, team type, technologies and problems deterministically', () => {
    const x = keywordExtract(SAMPLE);
    expect(x.name).toBe('ThermoCuff');
    expect(x.year).toBe(2026);
    expect(x.team_type).toBe('Capstone');
    expect(x.technologies).toEqual(expect.arrayContaining(['nRF52', 'BLE', 'PPG sensor']));
    expect(x.problems[0].description).toMatch(/readings drifted/i);
    expect(x.problems[0].solution).toMatch(/reference thermistor/);
  });
  it('saving makes the new problem findable', async () => {
    const leo = byName('Leo Martinez');
    const x = keywordExtract(SAMPLE);
    await createProject(leo, x);
    const out = await rankForProblem(x.problems[0].description, byName('Elena Brooks'));
    expect(out.results[0].name).toBe('Leo Martinez');
  });
});
