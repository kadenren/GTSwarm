import Link from 'next/link';
import PageHero from '@/components/PageHero';
import ProfileClaim from '@/components/ProfileClaim';
import { viewerContext } from '@/lib/context';
import { snapshot } from '@/lib/data';
import { geminiEnabled } from '@/lib/gemini';
import { linksOf } from '@/lib/profile';
import { recommendBuilds } from '@/lib/matching';
import { listBuilds } from '@/lib/builds';
import { INTERESTS, prefsOf } from '@/lib/prefs';
import { roleLabel } from '@/lib/roles';
import PrefsEditor from '@/components/PrefsEditor';
import { STAGE_STYLE } from '@/components/stage';

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
  const recommended = await recommendBuilds({ viewerId: id, personId: id, limit: 3, requireRoles: true });
  const prefs = prefsOf(id);
  const myStartups = listBuilds().filter((b) => (s.membersOf.get(b.id) ?? []).some((m) => m.person_id === id));
  return (
    <>
      <PageHero eyebrow="My profile" title={`${me.name.split(' ')[0]}'s builder profile`}
        subtitle="What you have built, what you know, and what you are looking for. Founders find you by this record, and it decides which startups are recommended to you." />
      {sp.joined && (
        <div className="mx-auto max-w-7xl px-4 pt-6">
          <div className="rounded-xl border border-gold/50 bg-gold/15 px-5 py-3 text-sm text-navy" role="status"><strong>Welcome to GT Swarm, {me.name.split(' ')[0]}.</strong> Your profile is live and you are now viewing as yourself. Below are startups and projects that could use your expertise; their teams will see you as a match.</div>
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
          <div className="flex flex-wrap gap-1.5">{me.open_to.length ? me.open_to.map((r) => <span key={r} className="tag bg-gold/20 text-gold-dark">{roleLabel(r)}</span>) : <span className="text-xs text-ink/50">Not set</span>}</div>
          <p className="mt-1 text-xs text-ink/55">About {me.availability_hours} hours a week</p>
          <h3 className="label mt-5">Skills</h3>
          <div className="flex flex-wrap gap-1.5">{skills.map((k) => <span key={k} className="tag">{k}</span>)}</div>
          <h3 className="label mt-5">Projects ({projects.length})</h3>
          <ul className="space-y-1 text-sm">
            {projects.map(({ m, p }) => (
              <li key={p.id} className="flex justify-between gap-2">
                <Link href={`/projects/${encodeURIComponent(p.id)}`} className="text-navy hover:underline">{p.name}</Link>
                <span className="text-xs text-ink/50">{m.title ?? (m.role.charAt(0).toUpperCase() + m.role.slice(1))} · {p.year}</span>
              </li>
            ))}
          </ul>
          <h3 className="label mt-5">My startups</h3>
          {myStartups.length ? (
            <ul className="space-y-2" data-testid="my-startups">
              {myStartups.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 rounded-lg border border-navy/10 px-3 py-2">
                  <Link href={`/projects/${encodeURIComponent(b.id)}`} className="font-semibold text-navy hover:underline">{b.name}</Link>
                  <span className="flex items-center gap-2 text-xs"><span className={`rounded px-1.5 py-0.5 font-semibold ${STAGE_STYLE[b.stage]}`}>{b.stage}</span>{b.open && <span className="text-gold-dark">Recruiting</span>}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-ink/55">None yet.</p>}
          <Link href="/add" className="mt-2 inline-block text-xs font-semibold text-navy underline decoration-gold underline-offset-4">Post a startup</Link>
          {solved.length > 0 && <p className="mt-3 text-xs text-ink/55">{solved.length} solved {solved.length === 1 ? 'problem' : 'problems'} on record, searchable in Get Unstuck.</p>}
        </section>
        <div className="space-y-4">
          <PrefsEditor options={INTERESTS} initial={{ interests: prefs.interests, lookingFor: prefs.lookingFor, openTo: me.open_to, hours: me.availability_hours, saved: prefs.saved }} />
          {recommended.length > 0 && (
            <section className="card p-5" aria-label="Builds that could use you" data-testid="profile-recommended">
              <h3 className="font-display text-lg font-bold text-navy">Startups that could use you</h3>
              <p className="text-xs text-ink/55">Matched to your record and what you are open to. Their teams see you as a recommended collaborator too.</p>
              <ul className="mt-3 space-y-3">
                {recommended.map((m) => (
                  <li key={m.build.id} className="rounded-lg border border-navy/10 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/projects/${encodeURIComponent(m.build.id)}`} className="font-semibold text-navy hover:underline">{m.build.name}</Link>
                      <span className="text-[11px] text-ink/50">{m.build.stage}{m.build.owner ? ` · ${m.build.owner.type === 'alum' ? 'alum' : 'student'}-founded` : ''}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink/70">{m.why}</p>
                  </li>
                ))}
              </ul>
              <Link href="/match?mode=startups" className="mt-3 inline-block text-xs font-semibold text-navy underline decoration-gold underline-offset-4">See all matching startups</Link>
            </section>
          )}
          <ProfileClaim aiEnabled={geminiEnabled()} current={{ openTo: me.open_to, hours: me.availability_hours, links: Object.fromEntries(links.map((l) => [l.kind, l.url])) }} />
          <p className="text-center text-xs text-ink/55">Not {me.name.split(' ')[0]}? <Link href="/join" className="font-semibold text-navy underline decoration-gold underline-offset-4">Create your own profile</Link></p>
        </div>
      </div>
    </>
  );
}
