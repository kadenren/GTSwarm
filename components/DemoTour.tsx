'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Hands-on guided demo. Each step highlights something and either explains it (Next) or asks the visitor to do it:
 * click the real navigation, fill an example, run Find People or Find Startups, invite, switch persona, accept.
 * The tour watches for the result, then explains what they are seeing. "Skip" does the step for them.
 * State lives in localStorage so it survives navigation and persona switches.
 */
const ELENA = 'person:p008', MAYA = 'person:p010', DANA = 'person:p005';

interface Step {
  /** persona this step expects; the tour switches to it if needed (persona-switch steps keep the old one: the visitor switches) */
  as: string;
  /** page the step starts on; compared by path unless it has a query string */
  url: string;
  /** what to highlight; "a || b" highlights the first that exists */
  target?: string;
  /** clicked automatically if the target has not appeared; "a && b" clicks a, then b */
  prepare?: string;
  /** keep the card in the corner (big visuals, or a menu that opens below the target) */
  corner?: boolean;
  who: string; title: string; body: string; action?: string;
  /** hands-on: the step is done when this element exists and/or this path is reached */
  done?: string; donePath?: string;
  /** after it is done: move on by itself (navigation, persona switches) ... */
  autoNext?: boolean;
  /** ... or explain the result before Next */
  doneBody?: string;
  /** what Skip does: open a page, switch persona, or click ("a && b") */
  skipUrl?: string; skipAs?: string; skipClick?: string;
}

const FIND_COFOUNDER = "/match?mode=people&q=I%27m+building+a+wearable+medical+device+startup+and+need+an+alumni+cofounder+with+embedded+hardware+or+medical-device+expertise.&role=Cofounder&aud=alumni";
const RESTWELL_PAGE = '/projects/project%3Apr009';
const FIRST_PERSON = '[data-testid="people-results"] > li:first-child';
const RESTWELL_CARD = `[data-testid="discover-grid"] li:has(a[href="${RESTWELL_PAGE}"])`;
const RESTWELL_MATCH = '[data-testid="startup-results"] li[data-build="project:pr009"]';
const RESTWELL_REQUEST = `[data-testid="request-received"]:has(a[href="${RESTWELL_PAGE}"])`;
const RESTWELL_ACCEPTED = `[data-testid="request-received"][data-status="accepted"]:has(a[href="${RESTWELL_PAGE}"])`;

const STUCK_SECURITY_Q = '/stuck?q=Hospital+IT+security+review+stalled+our+pilot';
const TARA = 'person:p223';
const ELENA_TO_TARA = `[data-testid="request-received"][data-from="${ELENA}"]`;
const TARA_CONNECTED = `[data-testid="request-sent"][data-to="${TARA}"][data-status="accepted"]`;

/**
 * The judge story (about two minutes): Georgia Tech alumni finding other alumni, then students.
 * Elena (alum founder) finds an alumni cofounder she'd never heard of and the warm path to her; then finds the alum who
 * already solved her stalled hospital review, connects, and gets her contact once Tara says yes. Maya (student) is
 * matched to Elena's startup. Impact for GT counts it; the pilot shows how GT runs it.
 */
