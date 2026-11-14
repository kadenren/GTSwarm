/**
 * Illustrative relevance web for the home hero (pure SVG + CSS, no data fetch).
 * Same visual grammar as the real web: rings by match, teal alumni, purple students, gold best match, dashed "know each other".
 */
const NODES = [
  { x: 300, y: 128, r: 22, t: 'alum', l: "Dana, alum '18", best: true },
  { x: 482, y: 226, r: 17, t: 'alum', l: "Tom, alum '16" },
  { x: 118, y: 268, r: 16, t: 'student', l: 'Ethan, student' },
  { x: 470, y: 110, r: 12, t: 'alum', l: "Nina, alum '14" },
  { x: 120, y: 120, r: 12, t: 'alum', l: "Omar, alum '19" },
  { x: 500, y: 330, r: 10, t: 'student', l: 'Maya, student' },
  { x: 96, y: 352, r: 10, t: 'alum', l: "Grace, alum '17" },
  { x: 312, y: 392, r: 11, t: 'student', l: 'Jordan, student' },
];
const PEERS: [number, number][] = [[0, 1], [0, 7], [1, 2], [3, 0], [4, 6], [5, 7]];
const C = { x: 300, y: 250 };

export default function HeroWeb() {
  return (
    <svg viewBox="0 0 600 480" className="h-auto w-full" role="img" aria-label="Preview of the relevance web: the best match sits closest to the search with a gold line">
      <defs>
        <radialGradient id="hwGlow"><stop offset="0%" stopColor="#B3A369" stopOpacity="0.35" /><stop offset="100%" stopColor="#B3A369" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx={C.x} cy={C.y} r="150" fill="url(#hwGlow)" />
      {[80, 150, 215].map((r) => <ellipse key={r} cx={C.x} cy={C.y} rx={r * 1.25} ry={r} fill="none" stroke="#fff" strokeOpacity="0.12" strokeDasharray="2 6" />)}
      {NODES.map((n, i) => !n.best && (
        <line key={`s${i}`} x1={C.x} y1={C.y} x2={n.x} y2={n.y} stroke="#fff" strokeOpacity={0.12 + n.r / 80} strokeWidth={n.r / 7}
          className="hw-grow" style={{ animationDelay: `${i * 70}ms` }} />
      ))}
      {PEERS.map(([a, b]) => (
        <line key={`p${a}${b}`} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y} stroke="#D6CC9E" strokeOpacity="0.45" strokeWidth="1.3" strokeDasharray="5 5" className="hw-fade" />
      ))}
      <line x1={C.x} y1={C.y} x2={NODES[0].x} y2={NODES[0].y} stroke="#B3A369" strokeWidth="7" strokeLinecap="round" className="hw-best" />
      {NODES.map((n, i) => (
        <g key={i} className="hw-node" style={{ animationDelay: `${i * 70}ms`, transformOrigin: `${C.x}px ${C.y}px` }}>
          {n.best && <circle cx={n.x} cy={n.y} r={n.r + 8} fill="none" stroke="#B3A369" strokeWidth="2" className="hw-pulse" style={{ transformOrigin: `${n.x}px ${n.y}px` }} />}
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.t === 'alum' ? '#1B8A8F' : '#7B5FB8'} stroke={n.best ? '#B3A369' : '#fff'} strokeWidth={n.best ? 4 : 2} />
          <text x={n.x} y={n.y + n.r + 16} textAnchor="middle" fontSize={n.best ? 14 : 12} fontWeight={n.best ? 700 : 500} fill="#fff" fillOpacity={n.best ? 1 : 0.8}>{n.l}</text>
        </g>
      ))}
      <g>
        <rect x={C.x - 118} y={C.y - 24} width="236" height="48" rx="24" fill="#B3A369" stroke="#fff" strokeWidth="3" />
        <text x={C.x} y={C.y - 3} textAnchor="middle" fontSize="13.5" fontWeight="700" fill="#011a30" fontFamily="Space Grotesk, sans-serif">low-power hardware, shipped</text>
        <text x={C.x} y={C.y + 14} textAnchor="middle" fontSize="11" fontWeight="600" fill="#022747" fillOpacity="0.8">Cofounder</text>
      </g>
    </svg>
  );
}
