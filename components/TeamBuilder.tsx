import Link from 'next/link';
import { skillGaps } from '@/lib/graph/gaps';
import GapList from './GapList';

/** Team builder for startup projects: skills coverage vs similar successful projects, with people for each gap. */
export default function TeamBuilder({ projectId }: { projectId: string }) {
  const r = skillGaps(projectId);
  if (!r || !r.gaps.length) return null;
  return (
    <section className="card p-5" aria-label="Team builder" data-testid="team-builder">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-navy">Team builder</h2>
        <span className="text-sm font-semibold text-navy">{Math.round(r.coverage * 100)}% of key skills covered</span>
      </div>
      <p className="text-xs text-ink/60">
        Skills that are common in similar successful projects ({r.similar.slice(0, 3).map((p, i) => (
          <span key={p.id}>{i > 0 && ', '}<Link className="underline decoration-gold underline-offset-2" href={`/projects/${encodeURIComponent(p.id)}`}>{p.name} ({p.year})</Link></span>
        ))}), compared with your team&apos;s skills.
      </p>
      <ol className="mt-4 flex gap-1.5" aria-label="Skills coverage">
        {r.gaps.map((g) => (
          <li key={g.skill} className="min-w-0 flex-1" title={g.covered ? `Covered by ${g.coveredBy.join(', ') || 'the project'}` : 'Missing'}>
            <div className={`h-3 rounded-full ${g.covered ? 'bg-gold' : 'border-2 border-dashed border-navy/25 bg-white'}`} />
            <div className={`mt-1 truncate text-[11px] ${g.covered ? 'text-navy' : 'font-semibold text-ink/60'}`}>{g.skill}</div>
          </li>
        ))}
      </ol>
      <GapList gaps={r.gaps} />
    </section>
  );
}
