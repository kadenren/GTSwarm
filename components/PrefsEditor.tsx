'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MATCH_ROLES, roleLabel } from '@/lib/roles';

interface Option { v: string; l: string }

/** What you are here for. These drive Find Startups and who sees you in Find People; change them anytime. */
export default function PrefsEditor({ options, initial }: { options: readonly Option[]; initial: { interests: string[]; lookingFor: string; openTo: string[]; hours: number; saved: boolean } }) {
  const router = useRouter();
  const [interests, setInterests] = useState(initial.interests);
  const [openTo, setOpenTo] = useState(initial.openTo);
  const [hours, setHours] = useState(initial.hours);
  const [lookingFor, setLookingFor] = useState(initial.lookingFor);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toggle = (list: string[], set: (x: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  async function save() {
    setBusy(true);
    const res = await fetch('/api/profile/prefs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ interests, openTo, hours, lookingFor }) });
    setBusy(false);
    setStatus(res.ok ? 'Saved. Your matches now use these preferences.' : 'Could not save.');
    if (res.ok) router.refresh();
  }
  const chip = (on: boolean) => `rounded-full border px-3 py-1 text-sm font-medium ${on ? 'border-navy bg-navy text-white' : 'border-navy/20 bg-white text-navy hover:border-navy/50'}`;
  return (
    <section className="card p-5" aria-label="What you are looking for" data-testid="prefs-editor">
      <h2 className="font-display text-lg font-bold text-navy">What you&apos;re here for</h2>
      <p className="text-xs text-ink/55">{initial.saved ? 'Your saved preferences.' : 'Filled in from your record. Adjust and save.'} You can change these anytime.</p>
      <h3 className="label mt-4">Interests</h3>
      <div className="flex flex-wrap gap-1.5">{options.map((o) => <button key={o.v} type="button" aria-pressed={interests.includes(o.v)} onClick={() => toggle(interests, setInterests, o.v)} className={chip(interests.includes(o.v))}>{o.l}</button>)}</div>
      <h3 className="label mt-4">Roles you are open to</h3>
      <div className="flex flex-wrap gap-1.5">{MATCH_ROLES.map((r) => <button key={r} type="button" aria-pressed={openTo.includes(r)} onClick={() => toggle(openTo, setOpenTo, r)} className={chip(openTo.includes(r))}>{roleLabel(r)}</button>)}</div>
      <p className="mt-1 text-[11px] text-ink/50">Founders only find you for roles you choose here.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px]">
        <label className="block"><span className="label">What you want to work on</span>
          <input className="input" value={lookingFor} maxLength={280} onChange={(e) => setLookingFor(e.target.value)} placeholder="Early-stage hardware startups in health and wearables" /></label>
        <label className="block"><span className="label">Hours per week</span>
          <input className="input" type="number" min={0} max={40} value={hours} onChange={(e) => setHours(Number(e.target.value))} /></label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save preferences'}</button>
        {status && <span className="text-sm text-teal" role="status" data-testid={status.startsWith("Saved") ? "prefs-saved" : undefined}>{status}</span>}
      </div>
    </section>
  );
}
