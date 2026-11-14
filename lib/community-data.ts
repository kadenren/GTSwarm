import type Database from 'better-sqlite3';

/**
 * Fictional GT Swarm 2.0 community data: memberships, mentors, opportunities, groups, events and their relationships.
 * Every company, group, event and posting here is invented for the hackathon demo and is labeled as synthetic in the UI.
 * Deterministic (no randomness), so tests and the guided demo always see the same records.
 */

export const DEMO_TODAY = '2026-11-14';

/** People referenced by name so the data reads naturally; all are existing fictional demo profiles. */
const NAMES = {
  elena: 'Elena Brooks', dana: 'Dana Whitfield', maya: 'Maya Okafor', sofia: 'Sofia Alvarez', mei: 'Mei Ramirez',
  samuel: 'Samuel Grant', priya: 'Priya Natarajan', noah: 'Noah Bennett', amelia: 'Amelia Diallo', grace: 'Grace Liu',
  marcus: 'Marcus Reyes', nadia: 'Nadia Okoro', ravi: 'Ravi Krishnan', tara: 'Tara Holloway', hannah: 'Hannah Lee',
  kevin: 'Kevin Osei', jordan: 'Jordan Kim', arjun: 'Arjun Mehta', leo: 'Leo Martinez', isabel: 'Isabel Moreno',
  kenji: 'Kenji Watanabe', omar: 'Omar Haddad', lauren: 'Lauren Mitchell', daniel: 'Daniel Wu', chloe: 'Chloe Nguyen',
  quinn: 'Quinn Diallo', jamie: 'Jamie Keller', layla: 'Layla Dawson', ethant: 'Ethan Tanaka',
} as const;

/** Mentors who opted in, with what they help with (topics) and who they mentor. */
const MENTORS: { who: keyof typeof NAMES; topics: string[]; mentees: string[]; capacity: number; accepting: boolean; note: string }[] = [
  { who: 'samuel', topics: ['Engineering guidance', 'Career advice', 'Entrepreneurship'], mentees: ['students'], capacity: 3, accepting: true, note: 'Hardware prototyping budgets, supplier selection and first jobs in hardware.' },
  { who: 'priya', topics: ['Industry exploration', 'Career advice', 'Graduate school'], mentees: ['students', 'alumni'], capacity: 2, accepting: true, note: 'Medical devices, regulatory careers, and whether a master’s helps.' },
  { who: 'marcus', topics: ['Technical project guidance', 'Interview preparation', 'Engineering guidance'], mentees: ['students'], capacity: 2, accepting: true, note: 'Embedded firmware, BLE and firmware interviews.' },
  { who: 'grace', topics: ['Product management', 'Career advice', 'Interview preparation'], mentees: ['students', 'alumni'], capacity: 2, accepting: true, note: 'Moving into product management from engineering.' },
  { who: 'nadia', topics: ['Career advice', 'Engineering guidance', 'Entrepreneurship'], mentees: ['students', 'alumni'], capacity: 2, accepting: true, note: 'Careers in robotics, motor-control engineering and robotics startups.' },
  { who: 'quinn', topics: ['Career advice', 'Industry exploration'], mentees: ['students'], capacity: 2, accepting: true, note: 'Robotics careers at large companies vs startups. Based in Seattle.' },
  { who: 'tara', topics: ['Entrepreneurship', 'Research', 'Industry exploration'], mentees: ['students', 'alumni'], capacity: 2, accepting: true, note: 'Health AI, research-to-startup, hospital pilots.' },
  { who: 'kevin', topics: ['Interview preparation', 'Technical project guidance'], mentees: ['students'], capacity: 2, accepting: false, note: 'Mobile engineering. Not taking new mentees this semester.' },
];

