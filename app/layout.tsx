import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import Wordmark from '@/components/Wordmark';
import ViewerSwitcher from '@/components/ViewerSwitcher';
import NavLinks from '@/components/NavLinks';
import { VIEWERS, getViewerId } from '@/lib/viewer';
import { getDb } from '@/lib/db';
import { currentSearchMode } from '@/lib/search';

export const metadata: Metadata = {
  title: 'GT Swarm: Where Yellow Jackets build together',
  description: 'Find the Georgia Tech student or alum who has built what you need, at every step of building.',
};
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewerId = await getViewerId();
  const pending = (getDb().prepare("SELECT COUNT(*) n FROM requests WHERE to_person = ? AND status = 'sent'").get(viewerId) as { n: number }).n;
  const mode = await currentSearchMode();
  const links = [
    { href: '/search', label: 'Find expertise' },
    { href: '/stuck', label: "I'm stuck" },
    { href: '/projects', label: 'My projects' },
    { href: '/circles', label: 'Circles' },
    { href: '/graph', label: 'Network' },
    { href: '/impact', label: 'Impact' },
    { href: '/inbox', label: 'Inbox', badge: pending },
  ];
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 bg-navy text-white shadow-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="flex flex-col leading-tight" aria-label="GT Swarm home">
              <Wordmark />
              <span className="text-[11px] tracking-wide text-gold-light/90">Where Yellow Jackets build together</span>
            </Link>
            <NavLinks links={links} />
            <div className="ml-auto">
              <ViewerSwitcher viewers={VIEWERS} current={viewerId} />
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-navy/10 bg-white/60">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-ink/60">
            <span>Demo data: people are fictional. The graph and its algorithms are the product; AI is only a helper.</span>
            <span data-testid="search-mode">
              Search mode: {mode === 'semantic' ? 'semantic (local MiniLM embeddings + BM25)' : 'keyword (BM25 fallback)'}
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
