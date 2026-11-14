/**
 * Evaluate keyword-only vs Gemini semantic-only vs hybrid matching on the fictional demo data.
 * Relevance judgments are written by hand below (who genuinely fits each query, from their records);
 * similarity scores are never used as ground truth.
 *
 * Usage: npx tsx scripts/eval-matching.ts            (needs GEMINI_API_KEY + GTSWARM_SEMANTIC_MATCHING_ENABLED=true for the
 *        semantic and hybrid rows; without them only the keyword row is meaningful)
 *        Add --weights=0.3,0.5 to try other hybrid weights. Writes docs/EVAL.md.
 */
import fs from 'node:fs';
import path from 'node:path';

const envFile = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

type Kind = 'people' | 'stuck' | 'startups';
interface Case { id: string; group: string; kind: Kind; viewer: string; q: string; role?: string; audience?: 'students' | 'alumni' | 'both'; requireRole?: boolean; relevant: string[]; note: string }

const ELENA = 'Elena Brooks', MAYA = 'Maya Okafor';
const CASES: Case[] = [
  { id: 'Q1', group: 'Alum → alum cofounder', kind: 'people', viewer: ELENA, q: "I'm building a wearable medical device startup and need an alumni cofounder with embedded hardware or medical-device expertise.", role: 'Cofounder', audience: 'alumni', requireRole: true,
    relevant: ['Dana Whitfield', 'Miles Tate', 'Rohan Fleming'], note: 'Guided-demo query; only alumni open to cofounding may appear' },
  { id: 'Q2', group: 'Paraphrase (no shared keywords)', kind: 'people', viewer: ELENA, q: 'I need an engineer who has built a low-power wearable that transmits health data wirelessly.', role: 'Early engineer', requireRole: true,
    relevant: ['Maya Okafor', 'Jordan Kim', 'Sofia Alvarez', 'Chloe Nguyen', 'Arjun Mehta'], note: 'Wearable firmware builders open to engineering roles' },
  { id: 'Q3', group: 'Specialized embedded terms', kind: 'people', viewer: ELENA, q: 'someone experienced with BLE telemetry and power optimization on nRF52 boards', role: 'Helper',
    relevant: ['Marcus Reyes', 'Dana Whitfield', 'Lauren Mitchell', 'Jordan Kim'], note: 'nRF52 / BLE / low-power records' },
  { id: 'Q4', group: 'Equivalent experience, different words', kind: 'people', viewer: ELENA, q: 'took a consumer gadget from prototype all the way to mass production', role: 'Cofounder',
    relevant: ['Dana Whitfield', 'Miles Tate', 'Nina Petrov'], note: 'Shipped hardware products' },
  { id: 'Q5', group: 'Alum → alum advisor', kind: 'people', viewer: ELENA, q: 'advisor who has navigated FDA clearance for a medical wearable', role: 'Advisor', requireRole: true,
    relevant: ['Priya Natarajan', 'Hannah Lee', 'Rebecca Stone'], note: 'Regulatory and quality advisors' },
  { id: 'Q6', group: 'Alum → student recruiting', kind: 'people', viewer: ELENA, q: 'student who writes Zephyr RTOS firmware', role: 'Early engineer', audience: 'students', requireRole: true,
    relevant: ['Maya Okafor', 'Jordan Kim'], note: 'Students with Zephyr firmware projects' },
  { id: 'Q7', group: 'Unrelated domain should not leak', kind: 'people', viewer: ELENA, q: 'machine learning engineer to predict patient deterioration from vital signs', role: 'Early engineer',
    relevant: ['Tara Holloway', 'Tyler Brooks-Nguyen'], note: 'Hardware people should not outrank ML people' },
  { id: 'Q8', group: 'Robotics', kind: 'people', viewer: ELENA, q: 'motor control firmware for autonomous warehouse robots', role: 'Early engineer',
    relevant: ['Nadia Okoro', 'Isabel Moreno', 'Ravi Krishnan'], note: 'Robotics and motor-control records' },
  { id: 'Q9', group: 'Get Unstuck', kind: 'stuck', viewer: ELENA, q: 'Our wearable loses Bluetooth connection whenever the microcontroller goes into sleep mode.',
    relevant: ['Marcus Reyes'], note: 'Exact problem on record' },
  { id: 'Q10', group: 'Get Unstuck, no shared keywords', kind: 'stuck', viewer: ELENA, q: 'the radio link dies whenever the chip naps to save battery',
    relevant: ['Marcus Reyes'], note: 'Same problem, everyday wording' },
  { id: 'Q11', group: 'Get Unstuck, paraphrase', kind: 'stuck', viewer: ELENA, q: 'the hospital wants us to pass a cybersecurity questionnaire before the trial can start',
    relevant: ['Tara Holloway'], note: 'Security review solved on Tessera' },
  { id: 'Q12', group: 'Get Unstuck, paraphrase', kind: 'stuck', viewer: ELENA, q: 'how should we divide ownership with a partner who came on board later',
    relevant: ['Nadia Okoro'], note: 'Equity split solved on Voltline' },
  { id: 'Q13', group: 'Get Unstuck, paraphrase', kind: 'stuck', viewer: ELENA, q: 'funders keep asking for proof it works with real patients before they will invest',
    relevant: ['Priya Natarajan'], note: 'Clinical evidence before pre-seed' },
  { id: 'Q14', group: 'Get Unstuck, paraphrase', kind: 'stuck', viewer: MAYA, q: 'the sticky part of our patch falls off people after a couple of days',
    relevant: ['Elena Brooks'], note: 'Adhesive problem solved on Restwell' },
  { id: 'Q15', group: 'Student → startup discovery', kind: 'startups', viewer: MAYA, q: '(Maya’s saved profile)',
    relevant: ['Restwell Patch', 'PulseBand', 'Wearable Sensing', 'Smart Ring Prototype', 'Fall Detection Pendant', 'Smart Insole', 'Infant Breathing Monitor'], note: 'Wearable / BLE firmware startups' },
];

