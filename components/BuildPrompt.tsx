'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const EXAMPLES = {
  build: [
    "I'm building a wearable medical device startup and need someone experienced in embedded firmware and FDA regulation.",
    "We're building an autonomous campus shuttle and need embedded engineers who know LiDAR and motor control.",
  ],
  join: [
    "I'm an electrical engineering student interested in robotics, embedded systems, and autonomous vehicles.",
    "I'm a CS student who trains machine learning models on health data and want to join an early-stage startup.",
  ],
};

/** The main entry point: describe what you are building (or what you want to build) in plain words. */
export default function BuildPrompt({ initialMode = 'build', dark = false }: { initialMode?: 'build' | 'join'; dark?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<'build' | 'join'>(initialMode);
  const [text, setText] = useState('');
  const submit = (t = text) => { if (t.trim()) router.push(`/match?mode=${mode}&q=${encodeURIComponent(t.trim())}`); };
  return (
    <form id="start" onSubmit={(e) => { e.preventDefault(); submit(); }} className="rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/5" aria-label="What are you building?">
      <div className="flex gap-1 p-1" role="tablist">
        {([['build', "I'm building something"], ['join', 'I want to join a build']] as const).map(([m, l]) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${mode === m ? 'bg-navy text-white' : 'text-navy/60 hover:text-navy'}`}>{l}</button>
        ))}
      </div>
      <div className="p-1">
        <label htmlFor="build-text" className="sr-only">{mode === 'build' ? 'What are you building?' : 'What can you contribute?'}</label>
        <textarea id="build-text" rows={3} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
          placeholder={mode === 'build' ? "Describe your startup idea, project, or what you're trying to create..." : 'Describe your skills, interests and the role you want: engineer, cofounder, advisor...'}
          className="w-full resize-none rounded-xl border border-navy/15 px-4 py-3 text-base text-ink placeholder:text-ink/35 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES[mode].map((x) => (
              <button key={x} type="button" onClick={() => { setText(x); submit(x); }} className={`max-w-full truncate rounded-full px-3 py-1 text-left text-xs ${dark ? 'bg-navy/5 text-navy' : 'bg-navy/5 text-navy'} hover:bg-gold/30`} title={x}>
                {x.length > 62 ? x.slice(0, 60) + '…' : x}
              </button>
            ))}
          </div>
          <button className="rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-navy-900 transition hover:bg-gold-light" disabled={!text.trim()}>
            {mode === 'build' ? 'Find my people' : 'Find builds for me'}
          </button>
        </div>
      </div>
    </form>
  );
}
