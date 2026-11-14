'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ContactPrefs } from '@/lib/people';

/** Who may contact me, and what I share. Saved on the server; Find People and Communities respect it. */
export default function ContactPrefsForm({ initial, isAlum }: { initial: ContactPrefs; isAlum: boolean }) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [interests, setInterests] = useState(initial.interests.join(', '));
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [err, setErr] = useState('');
  const set = (k: keyof ContactPrefs, v: boolean | string) => { setP({ ...p, [k]: v }); setState('idle'); };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState('saving');
    const res = await fetch('/api/contact-prefs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...p, interests: interests.split(',').map((x) => x.trim()).filter(Boolean) }) });
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error ?? 'Could not save.'); setState('error'); return; }
    setState('saved');
    router.refresh();
  }

  const box = (k: 'openToStudents' | 'openToAlumni' | 'openToCollab' | 'unavailable' | 'shareCity', label: string) => (
    <label className="flex items-start gap-2 text-sm text-navy">
      <input type="checkbox" checked={p[k]} onChange={(e) => set(k, e.target.checked)} className="mt-0.5 accent-[#003057]" data-testid={`pref-${k}`} />{label}
    </label>
  );

  return (
    <form onSubmit={save} className="space-y-4" data-testid="contact-prefs">
      <fieldset className="space-y-2">
        <legend className="label">Who can send me requests</legend>
        {box('openToStudents', isAlum ? 'Current students (for example, to ask for career advice)' : 'Other students')}
        {box('openToAlumni', 'Alumni')}
        {box('openToCollab', 'People who want to work on something together')}
        {box('unavailable', 'Pause all new requests for now')}
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="label">What I share</legend>
        {box('shareCity', 'Show my city so I can find Yellow Jackets nearby')}
      </fieldset>
      <label className="block text-sm"><span className="label">My interests (comma separated)</span>
        <input className="input mt-1 w-full" value={interests} onChange={(e) => { setInterests(e.target.value); setState('idle'); }} /></label>
      <label className="block text-sm"><span className="label">I can help with</span>
        <input className="input mt-1 w-full" value={p.canHelp} onChange={(e) => set('canHelp', e.target.value)} placeholder="For example: resume reviews, moving to Seattle" /></label>
      <label className="block text-sm"><span className="label">I&apos;m interested in</span>
        <input className="input mt-1 w-full" value={p.interestedIn} onChange={(e) => set('interestedIn', e.target.value)} placeholder="For example: product management, meeting people in my city" /></label>
      <div className="flex items-center gap-3">
        <button className="btn-primary px-4 py-2 text-sm" disabled={state === 'saving'} data-testid="save-prefs">{state === 'saving' ? 'Saving…' : 'Save preferences'}</button>
        {state === 'saved' && <span className="text-sm font-semibold text-teal" role="status">Saved</span>}
        {state === 'error' && <span className="text-sm text-red-700" role="alert">{err}</span>}
      </div>
    </form>
  );
}