type Opp = { id: string; kind: 'internship' | 'full-time' | 'part-time' | 'startup'; title: string; org: string; description: string; location: string; mode: string; skills: string[]; majors: string[]; audience: 'students' | 'alumni' | 'both'; class_years?: string; deadline?: string; poster?: keyof typeof NAMES; project?: string; status?: 'published' | 'pending'; published: string; expires: string };
const OPPORTUNITIES: Opp[] = [
  { id: 'opp:o001', kind: 'internship', title: 'Embedded Firmware Intern (Summer 2027)', org: 'Northline Wearables (fictional)', location: 'Atlanta, GA', mode: 'Hybrid',
    description: 'Write and test BLE firmware for a wrist-worn health sensor on nRF52 with Zephyr RTOS; profile power use and help ship an over-the-air update path.',
    skills: ['Firmware', 'BLE', 'nRF52', 'Zephyr RTOS', 'C'], majors: ['CmpE', 'EE', 'CS'], audience: 'students', class_years: '2026-2028', deadline: '2027-01-31', poster: 'samuel', published: '2026-10-20', expires: '2027-01-31' },
  { id: 'opp:o002', kind: 'internship', title: 'Robotics Software Intern', org: 'Peachtree Autonomy (fictional)', location: 'Atlanta, GA', mode: 'On-site',
    description: 'Build ROS 2 perception and navigation nodes for warehouse robots; work with LiDAR and motor controllers on real hardware.',
    skills: ['ROS 2', 'C++', 'LiDAR', 'Motor control', 'Python'], majors: ['ME', 'CS', 'CmpE', 'EE'], audience: 'students', class_years: '2027-2029', deadline: '2027-02-15', poster: 'nadia', published: '2026-10-28', expires: '2027-02-15' },
  { id: 'opp:o003', kind: 'internship', title: 'Product Management Intern', org: 'Brightline Health Apps (fictional)', location: 'Remote', mode: 'Remote',
    description: 'Run customer interviews with clinicians, write product requirements and work with engineers on a patient-monitoring app.',
    skills: ['Customer discovery', 'Product management', 'Medical devices'], majors: ['ISyE', 'CS', 'BME', 'Business'], audience: 'students', class_years: '2027-2029', deadline: '2027-01-15', poster: 'grace', published: '2026-11-01', expires: '2027-01-15' },
  { id: 'opp:o004', kind: 'internship', title: 'Medical Device Quality Intern', org: 'Ponce Medical Systems (fictional)', location: 'Atlanta, GA', mode: 'On-site',
    description: 'Support design controls, verification testing and ISO 13485 documentation for a wearable cardiac monitor.',
    skills: ['Quality systems', 'Medical devices', 'ISO 13485'], majors: ['BME', 'ME', 'ISyE'], audience: 'students', class_years: '2027-2028', deadline: '2026-10-01', poster: 'hannah', published: '2026-08-15', expires: '2026-10-01' },
  { id: 'opp:o005', kind: 'full-time', title: 'Senior Hardware Engineer, Wearables', org: 'Northline Wearables (fictional)', location: 'Atlanta, GA', mode: 'Hybrid',
    description: 'Lead low-power board design for a medical-grade wearable from prototype through manufacturing; mentor junior engineers.',
    skills: ['Low-power design', 'PCB design', 'Design for manufacturing', 'Wearables'], majors: ['EE', 'CmpE'], audience: 'alumni', poster: 'samuel', published: '2026-10-15', expires: '2027-01-15' },
  { id: 'opp:o006', kind: 'full-time', title: 'Regulatory Affairs Manager', org: 'Ponce Medical Systems (fictional)', location: 'Boston, MA', mode: 'Hybrid',
    description: 'Own FDA submissions for connected medical devices, from predicate strategy through 510(k) clearance.',
    skills: ['FDA regulatory', 'Medical devices', 'Clinical testing'], majors: ['BME'], audience: 'alumni', poster: 'priya', published: '2026-11-03', expires: '2027-02-01' },
  { id: 'opp:o007', kind: 'full-time', title: 'Product Manager, Clinical AI', org: 'Brightline Health Apps (fictional)', location: 'Remote', mode: 'Remote',
    description: 'Define the roadmap for an early-warning model used by hospital care teams; partner with ML engineers and clinicians.',
    skills: ['Product management', 'Machine learning and software', 'Customer discovery'], majors: ['CS', 'ISyE', 'BME'], audience: 'alumni', poster: 'grace', published: '2026-11-05', expires: '2027-01-31' },
  { id: 'opp:o008', kind: 'part-time', title: 'Part-time Firmware Consultant', org: 'Restwell Health', location: 'Remote', mode: 'Remote',
    description: 'Ten hours a week reviewing BLE connection handling and power states in the Restwell patch firmware.',
    skills: ['Firmware', 'BLE', 'nRF52', 'Power management'], majors: ['EE', 'CmpE'], audience: 'both', poster: 'elena', project: 'Restwell Patch', published: '2026-11-08', expires: '2027-01-08' },
  { id: 'opp:o009', kind: 'startup', title: 'Founding Robotics Engineer', org: 'Voltline Robotics', location: 'Atlanta, GA', mode: 'On-site',
    description: 'Join an alumni-founded warehouse robotics startup as an early engineer: motor control, ROS 2 and field testing.',
    skills: ['Motor control', 'ROS 2', 'STM32', 'C++'], majors: ['EE', 'ME', 'CmpE'], audience: 'both', poster: 'nadia', project: 'Voltline AMR', published: '2026-11-02', expires: '2027-02-02' },
  { id: 'opp:o010', kind: 'full-time', title: 'Field Applications Engineer', org: 'Midtown Semiconductor (fictional)', location: 'Austin, TX', mode: 'On-site',
    description: 'Help customers bring up embedded designs on low-power microcontrollers. Posted by an alum and waiting for moderator review.',
    skills: ['Embedded systems', 'Low-power design', 'C'], majors: ['EE', 'CmpE'], audience: 'alumni', poster: 'omar', status: 'pending', published: '2026-11-12', expires: '2027-01-12' },
];

