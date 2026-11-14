import { listBuilds } from '../lib/builds';
const b = listBuilds();
console.log('active builds:', b.length, 'open:', b.filter((x) => x.open).length);
const by = (k: keyof (typeof b)[number]) => Object.entries(b.reduce((m, x) => ((m[String(x[k])] = (m[String(x[k])] ?? 0) + 1), m), {} as Record<string, number>));
console.log('stages', by('stage')); console.log('industries', by('industry')); console.log('ownership', by('ownership'));
for (const x of b.slice(0, 6)) console.log('-', x.name, x.year, x.stage, x.owner?.name, x.rolesNeeded.join('/'), '|', x.helpNeeded.slice(0, 80));
