'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { OpportunityView } from '@/lib/community';

const KIND_LABEL: Record<OpportunityView['kind'], string> = { internship: 'Internship', 'full-time': 'Full-time', 'part-time': 'Part-time', startup: 'Startup role' };

/** Browse, filter and save opportunities. The list comes from the server already filtered to what this member may see. */
export default function OpportunityBoard({ items, why }: { items: OpportunityView[]; why: Record<string, string> }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [showExpired, setShowExpired] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const shown = useMemo(() => items.filter((o) =>
    (showExpired || !o.expired) && (!savedOnly || o.saved) &&
    (!q || `${o.title} ${o.org} ${o.description} ${o.skills.join(' ')} ${o.location}`.toLowerCase().includes(q.toLowerCase()))), [items, q, showExpired, savedOnly]);

  async function toggleSave(o: OpportunityView) {
    setSaving(o.id); setErr(null);
    const res = await fetch(`/api/opportunities/${encodeURIComponent(o.id)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: o.saved ? 'unsave' : 'save' }) });
    setSaving(null);
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error ?? 'Could not save.'); return; }
    router.refresh();
  }

  return (
    <section aria-label="Opportunities list">
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <input className="input min-w-[180px] flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, skills, location" aria-label="Search opportunities" />
        <label className="flex items-center gap-1.5 text-sm text-navy"><input type="checkbox" checked={savedOnly} onChange={(e) => setSavedOnly(e.target.checked)} className="accent-[#003057]" />Saved</label>
        <label className="flex items-center gap-1.5 text-sm text-navy"><input type="checkbox" checked={showExpired} onChange={(e) => setShowExpired(e.target.checked)} className="accent-[#003057]" />Show expired</label>
      </div>
      {err && <p className="mt-2 text-sm text-red-700" role="alert">{err}</p>}
      <p className="mt-3 text-sm text-ink/60">{shown.length} {shown.length === 1 ? 'posting' : 'postings'}</p>
      {shown.length === 0 ? <p className="card mt-3 p-8 text-center text-sm text-ink/60">Nothing matches these filters.</p> : (
        <ul className="mt-3 grid gap-4 md:grid-cols-2" data-testid="opportunity-list">
          {shown.map((o) => (
            <li key={o.id} className={`card flex flex-col p-5 ${o.expired ? 'opacity-60' : ''}`} data-testid="opportunity-card" data-id={o.id}>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-md bg-navy px-2 py-0.5 font-semibold text-white">{KIND_LABEL[o.kind]}</span>
                {o.synthetic && <span className="rounded-md bg-paper px-2 py-0.5 font-semibold text-ink/55">Synthetic demo posting</span>}
                {o.status === 'pending' && <span className="rounded-md bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">Awaiting moderator review</span>}
                {o.expired && <span className="rounded-md bg-red-50 px-2 py-0.5 font-semibold text-red-700">Expired</span>}
                {!o.eligible && o.ineligibleReason && <span className="rounded-md bg-paper px-2 py-0.5 font-semibold text-ink/60">{o.ineligibleReason}</span>}
              </div>
              <h3 className="mt-2 font-display text-lg font-bold text-navy">{o.title}</h3>
              <p className="text-sm text-ink/70">{o.org} · {o.location} · {o.mode}</p>
              {why[o.id] && <p className="mt-2 rounded-md bg-teal-light/50 px-2.5 py-1.5 text-xs text-ink/85" data-testid="opportunity-why">{why[o.id]}</p>}
              <p className="mt-2 line-clamp-3 text-sm text-ink/75">{o.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">{o.skills.slice(0, 5).map((k) => <span key={k} className="tag">{k}</span>)}</div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 text-[11px] text-ink/60">
                {o.classYears && <div><dt className="inline font-semibold">Classes: </dt><dd className="inline">{o.classYears.replace('-', ' to ')}</dd></div>}
                {o.deadline && <div><dt className="inline font-semibold">Apply by: </dt><dd className="inline">{o.deadline}</dd></div>}
                {o.postedBy && <div><dt className="inline font-semibold">Posted by: </dt><dd className="inline">{o.postedBy}</dd></div>}
                <div><dt className="inline font-semibold">Expires: </dt><dd className="inline">{o.expiresAt}</dd></div>
              </dl>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                <button className={o.saved ? 'btn-primary px-3 py-1.5 text-xs' : 'btn-ghost px-3 py-1.5 text-xs'} onClick={() => toggleSave(o)} disabled={saving === o.id} aria-pressed={o.saved} data-testid="save-opportunity">
                  {o.saved ? 'Saved' : 'Save'}
                </button>
                <span className="text-xs text-ink/55" title="Demo postings have no real application">How to apply: {o.apply}</span>
                {o.projectId && <Link href={`/projects/${encodeURIComponent(o.projectId)}`} className="text-xs font-semibold text-navy underline decoration-gold underline-offset-4">Startup page</Link>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
