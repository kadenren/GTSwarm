import Link from 'next/link';
import PageHero from '@/components/PageHero';
import ProfileClaim from '@/components/ProfileClaim';
import { geminiEnabled } from '@/lib/gemini';
import { listBuilds } from '@/lib/builds';
import { ready } from '@/lib/session';

export const dynamic = 'force-dynamic';

const INVITERS: Record<string, string> = {
  alumni: 'the Georgia Tech Alumni Association',
  create: 'CREATE-X',
  vip: 'the VIP Program',
  sga: 'the Student Government Association',
};

/** Joining is the same for everyone: alumni arrive from an Alumni Association invite link (/join?invite=alumni), students from campus programs. */
export default async function JoinPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await ready();
  const sp = await searchParams;
  const inviter = sp.invite ? INVITERS[sp.invite] : undefined;
  const open = listBuilds().filter((b) => b.open);
  const roleCounts = new Map<string, number>();
  for (const b of open) for (const r of b.rolesNeeded) roleCounts.set(r, (roleCounts.get(r) ?? 0) + 1);
  const roles = [...roleCounts].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const alumniLed = open.filter((b) => b.owner?.type === 'alum').length;
  return (
    <>
      <PageHero eyebrow={inviter ? `Invited by ${inviter}` : 'Join GT Swarm'} title="Put what you know where Georgia Tech builders can find it"
        subtitle="You don't need a startup to join. Upload your resume, add your GitHub, LinkedIn, Google Scholar or website, and choose how you want to help. GT Swarm recommends builds that need your expertise and introduces you to the teams. Two minutes, and you are matched." />
      {inviter && (
        <div className="mx-auto max-w-7xl px-4 pt-6">
          <div className="rounded-xl border border-gold/50 bg-gold/15 px-5 py-3 text-sm text-navy" role="status" data-testid="invite-banner">
            <strong>Welcome, Yellow Jacket.</strong> {inviter[0].toUpperCase() + inviter.slice(1)} invited you to share your expertise with students and alumni who are building right now.
          </div>
        </div>
      )}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1.4fr_1fr]">
        <ProfileClaim aiEnabled={geminiEnabled()} mode="join" current={{ openTo: [], hours: 2, links: {} }} />
        <aside className="space-y-4">
          <div className="card p-5" data-testid="join-open-builds">
            <h3 className="font-display font-bold text-navy">{open.length} builds are looking for help</h3>
            <p className="mt-1 text-sm text-ink/70">{alumniLed} alumni-founded and {open.length - alumniLed} student-led. After you join, the ones that fit you are recommended first, and their teams see you as a match.</p>
            <ul className="mt-3 space-y-1 text-sm">
              {roles.map(([r, n]) => <li key={r} className="flex justify-between"><span className="text-navy">{r}</span><span className="text-xs text-ink/50">{n} {n === 1 ? 'build' : 'builds'}</span></li>)}
            </ul>
            <Link href="/builds" className="mt-3 inline-block text-xs font-semibold text-navy underline decoration-gold underline-offset-4">Browse every build</Link>
          </div>
          {[
            { t: 'You stay in control', d: 'Nothing is saved until you confirm. You choose what you are open to and how many hours you can give, and you can change it anytime.' },
            { t: 'Only what you share', d: 'GT Swarm reads only what you upload and the public pages you link. It never scrapes LinkedIn or Google Scholar; those links are shown on your profile for people to visit.' },
            { t: 'Requests need your yes', d: 'People reach you through requests. Accepting one creates a connection; joining a project is a separate step.' },
          ].map((x) => (
            <div key={x.t} className="card p-5">
              <h3 className="font-display font-bold text-navy">{x.t}</h3>
              <p className="mt-1 text-sm text-ink/70">{x.d}</p>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
