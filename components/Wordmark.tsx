export default function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <g fill="none" stroke="#B3A369" strokeWidth="1.4">
          <line x1="14" y1="14" x2="5" y2="7" /><line x1="14" y1="14" x2="23" y2="6" /><line x1="14" y1="14" x2="22" y2="22" /><line x1="14" y1="14" x2="6" y2="21" /><line x1="5" y1="7" x2="23" y2="6" strokeDasharray="2 2" />
        </g>
        <circle cx="14" cy="14" r="4" fill="#B3A369" />
        <circle cx="5" cy="7" r="2.4" fill="#1B8A8F" /><circle cx="23" cy="6" r="2.4" fill="#1B8A8F" />
        <circle cx="22" cy="22" r="2.4" fill="#8E73C9" /><circle cx="6" cy="21" r="2.4" fill="#8E73C9" />
      </svg>
      <span className="font-display text-xl font-bold tracking-tight text-white">
        GT <span className="text-gold">Swarm</span>
      </span>
    </span>
  );
}
