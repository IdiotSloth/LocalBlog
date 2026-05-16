import { Router } from 'express';
import { nowMySQL } from '../config';
import { getPool } from '../db';
import { type AuthRequest, requireAuth } from '../middleware/auth';

export const folderRouter = Router();
folderRouter.use(requireAuth);

folderRouter.get('/tree', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const type = (req.query.type as string) || 'blog';
    const pool = getPool();

    const [rows] = (await pool.execute(
      `SELECT f.*, COALESCE(cnt.c, 0) as item_count FROM folders f
       LEFT JOIN (
         SELECT folder_id, COUNT(*) as c FROM ${type === 'blog' ? 'blogs' : 'knowledge_files'}
         WHERE user_id = ? AND status = 'active' GROUP BY folder_id
       ) cnt ON cnt.folder_id = f.id
       WHERE f.user_id = ? AND f.type = ?
       ORDER BY f.sort_order, f.name`,
      [userId, userId, type],
    )) as any[];

    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

folderRouter.post('/create', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { name, type, parentId } = req.body;
    const trimmed = (name || '').trim();
    if (!trimmed) return res.json({ success: false, error: '文件夹名不能为空' });

    const pool = getPool();
    // Check duplicate
    const [existing] =
      parentId != null
        ? ((await pool.execute('SELECT id FROM folders WHERE user_id = ? AND name = ? AND parent_id = ? AND type = ?', [
            userId,
            trimmed,
            parentId,
            type,
          ])) as any[])
        : ((await pool.execute(
            'SELECT id FROM folders WHERE user_id = ? AND name = ? AND parent_id IS NULL AND type = ?',
            [userId, trimmed, type],
          )) as any[]);
    if (existing.length > 0) return res.json({ success: false, error: '同名文件夹已存在' });

    await pool.execute('INSERT INTO folders (user_id, name, parent_id, type, created_at) VALUES (?, ?, ?, ?, ?)', [
      userId,
      trimmed,
      parentId ?? null,
      type,
      nowMySQL(),
    ]);

    const [created] = (await pool.execute(
      'SELECT * FROM folders WHERE user_id = ? AND name = ? AND type = ? ORDER BY id DESC LIMIT 1',
      [userId, trimmed, type],
    )) as any[];

    return res.json({ success: true, data: created[0] });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

folderRouter.post('/:id/rename', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { name } = req.body;
    const trimmed = (name || '').trim();
    if (!trimmed) return res.json({ success: false, error: '文件夹名不能为空' });
    const pool = getPool();
    await pool.execute('UPDATE folders SET name = ? WHERE id = ? AND user_id = ?', [trimmed, req.params.id, userId]);
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

folderRouter.post('/:id/delete', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const pool = getPool();
    await pool.execute('DELETE FROM folders WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

folderRouter.post('/move-item', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { itemType, itemId, folderId } = req.body;
    const pool = getPool();
    const table = itemType === 'blog' ? 'blogs' : 'knowledge_files';
    await pool.execute(`UPDATE ${table} SET folder_id = ?, updated_at = ? WHERE id = ? AND user_id = ?`, [
      folderId ?? null,
      nowMySQL(),
      itemId,
      userId,
    ]);
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});