interface Row { mode: string; caseId: string; top: string[]; p3: number; p5: number; r5: number; top1: boolean; ineligible: number; ms: number; semanticUsed: boolean }

(async () => {
  const weights = (process.argv.find((a) => a.startsWith('--weights='))?.split('=')[1] ?? '0.3').split(',').map(Number);
  const { resetFromSeed } = await import('../lib/db');
  const { snapshot } = await import('../lib/data');
  const { rankForExpertise, rankForProblem } = await import('../lib/graph/rank');
  const { recommendBuilds } = await import('../lib/matching');
  const { semanticEnabled, EMBED_MODEL } = await import('../lib/geminiVec');
  resetFromSeed();
  const s = snapshot();
  const idOf = (name: string) => s.people.find((p) => p.name === name)!.id;

  const modes: { name: string; w: number }[] = [{ name: 'Keyword only', w: 0 }, { name: 'Gemini semantic only', w: 1 }, ...weights.map((w) => ({ name: `Hybrid ${Math.round((1 - w) * 100)}/${Math.round(w * 100)}`, w }))];
  const rows: Row[] = [];
  for (const m of modes) {
    process.env.GTSWARM_SEMANTIC_WEIGHT = String(m.w);
    for (const c of CASES) {
      const t0 = performance.now();
      let top: string[] = [];
      let ineligible = 0;
      let semanticUsed = false;
      if (c.kind === 'startups') {
        const out = await recommendBuilds({ viewerId: idOf(c.viewer), personId: idOf(c.viewer), requireRoles: true, limit: 9 });
        top = out.map((x) => x.build.name);
      } else {
        const out = c.kind === 'stuck'
          ? await rankForProblem(c.q, idOf(c.viewer), c.audience ?? 'both', { ai: false })
          : await rankForExpertise(c.q, c.role as never, idOf(c.viewer), c.audience ?? 'both', { ai: false, requireRole: !!c.requireRole });
        top = out.results.map((r) => r.name);
        semanticUsed = out.mode === 'gemini';
        if (c.requireRole) ineligible = out.results.filter((r) => !r.openTo.includes(c.role as never)).length;
        if (c.audience === 'alumni') ineligible += out.results.filter((r) => r.type !== 'alum').length;
        if (c.audience === 'students') ineligible += out.results.filter((r) => r.type !== 'student').length;
      }
      const ms = performance.now() - t0;
      const rel = new Set(c.relevant);
      const hit = (k: number) => top.slice(0, k).filter((n) => rel.has(n)).length;
      rows.push({ mode: m.name, caseId: c.id, top: top.slice(0, 5), p3: hit(3) / Math.min(3, Math.max(1, top.length)), p5: hit(5) / Math.min(5, Math.max(1, top.length)), r5: hit(5) / Math.min(5, rel.size), top1: rel.has(top[0]), ineligible, ms, semanticUsed });
    }
  }

  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const fmt = (x: number) => x.toFixed(2);
  const lines: string[] = [];
  lines.push('# Matching evaluation: keyword vs Gemini semantic vs hybrid', '');
  lines.push(`Generated by \`npx tsx scripts/eval-matching.ts\` on the fictional demo data. Embedding model: \`${EMBED_MODEL}\` (768 dimensions). Semantic matching ${semanticEnabled() ? 'was enabled' : 'was NOT enabled (key or flag missing), so the semantic rows fall back to keyword'}.`, '');
  lines.push('Relevance judgments are hand-written per query (who genuinely fits, from their records). P@k = share of the top k that is relevant; R@5 = share of relevant people found in the top 5 (capped at 5); Top-1 = the first result is relevant; Ineligible = results that break the role or students/alumni filter (must be 0).', '');
  lines.push('## Summary', '', '| Mode | P@3 | P@5 | R@5 | Top-1 | Ineligible | Avg latency |', '|---|---|---|---|---|---|---|');
  for (const m of modes) {
    const r = rows.filter((x) => x.mode === m.name);
    lines.push(`| ${m.name} | ${fmt(avg(r.map((x) => x.p3)))} | ${fmt(avg(r.map((x) => x.p5)))} | ${fmt(avg(r.map((x) => x.r5)))} | ${r.filter((x) => x.top1).length}/${r.length} | ${r.reduce((a, x) => a + x.ineligible, 0)} | ${Math.round(avg(r.map((x) => x.ms)))} ms |`);
  }
  lines.push('', '## Per query (top 3 shown)', '', `| Query | Group | ${modes.map((m) => m.name).join(' | ')} |`, `|---|---|${modes.map(() => '---').join('|')}|`);
  for (const c of CASES) {
    const cells = modes.map((m) => { const r = rows.find((x) => x.mode === m.name && x.caseId === c.id)!; return `${r.top1 ? '✓' : '✗'} P@3 ${fmt(r.p3)}: ${r.top.slice(0, 3).join(', ') || '(none)'}`; });
    lines.push(`| ${c.id}: ${c.q.replace(/\|/g, '/')} | ${c.group} | ${cells.join(' | ')} |`);
  }
  const md = lines.join('\n') + '\n';
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync('docs/EVAL.md', md);
  console.log(md);
})().catch((e) => { console.error(e); process.exit(1); });
