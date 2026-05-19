/** Shared MySQL DDL — canonical CREATE TABLE statements used by both main process and server. */
export const MYSQL_DDL = [
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
];

/** ALTER TABLE statements for columns added after initial schema */
export const MYSQL_MIGRATIONS = [
  'ALTER TABLE blogs ADD COLUMN folder_id INT DEFAULT NULL',
  'ALTER TABLE blogs ADD COLUMN series_id VARCHAR(36) DEFAULT NULL',
  'ALTER TABLE blogs ADD COLUMN series_name VARCHAR(100) DEFAULT NULL',
  'ALTER TABLE knowledge_files ADD COLUMN folder_id INT DEFAULT NULL',
  'ALTER TABLE knowledge_files ADD COLUMN content_text LONGTEXT',
  'ALTER TABLE blogs ADD CONSTRAINT fk_blogs_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL',
  'ALTER TABLE tags ADD COLUMN description TEXT',
  'ALTER TABLE knowledge_files ADD CONSTRAINT fk_kf_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL',

  // T1801: MySQL FULLTEXT INDEX for full-text search
  'ALTER TABLE blogs ADD FULLTEXT INDEX ft_blogs (title, content)',
  'ALTER TABLE knowledge_files ADD FULLTEXT INDEX ft_knowledge (filename, content_text)',

  // Phase 21: Rebuild FULLTEXT indexes with ngram parser for CJK search.
  // The original indexes (T1801) use the default parser which treats CJK
  // as single tokens — "面试通关手册" indexed as one token, so searching
  // "面试" never matches. ngram parser breaks into bigrams.
  'ALTER TABLE blogs DROP INDEX ft_blogs',
  'ALTER TABLE knowledge_files DROP INDEX ft_knowledge',
  'ALTER TABLE blogs ADD FULLTEXT INDEX ft_blogs (title, content) WITH PARSER ngram',
  'ALTER TABLE knowledge_files ADD FULLTEXT INDEX ft_knowledge (filename, content_text) WITH PARSER ngram',

  // T1906: notes +4 columns (title, memo_type, due_date, updated_at)
  "ALTER TABLE notes ADD COLUMN title VARCHAR(200) NOT NULL DEFAULT ''",
  "ALTER TABLE notes ADD COLUMN memo_type VARCHAR(10) NOT NULL DEFAULT 'note'",
  'ALTER TABLE notes ADD COLUMN due_date DATETIME DEFAULT NULL',
  'ALTER TABLE notes ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',

  // T2009: knowledge_files properties JSON column (R176)
  "ALTER TABLE knowledge_files ADD COLUMN properties TEXT",

  // T2103+T2108: blogs metadata columns (cover_image, icon, is_pinned, color)
  'ALTER TABLE blogs ADD COLUMN cover_image TEXT',
  'ALTER TABLE blogs ADD COLUMN icon VARCHAR(16) DEFAULT NULL',
  'ALTER TABLE blogs ADD COLUMN is_pinned TINYINT NOT NULL DEFAULT 0',
  'ALTER TABLE blogs ADD COLUMN color VARCHAR(20) DEFAULT NULL',
];
