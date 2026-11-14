/**
 * Seeds data/gtswarm.db with fictional Georgia Tech-style data.
 * Deterministic: the same seed always produces the same graph.
 * Hero records win the demo queries only because their data genuinely matches best; the ranking code has no special cases.
 */
import fs from 'node:fs';
import { openDb, SEED_DB_PATH, DB_PATH, resetFromSeed } from '../lib/db';
import { loadEmbedder, embedTexts, toBlob, MODEL_ID } from '../lib/embed';
import { FIELDS, FIRST_NAMES, LAST_NAMES, CITIES, OUTCOMES, MAJOR_LABEL, type Field, type TeamType, type Role } from './seed-data';

// ---------- deterministic RNG ----------
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260315);
const rint = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const sample = <T,>(arr: readonly T[], n: number) => shuffle([...arr]).slice(0, n);
const pad = (n: number, w = 3) => String(n).padStart(w, '0');

// ---------- in-memory rows ----------
interface Person {
  id: string; name: string; type: 'student' | 'alum'; major: string; grad_year: number; current_role: string | null;
  company_type: string | null; city: string; bio: string; claimed: number; availability_hours: number; open_to: Role[];
  field: Field; fixedBio?: boolean;
}
interface Project {
  id: string; name: string; year: number; team_type: TeamType; team_name: string; summary: string; technologies: string[];
  outcome: string | null; is_startup: number; continued_from: string | null; field: Field; hero?: boolean;
}
interface Membership { person_id: string; project_id: string; role: 'builder' | 'advisor' | 'maintainer' | 'founder'; title: string | null }
interface Problem { id: string; project_id: string; description: string; solution: string; solved_by: string; created_at: string }
interface Connection { id: string; from_person: string; to_person: string; source: string; status: string; created_at: string }
interface Request { id: string; from_person: string; to_person: string; project_id: string | null; kind: string; role: string | null; message: string; status: string; created_at: string }
interface Milestone { id: string; project_id: string; title: string; date: string; confirmed_by: string | null }

const people: Person[] = [];
const projects: Project[] = [];
const members: Membership[] = [];
const problems: Problem[] = [];
const connections: Connection[] = [];
const requests: Request[] = [];
const milestones: Milestone[] = [];
const F = Object.fromEntries(FIELDS.map((f) => [f.key, f])) as Record<string, Field>;
const usedNames = new Set<string>();

function addPerson(p: Omit<Person, 'id' | 'claimed' | 'city'> & { claimed?: number; city?: string }): string {
  const id = `person:p${pad(people.length + 1)}`;
  usedNames.add(p.name);
  people.push({ claimed: 1, city: pick(CITIES), ...p, id });
  return id;
}
function addProject(p: Omit<Project, 'id' | 'is_startup' | 'outcome'> & { is_startup?: number; outcome?: string | null }): string {
  const id = `project:pr${pad(projects.length + 1)}`;
  const is_startup = p.is_startup ?? (p.team_type === 'Startup' || p.team_type === 'CREATE-X' ? 1 : 0);
  projects.push({ outcome: null, ...p, is_startup, id });
  return id;
}
function member(person_id: string, project_id: string, role: Membership['role'] = 'builder', title: string | null = null) {
  if (members.some((m) => m.person_id === person_id && m.project_id === project_id)) return;
  members.push({ person_id, project_id, role, title });
}
function addProblem(project_id: string, description: string, solution: string, solved_by: string) {
  const year = projects.find((p) => p.id === project_id)!.year;
  problems.push({ id: `problem:pb${pad(problems.length + 1)}`, project_id, description, solution, solved_by, created_at: `${year}-${pad(rint(2, 11), 2)}-15` });
}
function connect(from_person: string, to_person: string, source: string, created_at: string) {
  if (from_person === to_person) return;
  const dup = connections.some((c) => (c.from_person === from_person && c.to_person === to_person) || (c.from_person === to_person && c.to_person === from_person));
  if (dup && source === 'shared-project') return;
  if (dup && connections.some((c) => c.source !== 'shared-project' && ((c.from_person === from_person && c.to_person === to_person) || (c.from_person === to_person && c.to_person === from_person)))) return;
  connections.push({ id: `conn:c${pad(connections.length + 1, 4)}`, from_person, to_person, source, status: 'active', created_at });
}
function milestone(project_id: string, title: string, date: string, confirmed_by: string | null) {
  milestones.push({ id: `milestone:m${pad(milestones.length + 1)}`, project_id, title, date, confirmed_by });
}
function uniqueName(): string {
  for (;;) {
    const n = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    if (!usedNames.has(n)) return n;
  }
}

// =====================================================================
// 1. HERO RECORDS AND DECOYS (written so they genuinely match best)
// =====================================================================
const W = F.wearables, E = F.embedded, SW = F.software, AE = F.aerospace, ROB = F.robotics, MFG = F.manufacturing, PWR = F.power;

// PulseBand student team (the viewer is Leo)
const leo = addPerson({ name: 'Leo Martinez', type: 'student', major: 'Business', grad_year: 2026, current_role: 'Cofounder, PulseBand', company_type: 'student startup', city: 'Atlanta', field: W, fixedBio: true, availability_hours: 10, open_to: ['First customer', 'Helper'],
  bio: 'Scheller business student and cofounder of PulseBand. Leads customer discovery with Georgia Tech club athletes, pricing and the pitch for CREATE-X.' });
const aisha = addPerson({ name: 'Aisha Bello', type: 'student', major: 'BME', grad_year: 2027, current_role: 'Cofounder, PulseBand', company_type: 'student startup', city: 'Atlanta', field: W, fixedBio: true, availability_hours: 8, open_to: ['Helper'],
  bio: 'Biomedical engineering student working on heart rate variability algorithms and athlete studies for PulseBand.' });
const ryan = addPerson({ name: 'Ryan Cho', type: 'student', major: 'EE', grad_year: 2026, current_role: 'Cofounder, PulseBand', company_type: 'student startup', city: 'Atlanta', field: W, fixedBio: true, availability_hours: 8, open_to: ['Helper'],
  bio: 'Electrical engineering student doing PCB layout and enclosure fit for the PulseBand prototype.' });
const samuel = addPerson({ name: 'Samuel Grant', type: 'alum', major: 'EE', grad_year: 2009, current_role: 'Director of Hardware at a health tech company', company_type: 'health tech', city: 'Atlanta', field: W, fixedBio: true, availability_hours: 3, open_to: ['Advisor'],
  bio: 'Hardware engineering director who mentors CREATE-X teams on prototyping budgets and supplier selection.' });

// Dana Whitfield, hardware cofounder candidate
const dana = addPerson({ name: 'Dana Whitfield', type: 'alum', major: 'CmpE', grad_year: 2018, current_role: 'Hardware Engineering Lead at a consumer wearables startup', company_type: 'startup', city: 'Atlanta', field: W, fixedBio: true, availability_hours: 5, open_to: ['Cofounder', 'Advisor'],
  bio: 'Embedded hardware engineer who designs low-power embedded hardware and has shipped a product: led the low-power sensor boards for a consumer wearable from prototype through manufacturing to retail launch. Started on VIP Wearable Sensing in 2017 building low-power sensor boards. Wants to cofound an embedded hardware startup.' });
// Marcus Reyes, solved the BLE sleep problem
const marcus = addPerson({ name: 'Marcus Reyes', type: 'alum', major: 'EE', grad_year: 2020, current_role: 'Firmware Engineer at a medical device company', company_type: 'medical device', city: 'Raleigh', field: W, fixedBio: true, availability_hours: 3, open_to: ['Helper', 'Advisor'],
  bio: 'Firmware engineer focused on Bluetooth Low Energy connections and sleep-mode power management for battery-powered sensors.' });
// Priya Natarajan, FDA advisor
const priya = addPerson({ name: 'Priya Natarajan', type: 'alum', major: 'BME', grad_year: 2011, current_role: 'VP of Regulatory Affairs at a medical device company', company_type: 'medical device', city: 'Boston', field: W, fixedBio: true, availability_hours: 2, open_to: ['Advisor'],
  bio: 'Regulatory leader who led FDA 510(k) clearance for a wearable medical device, a cardiac monitoring patch, from design controls through FDA approval. Advises wearable medical device startups on FDA approval strategy, clinical testing and quality systems.' });
// Elena Brooks, alum founder
const elena = addPerson({ name: 'Elena Brooks', type: 'alum', major: 'ME', grad_year: 2015, current_role: 'Founder and CEO of a medical wearable startup', company_type: 'startup', city: 'Atlanta', field: W, fixedBio: true, availability_hours: 4, open_to: ['Advisor', 'Helper'],
  bio: 'Mechanical engineer turned founder, building Restwell Health, a medical wearable for post-surgical patients at home. Previously designed enclosures for consumer electronics.' });
