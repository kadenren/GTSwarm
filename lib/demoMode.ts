/**
 * Demo-only tools (data reset) are available in development, or in production only when the
 * operator opts in with GTSWARM_DEMO=1. A real deployment leaves this unset, so the routes refuse.
 */
export function demoToolsEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.GTSWARM_DEMO === '1';
}
