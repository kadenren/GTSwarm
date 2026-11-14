import { getDb, bumpDataVersion } from './db';
import { snapshot, ROLES, type Role } from './data';
import { geminiJson, geminiEnabled, type MediaPart } from './gemini';
import { embedText, toBlob } from './embed';
import { createProject, ActionError } from './actions';
import { TEAM_TYPES } from './extract';
import { githubRepos, textFromLink, type RepoInfo, type SourceInfo } from './ingest';

/**
 * Claim your profile from your own resume. Gemini (or keyword rules) drafts the fields; the person confirms every one.
 * "Open to" roles and availability are never inferred: only the person sets them.
 */
export const MAJORS = ['EE', 'CmpE', 'ME', 'AE', 'BME', 'ISyE', 'CS', 'Business'] as const;

export interface ProfileDraft {
  bio: string;
  major: string;
  grad_year: number;
  current_role: string;
  skills: string[];
  projects: { name: string; year: number; team_type: string; team_name: string; summary: string; role: 'builder' | 'founder' | 'advisor' }[];
}

const SCHEMA = {
  type: 'object',
  required: ['bio', 'major', 'grad_year', 'current_role', 'skills', 'projects'],
  properties: {
    bio: { type: 'string', description: 'Two sentences in first person describing what this person builds, using only facts from the resume' },
    major: { type: 'string', enum: [...MAJORS], description: 'Closest Georgia Tech major' },
    grad_year: { type: 'integer', description: 'Georgia Tech graduation year (expected year for current students)' },
    current_role: { type: 'string', description: 'Current job title and organization type, or empty for students' },
    skills: { type: 'array', items: { type: 'string' }, description: 'Up to 12 technical skills explicitly listed or demonstrated' },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'year', 'team_type', 'team_name', 'summary', 'role'],
        properties: {
          name: { type: 'string' }, year: { type: 'integer' }, team_type: { type: 'string', enum: TEAM_TYPES },
          team_name: { type: 'string' }, summary: { type: 'string', description: 'One sentence on what was built' },
          role: { type: 'string', enum: ['builder', 'founder', 'advisor'] },
        },
      },
      description: 'Projects built at Georgia Tech or ventures founded, up to 5',
    },
  },
};

const SYSTEM =
  'You read a resume that its owner uploaded to create their own GT Swarm profile. Extract only facts stated in it. ' +
  'Do not guess personal attributes or availability. Prefer Georgia Tech projects (capstone, VIP, labs, clubs, Invention Studio, CREATE-X) and startups. ' +
  'Leave a field empty rather than inventing it.';

export interface ProfileLinks { linkedin?: string; github?: string; scholar?: string; website?: string }
export type DraftProject = ProfileDraft['projects'][number] & { from?: 'resume' | 'github'; url?: string };

/**
 * Draft a profile from the person's own resume plus the links they give us.
 * GitHub repos (public API) and a personal website are read; LinkedIn and Google Scholar are saved but never scraped.
 */
export async function draftProfile(text: string, media: MediaPart[], links: ProfileLinks = {}): Promise<{ draft: ProfileDraft & { projects: DraftProject[] }; source: 'gemini' | 'keyword'; sources: SourceInfo[] }> {
  const sources: SourceInfo[] = [];
  const extra: string[] = [];
  let repos: RepoInfo[] = [];
  if (links.github?.trim()) {
    const gh = await githubRepos(links.github);
    sources.push(gh.info);
    repos = gh.repos;
    if (repos.length) extra.push(`Public GitHub repositories:\n${repos.map((r) => `- ${r.name} (${r.year}${r.language ? `, ${r.language}` : ''}): ${r.description}`).join('\n')}`);
  }
  if (links.website?.trim()) {
    const site = await textFromLink(links.website.trim());
    sources.push(site.info);
    if (site.text) extra.push(`Personal website (${site.title}):\n${site.text.slice(0, 6000)}`);
  }
  if (links.linkedin?.trim()) sources.push({ name: 'LinkedIn', kind: 'link', chars: 0, ok: true, note: 'saved to your profile (LinkedIn does not allow reading profiles automatically; upload "Save to PDF" from LinkedIn to import it)' });
  if (links.scholar?.trim()) sources.push({ name: 'Google Scholar', kind: 'link', chars: 0, ok: true, note: 'saved to your profile (paste publications into the resume box to import them)' });
  const all = [text, ...extra].filter(Boolean).join('\n\n');

  let draft: ProfileDraft | null = null;
  let source: 'gemini' | 'keyword' = 'keyword';
  if (geminiEnabled()) {
    const d = await geminiJson<ProfileDraft>({ system: SYSTEM, text: all ? `Resume and profile sources:\n${all.slice(0, 30000)}` : 'Read the attached resume.', media, schema: SCHEMA });
    if (d) { draft = normalizeDraft(d); source = 'gemini'; }
  }
  if (!draft) draft = keywordProfile(all);
  // GitHub repos the resume did not already cover become optional projects (unchecked by default in the UI)
  const projects: DraftProject[] = draft.projects.map((p) => ({ ...p, from: 'resume' as const }));
  for (const r of repos) {
    if (r.description.length < 12 || projects.some((p) => p.name.toLowerCase() === r.name.toLowerCase())) continue;
    projects.push({ name: r.name, year: r.year, team_type: 'Club', team_name: 'Personal project', summary: r.description, role: 'builder', from: 'github', url: r.url });
  }
  return { draft: { ...draft, projects: projects.slice(0, 10) }, source, sources };
}