const hannah = addPerson({ name: 'Hannah Lee', type: 'alum', major: 'BME', grad_year: 2012, current_role: 'Quality Engineering Manager at an implant company', company_type: 'medical device', city: 'Atlanta', field: W, fixedBio: true, availability_hours: 3, open_to: ['Advisor'],
  bio: 'Quality engineer for implantable medical devices who builds ISO 13485 quality systems and design history files.' });

// Three hero students with wearable firmware build records
const maya = addPerson({ name: 'Maya Okafor', type: 'student', major: 'CmpE', grad_year: 2026, current_role: null, company_type: null, city: 'Atlanta', field: W, fixedBio: true, availability_hours: 12, open_to: ['Early engineer', 'Helper'],
  bio: 'Computer engineering student who writes wearable firmware. Built the wearable firmware for a gait-tracking sensor in ECE Senior Design using Zephyr RTOS and BLE.' });
const jordan = addPerson({ name: 'Jordan Kim', type: 'student', major: 'EE', grad_year: 2027, current_role: null, company_type: null, city: 'Atlanta', field: W, fixedBio: true, availability_hours: 10, open_to: ['Early engineer'],
  bio: 'Electrical engineering student on VIP Wearable Sensing writing wearable firmware for a skin-temperature and heart-rate band.' });
const sofia = addPerson({ name: 'Sofia Alvarez', type: 'student', major: 'CmpE', grad_year: 2026, current_role: null, company_type: null, city: 'Atlanta', field: W, fixedBio: true, availability_hours: 12, open_to: ['Early engineer', 'Helper'],
  bio: 'Computer engineering student who built a smart ring wearable in the Invention Studio and wrote all of its wearable firmware, from sensor drivers to battery management.' });

// Decoys: partial matches so the ranking is a real test
const tom = addPerson({ name: 'Tom Brennan', type: 'alum', major: 'EE', grad_year: 2016, current_role: 'Senior Hardware Engineer at an industrial IoT company', company_type: 'industrial', field: E, fixedBio: true, availability_hours: 2, open_to: ['Advisor', 'Helper'],
  bio: 'Designs low-power embedded hardware for industrial sensor nodes used in research pilots.' });
const grace = addPerson({ name: 'Grace Liu', type: 'alum', major: 'CS', grad_year: 2017, current_role: 'Senior Product Manager at a consumer app company', company_type: 'big tech', field: SW, fixedBio: true, availability_hours: 3, open_to: ['Cofounder', 'Advisor'],
  bio: 'Product manager who has shipped a product to millions of users: launched two consumer mobile apps.' });
const omar = addPerson({ name: 'Omar Haddad', type: 'alum', major: 'CmpE', grad_year: 2019, current_role: 'Firmware Engineer at a consumer electronics company', company_type: 'consumer electronics', field: E, fixedBio: true, availability_hours: 2, open_to: ['Helper'],
  bio: 'Embedded firmware engineer working on smart speaker hardware at a large consumer electronics company.' });
const nina = addPerson({ name: 'Nina Petrov', type: 'alum', major: 'EE', grad_year: 2014, current_role: 'Hardware Lead at a smart home startup', company_type: 'startup', field: E, fixedBio: true, availability_hours: 2, open_to: ['Advisor'],
  bio: 'Hardware lead who shipped a smart home thermostat at a startup.' });
const ethan = addPerson({ name: 'Ethan Park', type: 'student', major: 'EE', grad_year: 2026, current_role: null, company_type: null, field: E, fixedBio: true, availability_hours: 8, open_to: ['Early engineer', 'Cofounder'],
  bio: 'Electrical engineering student building low-power sensor nodes for LoRa networks in the Embedded Systems Lab.' });
const kevin = addPerson({ name: 'Kevin Osei', type: 'alum', major: 'CmpE', grad_year: 2019, current_role: 'Mobile Engineer at a fitness tracker company', company_type: 'consumer electronics', field: W, fixedBio: true, availability_hours: 3, open_to: ['Helper'],
  bio: 'Mobile engineer who builds Android companion apps for fitness trackers.' });
const lauren = addPerson({ name: 'Lauren Mitchell', type: 'alum', major: 'EE', grad_year: 2021, current_role: 'Embedded Engineer at a cardiac monitoring company', company_type: 'medical device', field: W, fixedBio: true, availability_hours: 2, open_to: ['Helper'],
  bio: 'Embedded engineer who streams ECG data from wearable patches to phones.' });
const arjun = addPerson({ name: 'Arjun Mehta', type: 'student', major: 'CS', grad_year: 2027, current_role: null, company_type: null, field: W, fixedBio: true, availability_hours: 8, open_to: ['Early engineer', 'Helper'],
  bio: 'Computer science student building Android and watchOS companion apps for wearable devices.' });
const chloe = addPerson({ name: 'Chloe Nguyen', type: 'student', major: 'AE', grad_year: 2026, current_role: null, company_type: null, field: AE, fixedBio: true, availability_hours: 8, open_to: ['Early engineer'],
  bio: 'Aerospace student who writes flight controller firmware for drones in the Yellow Jacket Space Program.' });
const ben = addPerson({ name: 'Ben Foster', type: 'student', major: 'ME', grad_year: 2026, current_role: null, company_type: null, field: MFG, fixedBio: true, availability_hours: 6, open_to: ['Early engineer', 'Helper'],
  bio: 'Mechanical engineering student who designs enclosures and straps for wearable devices in the Invention Studio.' });
const rebecca = addPerson({ name: 'Rebecca Stone', type: 'alum', major: 'BME', grad_year: 2013, current_role: 'Clinical Research Manager at a pharmaceutical company', company_type: 'pharma', field: W, fixedBio: true, availability_hours: 2, open_to: ['Advisor'],
  bio: 'Clinical research manager who prepared FDA submissions for pharmaceutical drug trials.' });
const daniel = addPerson({ name: 'Daniel Wu', type: 'alum', major: 'BME', grad_year: 2016, current_role: 'Biomedical Engineer at a digital health startup', company_type: 'startup', field: W, fixedBio: true, availability_hours: 3, open_to: ['Helper', 'Advisor'],
  bio: 'Biomedical engineer designing wearable medical sensors at a digital health startup, focused on signal quality and comfort.' });
const victor = addPerson({ name: 'Victor Huang', type: 'alum', major: 'ME', grad_year: 2010, current_role: 'Principal Engineer at a surgical device company', company_type: 'medical device', field: W, fixedBio: true, availability_hours: 2, open_to: ['Advisor'],
  bio: 'Medical device mechanical engineer who designed catheter delivery systems.' });

// ---------- hero projects and lineages ----------
type Version = [number, string, string?]; // year, summary, outcome
function lineage(name: string, team_type: TeamType, team_name: string, field: Field, versions: Version[], techs: string[]): string[] {
  const ids: string[] = [];
  versions.forEach(([year, summary, outcome], i) => {
    ids.push(addProject({ name, year, team_type, team_name, summary, technologies: sample(techs, Math.min(techs.length, rint(3, 5))), outcome: outcome ?? pick(OUTCOMES), continued_from: i ? ids[i - 1] : null, field }));
  });
  return ids;
}

const ws2014 = addProject({ name: 'Wearable Sensing', year: 2014, team_type: 'VIP', team_name: 'VIP Wearable Sensing', field: W, continued_from: null, hero: true,
  summary: 'Early wrist-worn prototype that logged skin temperature to an SD card from an Arduino.', technologies: ['Arduino', 'Signal processing', 'Accelerometer'], outcome: 'Handed off to the next VIP cohort' });
const ws2017 = addProject({ name: 'Wearable Sensing', year: 2017, team_type: 'VIP', team_name: 'VIP Wearable Sensing', field: W, continued_from: ws2014, hero: true,
  summary: 'Low-power sensor boards for wrist-worn health monitoring, measuring heart rate and skin temperature on an nRF52 microcontroller with Bluetooth Low Energy.', technologies: ['nRF52', 'BLE', 'PCB design', 'PPG sensor', 'Low-power design'], outcome: 'Handed off to the next VIP cohort' });
const ws2024 = addProject({ name: 'Wearable Sensing', year: 2024, team_type: 'VIP', team_name: 'VIP Wearable Sensing', field: W, continued_from: ws2017, hero: true,
  summary: 'Skin-temperature and heart-rate band that reuses the 2017 sensor board, with new wearable firmware on Zephyr RTOS.', technologies: ['Zephyr RTOS', 'nRF52', 'BLE', 'Firmware'], outcome: 'Handed off to the next VIP cohort' });
