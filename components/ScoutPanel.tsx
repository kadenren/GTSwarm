'use client';
import { useEffect, useRef, useState } from 'react';
import type { ScoutEvent, ScoutPerson, ScoutProblem, ScoutReport } from '@/lib/scout';

const EXAMPLES = [
  'Bluetooth keeps dropping when our wearable sensor goes to sleep',
  'We need an advisor who has been through FDA clearance for a wearable',
  'Looking to hire students who write wearable firmware',
];

type Step = Extract<ScoutEvent, { type: 'step' }>;

function StepIcon({ kind }: { kind: Step['kind'] }) {
  const base = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full';
  if (kind === 'graph') return <span className={`${base} bg-navy text-gold`}><svg width="14" height="14" viewBox="0 0 14 14"><circle cx="3" cy="3" r="2" fill="currentColor" /><circle cx="11" cy="4" r="2" fill="currentColor" /><circle cx="7" cy="11" r="2" fill="currentColor" /><path d="M3 3l8 1M3 3l4 8M11 4l-4 7" stroke="currentColor" strokeWidth="1" /></svg></span>;
  if (kind === 'web') return <span className={`${base} bg-teal text-white`}><svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M1.5 7h11M7 1.5c2 2 2 9 0 11M7 1.5c-2 2-2 9 0 11" stroke="currentColor" strokeWidth="1.1" fill="none" /></svg></span>;
  if (kind === 'done') return <span className={`${base} bg-gold text-navy-900`}><svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 7.5l2.5 2.5L11 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg></span>;
  if (kind === 'error') return <span className={`${base} bg-red-100 text-red-700`}>!</span>;
  if (kind === 'skip') return <span className={`${base} bg-navy/10 text-navy/50`}>–</span>;
  return <span className={`${base} bg-plum-light text-plum`}><svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7h10M7 2v10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></span>;
}

