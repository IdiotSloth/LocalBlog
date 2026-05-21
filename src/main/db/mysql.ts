/** MySQL database layer for Electron main process — same API as sql.js db/index.ts */
import mysql from 'mysql2/promise';
import { MYSQL_DDL, MYSQL_MIGRATIONS } from '../../shared/db-schema-mysql';

let pool: mysql.Pool | null = null;

function getMySQLConfig() {
  return {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '123456',
    database: process.env.MYSQL_DATABASE || 'local_blog_kb',
  };
}

export async function initMySQL(): Promise<void> {
  const cfg = getMySQLConfig();
  // Connect without database first to create it
  const initConn = await mysql.createConnection({
    host: cfg.host,
    user: cfg.user,
    password: cfg.password,
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
    dateStrings: true, // Return DATE/DATETIME as strings, not Date objects. Prevents date format mismatch.
  });

  // Create tables
  const conn = await pool.getConnection();
  try {
    // Use canonical shared MySQL DDL
    for (const ddl of MYSQL_DDL) await conn.execute(ddl);
    // Run migrations for columns added after initial schema
    // Idempotent migrations — empty catch intentional: re-running an already-applied
    // migration (e.g. ADD COLUMN that exists) throws, which is safe to ignore.
    for (const mig of MYSQL_MIGRATIONS) {
      try {
        await conn.execute(mig);
      } catch {
        /* migration already applied */
      }
    }
    console.log('[MySQL] Tables initialized');
  } finally {
    conn.release();
  }
}

function getPool(): mysql.Pool {
  if (!pool) throw new Error('MySQL not initialized');
  return pool;
}

// Mirror the sql.js API

/** Convert ISO 8601 dates to MySQL DATETIME format */
function fixDates(params: unknown[]): (string | number | boolean | null)[] {
  return params.map((p) => {
    if (typeof p === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(p)) {
      return p
        .replace('T', ' ')
        .replace(/\.\d{3}Z$/, '')
        .replace(/Z$/, '');
    }
    return p as string | number | boolean | null;
  });
}

/** Translate SQLite SQL dialects to MySQL.
 *  Order matters: handle datetime('now', modifier) BEFORE datetime('now')
 *  because the latter would otherwise match the prefix and break the modifier pattern.
 */
function toMySQL(sql: string): string {
  return (
    sql
      // datetime('now', '-N days') → DATE_SUB(NOW(), INTERVAL N DAY) — MUST be first
      .replace(/datetime\('now',\s*'(-?\d+)\s*days?'\)/g, (_m, days) => {
        const n = Number.parseInt(days, 10);
        if (n < 0) return `DATE_SUB(NOW(), INTERVAL ${-n} DAY)`;
        return `DATE_ADD(NOW(), INTERVAL ${n} DAY)`;
      })
      // datetime('now') → NOW()
      .replace(/datetime\('now'\)/g, 'NOW()')
      // date('now') → CURDATE()
      .replace(/date\('now'\)/gi, 'CURDATE()')
      // time('now') → CURTIME()
      .replace(/time\('now'\)/gi, 'CURTIME()')
      // strftime(format, expr) → DATE_FORMAT(expr, mysql-format)
      .replace(/strftime\('([^']+)',\s*([^)]+)\)/gi, (_m, fmt, expr) => {
        const mysqlFmt = fmt
          .replace(/%Y/g, '%Y')
          .replace(/%m/g, '%m')
          .replace(/%d/g, '%d')
          .replace(/%H/g, '%H')
          .replace(/%M/g, '%i')
          .replace(/%S/g, '%s')
          .replace(/%w/g, '%w')
          .replace(/%j/g, '%j');
        return `DATE_FORMAT(${expr.trim()}, '${mysqlFmt}')`;
      })
      // Bare 'now' as default value → NOW() (only after specific patterns are handled)
      .replace(/'now'/g, 'NOW()')
      .replace(/INSERT OR IGNORE INTO/gi, 'INSERT IGNORE INTO')
      .replace(/INSERT OR REPLACE INTO/gi, 'REPLACE INTO')
      .replace(/last_insert_rowid\(\)/gi, 'LAST_INSERT_ID()')
  );
}

export async function run(sql: string, params: unknown[] = []): Promise<void> {
  const p = getPool();
  await p.execute(toMySQL(sql), fixDates(params));
}

export async function get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const p = getPool();
  const [rows] = (await p.execute(toMySQL(sql), fixDates(params))) as any[];
  return rows.length > 0 ? (rows[0] as T) : undefined;
}

export async function all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const p = getPool();
  const [rows] = (await p.execute(toMySQL(sql), fixDates(params))) as any[];
  return rows as T[];
}

export function saveToDisk(): void {
  // MySQL auto-persists
}

export function closeDatabase(): void {
  if (pool) {
    pool.end();
    pool = null;
  }
}