const pulseband = addProject({ name: 'PulseBand', year: 2025, team_type: 'Startup', team_name: 'PulseBand', field: W, continued_from: ws2017, hero: true,
  summary: 'Student startup building a wearable health sensor band that tracks heart rate variability and recovery for college athletes, continuing the VIP Wearable Sensing hardware.', technologies: ['nRF52', 'BLE', 'PPG sensor', 'React Native', 'PCB design'], outcome: 'Accepted into CREATE-X Startup Launch' });
const lumen = addProject({ name: 'Lumen Band', year: 2021, team_type: 'Startup', team_name: 'Lumen Wearables', field: W, continued_from: null, hero: true,
  summary: 'Consumer fitness wearable with a seven-day battery; the team took its low-power embedded hardware from prototype to a shipped product sold in retail stores.', technologies: ['nRF52', 'Low-power design', 'Design for manufacturing', 'BLE'], outcome: 'Shipped product: 40,000 units sold' });
const sleepwell = addProject({ name: 'SleepWell Tracker', year: 2020, team_type: 'Capstone', team_name: 'ECE Senior Design', field: W, continued_from: null, hero: true,
  summary: 'Wrist sleep tracker that streams motion and heart rate to a phone over Bluetooth Low Energy from an nRF52 microcontroller.', technologies: ['nRF52', 'BLE', 'Accelerometer', 'Firmware'], outcome: 'Won best in track at the Capstone Expo' });
const ecg2011 = addProject({ name: 'Ambulatory ECG Monitor', year: 2011, team_type: 'Capstone', team_name: 'BME Capstone', field: W, continued_from: null, hero: true,
  summary: 'Wearable ECG monitor for cardiac patients at home, built with design controls and patient safety testing.', technologies: ['ECG', 'Signal processing', 'Design controls'], outcome: 'Demoed at the Capstone Expo' });
const vitaltag = addProject({ name: 'VitalTag', year: 2019, team_type: 'CREATE-X', team_name: 'CREATE-X Startup Launch', field: W, continued_from: null, hero: true,
  summary: 'Adhesive vital-signs tag for emergency department triage.', technologies: ['ECG', 'BLE', 'FDA regulatory', 'Medical devices'], outcome: 'Raised a pre-seed round' });
const restwell = addProject({ name: 'Restwell Patch', year: 2024, team_type: 'Startup', team_name: 'Restwell Health', field: W, continued_from: null, hero: true,
  summary: 'Medical wearable patch that monitors post-surgical patients at home and alerts care teams. The alumni founding team is hiring wearable firmware engineers to make its nRF52 BLE firmware last a full week on one charge.', technologies: ['Medical devices', 'BLE', 'PPG sensor', 'Firmware', 'nRF52', 'Injection molding'], outcome: 'Pilot with two Atlanta hospitals' });
const elenaCap = addProject({ name: 'Ergonomic Power Tool Grip', year: 2015, team_type: 'Capstone', team_name: 'ME Capstone', field: MFG, continued_from: null, hero: true,
  summary: 'Vibration-damping grip for handheld power tools, injection molded and tested with trade workers.', technologies: ['SolidWorks', 'Injection molding', 'Design for manufacturing'], outcome: 'Demoed at the Capstone Expo' });
const stride = addProject({ name: 'StrideSense Gait Wearable', year: 2025, team_type: 'Capstone', team_name: 'ECE Senior Design', field: W, continued_from: null, hero: true,
  summary: 'Ankle-worn gait sensor; wearable firmware on Zephyr RTOS samples an IMU and streams steps over BLE.', technologies: ['Zephyr RTOS', 'nRF52', 'BLE', 'Accelerometer', 'Firmware'], outcome: 'Demoed at the Capstone Expo' });
const ring = addProject({ name: 'Smart Ring Prototype', year: 2025, team_type: 'Invention Studio', team_name: 'Invention Studio', field: W, continued_from: null, hero: true,
  summary: 'Heart-rate smart ring with custom wearable firmware, a flexible PCB and a wireless charger.', technologies: ['Firmware', 'PPG sensor', 'Flexible PCB', 'Battery management'], outcome: 'Shown at the Invention Studio showcase' });
const lora = addProject({ name: 'Campus LoRa Sensor Nodes', year: 2025, team_type: 'Lab', team_name: 'Embedded Systems Lab', field: E, continued_from: null, hero: true,
  summary: 'Solar-powered LoRa sensor nodes that report building temperatures across campus.', technologies: ['LoRa', 'STM32', 'Low-power design', 'C'], outcome: null });
const trackerApp = addProject({ name: 'Fitness Tracker Companion App', year: 2018, team_type: 'Capstone', team_name: 'CS Junior Design', field: W, continued_from: null, hero: true,
  summary: 'Android companion app for a fitness tracker with Bluetooth pairing and data sync.', technologies: ['Kotlin', 'BLE', 'Android'], outcome: null });
const ecgStream = addProject({ name: 'ECG Patch Streaming', year: 2021, team_type: 'Lab', team_name: 'Medical Device Lab', field: W, continued_from: null, hero: true,
  summary: 'Streams raw ECG from a wearable patch to a phone for arrhythmia research.', technologies: ['ECG', 'BLE', 'nRF52'], outcome: 'Published at an IEEE conference' });
const watchApp = addProject({ name: 'Recovery Watch App', year: 2025, team_type: 'Club', team_name: 'Big Data Big Impact', field: SW, continued_from: null, hero: true,
  summary: 'Watch and phone app that shows sleep and recovery scores from wearable data.', technologies: ['Kotlin', 'Swift', 'React Native'], outcome: null });
const thermostat = addProject({ name: 'Smart Thermostat', year: 2013, team_type: 'Capstone', team_name: 'ECE Senior Design', field: E, continued_from: null, hero: true,
  summary: 'Learning thermostat prototype with occupancy sensing.', technologies: ['Embedded Linux', 'C', 'PCB design'], outcome: 'Demoed at the Capstone Expo' });

// memberships for hero projects (explicit, generic people are not added to these)
for (const s of [leo, aisha, ryan]) member(s, pulseband, 'founder', 'Cofounder');
member(samuel, pulseband, 'advisor', 'Advisor');
member(dana, ws2017, 'builder'); member(dana, lumen, 'builder', 'Hardware lead'); member(dana, ws2024, 'advisor', 'Advisor');
member(marcus, sleepwell, 'builder');
member(priya, ecg2011, 'builder'); member(priya, vitaltag, 'advisor', 'Regulatory advisor');
member(elena, restwell, 'founder', 'Founder and CEO'); member(elena, elenaCap, 'builder');
member(hannah, restwell, 'advisor', 'Quality advisor');
member(maya, stride, 'builder'); member(chloe, stride, 'builder');
member(jordan, ws2024, 'builder'); member(arjun, ws2024, 'builder');
member(sofia, ring, 'builder'); member(ben, ring, 'builder');
member(ethan, lora, 'builder'); member(tom, lora, 'advisor', 'Advisor');
member(kevin, trackerApp, 'builder'); member(lauren, ecgStream, 'builder'); member(daniel, ecgStream, 'builder');
member(arjun, watchApp, 'builder'); member(nina, thermostat, 'builder');

// hero problems
addProblem(ws2017, 'Sensor board battery drained in under a day', 'Redesigned the power tree around a low-quiescent LDO, power-gated the PPG sensor between readings and cut sleep current to 9 microamps.', dana);
addProblem(lumen, 'Wearable failed drop tests and had low yield when scaling to mass production', 'Ran a design for manufacturing review with the contract manufacturer, added a bed-of-nails test fixture and reinforced the board mounts before production.', dana);
addProblem(sleepwell, 'Bluetooth Low Energy connection drops when the MCU enters sleep mode', 'The 32 kHz low-frequency clock stopped in deep sleep, so the radio missed connection events. Kept the crystal running in System ON sleep, raised the BLE supervision timeout to 4 seconds and woke the MCU on the radio event instead of a timer.', marcus);
addProblem(vitaltag, 'Preparing an FDA 510(k) submission for a wearable medical device', 'Picked a predicate device early, ran IEC 60601 electrical safety and ISO 10993 biocompatibility testing in parallel and held an FDA pre-submission meeting to agree on the test plan before filing the 510(k).', priya);
addProblem(stride, 'Wearable firmware missed IMU samples during BLE transmissions', 'Moved sampling to a DMA-driven timer interrupt and buffered samples in a ring buffer drained by the BLE task.', maya);
addProblem(ws2024, 'Wearable firmware reported the wrong skin temperature after charging', 'Compensated for charger self-heating with a thermal model and delayed readings for ten minutes after unplugging.', jordan);
addProblem(ring, 'Smart ring firmware reset when the battery voltage dipped during heart-rate bursts', 'Enabled the brownout detector with a lower threshold, staggered LED pulses and added a supercapacitor on the sensor rail.', sofia);
addProblem(trackerApp, 'BLE pairing fails on some Android phones', 'Handled bonding explicitly in the app and retried the connection after GATT error 133.', kevin);
addProblem(ecgStream, 'BLE throughput too low for raw ECG streaming', 'Negotiated the 2M PHY and a larger MTU and packed several samples into each notification.', lauren);
addProblem(watchApp, 'Sensor readings drift after the watch wakes from sleep mode', 'Added a settling delay and recalibrated the ADC offset after each wake.', arjun);
addProblem(restwell, 'Patch adhesive peels off after two days on post-surgical patients', 'Switched to a breathable silicone adhesive and rounded the patch corners.', elena);
addProblem(pulseband, 'Athletes forgot to charge the band before practice', 'Added a low-battery reminder in the app and a magnetic charging dock in the locker room.', leo);

