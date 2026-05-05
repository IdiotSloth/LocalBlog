"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const node_child_process = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const electron = require("electron");
const initSqlJs = require("sql.js");
const mysql = require("mysql2/promise");
const crypto = require("node:crypto");
const ExcelJS = require("exceljs");
const mammoth = require("mammoth");
const TurndownService = require("turndown");
const MYSQL_DDL = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(256) NOT NULL, workspace_path VARCHAR(500) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS tags (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, name VARCHAR(100) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS folders (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL, parent_id INT DEFAULT NULL,
    type VARCHAR(20) NOT NULL, sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS blogs (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL, format ENUM('md','html') DEFAULT 'md',
    content LONGTEXT, status ENUM('active','trash') DEFAULT 'active',
    series_id VARCHAR(36) DEFAULT NULL, series_name VARCHAR(100) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_status (user_id, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS blog_tags (
    id INT AUTO_INCREMENT PRIMARY KEY, blog_id INT NOT NULL, tag_id INT NOT NULL,
    FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS blog_drafts (
    id INT AUTO_INCREMENT PRIMARY KEY, blog_id INT NOT NULL,
    content LONGTEXT NOT NULL, saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS knowledge_files (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
    filename VARCHAR(500) NOT NULL, file_path VARCHAR(1000) NOT NULL,
    file_type VARCHAR(20) NOT NULL, file_size INT DEFAULT 0,
    status ENUM('active','trash') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS knowledge_file_tags (
    id INT AUTO_INCREMENT PRIMARY KEY, file_id INT NOT NULL, tag_id INT NOT NULL,
    FOREIGN KEY (file_id) REFERENCES knowledge_files(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS recycle_bin (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
    item_type VARCHAR(20) NOT NULL, item_id INT NOT NULL,
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
    token VARCHAR(128) NOT NULL UNIQUE, expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS refs (
    id INT AUTO_INCREMENT PRIMARY KEY, source_type VARCHAR(20) NOT NULL,
    source_id INT NOT NULL, target_type VARCHAR(20) NOT NULL, target_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ref (source_type, source_id, target_type, target_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
];
const MYSQL_MIGRATIONS = [
  "ALTER TABLE blogs ADD COLUMN folder_id INT DEFAULT NULL",
  "ALTER TABLE blogs ADD COLUMN series_id VARCHAR(36) DEFAULT NULL",
  "ALTER TABLE blogs ADD COLUMN series_name VARCHAR(100) DEFAULT NULL",
  "ALTER TABLE knowledge_files ADD COLUMN folder_id INT DEFAULT NULL",
  "ALTER TABLE knowledge_files ADD COLUMN content_text LONGTEXT",
  "ALTER TABLE blogs ADD CONSTRAINT fk_blogs_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL",
  "ALTER TABLE knowledge_files ADD CONSTRAINT fk_kf_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL"
];
let pool = null;
function getMySQLConfig() {
  return {
    host: process.env.MYSQL_HOST || "localhost",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "local_blog_kb"
  };
}
async function initMySQL() {
  const cfg = getMySQLConfig();
  const initConn = await mysql.createConnection({
    host: cfg.host,
    user: cfg.user,
    password: cfg.password
  });
  await initConn.execute(`CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` DEFAULT CHARACTER SET utf8mb4`);
  await initConn.end();
  pool = mysql.createPool({
    host: cfg.host,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    waitForConnections: true,
    connectionLimit: 10
  });
  const conn = await pool.getConnection();
  try {
    for (const ddl of MYSQL_DDL) await conn.execute(ddl);
    for (const mig of MYSQL_MIGRATIONS) {
      try {
        await conn.execute(mig);
      } catch {
      }
    }
    console.log("[MySQL] Tables initialized");
  } finally {
    conn.release();
  }
}
function getPool() {
  if (!pool) throw new Error("MySQL not initialized");
  return pool;
}
function fixDates(params) {
  return params.map((p) => {
    if (typeof p === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(p)) {
      return p.replace("T", " ").replace(/\.\d{3}Z$/, "").replace(/Z$/, "");
    }
    return p;
  });
}
function toMySQL(sql) {
  return sql.replace(/datetime\('now',\s*'(-?\d+)\s*days?'\)/g, (_m, days) => {
    const n = Number.parseInt(days, 10);
    if (n < 0) return `DATE_SUB(NOW(), INTERVAL ${-n} DAY)`;
    return `DATE_ADD(NOW(), INTERVAL ${n} DAY)`;
  }).replace(/datetime\('now'\)/g, "NOW()").replace(/date\('now'\)/gi, "CURDATE()").replace(/time\('now'\)/gi, "CURTIME()").replace(/strftime\('([^']+)',\s*([^)]+)\)/gi, (_m, fmt, expr) => {
    const mysqlFmt = fmt.replace(/%Y/g, "%Y").replace(/%m/g, "%m").replace(/%d/g, "%d").replace(/%H/g, "%H").replace(/%M/g, "%i").replace(/%S/g, "%s").replace(/%w/g, "%w").replace(/%j/g, "%j");
    return `DATE_FORMAT(${expr.trim()}, '${mysqlFmt}')`;
  }).replace(/'now'/g, "NOW()").replace(/INSERT OR IGNORE INTO/gi, "INSERT IGNORE INTO");
}
async function run$1(sql, params = []) {
  const p = getPool();
  await p.execute(toMySQL(sql), fixDates(params));
}
async function get$1(sql, params = []) {
  const p = getPool();
  const [rows] = await p.execute(toMySQL(sql), fixDates(params));
  return rows.length > 0 ? rows[0] : void 0;
}
async function all$1(sql, params = []) {
  const p = getPool();
  const [rows] = await p.execute(toMySQL(sql), fixDates(params));
  return rows;
}
function closeDatabase$1() {
  if (pool) {
    pool.end();
    pool = null;
  }
}
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  workspace_path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'md' CHECK(format IN ('md', 'html')),
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'trash')),
  folder_id INTEGER DEFAULT NULL REFERENCES folders(id) ON DELETE SET NULL,
  series_id TEXT DEFAULT NULL,
  series_name TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blog_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knowledge_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  content_text TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'trash')),
  folder_id INTEGER DEFAULT NULL REFERENCES folders(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_file_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL REFERENCES knowledge_files(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recycle_bin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK(item_type IN ('blog', 'knowledge_file')),
  item_id INTEGER NOT NULL,
  deleted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blog_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  saved_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id INTEGER DEFAULT NULL REFERENCES folders(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK(type IN ('blog', 'knowledge')),
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS refs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL CHECK(source_type IN ('blog', 'knowledge')),
  source_id INTEGER NOT NULL,
  target_type TEXT NOT NULL CHECK(target_type IN ('blog', 'knowledge')),
  target_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(source_type, source_id, target_type, target_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_blogs_user_status ON blogs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_blogs_user_updated ON blogs(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_files_user_status ON knowledge_files(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_recycle_bin_user ON recycle_bin(user_id, deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_drafts_blog ON blog_drafts(blog_id, saved_at DESC);

-- NOTE: FTS5 full-text search virtual tables will be added when switching to better-sqlite3.
-- Currently using SQL LIKE for search (see src/main/services/search.service.ts).
-- sql.js does not include FTS5 by default; we will switch to better-sqlite3
-- or use a custom sql.js build with FTS5 support when search is implemented.
`;
let sqlJsDb = null;
let sqlJsPath = "";
let useMySQL = false;
function resolveSqlJsPath() {
  const base = process.env.APPDATA || (process.platform === "darwin" ? path.join(process.env.HOME || "", "Library", "Application Support") : path.join(process.env.HOME || "", ".local", "share"));
  return path.join(base, "LocalBlogKB", "database.db");
}
async function initDatabase() {
  try {
    await initMySQL();
    useMySQL = true;
    console.log("[DB] MySQL initialized");
    await migrateSqlJsToMySQL();
    return;
  } catch (err) {
    console.log("[DB] MySQL unavailable, using sql.js:", err.message);
  }
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
  sqlJsDb.run("PRAGMA journal_mode=WAL");
  sqlJsDb.run("PRAGMA foreign_keys=ON");
  sqlJsDb.run(SCHEMA_SQL);
  try {
    sqlJsDb.run("ALTER TABLE blogs ADD COLUMN content TEXT NOT NULL DEFAULT ''");
  } catch {
  }
  try {
    sqlJsDb.run("ALTER TABLE blogs ADD COLUMN folder_id INTEGER DEFAULT NULL");
  } catch {
  }
  try {
    sqlJsDb.run("ALTER TABLE blogs ADD COLUMN series_id TEXT DEFAULT NULL");
  } catch {
  }
  try {
    sqlJsDb.run("ALTER TABLE blogs ADD COLUMN series_name TEXT DEFAULT NULL");
  } catch {
  }
  try {
    sqlJsDb.run("ALTER TABLE knowledge_files ADD COLUMN folder_id INTEGER DEFAULT NULL");
  } catch {
  }
  try {
    sqlJsDb.run("ALTER TABLE knowledge_files ADD COLUMN content_text TEXT DEFAULT ''");
  } catch {
  }
  sqlJsSave();
  useMySQL = false;
  console.log("[DB] sql.js initialized at", sqlJsPath);
}
function run(sql, params = []) {
  if (useMySQL) {
    throw new Error("MySQL requires async; use dbRun instead");
  }
  if (!sqlJsDb) throw new Error("DB not initialized");
  sqlJsDb.run(sql, params);
  sqlJsSave();
}
function get(sql, params = []) {
  if (useMySQL) throw new Error("MySQL requires async; use dbGet instead");
  if (!sqlJsDb) throw new Error("DB not initialized");
  const stmt = sqlJsDb.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return void 0;
}
function all(sql, params = []) {
  if (useMySQL) throw new Error("MySQL requires async; use dbAll instead");
  if (!sqlJsDb) throw new Error("DB not initialized");
  const stmt = sqlJsDb.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
async function dbGet(sql, params = []) {
  if (useMySQL) return get$1(sql, params);
  return get(sql, params);
}
async function dbAll(sql, params = []) {
  if (useMySQL) return all$1(sql, params);
  return all(sql, params);
}
async function dbRun(sql, params = []) {
  if (useMySQL) {
    await run$1(sql, params);
    return;
  }
  run(sql, params);
}
function closeDatabase() {
  if (useMySQL) {
    closeDatabase$1();
  } else if (sqlJsDb) {
    sqlJsSaveNow();
    sqlJsDb.close();
    sqlJsDb = null;
  }
}
let saveTimer = null;
let savePending = false;
function sqlJsSave() {
  if (!sqlJsDb || !sqlJsPath) return;
  savePending = true;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    savePending = false;
    saveTimer = null;
    if (sqlJsDb && sqlJsPath) {
      fs.writeFileSync(sqlJsPath, Buffer.from(sqlJsDb.export()));
    }
  }, 500);
}
function sqlJsSaveNow() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (sqlJsDb && sqlJsPath && savePending) {
    savePending = false;
    fs.writeFileSync(sqlJsPath, Buffer.from(sqlJsDb.export()));
  }
}
async function migrateSqlJsToMySQL() {
  const sqlPath = resolveSqlJsPath();
  if (!fs.existsSync(sqlPath)) return;
  try {
    console.log("[DB] Checking for sql.js data to migrate...");
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(sqlPath);
    const oldDb = new SQL.Database(buffer);
    const userCount = await get$1("SELECT COUNT(*) as c FROM users");
    if (userCount && userCount.c > 0) {
      console.log("[DB] MySQL already has data, skipping migration");
      oldDb.close();
      return;
    }
    const users = sqlJsQuery(oldDb, "SELECT * FROM users");
    for (const u of users) {
      await run$1(
        "INSERT INTO users (id, username, password_hash, workspace_path, created_at) VALUES (?,?,?,?,?)",
        [u.id, u.username, u.password_hash, u.workspace_path, u.created_at]
      );
    }
    const blogs = sqlJsQuery(oldDb, "SELECT * FROM blogs");
    for (const b of blogs) {
      await run$1(
        "INSERT INTO blogs (id, user_id, title, format, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
        [b.id, b.user_id, b.title, b.format, b.status, b.created_at, b.updated_at]
      );
    }
    const tags = sqlJsQuery(oldDb, "SELECT * FROM tags");
    for (const t of tags) {
      await run$1("INSERT INTO tags (id, user_id, name) VALUES (?,?,?)", [t.id, t.user_id, t.name]);
    }
    const blogTags = sqlJsQuery(oldDb, "SELECT * FROM blog_tags");
    for (const bt of blogTags) {
      await run$1("INSERT INTO blog_tags (id, blog_id, tag_id) VALUES (?,?,?)", [bt.id, bt.blog_id, bt.tag_id]);
    }
    const sessions = sqlJsQuery(oldDb, "SELECT * FROM sessions");
    for (const s of sessions) {
      await run$1("INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES (?,?,?,?,?)", [
        s.id,
        s.user_id,
        s.token,
        s.expires_at,
        s.created_at
      ]);
    }
    const kfs = sqlJsQuery(oldDb, "SELECT * FROM knowledge_files");
    for (const k of kfs) {
      await run$1(
        "INSERT INTO knowledge_files (id, user_id, filename, file_path, file_type, file_size, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
        [k.id, k.user_id, k.filename, k.file_path, k.file_type, k.file_size, k.status, k.created_at, k.updated_at]
      );
    }
    const kft = sqlJsQuery(oldDb, "SELECT * FROM knowledge_file_tags");
    for (const k of kft) {
      await run$1("INSERT INTO knowledge_file_tags (id, file_id, tag_id) VALUES (?,?,?)", [
        k.id,
        k.file_id,
        k.tag_id
      ]);
    }
    const rb = sqlJsQuery(oldDb, "SELECT * FROM recycle_bin");
    for (const r of rb) {
      await run$1("INSERT INTO recycle_bin (id, user_id, item_type, item_id, deleted_at) VALUES (?,?,?,?,?)", [
        r.id,
        r.user_id,
        r.item_type,
        r.item_id,
        r.deleted_at
      ]);
    }
    const drafts = sqlJsQuery(oldDb, "SELECT * FROM blog_drafts");
    for (const d of drafts) {
      await run$1("INSERT INTO blog_drafts (id, blog_id, content, saved_at) VALUES (?,?,?,?)", [
        d.id,
        d.blog_id,
        d.content,
        d.saved_at
      ]);
    }
    oldDb.close();
    console.log(`[DB] Migration complete: ${users.length} users, ${blogs.length} blogs`);
  } catch (err) {
    console.log("[DB] Migration skipped:", err.message);
  }
}
function sqlJsQuery(db, sql) {
  const stmt = db.prepare(sql);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
const index = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  all,
  closeDatabase,
  dbAll,
  dbGet,
  dbRun,
  get,
  initDatabase,
  run
}, Symbol.toStringTag, { value: "Module" }));
const IPC = {
  // Auth
  AUTH_LOGIN: "auth:login",
  AUTH_REGISTER: "auth:register",
  AUTH_LOGOUT: "auth:logout",
  AUTH_VERIFY_TOKEN: "auth:verify-token",
  AUTH_DELETE_ACCOUNT: "auth:delete-account",
  // Blog
  BLOG_LIST: "blog:list",
  BLOG_GET: "blog:get",
  BLOG_CREATE: "blog:create",
  BLOG_UPDATE: "blog:update",
  BLOG_DELETE: "blog:delete",
  BLOG_RESTORE: "blog:restore",
  BLOG_EXPORT: "blog:export",
  BLOG_IMPORT_MD: "blog:import-md",
  BLOG_SAVE_DRAFT: "blog:save-draft",
  BLOG_GET_HISTORY: "blog:get-history",
  BLOG_ROLLBACK: "blog:rollback",
  // Tag
  TAG_LIST: "tag:list",
  TAG_CREATE: "tag:create",
  TAG_UPDATE: "tag:update",
  TAG_DELETE: "tag:delete",
  TAG_SET_BLOG: "tag:set-blog",
  TAG_SET_FILE: "tag:set-file",
  // Quick Note
  BLOG_QUICK_CREATE: "blog:quickCreate",
  // Series
  BLOG_SERIES_LIST: "blog:seriesList",
  BLOG_SERIES_GET: "blog:seriesGet",
  BLOG_SERIES_SET: "blog:seriesSet",
  // Batch operations
  BLOG_BATCH_DELETE: "blog:batchDelete",
  BLOG_BATCH_TAG: "blog:batchTag",
  KB_BATCH_DELETE: "kb:batchDelete",
  RECYCLE_BATCH_RESTORE: "recycle:batchRestore",
  // Knowledge Base
  KB_LIST: "kb:list",
  KB_GET: "kb:get",
  KB_IMPORT: "kb:import",
  KB_DELETE: "kb:delete",
  KB_RESTORE: "kb:restore",
  KB_RENAME: "kb:rename",
  KB_PREVIEW: "kb:preview",
  KB_OPEN_EXTERNAL: "kb:open-external",
  // Search
  SEARCH_GLOBAL: "search:global",
  SEARCH_BLOGS: "search:blogs",
  SEARCH_KB: "search:kb",
  REBUILD_FTS_INDEX: "search:rebuild-index",
  // Workspace
  WORKSPACE_GET_INFO: "workspace:get-info",
  WORKSPACE_SET_PATH: "workspace:set-path",
  WORKSPACE_MIGRATE: "workspace:migrate",
  WORKSPACE_OPEN_IN_FOLDER: "workspace:open-in-folder",
  // Recycle Bin
  RECYCLE_LIST: "recycle:list",
  RECYCLE_RESTORE: "recycle:restore",
  RECYCLE_EMPTY: "recycle:empty",
  RECYCLE_SET_AUTO_CLEAN: "recycle:set-auto-clean",
  // Folder
  FOLDER_TREE: "folder:tree",
  FOLDER_CREATE: "folder:create",
  FOLDER_RENAME: "folder:rename",
  FOLDER_DELETE: "folder:delete",
  FOLDER_MOVE_ITEM: "folder:move-item",
  // Web Scraping
  SCRAPE_WEBPAGE: "scrape:webpage",
  // Attachments
  BLOG_LIST_ATTACHMENTS: "blog:list-attachments",
  BLOG_DELETE_ATTACHMENT: "blog:delete-attachment",
  BLOG_CLEANUP_ATTACHMENTS: "blog:cleanup-attachments",
  // Backup
  BACKUP_LIST: "backup:list",
  BACKUP_CREATE: "backup:create",
  BACKUP_RESTORE: "backup:restore",
  BACKUP_DELETE: "backup:delete",
  // File System
  FS_SELECT_DIR: "fs:select-dir",
  FS_SELECT_FILES: "fs:select-files",
  // Stats
  STATS_GET: "stats:get",
  STATS_DAILY: "stats:daily",
  // References
  REF_ADD: "ref:add",
  REF_REMOVE: "ref:remove",
  REF_GET_FROM: "ref:getFrom",
  REF_GET_TO: "ref:getTo",
  REF_SEARCH: "ref:search",
  // PDF Export
  BLOG_EXPORT_PDF: "blog:exportPdf",
  BLOG_EXPORT_DOCX: "blog:exportDocx",
  // App
  APP_GET_VERSION: "app:get-version",
  APP_GET_SYSTEM_LANGUAGE: "app:get-system-language",
  APP_SET_AUTO_START: "app:set-auto-start",
  APP_GET_AUTO_START: "app:get-auto-start",
  APP_CREATE_START_MENU_SHORTCUT: "app:create-start-menu-shortcut",
  APP_HAS_START_MENU_SHORTCUT: "app:has-start-menu-shortcut"
};
const MAX_BACKUPS = 7;
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1e3;
class BackupService {
  static timer = null;
  /** Get the backup directory path */
  static getBackupDir() {
    const userData = electron.app.getPath("userData");
    return path.join(userData, "backups");
  }
  /** Get database file path */
  static getDbPath() {
    const base = process.env.APPDATA || (process.platform === "darwin" ? path.join(process.env.HOME || "", "Library", "Application Support") : path.join(process.env.HOME || "", ".local", "share"));
    return path.join(base, "LocalBlogKB", "database.db");
  }
  /** Create a backup of the database */
  static createBackup() {
    const dbPath = this.getDbPath();
    if (!fs.existsSync(dbPath)) {
      console.log("[Backup] Database file not found, skipping");
      return null;
    }
    const backupDir = this.getBackupDir();
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const backupName = `database.db.backup.${timestamp}`;
    const backupPath = path.join(backupDir, backupName);
    try {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`[Backup] Created: ${backupName}`);
      return backupPath;
    } catch (err) {
      console.error("[Backup] Failed:", err.message);
      return null;
    }
  }
  /** Clean up old backups, keeping only the latest N */
  static cleanOldBackups() {
    const backupDir = this.getBackupDir();
    if (!fs.existsSync(backupDir)) return 0;
    const files = fs.readdirSync(backupDir).filter((f) => f.startsWith("database.db.backup.")).map((f) => ({
      name: f,
      path: path.join(backupDir, f),
      mtime: fs.statSync(path.join(backupDir, f)).mtimeMs
    })).sort((a, b) => b.mtime - a.mtime);
    let cleaned = 0;
    for (let i = MAX_BACKUPS; i < files.length; i++) {
      try {
        fs.unlinkSync(files[i].path);
        cleaned++;
      } catch {
      }
    }
    if (cleaned > 0) console.log(`[Backup] Cleaned ${cleaned} old backup(s)`);
    return cleaned;
  }
  /** Start automatic periodic backups */
  static startAutoBackup() {
    if (this.timer) return;
    this.createBackup();
    this.cleanOldBackups();
    this.timer = setInterval(() => {
      this.createBackup();
      this.cleanOldBackups();
    }, BACKUP_INTERVAL_MS);
    console.log("[Backup] Auto-backup started (every 24h, keeping last 7)");
  }
  /** Stop auto-backup timer */
  static stopAutoBackup() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
  /** List available backups */
  static listBackups() {
    const backupDir = this.getBackupDir();
    if (!fs.existsSync(backupDir)) return [];
    return fs.readdirSync(backupDir).filter((f) => f.startsWith("database.db.backup.")).map((f) => {
      const fullPath = path.join(backupDir, f);
      const stat = fs.statSync(fullPath);
      return { name: f, size: stat.size, createdAt: stat.mtime };
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
class StatsService {
  static async getUserStats(userId) {
    const blogRow = await dbGet(
      `SELECT COUNT(*) as total,
        COALESCE(SUM(LENGTH(content)), 0) as words,
        COALESCE(MAX(LENGTH(content)), 0) as longest,
        SUM(CASE WHEN format = 'md' THEN 1 ELSE 0 END) as mdCount,
        SUM(CASE WHEN format = 'html' THEN 1 ELSE 0 END) as htmlCount
       FROM blogs WHERE user_id = ? AND status = 'active'`,
      [userId]
    );
    const timestamps = await dbAll(
      "SELECT created_at FROM blogs WHERE user_id = ? AND status = 'active'",
      [userId]
    );
    let nightCount = 0;
    let earlyCount = 0;
    for (const t of timestamps) {
      const h = new Date(t.created_at).getHours();
      if (h >= 0 && h <= 4) nightCount++;
      else if (h >= 5 && h <= 6) earlyCount++;
    }
    const fileRow = await dbGet(
      "SELECT COUNT(*) as total FROM knowledge_files WHERE user_id = ? AND status = 'active'",
      [userId]
    );
    const tagRow = await dbGet(
      "SELECT COUNT(DISTINCT tag_id) as unique FROM blog_tags bt JOIN blogs b ON bt.blog_id = b.id WHERE b.user_id = ?",
      [userId]
    );
    const monthRow = await dbGet(
      `SELECT COUNT(*) as count, COALESCE(SUM(LENGTH(content)), 0) as words
       FROM blogs WHERE user_id = ? AND status = 'active'
       AND created_at >= datetime('now', '-30 days')`,
      [userId]
    );
    const byTag = await dbAll(
      `SELECT t.name, COUNT(*) as count FROM blog_tags bt
       JOIN tags t ON bt.tag_id = t.id
       JOIN blogs b ON bt.blog_id = b.id
       WHERE b.user_id = ? AND b.status = 'active'
       GROUP BY t.name ORDER BY count DESC LIMIT 10`,
      [userId]
    );
    const byFormat = await dbAll(
      "SELECT format, COUNT(*) as count FROM blogs WHERE user_id = ? AND status = 'active' GROUP BY format",
      [userId]
    );
    const heatmap = await dbAll(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM blogs WHERE user_id = ? AND status = 'active'
       AND created_at >= datetime('now', '-365 days')
       GROUP BY DATE(created_at) ORDER BY date`,
      [userId]
    );
    const allDates = await dbAll(
      `SELECT DISTINCT DATE(created_at) as d FROM blogs WHERE user_id = ? AND status = 'active' ORDER BY d DESC`,
      [userId]
    );
    const { currentStreak, longestStreak } = calcStreak(allDates.map((r) => r.d));
    return {
      totalBlogs: blogRow?.total || 0,
      totalWords: blogRow?.words || 0,
      totalFiles: fileRow?.total || 0,
      longestBlog: blogRow?.longest || 0,
      currentStreak,
      longestStreak,
      uniqueTags: tagRow?.unique || 0,
      hasMdBlog: (blogRow?.mdCount || 0) > 0,
      hasHtmlBlog: (blogRow?.htmlCount || 0) > 0,
      hasNightBlog: nightCount > 0,
      hasEarlyBlog: earlyCount > 0,
      monthlyCount: monthRow?.count || 0,
      monthlyWords: monthRow?.words || 0,
      byTag,
      byFormat,
      heatmap
    };
  }
}
function calcStreak(dates) {
  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };
  let currentStreak = 1;
  let longestStreak = 1;
  let tempStreak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1e3 * 60 * 60 * 24);
    if (Math.abs(diff - 1) < 0.1) {
      tempStreak++;
    } else {
      tempStreak = 1;
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;
  }
  const today = (/* @__PURE__ */ new Date()).toISOString().substring(0, 10);
  const yesterday = new Date(Date.now() - 864e5).toISOString().substring(0, 10);
  if (dates[0] !== today && dates[0] !== yesterday) {
    currentStreak = 0;
  } else {
    currentStreak = tempStreak;
  }
  return { currentStreak, longestStreak };
}
async function getDailyStats(userId) {
  return dbAll(
    `SELECT DATE(created_at) as date, COUNT(*) as blogCount, COALESCE(SUM(LENGTH(content)), 0) as wordCount
     FROM blogs WHERE user_id = ? AND status = 'active'
     AND created_at >= datetime('now', '-365 days')
     GROUP BY DATE(created_at) ORDER BY date`,
    [userId]
  );
}
const SHORTCUT_NAME = "Idiot.lnk";
const STARTUP_BAT_NAME = "Idiot-LocalBlogKB.bat";
function getAppDataDir() {
  return process.env.APPDATA || path.join(process.env.HOME || "", "AppData", "Roaming");
}
function getStartMenuProgramsDir() {
  return path.join(getAppDataDir(), "Microsoft", "Windows", "Start Menu", "Programs");
}
function getShortcutPath() {
  return path.join(getStartMenuProgramsDir(), SHORTCUT_NAME);
}
function getStartupDir() {
  return path.join(getAppDataDir(), "Microsoft", "Windows", "Start Menu", "Programs", "Startup");
}
function getStartupBatPath() {
  return path.join(getStartupDir(), STARTUP_BAT_NAME);
}
function getProjectRoot() {
  return path.join(__dirname, "..", "..");
}
async function createShortcut() {
  const shortcutPath = getShortcutPath();
  const projectRoot = getProjectRoot();
  const launcherBatPath = path.join(electron.app.getPath("userData"), "launcher.bat");
  const packagedExe = path.join(projectRoot, "release", "LocalBlogKB-win32-x64", "LocalBlogKB.exe");
  let batContent;
  let workingDir;
  if (fs.existsSync(packagedExe)) {
    batContent = `@echo off\r
set ELECTRON_RUN_AS_NODE=\r
start "" "${packagedExe}"\r
`;
    workingDir = path.dirname(packagedExe);
  } else {
    batContent = `@echo off\r
set ELECTRON_RUN_AS_NODE=\r
cd /d "${projectRoot}"\r
start "" npm run dev\r
`;
    workingDir = projectRoot;
  }
  fs.writeFileSync(launcherBatPath, batContent, "utf-8");
  const targetPath = launcherBatPath;
  const psCmd = `
    $ws = New-Object -ComObject WScript.Shell;
    $sc = $ws.CreateShortcut('${shortcutPath.replace(/'/g, "''")}');
    $sc.TargetPath = '${targetPath.replace(/'/g, "''")}';
    $sc.WorkingDirectory = '${workingDir.replace(/'/g, "''")}';
    $sc.Save();
    Write-Output 'OK';
  `;
  return new Promise((resolve) => {
    node_child_process.exec(`powershell -NoProfile -Command "${psCmd.replace(/"/g, '\\"')}"`, (err, stdout) => {
      resolve(!err && stdout.includes("OK"));
    });
  });
}
function registerAppHandlers() {
  electron.ipcMain.handle(IPC.APP_GET_VERSION, async () => {
    return electron.app.getVersion();
  });
  electron.ipcMain.handle(IPC.APP_GET_SYSTEM_LANGUAGE, async () => {
    return electron.app.getLocale();
  });
  electron.ipcMain.handle(IPC.APP_SET_AUTO_START, async (_event, enabled) => {
    try {
      if (electron.app.isPackaged) {
        electron.app.setLoginItemSettings({ openAtLogin: enabled });
      } else {
        const startupDir = getStartupDir();
        const batPath = getStartupBatPath();
        if (enabled) {
          if (!fs.existsSync(startupDir)) fs.mkdirSync(startupDir, { recursive: true });
          const batContent = `@echo off\r
set ELECTRON_RUN_AS_NODE=\r
cd /d "${getProjectRoot()}"\r
start "" npm run dev\r
`;
          fs.writeFileSync(batPath, batContent, "utf-8");
        } else {
          if (fs.existsSync(batPath)) fs.unlinkSync(batPath);
        }
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.APP_GET_AUTO_START, async () => {
    try {
      let enabled;
      if (electron.app.isPackaged) {
        const settings = electron.app.getLoginItemSettings();
        enabled = settings.openAtLogin;
      } else {
        enabled = fs.existsSync(getStartupBatPath());
      }
      return { success: true, data: { enabled } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.APP_CREATE_START_MENU_SHORTCUT, async () => {
    try {
      const ok = await createShortcut();
      return { success: ok, error: ok ? void 0 : "创建快捷方式失败" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.APP_HAS_START_MENU_SHORTCUT, async () => {
    try {
      const exists = fs.existsSync(getShortcutPath());
      return { success: true, data: { exists } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BACKUP_LIST, async () => {
    try {
      const list = BackupService.listBackups();
      return { success: true, data: list };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BACKUP_CREATE, async () => {
    try {
      const path2 = BackupService.createBackup();
      return { success: !!path2, data: { path: path2 } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BACKUP_RESTORE, async (_event, filename) => {
    try {
      const backupDir = BackupService.getBackupDir();
      const dbPath = BackupService.getDbPath();
      const backupPath = path.join(backupDir, filename);
      if (!fs.existsSync(backupPath)) return { success: false, error: "备份文件不存在" };
      const safetyName = `${filename}.pre-restore`;
      try {
        fs.copyFileSync(dbPath, path.join(backupDir, safetyName));
      } catch {
      }
      fs.copyFileSync(backupPath, dbPath);
      return { success: true, data: { needsRestart: true } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BACKUP_DELETE, async (_event, filename) => {
    try {
      const backupDir = BackupService.getBackupDir();
      const backupPath = path.join(backupDir, filename);
      if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.STATS_GET, async (_event, userId) => {
    try {
      const stats = await StatsService.getUserStats(userId);
      return { success: true, data: stats };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.STATS_DAILY, async (_event, userId) => {
    try {
      const stats = await getDailyStats(userId);
      return { success: true, data: stats };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
const TOKEN_BYTES = 48;
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1e5, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
  const parts = storedHash.split(":");
  if (parts.length < 2) return false;
  const salt = parts[0];
  const hash = parts.slice(1).join(":");
  if (!salt || !hash) return false;
  const computed = crypto.pbkdf2Sync(password, salt, 1e5, 64, "sha512").toString("hex");
  return computed === hash;
}
function generateToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString("base64url");
}
const DIR_BLOGS = "Blogs";
const DIR_KNOWLEDGE_BASE = "KnowledgeBase";
const DIR_ASSETS = "Assets";
const SUPPORTED_KB_EXTENSIONS = [
  ".docx",
  ".doc",
  ".xlsx",
  ".xls",
  ".pptx",
  ".ppt",
  ".pdf",
  ".txt",
  ".md",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg"
];
const MAX_TITLE_LENGTH = 200;
async function getWorkspacePath(userId) {
  const user = await dbGet("SELECT workspace_path FROM users WHERE id = ?", [userId]);
  if (!user) throw new Error(`User ${userId} not found`);
  return user.workspace_path;
}
async function getBlogsDir(userId) {
  return path.join(await getWorkspacePath(userId), DIR_BLOGS);
}
async function getKnowledgeBaseDir(userId) {
  return path.join(await getWorkspacePath(userId), DIR_KNOWLEDGE_BASE);
}
async function getAssetsDir(userId) {
  return path.join(await getWorkspacePath(userId), DIR_ASSETS);
}
async function getBlogPath(userId, blogId, format) {
  const ext = format === "html" ? ".html" : ".md";
  return path.join(await getBlogsDir(userId), `${blogId}${ext}`);
}
async function getBlogAssetsDir(userId, blogId) {
  return path.join(await getAssetsDir(userId), `blog_${blogId}`);
}
function initWorkspaceDirectories(workspacePath) {
  const dirs = [
    path.join(workspacePath, DIR_BLOGS),
    path.join(workspacePath, DIR_KNOWLEDGE_BASE),
    path.join(workspacePath, DIR_ASSETS)
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
const TOKEN_EXPIRY_DAYS = 30;
class AuthService {
  static async register(username, password, workspacePath) {
    console.log("[Auth] Register attempt:", username, "workspace:", workspacePath);
    if (!username || username.length < 2) return { success: false, error: "用户名至少需要2个字符" };
    if (!password || password.length < 4) return { success: false, error: "密码至少需要4个字符" };
    if (!workspacePath) return { success: false, error: "请选择工作区目录" };
    const existing = await dbGet("SELECT id FROM users WHERE username = ?", [username]);
    if (existing) return { success: false, error: `用户名 "${username}" 已存在` };
    const reclaimed = await dbGet(
      "SELECT id, username FROM users WHERE workspace_path = ? AND password_hash = ''",
      [workspacePath]
    );
    const passwordHash = hashPassword(password);
    let userId;
    if (reclaimed) {
      await dbRun("UPDATE users SET username = ?, password_hash = ? WHERE id = ?", [
        username,
        passwordHash,
        reclaimed.id
      ]);
      userId = reclaimed.id;
    } else {
      await dbRun("INSERT INTO users (username, password_hash, workspace_path, created_at) VALUES (?, ?, ?, ?)", [
        username,
        passwordHash,
        workspacePath,
        (/* @__PURE__ */ new Date()).toISOString()
      ]);
      const newUser = await dbGet("SELECT id FROM users WHERE username = ?", [username]);
      if (!newUser?.id) return { success: false, error: "创建用户失败: 数据库写入异常" };
      userId = newUser.id;
    }
    try {
      initWorkspaceDirectories(workspacePath);
    } catch (err) {
      await dbRun("DELETE FROM users WHERE id = ?", [userId]);
      return { success: false, error: `创建工作区目录失败: ${err.message}` };
    }
    const token = generateToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1e3).toISOString();
    await dbRun("INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)", [
      userId,
      token,
      expiresAt,
      (/* @__PURE__ */ new Date()).toISOString()
    ]);
    return { success: true, user: { id: userId, username, workspacePath, createdAt: (/* @__PURE__ */ new Date()).toISOString() }, token };
  }
  static async login(username, password, rememberMe) {
    console.log("[Auth] Login attempt:", username);
    const row = await dbGet(
      "SELECT id, password_hash, workspace_path, created_at FROM users WHERE username = ?",
      [username]
    );
    if (!row) {
      console.log("[Auth] User not found");
      return { success: false, error: "用户名或密码错误" };
    }
    const valid = verifyPassword(password, row.password_hash);
    if (!valid) return { success: false, error: "用户名或密码错误" };
    const token = generateToken();
    const expiryDays = rememberMe ? TOKEN_EXPIRY_DAYS : 1;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1e3).toISOString();
    await dbRun("DELETE FROM sessions WHERE user_id = ?", [row.id]);
    await dbRun("INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)", [
      row.id,
      token,
      expiresAt,
      (/* @__PURE__ */ new Date()).toISOString()
    ]);
    return {
      success: true,
      user: { id: row.id, username, workspacePath: row.workspace_path, createdAt: row.created_at },
      token
    };
  }
  static async verifyToken(token) {
    const row = await dbGet(
      `SELECT s.user_id, u.username, u.workspace_path, u.created_at, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
      [token]
    );
    if (!row) return { success: false, error: "Token 无效" };
    if (new Date(row.expires_at) < /* @__PURE__ */ new Date()) {
      await dbRun("DELETE FROM sessions WHERE token = ?", [token]);
      return { success: false, error: "登录已过期，请重新登录" };
    }
    return {
      success: true,
      user: { id: row.user_id, username: row.username, workspacePath: row.workspace_path, createdAt: row.created_at },
      token
    };
  }
  static async logout(token) {
    await dbRun("DELETE FROM sessions WHERE token = ?", [token]);
  }
  static async deleteAccount(userId, keepFiles) {
    const user = await dbGet("SELECT workspace_path FROM users WHERE id = ?", [userId]);
    if (!user) return { success: false, error: "用户不存在" };
    if (keepFiles) {
      await dbRun("DELETE FROM sessions WHERE user_id = ?", [userId]);
      await dbRun("UPDATE users SET password_hash = '' WHERE id = ?", [userId]);
    } else {
      await dbRun("DELETE FROM users WHERE id = ?", [userId]);
      if (user.workspace_path) {
        try {
          fs.rmSync(user.workspace_path, { recursive: true, force: true });
        } catch {
        }
      }
    }
    return { success: true };
  }
}
function registerAuthHandlers() {
  electron.ipcMain.handle(IPC.AUTH_LOGIN, async (_event, req) => {
    try {
      return await AuthService.login(req.username, req.password, req.rememberMe);
    } catch (err) {
      console.error("[Auth IPC] Login error:", err);
      return { success: false, error: `登录异常: ${err.message}` };
    }
  });
  electron.ipcMain.handle(IPC.AUTH_REGISTER, async (_event, req) => {
    try {
      return await AuthService.register(req.username, req.password, req.workspacePath);
    } catch (err) {
      console.error("[Auth IPC] Register error:", err);
      return { success: false, error: `注册异常: ${err.message}` };
    }
  });
  electron.ipcMain.handle(IPC.AUTH_LOGOUT, async (_event, token) => {
    try {
      await AuthService.logout(token);
    } catch (err) {
      console.error("[Auth IPC] Logout error:", err);
    }
  });
  electron.ipcMain.handle(IPC.AUTH_VERIFY_TOKEN, async (_event, token) => {
    try {
      return await AuthService.verifyToken(token);
    } catch (err) {
      console.error("[Auth IPC] Verify error:", err);
      return { success: false, error: "验证失败" };
    }
  });
  electron.ipcMain.handle(
    IPC.AUTH_DELETE_ACCOUNT,
    async (_event, data) => {
      try {
        return await AuthService.deleteAccount(data.userId, data.keepFiles);
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  );
}
function sanitizePagination(offset, limit) {
  const safeOffset = Math.max(0, Math.floor(Number(offset) || 0));
  const safeLimit = Math.min(200, Math.max(1, Math.floor(Number(limit) || 50)));
  return { offset: safeOffset, limit: safeLimit };
}
const VALID_SORT = ["created_at", "updated_at", "title"];
const VALID_ORDER = ["asc", "desc"];
function mapBlogRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    format: row.format,
    status: row.status,
    seriesId: row.series_id,
    seriesName: row.series_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function getSharedBlogList(dbAll2, dbGet2, filters) {
  const {
    userId,
    status = "active",
    tagId,
    folderId,
    query,
    sortBy = "updated_at",
    sortOrder = "desc",
    offset = 0,
    limit = 50
  } = filters;
  const safeSort = VALID_SORT.includes(sortBy) ? sortBy : "updated_at";
  const safeOrder = VALID_ORDER.includes(sortOrder) ? sortOrder : "desc";
  const { offset: safeOffset, limit: safeLimit } = sanitizePagination(offset, limit);
  const conditions = ["b.user_id = ?"];
  const params = [userId];
  conditions.push("b.status = ?");
  params.push(status);
  if (query) {
    conditions.push("b.title LIKE ?");
    params.push(`%${query}%`);
  }
  if (tagId) {
    conditions.push("b.id IN (SELECT blog_id FROM blog_tags WHERE tag_id = ?)");
    params.push(tagId);
  }
  if (folderId !== void 0) {
    conditions.push("b.folder_id = ?");
    params.push(folderId);
  }
  const where = conditions.join(" AND ");
  const totalRow = await dbGet2(`SELECT COUNT(*) as count FROM blogs b WHERE ${where}`, params);
  const rows = await dbAll2(
    `SELECT b.* FROM blogs b WHERE ${where} ORDER BY b.${safeSort} ${safeOrder} LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    params
  );
  const blogs = await Promise.all(
    rows.map(async (row) => {
      const blog = mapBlogRow(row);
      const tags = await dbAll2(
        "SELECT t.id, t.user_id, t.name FROM tags t JOIN blog_tags bt ON bt.tag_id = t.id WHERE bt.blog_id = ?",
        [blog.id]
      );
      return {
        ...blog,
        tags: tags.map((t) => ({ id: t.id, userId: t.user_id, name: t.name }))
      };
    })
  );
  return { blogs, total: totalRow?.count || 0 };
}
class TagService {
  static async listTags(userId) {
    return dbAll(
      `SELECT t.id, t.user_id, t.name,
        (SELECT COUNT(*) FROM blog_tags bt WHERE bt.tag_id = t.id) +
        (SELECT COUNT(*) FROM knowledge_file_tags kft WHERE kft.tag_id = t.id) as count
       FROM tags t WHERE t.user_id = ? ORDER BY t.name ASC`,
      [userId]
    );
  }
  static async createTag(userId, name) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("标签名不能为空");
    const existing = await dbGet("SELECT * FROM tags WHERE user_id = ? AND name = ?", [userId, trimmed]);
    if (existing) throw new Error("标签已存在");
    await dbRun("INSERT INTO tags (user_id, name) VALUES (?, ?)", [userId, trimmed]);
    const row = await dbGet("SELECT * FROM tags WHERE user_id = ? AND name = ?", [userId, trimmed]);
    if (!row) throw new Error("创建标签失败");
    return row;
  }
  static async updateTag(tagId, name) {
    const t = name.trim();
    if (!t) throw new Error("标签名不能为空");
    await dbRun("UPDATE tags SET name = ? WHERE id = ?", [t, tagId]);
  }
  static async deleteTag(tagId) {
    await dbRun("DELETE FROM tags WHERE id = ?", [tagId]);
  }
}
class BlogService {
  static async createBlog(userId, title, format, content) {
    if (!title || title.length > MAX_TITLE_LENGTH) throw new Error(`标题长度必须在 1-${MAX_TITLE_LENGTH} 字符之间`);
    if (!["md", "html"].includes(format)) throw new Error("格式必须是 md 或 html");
    const blogsDir = await getBlogsDir(userId);
    if (!fs.existsSync(blogsDir)) initWorkspaceDirectories(blogsDir.replace(/Blogs$/, ""));
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await dbRun(
      "INSERT INTO blogs (user_id, title, format, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, title, format, content, now, now]
    );
    const row = await dbGet(
      "SELECT * FROM blogs WHERE user_id = ? AND title = ? AND format = ? ORDER BY id DESC LIMIT 1",
      [userId, title, format]
    );
    if (!row) throw new Error("创建博客失败");
    const filePath = await getBlogPath(userId, row.id, format);
    fs.writeFileSync(filePath, content, "utf-8");
    return BlogService.rowToBlog(row);
  }
  static async getBlog(blogId) {
    const row = await dbGet("SELECT * FROM blogs WHERE id = ?", [blogId]);
    if (!row) return null;
    const filePath = await getBlogPath(row.user_id, row.id, row.format);
    let content = "";
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch {
      content = row.content || "";
    }
    const tags = await BlogService.getBlogTags(blogId);
    return { ...BlogService.rowToBlog(row), tags, content };
  }
  static async updateBlog(blogId, update) {
    const blog = await dbGet("SELECT * FROM blogs WHERE id = ?", [blogId]);
    if (!blog) throw new Error("博客不存在");
    if (update.title !== void 0) {
      if (!update.title || update.title.length > MAX_TITLE_LENGTH)
        throw new Error(`标题长度必须在 1-${MAX_TITLE_LENGTH} 字符之间`);
      await dbRun("UPDATE blogs SET title = ?, updated_at = ? WHERE id = ?", [
        update.title,
        (/* @__PURE__ */ new Date()).toISOString(),
        blogId
      ]);
    }
    if (update.content !== void 0) {
      const filePath = await getBlogPath(blog.user_id, blogId, blog.format);
      fs.writeFileSync(filePath, update.content, "utf-8");
      await dbRun("UPDATE blogs SET content = ?, updated_at = ? WHERE id = ?", [
        update.content,
        (/* @__PURE__ */ new Date()).toISOString(),
        blogId
      ]);
    }
  }
  static async deleteBlog(blogId) {
    const blog = await dbGet("SELECT * FROM blogs WHERE id = ?", [blogId]);
    if (!blog) throw new Error("博客不存在");
    await dbRun("UPDATE blogs SET status = 'trash', updated_at = ? WHERE id = ?", [(/* @__PURE__ */ new Date()).toISOString(), blogId]);
    await dbRun("INSERT INTO recycle_bin (user_id, item_type, item_id, deleted_at) VALUES (?, ?, ?, ?)", [
      blog.user_id,
      "blog",
      blogId,
      (/* @__PURE__ */ new Date()).toISOString()
    ]);
  }
  static async restoreBlog(blogId) {
    const blog = await dbGet("SELECT * FROM blogs WHERE id = ? AND status = ?", [blogId, "trash"]);
    if (!blog) throw new Error("博客不在回收站中");
    await dbRun("UPDATE blogs SET status = 'active', updated_at = ? WHERE id = ?", [(/* @__PURE__ */ new Date()).toISOString(), blogId]);
    await dbRun("DELETE FROM recycle_bin WHERE item_type = ? AND item_id = ?", ["blog", blogId]);
  }
  static async listBlogs(filters) {
    const conditions = ["b.user_id = ?"];
    const params = [filters.userId];
    conditions.push("b.status = 'active'");
    if (filters.query) {
      conditions.push("b.title LIKE ?");
      params.push(`%${filters.query}%`);
    }
    if (filters.tagId) {
      conditions.push("b.id IN (SELECT blog_id FROM blog_tags WHERE tag_id = ?)");
      params.push(filters.tagId);
    }
    if (filters.folderId !== void 0) {
      conditions.push("b.folder_id = ?");
      params.push(filters.folderId);
    }
    const where = conditions.join(" AND ");
    const safeSort = ["created_at", "updated_at", "title"].includes(filters.sortBy || "") ? filters.sortBy : "updated_at";
    const safeOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const { offset, limit } = sanitizePagination(filters.offset, filters.limit);
    const totalRow = await dbGet(`SELECT COUNT(*) as count FROM blogs b WHERE ${where}`, params);
    const rows = await dbAll(
      `SELECT b.* FROM blogs b WHERE ${where} ORDER BY b.${safeSort} ${safeOrder} LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    const blogs = await Promise.all(
      rows.map(async (row) => ({ ...BlogService.rowToBlog(row), tags: await BlogService.getBlogTags(row.id) }))
    );
    return { blogs, total: totalRow?.count || 0 };
  }
  static async exportBlogs(blogIds, outputDir) {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    let count = 0;
    for (const blogId of blogIds) {
      const blog = await dbGet("SELECT * FROM blogs WHERE id = ?", [blogId]);
      if (!blog) continue;
      const srcPath = await getBlogPath(blog.user_id, blogId, blog.format);
      const ext = blog.format === "html" ? ".html" : ".md";
      try {
        fs.copyFileSync(
          srcPath,
          path.join(outputDir, `${blog.title.replace(/[<>:"/\\|?*]/g, "_").substring(0, 100)}${ext}`)
        );
        count++;
      } catch {
      }
    }
    return count;
  }
  static async importMarkdownFiles(userId, filePaths, contents = []) {
    const blogs = [];
    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) continue;
      const ext = path.extname(filePath).toLowerCase();
      if (![".md", ".txt", ".html"].includes(ext)) continue;
      const content = fs.readFileSync(filePath, "utf-8");
      const filename = path.basename(filePath, ext);
      let title = filename;
      const fmMatch = content.match(/^---\s*\ntitle:\s*(.+)\s*\n---/);
      if (fmMatch) title = fmMatch[1].trim();
      else {
        const h1Match = content.match(/^#\s+(.+)/m);
        if (h1Match) title = h1Match[1].trim();
      }
      const format = ext === ".html" ? "html" : "md";
      const blog = await this.createBlog(userId, title.substring(0, MAX_TITLE_LENGTH), format, content);
      blogs.push(blog);
    }
    for (const item of contents) {
      const title = (item.title || "未命名").substring(0, MAX_TITLE_LENGTH);
      const blog = await this.createBlog(userId, title, "md", item.content);
      blogs.push(blog);
    }
    return blogs;
  }
  static async saveDraft(blogId, content) {
    const blog = await dbGet("SELECT * FROM blogs WHERE id = ?", [blogId]);
    if (!blog) throw new Error("博客不存在");
    await dbRun("INSERT INTO blog_drafts (blog_id, content, saved_at) VALUES (?, ?, ?)", [
      blogId,
      content,
      (/* @__PURE__ */ new Date()).toISOString()
    ]);
  }
  static async getHistory(blogId) {
    return dbAll(
      "SELECT id, blog_id, content, saved_at FROM blog_drafts WHERE blog_id = ? ORDER BY saved_at DESC LIMIT 20",
      [blogId]
    );
  }
  static async rollback(blogId, draftId) {
    const draft = await dbGet("SELECT * FROM blog_drafts WHERE id = ? AND blog_id = ?", [draftId, blogId]);
    if (!draft) throw new Error("草稿不存在");
    await this.updateBlog(blogId, { content: draft.content });
  }
  static async getBlogTags(blogId) {
    return dbAll(
      "SELECT t.id, t.user_id, t.name FROM tags t JOIN blog_tags bt ON bt.tag_id = t.id WHERE bt.blog_id = ?",
      [blogId]
    );
  }
  static async setBlogTags(blogId, tagIds) {
    await dbRun("DELETE FROM blog_tags WHERE blog_id = ?", [blogId]);
    for (const tagId of tagIds)
      await dbRun("INSERT OR IGNORE INTO blog_tags (blog_id, tag_id) VALUES (?, ?)", [blogId, tagId]);
  }
  // ---- Attachments ----
  static async listAttachments(blogId) {
    const blog = await dbGet("SELECT * FROM blogs WHERE id = ?", [blogId]);
    if (!blog) return [];
    const assetsDir = await getBlogAssetsDir(blog.user_id, blogId);
    if (!fs.existsSync(assetsDir)) return [];
    const files = fs.readdirSync(assetsDir);
    const content = await BlogService.getBlogContent(blog);
    return files.map((f) => {
      const fullPath = path.join(assetsDir, f);
      let size = 0;
      try {
        size = fs.statSync(fullPath).size;
      } catch {
      }
      return {
        filename: f,
        size,
        usedInBlog: content.includes(`Assets/blog_${blogId}/${f}`)
      };
    });
  }
  static async deleteAttachment(blogId, filename) {
    const blog = await dbGet("SELECT * FROM blogs WHERE id = ?", [blogId]);
    if (!blog) throw new Error("博客不存在");
    const assetsDir = await getBlogAssetsDir(blog.user_id, blogId);
    const filePath = path.join(assetsDir, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  static async cleanupAttachments(blogId) {
    const attachments = await BlogService.listAttachments(blogId);
    let cleaned = 0;
    for (const a of attachments) {
      if (!a.usedInBlog) {
        await BlogService.deleteAttachment(blogId, a.filename);
        cleaned++;
      }
    }
    return cleaned;
  }
  static async getBlogContent(blog) {
    try {
      return fs.readFileSync(await getBlogPath(blog.user_id, blog.id, blog.format), "utf-8");
    } catch {
      return blog.content || "";
    }
  }
  static rowToBlog(row) {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      format: row.format,
      status: row.status,
      seriesId: row.series_id,
      seriesName: row.series_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  // ---- Quick Note ----
  static async quickCreate(userId, title, content) {
    const blog = await BlogService.createBlog(userId, title, "md", content);
    const tags = await TagService.listTags(userId);
    let quickTag = tags.find((t) => t.name === "quick-note");
    if (!quickTag) quickTag = await TagService.createTag(userId, "quick-note");
    await BlogService.setBlogTags(blog.id, [quickTag.id]);
    return blog;
  }
  // ---- Series ----
  static async listSeries(userId) {
    return dbAll(
      `SELECT series_id as seriesId, series_name as seriesName, COUNT(*) as count
       FROM blogs WHERE user_id = ? AND status = 'active' AND series_id IS NOT NULL
       GROUP BY series_id, series_name ORDER BY series_name`,
      [userId]
    );
  }
  static async getSeriesBlogs(seriesId) {
    const rows = await dbAll(
      `SELECT * FROM blogs WHERE series_id = ? AND status = 'active' ORDER BY created_at ASC`,
      [seriesId]
    );
    return rows.map(BlogService.rowToBlog);
  }
  static async setBlogSeries(blogId, seriesId, seriesName) {
    await dbRun("UPDATE blogs SET series_id = ?, series_name = ? WHERE id = ?", [seriesId, seriesName, blogId]);
  }
}
const blog_service = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  BlogService
}, Symbol.toStringTag, { value: "Module" }));
function registerBlogHandlers() {
  electron.ipcMain.handle(
    IPC.BLOG_LIST,
    async (_event, filters) => {
      try {
        const result = await getSharedBlogList(
          (sql, params) => dbAll(sql, params),
          (sql, params) => dbGet(sql, params),
          filters
        );
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  );
  electron.ipcMain.handle(IPC.BLOG_GET, async (_event, blogId) => {
    try {
      const blog = await BlogService.getBlog(blogId);
      if (!blog) return { success: false, error: "博客不存在" };
      return { success: true, data: blog };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(
    IPC.BLOG_CREATE,
    async (_event, data) => {
      try {
        const blog = await BlogService.createBlog(data.userId, data.title, data.format, data.content);
        return { success: true, data: blog };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  );
  electron.ipcMain.handle(IPC.BLOG_UPDATE, async (_event, data) => {
    try {
      await BlogService.updateBlog(data.blogId, { title: data.title, content: data.content });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BLOG_DELETE, async (_event, blogId) => {
    try {
      await BlogService.deleteBlog(blogId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BLOG_RESTORE, async (_event, blogId) => {
    try {
      await BlogService.restoreBlog(blogId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BLOG_EXPORT, async (_event, data) => {
    try {
      const count = await BlogService.exportBlogs(data.blogIds, data.outputDir);
      return { success: true, data: { exported: count } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(
    IPC.BLOG_IMPORT_MD,
    async (_event, data) => {
      try {
        const blogs = await BlogService.importMarkdownFiles(data.userId, data.filePaths || [], data.contents || []);
        return { success: true, data: blogs };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  );
  electron.ipcMain.handle(IPC.BLOG_SAVE_DRAFT, async (_event, data) => {
    try {
      await BlogService.saveDraft(data.blogId, data.content);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BLOG_GET_HISTORY, async (_event, blogId) => {
    try {
      const drafts = await BlogService.getHistory(blogId);
      return { success: true, data: drafts };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BLOG_ROLLBACK, async (_event, data) => {
    try {
      await BlogService.rollback(data.blogId, data.draftId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.TAG_SET_BLOG, async (_event, data) => {
    try {
      await BlogService.setBlogTags(data.blogId, data.tagIds);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BLOG_LIST_ATTACHMENTS, async (_event, blogId) => {
    try {
      const list = await BlogService.listAttachments(blogId);
      return { success: true, data: list };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BLOG_DELETE_ATTACHMENT, async (_event, data) => {
    try {
      await BlogService.deleteAttachment(data.blogId, data.filename);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BLOG_CLEANUP_ATTACHMENTS, async (_event, blogId) => {
    try {
      const cleaned = await BlogService.cleanupAttachments(blogId);
      return { success: true, data: { cleaned } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BLOG_BATCH_DELETE, async (_event, blogIds) => {
    try {
      for (const id of blogIds) await BlogService.deleteBlog(id);
      return { success: true, data: { deleted: blogIds.length } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BLOG_BATCH_TAG, async (_event, data) => {
    try {
      for (const id of data.blogIds) await BlogService.setBlogTags(id, data.tagIds);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BLOG_EXPORT_PDF, async (_event, blogId) => {
    const tmpPath = path.join(electron.app.getPath("temp"), `blog-export-${blogId}.html`);
    try {
      const blog = await BlogService.getBlog(blogId);
      if (!blog) return { success: false, error: "博客不存在" };
      const { filePath } = await electron.dialog.showSaveDialog({
        defaultPath: `${blog.title.replace(/[<>:"/\\|?*]/g, "_")}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }]
      });
      if (!filePath) return { success: false, error: "已取消" };
      let bodyHtml = blog.content || "";
      if (blog.format === "md") {
        const MarkdownIt = (await import("markdown-it")).default;
        const md = new MarkdownIt({ html: false, linkify: true });
        bodyHtml = md.render(bodyHtml);
      }
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body{font-family:"Noto Serif SC","Microsoft YaHei",serif;max-width:680px;margin:40px auto;padding:0 20px;color:#2c2c2c;line-height:1.8}
        h1{font-size:28px}h2{font-size:22px;margin-top:32px;border-bottom:1px solid #eee;padding-bottom:8px}
        h3{font-size:18px;margin-top:24px}pre{background:#f6f8fa;padding:16px;border-radius:6px;overflow-x:auto}
        code{font-family:"JetBrains Mono",monospace;font-size:14px}blockquote{border-left:3px solid #c0392b;padding-left:16px;color:#666}
        img{max-width:100%}.footer{margin-top:48px;padding-top:16px;border-top:1px solid #eee;color:#aaa;font-size:12px}
      </style></head><body>
        <h1>${blog.title}</h1>
        <p style="color:#888;font-size:14px">${blog.createdAt}</p>
        ${bodyHtml}
        <div class="footer">由 Local Blog KB 导出</div>
      </body></html>`;
      fs.writeFileSync(tmpPath, html, "utf-8");
      const win = new electron.BrowserWindow({ show: false, width: 800, height: 1200 });
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("PDF 渲染超时")), 1e4));
      await Promise.race([win.loadFile(tmpPath), timeout]);
      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        landscape: false,
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });
      fs.writeFileSync(filePath, pdfBuffer);
      win.close();
      return { success: true, data: { path: filePath } };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch {
      }
    }
  });
  electron.ipcMain.handle(IPC.BLOG_QUICK_CREATE, async (_event, data) => {
    try {
      const blog = await BlogService.quickCreate(data.userId, data.title, data.content);
      return { success: true, data: blog };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BLOG_SERIES_LIST, async (_event, userId) => {
    try {
      const list = await BlogService.listSeries(userId);
      return { success: true, data: list };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BLOG_SERIES_GET, async (_event, seriesId) => {
    try {
      const blogs = await BlogService.getSeriesBlogs(seriesId);
      return { success: true, data: blogs };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(
    IPC.BLOG_SERIES_SET,
    async (_event, data) => {
      try {
        await BlogService.setBlogSeries(data.blogId, data.seriesId, data.seriesName);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  );
  electron.ipcMain.handle(IPC.BLOG_EXPORT_DOCX, async (_event, blogId) => {
    try {
      const blog = await BlogService.getBlog(blogId);
      if (!blog) return { success: false, error: "博客不存在" };
      const { filePath } = await electron.dialog.showSaveDialog({
        defaultPath: `${blog.title.replace(/[<>:"/\\|?*]/g, "_")}.docx`,
        filters: [{ name: "Word 文档", extensions: ["docx"] }]
      });
      if (!filePath) return { success: false, error: "已取消" };
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");
      let mdContent = blog.content || "";
      if (blog.format === "html") {
        const TurndownService2 = (await import("turndown")).default;
        mdContent = new TurndownService2({ headingStyle: "atx", codeBlockStyle: "fenced" }).turndown(mdContent);
      }
      const lines = mdContent.split("\n");
      const children = [];
      children.push(new Paragraph({ text: blog.title, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }));
      const metaParts = [new TextRun({ text: `${blog.createdAt}`, size: 20, color: "888888" })];
      if (blog.tags?.length > 0) {
        metaParts.push(
          new TextRun({ text: `  ·  ${blog.tags.map((t) => t.name).join(", ")}`, size: 20, color: "888888" })
        );
      }
      children.push(new Paragraph({ children: metaParts, spacing: { after: 400 } }));
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        if (line.startsWith("# ") && !line.startsWith("## ")) {
          children.push(
            new Paragraph({
              text: line.replace(/^# /, ""),
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 120 }
            })
          );
        } else if (line.startsWith("## ") && !line.startsWith("### ")) {
          children.push(
            new Paragraph({
              text: line.replace(/^## /, ""),
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 240, after: 100 }
            })
          );
        } else if (line.startsWith("### ")) {
          children.push(
            new Paragraph({
              text: line.replace(/^### /, ""),
              heading: HeadingLevel.HEADING_4,
              spacing: { before: 200, after: 80 }
            })
          );
        } else if (line.startsWith("```")) {
          const codeLines = [];
          i++;
          while (i < lines.length && !lines[i].startsWith("```")) {
            codeLines.push(lines[i]);
            i++;
          }
          children.push(
            new Paragraph({
              children: [new TextRun({ text: codeLines.join("\n"), font: "Courier New", size: 18 })],
              spacing: { before: 120, after: 120 },
              shading: { fill: "F5F5F5" }
            })
          );
        } else if (line.trim() === "") {
          children.push(new Paragraph({ spacing: { after: 80 } }));
        } else {
          const cleaned = line.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/~~(.+?)~~/g, "$1").replace(/`(.+?)`/g, "$1").replace(/\[(.+?)\]\(.+?\)/g, "$1");
          children.push(new Paragraph({ text: cleaned, spacing: { after: 60 } }));
        }
        i++;
      }
      const now = (/* @__PURE__ */ new Date()).toISOString().substring(0, 10);
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `由 Local Blog KB 导出 · ${now}`, size: 18, color: "AAAAAA" })],
          spacing: { before: 600 },
          alignment: AlignmentType.CENTER
        })
      );
      const doc = new Document({ sections: [{ children }] });
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(filePath, buffer);
      return { success: true, data: { path: filePath } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
class FolderService {
  static async getFolderTree(userId, type) {
    const folders = await dbAll(
      `SELECT f.*, COALESCE(cnt.c, 0) as item_count FROM folders f
       LEFT JOIN (
         SELECT folder_id, COUNT(*) as c FROM ${type === "blog" ? "blogs" : "knowledge_files"}
         WHERE user_id = ? AND status = 'active' GROUP BY folder_id
       ) cnt ON cnt.folder_id = f.id
       WHERE f.user_id = ? AND f.type = ?
       ORDER BY f.sort_order, f.name`,
      [userId, userId, type]
    );
    return buildTree(folders);
  }
  static async createFolder(userId, name, type, parentId) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("文件夹名不能为空");
    const existing = parentId != null ? await dbGet(
      "SELECT * FROM folders WHERE user_id = ? AND name = ? AND parent_id = ? AND type = ?",
      [userId, trimmed, parentId, type]
    ) : await dbGet(
      "SELECT * FROM folders WHERE user_id = ? AND name = ? AND parent_id IS NULL AND type = ?",
      [userId, trimmed, type]
    );
    if (existing) throw new Error("同名文件夹已存在");
    await dbRun("INSERT INTO folders (user_id, name, parent_id, type, created_at) VALUES (?, ?, ?, ?, ?)", [
      userId,
      trimmed,
      parentId ?? null,
      type,
      (/* @__PURE__ */ new Date()).toISOString()
    ]);
    const row = await dbGet(
      "SELECT * FROM folders WHERE user_id = ? AND name = ? AND type = ? ORDER BY id DESC LIMIT 1",
      [userId, trimmed, type]
    );
    if (!row) throw new Error("创建文件夹失败");
    return row;
  }
  static async renameFolder(folderId, name) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("文件夹名不能为空");
    await dbRun("UPDATE folders SET name = ? WHERE id = ?", [trimmed, folderId]);
  }
  static async deleteFolder(folderId) {
    await dbRun("DELETE FROM folders WHERE id = ?", [folderId]);
  }
  static async moveToFolder(itemType, itemId, folderId) {
    const table = itemType === "blog" ? "blogs" : "knowledge_files";
    await dbRun(`UPDATE ${table} SET folder_id = ?, updated_at = ? WHERE id = ?`, [
      folderId,
      (/* @__PURE__ */ new Date()).toISOString(),
      itemId
    ]);
  }
}
function buildTree(rows) {
  const map = /* @__PURE__ */ new Map();
  for (const r of rows) {
    map.set(r.id, {
      id: r.id,
      name: r.name,
      parentId: r.parent_id,
      type: r.type,
      itemCount: r.item_count,
      children: []
    });
  }
  const roots = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
function registerFolderHandlers() {
  electron.ipcMain.handle(IPC.FOLDER_TREE, async (_event, data) => {
    try {
      const tree = await FolderService.getFolderTree(data.userId, data.type);
      return { success: true, data: tree };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(
    IPC.FOLDER_CREATE,
    async (_event, data) => {
      try {
        const folder = await FolderService.createFolder(data.userId, data.name, data.type, data.parentId);
        return { success: true, data: folder };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  );
  electron.ipcMain.handle(IPC.FOLDER_RENAME, async (_event, data) => {
    try {
      await FolderService.renameFolder(data.folderId, data.name);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.FOLDER_DELETE, async (_event, folderId) => {
    try {
      await FolderService.deleteFolder(folderId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(
    IPC.FOLDER_MOVE_ITEM,
    async (_event, data) => {
      try {
        await FolderService.moveToFolder(data.itemType, data.itemId, data.folderId);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  );
}
class KnowledgeService {
  static async importFiles(userId, filePaths, copyToWorkspace) {
    const kbDir = await getKnowledgeBaseDir(userId);
    if (!fs.existsSync(kbDir)) initWorkspaceDirectories(kbDir.replace(/KnowledgeBase$/, ""));
    const imported = [];
    for (const srcPath of filePaths) {
      if (!fs.existsSync(srcPath)) continue;
      const ext = path.extname(srcPath).toLowerCase();
      if (!SUPPORTED_KB_EXTENSIONS.includes(ext)) continue;
      const originalName = path.basename(srcPath);
      const fileType = this.detectFileType(ext);
      const stat = fs.statSync(srcPath);
      let destPath;
      if (copyToWorkspace) {
        let destName = originalName;
        const existing = await dbGet(
          "SELECT * FROM knowledge_files WHERE user_id = ? AND filename = ? AND status = ?",
          [userId, destName, "active"]
        );
        if (existing) {
          const ts = Date.now();
          const parsed = path.parse(originalName);
          destName = `${parsed.name}_${ts}${parsed.ext}`;
        }
        destPath = path.join(kbDir, destName);
        fs.copyFileSync(srcPath, destPath);
      } else {
        destPath = srcPath;
      }
      let contentText = "";
      try {
        if ([".txt", ".md"].includes(ext)) {
          contentText = fs.readFileSync(destPath, "utf-8").substring(0, 102400);
        } else if ([".docx", ".doc"].includes(ext)) {
          const mammoth2 = await import("mammoth");
          const result = await mammoth2.extractRawText({ path: destPath });
          contentText = result.value.substring(0, 102400);
        } else if ([".xlsx", ".xls"].includes(ext)) {
          const ExcelJS2 = (await import("exceljs")).default;
          const wb = new ExcelJS2.Workbook();
          await wb.xlsx.readFile(destPath);
          contentText = wb.worksheets.map((ws) => {
            const lines = [];
            ws.eachRow((row2) => {
              lines.push(Array.isArray(row2.values) ? row2.values.join(" ") : String(row2.values || ""));
            });
            return lines.join("\n");
          }).join("\n").substring(0, 102400);
        }
      } catch {
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await dbRun(
        "INSERT INTO knowledge_files (user_id, filename, file_path, file_type, file_size, content_text, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
        [userId, path.basename(destPath), destPath, fileType, stat.size, contentText, now, now]
      );
      const row = await dbGet(
        "SELECT * FROM knowledge_files WHERE user_id = ? AND filename = ? AND file_type = ? ORDER BY id DESC LIMIT 1",
        [userId, path.basename(destPath), fileType]
      );
      if (row) imported.push(this.rowToFile(row));
    }
    return imported;
  }
  static async listFiles(f) {
    const { getSharedKnowledgeList } = await Promise.resolve().then(() => require("./knowledge-list-DbhdjYXp.js"));
    return getSharedKnowledgeList(
      (sql, params) => dbAll(sql, params),
      (sql, params) => dbGet(sql, params),
      f
    );
  }
  static async getFile(fileId) {
    const row = await dbGet("SELECT * FROM knowledge_files WHERE id = ?", [fileId]);
    if (!row) return null;
    return { ...this.rowToFile(row), tags: await this.getFileTags(fileId) };
  }
  static async deleteFile(fileId, dpf) {
    const row = await dbGet("SELECT * FROM knowledge_files WHERE id = ?", [fileId]);
    if (!row) throw new Error("文件不存在");
    await dbRun("UPDATE knowledge_files SET status = 'trash', updated_at = ? WHERE id = ?", [
      (/* @__PURE__ */ new Date()).toISOString(),
      fileId
    ]);
    await dbRun("INSERT INTO recycle_bin (user_id, item_type, item_id, deleted_at) VALUES (?, ?, ?, ?)", [
      row.user_id,
      "knowledge_file",
      fileId,
      (/* @__PURE__ */ new Date()).toISOString()
    ]);
    if (dpf && fs.existsSync(row.file_path)) fs.unlinkSync(row.file_path);
  }
  static async restoreFile(fileId) {
    const row = await dbGet("SELECT * FROM knowledge_files WHERE id = ? AND status = ?", [fileId, "trash"]);
    if (!row) throw new Error("文件不在回收站中");
    await dbRun("UPDATE knowledge_files SET status = 'active', updated_at = ? WHERE id = ?", [
      (/* @__PURE__ */ new Date()).toISOString(),
      fileId
    ]);
    await dbRun("DELETE FROM recycle_bin WHERE item_type = ? AND item_id = ?", ["knowledge_file", fileId]);
  }
  static async renameFile(fileId, nf) {
    const row = await dbGet("SELECT * FROM knowledge_files WHERE id = ?", [fileId]);
    if (!row) throw new Error("文件不存在");
    if (!nf.trim()) throw new Error("文件名不能为空");
    const np = path.join(path.dirname(row.file_path), nf);
    if (fs.existsSync(row.file_path)) fs.renameSync(row.file_path, np);
    await dbRun("UPDATE knowledge_files SET filename = ?, file_path = ?, updated_at = ? WHERE id = ?", [
      nf,
      np,
      (/* @__PURE__ */ new Date()).toISOString(),
      fileId
    ]);
  }
  static async getFileTags(fileId) {
    return dbAll(
      "SELECT t.id, t.user_id, t.name FROM tags t JOIN knowledge_file_tags kft ON kft.tag_id = t.id WHERE kft.file_id = ?",
      [fileId]
    );
  }
  static async setFileTags(fileId, tagIds) {
    await dbRun("DELETE FROM knowledge_file_tags WHERE file_id = ?", [fileId]);
    for (const tid of tagIds)
      await dbRun("INSERT OR IGNORE INTO knowledge_file_tags (file_id, tag_id) VALUES (?, ?)", [fileId, tid]);
  }
  static detectFileType(ext) {
    const m = {
      ".docx": "docx",
      ".doc": "docx",
      ".xlsx": "xlsx",
      ".xls": "xlsx",
      ".pptx": "pptx",
      ".ppt": "pptx",
      ".pdf": "pdf",
      ".txt": "txt",
      ".md": "txt",
      ".png": "image",
      ".jpg": "image",
      ".jpeg": "image",
      ".gif": "image",
      ".webp": "image",
      ".svg": "image"
    };
    return m[ext] || "other";
  }
  static rowToFile(row) {
    return {
      id: row.id,
      userId: row.user_id,
      filename: row.filename,
      filePath: row.file_path,
      fileType: row.file_type,
      fileSize: row.file_size,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
const knowledge_service = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  KnowledgeService
}, Symbol.toStringTag, { value: "Module" }));
class PreviewService {
  /** Generate an HTML preview for a knowledge base file */
  static async generatePreview(fileId) {
    const row = await dbGet(
      "SELECT * FROM knowledge_files WHERE id = ?",
      [fileId]
    );
    if (!row) return { error: "文件不存在" };
    const filePath = row.file_path || row.filePath;
    if (!fs.existsSync(filePath)) return { error: "文件不存在于磁盘" };
    const ext = path.extname(row.filename || filePath).toLowerCase();
    try {
      switch (ext) {
        case ".docx":
        case ".doc":
          return await this.previewDocx(filePath);
        case ".xlsx":
        case ".xls":
          return await this.previewXlsx(filePath);
        case ".pdf":
          return await this.previewPdf(filePath);
        case ".txt":
        case ".md":
          return this.previewText(filePath);
        case ".png":
        case ".jpg":
        case ".jpeg":
        case ".gif":
        case ".webp":
        case ".svg":
          return this.previewImage(filePath);
        case ".pptx":
        case ".ppt":
          return { error: "PPT 预览暂不支持，请使用系统程序打开", fileType: ext };
        default:
          return { error: "不支持的文件格式", fileType: ext };
      }
    } catch (err) {
      return { error: `预览失败: ${err.message}` };
    }
  }
  /** Open a file with the OS default application */
  static async openExternal(filePath) {
    await electron.shell.openPath(filePath);
  }
  // ---- Internal converters ----
  static async previewDocx(filePath) {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.convertToHtml({ buffer });
    return {
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: "Microsoft YaHei", sans-serif; padding: 20px; line-height: 1.8; max-width: 800px; margin: 0 auto; color: #333; }
        h1,h2,h3 { color: #1f4e79; }
        table { border-collapse: collapse; width: 100%; }
        td,th { border: 1px solid #ddd; padding: 8px; }
        img { max-width: 100%; }
      </style></head><body>${result.value}</body></html>`
    };
  }
  static async previewXlsx(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheets = workbook.worksheets.map((sheet) => {
      let tableHtml = `<h3>${sheet.name}</h3><table>`;
      sheet.eachRow((row) => {
        tableHtml += "<tr>";
        row.eachCell((cell) => {
          const val = cell.value?.toString() || "";
          tableHtml += `<td>${val}</td>`;
        });
        tableHtml += "</tr>";
      });
      tableHtml += "</table>";
      return tableHtml;
    });
    return {
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: "Microsoft YaHei", sans-serif; padding: 20px; color: #333; }
        h3 { color: #1f4e79; margin-top: 20px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; font-size: 13px; }
        td,th { border: 1px solid #ddd; padding: 6px 10px; }
        tr:nth-child(even) { background: #f9f9f9; }
      </style></head><body>${sheets.join("")}</body></html>`
    };
  }
  static async previewPdf(filePath) {
    try {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      if (typeof pdfjsLib.getDocument !== "function") {
        return { error: "PDF 预览组件加载失败，请使用系统程序打开" };
      }
      pdfjsLib.GlobalWorkerOptions.workerSrc = "";
      const data = new Uint8Array(fs.readFileSync(filePath));
      const doc = await pdfjsLib.getDocument({ data }).promise;
      const totalPages = doc.numPages;
      const pages = [];
      for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        let textHtml = "";
        for (const item of textContent.items) {
          if ("str" in item) {
            textHtml += `${item.str} `;
          }
        }
        pages.push(
          `<div class="pdf-page"><div class="page-num">第 ${i}/${totalPages} 页</div><p class="pdf-text">${textHtml}</p></div>`
        );
      }
      const morePages = totalPages > 5 ? `<p class="more">仅显示前 5 页 (共 ${totalPages} 页)。使用系统程序打开查看完整内容。</p>` : "";
      return {
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
          body { font-family: "Microsoft YaHei", sans-serif; padding: 20px; color: #333; }
          .pdf-page { margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 4px; background: #fafafa; }
          .page-num { font-size: 12px; color: #999; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
          .pdf-text { line-height: 1.8; white-space: pre-wrap; font-size: 14px; }
          .more { color: #999; font-style: italic; margin-top: 15px; }
        </style></head><body>${pages.join("")}${morePages}</body></html>`
      };
    } catch (err) {
      return { error: `PDF 预览失败: ${err.message}` };
    }
  }
  static previewText(filePath) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const escaped = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return {
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: "Consolas", "Courier New", monospace; padding: 20px; line-height: 1.6; white-space: pre-wrap; color: #333; background: #fafafa; }
      </style></head><body>${escaped}</body></html>`
    };
  }
  static previewImage(filePath) {
    const encodedPath = filePath.replace(/\\/g, "/");
    return {
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
        img { max-width: 100%; max-height: 100vh; object-fit: contain; }
      </style></head><body><img src="file:///${encodedPath}" onerror="this.parentElement.innerHTML='<p style=color:#999>图片加载失败</p>'" /></body></html>`
    };
  }
}
function registerKnowledgeHandlers() {
  electron.ipcMain.handle(
    IPC.KB_LIST,
    async (_event, f) => {
      try {
        const r = await KnowledgeService.listFiles(f);
        return { success: true, data: r };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  );
  electron.ipcMain.handle(IPC.KB_GET, async (_event, fileId) => {
    try {
      const f = await KnowledgeService.getFile(fileId);
      if (!f) return { success: false, error: "文件不存在" };
      return { success: true, data: f };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(
    IPC.KB_IMPORT,
    async (_event, data) => {
      try {
        const files = await KnowledgeService.importFiles(data.userId, data.filePaths, data.copyToWorkspace);
        return { success: true, data: files };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  );
  electron.ipcMain.handle(IPC.KB_DELETE, async (_event, data) => {
    try {
      await KnowledgeService.deleteFile(data.fileId, data.deletePhysicalFile);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.KB_RESTORE, async (_event, fileId) => {
    try {
      await KnowledgeService.restoreFile(fileId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.KB_RENAME, async (_event, data) => {
    try {
      await KnowledgeService.renameFile(data.fileId, data.newFilename);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.KB_PREVIEW, async (_event, fileId) => {
    try {
      return await PreviewService.generatePreview(fileId);
    } catch (err) {
      return { error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.KB_OPEN_EXTERNAL, async (_event, fileId) => {
    try {
      const f = await KnowledgeService.getFile(fileId);
      if (!f) return { success: false, error: "文件不存在" };
      await PreviewService.openExternal(f.filePath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.TAG_SET_FILE, async (_event, data) => {
    try {
      await KnowledgeService.setFileTags(data.fileId, data.tagIds);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.KB_BATCH_DELETE, async (_event, fileIds) => {
    try {
      for (const id of fileIds) await KnowledgeService.deleteFile(id, false);
      return { success: true, data: { deleted: fileIds.length } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
function rowToItem(r) {
  return {
    id: r.id,
    userId: r.user_id,
    itemType: r.item_type,
    itemId: r.item_id,
    deletedAt: r.deleted_at
  };
}
class RecycleService {
  static async listItems(userId) {
    const rows = await dbAll(
      "SELECT id, user_id, item_type, item_id, deleted_at FROM recycle_bin WHERE user_id = ? ORDER BY deleted_at DESC",
      [userId]
    );
    return rows.map(rowToItem);
  }
  static async restoreItem(userId, itemId, itemType) {
    const item = await dbGet(
      "SELECT * FROM recycle_bin WHERE user_id = ? AND item_id = ? AND item_type = ?",
      [userId, itemId, itemType]
    );
    if (!item) throw new Error("回收站中未找到该项目");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (itemType === "blog")
      await dbRun("UPDATE blogs SET status = 'active', updated_at = ? WHERE id = ?", [now, itemId]);
    else if (itemType === "knowledge_file")
      await dbRun("UPDATE knowledge_files SET status = 'active', updated_at = ? WHERE id = ?", [now, itemId]);
    await dbRun("DELETE FROM recycle_bin WHERE id = ?", [item.id]);
  }
  static async emptyTrash(userId) {
    const rows = await dbAll("SELECT * FROM recycle_bin WHERE user_id = ?", [userId]);
    for (const item of rows) await RecycleService.permanentlyDeleteItem(item);
    return rows.length;
  }
  static async autoClean(userId, days) {
    const rows = await dbAll(
      `SELECT * FROM recycle_bin WHERE user_id = ? AND deleted_at < datetime('now', '-${days} days')`,
      [userId]
    );
    for (const item of rows) await RecycleService.permanentlyDeleteItem(item);
    return rows.length;
  }
  static async permanentlyDeleteItem(item) {
    const toDelete = [];
    const toDeleteDirs = [];
    if (item.item_type === "blog") {
      const blog = await dbGet("SELECT user_id, format FROM blogs WHERE id = ?", [
        item.item_id
      ]);
      if (blog) {
        try {
          toDelete.push(await getBlogPath(blog.user_id, item.item_id, blog.format));
        } catch {
        }
        try {
          toDeleteDirs.push(await getBlogAssetsDir(blog.user_id, item.item_id));
        } catch {
        }
      }
      await dbRun("DELETE FROM blog_tags WHERE blog_id = ?", [item.item_id]);
      await dbRun("DELETE FROM blog_drafts WHERE blog_id = ?", [item.item_id]);
      await dbRun("DELETE FROM blogs WHERE id = ?", [item.item_id]);
    } else if (item.item_type === "knowledge_file") {
      const kf = await dbGet(
        "SELECT user_id, file_path FROM knowledge_files WHERE id = ?",
        [item.item_id]
      );
      if (kf) {
        try {
          const workspacePath = await getWorkspacePath(kf.user_id);
          if (kf.file_path.startsWith(workspacePath)) toDelete.push(kf.file_path);
        } catch {
        }
      }
      await dbRun("DELETE FROM knowledge_file_tags WHERE file_id = ?", [item.item_id]);
      await dbRun("DELETE FROM knowledge_files WHERE id = ?", [item.item_id]);
    }
    await dbRun("DELETE FROM recycle_bin WHERE id = ?", [item.id]);
    for (const p of toDelete) {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {
      }
    }
    for (const d of toDeleteDirs) {
      try {
        if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
      } catch {
      }
    }
  }
}
function registerRecycleHandlers() {
  electron.ipcMain.handle(IPC.RECYCLE_LIST, async (_event, userId) => {
    try {
      const items = await RecycleService.listItems(userId);
      return { success: true, data: items };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.RECYCLE_RESTORE, async (_event, data) => {
    try {
      await RecycleService.restoreItem(data.userId, data.itemId, data.itemType);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.RECYCLE_EMPTY, async (_event, userId) => {
    try {
      const removed = await RecycleService.emptyTrash(userId);
      return { success: true, data: { removed } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.RECYCLE_SET_AUTO_CLEAN, async (_event, data) => {
    try {
      const cleaned = await RecycleService.autoClean(data.userId, data.days);
      return { success: true, data: { cleaned } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(
    IPC.RECYCLE_BATCH_RESTORE,
    async (_event, data) => {
      try {
        let restored = 0;
        for (const item of data.items) {
          try {
            await RecycleService.restoreItem(data.userId, item.itemId, item.itemType);
            restored++;
          } catch {
            console.error(`[recycle] Failed to restore item ${item.itemId} (${item.itemType})`);
          }
        }
        return { success: true, data: { restored } };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  );
}
class ReferenceService {
  static async addRef(sourceType, sourceId, targetType, targetId) {
    await dbRun("INSERT OR IGNORE INTO refs (source_type, source_id, target_type, target_id) VALUES (?,?,?,?)", [
      sourceType,
      sourceId,
      targetType,
      targetId
    ]);
  }
  static async removeRef(refId) {
    await dbRun("DELETE FROM refs WHERE id = ?", [refId]);
  }
  /** Get all items referenced BY a source */
  static async getRefsFrom(sourceType, sourceId) {
    const rows = await dbAll(
      "SELECT * FROM refs WHERE source_type = ? AND source_id = ? ORDER BY created_at DESC",
      [sourceType, sourceId]
    );
    return Promise.all(
      rows.map(async (r) => {
        const title = await ReferenceService.resolveTitle(r.target_type, r.target_id);
        return { ...r, title };
      })
    );
  }
  /** Get all items that reference TO a target */
  static async getRefsTo(targetType, targetId) {
    const rows = await dbAll(
      "SELECT * FROM refs WHERE target_type = ? AND target_id = ? ORDER BY created_at DESC",
      [targetType, targetId]
    );
    return Promise.all(
      rows.map(async (r) => {
        const title = await ReferenceService.resolveTitle(r.source_type, r.source_id);
        return { ...r, title };
      })
    );
  }
  /** Search items for reference picker */
  static async searchItems(userId, scope, query) {
    const results = [];
    const like = `%${query}%`;
    if (scope === "all" || scope === "blog") {
      const blogs = await dbAll(
        "SELECT id, title FROM blogs WHERE user_id = ? AND status = 'active' AND title LIKE ? LIMIT 10",
        [userId, like]
      );
      results.push(...blogs.map((b) => ({ id: b.id, type: "blog", title: b.title })));
    }
    if (scope === "all" || scope === "knowledge") {
      const files = await dbAll(
        "SELECT id, filename as title FROM knowledge_files WHERE user_id = ? AND status = 'active' AND filename LIKE ? LIMIT 10",
        [userId, like]
      );
      results.push(...files.map((f) => ({ id: f.id, type: "knowledge", title: f.title })));
    }
    return results;
  }
  static async resolveTitle(type, id) {
    try {
      if (type === "blog") {
        const row2 = await dbAll("SELECT title FROM blogs WHERE id = ?", [id]);
        return row2[0]?.title || "(已删除)";
      }
      const row = await dbAll("SELECT filename as title FROM knowledge_files WHERE id = ?", [id]);
      return row[0]?.title || "(已删除)";
    } catch {
      return "(已删除)";
    }
  }
}
function registerReferenceHandlers() {
  electron.ipcMain.handle(
    IPC.REF_ADD,
    async (_event, data) => {
      try {
        await ReferenceService.addRef(data.sourceType, data.sourceId, data.targetType, data.targetId);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  );
  electron.ipcMain.handle(IPC.REF_REMOVE, async (_event, refId) => {
    try {
      await ReferenceService.removeRef(refId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.REF_GET_FROM, async (_event, data) => {
    try {
      const refs = await ReferenceService.getRefsFrom(data.sourceType, data.sourceId);
      return { success: true, data: refs };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.REF_GET_TO, async (_event, data) => {
    try {
      const refs = await ReferenceService.getRefsTo(data.targetType, data.targetId);
      return { success: true, data: refs };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.REF_SEARCH, async (_event, data) => {
    try {
      const items = await ReferenceService.searchItems(
        data.userId,
        data.scope,
        data.query
      );
      return { success: true, data: items };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
class WebScraperService {
  static turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "*"
  });
  /** Fetch a webpage and extract its main content as Markdown */
  static async scrape(url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("无效的 URL");
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("仅支持 http/https 链接");
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3e4);
    let response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LocalBlogKB/0.1)",
          Accept: "text/html, application/xhtml+xml"
        }
      });
    } catch (err) {
      clearTimeout(timeout);
      throw new Error(`无法访问该网页: ${err.message}`);
    }
    clearTimeout(timeout);
    if (!response.ok) {
      throw new Error(`网页返回错误 (HTTP ${response.status})`);
    }
    const html = await response.text();
    if (!html || html.length < 100) {
      throw new Error("网页内容为空");
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error("该页面不是 HTML 网页");
    }
    const { parseHTML } = await import("linkedom");
    const { Readability } = await import("@mozilla/readability");
    const { document } = parseHTML(html);
    const reader = new Readability(document);
    const article = reader.parse();
    if (!article) {
      throw new Error("无法提取网页正文");
    }
    const markdown = this.turndown.turndown(article.content);
    const excerpt = article.excerpt || article.textContent?.substring(0, 200) || "";
    return {
      title: article.title || "未命名文章",
      content: markdown,
      excerpt: excerpt.replace(/\s+/g, " ").trim(),
      siteName: article.siteName || parsed.hostname
    };
  }
}
const webScraper_service = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  WebScraperService
}, Symbol.toStringTag, { value: "Module" }));
function registerScrapeHandler() {
  electron.ipcMain.handle(IPC.SCRAPE_WEBPAGE, async (_event, url) => {
    try {
      const result = await WebScraperService.scrape(url);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
class SearchService {
  static async searchBlogs(userId, query) {
    const like = `%${query}%`;
    const rows = await dbAll(
      `SELECT id, title, 'title' as match_field FROM blogs
       WHERE user_id = ? AND status = 'active' AND title LIKE ?
       UNION
       SELECT id, title, 'content' as match_field FROM blogs
       WHERE user_id = ? AND status = 'active' AND content LIKE ?
       UNION
       SELECT id, title, 'content' as match_field FROM blogs
       WHERE user_id = ? AND status = 'active' AND id IN (
         SELECT blog_id FROM blog_drafts WHERE content LIKE ?
       )
       LIMIT 20`,
      [userId, like, userId, like, userId, like]
    );
    return rows.map((row) => ({
      scope: "blog",
      id: row.id,
      title: row.title,
      snippet: `匹配: ${row.match_field === "title" ? "标题" : "正文"}`,
      matchField: row.match_field
    }));
  }
  static async searchKnowledge(userId, query) {
    const like = `%${query}%`;
    const rows = await dbAll(
      `SELECT id, filename as title, file_type as match_field, content_text FROM knowledge_files
       WHERE user_id = ? AND status = 'active' AND (filename LIKE ? OR content_text LIKE ?)
       ORDER BY
         CASE WHEN filename LIKE ? THEN 0 ELSE 1 END,
         created_at DESC
       LIMIT 20`,
      [userId, like, like, like]
    );
    return rows.map((row) => {
      let snippet = `类型: ${row.match_field}`;
      if (row.content_text) {
        const idx = row.content_text.toLowerCase().indexOf(query.toLowerCase());
        if (idx >= 0) {
          const start = Math.max(0, idx - 30);
          const end = Math.min(row.content_text.length, idx + query.length + 30);
          snippet = (start > 0 ? "..." : "") + row.content_text.substring(start, end) + (end < row.content_text.length ? "..." : "");
        }
      }
      return {
        scope: "knowledge",
        id: row.id,
        title: row.title,
        snippet,
        matchField: snippet.includes(query) ? "content" : row.match_field
      };
    });
  }
  static async globalSearch(userId, query) {
    const [blogs, knowledge] = await Promise.all([
      this.searchBlogs(userId, query),
      this.searchKnowledge(userId, query)
    ]);
    return { blogs, knowledge };
  }
}
function registerSearchHandlers() {
  electron.ipcMain.handle(IPC.SEARCH_GLOBAL, async (_event, data) => {
    try {
      const result = await SearchService.globalSearch(data.userId, data.query);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.SEARCH_BLOGS, async (_event, data) => {
    try {
      return await SearchService.searchBlogs(data.userId, data.query);
    } catch {
      return [];
    }
  });
  electron.ipcMain.handle(IPC.SEARCH_KB, async (_event, data) => {
    try {
      return await SearchService.searchKnowledge(data.userId, data.query);
    } catch {
      return [];
    }
  });
  electron.ipcMain.handle(IPC.REBUILD_FTS_INDEX, async () => {
    return { success: true };
  });
}
function registerTagHandlers() {
  electron.ipcMain.handle(IPC.TAG_LIST, async (_event, userId) => {
    try {
      const tags = await TagService.listTags(userId);
      return { success: true, data: tags };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.TAG_CREATE, async (_event, data) => {
    try {
      const tag = await TagService.createTag(data.userId, data.name);
      return { success: true, data: tag };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.TAG_UPDATE, async (_event, data) => {
    try {
      await TagService.updateTag(data.tagId, data.name);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.TAG_DELETE, async (_event, tagId) => {
    try {
      await TagService.deleteTag(tagId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
function registerWorkspaceHandlers() {
  electron.ipcMain.handle(IPC.WORKSPACE_GET_INFO, async (_event, userId) => {
    try {
      const wsPath = await getWorkspacePath(userId);
      const getCount = async (sql, params) => {
        const row = await dbGet(sql, params);
        return row?.c || 0;
      };
      const blogCount = await getCount("SELECT COUNT(*) as c FROM blogs WHERE user_id = ? AND status = ?", [
        userId,
        "active"
      ]);
      const knowledgeCount = await getCount(
        "SELECT COUNT(*) as c FROM knowledge_files WHERE user_id = ? AND status = ?",
        [userId, "active"]
      );
      const tagCount = await getCount("SELECT COUNT(*) as c FROM tags WHERE user_id = ?", [userId]);
      let storageSize = 0;
      try {
        const files = fs.readdirSync(wsPath, { recursive: true, withFileTypes: true });
        for (const f of files) {
          if (f.isFile()) {
            try {
              storageSize += fs.statSync(path.join(f.parentPath || wsPath, f.name)).size;
            } catch {
            }
          }
        }
      } catch {
      }
      return { path: wsPath, totalFiles: blogCount + knowledgeCount, blogCount, knowledgeCount, tagCount, storageSize };
    } catch {
      console.error("[workspace] Failed to get workspace info");
      return { path: "", totalFiles: 0, blogCount: 0, knowledgeCount: 0, tagCount: 0, storageSize: 0 };
    }
  });
  electron.ipcMain.handle(IPC.WORKSPACE_SET_PATH, async (_event, data) => {
  });
  electron.ipcMain.handle(IPC.WORKSPACE_MIGRATE, async (_event, data) => {
  });
  electron.ipcMain.handle(IPC.WORKSPACE_OPEN_IN_FOLDER, async (_event, userId) => {
    try {
      electron.shell.openPath(await getWorkspacePath(userId));
    } catch {
    }
  });
  electron.ipcMain.handle(IPC.FS_SELECT_DIR, async () => {
    const r = await electron.dialog.showOpenDialog({ properties: ["openDirectory"] });
    return r.canceled ? null : r.filePaths[0];
  });
  electron.ipcMain.handle(IPC.FS_SELECT_FILES, async (_event, filters) => {
    const r = await electron.dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "All", extensions: filters.extensions }]
    });
    return r.canceled ? [] : r.filePaths;
  });
}
function registerAllIpcHandlers() {
  registerAuthHandlers();
  registerBlogHandlers();
  registerFolderHandlers();
  registerKnowledgeHandlers();
  registerSearchHandlers();
  registerWorkspaceHandlers();
  registerRecycleHandlers();
  registerReferenceHandlers();
  registerScrapeHandler();
  registerAppHandlers();
  registerTagHandlers();
}
let petActions = {};
function setPetActions(actions) {
  petActions = actions;
}
let tray = null;
let mainWindow$2 = null;
function makeIcon(size) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16">
    <path d="M8 2.5C8 2.5 5.5 1.5 4 1.5C2.5 1.5 1.5 2 1.5 2v10c0 0 1-.5 2.5-.5C5.5 11.5 8 12.5 8 12.5V2.5z" fill="#58a6ff"/>
    <path d="M8 2.5C8 2.5 10.5 1.5 12 1.5S14.5 2 14.5 2v10c0 0-1-.5-2.5-.5S8 12.5 8 12.5V2.5z" fill="#4090e0"/>
    <line x1="8" y1="2.5" x2="8" y2="12.5" stroke="#1a3a5c" stroke-width="0.5"/>
  </svg>`;
  return electron.nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
}
function buildMenu() {
  return electron.Menu.buildFromTemplate([
    { label: "📝 快速便签", click: () => petActions["quick-note"]?.() },
    { label: "📄 新建博客", click: () => petActions["new-blog"]?.() },
    { label: "📥 导入 MD", click: () => petActions["import-md"]?.() },
    { label: "📎 导入文件", click: () => petActions["import-file"]?.() },
    { label: "🌐 收藏网页", click: () => petActions["scrape-web"]?.() },
    { type: "separator" },
    {
      label: "📂 打开主窗口",
      click: () => {
        if (mainWindow$2) {
          mainWindow$2.show();
          mainWindow$2.focus();
        }
      }
    },
    { type: "separator" },
    { label: "🐱 桌面宠物", click: () => togglePet(), type: "checkbox", checked: petActive },
    { type: "separator" },
    {
      label: "❌ 退出",
      click: () => {
        electron.app.exit();
      }
    }
  ]);
}
let petActive = false;
function togglePet() {
  if (petActive) {
    petActive = false;
    const pw = getPetWindow();
    if (pw && !pw.isDestroyed()) pw.close();
    if (tray) tray.setContextMenu(buildMenu());
    return;
  }
  petActive = true;
  if (mainWindow$2) createPet(mainWindow$2);
  if (tray) tray.setContextMenu(buildMenu());
}
function setupTray(win) {
  mainWindow$2 = win;
  if (tray) tray.destroy();
  tray = new electron.Tray(makeIcon(16));
  tray.setToolTip("本地博客与知识库");
  tray.setContextMenu(buildMenu());
  tray.on("double-click", () => {
    if (mainWindow$2) {
      mainWindow$2.show();
      mainWindow$2.focus();
    }
  });
}
let petWin = null;
let mainWindow$1 = null;
let dragInterval = null;
let dragOffset = { x: 0, y: 0 };
let _posFile;
function posFile() {
  return _posFile || (_posFile = path.join(electron.app.getPath("userData"), "pet-position.json"));
}
let _petDir;
function petDir() {
  return _petDir || (_petDir = path.join(electron.app.getPath("userData"), "pet"));
}
let cachedUserId = null;
async function getUserId() {
  if (cachedUserId) return cachedUserId;
  const { dbGet: dbGet2 } = await Promise.resolve().then(() => index);
  const user = await dbGet2("SELECT id FROM users LIMIT 1");
  cachedUserId = user?.id || 1;
  return cachedUserId;
}
function ensurePetImages() {
  const imgDir = path.join(petDir(), "img");
  fs.mkdirSync(imgDir, { recursive: true });
  const srcDir = path.join(__dirname, "..", "..", "img");
  const files = ["static.png", "drug.png"];
  for (const f of files) {
    const dest = path.join(imgDir, f);
    if (!fs.existsSync(dest)) {
      const src = path.join(srcDir, f);
      if (fs.existsSync(src)) fs.copyFileSync(src, dest);
    }
  }
  return {
    static: path.join(imgDir, "static.png").replace(/\\/g, "/"),
    drug: path.join(imgDir, "drug.png").replace(/\\/g, "/")
  };
}
function ensureMiniPreload() {
  const p = path.join(electron.app.getPath("userData"), "mini-preload.js");
  if (!fs.existsSync(p)) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(
      p,
      `const{contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('miniApi',{invoke:(c,...a)=>ipcRenderer.invoke(c,...a),send:(c,...a)=>ipcRenderer.send(c,...a)});`
    );
  }
  return p;
}
let miniNoteWin = null;
let miniScrapeWin = null;
function showQuickNote() {
  if (miniNoteWin && !miniNoteWin.isDestroyed()) {
    miniNoteWin.focus();
    return;
  }
  const miniPreload = ensureMiniPreload();
  let closing = false;
  const win = new electron.BrowserWindow({
    width: 380,
    height: 60,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, preload: miniPreload }
  });
  win.center();
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{display:flex;align-items:center;height:60px;padding:0 12px;background:#1a1a2e;border-radius:8px;transition:background .2s}
    body.saved{background:#1a3a2e}
    input{flex:1;background:transparent;border:none;outline:none;color:#e0e0e0;font-size:15px;font-family:sans-serif}
    input::placeholder{color:#666}
    .hint{color:#555;font-size:11px;white-space:nowrap;margin-left:8px;transition:color .2s}
    body.saved .hint{color:#3fb950}
  </style></head><body>
    <input id="inp" placeholder="快速便签..." autofocus>
    <span class="hint" id="hint">Enter 保存 · Esc 关闭</span>
  </body></html>`;
  miniNoteWin = win;
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  win.once("ready-to-show", () => win.show());
  win.on("closed", () => {
    miniNoteWin = null;
  });
  const saveAndClose = async () => {
    const text = await win.webContents.executeJavaScript('document.getElementById("inp").value').catch(() => "");
    if (text.trim()) {
      try {
        const { BlogService: BlogService2 } = await Promise.resolve().then(() => blog_service);
        const uid = await getUserId();
        await BlogService2.quickCreate(uid, text.trim().substring(0, 50), text.trim());
        await win.webContents.executeJavaScript(`
          document.body.classList.add('saved');
          document.getElementById('hint').textContent='✓ 已保存';
        `);
        await new Promise((r) => setTimeout(r, 400));
        new electron.Notification({ title: "便签已保存", body: text.trim().substring(0, 60) }).show();
      } catch (e) {
        new electron.Notification({ title: "保存失败", body: e.message }).show();
      }
    }
    if (!win.isDestroyed()) win.close();
  };
  const forceClose = setTimeout(() => {
    if (!win.isDestroyed()) win.close();
  }, 5e3);
  win.webContents.on("before-input-event", (_e, input) => {
    if (input.key === "Escape") {
      clearTimeout(forceClose);
      win.close();
    }
    if (input.key === "Enter") {
      clearTimeout(forceClose);
      saveAndClose();
    }
  });
  win.on("close", (e) => {
    if (!closing) {
      e.preventDefault();
      closing = true;
      clearTimeout(forceClose);
      saveAndClose();
    }
  });
}
function showScrapeWindow() {
  if (miniScrapeWin && !miniScrapeWin.isDestroyed()) {
    miniScrapeWin.focus();
    return;
  }
  const miniPreload = ensureMiniPreload();
  const win = new electron.BrowserWindow({
    width: 500,
    height: 420,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, preload: miniPreload }
  });
  win.center();
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{padding:16px;background:#1a1a2e;color:#e0e0e0;font-family:sans-serif;border-radius:8px}
    h2{font-size:16px;margin-bottom:12px}
    input{width:100%;padding:10px 12px;border:1px solid #333;border-radius:6px;background:#0d1117;color:#e0e0e0;font-size:14px;outline:none;margin-bottom:12px}
    input:focus{border-color:#58a6ff}
    .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-radius:6px;font-size:13px;cursor:pointer;font-weight:500}
    .btn-primary{background:#58a6ff;color:#fff}
    .btn-primary:disabled{opacity:.4;cursor:default}
    .status{margin-top:8px;font-size:12px;color:#888}
    .preview{margin-top:12px;padding:12px;background:#0d1117;border-radius:6px;max-height:180px;overflow-y:auto;font-size:13px;line-height:1.6}
    .close-btn{position:absolute;top:8px;right:12px;cursor:pointer;color:#666;font-size:16px;background:none;border:none}
    .close-btn:hover{color:#e0e0e0}
    @keyframes spin{to{transform:rotate(360deg)}}
    .spinner{display:none;width:16px;height:16px;border:2px solid #333;border-top-color:#58a6ff;border-radius:50%;animation:spin .6s linear infinite;margin-left:8px}
  </style></head><body>
    <button class="close-btn" onclick="window.close()">✕</button>
    <h2>🌐 收藏网页</h2>
    <input id="url" placeholder="粘贴网页 URL" autofocus>
    <button class="btn btn-primary" id="scrape-btn" onclick="doScrape()">抓取</button>
    <div class="status" id="status"><span class="spinner" id="spinner"></span></div>
    <div class="preview" id="preview" style="display:none"></div>
    <button class="btn btn-primary" id="import-btn" style="display:none;margin-top:8px" onclick="doImport()">导入为博客</button>
  </body></html>`;
  miniScrapeWin = win;
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  win.on("closed", () => {
    miniScrapeWin = null;
  });
  win.webContents.once("did-finish-load", () => {
    win.webContents.executeJavaScript(`
      let lastResult=null;
      window.doScrape=async()=>{
        const url=document.getElementById('url').value.trim();
        if(!url)return;
        document.getElementById('status').innerHTML='<span class="spinner" style="display:inline-block"></span> 抓取中...';
        document.getElementById('scrape-btn').disabled=true;
        try{
          const result=await window.miniApi.invoke('pet:scrape',url);
          if(result.success){
            lastResult=result.data;
            document.getElementById('status').textContent='✓ '+result.data.title;
            document.getElementById('preview').style.display='block';
            document.getElementById('preview').textContent=result.data.excerpt||result.data.content?.substring(0,1500)||'';
            document.getElementById('import-btn').style.display='inline-flex';
          }else{
            document.getElementById('status').textContent='✗ '+(result.error||'抓取失败');
          }
        }catch(e){document.getElementById('status').textContent='✗ 抓取失败';}
        document.getElementById('scrape-btn').disabled=false;
      };
      window.doImport=async()=>{
        if(!lastResult)return;
        document.getElementById('import-btn').disabled=true;
        document.getElementById('import-btn').textContent='导入中...';
        try{
          const result=await window.miniApi.invoke('pet:scrape-import',lastResult);
          document.getElementById('status').textContent=result.success?'✓ 已导入':'✗ 导入失败';
          if(result.success)setTimeout(()=>window.close(),800);
        }catch(e){document.getElementById('status').textContent='✗ 导入失败';}
        document.getElementById('import-btn').disabled=false;
        document.getElementById('import-btn').textContent='导入为博客';
      };
    `);
  });
  win.once("ready-to-show", () => win.show());
}
async function handleImportMd() {
  const result = await electron.dialog.showOpenDialog({
    title: "导入 Markdown 文件",
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "Markdown", extensions: ["md", "txt", "html"] }]
  });
  if (result.canceled || !result.filePaths.length) return;
  try {
    const { BlogService: BlogService2 } = await Promise.resolve().then(() => blog_service);
    const uid = await getUserId();
    const blogs = await BlogService2.importMarkdownFiles(uid, result.filePaths);
    new electron.Notification({ title: "导入完成", body: `已导入 ${blogs.length} 篇博客` }).show();
  } catch (e) {
    new electron.Notification({ title: "导入失败", body: e.message }).show();
  }
}
async function handleImportFile() {
  const result = await electron.dialog.showOpenDialog({
    title: "导入知识库文件",
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: "All Supported",
        extensions: [
          "docx",
          "doc",
          "xlsx",
          "xls",
          "pptx",
          "ppt",
          "pdf",
          "txt",
          "md",
          "png",
          "jpg",
          "jpeg",
          "gif",
          "webp",
          "svg"
        ]
      }
    ]
  });
  if (result.canceled || !result.filePaths.length) return;
  try {
    const { KnowledgeService: KnowledgeService2 } = await Promise.resolve().then(() => knowledge_service);
    const uid = await getUserId();
    await KnowledgeService2.importFiles(uid, result.filePaths, true);
    new electron.Notification({ title: "导入完成", body: `已导入 ${result.filePaths.length} 个文件` }).show();
  } catch (e) {
    new electron.Notification({ title: "导入失败", body: e.message }).show();
  }
}
function showStandaloneEditor() {
  if (mainWindow$1) {
    if (!mainWindow$1.isVisible()) mainWindow$1.show();
    mainWindow$1.focus();
    mainWindow$1.webContents.send("pet-action", { action: "new-blog" });
  }
}
function petMenu() {
  return electron.Menu.buildFromTemplate([
    { label: "📝 快速便签", click: () => showQuickNote() },
    { label: "📄 新建博客", click: () => showStandaloneEditor() },
    { label: "📥 导入 MD", click: () => handleImportMd() },
    { label: "📎 导入文件", click: () => handleImportFile() },
    { label: "🌐 收藏网页", click: () => showScrapeWindow() },
    { type: "separator" },
    {
      label: "📂 打开主窗口",
      click: () => {
        if (mainWindow$1) {
          mainWindow$1.show();
          mainWindow$1.focus();
        }
      }
    }
  ]);
}
function loadPosition() {
  try {
    if (fs.existsSync(posFile())) {
      const pos = JSON.parse(fs.readFileSync(posFile(), "utf-8"));
      const displays = electron.screen.getAllDisplays();
      const inBounds = displays.some((d) => {
        const { x, y, width, height } = d.workArea;
        return pos.x >= x - 20 && pos.y >= y - 20 && pos.x <= x + width && pos.y <= y + height;
      });
      if (inBounds) return pos;
    }
  } catch {
  }
  const primary = electron.screen.getPrimaryDisplay().workArea;
  return { x: primary.width - 160, y: primary.height - 160 };
}
function createPet(win) {
  mainWindow$1 = win;
  if (petWin && !petWin.isDestroyed()) petWin.close();
  const pos = loadPosition();
  const images = ensurePetImages();
  const preloadPath = path.join(electron.app.getPath("userData"), "pet-preload.js");
  const petHtmlPath = path.join(electron.app.getPath("userData"), "pet.html");
  fs.writeFileSync(
    petHtmlPath,
    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{margin:0;overflow:hidden;background:transparent}
#pet{width:128px;height:128px;background:url('${images.static}') center/contain no-repeat;transition:transform .1s ease;cursor:grab;user-select:none;-webkit-user-drag:none}
#pet:active{cursor:grabbing}
@keyframes idle-breathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
#pet.idle{animation:idle-breathe 2.5s ease-in-out infinite}
#pet.dragging{background-image:url('${images.drug}');animation:none;transform:scale(1.08)}
@keyframes click-pop{0%{transform:scale(1)}50%{transform:scale(.92)}100%{transform:scale(1)}}
#pet.clicked{animation:click-pop .2s ease}
#pet:hover{transform:scale(1.05)}
#pet.dragging:hover{transform:scale(1.08)}
</style></head><body><div id="pet" class="idle"></div>
<script>
let mouseDownPos=null,hasMoved=false;
const pet=document.getElementById('pet');
pet.addEventListener('mousedown',e=>{mouseDownPos={x:e.screenX,y:e.screenY};hasMoved=false;pet.classList.add('dragging');pet.classList.remove('idle','clicked');window.petApi?.startDrag()});
window.addEventListener('mousemove',e=>{if(!mouseDownPos)return;if(Math.abs(e.screenX-mouseDownPos.x)>5||Math.abs(e.screenY-mouseDownPos.y)>5)hasMoved=true});
window.addEventListener('mouseup',()=>{if(!mouseDownPos)return;pet.classList.remove('dragging');window.petApi?.stopDrag();if(!hasMoved){pet.classList.add('clicked');setTimeout(()=>pet.classList.remove('clicked'),200);pet.classList.add('idle');window.petApi?.onClick()}else{pet.classList.add('idle');window.petApi?.savePosition()}mouseDownPos=null});
<\/script></html>`
  );
  if (!fs.existsSync(preloadPath)) {
    fs.mkdirSync(path.dirname(preloadPath), { recursive: true });
    fs.writeFileSync(
      preloadPath,
      `const{contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('petApi',{startDrag:()=>ipcRenderer.send('pet:startDrag'),stopDrag:()=>ipcRenderer.send('pet:stopDrag'),onClick:()=>ipcRenderer.send('pet:click'),savePosition:()=>ipcRenderer.send('pet:savePosition')});`
    );
  }
  petWin = new electron.BrowserWindow({
    width: 128,
    height: 128,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath
    }
  });
  petWin.loadFile(petHtmlPath);
  petWin.once("ready-to-show", () => petWin?.show());
  registerPetIpc();
  setPetActions({
    "quick-note": showQuickNote,
    "new-blog": showStandaloneEditor,
    "import-md": handleImportMd,
    "import-file": handleImportFile,
    "scrape-web": showScrapeWindow
  });
}
function initPetActions() {
  registerPetIpc();
  setPetActions({
    "quick-note": showQuickNote,
    "new-blog": showStandaloneEditor,
    "import-md": handleImportMd,
    "import-file": handleImportFile,
    "scrape-web": showScrapeWindow
  });
}
let _ipcRegistered = false;
function registerPetIpc() {
  if (_ipcRegistered) return;
  _ipcRegistered = true;
  electron.ipcMain.handle("pet:scrape", async (_e, url) => {
    try {
      const { WebScraperService: WebScraperService2 } = await Promise.resolve().then(() => webScraper_service);
      return await WebScraperService2.scrapeWebpage(url);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("pet:scrape-import", async (_e, data) => {
    try {
      const { BlogService: BlogService2 } = await Promise.resolve().then(() => blog_service);
      const uid = await getUserId();
      const blog = await BlogService2.createBlog(uid, data.title, "md", data.content);
      new electron.Notification({ title: "已导入", body: data.title }).show();
      return { success: true, data: blog };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.on("pet:startDrag", () => {
    if (!petWin || petWin.isDestroyed()) return;
    const cursor = electron.screen.getCursorScreenPoint();
    const [wx, wy] = petWin.getPosition();
    dragOffset = { x: cursor.x - wx, y: cursor.y - wy };
    dragInterval = setInterval(() => {
      if (!petWin || petWin.isDestroyed()) {
        if (dragInterval) clearInterval(dragInterval);
        return;
      }
      const c = electron.screen.getCursorScreenPoint();
      petWin.setPosition(c.x - dragOffset.x, c.y - dragOffset.y);
    }, 16);
  });
  electron.ipcMain.on("pet:stopDrag", () => {
    if (dragInterval) {
      clearInterval(dragInterval);
      dragInterval = null;
    }
  });
  electron.ipcMain.on("pet:savePosition", () => {
    if (petWin && !petWin.isDestroyed()) {
      const [x, y] = petWin.getPosition();
      try {
        fs.writeFileSync(posFile(), JSON.stringify({ x, y }));
      } catch {
      }
    }
  });
  electron.ipcMain.on("pet:click", () => {
    if (petWin && !petWin.isDestroyed()) {
      petMenu().popup({ window: petWin, x: 64, y: 64 });
    }
  });
}
function getPetWindow() {
  return petWin;
}
electron.app.disableHardwareAcceleration();
electron.app.commandLine.appendSwitch("disable-gpu");
electron.app.setPath("cache", path.join(electron.app.getPath("userData"), "cache"));
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: "本地博客与知识库",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    },
    webviewTag: true,
    show: false
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
    if (!electron.app.isPackaged) mainWindow?.webContents.openDevTools();
  });
  mainWindow.on("close", (e) => {
    e.preventDefault();
    mainWindow?.hide();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    electron.shell.openExternal(url);
    return { action: "deny" };
  });
}
electron.app.whenReady().then(async () => {
  try {
    await initDatabase();
    console.log("[Main] Database ready");
    BackupService.startAutoBackup();
  } catch (err) {
    console.warn("[Main] Database unavailable:", err.message);
  }
  registerAllIpcHandlers();
  createWindow();
  if (mainWindow) setupTray(mainWindow);
  initPetActions();
  const shortcutDir = path.join(process.env.APPDATA || "", "Microsoft", "Windows", "Start Menu", "Programs");
  const shortcutPath = path.join(shortcutDir, "Idiot.lnk");
  if (!fs.existsSync(shortcutPath)) {
    const projectRoot = path.join(__dirname, "..", "..");
    const packagedExe = path.join(projectRoot, "release", "Idiot-win32-x64", "Idiot.exe");
    const launcherBatPath = path.join(electron.app.getPath("userData"), "launcher.bat");
    let batContent;
    let workingDir;
    if (fs.existsSync(packagedExe)) {
      batContent = `@echo off\r
set ELECTRON_RUN_AS_NODE=\r
start "" "${packagedExe}"\r
`;
      workingDir = path.dirname(packagedExe);
    } else {
      batContent = `@echo off\r
set ELECTRON_RUN_AS_NODE=\r
cd /d "${projectRoot}"\r
start "" npm run dev\r
`;
      workingDir = projectRoot;
    }
    fs.writeFileSync(launcherBatPath, batContent, "utf-8");
    const psCmd = `$ws=New-Object -ComObject WScript.Shell;$sc=$ws.CreateShortcut('${shortcutPath.replace(/'/g, "''")}');$sc.TargetPath='${launcherBatPath.replace(/'/g, "''")}';$sc.WorkingDirectory='${workingDir.replace(/'/g, "''")}';$sc.Save()`;
    node_child_process.exec(`powershell -NoProfile -Command "${psCmd}"`, (err) => {
      if (!err) console.log("[Main] Start Menu shortcut created");
    });
  }
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  BackupService.stopAutoBackup();
  closeDatabase();
  if (process.platform !== "darwin") electron.app.quit();
});
exports.sanitizePagination = sanitizePagination;
