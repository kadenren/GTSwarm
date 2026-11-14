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

const COFOUNDER = "I'm building a wearable medical device startup and need an alumni cofounder with embedded hardware or medical-device expertise.";
const DEMO: { viewer: string; kind: 'expertise' | 'problem'; q: string; role?: string; audience?: 'students' | 'alumni' | 'both' }[] = [
  // guided demo and Find Your People examples
  { viewer: 'person:p008', kind: 'expertise', q: COFOUNDER, role: 'Cofounder', audience: 'alumni' },
  { viewer: 'person:p008', kind: 'expertise', q: 'I need an engineer who has built a low-power wearable that transmits health data wirelessly.', role: 'Early engineer', audience: 'both' },
  { viewer: 'person:p008', kind: 'expertise', q: 'wearable firmware engineer', role: 'Early engineer', audience: 'students' },
  { viewer: 'person:p008', kind: 'expertise', q: 'robotics technical cofounder', role: 'Cofounder', audience: 'both' },
  // Get Unstuck examples
  { viewer: 'person:p008', kind: 'problem', q: 'Bluetooth disconnects when the microcontroller enters sleep mode' },
  { viewer: 'person:p008', kind: 'problem', q: 'Our wearable loses Bluetooth connection whenever the microcontroller goes into sleep mode.' },
  { viewer: 'person:p008', kind: 'problem', q: 'Hospital IT security review stalled our pilot' },
  { viewer: 'person:p008', kind: 'problem', q: 'Investors want clinical evidence before our pre-seed round' },
  { viewer: 'person:p008', kind: 'problem', q: 'Splitting equity with a cofounder who joined late' },
  { viewer: 'person:p008', kind: 'problem', q: 'Preparing an FDA 510(k) submission for a wearable' },
];

(async () => {
  const { semanticEnabled } = await import('../lib/geminiVec');
  if (!semanticEnabled()) {
    console.log('Semantic matching is off (needs GEMINI_API_KEY and GTSWARM_SEMANTIC_MATCHING_ENABLED=true in .env.local). Matching keeps using keyword search.');
    return;
  }
  const { snapshot } = await import('../lib/data');
  const { embedMissing, EMBED_MODEL } = await import('../lib/geminiVec');
  console.log(`Embedding the swarm with ${EMBED_MODEL}...`);
  const n = await embedMissing(snapshot(), (d, t) => process.stdout.write(`\r  ${d}/${t}`));
  console.log(n ? `\n  ${n} records embedded.` : '  Already up to date.');

  const { rankForExpertise, rankForProblem } = await import('../lib/graph/rank');
  console.log('Pre-running demo searches so their query vectors are cached:');
  for (const d of DEMO) {
    const out = d.kind === 'problem'
      ? await rankForProblem(d.q, d.viewer, d.audience ?? 'both')
      : await rankForExpertise(d.q, d.role as never, d.viewer, d.audience ?? 'both');
    const top = out.results.slice(0, 3).map((r) => r.name).join(', ');
    console.log(`  [${out.mode}/${out.matcher}] "${d.q}" -> ${top}`);
  }
  // Find People searches from the community demo (Kenji asks for robotics career advice)
  const { findPeople } = await import('../lib/people');
  for (const [viewer, q, purpose] of [['person:p227', 'robotics career advice', 'mentorship'], ['person:p039', 'Seattle', 'meet'], ['person:p039', 'product management', 'networking']] as const) {
    const r = await findPeople(viewer, { q, purpose });
    console.log(`  [people] "${q}" -> ${r.slice(0, 3).map((x) => x.name).join(', ')}`);
  }
  // Find Your Startup embeds each builder's profile as the query: warm the demo personas
  const { recommendBuilds } = await import('../lib/matching');
  for (const id of ['person:p010', 'person:p008', 'person:p005']) {
    const m = await recommendBuilds({ viewerId: id, personId: id, requireRoles: true, limit: 9 });
    console.log(`  [startups] ${id} -> ${m.slice(0, 3).map((x) => x.build.name).join(', ')}`);
  }
  // persona dashboards and mentor recommendations embed each persona's profile text as the query: warm those too
  const { VIEWERS } = await import('../lib/viewer');
  const { recommendMentors, memberProfileText } = await import('../lib/community');
  const { membershipOf, isVerifiedAlum } = await import('../lib/access');
  for (const v of VIEWERS) {
    const alum = isVerifiedAlum(membershipOf(v.id).status);
    const text = memberProfileText(v.id).text.slice(0, 1200);
    await rankForExpertise(text, (alum ? 'Cofounder' : 'Advisor') as never, v.id, 'alumni', { ai: false });
    if (!alum) await recommendMentors(v.id, 3);
    console.log(`  [dashboard] ${v.label}`);
  }
  console.log('Done. Restart the dev server if it was running before you added the key.');
})().catch((e) => { console.error(e); process.exit(1); });
