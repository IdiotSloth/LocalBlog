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
  BLOG_SET_PINNED: "blog:set-pinned",
  BLOG_SET_COLOR: "blog:set-color",
  // Tag
  TAG_LIST: "tag:list",
  TAG_CREATE: "tag:create",
  TAG_UPDATE: "tag:update",
  TAG_DELETE: "tag:delete",
  TAG_MERGE: "tag:merge",
  TAG_SET_BLOG: "tag:set-blog",
  TAG_SET_FILE: "tag:set-file",
  // Quick Note
  BLOG_QUICK_CREATE: "blog:quickCreate",
  // Series
  BLOG_SERIES_LIST: "blog:seriesList",
  BLOG_SERIES_GET: "blog:seriesGet",
  BLOG_SERIES_SET: "blog:seriesSet",
  BLOG_SERIES_RENAME: "blog:seriesRename",
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
  KB_SET_PROPERTIES: "kb:set-properties",
  KB_UPDATE_CONTENT: "kb:update-content",
  // Search
  SEARCH_GLOBAL: "search:global",
  SEARCH_BLOGS: "search:blogs",
  SEARCH_KB: "search:kb",
  REBUILD_FTS_INDEX: "search:rebuild-index",
  SEARCH_QUERY: "search:query",
  SEARCH_GET_DOCUMENTS: "search:get-documents",
  // Workspace
  WORKSPACE_EXPORT_ZIP: "workspace:export-zip",
  WORKSPACE_GET_INFO: "workspace:get-info",
  WORKSPACE_SET_PATH: "workspace:set-path",
  WORKSPACE_MIGRATE: "workspace:migrate",
  WORKSPACE_OPEN_IN_FOLDER: "workspace:open-in-folder",
  WORKSPACE_EXPORT_MD: "workspace:export-md",
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
  FOLDER_MOVE: "folder:move",
  // Web Scraping
  SCRAPE_WEBPAGE: "scrape:webpage",
  SCRAPE_EXTRACT_TOC: "scrape:extract-toc",
  SCRAPE_COLLECT_MANUAL: "scrape:collect-manual",
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
  // Notes
  NOTE_LIST: "note:list",
  // Continue Writing
  CONTINUE_GET_DRAFTS: "continue:get-drafts",
  CONTINUE_GET_LAST_BLOG: "continue:get-last-blog",
  CONTINUE_GET_RECENT_FILES: "continue:get-recent-files",
  NOTE_CREATE: "note:create",
  NOTE_DELETE: "note:delete",
  NOTE_PIN: "note:pin",
  NOTE_CLIPBOARD: "note:clipboard",
  // Graph (Phase 20C)
  GRAPH_GET_DATA: "graph:getData",
  // Shortcuts
  SHORTCUT_GET_ALL: "shortcut:get-all",
  SHORTCUT_UPDATE: "shortcut:update",
  SHORTCUT_RESET: "shortcut:reset",
  // App
  BG_IMAGE_READ: "bgImage:read",
  SHELL_OPEN_EXTERNAL: "shell:openExternal",
  APP_VISIBILITY: "app:visibility",
  APP_GET_VERSION: "app:get-version",
  APP_GET_SYSTEM_LANGUAGE: "app:get-system-language",
  APP_SET_AUTO_START: "app:set-auto-start",
  APP_GET_AUTO_START: "app:get-auto-start",
  APP_CREATE_START_MENU_SHORTCUT: "app:create-start-menu-shortcut",
  APP_HAS_START_MENU_SHORTCUT: "app:has-start-menu-shortcut",
  APP_CHECK_UPDATE: "app:check-update",
  APP_DOWNLOAD_UPDATE: "app:download-update",
  APP_INSTALL_UPDATE: "app:install-update",
  // Pet
  PET_SCRAPE: "pet:scrape",
  PET_SCRAPE_IMPORT: "pet:scrape-import",
  PET_START_DRAG: "pet:startDrag",
  PET_STOP_DRAG: "pet:stopDrag",
  PET_SAVE_POSITION: "pet:savePosition",
  PET_CLICK: "pet:click",
  // Events (main → renderer via webContents.send)
  EVT_TRAY_ACTION: "tray-action",
  EVT_PET_ACTION: "pet-action",
  EVT_NAVIGATE: "navigate",
  EVT_BLOG_REFRESH: "blog:refresh",
  EVT_NOTE_REFRESH: "note:refresh",
  EVT_KB_REFRESH: "kb:refresh",
  EVT_MANUAL_COLLECT_PROGRESS: "manual:collect-progress",
  EVT_APP_ERROR: "app:error",
  EVT_UPDATE_STATUS: "app:update-status",
  EVT_QUICK_NOTE_TRIGGER: "quick-note:trigger",
  // Quick Note (T2304)
  QUICK_NOTE_SHOW: "quick-note:show",
  // Clipboard (T2304)
  CLIPBOARD_HISTORY: "clipboard:history",
  CLIPBOARD_CLEAR: "clipboard:clear",
  CLIPBOARD_TOGGLE: "clipboard:toggle",
  CLIPBOARD_STATUS: "clipboard:status",
  // Whiteboard (T2307)
  WHITEBOARD_GET: "whiteboard:get",
  WHITEBOARD_NODES: "whiteboard:nodes",
  WHITEBOARD_NODE_CREATE: "whiteboard:node-create",
  WHITEBOARD_NODE_UPDATE: "whiteboard:node-update",
  WHITEBOARD_NODE_DELETE: "whiteboard:node-delete",
  WHITEBOARD_EDGES: "whiteboard:edges",
  WHITEBOARD_EDGE_CREATE: "whiteboard:edge-create",
  WHITEBOARD_EDGE_DELETE: "whiteboard:edge-delete",
  // Bookmarks (T2209)
  BOOKMARK_ADD: "bookmark:add",
  BOOKMARK_REMOVE: "bookmark:remove",
  BOOKMARK_LIST: "bookmark:list",
  // AI (T2204)
  AI_CHAT: "ai:chat",
  AI_TAG_SUGGEST: "ai:tag-suggest"
};
const MYSQL_DDL = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(256) NOT NULL, workspace_path VARCHAR(500) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS tags (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, name VARCHAR(100) NOT NULL,
    description TEXT,
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
    cover_image TEXT, icon VARCHAR(16) DEFAULT NULL,
    is_pinned TINYINT DEFAULT 0, color VARCHAR(20) DEFAULT NULL,
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
    properties TEXT,
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, content TEXT NOT NULL,
    pinned TINYINT NOT NULL DEFAULT 0,
    source VARCHAR(20) NOT NULL DEFAULT 'manual',
    title VARCHAR(200) NOT NULL DEFAULT '',
    memo_type VARCHAR(10) NOT NULL DEFAULT 'note',
    due_date DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  // T2209: Bookmarks
  `CREATE TABLE IF NOT EXISTS bookmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id INT NOT NULL,
    title VARCHAR(500) NOT NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  // D106: Settings key-value store
  `CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    \`key\` VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    UNIQUE KEY uk_user_key (user_id, \`key\`),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
];
const MYSQL_MIGRATIONS = [
  // T2209: bookmarks table (if upgrading from older schema)
  `CREATE TABLE IF NOT EXISTS bookmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id INT NOT NULL,
    title VARCHAR(500) NOT NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  "ALTER TABLE blogs ADD COLUMN folder_id INT DEFAULT NULL",
  "ALTER TABLE blogs ADD COLUMN series_id VARCHAR(36) DEFAULT NULL",
  "ALTER TABLE blogs ADD COLUMN series_name VARCHAR(100) DEFAULT NULL",
  "ALTER TABLE knowledge_files ADD COLUMN folder_id INT DEFAULT NULL",
  "ALTER TABLE knowledge_files ADD COLUMN content_text LONGTEXT",
  "ALTER TABLE blogs ADD CONSTRAINT fk_blogs_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL",
  "ALTER TABLE tags ADD COLUMN description TEXT",
  "ALTER TABLE knowledge_files ADD CONSTRAINT fk_kf_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL",
  // T1801: MySQL FULLTEXT INDEX for full-text search
  "ALTER TABLE blogs ADD FULLTEXT INDEX ft_blogs (title, content)",
  "ALTER TABLE knowledge_files ADD FULLTEXT INDEX ft_knowledge (filename, content_text)",
  // Phase 21: Rebuild FULLTEXT indexes with ngram parser for CJK search.
  // The original indexes (T1801) use the default parser which treats CJK
  // as single tokens — "面试通关手册" indexed as one token, so searching
  // "面试" never matches. ngram parser breaks into bigrams.
  "ALTER TABLE blogs DROP INDEX ft_blogs",
  "ALTER TABLE knowledge_files DROP INDEX ft_knowledge",
  "ALTER TABLE blogs ADD FULLTEXT INDEX ft_blogs (title, content) WITH PARSER ngram",
  "ALTER TABLE knowledge_files ADD FULLTEXT INDEX ft_knowledge (filename, content_text) WITH PARSER ngram",
  // T1906: notes +4 columns (title, memo_type, due_date, updated_at)
  "ALTER TABLE notes ADD COLUMN title VARCHAR(200) NOT NULL DEFAULT ''",
  "ALTER TABLE notes ADD COLUMN memo_type VARCHAR(10) NOT NULL DEFAULT 'note'",
  "ALTER TABLE notes ADD COLUMN due_date DATETIME DEFAULT NULL",
  "ALTER TABLE notes ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
  // T2009: knowledge_files properties JSON column (R176)
  "ALTER TABLE knowledge_files ADD COLUMN properties TEXT",
  // T2307: Whiteboards
  `CREATE TABLE IF NOT EXISTS whiteboards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL DEFAULT '我的白板',
    description TEXT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS whiteboard_nodes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    whiteboard_id INT NOT NULL,
    user_id INT NOT NULL,
    node_type VARCHAR(20) NOT NULL DEFAULT 'idea',
    ref_type VARCHAR(20),
    ref_id INT,
    title VARCHAR(500) NOT NULL DEFAULT '',
    summary TEXT,
    color VARCHAR(20) DEFAULT 'blue',
    task_status VARCHAR(20) DEFAULT 'todo',
    x DOUBLE NOT NULL DEFAULT 0,
    y DOUBLE NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (whiteboard_id) REFERENCES whiteboards(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS whiteboard_edges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    whiteboard_id INT NOT NULL,
    source_node_id INT NOT NULL,
    target_node_id INT NOT NULL,
    edge_type VARCHAR(20) DEFAULT 'reference',
    label VARCHAR(500) DEFAULT '',
    created_at DATETIME NOT NULL,
    FOREIGN KEY (whiteboard_id) REFERENCES whiteboards(id) ON DELETE CASCADE,
    FOREIGN KEY (source_node_id) REFERENCES whiteboard_nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (target_node_id) REFERENCES whiteboard_nodes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  // D106: settings table
  `CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    \`key\` VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    UNIQUE KEY uk_user_key (user_id, \`key\`),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  // T2103+T2108: blogs metadata columns (cover_image, icon, is_pinned, color)
  "ALTER TABLE blogs ADD COLUMN cover_image TEXT",
  "ALTER TABLE blogs ADD COLUMN icon VARCHAR(16) DEFAULT NULL",
  "ALTER TABLE blogs ADD COLUMN is_pinned TINYINT NOT NULL DEFAULT 0",
  "ALTER TABLE blogs ADD COLUMN color VARCHAR(20) DEFAULT NULL"
];
let pool = null;
function getMySQLConfig() {
  return {
    host: process.env.MYSQL_HOST || "localhost",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "123456",
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
    connectionLimit: 10,
    dateStrings: true
    // Return DATE/DATETIME as strings, not Date objects. Prevents date format mismatch.
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
  }).replace(/'now'/g, "NOW()").replace(/INSERT OR IGNORE INTO/gi, "INSERT IGNORE INTO").replace(/INSERT OR REPLACE INTO/gi, "REPLACE INTO").replace(/last_insert_rowid\(\)/gi, "LAST_INSERT_ID()");
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
  name TEXT NOT NULL,
  description TEXT DEFAULT ''
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
  cover_image TEXT DEFAULT NULL,
  icon TEXT DEFAULT NULL,
  is_pinned INTEGER DEFAULT 0,
  color TEXT DEFAULT NULL,
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
  properties TEXT DEFAULT '{}',
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
  source_type TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(source_type, source_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS notes (
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
);

-- T2209: Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- T2307: Whiteboards
CREATE TABLE IF NOT EXISTS whiteboards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '我的白板',
  description TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS whiteboard_nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  whiteboard_id INTEGER NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL DEFAULT 'idea',
  ref_type TEXT,
  ref_id INTEGER,
  title TEXT NOT NULL DEFAULT '',
  summary TEXT DEFAULT '',
  color TEXT DEFAULT 'blue',
  task_status TEXT DEFAULT 'todo',
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS whiteboard_edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  whiteboard_id INTEGER NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
  source_node_id INTEGER NOT NULL REFERENCES whiteboard_nodes(id) ON DELETE CASCADE,
  target_node_id INTEGER NOT NULL REFERENCES whiteboard_nodes(id) ON DELETE CASCADE,
  edge_type TEXT DEFAULT 'reference',
  label TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- D106: Settings key-value store
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  UNIQUE(user_id, key)
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
  try {
    sqlJsDb.run("ALTER TABLE tags ADD COLUMN description TEXT DEFAULT ''");
  } catch {
  }
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
  }
  try {
    sqlJsDb.run("ALTER TABLE notes ADD COLUMN title TEXT DEFAULT ''");
  } catch {
  }
  try {
    sqlJsDb.run("ALTER TABLE notes ADD COLUMN memo_type TEXT DEFAULT 'note'");
  } catch {
  }
  try {
    sqlJsDb.run("ALTER TABLE notes ADD COLUMN due_date TEXT DEFAULT NULL");
  } catch {
  }
  try {
    sqlJsDb.run("ALTER TABLE notes ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))");
  } catch {
  }
  try {
    const refsExists = sqlJsDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='refs'");
    if (refsExists.length > 0 && refsExists[0].values.length > 0) {
      sqlJsDb.run(`CREATE TABLE IF NOT EXISTS refs_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_type TEXT NOT NULL,
        source_id INTEGER NOT NULL,
        target_type TEXT NOT NULL,
        target_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(source_type, source_id, target_type, target_id)
      )`);
      const count = sqlJsDb.exec("SELECT COUNT(*) as c FROM refs_new");
      const newCount = count[0]?.values?.[0]?.[0] ?? 0;
      if (newCount === 0) {
        sqlJsDb.run("INSERT INTO refs_new SELECT * FROM refs");
        sqlJsDb.run("DROP TABLE refs");
        sqlJsDb.run("ALTER TABLE refs_new RENAME TO refs");
      } else {
        sqlJsDb.run("DROP TABLE refs_new");
      }
    }
  } catch {
  }
  try {
    const notesExist = sqlJsDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='notes'");
    if (notesExist.length > 0 && notesExist[0].values.length > 0) {
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
      const count = sqlJsDb.exec("SELECT COUNT(*) as c FROM notes_new");
      const newCount = count[0]?.values?.[0]?.[0] ?? 0;
      if (newCount === 0) {
        sqlJsDb.run("INSERT INTO notes_new SELECT * FROM notes");
        sqlJsDb.run("DROP TABLE notes");
        sqlJsDb.run("ALTER TABLE notes_new RENAME TO notes");
      } else {
        sqlJsDb.run("DROP TABLE notes_new");
      }
    }
  } catch {
  }
  try {
    sqlJsDb.run("ALTER TABLE knowledge_files ADD COLUMN properties TEXT DEFAULT '{}'");
  } catch {
  }
  try {
    sqlJsDb.run("ALTER TABLE blogs ADD COLUMN cover_image TEXT DEFAULT NULL");
  } catch {
  }
  try {
    sqlJsDb.run("ALTER TABLE blogs ADD COLUMN icon TEXT DEFAULT NULL");
  } catch {
  }
  try {
    sqlJsDb.run("ALTER TABLE blogs ADD COLUMN is_pinned INTEGER DEFAULT 0");
  } catch {
  }
  try {
    sqlJsDb.run("ALTER TABLE blogs ADD COLUMN color TEXT DEFAULT NULL");
  } catch {
  }
  try {
    sqlJsDb.run(`CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
  } catch {
  }
  try {
    sqlJsDb.run(`CREATE TABLE IF NOT EXISTS whiteboards (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL DEFAULT '我的白板', description TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  } catch {
  }
  try {
    sqlJsDb.run(`CREATE TABLE IF NOT EXISTS whiteboard_nodes (id INTEGER PRIMARY KEY AUTOINCREMENT, whiteboard_id INTEGER NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, node_type TEXT NOT NULL DEFAULT 'idea', ref_type TEXT, ref_id INTEGER, title TEXT NOT NULL DEFAULT '', summary TEXT DEFAULT '', color TEXT DEFAULT 'blue', task_status TEXT DEFAULT 'todo', x REAL NOT NULL DEFAULT 0, y REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  } catch {
  }
  try {
    sqlJsDb.run(`CREATE TABLE IF NOT EXISTS whiteboard_edges (id INTEGER PRIMARY KEY AUTOINCREMENT, whiteboard_id INTEGER NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE, source_node_id INTEGER NOT NULL REFERENCES whiteboard_nodes(id) ON DELETE CASCADE, target_node_id INTEGER NOT NULL REFERENCES whiteboard_nodes(id) ON DELETE CASCADE, edge_type TEXT DEFAULT 'reference', label TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  } catch {
  }
  try {
    sqlJsDb.run(`CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      UNIQUE(user_id, key)
    )`);
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
async function runAsync(sql, params = []) {
  if (useMySQL) return run$1(sql, params);
  run(sql, params);
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
async function getAsync(sql, params = []) {
  if (useMySQL) return get$1(sql, params);
  return get(sql, params);
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
async function allAsync(sql, params = []) {
  if (useMySQL) return all$1(sql, params);
  return all(sql, params);
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
function saveToDisk() {
  if (!useMySQL) sqlJsSaveNow();
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
function isUsingMySQL() {
  return useMySQL;
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
        "INSERT INTO blogs (id, user_id, title, content, format, status, folder_id, series_id, series_name, cover_image, icon, is_pinned, color, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [b.id, b.user_id, b.title, b.content ?? "", b.format, b.status, b.folder_id ?? null, b.series_id ?? null, b.series_name ?? null, b.cover_image ?? null, b.icon ?? null, b.is_pinned ?? 0, b.color ?? null, b.created_at, b.updated_at]
      );
    }
    const tags = sqlJsQuery(oldDb, "SELECT * FROM tags");
    for (const t of tags) {
      await run$1(
        "INSERT INTO tags (id, user_id, name, description) VALUES (?,?,?,?)",
        [t.id, t.user_id, t.name, t.description ?? null]
      );
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
        "INSERT INTO knowledge_files (id, user_id, filename, file_path, file_type, file_size, status, content_text, folder_id, properties, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        [k.id, k.user_id, k.filename, k.file_path, k.file_type, k.file_size, k.status, k.content_text ?? null, k.folder_id ?? null, k.properties ?? null, k.created_at, k.updated_at]
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
    try {
      const folders = sqlJsQuery(oldDb, "SELECT * FROM folders");
      for (const f of folders) {
        await run$1(
          "INSERT INTO folders (id, user_id, name, parent_id, type, sort_order, created_at) VALUES (?,?,?,?,?,?,?)",
          [f.id, f.user_id, f.name, f.parent_id ?? null, f.type, f.sort_order ?? 0, f.created_at]
        );
      }
    } catch {
    }
    try {
      const refs = sqlJsQuery(oldDb, "SELECT * FROM refs");
      for (const r of refs) {
        await run$1(
          "INSERT INTO refs (id, source_type, source_id, target_type, target_id, created_at) VALUES (?,?,?,?,?,?)",
          [r.id, r.source_type, r.source_id, r.target_type, r.target_id, r.created_at]
        );
      }
    } catch {
    }
    try {
      const notes = sqlJsQuery(oldDb, "SELECT * FROM notes");
      for (const n of notes) {
        await run$1(
          "INSERT INTO notes (id, user_id, content, pinned, source, created_at, title, memo_type, due_date, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
          [n.id, n.user_id, n.content ?? "", n.pinned ?? 0, n.source ?? "manual", n.created_at, n.title ?? "", n.memo_type ?? "note", n.due_date ?? null, n.updated_at ?? n.created_at]
        );
      }
    } catch {
    }
    try {
      const bookmarks = sqlJsQuery(oldDb, "SELECT * FROM bookmarks");
      for (const bm of bookmarks) {
        await run$1(
          "INSERT INTO bookmarks (id, user_id, target_type, target_id, title, created_at) VALUES (?,?,?,?,?,?)",
          [bm.id, bm.user_id, bm.target_type, bm.target_id, bm.title, bm.created_at]
        );
      }
    } catch {
    }
    try {
      const settings = sqlJsQuery(oldDb, "SELECT * FROM settings");
      for (const s of settings) {
        await run$1(
          "INSERT INTO settings (id, user_id, `key`, value) VALUES (?,?,?,?)",
          [s.id, s.user_id, s.key, s.value]
        );
      }
    } catch {
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
function lastInsertRowId() {
  if (!sqlJsDb) return 0;
  const result = sqlJsDb.exec("SELECT last_insert_rowid() as id");
  if (result.length > 0 && (result[0]?.values?.length ?? 0) > 0) {
    return result[0].values[0][0];
  }
  return 0;
}
const index = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  all,
  allAsync,
  closeDatabase,
  dbAll,
  dbGet,
  dbRun,
  get,
  getAsync,
  initDatabase,
  isUsingMySQL,
  lastInsertRowId,
  run,
  runAsync,
  saveToDisk
}, Symbol.toStringTag, { value: "Module" }));
function buildSystemPrompt(context) {
  const base = "你是 Local Blog KB 的 AI 助手。你可以访问用户的知识库内容来回答问题。请用中文回复，保持简洁、有帮助。";
  if (context) {
    return `${base}

以下是用户知识库中与问题相关的内容：

${context}

请基于以上内容回答用户的问题。如果引用了特定文档，请在回答中标注来源。`;
  }
  return base;
}
async function callOpenAiCompatible(config, messages, context) {
  const systemMsg = { role: "system", content: buildSystemPrompt(context) };
  const allMessages = [systemMsg, ...messages.filter((m) => m.role !== "system")];
  const resp = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: allMessages,
      temperature: 0.7,
      max_tokens: 2e3
    }),
    signal: AbortSignal.timeout(3e4)
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`AI API 错误 (${resp.status}): ${errText.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "(空响应)";
}
async function callAnthropic(config, messages, context) {
  const systemParts = [buildSystemPrompt(context)];
  const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content);
  const lastUserMsg = userMessages[userMessages.length - 1] || "";
  const resp = await fetch(`${config.baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: config.model,
      system: systemParts.join("\n\n"),
      messages: [{ role: "user", content: lastUserMsg }],
      max_tokens: 2e3
    }),
    signal: AbortSignal.timeout(3e4)
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`AI API 错误 (${resp.status}): ${errText.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data.content?.map((b) => b.text || "").join("") || "(空响应)";
}
class AiService {
  static async chat(config, request) {
    if (!config.apiKey) throw new Error("AI 未配置: 请在设置中填写 API Key");
    const { messages, context } = request;
    if (config.provider === "anthropic") {
      return callAnthropic(config, messages, context);
    }
    return callOpenAiCompatible(config, messages, context);
  }
  static async suggestTags(config, request, existingTags) {
    if (!config.apiKey) throw new Error("AI 未配置");
    const existingStr = existingTags.length > 0 ? `
现有标签: ${existingTags.join(", ")}。请优先从现有标签中选择，必要时建议新标签。` : "";
    const prompt = `根据以下博客内容，建议 3-5 个标签。只返回标签名，用逗号分隔，不要解释。

标题: ${request.title}

内容: ${request.content.slice(0, 1e3)}${existingStr}`;
    const raw = await callOpenAiCompatible(
      config,
      [{ role: "user", content: prompt }]
    );
    return raw.split(/[,，]/).map((t) => t.trim().replace(/^["'「」]/g, "").replace(/["'「」]$/g, "")).filter((t) => t.length > 0 && t.length < 50).slice(0, 5);
  }
}
function registerAiHandlers() {
  electron.ipcMain.handle(IPC.AI_CHAT, async (_event, data) => {
    try {
      const content = await AiService.chat(data.settings, data.request);
      return { success: true, data: { content } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.AI_TAG_SUGGEST, async (_event, data) => {
    try {
      const tags = await AiService.suggestTags(data.settings, data.request, data.existingTags || []);
      return { success: true, data: { tags } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
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
    const dbPath = BackupService.getDbPath();
    if (!fs.existsSync(dbPath)) {
      console.log("[Backup] Database file not found, skipping");
      return null;
    }
    const backupDir = BackupService.getBackupDir();
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
    const backupDir = BackupService.getBackupDir();
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
    if (BackupService.timer) return;
    BackupService.createBackup();
    BackupService.cleanOldBackups();
    BackupService.timer = setInterval(() => {
      BackupService.createBackup();
      BackupService.cleanOldBackups();
    }, BACKUP_INTERVAL_MS);
    console.log("[Backup] Auto-backup started (every 24h, keeping last 7)");
  }
  /** Stop auto-backup timer */
  static stopAutoBackup() {
    if (BackupService.timer) {
      clearInterval(BackupService.timer);
      BackupService.timer = null;
    }
  }
  /** Export entire workspace as a ZIP file (STORE-only, zero dependencies) */
  static async exportWorkspaceAsZip(userId, outputPath) {
    const files = [];
    const collectDir = (dir, prefix) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        const zipName = prefix + "/" + e.name;
        if (e.isDirectory()) {
          collectDir(full, zipName);
        } else {
          files.push({ name: zipName, data: fs.readFileSync(full) });
        }
      }
    };
    const blogsDir = await getBlogsDir(userId);
    const kbDir = await getKnowledgeBaseDir(userId);
    const assetsDir = await getAssetsDir(userId);
    collectDir(blogsDir, "Blogs");
    collectDir(kbDir, "KnowledgeBase");
    collectDir(assetsDir, "Assets");
    const dbPath = BackupService.getDbPath();
    if (fs.existsSync(dbPath)) {
      files.push({ name: "database.db", data: fs.readFileSync(dbPath) });
    }
    const crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
      crcTable[i] = c;
    }
    const crc32 = (buf) => {
      let c = 4294967295;
      for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ c >>> 8;
      return (c ^ 4294967295) >>> 0;
    };
    const chunks = [];
    const centralEntries = [];
    let offset = 0;
    for (const file of files) {
      const nameBuf = Buffer.from(file.name, "utf-8");
      const crc = crc32(file.data);
      const size = file.data.length;
      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(67324752, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0, 8);
      localHeader.writeUInt16LE(0, 10);
      localHeader.writeUInt32LE(crc, 14);
      localHeader.writeUInt32LE(size, 18);
      localHeader.writeUInt32LE(size, 22);
      localHeader.writeUInt16LE(nameBuf.length, 26);
      chunks.push(localHeader, nameBuf, file.data);
      const central = Buffer.alloc(46);
      central.writeUInt32LE(33639248, 0);
      central.writeUInt16LE(20, 4);
      central.writeUInt16LE(20, 6);
      central.writeUInt16LE(0, 10);
      central.writeUInt16LE(0, 12);
      central.writeUInt32LE(crc, 16);
      central.writeUInt32LE(size, 20);
      central.writeUInt32LE(size, 24);
      central.writeUInt16LE(nameBuf.length, 28);
      central.writeUInt16LE(0, 32);
      central.writeUInt16LE(0, 34);
      central.writeUInt16LE(0, 36);
      central.writeUInt32LE(0, 38);
      central.writeUInt32LE(offset, 42);
      centralEntries.push(central, nameBuf);
      offset += 30 + nameBuf.length + size;
    }
    const centralOffset = chunks.reduce((a, b) => a + b.length, 0);
    const centralSize = centralEntries.reduce((a, b) => a + b.length, 0);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(101010256, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(files.length, 8);
    eocd.writeUInt16LE(files.length, 10);
    eocd.writeUInt32LE(centralSize, 12);
    eocd.writeUInt32LE(centralOffset, 16);
    eocd.writeUInt16LE(0, 20);
    const zipBuf = Buffer.concat([...chunks, ...centralEntries, eocd]);
    fs.writeFileSync(outputPath, zipBuf);
    return outputPath;
  }
  /** List available backups */
  static listBackups() {
    const backupDir = BackupService.getBackupDir();
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
    const noteRow = await dbGet(
      "SELECT COUNT(*) as total FROM notes WHERE user_id = ?",
      [userId]
    );
    const seriesRow = await dbGet(
      "SELECT COUNT(DISTINCT series_id) as total FROM blogs WHERE user_id = ? AND series_id IS NOT NULL AND series_id != ''",
      [userId]
    );
    const bookmarkRow = await dbGet(
      "SELECT COUNT(*) as total FROM bookmarks WHERE user_id = ?",
      [userId]
    );
    const wbRow = await dbGet(
      "SELECT COUNT(*) as total FROM whiteboards WHERE user_id = ?",
      [userId]
    );
    return {
      totalBlogs: blogRow?.total || 0,
      totalWords: blogRow?.words || 0,
      totalFiles: fileRow?.total || 0,
      longestBlog: blogRow?.longest || 0,
      currentStreak,
      longestStreak,
      uniqueTags: tagRow?.unique || 0,
      totalNotes: noteRow?.total || 0,
      totalSeries: seriesRow?.total || 0,
      totalBookmarks: bookmarkRow?.total || 0,
      totalWhiteboards: wbRow?.total || 0,
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
  const packagedExe = path.join(projectRoot, "release", "Idiot-win32-x64", "Idiot.exe");
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
  const ps1Path = path.join(electron.app.getPath("userData"), "lbkb-shortcut.ps1");
  const psScript = [
    `$ws = New-Object -ComObject WScript.Shell`,
    `$sc = $ws.CreateShortcut('${shortcutPath.replace(/'/g, "''")}')`,
    `$sc.TargetPath = '${launcherBatPath.replace(/'/g, "''")}'`,
    `$sc.WorkingDirectory = '${workingDir.replace(/'/g, "''")}'`,
    `$sc.Save()`,
    `Write-Output 'OK'`
  ].join("\n");
  fs.writeFileSync(ps1Path, psScript, "utf-8");
  return new Promise((resolve) => {
    node_child_process.exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${ps1Path}"`, (err, stdout) => {
      try {
        fs.unlinkSync(ps1Path);
      } catch {
      }
      resolve(!err && stdout.includes("OK"));
    });
  });
}
function registerAppHandlers() {
  electron.ipcMain.handle(IPC.SHELL_OPEN_EXTERNAL, async (_event, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { success: false, error: "仅允许打开 http/https 链接" };
      }
      await electron.shell.openExternal(url);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.APP_GET_VERSION, async () => {
    return electron.app.getVersion();
  });
  electron.ipcMain.handle(IPC.APP_GET_SYSTEM_LANGUAGE, async () => {
    return electron.app.getLocale();
  });
  electron.ipcMain.handle(IPC.APP_SET_AUTO_START, async (_event, enabled) => {
    try {
      const portableExe = path.join(getProjectRoot(), "release", "Idiot-win32-x64", "Idiot.exe");
      if (electron.app.isPackaged || fs.existsSync(portableExe)) {
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
      const portableExe = path.join(getProjectRoot(), "release", "Idiot-win32-x64", "Idiot.exe");
      if (electron.app.isPackaged || fs.existsSync(portableExe)) {
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
      const safeFilename = path.basename(filename);
      const backupPath = path.join(backupDir, safeFilename);
      if (!fs.existsSync(backupPath)) return { success: false, error: "备份文件不存在" };
      const safetyName = `${safeFilename}.pre-restore`;
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
      const safeFilename = path.basename(filename);
      const backupPath = path.join(backupDir, safeFilename);
      if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.WORKSPACE_EXPORT_ZIP, async (_event, userId) => {
    try {
      const { filePath } = await electron.dialog.showSaveDialog({
        defaultPath: `LocalBlogKB-export-${(/* @__PURE__ */ new Date()).toISOString().substring(0, 10)}.zip`,
        filters: [{ name: "ZIP 档案", extensions: ["zip"] }]
      });
      if (!filePath) return { success: false, error: "已取消" };
      const result = await BackupService.exportWorkspaceAsZip(userId, filePath);
      return { success: true, data: { path: result } };
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
  electron.ipcMain.handle(IPC.CLIPBOARD_HISTORY, async () => {
    const { getClipboardHistory, getHistoryLength } = await Promise.resolve().then(() => require("./clipboard.service-qxz3tghp.js"));
    const data = getClipboardHistory();
    console.log("[Clipboard IPC] history requested, count:", getHistoryLength(), "masked:", data.length);
    return { success: true, data };
  });
  electron.ipcMain.handle(IPC.CLIPBOARD_CLEAR, async () => {
    const { clearClipboardHistory } = await Promise.resolve().then(() => require("./clipboard.service-qxz3tghp.js"));
    clearClipboardHistory();
    return { success: true };
  });
  electron.ipcMain.handle(IPC.BG_IMAGE_READ, async (_event, data) => {
    try {
      const resolved = path.resolve(data.filePath);
      if (path.normalize(data.filePath).includes("..")) {
        return { success: false, error: "路径包含非法字符" };
      }
      const ext = path.extname(resolved).replace(".", "") || "png";
      if (!["png", "jpg", "jpeg", "webp"].includes(ext)) {
        return { success: false, error: "不支持的文件类型" };
      }
      const buf = fs.readFileSync(resolved);
      const mime = ext === "jpg" ? "jpeg" : ext;
      const b64 = buf.toString("base64");
      return { success: true, data: `data:image/${mime};base64,${b64}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.CLIPBOARD_TOGGLE, async (_event, data) => {
    const { startClipboardMonitor, stopClipboardMonitor, setClipboardUserId } = await Promise.resolve().then(() => require("./clipboard.service-qxz3tghp.js"));
    if (data.userId) setClipboardUserId(data.userId);
    if (data.enable) await startClipboardMonitor();
    else stopClipboardMonitor();
    return { success: true };
  });
  electron.ipcMain.handle(IPC.CLIPBOARD_STATUS, async () => {
    const { isClipboardMonitorRunning } = await Promise.resolve().then(() => require("./clipboard.service-qxz3tghp.js"));
    return { success: true, data: isClipboardMonitorRunning() };
  });
}
function toMySQLDateTime(date = /* @__PURE__ */ new Date()) {
  return date.toISOString().replace("T", " ").slice(0, 19);
}
const nowMySQL = () => toMySQLDateTime();
const datetime = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  nowMySQL,
  toMySQLDateTime
}, Symbol.toStringTag, { value: "Module" }));
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
        nowMySQL()
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
    const expiresAt = toMySQLDateTime(new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1e3));
    await dbRun("INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)", [
      userId,
      token,
      expiresAt,
      nowMySQL()
    ]);
    return { success: true, user: { id: userId, username, workspacePath, createdAt: nowMySQL() }, token };
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
    const expiresAt = toMySQLDateTime(new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1e3));
    await dbRun("DELETE FROM sessions WHERE user_id = ?", [row.id]);
    await dbRun("INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)", [
      row.id,
      token,
      expiresAt,
      nowMySQL()
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
let petActions = {};
function setPetActions(actions) {
  petActions = actions;
}
let tray = null;
let mainWindow$1 = null;
function getFaviconPath() {
  const candidates = [
    // 1. extraResources (real files outside ASAR)
    path.join(process.resourcesPath || "", "img", "favicon.ico"),
    // 2. ASAR root (electron-builder files)
    path.join(electron.app.getAppPath(), "img", "favicon.ico"),
    // 3. ASAR nested via post-build.js
    path.join(electron.app.getAppPath(), "out", "renderer", "img", "favicon.ico"),
    // 4. Dev fallback
    path.join(__dirname, "..", "..", "img", "favicon.ico")
  ];
  for (const p of candidates) {
    try {
      if (require("node:fs").existsSync(p)) return p;
    } catch {
    }
  }
  try {
    const imgDir = path.join(process.resourcesPath || electron.app.getAppPath(), "img");
    if (require("node:fs").existsSync(imgDir)) {
      const files = require("node:fs").readdirSync(imgDir);
      const ico = files.find((f) => f.endsWith(".ico") || f.endsWith(".png"));
      if (ico) return path.join(imgDir, ico);
    }
  } catch {
  }
  return candidates[0];
}
function makeIcon(size) {
  const icoPath = getFaviconPath();
  const img = electron.nativeImage.createFromPath(icoPath);
  if (!img.isEmpty()) return img.resize({ width: size, height: size });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16">
    <rect width="16" height="16" rx="3" fill="#2563eb"/>
    <text x="8" y="12" text-anchor="middle" font-size="10" fill="#fff">B</text>
  </svg>`;
  return electron.nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
}
function buildMenu() {
  return electron.Menu.buildFromTemplate([
    { label: "快速便签", click: () => petActions["quick-note"]?.() },
    { label: "新建博客", click: () => petActions["new-blog"]?.() },
    { label: "导入 MD", click: () => petActions["import-md"]?.() },
    { label: "导入文件", click: () => petActions["import-file"]?.() },
    { label: "收藏网页", click: () => petActions["scrape-web"]?.() },
    { label: "收藏在线手册", click: () => petActions["manual-collect"]?.() },
    { label: "剪贴板→便签", click: () => petActions["clipboard-note"]?.() },
    { type: "separator" },
    {
      label: "打开主窗口",
      click: () => {
        if (mainWindow$1) {
          mainWindow$1.show();
          mainWindow$1.focus();
        }
      }
    },
    { type: "separator" },
    { label: "桌面宠物", click: () => togglePet(), type: "checkbox", checked: petActive },
    { type: "separator" },
    {
      label: "退出",
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
  if (mainWindow$1) createPet(mainWindow$1);
  if (tray) tray.setContextMenu(buildMenu());
}
function setupTray(win) {
  mainWindow$1 = win;
  if (tray) tray.destroy();
  tray = new electron.Tray(makeIcon(16));
  tray.setToolTip("本地博客与知识库");
  tray.setContextMenu(buildMenu());
  tray.on("double-click", () => {
    if (mainWindow$1) {
      mainWindow$1.show();
      mainWindow$1.focus();
    }
  });
}
let petWin = null;
let mainWindow = null;
let isDragging = false;
let dragTimer = null;
let dragOffset = { x: 0, y: 0 };
let _posFile;
function posFile() {
  return _posFile || (_posFile = path.join(electron.app.getPath("userData"), "pet-position.json"));
}
function isPosOnScreen(x, y, w, h) {
  return electron.screen.getAllDisplays().some((d) => {
    const wa = d.workArea;
    return x >= wa.x - 20 && y >= wa.y - 20 && x <= wa.x + wa.width - 100 && y <= wa.y + wa.height - 100;
  });
}
function loadMiniPos(name, dw, dh) {
  const file = path.join(electron.app.getPath("userData"), `mini-${name}-pos.json`);
  try {
    if (fs.existsSync(file)) {
      const pos = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (isPosOnScreen(pos.x, pos.y, dw, dh)) return pos;
    }
  } catch {
  }
  return { x: -1, y: -1 };
}
function saveMiniPos(name, x, y) {
  const file = path.join(electron.app.getPath("userData"), `mini-${name}-pos.json`);
  try {
    fs.writeFileSync(file, JSON.stringify({ x, y }));
  } catch {
  }
}
let _petDir;
function petDir() {
  return _petDir || (_petDir = path.join(electron.app.getPath("userData"), "pet"));
}
let cachedUserId = null;
function setCurrentUserId(id) {
  cachedUserId = id;
}
async function getUserId() {
  if (cachedUserId) return cachedUserId;
  const { dbGet: dbGet2 } = await Promise.resolve().then(() => index);
  const session = await dbGet2(
    "SELECT user_id FROM sessions WHERE expires_at > datetime('now') ORDER BY id DESC LIMIT 1"
  );
  if (session?.user_id) {
    cachedUserId = session.user_id;
    return cachedUserId;
  }
  const user = await dbGet2("SELECT id FROM users LIMIT 1");
  if (user?.id) cachedUserId = user.id;
  else cachedUserId = 0;
  return cachedUserId;
}
function ensurePetImages() {
  const imgDir = path.join(petDir(), "img");
  fs.mkdirSync(imgDir, { recursive: true });
  const srcDir = fs.existsSync(path.join(process.resourcesPath || "", "img")) ? path.join(process.resourcesPath || "", "img") : path.join(__dirname, "..", "..", "img");
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
    try {
      fs.writeFileSync(
        p,
        `const{contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('miniApi',{invoke:(c,...a)=>ipcRenderer.invoke(c,...a),send:(c,...a)=>ipcRenderer.send(c,...a)});`
      );
    } catch {
    }
  }
  return p;
}
let miniNoteWin = null;
let miniScrapeWin = null;
function showQuickNote$1() {
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
    movable: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, preload: miniPreload }
  });
  const qPos = loadMiniPos("note", 380, 60);
  if (qPos.x >= 0) win.setPosition(qPos.x, qPos.y);
  else win.center();
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{display:flex;align-items:center;height:60px;padding:0 12px;background:#1a1a2e;border-radius:8px;transition:background .2s;-webkit-app-region:drag}
    body.saved{background:#1a3a2e}
    input{flex:1;background:transparent;border:none;outline:none;color:#e0e0e0;font-size:15px;font-family:sans-serif;-webkit-app-region:no-drag}
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
    if (miniNoteWin && !miniNoteWin.isDestroyed()) {
      const [x, y] = miniNoteWin.getPosition();
      saveMiniPos("note", x, y);
    }
    miniNoteWin = null;
  });
  const saveAndClose = async () => {
    if (closing) return;
    closing = true;
    const text = await win.webContents.executeJavaScript('document.getElementById("inp").value').catch(() => "");
    if (text.trim()) {
      try {
        const { NoteService: NoteService2 } = await Promise.resolve().then(() => note_service);
        const uid = await getUserId();
        const note = await NoteService2.createNote(uid, text.trim(), "quick");
        await win.webContents.executeJavaScript(`
          document.body.classList.add('saved');
          document.getElementById('hint').textContent='✓ 已保存';
        `);
        await new Promise((r) => setTimeout(r, 400));
        new electron.Notification({ title: "便签已保存", body: text.trim().substring(0, 60) }).show();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(IPC.EVT_NOTE_REFRESH);
        }
      } catch (e) {
        console.error("[QuickNote/MVF] Save failed:", e);
        new electron.Notification({ title: "保存失败", body: e.message || "未知错误" }).show();
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
      clearTimeout(forceClose);
      saveAndClose();
    }
  });
}
let mdFloatWin = null;
function showMdFloatWindow() {
  if (mdFloatWin && !mdFloatWin.isDestroyed()) {
    mdFloatWin.focus();
    return;
  }
  let closing = false;
  const win = new electron.BrowserWindow({
    width: 550,
    height: 420,
    minWidth: 400,
    minHeight: 280,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    titleBarStyle: "hidden",
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
  });
  win.center();
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{display:flex;flex-direction:column;height:100vh;background:#1a1a2e;border-radius:8px;font-family:-apple-system,system-ui,sans-serif;overflow:hidden}
    .titlebar{display:flex;align-items:center;padding:8px 12px;background:#16162a;gap:8px;-webkit-app-region:drag}
    .titlebar .dot{width:10px;height:10px;border-radius:50%;-webkit-app-region:no-drag}
    .dot.r{background:#ff5f57;cursor:pointer}
    .dot.y{background:#febc2e}
    .dot.g{background:#28c840}
    .titlebar .label{flex:1;font-size:12px;color:#888;text-align:center}
    .title-input{border:none;outline:none;background:transparent;color:#e0e0e0;font-size:18px;font-weight:600;padding:10px 16px 4px;font-family:inherit}
    .title-input::placeholder{color:#555}
    #content{flex:1;border:none;outline:none;resize:none;background:transparent;color:#c0c0c0;font-size:14px;line-height:1.7;padding:10px 16px;font-family:"JetBrains Mono","Courier New",monospace;tab-size:2}
    #content::placeholder{color:#444}
    .statusbar{display:flex;align-items:center;justify-content:space-between;padding:6px 14px;background:#16162a;font-size:11px;color:#555}
    .statusbar .hint{transition:color .3s}
    .statusbar .hint.saved{color:#3fb950}
    .close-btn{cursor:pointer;-webkit-app-region:no-drag}
  </style></head><body>
    <div class="titlebar">
      <span class="dot r close-btn" title="关闭并保存" onclick="window.close()"></span>
      <span class="dot y"></span>
      <span class="dot g"></span>
      <span class="label">MD 快捷写作</span>
    </div>
    <input id="title" class="title-input" placeholder="标题..." autofocus>
    <textarea id="content" placeholder="Markdown 内容...&#10;&#10;Ctrl+S / 点红点 → 保存并关闭&#10;Esc → 丢弃并关闭"></textarea>
    <div class="statusbar">
      <span id="hint" class="hint">Ctrl+S 保存 · Esc 丢弃 · 拖标题栏移动</span>
      <span id="wc">0 字</span>
    </div>
    <script>
      const titleEl = document.getElementById('title');
      const contentEl = document.getElementById('content');
      const hintEl = document.getElementById('hint');
      const wcEl = document.getElementById('wc');
      let saved = false;
      contentEl.addEventListener('input', function() {
        const len = contentEl.value.length;
        wcEl.textContent = len + ' 字';
      });
      function getData() {
        return { title: titleEl.value.trim(), content: contentEl.value };
      }
      // Expose for main process to read
      window._getData = getData;
    <\/script>
  </body></html>`;
  mdFloatWin = win;
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  win.once("ready-to-show", () => win.show());
  win.on("closed", () => {
    mdFloatWin = null;
  });
  win.webContents.on("before-input-event", (_e, input) => {
    if (input.key === "Escape") {
      if (!win.isDestroyed()) win.close();
    }
  });
  const saveAndClose = async () => {
    const data = await win.webContents.executeJavaScript('window._getData ? window._getData() : {title:"",content:""}').catch(() => ({ title: "", content: "" }));
    const title = data.title || "快捷写作";
    const body = data.content || "";
    if (body.trim() || data.title) {
      try {
        const { BlogService: BlogService2 } = await Promise.resolve().then(() => blog_service);
        const uid = await getUserId();
        await BlogService2.quickCreate(uid, title.substring(0, 100), body);
        await win.webContents.executeJavaScript(`
          hintEl.textContent='\\u2713 已保存';
          hintEl.classList.add('saved');
        `);
        new electron.Notification({ title: "已保存", body: title }).show();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(IPC.EVT_BLOG_REFRESH);
        }
      } catch (e) {
        console.error("[QuickNote/MVF] Save failed:", e);
        new electron.Notification({ title: "保存失败", body: e.message || "未知错误" }).show();
      }
    }
    if (!win.isDestroyed()) win.close();
  };
  win.webContents.on("before-input-event", (_e, input) => {
    if ((input.control || input.meta) && input.key === "s") {
      saveAndClose();
    }
    if (input.key === "Escape") {
      if (!win.isDestroyed()) win.close();
    }
  });
  win.on("close", (e) => {
    if (!closing) {
      e.preventDefault();
      closing = true;
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
    movable: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, preload: miniPreload }
  });
  const sPos = loadMiniPos("scrape", 500, 420);
  if (sPos.x >= 0) win.setPosition(sPos.x, sPos.y);
  else win.center();
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{padding:16px;background:#1a1a2e;color:#e0e0e0;font-family:sans-serif;border-radius:8px;-webkit-app-region:drag}
    h2{font-size:16px;margin-bottom:12px}
    input{-webkit-app-region:no-drag;width:100%;padding:10px 12px;border:1px solid #333;border-radius:6px;background:#0d1117;color:#e0e0e0;font-size:14px;outline:none;margin-bottom:12px}
    input:focus{border-color:#58a6ff}
    .btn{-webkit-app-region:no-drag}
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
    if (miniScrapeWin && !miniScrapeWin.isDestroyed()) {
      const [x, y] = miniScrapeWin.getPosition();
      saveMiniPos("scrape", x, y);
    }
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
          const result=await window.miniApi.invoke('${IPC.PET_SCRAPE}',url);
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
          const result=await window.miniApi.invoke('${IPC.PET_SCRAPE_IMPORT}',lastResult);
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
  if (mainWindow) {
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send(IPC.EVT_PET_ACTION, "new-blog");
  }
}
async function handleClipboardNote() {
  const text = electron.clipboard.readText();
  if (!text.trim()) {
    new electron.Notification({ title: "剪贴板为空", body: "无法读取剪贴板内容" }).show();
    return;
  }
  try {
    const { NoteService: NoteService2 } = await Promise.resolve().then(() => note_service);
    const uid = await getUserId();
    await NoteService2.createNote(uid, text.trim(), "clipboard");
    new electron.Notification({ title: "便签已保存", body: text.trim().substring(0, 60) }).show();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC.EVT_NOTE_REFRESH);
    }
  } catch (e) {
    new electron.Notification({ title: "保存失败", body: e.message || "未知错误" }).show();
  }
}
function petMenu() {
  return electron.Menu.buildFromTemplate([
    { label: "📝 快速便签", click: () => showQuickNote$1() },
    { label: "📄 新建博客", click: () => showStandaloneEditor() },
    { label: "📥 导入 MD", click: () => handleImportMd() },
    { label: "📎 导入文件", click: () => handleImportFile() },
    { label: "🌐 收藏网页", click: () => showScrapeWindow() },
    { label: "📋 剪贴板→便签", click: () => handleClipboardNote() },
    { type: "separator" },
    {
      label: "📂 打开主窗口",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
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
  mainWindow = win;
  if (petWin && !petWin.isDestroyed()) petWin.close();
  const pos = loadPosition();
  const images = ensurePetImages();
  const preloadPath = path.join(electron.app.getPath("userData"), "pet-preload.js");
  const petHtmlPath = path.join(electron.app.getPath("userData"), "pet.html");
  try {
    fs.writeFileSync(
      petHtmlPath,
      `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{margin:0;overflow:hidden;background:transparent}
#pet{width:128px;height:128px;background:url('${images.static}') center/contain no-repeat;transition:transform .08s linear;cursor:grab;user-select:none;-webkit-user-drag:none}
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
  } catch {
  }
  if (!fs.existsSync(preloadPath)) {
    fs.mkdirSync(path.dirname(preloadPath), { recursive: true });
    try {
      fs.writeFileSync(
        preloadPath,
        `const{contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('petApi',{startDrag:()=>ipcRenderer.send('${IPC.PET_START_DRAG}'),stopDrag:()=>ipcRenderer.send('${IPC.PET_STOP_DRAG}'),onClick:()=>ipcRenderer.send('${IPC.PET_CLICK}'),savePosition:()=>ipcRenderer.send('${IPC.PET_SAVE_POSITION}')});`
      );
    } catch {
    }
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
    "quick-note": showQuickNote$1,
    "md-float": showMdFloatWindow,
    "new-blog": showStandaloneEditor,
    "import-md": handleImportMd,
    "import-file": handleImportFile,
    "scrape-web": showScrapeWindow,
    "clipboard-note": handleClipboardNote,
    "manual-collect": showManualCollect
  });
}
function showManualCollect() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send(IPC.EVT_NAVIGATE, "/blog?tab=manual");
  }
}
function initPetActions() {
  registerPetIpc();
  setPetActions({
    "quick-note": showQuickNote$1,
    "md-float": showMdFloatWindow,
    "new-blog": showStandaloneEditor,
    "import-md": handleImportMd,
    "import-file": handleImportFile,
    "scrape-web": showScrapeWindow,
    "clipboard-note": handleClipboardNote,
    "manual-collect": showManualCollect
  });
}
let _ipcRegistered = false;
function registerPetIpc() {
  if (_ipcRegistered) return;
  _ipcRegistered = true;
  electron.ipcMain.handle(IPC.PET_SCRAPE, async (_e, url) => {
    try {
      const { WebScraperService: WebScraperService2 } = await Promise.resolve().then(() => webScraper_service);
      return await WebScraperService2.scrape(url);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle(IPC.PET_SCRAPE_IMPORT, async (_e, data) => {
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
  electron.ipcMain.on(IPC.PET_START_DRAG, () => {
    if (!petWin || petWin.isDestroyed()) return;
    const cursor = electron.screen.getCursorScreenPoint();
    const [wx = 0, wy = 0] = petWin.getPosition();
    dragOffset = { x: cursor.x - wx, y: cursor.y - wy };
    isDragging = true;
    const dragLoop = () => {
      if (!isDragging || !petWin || petWin.isDestroyed()) {
        if (dragTimer) {
          clearTimeout(dragTimer);
          dragTimer = null;
        }
        return;
      }
      const c = electron.screen.getCursorScreenPoint();
      petWin.setPosition(c.x - dragOffset.x, c.y - dragOffset.y);
      dragTimer = setTimeout(dragLoop, 16);
    };
    dragLoop();
  });
  electron.ipcMain.on(IPC.PET_STOP_DRAG, () => {
    isDragging = false;
    if (dragTimer) {
      clearTimeout(dragTimer);
      dragTimer = null;
    }
  });
  electron.ipcMain.on(IPC.PET_SAVE_POSITION, () => {
    if (petWin && !petWin.isDestroyed()) {
      const [x, y] = petWin.getPosition();
      try {
        fs.writeFileSync(posFile(), JSON.stringify({ x, y }));
      } catch {
      }
    }
  });
  electron.ipcMain.on(IPC.PET_CLICK, () => {
    if (petWin && !petWin.isDestroyed()) {
      petMenu().popup({ window: petWin, x: 64, y: 64 });
    }
  });
}
function getPetWindow() {
  return petWin;
}
function registerAuthHandlers() {
  electron.ipcMain.handle(IPC.AUTH_LOGIN, async (_event, req) => {
    try {
      const res = await AuthService.login(req.username, req.password, req.rememberMe);
      if (res.success && res.user) setCurrentUserId(res.user.id);
      return res;
    } catch (err) {
      console.error("[Auth IPC] Login error:", err);
      return { success: false, error: `登录异常: ${err.message}` };
    }
  });
  electron.ipcMain.handle(IPC.AUTH_REGISTER, async (_event, req) => {
    try {
      const res = await AuthService.register(req.username, req.password, req.workspacePath);
      if (res.success && res.user) setCurrentUserId(res.user.id);
      return res;
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
      const res = await AuthService.verifyToken(token);
      if (res.success && res.user) setCurrentUserId(res.user.id);
      return res;
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
function buildBlogSelect(id) {
  return { sql: "SELECT * FROM blogs WHERE id = ?", params: [id] };
}
function buildBlogCreate(userId, title, format, content) {
  const now = nowMySQL();
  return {
    sql: "INSERT INTO blogs (user_id, title, format, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    params: [userId, title, format, content, now, now]
  };
}
function buildBlogDelete(id, userId) {
  const now = nowMySQL();
  return {
    sql: "UPDATE blogs SET status = 'trash', updated_at = ? WHERE id = ? AND user_id = ?",
    params: [now, id, userId]
  };
}
function buildBlogRestore(id, userId) {
  const now = nowMySQL();
  return {
    sql: "UPDATE blogs SET status = 'active', updated_at = ? WHERE id = ? AND user_id = ?",
    params: [now, id, userId]
  };
}
function buildBlogDraftInsert(blogId, content) {
  const now = nowMySQL();
  return {
    sql: "INSERT INTO blog_drafts (blog_id, content, saved_at) VALUES (?, ?, ?)",
    params: [blogId, content, now]
  };
}
function buildRecycleInsert(userId, itemType, itemId) {
  const now = nowMySQL();
  return {
    sql: "INSERT INTO recycle_bin (user_id, item_type, item_id, deleted_at) VALUES (?, ?, ?, ?)",
    params: [userId, itemType, itemId, now]
  };
}
function buildBlogTagsSelect(blogId) {
  return {
    sql: "SELECT t.id, t.user_id, t.name FROM tags t JOIN blog_tags bt ON bt.tag_id = t.id WHERE bt.blog_id = ?",
    params: [blogId]
  };
}
function buildBlogSelectTrash(id) {
  return { sql: "SELECT * FROM blogs WHERE id = ? AND status = ?", params: [id, "trash"] };
}
function buildRecycleDelete(itemType, itemId, userId) {
  return {
    sql: "DELETE FROM recycle_bin WHERE item_type = ? AND item_id = ? AND user_id = ?",
    params: [itemType, itemId, userId]
  };
}
function buildBlogDraftSelect(draftId, blogId) {
  return {
    sql: "SELECT * FROM blog_drafts WHERE id = ? AND blog_id = ?",
    params: [draftId, blogId]
  };
}
function buildBlogHistorySelect(blogId) {
  return {
    sql: "SELECT id, blog_id, content, saved_at FROM blog_drafts WHERE blog_id = ? ORDER BY saved_at DESC LIMIT 20",
    params: [blogId]
  };
}
function mapBlogRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    format: row.format,
    status: row.status,
    seriesId: row.series_id,
    seriesName: row.series_name,
    folderId: row.folder_id,
    coverImage: row.cover_image,
    icon: row.icon,
    isPinned: row.is_pinned,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
const VALID_SORT = ["created_at", "updated_at", "title"];
const VALID_ORDER = ["asc", "desc"];
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
  if (filters.excludeSeries) {
    conditions.push("(b.series_id IS NULL OR b.series_id = ?)");
    params.push("");
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
const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
function extractWikilinkRefs(html, sourceType, sourceId) {
  const refs = [];
  const linkRe = /<a\s[^>]*class="wiki-link"[^>]*data-ref-type="([^"]*)"[^>]*data-ref-id="(\d+)"[^>]*>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    refs.push({ sourceType, sourceId, targetType: m[1], targetId: Number(m[2]) });
  }
  return refs;
}
function extractWikilinkTitles(content) {
  const titles = [];
  const cleaned = content.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
  let m;
  while ((m = WIKILINK_RE.exec(cleaned)) !== null) {
    const title = m[1].trim();
    if (title) titles.push(title);
  }
  WIKILINK_RE.lastIndex = 0;
  return titles;
}
class TagService {
  static async listTags(userId) {
    return dbAll(
      `SELECT t.id, t.user_id, t.name, t.description,
        (SELECT COUNT(*) FROM blog_tags bt WHERE bt.tag_id = t.id) as blogCount,
        (SELECT COUNT(*) FROM knowledge_file_tags kft WHERE kft.tag_id = t.id) as kbCount,
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
  static async updateTag(userId, tagId, name, description) {
    const t = name.trim();
    if (!t) throw new Error("标签名不能为空");
    if (description !== void 0) {
      await dbRun("UPDATE tags SET name = ?, description = ? WHERE id = ? AND user_id = ?", [t, description, tagId, userId]);
    } else {
      await dbRun("UPDATE tags SET name = ? WHERE id = ? AND user_id = ?", [t, tagId, userId]);
    }
  }
  static async deleteTag(userId, tagId) {
    await dbRun("DELETE FROM tags WHERE id = ? AND user_id = ?", [tagId, userId]);
  }
}
class BlogService {
  static async createBlog(userId, title, format, content) {
    if (!title || title.length > MAX_TITLE_LENGTH) throw new Error(`标题长度必须在 1-${MAX_TITLE_LENGTH} 字符之间`);
    if (!["md", "html"].includes(format)) throw new Error("格式必须是 md 或 html");
    const blogsDir = await getBlogsDir(userId);
    if (!fs.existsSync(blogsDir)) initWorkspaceDirectories(blogsDir.replace(/Blogs$/, ""));
    const { sql, params } = buildBlogCreate(userId, title, format, content);
    await dbRun(sql, params);
    const row = await dbGet(
      "SELECT * FROM blogs WHERE user_id = ? AND title = ? AND format = ? ORDER BY id DESC LIMIT 1",
      [userId, title, format]
    );
    if (!row) throw new Error("创建博客失败");
    const filePath = await getBlogPath(userId, row.id, format);
    fs.writeFileSync(filePath, content, "utf-8");
    return mapBlogRow(row);
  }
  static async getBlog(blogId) {
    const { sql, params } = buildBlogSelect(blogId);
    const row = await dbGet(sql, params);
    if (!row) return null;
    const filePath = await getBlogPath(row.user_id, row.id, row.format);
    let content = "";
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch {
      content = row.content || "";
    }
    const tags = await BlogService.getBlogTags(blogId);
    return { ...mapBlogRow(row), tags, content };
  }
  static async updateBlog(userId, blogId, update) {
    const { sql, params } = buildBlogSelect(blogId);
    const blog = await dbGet(sql, params);
    if (!blog) throw new Error("博客不存在");
    if (update.title !== void 0) {
      if (!update.title || update.title.length > MAX_TITLE_LENGTH)
        throw new Error(`标题长度必须在 1-${MAX_TITLE_LENGTH} 字符之间`);
      await dbRun("UPDATE blogs SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?", [update.title, nowMySQL(), blogId, userId]);
    }
    if (update.content !== void 0) {
      const filePath = await getBlogPath(blog.user_id, blogId, blog.format);
      const tmpPath = filePath + ".tmp." + Date.now();
      fs.writeFileSync(tmpPath, update.content, "utf-8");
      fs.renameSync(tmpPath, filePath);
      await dbRun("UPDATE blogs SET content = ?, updated_at = ? WHERE id = ? AND user_id = ?", [update.content, nowMySQL(), blogId, userId]);
    }
  }
  static async deleteBlog(userId, blogId) {
    const { sql, params } = buildBlogSelect(blogId);
    const blog = await dbGet(sql, params);
    if (!blog) throw new Error("博客不存在");
    const { sql: deleteSql, params: deleteParams } = buildBlogDelete(blogId, userId);
    await dbRun(deleteSql, deleteParams);
    const { sql: recycleSql, params: recycleParams } = buildRecycleInsert(blog.user_id, "blog", blogId);
    await dbRun(recycleSql, recycleParams);
  }
  static async restoreBlog(userId, blogId) {
    const { sql, params } = buildBlogSelectTrash(blogId);
    const blog = await dbGet(sql, params);
    if (!blog) throw new Error("博客不在回收站中");
    const { sql: restoreSql, params: restoreParams } = buildBlogRestore(blogId, userId);
    await dbRun(restoreSql, restoreParams);
    const { sql: recycleSql, params: recycleParams } = buildRecycleDelete("blog", blogId, userId);
    await dbRun(recycleSql, recycleParams);
  }
  static async listBlogs(filters) {
    return getSharedBlogList(
      (sql, p) => dbAll(sql, p),
      (sql, p) => dbGet(sql, p),
      filters
    );
  }
  static async exportBlogs(blogIds, outputDir) {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    let count = 0;
    for (const blogId of blogIds) {
      const { sql, params } = buildBlogSelect(blogId);
      const blog = await dbGet(sql, params);
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
      if (fmMatch?.[1]) title = fmMatch[1].trim();
      else {
        const h1Match = content.match(/^#\s+(.+)/m);
        if (h1Match?.[1]) title = h1Match[1].trim();
      }
      const format = ext === ".html" ? "html" : "md";
      const blog = await BlogService.createBlog(userId, title.substring(0, MAX_TITLE_LENGTH), format, content);
      blogs.push(blog);
    }
    for (const item of contents) {
      const title = (item.title || "未命名").substring(0, MAX_TITLE_LENGTH);
      const blog = await BlogService.createBlog(userId, title, "md", item.content);
      blogs.push(blog);
    }
    return blogs;
  }
  static async saveDraft(blogId, content) {
    const { sql, params } = buildBlogSelect(blogId);
    const blog = await dbGet(sql, params);
    if (!blog) throw new Error("博客不存在");
    const { sql: draftSql, params: draftParams } = buildBlogDraftInsert(blogId, content);
    await dbRun(draftSql, draftParams);
  }
  static async getHistory(blogId) {
    const { sql, params } = buildBlogHistorySelect(blogId);
    const rows = await dbAll(sql, params);
    const blogQuery = await dbGet("SELECT title FROM blogs WHERE id = ?", [blogId]);
    const blogTitle = blogQuery?.title || "";
    return rows.map((r) => ({
      id: r.id,
      blogId: r.blog_id,
      blogTitle,
      content: r.content,
      savedAt: r.saved_at
    }));
  }
  static async rollback(userId, blogId, draftId) {
    const { sql, params } = buildBlogDraftSelect(draftId, blogId);
    const draft = await dbGet(sql, params);
    if (!draft) throw new Error("草稿不存在");
    await BlogService.updateBlog(userId, blogId, { content: draft.content });
  }
  static async getBlogTags(blogId) {
    const { sql, params } = buildBlogTagsSelect(blogId);
    return dbAll(sql, params);
  }
  static async setBlogTags(blogId, tagIds) {
    await dbRun("DELETE FROM blog_tags WHERE blog_id = ?", [blogId]);
    for (const tagId of tagIds)
      await dbRun("INSERT OR IGNORE INTO blog_tags (blog_id, tag_id) VALUES (?, ?)", [blogId, tagId]);
  }
  // ---- Attachments ----
  static async listAttachments(blogId) {
    const { sql, params } = buildBlogSelect(blogId);
    const blog = await dbGet(sql, params);
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
    const safeName = BlogService.validateFilename(filename);
    const { sql, params } = buildBlogSelect(blogId);
    const blog = await dbGet(sql, params);
    if (!blog) throw new Error("博客不存在");
    const assetsDir = await getBlogAssetsDir(blog.user_id, blogId);
    const filePath = path.join(assetsDir, safeName);
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
  static validateFilename(name) {
    const sanitized = path.basename(name);
    if (!sanitized || sanitized === "." || sanitized === "..") throw new Error("Invalid filename");
    if (sanitized.includes("\0")) throw new Error("Invalid filename");
    return sanitized;
  }
  static async getBlogContent(blog) {
    try {
      return fs.readFileSync(await getBlogPath(blog.user_id, blog.id, blog.format), "utf-8");
    } catch {
      return blog.content || "";
    }
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
    return rows.map(mapBlogRow);
  }
  static async setBlogSeries(userId, blogId, seriesId, seriesName) {
    await dbRun("UPDATE blogs SET series_id = ?, series_name = ? WHERE id = ? AND user_id = ?", [seriesId, seriesName, blogId, userId]);
  }
  static async renameSeries(seriesId, newName, userId) {
    await dbRun("UPDATE blogs SET series_name = ? WHERE series_id = ? AND user_id = ?", [newName, seriesId, userId]);
  }
}
const blog_service = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  BlogService
}, Symbol.toStringTag, { value: "Module" }));
async function syncWikilinkRefs(sourceType, sourceId, newContent, userId, oldContent) {
  const newHtmlRefs = extractWikilinkRefs(newContent, sourceType, sourceId);
  const newTitles = extractWikilinkTitles(newContent);
  const newTextRefs = await resolveTitles(newTitles, sourceType, sourceId, userId);
  const newRefs = [...newHtmlRefs, ...newTextRefs];
  const oldHtmlRefs = oldContent ? extractWikilinkRefs(oldContent, sourceType, sourceId) : [];
  const oldTitles = oldContent ? extractWikilinkTitles(oldContent) : [];
  const oldTextRefs = oldContent ? await resolveTitles(oldTitles, sourceType, sourceId, userId) : [];
  const oldRefs = [...oldHtmlRefs, ...oldTextRefs];
  const newSet = new Set(newRefs.map((r) => `${r.targetType}:${r.targetId}`));
  const oldSet = new Set(oldRefs.map((r) => `${r.targetType}:${r.targetId}`));
  if (newRefs.length === 0 && oldRefs.length === 0) return;
  await dbRun("BEGIN");
  try {
    for (const r of newRefs) {
      if (!oldSet.has(`${r.targetType}:${r.targetId}`)) {
        await dbRun("INSERT OR IGNORE INTO refs (source_type, source_id, target_type, target_id) VALUES (?,?,?,?)", [
          r.sourceType,
          r.sourceId,
          r.targetType,
          r.targetId
        ]);
      }
    }
    if (oldContent) {
      for (const r of oldRefs) {
        if (!newSet.has(`${r.targetType}:${r.targetId}`)) {
          await dbRun("DELETE FROM refs WHERE source_type = ? AND source_id = ? AND target_type = ? AND target_id = ?", [
            r.sourceType,
            r.sourceId,
            r.targetType,
            r.targetId
          ]);
        }
      }
    }
    await dbRun("COMMIT");
  } catch (e) {
    await dbRun("ROLLBACK");
    throw e;
  }
}
async function resolveTitles(titles, sourceType, sourceId, userId) {
  if (titles.length === 0) return [];
  const refs = [];
  const placeholders = titles.map(() => "?").join(",");
  const blogs = await dbAll(
    `SELECT id, title FROM blogs WHERE title IN (${placeholders}) AND status = 'active' AND user_id = ?`,
    [...titles, userId]
  );
  for (const b of blogs) {
    refs.push({ sourceType, sourceId, targetType: "blog", targetId: b.id });
  }
  const kfs = await dbAll(
    `SELECT id, filename FROM knowledge_files WHERE filename IN (${placeholders}) AND status = 'active' AND user_id = ?`,
    [...titles, userId]
  );
  for (const k of kfs) {
    refs.push({ sourceType, sourceId, targetType: "knowledge", targetId: k.id });
  }
  const notes = await dbAll(
    `SELECT id, title FROM notes WHERE title IN (${placeholders}) AND user_id = ?`,
    [...titles, userId]
  );
  for (const n of notes) {
    refs.push({ sourceType, sourceId, targetType: "note", targetId: n.id });
  }
  return refs;
}
let blogRefreshTarget = null;
function setBlogRefreshTarget(wc) {
  blogRefreshTarget = wc;
}
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
        if (data.content) await syncWikilinkRefs("blog", blog.id, data.content, data.userId);
        blogRefreshTarget?.send(IPC.EVT_BLOG_REFRESH);
        return { success: true, data: blog };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  );
  electron.ipcMain.handle(IPC.BLOG_UPDATE, async (_event, data) => {
    try {
      let oldContent;
      if (data.content) {
        const old = await BlogService.getBlog(data.blogId);
        oldContent = old?.content;
      }
      await BlogService.updateBlog(data.userId, data.blogId, { title: data.title, content: data.content });
      if (data.content) await syncWikilinkRefs("blog", data.blogId, data.content, data.userId, oldContent);
      blogRefreshTarget?.send(IPC.EVT_BLOG_REFRESH);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BLOG_DELETE, async (_event, data) => {
    try {
      await BlogService.deleteBlog(data.userId, data.blogId);
      await dbRun("DELETE FROM refs WHERE source_type = ? AND source_id = ?", ["blog", data.blogId]);
      await dbRun("DELETE FROM refs WHERE target_type = ? AND target_id = ?", ["blog", data.blogId]);
      blogRefreshTarget?.send(IPC.EVT_BLOG_REFRESH);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BLOG_RESTORE, async (_event, data) => {
    try {
      await BlogService.restoreBlog(data.userId, data.blogId);
      blogRefreshTarget?.send(IPC.EVT_BLOG_REFRESH);
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
        blogRefreshTarget?.send(IPC.EVT_BLOG_REFRESH);
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
      await BlogService.rollback(data.userId, data.blogId, data.draftId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BLOG_SET_PINNED, async (_event, data) => {
    try {
      await dbRun("UPDATE blogs SET is_pinned = ?, updated_at = ? WHERE id = ? AND user_id = ?", [data.isPinned, nowMySQL(), data.id, data.userId]);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BLOG_SET_COLOR, async (_event, data) => {
    try {
      await dbRun("UPDATE blogs SET color = ?, updated_at = ? WHERE id = ? AND user_id = ?", [data.color, nowMySQL(), data.id, data.userId]);
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
  electron.ipcMain.handle(IPC.BLOG_BATCH_DELETE, async (_event, data) => {
    try {
      for (const id of data.blogIds) {
        await BlogService.deleteBlog(data.userId, id);
        await dbRun("DELETE FROM refs WHERE source_type = ? AND source_id = ?", ["blog", id]);
        await dbRun("DELETE FROM refs WHERE target_type = ? AND target_id = ?", ["blog", id]);
      }
      blogRefreshTarget?.send(IPC.EVT_BLOG_REFRESH);
      return { success: true, data: { deleted: data.blogIds.length } };
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
      } else {
        bodyHtml = bodyHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/\son\w+\s*=\s*"[^"]*"/gi, "").replace(/\son\w+\s*=\s*'[^']*'/gi, "").replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
      }
      const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        :root {
          --text-primary: #2c2c2c; --text-secondary: #666; --text-muted: #999;
          --bg-primary: #fff; --bg-secondary: #f8f9fa; --bg-tertiary: #f0f2f5;
          --color-primary: #2563eb; --color-bg-card: #fff;
          --border-default: #e5e7eb; --accent-amber: #d97706; --accent-red: #dc2626;
          --color-text-primary: #2c2c2c; --color-text-secondary: #666; --color-text-muted: #999;
          --color-bg-base: #fff;
        }
        body{font-family:"Noto Serif SC","Microsoft YaHei",serif;max-width:680px;margin:40px auto;padding:0 20px;color:#2c2c2c;background:#fff;line-height:1.8}
        h1{font-size:28px;margin-top:0}h2{font-size:22px;margin-top:32px;border-bottom:1px solid #eee;padding-bottom:8px}
        h3{font-size:18px;margin-top:24px}h4{font-size:16px;margin-top:20px}p{margin:12px 0}
        pre{background:#f6f8fa;padding:16px;border-radius:6px;overflow-x:auto}
        code{font-family:"JetBrains Mono","Courier New",monospace;font-size:14px}pre code{font-size:13px}
        blockquote{border-left:3px solid #c0392b;padding:4px 16px;margin:16px 0;color:#555;background:#fdf8f8}
        img{max-width:100%;height:auto}
        table{border-collapse:collapse;width:100%;margin:16px 0}
        th,td{border:1px solid #e5e7eb;padding:8px 12px;text-align:left}
        th{background:#f6f8fa;font-weight:600}
        ul,ol{padding-left:24px}li{margin:4px 0}a{color:#2563eb}
        hr{border:none;border-top:1px solid #e5e7eb;margin:24px 0}
        .footer{margin-top:48px;padding-top:16px;border-top:1px solid #eee;color:#aaa;font-size:12px}
      </style></head><body>
        <h1>${esc(blog.title)}</h1>
        <p style="color:#888;font-size:14px">${esc(blog.createdAt)}</p>
        ${bodyHtml}
        <div class="footer">由 Local Blog KB 导出</div>
      </body></html>`;
      fs.writeFileSync(tmpPath, html, "utf-8");
      const win = new electron.BrowserWindow({ show: false, width: 800, height: 1200 });
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("PDF 渲染超时")), 1e4));
      await Promise.race([win.loadFile(tmpPath), timeout]);
      const pdfTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("PDF 生成超时")), 3e4));
      const pdfBuffer = await Promise.race([
        win.webContents.printToPDF({
          printBackground: true,
          landscape: false,
          margins: { top: 0, bottom: 0, left: 0, right: 0 }
        }),
        pdfTimeout
      ]);
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
      if (data.content) await syncWikilinkRefs("blog", blog.id, data.content, data.userId);
      blogRefreshTarget?.send(IPC.EVT_BLOG_REFRESH);
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
        await BlogService.setBlogSeries(data.userId, data.blogId, data.seriesId, data.seriesName);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  );
  electron.ipcMain.handle(
    IPC.BLOG_SERIES_RENAME,
    async (_event, data) => {
      try {
        await BlogService.renameSeries(data.seriesId, data.newName, data.userId);
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
        if (line === void 0) {
          i++;
          continue;
        }
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
          while (i < lines.length && lines[i] && !lines[i].startsWith("```")) {
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
function registerBookmarkHandlers() {
  electron.ipcMain.handle(IPC.BOOKMARK_ADD, async (_event, data) => {
    try {
      const existing = await dbGet(
        "SELECT id FROM bookmarks WHERE user_id = ? AND target_type = ? AND target_id = ?",
        [data.userId, data.targetType, data.targetId]
      );
      if (existing) {
        return { success: true, data: { id: existing.id } };
      }
      const now = nowMySQL();
      await dbRun(
        "INSERT INTO bookmarks (user_id, target_type, target_id, title, created_at) VALUES (?, ?, ?, ?, ?)",
        [data.userId, data.targetType, data.targetId, data.title, now]
      );
      const row = await dbGet("SELECT last_insert_rowid() as id");
      return { success: true, data: { id: row?.id ?? 0 } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BOOKMARK_REMOVE, async (_event, data) => {
    try {
      await dbRun(
        "DELETE FROM bookmarks WHERE user_id = ? AND target_type = ? AND target_id = ?",
        [data.userId, data.targetType, data.targetId]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.BOOKMARK_LIST, async (_event, userId) => {
    try {
      const rows = await dbAll(
        "SELECT id, target_type, target_id, title, created_at FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC",
        [userId]
      );
      return {
        success: true,
        data: rows.map((r) => ({
          id: r.id,
          targetType: r.target_type,
          targetId: r.target_id,
          title: r.title,
          createdAt: r.created_at
        }))
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
class ContinueService {
  static async getRecentDrafts(userId) {
    return dbAll(
      `SELECT d.id, d.blog_id as blogId, b.title as blogTitle, d.content, d.saved_at as savedAt
       FROM blog_drafts d JOIN blogs b ON d.blog_id = b.id
       WHERE b.user_id = ? AND b.status = 'active'
       ORDER BY d.saved_at DESC LIMIT 3`,
      [userId]
    );
  }
  static async getLastBlog(userId) {
    return dbGet(
      `SELECT id, title, updated_at as updatedAt
       FROM blogs WHERE user_id = ? AND status = 'active'
       ORDER BY updated_at DESC LIMIT 1`,
      [userId]
    );
  }
  static async getRecentFiles(userId) {
    return dbAll(
      `SELECT id, filename, created_at as createdAt
       FROM knowledge_files WHERE user_id = ? AND status = 'active'
       ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );
  }
}
function registerContinueHandlers() {
  electron.ipcMain.handle(IPC.CONTINUE_GET_DRAFTS, async (_event, userId) => {
    try {
      const data = await ContinueService.getRecentDrafts(userId);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.CONTINUE_GET_LAST_BLOG, async (_event, userId) => {
    try {
      const data = await ContinueService.getLastBlog(userId);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.CONTINUE_GET_RECENT_FILES, async (_event, userId) => {
    try {
      const data = await ContinueService.getRecentFiles(userId);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
function buildFolderTreeQuery(userId, type) {
  const itemTable = type === "blog" ? "blogs" : "knowledge_files";
  return {
    sql: `SELECT f.*, COALESCE(cnt.c, 0) as item_count FROM folders f
     LEFT JOIN (
       SELECT folder_id, COUNT(*) as c FROM ${itemTable}
       WHERE user_id = ? AND status = 'active' GROUP BY folder_id
     ) cnt ON cnt.folder_id = f.id
     WHERE f.user_id = ? AND f.type = ?
     ORDER BY f.sort_order, f.name`,
    params: [userId, userId, type]
  };
}
class FolderService {
  static async getFolderTree(userId, type) {
    const { sql, params } = buildFolderTreeQuery(userId, type);
    const folders = await dbAll(sql, params);
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
      nowMySQL()
    ]);
    const row = await dbGet(
      "SELECT * FROM folders WHERE user_id = ? AND name = ? AND type = ? ORDER BY id DESC LIMIT 1",
      [userId, trimmed, type]
    );
    if (!row) throw new Error("创建文件夹失败");
    return row;
  }
  static async renameFolder(userId, folderId, name) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("文件夹名不能为空");
    await dbRun("UPDATE folders SET name = ? WHERE id = ? AND user_id = ?", [trimmed, folderId, userId]);
  }
  static async deleteFolder(userId, folderId) {
    await dbRun("DELETE FROM folders WHERE id = ? AND user_id = ?", [folderId, userId]);
  }
  static async moveFolder(userId, folderId, newParentId) {
    await dbRun("UPDATE folders SET parent_id = ? WHERE id = ? AND user_id = ?", [newParentId, folderId, userId]);
  }
  static async moveToFolder(userId, itemType, itemId, folderId) {
    const table = itemType === "blog" ? "blogs" : "knowledge_files";
    await dbRun(`UPDATE ${table} SET folder_id = ?, updated_at = ? WHERE id = ? AND user_id = ?`, [folderId, nowMySQL(), itemId, userId]);
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
      map.get(node.parentId)?.children.push(node);
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
      await FolderService.renameFolder(data.userId, data.folderId, data.name);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.FOLDER_DELETE, async (_event, data) => {
    try {
      await FolderService.deleteFolder(data.userId, data.folderId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(
    IPC.FOLDER_MOVE,
    async (_event, data) => {
      try {
        await FolderService.moveFolder(data.userId, data.folderId, data.newParentId);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  );
  electron.ipcMain.handle(
    IPC.FOLDER_MOVE_ITEM,
    async (_event, data) => {
      try {
        await FolderService.moveToFolder(data.userId, data.itemType, data.itemId, data.folderId);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  );
}
function registerGraphHandlers() {
  electron.ipcMain.handle(IPC.GRAPH_GET_DATA, async (_event, userId, filter) => {
    try {
      if (filter?.scope === "local" && filter?.centerId) {
        return await getLocalGraph(userId, filter.centerId);
      }
      const maxNodes = filter?.maxNodes ?? 100;
      const types = filter?.types ?? ["blog", "knowledge", "tag", "note"];
      const nodes = [];
      const edges = [];
      if (types.includes("blog")) {
        const blogs = await dbAll(
          "SELECT id, title FROM blogs WHERE user_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT ?",
          [userId, maxNodes]
        );
        for (const b of blogs) {
          nodes.push({ id: `blog-${b.id}`, label: b.title, type: "blog" });
        }
      }
      if (types.includes("knowledge")) {
        const kfs = await dbAll(
          "SELECT id, filename FROM knowledge_files WHERE user_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT ?",
          [userId, maxNodes]
        );
        for (const k of kfs) {
          nodes.push({ id: `knowledge-${k.id}`, label: k.filename, type: "knowledge" });
        }
      }
      if (types.includes("note")) {
        const notes = await dbAll(
          "SELECT id, title FROM notes WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?",
          [userId, maxNodes]
        );
        for (const n of notes) {
          nodes.push({ id: `note-${n.id}`, label: n.title || "(便签)", type: "note" });
        }
      }
      if (types.includes("tag")) {
        const tags = await dbAll(
          "SELECT id, name FROM tags WHERE user_id = ? ORDER BY id DESC LIMIT ?",
          [userId, maxNodes]
        );
        for (const t of tags) {
          nodes.push({ id: `tag-${t.id}`, label: `#${t.name}`, type: "tag" });
        }
        const btEdges = await dbAll(
          "SELECT bt.blog_id, bt.tag_id FROM blog_tags bt JOIN blogs b ON b.id = bt.blog_id WHERE b.user_id = ? ORDER BY bt.blog_id DESC LIMIT ?",
          [userId, maxNodes * 3]
        );
        for (const e of btEdges) {
          edges.push({ source: `blog-${e.blog_id}`, target: `tag-${e.tag_id}`, type: "tag" });
        }
        const ktEdges = await dbAll(
          "SELECT kft.file_id, kft.tag_id FROM knowledge_file_tags kft JOIN knowledge_files kf ON kf.id = kft.file_id WHERE kf.user_id = ? ORDER BY kft.file_id DESC LIMIT ?",
          [userId, maxNodes * 3]
        );
        for (const e of ktEdges) {
          edges.push({ source: `knowledge-${e.file_id}`, target: `tag-${e.tag_id}`, type: "tag" });
        }
      }
      const refRows = await dbAll(
        `SELECT r.source_type, r.source_id, r.target_type, r.target_id
         FROM refs r
         LEFT JOIN blogs b ON r.source_type = 'blog' AND r.source_id = b.id AND b.user_id = ?
         LEFT JOIN knowledge_files kf ON r.source_type = 'knowledge' AND r.source_id = kf.id AND kf.user_id = ?
         LEFT JOIN notes n ON r.source_type = 'note' AND r.source_id = n.id AND n.user_id = ?
         WHERE (b.id IS NOT NULL OR kf.id IS NOT NULL OR n.id IS NOT NULL)
         ORDER BY r.created_at DESC LIMIT ?`,
        [userId, userId, userId, maxNodes * 5]
      );
      for (const r of refRows) {
        edges.push({
          source: `${r.source_type}-${r.source_id}`,
          target: `${r.target_type}-${r.target_id}`,
          type: "ref"
        });
      }
      const data = { nodes, edges };
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
async function getLocalGraph(userId, centerId) {
  const parts = centerId.split("-");
  const srcType = parts[0];
  const srcId = Number(parts[1]);
  if (!srcType || !srcId || Number.isNaN(srcId)) {
    return { success: false, error: 'Invalid centerId format. Expected "type-id"' };
  }
  const nodes = [];
  const edges = [];
  const nodeIds = /* @__PURE__ */ new Set();
  nodeIds.add(centerId);
  if (srcType === "blog") {
    const row = await dbAll("SELECT id, title FROM blogs WHERE id = ? AND user_id = ?", [srcId, userId]);
    if (row[0]) {
      nodes.push({ id: centerId, label: row[0].title, type: "blog" });
      row[0].title;
    }
  } else if (srcType === "knowledge") {
    const row = await dbAll("SELECT id, filename FROM knowledge_files WHERE id = ? AND user_id = ?", [srcId, userId]);
    if (row[0]) {
      nodes.push({ id: centerId, label: row[0].filename, type: "knowledge" });
      row[0].filename;
    }
  } else if (srcType === "note") {
    const row = await dbAll("SELECT id, title FROM notes WHERE id = ? AND user_id = ?", [srcId, userId]);
    if (row[0]) {
      nodes.push({ id: centerId, label: row[0].title || "(便签)", type: "note" });
      row[0].title || "";
    }
  }
  if (nodes.length === 0) return { success: true, data: { nodes: [], edges: [] } };
  const refs = await dbAll(
    `SELECT source_type, source_id, target_type, target_id FROM refs
     WHERE (source_type = ? AND source_id = ?) OR (target_type = ? AND target_id = ?)
     LIMIT 50`,
    [srcType, srcId, srcType, srcId]
  );
  for (const r of refs) {
    const srcNodeId = `${r.source_type}-${r.source_id}`;
    const tgtNodeId = `${r.target_type}-${r.target_id}`;
    edges.push({ source: srcNodeId, target: tgtNodeId, type: "ref" });
    if (!nodeIds.has(srcNodeId)) {
      nodeIds.add(srcNodeId);
      const label = await resolveNodeLabel(r.source_type, r.source_id, userId);
      nodes.push({ id: srcNodeId, label, type: r.source_type });
    }
    if (!nodeIds.has(tgtNodeId)) {
      nodeIds.add(tgtNodeId);
      const label = await resolveNodeLabel(r.target_type, r.target_id, userId);
      nodes.push({ id: tgtNodeId, label, type: r.target_type });
    }
  }
  const tagEdges = await getTagEdgesForNode(srcType, srcId, userId);
  for (const te of tagEdges) {
    const tagNodeId = `tag-${te.tagId}`;
    edges.push({ source: centerId, target: tagNodeId, type: "tag" });
    if (!nodeIds.has(tagNodeId)) {
      nodeIds.add(tagNodeId);
      nodes.push({ id: tagNodeId, label: `#${te.name}`, type: "tag" });
    }
  }
  return { success: true, data: { nodes, edges } };
}
async function resolveNodeLabel(type, id, userId) {
  if (type === "blog") {
    const rows = await dbAll("SELECT title FROM blogs WHERE id = ? AND user_id = ?", [id, userId]);
    return rows[0]?.title ?? `Blog #${id}`;
  }
  if (type === "knowledge") {
    const rows = await dbAll("SELECT filename FROM knowledge_files WHERE id = ? AND user_id = ?", [id, userId]);
    return rows[0]?.filename ?? `File #${id}`;
  }
  if (type === "note") {
    const rows = await dbAll("SELECT title FROM notes WHERE id = ? AND user_id = ?", [id, userId]);
    return rows[0]?.title ?? `Note #${id}`;
  }
  return `${type} #${id}`;
}
async function getTagEdgesForNode(srcType, srcId, userId) {
  if (srcType === "blog") {
    return dbAll(
      "SELECT t.id as tagId, t.name FROM tags t JOIN blog_tags bt ON bt.tag_id = t.id WHERE bt.blog_id = ? AND t.user_id = ?",
      [srcId, userId]
    );
  }
  if (srcType === "knowledge") {
    return dbAll(
      "SELECT t.id as tagId, t.name FROM tags t JOIN knowledge_file_tags kft ON kft.tag_id = t.id WHERE kft.file_id = ? AND t.user_id = ?",
      [srcId, userId]
    );
  }
  return [];
}
function buildKnowledgeSelect(id) {
  return { sql: "SELECT * FROM knowledge_files WHERE id = ?", params: [id] };
}
function buildKnowledgeCreate(userId, filename, filePath, fileType, fileSize, contentText) {
  const now = nowMySQL();
  return {
    sql: "INSERT INTO knowledge_files (user_id, filename, file_path, file_type, file_size, content_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    params: [userId, filename, filePath, fileType, fileSize, contentText, now, now]
  };
}
function buildKnowledgeDelete(id, userId) {
  const now = nowMySQL();
  return {
    sql: "UPDATE knowledge_files SET status = 'trash', updated_at = ? WHERE id = ? AND user_id = ?",
    params: [now, id, userId]
  };
}
function buildKnowledgeRestore(id, userId) {
  const now = nowMySQL();
  return {
    sql: "UPDATE knowledge_files SET status = 'active', updated_at = ? WHERE id = ? AND user_id = ?",
    params: [now, id, userId]
  };
}
function buildKnowledgeRename(id, userId, filename, filePath) {
  const now = nowMySQL();
  return {
    sql: "UPDATE knowledge_files SET filename = ?, file_path = ?, updated_at = ? WHERE id = ? AND user_id = ?",
    params: [filename, filePath, now, id, userId]
  };
}
function buildKnowledgeTagsSelect(fileId) {
  return {
    sql: "SELECT t.id, t.user_id, t.name FROM tags t JOIN knowledge_file_tags kft ON kft.tag_id = t.id WHERE kft.file_id = ?",
    params: [fileId]
  };
}
function buildKnowledgeTagsDelete(fileId) {
  return { sql: "DELETE FROM knowledge_file_tags WHERE file_id = ?", params: [fileId] };
}
function mapKnowledgeRow(f) {
  const props = f.properties;
  let parsedProps;
  if (props) {
    try {
      parsedProps = JSON.parse(props);
    } catch {
    }
  }
  return {
    id: f.id,
    userId: f.user_id,
    filename: f.filename,
    filePath: f.file_path,
    fileType: f.file_type,
    fileSize: f.file_size,
    status: f.status,
    folderId: f.folder_id,
    properties: parsedProps,
    createdAt: f.created_at,
    updatedAt: f.updated_at
  };
}
function buildKnowledgeSelectTrash(id) {
  return { sql: "SELECT * FROM knowledge_files WHERE id = ? AND status = ?", params: [id, "trash"] };
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
      const fileType = KnowledgeService.detectFileType(ext);
      const stat = fs.statSync(srcPath);
      const MAX_FILE_SIZE = 50 * 1024 * 1024;
      if (stat.size > MAX_FILE_SIZE) {
        console.warn(`[Knowledge] Skipping large file (${(stat.size / 1024 / 1024).toFixed(1)}MB): ${originalName}`);
        continue;
      }
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
      const { sql: insertSql, params: insertParams } = buildKnowledgeCreate(
        userId,
        path.basename(destPath),
        destPath,
        fileType,
        stat.size,
        contentText
      );
      await dbRun(insertSql, insertParams);
      const row = await dbGet(
        "SELECT * FROM knowledge_files WHERE user_id = ? AND filename = ? AND file_type = ? ORDER BY id DESC LIMIT 1",
        [userId, path.basename(destPath), fileType]
      );
      if (row) imported.push(KnowledgeService.rowToFile(row));
    }
    return imported;
  }
  static async listFiles(f) {
    const { getSharedKnowledgeList } = await Promise.resolve().then(() => require("./knowledge-list-D4GBU3Vw.js"));
    return getSharedKnowledgeList(
      (sql, params) => dbAll(sql, params),
      (sql, params) => dbGet(sql, params),
      f
    );
  }
  static async getFile(fileId, userId) {
    const { sql, params } = userId ? buildKnowledgeSelectByUser(fileId, userId) : buildKnowledgeSelect(fileId);
    const row = await dbGet(sql, params);
    if (!row) return null;
    return { ...KnowledgeService.rowToFile(row), tags: await KnowledgeService.getFileTags(fileId) };
  }
  static async deleteFile(userId, fileId, dpf) {
    const { sql, params } = buildKnowledgeSelect(fileId);
    const row = await dbGet(sql, params);
    if (!row) throw new Error("文件不存在");
    const { sql: delSql, params: delParams } = buildKnowledgeDelete(fileId, userId);
    await dbRun(delSql, delParams);
    const { sql: recycleSql, params: recycleParams } = buildRecycleInsert(row.user_id, "knowledge_file", fileId);
    await dbRun(recycleSql, recycleParams);
    if (dpf && fs.existsSync(row.file_path)) fs.unlinkSync(row.file_path);
  }
  static async restoreFile(userId, fileId) {
    const { sql, params } = buildKnowledgeSelectTrash(fileId);
    const row = await dbGet(sql, params);
    if (!row) throw new Error("文件不在回收站中");
    const { sql: restoreSql, params: restoreParams } = buildKnowledgeRestore(fileId, userId);
    await dbRun(restoreSql, restoreParams);
    const { sql: recycleSql, params: recycleParams } = buildRecycleDelete("knowledge_file", fileId, userId);
    await dbRun(recycleSql, recycleParams);
  }
  static validateFilename(name) {
    const sanitized = path.basename(name);
    if (!sanitized || sanitized === "." || sanitized === "..") throw new Error("Invalid filename");
    if (sanitized.includes("\0")) throw new Error("Invalid filename");
    return sanitized;
  }
  static async renameFile(userId, fileId, nf) {
    const { sql, params } = buildKnowledgeSelect(fileId);
    const row = await dbGet(sql, params);
    if (!row) throw new Error("文件不存在");
    if (!nf.trim()) throw new Error("文件名不能为空");
    const safeName = KnowledgeService.validateFilename(nf);
    const np = path.join(path.dirname(row.file_path), safeName);
    if (fs.existsSync(row.file_path)) fs.renameSync(row.file_path, np);
    const { sql: renameSql, params: renameParams } = buildKnowledgeRename(fileId, userId, nf, np);
    await dbRun(renameSql, renameParams);
  }
  static async getFileTags(fileId) {
    const { sql, params } = buildKnowledgeTagsSelect(fileId);
    return dbAll(sql, params);
  }
  static async setFileTags(fileId, tagIds) {
    const { sql, params } = buildKnowledgeTagsDelete(fileId);
    await dbRun(sql, params);
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
      folderId: row.folder_id ?? void 0,
      properties: (() => {
        if (row.properties) {
          try {
            return JSON.parse(row.properties);
          } catch {
          }
        }
        return void 0;
      })(),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
const knowledge_service = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  KnowledgeService
}, Symbol.toStringTag, { value: "Module" }));
async function withTimeout(promise, ms, label) {
  const timeout = new Promise(
    (_, reject) => setTimeout(() => reject(new Error(`${label} 解析超时 (${ms / 1e3}s)`)), ms)
  );
  try {
    return await Promise.race([promise, timeout]);
  } catch (err) {
    return { error: err.message };
  }
}
class PreviewService {
  /** Generate an HTML preview for a knowledge base file */
  static async generatePreview(fileId, userId) {
    const row = await dbGet(
      userId ? "SELECT * FROM knowledge_files WHERE id = ? AND user_id = ?" : "SELECT * FROM knowledge_files WHERE id = ?",
      userId ? [fileId, userId] : [fileId]
    );
    if (!row) return { error: "文件不存在" };
    const filePath = row.file_path;
    if (!fs.existsSync(filePath)) return { error: "文件不存在于磁盘" };
    const ext = path.extname(row.filename || filePath).toLowerCase();
    try {
      switch (ext) {
        case ".docx":
        case ".doc":
          return await withTimeout(PreviewService.previewDocx(filePath), 3e4, "DOCX");
        case ".xlsx":
        case ".xls":
          return await withTimeout(PreviewService.previewXlsx(filePath), 3e4, "XLSX");
        case ".csv":
          return PreviewService.previewCsv(filePath);
        case ".pdf":
          return await withTimeout(PreviewService.previewPdf(filePath), 3e4, "PDF");
        case ".txt":
          return PreviewService.previewText(filePath);
        case ".md":
          return await PreviewService.previewMarkdown(filePath);
        case ".png":
        case ".jpg":
        case ".jpeg":
        case ".gif":
        case ".webp":
        case ".svg":
        case ".bmp":
          return PreviewService.previewImage(filePath);
        case ".mp4":
        case ".webm":
        case ".mov":
          return PreviewService.previewMedia(filePath, "video");
        case ".mp3":
        case ".wav":
        case ".ogg":
          return PreviewService.previewMedia(filePath, "audio");
        case ".pptx":
        case ".ppt":
          return { error: 'PPT 预览暂不支持，请点击"外部打开"使用系统程序查看', fileType: ext };
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
  // ---- Shared interactive table helpers (T2112) ----
  static escHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  /** Reusable sort+filter JS for XLSX/CSV table previews */
  static sortFilterJS() {
    return `
      function filterTable(tableId, query) {
        const rows = document.getElementById(tableId).querySelectorAll('tbody tr');
        const q = query.toLowerCase();
        rows.forEach(r => { r.style.display = q ? (r.textContent.toLowerCase().includes(q) ? '' : 'none') : ''; });
      }
      function sortTable(tableId, colIdx) {
        const table = document.getElementById(tableId);
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const arrows = table.querySelectorAll('.sort-arrow');
        arrows.forEach(a => a.textContent = '');
        const arrow = table.querySelectorAll('th')[colIdx].querySelector('.sort-arrow');
        const asc = table.dataset.sortDir !== 'asc';
        rows.sort((a, b) => {
          const va = a.children[colIdx]?.textContent || '';
          const vb = b.children[colIdx]?.textContent || '';
          const na = parseFloat(va), nb = parseFloat(vb);
          if (!isNaN(na) && !isNaN(nb)) return asc ? na - nb : nb - na;
          return asc ? va.localeCompare(vb, 'zh-CN') : vb.localeCompare(va, 'zh-CN');
        });
        rows.forEach(r => tbody.appendChild(r));
        arrow.textContent = asc ? ' ▲' : ' ▼';
        table.dataset.sortDir = asc ? 'asc' : 'desc';
      }`;
  }
  // ---- Internal converters ----
  static async previewDocx(filePath) {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.convertToHtml({
      buffer,
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "r[style-name='Strong'] => strong",
        "r[style-name='Emphasis'] => em"
      ]
    });
    const sanitized = result.value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/\son\w+\s*=\s*"[^"]*"/gi, "").replace(/\son\w+\s*=\s*'[^']*'/gi, "").replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
    return {
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: "Microsoft YaHei", sans-serif; padding: 24px; line-height: 1.9; max-width: 820px; margin: 0 auto; color: #2c2c2c; }
        h1 { font-size: 26px; color: #1a3a5c; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 28px; }
        h2 { font-size: 20px; color: #1f4e79; margin-top: 22px; }
        h3 { font-size: 17px; color: #2c5f8a; margin-top: 18px; }
        p { margin: 10px 0; }
        table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 13px; }
        td,th { border: 1px solid #d0d0d0; padding: 8px 12px; text-align: left; }
        th { background: #f0f4f8; font-weight: 600; }
        img { max-width: 100%; height: auto; border-radius: 4px; margin: 12px 0; }
        blockquote { border-left: 3px solid #1f4e79; padding: 4px 16px; margin: 16px 0; color: #555; background: #f8fafc; }
        ul,ol { padding-left: 24px; } li { margin: 4px 0; }
      </style></head><body>${sanitized}</body></html>`
    };
  }
  static async previewXlsx(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheetTabs = [];
    const sheetContents = [];
    workbook.worksheets.forEach((sheet, idx) => {
      const sheetId = `sheet-${idx}`;
      const safeName = PreviewService.escHtml(sheet.name);
      sheetTabs.push(
        `<button class="sheet-tab${idx === 0 ? " active" : ""}" onclick="switchSheet('${sheetId}', this)">${safeName}</button>`
      );
      let tableHtml = `<div class="sheet-content" id="${sheetId}" style="display:${idx === 0 ? "block" : "none"}">`;
      tableHtml += `<div class="sheet-search"><input type="text" placeholder="过滤 ${safeName}..." oninput="filterTable('${sheetId}-table', this.value)" /></div>`;
      tableHtml += `<div class="table-wrap"><table id="${sheetId}-table"><thead><tr>`;
      const firstRow = sheet.getRow(1);
      firstRow.eachCell((cell) => {
        const val = PreviewService.escHtml(cell.value?.toString() || "");
        tableHtml += `<th onclick="sortTable('${sheetId}-table', this.cellIndex)">${val} <span class="sort-arrow"></span></th>`;
      });
      tableHtml += "</tr></thead><tbody>";
      sheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        tableHtml += "<tr>";
        row.eachCell((cell) => {
          const val = PreviewService.escHtml(cell.value?.toString() || "");
          tableHtml += `<td>${val || "&nbsp;"}</td>`;
        });
        tableHtml += "</tr>";
      });
      tableHtml += "</tbody></table></div></div>";
      sheetContents.push(tableHtml);
    });
    const sheetSwitchJS = `
      function switchSheet(id, btn) {
        document.querySelectorAll('.sheet-content').forEach(s => s.style.display = 'none');
        document.querySelectorAll('.sheet-tab').forEach(b => b.classList.remove('active'));
        document.getElementById(id).style.display = 'block';
        btn.classList.add('active');
      }`;
    return {
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: "Microsoft YaHei", sans-serif; padding: 16px; color: #333; background: #fafafa; }
        .sheet-tabs { display: flex; gap: 2px; margin-bottom: 12px; flex-wrap: wrap; }
        .sheet-tab { padding: 6px 16px; border: 1px solid #d0d0d0; border-bottom: none; border-radius: 6px 6px 0 0; background: #eee; cursor: pointer; font-size: 13px; transition: background 0.15s; }
        .sheet-tab.active { background: #fff; font-weight: 600; color: #1f4e79; }
        .sheet-tab:hover { background: #e0e0e0; }
        .sheet-search { margin-bottom: 8px; }
        .sheet-search input { width: 100%; max-width: 300px; padding: 6px 10px; border: 1px solid #d0d0d0; border-radius: 4px; font-size: 13px; outline: none; }
        .sheet-search input:focus { border-color: #1f4e79; }
        .table-wrap { overflow-x: auto; border-radius: 6px; border: 1px solid #e0e0e0; }
        table { border-collapse: collapse; width: 100%; font-size: 13px; background: #fff; }
        th { background: #f0f4f8; font-weight: 600; padding: 8px 12px; border-bottom: 2px solid #d0d0d0; cursor: pointer; white-space: nowrap; user-select: none; }
        th:hover { background: #e0e8f0; }
        td { padding: 6px 12px; border-bottom: 1px solid #f0f0f0; }
        tr:nth-child(even) td { background: #fafbfc; }
        tr:hover td { background: #f0f4f8; }
        .sort-arrow { font-size: 10px; color: #999; }
      </style></head><body>
        <div class="sheet-tabs">${sheetTabs.join("")}</div>
        ${sheetContents.join("")}
        <script>${sheetSwitchJS}${PreviewService.sortFilterJS()}<\/script>
      </body></html>`
    };
  }
  /** T2112: CSV preview with sortable/filterable table (reuses XLSX table UI) */
  static previewCsv(filePath) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const lines = raw.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return { html: "<p>CSV 文件为空</p>" };
    const rows = lines.map((line) => {
      const cells = [];
      let current = "";
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') {
          inQuotes = !inQuotes;
          continue;
        }
        if (ch === "," && !inQuotes) {
          cells.push(current);
          current = "";
          continue;
        }
        current += ch;
      }
      cells.push(current);
      return cells;
    });
    if (rows.length === 0) return { html: "<p>CSV 解析失败</p>" };
    const maxCols = Math.min(Math.max(...rows.map((r) => r.length)), 50);
    const maxRows = Math.min(rows.length, 200);
    const moreRows = rows.length > 200 ? `<p class="more">显示前 200 行 (共 ${rows.length} 行)</p>` : "";
    let tableHtml = "<table><thead><tr>";
    for (let c = 0; c < maxCols; c++) {
      const headerVal = PreviewService.escHtml(rows[0]?.[c] || `列${c + 1}`);
      tableHtml += `<th onclick="sortTable('csvTable', ${c})">${headerVal}<span class="sort-arrow"></span></th>`;
    }
    tableHtml += "</tr></thead><tbody>";
    for (let r = 1; r < maxRows; r++) {
      tableHtml += "<tr>";
      for (let c = 0; c < maxCols; c++) {
        const val = (rows[r]?.[c] || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        tableHtml += `<td>${val || "&nbsp;"}</td>`;
      }
      tableHtml += "</tr>";
    }
    tableHtml += "</tbody></table>";
    return {
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: "Microsoft YaHei", sans-serif; padding: 16px; color: #333; }
        .search-bar { margin-bottom: 12px; }
        .search-bar input { width: 100%; max-width: 300px; padding: 6px 10px; border: 1px solid #d0d0d0; border-radius: 4px; font-size: 13px; outline: none; }
        .search-bar input:focus { border-color: #1f4e79; }
        .table-wrap { overflow-x: auto; border-radius: 6px; border: 1px solid #e0e0e0; }
        table { border-collapse: collapse; width: 100%; font-size: 13px; background: #fff; }
        th { background: #f0f4f8; font-weight: 600; padding: 8px 12px; border-bottom: 2px solid #d0d0d0; cursor: pointer; white-space: nowrap; user-select: none; }
        th:hover { background: #e0e8f0; }
        td { padding: 6px 12px; border-bottom: 1px solid #f0f0f0; white-space: nowrap; }
        tr:nth-child(even) td { background: #fafbfc; }
        tr:hover td { background: #f0f4f8; }
        .sort-arrow { font-size: 10px; color: #999; }
        .more { color: #999; font-style: italic; margin-top: 12px; }
      </style></head><body>
        <div class="search-bar"><input type="text" placeholder="过滤行..." oninput="filterTable('csvTable', this.value)" /></div>
        <div class="table-wrap">${tableHtml}</div>
        ${moreRows}
        <script>${PreviewService.sortFilterJS()}<\/script>
      </body></html>`
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
            textHtml += `${PreviewService.escHtml(item.str)} `;
          }
        }
        pages.push(
          `<div class="pdf-page"><div class="page-num">第 ${i}/${totalPages} 页</div><p class="pdf-text">${textHtml}</p></div>`
        );
      }
      const morePages = totalPages > 5 ? `<p class="more" id="moreHint">仅显示前 5 页 (共 ${totalPages} 页)。使用系统程序打开查看完整内容。</p>` : "";
      return {
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
          body { font-family: "Microsoft YaHei", sans-serif; padding: 16px; color: #333; background: #fafafa; }
          .search-bar { margin-bottom: 16px; display: flex; gap: 8px; align-items: center; }
          .search-bar input { flex: 1; max-width: 400px; padding: 6px 10px; border: 1px solid #d0d0d0; border-radius: 4px; font-size: 13px; outline: none; }
          .search-bar input:focus { border-color: #1f4e79; }
          .search-bar .count { font-size: 12px; color: #999; }
          .pdf-page { margin-bottom: 16px; padding: 14px; border: 1px solid #e0e0e0; border-radius: 6px; background: #fff; }
          .page-num { font-size: 12px; color: #999; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 6px; font-weight: 600; }
          .pdf-text { line-height: 1.9; white-space: pre-wrap; font-size: 14px; }
          .pdf-text mark { background: #fff3b0; padding: 0 2px; border-radius: 2px; }
          .more { color: #999; font-style: italic; margin-top: 12px; }
          .no-match { color: #999; text-align: center; padding: 20px; }
        </style></head><body>
          <div class="search-bar"><input type="text" id="searchInput" placeholder="搜索 PDF 文本... (前5页)" oninput="searchPdf(this.value)" /><span class="count" id="matchCount"></span></div>
          ${pages.join("")}${morePages}
          <script>
            function searchPdf(query) {
              const q = query.toLowerCase().trim();
              const pages = document.querySelectorAll('.pdf-text');
              let total = 0;
              pages.forEach(p => {
                const orig = p.dataset.orig || p.textContent;
                if (!p.dataset.orig) p.dataset.orig = orig;
                if (!q) { p.innerHTML = orig; return; }
                const idx = orig.toLowerCase().indexOf(q);
                if (idx === -1) { p.innerHTML = orig; return; }
                let html = '';
                let last = 0;
                let haystack = orig.toLowerCase();
                let pos = haystack.indexOf(q);
                while (pos !== -1) {
                  total++;
                  html += orig.slice(last, pos).replace(/</g,'&lt;').replace(/>/g,'&gt;') + '<mark>' + orig.slice(pos, pos + q.length).replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</mark>';
                  last = pos + q.length;
                  pos = haystack.indexOf(q, last);
                }
                html += orig.slice(last).replace(/</g,'&lt;').replace(/>/g,'&gt;');
                p.innerHTML = html;
              });
              document.getElementById('matchCount').textContent = q ? (total + ' 处匹配') : '';
            }
          <\/script>
        </body></html>`
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
  static async previewMarkdown(filePath) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const MarkdownIt = (await import("markdown-it")).default;
    const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
    const bodyHtml = md.render(raw);
    return {
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: "Microsoft YaHei", sans-serif; padding: 20px; line-height: 1.8; max-width: 800px; margin: 0 auto; color: #333; }
        h1,h2,h3 { color: #1f4e79; }
        pre { background: #f4f4f4; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 13px; }
        code { font-family: "Consolas", "Courier New", monospace; font-size: 13px; }
        table { border-collapse: collapse; width: 100%; }
        td,th { border: 1px solid #ddd; padding: 8px; }
        img { max-width: 100%; }
        blockquote { border-left: 3px solid #ccc; margin-left: 0; padding-left: 16px; color: #666; }
      </style></head><body>${bodyHtml}</body></html>`
    };
  }
  static previewMedia(filePath, type) {
    const encodedPath = filePath.replace(/\\/g, "/");
    const tag = type === "video" ? "video" : "audio";
    return {
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #000; }
        ${tag} { max-width: 100%; max-height: 100vh; outline: none; }
      </style></head><body><${tag} src="file:///${encodedPath}" controls autoplay style="max-width:100%;max-height:100vh">
        您的浏览器不支持此媒体格式
      </${tag}></body></html>`
    };
  }
  /** Check if file is large — export for renderer to decide on loading UX */
  static getFileSize(filePath) {
    try {
      return fs.statSync(filePath).size;
    } catch {
      return 0;
    }
  }
}
let kbRefreshTarget = null;
function setKbRefreshTarget(wc) {
  kbRefreshTarget = wc;
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
  electron.ipcMain.handle(IPC.KB_GET, async (_event, data) => {
    try {
      const f = await KnowledgeService.getFile(data.fileId, data.userId);
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
        for (const f of files) {
          try {
            const row = await dbGet("SELECT content_text FROM knowledge_files WHERE id = ?", [f.id]);
            if (row?.content_text) await syncWikilinkRefs("knowledge", f.id, row.content_text, data.userId);
          } catch {
          }
        }
        kbRefreshTarget?.send(IPC.EVT_KB_REFRESH);
        return { success: true, data: files };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  );
  electron.ipcMain.handle(IPC.KB_DELETE, async (_event, data) => {
    try {
      await KnowledgeService.deleteFile(data.userId, data.fileId, data.deletePhysicalFile);
      kbRefreshTarget?.send(IPC.EVT_KB_REFRESH);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.KB_RESTORE, async (_event, data) => {
    try {
      await KnowledgeService.restoreFile(data.userId, data.fileId);
      kbRefreshTarget?.send(IPC.EVT_KB_REFRESH);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.KB_RENAME, async (_event, data) => {
    try {
      await KnowledgeService.renameFile(data.userId, data.fileId, data.newFilename);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.KB_PREVIEW, async (_event, data) => {
    try {
      return await PreviewService.generatePreview(data.fileId, data.userId);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.KB_OPEN_EXTERNAL, async (_event, data) => {
    try {
      const f = await KnowledgeService.getFile(data.fileId, data.userId);
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
  electron.ipcMain.handle(IPC.KB_BATCH_DELETE, async (_event, data) => {
    try {
      for (const id of data.fileIds) await KnowledgeService.deleteFile(data.userId, id, false);
      kbRefreshTarget?.send(IPC.EVT_KB_REFRESH);
      return { success: true, data: { deleted: data.fileIds.length } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.KB_SET_PROPERTIES, async (_event, data) => {
    try {
      const json = JSON.stringify(data.properties);
      await dbRun('UPDATE knowledge_files SET properties = ?, updated_at = datetime("now") WHERE id = ? AND user_id = ?', [
        json,
        data.fileId,
        data.userId
      ]);
      kbRefreshTarget?.send(IPC.EVT_KB_REFRESH);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.KB_UPDATE_CONTENT, async (_event, data) => {
    try {
      const file = await dbGet(
        "SELECT file_path, user_id, file_type FROM knowledge_files WHERE id = ? AND user_id = ?",
        [data.fileId, data.userId]
      );
      if (!file) return { success: false, error: "文件不存在或无权访问" };
      const workspace = await getWorkspacePath(data.userId);
      const resolved = path.resolve(workspace, file.file_path);
      const realWorkspace = fs.existsSync(workspace) ? fs.realpathSync(workspace) : workspace;
      if (!resolved.startsWith(realWorkspace + path.sep) && resolved !== realWorkspace) {
        return { success: false, error: "路径验证失败" };
      }
      await fs.promises.mkdir(path.dirname(resolved), { recursive: true });
      await fs.promises.writeFile(resolved, data.content, "utf-8");
      const now = nowMySQL();
      await dbRun("UPDATE knowledge_files SET content_text = ?, updated_at = ? WHERE id = ? AND user_id = ?", [
        data.content,
        now,
        data.fileId,
        data.userId
      ]);
      kbRefreshTarget?.send(IPC.EVT_KB_REFRESH);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
const VALID_MEMO_TYPES = ["note", "schedule", "todo", "daily"];
function rowToNote(r) {
  return {
    id: r.id,
    userId: r.user_id,
    content: r.content,
    pinned: r.pinned !== 0,
    source: r.source,
    title: r.title,
    memoType: r.memo_type,
    dueDate: r.due_date ?? void 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}
class NoteService {
  static async listNotes(userId, memoType, dueDateFrom, dueDateTo) {
    let sql = "SELECT * FROM notes WHERE user_id = ?";
    const params = [userId];
    if (memoType) {
      sql += " AND memo_type = ?";
      params.push(memoType);
    }
    if (dueDateFrom) {
      sql += " AND due_date >= ?";
      params.push(dueDateFrom);
    }
    if (dueDateTo) {
      sql += " AND due_date <= ?";
      params.push(dueDateTo);
    }
    sql += " ORDER BY pinned DESC, updated_at DESC";
    const rows = await dbAll(sql, params);
    return rows.map(rowToNote);
  }
  static async createNote(userId, content, source = "manual", title = "", memoType = "note", dueDate) {
    if (!VALID_MEMO_TYPES.includes(memoType)) {
      throw new Error(`Invalid memoType: ${memoType}`);
    }
    if (memoType === "daily" && dueDate) {
      const existing = await dbGet(
        "SELECT * FROM notes WHERE user_id = ? AND memo_type = ? AND due_date = ? LIMIT 1",
        [userId, "daily", dueDate]
      );
      if (existing) return rowToNote(existing);
    }
    const now = nowMySQL();
    await dbRun(
      "INSERT INTO notes (user_id, content, source, title, memo_type, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, content, source, title, memoType, dueDate || null, now, now]
    );
    const row = await dbGet(
      "SELECT * FROM notes WHERE user_id = ? ORDER BY id DESC LIMIT 1",
      [userId]
    );
    if (!row) throw new Error("创建便签失败");
    return rowToNote(row);
  }
  static async updateNote(noteId, userId, data) {
    const now = nowMySQL();
    const sets = [];
    const params = [];
    if (data.title !== void 0) {
      sets.push("title = ?");
      params.push(data.title);
    }
    if (data.content !== void 0) {
      sets.push("content = ?");
      params.push(data.content);
    }
    if (data.memoType !== void 0) {
      sets.push("memo_type = ?");
      params.push(data.memoType);
    }
    if (data.dueDate !== void 0) {
      sets.push("due_date = ?");
      params.push(data.dueDate);
    }
    sets.push("updated_at = ?");
    params.push(now);
    params.push(noteId);
    params.push(userId);
    await dbRun(`UPDATE notes SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`, params);
    const row = await dbGet("SELECT * FROM notes WHERE id = ? AND user_id = ?", [noteId, userId]);
    if (!row) throw new Error("便签不存在");
    return rowToNote(row);
  }
  static async deleteNote(userId, noteId) {
    await dbRun("DELETE FROM notes WHERE id = ? AND user_id = ?", [noteId, userId]);
  }
  static async togglePin(userId, noteId) {
    const row = await dbGet("SELECT * FROM notes WHERE id = ? AND user_id = ?", [noteId, userId]);
    if (!row) return null;
    await dbRun("UPDATE notes SET pinned = ?, updated_at = ? WHERE id = ? AND user_id = ?", [row.pinned ? 0 : 1, nowMySQL(), noteId, userId]);
    const updated = await dbGet("SELECT * FROM notes WHERE id = ? AND user_id = ?", [noteId, userId]);
    return updated ? rowToNote(updated) : null;
  }
  /** Clean notes older than 24h (unpinned only). Returns number of deleted notes. */
  static async cleanOldNotes() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1e3);
    const cutoffStr = cutoff.toISOString().replace("T", " ").slice(0, 19);
    const before = await dbGet("SELECT COUNT(*) as c FROM notes WHERE pinned = 0 AND created_at < ?", [cutoffStr]);
    await dbRun("DELETE FROM notes WHERE pinned = 0 AND created_at < ?", [cutoffStr]);
    return before?.c ?? 0;
  }
}
const note_service = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  NoteService
}, Symbol.toStringTag, { value: "Module" }));
let noteRefreshTarget = null;
function setNoteRefreshTarget(wc) {
  noteRefreshTarget = wc;
}
function broadcastRefresh() {
  noteRefreshTarget?.send(IPC.EVT_NOTE_REFRESH);
}
function registerNoteHandlers() {
  electron.ipcMain.handle(IPC.NOTE_LIST, async (_event, userId, memoType, dueDateFrom, dueDateTo) => {
    try {
      const notes = await NoteService.listNotes(userId, memoType, dueDateFrom, dueDateTo);
      return { success: true, data: notes };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.NOTE_CREATE, async (_event, data) => {
    try {
      if (data.noteId) {
        const note2 = await NoteService.updateNote(data.noteId, data.userId, {
          title: data.title,
          content: data.content,
          memoType: data.memoType,
          dueDate: data.dueDate
        });
        if (data.content) await syncWikilinkRefs("note", note2.id, data.content, data.userId);
        broadcastRefresh();
        return { success: true, data: note2 };
      }
      const note = await NoteService.createNote(
        data.userId,
        data.content,
        data.source || "manual",
        data.title || "",
        data.memoType || "note",
        data.dueDate
      );
      if (data.content) await syncWikilinkRefs("note", note.id, data.content, data.userId);
      broadcastRefresh();
      return { success: true, data: note };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.NOTE_DELETE, async (_event, data) => {
    try {
      await NoteService.deleteNote(data.userId, data.noteId);
      broadcastRefresh();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.NOTE_PIN, async (_event, data) => {
    try {
      const note = await NoteService.togglePin(data.userId, data.noteId);
      broadcastRefresh();
      return note ? { success: true, data: note } : { success: false, error: "便签不存在" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.NOTE_CLIPBOARD, async () => {
    try {
      const text = electron.clipboard.readText();
      return { success: true, data: text };
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
    const now = nowMySQL();
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
const VALID_REF_TYPES = ["blog", "knowledge", "note"];
class ReferenceService {
  static rowToReference(row, extra) {
    return {
      id: row.id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      targetType: row.target_type,
      targetId: row.target_id,
      createdAt: row.created_at,
      ...extra
    };
  }
  static async addRef(sourceType, sourceId, targetType, targetId) {
    if (!VALID_REF_TYPES.includes(sourceType) || !VALID_REF_TYPES.includes(targetType)) {
      throw new Error(`Invalid ref type: source=${sourceType}, target=${targetType}`);
    }
    const now = nowMySQL();
    await dbRun("INSERT OR IGNORE INTO refs (source_type, source_id, target_type, target_id, created_at) VALUES (?,?,?,?,?)", [
      sourceType,
      sourceId,
      targetType,
      targetId,
      now
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
        const targetTitle = await ReferenceService.resolveTitle(r.target_type, r.target_id);
        return ReferenceService.rowToReference(r, { targetTitle });
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
        const sourceTitle = await ReferenceService.resolveTitle(r.source_type, r.source_id);
        return ReferenceService.rowToReference(r, { sourceTitle });
      })
    );
  }
  /** Search items for reference picker + wikilink autocomplete */
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
    if (scope === "all" || scope === "note") {
      const notes = await dbAll(
        "SELECT id, title FROM notes WHERE user_id = ? AND (title LIKE ? OR content LIKE ?) LIMIT 10",
        [userId, like, like]
      );
      results.push(...notes.map((n) => ({ id: n.id, type: "note", title: n.title || "(便签)" })));
    }
    return results;
  }
  static async resolveTitle(type, id) {
    try {
      if (type === "blog") {
        const row = await dbAll("SELECT title FROM blogs WHERE id = ?", [id]);
        return row[0]?.title || "(已删除)";
      }
      if (type === "knowledge") {
        const row = await dbAll("SELECT filename as title FROM knowledge_files WHERE id = ?", [id]);
        return row[0]?.title || "(已删除)";
      }
      if (type === "note") {
        const row = await dbGet("SELECT title FROM notes WHERE id = ?", [id]);
        return row?.title || "(已删除)";
      }
      return "(已删除)";
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
const CONCURRENCY = 2;
const DELAY_MS = 500;
const TIMEOUT_MS = 15e3;
const MAX_PAGES = 50;
const TOC_SELECTORS = [
  // mdBook
  ".chapter-item a",
  ".chapter li a",
  // Docusaurus
  ".menu__link",
  ".menu__list-item a.menu__link",
  // VuePress
  ".sidebar-link",
  ".sidebar a.sidebar-link",
  // GitBook
  ".summary li a",
  ".book-summary li a",
  // MkDocs / Material for MkDocs
  ".md-nav__link",
  ".md-nav__item a",
  // Hugo (Docsy / Book / Learn themes)
  ".td-sidebar-nav a",
  ".book-menu a",
  ".docs-menu a",
  // Sphinx / Read the Docs
  ".toctree-l1 a",
  ".toctree-wrapper a",
  ".wy-menu-vertical a",
  // JupyterBook
  ".bd-toc-item a",
  ".toc-entry a",
  // Antora / Asciidoctor
  ".nav-list a",
  ".doc a",
  // Generic sidebar nav (last resort)
  "nav.sidebar a",
  "aside.sidebar a"
];
class ManualCollectorService {
  static turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
  /** Extract TOC from a documentation/manual page using linkedom */
  static async extractToc(url) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LocalBlogKB/0.2)", Accept: "text/html" }
      });
    } finally {
      clearTimeout(t);
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const { parseHTML } = await import("linkedom");
    const { document } = parseHTML(html);
    const base = new URL(url);
    let links = [];
    for (const sel of TOC_SELECTORS) {
      const nodes = document.querySelectorAll(sel);
      if (nodes.length >= 2) {
        links = Array.from(nodes).map((a) => {
          const el = a;
          const text = (el.textContent || "").trim();
          let href = el.getAttribute?.("href") || "";
          if (href && !href.startsWith("http")) {
            try {
              href = new URL(href, base).href;
            } catch {
            }
          }
          return { title: text, href };
        }).filter((l) => l.title && l.href && l.href.startsWith("http"));
        if (links.length >= 2) break;
      }
    }
    if (links.length < 2) return [];
    const seen = /* @__PURE__ */ new Set();
    const deduped = links.filter((l) => {
      const key = l.href;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return deduped.slice(0, MAX_PAGES).map((l) => {
      const pathSegments = new URL(l.href).pathname.replace(/\/$/, "").split("/").length - 1;
      const level = Math.min(3, Math.max(1, pathSegments));
      return { title: l.title, href: l.href, level };
    });
  }
  /** Batch collect manual pages into a blog series */
  static async batchCollect(targetWindow, userId, seriesName, entries) {
    const limited = entries.slice(0, MAX_PAGES);
    const results = [];
    const sendProgress = (p) => {
      if (targetWindow && !targetWindow.isDestroyed()) {
        targetWindow.webContents.send(IPC.EVT_MANUAL_COLLECT_PROGRESS, p);
      }
    };
    for (let i = 0; i < limited.length; i += CONCURRENCY) {
      const batch = limited.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map(async (entry, bi) => {
          const idx = i + bi;
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
          try {
            const response = await fetch(entry.href, {
              signal: controller.signal,
              headers: { "User-Agent": "Mozilla/5.0 (compatible; LocalBlogKB/0.2)", Accept: "text/html" }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const html = await response.text();
            const { parseHTML } = await import("linkedom");
            const { document } = parseHTML(html);
            const { Readability } = await import("@mozilla/readability");
            const reader = new Readability(document);
            const article = reader.parse();
            if (!article) throw new Error("无法提取正文");
            const md = ManualCollectorService.turndown.turndown(article.content);
            sendProgress({ done: idx + 1, total: limited.length, title: entry.title, status: "ok" });
            return { title: article.title || entry.title, content: md, ok: true };
          } catch {
            sendProgress({ done: idx + 1, total: limited.length, title: entry.title, status: "fail" });
            return { title: entry.title, content: "", ok: false };
          } finally {
            clearTimeout(t);
          }
        })
      );
      for (const r of batchResults) {
        if (r.status === "fulfilled") results.push(r.value);
        else results.push({ title: "unknown", ok: false });
      }
      if (i + CONCURRENCY < limited.length) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }
    const seriesId = `manual-${Date.now()}`;
    let firstBlogId = null;
    let succeeded = 0;
    let failed = 0;
    for (const r of results) {
      if (!r.ok || !r.content) {
        failed++;
        continue;
      }
      try {
        const blog = await BlogService.createBlog(userId, r.title, "md", r.content);
        await BlogService.setBlogSeries(userId, blog.id, seriesId, seriesName);
        if (!firstBlogId) firstBlogId = blog.id;
        succeeded++;
      } catch {
        failed++;
      }
    }
    return { seriesId, seriesName, total: limited.length, succeeded, failed };
  }
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
    const markdown = WebScraperService.turndown.turndown(article.content);
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
  electron.ipcMain.handle(IPC.SCRAPE_EXTRACT_TOC, async (_event, url) => {
    try {
      const toc = await ManualCollectorService.extractToc(url);
      return { success: true, data: toc };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(
    IPC.SCRAPE_COLLECT_MANUAL,
    async (_event, data) => {
      try {
        const win = electron.BrowserWindow.fromWebContents(_event.sender);
        const result = await ManualCollectorService.batchCollect(
          win,
          data.userId,
          data.seriesName,
          data.entries
        );
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  );
}
class SearchService {
  /**
   * Legacy: global search returning old SearchResult format (used by existing GlobalSearch).
   */
  static async globalSearch(userId, query) {
    const [blogs, knowledge] = await Promise.all([
      SearchService.searchBlogs(userId, query),
      SearchService.searchKnowledge(userId, query)
    ]);
    return { blogs, knowledge };
  }
  /**
   * Legacy: blog search returning old SearchResult format.
   */
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
  /**
   * Legacy: knowledge search returning old SearchResult format.
   */
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
  /**
   * Search all content using MySQL FULLTEXT (MySQL mode) or
   * return indexable documents for Worker-based search (sql.js mode).
   *
   * When MySQL: performs MATCH ... AGAINST queries on blogs and knowledge_files.
   * When sql.js: returns all active blogs + knowledge files for the Worker to index.
   */
  static async searchAll(query, userId) {
    if (isUsingMySQL()) {
      return SearchService.mysqlFulltextSearch(query, userId);
    }
    return null;
  }
  /**
   * MySQL FULLTEXT search using MATCH ... AGAINST in natural language mode.
   */
  static async mysqlFulltextSearch(query, userId) {
    const escaped = query.replace(/[+\-<>()~*"@]/g, " ").trim();
    if (!escaped) return [];
    const [blogs, knowledge] = await Promise.all([
      SearchService.mysqlSearchBlogs(escaped, userId),
      SearchService.mysqlSearchKnowledge(escaped, userId)
    ]);
    const merged = [...blogs, ...knowledge].sort((a, b) => b.score - a.score);
    return merged.slice(0, 20);
  }
  static async mysqlSearchBlogs(query, userId) {
    try {
      const rows = await dbAll(
        `SELECT id, title, SUBSTRING(content, 1, 200) as content,
                MATCH(title, content) AGAINST(? IN NATURAL LANGUAGE MODE) as score
         FROM blogs
         WHERE user_id = ? AND status = 'active'
           AND MATCH(title, content) AGAINST(? IN NATURAL LANGUAGE MODE)
         ORDER BY score DESC
         LIMIT 20`,
        [query, userId, query]
      );
      if (rows.length === 0 && SearchService.hasCjk(query)) {
        return SearchService.fallbackBlogSearch(query, userId);
      }
      return rows.map((row) => ({
        id: row.id,
        type: "blog",
        title: row.title,
        snippet: (row.content || "").slice(0, 200),
        score: Math.round((row.score || 0) * 1e3) / 1e3
      }));
    } catch (err) {
      console.warn("[SearchService] MySQL blog fulltext search failed, falling back to LIKE:", err.message);
      return SearchService.fallbackBlogSearch(query, userId);
    }
  }
  static async mysqlSearchKnowledge(query, userId) {
    try {
      const rows = await dbAll(
        `SELECT id, filename as title, SUBSTRING(content_text, 1, 200) as content_text,
                MATCH(filename, content_text) AGAINST(? IN NATURAL LANGUAGE MODE) as score
         FROM knowledge_files
         WHERE user_id = ? AND status = 'active'
           AND MATCH(filename, content_text) AGAINST(? IN NATURAL LANGUAGE MODE)
         ORDER BY score DESC
         LIMIT 20`,
        [query, userId, query]
      );
      if (rows.length === 0 && SearchService.hasCjk(query)) {
        return SearchService.fallbackKnowledgeSearch(query, userId);
      }
      return rows.map((row) => ({
        id: row.id,
        type: "knowledge",
        title: row.title,
        snippet: (row.content_text || "").slice(0, 200),
        score: Math.round((row.score || 0) * 1e3) / 1e3
      }));
    } catch (err) {
      console.warn("[SearchService] MySQL knowledge fulltext search failed, falling back to LIKE:", err.message);
      return SearchService.fallbackKnowledgeSearch(query, userId);
    }
  }
  static fallbackBlogSearch(query, userId) {
    const like = `%${query}%`;
    return dbAll(
      "SELECT id, title, SUBSTRING(content, 1, 200) as content FROM blogs WHERE user_id = ? AND status = 'active' AND (title LIKE ? OR content LIKE ?) LIMIT 20",
      [userId, like, like]
    ).then(
      (rows) => rows.map((r) => ({
        id: r.id,
        type: "blog",
        title: r.title,
        snippet: (r.content || "").slice(0, 200),
        score: 0
      }))
    );
  }
  static fallbackKnowledgeSearch(query, userId) {
    const like = `%${query}%`;
    return dbAll(
      "SELECT id, filename as title, SUBSTRING(content_text, 1, 200) as content_text FROM knowledge_files WHERE user_id = ? AND status = 'active' AND (filename LIKE ? OR content_text LIKE ?) LIMIT 20",
      [userId, like, like]
    ).then(
      (rows) => rows.map((r) => ({
        id: r.id,
        type: "knowledge",
        title: r.title,
        snippet: (r.content_text || "").slice(0, 200),
        score: 0
      }))
    );
  }
  /** Returns true if the string contains any CJK character */
  static hasCjk(s) {
    return /[一-鿿㐀-䶿豈-﫿]/.test(s);
  }
  /**
   * Get all indexable documents for the Worker to build its inverted index.
   * Used in sql.js mode.
   */
  static async getIndexableDocuments(userId) {
    const [blogs, knowledge] = await Promise.all([
      dbAll(
        "SELECT id, title, COALESCE(content, '') as content FROM blogs WHERE user_id = ? AND status = 'active'",
        [userId]
      ),
      dbAll(
        "SELECT id, filename, COALESCE(content_text, '') as content_text FROM knowledge_files WHERE user_id = ? AND status = 'active'",
        [userId]
      )
    ]);
    const docs = [
      ...blogs.map((b) => ({
        id: b.id,
        docType: "blog",
        title: b.title,
        content: b.content || ""
      })),
      ...knowledge.map((k) => ({
        id: k.id,
        docType: "knowledge",
        title: k.filename,
        content: k.content_text || ""
      }))
    ];
    return docs;
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
  electron.ipcMain.handle(IPC.SEARCH_QUERY, async (_event, data) => {
    try {
      const results = await SearchService.searchAll(data.query, data.userId);
      return { success: true, data: results };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.SEARCH_GET_DOCUMENTS, async (_event, data) => {
    try {
      const docs = await SearchService.getIndexableDocuments(data.userId);
      return { success: true, data: docs };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
const SHORTCUTS = [
  { id: "new-blog", key: "Ctrl+N", label: "新建博客", description: "打开博客编辑器", group: "global" },
  { id: "quick-note", key: "Alt+Space", label: "快捷便签", description: "打开快捷便签浮窗", group: "global" },
  { id: "sidebar-toggle", key: "Ctrl+B", label: "侧边栏", description: "折叠/展开侧边栏", group: "global" },
  { id: "help", key: "?", label: "快捷键帮助", description: "显示快捷键列表", group: "global" },
  { id: "md-float", key: "Ctrl+Shift+N", label: "MD 浮窗", description: "打开 Markdown 快捷写作浮窗", group: "global" },
  { id: "clipboard-note", key: "Ctrl+Shift+V", label: "剪贴板→便签", description: "将剪贴板内容保存为便签", group: "global" },
  { id: "bold", key: "Ctrl+B", label: "加粗", description: "编辑器中切换加粗格式", group: "editor" },
  { id: "italic", key: "Ctrl+I", label: "斜体", description: "编辑器中切换斜体格式", group: "editor" },
  { id: "undo", key: "Ctrl+Z", label: "撤销", description: "编辑器中撤销上一步操作", group: "editor" },
  { id: "redo", key: "Ctrl+Shift+Z", label: "重做", description: "编辑器中重做已撤销操作", group: "editor" }
];
let shortcutActions = {};
class ShortcutService {
  static setActions(actions) {
    shortcutActions = actions;
  }
  static filePath() {
    return path.join(electron.app.getPath("userData"), "shortcuts.json");
  }
  static load() {
    try {
      if (fs.existsSync(ShortcutService.filePath())) {
        const custom = JSON.parse(fs.readFileSync(ShortcutService.filePath(), "utf-8"));
        return SHORTCUTS.map((d) => {
          const over = custom.find((c) => c.id === d.id);
          return over ? { ...d, key: over.key } : d;
        });
      }
    } catch {
    }
    return [...SHORTCUTS];
  }
  static update(id, key) {
    const current = ShortcutService.load();
    const entry = current.find((s) => s.id === id);
    if (!entry) throw new Error(`Shortcut not found: ${id}`);
    entry.key = key;
    const overrides = current.filter((e) => SHORTCUTS.find((d) => d.id === e.id)?.key !== e.key);
    try {
      fs.writeFileSync(ShortcutService.filePath(), JSON.stringify(overrides, null, 2));
    } catch {
    }
  }
  static reset() {
    try {
      if (fs.existsSync(ShortcutService.filePath())) fs.unlinkSync(ShortcutService.filePath());
    } catch {
    }
  }
  /** Convert user-facing key (Ctrl+N) to Electron accelerator (CommandOrControl+N) */
  static toAccelerator(key) {
    return key.replace(/^Ctrl\+/, "CommandOrControl+");
  }
  /** Re-register all global shortcuts from saved config. Idempotent. */
  static reregisterAll() {
    electron.globalShortcut.unregisterAll();
    const shortcuts = ShortcutService.load();
    for (const s of shortcuts) {
      if (s.group !== "global") continue;
      const action = shortcutActions[s.id];
      if (!action) continue;
      try {
        electron.globalShortcut.register(ShortcutService.toAccelerator(s.key), action);
      } catch {
        console.error(`[ShortcutService] Failed to register shortcut: ${s.id} → ${s.key}`);
      }
    }
  }
}
function registerShortcutHandlers() {
  electron.ipcMain.handle(IPC.SHORTCUT_GET_ALL, async () => {
    try {
      return { success: true, data: ShortcutService.load() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.SHORTCUT_UPDATE, async (_event, id, keys) => {
    try {
      ShortcutService.update(id, keys);
      ShortcutService.reregisterAll();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.SHORTCUT_RESET, async () => {
    try {
      ShortcutService.reset();
      ShortcutService.reregisterAll();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
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
      await TagService.updateTag(data.userId, data.tagId, data.name, data.description);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.TAG_DELETE, async (_event, data) => {
    try {
      await TagService.deleteTag(data.userId, data.tagId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.TAG_MERGE, async (_event, data) => {
    try {
      const tags = await TagService.listTags(data.userId);
      const src = tags.find((t) => t.id === data.sourceId);
      const tgt = tags.find((t) => t.id === data.targetId);
      if (!src || !tgt) return { success: false, error: "标签不存在" };
      if (src.id === tgt.id) return { success: false, error: "不能合并相同标签" };
      await dbRun("BEGIN");
      try {
        await dbRun("UPDATE blog_tags SET tag_id = ? WHERE tag_id = ?", [data.targetId, data.sourceId]);
        await dbRun("DELETE FROM blog_tags WHERE tag_id = ?", [data.sourceId]);
        await dbRun("UPDATE knowledge_file_tags SET tag_id = ? WHERE tag_id = ?", [data.targetId, data.sourceId]);
        await dbRun("DELETE FROM knowledge_file_tags WHERE tag_id = ?", [data.sourceId]);
        await dbRun("DELETE FROM tags WHERE id = ? AND user_id = ?", [data.sourceId, data.userId]);
        await dbRun("COMMIT");
      } catch (innerErr) {
        await dbRun("ROLLBACK");
        throw innerErr;
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
function registerWhiteboardHandlers() {
  electron.ipcMain.handle(IPC.WHITEBOARD_GET, async (_event, userId) => {
    try {
      let wb = await dbGet(
        "SELECT * FROM whiteboards WHERE user_id = ? LIMIT 1",
        [userId]
      );
      if (!wb) {
        const now = nowMySQL();
        await dbRun(
          "INSERT INTO whiteboards (user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
          [userId, "我的白板", now, now]
        );
        wb = await dbGet(
          "SELECT * FROM whiteboards WHERE user_id = ? LIMIT 1",
          [userId]
        );
      }
      return { success: true, data: wb ? { id: wb.id, title: wb.title, description: wb.description || "", createdAt: wb.created_at, updatedAt: wb.updated_at } : null };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.WHITEBOARD_NODES, async (_event, data) => {
    try {
      const wb = await dbGet("SELECT id FROM whiteboards WHERE id = ? AND user_id = ?", [data.whiteboardId, data.userId]);
      if (!wb) return { success: false, error: "无权访问" };
      const rows = await dbAll("SELECT * FROM whiteboard_nodes WHERE whiteboard_id = ? AND user_id = ? ORDER BY created_at", [data.whiteboardId, data.userId]);
      return { success: true, data: rows.map(mapNode) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.WHITEBOARD_NODE_CREATE, async (_event, data) => {
    try {
      const wb = await dbGet("SELECT id FROM whiteboards WHERE id = ? AND user_id = ?", [data.whiteboardId, data.userId]);
      if (!wb) return { success: false, error: "无权访问" };
      const now = nowMySQL();
      await dbRun(
        "INSERT INTO whiteboard_nodes (whiteboard_id, user_id, node_type, title, x, y, color, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
        [data.whiteboardId, data.userId, data.nodeType, data.title, data.x, data.y, data.color || "blue", now, now]
      );
      const row = await dbGet("SELECT last_insert_rowid() as id");
      return { success: true, data: { id: row?.id ?? 0 } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.WHITEBOARD_NODE_UPDATE, async (_event, data) => {
    try {
      const node = await dbGet("SELECT id FROM whiteboard_nodes WHERE id = ? AND user_id = ?", [data.id, data.userId]);
      if (!node) return { success: false, error: "无权访问" };
      const now = nowMySQL();
      const sets = ["updated_at = ?"];
      const params = [now];
      if (data.title !== void 0) {
        sets.push("title = ?");
        params.push(data.title);
      }
      if (data.x !== void 0) {
        sets.push("x = ?");
        params.push(data.x);
      }
      if (data.y !== void 0) {
        sets.push("y = ?");
        params.push(data.y);
      }
      if (data.taskStatus !== void 0) {
        sets.push("task_status = ?");
        params.push(data.taskStatus);
      }
      if (data.color !== void 0) {
        sets.push("color = ?");
        params.push(data.color);
      }
      if (data.summary !== void 0) {
        sets.push("summary = ?");
        params.push(data.summary);
      }
      params.push(data.id);
      await dbRun(`UPDATE whiteboard_nodes SET ${sets.join(", ")} WHERE id = ?`, params);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.WHITEBOARD_NODE_DELETE, async (_event, data) => {
    try {
      const node = await dbGet("SELECT id FROM whiteboard_nodes WHERE id = ? AND user_id = ?", [data.nodeId, data.userId]);
      if (!node) return { success: false, error: "无权访问" };
      await dbRun("DELETE FROM whiteboard_nodes WHERE id = ?", [data.nodeId]);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.WHITEBOARD_EDGES, async (_event, data) => {
    try {
      const wb = await dbGet("SELECT id FROM whiteboards WHERE id = ? AND user_id = ?", [data.whiteboardId, data.userId]);
      if (!wb) return { success: false, error: "无权访问" };
      const rows = await dbAll("SELECT * FROM whiteboard_edges WHERE whiteboard_id = ?", [data.whiteboardId]);
      return { success: true, data: rows.map((r) => ({ id: r.id, sourceNodeId: r.source_node_id, targetNodeId: r.target_node_id, edgeType: r.edge_type, label: r.label || "" })) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.WHITEBOARD_EDGE_CREATE, async (_event, data) => {
    try {
      const wb = await dbGet("SELECT id FROM whiteboards WHERE id = ? AND user_id = ?", [data.whiteboardId, data.userId]);
      if (!wb) return { success: false, error: "无权访问" };
      const now = nowMySQL();
      await dbRun(
        "INSERT INTO whiteboard_edges (whiteboard_id, source_node_id, target_node_id, label, created_at) VALUES (?,?,?,?,?)",
        [data.whiteboardId, data.sourceNodeId, data.targetNodeId, data.label || "", now]
      );
      const row = await dbGet("SELECT last_insert_rowid() as id");
      return { success: true, data: { id: row?.id ?? 0 } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle(IPC.WHITEBOARD_EDGE_DELETE, async (_event, data) => {
    try {
      const wb = await dbGet("SELECT id FROM whiteboards WHERE id = ? AND user_id = ?", [data.whiteboardId, data.userId]);
      if (!wb) return { success: false, error: "无权访问" };
      await dbRun("DELETE FROM whiteboard_edges WHERE id = ?", [data.edgeId]);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
function mapNode(r) {
  return {
    id: r.id,
    whiteboardId: r.whiteboard_id,
    nodeType: r.node_type,
    refType: r.ref_type || null,
    refId: r.ref_id || null,
    title: r.title || "",
    summary: r.summary || "",
    color: r.color || "blue",
    taskStatus: r.task_status || "todo",
    x: r.x,
    y: r.y,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
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
  electron.ipcMain.handle(IPC.WORKSPACE_EXPORT_MD, async (_event, userId) => {
    try {
      const wsPath = await getWorkspacePath(userId);
      const exportDir = path.join(wsPath, "Export");
      await fs.promises.mkdir(exportDir, { recursive: true });
      const blogs = await dbAll(
        "SELECT id, title, content, format, created_at, updated_at FROM blogs WHERE user_id = ? AND status = ? ORDER BY updated_at DESC",
        [userId, "active"]
      );
      const kbs = await dbAll(
        "SELECT id, filename, file_type, file_path, created_at FROM knowledge_files WHERE user_id = ? AND status = ? ORDER BY created_at DESC",
        [userId, "active"]
      );
      let count = 0;
      for (const b of blogs) {
        const safeTitle = path.basename(b.title.replace(/[<>:"/\\|?*]/g, "_").substring(0, 80) || "untitled");
        const frontmatter = [
          "---",
          `title: "${b.title.replace(/"/g, '\\"')}"`,
          `date: ${b.created_at}`,
          `updated: ${b.updated_at}`,
          `format: ${b.format}`,
          "---",
          ""
        ].join("\n");
        let body = b.format === "html" ? `<!-- HTML format blog, content not converted -->

${b.content}` : b.content;
        body = body.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target, alias) => {
          const t = target.trim();
          const safeLink = t.replace(/[<>:"/\\|?*]/g, "_").substring(0, 80);
          return `> [${(alias || t).trim()}](${safeLink}.md)`;
        });
        body = body.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target, alias) => {
          const t = target.trim();
          const safeLink = t.replace(/[<>:"/\\|?*]/g, "_").substring(0, 80);
          return `[${(alias || t).trim()}](${safeLink}.md)`;
        });
        await fs.promises.writeFile(path.join(exportDir, `${safeTitle}.md`), frontmatter + body, "utf-8");
        count++;
      }
      const kbDir = path.join(exportDir, "knowledge");
      await fs.promises.mkdir(kbDir, { recursive: true });
      for (const k of kbs) {
        try {
          const safeRelPath = path.basename(k.file_path);
          const srcPath = path.resolve(wsPath, safeRelPath);
          const realWs = fs.existsSync(wsPath) ? fs.realpathSync(wsPath) : wsPath;
          if (!srcPath.startsWith(realWs + path.sep) && srcPath !== realWs) continue;
          if (fs.existsSync(srcPath)) {
            const safeName = path.basename(k.filename.replace(/[<>:"/\\|?*]/g, "_"));
            await fs.promises.copyFile(srcPath, path.join(kbDir, safeName));
          }
        } catch {
        }
      }
      let index2 = "# 知识库导出\n\n";
      index2 += `导出时间: ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 19)}
`;
      index2 += `博客: ${blogs.length} 篇 | 知识文件: ${kbs.length} 个

`;
      index2 += "## 博客列表\n\n";
      for (const b of blogs) {
        const safeTitle = path.basename(b.title.replace(/[<>:"/\\|?*]/g, "_").substring(0, 80) || "untitled");
        index2 += `- [${b.title}](${encodeURI(safeTitle)}.md) — ${b.created_at?.slice(0, 10) || ""}
`;
      }
      if (kbs.length > 0) {
        index2 += "\n## 知识文件\n\n";
        for (const k of kbs) {
          index2 += `- ${k.filename} (${k.file_type}) — ${k.created_at?.slice(0, 10) || ""}
`;
        }
      }
      await fs.promises.writeFile(path.join(exportDir, "index.md"), index2, "utf-8");
      return { success: true, data: { dir: exportDir, count } };
    } catch (err) {
      return { success: false, error: err.message };
    }
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
  registerShortcutHandlers();
  registerTagHandlers();
  registerNoteHandlers();
  registerContinueHandlers();
  registerGraphHandlers();
  registerBookmarkHandlers();
  registerAiHandlers();
  registerWhiteboardHandlers();
}
let quickNoteWin = null;
let currentUserId = 0;
function getQuickNoteHtml() {
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Inter,system-ui,sans-serif;background:#1a1816;color:#e0dcd5;height:100vh;display:flex;flex-direction:column}
    .hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#151412;border-bottom:1px solid rgba(224,220,213,0.07);-webkit-app-region:drag}
    .hdr span{font-size:13px;font-weight:600;color:#a09890}
    .hdr button{background:none;border:none;color:#a09890;cursor:pointer;font-size:16px;-webkit-app-region:no-drag}
    textarea{flex:1;background:transparent;border:none;color:#c9d1d9;font-size:14px;line-height:1.6;padding:14px;resize:none;outline:none;font-family:inherit}
    .ftr{display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-top:1px solid rgba(224,220,213,0.07);font-size:11px;color:#605850}
    .ftr button{background:#b8826a;color:#fff;border:none;border-radius:4px;padding:6px 16px;font-size:12px;font-weight:500;cursor:pointer}
    .ftr button:hover{opacity:.85}
    .toast{position:fixed;bottom:12px;left:50%;transform:translateX(-50%);background:#8a9e7a;color:#fff;font-size:12px;padding:6px 14px;border-radius:4px;opacity:0;transition:opacity .3s}
    .toast.show{opacity:1}
    .clip-popover{position:fixed;bottom:52px;right:8px;width:320px;max-height:260px;overflow-y:auto;background:#211f1c;border:1px solid rgba(224,220,213,0.07);border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,0.3);display:none;z-index:10}
    .clip-popover.show{display:block}
    .clip-popover .clip-item{padding:6px 10px;font-size:12px;color:#a09890;cursor:pointer;border-bottom:1px solid rgba(224,220,213,0.04);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .clip-popover .clip-item:hover{background:rgba(224,220,213,0.04);color:#e0dcd5}
  </style></head><body>
    <div class="hdr"><span>快捷便签</span><button onclick="closeWin()">&times;</button></div>
    <textarea id="ta" placeholder="写下你的想法...&#10;&#10;Esc 关闭 | Ctrl+Enter 保存"></textarea>
    <div class="ftr"><span id="cnt">0 字</span><span><button onclick="save()">保存</button> <button style="background:#2d2a26;color:#a09890;border:none;border-radius:4px;padding:6px 12px;font-size:12px;cursor:pointer" onclick="window.quickNote.pin(ta.value.trim());ta.value='';document.getElementById('cnt').textContent='0 字';showToast('已固定')">📌 固定</button> <button onclick="save();window.quickNote.hide()">保存并关闭</button> <button style="background:transparent;color:#a09890;border:1px solid rgba(224,220,213,0.1);border-radius:4px;padding:4px 10px;font-size:12px;cursor:pointer" onclick="window.toggleClipPopover()">📋</button></span></div>
    <div class="toast" id="toast"></div>
    <div class="clip-popover" id="clipPopover"></div>
    <script>
      const ta=document.getElementById('ta');ta.focus();
      ta.oninput=()=>document.getElementById('cnt').textContent=ta.value.length+' 字';
      document.onkeydown=(e)=>{
        if(e.key==='Escape'){e.preventDefault();window.quickNote.hide()}
        if(e.key==='Enter'&&e.ctrlKey){e.preventDefault();save()}
      };
      window.closeWin=()=>window.quickNote.hide();
      window.save=()=>{const t=ta.value.trim();if(t){window.quickNote.save(t);ta.value='';document.getElementById('cnt').textContent='0 字';showToast('已保存')}};
      function showToast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1500)}
      var clipVisible=false;
      var clipCache=[];
      async function loadClipboard(){
        try{
          if(window.quickNote && window.quickNote.getClipboardHistory){
            var resp=await window.quickNote.getClipboardHistory();
            if(resp && resp.success && Array.isArray(resp.data)){clipCache=resp.data;return}
          }
        }catch(e){}
        clipCache=[];
      }
      async function toggleClipPopover(){
        var pop=document.getElementById('clipPopover');
        clipVisible=!clipVisible;
        if(clipVisible){
          await loadClipboard();
          if(clipCache.length===0){
            pop.innerHTML='<div class="clip-item" style="color:#605850">暂无剪贴板记录<br><span style="font-size:10px">复制文本后 Ctrl+C，再点此按钮</span></div>';
          }else{
            var html='';
            for(var i=0;i<clipCache.length;i++){
              var t=(clipCache[i].text||'').replace(/</g,'&lt;').replace(/"/g,'&quot;');
              html+='<div class="clip-item" onclick="window.pasteClipItem('+i+')" title="点击粘贴">'+t.slice(0,80)+(t.length>80?'...':'')+'</div>';
            }
            pop.innerHTML=html;
          }
          pop.classList.add('show');
        }else{pop.classList.remove('show')}
      }
      window.pasteClipItem=function(i){
        if(clipCache[i]){ta.value=clipCache[i].text||'';ta.focus();document.getElementById('cnt').textContent=ta.value.length+' 字';showToast('已粘贴')}
        document.getElementById('clipPopover').classList.remove('show');clipVisible=false;
      };
      window.toggleClipPopover=toggleClipPopover;
    <\/script>
  </body></html>`;
}
function registerQuickNote() {
  electron.ipcMain.on("quick-note:save", async (_event, content) => {
    try {
      if (!currentUserId) return;
      const { dbRun: dbRun2 } = await Promise.resolve().then(() => index);
      const { nowMySQL: nowMySQL2 } = await Promise.resolve().then(() => datetime);
      const now = nowMySQL2();
      await dbRun2(
        "INSERT INTO notes (user_id, content, title, source, memo_type, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
        [currentUserId, content, "", "quick-note", "note", now, now]
      );
    } catch (e) {
      console.error("[QuickNote]", e);
    }
  });
  electron.ipcMain.on("quick-note:pin", async (_event, content) => {
    try {
      if (!currentUserId || !content) return;
      const { dbRun: dbRun2 } = await Promise.resolve().then(() => index);
      const { nowMySQL: nowMySQL2 } = await Promise.resolve().then(() => datetime);
      const now = nowMySQL2();
      await dbRun2(
        "INSERT INTO notes (user_id, content, title, source, memo_type, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
        [currentUserId, content, "", "quick-note", "pinned", now, now]
      );
    } catch (e) {
      console.error("[QuickNote Pin]", e);
    }
  });
  async function saveDraft(text) {
    if (!currentUserId || !text) return;
    try {
      const { dbRun: dbRun2 } = await Promise.resolve().then(() => index);
      const { nowMySQL: nowMySQL2 } = await Promise.resolve().then(() => datetime);
      const now = nowMySQL2();
      await dbRun2(
        "INSERT OR REPLACE INTO settings (user_id, key, value, updated_at) VALUES (?,?,?,?)",
        [currentUserId, "quick_note_draft", text, now]
      );
    } catch {
    }
  }
  async function loadDraft() {
    if (!currentUserId) return "";
    try {
      const { dbGet: dbGet2 } = await Promise.resolve().then(() => index);
      const row = await dbGet2(
        "SELECT value FROM settings WHERE user_id = ? AND key = ?",
        [currentUserId, "quick_note_draft"]
      );
      return row?.value || "";
    } catch {
      return "";
    }
  }
  electron.ipcMain.on("quick-note:hide", () => {
    quickNoteWin?.webContents.executeJavaScript('document.getElementById("ta")?.value || ""').then((text) => {
      if (text.trim()) saveDraft(text);
    }).catch(() => {
    });
    quickNoteWin?.hide();
  });
  const _origShowQuickNote = showQuickNote;
  showQuickNote = () => {
    _origShowQuickNote();
    loadDraft().then((draft) => {
      if (draft && quickNoteWin && !quickNoteWin.isDestroyed()) {
        setTimeout(() => {
          quickNoteWin?.webContents.executeJavaScript(`(function(){var t=document.getElementById("ta");if(t&&!t.value)t.value=${JSON.stringify(draft)};t?.focus()})()`).catch(() => {
          });
        }, 150);
      }
    });
  };
  electron.ipcMain.handle("quick-note:show", async (_event, userId) => {
    currentUserId = userId;
    showQuickNote();
  });
}
let showQuickNote = function() {
  if (quickNoteWin && !quickNoteWin.isDestroyed()) {
    quickNoteWin.show();
    quickNoteWin.focus();
    quickNoteWin.webContents.executeJavaScript('document.getElementById("ta")?.focus()');
    return;
  }
  try {
    quickNoteWin = new electron.BrowserWindow({
      width: 420,
      height: 320,
      center: true,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: true,
      skipTaskbar: true,
      backgroundColor: "#00000000",
      title: "快捷便签",
      webPreferences: { nodeIntegration: false, contextIsolation: true, preload: require("path").join(__dirname, "quick-note-preload.js"), sandbox: false }
    });
    quickNoteWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getQuickNoteHtml())}`);
    quickNoteWin.on("closed", () => {
      quickNoteWin = null;
    });
  } catch (e) {
    console.error("[QuickNote] Failed to create window:", e);
    quickNoteWin = null;
  }
};
function registerQuickNoteShortcut(mainWindow2) {
  electron.globalShortcut.register("Alt+Space", () => {
    if (mainWindow2 && !mainWindow2.isDestroyed()) {
      mainWindow2.webContents.send("quick-note:trigger");
    }
  });
}
let updateInfo = null;
let checking = false;
let downloading = false;
function setupAutoUpdater(getMainWindow) {
  const { app, ipcMain } = require("electron");
  if (!app.isPackaged) return;
  let autoUpdater;
  try {
    autoUpdater = require("electron-updater").autoUpdater;
  } catch {
    console.warn("[AutoUpdater] electron-updater not available");
    return;
  }
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  const send = (data) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.EVT_UPDATE_STATUS, data);
    }
  };
  autoUpdater.on("checking-for-update", () => {
    checking = true;
    send({ status: "checking" });
  });
  autoUpdater.on("update-available", (info) => {
    checking = false;
    updateInfo = { version: info.version };
    send({ status: "available", version: info.version });
  });
  autoUpdater.on("update-not-available", () => {
    checking = false;
    updateInfo = null;
    send({ status: "not-available" });
  });
  autoUpdater.on("download-progress", (progress) => {
    send({ status: "downloading", percent: progress.percent });
  });
  autoUpdater.on("update-downloaded", (info) => {
    downloading = false;
    updateInfo = { version: info.version };
    send({ status: "downloaded", version: info.version });
  });
  autoUpdater.on("error", (error) => {
    checking = false;
    downloading = false;
    send({ status: "error", message: error.message });
  });
  ipcMain.handle(IPC.APP_CHECK_UPDATE, async () => {
    if (checking || downloading) return { success: false, error: "检查或下载已在进行中" };
    try {
      const result = await autoUpdater.checkForUpdates();
      return {
        success: true,
        data: { updateAvailable: !!result?.updateInfo, version: result?.updateInfo?.version || null }
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  ipcMain.handle(IPC.APP_DOWNLOAD_UPDATE, async () => {
    if (!updateInfo) return { success: false, error: "没有可用的更新信息，请先检查" };
    if (downloading) return { success: false, error: "已在下载中" };
    try {
      downloading = true;
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (e) {
      downloading = false;
      return { success: false, error: e.message };
    }
  });
  ipcMain.handle(IPC.APP_INSTALL_UPDATE, () => {
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  });
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
    });
  }, 5e3);
}
process.on("uncaughtException", (error) => {
  console.error("[Main] Uncaught exception:", error);
  try {
    const wins = electron.BrowserWindow.getAllWindows();
    if (wins.length > 0 && !wins[0].isDestroyed()) {
      wins[0].webContents.send(IPC.EVT_APP_ERROR, { message: error.message || "未知错误" });
    }
  } catch {
  }
});
electron.app.disableHardwareAcceleration();
electron.app.commandLine.appendSwitch("disable-gpu");
electron.app.setPath("cache", path.join(electron.app.getPath("userData"), "cache"));
const gotTheLock = electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  electron.app.quit();
} else {
  let createWindow = function() {
    mainWindow2 = new electron.BrowserWindow({
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
      autoHideMenuBar: true,
      webviewTag: true,
      show: false
    });
    if (process.env.ELECTRON_RENDERER_URL) {
      mainWindow2.loadURL(process.env.ELECTRON_RENDERER_URL);
    } else {
      mainWindow2.loadFile(path.join(__dirname, "../renderer/index.html"));
    }
    mainWindow2.setMenuBarVisibility(false);
    mainWindow2.on("ready-to-show", () => {
      mainWindow2?.show();
      if (!electron.app.isPackaged) mainWindow2?.webContents.openDevTools();
    });
    mainWindow2.on("close", (e) => {
      e.preventDefault();
      mainWindow2?.hide();
    });
    mainWindow2.on("hide", () => {
      if (noteCleanTimer) {
        clearInterval(noteCleanTimer);
        noteCleanTimer = null;
      }
      mainWindow2?.webContents.send(IPC.APP_VISIBILITY, "hidden");
    });
    mainWindow2.on("show", () => {
      if (!noteCleanTimer) {
        noteCleanTimer = setInterval(() => {
          NoteService.cleanOldNotes().catch(() => {
          });
        }, 5 * 60 * 1e3);
      }
      mainWindow2?.webContents.send(IPC.APP_VISIBILITY, "visible");
    });
    mainWindow2.webContents.setWindowOpenHandler(({ url }) => {
      electron.shell.openExternal(url);
      return { action: "deny" };
    });
  };
  electron.app.on("second-instance", (_event, _commandLine, _workingDirectory) => {
    if (mainWindow2) {
      if (mainWindow2.isMinimized()) mainWindow2.restore();
      mainWindow2.focus();
      mainWindow2.show();
    }
  });
  let mainWindow2 = null;
  let noteCleanTimer = null;
  electron.app.whenReady().then(async () => {
    try {
      await initDatabase();
      console.log("[Main] Database ready");
      BackupService.startAutoBackup();
    } catch (err) {
      console.warn("[Main] Database unavailable:", err.message);
    }
    electron.protocol.handle("local-resource", (request) => {
      try {
        const url = request.url.replace("local-resource://", "");
        const decoded = decodeURIComponent(url);
        const filePath = decoded.replace(/^\/([a-zA-Z]:)\//, "$1\\").replace(/\//g, path.sep);
        const buf = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mimeMap = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml" };
        return new Response(buf, { headers: { "Content-Type": mimeMap[ext] || "image/png" } });
      } catch {
        return new Response("Not found", { status: 404 });
      }
    });
    registerAllIpcHandlers();
    createWindow();
    if (mainWindow2) {
      setupTray(mainWindow2);
      setupAutoUpdater(() => mainWindow2);
      registerQuickNote();
      registerQuickNoteShortcut(mainWindow2);
      setNoteRefreshTarget(mainWindow2.webContents);
      setBlogRefreshTarget(mainWindow2.webContents);
      setKbRefreshTarget(mainWindow2.webContents);
    }
    initPetActions();
    noteCleanTimer = setInterval(() => {
      NoteService.cleanOldNotes().catch(() => {
      });
    }, 5 * 60 * 1e3);
    ShortcutService.setActions({
      "md-float": () => showMdFloatWindow(),
      "clipboard-note": () => handleClipboardNote()
    });
    ShortcutService.reregisterAll();
    if (!electron.app.isPackaged) {
      const shortcutDir = path.join(process.env.APPDATA || "", "Microsoft", "Windows", "Start Menu", "Programs");
      const shortcutPath = path.join(shortcutDir, "Idiot.lnk");
      if (!fs.existsSync(shortcutPath)) {
        const projectRoot = path.join(__dirname, "..", "..");
        const launcherVbsPath = path.join(electron.app.getPath("userData"), "launcher.vbs");
        const vbsContent = [
          'Set WshShell = CreateObject("WScript.Shell")',
          'WshShell.Environment("Process")("ELECTRON_RUN_AS_NODE") = ""',
          `WshShell.CurrentDirectory = "${projectRoot.replace(/\\/g, "\\\\")}"`,
          'WshShell.Run "npm run dev", 1, False'
        ].join("\r\n");
        fs.writeFileSync(launcherVbsPath, vbsContent, "utf-8");
        const psCmd = `$ws=New-Object -ComObject WScript.Shell;$sc=$ws.CreateShortcut('${shortcutPath.replace(/'/g, "''")}');$sc.TargetPath='${launcherVbsPath.replace(/'/g, "''")}';$sc.WorkingDirectory='${projectRoot.replace(/'/g, "''")}';$sc.Save()`;
        node_child_process.exec(`powershell -NoProfile -Command "${psCmd}"`, (err) => {
          if (!err) console.log("[Main] Start Menu shortcut created");
        });
      }
    }
    electron.app.on("activate", () => {
      if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
    });
    electron.app.on("will-quit", () => {
      electron.globalShortcut.unregisterAll();
      if (noteCleanTimer) {
        clearInterval(noteCleanTimer);
        noteCleanTimer = null;
      }
    });
  });
  electron.app.on("window-all-closed", () => {
    BackupService.stopAutoBackup();
    closeDatabase();
    if (process.platform !== "darwin") electron.app.quit();
  });
}
exports.datetime = datetime;
exports.index = index;
exports.mapKnowledgeRow = mapKnowledgeRow;
exports.sanitizePagination = sanitizePagination;
