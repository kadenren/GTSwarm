/** Stage styling shared by server and client components. */
export const STAGE_STYLE: Record<string, string> = {
  Idea: 'bg-plum-light text-plum', Prototype: 'bg-sky-100 text-sky-800', Testing: 'bg-amber-100 text-amber-800', Pilot: 'bg-teal-light text-teal', Launched: 'bg-emerald-100 text-emerald-800',
};
const STAGES = ['Idea', 'Prototype', 'Testing', 'Pilot', 'Launched'];

export function StageBar({ stage }: { stage: string }) {
  const i = STAGES.indexOf(stage);
  return (
    <span className="flex items-center gap-1" aria-label={`Stage: ${stage}`}>
      {STAGES.map((s, j) => <span key={s} className={`h-1.5 w-5 rounded-full ${j <= i ? 'bg-gold' : 'bg-navy/10'}`} />)}
    </span>
  );
}
