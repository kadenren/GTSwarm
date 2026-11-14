'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RelevanceWeb, { WebLegend, type WebNode } from './RelevanceWeb';
import PersonPanel, { type ViewerProject } from './PersonPanel';
import BuildCardView from './BuildCard';
import { MATCH_ROLES, roleLabel } from '@/lib/roles';
import type { SearchResponse, SearchResult } from '@/lib/searchApi';
import type { BuildMatch } from '@/lib/matching';

type Mode = 'people' | 'startups';
interface Viewer { name: string; type: 'student' | 'alum'; openTo: string[] }
interface OwnedBuild { id: string; name: string }

const AUDIENCES = [{ v: 'both', l: 'Both' }, { v: 'students', l: 'Students' }, { v: 'alumni', l: 'Alumni' }] as const;
const COMPONENTS: Record<string, string> = { E: 'Work matches your request', X: 'Documented experience', T: 'Shared GT ties', R: 'Open to the role', A: 'Availability' };
const WEIGHT: Record<string, number> = { E: 0.55, X: 0.2, T: 0.1, R: 0.1, A: 0.05 };
/** One-click examples: each fills the text and sets the role and audience it is about (nothing is searched until you click). */
const PEOPLE_EXAMPLES = [
  { label: 'Alumni cofounder for a medical wearable', text: "I'm building a wearable medical device startup and need an alumni cofounder with embedded hardware or medical-device expertise.", role: 'Cofounder', aud: 'alumni' },
  { label: 'Student firmware engineer', text: 'wearable firmware engineer', role: 'Early engineer', aud: 'students' },
  { label: 'Robotics technical cofounder', text: "I'm building an autonomous robotics startup and need a technical cofounder experienced in ROS 2, embedded systems, and navigation.", role: 'Cofounder', aud: 'both' },
];
const STARTUP_EXAMPLE = "I'm a computer engineering student interested in embedded systems, wearable devices, and early-stage hardware startups.";

