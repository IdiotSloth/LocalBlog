/** Shared datetime helpers. */

/** Format a Date as YYYY-MM-DD HH:MM:SS string (DATETIME-compatible).
 *  @param date — defaults to now */
export function toDateTime(date: Date = new Date()): string {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

/** Convenience alias for current time in DATETIME format */
export const nowTimestamp = () => toDateTime();
