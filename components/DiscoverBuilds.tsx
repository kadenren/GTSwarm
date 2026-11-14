'use client';
import { useEffect, useMemo, useState } from 'react';
import BuildCardView from './BuildCard';
import type { BuildCard } from '@/lib/builds';

const PAGE = 9;

export default function DiscoverBuilds({ builds, viewerId }: { builds: BuildCard[]; viewerId?: string }) {
  const [q, setQ] = useState('');
  const [industry, setIndustry] = useState('');
  const [owner, setOwner] = useState<'' | 'alum' | 'student'>('');
  const [openOnly, setOpenOnly] = useState(true);
  const [limit, setLimit] = useState(PAGE);
  const industries = useMemo(() => [...new Set(builds.map((b) => b.industry))].sort(), [builds]);
  const shown = builds.filter((b) =>
    (!q || `${b.name} ${b.summary} ${b.skills.join(' ')} ${b.helpNeeded}`.toLowerCase().includes(q.toLowerCase())) &&
    (!industry || b.industry === industry) && (!owner || b.owner?.type === owner) && (!openOnly || b.open));
  useEffect(() => setLimit(PAGE), [q, industry, owner, openOnly]); // a new filter starts from the top
  const sel = 'rounded-lg border border-navy/15 bg-white px-2.5 py-1.5 text-sm text-navy focus:border-gold focus:outline-none';
  const noun = shown.length === 1 ? 'startup or project' : 'startups and projects';
  return (
    <section aria-label="All startups" id="startups">
      <div className="card flex flex-wrap items-center gap-2 p-3" data-tour="discover-filters">
        <input className="input min-w-[200px] flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search startups, skills or needs" aria-label="Search startups" />
        <select className={sel} value={industry} onChange={(e) => setIndustry(e.target.value)} aria-label="Industry"><option value="">All industries</option>{industries.map((x) => <option key={x}>{x}</option>)}</select>
        <div className="flex rounded-lg border border-navy/15 p-0.5 text-sm" role="group" aria-label="Founded by">
          {([['', 'Everyone'], ['alum', 'Alumni-led'], ['student', 'Student-led']] as const).map(([v, l]) => (
            <button key={v} aria-pressed={owner === v} onClick={() => setOwner(v)} className={`rounded-md px-2.5 py-1 font-medium ${owner === v ? 'bg-navy text-white' : 'text-navy/70'}`}>{l}</button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-navy"><input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} className="accent-[#003057]" />Recruiting now</label>
      </div>
      <p className="mt-3 text-sm text-ink/60" data-testid="discover-count">{shown.length} {noun}{openOnly ? ' recruiting now' : ''}</p>
      {shown.length === 0 ? (
        <div className="card mt-3 p-10 text-center text-sm text-ink/60">Nothing matches these filters. Clear a filter or post your own startup.</div>
      ) : (
        <>
          <ul className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="discover-grid">
            {shown.slice(0, limit).map((b) => <li key={b.id}><BuildCardView build={b} viewerId={viewerId} showRecruiting={!openOnly} /></li>)}
          </ul>
          {shown.length > limit && (
            <div className="mt-6 text-center">
              <button className="btn-ghost" onClick={() => setLimit((n) => n + PAGE)} data-testid="discover-more">Show more ({shown.length - limit} left)</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
