import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetFromSeed } from '@/lib/db';
import { snapshot } from '@/lib/data';
import { ActionError } from '@/lib/actions';
import { membershipOf, can, meetsEligibility } from '@/lib/access';
import {
  listGroups, getGroup, joinGroup, leaveGroup, decideGroupRequest, recommendGroups,
  listEvents, getEvent, rsvp, cancelRsvp, recommendEvents,
  listOpportunities, recommendOpportunities, setSaved, postOpportunity, moderateOpportunity,
  mentors, recommendMentors, requestMentorship, decideMentorship, endMentorship, saveMentorProfile,
} from '@/lib/community';
import { requestGraduationVerification, decideVerification, simulateVerifiedGraduation, continuityOf } from '@/lib/lifecycle';
import { byName } from './helpers';

const MAYA = () => byName('Maya Okafor'), MEI = () => byName('Mei Ramirez'), SOFIA = () => byName('Sofia Alvarez');
const ELENA = () => byName('Elena Brooks'), DANA = () => byName('Dana Whitfield'), SAMUEL = () => byName('Samuel Grant'), AMELIA = () => byName('Amelia Diallo');
const makeAdmin = (id: string) => getDb().prepare("UPDATE membership SET status = 'ADMIN' WHERE person_id = ?").run(id);
const expectDenied = (fn: () => unknown, status = 403) => { try { fn(); throw new Error('expected an error'); } catch (e) { expect(e).toBeInstanceOf(ActionError); expect((e as ActionError).status).toBe(status); } };

describe('Membership and permissions', () => {
  beforeEach(() => resetFromSeed());

  it('seeds students, verified alumni and a pending alum', () => {
    expect(membershipOf(MAYA()).status).toBe('CURRENT_STUDENT');
    expect(membershipOf(ELENA()).status).toBe('VERIFIED_ALUMNI');
    expect(membershipOf(AMELIA()).status).toBe('ALUMNI_PENDING_VERIFICATION');
  });

  it('gives students networking but not alumni-only capabilities', () => {
    expect(can(MAYA(), 'network.connect')).toBe(true);
    expect(can(MAYA(), 'mentorship.request')).toBe(true);
    expect(can(MAYA(), 'opportunity.post')).toBe(false);
    expect(can(MAYA(), 'directory.alumni.full')).toBe(false);
    expect(can(MAYA(), 'verification.decide')).toBe(false);
  });

  it('keeps pending alumni at student-level access until verified', () => {
    expect(can(AMELIA(), 'opportunity.post')).toBe(false);
    expect(meetsEligibility('ALUMNI_PENDING_VERIFICATION', 'verified_alumni')).toBe(false);
    expect(meetsEligibility('ALUMNI_PENDING_VERIFICATION', 'students')).toBe(true);
  });

  it('treats someone with no membership record as unverified (least privilege)', () => {
    getDb().prepare('DELETE FROM membership WHERE person_id = ?').run(DANA());
    expect(membershipOf(DANA()).status).toBe('ALUMNI_PENDING_VERIFICATION');
    expect(can(DANA(), 'opportunity.post')).toBe(false);
  });
});

describe('Groups', () => {
  beforeEach(() => resetFromSeed());

  it('lets students join open shared groups and leave them', () => {
    expect(joinGroup(MEI(), 'group:g01')).toEqual({ status: 'active' });
    expect(getGroup(MEI(), 'group:g01')!.standing).toBe('member');
    expect(leaveGroup(MEI(), 'group:g01')).toEqual({ left: true });
    expect(getGroup(MEI(), 'group:g01')!.standing).toBe('can-join');
  });

  it('blocks students from verified-alumni groups on the server, and hides their member list', () => {
    expectDenied(() => joinGroup(MAYA(), 'group:g02'));
    const g = getGroup(MAYA(), 'group:g02')!;
    expect(g.standing).toBe('ineligible');
    expect(g.members).toBeNull();
  });

  it('blocks alumni from student-only groups (eligibility is an explicit policy, not a guess)', () => {
    expectDenied(() => joinGroup(ELENA(), 'group:g07'));
  });

  it('turns request-to-join into a pending request that only a group admin can approve', () => {
    expect(joinGroup(MAYA(), 'group:g03')).toEqual({ status: 'pending' });
    expectDenied(() => decideGroupRequest(MAYA(), 'group:g03', MAYA(), true));
    expectDenied(() => decideGroupRequest(DANA(), 'group:g03', MAYA(), true));
    expect(decideGroupRequest(ELENA(), 'group:g03', MAYA(), true)).toEqual({ approved: true });
    expect(getGroup(MAYA(), 'group:g03')!.standing).toBe('member');
  });

  it('recommends only groups the member can actually join', () => {
    for (const r of recommendGroups(MAYA(), 7)) expect(['can-join', 'can-request']).toContain(r.group.standing);
    expect(listGroups(MAYA()).length).toBe(7);
  });
});

