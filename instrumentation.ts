/** Warm-up at server start (Node runtime only; the import is compiled out of the edge bundle). */
export async function register() {
  // the hosted demo loads data per visitor session on first request (lib/session.ts), so there is nothing to warm
  if (process.env.NEXT_RUNTIME === 'nodejs' && !process.env.DATABASE_URL) {
    const { warmUp } = await import('./instrumentation-node');
    await warmUp();
  }
}
