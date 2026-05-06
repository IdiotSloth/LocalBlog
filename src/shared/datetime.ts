/** Shared datetime helpers — used by both main process and server. */

/** Format a Date as MySQL DATETIME-compatible string (YYYY-MM-DD HH:MM:SS).
 *  MySQL DATETIME does NOT accept ISO 8601 with T/Z separators.
 *  sql.js / SQLite WASM accepts both formats; using this everywhere ensures
 *  consistency across the dual-MySQL+sql.js backend.
 *  @param date — defaults to now */
export function toMySQLDateTime(date: Date = new Date()): string {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

/** Convenience alias for current time */
export const nowMySQL = () => toMySQLDateTime();
