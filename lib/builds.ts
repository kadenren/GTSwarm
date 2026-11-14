import crypto from 'node:crypto';
import { getDb, bumpDataVersion, parseJson } from './db';
import { snapshot, ROLES, type Role, type Snapshot } from './data';
import { skillGaps } from './graph/gaps';
import { ActionError } from './actions';

/**
 * Active builds: projects people are building right now, with a stage, an owner, what help they need and whether
 * they are open to collaborators. Stored in project_status; rows are derived automatically for active projects
 * (help needed comes from the skill-gap analysis) and owners can edit them.
 */
export const STAGES = ['Idea', 'Prototype', 'Testing', 'Pilot', 'Launched'] as const;
export type Stage = (typeof STAGES)[number];

export const INDUSTRY_BY_DOMAIN: Record<string, string> = {
  Wearables: 'Health and medical', 'Medical devices': 'Health and medical', Robotics: 'Robotics and automation',
  'Power electronics': 'Energy and mobility', 'Energy systems': 'Energy and mobility', 'Embedded systems': 'Connected devices and IoT',
  Aerospace: 'Aerospace and space', 'Machine learning and software': 'Software and AI', Manufacturing: 'Manufacturing',
};
export const INDUSTRIES = [...new Set(Object.values(INDUSTRY_BY_DOMAIN))];
const DOMAINS = Object.keys(INDUSTRY_BY_DOMAIN);

/** Hand-written status for the demo's hero builds (keyed by "name|year"). */
const HERO: Record<string, { stage: Stage; roles: Role[]; help: string }> = {
  'PulseBand|2025': { stage: 'Pilot', roles: ['Cofounder', 'Advisor', 'Early engineer'], help: 'A hardware cofounder who has shipped a consumer wearable, an advisor on FDA wellness versus medical claims, and a firmware engineer for low-power BLE.' },
  'Restwell Patch|2024': { stage: 'Pilot', roles: ['Early engineer', 'Advisor'], help: 'A wearable firmware engineer for nRF52 BLE and battery life (the BLE link drops when the MCU sleeps), and an advisor who has led an FDA 510(k) for a wearable.' },
  'StrideSense Gait Wearable|2025': { stage: 'Testing', roles: ['First customer', 'Helper'], help: 'Physical therapists or coaches willing to pilot gait data with real athletes.' },
  'Smart Ring Prototype|2025': { stage: 'Prototype', roles: ['Helper', 'Early engineer'], help: 'Help shrinking the PPG front end onto a flexible PCB without losing signal quality.' },
  'Campus LoRa Sensor Nodes|2025': { stage: 'Testing', roles: ['Helper'], help: 'A power-budget review to stretch battery life from three weeks to six months.' },
  'Wearable Sensing|2024': { stage: 'Prototype', roles: ['Early engineer', 'Helper'], help: 'Students who want to write Zephyr firmware on the 2017 sensor board.' },
  'Recovery Watch App|2025': { stage: 'Prototype', roles: ['Early engineer', 'First customer'], help: 'A mobile engineer for watchOS, and club teams to try recovery scores.' },
};

const pick = (id: string, n: number) => parseInt(crypto.createHash('md5').update(id).digest('hex').slice(0, 6), 16) % n;

export function isActive(s: Snapshot, projectId: string) {
  const p = s.project.get(projectId)!;
  return p.year >= 2024 || (p.is_startup && p.year >= 2022);
}

function deriveStatus(s: Snapshot, projectId: string) {
  const p = s.project.get(projectId)!;
  const team = s.membersOf.get(projectId) ?? [];
  const owner = team.find((m) => m.role === 'founder') ?? team.find((m) => m.role === 'maintainer') ?? team.find((m) => m.role === 'builder') ?? team[0];
  const domain = (s.projectSkillNames.get(projectId) ?? []).find((k) => DOMAINS.includes(k)) ?? 'Machine learning and software';
  const hero = HERO[`${p.name}|${p.year}`];
  let stage: Stage;
  if (hero) stage = hero.stage;
  else if (/shipped|units sold|paying customer/i.test(p.outcome ?? '')) stage = 'Launched';
  else if (/pilot|fitted|launched to orbit/i.test(p.outcome ?? '')) stage = 'Pilot';
  else if (p.year >= 2026) stage = pick(projectId, 3) === 0 ? 'Idea' : 'Prototype';
  else if (p.year === 2025) stage = pick(projectId, 2) ? 'Testing' : 'Prototype';
  else stage = pick(projectId, 2) ? 'Pilot' : 'Testing';
  let roles: Role[], help: string;
  if (hero) { roles = hero.roles; help = hero.help; }
  else {
    const gaps = (skillGaps(projectId)?.gaps ?? []).filter((g) => !g.covered).map((g) => g.skill).slice(0, 2);
    const hasAdvisor = team.some((m) => m.role === 'advisor');
    roles = [...new Set<Role>([gaps.length ? 'Early engineer' : 'Helper', ...(hasAdvisor ? [] : ['Advisor' as Role]), ...(p.is_startup && team.length < 3 ? ['Cofounder' as Role] : [])])];
    // describe the need with the project's own tools, so it reads like the team wrote it
    const tools = (s.projectSkillNames.get(projectId) ?? []).filter((k) => !DOMAINS.includes(k)).slice(0, 2);
    help = gaps.length && tools.length
      ? `An engineer with ${tools.join(' and ')} experience${hasAdvisor ? '' : ', plus an advisor who has built something similar'}.`
      : 'Builders who want to join a working team.';
  }
  return { stage, owner_id: owner?.person_id ?? null, industry: INDUSTRY_BY_DOMAIN[domain], domain, open: hero ? 1 : pick(projectId + 'open', 5) === 0 ? 0 : 1, roles, help };
}

