import { Router } from 'express';
import { getSharedBlogList } from '../../shared/handlers/blog-list';
import {
  buildBlogCreate,
  buildBlogDeleteById,
  buildBlogDraftInsert,
  buildBlogDraftSelect,
  buildBlogHistorySelectByUser,
  buildBlogOwnershipCheck,
  buildBlogRestore,
  buildBlogSelectByUser,
  buildBlogTagsDelete,
  buildBlogUpdate,
  buildRecycleDeleteByType,
  buildRecycleInsert,
  mapBlogRow,
} from '../../shared/handlers/blog-crud';
import { blogCreateSchema, blogUpdateSchema } from '../../shared/validation';
import { nowMySQL } from '../config';
import { getPool } from '../db';
import { type AuthRequest, requireAuth } from '../middleware/auth';

export const blogRouter = Router();
blogRouter.use(requireAuth);

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
      excludeSeries: req.query.excludeSeries === 'true' ? true : undefined,
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
    const { sql, params } = buildBlogSelectByUser(Number(req.params.id), userId);
    const [rows] = (await pool.execute(sql, params)) as any[];
    if (rows.length === 0) return res.json({ success: false, error: '博客不存在' });
    const b = rows[0];
    const [tags] = (await pool.execute(
      'SELECT t.* FROM tags t JOIN blog_tags bt ON bt.tag_id = t.id WHERE bt.blog_id = ?',
      [b.id],
    )) as any[];
    return res.json({ success: true, data: { ...mapBlogRow(b), content: b.content || '', tags: tags.map((t: any) => ({ id: t.id, userId: t.user_id, name: t.name })) } });
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
    const { sql, params } = buildBlogCreate(userId, title.trim(), format, content);
    const [result] = (await pool.execute(sql, params)) as any[];

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

    if (title !== undefined && content !== undefined) {
      // Full update — use shared builder
      const [existingRows] = (await pool.execute('SELECT format FROM blogs WHERE id = ? AND user_id = ?', [req.params.id, userId])) as any[];
      const existingFormat = existingRows[0]?.format || 'md';
      const { sql, params } = buildBlogUpdate(Number(req.params.id), userId, title, content, existingFormat);
      await pool.execute(sql, params);
    } else {
      // Partial update — build dynamic SET clause inline
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
    }

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
    const { sql: checkSql, params: checkParams } = buildBlogSelectByUser(Number(req.params.id), userId);
    const [[blog]] = (await pool.execute(checkSql, checkParams)) as any[];
    if (!blog) return res.json({ success: false, error: '博客不存在' });

    const { sql: deleteSql, params: deleteParams } = buildBlogDeleteById(Number(req.params.id));
    await pool.execute(deleteSql, deleteParams);
    const { sql: recycleSql, params: recycleParams } = buildRecycleInsert(userId, 'blog', Number(req.params.id));
    await pool.execute(recycleSql, recycleParams);
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
    const { sql, params } = buildBlogRestore(Number(req.params.id), userId);
    await pool.execute(sql, params);
    const { sql: recycleSql, params: recycleParams } = buildRecycleDeleteByType('blog', Number(req.params.id));
    await pool.execute(recycleSql, recycleParams);
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
      const { sql, params } = buildBlogCreate(userId, title.substring(0, 100), 'md', content);
      const [result] = (await pool.execute(sql, params)) as any[];
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
    const { sql: checkSql, params: checkParams } = buildBlogOwnershipCheck(Number(blogId), userId);
    const [blogs] = (await pool.execute(checkSql, checkParams)) as any[];
    if (!blogs.length) return res.json({ success: false, error: '博客不存在' });
    const { sql: draftSql, params: draftParams } = buildBlogDraftInsert(Number(blogId), content);
    await pool.execute(draftSql, draftParams);
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
    const { sql, params } = buildBlogHistorySelectByUser(Number(req.params.id), userId);
    const [rows] = (await pool.execute(sql, params)) as any[];
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
    const { sql, params } = buildBlogDraftSelect(Number(draftId), Number(req.params.id));
    const [drafts] = (await pool.execute(sql, params)) as any[];
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
    const { sql: checkSql, params: checkParams } = buildBlogOwnershipCheck(Number(req.params.id), uid);
    const [[b]] = (await pool.execute(checkSql, checkParams)) as any[];
    if (!b) return res.json({ success: false, error: '博客不存在' });
    const { sql: delSql, params: delParams } = buildBlogTagsDelete(Number(req.params.id));
    await pool.execute(delSql, delParams);
    for (const tagId of tagIds || []) {
      await pool.execute('INSERT IGNORE INTO blog_tags (blog_id, tag_id) VALUES (?, ?)', [req.params.id, tagId]);
    }
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});
