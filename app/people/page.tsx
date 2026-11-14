import Link from 'next/link';
import PageHero from '@/components/PageHero';
import MemberBadge from '@/components/MemberBadge';
import { getViewerId } from '@/lib/viewer';
import { snapshot } from '@/lib/data';
import { getDb } from '@/lib/db';
import { can, type MembershipStatus } from '@/lib/access';
import { roleLabel } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/** Search intentions run the existing experience-based matcher (keyword + optional Gemini semantic relevance). */
const INTENTIONS: { label: string; href: string }[] = [
  { label: 'Alumni working in robotics', href: '/match?mode=people&aud=alumni&role=any&q=' + encodeURIComponent('robotics engineer working on autonomous robots') },
  { label: 'Alumni who mentor students in autonomy', href: '/mentorship?topic=Engineering%20guidance' },
  { label: 'A graduate who commercialized a medical device', href: '/match?mode=people&aud=alumni&role=any&q=' + encodeURIComponent('commercialized a medical device, FDA clearance, shipped to patients') },
  { label: 'Alumni interested in starting a company', href: '/match?mode=people&aud=alumni&role=Cofounder&q=' + encodeURIComponent('wants to start a company, startup founder') },
  { label: 'People with embedded systems experience', href: '/match?mode=people&aud=both&role=any&q=' + encodeURIComponent('embedded systems firmware microcontroller') },
  { label: 'Alumni in product management', href: '/match?mode=people&aud=alumni&role=any&q=' + encodeURIComponent('product manager, product management') },
  { label: 'Someone who solved a similar technical problem', href: '/stuck' },
];

