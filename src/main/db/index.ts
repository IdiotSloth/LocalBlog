/** Database layer — sql.js (Phase 24) */

import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';
import { SCHEMA_SQL } from './schema';

let db: import('sql.js').Database | null = null;
let dbPath = '';

function resolveDbPath(): string {
  const base =
    process.env.APPDATA ||
    (process.platform === 'darwin'
      ? path.join(process.env.HOME || '', 'Library', 'Application Support')
      : path.join(process.env.HOME || '', '.local', 'share'));
  return path.join(base, 'LocalBlogKB', 'database.db');
}

// ---- Public API ----

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs();
  dbPath = resolveDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA foreign_keys=ON');
  db.run(SCHEMA_SQL);

  // Idempotent ALTER TABLE migrations
  const migrations = [
    "ALTER TABLE blogs ADD COLUMN content TEXT NOT NULL DEFAULT ''",
    'ALTER TABLE blogs ADD COLUMN folder_id INTEGER DEFAULT NULL',
    'ALTER TABLE blogs ADD COLUMN series_id TEXT DEFAULT NULL',
    'ALTER TABLE blogs ADD COLUMN series_name TEXT DEFAULT NULL',
    'ALTER TABLE knowledge_files ADD COLUMN folder_id INTEGER DEFAULT NULL',
    "ALTER TABLE knowledge_files ADD COLUMN content_text TEXT DEFAULT ''",
    "ALTER TABLE tags ADD COLUMN description TEXT DEFAULT ''",
    `CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    "ALTER TABLE notes ADD COLUMN title TEXT DEFAULT ''",
    "ALTER TABLE notes ADD COLUMN memo_type TEXT DEFAULT 'note'",
    "ALTER TABLE notes ADD COLUMN due_date TEXT DEFAULT NULL",
    "ALTER TABLE notes ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))",
    `CREATE TABLE IF NOT EXISTS refs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_type TEXT NOT NULL, source_id INTEGER NOT NULL,
      target_type TEXT NOT NULL, target_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(source_type, source_id, target_type, target_id)
    )`,
    "ALTER TABLE knowledge_files ADD COLUMN properties TEXT DEFAULT '{}'",
    'ALTER TABLE blogs ADD COLUMN cover_image TEXT DEFAULT NULL',
    'ALTER TABLE blogs ADD COLUMN icon TEXT DEFAULT NULL',
    'ALTER TABLE blogs ADD COLUMN is_pinned INTEGER DEFAULT 0',
    'ALTER TABLE blogs ADD COLUMN color TEXT DEFAULT NULL',
    `CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL, target_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS whiteboards (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL DEFAULT '我的白板', description TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS whiteboard_nodes (id INTEGER PRIMARY KEY AUTOINCREMENT, whiteboard_id INTEGER NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, node_type TEXT NOT NULL DEFAULT 'idea', ref_type TEXT, ref_id INTEGER, title TEXT NOT NULL DEFAULT '', summary TEXT DEFAULT '', color TEXT DEFAULT 'blue', task_status TEXT DEFAULT 'todo', x REAL NOT NULL DEFAULT 0, y REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS whiteboard_edges (id INTEGER PRIMARY KEY AUTOINCREMENT, whiteboard_id INTEGER NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE, source_node_id INTEGER NOT NULL REFERENCES whiteboard_nodes(id) ON DELETE CASCADE, target_node_id INTEGER NOT NULL REFERENCES whiteboard_nodes(id) ON DELETE CASCADE, edge_type TEXT DEFAULT 'reference', label TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key TEXT NOT NULL, value TEXT NOT NULL,
      UNIQUE(user_id, key)
    )`,
  ];

  for (const sql of migrations) {
    try { db.run(sql); } catch { /* already applied */ }
  }

  // R170: Migrate refs from old table if exists
  try {
    // Check if refs_old exists and has data, migrate to refs
    const chk = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='refs_old'");
    if (chk.length > 0 && chk[0]!.values!.length > 0) {
      const cnt = db.exec('SELECT COUNT(*) as c FROM refs');
      if (cnt[0]?.values?.[0]?.[0] === 0) {
        db.run('INSERT OR IGNORE INTO refs SELECT * FROM refs_old');
        db.run('DROP TABLE refs_old');
      }
    }
  } catch { /* refs_old may not exist */ }

  // R171: Migrate notes from old table
  try {
    const chk = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='notes_old'");
    if (chk.length > 0 && chk[0]!.values!.length > 0) {
      db.run('INSERT OR IGNORE INTO notes SELECT * FROM notes_old');
      db.run('DROP TABLE notes_old');
    }
  } catch { /* notes_old may not exist */ }

  scheduleSaveNow();
  console.log('[DB] sql.js initialized at', dbPath);
}

// Unified async database helpers
export async function dbGet<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  if (!db) throw new Error('DB not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params as any);
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as T;
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

export async function dbAll<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (!db) throw new Error('DB not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params as any);
  const rows: T[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject() as unknown as T);
  stmt.free();
  return rows;
}

export async function dbRun(sql: string, params: unknown[] = []): Promise<void> {
  if (!db) throw new Error('DB not initialized');
  db.run(sql, params);
  scheduleSave();
}

// Debounced WAL checkpoint for persistence
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let savePending = false;

function scheduleSave(): void {
  if (!db || !dbPath) return;
  savePending = true;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    savePending = false;
    saveTimer = null;
    scheduleSaveNow();
  }, 500);
}

function scheduleSaveNow(): void {
  if (db && dbPath) {
    try { fs.writeFileSync(dbPath, Buffer.from(db.export())); } catch { /* best-effort */ }
  }
}

export function saveToDisk(): void {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (db && savePending) {
    savePending = false;
    scheduleSaveNow();
  }
}

export function closeDatabase(): void {
  if (db) {
    scheduleSaveNow();
    db.close();
    db = null;
  }
}

export function lastInsertRowId(): number {
  if (!db) return 0;
  const result = db.exec('SELECT last_insert_rowid() as id');
  if (result.length > 0 && (result[0]?.values?.length ?? 0) > 0) {
    return result[0]!.values![0]![0] as number;
  }
  return 0;
}