const STEPS: Step[] = [
  { as: ELENA, url: '/', target: RESTWELL_CARD, who: 'Meet Elena',
    title: 'Elena is a GT alum building a startup.',
    body: 'Restwell Patch, a medical wearable. She needs an alum with hardware experience, and later, an alum who has been through a hospital security review. Thousands of Yellow Jackets could help. She knows almost none of them.' },

  { as: ELENA, url: '/match', target: `${FIRST_PERSON} || [data-tour="match-form"]`, who: 'Alum finds alum',
    title: 'She describes who she needs', body: 'Plain words, no keywords to guess.',
    action: 'Click “Alumni cofounder for a medical wearable”, then “Find people”.',
    done: '[data-testid="people-results"]', skipUrl: FIND_COFOUNDER,
    doneBody: 'Dana Whitfield, class of ’18, shipped a wearable and is open to cofounding. Two alumni, three years apart, who had never met.' },
  { as: ELENA, url: '/match', target: `${FIRST_PERSON}:has([data-testid="why-breakdown"]) || ${FIRST_PERSON} button[aria-expanded]`, prepare: '[data-testid="view-cards"]', who: 'Alum finds alum',
    title: 'Why Dana?', body: '',
    action: 'Click “Why this match?”.',
    done: `${FIRST_PERSON} [data-testid="why-breakdown"]`, skipClick: `${FIRST_PERSON} button[aria-expanded]`,
    doneBody: 'Not a keyword hit. Every line is something Dana actually built or said she wants to do.' },
  { as: ELENA, url: '/match', target: '[data-testid="relevance-web"] || [data-testid="view-network"]', corner: true, who: 'The alumni web',
    title: 'Now look behind the list', body: '',
    action: 'Click “View network”.',
    done: '[data-testid="relevance-web"]', skipClick: '[data-testid="view-network"]',
    doneBody: 'Every dot is a Yellow Jacket; closer to the center means more relevant. Every line is two people who actually built something together.' },
  { as: ELENA, url: '/match', target: '[data-testid="person-panel"] || [data-testid="relevance-web"]', corner: true, who: 'The alumni web',
    title: 'Is there a way in?', body: '',
    action: 'Click Dana, the gold-ringed node nearest the center.',
    done: '[data-testid="person-panel"]', skipClick: '[data-testid="relevance-web"] g.node[data-id="person:p005"]',
    doneBody: 'Elena → Diego Park → Dana. Elena already knows someone who worked beside Dana. A warm introduction no one could see before.' },
  { as: ELENA, url: '/match', target: `${FIRST_PERSON} [role="status"] || ${FIRST_PERSON} [data-testid="invite-form"] || ${FIRST_PERSON} [data-testid="invite-button"]`, prepare: '[data-testid="view-cards"]', who: 'Alum finds alum',
    title: 'Reach out', body: '',
    action: 'Click “Invite to connect”, then “Send invite”.',
    done: `${FIRST_PERSON} [role="status"]`, skipClick: `${FIRST_PERSON} [data-testid="invite-button"] && ${FIRST_PERSON} [data-testid="invite-send"]`,
    doneBody: 'Sent, with the reason attached. Dana decides.' },

  { as: ELENA, url: '/stuck', target: '[data-testid="best-match"] || form', who: 'Get Unstuck',
    title: 'Then her hospital pilot stalls', body: 'A hospital security review has frozen it for weeks, and no one on her team has done one. Someone in the GT network has.',
    action: 'Click “Hospital security review stalled our pilot”.',
    done: '[data-testid="best-match"]', skipUrl: STUCK_SECURITY_Q,
    doneBody: 'Tara Holloway, class of ’17, an alum founder who got a hospital pilot through this exact review. Found by the problem she solved, not by her job title.' },
  { as: ELENA, url: '/stuck', target: '[data-testid="matched-problem"] || [data-testid="best-match"]', corner: true, who: 'Get Unstuck',
    title: 'How did she solve it?', body: '',
    action: 'Click “See how Tara solved it”.',
    done: '[data-testid="matched-problem"]', skipClick: '[data-testid="best-match-why"]',
    doneBody: 'Her fix is on record, with the project it happened on. Elena knows Tara is the right person before she reaches out.' },
  { as: ELENA, url: '/stuck', target: '[data-testid="request-status"] || [data-testid="request-send"] || [data-testid="person-panel"] [data-testid="request-button"]', corner: true, who: 'Get Unstuck',
    title: 'Connect with Tara', body: '',
    action: 'Click “Connect with Tara”, then “Send request”.',
    done: '[data-testid="request-status"]', skipClick: '[data-testid="person-panel"] [data-testid="request-button"] && [data-testid="request-send"]',
    doneBody: 'The request goes to Tara with the problem attached.' },
  { as: TARA, url: '/inbox', target: ELENA_TO_TARA, who: 'Tara’s inbox',
    title: 'Tara sees a fellow alum stuck where she once was', body: 'She can accept or decline. Nothing is shared until she says yes.',
    action: 'Click Accept.',
    done: `${ELENA_TO_TARA}[data-status="accepted"]`, skipClick: `${ELENA_TO_TARA} button`,
    doneBody: 'Accepted.' },
  { as: ELENA, url: '/inbox', target: `${TARA_CONNECTED} [data-testid="contact-shared"] || [data-testid="connections"]`, who: 'Connected',
    title: 'Now they can talk directly', body: 'Because Tara said yes, Elena gets her contact details, and Tara gets Elena’s. Two alumni who had never met are now working the problem together, and that new tie joins the web for the next match.' },

  { as: MAYA, url: '/match', target: `${RESTWELL_MATCH} || [data-testid="mode-startups"]`, who: 'Students too',
    title: 'Meanwhile, Maya, a student', body: 'She built Bluetooth firmware in class and has never heard of Restwell.',
    action: 'Click “Find Your Startup”.',
    done: RESTWELL_MATCH, skipClick: '[data-testid="mode-startups"]',
    doneBody: 'Elena’s startup, found for her from what she has already built. Alumni find each other, and students find the alumni building things they can join.' },

  { as: ELENA, url: '/impact', target: '[data-tour="impact"]', who: 'For SGA',
    title: 'Every connection is counted', body: 'Alum-to-alum, student-to-alum, problems solved through the network. Live numbers from this demo, ready for an SGA report.' },
  { as: ELENA, url: '/pilot', target: '[data-tour="pilot-timeline"]', who: 'Next semester',
    title: 'These connections happen at GT today, by luck.',
    body: 'GT Swarm makes them happen on purpose. One opt-in semester with CREATE-X and the Alumni Association (proposed), no university records, and it already runs: you just used it.' },
];