/** Curated communities ("Swarm Circles"): Yellow Jackets with something in common. All are fictional demo communities. */
const GROUPS: { id: string; name: string; description: string; category: string; access: 'open' | 'request'; eligibility: 'all' | 'students' | 'verified_alumni'; admin: keyof typeof NAMES; interests: string[]; members: (keyof typeof NAMES)[] }[] = [
  { id: 'group:g01', name: 'AI & Robotics', category: 'Interest', access: 'open', eligibility: 'all', admin: 'ravi',
    description: 'Students and alumni interested in robotics, machine learning and autonomous systems.', interests: ['Robotics', 'Machine learning and software', 'ROS 2', 'Autonomy', 'LiDAR', 'Motor control'],
    members: ['ravi', 'nadia', 'isabel', 'kenji', 'quinn', 'tara'] },
  { id: 'group:g02', name: 'GT Alumni Professionals', category: 'Alumni', access: 'open', eligibility: 'verified_alumni', admin: 'grace',
    description: 'A professional community for verified alumni across industries: peer advice, job leads and dinners.', interests: ['Careers', 'Product management', 'Networking', 'Software', 'Hardware'],
    members: ['grace', 'kevin', 'omar', 'dana', 'lauren'] },
  { id: 'group:g03', name: 'Founders & Startups', category: 'Career', access: 'request', eligibility: 'all', admin: 'elena',
    description: 'Founders and people who want to build or join a startup. Admins approve requests so conversations stay candid.', interests: ['Entrepreneurship', 'Fundraising', 'Customer discovery', 'Startups'],
    members: ['elena', 'nadia', 'tara', 'ravi', 'leo'] },
  { id: 'group:g04', name: 'GT in Seattle', category: 'Location', access: 'open', eligibility: 'all', admin: 'jamie',
    description: 'Yellow Jackets who live in or are moving to the Seattle area and chose to share it.', interests: ['Seattle', 'Networking', 'Meetups'],
    members: ['jamie', 'quinn', 'layla', 'ethant'] },
  { id: 'group:g05', name: 'Healthcare & Biotech', category: 'Interest', access: 'open', eligibility: 'all', admin: 'priya',
    description: 'People in medical devices, digital health, biotech and clinical work, from any major.', interests: ['Medical devices', 'Wearables', 'FDA regulatory', 'Clinical testing', 'Healthcare'],
    members: ['priya', 'hannah', 'layla', 'daniel', 'maya'] },
  { id: 'group:g06', name: 'Early Career', category: 'Career stage', access: 'open', eligibility: 'all', admin: 'jordan',
    description: 'Students and recent graduates figuring out first jobs, internships and what comes next.', interests: ['Careers', 'Internships', 'Interview preparation', 'Mentorship'],
    members: ['jordan', 'mei', 'chloe', 'jamie', 'sofia'] },
];

