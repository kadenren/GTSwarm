'use client';
import { useEffect, useRef, useState } from 'react';

/** Counts up to a value once it scrolls into view (instant under reduced motion). */
export default function CountUp({ value, suffix = '', decimals = 0, duration = 1100 }: { value: number; suffix?: string; decimals?: number; duration?: number }) {
  const [v, setV] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setV(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        setV(value * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      // safety net if animation frames are throttled
      window.setTimeout(() => setV(value), duration + 600);
    });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration]);
  return <span ref={ref} className="tabular-nums">{v.toFixed(decimals)}{suffix}</span>;
}
