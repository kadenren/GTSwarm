'use client';
import { useState } from 'react';
import MiniWeb from './MiniWeb';
import type { Gap } from '@/lib/graph/gaps';

export default function GapList({ gaps }: { gaps: Gap[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const missing = gaps.filter((g) => !g.covered);
  if (!missing.length) return <p className="mt-3 text-sm text-teal">Your team covers every skill common in similar successful projects.</p>;
  return (
    <ul className="mt-4 space-y-3">
      {missing.map((g) => (
        <li key={g.skill} className="rounded-lg border border-navy/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-display font-bold text-navy">{g.skill}</span>
              <span className="ml-2 text-xs text-ink/55">missing · common in similar successful projects</span>
            </div>
            <button className="btn-ghost py-1 text-xs" onClick={() => setOpen(open === g.skill ? null : g.skill)} aria-expanded={open === g.skill}>
              {open === g.skill ? 'Hide web' : 'Open mini web'}
            </button>
          </div>
          {g.suggestions.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2 text-xs">
              {g.suggestions.map((p) => (
                <li key={p.id} className="rounded-full bg-paper px-3 py-1"><span className="font-semibold text-navy">{p.name}</span> <span className="text-ink/60">{p.label} · {p.why}</span></li>
              ))}
            </ul>
          )}
          {open === g.skill && <div className="mt-3"><MiniWeb skill={g.skill} /></div>}
        </li>
      ))}
    </ul>
  );
}
