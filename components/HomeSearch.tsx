'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ROLES = ['Cofounder', 'Advisor', 'Helper', 'Early engineer', 'First customer'];

/** Search straight from the home hero: pick a mode, type, go. */
export default function HomeSearch() {
  const router = useRouter();
  const [mode, setMode] = useState<'expertise' | 'stuck'>('expertise');
  const [q, setQ] = useState('');
  const [role, setRole] = useState('Cofounder');
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(mode === 'stuck' ? `/stuck?q=${encodeURIComponent(q)}` : `/search?q=${encodeURIComponent(q)}&role=${encodeURIComponent(role)}&aud=both`);
  }
  return (
    <form onSubmit={submit} className="rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/5" aria-label="Search GT Swarm">
      <div className="flex gap-1 p-1" role="tablist">
        {(['expertise', 'stuck'] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${mode === m ? 'bg-navy text-white' : 'text-navy/60 hover:text-navy'}`}>
            {m === 'expertise' ? 'Find expertise' : "I'm stuck"}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 p-1 sm:flex-row">
        <input value={q} onChange={(e) => setQ(e.target.value)} aria-label={mode === 'stuck' ? 'Describe your problem' : 'Expertise you need'}
          placeholder={mode === 'stuck' ? 'Bluetooth drops when the sensor sleeps' : 'low-power embedded hardware, has shipped a product'}
          className="min-w-0 flex-1 rounded-xl border border-navy/15 px-4 py-3 text-base text-ink placeholder:text-ink/35 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30" />
        <button className="rounded-xl bg-gold px-6 py-3 text-base font-bold text-navy-900 transition hover:bg-gold-light">Search the swarm</button>
      </div>
      {mode === 'expertise' && (
        <div className="flex flex-wrap items-center gap-1.5 px-2 pb-1.5 pt-1">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-ink/40">I need a</span>
          {ROLES.map((r) => (
            <button key={r} type="button" onClick={() => setRole(r)} aria-pressed={role === r}
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${role === r ? 'border-navy bg-navy/5 text-navy' : 'border-transparent text-ink/50 hover:text-navy'}`}>{r}</button>
          ))}
        </div>
      )}
    </form>
  );
}
