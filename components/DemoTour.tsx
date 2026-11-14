'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Guided demo: dims the page, highlights the element to look at or click, and points an arrow at it.
 * Steps switch the "viewing as" account and open the right page. State lives in localStorage so it survives navigation.
 */
const ELENA = 'person:p008', MAYA = 'person:p010';

interface Step {
  as: string; url: string;
  /** CSS selector of what to highlight; "a || b" falls back to b */
  target?: string;
  /** clicked automatically if the target has not appeared (for example, to open a panel) */
  prepare?: string;
  who: string; title: string; body: string; action?: string;
}

const SCENE2 = "/match?mode=people&q=I%27m+building+a+wearable+medical+device+startup+and+need+an+alumni+cofounder+with+embedded+hardware+or+medical-device+expertise.&role=Cofounder&aud=alumni";
const SCENE3 = '/match?mode=people&q=wearable+firmware+engineer&role=Early+engineer&aud=students';
const SCENE4 = '/match?mode=startups&q=I%27m+a+computer+engineering+student+interested+in+embedded+systems%2C+wearable+devices%2C+and+early-stage+hardware+startups.';
const FIRST_PERSON = '[data-testid="people-results"] > li:first-child';
const RESTWELL_MATCH = '[data-testid="startup-results"] li[data-build="project:pr009"]';
const RESTWELL_DISCOVER = '[data-testid="discover-grid"] li:has(a[href="/projects/project%3Apr009"])';

const STEPS: Step[] = [
  { as: ELENA, url: '/', target: '[data-tour="discover-filters"]', who: 'Anyone',
    title: 'Discover what Yellow Jackets are building',
    body: 'Startups and projects from students and alumni, each with its stage, industry, founder and open roles. You can browse without committing to anything.',
    action: 'Filter by industry, skills needed, stage, founder, and whether they are recruiting.' },
  { as: ELENA, url: '/', target: RESTWELL_DISCOVER, who: 'Anyone',
    title: 'An alumni-founded startup',
    body: 'Restwell Patch is a medical wearable startup founded by Elena Brooks (alum, 2015). It is at pilot stage and recruiting an engineer and an advisor.' },
  { as: ELENA, url: SCENE2, target: FIRST_PERSON, who: 'Elena, alum founder',
    title: 'Alum to alum: finding a cofounder',
    body: 'Elena asks for an alumni cofounder with embedded hardware or medical-device experience. Only alumni who said they are open to cofounding are ranked. The reason on each card comes from that person’s own record.',
    action: 'Read why the top match fits. "Why this match?" shows how the score adds up.' },
  { as: ELENA, url: SCENE2, target: '[data-testid="connections-dialog"]', prepare: `${FIRST_PERSON} [data-testid="view-connections"]`, who: 'Elena, alum founder',
    title: 'Why the match is meaningful',
    body: 'View connections shows the real network around this person, and separates documented ties (shared projects, accepted connections) from inferred similarity.',
    action: 'Close it with the X when you are done.' },
  { as: ELENA, url: SCENE2, target: `${FIRST_PERSON} [data-testid="invite-button"] || ${FIRST_PERSON}`, who: 'Elena, alum founder',
    title: 'Invite to connect',
    body: 'Elena invites her top match to talk about a cofounder role at Restwell.',
    action: 'Click "Invite to connect", then "Send invite".' },
  { as: ELENA, url: SCENE3, target: FIRST_PERSON, who: 'Elena, alum founder',
    title: 'Alum to student: an engineer',
    body: 'The same search for a firmware engineer, filtered to current students. These are students whose firmware work is on record, not just listed as a skill.',
    action: 'Optionally invite one of them.' },
  { as: MAYA, url: SCENE4, target: RESTWELL_MATCH, who: 'Maya, student',
    title: 'The reverse: a student finds the startup',
    body: 'Maya, a computer engineering student, uses Find Startups. Restwell is one of her top matches because it is seeking an engineer with the wearable and BLE firmware experience on her record.',
    action: 'Read why it fits.' },
  { as: MAYA, url: SCENE4, target: `${RESTWELL_MATCH} [data-testid="collab-button"] || ${RESTWELL_MATCH}`, who: 'Maya, student',
    title: 'Request to join',
    body: 'Maya asks to join Restwell as an engineer.',
    action: 'Click "Request to join", choose Engineer, then "Send request".' },
  { as: ELENA, url: '/inbox', target: '[data-testid="request-received"]', who: 'Elena, alum founder',
    title: 'Nothing happens without a yes',
    body: "Elena sees Maya's request to join Restwell.",
    action: 'Click Accept.' },
  { as: ELENA, url: '/inbox', target: '[data-testid="connections"]', who: 'Elena, alum founder',
    title: 'A connection, not a title',
    body: 'Maya now appears under Your connections. Accepting did not make her a team member or cofounder. Adding her to Restwell is a separate step only Elena can take.',
    action: 'Optionally click "Add to Restwell Patch as…" on the request.' },
  { as: ELENA, url: '/', target: '[data-testid="find-match-cta"]', who: 'GT Swarm',
    title: 'Every direction',
    body: 'Alumni to alumni, alumni to students, students to alumni, and students to students. GT Swarm helps Yellow Jackets find the people they need to build what’s next.' },
];

