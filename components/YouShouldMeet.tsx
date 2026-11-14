'use client';
import { useState } from 'react';

export interface IntroView { personId: string; name: string; type: 'student' | 'alum'; reasons: string[]; label?: string }

/** "You should meet" suggestions from Adamic-Adar link prediction, with a one-click hello request. */
export default function YouShouldMeet({ intros, title = 'You should meet', compact = false }: { intros: IntroView[]; title?: string; compact?: boolean }) {
  const [sent, setSent] = useState<Record<string, string>>({});
  if (!intros.length) return null;
  async function hello(i: IntroView) {
    const res = await fetch('/api/requests', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to: i.personId, kind: 'expertise', role: 'Advisor', message: `Hi ${i.name.split(' ')[0]}, GT Swarm suggested we meet: ${i.reasons[0]?.toLowerCase() ?? 'we work on related things'}. Would you be open to a short intro call?` }),
    });
    const d = await res.json();
    setSent((s) => ({ ...s, [i.personId]: res.ok ? (d.duplicate ? 'Already requested' : 'Intro request sent') : d.error ?? 'Failed' }));
  }
  return (
    <section className="card p-5" aria-label={title} data-testid="you-should-meet">
      <h2 className="text-lg font-bold text-navy">{title}</h2>
      <p className="text-xs text-ink/60">People you are not connected to yet, predicted from shared neighbors in the graph (Adamic-Adar).</p>
      <ul className={`mt-3 grid gap-3 ${compact ? '' : 'sm:grid-cols-3'}`}>
        {intros.map((i) => (
          <li key={i.personId} className="rounded-lg border border-navy/10 bg-paper p-3">
            <div className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${i.type === 'alum' ? 'bg-teal' : 'bg-plum'}`}>{i.name.split(' ').map((w) => w[0]).join('')}</span>
              <div>
                <div className="font-display font-bold text-navy">{i.name}</div>
                {i.label && <div className="text-[11px] text-ink/60">{i.label}</div>}
              </div>
            </div>
            <ul className="mt-2 space-y-0.5 text-xs text-ink/75">
              {i.reasons.slice(0, 3).map((r) => <li key={r}>· {r}</li>)}
            </ul>
            <div className="mt-2">
              {sent[i.personId] ? (
                <span className="text-xs font-medium text-teal">{sent[i.personId]}</span>
              ) : (
                <button className="text-xs font-semibold text-navy underline decoration-gold underline-offset-4" onClick={() => hello(i)}>Ask for an intro</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
