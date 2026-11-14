/** Warm-up at server start (Node runtime only; the import is compiled out of the edge bundle). */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { warmUp } = await import('./instrumentation-node');
    await warmUp();
  }
}
