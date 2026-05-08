import { Router } from 'express';
import { getSharedBlogList } from '../../shared/handlers/blog-list';
import { blogCreateSchema, blogUpdateSchema } from '../../shared/validation';
import { nowMySQL } from '../config';
import { getPool } from '../db';
import { type AuthRequest, requireAuth } from '../middleware/auth';

export const blogRouter = Router();
blogRouter.use(requireAuth);

function mapBlog(b: any, tags: any[] = []) {
  return {
    id: b.id,
    userId: b.user_id,
    title: b.title,
    format: b.format,
    status: b.status,
    content: b.content || '',
    createdAt: b.created_at,
    updatedAt: b.updated_at,
    tags: tags.map((t: any) => ({ id: t.id, userId: t.user_id, name: t.name })),
  };
}

blogRouter.get('/list', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const pool = getPool();
    const dbAll = (sql: string, params: unknown[]) => pool.execute(sql, params).then(([rows]) => rows as any[]);
    const dbGet = (sql: string, params: unknown[]) => pool.execute(sql, params).then(([rows]) => (rows as any[])[0]);

    const result = await getSharedBlogList(dbAll, dbGet, {
      userId,
      tagId: req.query.tagId ? Number(req.query.tagId) : undefined,
      query: (req.query.query as string) || undefined,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as string,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

blogRouter.get('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const pool = getPool();
    const [rows] = (await pool.execute('SELECT * FROM blogs WHERE id = ? AND user_id = ?', [
      req.params.id,
      userId,
    ])) as any[];
    if (rows.length === 0) return res.json({ success: false, error: '博客不存在' });
    const b = rows[0];
    const [tags] = (await pool.execute(
      'SELECT t.* FROM tags t JOIN blog_tags bt ON bt.tag_id = t.id WHERE bt.blog_id = ?',
      [b.id],
    )) as any[];
    return res.json({ success: true, data: mapBlog(b, tags) });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

blogRouter.post('/create', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const parsed = blogCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.json({ success: false, error: parsed.error.issues[0]?.message || '参数错误' });
    const { title, format, content } = parsed.data;

    const pool = getPool();
    const now = nowMySQL();
    const [result] = (await pool.execute(
      'INSERT INTO blogs (user_id, title, format, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, title.trim(), format, content, now, now],
    )) as any[];

    return res.json({
      success: true,
      data: {
        id: result.insertId,
        userId,
        title,
        format,
        content,
        status: 'active',
        createdAt: nowMySQL(),
        updatedAt: nowMySQL(),
        tags: [],
      },
    });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

blogRouter.post('/:id/update', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const bp = blogUpdateSchema.safeParse(req.body);
    if (!bp.success) return res.json({ success: false, error: bp.error.issues[0]?.message || '参数错误' });
    const { title, content } = bp.data;
    const pool = getPool();
    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content);
    }
    if (updates.length === 0) return res.json({ success: false, error: '无更新内容' });

    updates.push('updated_at = ?');
    params.push(nowMySQL());
    params.push(req.params.id, userId);
    await pool.execute(`UPDATE blogs SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);

    // Also save content to drafts for history
    if (content !== undefined) {
      await pool.execute('INSERT INTO blog_drafts (blog_id, content) VALUES (?, ?)', [req.params.id, content]);
    }

    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

blogRouter.post('/:id/delete', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const pool = getPool();
    const [[blog]] = (await pool.execute('SELECT * FROM blogs WHERE id = ? AND user_id = ?', [
      req.params.id,
      userId,
    ])) as any[];
    if (!blog) return res.json({ success: false, error: '博客不存在' });

    await pool.execute("UPDATE blogs SET status = 'trash', updated_at = ? WHERE id = ?", [nowMySQL(), req.params.id]);
    await pool.execute('INSERT INTO recycle_bin (user_id, item_type, item_id, deleted_at) VALUES (?, ?, ?, ?)', [
      userId,
      'blog',
      req.params.id,
      nowMySQL(),
    ]);
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

blogRouter.post('/:id/restore', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const pool = getPool();
    await pool.execute("UPDATE blogs SET status = 'active', updated_at = ? WHERE id = ? AND user_id = ?", [
      nowMySQL(),
      req.params.id,
      userId,
    ]);
    await pool.execute("DELETE FROM recycle_bin WHERE item_type = 'blog' AND item_id = ?", [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

blogRouter.post('/import-md', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const { filePaths = [], contents = [] } = req.body;
    const items = contents.length > 0 ? contents : filePaths;
    if (!items.length) return res.json({ success: false, error: '请提供文件路径或内容' });
    const blogs = [];
    const pool = getPool();
    for (const item of items) {
      const title = typeof item === 'string' ? item.substring(0, 50) || '未命名' : item.title || '导入文章';
      const content = typeof item === 'string' ? item : item.content || '';
      const now = nowMySQL();
      const [result] = (await pool.execute(
        'INSERT INTO blogs (user_id, title, format, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, title.substring(0, 100), 'md', content, now, now],
      )) as any[];
      blogs.push({ id: result.insertId, userId, title, format: 'md', content, status: 'active', tags: [] });
    }
    return res.json({ success: true, data: blogs });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

blogRouter.post('/save-draft', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const { blogId, content } = req.body;
    const pool = getPool();
    // Verify blog ownership
    const [blogs] = (await pool.execute('SELECT id FROM blogs WHERE id = ? AND user_id = ?', [blogId, userId])) as any[];
    if (!blogs.length) return res.json({ success: false, error: '博客不存在' });
    await pool.execute('INSERT INTO blog_drafts (blog_id, content, saved_at) VALUES (?, ?, ?)', [
      blogId,
      content,
      nowMySQL(),
    ]);
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

blogRouter.get('/:id/history', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const pool = getPool();
    const [rows] = (await pool.execute(
      `SELECT bd.* FROM blog_drafts bd JOIN blogs b ON b.id = bd.blog_id
       WHERE bd.blog_id = ? AND b.user_id = ? ORDER BY bd.saved_at DESC LIMIT 20`,
      [req.params.id, userId],
    )) as any[];
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

blogRouter.post('/:id/rollback', async (req: AuthRequest, res) => {
  try {
    const uid = req.userId;
    if (!uid) return res.status(401).json({ success: false, error: '未登录' });
    const { draftId } = req.body;
    const pool = getPool();
    const [drafts] = (await pool.execute('SELECT * FROM blog_drafts WHERE id = ? AND blog_id = ?', [
      draftId,
      req.params.id,
    ])) as any[];
    if (drafts.length === 0) return res.json({ success: false, error: '草稿不存在' });
    const draft = drafts[0];
    await pool.execute('UPDATE blogs SET content = ?, updated_at = ? WHERE id = ? AND user_id = ?', [
      draft.content,
      nowMySQL(),
      req.params.id,
      uid,
    ]);
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

blogRouter.post('/:id/tags', async (req: AuthRequest, res) => {
  try {
    const uid = req.userId;
    if (!uid) return res.status(401).json({ success: false, error: '未登录' });
    const { tagIds } = req.body;
    const pool = getPool();
    // Verify blog ownership
    const [[b]] = (await pool.execute('SELECT id FROM blogs WHERE id = ? AND user_id = ?', [
      req.params.id,
      uid,
    ])) as any[];
    if (!b) return res.json({ success: false, error: '博客不存在' });
    await pool.execute('DELETE FROM blog_tags WHERE blog_id = ?', [req.params.id]);
    for (const tagId of tagIds || []) {
      await pool.execute('INSERT IGNORE INTO blog_tags (blog_id, tag_id) VALUES (?, ?)', [req.params.id, tagId]);
    }
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});