const KEY = 'gtswarm-tour';
const START_EVENT = 'gtswarm:tour-start';
const CARD_W = 340;

/** Start the guided demo from anywhere (resets demo data first). */
export function startTour() { window.dispatchEvent(new Event(START_EVENT)); }

type Rect = { top: number; left: number; width: number; height: number };

export default function DemoTour({ current }: { current: string }) {
  const router = useRouter();
  const path = usePathname();
  const [step, setStep] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [missing, setMissing] = useState(false);
  const [vp, setVp] = useState({ w: 1200, h: 800 });
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(220);

  const save = (s: number | null) => { try { if (s === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, String(s)); } catch { /* storage unavailable */ } };
  useEffect(() => { try { const v = localStorage.getItem(KEY); if (v !== null) setStep(Number(v)); } catch { /* ignore */ } }, []);

  const go = useCallback(async (i: number, viewer: string) => {
    const s = STEPS[i];
    setBusy(true); setRect(null); setStep(i); save(i);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); // close any dialog a previous step opened
    const switching = s.as !== viewer;
    if (switching) await fetch('/api/viewer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: s.as }) });
    // a new account needs a full load so the header and every server component render as that person
    if (switching) { window.location.assign(s.url); return; }
    if (window.location.pathname + window.location.search !== s.url) router.push(s.url);
    setBusy(false);
  }, [router]);

  useEffect(() => {
    const onStart = async () => {
      setBusy(true);
      await fetch('/api/demo/reset', { method: 'POST' });
      await go(0, '');
    };
    window.addEventListener(START_EVENT, onStart);
    return () => window.removeEventListener(START_EVENT, onStart);
  }, [go]);

  const s = step !== null ? STEPS[step] : null;
  const stepPath = s ? s.url.split('?')[0] : '';
  const onPage = !!s && decodeURIComponent(path) === decodeURIComponent(stepPath);

  // find the target, scroll it into view, and keep tracking its position
  useEffect(() => {
    setMissing(false);
    if (!s || !onPage || !s.target) { setRect(null); return; }
    let found: Element | null = null, tries = 0, scrolled = false, prepared = false;
    const tick = () => {
      setVp({ w: window.innerWidth, h: window.innerHeight });
      // "a || b": highlight a, or b once a is gone (for example, a button that turns into a form)
      const el = s.target!.split(" || ").map((q) => document.querySelector(q)).find(Boolean) ?? null;
      if (!el) {
        tries++;
        if (s.prepare && !prepared && tries > 4) { const p = document.querySelector<HTMLElement>(s.prepare); if (p) { p.click(); prepared = true; } }
        if (tries > 100) setMissing(true); // about 15 s: searches can take a while on a cold start
        setRect(null); return;
      }
      setMissing(false);
      if (!scrolled || el !== found) {
        found = el; scrolled = true;
        const r0 = el.getBoundingClientRect();
        if (r0.top < 90 || r0.bottom > window.innerHeight - 40) {
          // leave room for the sticky header; center targets that fit
          const tall = r0.height > window.innerHeight - 200;
          window.scrollTo({ top: window.scrollY + r0.top - (tall ? 96 : Math.max(96, (window.innerHeight - r0.height) / 2)), behavior: 'smooth' });
        }
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    tick();
    const id = window.setInterval(tick, 150);
    return () => window.clearInterval(id);
  }, [s, onPage]);

  useEffect(() => { if (cardRef.current) setCardH(cardRef.current.offsetHeight); });

  if (!s || step === null) return null;
  const last = step === STEPS.length - 1;
  const exit = () => { setStep(null); save(null); setRect(null); };
  const next = () => (last ? (exit(), router.push('/')) : go(step + 1, current));
  const back = () => step > 0 && go(step - 1, current);

  // place the card: below, above, beside, or pinned to the corner
  const pad = 10, gap = 18;
  let card = { top: vp.h - cardH - 24, left: vp.w - CARD_W - 24 };
  let arrow: { side: 'top' | 'bottom' | 'left' | 'right'; at: number } | null = null;
  if (rect && onPage) {
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const clampX = (x: number) => Math.max(16, Math.min(vp.w - CARD_W - 16, x));
    const clampY = (y: number) => Math.max(76, Math.min(vp.h - cardH - 16, y));
    if (vp.h - (rect.top + rect.height) >= cardH + gap + pad + 8) {
      card = { top: rect.top + rect.height + pad + gap, left: clampX(cx - CARD_W / 2) }; arrow = { side: 'top', at: cx - card.left };
    } else if (rect.top - 70 >= cardH + gap + pad) {
      card = { top: rect.top - pad - gap - cardH, left: clampX(cx - CARD_W / 2) }; arrow = { side: 'bottom', at: cx - card.left };
    } else if (vp.w - (rect.left + rect.width) >= CARD_W + gap + pad + 16) {
      card = { top: clampY(cy - cardH / 2), left: rect.left + rect.width + pad + gap }; arrow = { side: 'left', at: Math.min(cardH - 20, Math.max(20, cy - card.top)) };
    } else if (rect.left >= CARD_W + gap + pad + 16) {
      card = { top: clampY(cy - cardH / 2), left: rect.left - pad - gap - CARD_W }; arrow = { side: 'right', at: Math.min(cardH - 20, Math.max(20, cy - card.top)) };
    }
    if (arrow && (arrow.side === 'top' || arrow.side === 'bottom')) arrow.at = Math.min(CARD_W - 24, Math.max(24, arrow.at));
  }

  return (
    <>
      {/* spotlight: the huge shadow dims everything except the target; clicks pass through */}
      {rect && onPage ? (
        <div aria-hidden="true" className="pointer-events-none fixed z-[85] rounded-xl transition-all duration-200"
          style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: '0 0 0 9999px rgba(0, 26, 51, 0.55)', outline: '3px solid #EAAA00', outlineOffset: 0 }}>
          <span className="tour-pulse absolute inset-0 rounded-xl" />
        </div>
      ) : (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[85] bg-navy-900/30" />
      )}

      <div ref={cardRef} role="dialog" aria-label={`Demo step ${step + 1} of ${STEPS.length}`} data-testid="tour-card"
        className="fixed z-[90] rounded-2xl bg-white shadow-2xl ring-1 ring-navy/10 transition-all duration-200"
        style={{ top: card.top, left: card.left, width: CARD_W }}>
        {arrow && <TourArrow side={arrow.side} at={arrow.at} />}
        <div className="h-1.5 overflow-hidden rounded-t-2xl bg-navy/10"><div className="h-full bg-gold transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-dark">Step {step + 1} of {STEPS.length} · {s.who}</div>
            <button onClick={exit} className="-mr-1 -mt-1 rounded p-1 text-ink/40 hover:text-navy" aria-label="Exit demo">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
          <h3 className="mt-1 font-display text-lg font-bold leading-snug text-navy">{s.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink/75">{s.body}</p>
          {onPage && s.action && (
            <p className="mt-2 flex gap-2 rounded-lg bg-gold/15 px-3 py-2 text-sm font-medium text-navy">
              <svg className="mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2l10 5.5-4.2 1.3L11 14l-2 1-2.2-5.2L3 13z" fill="#B3A369" /></svg>
              {s.action}
            </p>
          )}
          {!onPage && !busy && (
            <p className="mt-2 rounded-lg bg-navy/5 px-3 py-2 text-xs text-ink/70">You left this step’s page. Click <strong>Return</strong> to pick up where you were.</p>
          )}
          {onPage && s.target && !rect && !busy && (missing
            ? <p className="mt-2 rounded-lg bg-navy/5 px-3 py-2 text-xs text-ink/70">Nothing to highlight here yet. If you skipped the click in the previous step, press <strong>Back</strong> and try it, or press <strong>Next</strong> to keep going.</p>
            : <p className="mt-2 text-xs text-ink/50">Loading…</p>)}
          <div className="mt-3 flex items-center justify-between">
            <button onClick={back} disabled={step === 0 || busy} className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-navy/70 hover:text-navy disabled:opacity-30">Back</button>
            {onPage ? (
              <button onClick={next} disabled={busy} className="rounded-md bg-navy px-4 py-1.5 text-sm font-semibold text-white hover:bg-navy-700">{busy ? '…' : last ? 'Finish' : 'Next'}</button>
            ) : (
              <button onClick={() => go(step, current)} disabled={busy} className="rounded-md bg-gold px-4 py-1.5 text-sm font-bold text-navy-900 hover:bg-gold-light">{busy ? '…' : 'Return'}</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function TourArrow({ side, at }: { side: 'top' | 'bottom' | 'left' | 'right'; at: number }) {
  // a gold arrow that sits on the card edge and points at the highlighted element
  const rot = { top: 0, bottom: 180, left: -90, right: 90 }[side];
  const style: React.CSSProperties = side === 'top' ? { top: -30, left: at - 12 } : side === 'bottom' ? { bottom: -30, left: at - 12 } : side === 'left' ? { left: -30, top: at - 12 } : { right: -30, top: at - 12 };
  return (
    <span className={`absolute ${side === 'top' || side === 'bottom' ? 'tour-bob-y' : 'tour-bob-x'}`} style={style} aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 24 24" style={{ transform: `rotate(${rot}deg)` }}>
        <path d="M12 2l8 10h-5v10H9V12H4z" fill="#EAAA00" stroke="#003057" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
