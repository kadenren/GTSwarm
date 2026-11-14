import Database from 'better-sqlite3';
import { hosted, loadDataset, fetchOps, appendOps, countOps, DATA_TABLES, type Op } from './pgstore';

/**
 * Per-visitor demo sessions for the hosted site.
 *
 * The shared demo dataset lives in Supabase Postgres. Each function instance loads it once into an in-memory SQLite
 * copy (so the existing synchronous queries, graph and matching code run unchanged and fast), and each visitor gets
 * their own copy keyed by the `gtswarm_session` cookie. Writes a visitor makes are recorded and appended to
 * Postgres (gts.session_ops); before every request the visitor's log is replayed onto their copy, so any instance
 * serves the same state, nothing is lost between serverless invocations, and visitors are isolated from each other.
 *
 * Locally (no DATABASE_URL) none of this runs: the app uses data/gtswarm.db as before.
 */
export const SESSION_COOKIE = 'gtswarm_session';
export const SESSION_RE = /^[a-z0-9-]{16,64}$/;
const MAX_SESSIONS = 30; // per function instance; least recently used copies are dropped (their changes are in Postgres)
export const MAX_OPS_PER_SESSION = 600;

interface Session { db: Database.Database; raw: Database.Database; applied: Set<number>; pending: Op[]; used: number; synced: number }
interface State { base?: Buffer; loading?: Promise<Buffer>; map: Map<string, Session> }
const g = globalThis as unknown as { __gtSess?: State };
const state = (): State => (g.__gtSess ??= { map: new Map<string, Session>() });

// statements that change visitor-visible data are recorded; caches and embeddings are rebuilt per instance instead
const WRITE = /^\s*(insert|update|delete|replace)\b/i;
const NOT_RECORDED = /\b(into|update|from)\s+(main\.)?(cache|gemini_vec|meta)\b/i;
const recorded = (sql: string) => WRITE.test(sql) && !NOT_RECORDED.test(sql);

