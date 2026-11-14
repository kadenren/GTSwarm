'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type V = { id: string; label: string; sub: string };

/** Demo identity switcher: who is acting right now (no logins). */
export default function ViewerSwitcher({ viewers, current }: { viewers: readonly V[]; current: string }) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const me = viewers.find((v) => v.id === value) ?? viewers[0];
  const isStudent = me.sub.toLowerCase().includes('student');
  async function change(id: string) {
    setValue(id);
    await fetch('/api/viewer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    start(() => router.refresh());
  }
  return (
    <label className={`group relative flex cursor-pointer items-center gap-2.5 rounded-full border border-white/15 bg-white/5 py-1 pl-1 pr-8 transition hover:border-gold/60 ${pending ? 'opacity-60' : ''}`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-white/20 ${isStudent ? 'bg-plum' : 'bg-teal'}`} aria-hidden="true">
        {me.label.split(' ').map((w) => w[0]).join('')}
      </span>
      <span className="hidden flex-col leading-tight sm:flex">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gold">Viewing as</span>
        <span className="text-sm font-semibold text-white">{me.label}</span>
      </span>
      <svg className="pointer-events-none absolute right-2.5 h-4 w-4 text-white/60" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>
      <select
        aria-label="Viewing as"
        value={value}
        onChange={(e) => change(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {viewers.map((v) => (
          <option key={v.id} value={v.id}>{v.label} ({v.sub})</option>
        ))}
      </select>
    </label>
  );
}
