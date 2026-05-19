/** Database layer — MySQL (primary) with sql.js fallback */

import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';

// ---- MySQL backend ----
import {
  initMySQL as _initMySQL,
  all as _mysqlAll,
  closeDatabase as _mysqlClose,
  get as _mysqlGet,
  run as _mysqlRun,
  saveToDisk as _mysqlSave,
} from './mysql';

// ---- sql.js backend ----
import { SCHEMA_SQL } from './schema';

let sqlJsDb: SqlJsDatabase | null = null;
let sqlJsPath = '';
let useMySQL = false;

function resolveSqlJsPath(): string {
  const base =
    process.env.APPDATA ||
    (process.platform === 'darwin'
      ? path.join(process.env.HOME || '', 'Library', 'Application Support')
      : path.join(process.env.HOME || '', '.local', 'share'));
  return path.join(base, 'LocalBlogKB', 'database.db');
}

// ---- Public API ----

export async function initDatabase(): Promise<void> {
  // Try MySQL first
  try {
    await _initMySQL();
    useMySQL = true;
    console.log('[DB] MySQL initialized');

    // Migrate sql.js data if exists
    await migrateSqlJsToMySQL();
    return;
  } catch (err) {
    console.log('[DB] MySQL unavailable, using sql.js:', (err as Error).message);
  }

  // Fallback to sql.js
  const SQL = await initSqlJs();
  sqlJsPath = resolveSqlJsPath();
  const dir = path.dirname(sqlJsPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(sqlJsPath)) {
    const buffer = fs.readFileSync(sqlJsPath);
    sqlJsDb = new SQL.Database(buffer);
  } else {
    sqlJsDb = new SQL.Database();
  }

  sqlJsDb.run('PRAGMA journal_mode=WAL');
  sqlJsDb.run('PRAGMA foreign_keys=ON');
  sqlJsDb.run(SCHEMA_SQL);

  // SCHEMA FROZEN as of 2026-05-06 — no new columns in sql.js DDL.
  // Idempotent migrations for databases created before these columns existed.
  // Empty catch is intentional: ALTER TABLE ADD COLUMN throws if column already exists,
  // which is the expected case for up-to-date databases.
  try {
    sqlJsDb.run("ALTER TABLE blogs ADD COLUMN content TEXT NOT NULL DEFAULT ''");
  } catch {
    /* column already exists */
  }
  try {
    sqlJsDb.run('ALTER TABLE blogs ADD COLUMN folder_id INTEGER DEFAULT NULL');
  } catch {
    /* column already exists */
  }
  try {
    sqlJsDb.run('ALTER TABLE blogs ADD COLUMN series_id TEXT DEFAULT NULL');
  } catch {
    /* column already exists */
  }
  try {
    sqlJsDb.run('ALTER TABLE blogs ADD COLUMN series_name TEXT DEFAULT NULL');
  } catch {
    /* column already exists */
  }
  try {
    sqlJsDb.run('ALTER TABLE knowledge_files ADD COLUMN folder_id INTEGER DEFAULT NULL');
  } catch {
    /* column already exists */
  }
  try {
    sqlJsDb.run("ALTER TABLE knowledge_files ADD COLUMN content_text TEXT DEFAULT ''");
  } catch {
    /* column already exists */
  }
  // T1509a: tags.description column for tag descriptions (Phase 15)
  try {
    sqlJsDb.run("ALTER TABLE tags ADD COLUMN description TEXT DEFAULT ''");
  } catch {
    /* column already exists */
  }
  // T12S1: notes table for standalone sticky notes (Phase 12 supplement)
  try {
    sqlJsDb.run(`CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
  } catch {
    /* table already exists */
  }

  // R142: T1906 notes table extension — ALTER TABLE for existing sql.js databases
  try { sqlJsDb.run("ALTER TABLE notes ADD COLUMN title TEXT DEFAULT ''"); } catch { /* column exists */ }
  try { sqlJsDb.run("ALTER TABLE notes ADD COLUMN memo_type TEXT DEFAULT 'note'"); } catch { /* column exists */ }
  try { sqlJsDb.run("ALTER TABLE notes ADD COLUMN due_date TEXT DEFAULT NULL"); } catch { /* column exists */ }
  try { sqlJsDb.run("ALTER TABLE notes ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))"); } catch { /* column exists */ }

  // R170: Remove CHECK constraint from refs table (D54 — allow 'note' type)
  // SQLite has no ALTER TABLE DROP CHECK, so rebuild the table.
  // Idempotent: if rebuild already done, DROP IF EXISTS + CREATE IF NOT EXISTS are no-ops.
  try {
    const refsExists = sqlJsDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='refs'");
    if (refsExists.length > 0 && refsExists[0]!.values!.length > 0) {
      sqlJsDb.run(`CREATE TABLE IF NOT EXISTS refs_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_type TEXT NOT NULL,
        source_id INTEGER NOT NULL,
        target_type TEXT NOT NULL,
        target_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(source_type, source_id, target_type, target_id)
      )`);
      // Only copy if refs_new is empty (idempotent guard)
      const count = sqlJsDb.exec('SELECT COUNT(*) as c FROM refs_new');
      const newCount = count[0]?.values?.[0]?.[0] as number ?? 0;
      if (newCount === 0) {
        sqlJsDb.run('INSERT INTO refs_new SELECT * FROM refs');
        sqlJsDb.run('DROP TABLE refs');
        sqlJsDb.run('ALTER TABLE refs_new RENAME TO refs');
      } else {
        sqlJsDb.run('DROP TABLE refs_new');
      }
    }
  } catch { /* refs table may not exist */ }

  // R171: Remove CHECK constraint from notes memo_type (D54 — allow 'daily')
  try {
    const notesExist = sqlJsDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='notes'");
    if (notesExist.length > 0 && notesExist[0]!.values!.length > 0) {
      sqlJsDb.run(`CREATE TABLE IF NOT EXISTS notes_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        pinned INTEGER NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'manual',
        title TEXT NOT NULL DEFAULT '',
        memo_type TEXT NOT NULL DEFAULT 'note',
        due_date TEXT DEFAULT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      const count = sqlJsDb.exec('SELECT COUNT(*) as c FROM notes_new');
      const newCount = count[0]?.values?.[0]?.[0] as number ?? 0;
      if (newCount === 0) {
        sqlJsDb.run('INSERT INTO notes_new SELECT * FROM notes');
        sqlJsDb.run('DROP TABLE notes');
        sqlJsDb.run('ALTER TABLE notes_new RENAME TO notes');
      } else {
        sqlJsDb.run('DROP TABLE notes_new');
      }
    }
  } catch { /* notes table may not exist */ }

  // R176: properties column for knowledge_files (T2009)
  try { sqlJsDb.run("ALTER TABLE knowledge_files ADD COLUMN properties TEXT DEFAULT '{}'"); } catch { /* column exists */ }

  // T2103+T2108: blogs metadata columns (cover_image, icon, is_pinned, color)
  try { sqlJsDb.run('ALTER TABLE blogs ADD COLUMN cover_image TEXT DEFAULT NULL'); } catch { /* exists */ }
  try { sqlJsDb.run('ALTER TABLE blogs ADD COLUMN icon TEXT DEFAULT NULL'); } catch { /* exists */ }
  try { sqlJsDb.run('ALTER TABLE blogs ADD COLUMN is_pinned INTEGER DEFAULT 0'); } catch { /* exists */ }
  try { sqlJsDb.run('ALTER TABLE blogs ADD COLUMN color TEXT DEFAULT NULL'); } catch { /* exists */ }

  sqlJsSave();
  useMySQL = false;
  console.log('[DB] sql.js initialized at', sqlJsPath);
}