export default function ScoutPanel({ webAvailable, initialNeed = '' }: { webAvailable: boolean; initialNeed?: string }) {
  const [need, setNeed] = useState(initialNeed);
  const [web, setWeb] = useState(false);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<ScoutEvent[]>([]);
  const queue = useRef<ScoutEvent[]>([]);
  const timer = useRef<number | null>(null);
  const [sent, setSent] = useState<Record<string, string>>({});

  // reveal events at a readable pace (the search itself has already happened)
  const pump = () => {
    if (timer.current) return;
    timer.current = window.setInterval(() => {
      const next = queue.current.shift();
      if (!next) { window.clearInterval(timer.current!); timer.current = null; return; }
      setEvents((ev) => [...ev, next]);
    }, 260);
  };
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  async function run(text = need) {
    if (!text.trim() || running) return;
    setNeed(text);
    setEvents([]); queue.current = []; setSent({});
    setRunning(true);
    try {
      const res = await fetch('/api/scout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ need: text, web }) });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (line) { queue.current.push(JSON.parse(line) as ScoutEvent); pump(); }
        }
      }
    } catch {
      queue.current.push({ type: 'step', kind: 'error', label: 'Could not reach the scout.' }); pump();
    } finally {
      setRunning(false);
    }
  }
  useEffect(() => { if (initialNeed) run(initialNeed); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function ask(p: ScoutPerson) {
    const res = await fetch('/api/requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ to: p.id, kind: 'stuck', role: 'Helper', message: `Hi ${p.name.split(' ')[0]}, GT Swarm's scout pointed me to you. I'm working on: "${need}". Could you spare 15 minutes?` }) });
    const d = await res.json();
    setSent((s) => ({ ...s, [p.id]: res.ok ? (d.duplicate ? 'Already asked' : 'Request sent') : d.error ?? 'Failed' }));
  }

  const steps = events.filter((e): e is Step => e.type === 'step');
  const mode = events.find((e) => e.type === 'mode') as Extract<ScoutEvent, { type: 'mode' }> | undefined;
  const problems = (events.filter((e) => e.type === 'problems') as Extract<ScoutEvent, { type: 'problems' }>[]).flatMap((e) => e.problems)
    .filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i) as ScoutProblem[];
  const webHits = (events.filter((e) => e.type === 'web') as Extract<ScoutEvent, { type: 'web' }>[]).flatMap((e) => e.results);
  const report = (events.find((e) => e.type === 'report') as Extract<ScoutEvent, { type: 'report' }> | undefined)?.report as ScoutReport | undefined;
  const busy = running || queue.current.length > 0 || (events.length > 0 && !steps.some((s) => s.kind === 'done'));

  return (
    <div className="space-y-6">
      <form className="card p-5" onSubmit={(e) => { e.preventDefault(); run(); }} aria-label="Ask the scout">
        <label htmlFor="scout-need" className="label">Tell the scout what you need, in your own words</label>
        <textarea id="scout-need" value={need} onChange={(e) => setNeed(e.target.value)} rows={3}
          placeholder="Our wearable loses its Bluetooth connection whenever the sensor sleeps. Who has fixed this before?"
          className="input resize-y text-base" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-xs">
            {EXAMPLES.map((x) => (
              <button key={x} type="button" onClick={() => run(x)} className="rounded-full bg-navy/5 px-3 py-1 text-navy hover:bg-gold/30">{x}</button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {webAvailable && (
              <label className="flex items-center gap-2 text-xs text-ink/70">
                <input type="checkbox" checked={web} onChange={(e) => setWeb(e.target.checked)} className="accent-[#003057]" />
                Also search the live web
              </label>
            )}
            <button className="btn-primary px-5" disabled={busy || !need.trim()}>{busy ? 'Scouting…' : 'Send the scout'}</button>
          </div>
        </div>
      </form>

      {events.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <section className="card p-5" aria-label="Scout activity" aria-live="polite">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">What the scout did</h2>
              {busy && <span className="flex items-center gap-1.5 text-xs text-ink/60"><span className="h-2 w-2 animate-pulse rounded-full bg-gold" />working</span>}
            </div>
            {mode && <p className="mt-0.5 text-xs text-ink/55">{mode.note}</p>}
            <ol className="relative mt-4 space-y-3 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-navy/10">
              {steps.map((s, i) => (
                <li key={i} className="relative flex gap-3 animate-[hwFade_300ms_ease-out_both]">
                  <StepIcon kind={s.kind} />
                  <div className="min-w-0 pt-0.5">
                    <div className="text-sm font-medium text-navy">{s.label}</div>
                    {s.detail && <div className="text-xs text-ink/60">{s.detail}</div>}
                  </div>
                </li>
              ))}
            </ol>
            {webHits.length > 0 && (
              <div className="mt-4 border-t border-navy/10 pt-3">
                <h3 className="label">Web pages read</h3>
                <ul className="space-y-1 text-xs">
                  {webHits.slice(0, 8).map((r) => <li key={r.url} className="truncate"><a className="text-teal underline-offset-2 hover:underline" href={r.url} target="_blank" rel="noreferrer">{r.title || r.url}</a></li>)}
                </ul>
              </div>
            )}
          </section>

          <div className="min-w-0 space-y-6">
            {problems.length > 0 && (
              <section className="card p-5" aria-label="Solved problems found">
                <h2 className="text-lg font-bold text-navy">Closest problems already solved</h2>
                <ul className="mt-3 space-y-3">
                  {problems.slice(0, 3).map((p, i) => (
                    <li key={p.id} className={`rounded-lg border p-3 ${i === 0 ? 'border-gold/60 bg-gold/10' : 'border-navy/10'}`}>
                      <div className="font-semibold text-navy">&ldquo;{p.description}&rdquo;</div>
                      <p className="mt-1 text-sm text-ink/75">{p.solution}</p>
                      <p className="mt-1 text-xs text-ink/55">Solved by {p.solver} on {p.project}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {report && (
              <section className="card overflow-hidden" aria-label="Scout report" data-testid="scout-report">
                <div className="bg-navy px-5 py-4 text-white">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">Scout report</div>
                  <p className="mt-1 leading-relaxed">{report.summary}</p>
                </div>
                <div className="p-5">
                  {report.swarm.length > 0 && (
                    <>
                      <h3 className="label">People to talk to</h3>
                      <ul className="grid gap-3 sm:grid-cols-2">
                        {report.swarm.map((p, i) => (
                          <li key={p.id} className={`rounded-xl border p-3 ${i === 0 ? 'border-gold ring-2 ring-gold/30' : 'border-navy/10'}`}>
                            <div className="flex items-center gap-2.5">
                              <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ${p.type === 'alum' ? 'bg-teal' : 'bg-plum'}`}>{p.name.split(' ').map((w) => w[0]).join('')}</span>
                              <div className="min-w-0">
                                <div className="font-display font-bold text-navy">{p.name}</div>
                                <div className="text-[11px] text-ink/55">{p.label}{p.hops !== null ? ` · ${p.hops} ${p.hops === 1 ? 'hop' : 'hops'} from you` : ''}</div>
                              </div>
                            </div>
                            <p className="mt-2 text-xs leading-snug text-ink/75">{p.why}</p>
                            <div className="mt-2">
                              {sent[p.id] ? <span className="text-xs font-medium text-teal">{sent[p.id]}</span>
                                : <button className="text-xs font-semibold text-navy underline decoration-gold underline-offset-4" onClick={() => ask(p)}>Ask for help</button>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {report.web.length > 0 && (
                    <>
                      <h3 className="label mt-5">Georgia Tech leads from the web</h3>
                      <ul className="space-y-2">
                        {report.web.map((w) => (
                          <li key={w.url} className="rounded-lg border border-navy/10 p-3 text-sm">
                            <div className="font-semibold text-navy">{w.name} <span className="font-normal text-ink/55">· {w.context}</span></div>
                            <p className="text-xs text-ink/70">{w.why}</p>
                            <a href={w.url} target="_blank" rel="noreferrer" className="text-xs text-teal underline-offset-2 hover:underline">{w.url}</a>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {report.nextSteps.length > 0 && (
                    <>
                      <h3 className="label mt-5">Next steps</h3>
                      <ol className="list-decimal space-y-1 pl-5 text-sm text-ink/80">{report.nextSteps.map((n) => <li key={n}>{n}</li>)}</ol>
                    </>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
