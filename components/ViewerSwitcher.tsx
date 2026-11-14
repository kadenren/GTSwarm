'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type V = { id: string; label: string; sub: string };

export default function ViewerSwitcher({ viewers, current }: { viewers: readonly V[]; current: string }) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  async function change(id: string) {
    setValue(id);
    await fetch('/api/viewer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    start(() => router.refresh());
  }
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-white/70 xl:inline">Viewing as</span>
      <select
        aria-label="Viewing as"
        value={value}
        onChange={(e) => change(e.target.value)}
        className={`rounded-lg border border-white/20 bg-navy-800 px-2 py-1.5 font-medium text-white focus:border-gold focus:outline-none ${pending ? 'opacity-60' : ''}`}
      >
        {viewers.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label} ({v.sub})
          </option>
        ))}
      </select>
    </label>
  );
}
