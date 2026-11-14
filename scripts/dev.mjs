// Starts the Next.js dev server from the project folder regardless of the caller's working directory.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'dev', '-p', '3000'], { cwd: root, stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
