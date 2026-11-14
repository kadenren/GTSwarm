'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const ROLES = ['Cofounder', 'Advisor', 'Helper', 'Early engineer', 'First customer'];
const MAJORS = ['EE', 'CmpE', 'ME', 'AE', 'BME', 'ISyE', 'CS', 'Business'];
const TEAM_TYPES = ['VIP', 'Capstone', 'CREATE-X', 'Lab', 'Club', 'Invention Studio', 'Startup'];
const LINKS = [
  { k: 'linkedin', l: 'LinkedIn', ph: 'https://linkedin.com/in/your-name' },
  { k: 'github', l: 'GitHub', ph: 'https://github.com/your-username' },
  { k: 'scholar', l: 'Google Scholar', ph: 'https://scholar.google.com/citations?user=...' },
  { k: 'website', l: 'Website or portfolio', ph: 'https://your-site.com' },
] as const;
type LinkKey = (typeof LINKS)[number]['k'];

interface DraftProject { name: string; year: number; team_type: string; team_name: string; summary: string; role: 'builder' | 'founder' | 'advisor'; from?: 'resume' | 'github'; url?: string }
interface Draft { bio: string; major: string; grad_year: number; current_role: string; skills: string[]; projects: DraftProject[] }
interface SourceInfo { name: string; ok: boolean; chars: number; note?: string }

/**
 * Create or update your own profile: resume (multimodal) + links -> review every field -> choose what you are open to -> save.
 * mode "join" creates a new person and switches the demo to act as them.
 */
