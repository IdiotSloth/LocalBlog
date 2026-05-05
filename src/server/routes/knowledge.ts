import { Router } from 'express';
import { getPool } from '../db';
import { requireAuth, type AuthRequest } from '../middleware/auth';

export const knowledgeRouter = Router();
knowledgeRouter.use(requireAuth);

function mapFile(f: any, tags: any[] = []) {
  return {
    id: f.id, userId: f.user_id, filename: f.filename, filePath: f.file_path,
    fileType: f.file_type, fileSize: f.file_size, status: f.status,
    createdAt: f.created_at, updatedAt: f.updated_at,
    tags: tags.map((t: any) => ({ id: t.id, userId: t.user_id, name: t.name })),
  };
}

const VALID_SORT_BY = ['created_at', 'updated_at', 'filename', 'file_size'] as const;
const VALID_SORT_ORDER = ['asc', 'desc'] as const;

knowledgeRouter.get('/list', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const pool = getPool();
    const query = (req.query.query as string) || '';
    const fileType = req.query.fileType as string | undefined;
    const sortBy = VALID_SORT_BY.includes(req.query.sortBy as any) ? req.query.sortBy : 'created_at';
    const sortOrder = VALID_SORT_ORDER.includes(req.query.sortOrder as any) ? req.query.sortOrder : 'desc';
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));

    let where = 'user_id = ? AND status = ?';
    const params: any[] = [userId, 'active'];
    if (query) { where += ' AND filename LIKE ?'; params.push(`%${query}%`); }
    if (fileType) { where += ' AND file_type = ?'; params.push(fileType); }

    const [rows] = await pool.execute(
      `SELECT * FROM knowledge_files WHERE ${where} ORDER BY ${sortBy} ${sortOrder} LIMIT ${limit} OFFSET ${offset}`, params
    ) as any[];

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM knowledge_files WHERE ${where}`, params
    ) as any[];

    const files = await Promise.all(rows.map(async (f: any) => {
      const [tags] = await pool.execute(
        'SELECT t.* FROM tags t JOIN knowledge_file_tags kft ON kft.tag_id = t.id WHERE kft.file_id = ?', [f.id]
      ) as any[];
      return mapFile(f, tags);
    }));

    return res.json({ success: true, data: { files, total } });
  } catch (err) { return res.json({ success: false, error: (err as Error).message }); }
});

knowledgeRouter.get('/:id', async (req: AuthRequest, res) => {
  try {
    const uid = req.userId;
    if (!uid) return res.status(401).json({ success: false, error: '未登录' });
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM knowledge_files WHERE id = ? AND user_id = ?', [req.params.id, uid]) as any[];
    if (rows.length === 0) return res.json({ success: false, error: '文件不存在' });
    const f = rows[0];
    const [tags] = await pool.execute(
      'SELECT t.* FROM tags t JOIN knowledge_file_tags kft ON kft.tag_id = t.id WHERE kft.file_id = ?', [f.id]
    ) as any[];
    return res.json({ success: true, data: mapFile(f, tags) });
  } catch (err) { return res.json({ success: false, error: (err as Error).message }); }
});

knowledgeRouter.post('/import', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const { filePaths = [] } = req.body;
    const files = [];
    const pool = getPool();
    const typeMap: Record<string, string> = { docx: 'docx', doc: 'docx', xlsx: 'xlsx', xls: 'xlsx', pdf: 'pdf', txt: 'txt', md: 'txt', png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', svg: 'image' };

    for (const filePath of filePaths) {
      const filename = filePath.split(/[/\\]/).pop() || 'unknown';
      const ext = (filename.split('.').pop() || '').toLowerCase();
      const fileType = typeMap[ext] || 'other';
      const [result] = await pool.execute(
        'INSERT INTO knowledge_files (user_id, filename, file_path, file_type) VALUES (?, ?, ?, ?)',
        [userId, filename, filePath, fileType],
      ) as any[];
      files.push({ id: result.insertId, userId, filename, filePath, fileType, fileSize: 0, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), tags: [] });
    }
    return res.json({ success: true, data: files });
  } catch (err) { return res.json({ success: false, error: (err as Error).message }); }
});

knowledgeRouter.post('/:id/delete', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const pool = getPool();
    const [[f]] = await pool.execute('SELECT * FROM knowledge_files WHERE id = ? AND user_id = ?', [req.params.id, userId]) as any[];
    if (!f) return res.json({ success: false, error: '文件不存在' });
    await pool.execute("UPDATE knowledge_files SET status = 'trash' WHERE id = ?", [req.params.id]);
    await pool.execute('INSERT INTO recycle_bin (user_id, item_type, item_id) VALUES (?, ?, ?)', [userId, 'knowledge_file', req.params.id]);
    return res.json({ success: true });
  } catch (err) { return res.json({ success: false, error: (err as Error).message }); }
});

knowledgeRouter.post('/:id/restore', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const pool = getPool();
    await pool.execute("UPDATE knowledge_files SET status = 'active' WHERE id = ? AND user_id = ?", [req.params.id, userId]);
    await pool.execute("DELETE FROM recycle_bin WHERE item_type = 'knowledge_file' AND item_id = ?", [req.params.id]);
    return res.json({ success: true });
  } catch (err) { return res.json({ success: false, error: (err as Error).message }); }
});

knowledgeRouter.post('/:id/rename', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const { newFilename } = req.body;
    if (!newFilename?.trim()) return res.json({ success: false, error: '文件名不能为空' });
    const pool = getPool();
    await pool.execute('UPDATE knowledge_files SET filename = ?, updated_at = NOW() WHERE id = ? AND user_id = ?', [newFilename.trim(), req.params.id, userId]);
    return res.json({ success: true });
  } catch (err) { return res.json({ success: false, error: (err as Error).message }); }
});

knowledgeRouter.get('/:id/preview', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM knowledge_files WHERE id = ? AND user_id = ?', [req.params.id, userId]) as any[];
    if (rows.length === 0) return res.json({ success: false, error: '文件不存在' });
    const f = rows[0];
    // Web version: return file metadata; actual preview handled by frontend
    return res.json({ success: true, data: { filename: f.filename, fileType: f.file_type, filePath: f.file_path } });
  } catch (err) { return res.json({ success: false, error: (err as Error).message }); }
});

knowledgeRouter.post('/:id/tags', async (req: AuthRequest, res) => {
  try {
    const uid = req.userId;
    if (!uid) return res.status(401).json({ success: false, error: '未登录' });
    const { tagIds } = req.body;
    const pool = getPool();
    const [[kf]] = await pool.execute('SELECT id FROM knowledge_files WHERE id = ? AND user_id = ?', [req.params.id, uid]) as any[];
    if (!kf) return res.json({ success: false, error: '文件不存在' });
    await pool.execute('DELETE FROM knowledge_file_tags WHERE file_id = ?', [req.params.id]);
    for (const tagId of tagIds || []) {
      await pool.execute('INSERT IGNORE INTO knowledge_file_tags (file_id, tag_id) VALUES (?, ?)', [req.params.id, tagId]);
    }
    return res.json({ success: true });
  } catch (err) { return res.json({ success: false, error: (err as Error).message }); }
});
