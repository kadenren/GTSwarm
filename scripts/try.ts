import { rankForExpertise, rankForProblem } from '../lib/graph/rank';
const [, , kind, viewer, role, aud, ...q] = process.argv;
(async () => {
  const out = kind === 'stuck' ? await rankForProblem(q.join(' '), viewer, aud as never) : await rankForExpertise(q.join(' '), role as never, viewer, aud as never);
  for (const r of out.results) console.log(r.rank, r.ring, r.score.toFixed(3), r.name.padEnd(18), r.type, Object.entries(r.components).map(([k, v]) => k + '=' + v.toFixed(2)).join(' '), '|', r.description.short);
  if (out.results[0]) console.log('\n' + out.results[0].description.full + '\nPATH: ' + out.results[0].path?.text);
})();
