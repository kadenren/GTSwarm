import Link from 'next/link';

/** The matching factors as they are actually scored (lib/graph/rank.ts and lib/matching.ts), in plain words. */
const FACTORS = [
  { t: 'Project and experience match', w: '55%', d: 'Your request is compared with each person’s projects, bio and solved problems: 30% keyword relevance (exact terms like BLE or nRF52) and 70% Gemini semantic relevance (the same work described in different words). We picked the split by testing 15 queries with hand-written relevance judgments.' },
  { t: 'Documented experience', w: '20%', d: 'How much of their record sits among the closest projects and solved problems.' },
  { t: 'Skill relevance', w: 'shown', d: 'Skills you asked for that are on their record are highlighted on every card.' },
  { t: 'Role eligibility', w: 'filter + 10%', d: 'Pick a role and only people open to it are ranked. No one is shown for a role they did not choose.' },
  { t: 'Shared connections', w: '10%', d: 'Same projects, teams or majors, and accepted connections, from the knowledge graph.' },
  { t: 'Availability', w: '5%', d: 'Hours per week people say they can give.' },
];

export default function HowMatchingWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-t border-navy/10 bg-white" aria-labelledby="how-h">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">How the intelligence works</p>
        <h2 id="how-h" className="mt-2 text-2xl font-bold text-navy sm:text-3xl">Matches come from what people have built, and every one explains itself.</h2>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {FACTORS.map((f) => (
                <li key={f.t} className="rounded-xl border border-navy/10 bg-paper p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-semibold text-navy">{f.t}</h3>
                    <span className="shrink-0 rounded-full bg-navy/5 px-2 py-0.5 text-[11px] font-semibold text-navy/70">{f.w}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink/70">{f.d}</p>
                </li>
              ))}
            </ul>
            <div className="mt-3 rounded-xl border-l-4 border-teal bg-teal-light/40 p-4 text-sm text-ink/80">
              <strong className="text-navy">Grounded explanations.</strong> Each reason is built only from stored records (a project, a solved problem, a stated role), never invented. Click <em>Why this match?</em> on any result to see how its score adds up. Lists only show clear matches; weaker ones stay one click away.
            </div>
            <p className="mt-3 text-sm text-ink/65">
              <strong className="text-navy">The other direction:</strong> startups are recommended to a builder by text similarity (35%), skills the startup needs that you have (25%), a role it needs that you are open to (20%), interests (10%), stage (5%) and shared ties (5%).
            </p>
          </div>

          <figure className="rounded-2xl border border-navy/10 bg-paper p-5">
            <svg viewBox="0 0 320 220" className="w-full" role="img" aria-label="Knowledge graph: people built projects, projects use skills, people solved problems on projects, and people are connected to each other">
              <g stroke="#003057" strokeOpacity="0.3" strokeWidth="1.5">
                <line x1="70" y1="60" x2="200" y2="50" /><line x1="70" y1="60" x2="80" y2="165" /><line x1="200" y1="50" x2="270" y2="140" />
                <line x1="80" y1="165" x2="200" y2="50" /><line x1="70" y1="60" x2="175" y2="175" /><line x1="175" y1="175" x2="200" y2="50" />
              </g>
              <g fontFamily="Inter, sans-serif" fontSize="10" fill="#1E2A36" textAnchor="middle">
                <text x="135" y="44">built</text><text x="245" y="88">uses</text><text x="62" y="118">knows</text><text x="112" y="128">solved</text><text x="200" y="118">on</text>
              </g>
              <g fontFamily="Inter, sans-serif" fontSize="11" fontWeight="600" textAnchor="middle">
                <circle cx="70" cy="60" r="20" fill="#1B8A8F" /><text x="70" y="64" fill="#fff">Alum</text>
                <circle cx="80" cy="165" r="20" fill="#6B4FA3" /><text x="80" y="169" fill="#fff">Student</text>
                <rect x="168" y="34" width="64" height="32" rx="8" fill="#003057" /><text x="200" y="54" fill="#fff">Project</text>
                <rect x="238" y="126" width="64" height="28" rx="14" fill="#B3A369" /><text x="270" y="144" fill="#011a30">Skill</text>
                <rect x="140" y="161" width="70" height="28" rx="6" fill="#fff" stroke="#003057" strokeOpacity="0.4" /><text x="175" y="179" fill="#003057">Problem</text>
              </g>
            </svg>
            <figcaption className="mt-3 text-sm text-ink/70">
              A knowledge graph links people, projects, skills and solved problems. It powers the shared-connection score, warm introduction paths and the network maps.
            </figcaption>
          </figure>
        </div>
        <p className="mt-6 text-xs text-ink/55">
          Gemini embeddings (gemini-embedding-001) are precomputed once per record and cached; a search embeds only the query. If Gemini is slow or unavailable, matching falls back to keyword search within a few seconds, and nothing else changes. Semantic similarity never draws a connection line and is never treated as proof of a skill. <Link href="/stuck" className="font-semibold text-navy underline decoration-gold underline-offset-4">Get Unstuck</Link> uses the same graph to find who can help with a problem.
        </p>
      </div>
    </section>
  );
}