describe('Events', () => {
  beforeEach(() => resetFromSeed());

  it('lets members RSVP, prevents duplicates, and allows cancel and re-register', () => {
    expect(rsvp(MAYA(), 'event:e02')).toEqual({ status: 'going' });
    expectDenied(() => rsvp(MAYA(), 'event:e02'), 409);
    expect(cancelRsvp(MAYA(), 'event:e02')).toEqual({ status: 'cancelled' });
    expect(rsvp(MAYA(), 'event:e02')).toEqual({ status: 'going' });
  });

  it('hides restricted event details from students and refuses their RSVP', () => {
    const e = getEvent(MAYA(), 'event:e03')!;
    expect(e.access).toBe('teaser');
    expect(e.location).toBeNull();
    expect(e.description).toBeNull();
    expectDenied(() => rsvp(MAYA(), 'event:e03'));
  });

  it('enforces capacity', () => {
    expect(rsvp(ELENA(), 'event:e03')).toEqual({ status: 'going' }); // 3rd of 3 seats
    expectDenied(() => rsvp(DANA(), 'event:e03'), 409);
  });

  it('limits group-only events to active group members', () => {
    expectDenied(() => rsvp(ELENA(), 'event:e07'));
    expect(getEvent(byName('Kevin Osei'), 'event:e07')!.access).toBe('full');
  });

  it('recommends only accessible upcoming events', () => {
    for (const r of recommendEvents(MAYA(), 7)) { expect(r.event.access).toBe('full'); expect(r.event.past).toBe(false); }
    expect(listEvents(MAYA()).length).toBe(7);
  });
});

describe('Opportunities', () => {
  beforeEach(() => resetFromSeed());

  it('shows students internships and shared postings, and alumni the alumni postings', () => {
    const forMaya = listOpportunities(MAYA());
    expect(forMaya.some((o) => o.kind === 'internship')).toBe(true);
    expect(forMaya.some((o) => o.audience === 'alumni')).toBe(false);
    const forElena = listOpportunities(ELENA());
    expect(forElena.some((o) => o.audience === 'alumni')).toBe(true);
    expect(forElena.some((o) => o.status === 'pending')).toBe(false); // someone else's pending posting
  });

  it('recommends a matching internship with a grounded reason, and never an expired one', () => {
    const recs = recommendOpportunities(MAYA(), 10);
    expect(recs[0].opportunity.id).toBe('opp:o001');
    expect(recs[0].why).toMatch(/Firmware|BLE|nRF52|Zephyr/);
    expect(recs.every((r) => !r.opportunity.expired)).toBe(true);
    expect(listOpportunities(MAYA()).find((o) => o.id === 'opp:o004')!.expired).toBe(true);
  });

  it('respects class-year eligibility', () => {
    const o = listOpportunities(MEI()).find((x) => x.id === 'opp:o001')!; // classes of 2026 to 2028; Mei is 2029
    expect(o.eligible).toBe(false);
    expect(recommendOpportunities(MEI(), 10).some((r) => r.opportunity.id === 'opp:o001')).toBe(false);
  });

  it('saves and unsaves', () => {
    expect(setSaved(MAYA(), 'opp:o001', true)).toEqual({ saved: true });
    expect(listOpportunities(MAYA()).find((o) => o.id === 'opp:o001')!.saved).toBe(true);
    setSaved(MAYA(), 'opp:o001', false);
    expect(listOpportunities(MAYA()).find((o) => o.id === 'opp:o001')!.saved).toBe(false);
  });

  it('lets verified alumni propose postings that wait for a moderator; students cannot post', () => {
    expectDenied(() => postOpportunity(MAYA(), { kind: 'full-time', title: 'x', org: 'y', description: 'z', location: '', mode: '', skills: [], audience: 'both', apply: 'email' }));
    const r = postOpportunity(ELENA(), { kind: 'part-time', title: 'Firmware reviewer', org: 'Restwell Health', description: 'Review BLE code', location: 'Remote', mode: 'Remote', skills: ['BLE'], audience: 'both', apply: 'Message Elena' });
    expect(r.status).toBe('pending');
    expect(listOpportunities(MAYA()).some((o) => o.id === r.id)).toBe(false);
    expectDenied(() => moderateOpportunity(ELENA(), r.id, true));
    makeAdmin(SAMUEL());
    expect(moderateOpportunity(SAMUEL(), r.id, true)).toEqual({ status: 'published' });
    expect(listOpportunities(MAYA()).some((o) => o.id === r.id)).toBe(true);
  });
});