const KEY = 'gtswarm-tour';
const START_EVENT = 'gtswarm:tour-start';
const CARD_W = 340;

/** Start the guided demo from anywhere (starts a fresh demo session first). */
export function startTour() { window.dispatchEvent(new Event(START_EVENT)); }

type Rect = { top: number; left: number; width: number; height: number };
const pick = (sel: string) => sel.split(' || ').map((q) => document.querySelector(q)).find(Boolean) ?? null;
const pathOf = (url: string) => url.split('?')[0];
const isHandsOn = (s: Step) => !!(s.done || s.donePath);

export default function DemoTour({ current }: { current: string }) {
  const router = useRouter();
  const path = usePathname();
  const [step, setStep] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [missing, setMissing] = useState(false);
  const [done, setDone] = useState(false);
  const [vp, setVp] = useState({ w: 1200, h: 800 });
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(220);
  const currentRef = useRef(current);
  currentRef.current = current;

  const save = (s: number | null) => { try { if (s === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, String(s)); } catch { /* storage unavailable */ } };
  useEffect(() => { try { const v = localStorage.getItem(KEY); if (v !== null) setStep(Number(v)); } catch { /* ignore */ } }, []);

  const go = useCallback(async (i: number, viewer: string) => {
    const s = STEPS[i];
    setBusy(true); setRect(null); setDone(false); setStep(i); save(i);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); // close any dialog or menu a previous step opened
    if (s.as !== viewer) {
      await fetch('/api/viewer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: s.as }) });
      window.location.assign(s.url); // a new persona needs a full load so every server component renders as them
      return;
    }
    // hands-on pages keep their state (results, filters): only navigate when on a different page
    const here = s.url.includes('?') ? window.location.pathname + window.location.search : window.location.pathname;
    if (here !== s.url) router.push(s.url);
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
  // hands-on steps move between pages as part of the action, so they count as "on the page" anywhere
  const onPage = !!s && (isHandsOn(s) || decodeURIComponent(path) === decodeURIComponent(pathOf(s.url)));

  // hands-on: watch for the result of the visitor's action
  useEffect(() => {
    if (!s || step === null || !isHandsOn(s)) return;
    let fired = false;
    const check = () => {
      if (fired) return;
      const ok = (!s.donePath || window.location.pathname === s.donePath) && (!s.done || !!document.querySelector(s.done));
      if (!ok) return;
      fired = true;
      setDone(true);
      if (s.autoNext && step < STEPS.length - 1) setTimeout(() => go(step + 1, currentRef.current), 400);
    };
    check();
    const id = window.setInterval(check, 250);
    return () => window.clearInterval(id);
  }, [s, step, go]);

  // find the target, scroll it into view, and keep tracking its position
  useEffect(() => {
    setMissing(false);
    if (!s || !onPage || !s.target) { setRect(null); return; }
    let tries = 0, prepIdx = 0, lastScroll = 0;
    const started = Date.now();
    const prep = s.prepare ? s.prepare.split(' && ') : [];
    const tick = () => {
      setVp({ w: window.innerWidth, h: window.innerHeight });
      const el = pick(s.target!);
      if (!el) {
        tries++;
        if (prepIdx < prep.length && tries > 4) { const p = document.querySelector<HTMLElement>(prep[prepIdx]); if (p) { p.click(); prepIdx++; tries = 0; } }
        if (tries > 100) setMissing(true);
        setRect(null); return;
      }
      setMissing(false);
      // bring the target into view; retry for the first few seconds in case a page refresh undid it,
      // then leave scrolling to the visitor
      const r0 = el.getBoundingClientRect();
      const now = Date.now();
      const tallTarget = r0.height > window.innerHeight - 200;
      const outOfView = tallTarget ? r0.top < 60 || r0.top > window.innerHeight * 0.5 : r0.top < 90 || r0.bottom > window.innerHeight - 40;
      if (outOfView && now - started < 6000 && now - lastScroll > 1200) {
        lastScroll = now;
        {
          const tall = r0.height > window.innerHeight - 200;
          const goal = Math.max(0, Math.min(document.documentElement.scrollHeight - window.innerHeight, window.scrollY + r0.top - (tall ? 96 : Math.max(96, (window.innerHeight - r0.height) / 2))));
          window.scrollTo({ top: goal, behavior: 'smooth' });
          // browsers can drop a smooth scroll (busy page, background tab): jump if it did not get there
          setTimeout(() => { if (Math.abs(window.scrollY - goal) > 40) window.scrollTo({ top: goal }); }, 700);
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
  const handsOn = isHandsOn(s);
  const waiting = handsOn && !done;
  const exit = () => { setStep(null); save(null); setRect(null); };
  const next = () => (last ? (exit(), router.push('/')) : go(step + 1, currentRef.current));
  const back = () => step > 0 && go(step - 1, currentRef.current);
  async function skip() {
    if (!s) return;
    if (s.skipAs) {
      setBusy(true);
      await fetch('/api/viewer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: s.skipAs }) });
      window.location.reload(); // the watcher sees the new persona after reload and moves on
      return;
    }
    if (s.skipUrl) { router.push(s.skipUrl); return; }
    // click each in turn, waiting up to 8s for it to appear (results and panels render after a fetch)
    for (const sel of (s.skipClick ?? '').split(' && ').filter(Boolean)) {
      let el: HTMLElement | null = null;
      for (let i = 0; i < 40 && !(el = document.querySelector<HTMLElement>(sel)); i++) await new Promise((r) => setTimeout(r, 200));
      if (el && typeof el.click === 'function') el.click();
      else el?.dispatchEvent(new MouseEvent('click', { bubbles: true })); // SVG nodes on the network map
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // place the card: below, above, beside, or pinned to the corner
  const pad = 10, gap = 18;
  let card = { top: vp.h - cardH - 24, left: vp.w - CARD_W - 24 };
  let arrow: { side: 'top' | 'bottom' | 'left' | 'right'; at: number } | null = null;
  if (rect && onPage && !s.corner) {
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
  const body = done && s.doneBody ? s.doneBody : s.body;

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

      <div ref={cardRef} role="dialog" aria-label={`Demo step ${step + 1} of ${STEPS.length}`} data-testid="tour-card" data-state={waiting ? 'waiting' : 'ready'}
        className="fixed z-[90] rounded-2xl bg-white shadow-2xl ring-1 ring-navy/10 transition-all duration-200"
        style={{ top: card.top, left: card.left, width: CARD_W }}>
        {arrow && <TourArrow side={arrow.side} at={arrow.at} />}
        <div className="h-1.5 overflow-hidden rounded-t-2xl bg-navy/10"><div className="h-full bg-gold transition-all" style={{ width: `${((step + (waiting ? 0.5 : 1)) / STEPS.length) * 100}%` }} /></div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-dark">Step {step + 1} of {STEPS.length} · {s.who}</div>
            <button onClick={exit} className="-mr-1 -mt-1 rounded p-1 text-ink/40 hover:text-navy" aria-label="Exit demo">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
          <h3 className="mt-1 font-display text-lg font-bold leading-snug text-navy">{done && handsOn ? <><span className="mr-1.5 text-teal" aria-hidden="true">✓</span>{s.title}</> : s.title}</h3>
          {body && <p className="mt-1 text-sm leading-relaxed text-ink/75">{body}</p>}
          {onPage && s.action && !done && (
            <p className="mt-2 flex gap-2 rounded-lg bg-gold/15 px-3 py-2 text-sm font-medium text-navy" data-testid="tour-action">
              <svg className="mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2l10 5.5-4.2 1.3L11 14l-2 1-2.2-5.2L3 13z" fill="#B3A369" /></svg>
              <span>{s.action}<span className="mt-0.5 block text-[11px] font-normal text-ink/55">Your turn. The tour continues when you do it.</span></span>
            </p>
          )}
          {!onPage && !busy && (
            <p className="mt-2 rounded-lg bg-navy/5 px-3 py-2 text-xs text-ink/70">You left this step’s page. Click <strong>Return</strong> to pick up where you were.</p>
          )}
          {onPage && !handsOn && s.target && !rect && !busy && (missing
            ? <p className="mt-2 rounded-lg bg-navy/5 px-3 py-2 text-xs text-ink/70">Nothing to highlight here yet. Press <strong>Back</strong> to redo the previous step, or <strong>Next</strong> to keep going.</p>
            : <p className="mt-2 text-xs text-ink/50">Loading…</p>)}
          <div className="mt-3 flex items-center justify-between">
            <button onClick={back} disabled={step === 0 || busy} className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-navy/70 hover:text-navy disabled:opacity-30">Back</button>
            {!onPage ? (
              <button onClick={() => go(step, currentRef.current)} disabled={busy} className="rounded-md bg-gold px-4 py-1.5 text-sm font-bold text-navy-900 hover:bg-gold-light">{busy ? '…' : 'Return'}</button>
            ) : waiting ? (
              <button onClick={skip} disabled={busy} className="rounded-md border border-navy/20 px-3 py-1.5 text-sm font-semibold text-navy/70 hover:border-navy/40 hover:text-navy" data-testid="tour-skip">{busy ? '…' : 'Skip, do it for me'}</button>
            ) : s.autoNext ? (
              <span className="text-xs text-ink/50">Moving on…</span>
            ) : (
              <button onClick={next} disabled={busy} className="rounded-md bg-navy px-4 py-1.5 text-sm font-semibold text-white hover:bg-navy-700" data-testid="tour-next">{busy ? '…' : last ? 'Finish' : 'Next'}</button>
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
