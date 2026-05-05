/** Server-side database — MySQL with full schema */
import mysql from 'mysql2/promise';
import { DB_CONFIG } from './config';
import { MYSQL_DDL, MYSQL_MIGRATIONS } from '../shared/db-schema-mysql';

let pool: mysql.Pool | null = null;

export async function initMySQL(): Promise<mysql.Pool> {
  const initConn = await mysql.createConnection({
    host: DB_CONFIG.host, user: DB_CONFIG.user, password: DB_CONFIG.password,
  });

  await initConn.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` DEFAULT CHARACTER SET utf8mb4`);
  await initConn.end();

  pool = mysql.createPool({
    host: DB_CONFIG.host, user: DB_CONFIG.user, password: DB_CONFIG.password,
    database: DB_CONFIG.database, waitForConnections: true, connectionLimit: 10,
  });

  const conn = await pool.getConnection();
  try {
    // Use canonical shared MySQL DDL
    for (const ddl of MYSQL_DDL) await conn.execute(ddl);
    // Run migrations for columns added after initial schema
    for (const mig of MYSQL_MIGRATIONS) {
      try { await conn.execute(mig); } catch {}
    }

    console.log('[MySQL] Server database initialized');
  } finally {
    conn.release();
  }

  return pool;
}

export function getPool(): mysql.Pool {
  if (!pool) throw new Error('MySQL not initialized');
  return pool;
}

export async function closeMySQL(): Promise<void> {
  if (pool) { await pool.end(); pool = null; }
}
