'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type L = { href: string; label: string; badge?: number };

export default function NavLinks({ links, more = [] }: { links: L[]; more?: L[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  const isActive = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  const cls = (active: boolean) => `relative rounded-md px-2.5 py-1.5 text-sm font-medium transition ${active ? 'bg-white/10 text-gold' : 'text-white/80 hover:text-white'}`;
  return (
    <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={cls(isActive(l.href))}>
          {l.label}
          {l.badge ? <span className="ml-1.5 rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold text-navy-900">{l.badge}</span> : null}
        </Link>
      ))}
      {more.length > 0 && (
        <div className="relative" ref={ref}>
          <button className={cls(more.some((m) => isActive(m.href)))} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>
            More <span aria-hidden="true">▾</span>
          </button>
          {open && (
            <div role="menu" className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-lg border border-white/10 bg-navy-900 py-1 shadow-xl">
              {more.map((m) => (
                <Link key={m.href} role="menuitem" href={m.href} className={`block px-3 py-2 text-sm ${isActive(m.href) ? 'text-gold' : 'text-white/85 hover:bg-white/5 hover:text-white'}`}>{m.label}</Link>
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
