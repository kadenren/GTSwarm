'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Person = { id: string; name: string; label: string };

/** Team members add a problem they solved. It becomes searchable in Get Unstuck, and a helper gets credit. */
export default function LogProgress({ projectId, projectName, people }: { projectId: string; projectName: string; people: Person[] }) {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [solution, setSolution] = useState('');
  const [helperName, setHelperName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const helper = people.find((p) => p.name.toLowerCase() === helperName.trim().toLowerCase());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (helperName.trim() && !helper) { setMsg({ ok: false, text: `No one named "${helperName}" on GT Swarm. Pick a name from the list.` }); return; }
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/log`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'problem', description, solution, helperId: helper?.id ?? null }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: data.error ?? 'Could not save.' }); return; }
    setMsg({ ok: true, text: `Saved. The next person who searches this problem in Get Unstuck will find ${projectName}${helper ? ` and ${helper.name}` : ''}.` });
    setDescription(''); setSolution(''); setHelperName('');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-5" aria-label="Add a solved problem" data-testid="log-progress">
      <h2 className="text-lg font-bold text-navy">Add a solved problem</h2>
      <p className="mt-0.5 text-xs text-ink/60">It becomes searchable in Get Unstuck, so the next team doesn&apos;t start from zero.</p>
      <div className="mt-4 space-y-3">
        <label className="block"><span className="label">Problem you solved</span>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Bluetooth drops when the sensor sleeps" required /></label>
        <label className="block"><span className="label">How you solved it</span>
          <textarea className="input h-24" value={solution} onChange={(e) => setSolution(e.target.value)} placeholder="Kept the 32 kHz clock running in sleep and raised the supervision timeout" required /></label>
        <label className="block"><span className="label">Who helped (optional)</span>
          <input className="input" list="swarm-people" value={helperName} onChange={(e) => setHelperName(e.target.value)} placeholder="Start typing a name" />
          <datalist id="swarm-people">{people.map((p) => <option key={p.id} value={p.name}>{p.label}</option>)}</datalist>
        </label>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Add solved problem'}</button>
        {msg && <p className={`text-sm ${msg.ok ? 'text-teal' : 'text-red-700'}`} role="status">{msg.text}</p>}
      </div>
    </form>
  );
}
