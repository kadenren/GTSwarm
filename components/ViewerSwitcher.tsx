'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { startTour } from './DemoTour';

type V = { id: string; label: string; sub: string };

const initials = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2);
const role = (sub: string) => sub.replace(/\s*\(demo\)\s*$/i, '');
const tone = (sub: string) => (/^(robotics |upper-year |first-year )?student/i.test(sub) ? 'bg-plum' : 'bg-teal');

/** Demo identity switcher: who is acting right now (no logins). A styled menu, not a native select, so it reads well on the dark header. */
export default function ViewerSwitcher({ viewers, current }: { viewers: readonly V[]; current: string }) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const me = viewers.find((v) => v.id === value) ?? viewers[0];

  useEffect(() => setValue(current), [current]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  async function change(id: string) {
    setOpen(false);
    if (id === value) return;
    setValue(id);
    await fetch('/api/viewer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    start(() => router.refresh());
  }

  return (
    <div ref={box} className="relative">
      <button type="button" data-tour="persona" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={`Viewing as ${me.label}. Switch demo persona`}
        className={`flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 py-1 pl-1 pr-3 text-left transition hover:border-gold/60 ${open ? 'border-gold/60' : ''} ${pending ? 'opacity-60' : ''}`}>
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-white/20 ${tone(me.sub)}`} aria-hidden="true">{initials(me.label)}</span>
        <span className="hidden flex-col leading-tight sm:flex">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gold">Demo persona</span>
          <span className="text-sm font-semibold text-white">{me.label}</span>
        </span>
        <svg className={`h-4 w-4 text-white/60 transition ${open ? 'rotate-180' : ''}`} viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>
      </button>

      {open && (
        <div role="menu" aria-label="Demo personas" className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-xl border border-navy/10 bg-white py-1.5 shadow-2xl" data-testid="persona-menu">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); startTour('network'); }} data-testid="demo-button"
            className="mx-2 mb-1.5 flex w-[calc(100%-1rem)] items-center justify-center gap-1.5 rounded-lg bg-gold px-3 py-2 text-sm font-bold text-navy-900 hover:bg-gold-light">
            <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2.5l10 5.5-10 5.5z" fill="currentColor" /></svg>Start guided demo
          </button>
          <div className="px-3.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-ink/45">Switch demo persona (fictional people, no login)</div>
          {viewers.map((v) => {
            const active = v.id === value;
            return (
              <button key={v.id} type="button" role="menuitemradio" aria-checked={active} onClick={() => change(v.id)}
                className={`flex w-full items-center gap-3 px-3.5 py-2 text-left transition hover:bg-paper ${active ? 'bg-gold/10' : ''}`}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${tone(v.sub)}`} aria-hidden="true">{initials(v.label)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-navy">{v.label}</span>
                  <span className="block truncate text-xs text-ink/60">{role(v.sub)}</span>
                </span>
                {active && <svg className="h-4 w-4 shrink-0 text-gold-dark" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
