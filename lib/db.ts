import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { hosted } from './pgstore';
import { currentDb } from './session';

export const DATA_DIR = path.join(process.cwd(), 'data');
export const DB_PATH = process.env.GTSWARM_DB ?? path.join(DATA_DIR, 'gtswarm.db');
export const SEED_DB_PATH = path.join(DATA_DIR, 'gtswarm.seed.db');

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('student','alum')),
  major TEXT NOT NULL,
  grad_year INTEGER NOT NULL,
  current_role TEXT,
  company_type TEXT,
  city TEXT,
  bio TEXT NOT NULL,
  claimed INTEGER NOT NULL DEFAULT 1,
  availability_hours INTEGER NOT NULL DEFAULT 2,
  open_to TEXT NOT NULL DEFAULT '[]',
  embedding BLOB
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  team_type TEXT NOT NULL CHECK (team_type IN ('VIP','Capstone','CREATE-X','Lab','Club','Invention Studio','Startup')),
  team_name TEXT NOT NULL,
  summary TEXT NOT NULL,
  technologies TEXT NOT NULL DEFAULT '[]',
  outcome TEXT,
  is_startup INTEGER NOT NULL DEFAULT 0,
  continued_from TEXT REFERENCES projects(id),
  embedding BLOB
);
CREATE TABLE IF NOT EXISTS skills (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS person_project (
  person_id TEXT NOT NULL REFERENCES people(id),
  project_id TEXT NOT NULL REFERENCES projects(id),
  role TEXT NOT NULL CHECK (role IN ('builder','advisor','maintainer','founder')),
  title TEXT,
  PRIMARY KEY (person_id, project_id)
);
CREATE TABLE IF NOT EXISTS person_skill (
  person_id TEXT NOT NULL REFERENCES people(id),
  skill_id TEXT NOT NULL REFERENCES skills(id),
  PRIMARY KEY (person_id, skill_id)
);
CREATE TABLE IF NOT EXISTS project_skill (
  project_id TEXT NOT NULL REFERENCES projects(id),
  skill_id TEXT NOT NULL REFERENCES skills(id),
  PRIMARY KEY (project_id, skill_id)
);
CREATE TABLE IF NOT EXISTS problems (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  description TEXT NOT NULL,
  solution TEXT NOT NULL,
  solved_by TEXT REFERENCES people(id),
  helper_id TEXT REFERENCES people(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  embedding BLOB
);
CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  from_person TEXT NOT NULL REFERENCES people(id),
  to_person TEXT NOT NULL REFERENCES people(id),
  source TEXT NOT NULL CHECK (source IN ('request','circle','co-advisor','intro','shared-project')),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  from_person TEXT NOT NULL REFERENCES people(id),
  to_person TEXT NOT NULL REFERENCES people(id),
  project_id TEXT REFERENCES projects(id),
  kind TEXT NOT NULL CHECK (kind IN ('expertise','stuck')),
  role TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','accepted','declined')),
  added_as TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  confirmed_by TEXT REFERENCES people(id)
);
CREATE TABLE IF NOT EXISTS project_link (
  project_id TEXT NOT NULL REFERENCES projects(id),
  url TEXT NOT NULL,
  title TEXT,
  PRIMARY KEY (project_id, url)
);
CREATE TABLE IF NOT EXISTS person_link (
  person_id TEXT NOT NULL REFERENCES people(id),
  kind TEXT NOT NULL CHECK (kind IN ('linkedin','github','scholar','website')),
  url TEXT NOT NULL,
  PRIMARY KEY (person_id, kind)
);
CREATE TABLE IF NOT EXISTS person_pref (
  person_id TEXT PRIMARY KEY REFERENCES people(id),
  interests TEXT NOT NULL DEFAULT '[]',
  looking_for TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS project_status (
  project_id TEXT PRIMARY KEY REFERENCES projects(id),
  stage TEXT NOT NULL CHECK (stage IN ('Idea','Prototype','Testing','Pilot','Launched')),
  owner_id TEXT REFERENCES people(id),
  industry TEXT NOT NULL,
  domain TEXT NOT NULL,
  open_to_collab INTEGER NOT NULL DEFAULT 1,
  roles_needed TEXT NOT NULL DEFAULT '[]',
  help_needed TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS gemini_vec (
  id TEXT PRIMARY KEY,
  text_hash TEXT NOT NULL,
  vec BLOB NOT NULL
);
CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_pp_project ON person_project(project_id);
CREATE INDEX IF NOT EXISTS idx_problems_project ON problems(project_id);
CREATE INDEX IF NOT EXISTS idx_conn_from ON connections(from_person);
CREATE INDEX IF NOT EXISTS idx_conn_to ON connections(to_person);
`;

const g = globalThis as unknown as { __gtswarmDb?: Database.Database };

export function openDb(file = DB_PATH): Database.Database {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

export function getDb(): Database.Database {
  if (hosted()) return currentDb(); // the visitor's own copy (see lib/session.ts)
  if (!g.__gtswarmDb) g.__gtswarmDb = openDb();
  // apply new tables to an already-open database (all statements are CREATE ... IF NOT EXISTS)
  const gs = g as unknown as { __gtswarmSchema?: string };
  if (gs.__gtswarmSchema !== SCHEMA) { g.__gtswarmDb.exec(SCHEMA); gs.__gtswarmSchema = SCHEMA; }
  return g.__gtswarmDb;
}

/** In-memory caches (snapshot, graph, search index) are kept per database, so each demo session has its own. */
const stores = new WeakMap<Database.Database, Record<string, unknown>>();
export function dbStore(db: Database.Database = getDb()): Record<string, unknown> {
  let s = stores.get(db);
  if (!s) { s = {}; stores.set(db, s); }
  return s;
}
/** A view of the current database's cache store, usable like a module-level object. */
export function perDb<T extends object>(): T {
  return new Proxy({} as T, {
    get: (_t, k) => dbStore()[k as string],
    set: (_t, k, v) => { dbStore()[k as string] = v; return true; },
  });
}

/** Changes after every write (this process or another, e.g. a re-seed) so in-memory caches rebuild. */
export function dataVersion(): string {
  const db = getDb();
  const external = db.pragma('data_version', { simple: true });
  return `${(dbStore(db).__version as number | undefined) ?? 0}:${external}`;
}
export function bumpDataVersion(db: Database.Database = getDb()) {
  const s = dbStore(db);
  s.__version = ((s.__version as number | undefined) ?? 0) + 1;
  // keep Gemini vectors in step with new or edited records (no-op without a key; off on the hosted demo)
  if (!hosted()) import('./geminiVec').then((m) => m.embedNewInBackground()).catch(() => undefined);
}

/** Restore the database from the pristine seed snapshot (used by /demo/reset and tests). */
export function resetFromSeed(db: Database.Database = getDb()) {
  if (!fs.existsSync(SEED_DB_PATH)) throw new Error('Seed snapshot missing. Run `npm run seed` first.');
  const tables = ['requests', 'connections', 'milestones', 'problems', 'person_skill', 'project_skill', 'person_project', 'skills', 'projects', 'people', 'cache', 'meta'];
  db.exec(`ATTACH DATABASE '${SEED_DB_PATH.replace(/'/g, "''")}' AS seed`);
  try {
    db.pragma('foreign_keys = OFF');
    db.transaction(() => {
      db.exec('DELETE FROM main.project_link; DELETE FROM main.person_link; DELETE FROM main.project_status; DELETE FROM main.person_pref;'); // re-derived after reset; anything here was added during a demo
      // polished wording is keyed by the exact template text, so it stays valid across resets; keep it
      for (const t of tables) db.exec(t === 'cache' ? "DELETE FROM main.cache WHERE key NOT LIKE 'polish:%' AND key NOT LIKE 'gq:%' AND key NOT LIKE 'mm:%'" : `DELETE FROM main.${t}`);
      for (const t of [...tables].reverse()) db.exec(`INSERT OR IGNORE INTO main.${t} SELECT * FROM seed.${t}`);
    })();
  } finally {
    db.pragma('foreign_keys = ON');
    db.exec('DETACH DATABASE seed');
  }
  bumpDataVersion();
}

export const parseJson = <T,>(s: string | null | undefined, fallback: T): T => {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
};