export default function ProfileClaim({ aiEnabled, mode = 'update', current }: {
  aiEnabled: boolean; mode?: 'update' | 'join'; current: { openTo: string[]; hours: number; links: Partial<Record<LinkKey, string>> };
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'alum' | 'student'>('alum');
  const [files, setFiles] = useState<File[]>([]);
  const [links, setLinks] = useState<Partial<Record<LinkKey, string>>>(current.links);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [source, setSource] = useState<'gemini' | 'keyword' | null>(null);
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [skillsText, setSkillsText] = useState('');
  const [openTo, setOpenTo] = useState<string[]>(current.openTo);
  const [hours, setHours] = useState(current.hours);
  const [addProjects, setAddProjects] = useState<boolean[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const join = mode === 'join';
  const canRead = files.length > 0 || !!links.github?.trim() || !!links.website?.trim();

  async function read(useFiles: File[] = files, useName: string = name) {
    if (join && useName.trim().split(/\s+/).length < 2) { setMsg({ ok: false, text: 'Enter your first and last name first.' }); return; }
    setBusy(true); setMsg(null);
    const form = new FormData();
    useFiles.forEach((f) => form.append('files', f));
    for (const { k } of LINKS) form.set(k, links[k] ?? '');
    const res = await fetch('/api/profile/draft', { method: 'POST', body: form });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: d.error }); return; }
    setDraft(d.draft); setSource(d.source); setSources(d.sources ?? []);
    setSkillsText(d.draft.skills.join(', '));
    setAddProjects(d.draft.projects.map((p: DraftProject) => p.from !== 'github')); // GitHub repos are opt-in
  }
  /** No resume handy (judges, for example)? Read a fictional sample alum's resume in one click. */
  async function useSample() {
    setBusy(true); setMsg(null);
    const blob = await (await fetch('/samples/resume-rachel-bianchi-demo.pdf')).blob();
    const file = new File([blob], 'resume-rachel-bianchi-demo.pdf', { type: 'application/pdf' });
    setName('Rachel Bianchi'); setType('alum'); setFiles([file]);
    await read([file], 'Rachel Bianchi');
  }
  async function save() {
    if (!draft) return;
    setBusy(true); setMsg(null);
    const body = { ...draft, name, type, skills: skillsText.split(',').map((x) => x.trim()).filter(Boolean), open_to: openTo, availability_hours: hours, addProjects, links };
    const res = await fetch(join ? '/api/join' : '/api/profile', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: d.error }); return; }
    const added = d.created?.length ? ` and ${d.created.length} ${d.created.length === 1 ? 'project' : 'projects'} added to the swarm` : '';
    const bad = d.invalidLinks?.length ? ` Check your ${d.invalidLinks.join(', ')} link${d.invalidLinks.length > 1 ? 's' : ''}; ${d.invalidLinks.length > 1 ? 'they were' : 'it was'} not saved.` : '';
    if (join) { router.push('/profile?joined=1'); router.refresh(); return; }
    setMsg({ ok: true, text: `Profile saved${added}. You are now searchable for what you built.${bad}` });
    setDraft(null); setFiles([]);
    router.refresh();
  }
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  return (
    <section className="card p-5" aria-label={join ? 'Create your profile' : 'Update your profile'} data-testid="profile-claim">
      <h2 className="text-lg font-bold text-navy">{join ? 'Create your profile' : 'Update from your resume and links'}</h2>
      <p className="text-xs text-ink/60">
        {aiEnabled ? 'Gemini reads your resume (PDF, Word, text or a photo) and your public GitHub and website, then drafts your profile.' : 'GT Swarm reads your resume (PDF, Word or text) and your public GitHub and website, then drafts your profile.'} You review every field. Nothing is saved until you confirm, and your resume file is not stored.
      </p>

      {!draft && (
        <div className="mt-4 space-y-4">
          {join && (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="block"><span className="label">Your name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="First and last name" autoComplete="name" /></label>
              <div>
                <span className="label">I am</span>
                <div className="flex gap-1 rounded-lg border border-navy/15 p-1">
                  {(['alum', 'student'] as const).map((t) => (
                    <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium ${type === t ? 'bg-navy text-white' : 'text-navy/70'}`}>{t === 'alum' ? 'An alum' : 'A student'}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div>
            <span className="label">Resume</span>
            <div role="button" tabIndex={0} onClick={() => input.current?.click()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') input.current?.click(); }}
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setFiles(Array.from(e.dataTransfer.files).slice(0, 3)); }}
              className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-navy/20 px-4 py-5 text-center hover:border-navy/40" aria-label="Choose your resume">
              <span className="text-sm font-medium text-navy">{files.length ? files.map((f) => f.name).join(', ') : 'Drop your resume here, or click to browse'}</span>
              <span className="text-xs text-ink/50">PDF, Word, text{aiEnabled ? ' or a photo' : ''}. Tip: on LinkedIn, More → Save to PDF exports your profile as a resume.</span>
              <input ref={input} type="file" accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.heic" className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 3))} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {LINKS.map(({ k, l, ph }) => (
              <label key={k} className="block">
                <span className="label">{l}</span>
                <input className="input text-xs" value={links[k] ?? ''} onChange={(e) => setLinks((x) => ({ ...x, [k]: e.target.value }))} placeholder={ph} inputMode="url" />
              </label>
            ))}
          </div>
          <p className="text-[11px] text-ink/50">GitHub and your website are read to suggest projects and skills. LinkedIn and Google Scholar links are shown on your profile but never read automatically.</p>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary" disabled={busy || !canRead} onClick={() => read()}>{busy ? 'Reading…' : join ? 'Read and draft my profile' : 'Read my resume and links'}</button>
            {join && <button type="button" className="btn-gold" disabled={busy} onClick={useSample} data-testid="sample-resume">{busy ? 'Reading…' : 'Use a sample resume'}</button>}
          </div>
          {join && <p className="text-[11px] text-ink/50">The sample is a fictional alum, Rachel Bianchi, so you can watch a profile build itself without uploading anything.</p>}
        </div>
      )}

      {draft && (
        <div className="mt-4 space-y-3" data-testid="profile-draft">
          <div className="rounded-lg bg-paper px-3 py-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-ink/60">{source === 'gemini' ? 'Drafted by Gemini' : 'Drafted by GT Swarm keyword rules'}{join && name ? ` for ${name}` : ''}. Check every field.</span>
              <button className="font-semibold text-navy underline decoration-gold underline-offset-4" onClick={() => setDraft(null)}>Start over</button>
            </div>
            {sources.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {sources.map((x) => (
                  <li key={x.name} className="flex items-start gap-1.5"><span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${x.ok ? 'bg-teal' : 'bg-red-400'}`} /><span><span className="font-medium text-navy">{x.name}</span>{x.note ? <span className="text-ink/50"> · {x.note}</span> : null}</span></li>
                ))}
              </ul>
            )}
          </div>
          <label className="block"><span className="label">Bio</span><textarea className="input h-20" value={draft.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Two sentences on what you build" /></label>
          <div className="grid grid-cols-3 gap-2">
            <label><span className="label">Major</span><select className="input" value={draft.major} onChange={(e) => set('major', e.target.value)}>{MAJORS.map((m) => <option key={m}>{m}</option>)}</select></label>
            <label><span className="label">Grad year</span><input className="input" type="number" value={draft.grad_year} onChange={(e) => set('grad_year', +e.target.value)} /></label>
            <label><span className="label">Current role</span><input className="input" value={draft.current_role} onChange={(e) => set('current_role', e.target.value)} placeholder="Student" /></label>
          </div>
          <label className="block"><span className="label">Skills (comma separated)</span><input className="input" value={skillsText} onChange={(e) => setSkillsText(e.target.value)} /></label>
          {draft.projects.length > 0 && (
            <div>
              <span className="label">Projects found: add to the swarm?</span>
              <ul className="space-y-2">
                {draft.projects.map((p, i) => (
                  <li key={i} className="rounded-lg border border-navy/10 p-3">
                    <label className="flex items-start gap-2">
                      <input type="checkbox" className="mt-1 accent-[#003057]" checked={addProjects[i] ?? false} onChange={(e) => setAddProjects((a) => a.map((v, j) => (j === i ? e.target.checked : v)))} />
                      <span className="min-w-0 flex-1">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink/45">{p.from === 'github' ? 'From your GitHub' : 'From your resume'}</span>
                        <span className="flex flex-wrap gap-2">
                          <input className="input flex-1 py-1" value={p.name} onChange={(e) => set('projects', draft.projects.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label="Project name" />
                          <input className="input w-20 py-1" type="number" value={p.year} onChange={(e) => set('projects', draft.projects.map((x, j) => (j === i ? { ...x, year: +e.target.value } : x)))} aria-label="Year" />
                          <select className="input w-40 py-1" value={p.team_type} onChange={(e) => set('projects', draft.projects.map((x, j) => (j === i ? { ...x, team_type: e.target.value } : x)))} aria-label="Team type">{TEAM_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
                        </span>
                        <input className="input mt-1 py-1 text-xs" value={p.summary} onChange={(e) => set('projects', draft.projects.map((x, j) => (j === i ? { ...x, summary: e.target.value } : x)))} aria-label="Summary" />
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-lg border border-gold/40 bg-gold/10 p-3">
            <span className="label">You choose: what are you open to?</span>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button key={r} type="button" aria-pressed={openTo.includes(r)} onClick={() => setOpenTo((o) => (o.includes(r) ? o.filter((x) => x !== r) : [...o, r]))}
                  className={`chip ${openTo.includes(r) ? 'border-navy bg-navy text-white' : 'border-navy/20 bg-white text-navy'}`}>{r}</button>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-3 text-sm text-navy">
              Hours a week you can give
              <input type="range" min={0} max={15} value={hours} onChange={(e) => setHours(+e.target.value)} className="accent-[#B3A369]" />
              <span className="w-8 font-semibold tabular-nums">{hours}</span>
            </label>
          </div>
          <button className="btn-gold w-full" onClick={save} disabled={busy}>{busy ? 'Saving…' : join ? 'Create my profile' : 'Confirm and save my profile'}</button>
        </div>
      )}
      {msg && <p className={`mt-3 text-sm ${msg.ok ? 'text-teal' : 'text-red-700'}`} role="status">{msg.text}</p>}
    </section>
  );
}