const LINK_RULES: Record<keyof ProfileLinks, RegExp> = {
  linkedin: /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[\w%-]+\/?$/i,
  github: /^https:\/\/github\.com\/[a-z\d-]{1,39}\/?$/i,
  scholar: /^https:\/\/scholar\.google\.[a-z.]+\/citations\?.*user=[\w-]+/i,
  website: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
};
/** Normalize and validate profile links; returns only links that match their site. */
export function normalizeLinks(links: ProfileLinks): { valid: Partial<Record<keyof ProfileLinks, string>>; invalid: string[] } {
  const valid: Partial<Record<keyof ProfileLinks, string>> = {};
  const invalid: string[] = [];
  for (const k of Object.keys(LINK_RULES) as (keyof ProfileLinks)[]) {
    let v = links[k]?.trim();
    if (!v) continue;
    if (k === 'github' && /^@?[a-z\d-]{1,39}$/i.test(v)) v = `https://github.com/${v.replace(/^@/, '')}`;
    if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
    v = v.replace(/^http:\/\/(www\.)?(linkedin|github)/i, 'https://$2').replace(/^https:\/\/www\.(linkedin|github)/i, 'https://$1');
    if (LINK_RULES[k].test(v)) valid[k] = v; else invalid.push(k);
  }
  return { valid, invalid };
}

function normalizeDraft(d: ProfileDraft): ProfileDraft {
  return {
    bio: (d.bio ?? '').trim().slice(0, 600),
    major: MAJORS.includes(d.major as (typeof MAJORS)[number]) ? d.major : 'CS',
    grad_year: Number.isInteger(d.grad_year) && d.grad_year > 1960 && d.grad_year < 2035 ? d.grad_year : new Date().getFullYear(),
    current_role: (d.current_role ?? '').trim().slice(0, 120),
    skills: [...new Set((d.skills ?? []).map((x) => x.trim()).filter(Boolean))].slice(0, 12),
    projects: (d.projects ?? []).filter((p) => p.name?.trim()).slice(0, 5).map((p) => ({
      ...p, team_type: TEAM_TYPES.includes(p.team_type as never) ? p.team_type : 'Capstone',
      role: (['builder', 'founder', 'advisor'] as const).includes(p.role) ? p.role : 'builder',
    })),
  };
}

