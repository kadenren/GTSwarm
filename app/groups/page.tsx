import Link from 'next/link';
import PageHero from '@/components/PageHero';
import GroupAction from '@/components/GroupAction';
import { getViewerId } from '@/lib/viewer';
import { listGroups, recommendGroups } from '@/lib/community';
import { ELIGIBILITY_LABEL } from '@/lib/access';

export const dynamic = 'force-dynamic';

/** Groups: student, alumni, professional, entrepreneurship and shared-interest communities, each with an explicit access policy. */
export default async function GroupsPage() {
  const viewerId = await getViewerId();
  const groups = listGroups(viewerId);
  const recs = new Map(recommendGroups(viewerId, 7).map((r) => [r.group.id, r.why]));
  const mine = groups.filter((g) => g.standing === 'member' || g.standing === 'admin');
  return (
    <>
      <PageHero eyebrow="Groups" title="Find your communities across class years."
        subtitle="Each group has an explicit policy: who may join (students, verified alumni, or both) and how (open, or request to join). Some professional groups are restricted to verified alumni; that is a per-group choice, not a default." />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
        {mine.length > 0 && <p className="text-sm text-ink/70">You are in {mine.map((g) => g.name).join(', ')}.</p>}
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="group-list" data-tour="groups">
          {groups.map((g) => (
            <li key={g.id} className="card flex flex-col p-5" data-testid="group-card" data-id={g.id} data-standing={g.standing}>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-md bg-navy px-2 py-0.5 font-semibold text-white">{g.category}</span>
                <span className="rounded-md bg-paper px-2 py-0.5 font-semibold text-ink/60">{ELIGIBILITY_LABEL[g.eligibility]}</span>
                <span className="rounded-md bg-paper px-2 py-0.5 font-semibold text-ink/60">{g.access === 'open' ? 'Open' : 'Request to join'}</span>
              </div>
              <Link href={`/groups/${encodeURIComponent(g.id)}`} className="mt-2 font-display text-lg font-bold text-navy hover:underline">{g.name}</Link>
              <p className="mt-1 text-sm text-ink/70">{g.description}</p>
              {recs.get(g.id) && <p className="mt-2 rounded-md bg-teal-light/50 px-2.5 py-1.5 text-xs text-ink/85">{recs.get(g.id)}</p>}
              <p className="mt-2 text-xs text-ink/55">{g.memberCount} members{g.adminName ? ` · admin ${g.adminName}` : ''}</p>
              <div className="mt-auto pt-3"><GroupAction g={g} /></div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink/50">All groups are fictional demo communities, not official Georgia Tech organizations.</p>
      </div>
    </>
  );
}
