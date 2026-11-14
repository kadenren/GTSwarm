import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetFromSeed } from '@/lib/db';
import { snapshot } from '@/lib/data';
import { ActionError } from '@/lib/actions';
import { visibleTo, canRequest, whyConnect, findPeople, profileFor, sendConnectRequest, saveContactPrefs, contactPrefsOf, peopleWeb } from '@/lib/people';
import { suggestCircles, circleMembers } from '@/lib/circles';
import { listGroups } from '@/lib/community';
import { byName } from './helpers';

const KENJI = () => byName('Kenji Watanabe'), NOAH = () => byName('Noah Bennett'), JAMIE = () => byName('Jamie Keller');
const RAVI = () => byName('Ravi Krishnan'), KEVIN = () => byName('Kevin Osei'), OMAR = () => byName('Omar Haddad');
const NADIA = () => byName('Nadia Okoro'), QUINN = () => byName('Quinn Diallo'), MAYA = () => byName('Maya Okafor');
const person = (id: string) => snapshot().person.get(id)!;

describe('Consent and visibility', () => {
  beforeEach(() => resetFromSeed());

  it('hides alumni who are not open to students from student search, before ranking', async () => {
    expect(visibleTo(KENJI(), person(RAVI()))).toBe(false);
    expect(visibleTo(KENJI(), person(KEVIN()))).toBe(false);
    const ids = (await findPeople(KENJI(), { q: 'robotics', purpose: 'meet' })).map((r) => r.id);
    expect(ids).not.toContain(RAVI());
    expect(ids).not.toContain(KEVIN());
  });

  it('lets verified alumni see members who are closed to students', () => {
    expect(visibleTo(NOAH(), person(RAVI()))).toBe(true);
  });

  it('respects a member who paused all requests', () => {
    const r = canRequest(NOAH(), OMAR(), 'meet');
    expect(r.ok).toBe(false);
    expect(r.reason).toBeTruthy();
  });

  it('offers mentorship only from mentors who opted in for this audience and are accepting', () => {
    expect(canRequest(KENJI(), QUINN(), 'mentorship').ok).toBe(true);
    expect(canRequest(KENJI(), NADIA(), 'mentorship').ok).toBe(true);
    expect(canRequest(KENJI(), JAMIE(), 'mentorship').ok).toBe(false); // not a mentor
  });

  it('returns no profile for someone the viewer may not see', () => {
    expect(profileFor(KENJI(), RAVI())).toBeNull();
    expect(profileFor(KENJI(), QUINN())).not.toBeNull();
  });

  it('honors preference changes immediately', () => {
    saveContactPrefs(QUINN(), { openToStudents: false });
    expect(contactPrefsOf(QUINN()).openToStudents).toBe(false);
    expect(visibleTo(KENJI(), person(QUINN()))).toBe(false);
  });
});

describe('Why this person and requests', () => {
  beforeEach(() => resetFromSeed());

  it('builds the reason only from stored facts', () => {
    const why = whyConnect(NOAH(), person(JAMIE()), 'meet');
    expect(why).toMatch(/^Jamie /);
    expect(why).toContain('Seattle'); // both chose to share Seattle
    expect(why).not.toMatch(/%|score|AI/);
  });

  it('turns a meet request into an inbox request with the purpose attached', () => {
    sendConnectRequest(NOAH(), JAMIE(), 'meet', 'Hi Jamie, I just moved to Seattle.');
    const row = getDb().prepare('SELECT * FROM requests WHERE from_person = ? AND to_person = ?').get(NOAH(), JAMIE()) as { role: string; status: string; project_id: string | null };
    expect(row.role).toBe('Meet fellow Yellow Jackets');
    expect(row.status).toBe('sent');
    expect(row.project_id).toBeNull();
  });

  it('turns a mentorship request into a mentorship, not a generic request', () => {
    sendConnectRequest(KENJI(), QUINN(), 'mentorship', 'Could I ask about robotics careers?');
    const m = getDb().prepare('SELECT status FROM mentorship WHERE mentee_id = ? AND mentor_id = ?').get(KENJI(), QUINN()) as { status: string } | undefined;
    expect(m?.status).toBe('requested');
  });

  it('refuses requests the recipient does not welcome, on the server', () => {
    expect(() => sendConnectRequest(KENJI(), RAVI(), 'meet', 'hi')).toThrow(ActionError);
    expect(() => sendConnectRequest(NOAH(), OMAR(), 'meet', 'hi')).toThrow(ActionError);
  });
});

describe('Communities', () => {
  beforeEach(() => resetFromSeed());

  it('suggests GT in Seattle to an alum who shared Seattle, with a plain reason', () => {
    const s = suggestCircles(NOAH()).find((x) => x.circle.id === 'group:g04');
    expect(s?.reason).toBe('You selected Seattle.');
  });

  it('never suggests a community the viewer cannot join', () => {
    expect(suggestCircles(KENJI()).map((x) => x.circle.id)).not.toContain('group:g02');
    expect(suggestCircles(MAYA()).every((x) => x.circle.standing !== 'ineligible')).toBe(true);
  });

  it('shows community members who welcome requests, filtered by visibility', () => {
    const members = circleMembers(NOAH(), 'group:g04');
    expect(members.map((m) => m.id)).toContain(JAMIE());
    const g01 = circleMembers(KENJI(), 'group:g01').map((m) => m.id);
    expect(g01).not.toContain(RAVI()); // Ravi is not open to students
  });

  it('keeps between four and six curated communities', () => {
    const n = listGroups(NOAH()).length;
    expect(n).toBeGreaterThanOrEqual(4);
    expect(n).toBeLessThanOrEqual(6);
  });
});

describe('Connection web', () => {
  beforeEach(() => resetFromSeed());

  it('only shows people the viewer may see, and every line joins two shown nodes', async () => {
    const results = await findPeople(KENJI(), { q: 'robotics career advice', purpose: 'mentorship' });
    const web = peopleWeb(KENJI(), results);
    const ids = new Set(web.nodes.map((n) => n.id));
    for (const n of web.nodes) if (n.id.startsWith('person:') && n.id !== KENJI()) expect(visibleTo(KENJI(), person(n.id))).toBe(true);
    for (const e of web.edges) { expect(ids.has(e.source)).toBe(true); expect(ids.has(e.target)).toBe(true); }
    expect(ids.has(RAVI())).toBe(false);
  });
});
