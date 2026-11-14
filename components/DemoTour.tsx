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
const FIND_ENGINEER = '/match?mode=people&q=wearable+firmware+engineer&role=Early+engineer&aud=students';
const FOR_MAYA = '/match?mode=startups';
const NAV = (href: string) => `header a[href="${href}"]`;
const PERSONA = '[data-testid="persona-menu"] || [data-tour="persona"]';
const viewing = (name: string) => `[data-tour="persona"][aria-label^="Viewing as ${name}"]`;
const FIRST_PERSON = '[data-testid="people-results"] > li:first-child';
const RESTWELL_MATCH = '[data-testid="startup-results"] li[data-build="project:pr009"]';
const RESTWELL_REQUEST = '[data-testid="request-received"]:has(a[href="/projects/project%3Apr009"])';
const RESTWELL_ACCEPTED = '[data-testid="request-received"][data-status="accepted"]:has(a[href="/projects/project%3Apr009"])';

const STEPS: Step[] = [
  { as: ELENA, url: '/', target: '[data-tour="stats"]', who: 'Why GT Swarm',
    title: 'The talent is here. The connections aren’t.',
    body: 'GT startups have dozens of open roles, and the alumni and students who could fill them never see them. You will fix that in two minutes, hands on.' },

  // Find People: alum to alum
  { as: ELENA, url: '/', target: NAV('/match'), who: 'Find People · Alum → Alum',
    title: 'You are Elena, an alum founder',
    body: 'She is building Restwell, a medical wearable, and needs a cofounder.',
    action: 'Click “Find Matches” in the top bar.', donePath: '/match', autoNext: true, skipUrl: '/match' },
  { as: ELENA, url: '/match', target: `${FIRST_PERSON} || [data-tour="match-form"]`, who: 'Find People · Alum → Alum',
    title: 'Describe exactly who you need',
    body: 'Type your own need, or fill the example. It also sets the role (Cofounder) and the audience (Alumni).',
    action: 'Click “Alumni cofounder for a medical wearable”, then “Find people”.',
    done: '[data-testid="people-results"]', skipUrl: FIND_COFOUNDER,
    doneBody: 'Dana Whitfield is the top match. Only alumni open to cofounding are ranked, and the reason on her card comes from her own record.' },
  { as: ELENA, url: '/match', target: `${FIRST_PERSON}:has([data-testid="why-breakdown"]) || ${FIRST_PERSON} button[aria-expanded]`, prepare: '[data-testid="view-cards"]', who: 'Find People · Alum → Alum',
    title: 'Why Dana?',
    body: 'Every match explains itself.',
    action: 'Click “Why this match?” on her card.',
    done: `${FIRST_PERSON} [data-testid="why-breakdown"]`, skipClick: `${FIRST_PERSON} button[aria-expanded]`,
    doneBody: 'Real work, not keywords: she solved a battery problem on a wearable board and wants to cofound. The score adds up from that.' },
  { as: ELENA, url: '/match', target: '[data-testid="relevance-web"] || [data-testid="view-network"]', corner: true, who: 'Find People · Alum → Alum',
    title: 'See the match map',
    body: 'The same results as a network.',
    action: 'Click “View network” above the results.',
    done: '[data-testid="relevance-web"]', skipClick: '[data-testid="view-network"]',
    doneBody: 'Best fits sit closest to the center. Lines link people who have built together.' },
  { as: ELENA, url: '/match', target: `${FIRST_PERSON} [role="status"] || ${FIRST_PERSON} [data-testid="invite-form"] || ${FIRST_PERSON} [data-testid="invite-button"] || [data-testid="view-cards"]`, who: 'Find People · Alum → Alum',
    title: 'Invite Dana',
    body: 'One click to reach the right alum.',
    action: 'Click “Matches”, then “Invite to connect” on Dana’s card, then “Send invite”.',
    done: `${FIRST_PERSON} [role="status"]`, skipClick: `[data-testid="view-cards"] && ${FIRST_PERSON} [data-testid="invite-button"] && ${FIRST_PERSON} [data-testid="invite-send"]`,
    doneBody: 'Sent. Dana will see it in her inbox with the reason attached.' },

  // Find People: alum to student
  { as: ELENA, url: '/match', target: '[data-testid="people-results"][data-aud="students"] > li:first-child || [data-tour="match-form"]', who: 'Find People · Alum → Student',
    title: 'Now find a student engineer',
    body: 'Elena also needs an engineer. The same search works for students.',
    action: 'Click “Student firmware engineer”, then “Find people”.',
    done: '[data-testid="people-results"][data-aud="students"]', skipUrl: FIND_ENGINEER,
    doneBody: 'Students with real firmware work lead, like Maya Okafor. Same engine, alum to student.' },

  // Builder profile
  { as: ELENA, url: '/match', target: PERSONA, corner: true, who: 'Switch sides',
    title: 'Now be Maya, a student',
    body: 'Anyone can try any persona. They are fictional.',
    action: 'Open “Viewing as” at the top right and pick Maya Okafor.',
    done: viewing('Maya'), autoNext: true, skipAs: MAYA },
  { as: MAYA, url: '/match', target: NAV('/profile'), who: 'Builder profile',
    title: 'Open her builder profile',
    body: 'Profiles are what matching runs on.',
    action: 'Click “My Profile”.', donePath: '/profile', autoNext: true, skipUrl: '/profile' },
  { as: MAYA, url: '/profile', target: 'section[aria-label="Current profile"]', who: 'Builder profile',
    title: 'What matching runs on',
    body: 'Maya’s projects, skills, and the roles she is open to. Founders find her by this, and it picks her startups.' },
  { as: MAYA, url: '/join?invite=alumni', target: '[data-testid="profile-draft"] || [data-testid="sample-resume"]', who: 'Builder profile',
    title: 'New members start from a resume',
    body: 'Alumni join from an Alumni Association invite.',
    action: 'Click “Use a sample resume”.',
    done: '[data-testid="profile-draft"]', skipClick: '[data-testid="sample-resume"]',
    doneBody: 'The bio, skills and projects filled in from the resume, ready to review. Nothing is saved until they confirm.' },

  // Find Startups: student to alum
  { as: MAYA, url: '/join?invite=alumni', target: `${RESTWELL_MATCH} || [data-testid="mode-startups"] || ${NAV('/match')}`, who: 'Find Startups · Student → Alum',
    title: 'Find startups that need Maya',
    body: 'No typing needed: Find Startups uses her profile.',
    action: 'Click “Find Matches”, then the “Find Startups” tab.',
    done: RESTWELL_MATCH, skipUrl: FOR_MAYA,
    doneBody: 'Restwell is looking for the BLE firmware skills Maya already has. That is Elena’s startup.' },
  { as: MAYA, url: '/match', target: RESTWELL_MATCH, who: 'Find Startups · Student → Alum',
    title: 'Request to join Restwell',
    body: 'A student reaching an alumni founder.',
    action: 'Click “Request to join”, then “Send request”.',
    done: `${RESTWELL_MATCH} [role="status"]`, skipClick: `${RESTWELL_MATCH} [data-testid="collab-button"] && ${RESTWELL_MATCH} .btn-primary`,
    doneBody: 'Sent to Elena.' },

  // Connect: alum to alum
  { as: MAYA, url: '/match', target: PERSONA, corner: true, who: 'Connect · Alum ↔ Alum',
    title: 'Now be Dana, the alum Elena invited',
    body: '',
    action: 'Open “Viewing as” and pick Dana Whitfield.',
    done: viewing('Dana'), autoNext: true, skipAs: DANA },
  { as: DANA, url: '/match', target: NAV('/inbox'), who: 'Connect · Alum ↔ Alum',
    title: 'Open Dana’s inbox', body: '',
    action: 'Click “Inbox”.', donePath: '/inbox', autoNext: true, skipUrl: '/inbox' },
  { as: DANA, url: '/inbox', target: RESTWELL_REQUEST, who: 'Connect · Alum ↔ Alum',
    title: 'Elena’s invite, with the reason',
    body: 'Nothing happens without a yes.',
    action: 'Click Accept.',
    done: RESTWELL_ACCEPTED, skipClick: `${RESTWELL_REQUEST} button`,
    doneBody: 'Two alumni, connected.' },

  // Connect: student to alum
  { as: DANA, url: '/inbox', target: PERSONA, corner: true, who: 'Connect · Student ↔ Alum',
    title: 'Back to Elena', body: 'Maya’s request is waiting.',
    action: 'Open “Viewing as” and pick Elena Brooks.',
    done: viewing('Elena'), autoNext: true, skipAs: ELENA },
  { as: ELENA, url: '/inbox', target: RESTWELL_REQUEST, who: 'Connect · Student ↔ Alum',
    title: 'Maya wants to join Restwell', body: '',
    action: 'Click Accept.',
    done: RESTWELL_ACCEPTED, skipClick: `${RESTWELL_REQUEST} button`,
    doneBody: 'Connected. Adding Maya to the team stays Elena’s choice.' },

  { as: ELENA, url: '/swarm', target: '[data-testid="relevance-web"]', corner: true, who: 'The network',
    title: 'Two new connections, mapped',
    body: 'Dana and Maya now sit on Elena’s map. Every connection improves the next match.' },
  { as: ELENA, url: '/', target: '[data-testid="find-match-cta"]', who: 'GT Swarm',
    title: 'The right people for every GT startup',
    body: 'Alum to alum, alum to student, student to alum: matched on what they have built and what they want.' },
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
    let found: Element | null = null, tries = 0, prepIdx = 0;
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
      if (el !== found) {
        found = el;
        const r0 = el.getBoundingClientRect();
        if (r0.top < 90 || r0.bottom > window.innerHeight - 40) {
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
    for (const sel of (s.skipClick ?? '').split(' && ').filter(Boolean)) {
      document.querySelector<HTMLElement>(sel)?.click();
      await new Promise((r) => setTimeout(r, 700));
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
