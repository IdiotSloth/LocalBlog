import fs from 'node:fs';
import { Router } from 'express';
import { getSharedKnowledgeList } from '../../shared/handlers/knowledge-list';
import {
  buildKnowledgeCreate,
  buildKnowledgeDeleteById,
  buildKnowledgeOwnershipCheck,
  buildKnowledgeRenameFilename,
  buildKnowledgeRestore,
  buildKnowledgeSelectByUser,
  buildKnowledgeTagsDelete,
  buildKnowledgeTagsSelect,
} from '../../shared/handlers/knowledge-crud';
import { buildRecycleDeleteByType, buildRecycleInsert } from '../../shared/handlers/blog-crud';
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
    const { sql, params } = buildKnowledgeSelectByUser(Number(req.params.id), uid);
    const [rows] = (await pool.execute(sql, params)) as any[];
    if (rows.length === 0) return res.json({ success: false, error: '文件不存在' });
    const f = rows[0];
    const { sql: tagSql, params: tagParams } = buildKnowledgeTagsSelect(f.id);
    const [tags] = (await pool.execute(tagSql, tagParams)) as any[];
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
      let fileSize = 0;
      try {
        fileSize = fs.statSync(filePath).size;
      } catch {
        /* file may not exist on server */
      }
      const { sql, params } = buildKnowledgeCreate(userId, filename, filePath, fileType, fileSize, '');
      const [result] = (await pool.execute(sql, params)) as any[];
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
    const { sql: checkSql, params: checkParams } = buildKnowledgeSelectByUser(Number(req.params.id), userId);
    const [[f]] = (await pool.execute(checkSql, checkParams)) as any[];
    if (!f) return res.json({ success: false, error: '文件不存在' });
    const { sql: delSql, params: delParams } = buildKnowledgeDeleteById(Number(req.params.id));
    await pool.execute(delSql, delParams);
    const { sql: recycleSql, params: recycleParams } = buildRecycleInsert(userId, 'knowledge_file', Number(req.params.id));
    await pool.execute(recycleSql, recycleParams);
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
    const { sql, params } = buildKnowledgeRestore(Number(req.params.id), userId);
    await pool.execute(sql, params);
    const { sql: recycleSql, params: recycleParams } = buildRecycleDeleteByType('knowledge_file', Number(req.params.id));
    await pool.execute(recycleSql, recycleParams);
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
    const { sql, params } = buildKnowledgeRenameFilename(Number(req.params.id), userId, newFilename.trim());
    await pool.execute(sql, params);
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
    const { sql, params } = buildKnowledgeSelectByUser(Number(req.params.id), userId);
    const [rows] = (await pool.execute(sql, params)) as any[];
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
    const { sql: checkSql, params: checkParams } = buildKnowledgeOwnershipCheck(Number(req.params.id), uid);
    const [[kf]] = (await pool.execute(checkSql, checkParams)) as any[];
    if (!kf) return res.json({ success: false, error: '文件不存在' });
    const { sql: delSql, params: delParams } = buildKnowledgeTagsDelete(Number(req.params.id));
    await pool.execute(delSql, delParams);
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