async function baseBuffer(): Promise<Buffer> {
  const st = state();
  if (st.base) return st.base;
  st.loading ??= (async () => {
    const { SCHEMA } = await import('./db');
    const data = await loadDataset();
    const mem = new Database(':memory:');
    mem.exec(SCHEMA);
    mem.pragma('foreign_keys = OFF');
    mem.transaction(() => {
      for (const t of DATA_TABLES) {
        const rows = data[t] ?? [];
        if (!rows.length) continue;
        const cols = Object.keys(rows[0]);
        const ins = mem.prepare(`INSERT OR REPLACE INTO ${t} (${cols.map((c) => `"${c}"`).join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
        for (const r of rows) ins.run(...cols.map((c) => toSqlite(r[c])));
      }
    })();
    const buf = mem.serialize();
    mem.close();
    st.base = buf;
    return buf;
  })().catch((e) => { st.loading = undefined; throw e; });
  return st.loading;
}

function toSqlite(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'bigint') return Number(v);
  if (v instanceof Uint8Array) return Buffer.from(v);
  if (v instanceof Date) return v.toISOString();
  return v;
}

/** Wrap a session database so successful writes are queued for Postgres (and dropped again if a transaction rolls back). */
function recording(raw: Database.Database, s: Session): Database.Database {
  return new Proxy(raw, {
    get(target, key) {
      if (key === 'prepare') {
        return (src: string) => {
          const stmt = target.prepare(src);
          if (!recorded(src)) return stmt;
          return new Proxy(stmt, {
            get(st, k) {
              if (k === 'run') return (...args: unknown[]) => { const r = st.run(...args); s.pending.push({ sql: src, params: args }); return r; };
              const v = Reflect.get(st, k);
              return typeof v === 'function' ? v.bind(st) : v;
            },
          });
        };
      }
      if (key === 'exec') return (src: string) => { const r = target.exec(src); if (recorded(src)) s.pending.push({ sql: src, params: null }); return r; };
      if (key === 'transaction') {
        return (fn: (...a: unknown[]) => unknown) => {
          const tx = target.transaction(fn);
          return (...a: unknown[]) => { const mark = s.pending.length; try { return tx(...a); } catch (e) { s.pending.length = mark; throw e; } };
        };
      }
      const v = Reflect.get(target, key);
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
}

function apply(raw: Database.Database, op: Op) {
  try {
    if (op.params === null) raw.exec(op.sql);
    else raw.prepare(op.sql).run(...(op.params as unknown[]));
  } catch (e) {
    // a derived row another instance already wrote, for example; the log stays usable
    console.warn('[gt-swarm] replay skipped one statement:', e instanceof Error ? e.message : e);
  }
}

function cookieValue(c: { get(name: string): { value: string } | undefined } | undefined): string | null {
  const v = c?.get(SESSION_COOKIE)?.value;
  return v && SESSION_RE.test(v) ? v : null;
}

/** The visitor's session id, read synchronously from the request (Next keeps sync cookie access for compatibility). */
let testSession: (() => string | null) | null = null;
/** Tests stand in for the request cookie. */
export function setSessionForTests(fn: (() => string | null) | null) { testSession = fn; }
/** Tests simulate a fresh serverless instance. */
export function dropInstanceStateForTests() { const st = state(); for (const s of st.map.values()) s.raw.close(); st.map.clear(); st.base = undefined; st.loading = undefined; }

export function sessionIdSync(): string | null {
  if (testSession) { const v = testSession(); return v && SESSION_RE.test(v) ? v : null; }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cookies } = require('next/headers') as typeof import('next/headers');
    return cookieValue(cookies() as unknown as { get(name: string): { value: string } | undefined });
  } catch {
    return null;
  }
}

async function sessionIdAsync(): Promise<string | null> {
  if (testSession) return sessionIdSync();
  try {
    const { cookies } = await import('next/headers');
    return cookieValue(await cookies());
  } catch {
    return null;
  }
}

/** Load (or catch up) this visitor's session. Every page and API route awaits this before touching data. */
export async function ready(): Promise<void> {
  if (!hosted()) return;
  const sid = (await sessionIdAsync()) ?? 'public';
  const st = state();
  let s = st.map.get(sid);
  if (!s) {
    const raw = new Database(await baseBuffer());
    raw.pragma('foreign_keys = ON');
    if (sid === 'public') raw.pragma('query_only = ON'); // no cookie, no writes
    s = { raw, db: raw, applied: new Set(), pending: [], used: Date.now(), synced: 0 };
    s.db = recording(raw, s);
    st.map.set(sid, s);
    if (st.map.size > MAX_SESSIONS) {
      const oldest = [...st.map.entries()].filter(([k]) => k !== sid).sort((a, b) => a[1].used - b[1].used)[0];
      if (oldest) { oldest[1].raw.close(); st.map.delete(oldest[0]); }
    }
  }
  s.used = Date.now();
  if (sid === 'public') return; // no cookie (e.g. a crawler): the shared dataset, read-only
  // the layout and the page both call ready() for one request; one fetch is enough
  if (Date.now() - s.synced < 500) return;
  const ops = await fetchOps(sid);
  s.synced = Date.now();
  let changed = false;
  for (const op of ops) if (!s.applied.has(op.id!)) { apply(s.raw, op); s.applied.add(op.id!); changed = true; }
  if (changed) { const { bumpDataVersion } = await import('./db'); bumpDataVersion(s.db); }
}

/** The current visitor's database (after ready()). */
export function currentDb(): Database.Database {
  const s = state().map.get(sessionIdSync() ?? 'public');
  if (!s) throw new Error('Demo session not loaded yet. Call ready() at the start of the request.');
  return s.db;
}

/** Save this visitor's writes to Postgres. API routes call it after changing data. */
export async function persist(): Promise<void> {
  if (!hosted()) return;
  const sid = sessionIdSync();
  const s = sid ? state().map.get(sid) : undefined;
  if (!s || !s.pending.length) return;
  if (!sid) throw new Error('No demo session.');
  const ops = s.pending.splice(0);
  if ((await countOps(sid)) + ops.length > MAX_OPS_PER_SESSION) throw new Error('This demo session is full. Click Demo to start a fresh one.');
  const ids = (await appendOps(sid, ops)).sort((a, b) => a - b);
  for (const id of ids) s.applied.add(id);
}

/** True when a write would go nowhere (no session cookie): such requests are refused. */
export function readOnlyVisitor(): boolean {
  return hosted() && !sessionIdSync();
}
