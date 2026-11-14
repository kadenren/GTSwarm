import fs from 'node:fs';
import path from 'node:path';
const dir = path.join(process.cwd(), 'data');
const seed = path.join(dir, 'gtswarm.seed.db');
const test = path.join(dir, `gtswarm.test.${process.pid}.db`);
if (!fs.existsSync(seed)) throw new Error('Run `npm run seed` before the tests.');
// Windows keeps SQLite files locked until the worker exits, so the exit hook below can miss them.
// Test files run one at a time, so copies left by earlier workers are safe to remove here.
for (const f of fs.readdirSync(dir)) {
  if (/^gtswarm\.test\.\d+\.db(-wal|-shm)?$/.test(f) && !f.startsWith(`gtswarm.test.${process.pid}.`)) {
    try { fs.rmSync(path.join(dir, f)); } catch { /* still in use */ }
  }
}
fs.copyFileSync(seed, test);
process.env.GTSWARM_DB = test;
process.on('exit', () => {
  for (const ext of ['', '-wal', '-shm']) try { fs.rmSync(test + ext); } catch { /* still open */ }
});
