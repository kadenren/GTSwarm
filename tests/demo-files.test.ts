import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { resetFromSeed } from '@/lib/db';
import { textFromFile } from '@/lib/ingest';
import { keywordExtract } from '@/lib/extract';
import { keywordProfile } from '@/lib/profile';
import { problemFromLog } from '@/lib/problem';
import { rankForProblem } from '@/lib/graph/rank';
import { byName } from './helpers';

const dir = path.join(process.cwd(), 'demo-files');
const read = (f: string) => fs.readFileSync(path.join(dir, f));

/** The sample files used in the live demo must work without any API key. */
describe('demo files (no API key)', () => {
  beforeAll(() => { delete process.env.GEMINI_API_KEY; delete process.env.ANTHROPIC_API_KEY; resetFromSeed(); });

  it('capstone report PDF becomes a complete HydraBand project', async () => {
    const { text } = await textFromFile('1-HydraBand-capstone-report.pdf', read('1-HydraBand-capstone-report.pdf'));
    const x = keywordExtract(text);
    expect(x.name).toBe('HydraBand');
    expect(x.year).toBe(2026);
    expect(x.team_type).toBe('Capstone');
    expect(x.team_name).toBe('ECE Senior Design');
    expect(x.technologies).toEqual(expect.arrayContaining(['nRF52', 'BLE', 'Zephyr RTOS']));
    expect(x.problems.length).toBeGreaterThanOrEqual(2);
    expect(x.problems[0].description).toMatch(/sodium readings drifted/i);
  });

  it('resume PDF drafts a profile with skills, major and graduation year', async () => {
    const { text } = await textFromFile('5-resume-Leo-Martinez.pdf', read('5-resume-Leo-Martinez.pdf'));
    const p = keywordProfile(text);
    expect(p.major).toBe('Business');
    expect(p.grad_year).toBe(2026);
    expect(p.skills).toEqual(expect.arrayContaining(['Customer discovery', 'Fundraising', 'Python']));
    expect(p.bio.length).toBeGreaterThan(40);
  });

  it('serial log becomes a BLE sleep problem that finds Marcus', async () => {
    const d = problemFromLog(read('6-hydraband-serial-log.txt').toString('utf8'));
    expect(d.problem).toBe('BLE connection drops when the device enters sleep mode');
    expect(d.context).toMatch(/nRF52/);
    const out = await rankForProblem(d.problem, byName('Leo Martinez'));
    expect(out.results[0].name).toBe('Marcus Reyes');
  });
});
