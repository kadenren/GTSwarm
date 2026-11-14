'use client';
import Link from 'next/link';
import { useState } from 'react';
import RelevanceWeb, { WebLegend, type WebNode, type WebEdge } from './RelevanceWeb';

export interface CircleMember extends WebNode { projects: { id: string; name: string; year: number }[] }

export default function CircleWeb({ name, members, edges }: { name: string; members: CircleMember[]; edges: WebEdge[] }) {
  const [sel, setSel] = useState<string | null>(null);
  const m = members.find((x) => x.id === sel);
  return (
    <div>
      <RelevanceWeb nodes={members} edges={edges} query={name} roleLabel="Circle core" selectedId={sel} onSelect={setSel} />
      <WebLegend center="person" />
      {m && (
        <div className="mt-3 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm">
          <span className="font-display font-bold text-navy">{m.name}</span> <span className="text-ink/60">{m.label}</span>
          <div className="mt-1 text-xs text-ink/75">
            {m.projects.map((p, i) => (
              <span key={p.id}>{i > 0 && ', '}<Link className="underline decoration-gold underline-offset-2" href={`/projects/${encodeURIComponent(p.id)}`}>{p.name} ({p.year})</Link></span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
