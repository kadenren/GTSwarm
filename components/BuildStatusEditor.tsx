'use client';
import { roleLabel } from '@/lib/roles';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STAGES = ['Idea', 'Prototype', 'Testing', 'Pilot', 'Launched'];
const ROLES = ['Cofounder', 'Advisor', 'Helper', 'Early engineer', 'First customer'];

/** Team members update their build: stage, whether they are open to collaborators, roles needed and what help they want. */
export default function BuildStatusEditor({ projectId, initial }: { projectId: string; initial: { stage: string; open: boolean; roles: string[]; help: string } }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    setBusy(true); setErr(null);
    const res = await fetch(`/api/builds/${encodeURIComponent(projectId)}/status`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(v) });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error ?? 'Could not save'); return; }
    setEditing(false);
    router.refresh();
  }
  if (!editing) return <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setEditing(true)}>Edit stage and roles</button>;
  return (
    <div className="mt-3 space-y-3 rounded-lg border border-navy/10 bg-paper p-3" aria-label="Edit stage and roles">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-semibold text-navy">Stage</span>
        {STAGES.map((s) => <button key={s} type="button" aria-pressed={v.stage === s} onClick={() => setV({ ...v, stage: s })} className={`rounded-full border px-2.5 py-0.5 ${v.stage === s ? 'border-navy bg-navy text-white' : 'border-navy/20 bg-white text-navy'}`}>{s}</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-semibold text-navy">Looking for</span>
        {ROLES.map((r) => <button key={r} type="button" aria-pressed={v.roles.includes(r)} onClick={() => setV({ ...v, roles: v.roles.includes(r) ? v.roles.filter((x) => x !== r) : [...v.roles, r] })} className={`rounded-full border px-2.5 py-0.5 ${v.roles.includes(r) ? 'border-gold bg-gold text-navy-900' : 'border-navy/20 bg-white text-navy'}`}>{roleLabel(r)}</button>)}
      </div>
      <label className="block"><span className="label">Help needed</span><textarea className="input h-16 text-xs" value={v.help} onChange={(e) => setV({ ...v, help: e.target.value })} /></label>
      <label className="flex items-center gap-2 text-xs text-navy"><input type="checkbox" checked={v.open} onChange={(e) => setV({ ...v, open: e.target.checked })} className="accent-[#003057]" />Open to collaborators</label>
      <div className="flex gap-2">
        <button className="btn-primary px-3 py-1.5 text-xs" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => { setV(initial); setEditing(false); }}>Cancel</button>
      </div>
      {err && <p className="text-xs text-red-700">{err}</p>}
    </div>
  );
}