/** People: browse the opted-in directory with filters, or search by need with the matching engine. */
export default async function PeoplePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const viewerId = await getViewerId();
  const sp = await searchParams;
  const s = snapshot();
  const db = getDb();
  const status = new Map((db.prepare('SELECT person_id, status FROM membership').all() as { person_id: string; status: MembershipStatus }[]).map((r) => [r.person_id, r.status]));
  const mentorIds = new Set((db.prepare('SELECT person_id FROM mentor_profile WHERE accepting = 1').all() as { person_id: string }[]).map((r) => r.person_id));
  const founders = new Set((db.prepare("SELECT pp.person_id FROM person_project pp JOIN projects p ON p.id = pp.project_id WHERE p.is_startup = 1 AND pp.role IN ('founder','maintainer')").all() as { person_id: string }[]).map((r) => r.person_id));
  const seeFull = can(viewerId, 'directory.alumni.full');
  const majors = [...new Set(s.people.map((p) => p.major))].sort();
  const industries = [...new Set(s.people.map((p) => p.company_type).filter(Boolean) as string[])].sort();
  const from = Number(sp.from) || 0, to = Number(sp.to) || 9999;
  const skill = (sp.skill ?? '').toLowerCase().trim();

  const people = s.people
    .filter((p) => p.claimed && p.id !== viewerId)
    .filter((p) => !sp.who || (sp.who === 'alumni' ? p.type === 'alum' : p.type === 'student'))
    .filter((p) => !sp.major || p.major === sp.major)
    .filter((p) => !sp.industry || p.company_type === sp.industry)
    .filter((p) => p.grad_year >= from && p.grad_year <= to)
    .filter((p) => !sp.mentor || mentorIds.has(p.id))
    .filter((p) => !sp.founder || founders.has(p.id))
    .filter((p) => !sp.open || p.open_to.includes(sp.open as never))
    .filter((p) => !skill || (s.skillsOf.get(p.id) ?? []).some((k) => k.toLowerCase().includes(skill)) || p.bio.toLowerCase().includes(skill))
    .sort((a, b) => a.name.localeCompare(b.name));
  const shown = people.slice(0, 60);
  const sel = 'rounded-lg border border-navy/15 bg-white px-2.5 py-1.5 text-sm text-navy';

  return (
    <>
      <PageHero eyebrow="People" title="Students and alumni across every generation."
        subtitle="Browse the opt-in directory, or search by what you need. GT Swarm matches people on demonstrated experience, not just a shared school." />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <section aria-label="Search by need" data-tour="people-intents">
          <h2 className="text-lg font-bold text-navy">Search by need</h2>
          <ul className="mt-2 flex flex-wrap gap-2">{INTENTIONS.map((i) => <li key={i.label}><Link href={i.href} className="chip border-navy/20 bg-white text-sm text-navy hover:border-gold">{i.label}</Link></li>)}</ul>
          <form action="/match" className="mt-3 flex flex-wrap gap-2">
            <input type="hidden" name="mode" value="people" />
            <input name="q" className="input min-w-[240px] flex-1" placeholder="Describe who you are looking for, in plain words" aria-label="Describe who you are looking for" />
            <button className="btn-primary">Find people</button>
          </form>
        </section>

        <form className="card flex flex-wrap items-end gap-2 p-3" aria-label="Directory filters">
          <label className="text-xs"><span className="label">Status</span><select name="who" defaultValue={sp.who ?? ''} className={sel}><option value="">Everyone</option><option value="students">Students</option><option value="alumni">Alumni</option></select></label>
          <label className="text-xs"><span className="label">Class from</span><input name="from" type="number" defaultValue={sp.from ?? ''} placeholder="2008" className={`${sel} w-24`} /></label>
          <label className="text-xs"><span className="label">to</span><input name="to" type="number" defaultValue={sp.to ?? ''} placeholder="2029" className={`${sel} w-24`} /></label>
          <label className="text-xs"><span className="label">Major</span><select name="major" defaultValue={sp.major ?? ''} className={sel}><option value="">Any</option>{majors.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="text-xs"><span className="label">Industry</span><select name="industry" defaultValue={sp.industry ?? ''} className={sel}><option value="">Any</option>{industries.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="text-xs"><span className="label">Skill</span><input name="skill" defaultValue={sp.skill ?? ''} placeholder="firmware" className={`${sel} w-32`} /></label>
          <label className="text-xs"><span className="label">Open to</span><select name="open" defaultValue={sp.open ?? ''} className={sel}><option value="">Any role</option>{['Cofounder', 'Early engineer', 'Advisor', 'Helper'].map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</select></label>
          <label className="flex items-center gap-1.5 pb-2 text-sm text-navy"><input type="checkbox" name="mentor" value="1" defaultChecked={!!sp.mentor} className="accent-[#003057]" />Mentoring</label>
          <label className="flex items-center gap-1.5 pb-2 text-sm text-navy"><input type="checkbox" name="founder" value="1" defaultChecked={!!sp.founder} className="accent-[#003057]" />Startup founders</label>
          <button className="btn-primary">Apply</button>
          <Link href="/people" className="btn-ghost">Clear</Link>
        </form>

        <p className="text-sm text-ink/60">{people.length} {people.length === 1 ? 'person' : 'people'}{people.length > shown.length ? ` (showing ${shown.length})` : ''}</p>
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="people-directory">
          {shown.map((p) => {
            const st = status.get(p.id) ?? (p.type === 'student' ? 'CURRENT_STUDENT' : 'ALUMNI_PENDING_VERIFICATION');
            return (
              <li key={p.id} className="card p-4" data-testid="person-row">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display font-bold text-navy">{p.name}</p>
                    <p className="text-xs text-ink/60">{p.type === 'alum' ? `${p.major} '${String(p.grad_year).slice(2)}` : `${p.major}, class of ${p.grad_year}`}{p.current_role ? ` · ${p.current_role}` : ''}</p>
                    {seeFull && p.type === 'alum' && p.city && <p className="text-[11px] text-ink/50" data-testid="person-city">{p.city}</p>}
                  </div>
                  <MemberBadge status={st} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1">{(s.skillsOf.get(p.id) ?? []).slice(0, 4).map((k) => <span key={k} className="tag">{k}</span>)}</div>
                <p className="mt-2 text-[11px] text-ink/55">{[mentorIds.has(p.id) ? 'Mentoring' : null, founders.has(p.id) ? 'Startup founder' : null, p.open_to.length ? `Open to ${p.open_to.map((r) => roleLabel(r).toLowerCase()).join(', ')}` : null].filter(Boolean).join(' · ')}</p>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-ink/50">{seeFull ? 'As a verified alum you also see alumni locations.' : 'Some alumni directory fields (such as location) are visible to verified alumni only.'} Contact details are never shown; reach people through requests they can decline. All profiles are fictional.</p>
      </div>
    </>
  );
}
