/** Unified pagination sanitizer — used by both Electron main services and Express server routes.
 *  Ensures offset/limit are always safe integers before being interpolated into SQL strings. */
export function sanitizePagination(offset: unknown, limit: unknown): { offset: number; limit: number } {
  const safeOffset = Math.max(0, Math.floor(Number(offset) || 0));
  const safeLimit = Math.min(200, Math.max(1, Math.floor(Number(limit) || 50)));
  return { offset: safeOffset, limit: safeLimit };
}
