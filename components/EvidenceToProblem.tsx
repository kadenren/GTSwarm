'use client';
import { useRef, useState } from 'react';

/** Paste a log or attach a screenshot; get back a one-line problem statement to search with. */
export default function EvidenceToProblem({ onProblem, aiEnabled }: { onProblem: (text: string) => void; aiEnabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ problem: string; context: string; signals: string[]; source: string; notes?: string[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function run() {
    setBusy(true); setErr(null); setResult(null);
    const form = new FormData();
    form.set('log', log);
    files.forEach((f) => form.append('files', f));
    const res = await fetch('/api/stuck/evidence', { method: 'POST', body: form });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(d.error); return; }
    setResult(d);
    onProblem(d.context ? `${d.problem} (${d.context})` : d.problem);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-navy underline decoration-gold underline-offset-4">
        + Have an error log or a screenshot? Turn it into a problem statement
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-navy/10 bg-paper p-4" aria-label="Turn evidence into a problem statement">
      <div className="flex items-center justify-between">
        <span className="label mb-0">Error log or screenshot</span>
        <button type="button" className="text-xs text-ink/50 hover:text-navy" onClick={() => setOpen(false)}>Hide</button>
      </div>
      <textarea className="input mt-2 h-28 font-mono text-xs" value={log} onChange={(e) => setLog(e.target.value)} placeholder="[00:12:03.114] <wrn> bt_conn: Disconnected (reason 0x08, supervision timeout)" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => input.current?.click()}>
          {files.length ? files.map((f) => f.name).join(', ') : aiEnabled ? 'Attach a screenshot or log file' : 'Attach a log file'}
        </button>
        <input ref={input} type="file" multiple accept={aiEnabled ? '.png,.jpg,.jpeg,.webp,.heic,.txt,.log' : '.txt,.log'} className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 3))} />
        <button type="button" className="btn-primary py-1.5 text-xs" disabled={busy || (!log.trim() && !files.length)} onClick={run}>{busy ? 'Reading…' : 'Turn into a problem'}</button>
      </div>
      {err && <p className="mt-2 text-xs text-red-700" role="alert">{err}</p>}
      {result && (
        <div className="mt-3 rounded-lg border border-gold/50 bg-white p-3 text-sm" role="status">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gold-dark">{result.source === 'gemini' ? 'Gemini read your evidence' : 'Read from your log'}</div>
          <div className="mt-0.5 font-semibold text-navy">{result.problem}</div>
          {result.context && <div className="text-xs text-ink/60">{result.context}</div>}
          {result.signals.length > 0 && (
            <ul className="mt-2 space-y-0.5">{result.signals.map((s) => <li key={s} className="truncate font-mono text-[11px] text-ink/60">{s}</li>)}</ul>
          )}
          {result.notes?.map((n) => <p key={n} className="mt-1 text-[11px] text-ink/50">{n}</p>)}
          <p className="mt-2 text-[11px] text-ink/50">Added above. Edit it if needed, then send the scout.</p>
        </div>
      )}
    </div>
  );
}
