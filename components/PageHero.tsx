/** Navy hero band used at the top of every page, with a faint node pattern so each page feels like part of the swarm. */
export default function PageHero({
  eyebrow, title, subtitle, children, size = 'md',
}: { eyebrow?: string; title: React.ReactNode; subtitle?: React.ReactNode; children?: React.ReactNode; size?: 'md' | 'lg' }) {
  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <HeroPattern />
      <div className={`relative mx-auto max-w-7xl px-4 ${size === 'lg' ? 'pb-16 pt-14' : 'pb-10 pt-9'}`}>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">{eyebrow}</p>}
        <h1 className={`mt-2 font-bold tracking-tight ${size === 'lg' ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'}`}>{title}</h1>
        {subtitle && <p className="mt-2 max-w-3xl text-base leading-relaxed text-white/70">{subtitle}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}

export function HeroPattern({ opacity = 0.14 }: { opacity?: number }) {
  let seed = 11;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pts = Array.from({ length: 34 }, () => ({ x: Math.round(r() * 1400), y: Math.round(r() * 320) }));
  const lines: [number, number][] = [];
  pts.forEach((a, i) => pts.forEach((b, j) => { if (j > i && Math.hypot(a.x - b.x, a.y - b.y) < 190) lines.push([i, j]); }));
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1400 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ opacity }}>
      <defs>
        <radialGradient id="heroGlow" cx="85%" cy="10%" r="60%">
          <stop offset="0%" stopColor="#B3A369" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#B3A369" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1400" height="320" fill="url(#heroGlow)" opacity="0.5" />
      {lines.map(([i, j]) => <line key={`${i}-${j}`} x1={pts[i].x} y1={pts[i].y} x2={pts[j].x} y2={pts[j].y} stroke="#fff" strokeWidth="0.8" />)}
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i % 5 === 0 ? 4 : 2.4} fill={i % 3 === 0 ? '#B3A369' : '#fff'} />)}
    </svg>
  );
}
