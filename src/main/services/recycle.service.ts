import fs from 'node:fs';
import { nowMySQL } from '../../shared/datetime';
import type { RecycleBinItem } from '../../shared/types';
import { dbAll, dbGet, dbRun } from '../db';
import { getBlogAssetsDir, getBlogPath, getWorkspacePath } from '../utils/paths';

// Raw DB row — snake_case as returned by SQL
interface RecycleRow {
  id: number;
  user_id: number;
  item_type: string;
  item_id: number;
  deleted_at: string;
}

function rowToItem(r: RecycleRow): RecycleBinItem {
  return {
    id: r.id,
    userId: r.user_id,
    itemType: r.item_type as 'blog' | 'knowledge_file',
    itemId: r.item_id,
    deletedAt: r.deleted_at,
  };
}

export class RecycleService {
  static async listItems(userId: number): Promise<RecycleBinItem[]> {
    const rows = await dbAll<RecycleRow>(
      'SELECT id, user_id, item_type, item_id, deleted_at FROM recycle_bin WHERE user_id = ? ORDER BY deleted_at DESC',
      [userId],
    );
    return rows.map(rowToItem);
  }

  static async restoreItem(userId: number, itemId: number, itemType: string): Promise<void> {
    const item = await dbGet<RecycleRow>(
      'SELECT * FROM recycle_bin WHERE user_id = ? AND item_id = ? AND item_type = ?',
      [userId, itemId, itemType],
    );
    if (!item) throw new Error('回收站中未找到该项目');
    const now = nowMySQL();
    if (itemType === 'blog')
      await dbRun("UPDATE blogs SET status = 'active', updated_at = ? WHERE id = ?", [now, itemId]);
    else if (itemType === 'knowledge_file')
      await dbRun("UPDATE knowledge_files SET status = 'active', updated_at = ? WHERE id = ?", [now, itemId]);
    await dbRun('DELETE FROM recycle_bin WHERE id = ?', [item.id]);
  }

  static async emptyTrash(userId: number): Promise<number> {
    const rows = await dbAll<RecycleRow>('SELECT * FROM recycle_bin WHERE user_id = ?', [userId]);
    for (const item of rows) await RecycleService.permanentlyDeleteItem(item);
    return rows.length;
  }

  static async autoClean(userId: number, days: number): Promise<number> {
    // Inline days to avoid SQLite datetime('now', ?) which MySQL can't translate
    const rows = await dbAll<RecycleRow>(
      `SELECT * FROM recycle_bin WHERE user_id = ? AND deleted_at < datetime('now', '-${days} days')`,
      [userId],
    );
    for (const item of rows) await RecycleService.permanentlyDeleteItem(item);
    return rows.length;
  }

  private static async permanentlyDeleteItem(item: RecycleRow): Promise<void> {
    // Collect disk paths BEFORE deleting DB records
    const toDelete: string[] = [];
    const toDeleteDirs: string[] = [];

    if (item.item_type === 'blog') {
      // Look up blog metadata needed for path resolution
      const blog = await dbGet<{ user_id: number; format: string }>('SELECT user_id, format FROM blogs WHERE id = ?', [
        item.item_id,
      ]);
      if (blog) {
        try {
          toDelete.push(await getBlogPath(blog.user_id, item.item_id, blog.format as 'md' | 'html'));
        } catch {
          /* path resolution failed, skip file cleanup */
        }
        try {
          toDeleteDirs.push(await getBlogAssetsDir(blog.user_id, item.item_id));
        } catch {
          /* path resolution failed, skip dir cleanup */
        }
      }
      await dbRun('DELETE FROM blog_tags WHERE blog_id = ?', [item.item_id]);
      await dbRun('DELETE FROM blog_drafts WHERE blog_id = ?', [item.item_id]);
      await dbRun('DELETE FROM blogs WHERE id = ?', [item.item_id]);
    } else if (item.item_type === 'knowledge_file') {
      const kf = await dbGet<{ user_id: number; file_path: string }>(
        'SELECT user_id, file_path FROM knowledge_files WHERE id = ?',
        [item.item_id],
      );
      if (kf) {
        try {
          const workspacePath = await getWorkspacePath(kf.user_id);
          if (kf.file_path.startsWith(workspacePath)) toDelete.push(kf.file_path);
        } catch {
          /* file may be outside workspace, skip deletion */
        }
      }
      await dbRun('DELETE FROM knowledge_file_tags WHERE file_id = ?', [item.item_id]);
      await dbRun('DELETE FROM knowledge_files WHERE id = ?', [item.item_id]);
    }
    await dbRun('DELETE FROM recycle_bin WHERE id = ?', [item.id]);

    // Clean up disk files — failures here do not block DB cleanup
    for (const p of toDelete) {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {
        /* file already deleted or locked, non-critical */
      }
    }
    for (const d of toDeleteDirs) {
      try {
        if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
      } catch {
        /* dir already deleted or locked, non-critical */
      }
    }
  }
}
