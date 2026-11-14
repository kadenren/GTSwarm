'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type L = { href: string; label: string; badge?: number };

/** Main navigation: a row of links on wider screens, a menu button on phones so the header stays one line. */
export default function NavLinks({ links }: { links: L[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  const isActive = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  const badge = (n?: number) => (n ? <span className="ml-1.5 rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold text-navy-900">{n}</span> : null);
  const pending = links.reduce((n, l) => n + (l.badge ?? 0), 0);

  return (
    <>
      <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={`relative rounded-md px-2.5 py-1.5 text-sm font-medium transition ${isActive(l.href) ? 'bg-white/10 text-gold' : 'text-white/80 hover:text-white'}`}>
            {l.label}{badge(l.badge)}
          </Link>
        ))}
      </nav>
      <div className="order-last md:hidden" ref={ref}>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-label="Menu"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-white" data-testid="nav-menu">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            {open ? <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              : <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
          </svg>
          {pending > 0 && !open && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-gold" aria-hidden="true" />}
        </button>
        {open && (
          <nav aria-label="Main" className="absolute inset-x-0 top-full border-b border-white/10 bg-navy-900 px-4 py-2 shadow-xl">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={`flex items-center rounded-md px-2 py-2.5 text-base font-medium ${isActive(l.href) ? 'text-gold' : 'text-white/85'}`}>
                {l.label}{badge(l.badge)}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}