// hero lineage + milestones
milestone(pulseband, 'First working prototype on the 2017 sensor board', '2025-03-14', samuel);
milestone(pulseband, 'Accepted into CREATE-X Startup Launch', '2025-05-20', samuel);
milestone(pulseband, 'Pilot with 12 Georgia Tech club athletes', '2025-10-02', null);
milestone(ws2017, 'Sleep current under 10 microamps', '2017-11-10', null);
milestone(lumen, 'Shipped to retail stores', '2022-09-01', null);
milestone(restwell, 'Hospital pilot agreement signed', '2025-02-11', hannah);
milestone(stride, 'Capstone Expo demo', '2025-12-04', null);

// =====================================================================
// 2. LINEAGES (10+ chains of 2 to 4 versions)
// =====================================================================
const lineages: string[][] = [[ws2014, ws2017, ws2024], [ws2017, pulseband]];
lineages.push(lineage('Solar Racer', 'Club', 'Solar Racing Club', PWR, [
  [2013, 'First solar car built by the club, with a hand-laid fiberglass shell and lead-acid batteries.'],
  [2016, 'Second solar car with a lithium-ion pack, a new maximum power point tracker and a carbon fiber chassis.'],
  [2019, 'Solar car with in-wheel motors and live telemetry to the chase vehicle.', 'Placed in the top 10 at national competition'],
  [2023, 'Lightweight solar car with a custom battery management system and aerodynamic redesign.', 'Placed in the top 10 at national competition'],
], ['Solar arrays', 'Battery management', 'Motor control', 'CAN bus', 'Composites']));
lineages.push(lineage('CubeSat Power System', 'VIP', 'VIP Space Systems Design', AE, [
  [2014, 'Electrical power system for a 1U CubeSat with solar panels and a small battery.'],
  [2018, 'Redesigned CubeSat power board with peak power tracking and radiation-tolerant parts.'],
  [2022, '3U CubeSat power system that flew on a student mission and logged two years of telemetry.', 'Launched to orbit'],
], ['CubeSat', 'Solar arrays', 'Battery management', 'PCB design', 'Thermal vacuum testing']));
lineages.push(lineage('Assistive Robot Arm', 'VIP', 'VIP Robotic Manipulation', ROB, [
  [2015, 'Wheelchair-mounted robot arm controlled by a joystick for people with limited mobility.'],
  [2019, 'Assistive arm with vision-based grasping of cups and utensils.'],
  [2024, 'Assistive arm with voice commands, tested with occupational therapists.', 'Pilot with a rehabilitation hospital'],
], ['ROS 2', 'Motor control', 'OpenCV', 'C++', 'SolidWorks']));
lineages.push(lineage('Campus Microgrid Controller', 'VIP', 'VIP Smart Grid', F.energy, [
  [2016, 'Supervisory controller for a campus solar and battery microgrid.'],
  [2020, 'Microgrid controller that islands the research building during outages.'],
  [2025, 'Microgrid controller with price-aware battery dispatch.'],
], ['PLC', 'Modbus', 'Python', 'Battery storage', 'Solar PV']));
lineages.push(lineage('Rocket Avionics', 'Club', 'Yellow Jacket Space Program', AE, [
  [2017, 'Flight computer for a student sounding rocket with dual deployment.'],
  [2021, 'Avionics bay with redundant flight computers and live GPS telemetry.'],
  [2025, 'Avionics for a 30,000-foot rocket with active roll control.'],
], ['Flight software', 'STM32', 'PCB design', 'GPS', 'Kalman filter']));
lineages.push(lineage('Myoelectric Prosthetic Hand', 'Capstone', 'BME Capstone', W, [
  [2016, 'Low-cost 3D-printed prosthetic hand driven by forearm muscle signals.'],
  [2020, 'Prosthetic hand with individual finger control and grip pattern learning.'],
  [2024, 'Prosthetic hand fitted for two pediatric patients with a clinic partner.', 'Fitted for two patients'],
], ['EMG', '3D printing', 'Signal processing', 'Motor control']));
lineages.push(lineage('Smart Irrigation Controller', 'VIP', 'VIP Internet of Things', E, [
  [2018, 'Soil-moisture irrigation controller for campus green spaces.'],
  [2022, 'Irrigation controller with weather forecasts and LoRa sensors that cut water use by 30 percent.', 'Pilot with Georgia Tech Facilities'],
], ['ESP32', 'LoRa', 'MQTT', 'Python']));
lineages.push(lineage('Mars Rover Prototype', 'Club', 'RoboJackets', ROB, [
  [2012, 'Six-wheeled rover prototype for the University Rover Challenge.'],
  [2015, 'Rover with a robotic arm and autonomous waypoint navigation.'],
  [2018, 'Rover with a soil sampling drill and stereo cameras.', 'Placed in the top 10 at national competition'],
], ['ROS 2', 'LiDAR', 'Motor control', 'SolidWorks']));
lineages.push(lineage('Lower-Limb Exoskeleton', 'Lab', 'Mobile Robotics Lab', ROB, [
  [2019, 'Powered knee exoskeleton that assists stair climbing.'],
  [2023, 'Hip and knee exoskeleton with gait-phase detection.'],
  [2026, 'Lightweight exoskeleton tested with older adults in a community center.'],
], ['Motor control', 'Accelerometer', 'Embedded C', 'SolidWorks']));
lineages.push(lineage('Formula EV Battery Pack', 'Club', 'Formula EV Club', PWR, [
  [2014, 'First battery pack for the Formula electric race car.'],
  [2018, 'Liquid-cooled battery pack with a new battery management system.'],
  [2022, 'Battery pack with improved thermal design that finished the endurance event.', 'Placed in the top 10 at national competition'],
], ['Battery management', 'CAN bus', 'Altium', 'Thermal design']));

// =====================================================================
// 3. GENERIC PEOPLE AND PROJECTS
// =====================================================================
const TEAM_TYPE_WEIGHTS: [TeamType, number][] = [['VIP', 25], ['Capstone', 30], ['Club', 12], ['Lab', 13], ['Invention Studio', 8], ['CREATE-X', 9], ['Startup', 3]];
function pickTeamType(field: Field): TeamType {
  for (;;) {
    let r = rng() * 100;
    for (const [t, w] of TEAM_TYPE_WEIGHTS) { if ((r -= w) < 0) { if (field.teams[t]) return t; break; } }
  }
}
const FIELD_WEIGHTS = { robotics: 16, power: 11, wearables: 12, embedded: 14, aerospace: 13, energy: 10, software: 15, manufacturing: 9 } as Record<string, number>;
function pickField(): Field {
  let r = rng() * 100;
  for (const f of FIELDS) { if ((r -= FIELD_WEIGHTS[f.key]) < 0) return f; }
  return FIELDS[0];
}

const TARGET_PROJECTS = 150;
const usedProjectKey = new Set(projects.map((p) => `${p.name}|${p.year}`));
while (projects.length < TARGET_PROJECTS) {
  const field = pickField();
  const [name, summary] = pick(field.projects);
  const year = rint(2012, 2026);
  if (usedProjectKey.has(`${name}|${year}`)) continue;
  usedProjectKey.add(`${name}|${year}`);
  const team_type = pickTeamType(field);
  const team_name = team_type === 'Startup' ? `${name.split(' ')[0]} Labs` : pick(field.teams[team_type]!);
  addProject({ name, year, team_type, team_name, summary, technologies: sample(field.techs, rint(3, 5)), outcome: team_type === 'CREATE-X' || team_type === 'Startup' ? pick(['Raised a pre-seed round', 'Accepted into CREATE-X Startup Launch', 'First paying customer', null]) : pick(OUTCOMES), continued_from: null, field });
}