/** Deterministic fallback: skills from the swarm's skill list, graduation year and major from keywords. */
export function keywordProfile(text: string): ProfileDraft {
  const s = snapshot();
  const lower = text.toLowerCase();
  const skills = s.skills.map((k) => k.name)
    .filter((n) => n.length > 2 && new RegExp(`(^|[^a-z0-9])${n.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(lower))
    .slice(0, 12);
  const gt = text.match(/(Georgia Tech|Georgia Institute of Technology)[\s\S]{0,160}?\b(19[6-9]\d|20[0-3]\d)\b/i) ?? text.match(/\b(19[6-9]\d|20[0-3]\d)\b[\s\S]{0,80}?(Georgia Tech|Georgia Institute of Technology)/i);
  const year = gt ? +(gt[2] && /^\d{4}$/.test(gt[2]) ? gt[2] : gt[1]) : new Date().getFullYear();
  const majorMap: [RegExp, string][] = [[/biomedical/i, 'BME'], [/aerospace/i, 'AE'], [/mechanical/i, 'ME'], [/computer engineering/i, 'CmpE'], [/electrical/i, 'EE'], [/industrial (and|&) systems|industrial engineering/i, 'ISyE'], [/computer science/i, 'CS'], [/business|scheller/i, 'Business']];
  const major = majorMap.find(([r]) => r.test(text))?.[1] ?? 'CS';
  // "Firmware Lead, a hearing-health wearables company, 2021 to present" -> "Firmware Lead at a hearing-health wearables company"
  const current = text.match(/([A-Z][A-Za-z/& ]{2,40}),\s+([^,.]{3,70}?)[,.]?\s+(?:19|20)\d{2}\s+(?:to|-|–)\s+present/);
  const roleLine = current
    ? `${current[1].trim()} at ${current[2].trim()}`
    : text.split('\n').map((l) => l.trim()).find((l) => / at |, inc|engineer|manager|founder/i.test(l) && l.length < 80 && !/^(i |summary)/i.test(l)) ?? '';
  // PDF text often loses line breaks, so stop at the next section heading rather than a blank line
  const summary = text.match(/\b(summary|profile|about me)\b\s*:?\s*([\s\S]{20,600}?)(?=\n\s*\n|\b(Education|Experience|Projects|Skills)\b|$)/i)?.[2]?.replace(/\s+/g, ' ').trim() ?? '';
  return { bio: summary.slice(0, 400), major, grad_year: Number.isFinite(year) ? year : new Date().getFullYear(), current_role: roleLine, skills, projects: [] };
}

export async function saveProfile(viewerId: string, input: ProfileDraft & { open_to: Role[]; availability_hours: number; addProjects: boolean[]; links?: ProfileLinks }) {
  const db = getDb();
  const s = snapshot();
  const me = s.person.get(viewerId);
  if (!me) throw new ActionError('Unknown person.', 404);
  const bio = input.bio.trim();
  if (bio.length < 20) throw new ActionError('Write at least a sentence for your bio.');
  const openTo = input.open_to.filter((r) => ROLES.includes(r));
  const hours = Math.max(0, Math.min(40, Math.round(input.availability_hours || 0)));
  const skills = [...new Set(input.skills.map((x) => x.trim()).filter(Boolean))].slice(0, 15);
  const nextId = () => {
    const rows = db.prepare("SELECT id FROM skills WHERE id LIKE 'skill:s%'").all() as { id: string }[];
    return `skill:s${String(rows.reduce((m, r) => Math.max(m, parseInt(r.id.slice(7), 10) || 0), 0) + 1).padStart(3, '0')}`;
  };
  const vec = s.searchMode === 'semantic' ? await embedText(`${bio} Skills: ${skills.join(', ')}.`) : null;
  db.transaction(() => {
    db.prepare('UPDATE people SET bio = ?, major = ?, grad_year = ?, current_role = ?, open_to = ?, availability_hours = ?, claimed = 1' + (vec ? ', embedding = ?' : '') + ' WHERE id = ?')
      .run(...[bio, input.major, input.grad_year, input.current_role.trim() || me.current_role, JSON.stringify(openTo), hours, ...(vec ? [toBlob(vec)] : []), viewerId]);
    for (const name of skills) {
      let k = db.prepare('SELECT id FROM skills WHERE lower(name) = lower(?)').get(name) as { id: string } | undefined;
      if (!k) { k = { id: nextId() }; db.prepare('INSERT INTO skills (id, name) VALUES (?,?)').run(k.id, name); }
      db.prepare('INSERT OR IGNORE INTO person_skill (person_id, skill_id) VALUES (?,?)').run(viewerId, k.id);
    }
  })();
  const { valid, invalid } = normalizeLinks(input.links ?? {});
  db.prepare('DELETE FROM person_link WHERE person_id = ?').run(viewerId);
  for (const [kind, url] of Object.entries(valid)) db.prepare('INSERT INTO person_link (person_id, kind, url) VALUES (?,?,?)').run(viewerId, kind, url);
  bumpDataVersion();
  const created: string[] = [];
  for (const [i, p] of input.projects.entries()) {
    if (!input.addProjects[i] || !p.name.trim() || p.summary.trim().length < 10) continue;
    const exists = snapshot().projects.find((x) => x.name.toLowerCase() === p.name.trim().toLowerCase() && x.year === p.year);
    if (exists) continue;
    const { id } = await createProject(viewerId, { name: p.name, year: p.year, team_type: p.team_type, team_name: p.team_name, summary: p.summary, technologies: [], problems: [] });
    created.push(id);
  }
  return { created, invalidLinks: invalid };
}

/** Join GT Swarm: create a new claimed person (their own profile). Returns the new id. */
export function createPerson(input: { name: string; type: 'student' | 'alum'; major: string; grad_year: number }): string {
  const db = getDb();
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (name.length < 3 || name.split(' ').length < 2) throw new ActionError('Enter your first and last name.');
  if (!['student', 'alum'].includes(input.type)) throw new ActionError('Choose student or alum.');
  const rows = db.prepare("SELECT id FROM people WHERE id LIKE 'person:p%'").all() as { id: string }[];
  const id = `person:p${String(rows.reduce((m, r) => Math.max(m, parseInt(r.id.slice(8), 10) || 0), 0) + 1).padStart(3, '0')}`;
  db.prepare("INSERT INTO people (id, name, type, major, grad_year, current_role, company_type, city, bio, claimed, availability_hours, open_to) VALUES (?,?,?,?,?,NULL,NULL,NULL,?,1,2,'[]')")
    .run(id, name, input.type, MAJORS.includes(input.major as (typeof MAJORS)[number]) ? input.major : 'CS', Math.round(input.grad_year) || new Date().getFullYear(), `${name.split(' ')[0]} just joined GT Swarm.`);
  bumpDataVersion();
  return id;
}

export function linksOf(personId: string): { kind: string; url: string }[] {
  return getDb().prepare('SELECT kind, url FROM person_link WHERE person_id = ? ORDER BY kind').all(personId) as { kind: string; url: string }[];
}