/** Find Matches: one page, two directions. Founder → people, and person → startups. */
export default function MatchFinder({ initialMode, initialQuery, initialRole, initialAudience, viewer, viewerProjects, ownedBuilds }: {
  initialMode: Mode; initialQuery: string; initialRole: string; initialAudience: string; viewer: Viewer; viewerProjects: ViewerProject[]; ownedBuilds: OwnedBuild[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [text, setText] = useState(initialQuery);
  const [role, setRole] = useState(initialRole || 'any');
  const [audience, setAudience] = useState(initialAudience || 'both');
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<SearchResponse | null>(null);
  const [startups, setStartups] = useState<{ usedProfile: boolean; matches: BuildMatch[] } | null>(null);
  const [error, setError] = useState('');
  const lastKey = useRef('');
  const sp = useSearchParams();

  async function run(m: Mode = mode, q = text, r = role, a = audience) {
    setLoading(true); setError('');
    const params = new URLSearchParams({ mode: m, ...(q.trim() ? { q: q.trim() } : {}), ...(m === 'people' ? { role: r, aud: a } : r !== 'any' ? { role: r } : {}) });
    lastKey.current = params.toString();
    router.replace(`/match?${params}`, { scroll: false });
    try {
      if (m === 'people') {
        if (!q.trim()) { setLoading(false); setError('Describe who you are looking for.'); return; }
        const res = await fetch('/api/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'expertise', match: true, query: q, role: r, audience: a }) });
        setPeople(await res.json());
      } else {
        const res = await fetch('/api/match/startups', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: q, role: r }) });
        setStartups(await res.json());
      }
    } catch { setError('Something went wrong. Try again.'); }
    setLoading(false);
  }

  // run on load, and again whenever the URL changes to a different search (links, back/forward, the guided demo)
  useEffect(() => {
    const m: Mode = sp.get('mode') === 'startups' || sp.get('mode') === 'join' ? 'startups' : 'people';
    const q = sp.get('q') ?? '', r = sp.get('role') ?? 'any', a = sp.get('aud') ?? 'both';
    const key = new URLSearchParams({ mode: m, ...(q.trim() ? { q: q.trim() } : {}), ...(m === 'people' ? { role: r, aud: a } : r !== 'any' ? { role: r } : {}) }).toString();
    if (key === lastKey.current) return;
    setMode(m); setText(q); setRole(r); setAudience(a);
    if (q || m === 'startups') run(m, q, r, a); else lastKey.current = key;
  }, [sp]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchMode = (m: Mode) => { setMode(m); setText(''); setRole('any'); setError(''); if (m === 'startups') run('startups', '', 'any', audience); else router.replace('/match?mode=people', { scroll: false }); };

  return (
    <div className="relative z-10 mx-auto -mt-8 max-w-6xl px-4 pb-12">
      <div className="card p-5 shadow-xl" data-tour="match-form">
        <div className="inline-flex rounded-xl bg-paper p-1" role="tablist" aria-label="What are you looking for?">
          {([['people', 'Find Your People'], ['startups', 'Find Your Startup']] as const).map(([v, l]) => (
            <button key={v} role="tab" aria-selected={mode === v} onClick={() => switchMode(v)} data-testid={`mode-${v}`}
              className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${mode === v ? 'bg-navy text-white shadow' : 'text-navy/70 hover:text-navy'}`}>{l}</button>
          ))}
        </div>
        <form className="mt-4" onSubmit={(e) => { e.preventDefault(); run(); }} data-filled={text.trim() ? "true" : "false"}>
          <label htmlFor="match-text" className="label">{mode === 'people' ? 'Who are you looking for?' : 'Your skills, experience and interests'}</label>
          <textarea id="match-text" className="input h-24 text-base" value={text} onChange={(e) => setText(e.target.value)}
            placeholder={mode === 'people' ? PEOPLE_EXAMPLES[0].text : `Leave empty to use your saved profile, or describe yourself: "${STARTUP_EXAMPLE}"`} />
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Role">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-ink/50">{mode === 'people' ? 'Role' : 'Role I want'}</span>
              {['any', ...MATCH_ROLES].map((r) => (
                <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)}
                  className={`rounded-full border px-3 py-1 text-sm font-medium ${role === r ? 'border-navy bg-navy text-white' : 'border-navy/20 bg-white text-navy hover:border-navy/50'}`}>{r === 'any' ? 'Any' : roleLabel(r)}</button>
              ))}
            </div>
            {mode === 'people' && (
              <div className="flex items-center gap-1.5" role="group" aria-label="Students or alumni">
                <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-ink/50">From</span>
                {AUDIENCES.map((a) => (
                  <button key={a.v} type="button" aria-pressed={audience === a.v} onClick={() => setAudience(a.v)}
                    className={`rounded-full border px-3 py-1 text-sm font-medium ${audience === a.v ? 'border-navy bg-navy text-white' : 'border-navy/20 bg-white text-navy hover:border-navy/50'}`}>{a.l}</button>
                ))}
              </div>
            )}
            <button type="submit" className="btn-gold ml-auto px-6" disabled={loading} data-testid="match-submit">{loading ? 'Matching…' : mode === 'people' ? 'Find people' : 'Find startups'}</button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs" data-tour="match-examples">
            <span className="text-ink/50">{mode === 'people' ? 'Fill an example:' : 'Or fill an example:'}</span>
            {mode === 'people'
              ? PEOPLE_EXAMPLES.map((ex, i) => (
                <button key={ex.label} type="button" data-testid={`people-example-${i}`} onClick={() => { setText(ex.text); setRole(ex.role); setAudience(ex.aud); setError(''); }}
                  className={`rounded-full border px-3 py-1 font-medium transition ${text === ex.text ? 'border-gold bg-gold/20 text-navy' : 'border-navy/10 bg-paper text-navy hover:bg-gold/20'}`}>{ex.label}</button>
              ))
              : <button type="button" data-testid="startup-example" onClick={() => setText(STARTUP_EXAMPLE)} className={`rounded-full border px-3 py-1 font-medium transition ${text === STARTUP_EXAMPLE ? 'border-gold bg-gold/20 text-navy' : 'border-navy/10 bg-paper text-navy hover:bg-gold/20'}`}>Embedded systems student</button>}
          </div>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </form>
      </div>

      {loading && <div className="mt-6 grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="card h-52 animate-pulse bg-white/60" />)}</div>}
      {!loading && mode === 'people' && people && <PeopleResults data={people} viewer={viewer} viewerProjects={viewerProjects} ownedBuilds={ownedBuilds} />}
      {!loading && mode === 'startups' && startups && <StartupResults data={startups} viewer={viewer} />}
    </div>
  );
}

function PeopleResults({ data, viewer, viewerProjects, ownedBuilds }: { data: SearchResponse; viewer: Viewer; viewerProjects: ViewerProject[]; ownedBuilds: OwnedBuild[] }) {
  const [view, setView] = useState<'cards' | 'network'>('cards');
  const [selected, setSelected] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const relevant = data.results.filter((r) => r.relevant);
  const weaker = data.results.length - relevant.length;
  const listed = showAll ? data.results : relevant;
  const nodes: WebNode[] = useMemo(() => data.results.map((r) => ({ id: r.personId, name: r.name, label: r.label, type: r.type, score: r.score, rank: r.rank, ring: r.ring, short: r.why })), [data]);
  const sel = data.results.find((r) => r.personId === selected) ?? null;
  if (!data.results.length) {
    return <div className="card mt-6 p-10 text-center"><h2 className="text-xl font-bold text-navy">No matches yet</h2><p className="mx-auto mt-2 max-w-md text-sm text-ink/70">Nobody {data.audience !== 'both' ? `among ${data.audience} ` : ''}who is open to that role has documented work close to your request. Try Any role, Both, or broader words.</p></div>;
  }
  return (
    <section className="mt-8" aria-label="Recommended people">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy">{relevant.length} {relevant.length === 1 ? 'person' : 'people'} who fit</h2>
          <p className="text-sm text-ink/60">Ranked by what they have actually built and solved{data.role ? `, among people open to ${roleLabel(data.role).toLowerCase()} roles` : ''}. Every reason comes from their record.</p>
        </div>
        <div className="flex rounded-lg border border-navy/15 bg-white p-0.5" role="tablist" aria-label="Result view">
          {([['cards', 'Matches'], ['network', 'View network']] as const).map(([v, l]) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} data-testid={`view-${v}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === v ? 'bg-navy text-white' : 'text-navy/70 hover:text-navy'}`}>{l}</button>
          ))}
        </div>
      </div>
      {view === 'cards' ? (
        <ol className="mt-4 grid gap-4 lg:grid-cols-2" data-testid="people-results" data-aud={data.audience}>
          {listed.map((r) => <li key={r.personId}><PersonMatchCard r={r} role={data.role} query={data.query} viewer={viewer} ownedBuilds={ownedBuilds} /></li>)}
        </ol>
      ) : null}
      {view === 'cards' && weaker > 0 ? (
        <div className="mt-4 text-center">
          <button className="btn-ghost" onClick={() => setShowAll((v) => !v)} data-testid="show-weaker">{showAll ? 'Hide weaker matches' : `Show ${weaker} weaker ${weaker === 1 ? 'match' : 'matches'}`}</button>
        </div>
      ) : null}
      {view === 'network' && (
        <div className={`mt-4 grid grid-cols-[minmax(0,1fr)] gap-6 ${sel ? 'lg:grid-cols-[minmax(0,1fr)_400px]' : ''}`}>
          <div className="card min-w-0 p-4">
            <RelevanceWeb nodes={nodes} edges={data.edges} query={data.query} roleLabel={data.role ? roleLabel(data.role) : 'Matches'} selectedId={selected} onSelect={setSelected} />
            <WebLegend />
          </div>
          {sel && <div className="lg:sticky lg:top-20 lg:self-start"><PersonPanel result={sel} kind="expertise" role={data.role} query={data.query} viewerName={viewer.name} viewerProjects={viewerProjects} onClose={() => setSelected(null)} matcher="graph" /></div>}
        </div>
      )}
    </section>
  );
}

function PersonMatchCard({ r, role, query, viewer, ownedBuilds }: { r: SearchResult; role: string | null; query: string; viewer: Viewer; ownedBuilds: OwnedBuild[] }) {
  const [why, setWhy] = useState(false);
  const tone = r.strength === 'Strong match' ? 'bg-teal text-white' : r.strength === 'Good match' ? 'bg-teal-light text-teal' : 'bg-navy/5 text-navy/70';
  return (
    <article className={`card flex h-full flex-col p-5 ${r.rank === 1 ? 'border-gold ring-2 ring-gold/30' : ''}`} data-testid="person-card">
      <div className="flex items-start gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-base font-bold text-white ${r.type === 'alum' ? 'bg-teal' : 'bg-plum'}`}>{r.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <h3 className="font-display text-lg font-bold text-navy">{r.name}</h3>
          </div>
          <p className="text-sm text-ink/65">{r.type === 'alum' ? `Alum, ${r.major} '${String(r.gradYear).slice(2)}` : `${r.major} student, class of ${r.gradYear}`}{r.currentRole ? ` · ${r.currentRole}` : ''}</p>
        </div>
        <div className="text-right">
          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{r.strength}</span>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-navy" data-testid="match-why">{r.why}</p>

      <div className="mt-3 flex flex-wrap gap-1">
        {r.skills.map((k) => <span key={k} className={`tag ${r.matchedSkills.includes(k) ? 'bg-gold/25 text-navy' : ''}`}>{k}</span>)}
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Has built</dt>
          <dd className="text-ink/80">{r.built.slice(0, 2).map((b) => `${b.name} (${b.year})`).join(', ') || 'No projects listed yet'}</dd></div>
        <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Wants to work on</dt>
          <dd className="text-ink/80">{r.wants}</dd></div>
      </dl>
      <p className="mt-2 text-xs text-ink/55">About {r.hours} h/week · open to {r.openTo.map((x) => roleLabel(x).toLowerCase()).join(', ') || 'not set'}</p>

      {why && (
        <div className="mt-3 rounded-lg bg-paper p-3 text-xs" data-testid="why-breakdown">
          <div className="font-semibold uppercase tracking-wide text-ink/50">How the score adds up</div>
          <ul className="mt-1.5 space-y-1">
            {Object.entries(r.components).map(([k, v]) => (
              <li key={k} className="flex items-center gap-2">
                <span className="w-44 text-ink/75">{COMPONENTS[k]}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy/10"><span className="block h-full bg-navy/60" style={{ width: `${Math.round(v * 100)}%` }} /></span>
                <span className="w-16 text-right tabular-nums text-ink/50">{(v * WEIGHT[k]).toFixed(2)} of {WEIGHT[k]}</span>
              </li>
            ))}
          </ul>
          <ul className="mt-2 space-y-0.5 text-ink/70">{r.reasons.slice(0, 4).map((x) => <li key={x}>· {x}</li>)}</ul>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <InviteButton person={{ id: r.personId, name: r.name }} role={role} query={query} viewer={viewer} ownedBuilds={ownedBuilds} />
        <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setWhy(!why)} aria-expanded={why}>{why ? 'Hide details' : 'Why this match?'}</button>
      </div>
    </article>
  );
}

/** Invite someone to connect, optionally about one of your builds. Accepting only creates a connection. */
export function InviteButton({ person, role, query, viewer, ownedBuilds }: { person: { id: string; name: string }; role: string | null; query: string; viewer: Viewer; ownedBuilds: OwnedBuild[] }) {
  const first = person.name.split(' ')[0];
  const [open, setOpen] = useState(false);
  const [pickRole, setPickRole] = useState(role ?? 'Helper');
  const [projectId, setProjectId] = useState(ownedBuilds[0]?.id ?? '');
  const proj = ownedBuilds.find((b) => b.id === projectId);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const draft = `Hi ${first}, I'm ${viewer.name.split(' ')[0]}${proj ? `, building ${proj.name}` : ''}. GT Swarm matched us and your experience stood out. Would you be open to talking about a ${roleLabel(pickRole).toLowerCase()} role?`;
  async function send() {
    setBusy(true);
    const res = await fetch('/api/requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ to: person.id, kind: 'expertise', role: pickRole, message: message || draft, projectId: projectId || null }) });
    const d = await res.json();
    setBusy(false);
    setStatus(res.ok ? { ok: true, text: d.duplicate ? `You already invited ${first}.` : `Invite sent to ${first}. You will connect if they accept.` } : { ok: false, text: d.error ?? 'Could not send.' });
    if (res.ok) setOpen(false);
  }
  if (status?.ok) return <span className="text-sm font-medium text-teal" role="status">{status.text}</span>;
  if (!open) return <button className="btn-gold px-4 py-1.5 text-sm" onClick={() => setOpen(true)} data-testid="invite-button">Invite to connect</button>;
  return (
    <div className="w-full space-y-2 rounded-lg border border-gold/40 bg-gold/10 p-3" data-testid="invite-form">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-semibold text-navy">Invite as</span>
        {MATCH_ROLES.map((r) => (
          <button key={r} type="button" aria-pressed={pickRole === r} onClick={() => setPickRole(r)}
            className={`rounded-full border px-2.5 py-0.5 font-medium ${pickRole === r ? 'border-navy bg-navy text-white' : 'border-navy/20 bg-white text-navy'}`}>{roleLabel(r)}</button>
        ))}
      </div>
      {ownedBuilds.length > 0 && (
        <label className="flex items-center gap-2 text-xs text-navy">For
          <select className="input py-1 text-xs" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">No specific startup</option>
            {ownedBuilds.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
      )}
      <textarea className="input h-20 text-xs" value={message || draft} onChange={(e) => setMessage(e.target.value)} aria-label="Message" />
      <div className="flex gap-2">
        <button className="btn-primary px-3 py-1.5 text-xs" onClick={send} disabled={busy} data-testid="invite-send">{busy ? 'Sending…' : 'Send invite'}</button>
        <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {status && !status.ok && <p className="text-xs text-red-700">{status.text}</p>}
    </div>
  );
}

function StartupResults({ data, viewer }: { data: { usedProfile: boolean; matches: BuildMatch[] }; viewer: Viewer }) {
  if (!data.matches.length) return <div className="card mt-6 p-10 text-center"><h2 className="text-xl font-bold text-navy">No startups match yet</h2><p className="mx-auto mt-2 max-w-md text-sm text-ink/70">No active startup is looking for {viewer.openTo.length ? 'the roles you are open to' : 'that'} right now. Try Any role, describe your skills, or <Link href="/" className="underline">browse every startup</Link>.</p></div>;
  return (
    <section className="mt-8" aria-label="Recommended startups">
      <h2 className="text-2xl font-bold text-navy">Startups that need what you do</h2>
      <p className="text-sm text-ink/60">{data.usedProfile ? `Matched to your saved profile: your skills, past projects and the roles you are open to (${viewer.openTo.map((r) => roleLabel(r).toLowerCase()).join(', ') || 'not set'}).` : 'Matched to what you wrote, plus the skills on your record.'} Only startups seeking {data.usedProfile ? 'a role you are open to' : 'help'} are shown.</p>
      <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="startup-results">
        {data.matches.map((m, i) => <li key={m.build.id} data-build={m.build.id}><BuildCardView build={m.build} why={m.why} reasons={m.reasons.slice(0, 2)} highlight={i === 0} /></li>)}
      </ul>
    </section>
  );
}
