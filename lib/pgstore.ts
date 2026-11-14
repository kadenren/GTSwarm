import postgres from 'postgres';

/**
 * Supabase Postgres access (server only; DATABASE_URL never reaches the browser).
 *
 * Schema `gts` holds:
 *  - the demo dataset, one table per app table (people, projects, skills, problems, embeddings, ...), seeded once by
 *    `npm run db:seed` from the local seed database;
 *  - `session_ops`: each visitor's own changes (invites, requests, accepts, profile edits), as an ordered log of the
 *    parameterized statements the app ran. A visitor's view = the dataset + their log, so visitors never see or
 *    disturb each other's demo, and everything persists across reloads and deployments.
 * Every table has row level security on with no policies, so Supabase's public API keys cannot read or write it;
 * only this server, connecting with the database URL, can.
 */
export const PG_SCHEMA = 'gts';

/** Tables copied from SQLite to Postgres, in an order that respects foreign keys. */
export const DATA_TABLES = [
  'people', 'projects', 'skills', 'person_project', 'person_skill', 'project_skill', 'problems', 'milestones',
  'connections', 'requests', 'project_link', 'person_link', 'project_status', 'person_pref', 'gemini_vec', 'cache', 'meta',
] as const;

export interface Op { id?: number; sql: string; params: unknown[] | null } // params null = a multi-statement exec

const g = globalThis as unknown as { __gtPg?: postgres.Sql };

export function hosted(): boolean {
  return !!process.env.DATABASE_URL;
}

/** Supabase needs TLS; a local test server (localhost) does not. */
export const localPg = (url: string) => /@(localhost|127.0.0.1)[:/]/.test(url);

export function pg(): postgres.Sql {
  if (!g.__gtPg) {
    // prepare:false works with Supabase's transaction pooler (port 6543), which suits serverless functions
    g.__gtPg = postgres(process.env.DATABASE_URL!, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 15, ssl: localPg(process.env.DATABASE_URL!) ? false : 'require' });
  }
  return g.__gtPg;
}

/** Fail fast with a clear error instead of letting a stuck connection run into the platform timeout. */
function withTimeout<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([work, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(`${what} took longer than ${ms / 1000}s`)), ms); })]).finally(() => clearTimeout(timer));
}

/** All rows of every dataset table. */
export async function loadDataset(): Promise<Record<string, Record<string, unknown>[]>> {
  const sql = pg();
  const out: Record<string, Record<string, unknown>[]> = {};
  // One query in flight per connection: Supabase's transaction pooler stalls when many queries are pipelined at once.
  const queue: string[] = [...DATA_TABLES];
  const work = Promise.all([0, 1, 2].map(async () => {
    for (let t = queue.shift(); t; t = queue.shift()) out[t] = await sql.unsafe(`SELECT * FROM ${PG_SCHEMA}.${t}`);
  }));
  await withTimeout(work, 25000, 'Loading the demo dataset from Postgres');
  return out;
}

// JSON cannot carry Buffers directly; tag them so replay restores them
const encode = (v: unknown): unknown => (Buffer.isBuffer(v) ? { $b64: v.toString('base64') } : Array.isArray(v) ? v.map(encode) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x)])) : v);
const decode = (v: unknown): unknown => (v && typeof v === 'object' && !Array.isArray(v) && '$b64' in (v as object) ? Buffer.from((v as { $b64: string }).$b64, 'base64') : Array.isArray(v) ? v.map(decode) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, decode(x)])) : v);

export async function fetchOps(sessionId: string): Promise<Op[]> {
  const rows = await withTimeout(pg()<{ id: string; sql: string; params: unknown[] }[]>`SELECT id, sql, params FROM gts.session_ops WHERE session_id = ${sessionId} ORDER BY id`, 10000, 'Loading this demo session');
  return rows.map((r) => ({ id: Number(r.id), sql: r.sql, params: decode(r.params) as unknown[] }));
}

export async function countOps(sessionId: string): Promise<number> {
  const [r] = await pg()<{ n: string }[]>`SELECT count(*) AS n FROM gts.session_ops WHERE session_id = ${sessionId}`;
  return Number(r.n);
}

export async function appendOps(sessionId: string, ops: Op[]): Promise<number[]> {
  if (!ops.length) return [];
  const sql = pg();
  const ids: number[] = [];
  // a request writes a handful of statements; insert them in order so ids follow the order they ran
  for (const o of ops) {
    const [r] = await sql<{ id: string }[]>`INSERT INTO gts.session_ops (session_id, sql, params) VALUES (${sessionId}, ${o.sql}, ${sql.json(encode(o.params) as postgres.JSONValue)}) RETURNING id`;
    ids.push(Number(r.id));
  }
  return ids;
}