describe('Mentorship', () => {
  beforeEach(() => { delete process.env.GEMINI_API_KEY; resetFromSeed(); });

  it('lists only opted-in mentors who are accepting and have capacity', () => {
    const list = mentors(MAYA());
    expect(list.some((m) => m.name === 'Kevin Osei')).toBe(false); // not accepting
    expect(list.every((m) => m.accepting && m.active < m.capacity)).toBe(true);
  });

  it('recommends mentors with explanations grounded in their records', async () => {
    const recs = await recommendMentors(MAYA(), 3);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.map((r) => r.mentor.name)).toContain('Marcus Reyes');
    for (const r of recs) expect(r.why).toMatch(/^Relevant mentor because of /);
  });

  it('runs the request → accept workflow with consent, and accepting creates only a mentorship', () => {
    const connectionsBefore = (getDb().prepare('SELECT COUNT(*) n FROM connections').get() as { n: number }).n;
    const r = requestMentorship(MAYA(), SAMUEL(), 'Career advice', 'Could we talk about hardware careers?');
    expect(requestMentorship(MAYA(), SAMUEL(), 'Career advice', 'again').duplicate).toBe(true);
    expectDenied(() => decideMentorship(MAYA(), r.id, true)); // only the mentor answers
    expect(decideMentorship(SAMUEL(), r.id, true)).toEqual({ status: 'active' });
    expect((getDb().prepare('SELECT COUNT(*) n FROM connections').get() as { n: number }).n).toBe(connectionsBefore);
    expect(endMentorship(MAYA(), r.id)).toEqual({ status: 'ended' });
  });

  it('respects declines and mentors who are not accepting', () => {
    const r = requestMentorship(MAYA(), byName('Priya Natarajan'), 'Graduate school', '');
    expect(decideMentorship(byName('Priya Natarajan'), r.id, false)).toEqual({ status: 'declined' });
    expectDenied(() => requestMentorship(MAYA(), byName('Kevin Osei'), '', ''), 409);
  });

  it('only verified alumni can offer mentorship', () => {
    expectDenied(() => saveMentorProfile(MAYA(), { accepting: true, topics: ['Career advice'], mentees: ['students'], capacity: 2, contact: '', note: '' }));
    expect(saveMentorProfile(DANA(), { accepting: true, topics: ['Engineering guidance'], mentees: ['students'], capacity: 2, contact: '', note: '' })).toEqual({ saved: true });
    expect(mentors(MAYA()).some((m) => m.name === 'Dana Whitfield')).toBe(true);
  });
});

describe('Student → alumni lifecycle', () => {
  beforeEach(() => resetFromSeed());

  it('moves a student only to pending when they report graduation', () => {
    requestGraduationVerification(MAYA(), 'Graduating in May');
    expect(membershipOf(MAYA()).status).toBe('ALUMNI_PENDING_VERIFICATION');
    expect(can(MAYA(), 'opportunity.post')).toBe(false);
  });

  it('requires an authorized reviewer for the final step, and keeps every connection and project', () => {
    const before = continuityOf(MAYA());
    const req = requestGraduationVerification(MAYA(), 'Graduating in May');
    expectDenied(() => decideVerification(ELENA(), req.id, true)); // a verified alum is not a reviewer
    expectDenied(() => decideVerification(MAYA(), req.id, true));
    makeAdmin(SAMUEL());
    expect(decideVerification(SAMUEL(), req.id, true)).toEqual({ status: 'approved' });
    expect(membershipOf(MAYA()).status).toBe('VERIFIED_ALUMNI');
    expect(snapshot().person.get(MAYA())!.type).toBe('alum');
    expect(continuityOf(MAYA())).toEqual(before);
    expect(can(MAYA(), 'opportunity.post')).toBe(true);
  });

  it('allows the simulated verification only for the demo graduation persona, labeled as simulated', () => {
    expectDenied(() => simulateVerifiedGraduation(MAYA()));
    const before = continuityOf(SOFIA());
    expect(simulateVerifiedGraduation(SOFIA()).status).toBe('VERIFIED_ALUMNI');
    const m = membershipOf(SOFIA());
    expect(m.status).toBe('VERIFIED_ALUMNI');
    expect(m.verifiedSource).toMatch(/Simulated/);
    expect(continuityOf(SOFIA())).toEqual(before);
    expect(joinGroup(SOFIA(), 'group:g02')).toEqual({ status: 'active' }); // alumni group now open to her
  });

  it('can be switched off for a real deployment', () => {
    process.env.GTSWARM_DEMO_DATA = 'false';
    try { expectDenied(() => simulateVerifiedGraduation(SOFIA())); } finally { delete process.env.GTSWARM_DEMO_DATA; }
  });
});
