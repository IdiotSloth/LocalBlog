import { Router } from 'express';
import { getPool } from '../db';
import { requireAuth, type AuthRequest } from '../middleware/auth';

export const tagRouter = Router();
tagRouter.use(requireAuth);

tagRouter.get('/list', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT t.id, t.user_id as userId, t.name,
        (SELECT COUNT(*) FROM blog_tags bt WHERE bt.tag_id = t.id) +
        (SELECT COUNT(*) FROM knowledge_file_tags kft WHERE kft.tag_id = t.id) as count
       FROM tags t WHERE t.user_id = ? ORDER BY t.name`, [userId],
    ) as any[];
    return res.json(rows); // IPC handler returns raw array, not {success,data}
  } catch (err) { return res.json({ success: false, error: (err as Error).message }); }
});

tagRouter.post('/create', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const { name } = req.body;
    if (!name?.trim()) return res.json({ success: false, error: '标签名不能为空' });
    const pool = getPool();
    const [existing] = await pool.execute('SELECT id FROM tags WHERE user_id = ? AND name = ?', [userId, name.trim()]) as any[];
    if (existing.length > 0) return res.json({ success: false, error: '标签已存在' });
    const [result] = await pool.execute('INSERT INTO tags (user_id, name) VALUES (?, ?)', [userId, name.trim()]) as any[];
    return res.json({ success: true, data: { id: result.insertId, userId, name: name.trim(), count: 0 } });
  } catch (err) { return res.json({ success: false, error: (err as Error).message }); }
});

tagRouter.post('/:id/update', async (req: AuthRequest, res) => {
  try {
    const uid = req.userId;
    if (!uid) return res.status(401).json({ success: false, error: '未登录' });
    const { name } = req.body;
    if (!name?.trim()) return res.json({ success: false, error: '标签名不能为空' });
    const pool = getPool();
    await pool.execute('UPDATE tags SET name = ? WHERE id = ? AND user_id = ?', [name.trim(), req.params.id, uid]);
    return res.json({ success: true });
  } catch (err) { return res.json({ success: false, error: (err as Error).message }); }
});

tagRouter.post('/:id/delete', async (req: AuthRequest, res) => {
  try {
    const uid = req.userId;
    if (!uid) return res.status(401).json({ success: false, error: '未登录' });
    const pool = getPool();
    await pool.execute('DELETE FROM tags WHERE id = ? AND user_id = ?', [req.params.id, uid]);
    return res.json({ success: true });
  } catch (err) { return res.json({ success: false, error: (err as Error).message }); }
});
