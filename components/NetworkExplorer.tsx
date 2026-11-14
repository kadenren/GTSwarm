'use client';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic(() => import('./ForceGraphInner'), { ssr: false }) as any;

interface GNode { id: string; kind: 'project' | 'person' | 'skill'; label: string; year: number; teamType?: string; personType?: 'student' | 'alum'; x?: number; y?: number }
interface GLink { source: string | GNode; target: string | GNode; kind: string }

// validated categorical order on the dark canvas (dataviz validator: lightness, chroma, CVD >= 7.9 with legend + labels)
export const TEAM_COLORS: Record<string, string> = {
  Capstone: '#2E9E60', VIP: '#9A6BD8', 'CREATE-X': '#D67A2C', Lab: '#3B8EDB', Startup: '#D94A63', Club: '#A68F12', 'Invention Studio': '#C2559E',
};
const PERSON_RING = { alum: '#7FD1D4', student: '#D9C8FF' };
const GOLD = '#D9C98F';
const idOf = (x: string | GNode) => (typeof x === 'string' ? x : x.id);

export default function NetworkExplorer({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
  const [data, setData] = useState<{ nodes: GNode[]; links: GLink[] } | null>(null);
  const [year, setYear] = useState(2026);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [path, setPath] = useState<{ ids: string[]; text: string; hops: number } | null>(null);
  const [hover, setHover] = useState<GNode | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const fg = useRef<{ zoomToFit: (ms?: number, pad?: number, filter?: (n: GNode) => boolean) => void; d3Force: (n: string) => { strength?: (v: number) => void; distance?: (v: number) => void } | undefined } | null>(null);
  const [size, setSize] = useState({ w: 900, h: 640 });
  const fitted = useRef(false);

  useEffect(() => {
    fetch('/api/graph').then((r) => r.json()).then((d) => {
      setData({ nodes: d.nodes, links: d.links });
      const label = (id: string) => d.nodes.find((n: GNode) => n.id === id)?.label ?? '';
      setFromText(label(defaultFrom));
      setToText(label(defaultTo));
    });
  }, [defaultFrom, defaultTo]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.max(560, Math.round(window.innerHeight - 260)) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!from || !to) { setPath(null); return; }
    fetch(`/api/path?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).then((r) => (r.ok ? r.json() : null)).then(setPath);
  }, [from, to]);

  const pathSet = useMemo(() => new Set(path?.ids ?? []), [path]);
  const pathEdges = useMemo(() => {
    const s = new Set<string>();
    if (path) for (let i = 1; i < path.ids.length; i++) { s.add(`${path.ids[i - 1]}|${path.ids[i]}`); s.add(`${path.ids[i]}|${path.ids[i - 1]}`); }
    return s;
  }, [path]);

  // year slider: projects up to the year; people and skills attached to a visible project; path nodes always shown
  const graph = useMemo(() => {
    if (!data) return { nodes: [], links: [] };
    const visibleProjects = new Set(data.nodes.filter((n) => n.kind === 'project' && n.year <= year).map((n) => n.id));
    const keep = new Set<string>(visibleProjects);
    for (const l of data.links) {
      const a = idOf(l.source), b = idOf(l.target);
      if (visibleProjects.has(a)) keep.add(b);
      if (visibleProjects.has(b)) keep.add(a);
    }
    for (const id of pathSet) keep.add(id);
    const nodes = data.nodes.filter((n) => keep.has(n.id) && (n.kind !== 'project' || visibleProjects.has(n.id) || pathSet.has(n.id)));
    const ids = new Set(nodes.map((n) => n.id));
    const links = data.links.filter((l) => ids.has(idOf(l.source)) && ids.has(idOf(l.target)));
    return { nodes, links };
  }, [data, year, pathSet]);

  useEffect(() => {
    let tries = 0;
    const t = setInterval(() => {
      const f = fg.current;
      if (f || ++tries > 40) clearInterval(t);
      if (!f) return;
      f.d3Force('charge')?.strength?.(-38);
      f.d3Force('link')?.distance?.(22);
    }, 100);
    const fit = setTimeout(() => fg.current?.zoomToFit(600, 40), 2600);
    return () => { clearInterval(t); clearTimeout(fit); };
  }, [data]);

  const options = useMemo(() => (data?.nodes ?? []).filter((n) => n.kind !== 'skill'), [data]);
  const resolve = (text: string) => options.find((n) => n.label.toLowerCase() === text.trim().toLowerCase())?.id ?? '';
  const counts = { projects: graph.nodes.filter((n) => n.kind === 'project').length, people: graph.nodes.filter((n) => n.kind === 'person').length };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-4 rounded-xl bg-navy-800 p-4 text-white">
        <label className="flex min-w-[220px] flex-1 flex-col text-xs">
          <span className="mb-1 font-semibold uppercase tracking-wide text-white/60">Warm path from</span>
          <input list="explorer-nodes" value={fromText} onChange={(e) => { setFromText(e.target.value); const id = resolve(e.target.value); if (id) setFrom(id); }}
            className="rounded-lg border border-white/20 bg-navy-900 px-3 py-2 text-sm text-white focus:border-gold focus:outline-none" />
        </label>
        <label className="flex min-w-[220px] flex-1 flex-col text-xs">
          <span className="mb-1 font-semibold uppercase tracking-wide text-white/60">To</span>
          <input list="explorer-nodes" value={toText} onChange={(e) => { setToText(e.target.value); const id = resolve(e.target.value); if (id) setTo(id); }}
            className="rounded-lg border border-white/20 bg-navy-900 px-3 py-2 text-sm text-white focus:border-gold focus:outline-none" />
        </label>
        <datalist id="explorer-nodes">{options.map((n) => <option key={n.id} value={n.label} />)}</datalist>
        <label className="flex min-w-[260px] flex-[1.3] flex-col text-xs">
          <span className="mb-1 flex justify-between font-semibold uppercase tracking-wide text-white/60">
            <span>Projects through</span><span className="font-display text-base text-gold">{year}</span>
          </span>
          <input type="range" min={2011} max={2026} value={year} onChange={(e) => setYear(+e.target.value)} className="accent-[#B3A369]" aria-label="Show projects through year" />
          <span className="mt-1 text-white/50">{counts.projects} projects · {counts.people} people</span>
        </label>
        <button className="btn-gold" onClick={() => fg.current?.zoomToFit(600, 60, (n: GNode) => pathSet.has(n.id))} disabled={!path}>Zoom to path</button>
        <button className="btn border border-white/30 text-white hover:border-white" onClick={() => fg.current?.zoomToFit(600, 30)}>Fit all</button>
      </div>
      {path && (
        <p className="rounded-lg border border-gold/30 bg-white/5 px-4 py-2 text-sm text-white/90" data-testid="explorer-path">
          <span className="font-semibold text-gold-light">Gold path ({path.hops} hops):</span> {path.text}
        </p>
      )}
      <div ref={wrap} className="relative overflow-hidden rounded-xl bg-navy-900" style={{ height: size.h }}>
        {data ? (
          <ForceGraph2D
            fgRef={fg}
            width={size.w}
            height={size.h}
            graphData={graph}
            backgroundColor="#011a30"
            cooldownTicks={140}
            onEngineStop={() => { if (!fitted.current) { fitted.current = true; fg.current?.zoomToFit(500, 40); } }}
            nodeRelSize={4}
            linkColor={(l: GLink) => (pathEdges.has(`${idOf(l.source)}|${idOf(l.target)}`) ? GOLD : l.kind === 'connected' ? 'rgba(217,200,255,0.28)' : 'rgba(255,255,255,0.09)')}
            linkWidth={(l: GLink) => (pathEdges.has(`${idOf(l.source)}|${idOf(l.target)}`) ? 3.5 : 0.6)}
            linkLineDash={(l: GLink) => (l.kind === 'connected' && !pathEdges.has(`${idOf(l.source)}|${idOf(l.target)}`) ? [3, 3] : null)}
            onNodeHover={(n: GNode | null) => setHover(n)}
            onNodeClick={(n: GNode) => { if (n.kind === 'project') window.location.href = `/projects/${encodeURIComponent(n.id)}`; }}
            nodeLabel={(n: GNode) => `${n.label}${n.kind === 'project' ? ` · ${n.teamType}` : n.kind === 'person' ? ` · ${n.personType}` : ' · skill'}`}
            nodeCanvasObject={(n: GNode, ctx: CanvasRenderingContext2D, scale: number) => {
              const onPath = pathSet.has(n.id);
              const x = n.x ?? 0, y = n.y ?? 0;
              if (onPath) {
                ctx.beginPath(); ctx.arc(x, y, 10, 0, 2 * Math.PI); ctx.fillStyle = 'rgba(217,201,143,0.25)'; ctx.fill();
              }
              if (n.kind === 'project') {
                ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.fillStyle = TEAM_COLORS[n.teamType ?? ''] ?? '#888'; ctx.fill();
                if (onPath) { ctx.lineWidth = 1.6; ctx.strokeStyle = GOLD; ctx.stroke(); }
              } else if (n.kind === 'person') {
                ctx.beginPath(); ctx.arc(x, y, 3.6, 0, 2 * Math.PI); ctx.lineWidth = onPath ? 2.2 : 1.3; ctx.strokeStyle = onPath ? GOLD : PERSON_RING[n.personType ?? 'alum']; ctx.stroke();
              } else {
                ctx.beginPath(); ctx.arc(x, y, 1.4, 0, 2 * Math.PI); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
              }
              if (onPath || hover?.id === n.id || (scale > 3.2 && n.kind !== 'skill')) {
                const fs = Math.max(3, 12 / scale);
                ctx.font = `${onPath ? 600 : 400} ${fs}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.lineWidth = 3 / scale; ctx.strokeStyle = '#011a30'; ctx.strokeText(n.label, x, y + 9 + fs * 0.6);
                ctx.fillStyle = onPath ? GOLD : 'rgba(255,255,255,0.85)'; ctx.fillText(n.label, x, y + 9 + fs * 0.6);
              }
            }}
            nodePointerAreaPaint={(n: GNode, color: string, ctx: CanvasRenderingContext2D) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(n.x ?? 0, n.y ?? 0, 7, 0, 2 * Math.PI); ctx.fill(); }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/60">Loading the swarm…</div>
        )}
        <div className="pointer-events-none absolute bottom-3 left-3 flex max-w-[95%] flex-wrap gap-x-4 gap-y-1 rounded-lg bg-navy-900/85 px-3 py-2 text-[11px] text-white/80">
          {Object.entries(TEAM_COLORS).map(([k, c]) => <span key={k} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{k}</span>)}
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: PERSON_RING.alum }} />Alum</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: PERSON_RING.student }} />Student</span>
          <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-white/50" />Skill</span>
          <span className="flex items-center gap-1.5"><span className="h-1 w-5 rounded" style={{ background: GOLD }} />Warm path</span>
        </div>
      </div>
    </div>
  );
}
