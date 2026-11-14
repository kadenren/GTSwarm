'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** Verified alumni propose a posting. It waits for a moderator before anyone else sees it. */
export default function PostOpportunity() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ kind: 'full-time', title: '', org: '', description: '', location: '', mode: 'Hybrid', skills: '', audience: 'both', deadline: '', apply: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch('/api/opportunities', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...v, skills: v.skills.split(',').map((x) => x.trim()).filter(Boolean), deadline: v.deadline || null }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: d.error ?? 'Could not submit.' }); return; }
    setMsg({ ok: true, text: d.status === 'pending' ? 'Submitted. A moderator reviews it before other members can see it.' : 'Published.' });
    setOpen(false);
    router.refresh();
  }
  if (!open) return (
    <div className="flex flex-wrap items-center gap-3">
      <button className="btn-ghost" onClick={() => setOpen(true)} data-testid="post-opportunity">Propose a posting</button>
      {msg && <span className={`text-sm ${msg.ok ? 'text-teal' : 'text-red-700'}`} role="status">{msg.text}</span>}
    </div>
  );
  return (
    <form onSubmit={submit} className="card space-y-3 p-5" aria-label="Propose a posting">
      <h2 className="text-lg font-bold text-navy">Propose a posting</h2>
      <p className="text-xs text-ink/60">Only verified alumni can propose postings. A moderator reviews each one, and postings expire automatically.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label><span className="label">Type</span><select className="input" value={v.kind} onChange={set('kind')}><option value="internship">Internship</option><option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="startup">Startup role</option></select></label>
        <label className="sm:col-span-2"><span className="label">Title</span><input className="input" value={v.title} onChange={set('title')} required /></label>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label><span className="label">Organization</span><input className="input" value={v.org} onChange={set('org')} required /></label>
        <label><span className="label">Location</span><input className="input" value={v.location} onChange={set('location')} /></label>
        <label><span className="label">Work mode</span><select className="input" value={v.mode} onChange={set('mode')}><option>Remote</option><option>Hybrid</option><option>On-site</option></select></label>
      </div>
      <label className="block"><span className="label">Description</span><textarea className="input h-20" value={v.description} onChange={set('description')} required /></label>
      <div className="grid gap-2 sm:grid-cols-3">
        <label><span className="label">Skills (comma separated)</span><input className="input" value={v.skills} onChange={set('skills')} /></label>
        <label><span className="label">Open to</span><select className="input" value={v.audience} onChange={set('audience')}><option value="both">Students and alumni</option><option value="students">Students</option><option value="alumni">Alumni</option></select></label>
        <label><span className="label">Apply by</span><input className="input" type="date" value={v.deadline} onChange={set('deadline')} /></label>
      </div>
      <label className="block"><span className="label">How to apply</span><input className="input" value={v.apply} onChange={set('apply')} placeholder="Official application link or contact" required /></label>
      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'}</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {msg && !msg.ok && <p className="text-sm text-red-700" role="alert">{msg.text}</p>}
    </form>
  );
}
