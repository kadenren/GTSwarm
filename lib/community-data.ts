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
} as const;

/** Mentors who opted in, with what they help with (topics) and who they mentor. */
const MENTORS: { who: keyof typeof NAMES; topics: string[]; mentees: string[]; capacity: number; accepting: boolean; note: string }[] = [
  { who: 'samuel', topics: ['Engineering guidance', 'Career advice', 'Entrepreneurship'], mentees: ['students'], capacity: 3, accepting: true, note: 'Hardware prototyping budgets, supplier selection and first jobs in hardware.' },
  { who: 'priya', topics: ['Industry exploration', 'Career advice', 'Graduate school'], mentees: ['students', 'alumni'], capacity: 2, accepting: true, note: 'Medical devices, regulatory careers, and whether a master’s helps.' },
  { who: 'marcus', topics: ['Technical project guidance', 'Interview preparation', 'Engineering guidance'], mentees: ['students'], capacity: 2, accepting: true, note: 'Embedded firmware, BLE and firmware interviews.' },
  { who: 'grace', topics: ['Product management', 'Career advice', 'Interview preparation'], mentees: ['students', 'alumni'], capacity: 2, accepting: true, note: 'Moving into product management from engineering.' },
  { who: 'nadia', topics: ['Entrepreneurship', 'Engineering guidance'], mentees: ['students', 'alumni'], capacity: 1, accepting: true, note: 'Robotics startups and motor-control engineering.' },
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

const GROUPS: { id: string; name: string; description: string; category: string; access: 'open' | 'request'; eligibility: 'all' | 'students' | 'verified_alumni'; admin: keyof typeof NAMES; interests: string[]; members: (keyof typeof NAMES)[] }[] = [
  { id: 'group:g01', name: 'GT Robotics and Autonomous Systems', category: 'Shared interest', access: 'open', eligibility: 'all', admin: 'ravi',
    description: 'Students and alumni building robots, drones and autonomous vehicles. Project help, hiring and meetups.', interests: ['Robotics', 'ROS 2', 'LiDAR', 'Motor control', 'Autonomy'],
    members: ['ravi', 'nadia', 'isabel', 'kenji', 'noah'] },
  { id: 'group:g02', name: 'GT Alumni in Technology', category: 'Alumni', access: 'open', eligibility: 'verified_alumni', admin: 'grace',
    description: 'A professional community for verified alumni working in technology. Peer advice, job leads and industry dinners.', interests: ['Software', 'Hardware', 'Product management', 'Careers'],
    members: ['grace', 'kevin', 'omar', 'dana', 'noah', 'lauren'] },
  { id: 'group:g03', name: 'GT Startup Founders', category: 'Entrepreneurship', access: 'request', eligibility: 'all', admin: 'elena',
    description: 'Founders and would-be founders, student and alumni. Admins approve requests so conversations stay candid.', interests: ['Entrepreneurship', 'Fundraising', 'Customer discovery', 'Startups'],
    members: ['elena', 'nadia', 'tara', 'ravi', 'leo'] },
  { id: 'group:g04', name: 'GT Electrical and Computer Engineering Network', category: 'Professional', access: 'open', eligibility: 'all', admin: 'marcus',
    description: 'ECE students and alumni: firmware, hardware, power and signals. Shared across class years on purpose.', interests: ['Firmware', 'Embedded systems', 'PCB design', 'BLE', 'Low-power design'],
    members: ['marcus', 'dana', 'jordan', 'maya', 'sofia', 'lauren'] },
  { id: 'group:g05', name: 'GT Product and Entrepreneurship', category: 'Professional', access: 'open', eligibility: 'all', admin: 'grace',
    description: 'For anyone curious about product management, startups and turning engineering work into products.', interests: ['Product management', 'Customer discovery', 'Entrepreneurship'],
    members: ['grace', 'leo', 'mei', 'tara'] },
  { id: 'group:g06', name: 'GT Bay Area Alumni Professionals', category: 'Alumni', access: 'request', eligibility: 'verified_alumni', admin: 'kevin',
    description: 'Verified alumni in the San Francisco Bay Area. Restricted to verified alumni; admins approve requests.', interests: ['Careers', 'Software', 'Networking'],
    members: ['kevin', 'grace'] },
  { id: 'group:g07', name: 'GT First-Year Builders', category: 'Student', access: 'open', eligibility: 'students', admin: 'jordan',
    description: 'First- and second-year students finding their first project, team or mentor. Student-only.', interests: ['Projects', 'Mentorship', 'Firmware', 'Software'],
    members: ['jordan', 'mei', 'chloe'] },
];

const EVENTS: { id: string; title: string; description: string; organizer: string; group?: string; category: string; starts: string; ends: string; location: string; virtual?: boolean; audience: 'all' | 'students' | 'verified_alumni' | 'group'; capacity?: number; deadline?: string; interests: string[]; going: (keyof typeof NAMES)[] }[] = [
  { id: 'event:e01', title: 'Hardware Startup Night', organizer: 'GT Startup Founders (fictional demo event)', group: 'group:g03', category: 'Entrepreneurship',
    description: 'Founders demo prototypes; students and alumni meet teams that are hiring.', starts: '2026-12-03T18:00:00-05:00', ends: '2026-12-03T20:30:00-05:00', location: 'Demo venue, Midtown Atlanta', audience: 'all', capacity: 60, deadline: '2026-12-02', interests: ['Entrepreneurship', 'Hardware', 'Wearables', 'Startups'], going: ['elena', 'nadia', 'maya'] },
  { id: 'event:e02', title: 'Firmware Careers Panel', organizer: 'GT ECE Network (fictional demo event)', group: 'group:g04', category: 'Industry panel',
    description: 'Alumni firmware engineers on first jobs, interviews and what to learn before graduating.', starts: '2026-12-08T17:30:00-05:00', ends: '2026-12-08T19:00:00-05:00', location: 'Online', virtual: true, audience: 'all', capacity: 200, interests: ['Firmware', 'Embedded systems', 'Careers', 'BLE'], going: ['marcus', 'jordan'] },
  { id: 'event:e03', title: 'Alumni Founders Dinner', organizer: 'GT Alumni in Technology (fictional demo event)', group: 'group:g02', category: 'Alumni networking',
    description: 'A small dinner for verified alumni who are building or thinking about building companies. Location shared with registrants.', starts: '2026-12-10T19:00:00-05:00', ends: '2026-12-10T21:00:00-05:00', location: 'Private venue, Atlanta (shared after RSVP)', audience: 'verified_alumni', capacity: 3, deadline: '2026-12-07', interests: ['Entrepreneurship', 'Fundraising', 'Cofounders'], going: ['nadia', 'tara'] },
  { id: 'event:e04', title: 'First Project Mixer', organizer: 'GT First-Year Builders (fictional demo event)', group: 'group:g07', category: 'Student networking',
    description: 'First- and second-year students meet project teams and student mentors.', starts: '2026-12-01T18:00:00-05:00', ends: '2026-12-01T19:30:00-05:00', location: 'Demo venue, campus student center', audience: 'students', capacity: 80, interests: ['Projects', 'Mentorship', 'Software', 'Firmware'], going: ['mei', 'chloe'] },
  { id: 'event:e05', title: 'Product Management Workshop', organizer: 'GT Product and Entrepreneurship (fictional demo event)', group: 'group:g05', category: 'Workshop',
    description: 'Write a product spec from customer interviews, with alumni PMs giving feedback.', starts: '2027-01-14T18:00:00-05:00', ends: '2027-01-14T20:00:00-05:00', location: 'Online', virtual: true, audience: 'all', capacity: 40, interests: ['Product management', 'Customer discovery'], going: ['grace', 'mei'] },
  { id: 'event:e06', title: 'Robotics Industry Meetup', organizer: 'GT Robotics and Autonomous Systems (fictional demo event)', group: 'group:g01', category: 'Community meetup',
    description: 'Lightning talks from alumni robotics teams and student clubs, then open networking.', starts: '2027-01-21T18:30:00-05:00', ends: '2027-01-21T20:30:00-05:00', location: 'Demo venue, Atlanta', audience: 'all', capacity: 100, interests: ['Robotics', 'ROS 2', 'Autonomy', 'Motor control'], going: ['ravi', 'isabel', 'kenji'] },
  { id: 'event:e07', title: 'Bay Area Alumni Mixer', organizer: 'GT Bay Area Alumni Professionals (fictional demo event)', group: 'group:g06', category: 'Alumni networking',
    description: 'Group members only. Details are visible to members of the group.', starts: '2027-01-28T18:00:00-08:00', ends: '2027-01-28T20:00:00-08:00', location: 'San Francisco, CA (members only)', audience: 'group', capacity: 50, interests: ['Networking', 'Careers'], going: ['kevin'] },
];

/** Membership states for the demo: students are current students, alumni are verified by the (simulated) demo seed. */
const PENDING_ALUMNI: (keyof typeof NAMES)[] = ['amelia'];
const EXPECTED_GRADUATION: Partial<Record<keyof typeof NAMES, string>> = { sofia: '2026-12', maya: '2027-05', mei: '2029-05', jordan: '2027-05' };

/** Mentorship history: one active (Sofia ← Marcus), one waiting for Samuel. */
const MENTORSHIPS: { id: string; mentor: keyof typeof NAMES; mentee: keyof typeof NAMES; topic: string; message: string; status: 'requested' | 'active'; created: string }[] = [
  { id: 'mentorship:m001', mentor: 'marcus', mentee: 'sofia', topic: 'Technical project guidance', message: 'Could you help me debug power issues on my smart ring firmware?', status: 'active', created: '2026-03-02T15:00:00Z' },
  { id: 'mentorship:m002', mentor: 'samuel', mentee: 'jordan', topic: 'Career advice', message: 'I am choosing between a firmware internship and research next summer. Could we talk?', status: 'requested', created: '2026-11-10T14:30:00Z' },
];

export function seedCommunity(db: Database.Database) {
  const ids = new Map((db.prepare('SELECT id, name FROM people').all() as { id: string; name: string }[]).map((r) => [r.name, r.id]));
  const id = (k: keyof typeof NAMES) => { const v = ids.get(NAMES[k]); if (!v) throw new Error(`community seed: ${NAMES[k]} not found`); return v; };
  const projectId = (name: string) => (db.prepare('SELECT id FROM projects WHERE name = ? ORDER BY year DESC LIMIT 1').get(name) as { id: string } | undefined)?.id ?? null;
  const ts = `${DEMO_TODAY}T09:00:00Z`;

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
