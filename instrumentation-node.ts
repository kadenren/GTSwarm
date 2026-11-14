/** Node-only warm-up: load the snapshot, build the graph and BM25 index, and load the embedding model once. */
export async function warmUp() {
  try {
    const { snapshot } = await import('./lib/data');
    const { getGraph } = await import('./lib/graph/build');
    const { similarity } = await import('./lib/search');
    const { detectCircles } = await import('./lib/graph/circles');
    const s = snapshot();
    getGraph();
    detectCircles();
    if (s.searchMode === 'semantic') {
      const { loadEmbedder } = await import('./lib/embed');
      await loadEmbedder();
    }
    await similarity('warm up');
    console.log(`[gt-swarm] warm: ${s.people.length} people, ${s.projects.length} projects, search mode ${s.searchMode}`);
  } catch (e) {
    console.warn('[gt-swarm] warm-up skipped:', e instanceof Error ? e.message : e);
  }
}
