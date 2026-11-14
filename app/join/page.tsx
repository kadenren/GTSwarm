import PageHero from '@/components/PageHero';
import ProfileClaim from '@/components/ProfileClaim';
import { geminiEnabled } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export default function JoinPage() {
  return (
    <>
      <PageHero eyebrow="Join GT Swarm" title="Put what you built where the next Yellow Jacket can find it"
        subtitle="Alumni and students create their own profiles. Upload your resume, add your GitHub, LinkedIn, Google Scholar or website, review the draft, and choose how you want to help. Two minutes, and you are searchable." />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1.4fr_1fr]">
        <ProfileClaim aiEnabled={geminiEnabled()} mode="join" current={{ openTo: [], hours: 2, links: {} }} />
        <aside className="space-y-4">
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
