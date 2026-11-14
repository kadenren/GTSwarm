'use client';
import { useMemo, useState } from 'react';
import BuildCardView from './BuildCard';
import type { BuildCard } from '@/lib/builds';

const STAGES = ['Idea', 'Prototype', 'Testing', 'Pilot', 'Launched'];

export default function DiscoverBuilds({ builds }: { builds: BuildCard[] }) {
  const [q, setQ] = useState('');
  const [industry, setIndustry] = useState('');
  const [skill, setSkill] = useState('');
  const [stage, setStage] = useState('');
  const [owner, setOwner] = useState<'' | 'alum' | 'student'>('');
  const [openOnly, setOpenOnly] = useState(true);
  const industries = useMemo(() => [...new Set(builds.map((b) => b.industry))].sort(), [builds]);
  // skills needed: what the open builds list as their technologies and needs
  const skills = useMemo(() => [...new Set(builds.filter((b) => b.open).flatMap((b) => b.skills))].sort(), [builds]);
  const shown = builds.filter((b) =>
    (!q || `${b.name} ${b.summary} ${b.skills.join(' ')} ${b.helpNeeded}`.toLowerCase().includes(q.toLowerCase())) &&
    (!industry || b.industry === industry) && (!skill || b.skills.includes(skill)) && (!stage || b.stage === stage) &&
    (!owner || b.owner?.type === owner) && (!openOnly || b.open));
  const sel = 'rounded-lg border border-navy/15 bg-white px-2.5 py-1.5 text-sm text-navy focus:border-gold focus:outline-none';
  return (
    <section aria-label="All startups" id="startups">
      <div className="card flex flex-wrap items-center gap-2 p-3" data-tour="discover-filters">
        <input className="input min-w-[200px] flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search startups, skills or needs" aria-label="Search startups" />
        <select className={sel} value={industry} onChange={(e) => setIndustry(e.target.value)} aria-label="Industry"><option value="">All industries</option>{industries.map((x) => <option key={x}>{x}</option>)}</select>
        <select className={sel} value={skill} onChange={(e) => setSkill(e.target.value)} aria-label="Skills needed"><option value="">Any skills needed</option>{skills.map((x) => <option key={x}>{x}</option>)}</select>
        <select className={sel} value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Stage"><option value="">Any stage</option>{STAGES.map((x) => <option key={x}>{x}</option>)}</select>
        <div className="flex rounded-lg border border-navy/15 p-0.5 text-sm" role="group" aria-label="Founded by">
          {([['', 'Everyone'], ['alum', 'Alumni-founded'], ['student', 'Student-founded']] as const).map(([v, l]) => (
            <button key={v} aria-pressed={owner === v} onClick={() => setOwner(v)} className={`rounded-md px-2.5 py-1 font-medium ${owner === v ? 'bg-navy text-white' : 'text-navy/70'}`}>{l}</button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-navy"><input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} className="accent-[#003057]" />Actively recruiting</label>
      </div>
      <p className="mt-3 text-sm text-ink/60">{shown.length} {shown.length === 1 ? 'startup or project' : 'startups and projects'}</p>
      {shown.length === 0 ? (
        <div className="card mt-3 p-10 text-center text-sm text-ink/60">Nothing matches these filters. Clear a filter or post your own startup.</div>
      ) : (
        <ul className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="discover-grid">{shown.map((b) => <li key={b.id}><BuildCardView build={b} /></li>)}</ul>
      )}
    </section>
  );
}
