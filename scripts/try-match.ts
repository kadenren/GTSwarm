import { recommendBuilds } from '../lib/matching';
import { snapshot } from '../lib/data';
(async () => {
  delete process.env.GEMINI_API_KEY;
  const r = await recommendBuilds({ viewerId: 'person:p010', personId: 'person:p010', limit: 6 });
  for (const m of r) console.log(m.build.name, m.build.year, m.build.stage, m.score, JSON.stringify(m.components), m.matchedRoles, m.matchedSkills);
  const s = snapshot(); console.log('Maya open_to', s.person.get('person:p010')!.open_to, s.skillsOf.get('person:p010'));
})();
