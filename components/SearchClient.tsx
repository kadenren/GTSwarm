'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RelevanceWeb, { WebLegend, type WebNode } from './RelevanceWeb';
import PersonPanel, { type ViewerProject } from './PersonPanel';
import type { SearchResponse } from '@/lib/searchApi';

const ROLES = ['Cofounder', 'Advisor', 'Helper', 'Early engineer', 'First customer'] as const;
const AUDIENCES = [
  { v: 'both', l: 'Both' },
  { v: 'students', l: 'Students' },
  { v: 'alumni', l: 'Alumni' },
] as const;

export interface Suggestion { q: string; role?: string; audience?: string; label?: string }

export default function SearchClient({
  kind, viewerName, viewerProjects, initial, suggestions,
}: {
  kind: 'expertise' | 'stuck';
  viewerName: string;
  viewerProjects: ViewerProject[];
  initial: { q: string; role: string; audience: string };
  suggestions: Suggestion[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const lastQuery = useRef<string | null>(null); // the query last searched, so our own URL update doesn't search twice
  const [q, setQ] = useState(initial.q);
  const [role, setRole] = useState(initial.role || 'Cofounder');
  const [audience, setAudience] = useState(initial.audience || 'both');
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'web' | 'list'>('list');
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const run = useCallback(async (query: string, r: string, a: string) => {
    if (!query.trim()) return;
    lastQuery.current = query;
    setLoading(true);
    setError(null);
    setSelected(null);
    setShowAll(false);
    const params = new URLSearchParams({ q: query });
    if (kind === 'expertise') { params.set('role', r); params.set('aud', a); } else if (a !== 'both') params.set('aud', a);
    router.replace(`?${params.toString()}`, { scroll: false });
    try {
      const res = await fetch('/api/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, query, role: r, audience: a }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Search failed');
      setData(json);
      requestAnimationFrame(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [kind, router]);

  // search on load, and again whenever a link changes ?q= (for example the guided demo opening an example)
  useEffect(() => {
    const fromUrl = params.get('q') ?? initial.q;
    if (fromUrl && fromUrl !== lastQuery.current) {
      setQ(fromUrl);
      run(fromUrl, initial.role || 'Cofounder', params.get('aud') ?? initial.audience ?? 'both');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const nodes: WebNode[] = useMemo(() => (data?.results ?? []).map((r) => ({ id: r.personId, name: r.name, label: r.label, type: r.type, score: r.score, rank: r.rank, ring: r.ring, short: r.description.short })), [data]);
  const selectedResult = data?.results.find((r) => r.personId === selected) ?? null;
  const roleLabel = kind === 'stuck' ? 'I’m stuck' : `${data?.role ?? role}${data && data.audience !== 'both' ? ` · ${data.audience}` : ''}`;

  return (
    <div className="relative z-10 mx-auto -mt-6 max-w-7xl px-4 pb-8">
      <form
        className="card p-5"
        onSubmit={(e) => { e.preventDefault(); run(q, role, audience); }}
        aria-label={kind === 'stuck' ? 'Describe your problem' : 'Search for expertise'}
      >
        <label htmlFor="q" className="label">{kind === 'stuck' ? 'What are you stuck on?' : 'What expertise do you need?'}</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          {kind === 'stuck' ? (
            <textarea id="q" className="input min-h-[52px] flex-1 resize-y text-base" rows={2} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Describe the problem, for example: Bluetooth drops when the sensor sleeps" />
          ) : (
            <input id="q" className="input flex-1 text-base" value={q} onChange={(e) => setQ(e.target.value)} placeholder="A skill or experience, for example: low-power embedded hardware, has shipped a product" />
          )}
          <button type="submit" className="btn-primary px-6 text-base" disabled={loading || !q.trim()}>
            {loading ? 'Searching…' : kind === 'stuck' ? 'Find who solved it' : 'Search'}
          </button>
        </div>

        {kind === 'expertise' && (
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <fieldset className="flex flex-wrap items-center gap-2">
              <legend className="sr-only">Role</legend>
              <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-navy/60">Role</span>
              {ROLES.map((r) => (
                <button type="button" key={r} onClick={() => setRole(r)} aria-pressed={role === r}
                  className={`chip ${role === r ? 'border-navy bg-navy text-white' : 'border-navy/20 bg-white text-navy hover:border-navy/50'}`}>{r}</button>
              ))}
            </fieldset>
            <fieldset className="flex items-center gap-1 rounded-full border border-navy/15 bg-paper p-1">
              <legend className="sr-only">Audience</legend>
              {AUDIENCES.map((a) => (
                <button type="button" key={a.v} onClick={() => setAudience(a.v)} aria-pressed={audience === a.v}
                  className={`rounded-full px-3 py-1 text-sm font-medium ${audience === a.v ? 'bg-gold text-navy-900' : 'text-navy/70 hover:text-navy'}`}>{a.l}</button>
              ))}
            </fieldset>
          </div>
        )}
        {suggestions.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-ink/50">Try:</span>
            {suggestions.map((s) => (
              <button key={s.q + s.role} type="button" className="rounded-full bg-navy/5 px-3 py-1 text-navy hover:bg-gold/30"
                onClick={() => {
                  setQ(s.q);
                  if (s.role) setRole(s.role);
                  setAudience(s.audience ?? 'both');
                  run(s.q, s.role ?? role, s.audience ?? 'both');
                }}>
                {s.label ?? s.q}
              </button>
            ))}
          </div>
        )}
      </form>

      {error && <p className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</p>}

      {!data && !loading && kind === 'stuck' && (
        <section className="mt-6 grid gap-4 md:grid-cols-3" aria-label="How Get Unstuck works" data-testid="stuck-how">
          {[
            ['1', 'Describe the problem', 'Plain words are fine: a bug, a security review, a fundraising question.'],
            ['2', 'See who solved it, and how', 'Students and alumni are ranked on problems they actually solved on GT projects, with the fix on record.'],
            ['3', 'Ask for 15 minutes', 'Your question goes to their inbox with the problem attached. They can say yes or no; nothing else is shared.'],
          ].map(([n, t, d]) => (
            <div key={n} className="card flex gap-4 p-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold font-display font-bold text-navy-900">{n}</span>
              <div>
                <h3 className="font-display font-bold text-navy">{t}</h3>
                <p className="mt-1 text-sm text-ink/65">{d}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {!data && !loading && kind !== 'stuck' && (
        <section className="mt-6 grid gap-4 md:grid-cols-3" aria-label="How to read results">
          {[
            { t: 'Closer to the center = stronger match', d: 'People are ranked on what they actually built and solved, plus role fit, shared ties and availability.', icon: (
              <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="#003057" strokeOpacity=".15" strokeDasharray="2 3" /><circle cx="20" cy="20" r="9" fill="none" stroke="#003057" strokeOpacity=".2" strokeDasharray="2 3" /><rect x="13" y="17" width="14" height="6" rx="3" fill="#B3A369" /><circle cx="20" cy="9" r="3.5" fill="#1B8A8F" /><line x1="20" y1="17" x2="20" y2="12.5" stroke="#B3A369" strokeWidth="2.5" /><circle cx="35" cy="26" r="2.5" fill="#6B4FA3" /></svg>) },
            { t: 'Teal alumni, purple students', d: 'Dashed lines show people in your results who already know each other, so you see the whole cluster.', icon: (
              <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><circle cx="11" cy="20" r="6" fill="#1B8A8F" /><circle cx="29" cy="20" r="6" fill="#6B4FA3" /><line x1="17" y1="20" x2="23" y2="20" stroke="#5B6B7C" strokeDasharray="2 2" strokeWidth="1.5" /></svg>) },
            { t: 'Click anyone to see why', d: 'Each person comes with a plain-English connection, a score breakdown and the warm path from you.', icon: (
              <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><rect x="6" y="8" width="28" height="24" rx="4" fill="none" stroke="#003057" strokeOpacity=".3" /><rect x="10" y="13" width="14" height="3" rx="1.5" fill="#003057" /><rect x="10" y="19" width="20" height="2" rx="1" fill="#003057" fillOpacity=".3" /><rect x="10" y="24" width="16" height="2" rx="1" fill="#003057" fillOpacity=".3" /></svg>) },
          ].map((x) => (
            <div key={x.t} className="card flex gap-4 p-5">
              <div className="shrink-0">{x.icon}</div>
              <div>
                <h3 className="font-display font-bold text-navy">{x.t}</h3>
                <p className="mt-1 text-sm text-ink/65">{x.d}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {data && !loading && data.results[0] && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/50 bg-gradient-to-r from-gold/15 to-transparent px-5 py-3" data-testid="best-match">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ring-4 ring-gold ${data.results[0].type === 'alum' ? 'bg-teal' : 'bg-plum'}`}>
              {data.results[0].name.split(' ').map((w) => w[0]).join('')}
            </span>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gold-dark">{kind === 'stuck' ? 'Solved this before' : 'Best match'}</div>
              <div className="font-display text-lg font-bold text-navy">{data.results[0].name} <span className="text-sm font-medium text-ink/55">{data.results[0].label.replace(/^[^,]+,\s*/, '')}</span></div>
              <div className="text-sm text-ink/70">{kind === 'stuck' && data.results[0].matchedProblem ? `“${data.results[0].matchedProblem.description}” on ${data.results[0].matchedProblem.projectName} (${data.results[0].matchedProblem.year})` : data.results[0].description.short.split(' · ')[0]}{data.results[0].path ? ` · ${data.results[0].path.hops} ${data.results[0].path.hops === 1 ? 'hop' : 'hops'} from you` : ''}</div>
            </div>
          </div>
          <button className="btn-gold" data-testid="best-match-why" onClick={() => setSelected(data.results[0].personId)}>{kind === 'stuck' ? `See how ${data.results[0].name.split(' ')[0]} solved it` : `See why ${data.results[0].name.split(' ')[0]} matched`}</button>
        </div>
      )}

      {data && !loading && data.results.length === 0 && (
        <div className="card mt-6 p-10 text-center">
          <h2 className="text-xl font-bold text-navy">No matches yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/70">
            Nobody on GT Swarm has solved something close to &ldquo;{data.query}&rdquo;{data.audience !== 'both' ? ` among ${data.audience}` : ''}. Try broader words, switch to Both, or log what you learn on your project page so the next builder can find it.
          </p>
        </div>
      )}

      {data && data.results.length > 0 && (
        <div className={`mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 ${selectedResult ? 'lg:grid-cols-[minmax(0,1fr)_420px]' : ''}`}>
          <section id="results" className="card min-w-0 scroll-mt-20 p-4" aria-label="Results">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-navy">
                  {(() => { const n = data.results.filter((r) => r.relevant).length; return `${n} ${n === 1 ? 'person has' : 'people have'} solved something close to "${data.query}"`; })()}
                </h2>
                <p className="text-xs text-ink/60">
                  {view === 'list' ? 'Ranked by the problems they solved and the work they did. Click a person to see how they solved it.' : 'Closer to the center means a closer match. Click a person to see how they solved it.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(
                  <div className="flex rounded-lg border border-navy/15 p-0.5" role="tablist" aria-label="Result view">
                    {(['list', 'web'] as const).map((v) => (
                      <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
                        className={`rounded-md px-3 py-1 text-sm font-medium ${view === v ? 'bg-navy text-white' : 'text-navy/70 hover:text-navy'}`}>
                        {v === 'web' ? 'Map' : 'List'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {view === 'web' ? (
              <>
                <RelevanceWeb nodes={nodes} edges={data.edges} query={data.query} roleLabel={roleLabel} selectedId={selected} onSelect={setSelected} />
                <WebLegend />
              </>
            ) : (
              <>
              <ol className="grid gap-3 sm:grid-cols-2" data-testid="result-list">
                {data.results.filter((r) => showAll || r.relevant).map((r) => (
                  <li key={r.personId}>
                    <button onClick={() => setSelected(r.personId)}
                      className={`card w-full p-4 text-left transition hover:border-gold ${selected === r.personId ? 'border-gold ring-2 ring-gold/40' : ''}`}>
                      <div className="flex items-center gap-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${r.type === 'alum' ? 'bg-teal' : 'bg-plum'} ${r.rank === 1 ? 'ring-2 ring-gold ring-offset-2' : ''}`}>{r.rank}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate font-display font-bold text-navy">{r.name}</span>
                          </div>
                          <div className="text-xs text-ink/60">{r.type === 'alum' ? `Alum '${String(r.gradYear).slice(2)}` : 'Student'}{r.currentRole && r.type === 'alum' ? ` · ${r.currentRole}` : ''}</div>
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-snug text-ink/85">{r.matchedProblem ? `Solved “${r.matchedProblem.description}” on ${r.matchedProblem.projectName} (${r.matchedProblem.year})` : r.description.short.split(' · ')[0]}</p>
                    </button>
                  </li>
                ))}
              </ol>
              {data.results.some((r) => !r.relevant) && (
                <div className="mt-3 text-center">
                  <button className="btn-ghost" onClick={() => setShowAll((v) => !v)} data-testid="show-weaker">{showAll ? 'Hide weaker matches' : (() => { const n = data.results.filter((r) => !r.relevant).length; return `Show ${n} weaker ${n === 1 ? 'match' : 'matches'}`; })()}</button>
                </div>
              )}
              </>
            )}
          </section>
          {selectedResult && (
            <div className="lg:sticky lg:top-20 lg:self-start">
              <PersonPanel
                matcher={data.matcher}
                result={selectedResult} kind={kind} role={data.role} query={data.query} viewerName={viewerName} viewerProjects={viewerProjects}
                onClose={() => setSelected(null)}
              />
            </div>
          )}
        </div>
      )}
      {loading && !data && <div className="mt-6 h-[520px] animate-pulse rounded-xl bg-white/60" aria-label="Loading results" />}
    </div>
  );
}