const EVENTS: { id: string; title: string; description: string; organizer: string; group?: string; category: string; starts: string; ends: string; location: string; virtual?: boolean; audience: 'all' | 'students' | 'verified_alumni' | 'group'; capacity?: number; deadline?: string; interests: string[]; going: (keyof typeof NAMES)[] }[] = [
  { id: 'event:e01', title: 'Hardware Startup Night', organizer: 'Founders & Startups (fictional demo event)', group: 'group:g03', category: 'Entrepreneurship',
    description: 'Founders demo prototypes; students and alumni meet teams that are hiring.', starts: '2026-12-03T18:00:00-05:00', ends: '2026-12-03T20:30:00-05:00', location: 'Demo venue, Midtown Atlanta', audience: 'all', capacity: 60, deadline: '2026-12-02', interests: ['Entrepreneurship', 'Hardware', 'Wearables', 'Startups'], going: ['elena', 'nadia', 'maya'] },
  { id: 'event:e02', title: 'Robotics Careers Panel', organizer: 'AI & Robotics (fictional demo event)', group: 'group:g01', category: 'Career panel',
    description: 'Alumni in robotics and autonomy on first jobs, interviews and what to learn before graduating.', starts: '2026-12-08T17:30:00-05:00', ends: '2026-12-08T19:00:00-05:00', location: 'Online', virtual: true, audience: 'all', capacity: 200, interests: ['Robotics', 'Careers', 'Autonomy', 'Firmware'], going: ['ravi', 'isabel'] },
  { id: 'event:e03', title: 'Alumni Founders Dinner', organizer: 'GT Alumni Professionals (fictional demo event)', group: 'group:g02', category: 'Alumni networking',
    description: 'A small dinner for verified alumni who are building or thinking about building companies. Location shared with registrants.', starts: '2026-12-10T19:00:00-05:00', ends: '2026-12-10T21:00:00-05:00', location: 'Private venue, Atlanta (shared after RSVP)', audience: 'verified_alumni', capacity: 3, deadline: '2026-12-07', interests: ['Entrepreneurship', 'Fundraising', 'Cofounders'], going: ['nadia', 'tara'] },
  { id: 'event:e04', title: 'First Internship Mixer', organizer: 'Early Career (fictional demo event)', group: 'group:g06', category: 'Student networking',
    description: 'Students meet each other and talk about finding a first internship. Students only.', starts: '2026-12-01T18:00:00-05:00', ends: '2026-12-01T19:30:00-05:00', location: 'Demo venue, campus student center', audience: 'students', capacity: 80, interests: ['Internships', 'Careers', 'Mentorship'], going: ['mei', 'chloe'] },
  { id: 'event:e05', title: 'Product Management Workshop', organizer: 'Early Career (fictional demo event)', group: 'group:g06', category: 'Workshop',
    description: 'Write a product spec from customer interviews, with alumni product managers giving feedback.', starts: '2027-01-14T18:00:00-05:00', ends: '2027-01-14T20:00:00-05:00', location: 'Online', virtual: true, audience: 'all', capacity: 40, interests: ['Product management', 'Careers'], going: ['grace', 'mei'] },
  { id: 'event:e06', title: 'Healthcare Innovation Coffee', organizer: 'Healthcare & Biotech (fictional demo event)', group: 'group:g05', category: 'Community meetup',
    description: 'An informal coffee for people working on medical devices and digital health.', starts: '2027-01-21T08:30:00-05:00', ends: '2027-01-21T09:30:00-05:00', location: 'Demo venue, Atlanta', audience: 'all', capacity: 30, interests: ['Medical devices', 'Healthcare', 'Wearables'], going: ['priya', 'hannah'] },
  { id: 'event:e07', title: 'Seattle Yellow Jackets Meetup', organizer: 'GT in Seattle (fictional demo event)', group: 'group:g04', category: 'Community meetup',
    description: 'A casual evening for Yellow Jackets in the Seattle area. Newcomers welcome.', starts: '2027-01-28T18:00:00-08:00', ends: '2027-01-28T20:00:00-08:00', location: 'Demo venue, Capitol Hill, Seattle', audience: 'all', capacity: 40, interests: ['Seattle', 'Networking', 'Meetups'], going: ['jamie', 'quinn'] },
];

