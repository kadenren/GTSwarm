import SearchClient from '@/components/SearchClient';
import { viewerContext } from '@/lib/context';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { me, projects } = await viewerContext();
  const suggestions =
    me.type === 'student'
      ? [{ q: 'low-power embedded hardware, has shipped a product', role: 'Cofounder', audience: 'both' }]
      : [
          { q: 'FDA approval for a wearable medical device', role: 'Advisor', audience: 'both' },
          { q: 'wearable firmware', role: 'Early engineer', audience: 'students', label: 'wearable firmware (Early engineer, students)' },
        ];
  return (
    <>
      <div className="border-b border-navy/10 bg-white/50">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-3xl font-bold text-navy">Find expertise</h1>
          <p className="mt-1 text-sm text-ink/70">Search a skill, pick the role you need, and see who in the swarm has actually built it, and how you are connected.</p>
        </div>
      </div>
      <SearchClient kind="expertise" viewerName={me.name} viewerProjects={projects} suggestions={suggestions}
        initial={{ q: sp.q ?? '', role: sp.role ?? 'Cofounder', audience: sp.aud ?? 'both', log: '' }} />
    </>
  );
}
