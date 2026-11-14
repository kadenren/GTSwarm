import { recommendBuilds } from '../lib/matching';
import { rankForExpertise } from '../lib/graph/rank';
// Prints what the demo's queries return (deterministic graph matching, no Gemini rerank).
(async () => {
  const MAYA = 'person:p010', ELENA = 'person:p008';
  const q4 = "I'm a computer engineering student interested in embedded systems, wearable devices, and early-stage hardware startups.";
  console.log('Scene 4, text:'); for (const m of await recommendBuilds({ viewerId: MAYA, personId: MAYA, text: q4, limit: 5 })) console.log(' ', m.build.name, m.score, JSON.stringify(m.components), '|', m.why);
  console.log('Scene 4, profile:'); for (const m of await recommendBuilds({ viewerId: MAYA, personId: MAYA, limit: 5, requireRoles: true })) console.log(' ', m.build.name, m.score, '|', m.why);
  const q2 = "I'm building a wearable medical device startup and need an alumni collaborator with embedded hardware or medical-device expertise.";
  for (const role of ['Helper', 'Cofounder', 'Advisor'] as const) {
    const r = await rankForExpertise(q2, role, ELENA, 'alumni', { ai: false, requireRole: true });
    console.log(`Scene 2 (${role}, alumni):`, r.results.slice(0, 5).map((x) => `${x.name} ${x.score.toFixed(2)}`).join(', '));
  }
  const r3 = await rankForExpertise('wearable firmware engineer', 'Early engineer', ELENA, 'students', { ai: false, requireRole: true });
  console.log('Scene 3:', r3.results.slice(0, 5).map((x) => `${x.name} ${x.score.toFixed(2)}`).join(', '));
})();
