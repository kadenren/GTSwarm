'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { SearchResult } from '@/lib/searchApi';

const COMPONENT_INFO: Record<string, { label: string; weight: number; help: string }> = {
  E: { label: 'Text match', weight: 0.55, help: 'Similarity of your search to their profile, projects and solved problems' },
  X: { label: 'Documented experience', weight: 0.2, help: 'Share of their record among the 20 closest projects and problems' },
  T: { label: 'Shared ties', weight: 0.1, help: 'Same project, team, project family or major as you' },
  R: { label: 'Role fit', weight: 0.1, help: 'Open to this kind of conversation' },
  A: { label: 'Availability', weight: 0.05, help: 'Hours per week they can give' },
};

export interface ViewerProject { id: string; name: string; year: number }

export default function PersonPanel({
  result, kind, role, query, viewerName, viewerProjects, onClose, onExpand,
}: {
  result: SearchResult; kind: 'expertise' | 'stuck'; role: string | null; query: string; viewerName: string;
  viewerProjects: ViewerProject[]; onClose: () => void; onExpand?: (id: string) => void;
}) {
  const first = result.name.split(' ')[0];
  const [composing, setComposing] = useState(false);
  const [projectId, setProjectId] = useState(viewerProjects[0]?.id ?? '');
  const defaultMsg = () => {
    const proj = viewerProjects.find((p) => p.id === projectId);
    return kind === 'stuck'
      ? `Hi ${first}, I'm ${viewerName.split(' ')[0]}${proj ? ` from ${proj.name}` : ''}. I'm stuck on "${query}". I saw you solved "${result.matchedProblem?.description ?? 'something similar'}". Could you spare 15 minutes?`
      : `Hi ${first}, I'm ${viewerName.split(' ')[0]}${proj ? ` from ${proj.name}` : ''}. We're looking for ${role === 'Advisor' || role === 'Early engineer' ? 'an' : 'a'} ${role?.toLowerCase()} with experience in ${query}. Would you be open to a short conversation?`;
  };
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => { setComposing(false); setStatus(null); }, [result.personId]);
  useEffect(() => { if (composing) setMessage(defaultMsg()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [composing, projectId]);

  async function send() {
    setSending(true);
    const res = await fetch('/api/requests', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to: result.personId, kind, role: kind === 'stuck' ? 'Helper' : role, message, projectId: projectId || null }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) setStatus({ ok: false, text: data.error ?? 'Could not send.' });
    else {
      setStatus({ ok: true, text: data.duplicate ? `You already have a pending request with ${first}.` : `Request sent. It's in ${first}'s inbox now.` });
      setComposing(false);
    }
  }

  const ctaLabel = kind === 'stuck' ? 'Ask for help' : `Request ${role} conversation`;
  const isAlum = result.type === 'alum';

  return (
    <aside className="card flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden" aria-label={`Details for ${result.name}`} data-testid="person-panel">
      <div className={`flex items-start gap-3 border-b border-navy/10 p-5 ${isAlum ? 'bg-teal-light/40' : 'bg-plum-light/50'}`}>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold text-white ${isAlum ? 'bg-teal' : 'bg-plum'} ${result.rank === 1 ? 'ring-4 ring-gold' : ''}`}>
          {result.name.split(' ').map((w) => w[0]).join('')}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-navy">{result.name}</h2>
          <p className="text-sm text-ink/70">
            {isAlum ? `Alum, ${result.major} '${String(result.gradYear).slice(2)}` : `Student, ${result.major}, class of ${result.gradYear}`}
            {result.currentRole && isAlum ? ` · ${result.currentRole}` : ''}
          </p>
          <p className="mt-1 text-xs font-semibold text-gold-dark">
            Rank {result.rank} · {result.ring === 1 ? 'inner ring' : result.ring === 2 ? 'middle ring' : 'outer ring'} · score {result.score.toFixed(2)}
          </p>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-ink/50 hover:bg-navy/5 hover:text-navy" aria-label="Close panel">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {kind === 'stuck' && result.matchedProblem && (
          <section className="rounded-lg border border-gold/50 bg-gold/10 p-4" data-testid="matched-problem">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gold-dark">Matching solved problem</h3>
            <p className="mt-1 font-display font-bold text-navy">&ldquo;{result.matchedProblem.description}&rdquo;</p>
            <p className="mt-2 text-sm leading-relaxed text-ink/80"><span className="font-semibold text-navy">Solution: </span>{result.matchedProblem.solution}</p>
            <p className="mt-2 text-xs text-ink/60">
              {result.matchedProblem.credit === 'helped' ? 'Helped solve on ' : 'Solved on '}
              <Link className="font-medium text-navy underline decoration-gold underline-offset-2" href={`/projects/${encodeURIComponent(result.matchedProblem.projectId)}`}>
                {result.matchedProblem.projectName} ({result.matchedProblem.year})
              </Link>
            </p>
          </section>
        )}

        <section>
          <h3 className="label">How {first} connects to your search</h3>
          <p className="text-sm leading-relaxed text-ink/90" data-testid="connection-description">{result.description.full}</p>
        </section>

        {result.path && result.path.hops > 0 && (
          <section>
            <h3 className="label">Warm path from you ({result.path.hops} {result.path.hops === 1 ? 'hop' : 'hops'})</h3>
            <ol className="flex flex-wrap items-center gap-1.5 text-xs">
              {result.path.steps.map((st, i) => (
                <li key={st.id + i} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <span className="flex items-center gap-1 text-ink/40">
                      {st.via && <span className="text-[10px] italic">{st.via}</span>}
                      <span aria-hidden="true">→</span>
                    </span>
                  )}
                  <span className={`rounded-full px-2.5 py-1 font-medium ${st.kind === 'person' ? (i === result.path!.steps.length - 1 ? 'bg-gold text-navy-900' : 'bg-navy text-white') : st.kind === 'project' ? 'border border-navy/20 bg-white text-navy' : 'bg-navy/5 text-ink/70'}`}>
                    {st.label}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section>
          <h3 className="label">Why {first} matched</h3>
          <ul className="space-y-1 text-sm text-ink/85">
            {result.reasons.map((r) => (
              <li key={r} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden="true" />{r}</li>
            ))}
          </ul>
          <div className="mt-3 space-y-1.5" aria-label="Score breakdown">
            {Object.entries(result.components).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[9.5rem_1fr_3.5rem] items-center gap-2 text-xs" title={COMPONENT_INFO[k].help}>
                <span className="text-ink/70">{COMPONENT_INFO[k].label} <span className="text-ink/40">×{COMPONENT_INFO[k].weight}</span></span>
                <span className="h-2 overflow-hidden rounded-full bg-navy/10">
                  <span className="block h-full rounded-full bg-navy" style={{ width: `${Math.round(v * 100)}%` }} />
                </span>
                <span className="text-right tabular-nums text-ink/70">{v.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="label">What {first} has built</h3>
          <ul className="space-y-1.5 text-sm">
            {result.built.map((b) => (
              <li key={b.id} className="flex items-baseline justify-between gap-2">
                <Link href={`/projects/${encodeURIComponent(b.id)}`} className="font-medium text-navy hover:underline">{b.name}</Link>
                <span className="shrink-0 text-xs text-ink/60">{b.title ?? b.role} · {b.team} · {b.year}</span>
              </li>
            ))}
          </ul>
          {result.solved.length > 0 && kind !== 'stuck' && (
            <p className="mt-2 text-xs text-ink/60">Solved: {result.solved.map((x) => `"${x.description}"`).join('; ')}</p>
          )}
        </section>
      </div>

      <div className="border-t border-navy/10 bg-paper/60 p-4">
        {status && <p className={`mb-2 text-sm ${status.ok ? 'text-teal' : 'text-red-700'}`} role="status">{status.text}</p>}
        {composing ? (
          <div className="space-y-2">
            {viewerProjects.length > 0 && (
              <label className="block">
                <span className="label">For project</span>
                <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  {viewerProjects.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.year})</option>)}
                </select>
              </label>
            )}
            <label className="block">
              <span className="label">Message</span>
              <textarea className="input h-28 resize-none" value={message} onChange={(e) => setMessage(e.target.value)} />
            </label>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={send} disabled={sending}>{sending ? 'Sending…' : 'Send request'}</button>
              <button className="btn-ghost" onClick={() => setComposing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button className="btn-gold flex-1" onClick={() => setComposing(true)} data-testid="request-button">{ctaLabel}</button>
            {onExpand && (
              <button className="btn-ghost" onClick={() => onExpand(result.personId)} title={`Re-center the web on ${first}'s network`}>
                Expand
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
