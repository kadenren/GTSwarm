import Link from 'next/link';
import PageHero from '@/components/PageHero';
import ProfileClaim from '@/components/ProfileClaim';
import { viewerContext } from '@/lib/context';
import { snapshot } from '@/lib/data';
import { geminiEnabled } from '@/lib/gemini';
import { linksOf } from '@/lib/profile';

export const dynamic = 'force-dynamic';

const LINK_LABEL: Record<string, string> = { linkedin: 'LinkedIn', github: 'GitHub', scholar: 'Google Scholar', website: 'Website' };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { id, me } = await viewerContext();
  const links = linksOf(id);
  const s = snapshot();
  const skills = s.skillsOf.get(id) ?? [];
  const projects = (s.projectsOf.get(id) ?? []).map((m) => ({ m, p: s.project.get(m.project_id)! })).sort((a, b) => b.p.year - a.p.year);
  const solved = s.problemsBy.get(id) ?? [];
  return (
    <>
      <PageHero eyebrow="Your profile" title="Claim your place in the swarm"
        subtitle="Your profile is built from what you actually did. Upload your own resume to fill it in, review every field, and choose what you are open to." />
      {sp.joined && (
        <div className="mx-auto max-w-7xl px-4 pt-6">
          <div className="rounded-xl border border-gold/50 bg-gold/15 px-5 py-3 text-sm text-navy" role="status"><strong>Welcome to GT Swarm, {me.name.split(' ')[0]}.</strong> Your profile is live and you are now viewing as yourself. Try Find expertise to see who you are connected to.</div>
        </div>
      )}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_1.1fr]">
        <section className="card p-5" aria-label="Current profile">
          <div className="flex items-center gap-3">
            <span className={`flex h-14 w-14 items-center justify-center rounded-full font-display text-lg font-bold text-white ${me.type === 'alum' ? 'bg-teal' : 'bg-plum'}`}>{me.name.split(' ').map((w) => w[0]).join('')}</span>
            <div>
              <h2 className="text-2xl font-bold text-navy">{me.name}</h2>
              <p className="text-sm text-ink/60">{me.type === 'alum' ? `Alum, ${me.major} '${String(me.grad_year).slice(2)}` : `${me.major} student, class of ${me.grad_year}`}{me.current_role ? ` · ${me.current_role}` : ''}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink/85">{me.bio}</p>
          {links.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2 text-xs">
              {links.map((l) => <li key={l.kind}><a href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-navy/15 px-2 py-1 font-medium text-navy hover:border-gold">{LINK_LABEL[l.kind] ?? l.kind} <span aria-hidden="true">↗</span></a></li>)}
            </ul>
          )}
          <h3 className="label mt-5">Open to</h3>
          <div className="flex flex-wrap gap-1.5">{me.open_to.length ? me.open_to.map((r) => <span key={r} className="tag bg-gold/20 text-gold-dark">{r}</span>) : <span className="text-xs text-ink/50">Not set</span>}</div>
          <p className="mt-1 text-xs text-ink/55">About {me.availability_hours} hours a week</p>
          <h3 className="label mt-5">Skills</h3>
          <div className="flex flex-wrap gap-1.5">{skills.map((k) => <span key={k} className="tag">{k}</span>)}</div>
          <h3 className="label mt-5">Projects ({projects.length})</h3>
          <ul className="space-y-1 text-sm">
            {projects.map(({ m, p }) => (
              <li key={p.id} className="flex justify-between gap-2">
                <Link href={`/projects/${encodeURIComponent(p.id)}`} className="text-navy hover:underline">{p.name}</Link>
                <span className="text-xs text-ink/50">{m.title ?? m.role} · {p.year}</span>
              </li>
            ))}
          </ul>
          {solved.length > 0 && <p className="mt-3 text-xs text-ink/55">{solved.length} solved {solved.length === 1 ? 'problem' : 'problems'} on record, searchable in I&apos;m stuck.</p>}
        </section>
        <div className="space-y-4">
          <ProfileClaim aiEnabled={geminiEnabled()} current={{ openTo: me.open_to, hours: me.availability_hours, links: Object.fromEntries(links.map((l) => [l.kind, l.url])) }} />
          <p className="text-center text-xs text-ink/55">Not {me.name.split(' ')[0]}? <Link href="/join" className="font-semibold text-navy underline decoration-gold underline-offset-4">Create your own profile</Link></p>
        </div>
      </div>
    </>
  );
}
