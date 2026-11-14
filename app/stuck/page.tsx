import SearchClient from '@/components/SearchClient';
import { viewerContext } from '@/lib/context';

export const dynamic = 'force-dynamic';

export default async function StuckPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { me, projects } = await viewerContext();
  return (
    <>
      <div className="border-b border-navy/10 bg-white/50">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-3xl font-bold text-navy">I&apos;m stuck on a problem</h1>
          <p className="mt-1 text-sm text-ink/70">Describe what is going wrong. GT Swarm searches problems that students and alumni have already solved, and shows who solved them.</p>
        </div>
      </div>
      <SearchClient kind="stuck" aiPolish={!!process.env.ANTHROPIC_API_KEY} viewerName={me.name} viewerProjects={projects}
        suggestions={[{ q: 'Bluetooth drops when the sensor sleeps' }]}
        initial={{ q: sp.q ?? '', role: 'Helper', audience: sp.aud ?? 'both', log: '' }} />
    </>
  );
}
