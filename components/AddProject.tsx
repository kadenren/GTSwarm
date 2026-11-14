'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import 'd3-transition';
import { TEAM_COLORS } from './NetworkExplorer';

const TYPES = ['VIP', 'Capstone', 'CREATE-X', 'Lab', 'Club', 'Invention Studio', 'Startup'];
const SAMPLE = `ThermoCuff: In the 2026 ECE Senior Design capstone, our team built a wearable cuff that tracks skin temperature and heart rate for patients recovering at home. The firmware runs on an nRF52 with BLE and a PPG sensor. The main problem was that readings drifted when the cuff warmed up against the skin, so we fixed it by adding a reference thermistor and a two-point calibration at startup. We also struggled with battery life lasting under a day; we solved it by duty-cycling the PPG sensor and batching radio packets every 30 seconds.`;

interface Draft { name: string; year: number; team_type: string; team_name: string; summary: string; technologies: string[]; problems: { description: string; solution: string }[] }
interface Saved { id: string; name: string; teamType: string; neighbors: { id: string; name: string; year: number; teamType: string; sim: number }[] }

export default function AddProject({ aiEnabled }: { aiEnabled: boolean }) {
  const [abstract, setAbstract] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [source, setSource] = useState<'ai' | 'keyword' | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [techText, setTechText] = useState('');

  async function extract() {
    setBusy(true); setErr(null);
    const res = await fetch('/api/extract', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ abstract }) });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(d.error); return; }
    setDraft(d.data); setSource(d.source); setTechText(d.data.technologies.join(', '));
  }
  async function save() {
    if (!draft) return;
    setBusy(true); setErr(null);
    const body = { ...draft, technologies: techText.split(',').map((t) => t.trim()).filter(Boolean) };
    const res = await fetch('/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(d.error); return; }
    setSaved(d);
  }
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  if (saved) return <JoinAnimation saved={saved} />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-5">
        <h2 className="text-lg font-bold text-navy">1. Paste an abstract</h2>
        <p className="text-xs text-ink/60">A capstone report, VIP summary, poster text or pitch. {aiEnabled ? 'Claude extracts the fields; you confirm them.' : 'A keyword extractor fills the fields (set ANTHROPIC_API_KEY to use Claude); you confirm them.'}</p>
        <textarea className="input mt-3 h-64" value={abstract} onChange={(e) => setAbstract(e.target.value)} placeholder="Paste the project abstract here" />
        <div className="mt-3 flex gap-2">
          <button className="btn-primary" onClick={extract} disabled={busy || abstract.trim().length < 40}>{busy && !draft ? 'Extracting…' : 'Extract project'}</button>
          <button className="btn-ghost" onClick={() => setAbstract(SAMPLE)}>Use a sample</button>
        </div>
        {err && <p className="mt-2 text-sm text-red-700" role="alert">{err}</p>}
      </section>
      <section className="card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-navy">2. Confirm the details</h2>
          {source && <span className="text-[11px] text-ink/50">{source === 'ai' ? 'Extracted by Claude from your text' : 'Extracted by keyword rules'}</span>}
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

/** The new project flies into the swarm and links to its nearest neighbors. */
function JoinAnimation({ saved }: { saved: Saved }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const W = 760, H = 420, cx = W / 2, cy = H / 2;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const svg = d3.select(ref.current!);
    svg.selectAll('*').remove();
    const nb = saved.neighbors.map((n, i) => {
      const a = (i / saved.neighbors.length) * Math.PI * 2 - Math.PI / 2;
      const r = 120 + (1 - n.sim) * 60;
      return { ...n, x: cx + Math.cos(a) * r * 1.45, y: cy + Math.sin(a) * r };
    });
    const links = svg.append('g');
    const nodes = svg.append('g').selectAll('g').data(nb).join('g').attr('transform', (d) => `translate(${d.x},${d.y})`).style('opacity', 0);
    nodes.append('circle').attr('r', 7).attr('fill', (d) => TEAM_COLORS[d.teamType] ?? '#888');
    nodes.append('text').attr('y', 20).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', '#F7F6F2').text((d) => `${d.name} (${d.year})`);
    nodes.transition().duration(reduced ? 0 : 400).delay((_, i) => (reduced ? 0 : i * 40)).style('opacity', 1);
    const me = svg.append('g').attr('transform', `translate(${W - 40},${30})`);
    me.append('circle').attr('r', 14).attr('fill', '#B3A369').attr('stroke', '#fff').attr('stroke-width', 3);
    me.append('text').attr('y', 32).attr('text-anchor', 'middle').attr('font-size', 13).attr('font-weight', 700).attr('fill', '#D6CC9E').text(saved.name);
    me.transition().delay(reduced ? 0 : 600).duration(reduced ? 0 : 900).ease(d3.easeCubicOut).attr('transform', `translate(${cx},${cy})`)
      .on('end', () => {
        links.selectAll('line').data(nb).join('line').attr('x1', cx).attr('y1', cy).attr('x2', cx).attr('y2', cy)
          .attr('stroke', '#B3A369').attr('stroke-opacity', (d) => 0.25 + d.sim * 0.6).attr('stroke-width', (d) => 1 + d.sim * 3)
          .transition().duration(reduced ? 0 : 500).delay((_, i) => (reduced ? 0 : i * 50)).attr('x2', (d) => d.x).attr('y2', (d) => d.y);
      });
  }, [saved]);
  return (
    <section className="card overflow-hidden" data-testid="join-animation">
      <svg ref={ref} viewBox="0 0 760 420" className="w-full bg-navy-900" role="img" aria-label={`${saved.name} joins the swarm next to its closest projects`} />
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-lg font-bold text-navy">{saved.name} joined the swarm</h2>
          <p className="text-sm text-ink/70">It is now searchable, linked to its closest projects, and its solved problems show up in I&apos;m stuck.</p>
        </div>
        <Link className="btn-primary" href={`/projects/${encodeURIComponent(saved.id)}`}>Open project page</Link>
      </div>
    </section>
  );
}
