import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import Wordmark from '@/components/Wordmark';
import ViewerSwitcher from '@/components/ViewerSwitcher';
import NavLinks from '@/components/NavLinks';
import DemoGuide from '@/components/DemoGuide';
import { getViewerId, viewerOptions } from '@/lib/viewer';
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
    { href: '/add', label: 'Add' },
    { href: '/inbox', label: 'Inbox', badge: pending },
    { href: '/profile', label: 'Profile' },
  ];
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-900/95 text-white backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
            <Link href="/" className="flex flex-col leading-tight" aria-label="GT Swarm home">
              <Wordmark />
              <span className="text-[11px] tracking-wide text-gold-light/90">Where Yellow Jackets build together</span>
            </Link>
            <NavLinks links={links} />
            <div className="ml-auto">
              <ViewerSwitcher viewers={viewerOptions(viewerId)} current={viewerId} />
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-navy/10 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-ink/60">
            <span className="flex items-center gap-2">
              <span className="font-display font-bold text-navy">GT Swarm</span>
              <span className="text-ink/30">·</span>
              <span>Demo data: people are fictional. The graph and its algorithms are the product; AI is only a helper.</span>
            </span>
            <span data-testid="search-mode" className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${mode === 'semantic' ? 'bg-teal' : 'bg-gold'}`} aria-hidden="true" />
              Search mode: {mode === 'semantic' ? 'semantic (local MiniLM embeddings + BM25)' : 'keyword (BM25 fallback)'} · runs fully offline
            </span>
          </div>
        </footer>
        <DemoGuide current={viewerId} />
      </body>
    </html>
  );
}
