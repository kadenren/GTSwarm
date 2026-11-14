'use client';
import { useEffect, useState } from 'react';
import RelevanceWeb, { WebLegend, type WebNode, type WebEdge } from './RelevanceWeb';

interface Net { center: { id: string; name: string; label: string }; nodes: WebNode[]; edges: WebEdge[]; pathFromViewer: { text: string; hops: number } | null }

/** "Expand": the relevance web re-centered on one person, showing their network. Click a node to keep exploring. */
export default function NetworkWeb({ personId, onSelectPerson }: { personId: string; onSelectPerson: (id: string) => void }) {
  const [net, setNet] = useState<Net | null>(null);
  useEffect(() => {
    let live = true;
    setNet(null);
    fetch(`/api/network?person=${encodeURIComponent(personId)}`).then((r) => r.json()).then((d) => { if (live) setNet(d); });
    return () => { live = false; };
  }, [personId]);
  if (!net) return <div className="h-[500px] animate-pulse rounded-xl bg-paper" aria-label="Loading network" />;
  return (
    <div>
      {net.pathFromViewer && <p className="mb-1 text-xs text-ink/60">Your path to {net.center.name}: {net.pathFromViewer.text}</p>}
      <RelevanceWeb nodes={net.nodes} edges={net.edges} query={net.center.name} roleLabel={net.center.label} selectedId={null} onSelect={onSelectPerson} centerKind="person" />
      <WebLegend center="person" />
    </div>
  );
}
