'use client';
import { roleLabel } from '@/lib/roles';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const ADD_AS = ['Cofounder', 'Advisor', 'Helper', 'Early engineer'];

export function AcceptDecline({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function act(action: 'accept' | 'decline') {
    setBusy(action);
    const res = await fetch(`/api/requests/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) });
    if (!res.ok) { setErr((await res.json()).error ?? 'Failed'); setBusy(null); return; }
    router.refresh();
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="btn-primary py-1.5" disabled={!!busy} onClick={() => act('accept')} aria-label={`Accept request from ${name}`}>{busy === 'accept' ? 'Accepting…' : 'Accept'}</button>
      <button className="btn-ghost py-1.5" disabled={!!busy} onClick={() => act('decline')} aria-label={`Decline request from ${name}`}>Decline</button>
      {err && <span className="text-xs text-red-700">{err}</span>}
    </div>
  );
}

export function AddToProject({ id, name, projectName, suggested }: { id: string; name: string; projectName: string; suggested: string | null }) {
  const router = useRouter();
  const [role, setRole] = useState(suggested && ADD_AS.includes(suggested) ? suggested : 'Helper');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function add() {
    setBusy(true);
    const res = await fetch(`/api/requests/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'add', addAs: role }) });
    if (!res.ok) { setErr((await res.json()).error ?? 'Failed'); setBusy(false); return; }
    router.refresh();
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gold/10 p-2">
      <span className="text-sm text-navy">Add {name.split(' ')[0]} to {projectName} as</span>
      <select className="rounded-md border border-navy/20 bg-white px-2 py-1 text-sm" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Project role">
        {ADD_AS.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
      </select>
      <button className="btn-gold py-1" onClick={add} disabled={busy} data-testid="add-to-project">{busy ? 'Adding…' : `Add to project as ${roleLabel(role)}`}</button>
      {err && <span className="text-xs text-red-700">{err}</span>}
    </div>
  );
}
