'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import 'd3-transition'; // registers selection.transition() (side effect can be dropped by the bundler otherwise)

export interface WebNode { id: string; name: string; label: string; type: 'student' | 'alum'; score: number; rank: number; ring: 1 | 2 | 3; short: string }
export interface WebEdge { source: string; target: string; kind: string; label: string }

const COLORS = { alum: '#1B8A8F', student: '#6B4FA3', gold: '#B3A369', navy: '#003057' };
const BANDS: Record<1 | 2 | 3, [number, number]> = { 1: [0.3, 0.4], 2: [0.54, 0.68], 3: [0.8, 0.97] };

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

interface Placed extends WebNode { x: number; y: number; r: number; angle: number }

export function layoutWeb(nodes: WebNode[], W: number, H: number) {
  const cx = W / 2, cy = H / 2;
  const R = Math.max(120, Math.min(W / 2 - 110, H / 2 - 40));
  // stretch horizontally into wide canvases so labels and the center pill never collide
  const kx = Math.max(1, Math.min(1.7, (W / 2 - 110) / R));
  const placed: Placed[] = [];
  for (const ring of [1, 2, 3] as const) {
    const ns = nodes.filter((n) => n.ring === ring).sort((a, b) => a.rank - b.rank);
    if (!ns.length) continue;
    const hi = Math.max(...ns.map((n) => n.score)), lo = Math.min(...ns.map((n) => n.score));
    const [inner, outer] = BANDS[ring];
    const step = (Math.PI * 2) / ns.length;
    const offset = -Math.PI / 2 + (ring === 2 ? step / 2 : ring === 3 ? step / 3 + 0.2 : 0);
    ns.forEach((n, i) => {
      const t = hi > lo ? (n.score - lo) / (hi - lo) : 1; // higher score sits closer to the center
      const radius = R * (outer - t * (outer - inner));
      const angle = offset + i * step + (hash(n.id) - 0.5) * step * 0.22;
      placed.push({ ...n, angle, x: cx + radius * kx * Math.cos(angle), y: cy + radius * Math.sin(angle), r: 9 + n.score * 15 });
    });
  }
  return { placed, cx, cy, R, kx };
}

