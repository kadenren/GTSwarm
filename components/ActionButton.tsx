'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** Posts an action to an API route, shows the server's answer (including permission errors), then refreshes the page. */
export default function ActionButton({ endpoint, body, label, busyLabel, className = 'btn-primary', testId, done }: {
  endpoint: string; body: Record<string, unknown>; label: string; busyLabel?: string; className?: string; testId?: string; done?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function go() {
    setBusy(true); setMsg(null);
    const res = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: d.error ?? 'Could not complete that.' }); return; }
    if (done) setMsg({ ok: true, text: done });
    router.refresh();
  }
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" className={className} onClick={go} disabled={busy} data-testid={testId}>{busy ? busyLabel ?? 'Working…' : label}</button>
      {msg && <span className={`text-xs ${msg.ok ? 'text-teal' : 'text-red-700'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</span>}
    </span>
  );
}
