'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const ELENA = 'person:p008', MAYA = 'person:p010', MARCUS = 'person:p006';
const NAMES: Record<string, string> = { [ELENA]: 'Elena (alum founder)', [MAYA]: 'Maya (student)', [MARCUS]: 'Marcus (alum)' };
const RESTWELL = '/projects/project%3Apr009';

interface Step { title: string; as: string; url: string; show: string }
const STEPS: Step[] = [
  { title: 'An alum founder describes her idea', as: ELENA, url: '/match?mode=build&q=I%27m+building+a+wearable+medical+device+startup+and+need+someone+experienced+in+embedded+firmware+and+FDA+regulation.',
    show: 'GT Swarm reads the description: health, wearables, firmware, FDA, an advisor and an early engineer. Scroll through related builds and past GT work.' },
  { title: 'Restwell collaboration hub', as: ELENA, url: RESTWELL,
    show: 'Stage, open roles, what it needs, and recommended collaborators for each role.' },
  { title: 'Alum to alum: FDA advisor', as: ELENA, url: '/search?q=FDA+approval+for+a+wearable+medical+device&role=Advisor&aud=both',
    show: 'Priya is rank 1 with the gold line. Open her panel: 510(k) experience and the warm path from Elena.' },
  { title: 'Alum to students: early engineers', as: ELENA, url: '/search?q=wearable+firmware&role=Early+engineer&aud=students',
    show: 'Maya, Jordan and Sofia fill the inner ring, each with the firmware work they actually did.' },
  { title: 'A student discovers the startup', as: MAYA, url: '/builds',
    show: 'Restwell is recommended for Maya. Read Why it fits, then Request to collaborate as Early engineer.' },
  { title: 'Elena accepts Maya', as: ELENA, url: '/inbox',
    show: 'Accepting creates a connection only. Adding Maya to the team is a separate owner step (Add to project as).' },
  { title: 'The startup hits a blocker', as: ELENA, url: '/stuck?q=Bluetooth+disconnects+when+the+microcontroller+enters+sleep+mode',
    show: 'Marcus is on the inner ring with the exact problem he solved and the fix. Ask for help and send the request.' },
  { title: 'Marcus accepts', as: MARCUS, url: '/inbox',
    show: 'Accept Elena’s help request.' },
  { title: 'Log the outcome', as: ELENA, url: RESTWELL,
    show: 'Log progress: milestone “BLE sleep disconnects fixed on the bench” with Marcus as helper. It appears labeled Simulated.' },
  { title: 'Maya’s swarm', as: MAYA, url: '/swarm',
    show: 'Everyone and every project around Maya, placed by how closely they relate to her.' },
  { title: 'Optional: an alum accepts the invite', as: ELENA, url: '/join?invite=alumni',
    show: 'What an alum sees from an Alumni Association invite link. Type Rachel Bianchi, drop demo-files/4-resume-Rachel-Bianchi-alum.pdf, pick Advisor and Helper, create: builds that fit her appear right away.' },
];
const KEY = 'gtswarm-demo-guide';

export default function DemoGuide({ current }: { current: string }) {
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<number[]>([]);
  const [busy, setBusy] = useState<number | 'reset' | null>(null);

  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem(KEY) ?? '{}'); setDone(v.done ?? []); setOpen(!!v.open); } catch { /* storage unavailable */ }
  }, []);
  const persist = (d: number[], o: boolean) => { try { localStorage.setItem(KEY, JSON.stringify({ done: d, open: o })); } catch { /* ignore */ } };

  async function go(i: number) {
    const s = STEPS[i];
    setBusy(i);
    if (s.as !== current) await fetch('/api/viewer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: s.as }) });
    const d = [...new Set([...done, i])];
    setDone(d); persist(d, open);
    router.push(s.url);
    router.refresh();
    setBusy(null);
  }
  async function reset() {
    setBusy('reset');
    await fetch('/api/demo/reset', { method: 'POST' });
    setDone([]); persist([], open);
    router.push('/');
    router.refresh();
    setBusy(null);
  }
  const toggle = () => { setOpen(!open); persist(done, !open); };
  const activeIdx = STEPS.findIndex((s) => path !== '/' && s.url.startsWith(path) && s.as === current);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[360px] overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-2xl" role="dialog" aria-label="Demo guide">
          <div className="flex items-center justify-between bg-navy px-4 py-3 text-white">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">Demo guide</div>
              <div className="font-display text-base font-bold">One startup story, about 5 minutes</div>
            </div>
            <button onClick={reset} disabled={busy === 'reset'} className="rounded-md border border-white/25 px-2.5 py-1 text-xs font-semibold hover:border-gold hover:text-gold">
              {busy === 'reset' ? 'Resetting…' : 'Reset data'}
            </button>
          </div>
          <ol className="max-h-[60vh] divide-y divide-navy/5 overflow-y-auto">
            {STEPS.map((s, i) => {
              const active = i === activeIdx;
              return (
                <li key={s.title} className={`px-4 py-3 ${active ? 'bg-gold/10' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done.includes(i) ? 'bg-gold text-navy-900' : active ? 'bg-navy text-white' : 'bg-navy/10 text-navy'}`}>
                      {done.includes(i) && !active ? '✓' : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-navy">{s.title}</div>
                          <div className="text-[11px] text-ink/50">as {NAMES[s.as]}</div>
                        </div>
                        <button onClick={() => go(i)} disabled={busy === i} className="shrink-0 rounded-md bg-navy px-2.5 py-1 text-xs font-semibold text-white hover:bg-navy-700">
                          {busy === i ? '…' : 'Go'}
                        </button>
                      </div>
                      {active && <p className="mt-1.5 text-xs leading-relaxed text-ink/75">{s.show}</p>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
      <button onClick={toggle} className="flex items-center gap-2 rounded-full bg-gold px-4 py-2.5 text-sm font-bold text-navy-900 shadow-lg ring-4 ring-white/70 transition hover:bg-gold-light" aria-expanded={open}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2.5l10 5.5-10 5.5z" fill="currentColor" /></svg>
        {open ? 'Hide demo guide' : 'Demo guide'}
      </button>
    </div>
  );
}
