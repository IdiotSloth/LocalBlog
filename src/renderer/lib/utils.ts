/** Format file size to human-readable string */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/** Format ISO date string to locale date.
 *  Handles both ISO 8601 ('2026-05-02T11:31:00.000Z') and SQLite
 *  datetime ('2026-05-02 11:31:00') — the latter is treated as UTC
 *  to avoid 8-hour offset in UTC+8 environments. */
export function formatDate(iso: string): string {
  if (!iso) return '—';
  // SQLite datetime('now') produces "YYYY-MM-DD HH:MM:SS" without TZ marker.
  // new Date() in V8 parses that as local time, causing an 8-hour offset.
  // Force UTC interpretation by adding 'T' and 'Z' suffix.
  const normalized = iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z';
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
