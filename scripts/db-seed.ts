/**
 * Migrate and seed the hosted demo database (Supabase Postgres). Run once, and again only when the demo data changes:
 *
 *   DATABASE_URL=postgres://... npm run db:seed              # (re)load the dataset; visitors' sessions are kept
 *   DATABASE_URL=postgres://... npm run db:seed -- --reset-sessions   # also clear every visitor's demo changes
 *
 * It takes the pristine demo state from the local SQLite database (data/gtswarm.db restored from the seed snapshot,
 * with build statuses derived and Gemini vectors kept), then mirrors every table into the `gts` schema in Postgres,
 * creates the per-visitor `gts.session_ops` log, and turns on row level security with no policies, so Supabase's
 * public API keys cannot read or change anything. Only the app server, holding DATABASE_URL, can.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import postgres from 'postgres';
import Database from 'better-sqlite3';

const url = process.env.DATABASE_URL;
if (!url) { console.error('Set DATABASE_URL to your Supabase Postgres connection string.'); process.exit(1); }
delete process.env.DATABASE_URL; // the app modules below must read the local SQLite file, not the hosted session layer
const resetSessions = process.argv.includes('--reset-sessions');

async function main() {
  // 1. a throwaway copy of the local database, restored to the pristine demo state
  const src = path.join(process.cwd(), 'data', 'gtswarm.db');
  if (!fs.existsSync(src)) throw new Error('data/gtswarm.db not found. Run `npm run seed` (and optionally `npm run ai:warm`) first.');
  const tmp = path.join(os.tmpdir(), `gtswarm-export-${Date.now()}.db`);
  await new Database(src, { readonly: true }).backup(tmp);
  process.env.GTSWARM_DB = tmp;
  const { getDb, resetFromSeed } = await import('../lib/db');
  const { listBuilds } = await import('../lib/builds');
  const { DATA_TABLES, PG_SCHEMA } = await import('../lib/pgstore');
  resetFromSeed();
  const builds = listBuilds(); // derives project_status so the hosted copy never has to write on page loads
  const db = getDb();
  db.exec("DELETE FROM cache WHERE key NOT LIKE 'gq:%' AND key NOT LIKE 'polish:%' AND key NOT LIKE 'mm:%'");

  const { localPg } = await import('../lib/pgstore');
  const sql = postgres(url!, { prepare: false, max: 1, ssl: localPg(url!) ? false : 'require', onnotice: () => undefined });
  try {
    await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS ${PG_SCHEMA}`);
    const counts: Record<string, number> = {};
    for (const t of DATA_TABLES) {
      const info = db.prepare(`PRAGMA table_info(${t})`).all() as { name: string; type: string; pk: number }[];
      const rows = db.prepare(`SELECT * FROM ${t}`).all() as Record<string, unknown>[];
      const pgType = (c: { name: string; type: string }) => {
        const ty = c.type.toUpperCase();
        if (ty.includes('INT')) return rows.some((r) => typeof r[c.name] === 'number' && Math.abs(r[c.name] as number) > 2e9) ? 'bigint' : 'integer';
        if (ty.includes('REAL') || ty.includes('FLOA') || ty.includes('DOUB')) return 'double precision';
        if (ty.includes('BLOB')) return 'bytea';
        return 'text';
      };
      const pk = info.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => `"${c.name}"`);
      await sql.unsafe(`DROP TABLE IF EXISTS ${PG_SCHEMA}.${t}`);
      await sql.unsafe(`CREATE TABLE ${PG_SCHEMA}.${t} (${info.map((c) => `"${c.name}" ${pgType(c)}`).join(', ')}${pk.length ? `, PRIMARY KEY (${pk.join(', ')})` : ''})`);
      await sql.unsafe(`ALTER TABLE ${PG_SCHEMA}.${t} ENABLE ROW LEVEL SECURITY`);
      const cols = info.map((c) => c.name);
      const per = Math.max(1, Math.floor(30000 / cols.length));
      for (let i = 0; i < rows.length; i += per) {
        const batch = rows.slice(i, i + per);
        const params: unknown[] = [];
        const values = batch.map((r) => `(${cols.map((c) => { params.push(r[c] ?? null); return `$${params.length}`; }).join(',')})`);
        await sql.unsafe(`INSERT INTO ${PG_SCHEMA}.${t} (${cols.map((c) => `"${c}"`).join(',')}) VALUES ${values.join(',')}`, params as postgres.ParameterOrJSON<never>[]);
      }
      counts[t] = rows.length;
    }
    // each visitor's own changes
    await sql.unsafe(`CREATE TABLE IF NOT EXISTS ${PG_SCHEMA}.session_ops (id bigserial PRIMARY KEY, session_id text NOT NULL, sql text NOT NULL, params jsonb, created_at timestamptz NOT NULL DEFAULT now())`);
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS session_ops_session ON ${PG_SCHEMA}.session_ops (session_id, id)`);
    await sql.unsafe(`ALTER TABLE ${PG_SCHEMA}.session_ops ENABLE ROW LEVEL SECURITY`);
    if (resetSessions) await sql.unsafe(`TRUNCATE ${PG_SCHEMA}.session_ops`);
    // Supabase's API roles get nothing in this schema (it is also not exposed through the API)
    await sql.unsafe(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA ${PG_SCHEMA} FROM anon, authenticated'; EXECUTE 'REVOKE ALL ON SCHEMA ${PG_SCHEMA} FROM anon, authenticated'; END IF;
    END $$`);
    const [{ n }] = await sql<{ n: string }[]>`SELECT count(*) AS n FROM gts.session_ops`;
    console.log('Seeded schema gts:', counts);
    console.log(`Active builds: ${builds.length}. Visitor session changes stored: ${n}${resetSessions ? ' (cleared)' : ''}.`);
  } finally {
    await sql.end();
    db.close();
    fs.rmSync(tmp, { force: true });
    for (const ext of ['-wal', '-shm']) fs.rmSync(tmp + ext, { force: true });
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
