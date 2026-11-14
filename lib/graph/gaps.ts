import { snapshot, personLabel } from '../data';

/**
 * Skill gaps: compare the team's skills with the skills that are common in similar, successful projects
 * (projects with a recorded outcome or that became startups, ranked by skill overlap).
 */
export interface Gap { skill: string; covered: boolean; frequency: number; coveredBy: string[]; suggestions: { id: string; name: string; label: string; why: string }[] }

export function skillGaps(projectId: string, slots = 8) {
  const s = snapshot();
  const project = s.project.get(projectId);
  if (!project) return null;
  const mine = new Set(s.projectSkillNames.get(projectId) ?? []);
  const team = (s.membersOf.get(projectId) ?? []).map((m) => m.person_id);
  const teamSet = new Set(team);
  const coverage = new Map<string, string[]>();
  for (const pid of team) for (const sk of s.skillsOf.get(pid) ?? []) coverage.set(sk, [...(coverage.get(sk) ?? []), s.person.get(pid)!.name]);

  const similar = s.projects
    .filter((p) => p.id !== projectId && (p.outcome || p.is_startup))
    .map((p) => {
      const theirs = new Set(s.projectSkillNames.get(p.id) ?? []);
      const inter = [...theirs].filter((x) => mine.has(x)).length;
      const union = new Set([...theirs, ...mine]).size || 1;
      // people on a project bring skills too, so count the team's skills of successful projects
      return { p, theirs, score: inter / union };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const freq = new Map<string, number>();
  for (const { p, theirs, score } of similar) {
    const skills = new Set(theirs);
    for (const m of s.membersOf.get(p.id) ?? []) for (const sk of s.skillsOf.get(m.person_id) ?? []) skills.add(sk);
    for (const sk of skills) freq.set(sk, (freq.get(sk) ?? 0) + score);
  }
  const top = [...freq].sort((a, b) => b[1] - a[1]).slice(0, slots);

  const gaps: Gap[] = top.map(([skill, f]) => {
    const coveredBy = coverage.get(skill) ?? [];
    const covered = coveredBy.length > 0 || mine.has(skill);
    let suggestions: Gap['suggestions'] = [];
    if (!covered) {
      const skillId = s.skills.find((k) => k.name === skill)?.id;
      suggestions = s.personSkills
        .filter((ps) => ps.skill_id === skillId && !teamSet.has(ps.person_id) && s.person.get(ps.person_id)!.claimed)
        .map((ps) => {
          const person = s.person.get(ps.person_id)!;
          const used = (s.projectsOf.get(person.id) ?? []).filter((m) => (s.projectSkillNames.get(m.project_id) ?? []).includes(skill));
          return { person, used, score: used.length * 2 + person.availability_hours / 8 + (person.open_to.length ? 0.5 : 0) };
        })
        .sort((a, b) => b.score - a.score || a.person.name.localeCompare(b.person.name))
        .slice(0, 3)
        .map(({ person, used }) => ({
          id: person.id, name: person.name, label: personLabel(person),
          why: used.length ? `Used ${skill} on ${used.slice(0, 2).map((m) => s.project.get(m.project_id)!.name).join(' and ')}` : `Lists ${skill} as a skill`,
        }));
    }
    return { skill, covered, frequency: Math.round(f * 100) / 100, coveredBy: coveredBy.slice(0, 3), suggestions };
  });
  return {
    gaps,
    similar: similar.slice(0, 5).map(({ p }) => ({ id: p.id, name: p.name, year: p.year, outcome: p.outcome })),
    coverage: gaps.filter((g) => g.covered).length / Math.max(1, gaps.length),
  };
}
