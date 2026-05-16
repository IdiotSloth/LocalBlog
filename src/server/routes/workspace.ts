import { Router } from 'express';
import { getPool } from '../db';
import { type AuthRequest, requireAuth } from '../middleware/auth';

export const workspaceRouter = Router();
workspaceRouter.use(requireAuth);

workspaceRouter.get('/info', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const pool = getPool();

    const [[{ blogCount }]] = (await pool.execute(
      "SELECT COUNT(*) as blogCount FROM blogs WHERE user_id = ? AND status = 'active'",
      [userId],
    )) as any[];
    const [[{ knowledgeCount }]] = (await pool.execute(
      "SELECT COUNT(*) as knowledgeCount FROM knowledge_files WHERE user_id = ? AND status = 'active'",
      [userId],
    )) as any[];
    const [[{ tagCount }]] = (await pool.execute('SELECT COUNT(*) as tagCount FROM tags WHERE user_id = ?', [
      userId,
    ])) as any[];

    // Get workspace path from user record
    const [[user]] = (await pool.execute('SELECT workspace_path FROM users WHERE id = ?', [userId])) as any[];

    return res.json({
      path: user?.workspace_path || '',
      totalFiles: (blogCount || 0) + (knowledgeCount || 0),
      blogCount: blogCount || 0,
      knowledgeCount: knowledgeCount || 0,
      tagCount: tagCount || 0,
      storageSize: 0,
    });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});
