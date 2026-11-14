'use client';
import { startTour } from './DemoTour';

/** Starts the guided demo: resets the demo data, then walks through the story with highlights and arrows. */
export default function DemoButton({ variant = 'nav' }: { variant?: 'nav' | 'hero' }) {
  return (
    <button onClick={startTour} data-testid={variant === 'nav' ? 'demo-button' : 'try-demo'}
      className={variant === 'nav'
        ? 'inline-flex items-center gap-1.5 rounded-full bg-gold px-3.5 py-1.5 text-sm font-bold text-navy-900 shadow hover:bg-gold-light'
        : 'btn-gold px-6 py-3 text-base'}>
      <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2.5l10 5.5-10 5.5z" fill="currentColor" /></svg>
      {variant === 'nav' ? 'Demo' : 'Try Demo'}
    </button>
  );
}
