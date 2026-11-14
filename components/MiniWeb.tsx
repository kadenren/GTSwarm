'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import RelevanceWeb, { type WebNode } from './RelevanceWeb';
import type { SearchResponse } from '@/lib/searchApi';

/** A compact relevance web for one skill gap. */
export default function MiniWeb({ skill, role = 'Early engineer' }: { skill: string; role?: string }) {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'expertise', query: skill, role, audience: 'both' }) })
      .then((r) => r.json()).then(setData);
  }, [skill, role]);
  const nodes: WebNode[] = useMemo(() => (data?.results ?? []).slice(0, 9).map((r) => ({ id: r.personId, name: r.name, label: r.label, type: r.type, score: r.score, rank: r.rank, ring: r.rank <= 3 ? 1 : r.rank <= 6 ? 2 : 3, short: r.description.short })), [data]);
  if (!data) return <div className="h-72 animate-pulse rounded-lg bg-paper" />;
  if (!nodes.length) return <p className="text-sm text-ink/60">No one in the swarm has documented {skill} yet.</p>;
  const picked = data.results.find((r) => r.personId === sel);
  return (
    <div className="rounded-lg border border-navy/10 bg-paper/50 p-2">
      <RelevanceWeb nodes={nodes} edges={data.edges} query={skill} roleLabel={role} selectedId={sel} onSelect={setSel} />
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-1 text-xs">
        <span className="text-ink/70">{picked ? picked.description.short : 'Click a person for their connection to this skill.'}</span>
        <Link className="font-semibold text-navy underline decoration-gold underline-offset-4" href={`/search?q=${encodeURIComponent(skill)}&role=${encodeURIComponent(role)}&aud=both`}>Open full search →</Link>
      </div>
    </div>
  );
}