export default function RelevanceWeb({
  nodes, edges, query, roleLabel, selectedId, onSelect, centerKind = 'search',
}: {
  nodes: WebNode[]; edges: WebEdge[]; query: string; roleLabel: string; selectedId: string | null; onSelect: (id: string) => void; centerKind?: 'search' | 'person';
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ W: 900, H: 600 });
  const [hover, setHover] = useState<Placed | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const reduced = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const W = Math.round(e.contentRect.width);
      setSize((s) => (Math.abs(s.W - W) > 4 ? { W, H: Math.round(Math.min(700, Math.max(480, W * 0.56))) } : s));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { placed, cx, cy, R, kx } = useMemo(() => layoutWeb(nodes, size.W, size.H), [nodes, size]);

  useEffect(() => {
    const svg = d3.select(svgRef.current!);
    svg.selectAll('*').remove();
    const dur = reduced ? 0 : 600;
    const ease = d3.easeCubicOut;
    const byId = new Map(placed.map((p) => [p.id, p]));
    const best = placed.find((p) => p.rank === 1);

    const defs = svg.append('defs');
    const glow = defs.append('radialGradient').attr('id', 'centerGlow');
    glow.append('stop').attr('offset', '0%').attr('stop-color', COLORS.gold).attr('stop-opacity', 0.28);
    glow.append('stop').attr('offset', '100%').attr('stop-color', COLORS.gold).attr('stop-opacity', 0);

    // ring guides
    const guides = svg.append('g').attr('class', 'guides');
    guides.append('ellipse').attr('cx', cx).attr('cy', cy).attr('rx', R * 0.36 * kx).attr('ry', R * 0.36).attr('fill', 'url(#centerGlow)');
    for (const ring of [1, 2, 3] as const) {
      const [a, b] = BANDS[ring];
      guides.append('ellipse').attr('cx', cx).attr('cy', cy).attr('rx', R * ((a + b) / 2) * kx).attr('ry', R * ((a + b) / 2)).attr('fill', 'none').attr('stroke', COLORS.navy).attr('stroke-opacity', 0.08).attr('stroke-dasharray', '2 6');
    }

    // spokes from the center
    const spokes = svg.append('g').attr('class', 'spokes');
    spokes.selectAll('line').data(placed.filter((p) => p.rank !== 1), (d) => (d as Placed).id).join('line')
      .attr('data-id', (d) => d.id)
      .attr('x1', cx).attr('y1', cy).attr('x2', cx).attr('y2', cy)
      .attr('stroke', COLORS.navy)
      .attr('stroke-width', (d) => 0.8 + d.score * 4.5)
      .attr('stroke-opacity', (d) => 0.12 + d.score * 0.45)
      .attr('stroke-linecap', 'round')
      .transition().duration(dur).delay((d) => (reduced ? 0 : d.rank * 25)).ease(ease)
      .attr('x2', (d) => d.x).attr('y2', (d) => d.y);

    // person-to-person dashed connections
    const peer = svg.append('g').attr('class', 'peers');
    peer.selectAll('line').data(edges.filter((e) => byId.has(e.source) && byId.has(e.target))).join('line')
      .attr('data-a', (d) => d.source).attr('data-b', (d) => d.target)
      .attr('x1', (d) => byId.get(d.source)!.x).attr('y1', (d) => byId.get(d.source)!.y)
      .attr('x2', (d) => byId.get(d.target)!.x).attr('y2', (d) => byId.get(d.target)!.y)
      .attr('stroke', '#5B6B7C').attr('stroke-width', 1.4).attr('stroke-dasharray', '5 5').attr('stroke-opacity', 0)
      .call((sel) => sel.append('title').text((d) => `${byId.get(d.source)!.name} and ${byId.get(d.target)!.name}: ${d.label}`))
      .transition().delay(dur).duration(reduced ? 0 : 350).attr('stroke-opacity', 0.55);

    // gold best-match line draws last
    if (best) {
      const len = Math.hypot(best.x - cx, best.y - cy);
      svg.append('line').attr('class', 'best').attr('data-id', best.id)
        .attr('x1', cx).attr('y1', cy).attr('x2', best.x).attr('y2', best.y)
        .attr('stroke', COLORS.gold).attr('stroke-width', 7).attr('stroke-linecap', 'round')
        .attr('stroke-dasharray', `${len} ${len}`).attr('stroke-dashoffset', len)
        .transition().delay(dur).duration(reduced ? 0 : 450).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0);
    }

    // center pill
    const center = svg.append('g').attr('class', 'center').attr('transform', `translate(${cx},${cy})`);
    const q = query.length > 34 ? query.slice(0, 32) + '…' : query;
    const pillW = Math.max(150, Math.min(270, q.length * 7.2 + 36));
    center.append('rect').attr('x', -pillW / 2).attr('y', -24).attr('width', pillW).attr('height', 48).attr('rx', 24)
      .attr('fill', centerKind === 'person' ? COLORS.navy : COLORS.gold).attr('stroke', '#fff').attr('stroke-width', 3)
      .style('filter', 'drop-shadow(0 4px 10px rgba(0,48,87,0.25))');
    center.append('text').attr('text-anchor', 'middle').attr('y', -3).attr('font-family', 'Space Grotesk, sans-serif').attr('font-weight', 700).attr('font-size', 13.5)
      .attr('fill', centerKind === 'person' ? '#fff' : COLORS.navy).text(q).append('title').text(query);
    center.append('text').attr('text-anchor', 'middle').attr('y', 14).attr('font-size', 11).attr('font-weight', 600)
      .attr('fill', centerKind === 'person' ? '#D6CC9E' : '#022747').attr('opacity', 0.8).text(roleLabel);

    // nodes
    const nodeG = svg.append('g').attr('class', 'nodes').selectAll<SVGGElement, Placed>('g').data(placed, (d) => d.id).join('g')
      .attr('class', 'node').attr('data-id', (d) => d.id)
      .attr('tabindex', 0).attr('role', 'button')
      .attr('aria-label', (d) => `${d.name}, rank ${d.rank}. ${d.short}`)
      .style('cursor', 'pointer')
      .attr('transform', `translate(${cx},${cy})`)
      .style('opacity', 0);
    nodeG.transition().duration(dur).delay((d) => (reduced ? 0 : d.rank * 25)).ease(ease)
      .attr('transform', (d) => `translate(${d.x},${d.y})`).style('opacity', 1);
    nodeG.append('circle').attr('class', 'halo').attr('r', (d) => d.r + 6).attr('fill', 'none').attr('stroke', COLORS.gold).attr('stroke-width', 3).attr('opacity', 0);
    nodeG.append('circle').attr('class', 'dot').attr('r', (d) => d.r)
      .attr('fill', (d) => COLORS[d.type]).attr('stroke', (d) => (d.rank === 1 ? COLORS.gold : '#fff')).attr('stroke-width', (d) => (d.rank === 1 ? 4 : 2.5));
    nodeG.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em').attr('font-size', (d) => Math.max(9, d.r * 0.75)).attr('font-weight', 700).attr('fill', '#fff')
      .attr('pointer-events', 'none').text((d) => d.name.split(' ').map((w) => w[0]).join('').slice(0, 2));
    nodeG.append('text').attr('class', 'lbl')
      .attr('x', (d) => { const c = Math.cos(d.angle); return Math.abs(c) < 0.35 ? 0 : (d.r + 7) * Math.sign(c); })
      .attr('y', (d) => { const c = Math.cos(d.angle), sn = Math.sin(d.angle); return Math.abs(c) < 0.35 ? (d.r + 15) * Math.sign(sn || 1) - (sn < 0 ? 0 : -2) : 4; })
      .attr('text-anchor', (d) => { const c = Math.cos(d.angle); return Math.abs(c) < 0.35 ? 'middle' : c > 0 ? 'start' : 'end'; })
      .attr('font-size', 12.5).attr('font-weight', (d) => (d.ring === 1 ? 700 : 500)).attr('fill', COLORS.navy)
      .attr('paint-order', 'stroke').attr('stroke', '#F7F6F2').attr('stroke-width', 4).attr('stroke-linejoin', 'round')
      .attr('pointer-events', 'none').text((d) => d.label);

    const neighbors = (id: string) => new Set([id, ...edges.filter((e) => e.source === id || e.target === id).flatMap((e) => [e.source, e.target])]);
    const highlight = (id: string | null) => {
      const keep = id ? neighbors(id) : null;
      svg.selectAll<SVGGElement, Placed>('g.node').transition().duration(150).style('opacity', (d) => (!keep || keep.has(d.id) ? 1 : 0.18));
      svg.selectAll<SVGLineElement, Placed>('g.spokes line').transition().duration(150).attr('stroke-opacity', (d) => (!keep ? 0.12 + d.score * 0.45 : d.id === id ? 0.85 : 0.05));
      svg.select('line.best').transition().duration(150).attr('opacity', !keep || best?.id === id ? 1 : 0.25);
      svg.selectAll<SVGLineElement, WebEdge>('g.peers line').transition().duration(150)
        .attr('stroke-opacity', (d) => (!id ? 0.55 : d.source === id || d.target === id ? 0.95 : 0.06))
        .attr('stroke', (d) => (id && (d.source === id || d.target === id) ? COLORS.navy : '#5B6B7C'));
    };
    nodeG
      .on('mouseenter', (_e, d) => { highlight(d.id); setHover(d); })
      .on('mouseleave', () => { highlight(null); setHover(null); })
      .on('focus', (_e, d) => { highlight(d.id); setHover(d); })
      .on('blur', () => { highlight(null); setHover(null); })
      .on('click', (_e, d) => onSelectRef.current(d.id))
      .on('keydown', (e: KeyboardEvent, d) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectRef.current(d.id); } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, edges, query, roleLabel, reduced, centerKind, cx, cy, R, kx]);

  useEffect(() => {
    d3.select(svgRef.current!).selectAll<SVGGElement, Placed>('g.node').select('circle.halo').attr('opacity', (d) => (d.id === selectedId ? 1 : 0));
  }, [selectedId, placed]);

  return (
    <div ref={wrapRef} className="relative w-full select-none" data-testid="relevance-web">
      <svg ref={svgRef} width={size.W} height={size.H} viewBox={`0 0 ${size.W} ${size.H}`} role="img" aria-label={`Relevance web for ${query}`} />
      {hover && (
        <div
          className="pointer-events-none absolute z-10 w-72 -translate-x-1/2 rounded-lg border border-navy/10 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur"
          style={{ left: Math.min(Math.max(hover.x, 150), size.W - 150), top: hover.y + hover.r + (hover.y > size.H - 120 ? -hover.r * 2 - 86 : 10) }}
          role="tooltip"
        >
          <div className="font-display text-sm font-bold text-navy">
            {hover.name} <span className="font-sans text-[11px] font-medium text-ink/50">rank {hover.rank}</span>
          </div>
          <div className="mt-0.5 leading-snug text-ink/80">{hover.short}</div>
        </div>
      )}
    </div>
  );
}

export function WebLegend({ center = 'search' }: { center?: 'search' | 'person' }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink/70" aria-label="Legend">
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-teal" />Alumni</span>
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-plum" />Students</span>
      <span className="flex items-center gap-1.5"><span className="h-1.5 w-6 rounded bg-gold" />Best match path</span>
      <span className="flex items-center gap-1.5">
        <svg width="26" height="6" aria-hidden="true"><line x1="0" y1="3" x2="26" y2="3" stroke="#5B6B7C" strokeWidth="1.6" strokeDasharray="5 4" /></svg>
        People who know each other
      </span>
      <span className="font-medium text-navy">{center === 'person' ? 'Closer to center = stronger tie' : 'Closer to center = stronger match'}</span>
    </div>
  );
}
