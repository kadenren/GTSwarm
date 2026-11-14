'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Person = { id: string; name: string; label: string };
type Tab = 'problem' | 'technology' | 'milestone';

export default function LogProgress({ projectId, projectName, people }: { projectId: string; projectName: string; people: Person[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('problem');
  const [description, setDescription] = useState('');
  const [solution, setSolution] = useState('');
  const [helperName, setHelperName] = useState('');
  const [tech, setTech] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const helper = people.find((p) => p.name.toLowerCase() === helperName.trim().toLowerCase());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (helperName.trim() && !helper) { setMsg({ ok: false, text: `No one named "${helperName}" in the swarm. Pick a name from the list.` }); return; }
    setBusy(true);
    setMsg(null);
    const body = tab === 'problem' ? { type: 'problem', description, solution, helperId: helper?.id ?? null }
      : tab === 'technology' ? { type: 'technology', name: tech }
      : { type: 'milestone', title, helperId: helper?.id ?? null };
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/log`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: data.error ?? 'Could not save.' }); return; }
    setMsg({ ok: true, text: tab === 'problem' ? `Added to the build record and the swarm. The next builder who searches this problem will find ${projectName}${helper ? ` and ${helper.name}` : ''}.` : tab === 'technology' ? `${tech} added to ${projectName} and the skills graph.` : 'Milestone added to the build record.' });
    setDescription(''); setSolution(''); setHelperName(''); setTech(''); setTitle('');
    router.refresh();
  }

  const tabs: { v: Tab; l: string }[] = [{ v: 'problem', l: 'Solved problem' }, { v: 'technology', l: 'Technology' }, { v: 'milestone', l: 'Milestone or helper' }];
  return (
    <form onSubmit={submit} className="card p-5" aria-label="Log progress" data-testid="log-progress">
      <h2 className="text-lg font-bold text-navy">Log progress</h2>
      <p className="mt-0.5 text-xs text-ink/60">What you log becomes searchable for the next builder, and helpers get credit in the graph.</p>
      <div className="mt-3 flex flex-wrap gap-1 rounded-lg bg-paper p-1" role="tablist">
        {tabs.map((t) => (
          <button key={t.v} type="button" role="tab" aria-selected={tab === t.v} onClick={() => setTab(t.v)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${tab === t.v ? 'bg-white text-navy shadow-sm' : 'text-navy/60 hover:text-navy'}`}>{t.l}</button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {tab === 'problem' && (
          <>
            <label className="block"><span className="label">Problem you solved</span>
              <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Bluetooth drops when the sensor sleeps" required /></label>
            <label className="block"><span className="label">How you solved it</span>
              <textarea className="input h-24" value={solution} onChange={(e) => setSolution(e.target.value)} placeholder="Kept the 32 kHz clock running in sleep and raised the supervision timeout" required /></label>
          </>
        )}
        {tab === 'technology' && (
          <label className="block"><span className="label">Technology used</span>
            <input className="input" value={tech} onChange={(e) => setTech(e.target.value)} placeholder="Zephyr RTOS" required /></label>
        )}
        {tab === 'milestone' && (
          <label className="block"><span className="label">Milestone or what someone helped with</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="First 10 paying athletes" required /></label>
        )}
        {tab !== 'technology' && (
          <label className="block"><span className="label">Who helped (optional)</span>
            <input className="input" list="swarm-people" value={helperName} onChange={(e) => setHelperName(e.target.value)} placeholder="Start typing a name, for example Marcus Reyes" />
            <datalist id="swarm-people">{people.map((p) => <option key={p.id} value={p.name}>{p.label}</option>)}</datalist>
          </label>
        )}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Add to build record'}</button>
        {msg && <p className={`text-sm ${msg.ok ? 'text-teal' : 'text-red-700'}`} role="status">{msg.text}</p>}
      </div>
    </form>
  );
}
