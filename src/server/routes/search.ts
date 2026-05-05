import { Router } from 'express';
import { getPool } from '../db';
import { requireAuth, type AuthRequest } from '../middleware/auth';

export const searchRouter = Router();
searchRouter.use(requireAuth);

searchRouter.post('/global', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const { query } = req.body;
    if (!query?.trim()) return res.json({ success: true, data: { blogs: [], knowledge: [] } });

    const pool = getPool();
    const like = `%${query}%`;

    const [blogs] = await pool.execute(
      `SELECT id, title, 'title' as match_field FROM blogs
       WHERE user_id = ? AND status = 'active' AND title LIKE ?
       UNION
       SELECT id, title, 'content' as match_field FROM blogs
       WHERE user_id = ? AND status = 'active' AND content LIKE ?
       LIMIT 20`,
      [userId, like, userId, like],
    ) as any[];

    const [knowledge] = await pool.execute(
      `SELECT id, filename as title, file_type as match_field FROM knowledge_files
       WHERE user_id = ? AND status = 'active' AND filename LIKE ?
       LIMIT 20`,
      [userId, like],
    ) as any[];

    return res.json({ success: true, data: { blogs, knowledge } });
  } catch (err) { return res.json({ success: false, error: (err as Error).message }); }
});

searchRouter.post('/blogs', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const { query } = req.body;
    if (!query?.trim()) return res.json({ success: true, data: [] });

    const pool = getPool();
    const like = `%${query}%`;
    const [rows] = await pool.execute(
      `SELECT id, title, 'title' as match_field FROM blogs
       WHERE user_id = ? AND status = 'active' AND title LIKE ?
       UNION
       SELECT id, title, 'content' as match_field FROM blogs
       WHERE user_id = ? AND status = 'active' AND content LIKE ?
       LIMIT 20`,
      [userId, like, userId, like],
    ) as any[];

    return res.json({ success: true, data: rows });
  } catch (err) { return res.json({ success: false, error: (err as Error).message }); }
});

searchRouter.post('/kb', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const { query } = req.body;
    if (!query?.trim()) return res.json({ success: true, data: [] });

    const pool = getPool();
    const like = `%${query}%`;
    const [rows] = await pool.execute(
      `SELECT id, filename as title, file_type as match_field FROM knowledge_files
       WHERE user_id = ? AND status = 'active' AND filename LIKE ?
       LIMIT 20`,
      [userId, like],
    ) as any[];

    return res.json({ success: true, data: rows });
  } catch (err) { return res.json({ success: false, error: (err as Error).message }); }
});
