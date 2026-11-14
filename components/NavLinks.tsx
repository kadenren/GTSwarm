'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavLinks({ links }: { links: { href: string; label: string; badge?: number }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
      {links.map((l) => {
        const active = l.href === '/' ? path === '/' : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition ${active ? 'bg-white/10 text-gold' : 'text-white/80 hover:text-white'}`}
          >
            {l.label}
            {l.badge ? (
              <span className="ml-1.5 rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold text-navy-900">{l.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
