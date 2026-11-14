'use client';
import Link from 'next/link';
import { useState } from 'react';
import RelevanceWeb, { WebLegend, type WebNode, type WebEdge } from './RelevanceWeb';
import type { SwarmNode } from '@/lib/graph/myswarm';

const RELATION: Record<SwarmNode['relation'], { label: string; cls: string }> = {
  yours: { label: 'Your project', cls: 'bg-gold/20 text-gold-dark' },
  tie: { label: 'In your network', cls: 'bg-navy/5 text-navy' },
  match: { label: 'Matched to you', cls: 'bg-teal-light text-teal' },
};

/** The viewer's personal swarm: people and projects around them, linked by who built what and who knows whom. */
export default function MySwarmWeb({ me, nodes, edges }: { me: { name: string; label: string }; nodes: SwarmNode[]; edges: WebEdge[] }) {
  const [sel, setSel] = useState<string | null>(nodes[0]?.id ?? null);
  const picked = nodes.find((n) => n.id === sel);
  const webNodes: WebNode[] = nodes.map((n) => ({ id: n.id, name: n.name, label: n.kind === 'project' ? (n.name.length > 18 ? n.name.slice(0, 17) + '…' : n.name) : n.label, type: n.type, kind: n.kind, score: n.score, rank: n.rank, ring: n.ring, short: n.short }));
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="card min-w-0 p-4" aria-label="Your swarm">
        <RelevanceWeb nodes={webNodes} edges={edges} query={me.name} roleLabel="You" selectedId={sel} onSelect={setSel} centerKind="person" />
        <WebLegend center="person" projects />
        <p className="mt-2 text-center text-[11px] text-ink/50">Solid lines: who builds what. Dashed: people who know each other. Gold dashed: a project that continued another.</p>
      </section>
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        {picked && (
          <div className="card p-5" aria-live="polite" data-testid="swarm-detail">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${RELATION[picked.relation].cls}`}>{RELATION[picked.relation].label}</span>
            <div className="mt-2 flex items-center gap-2.5">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center text-xs font-bold text-white ${picked.kind === 'project' ? 'rounded-lg border-2 border-gold-light bg-navy' : `rounded-full ${picked.type === 'alum' ? 'bg-teal' : 'bg-plum'}`}`}>
                {picked.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
              </span>
              <div>
                <div className="font-display text-lg font-bold text-navy">{picked.name}</div>
                <div className="text-xs text-ink/55">{picked.kind === 'project' ? picked.label : picked.label}</div>
              </div>
            </div>
            <h3 className="label mt-4">Why it is in your swarm</h3>
            <ul className="space-y-1 text-sm text-ink/80">{picked.why.map((w) => <li key={w} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />{w}</li>)}</ul>
            <Link href={picked.href} className="btn-primary mt-4 w-full">{picked.kind === 'project' ? 'Open project hub' : `Find people like ${picked.name.split(' ')[0]}`}</Link>
          </div>
        )}
        <div className="card p-5">
          <h3 className="label">Everyone in your swarm</h3>
          <ul className="max-h-80 space-y-1 overflow-y-auto text-sm">
            {nodes.map((n) => (
              <li key={n.id}>
                <button onClick={() => setSel(n.id)} className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-paper ${sel === n.id ? 'bg-gold/10' : ''}`}>
                  <span className={`h-2.5 w-2.5 shrink-0 ${n.kind === 'project' ? 'rounded-[2px] bg-navy' : `rounded-full ${n.type === 'alum' ? 'bg-teal' : 'bg-plum'}`}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-navy">{n.name}</span>
                  <span className="text-[10px] text-ink/45">{RELATION[n.relation].label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
