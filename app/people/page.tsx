import Link from 'next/link';
import PageHero from '@/components/PageHero';
import AskToConnect from '@/components/AskToConnect';
import { getViewerId } from '@/lib/viewer';
import { snapshot } from '@/lib/data';
import { findPeople, PURPOSES, canRequest, type Purpose } from '@/lib/people';

export const dynamic = 'force-dynamic';

const PAGE = 6;

/** Find People: search by interest or career, pick a purpose, see who is relevant and willing, and ask to connect. */
export default async function FindPeoplePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const viewerId = await getViewerId();
  const sp = await searchParams;
  const s = snapshot();
  const purpose = (PURPOSES.some((p) => p.id === sp.purpose) ? sp.purpose : 'meet') as Purpose;
  const results = await findPeople(viewerId, { q: sp.q, purpose, who: sp.who, industry: sp.industry, city: sp.city, mentor: sp.mentor === '1' });
  const limit = Math.max(PAGE, Number(sp.show) || PAGE);
  const shown = results.slice(0, limit);
  const industries = [...new Set(s.people.map((p) => p.company_type).filter(Boolean) as string[])].sort();
  const cities = [...new Set(s.people.map((p) => p.city).filter(Boolean) as string[])].sort();
  const me = s.person.get(viewerId)!;
  const qs = (extra: Record<string, string>) => new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v) as [string, string][]), ...extra }).toString();
  const sel = 'rounded-lg border border-navy/15 bg-white px-2.5 py-2 text-sm text-navy';

  return (
    <>
      <PageHero eyebrow="Find People" title="Find people"
        subtitle="Meet Yellow Jackets who share your interests or have experience you're curious about. You only see people who are open to hearing from you." />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <form className="card space-y-3 p-4" aria-label="Find people" data-tour="people-search">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input name="q" defaultValue={sp.q ?? ''} className="input flex-1 text-base" placeholder="Search people, interests, or careers" aria-label="Search people, interests, or careers" />
            <button className="btn-primary px-6">Search</button>
          </div>
          <fieldset>
            <legend className="label">What do you want to connect about?</legend>
            <div className="flex flex-wrap gap-2">
              {PURPOSES.map((p) => (
                <label key={p.id} className="chip cursor-pointer border-navy/20 bg-white text-sm text-navy has-[:checked]:border-navy has-[:checked]:bg-navy has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold">
                  <input type="radio" name="purpose" value={p.id} defaultChecked={purpose === p.id} className="sr-only" />{p.label}
                </label>
              ))}
            </div>
          </fieldset>
          <details open={!!(sp.who || sp.industry || sp.city || sp.mentor)}>
            <summary className="cursor-pointer text-sm font-semibold text-navy">Filters</summary>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="text-xs"><span className="label">Alumni or students</span><select name="who" defaultValue={sp.who ?? ''} className={sel}><option value="">Everyone</option><option value="alumni">Alumni</option><option value="students">Students</option></select></label>
              <label className="text-xs"><span className="label">Industry</span><select name="industry" defaultValue={sp.industry ?? ''} className={sel}><option value="">Any</option>{industries.map((x) => <option key={x}>{x}</option>)}</select></label>
              <label className="text-xs"><span className="label">City (if shared)</span><select name="city" defaultValue={sp.city ?? ''} className={sel}><option value="">Any</option>{cities.map((x) => <option key={x}>{x}</option>)}</select></label>
              <label className="flex items-center gap-1.5 pb-2 text-sm text-navy"><input type="checkbox" name="mentor" value="1" defaultChecked={sp.mentor === '1'} className="accent-[#003057]" />Open to mentorship</label>
              <button className="btn-ghost">Apply</button>
              <Link href="/people" className="pb-2 text-xs font-semibold text-navy underline">Clear</Link>
            </div>
          </details>
          <p className="text-[11px] text-ink/50">Alumni are people who attended Georgia Tech and graduated. Results are fictional demo members.</p>
        </form>

        <p className="text-sm text-ink/60">{results.length ? `${results.length} ${results.length === 1 ? 'person' : 'people'}${sp.q ? ` for “${sp.q}”` : ''}` : ''}</p>
        {results.length === 0 ? (
          <p className="card p-8 text-center text-sm text-ink/60">No members match those filters. Try removing a filter.</p>
        ) : (
          <ul className="space-y-3" data-testid="people-results" data-purpose={purpose}>
            {shown.map((r) => {
              const purposes = PURPOSES.map((x) => ({ id: x.id, label: x.label, ...canRequest(viewerId, r.id, x.id) }));
              return (
                <li key={r.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-start" data-testid="person-result" data-id={r.id} data-available={r.available ? '1' : '0'}>
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold text-white ${r.type === 'alum' ? 'bg-teal' : 'bg-plum'}`} aria-hidden="true">{r.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-bold text-navy">{r.name} <span className="text-sm font-medium text-ink/55">{r.affiliation}{r.city ? ` · ${r.city}` : ''}</span></p>
                    <p className="text-sm text-ink/70">{r.summary}</p>
                    <p className="mt-1.5 text-sm text-navy" data-testid="why-person"><span className="font-semibold">Why this person? </span>{r.reason}</p>
                    <p className="mt-1 text-xs text-ink/55">{r.welcomes.join(' · ')}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-2 sm:w-64 sm:items-end">
                    <Link href={`/people/${encodeURIComponent(r.id)}`} className="text-sm font-semibold text-navy underline decoration-gold underline-offset-4" data-testid="view-profile">View profile</Link>
                    {r.available ? <AskToConnect personId={r.id} firstName={r.name.split(' ')[0]} purposes={purposes} defaultPurpose={purpose} compact
                      suggestedNote={`Hi ${r.name.split(' ')[0]}, I'm ${me.name.split(' ')[0]}${me.type === 'student' ? `, a Georgia Tech student (${me.major})` : `, GT class of ${me.grad_year}`}. ${r.reason} I'd love to connect.`} />
                      : <p className="text-xs text-ink/60">{r.blockedReason}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {results.length > shown.length && <div className="text-center"><Link href={`/people?${qs({ show: String(limit + PAGE) })}`} className="btn-ghost" scroll={false}>Show more</Link></div>}

        <p className="text-sm text-ink/65">Looking for someone who solved a specific technical problem? <Link href="/stuck" className="font-semibold text-navy underline decoration-gold underline-offset-4">Find technical expertise</Link>. Building a startup? <Link href="/match?mode=people" className="font-semibold text-navy underline decoration-gold underline-offset-4">Find a cofounder or engineer</Link>.</p>
      </div>
    </>
  );
}
