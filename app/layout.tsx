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

export const metadata: Metadata = {
  title: 'GT Swarm: Where Yellow Jackets build together',
  description: 'Find the Georgia Tech student or alum who has built what you need, at every step of building.',
};
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewerId = await getViewerId();
  const pending = (getDb().prepare("SELECT COUNT(*) n FROM requests WHERE to_person = ? AND status = 'sent'").get(viewerId) as { n: number }).n;
  // Five main sections. Posting a startup, joining and Impact for GT are linked from the footer.
  const links = [
    { href: '/', label: 'Discover' },
    { href: '/match', label: 'Find Matches' },
    { href: '/stuck', label: 'Get Unstuck' },
    { href: '/profile', label: 'My Profile' },
    { href: '/inbox', label: 'Inbox', badge: pending },
  ];
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-900/95 text-white backdrop-blur">
          <div className="relative mx-auto flex max-w-[1400px] items-center gap-x-3 px-4 py-2.5 md:gap-x-4">
            <Link href="/" className="flex flex-col leading-tight" aria-label="GT Swarm home">
              <Wordmark />
              <span className="hidden text-[11px] tracking-wide text-gold-light/90 sm:block">Where Yellow Jackets build together</span>
            </Link>
            <NavLinks links={links} />
            <div className="ml-auto flex items-center gap-2 md:gap-3">
              <DemoButton />
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
              <span>Independent student project for the GT Campus Solutions Challenge. Not affiliated with or endorsed by Georgia Tech. All demo data is fictional.</span>
            </span>
            <nav aria-label="More" className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {[["/add", "Post a startup"], ["/join", "Join GT Swarm"], ["/impact", "Impact for GT"]].map(([h, l]) => (
                <Link key={h} href={h} className="hover:text-navy hover:underline">{l}</Link>
              ))}
            </nav>
          </div>
        </footer>
        <DemoTour current={viewerId} />
      </body>
    </html>
  );
}