/** @deprecated Use {@link dbRun} — the unified async helper that works with both MySQL and sql.js */
export function run(sql: string, params: unknown[] = []): void {
  if (useMySQL) {
    throw new Error('MySQL requires async; use dbRun instead');
  }
  if (!sqlJsDb) throw new Error('DB not initialized');
  sqlJsDb.run(sql, params);
  sqlJsSave();
}

/** @deprecated Use {@link dbRun} instead */
export async function runAsync(sql: string, params: unknown[] = []): Promise<void> {
  if (useMySQL) return _mysqlRun(sql, params);
  run(sql, params);
}

/** @deprecated Use {@link dbGet} — the unified async helper that works with both MySQL and sql.js */
export function get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
  if (useMySQL) throw new Error('MySQL requires async; use dbGet instead');
  if (!sqlJsDb) throw new Error('DB not initialized');
  const stmt = sqlJsDb.prepare(sql);
  // @ts-ignore sql.js bind type incompatibility
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as T;
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

/** @deprecated Use {@link dbGet} instead */
export async function getAsync<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T | undefined> {
  if (useMySQL) return _mysqlGet<T>(sql, params);
  return get<T>(sql, params);
}

/** @deprecated Use {@link dbAll} — the unified async helper that works with both MySQL and sql.js */
export function all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  if (useMySQL) throw new Error('MySQL requires async; use dbAll instead');
  if (!sqlJsDb) throw new Error('DB not initialized');
  const stmt = sqlJsDb.prepare(sql);
  stmt.bind(params as any[]);
  const rows: T[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject() as unknown as T);
  stmt.free();
  return rows;
}