/** Fill in status rows for active projects that do not have one yet (idempotent). */
export function ensureBuildStatus() {
  const db = getDb();
  const s = snapshot();
  const have = new Set((db.prepare('SELECT project_id FROM project_status').all() as { project_id: string }[]).map((r) => r.project_id));
  const missing = s.projects.filter((p) => !have.has(p.id) && isActive(s, p.id));
  if (!missing.length) return;
  const ins = db.prepare('INSERT OR IGNORE INTO project_status (project_id, stage, owner_id, industry, domain, open_to_collab, roles_needed, help_needed) VALUES (?,?,?,?,?,?,?,?)');
  db.transaction(() => {
    for (const p of missing) {
      const d = deriveStatus(s, p.id);
      ins.run(p.id, d.stage, d.owner_id, d.industry, d.domain, d.open, JSON.stringify(d.roles), d.help);
    }
  })();
}

export interface BuildCard {
  id: string; name: string; summary: string; year: number; teamType: string; teamName: string;
  stage: Stage; industry: string; domain: string; open: boolean; rolesNeeded: Role[]; helpNeeded: string;
  owner: { id: string; name: string; type: 'student' | 'alum'; label: string } | null;
  ownership: 'student' | 'alum' | 'mixed'; skills: string[]; teamSize: number; isStartup: boolean; teamIds: string[];
}

export function listBuilds(): BuildCard[] {
  ensureBuildStatus();
  const s = snapshot();
  const rows = getDb().prepare('SELECT * FROM project_status').all() as { project_id: string; stage: Stage; owner_id: string | null; industry: string; domain: string; open_to_collab: number; roles_needed: string; help_needed: string }[];
  return rows.filter((r) => s.project.has(r.project_id)).map((r) => {
    const p = s.project.get(r.project_id)!;
    const team = (s.membersOf.get(p.id) ?? []).filter((m) => m.role !== 'advisor').map((m) => s.person.get(m.person_id)!);
    const owner = r.owner_id ? s.person.get(r.owner_id) : undefined;
    const types = new Set(team.map((t) => t.type));
    return {
      id: p.id, name: p.name, summary: p.summary, year: p.year, teamType: p.team_type, teamName: p.team_name,
      stage: r.stage, industry: r.industry, domain: r.domain, open: !!r.open_to_collab, rolesNeeded: parseJson<Role[]>(r.roles_needed, []), helpNeeded: r.help_needed,
      owner: owner ? { id: owner.id, name: owner.name, type: owner.type, label: owner.type === 'alum' ? `alum '${String(owner.grad_year).slice(2)}` : 'student' } : null,
      ownership: (types.size > 1 ? 'mixed' : types.has('alum') ? 'alum' : 'student') as BuildCard['ownership'],
      skills: (s.projectSkillNames.get(p.id) ?? []).filter((k) => !DOMAINS.includes(k)).slice(0, 5),
      teamSize: team.length, isStartup: p.is_startup, teamIds: team.map((t) => t.id),
    };
  }).sort((a, b) => Number(b.open) - Number(a.open) || Number(b.isStartup) - Number(a.isStartup) || b.year - a.year || a.name.localeCompare(b.name));
}

export function buildFor(projectId: string): BuildCard | null {
  return listBuilds().find((b) => b.id === projectId) ?? null;
}

/** Owners (and team members) can update their build's stage, needs and openness. */
export function updateBuildStatus(viewerId: string, projectId: string, input: { stage: string; open: boolean; roles: string[]; help: string }) {
  const s = snapshot();
  if (!s.project.get(projectId)) throw new ActionError('Project not found.', 404);
  if (!(s.membersOf.get(projectId) ?? []).some((m) => m.person_id === viewerId && m.role !== 'advisor')) throw new ActionError('Only the team can update this build.', 403);
  if (!STAGES.includes(input.stage as Stage)) throw new ActionError('Pick a stage.');
  ensureBuildStatus();
  const db = getDb();
  if (!db.prepare('SELECT 1 FROM project_status WHERE project_id = ?').get(projectId)) {
    const d = deriveStatus(s, projectId);
    db.prepare('INSERT INTO project_status (project_id, stage, owner_id, industry, domain, open_to_collab, roles_needed, help_needed) VALUES (?,?,?,?,?,?,?,?)').run(projectId, d.stage, viewerId, d.industry, d.domain, 1, '[]', '');
  }
  db.prepare("UPDATE project_status SET stage = ?, open_to_collab = ?, roles_needed = ?, help_needed = ?, updated_at = datetime('now') WHERE project_id = ?")
    .run(input.stage, input.open ? 1 : 0, JSON.stringify(input.roles.filter((r) => ROLES.includes(r as Role))), input.help.trim().slice(0, 400), projectId);
  bumpDataVersion();
}
