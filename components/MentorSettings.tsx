'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Profile = { accepting: boolean; topics: string[]; mentees: string[]; capacity: number; contact: string; note: string };

/** Verified alumni opt into mentoring: topics, who they mentor, capacity, contact preference and whether they accept requests. */
export default function MentorSettings({ initial, topics }: { initial: Profile | null; topics: readonly string[] }) {
  const router = useRouter();
  const [v, setV] = useState<Profile>(initial ?? { accepting: true, topics: [], mentees: ['students'], capacity: 2, contact: 'In-app messages', note: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const toggle = (k: 'topics' | 'mentees', x: string) => setV({ ...v, [k]: v[k].includes(x) ? v[k].filter((y) => y !== x) : [...v[k], x] });
  async function save() {
    setBusy(true);
    const res = await fetch('/api/mentor-profile', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(v) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: 'Saved. Members you mentor can now find you.' } : { ok: false, text: d.error ?? 'Could not save.' });
    if (res.ok) router.refresh();
  }
  const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs font-medium ${on ? 'border-navy bg-navy text-white' : 'border-navy/20 bg-white text-navy'}`;
  return (
    <section className="card p-5" aria-label="Offer mentorship" data-testid="mentor-settings">
      <h2 className="text-lg font-bold text-navy">{initial ? 'Your mentoring settings' : 'Offer mentorship'}</h2>
      <p className="text-xs text-ink/60">Mentees only see you if you opt in. You approve every request.</p>
      <label className="mt-3 flex items-center gap-2 text-sm text-navy"><input type="checkbox" checked={v.accepting} onChange={(e) => setV({ ...v, accepting: e.target.checked })} className="accent-[#003057]" />Accepting new mentees</label>
      <span className="label mt-3">Topics</span>
      <div className="flex flex-wrap gap-1.5">{topics.map((t) => <button key={t} type="button" aria-pressed={v.topics.includes(t)} onClick={() => toggle('topics', t)} className={chip(v.topics.includes(t))}>{t}</button>)}</div>
      <span className="label mt-3">Who you mentor</span>
      <div className="flex gap-1.5">
        {['students', 'alumni'].map((t) => <button key={t} type="button" aria-pressed={v.mentees.includes(t)} onClick={() => toggle('mentees', t)} className={chip(v.mentees.includes(t))}>{t === 'students' ? 'Students' : 'Alumni'}</button>)}
      </div>
      <div className="mt-3 grid grid-cols-[100px_1fr] gap-2">
        <label><span className="label">Capacity</span><input className="input" type="number" min={0} max={10} value={v.capacity} onChange={(e) => setV({ ...v, capacity: Number(e.target.value) })} /></label>
        <label><span className="label">Preferred contact</span><input className="input" value={v.contact} onChange={(e) => setV({ ...v, contact: e.target.value })} /></label>
      </div>
      <label className="mt-2 block"><span className="label">Note for mentees</span><input className="input" value={v.note} maxLength={280} onChange={(e) => setV({ ...v, note: e.target.value })} /></label>
      <div className="mt-3 flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        {msg && <span className={`text-sm ${msg.ok ? 'text-teal' : 'text-red-700'}`} role="status">{msg.text}</span>}
      </div>
    </section>
  );
}