const TARGET_ALUMNI = 150, TARGET_STUDENTS = 70;
const countType = (t: string) => people.filter((p) => p.type === t).length;
function genericPerson(type: 'student' | 'alum') {
  const field = pickField();
  const major = rng() < 0.06 ? 'Business' : pick(field.majors);
  const grad_year = type === 'student' ? rint(2026, 2029) : rint(2008, 2025);
  const opts: Role[] = type === 'student'
    ? sample(['Early engineer', 'Helper', 'Cofounder', 'First customer'] as Role[], rint(1, 2))
    : sample(['Advisor', 'Helper', 'Cofounder', 'First customer'] as Role[], rint(1, 2));
  addPerson({ name: uniqueName(), type, major, grad_year, current_role: type === 'alum' ? pick(field.roles) : null, company_type: type === 'alum' ? pick(field.companyTypes) : null,
    bio: '', claimed: rng() < 0.9 ? 1 : 0, availability_hours: rint(1, 8), open_to: opts, field });
}
while (countType('alum') < TARGET_ALUMNI) genericPerson('alum');
while (countType('student') < TARGET_STUDENTS) genericPerson('student');

const heroProjectIds = new Set(projects.filter((p) => p.hero).map((p) => p.id));
const genericProjects = projects.filter((p) => !p.hero);
const genericPeople = people.filter((p) => !p.fixedBio);
const inWindow = (p: Person, year: number) => p.grad_year >= year && p.grad_year <= year + 3;

// builders for lineage and generic projects
for (const proj of genericProjects) {
  const n = rint(2, 5);
  const pool = genericPeople.filter((p) => inWindow(p, proj.year));
  const same = shuffle(pool.filter((p) => p.field.key === proj.field.key));
  const other = shuffle(pool.filter((p) => p.field.key !== proj.field.key));
  const chosen = [...same.slice(0, Math.ceil(n * 0.75)), ...other].slice(0, n);
  const role = proj.is_startup ? 'founder' : 'builder';
  chosen.forEach((p) => member(p.id, proj.id, role, proj.is_startup ? 'Cofounder' : null));
  if (rng() < 0.45) {
    const advisors = genericPeople.filter((p) => p.type === 'alum' && p.grad_year <= proj.year - 3 && p.field.key === proj.field.key);
    if (advisors.length) member(pick(advisors).id, proj.id, 'advisor', 'Advisor');
  }
  if (rng() < 0.08 && proj.year < 2024) {
    const maint = pool.filter((p) => !chosen.includes(p));
    if (maint.length) member(pick(maint).id, proj.id, 'maintainer');
  }
}
// generic builders for hero lineage projects that have no team yet (Wearable Sensing 2014, plus co-builders)
const coBuild = (projId: string, n: number, fieldKey: string) => {
  const proj = projects.find((p) => p.id === projId)!;
  const pool = shuffle(genericPeople.filter((p) => inWindow(p, proj.year) && p.field.key === fieldKey));
  pool.slice(0, n).forEach((p) => member(p.id, projId, proj.is_startup ? 'founder' : 'builder', proj.is_startup ? 'Cofounder' : null));
};
coBuild(ws2014, 3, 'wearables'); coBuild(ws2017, 2, 'wearables'); coBuild(sleepwell, 2, 'embedded'); coBuild(ecg2011, 2, 'wearables');
coBuild(vitaltag, 3, 'wearables'); coBuild(elenaCap, 2, 'manufacturing'); coBuild(trackerApp, 1, 'software'); coBuild(thermostat, 2, 'embedded');
// startup teammates (alumni after graduation)
const alumTeam = (projId: string, n: number, fieldKey: string, minGrad: number, maxGrad: number) => {
  const pool = shuffle(genericPeople.filter((p) => p.type === 'alum' && p.field.key === fieldKey && p.grad_year >= minGrad && p.grad_year <= maxGrad));
  pool.slice(0, n).forEach((p) => member(p.id, projId, 'builder'));
};
alumTeam(lumen, 2, 'embedded', 2014, 2020); alumTeam(restwell, 2, 'wearables', 2014, 2022);
{
  const extra = people.find((p) => !p.fixedBio && p.type === 'student' && p.grad_year <= 2027 && p.field.key === 'embedded');
  if (extra) member(extra.id, stride, 'builder');
}

// anyone without a project joins one in their window (or advises one)
for (const p of genericPeople) {
  if (members.some((m) => m.person_id === p.id)) continue;
  let cands = genericProjects.filter((pr) => inWindow(p, pr.year) && pr.field.key === p.field.key);
  if (!cands.length) cands = genericProjects.filter((pr) => inWindow(p, pr.year));
  if (cands.length) { const pr = pick(cands); member(p.id, pr.id, pr.is_startup ? 'founder' : 'builder', pr.is_startup ? 'Cofounder' : null); continue; }
  const adv = genericProjects.filter((pr) => pr.year >= p.grad_year + 2 && pr.field.key === p.field.key);
  member(p.id, pick(adv.length ? adv : genericProjects.filter((pr) => pr.year >= p.grad_year + 2)).id, 'advisor', 'Advisor');
}

// generic problems (1 to 3 per project)
for (const proj of genericProjects) {
  const builders = members.filter((m) => m.project_id === proj.id && m.role !== 'advisor');
  if (!builders.length) continue;
  for (const [d, s] of sample(proj.field.problems, rint(1, 3))) addProblem(proj.id, d, s, pick(builders).person_id);
}
// a second problem on Wearable Sensing 2014 to keep the lineage rich
{
  const b = members.filter((m) => m.project_id === ws2014)[0];
  if (b) addProblem(ws2014, 'Temperature logger lost data when the SD card filled up', 'Rotated log files daily and compressed readings to deltas.', b.person_id);
}

// generic bios from real project memberships
for (const p of genericPeople) {
  const myProjects = members.filter((m) => m.person_id === p.id).map((m) => ({ m, pr: projects.find((x) => x.id === m.project_id)! }));
  const built = myProjects.filter((x) => x.m.role !== 'advisor').map((x) => `${x.pr.name} (${x.pr.team_name}, ${x.pr.year})`);
  const advised = myProjects.filter((x) => x.m.role === 'advisor').map((x) => `${x.pr.name} (${x.pr.year})`);
  const lead = p.type === 'alum'
    ? `${MAJOR_LABEL[p.major]} alum, now ${p.current_role!.charAt(0).toLowerCase()}${p.current_role!.slice(1)}.`
    : `${MAJOR_LABEL[p.major]} student interested in ${pick(p.field.interests)}.`;
  const parts = [lead];
  if (built.length) parts.push(`Built ${built.join(' and ')}.`);
  if (advised.length) parts.push(`Advised ${advised.join(' and ')}.`);
  if (p.type === 'alum') parts.push(`Interested in ${pick(p.field.interests)}.`);
  p.bio = parts.join(' ');
}

// =====================================================================
// 3b. ACTIVE BUILDS (startup exchange): alumni- and student-founded projects looking for collaborators.
// Every value is fixed (no RNG calls), so the generated network above is unchanged.
// =====================================================================
const fixedProblem = (project_id: string, description: string, solution: string, solved_by: string, created_at: string) =>
  problems.push({ id: `problem:pb${pad(problems.length + 1)}`, project_id, description, solution, solved_by, created_at });
const firstGeneric = (fieldKey: string, type: 'alum' | 'student', skip = 0) =>
  genericPeople.filter((p) => p.field.key === fieldKey && p.type === type && p.claimed)[skip]?.id;

const nadia = addPerson({ name: 'Nadia Okoro', type: 'alum', major: 'EE', grad_year: 2012, current_role: 'Founder and CEO of Voltline Robotics', company_type: 'startup', city: 'Atlanta', field: ROB, fixedBio: true, availability_hours: 4, open_to: ['Cofounder', 'Advisor'],
  bio: 'Robotics founder building autonomous mobile robots for warehouses. Previously led motor control firmware for industrial robots. Hiring student embedded engineers who like motor control and ROS 2.' });
const carlos = addPerson({ name: 'Carlos Medina', type: 'alum', major: 'AE', grad_year: 2014, current_role: 'Founder of Skyward Avionics', company_type: 'startup', city: 'Huntsville', field: AE, fixedBio: true, availability_hours: 3, open_to: ['Cofounder', 'Advisor'],
  bio: 'Aerospace engineer building an autopilot for agricultural survey drones. Wrote flight software for launch vehicles before starting Skyward.' });
