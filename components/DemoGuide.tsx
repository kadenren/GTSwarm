'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const LEO = 'person:p001', ELENA = 'person:p008', DANA = 'person:p005';
const NAMES: Record<string, string> = { [LEO]: 'Leo (PulseBand student)', [ELENA]: 'Elena (alum founder)', [DANA]: 'Dana (alum)' };

interface Step { title: string; as: string; url: string; show: string }
const STEPS: Step[] = [
  { title: 'Find a hardware cofounder', as: LEO, url: '/search?q=low-power+embedded+hardware%2C+has+shipped+a+product&role=Cofounder&aud=both',
    show: 'Dana lands on the inner ring with the gold line. Hover her, open her panel, read the warm path, send the request.' },
  { title: 'Get unstuck on a bug', as: LEO, url: '/stuck?q=Bluetooth+drops+when+the+sensor+sleeps',
    show: 'Marcus is on the inner ring. His panel leads with the exact problem he solved and the fix.' },
  { title: 'Ask the scout in plain words', as: LEO, url: '/stuck?scout=We+need+an+advisor+who+has+been+through+FDA+clearance+for+a+wearable',
    show: 'The scout reads the request (an advisor, regulatory), searches the indexed network step by step, and returns Priya with the matching solved problem.' },
  { title: 'Grow the swarm as you build', as: LEO, url: '/projects/project%3Apr004',
    show: 'Log progress: add the solved problem with Marcus as helper. It joins the build record and becomes searchable.' },
  { title: 'Alum to alum: FDA advisor', as: ELENA, url: '/search?q=FDA+approval+for+a+wearable+medical+device&role=Advisor&aud=both',
    show: 'Priya is rank 1. Scroll to You should meet: the graph predicts Elena and Priya should know each other.' },
  { title: 'Alum to student: hire early engineers', as: ELENA, url: '/search?q=wearable+firmware&role=Early+engineer&aud=students',
    show: 'The three students with wearable firmware build records fill the inner ring.' },
  { title: 'Consent, then connect', as: DANA, url: '/inbox',
    show: 'Accept Leo’s request. Accepting only creates a connection. Then switch to Leo and click Add to project as Cofounder.' },
  { title: 'See the whole swarm', as: LEO, url: '/graph',
    show: 'The gold path runs PulseBand → Wearable Sensing (2017) → Dana. Drag the year slider to watch the swarm grow.' },
  { title: 'Show the impact', as: LEO, url: '/impact',
    show: 'Connections in every direction, how reachable the network is, and knowledge carried across years.' },
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
              <div className="font-display text-base font-bold">9 steps, about 6 minutes</div>
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
