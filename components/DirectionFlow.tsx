/**
 * Students <-> alumni flow: arrow width scales with the number of consented connections in each direction.
 * Self-loops show alum-to-alum and student-to-student. Labels carry the numbers, so color is never the only cue.
 */
export default function DirectionFlow({ counts }: { counts: Record<'student to alum' | 'alum to alum' | 'alum to student' | 'student to student', number> }) {
  const max = Math.max(1, ...Object.values(counts));
  const w = (n: number) => 2 + (n / max) * 14;
  const S = { x: 170, y: 170 }, A = { x: 530, y: 170 };
  return (
    <svg viewBox="0 0 700 335" className="h-auto w-full" role="img"
      aria-label={`Connections by direction: student to alum ${counts['student to alum']}, alum to student ${counts['alum to student']}, alum to alum ${counts['alum to alum']}, student to student ${counts['student to student']}`}>
      <defs>
        <marker id="arrowGold" viewBox="0 0 10 10" refX="7" refY="5" markerUnits="userSpaceOnUse" markerWidth="16" markerHeight="16" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#B3A369" /></marker>
        <marker id="arrowNavy" viewBox="0 0 10 10" refX="7" refY="5" markerUnits="userSpaceOnUse" markerWidth="16" markerHeight="16" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#003057" /></marker>
      </defs>
      {/* student -> alum (top arc) */}
      <path d={`M${S.x + 70},${S.y - 40} C 300,40 400,40 ${A.x - 76},${A.y - 42}`} fill="none" stroke="#B3A369" strokeWidth={w(counts['student to alum'])} strokeLinecap="round" markerEnd="url(#arrowGold)" />
      <text x="350" y="58" textAnchor="middle" className="fill-navy" fontSize="15" fontWeight="700">{counts['student to alum']} student → alum</text>
      {/* alum -> student (bottom arc) */}
      <path d={`M${A.x - 70},${A.y + 40} C 400,300 300,300 ${S.x + 76},${S.y + 42}`} fill="none" stroke="#003057" strokeWidth={w(counts['alum to student'])} strokeLinecap="round" markerEnd="url(#arrowNavy)" />
      <text x="350" y="318" textAnchor="middle" className="fill-navy" fontSize="15" fontWeight="700">{counts['alum to student']} alum → student</text>
      {/* loops */}
      <path d={`M${S.x - 40},${S.y - 66} C ${S.x - 150},${S.y - 160} ${S.x + 40},${S.y - 175} ${S.x + 10},${S.y - 82}`} fill="none" stroke="#6B4FA3" strokeWidth={w(counts['student to student'])} strokeLinecap="round" markerEnd="url(#arrowNavy)" opacity="0.85" />
      <text x={S.x} y={S.y + 102} textAnchor="middle" fontSize="14" fontWeight="700" className="fill-navy">{counts['student to student']} student → student</text>
      <path d={`M${A.x + 40},${A.y - 66} C ${A.x + 150},${A.y - 160} ${A.x - 40},${A.y - 175} ${A.x - 10},${A.y - 82}`} fill="none" stroke="#1B8A8F" strokeWidth={w(counts['alum to alum'])} strokeLinecap="round" markerEnd="url(#arrowNavy)" opacity="0.85" />
      <text x={A.x} y={A.y + 102} textAnchor="middle" fontSize="14" fontWeight="700" className="fill-navy">{counts['alum to alum']} alum → alum</text>
      {/* nodes */}
      <circle cx={S.x} cy={S.y} r="72" fill="#6B4FA3" />
      <text x={S.x} y={S.y + 6} textAnchor="middle" fill="#fff" fontSize="20" fontWeight="700" fontFamily="Space Grotesk, sans-serif">Students</text>
      <circle cx={A.x} cy={A.y} r="72" fill="#1B8A8F" />
      <text x={A.x} y={A.y + 6} textAnchor="middle" fill="#fff" fontSize="20" fontWeight="700" fontFamily="Space Grotesk, sans-serif">Alumni</text>
    </svg>
  );
}
