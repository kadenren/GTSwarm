import Link from 'next/link';
import PageHero from '@/components/PageHero';
import OpportunityBoard from '@/components/OpportunityBoard';
import PostOpportunity from '@/components/PostOpportunity';
import { getViewerId } from '@/lib/viewer';
import { membershipOf, can, isVerifiedAlum } from '@/lib/access';
import { listOpportunities, recommendOpportunities } from '@/lib/community';

export const dynamic = 'force-dynamic';

const TABS = [['jobs', 'Jobs'], ['internships', 'Internships'], ['mentorship', 'Mentorship'], ['resources', 'Other resources']] as const;
type Tab = (typeof TABS)[number][0];

/** Official Georgia Tech resources we link to. GT Swarm does not replace them or run applications. */
const RESOURCES = [
  { name: 'Georgia Tech Career Center', href: 'https://career.gatech.edu', what: 'Career advising, career fairs, and CareerBuzz, the official job and internship board for Georgia Tech students.' },
  { name: 'CREATE-X', href: 'https://create-x.gatech.edu', what: 'Georgia Tech’s program for students who want to start a company: courses, Idea to Prototype, and Startup Launch.' },
  { name: 'Georgia Tech Alumni Association', href: 'https://www.gtalumni.org', what: 'Alumni events, local networks, and career resources for graduates.' },
];

/** Opportunities: jobs, internships, mentorship, and official resources. Postings are filtered on the server by eligibility. */
export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const viewerId = await getViewerId();
  const m = membershipOf(viewerId);
  const alum = isVerifiedAlum(m.status);
  const requested = (await searchParams).tab;
  const tab: Tab = TABS.some(([t]) => t === requested) ? (requested as Tab) : alum ? 'jobs' : 'internships';
  const all = listOpportunities(viewerId);
  const items = all
    .filter((o) => (tab === 'internships' ? o.kind === 'internship' : o.kind !== 'internship'))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible)); // things you can apply to first
  const why = Object.fromEntries(recommendOpportunities(viewerId, 50).map((r) => [r.opportunity.id, r.why]));

  return (
    <>
      <PageHero eyebrow="Opportunities" title="Jobs, internships, and help from Yellow Jackets"
        subtitle="Postings from fellow Yellow Jackets, plus links to official Georgia Tech career resources. Every posting in this demo is fictional and labeled." />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <nav aria-label="Opportunity types" className="flex flex-wrap gap-1 rounded-lg bg-white p-1 shadow-sm ring-1 ring-navy/10" data-tour="opportunity-tabs">
          {TABS.map(([t, label]) => (
            <Link key={t} href={`/opportunities?tab=${t}`} aria-current={tab === t ? 'page' : undefined} data-testid={`tab-${t}`}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tab === t ? 'bg-navy text-white' : 'text-navy/70 hover:bg-paper'}`}>{label}</Link>
          ))}
        </nav>

        {(tab === 'jobs' || tab === 'internships') && (
          <>
            <p className="text-sm text-ink/70">
              {tab === 'internships' ? 'Internships posted by alumni and startup teams. ' : 'Full-time, part-time, and startup roles posted by alumni. '}
              Some postings are limited to certain members; you will see why. To apply, follow the steps on each posting. For official listings, use <a href="https://career.gatech.edu" target="_blank" rel="noreferrer" className="font-semibold text-navy underline decoration-gold underline-offset-4">CareerBuzz through the Career Center</a>.
            </p>
            {can(viewerId, 'opportunity.post') ? <PostOpportunity /> : null}
            <OpportunityBoard items={items} why={why} />
          </>
        )}

        {tab === 'mentorship' && (
          <section className="card max-w-2xl p-6" aria-label="Mentorship">
            <h2 className="text-xl font-bold text-navy">Find a mentor</h2>
            <p className="mt-2 text-sm text-ink/75">Many alumni offer career advice to students and newer graduates. Mentors choose who they help and how many people they take on, so you only see people who are open to it.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/people?purpose=mentorship" className="btn-primary px-4 py-2 text-sm" data-testid="find-mentor">Find people open to mentoring</Link>
              <Link href="/mentorship" className="btn-ghost px-4 py-2 text-sm">Your mentorships</Link>
            </div>
          </section>
        )}

        {tab === 'resources' && (
          <section aria-label="Other resources">
            <p className="text-sm text-ink/70">These are official Georgia Tech resources. They open on their own websites. GT Swarm is an independent student project and is not connected to them.</p>
            <ul className="mt-3 grid gap-4 md:grid-cols-3">
              {RESOURCES.map((r) => (
                <li key={r.href} className="card flex flex-col p-5" data-testid="resource">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">Official resource · external site</p>
                  <h3 className="mt-1 font-display text-lg font-bold text-navy">{r.name}</h3>
                  <p className="mt-1 text-sm text-ink/70">{r.what}</p>
                  <a href={r.href} target="_blank" rel="noreferrer" className="mt-auto pt-4 text-sm font-semibold text-navy underline decoration-gold underline-offset-4">Visit {new URL(r.href).hostname.replace('www.', '')} ↗</a>
                </li>
              ))}
            </ul>
          </section>
        )}
        {!alum && (tab === 'jobs' || tab === 'internships') && <p className="text-xs text-ink/55">Verified alumni can post openings. A moderator reviews each one.</p>}
      </div>
    </>
  );
}
