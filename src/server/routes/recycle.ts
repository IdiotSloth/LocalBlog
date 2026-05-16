import fs from 'node:fs';
import { Router } from 'express';
import { getPool } from '../db';
import { type AuthRequest, requireAuth } from '../middleware/auth';

export const recycleRouter = Router();
recycleRouter.use(requireAuth);

recycleRouter.get('/list', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const pool = getPool();
    const [rows] = (await pool.execute('SELECT * FROM recycle_bin WHERE user_id = ? ORDER BY deleted_at DESC', [
      userId,
    ])) as any[];
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

recycleRouter.post('/restore', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { itemId, itemType } = req.body;
    const pool = getPool();
    if (itemType === 'blog') {
      await pool.execute("UPDATE blogs SET status = 'active' WHERE id = ? AND user_id = ?", [itemId, userId]);
    } else if (itemType === 'knowledge_file') {
      await pool.execute("UPDATE knowledge_files SET status = 'active' WHERE id = ? AND user_id = ?", [itemId, userId]);
    }
    await pool.execute('DELETE FROM recycle_bin WHERE user_id = ? AND item_id = ? AND item_type = ?', [
      userId,
      itemId,
      itemType,
    ]);
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

recycleRouter.post('/empty', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const pool = getPool();
    const [items] = (await pool.execute('SELECT * FROM recycle_bin WHERE user_id = ?', [userId])) as any[];
    for (const item of items) {
      if (item.item_type === 'blog') {
        await pool.execute('DELETE FROM blog_tags WHERE blog_id = ?', [item.item_id]);
        await pool.execute('DELETE FROM blog_drafts WHERE blog_id = ?', [item.item_id]);
        await pool.execute('DELETE FROM blogs WHERE id = ?', [item.item_id]);
      } else if (item.item_type === 'knowledge_file') {
        // Attempt disk cleanup before deleting DB record
        const [kfRows] = (await pool.execute('SELECT file_path FROM knowledge_files WHERE id = ?', [
          item.item_id,
        ])) as any[];
        const fp = kfRows[0]?.file_path;
        if (fp) {
          try {
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
          } catch {
            /* file already deleted or locked */
          }
        }
        await pool.execute('DELETE FROM knowledge_file_tags WHERE file_id = ?', [item.item_id]);
        await pool.execute('DELETE FROM knowledge_files WHERE id = ?', [item.item_id]);
      }
      await pool.execute('DELETE FROM recycle_bin WHERE id = ? AND user_id = ?', [item.id, userId]);
    }
    return res.json({ success: true, data: { removed: items.length } });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

recycleRouter.post('/auto-clean', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { days } = req.body;
    const pool = getPool();
    const [items] = (await pool.execute(
      'SELECT * FROM recycle_bin WHERE user_id = ? AND deleted_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [userId, days],
    )) as any[];
    for (const item of items) {
      if (item.item_type === 'blog') {
        await pool.execute('DELETE FROM blog_tags WHERE blog_id = ?', [item.item_id]);
        await pool.execute('DELETE FROM blog_drafts WHERE blog_id = ?', [item.item_id]);
        await pool.execute('DELETE FROM blogs WHERE id = ?', [item.item_id]);
      } else if (item.item_type === 'knowledge_file') {
        const [kfRows] = (await pool.execute('SELECT file_path FROM knowledge_files WHERE id = ?', [
          item.item_id,
        ])) as any[];
        const fp = kfRows[0]?.file_path;
        if (fp) {
          try {
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
          } catch {
            /* file already deleted or locked */
          }
        }
        await pool.execute('DELETE FROM knowledge_file_tags WHERE file_id = ?', [item.item_id]);
        await pool.execute('DELETE FROM knowledge_files WHERE id = ?', [item.item_id]);
      }
      await pool.execute('DELETE FROM recycle_bin WHERE id = ? AND user_id = ?', [item.id, userId]);
    }
    return res.json({ success: true, data: { cleaned: items.length } });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});
