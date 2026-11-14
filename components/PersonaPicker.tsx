'use client';
import { useState } from 'react';

/** Explore the demo as one of three fictional personas. No account or sign-in needed. */
const PERSONAS = [
  { id: 'person:p008', name: 'Elena Brooks', role: 'Alumni founder', blurb: 'Building Restwell Patch, a medical wearable. Find a cofounder and engineers.', go: '/match?mode=people', tone: 'bg-teal' },
  { id: 'person:p010', name: 'Maya Okafor', role: 'Student looking for startups', blurb: 'Computer engineering student with firmware experience. Find startups to join.', go: '/match?mode=startups', tone: 'bg-plum' },
  { id: 'person:p005', name: 'Dana Whitfield', role: 'Alumni cofounder candidate', blurb: 'Hardware engineering lead open to cofounding. See invites and matching startups.', go: '/inbox', tone: 'bg-teal' },
] as const;

export default function PersonaPicker({ current }: { current: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  async function pick(p: (typeof PERSONAS)[number]) {
    setBusy(p.id);
    await fetch('/api/viewer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: p.id }) });
    window.location.assign(p.go); // full load so the header and every page render as this persona
  }
  return (
    <div className="mt-8" data-testid="persona-picker">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Or explore on your own as a fictional demo persona</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {PERSONAS.map((p) => (
          <li key={p.id}>
            <button onClick={() => pick(p)} disabled={!!busy} aria-pressed={current === p.id}
              className={`h-full w-full rounded-xl border p-4 text-left transition hover:border-gold hover:bg-white/10 ${current === p.id ? 'border-gold/70 bg-white/10' : 'border-white/15 bg-white/[0.04]'}`}>
              <div className="flex items-center gap-2.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${p.tone}`}>{p.name.split(' ').map((w) => w[0]).join('')}</span>
                <div>
                  <div className="font-display font-bold text-white">{busy === p.id ? 'Switching…' : p.name}</div>
                  <div className="text-xs text-gold-light">{p.role}</div>
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-white/65">{p.blurb}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
