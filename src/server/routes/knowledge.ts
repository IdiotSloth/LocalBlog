import fs from 'node:fs';
import { Router } from 'express';
import { getSharedKnowledgeList } from '../../shared/handlers/knowledge-list';
import { nowMySQL } from '../config';
import { getPool } from '../db';
import { type AuthRequest, requireAuth } from '../middleware/auth';

export const knowledgeRouter = Router();
knowledgeRouter.use(requireAuth);

function mapFile(f: any, tags: any[] = []) {
  return {
    id: f.id,
    userId: f.user_id,
    filename: f.filename,
    filePath: f.file_path,
    fileType: f.file_type,
    fileSize: f.file_size,
    status: f.status,
    createdAt: f.created_at,
    updatedAt: f.updated_at,
    tags: tags.map((t: any) => ({ id: t.id, userId: t.user_id, name: t.name })),
  };
}

knowledgeRouter.get('/list', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const pool = getPool();
    const dbAll = (sql: string, params: unknown[]) => pool.execute(sql, params).then(([rows]) => rows as any[]);
    const dbGet = (sql: string, params: unknown[]) => pool.execute(sql, params).then(([rows]) => (rows as any[])[0]);

    const result = await getSharedKnowledgeList(dbAll, dbGet, {
      userId,
      query: req.query.query as string | undefined,
      fileType: req.query.fileType as string | undefined,
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

knowledgeRouter.get('/:id', async (req: AuthRequest, res) => {
  try {
    const uid = req.userId;
    if (!uid) return res.status(401).json({ success: false, error: '未登录' });
    const pool = getPool();
    const [rows] = (await pool.execute('SELECT * FROM knowledge_files WHERE id = ? AND user_id = ?', [
      req.params.id,
      uid,
    ])) as any[];
    if (rows.length === 0) return res.json({ success: false, error: '文件不存在' });
    const f = rows[0];
    const [tags] = (await pool.execute(
      'SELECT t.* FROM tags t JOIN knowledge_file_tags kft ON kft.tag_id = t.id WHERE kft.file_id = ?',
      [f.id],
    )) as any[];
    return res.json({ success: true, data: mapFile(f, tags) });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

knowledgeRouter.post('/import', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const { filePaths = [] } = req.body;
    const files = [];
    const pool = getPool();
    const typeMap: Record<string, string> = {
      docx: 'docx',
      doc: 'docx',
      xlsx: 'xlsx',
      xls: 'xlsx',
      pdf: 'pdf',
      txt: 'txt',
      md: 'txt',
      png: 'image',
      jpg: 'image',
      jpeg: 'image',
      gif: 'image',
      webp: 'image',
      svg: 'image',
    };

    for (const filePath of filePaths) {
      const filename = filePath.split(/[/\\]/).pop() || 'unknown';
      const ext = (filename.split('.').pop() || '').toLowerCase();
      const fileType = typeMap[ext] || 'other';
      const now = nowMySQL();
      let fileSize = 0;
      try {
        fileSize = fs.statSync(filePath).size;
      } catch {
        /* file may not exist on server */
      }
      const [result] = (await pool.execute(
        'INSERT INTO knowledge_files (user_id, filename, file_path, file_type, file_size, content_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, filename, filePath, fileType, fileSize, '', now, now],
      )) as any[];
      files.push({
        id: result.insertId,
        userId,
        filename,
        filePath,
        fileType,
        fileSize,
        status: 'active',
        createdAt: nowMySQL(),
        updatedAt: nowMySQL(),
        tags: [],
      });
    }
    return res.json({ success: true, data: files });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

knowledgeRouter.post('/:id/delete', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const pool = getPool();
    const [[f]] = (await pool.execute('SELECT * FROM knowledge_files WHERE id = ? AND user_id = ?', [
      req.params.id,
      userId,
    ])) as any[];
    if (!f) return res.json({ success: false, error: '文件不存在' });
    await pool.execute("UPDATE knowledge_files SET status = 'trash' WHERE id = ?", [req.params.id]);
    await pool.execute('INSERT INTO recycle_bin (user_id, item_type, item_id, deleted_at) VALUES (?, ?, ?, ?)', [
      userId,
      'knowledge_file',
      req.params.id,
      nowMySQL(),
    ]);
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

knowledgeRouter.post('/:id/restore', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const pool = getPool();
    await pool.execute("UPDATE knowledge_files SET status = 'active' WHERE id = ? AND user_id = ?", [
      req.params.id,
      userId,
    ]);
    await pool.execute("DELETE FROM recycle_bin WHERE item_type = 'knowledge_file' AND item_id = ?", [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

knowledgeRouter.post('/:id/rename', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const { newFilename } = req.body;
    if (!newFilename?.trim()) return res.json({ success: false, error: '文件名不能为空' });
    const pool = getPool();
    await pool.execute('UPDATE knowledge_files SET filename = ?, updated_at = ? WHERE id = ? AND user_id = ?', [
      newFilename.trim(),
      nowMySQL(),
      req.params.id,
      userId,
    ]);
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

knowledgeRouter.get('/:id/preview', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const pool = getPool();
    const [rows] = (await pool.execute('SELECT * FROM knowledge_files WHERE id = ? AND user_id = ?', [
      req.params.id,
      userId,
    ])) as any[];
    if (rows.length === 0) return res.json({ success: false, error: '文件不存在' });
    const f = rows[0];
    // Web version: return file metadata; actual preview handled by frontend
    return res.json({ success: true, data: { filename: f.filename, fileType: f.file_type, filePath: f.file_path } });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

knowledgeRouter.post('/:id/tags', async (req: AuthRequest, res) => {
  try {
    const uid = req.userId;
    if (!uid) return res.status(401).json({ success: false, error: '未登录' });
    const { tagIds } = req.body;
    const pool = getPool();
    const [[kf]] = (await pool.execute('SELECT id FROM knowledge_files WHERE id = ? AND user_id = ?', [
      req.params.id,
      uid,
    ])) as any[];
    if (!kf) return res.json({ success: false, error: '文件不存在' });
    await pool.execute('DELETE FROM knowledge_file_tags WHERE file_id = ?', [req.params.id]);
    for (const tagId of tagIds || []) {
      await pool.execute('INSERT IGNORE INTO knowledge_file_tags (file_id, tag_id) VALUES (?, ?)', [
        req.params.id,
        tagId,
      ]);
    }
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});
