import PageHero from '@/components/PageHero';
import OpportunityBoard from '@/components/OpportunityBoard';
import PostOpportunity from '@/components/PostOpportunity';
import { getViewerId } from '@/lib/viewer';
import { membershipOf, can, isVerifiedAlum } from '@/lib/access';
import { listOpportunities, recommendOpportunities } from '@/lib/community';

export const dynamic = 'force-dynamic';

/** Opportunities: internships for students, jobs for alumni, startup roles for both. Filtered on the server by eligibility. */
export default async function OpportunitiesPage() {
  const viewerId = await getViewerId();
  const m = membershipOf(viewerId);
  const items = listOpportunities(viewerId);
  const recs = recommendOpportunities(viewerId, 3);
  const why = Object.fromEntries(recommendOpportunities(viewerId, 50).map((r) => [r.opportunity.id, r.why]));
  return (
    <>
      <PageHero eyebrow="Opportunities" title={isVerifiedAlum(m.status) ? 'Roles, startup jobs and part-time work from the GT network.' : 'Internships and roles matched to what you have built.'}
        subtitle="Postings come from verified alumni and startup teams, are reviewed by a moderator, and expire on their own. Every posting in this demo is synthetic and labeled." />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
        {recs.length > 0 && (
          <section aria-label="Recommended opportunities" data-tour="opportunity-recs">
            <h2 className="text-xl font-bold text-navy">Recommended for you</h2>
            <ul className="mt-3 grid gap-3 md:grid-cols-3">
              {recs.map((r) => (
                <li key={r.opportunity.id} className="card p-4" data-testid="opportunity-rec">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-dark">{r.opportunity.kind === 'internship' ? 'Internship' : r.opportunity.kind}</p>
                  <p className="font-display font-bold text-navy">{r.opportunity.title}</p>
                  <p className="text-xs text-ink/60">{r.opportunity.org}</p>
                  <p className="mt-2 text-sm text-ink/85">{r.why}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
        {can(viewerId, 'opportunity.post') ? <PostOpportunity /> : <p className="text-sm text-ink/60">Verified alumni can propose postings; a moderator reviews each one.</p>}
        <OpportunityBoard items={items} why={why} />
      </div>
    </>
  );
}
