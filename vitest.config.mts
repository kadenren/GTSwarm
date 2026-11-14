import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: { setupFiles: ['tests/setup.ts'], testTimeout: 120000, hookTimeout: 180000, fileParallelism: false, pool: 'forks' },
});