const tara = addPerson({ name: 'Tara Holloway', type: 'alum', major: 'CS', grad_year: 2017, current_role: 'Founder of Tessera Health AI', company_type: 'startup', city: 'Atlanta', field: SW, fixedBio: true, availability_hours: 3, open_to: ['Cofounder', 'Advisor'],
  bio: 'Machine learning engineer turned founder. Tessera predicts patient deterioration from wearable and bedside signals; looking for a clinical cofounder and student ML engineers.' });
const jamal = addPerson({ name: 'Jamal Reed', type: 'alum', major: 'EE', grad_year: 2011, current_role: 'Founder of GridWise Energy', company_type: 'startup', city: 'Atlanta', field: F.energy, fixedBio: true, availability_hours: 3, open_to: ['Advisor', 'Cofounder'],
  bio: 'Power engineer building microgrid controllers for community solar. Spent ten years at a utility on grid modernization.' });
const lena = addPerson({ name: 'Lena Hartmann', type: 'alum', major: 'AE', grad_year: 2016, current_role: 'Founder of OrbitLab', company_type: 'startup', city: 'Boston', field: AE, fixedBio: true, availability_hours: 2, open_to: ['Advisor', 'Cofounder'],
  bio: 'Spacecraft power engineer building low-cost CubeSat power buses for university and startup missions.' });
const ravi = addPerson({ name: 'Ravi Krishnan', type: 'alum', major: 'ME', grad_year: 2018, current_role: 'Founder of AutoNav Mobility', company_type: 'startup', city: 'Atlanta', field: ROB, fixedBio: true, availability_hours: 4, open_to: ['Cofounder', 'Advisor'],
  bio: 'Autonomous vehicles engineer building a low-speed autonomous shuttle for campuses. Previously worked on perception and embedded systems for self-driving cars.' });
const kenji = addPerson({ name: 'Kenji Watanabe', type: 'student', major: 'ME', grad_year: 2027, current_role: null, company_type: null, city: 'Atlanta', field: ROB, fixedBio: true, availability_hours: 10, open_to: ['Cofounder', 'Early engineer', 'Helper'],
  bio: 'Mechanical engineering student leading an autonomous go-kart team in RoboJackets. Looking for teammates in embedded systems and computer vision.' });
const isabel = addPerson({ name: 'Isabel Moreno', type: 'student', major: 'EE', grad_year: 2027, current_role: null, company_type: null, city: 'Atlanta', field: E, fixedBio: true, availability_hours: 12, open_to: ['Early engineer', 'Helper'],
  bio: 'Electrical engineering student interested in robotics, embedded systems and autonomous vehicles. Built an STM32 motor controller and wrote FreeRTOS firmware for a RoboJackets robot. Looking for a startup or project to join.' });
const tyler = addPerson({ name: 'Tyler Brooks-Nguyen', type: 'student', major: 'CS', grad_year: 2026, current_role: null, company_type: null, city: 'Atlanta', field: SW, fixedBio: true, availability_hours: 10, open_to: ['Early engineer', 'Helper'],
  bio: 'Computer science student focused on machine learning for health signals; trained PyTorch models on wearable heart-rate data in a VIP team. Wants to join an early-stage startup.' });

const voltline = addProject({ name: 'Voltline AMR', year: 2025, team_type: 'Startup', team_name: 'Voltline Robotics', field: ROB, continued_from: null, hero: true, is_startup: 1,
  summary: 'Autonomous mobile robot that moves totes between warehouse stations; alumni-founded startup piloting with two Atlanta logistics companies.', technologies: ['ROS 2', 'STM32', 'Motor control', 'LiDAR', 'C++'], outcome: 'Pilot with two Atlanta logistics companies' });
const skyward = addProject({ name: 'Skyward Autopilot', year: 2025, team_type: 'Startup', team_name: 'Skyward Avionics', field: AE, continued_from: null, hero: true, is_startup: 1,
  summary: 'Autopilot and flight computer for agricultural survey drones that fly preplanned crop-scouting routes.', technologies: ['Flight software', 'STM32', 'Kalman filter', 'GPS'], outcome: null });
const tessera = addProject({ name: 'Tessera Early Warning', year: 2026, team_type: 'Startup', team_name: 'Tessera Health AI', field: SW, continued_from: null, hero: true, is_startup: 1,
  summary: 'Machine learning model that predicts patient deterioration from wearable heart-rate and bedside signals, built with a hospital research partner.', technologies: ['Python', 'PyTorch', 'Signal processing', 'AWS'], outcome: null });
const gridwise = addProject({ name: 'GridWise Controller', year: 2025, team_type: 'Startup', team_name: 'GridWise Energy', field: F.energy, continued_from: null, hero: true, is_startup: 1,
  summary: 'Microgrid controller that balances community solar, batteries and the grid for apartment complexes.', technologies: ['Battery storage', 'Solar PV', 'Modbus', 'Python', 'Power electronics'], outcome: 'Pilot with an Atlanta housing nonprofit' });
const orbitlab = addProject({ name: 'OrbitLab Power Bus', year: 2026, team_type: 'Startup', team_name: 'OrbitLab', field: AE, continued_from: null, hero: true, is_startup: 1,
  summary: 'Plug-and-play CubeSat electrical power system with peak power tracking, sold to university satellite teams.', technologies: ['CubeSat', 'PCB design', 'Battery management', 'Solar arrays'], outcome: null });
const autonav = addProject({ name: 'AutoNav Campus Shuttle', year: 2026, team_type: 'Startup', team_name: 'AutoNav Mobility', field: ROB, continued_from: null, hero: true, is_startup: 1,
  summary: 'Low-speed autonomous shuttle for campuses, with LiDAR perception and embedded safety controllers; alumni-founded and testing on a closed course.', technologies: ['LiDAR', 'ROS 2', 'Embedded C', 'OpenCV', 'Motor control'], outcome: null });
const gokart = addProject({ name: 'Autonomous Go-Kart', year: 2026, team_type: 'Club', team_name: 'RoboJackets', field: ROB, continued_from: null, hero: true, is_startup: 0,
  summary: 'Student team converting an electric go-kart to drive autonomously around a track using cameras and LiDAR.', technologies: ['ROS 2', 'OpenCV', 'LiDAR', 'Motor control'], outcome: null });

member(nadia, voltline, 'founder', 'Founder and CEO'); member(carlos, skyward, 'founder', 'Founder'); member(tara, tessera, 'founder', 'Founder');
member(jamal, gridwise, 'founder', 'Founder'); member(lena, orbitlab, 'founder', 'Founder'); member(ravi, autonav, 'founder', 'Founder'); member(kenji, gokart, 'founder', 'Team lead');
for (const [proj, fieldKey] of [[voltline, 'robotics'], [gridwise, 'energy'], [autonav, 'robotics']] as const) {
  const mate = firstGeneric(fieldKey, 'alum', 3);
  if (mate) member(mate, proj, 'builder', 'Engineer');
}
const kartMate = firstGeneric('robotics', 'student', 1);
if (kartMate) member(kartMate, gokart, 'builder');
member(isabel, projects.find((p) => p.name === 'Mars Rover Prototype' && p.year === 2018)?.id ?? gokart, 'builder');
member(tyler, projects.find((p) => p.team_name === 'VIP Machine Learning for Health' && p.year >= 2024)?.id ?? tessera, 'builder');

fixedProblem(voltline, 'Robot drifts off its path on shiny warehouse floors', 'Fused wheel odometry with LiDAR scan matching and lowered the trust in wheel encoders when slip was detected.', nadia, '2025-06-18');
fixedProblem(skyward, 'Drone altitude oscillates in gusty wind', 'Retuned the altitude controller with a feedforward term from the barometer and filtered accelerometer noise in a Kalman filter.', carlos, '2025-08-02');
fixedProblem(gridwise, 'Battery inverter trips when the microgrid islands from the grid', 'Added a soft transfer with droop control and a synchronization check before reclosing.', jamal, '2025-09-21');
fixedProblem(autonav, 'LiDAR misses low curbs at night', 'Tilted the lower LiDAR down five degrees and fused it with a wide-angle camera for curb detection.', ravi, '2026-03-11');

