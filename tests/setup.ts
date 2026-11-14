import fs from 'node:fs';
import path from 'node:path';
const dir = path.join(process.cwd(), 'data');
const seed = path.join(dir, 'gtswarm.seed.db');
const test = path.join(dir, `gtswarm.test.${process.pid}.db`);
if (!fs.existsSync(seed)) throw new Error('Run `npm run seed` before the tests.');
fs.copyFileSync(seed, test);
process.env.GTSWARM_DB = test;
process.on('exit', () => {
  for (const ext of ['', '-wal', '-shm']) try { fs.rmSync(test + ext); } catch { /* still open */ }
});