/** Membership states for the demo: students are current students, alumni are verified by the (simulated) demo seed. */
const PENDING_ALUMNI: (keyof typeof NAMES)[] = ['amelia'];
const EXPECTED_GRADUATION: Partial<Record<keyof typeof NAMES, string>> = { sofia: '2026-12', maya: '2027-05', mei: '2029-05', jordan: '2027-05' };

/** Mentorship history: one active (Sofia ← Marcus), one waiting for Samuel. */
const MENTORSHIPS: { id: string; mentor: keyof typeof NAMES; mentee: keyof typeof NAMES; topic: string; message: string; status: 'requested' | 'active'; created: string }[] = [
  { id: 'mentorship:m001', mentor: 'marcus', mentee: 'sofia', topic: 'Technical project guidance', message: 'Could you help me debug power issues on my smart ring firmware?', status: 'active', created: '2026-03-02T15:00:00Z' },
  { id: 'mentorship:m002', mentor: 'samuel', mentee: 'jordan', topic: 'Career advice', message: 'I am choosing between a firmware internship and research next summer. Could we talk?', status: 'requested', created: '2026-11-10T14:30:00Z' },
];

/** Contact preferences chosen by demo members. Everyone else defaults to open to students, alumni and collaboration. */
type Pref = { students?: boolean; alumni?: boolean; collab?: boolean; unavailable?: boolean; interests: string[]; canHelp?: string; interestedIn?: string };
const PREFS: Partial<Record<keyof typeof NAMES, Pref>> = {
  noah: { interests: ['Robotics', 'Seattle', 'Networking', 'Software'], canHelp: 'Robotics software and first jobs at startups', interestedIn: 'Meeting Yellow Jackets in Seattle after moving there' },
  kenji: { interests: ['Robotics', 'Autonomy', 'ROS 2'], canHelp: 'RoboJackets autonomy projects', interestedIn: 'Career advice from alumni working in robotics' },
  nadia: { interests: ['Robotics', 'Entrepreneurship', 'Motor control'], canHelp: 'Robotics careers, motor control, starting a hardware company', interestedIn: 'Students curious about robotics careers' },
  quinn: { interests: ['Robotics', 'Autonomy', 'Seattle'], canHelp: 'Robotics careers at big tech vs startups', interestedIn: 'Meeting students and Seattle-area alumni' },
  jamie: { interests: ['Seattle', 'Software', 'Networking', 'Careers'], canHelp: 'Moving to Seattle and early-career questions', interestedIn: 'Meeting new Yellow Jackets in Seattle' },
  layla: { interests: ['Healthcare', 'Medical devices', 'Seattle'], canHelp: 'Clinical engineering careers', interestedIn: 'Healthcare-minded alumni in the Pacific Northwest' },
  ethant: { interests: ['Seattle', 'Embedded systems', 'Software'], canHelp: 'Embedded software interviews', interestedIn: 'Seattle meetups' },
  ravi: { students: false, interests: ['Robotics', 'Autonomy', 'Entrepreneurship'], canHelp: 'Autonomous vehicles', interestedIn: 'Alumni cofounders (not taking student requests right now)' },
  kevin: { students: false, interests: ['Software', 'Careers'], interestedIn: 'Alumni networking only' },
  omar: { unavailable: true, interests: ['Embedded systems'], interestedIn: 'Not taking requests right now' },
  maya: { interests: ['Wearables', 'Firmware', 'Healthcare'], canHelp: 'Wearable firmware', interestedIn: 'Internships in wearables and startups that need firmware' },
  elena: { interests: ['Healthcare', 'Entrepreneurship', 'Wearables'], canHelp: 'Starting a medical device company', interestedIn: 'An alumni cofounder with hardware experience' },
  dana: { interests: ['Wearables', 'Hardware', 'Entrepreneurship'], canHelp: 'Low-power hardware and manufacturing', interestedIn: 'Cofounding a hardware startup' },
  sofia: { interests: ['Wearables', 'Firmware', 'Careers'], canHelp: 'Smart ring firmware', interestedIn: 'First job in hardware after graduating in December' },
  samuel: { interests: ['Hardware', 'Careers', 'Healthcare'], canHelp: 'Hardware careers and prototyping budgets', interestedIn: 'Mentoring students' },
  priya: { interests: ['Healthcare', 'Medical devices', 'FDA regulatory'], canHelp: 'FDA clearance and regulatory careers', interestedIn: 'Students and alumni in medical devices' },
};