// Founder problems (security, fundraising, customers, equity): problem solving is not only technical. Fixed values, no RNG.
fixedProblem(tessera, 'Hospital IT security review stalled our pilot for months', 'Mapped every question in the hospital security questionnaire to a control: encrypted patient data at rest and in transit, single sign-on with audit logs, a signed BAA, and collected only the vitals the model needed. The review passed in four weeks.', tara, '2026-04-09');
fixedProblem(vitaltag, 'Investors wanted clinical evidence before our pre-seed round', 'Ran a small feasibility study with an Atlanta emergency department, reported time-to-triage against the current process, and led the pitch with that one number. Closed the pre-seed round two months later.', priya, '2019-10-15');
fixedProblem(pulseband, 'Customer interviews kept ending without a buyer', 'Stopped pitching athletes and interviewed 30 trainers and coaches instead. Trainers owned the budget, so the first pilot was sold to an athletic department, not to players.', leo, '2025-09-15');
fixedProblem(voltline, 'Splitting equity with a cofounder who joined a year in', 'Used four-year vesting with a one-year cliff, credited the founder for the year already worked, and signed a written cofounder agreement before any new code was written.', nadia, '2025-04-02');
fixedProblem(restwell, 'Turning a free hospital pilot into a paid contract', 'Agreed on the success metric with the hospital before the pilot started (readmissions avoided), then priced per monitored patient so the contract paid for itself in the hospital budget.', elena, '2025-08-20');

// =====================================================================
// 4. CONNECTIONS, REQUESTS, MILESTONES
// =====================================================================
// shared-project connections derived from co-builders and advisors
for (const proj of projects) {
  const ms = members.filter((m) => m.project_id === proj.id);
  for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) connect(ms[i].person_id, ms[j].person_id, 'shared-project', `${proj.year}-05-01`);
}
// explicit hero connections (Elena and Priya share a circle but are NOT connected; Leo and Dana are NOT connected)
connect(hannah, elena, 'intro', '2025-01-18');
connect(hannah, priya, 'co-advisor', '2024-06-03');
connect(dana, tom, 'co-advisor', '2024-03-12');
connect(marcus, dana, 'intro', '2025-04-22');
connect(marcus, lauren, 'circle', '2025-08-09');
connect(kevin, marcus, 'circle', '2024-11-30');
connect(daniel, elena, 'request', '2025-06-14');
connect(victor, priya, 'co-advisor', '2024-09-20');
connect(jordan, leo, 'request', '2025-09-10');
connect(maya, sofia, 'circle', '2025-09-28');
connect(aisha, maya, 'intro', '2025-10-12');
connect(ethan, tom, 'request', '2025-02-08');
connect(grace, nina, 'intro', '2024-05-17');
connect(samuel, dana, 'co-advisor', '2024-10-01');
connect(omar, ethan, 'request', '2025-11-03');
connect(rebecca, daniel, 'circle', '2024-12-07');

// ~50 more explicit connections spread across all four directions and over time
const claimedGeneric = genericPeople.filter((p) => p.claimed);
const students = claimedGeneric.filter((p) => p.type === 'student');
const alumni = claimedGeneric.filter((p) => p.type === 'alum');
const directions: [Person[], Person[]][] = [[students, alumni], [alumni, alumni], [alumni, students], [students, students]];
const SOURCES = ['request', 'request', 'intro', 'circle', 'co-advisor'];
for (let i = 0; i < 52; i++) {
  const [fromPool, toPool] = directions[i % 4];
  const a = pick(fromPool), b = pick(toPool);
  const sameField = rng() < 0.7;
  const b2 = sameField ? pick(toPool.filter((x) => x.field.key === a.field.key && x.id !== a.id)) ?? b : b;
  const month = rint(0, 34); // 2024-01 .. 2026-11
  const date = `${2024 + Math.floor(month / 12)}-${pad((month % 12) + 1, 2)}-${pad(rint(1, 28), 2)}`;
  let src = pick(SOURCES);
  if (src === 'co-advisor' && (a.type === 'student' || b2.type === 'student')) src = 'intro';
  connect(a.id, b2.id, src, date);
}

// seeded requests (the PulseBand to Dana request is sent live during the demo)
requests.push(
  { id: 'request:r001', from_person: ethan, to_person: dana, project_id: lora, kind: 'expertise', role: 'Advisor', message: 'Could you look at the power budget for our LoRa sensor nodes? We are stuck at three weeks of battery life.', status: 'sent', created_at: '2026-11-05T15:20:00Z' },
  { id: 'request:r002', from_person: maya, to_person: elena, project_id: stride, kind: 'expertise', role: 'Advisor', message: 'Our StrideSense ankle sensor keeps slipping during runs. You designed enclosures for consumer electronics; would you look at our strap and housing for 15 minutes?', status: 'sent', created_at: '2026-11-08T18:02:00Z' },
  { id: 'request:r003', from_person: elena, to_person: daniel, project_id: restwell, kind: 'expertise', role: 'Advisor', message: 'Would you advise us on sensor signal quality for the Restwell patch?', status: 'accepted', created_at: '2025-06-10T13:00:00Z' },
  { id: 'request:r004', from_person: jordan, to_person: leo, project_id: ws2024, kind: 'expertise', role: 'Helper', message: 'Our VIP team reuses the same 2017 board as PulseBand. Want to compare notes?', status: 'accepted', created_at: '2025-09-08T16:45:00Z' },
  { id: 'request:r005', from_person: kevin, to_person: marcus, project_id: trackerApp, kind: 'stuck', role: 'Helper', message: 'Seeing BLE disconnects on Android after the tracker sleeps. Any ideas?', status: 'accepted', created_at: '2024-11-28T10:30:00Z' },
);

// ~60 milestones total
const MILESTONE_TITLES = ['First working prototype', 'Design review passed', 'Field test completed', 'Demo day presentation', 'Handoff document written', 'Paper submitted', 'First user pilot', 'Won a campus pitch competition'];
for (const proj of shuffle(genericProjects).slice(0, 26)) {
  const advisor = members.find((m) => m.project_id === proj.id && m.role === 'advisor');
  for (const title of sample(MILESTONE_TITLES, rint(1, 3))) {
    milestone(proj.id, title, `${proj.year}-${pad(rint(1, 12), 2)}-${pad(rint(1, 28), 2)}`, advisor && rng() < 0.75 ? advisor.person_id : null);
  }
}

// =====================================================================
// 5. SKILLS (normalized from technologies + domains)
// =====================================================================
const skillIds = new Map<string, string>();
const skillId = (name: string) => {
  if (!skillIds.has(name)) skillIds.set(name, `skill:s${pad(skillIds.size + 1)}`);
  return skillIds.get(name)!;
};
const projectSkills: [string, string][] = [];
const personSkills = new Set<string>();
for (const proj of projects) {
  const names = new Set([...proj.technologies, proj.field.domain]);
  if (proj.id === vitaltag || proj.id === restwell || proj.id === ecg2011) names.add('Medical devices');
  for (const n of names) projectSkills.push([proj.id, skillId(n)]);
}
for (const m of members) {
  const proj = projects.find((p) => p.id === m.project_id)!;
  const names = m.role === 'advisor' ? [proj.field.domain] : [proj.field.domain, ...sample(proj.technologies, Math.min(3, proj.technologies.length))];
  for (const n of names) personSkills.add(`${m.person_id}|${skillId(n)}`);
}
const heroSkills: [string, string[]][] = [
  [dana, ['Low-power design', 'PCB design', 'nRF52', 'Embedded hardware', 'Design for manufacturing', 'Wearables']],
  [marcus, ['BLE', 'Firmware', 'nRF52', 'Power management', 'Wearables']],
  [priya, ['FDA regulatory', 'Medical devices', 'Wearables', 'Clinical testing', 'Quality systems']],
  [elena, ['Medical devices', 'Wearables', 'SolidWorks', 'Injection molding', 'Fundraising']],
  [hannah, ['Quality systems', 'Medical devices', 'ISO 13485']],
  [victor, ['Medical devices', 'SolidWorks']],
  [rebecca, ['Clinical testing', 'FDA regulatory']],
  [daniel, ['Medical devices', 'Wearables', 'Signal processing']],
  [maya, ['Firmware', 'Zephyr RTOS', 'BLE', 'Wearables']],
  [jordan, ['Firmware', 'nRF52', 'Wearables']],
  [sofia, ['Firmware', 'PPG sensor', 'Battery management', 'Wearables']],
  [leo, ['Customer discovery', 'Fundraising', 'Wearables']],
];
heroSkills.push(
  [nadia, ['Robotics', 'Motor control', 'ROS 2', 'Fundraising']], [carlos, ['Aerospace', 'Flight software', 'Kalman filter']],
  [tara, ['Machine learning and software', 'PyTorch', 'Signal processing']], [jamal, ['Energy systems', 'Battery storage', 'Power electronics']],
  [lena, ['Aerospace', 'CubeSat', 'Battery management']], [ravi, ['Robotics', 'LiDAR', 'OpenCV', 'Embedded C']],
  [kenji, ['Robotics', 'ROS 2', 'SolidWorks']], [isabel, ['Embedded systems', 'STM32', 'FreeRTOS', 'Motor control', 'C', 'Robotics']],
  [tyler, ['Machine learning and software', 'PyTorch', 'Python', 'Signal processing']],
);
for (const [pid, names] of heroSkills) for (const n of names) personSkills.add(`${pid}|${skillId(n)}`);

