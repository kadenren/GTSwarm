'use client';
import { useState } from 'react';

/** Two ways to get unstuck: the scout (plain-language need) or the relevance web over solved problems. */
export default function StuckTabs({ initial, scout, web }: { initial: 'scout' | 'web'; scout: React.ReactNode; web: React.ReactNode }) {
  const [tab, setTab] = useState(initial);
  const tabs = [
    { v: 'scout' as const, l: 'Ask the scout', d: 'Describe what you need; it searches for you' },
    { v: 'web' as const, l: 'Search solved problems', d: 'See matches as a relevance web' },
  ];
  return (
    <div>
      <div className="relative z-10 mx-auto -mt-7 max-w-7xl px-4">
        <div className="inline-flex gap-1 rounded-xl bg-white p-1 shadow-lg ring-1 ring-navy/10" role="tablist">
          {tabs.map((t) => (
            <button key={t.v} role="tab" aria-selected={tab === t.v} onClick={() => setTab(t.v)}
              className={`rounded-lg px-4 py-2 text-left transition ${tab === t.v ? 'bg-navy text-white' : 'text-navy hover:bg-navy/5'}`}>
              <div className="text-sm font-semibold">{t.l}</div>
              <div className={`text-[11px] ${tab === t.v ? 'text-white/60' : 'text-ink/50'}`}>{t.d}</div>
            </button>
          ))}
        </div>
      </div>
      <div className={tab === 'scout' ? 'mx-auto max-w-7xl px-4 py-6' : 'hidden'}>{scout}</div>
      <div className={tab === 'web' ? 'pt-12' : 'hidden'}>{web}</div>
    </div>
  );
}
