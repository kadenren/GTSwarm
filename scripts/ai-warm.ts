/**
 * Prepare Gemini matching for the demo (run once after adding GEMINI_API_KEY to .env.local, and again after re-seeding):
 *   1. embed every person, project and solved problem with Gemini embeddings (stored in SQLite)
 *   2. pre-run every demo search so query vectors and matchmaker verdicts are cached
 * Usage: npm run ai:warm
 */
import fs from 'node:fs';
import path from 'node:path';

// tsx does not load .env.local the way Next.js does; read it without printing any values
const envFile = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const DEMO: { viewer: string; kind: 'expertise' | 'problem'; q: string; role?: string; audience?: 'students' | 'alumni' | 'both' }[] = [
  { viewer: 'person:p001', kind: 'expertise', q: 'low-power embedded hardware, has shipped a product', role: 'Cofounder' },
  { viewer: 'person:p001', kind: 'problem', q: 'Bluetooth drops when the sensor sleeps' },
  { viewer: 'person:p001', kind: 'problem', q: 'BLE connection drops when the device enters sleep mode' },
  { viewer: 'person:p001', kind: 'problem', q: 'BLE connection drops when the device enters sleep mode (nRF52 / Zephyr firmware)' },
  { viewer: 'person:p001', kind: 'problem', q: 'We need an advisor who has been through FDA clearance for a wearable' },
  { viewer: 'person:p001', kind: 'expertise', q: 'BLE firmware that stays connected through sleep, medical wearable', role: 'Advisor', audience: 'alumni' },
  { viewer: 'person:p008', kind: 'expertise', q: 'FDA approval for a wearable medical device', role: 'Advisor' },
  { viewer: 'person:p008', kind: 'expertise', q: 'wearable firmware', role: 'Early engineer', audience: 'students' },
];

(async () => {
  const { geminiEnabled } = await import('../lib/gemini');
  if (!geminiEnabled()) {
    console.log('GEMINI_API_KEY is not set in .env.local, so there is nothing to warm. Matching keeps using the built-in graph search.');
    return;
  }
  const { snapshot } = await import('../lib/data');
  const { embedMissing, EMBED_MODEL } = await import('../lib/geminiVec');
  console.log(`Embedding the swarm with ${EMBED_MODEL}...`);
  const n = await embedMissing(snapshot(), (d, t) => process.stdout.write(`\r  ${d}/${t}`));
  console.log(n ? `\n  ${n} records embedded.` : '  Already up to date.');

  const { rankForExpertise, rankForProblem } = await import('../lib/graph/rank');
  console.log('Pre-running demo searches (query vectors + Gemini matchmaker):');
  for (const d of DEMO) {
    const out = d.kind === 'problem'
      ? await rankForProblem(d.q, d.viewer, d.audience ?? 'both')
      : await rankForExpertise(d.q, d.role as never, d.viewer, d.audience ?? 'both');
    const top = out.results.slice(0, 3).map((r) => r.name).join(', ');
    console.log(`  [${out.mode}/${out.matcher}] "${d.q}" -> ${top}`);
  }
  console.log('Done. Restart the dev server if it was running before you added the key.');
})().catch((e) => { console.error(e); process.exit(1); });