export function seedCommunity(db: Database.Database) {
  const ids = new Map((db.prepare('SELECT id, name FROM people').all() as { id: string; name: string }[]).map((r) => [r.name, r.id]));
  const id = (k: keyof typeof NAMES) => { const v = ids.get(NAMES[k]); if (!v) throw new Error(`community seed: ${NAMES[k]} not found`); return v; };
  const projectId = (name: string) => (db.prepare('SELECT id FROM projects WHERE name = ? ORDER BY year DESC LIMIT 1').get(name) as { id: string } | undefined)?.id ?? null;
  const ts = `${DEMO_TODAY}T09:00:00Z`;
  // story: Noah, a recent alum, just moved to Seattle (fictional)
  db.prepare("UPDATE people SET city = 'Seattle' WHERE id = ?").run(id('noah'));
  const cp = db.prepare('INSERT OR REPLACE INTO contact_pref (person_id, open_to_students, open_to_alumni, open_to_collab, unavailable, share_city, interests, can_help, interested_in) VALUES (?,?,?,?,?,?,?,?,?)');
  for (const p of db.prepare('SELECT id FROM people WHERE claimed = 1').all() as { id: string }[]) cp.run(p.id, 1, 1, 1, 0, 1, '[]', '', '');
  for (const [k, v] of Object.entries(PREFS) as [keyof typeof NAMES, Pref][]) {
    cp.run(id(k), v.students === false ? 0 : 1, v.alumni === false ? 0 : 1, v.collab === false ? 0 : 1, v.unavailable ? 1 : 0, 1, JSON.stringify(v.interests), v.canHelp ?? '', v.interestedIn ?? '');
  }

  const people = db.prepare('SELECT id, type, grad_year, claimed FROM people').all() as { id: string; type: string; grad_year: number; claimed: number }[];
  const memb = db.prepare('INSERT OR REPLACE INTO membership (person_id, status, verified_source, verified_at, expected_graduation) VALUES (?,?,?,?,?)');
  const pending = new Set(PENDING_ALUMNI.map(id));
  for (const p of people.filter((x) => x.claimed)) {
    if (pending.has(p.id)) memb.run(p.id, 'ALUMNI_PENDING_VERIFICATION', null, null, null);
    else if (p.type === 'alum') memb.run(p.id, 'VERIFIED_ALUMNI', 'Demo seed (simulated verification)', '2026-09-01', null);
    else memb.run(p.id, 'CURRENT_STUDENT', null, null, `${p.grad_year}-05`);
  }
  for (const [k, v] of Object.entries(EXPECTED_GRADUATION)) db.prepare('UPDATE membership SET expected_graduation = ? WHERE person_id = ?').run(v, id(k as keyof typeof NAMES));
  db.prepare('INSERT INTO verification_request (id, person_id, kind, evidence, status, created_at) VALUES (?,?,?,?,?,?)')
    .run('verify:v001', id('amelia'), 'graduation', 'Graduated May 2025 (fictional demo request; awaiting an authorized reviewer)', 'pending', '2026-11-05T12:00:00Z');

  const mp = db.prepare('INSERT INTO mentor_profile (person_id, accepting, topics, mentees, capacity, contact, note) VALUES (?,?,?,?,?,?,?)');
  for (const m of MENTORS) mp.run(id(m.who), m.accepting ? 1 : 0, JSON.stringify(m.topics), JSON.stringify(m.mentees), m.capacity, 'In-app messages', m.note);
  const ms = db.prepare('INSERT INTO mentorship (id, mentor_id, mentee_id, topic, message, status, created_at, decided_at) VALUES (?,?,?,?,?,?,?,?)');
  for (const m of MENTORSHIPS) ms.run(m.id, id(m.mentor), id(m.mentee), m.topic, m.message, m.status, m.created, m.status === 'active' ? m.created : null);

  const op = db.prepare('INSERT INTO opportunity (id, kind, title, org, description, location, mode, skills, majors, audience, class_years, deadline, apply, posted_by, project_id, status, published_at, expires_at, synthetic) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)');
  for (const o of OPPORTUNITIES) {
    op.run(o.id, o.kind, o.title, o.org, o.description, o.location, o.mode, JSON.stringify(o.skills), JSON.stringify(o.majors), o.audience, o.class_years ?? '', o.deadline ?? null,
      'Synthetic demo posting: no real application exists', o.poster ? id(o.poster) : null, o.project ? projectId(o.project) : null, o.status ?? 'published', o.published, o.expires);
  }
  db.prepare('INSERT INTO saved_opportunity (person_id, opportunity_id, created_at) VALUES (?,?,?)').run(id('sofia'), 'opp:o005', ts);

  const gp = db.prepare('INSERT INTO community_group (id, name, description, category, access, eligibility, admin_id, interests) VALUES (?,?,?,?,?,?,?,?)');
  const gm = db.prepare('INSERT OR IGNORE INTO group_member (group_id, person_id, role, status, created_at) VALUES (?,?,?,?,?)');
  for (const g of GROUPS) {
    gp.run(g.id, g.name, g.description, g.category, g.access, g.eligibility, id(g.admin), JSON.stringify(g.interests));
    for (const m of g.members) gm.run(g.id, id(m), m === g.admin ? 'admin' : 'member', 'active', '2026-09-15T12:00:00Z');
  }
  gm.run('group:g03', id('dana'), 'member', 'pending', '2026-11-11T12:00:00Z'); // a request waiting for Elena (group admin)

  const ev = db.prepare('INSERT INTO community_event (id, title, description, organizer, group_id, category, starts_at, ends_at, timezone, location, virtual, audience, capacity, reg_deadline, interests) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const rs = db.prepare('INSERT INTO event_rsvp (event_id, person_id, status, created_at) VALUES (?,?,?,?)');
  for (const e of EVENTS) {
    ev.run(e.id, e.title, e.description, e.organizer, e.group ?? null, e.category, e.starts, e.ends, e.starts.endsWith('-08:00') ? 'America/Los_Angeles' : 'America/New_York', e.location, e.virtual ? 1 : 0, e.audience, e.capacity ?? null, e.deadline ?? null, JSON.stringify(e.interests));
    for (const p of e.going) rs.run(e.id, id(p), 'going', ts);
  }
}
