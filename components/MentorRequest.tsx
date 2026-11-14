'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** Ask an opted-in mentor for mentorship: pick a topic they offer and write a short note. They decide in their inbox. */
export default function MentorRequest({ mentorId, firstName, topics }: { mentorId: string; firstName: string; topics: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState(topics[0] ?? '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function send() {
    setBusy(true);
    const res = await fetch('/api/mentorship', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mentorId, topic, message }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: d.error ?? 'Could not send.' }); return; }
    setMsg({ ok: true, text: d.duplicate ? `You already asked ${firstName}.` : `Sent. ${firstName} will see it in their inbox and can accept or decline.` });
    setOpen(false);
    router.refresh();
  }
  if (msg?.ok) return <p className="text-sm font-medium text-teal" role="status" data-testid="mentor-request-status">{msg.text}</p>;
  if (!open) return <button className="btn-gold px-3 py-1.5 text-sm" onClick={() => setOpen(true)} data-testid="mentor-request-button">Request mentorship</button>;
  return (
    <div className="w-full space-y-2 rounded-lg border border-gold/40 bg-gold/10 p-3" data-testid="mentor-request-form">
      <label className="block text-xs"><span className="label">Topic</span>
        <select className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>{topics.map((t) => <option key={t}>{t}</option>)}</select></label>
      <label className="block text-xs"><span className="label">Short message</span>
        <textarea className="input h-20" value={message} maxLength={500} onChange={(e) => setMessage(e.target.value)} placeholder={`What would you like help with? ${firstName} sees this note.`} /></label>
      <div className="flex gap-2">
        <button className="btn-primary px-3 py-1.5 text-sm" onClick={send} disabled={busy} data-testid="mentor-request-send">{busy ? 'Sending…' : 'Send request'}</button>
        <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {msg && !msg.ok && <p className="text-xs text-red-700" role="alert">{msg.text}</p>}
    </div>
  );
}
