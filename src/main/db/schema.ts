/** SQL DDL statements for all application tables */

export const SCHEMA_SQL = `
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