// Keep one copy of each problem description (the first team that solved it). Runs after all RNG use, so nothing else changes.
{
  const seen = new Set<string>();
  for (let i = 0; i < problems.length; i++) {
    const key = problems[i].description.toLowerCase();
    if (seen.has(key)) { problems.splice(i, 1); i--; } else seen.add(key);
  }
}

// =====================================================================
// 6. WRITE + EMBED
// =====================================================================
async function main() {
  // quick integrity checks
  const lineageCount = new Set(projects.filter((p) => p.continued_from).map((p) => p.continued_from)).size;
  console.log(`people=${people.length} (alumni ${countType('alum')}, students ${countType('student')}) projects=${projects.length} problems=${problems.length} connections=${connections.length} explicit=${connections.filter((c) => c.source !== 'shared-project').length} milestones=${milestones.length} lineage-links=${lineageCount} skills=${skillIds.size}`);
  if (people.length !== 229 || projects.length !== 157) throw new Error(`unexpected counts: ${people.length} people, ${projects.length} projects`);
  void lineages; void heroProjectIds;

  // texts used for embeddings
  const skillName = new Map([...skillIds].map(([n, id]) => [id, n]));
  const personSkillNames = (pid: string) => [...personSkills].filter((k) => k.startsWith(pid + '|')).map((k) => skillName.get(k.split('|')[1])!);
  const personText = (p: Person) => {
    const sums = members.filter((m) => m.person_id === p.id).map((m) => projects.find((x) => x.id === m.project_id)!.summary);
    return `${p.bio} Skills: ${personSkillNames(p.id).join(', ')}. Projects: ${sums.join(' ')}`;
  };
  const projectText = (p: Project) => `${p.name}. ${p.summary} Technologies: ${p.technologies.join(', ')}.`;
  const problemText = (p: Problem) => `${p.description}. ${p.solution}`;

  let mode = 'keyword';
  let pv: Float32Array[] | null = null, jv: Float32Array[] | null = null, bv: Float32Array[] | null = null;
  console.log('Loading embedding model (downloads once)...');
  const ex = await loadEmbedder(true);
  if (ex) {
    pv = await embedTexts(people.map(personText));
    jv = await embedTexts(projects.map(projectText));
    bv = await embedTexts(problems.map(problemText));
    mode = 'semantic';
    console.log('Embeddings computed with', MODEL_ID);
  } else {
    console.log('Embedding model unavailable: search will use the BM25 keyword fallback.');
  }

  if (fs.existsSync(SEED_DB_PATH)) fs.rmSync(SEED_DB_PATH);
  for (const ext of ['-wal', '-shm']) if (fs.existsSync(SEED_DB_PATH + ext)) fs.rmSync(SEED_DB_PATH + ext);
  const db = openDb(SEED_DB_PATH);
  db.pragma('journal_mode = DELETE');
  db.transaction(() => {
    const ip = db.prepare('INSERT INTO people VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
    people.forEach((p, i) => ip.run(p.id, p.name, p.type, p.major, p.grad_year, p.current_role, p.company_type, p.city, p.bio, p.claimed, p.availability_hours, JSON.stringify(p.open_to), pv ? toBlob(pv[i]) : null));
    const ij = db.prepare('INSERT INTO projects VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    const sorted = [...projects].sort((a, b) => (a.continued_from ? 1 : 0) - (b.continued_from ? 1 : 0));
    for (const p of sorted) ij.run(p.id, p.name, p.year, p.team_type, p.team_name, p.summary, JSON.stringify(p.technologies), p.outcome, p.is_startup, p.continued_from, jv ? toBlob(jv[projects.indexOf(p)]) : null);
    const is = db.prepare('INSERT INTO skills VALUES (?,?)');
    for (const [n, id] of skillIds) is.run(id, n);
    const ipp = db.prepare('INSERT INTO person_project VALUES (?,?,?,?)');
    for (const m of members) ipp.run(m.person_id, m.project_id, m.role, m.title);
    const ips = db.prepare('INSERT INTO person_skill VALUES (?,?)');
    for (const k of personSkills) ips.run(...k.split('|'));
    const ijs = db.prepare('INSERT OR IGNORE INTO project_skill VALUES (?,?)');
    for (const [a, b] of projectSkills) ijs.run(a, b);
    const ib = db.prepare('INSERT INTO problems VALUES (?,?,?,?,?,?,?,?)');
    problems.forEach((p, i) => ib.run(p.id, p.project_id, p.description, p.solution, p.solved_by, null, p.created_at, bv ? toBlob(bv[i]) : null));
    const ic = db.prepare('INSERT INTO connections VALUES (?,?,?,?,?,?)');
    for (const c of connections) ic.run(c.id, c.from_person, c.to_person, c.source, c.status, c.created_at);
    const ir = db.prepare('INSERT INTO requests VALUES (?,?,?,?,?,?,?,?,?,?)');
    for (const r of requests) ir.run(r.id, r.from_person, r.to_person, r.project_id, r.kind, r.role, r.message, r.status, null, r.created_at);
    const im = db.prepare('INSERT INTO milestones VALUES (?,?,?,?,?)');
    for (const m of milestones) im.run(m.id, m.project_id, m.title, m.date, m.confirmed_by);
    const meta = db.prepare('INSERT INTO meta VALUES (?,?)');
    meta.run('search_mode', mode);
    meta.run('seeded_at', new Date().toISOString());
    meta.run('pulseband_id', pulseband);
    for (const [k, v] of Object.entries(seedCache())) db.prepare('INSERT INTO cache VALUES (?,?)').run(k, v);
  })();

  // reachability: every person and project within 6 hops of PulseBand
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => { if (!adj.has(a)) adj.set(a, new Set()); if (!adj.has(b)) adj.set(b, new Set()); adj.get(a)!.add(b); adj.get(b)!.add(a); };
  for (const m of members) link(m.person_id, m.project_id);
  for (const p of problems) { link(p.id, p.project_id); link(p.id, p.solved_by); }
  for (const p of projects) if (p.continued_from) link(p.id, p.continued_from);
  for (const [a, b] of projectSkills) link(a, b);
  for (const k of personSkills) { const [a, b] = k.split('|'); link(a, b); }
  for (const c of connections) link(c.from_person, c.to_person);
  const dist = new Map([[pulseband, 0]]);
  const q = [pulseband];
  while (q.length) { const x = q.shift()!; for (const y of adj.get(x) ?? []) if (!dist.has(y)) { dist.set(y, dist.get(x)! + 1); q.push(y); } }
  const far = [...people.map((p) => p.id), ...projects.map((p) => p.id)].filter((id) => (dist.get(id) ?? 99) > 6);
  if (far.length) throw new Error(`Not reachable from PulseBand within 6 hops: ${far.join(', ')}`);
  console.log('Reachability: all people and projects within', Math.max(...[...people.map((p) => p.id), ...projects.map((p) => p.id)].map((id) => dist.get(id)!)), 'hops of PulseBand');
  db.close();

  // copy the pristine snapshot into the live database (works even while the dev server has it open)
  const live = openDb(DB_PATH);
  resetFromSeed(live);
  live.close();
  console.log(`Seeded ${DB_PATH} (search mode: ${mode})`);
}

/** Cached AI-style outputs for hero records so the demo never waits on an API. */
function seedCache(): Record<string, string> {
  return {
    [`handoff:${pulseband}`]: JSON.stringify({
      source: 'cached',
      text: 'PulseBand continues the 2017 VIP Wearable Sensing board, which already reached a sleep current under 10 microamps on an nRF52 with a power-gated PPG sensor. Start from that power tree rather than redesigning it. Known issues to watch: battery life on early boards and BLE behavior during sleep. Dana Whitfield built the 2017 sensor boards and later shipped a consumer wearable; Jordan Kim is extending the same board on the 2024 VIP team, so share firmware fixes in both directions.',
    }),
    [`handoff:${ws2024}`]: JSON.stringify({
      source: 'cached',
      text: 'The 2024 team inherits the 2017 low-power sensor board and replaces the firmware with Zephyr RTOS. The 2017 team solved battery drain by power-gating the PPG sensor; keep that design. Dana Whitfield, who built the original boards, now advises this team, and PulseBand is a student startup built on the same hardware.',
    }),
  };
}

main().catch((e) => { console.error(e); process.exit(1); });
