import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { Op } from '@/lib/pgstore';

/**
 * The hosted demo's per-visitor sessions, with Postgres replaced by an in-memory stand-in:
 * the dataset comes from the local test database, and the visitor change log is an array.
 */
const store = vi.hoisted(() => ({ on: false, dataset: {} as Record<string, Record<string, unknown>[]>, ops: [] as (Op & { session: string })[], nextId: 1 }));

vi.mock('@/lib/pgstore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/pgstore')>();
  return {
    ...actual,
    hosted: () => store.on,
    loadDataset: async () => store.dataset,
    fetchOps: async (sid: string) => store.ops.filter((o) => o.session === sid).map(({ id, sql, params }) => ({ id, sql, params: JSON.parse(JSON.stringify(params)) })),
    countOps: async (sid: string) => store.ops.filter((o) => o.session === sid).length,
    appendOps: async (sid: string, ops: Op[]) => ops.map((o) => { const id = store.nextId++; store.ops.push({ ...o, id, session: sid }); return id; }),
  };
});

import { getDb, resetFromSeed } from '@/lib/db';
import { DATA_TABLES } from '@/lib/pgstore';
import { ready, persist, setSessionForTests, dropInstanceStateForTests } from '@/lib/session';
import { snapshot } from '@/lib/data';
import { sendRequest, acceptRequest, addToProject } from '@/lib/actions';
import { listBuilds } from '@/lib/builds';

let sid: string | null = null;
const as = async (s: string | null) => { sid = s; await ready(); };
const A = 'visitor-aaaaaaaaaaaaaaaa', B = 'visitor-bbbbbbbbbbbbbbbb';
const count = (sql: string, ...a: unknown[]) => (getDb().prepare(sql).get(...a) as { n: number }).n;
const ELENA = 'person:p008', MAYA = 'person:p010', RESTWELL = 'project:pr009';

describe('hosted demo sessions', () => {
  beforeAll(() => {
    resetFromSeed();
    listBuilds();
    const db = getDb();
    for (const t of DATA_TABLES) store.dataset[t] = db.prepare(`SELECT * FROM ${t}`).all() as Record<string, unknown>[];
    store.on = true;
    setSessionForTests(() => sid);
  });
  afterAll(() => { store.on = false; setSessionForTests(null); dropInstanceStateForTests(); });

  it('each visitor starts from the shared dataset', async () => {
    await as(A);
    expect(snapshot().people.length).toBe(store.dataset.people.length);
    await as(B);
    expect(snapshot().person.get(ELENA)?.name).toBe('Elena Brooks');
  });

  it('a visitor’s request and acceptance are saved and invisible to other visitors', async () => {
    await as(A);
    const { id } = sendRequest({ from: MAYA, to: ELENA, kind: 'expertise', role: 'Early engineer', message: 'From A', projectId: RESTWELL });
    acceptRequest(id, ELENA);
    await persist();
    expect(store.ops.filter((o) => o.session === A).length).toBeGreaterThan(0);
    expect(count("SELECT COUNT(*) n FROM requests WHERE message = 'From A'")).toBe(1);

    await as(B);
    expect(count("SELECT COUNT(*) n FROM requests WHERE message = 'From A'")).toBe(0);
    expect(store.ops.some((o) => o.session === B)).toBe(false);
  });

  it('a fresh serverless instance rebuilds the visitor’s state from the log', async () => {
    dropInstanceStateForTests();
    await as(A);
    expect(count("SELECT COUNT(*) n FROM requests WHERE message = 'From A' AND status = 'accepted'")).toBe(1);
    expect(count("SELECT COUNT(*) n FROM connections WHERE source = 'request' AND ((from_person = ? AND to_person = ?) OR (from_person = ? AND to_person = ?))", MAYA, ELENA, ELENA, MAYA)).toBe(1);
    // the separate owner step still works on the rebuilt copy, and is saved too
    const rid = (getDb().prepare("SELECT id FROM requests WHERE message = 'From A'").get() as { id: string }).id;
    addToProject(rid, ELENA, 'Early engineer');
    await persist();
    dropInstanceStateForTests();
    await as(A);
    expect(snapshot().membersOf.get(RESTWELL)!.some((m) => m.person_id === MAYA)).toBe(true);
    await as(B);
    expect(snapshot().membersOf.get(RESTWELL)!.some((m) => m.person_id === MAYA)).toBe(false);
  });

  it('a failed transaction leaves nothing to save', async () => {
    await as(B);
    const before = store.ops.length;
    const db = getDb();
    expect(() => db.transaction(() => {
      db.prepare("INSERT INTO meta (key, value) VALUES ('x', 'y')").run();
      db.prepare("UPDATE people SET bio = 'changed' WHERE id = ?").run(ELENA);
      throw new Error('boom');
    })()).toThrow('boom');
    await persist();
    expect(store.ops.length).toBe(before);
  });

  it('visitors without a session cookie get a read-only copy', async () => {
    await as(null);
    expect(() => sendRequest({ from: MAYA, to: ELENA, kind: 'expertise', role: 'Helper', message: 'no cookie', projectId: null })).toThrow();
  });
});
