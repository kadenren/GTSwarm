'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';

const TYPES = ['VIP', 'Capstone', 'CREATE-X', 'Lab', 'Club', 'Invention Studio', 'Startup'];
const SAMPLE = `ThermoCuff: In the 2026 ECE Senior Design capstone, our team built a wearable cuff that tracks skin temperature and heart rate for patients recovering at home. The firmware runs on an nRF52 with BLE and a PPG sensor. The main problem was that readings drifted when the cuff warmed up against the skin, so we fixed it by adding a reference thermistor and a two-point calibration at startup. We also struggled with battery life lasting under a day; we solved it by duty-cycling the PPG sensor and batching radio packets every 30 seconds.`;

interface Draft { name: string; year: number; team_type: string; team_name: string; summary: string; technologies: string[]; problems: { description: string; solution: string }[] }
interface Saved { id: string; name: string; teamType: string; neighbors: { id: string; name: string; year: number; teamType: string; sim: number }[] }

interface SourceInfo { name: string; kind: string; chars: number; ok: boolean; note?: string }

export default function AddProject({ aiEnabled }: { aiEnabled: boolean }) {
  const [abstract, setAbstract] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [linksText, setLinksText] = useState('');
  const [dragging, setDragging] = useState(false);
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [links, setLinks] = useState<{ url: string; title: string }[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [source, setSource] = useState<'gemini' | 'claude' | 'keyword' | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [techText, setTechText] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((f) => [...f, ...Array.from(list)].filter((x, i, a) => a.findIndex((y) => y.name === x.name) === i).slice(0, 6));
  };
  const hasInput = abstract.trim().length >= 40 || files.length > 0 || linksText.trim().length > 0;

  async function extract() {
    setBusy(true); setErr(null);
    const form = new FormData();
    form.set('description', abstract);
    form.set('links', linksText);
    files.forEach((f) => form.append('files', f));
    const res = await fetch('/api/extract', { method: 'POST', body: form });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(d.error); return; }
    setDraft(d.data); setSource(d.source); setTechText(d.data.technologies.join(', '));
    setSources(d.sources ?? []); setLinks(d.links ?? []);
  }
  async function save() {
    if (!draft) return;
    setBusy(true); setErr(null);
    const body = { ...draft, technologies: techText.split(',').map((t) => t.trim()).filter(Boolean), links };
    const res = await fetch('/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(d.error); return; }
    setSaved(d);
  }
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  if (saved) return <SavedCard saved={saved} />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-5">
        <h2 className="text-lg font-bold text-navy">1. Tell us about it</h2>
        <p className="text-xs text-ink/60">Any mix of a description, files and links. {aiEnabled ? 'Gemini reads them, including photos and scanned PDFs, and fills in the fields. You confirm before anything is saved.' : 'GT Swarm reads them and fills in the fields. You confirm before anything is saved.'}</p>
        <label className="mt-4 block">
          <span className="label">Description</span>
          <textarea className="input h-36" value={abstract} onChange={(e) => setAbstract(e.target.value)} placeholder="What you built, for whom, with what, and what problems you solved along the way" />
        </label>
        <div className="mt-4">
          <span className="label">Files</span>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
            onClick={() => fileInput.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.current?.click(); }}
            role="button" tabIndex={0} aria-label="Add files"
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${dragging ? 'border-gold bg-gold/10' : 'border-navy/20 hover:border-navy/40'}`}>
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M14 18V6M9 11l5-5 5 5" stroke="#003057" strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M5 18v4h18v-4" stroke="#B3A369" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
            <span className="mt-1 text-sm font-medium text-navy">Drop a report, slides or a photo of your poster here, or click to browse</span>
            <span className="text-xs text-ink/50">PDF, Word, text, Markdown or a photo (JPG, PNG, HEIC), up to 8 MB each</span>
            <input ref={fileInput} type="file" multiple accept=".pdf,.docx,.txt,.md,.markdown,.png,.jpg,.jpeg,.webp,.heic" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          </div>
          {files.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {files.map((f) => (
                <li key={f.name} className="flex items-center gap-2 rounded-full bg-navy/5 py-1 pl-3 pr-1 text-xs text-navy">
                  {f.name} <span className="text-ink/40">{Math.max(1, Math.round(f.size / 1024))} KB</span>
                  <button className="rounded-full px-1.5 text-ink/50 hover:bg-navy/10 hover:text-red-700" onClick={() => setFiles((x) => x.filter((y) => y !== f))} aria-label={`Remove ${f.name}`}>×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <label className="mt-4 block">
          <span className="label">Links (one per line)</span>
          <textarea className="input h-16 font-mono text-xs" value={linksText} onChange={(e) => setLinksText(e.target.value)} placeholder={'https://github.com/your-team/your-repo\nhttps://your-project-site.com'} />
          <span className="text-[11px] text-ink/50">GitHub links import the README. Links are saved on the project.</span>
        </label>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary" onClick={extract} disabled={busy || !hasInput}>{busy && !draft ? 'Reading…' : 'Read and fill in'}</button>
          <button className="btn-ghost" onClick={() => setAbstract(SAMPLE)}>Use a sample</button>
        </div>
        {err && <p className="mt-2 text-sm text-red-700" role="alert">{err}</p>}
        {sources.length > 0 && (
          <div className="mt-4 rounded-lg bg-paper p-3">
            <span className="label">What we read</span>
            <ul className="space-y-1 text-xs">
              {sources.map((x) => (
                <li key={x.name} className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${x.ok ? 'bg-teal' : 'bg-red-400'}`} aria-hidden="true" />
                  <span className="font-medium text-navy">{x.name}</span>
                  <span className="text-ink/50">{x.ok ? `${x.chars.toLocaleString()} characters` : ''}{x.note ? `${x.ok ? ' · ' : ''}${x.note}` : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <section className="card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-navy">2. Confirm the details</h2>
          {source && <span className="text-[11px] text-ink/50">{source === 'gemini' ? 'Filled in by Gemini from your sources' : source === 'claude' ? 'Filled in by Claude from your sources' : 'Filled in by GT Swarm keyword rules'}</span>}
        </div>
        {!draft ? <p className="mt-3 text-sm text-ink/60">Extracted fields appear here for you to check and edit.</p> : (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <label><span className="label">Name</span><input className="input" value={draft.name} onChange={(e) => set('name', e.target.value)} /></label>
              <label><span className="label">Year</span><input className="input" type="number" value={draft.year} onChange={(e) => set('year', +e.target.value)} /></label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label><span className="label">Team type</span>
                <select className="input" value={draft.team_type} onChange={(e) => set('team_type', e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
              <label><span className="label">Team name</span><input className="input" value={draft.team_name} onChange={(e) => set('team_name', e.target.value)} /></label>
            </div>
            <label className="block"><span className="label">Summary</span><textarea className="input h-20" value={draft.summary} onChange={(e) => set('summary', e.target.value)} /></label>
            <label className="block"><span className="label">Technologies (comma separated)</span><input className="input" value={techText} onChange={(e) => setTechText(e.target.value)} /></label>
            <div>
              <span className="label">Solved problems</span>
              {draft.problems.length === 0 && <p className="text-xs text-ink/55">None found. Add one so the next builder can find it.</p>}
              <ul className="space-y-2">
                {draft.problems.map((p, i) => (
                  <li key={i} className="rounded-lg bg-paper p-2">
                    <input className="input mb-1" value={p.description} onChange={(e) => set('problems', draft.problems.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} aria-label="Problem" />
                    <input className="input" value={p.solution} onChange={(e) => set('problems', draft.problems.map((x, j) => (j === i ? { ...x, solution: e.target.value } : x)))} aria-label="Solution" />
                    <button className="mt-1 text-xs text-ink/50 hover:text-red-700" onClick={() => set('problems', draft.problems.filter((_, j) => j !== i))}>Remove</button>
                  </li>
                ))}
              </ul>
              <button className="mt-2 text-xs font-semibold text-navy underline decoration-gold underline-offset-4" onClick={() => set('problems', [...draft.problems, { description: '', solution: '' }])}>+ Add a solved problem</button>
            </div>
            <button className="btn-gold w-full" onClick={save} disabled={busy}>{busy ? 'Adding…' : 'Add to the swarm'}</button>
          </div>
        )}
      </section>
    </div>
  );
}

/** Confirmation after saving: the project is live, with its closest projects listed. */
function SavedCard({ saved }: { saved: Saved }) {
  return (
    <section className="card p-6" data-testid="join-animation">
      <h2 className="text-xl font-bold text-navy">{saved.name} is on GT Swarm</h2>
      <p className="mt-1 text-sm text-ink/70">It is now searchable, students and alumni can request to join, and its solved problems show up in Get Unstuck.</p>
      {saved.neighbors.length > 0 && (
        <>
          <h3 className="label mt-4">Closest projects</h3>
          <ul className="flex flex-wrap gap-2">
            {saved.neighbors.slice(0, 6).map((n) => (
              <li key={n.id}><Link href={`/projects/${encodeURIComponent(n.id)}`} className="tag hover:bg-gold/20">{n.name} ({n.year})</Link></li>
            ))}
          </ul>
        </>
      )}
      <Link className="btn-primary mt-5" href={`/projects/${encodeURIComponent(saved.id)}`}>Open startup page</Link>
    </section>
  );
}
