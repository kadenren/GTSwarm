'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface PurposeOption { id: string; label: string; ok: boolean; reason: string | null }

/** Ask to connect: pick what it's about, edit the suggested note, send. The person accepts or declines in their inbox. */
export default function AskToConnect({ personId, firstName, purposes, defaultPurpose, suggestedNote, compact = false }: {
  personId: string; firstName: string; purposes: PurposeOption[]; defaultPurpose?: string; suggestedNote: string; compact?: boolean;
}) {
  const router = useRouter();
  const allowed = purposes.filter((p) => p.ok);
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState(allowed.find((p) => p.id === defaultPurpose)?.id ?? allowed[0]?.id ?? '');
  const [note, setNote] = useState(suggestedNote);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!allowed.length) return <p className="text-xs text-ink/60" data-testid="cannot-connect">{purposes[0]?.reason ?? `${firstName} is not taking requests right now.`}</p>;
  if (msg?.ok) return <p className="text-sm font-medium text-teal" role="status" data-testid="connect-sent">{msg.text}</p>;
  if (!open) return <button className={compact ? 'btn-gold px-3 py-1.5 text-sm' : 'btn-gold'} onClick={() => setOpen(true)} data-testid="ask-to-connect">Ask to connect</button>;

  async function send() {
    setBusy(true);
    const res = await fetch('/api/connect', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ personId, purpose, note }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: d.error ?? 'Could not send.' }); return; }
    setMsg({ ok: true, text: d.duplicate ? `You already asked ${firstName}.` : `Sent. ${firstName} can accept or decline.` });
    router.refresh();
  }
  return (
    <div className="w-full space-y-2 rounded-lg border border-gold/40 bg-gold/10 p-3" data-testid="connect-form">
      <fieldset>
        <legend className="label">What do you want to connect about?</legend>
        <div className="space-y-1">
          {purposes.map((p) => (
            <label key={p.id} className={`flex items-start gap-2 text-sm ${p.ok ? 'text-navy' : 'text-ink/40'}`}>
              <input type="radio" name={`purpose-${personId}`} value={p.id} checked={purpose === p.id} disabled={!p.ok} onChange={() => setPurpose(p.id)} className="mt-1 accent-[#003057]" />
              <span>{p.label}{!p.ok && p.reason ? <span className="block text-[11px]">{p.reason}</span> : null}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block"><span className="label">Your note (you can edit it)</span>
        <textarea className="input h-24" value={note} maxLength={600} onChange={(e) => setNote(e.target.value)} data-testid="connect-note" /></label>
      <div className="flex gap-2">
        <button className="btn-primary px-3 py-1.5 text-sm" onClick={send} disabled={busy || !purpose} data-testid="connect-send">{busy ? 'Sending…' : 'Send request'}</button>
        <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {msg && !msg.ok && <p className="text-xs text-red-700" role="alert">{msg.text}</p>}
    </div>
  );
}
