import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import Wordmark from '@/components/Wordmark';
import ViewerSwitcher from '@/components/ViewerSwitcher';
import NavLinks from '@/components/NavLinks';
import DemoTour from '@/components/DemoTour';
import DemoButton from '@/components/DemoButton';
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
  // Four main sections. Get Unstuck, My Swarm, the whole network and Impact still work; they are linked from the footer.
  const links = [
    { href: '/', label: 'Discover' },
    { href: '/match', label: 'Find Matches' },
    { href: '/profile', label: 'My Profile' },
    { href: '/inbox', label: 'Inbox', badge: pending },
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
            <div className="ml-auto flex items-center gap-3">
              <DemoButton />
              <ViewerSwitcher viewers={viewerOptions(viewerId)} current={viewerId} />
            </div>
          </div>
          <div className="border-t border-white/10 bg-gold/15 py-1 text-center text-[11px] font-medium tracking-wide text-gold-light" data-testid="demo-banner">Demo for the GT SGA Campus Solutions Hackathon · all people, startups and requests shown are fictional</div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-navy/10 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-ink/60">
            <span className="flex items-center gap-2">
              <span className="font-display font-bold text-navy">GT Swarm</span>
              <span className="text-ink/30">·</span>
              <span>Hackathon demo: every person, startup and outcome is fictional.</span>
            </span>
            <nav aria-label="More" className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {[["/add", "Post a startup"], ["/join", "Join GT Swarm"], ["/stuck", "Get Unstuck"], ["/swarm", "My Swarm"], ["/graph", "Whole network"], ["/impact", "Impact"]].map(([h, l]) => (
                <Link key={h} href={h} className="hover:text-navy hover:underline">{l}</Link>
              ))}
            </nav>
            <span data-testid="search-mode" className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${mode === 'keyword' ? 'bg-gold' : 'bg-teal'}`} aria-hidden="true" />
              {mode === 'gemini' ? 'Matching: Gemini embeddings + Gemini matchmaker, cached' : `Search mode: ${mode === 'semantic' ? 'semantic (local MiniLM embeddings + BM25)' : 'keyword (BM25 fallback)'} · runs fully offline`}
            </span>
          </div>
        </footer>
        <DemoTour current={viewerId} />
      </body>
    </html>
  );
}
