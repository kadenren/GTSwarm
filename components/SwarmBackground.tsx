/** Faint, slowly drifting swarm of nodes for the home page background (pure SVG + CSS). */
export default function SwarmBackground() {
  // deterministic pseudo-random layout so server and client markup match
  let seed = 7;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const nodes = Array.from({ length: 46 }, (_, i) => ({
    x: Math.round(r() * 1200),
    y: Math.round(r() * 640),
    s: Math.round((2 + r() * 5) * 10) / 10,
    c: i % 3 === 0 ? '#1B8A8F' : i % 3 === 1 ? '#8E73C9' : '#B3A369',
    d: Math.round(8 + r() * 10),
    delay: -Math.round(r() * 10),
  }));
  const links: [number, number][] = [];
  nodes.forEach((a, i) =>
    nodes.forEach((b, j) => {
      if (j > i && Math.hypot(a.x - b.x, a.y - b.y) < 150) links.push([i, j]);
    }),
  );
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.22]" viewBox="0 0 1200 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g style={{ animation: 'drift 22s ease-in-out infinite' }}>
        {links.map(([i, j]) => (
          <line key={`${i}-${j}`} x1={nodes[i].x} y1={nodes[i].y} x2={nodes[j].x} y2={nodes[j].y} stroke="#003057" strokeWidth={0.7} />
        ))}
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.s} fill={n.c} style={{ animation: `drift ${n.d}s ease-in-out ${n.delay}s infinite` }} />
        ))}
      </g>
    </svg>
  );
}
