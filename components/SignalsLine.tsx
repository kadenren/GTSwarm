'use client';
/** The two halves of the work match. Semantic relevance is evidence of related experience, never proof of a skill or a relationship. */
export default function SignalsLine({ signals }: { signals: { keyword: number; semantic: number | null } }) {
  return (
    <div className="mt-2 rounded-md border border-navy/10 bg-white px-2.5 py-1.5" data-testid="signals">
      <span className="font-semibold text-navy">Keyword relevance {signals.keyword.toFixed(2)}</span>
      <span className="text-ink/40"> · </span>
      {signals.semantic === null
        ? <span className="text-ink/60">Semantic relevance off (keyword matching only)</span>
        : <span className="font-semibold text-teal">Semantic relevance {signals.semantic.toFixed(2)} <span className="font-normal text-ink/55">(Gemini embeddings)</span></span>}
      <p className="mt-0.5 text-[11px] text-ink/50">Semantic relevance means their records are about similar work. It suggests relevance; it is not proof of a skill, and it never creates a connection.</p>
    </div>
  );
}
