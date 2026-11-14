'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { BuildCard as Build } from '@/lib/builds';
import { STAGE_STYLE, StageBar } from './stage';
import { roleLabel } from '@/lib/roles';

/** Request to join or collaborate on a build: pick the role you want to contribute, add a note, send to the owner. */
export function CollaborateButton({ build, compact = false }: { build: Pick<Build, 'id' | 'name' | 'rolesNeeded' | 'owner' | 'open'>; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string>(build.rolesNeeded[0] ?? 'Helper');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    const res = await fetch('/api/builds/collab', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: build.id, role, message }) });
    const d = await res.json();
    setBusy(false);
    setStatus(res.ok ? { ok: true, text: d.duplicate ? 'You already asked; it is in their inbox.' : `Sent to ${build.owner?.name.split(' ')[0] ?? 'the team'}. You will connect if they accept.` } : { ok: false, text: d.error ?? 'Could not send.' });
    if (res.ok) setOpen(false);
  }
  if (!build.open) return <span className="text-xs text-ink/50">Not taking collaborators right now</span>;
  if (status?.ok) return <span className="text-xs font-medium text-teal" role="status">{status.text}</span>;
  if (!open) {
    return (
      <button className={compact ? 'btn-gold px-3 py-1.5 text-xs' : 'btn-gold'} onClick={() => setOpen(true)} data-testid="collab-button">
        Request to join
      </button>
    );
  }
  const roles = build.rolesNeeded.length ? build.rolesNeeded : ['Helper'];
  return (
    <div className="w-full space-y-2 rounded-lg border border-gold/40 bg-gold/10 p-3">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-semibold text-navy">I can help as</span>
        {roles.map((r) => (
          <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)}
            className={`rounded-full border px-2.5 py-0.5 font-medium ${role === r ? 'border-navy bg-navy text-white' : 'border-navy/20 bg-white text-navy'}`}>{roleLabel(r)}</button>
        ))}
      </div>
      <textarea className="input h-16 text-xs" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`What you would bring to ${build.name} (optional)`} />
      <div className="flex gap-2">
        <button className="btn-primary px-3 py-1.5 text-xs" onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
        <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {status && !status.ok && <p className="text-xs text-red-700">{status.text}</p>}
    </div>
  );
}

export default function BuildCardView({ build, why, reasons, highlight = false }: { build: Build; why?: string; reasons?: string[]; highlight?: boolean }) {
  return (
    <article className={`card flex h-full flex-col p-5 transition hover:shadow-md ${highlight ? 'border-gold ring-2 ring-gold/30' : ''}`} data-testid="build-card">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${STAGE_STYLE[build.stage]}`}>{build.stage}</span>
        <StageBar stage={build.stage} />
        <span className="text-[11px] text-ink/50">{build.isStartup ? 'Startup' : build.teamType} · {build.year}</span>
        {build.open && <span className="ml-auto rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-dark">Actively recruiting</span>}
      </div>
      <Link href={`/projects/${encodeURIComponent(build.id)}`} className="mt-2 font-display text-xl font-bold text-navy hover:underline">{build.name}</Link>
      {build.owner && (
        <div className="mt-1 flex items-center gap-2 text-xs text-ink/60">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white ${build.owner.type === 'alum' ? 'bg-teal' : 'bg-plum'}`}>{build.owner.name.split(' ').map((w) => w[0]).join('')}</span>
          <span>{build.owner.name} · {build.owner.type === 'alum' ? `Alumni founder (${build.owner.label})` : 'Student founder'}</span>
        </div>
      )}
      <p className="mt-2 line-clamp-3 text-sm text-ink/75">{build.summary}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        <span className="tag bg-navy text-white">{build.industry}</span>
        {build.skills.slice(0, 4).map((k) => <span key={k} className="tag">{k}</span>)}
      </div>
      {build.helpNeeded && (
        <div className="mt-3 rounded-lg bg-paper p-3 text-xs">
          <div className="font-semibold uppercase tracking-wide text-ink/50">Open roles: {build.rolesNeeded.map((r) => roleLabel(r).toLowerCase()).join(', ') || 'collaborators'}</div>
          <p className="mt-0.5 text-ink/80">{build.helpNeeded}</p>
        </div>
      )}
      {(why || reasons?.length) && (
        <div className="mt-3 rounded-lg border border-teal/30 bg-teal-light/40 p-3 text-xs">
          <div className="font-semibold uppercase tracking-wide text-teal">Why it fits</div>
          {why && <p className="mt-0.5 text-ink/85">{why}</p>}
          {reasons && <ul className="mt-1 space-y-0.5 text-ink/70">{reasons.slice(0, 3).map((r) => <li key={r}>· {r}</li>)}</ul>}
        </div>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <CollaborateButton build={build} compact />
        <Link href={`/projects/${encodeURIComponent(build.id)}`} className="btn-ghost px-3 py-1.5 text-xs">View startup</Link>
      </div>
    </article>
  );
}
