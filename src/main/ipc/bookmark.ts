import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { dbAll, dbGet, dbRun } from '../db';
import { nowMySQL } from '../../shared/datetime';

export function registerBookmarkHandlers(): void {
  ipcMain.handle(IPC.BOOKMARK_ADD, async (_event, data: { userId: number; targetType: string; targetId: number; title: string }) => {
    try {
      const existing = await dbGet<{ id: number }>(
        'SELECT id FROM bookmarks WHERE user_id = ? AND target_type = ? AND target_id = ?',
        [data.userId, data.targetType, data.targetId],
      );
      if (existing) {
        return { success: true, data: { id: existing.id } };
      }
      const now = nowMySQL();
      await dbRun(
        'INSERT INTO bookmarks (user_id, target_type, target_id, title, created_at) VALUES (?, ?, ?, ?, ?)',
        [data.userId, data.targetType, data.targetId, data.title, now],
      );
      const row = await dbGet<{ id: number }>('SELECT last_insert_rowid() as id');
      return { success: true, data: { id: row?.id ?? 0 } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.BOOKMARK_REMOVE, async (_event, data: { userId: number; targetType: string; targetId: number }) => {
    try {
      await dbRun(
        'DELETE FROM bookmarks WHERE user_id = ? AND target_type = ? AND target_id = ?',
        [data.userId, data.targetType, data.targetId],
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.BOOKMARK_LIST, async (_event, userId: number) => {
    try {
      const rows = await dbAll<{ id: number; user_id: number; target_type: string; target_id: number; title: string; created_at: string }>(
        'SELECT id, target_type, target_id, title, created_at FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
      );
      return {
        success: true,
        data: rows.map((r) => ({
          id: r.id,
          targetType: r.target_type,
          targetId: r.target_id,
          title: r.title,
          createdAt: r.created_at,
        })),
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