/** @deprecated Use {@link dbAll} instead */
export async function allAsync<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (useMySQL) return _mysqlAll<T>(sql, params);
  return all<T>(sql, params);
}

// Unified async database helpers — the only API services should use
export async function dbGet<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  if (useMySQL) return _mysqlGet<T>(sql, params);
  return get<T>(sql, params);
}
export async function dbAll<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (useMySQL) return _mysqlAll<T>(sql, params);
  return all<T>(sql, params);
}
export async function dbRun(sql: string, params: unknown[] = []): Promise<void> {
  if (useMySQL) {
    await _mysqlRun(sql, params);
    return;
  }
  run(sql, params); // run() already calls sqlJsSave()
}

export function saveToDisk(): void {
  if (!useMySQL) sqlJsSaveNow();
}

export function closeDatabase(): void {
  if (useMySQL) {
    _mysqlClose();
  } else if (sqlJsDb) {
    sqlJsSaveNow();
    sqlJsDb.close();
    sqlJsDb = null;
  }
}

export function isUsingMySQL(): boolean {
  return useMySQL;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let savePending = false;

function sqlJsSave(): void {
  if (!sqlJsDb || !sqlJsPath) return;
  savePending = true;
  if (saveTimer) return; // already scheduled
  saveTimer = setTimeout(() => {
    savePending = false;
    saveTimer = null;
    if (sqlJsDb && sqlJsPath) {
      fs.writeFileSync(sqlJsPath, Buffer.from(sqlJsDb.export()));
    }
  }, 500);
}

function sqlJsSaveNow(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (sqlJsDb && sqlJsPath && savePending) {
    savePending = false;
    fs.writeFileSync(sqlJsPath, Buffer.from(sqlJsDb.export()));
  }
}

async function migrateSqlJsToMySQL(): Promise<void> {
  const sqlPath = resolveSqlJsPath();
  if (!fs.existsSync(sqlPath)) return;

  try {
    console.log('[DB] Checking for sql.js data to migrate...');
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(sqlPath);
    const oldDb = new SQL.Database(buffer);

    // Check if MySQL already has users (skip if so)
    const userCount = await _mysqlGet<{ c: number }>('SELECT COUNT(*) as c FROM users');
    if (userCount && userCount.c > 0) {
      console.log('[DB] MySQL already has data, skipping migration');
      oldDb.close();
      return;
    }

    // Migrate users
    const users = sqlJsQuery(oldDb, 'SELECT * FROM users');
    for (const u of users) {
      await _mysqlRun(
        'INSERT INTO users (id, username, password_hash, workspace_path, created_at) VALUES (?,?,?,?,?)',
        [u.id, u.username, u.password_hash, u.workspace_path, u.created_at],
      );
    }

    // Migrate blogs (R158: include content/folder_id/series_id/series_name + T2103 cover_image/icon/is_pinned/color)
    const blogs = sqlJsQuery(oldDb, 'SELECT * FROM blogs');
    for (const b of blogs) {
      await _mysqlRun(
        'INSERT INTO blogs (id, user_id, title, content, format, status, folder_id, series_id, series_name, cover_image, icon, is_pinned, color, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [b.id, b.user_id, b.title, (b.content as string) ?? '', b.format, b.status, (b.folder_id as number | null) ?? null, (b.series_id as string | null) ?? null, (b.series_name as string | null) ?? null, (b.cover_image as string) ?? null, (b.icon as string) ?? null, (b.is_pinned as number) ?? 0, (b.color as string) ?? null, b.created_at, b.updated_at],
      );
    }

    // Migrate tags (R158: include description from ALTER TABLE)
    const tags = sqlJsQuery(oldDb, 'SELECT * FROM tags');
    for (const t of tags) {
      await _mysqlRun(
        'INSERT INTO tags (id, user_id, name, description) VALUES (?,?,?,?)',
        [t.id, t.user_id, t.name, (t.description as string | null) ?? null],
      );
    }

    // Migrate blog_tags
    const blogTags = sqlJsQuery(oldDb, 'SELECT * FROM blog_tags');
    for (const bt of blogTags) {
      await _mysqlRun('INSERT INTO blog_tags (id, blog_id, tag_id) VALUES (?,?,?)', [bt.id, bt.blog_id, bt.tag_id]);
    }

    // Migrate sessions
    const sessions = sqlJsQuery(oldDb, 'SELECT * FROM sessions');
    for (const s of sessions) {
      await _mysqlRun('INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES (?,?,?,?,?)', [
        s.id,
        s.user_id,
        s.token,
        s.expires_at,
        s.created_at,
      ]);
    }

    // Migrate knowledge_files (R158: include content_text/folder_id; R176: include properties)
    const kfs = sqlJsQuery(oldDb, 'SELECT * FROM knowledge_files');
    for (const k of kfs) {
      await _mysqlRun(
        'INSERT INTO knowledge_files (id, user_id, filename, file_path, file_type, file_size, status, content_text, folder_id, properties, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [k.id, k.user_id, k.filename, k.file_path, k.file_type, k.file_size, k.status, (k.content_text as string | null) ?? null, (k.folder_id as number | null) ?? null, (k.properties as string | null) ?? null, k.created_at, k.updated_at],
      );
    }

    // Migrate knowledge_file_tags
    const kft = sqlJsQuery(oldDb, 'SELECT * FROM knowledge_file_tags');
    for (const k of kft) {
      await _mysqlRun('INSERT INTO knowledge_file_tags (id, file_id, tag_id) VALUES (?,?,?)', [
        k.id,
        k.file_id,
        k.tag_id,
      ]);
    }

    // Migrate recycle_bin
    const rb = sqlJsQuery(oldDb, 'SELECT * FROM recycle_bin');
    for (const r of rb) {
      await _mysqlRun('INSERT INTO recycle_bin (id, user_id, item_type, item_id, deleted_at) VALUES (?,?,?,?,?)', [
        r.id,
        r.user_id,
        r.item_type,
        r.item_id,
        r.deleted_at,
      ]);
    }

    // Migrate blog_drafts
    const drafts = sqlJsQuery(oldDb, 'SELECT * FROM blog_drafts');
    for (const d of drafts) {
      await _mysqlRun('INSERT INTO blog_drafts (id, blog_id, content, saved_at) VALUES (?,?,?,?)', [
        d.id,
        d.blog_id,
        d.content,
        d.saved_at,
      ]);
    }

    // R144: Migrate folders
    try {
      const folders = sqlJsQuery(oldDb, 'SELECT * FROM folders');
      for (const f of folders) {
        await _mysqlRun(
          'INSERT INTO folders (id, user_id, name, parent_id, type, sort_order, created_at) VALUES (?,?,?,?,?,?,?)',
          [f.id, f.user_id, f.name, f.parent_id ?? null, f.type, f.sort_order ?? 0, f.created_at],
        );
      }
    } catch { /* folders table may not exist in old DB */ }

    // R144: Migrate refs
    try {
      const refs = sqlJsQuery(oldDb, 'SELECT * FROM refs');
      for (const r of refs) {
        await _mysqlRun(
          'INSERT INTO refs (id, source_type, source_id, target_type, target_id, created_at) VALUES (?,?,?,?,?,?)',
          [r.id, r.source_type, r.source_id, r.target_type, r.target_id, r.created_at],
        );
      }
    } catch { /* refs table may not exist in old DB */ }

    // R144: Migrate notes
    try {
      const notes = sqlJsQuery(oldDb, 'SELECT * FROM notes');
      for (const n of notes) {
        await _mysqlRun(
          'INSERT INTO notes (id, user_id, content, pinned, source, created_at, title, memo_type, due_date, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
          [n.id, n.user_id, n.content ?? '', n.pinned ?? 0, n.source ?? 'manual', n.created_at, n.title ?? '', n.memo_type ?? 'note', n.due_date ?? null, n.updated_at ?? n.created_at],
        );
      }
    } catch { /* notes table may not exist in old DB */ }

    oldDb.close();
    console.log(`[DB] Migration complete: ${users.length} users, ${blogs.length} blogs`);
  } catch (err) {
    console.log('[DB] Migration skipped:', (err as Error).message);
  }
}

function sqlJsQuery(db: SqlJsDatabase, sql: string): Record<string, unknown>[] {
  const stmt = db.prepare(sql);
  const rows: Record<string, unknown>[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

export function lastInsertRowId(): number {
  if (!sqlJsDb) return 0;
  const result = sqlJsDb.exec('SELECT last_insert_rowid() as id');
  if (result.length > 0 && (result[0]?.values?.length ?? 0) > 0) {
    return result[0]!.values![0]![0] as number;
  }
  return 0;
}
