import fs from 'node:fs';
import path from 'node:path';
import { SUPPORTED_KB_EXTENSIONS } from '../../shared/constants';
import {
  buildKnowledgeCreate,
  buildKnowledgeDelete,
  buildKnowledgeRename,
  buildKnowledgeRestore,
  buildKnowledgeSelect,
  buildKnowledgeSelectTrash,
  buildKnowledgeTagsDelete,
  buildKnowledgeTagsSelect,
} from '../../shared/handlers/knowledge-crud';
import { buildRecycleDelete, buildRecycleInsert } from '../../shared/handlers/blog-crud';
import type { FileType, KnowledgeFile, KnowledgeFileWithTags, Tag } from '../../shared/types';
import { dbAll, dbGet, dbRun } from '../db';
import { getKnowledgeBaseDir, initWorkspaceDirectories } from '../utils/paths';

interface KbFileRow {
  id: number;
  user_id: number;
  filename: string;
  file_path: string;
  file_type: string;
  file_size: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export class KnowledgeService {
  static async importFiles(userId: number, filePaths: string[], copyToWorkspace: boolean): Promise<KnowledgeFile[]> {
    const kbDir = await getKnowledgeBaseDir(userId);
    if (!fs.existsSync(kbDir)) initWorkspaceDirectories(kbDir.replace(/KnowledgeBase$/, ''));
    const imported: KnowledgeFile[] = [];
    for (const srcPath of filePaths) {
      if (!fs.existsSync(srcPath)) continue;
      const ext = path.extname(srcPath).toLowerCase();
      if (!SUPPORTED_KB_EXTENSIONS.includes(ext)) continue;
      const originalName = path.basename(srcPath);
      const fileType = KnowledgeService.detectFileType(ext);
      const stat = fs.statSync(srcPath);
      let destPath: string;
      if (copyToWorkspace) {
        let destName = originalName;
        const existing = await dbGet<KbFileRow>(
          'SELECT * FROM knowledge_files WHERE user_id = ? AND filename = ? AND status = ?',
          [userId, destName, 'active'],
        );
        if (existing) {
          const ts = Date.now();
          const parsed = path.parse(originalName);
          destName = `${parsed.name}_${ts}${parsed.ext}`;
        }
        destPath = path.join(kbDir, destName);
        fs.copyFileSync(srcPath, destPath);
      } else {
        destPath = srcPath;
      }
      // Extract text content for search indexing (up to 100KB)
      let contentText = '';
      try {
        if (['.txt', '.md'].includes(ext)) {
          contentText = fs.readFileSync(destPath, 'utf-8').substring(0, 102400);
        } else if (['.docx', '.doc'].includes(ext)) {
          const mammoth = await import('mammoth');
          const result = await mammoth.extractRawText({ path: destPath });
          contentText = result.value.substring(0, 102400);
        } else if (['.xlsx', '.xls'].includes(ext)) {
          const ExcelJS = (await import('exceljs')).default;
          const wb = new ExcelJS.Workbook();
          await wb.xlsx.readFile(destPath);
          contentText = wb.worksheets
            .map((ws) => {
              const lines: string[] = [];
              ws.eachRow((row) => {
                lines.push(Array.isArray(row.values) ? row.values.join(' ') : String(row.values || ''));
              });
              return lines.join('\n');
            })
            .join('\n')
            .substring(0, 102400);
        }
      } catch {
        /* content extraction is best-effort; file may be unreadable */
      }

      const { sql: insertSql, params: insertParams } = buildKnowledgeCreate(
        userId, path.basename(destPath), destPath, fileType, stat.size, contentText,
      );
      await dbRun(insertSql, insertParams);
      const row = await dbGet<KbFileRow>(
        'SELECT * FROM knowledge_files WHERE user_id = ? AND filename = ? AND file_type = ? ORDER BY id DESC LIMIT 1',
        [userId, path.basename(destPath), fileType],
      );
      if (row) imported.push(KnowledgeService.rowToFile(row));
    }
    return imported;
  }

  static async listFiles(f: {
    userId: number;
    tagId?: number;
    folderId?: number;
    fileType?: string;
    query?: string;
    sortBy?: string;
    sortOrder?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ files: KnowledgeFileWithTags[]; total: number }> {
    const { getSharedKnowledgeList } = await import('../../shared/handlers/knowledge-list');
    return getSharedKnowledgeList(
      (sql, params) => dbAll<KbFileRow>(sql, params),
      (sql, params) => dbGet<{ count: number }>(sql, params),
      f,
    );
  }

  static async getFile(fileId: number): Promise<KnowledgeFileWithTags | null> {
    const { sql, params } = buildKnowledgeSelect(fileId);
    const row = await dbGet<KbFileRow>(sql, params);
    if (!row) return null;
    return { ...KnowledgeService.rowToFile(row), tags: await KnowledgeService.getFileTags(fileId) };
  }

  static async deleteFile(userId: number, fileId: number, dpf: boolean): Promise<void> {
    const { sql, params } = buildKnowledgeSelect(fileId);
    const row = await dbGet<KbFileRow>(sql, params);
    if (!row) throw new Error('文件不存在');
    const { sql: delSql, params: delParams } = buildKnowledgeDelete(fileId, userId);
    await dbRun(delSql, delParams);
    const { sql: recycleSql, params: recycleParams } = buildRecycleInsert(row.user_id, 'knowledge_file', fileId);
    await dbRun(recycleSql, recycleParams);
    if (dpf && fs.existsSync(row.file_path)) fs.unlinkSync(row.file_path);
  }

  static async restoreFile(userId: number, fileId: number): Promise<void> {
    const { sql, params } = buildKnowledgeSelectTrash(fileId);
    const row = await dbGet<KbFileRow>(sql, params);
    if (!row) throw new Error('文件不在回收站中');
    const { sql: restoreSql, params: restoreParams } = buildKnowledgeRestore(fileId, userId);
    await dbRun(restoreSql, restoreParams);
    const { sql: recycleSql, params: recycleParams } = buildRecycleDelete('knowledge_file', fileId, userId);
    await dbRun(recycleSql, recycleParams);
  }

  static async renameFile(userId: number, fileId: number, nf: string): Promise<void> {
    const { sql, params } = buildKnowledgeSelect(fileId);
    const row = await dbGet<KbFileRow>(sql, params);
    if (!row) throw new Error('文件不存在');
    if (!nf.trim()) throw new Error('文件名不能为空');
    const np = path.join(path.dirname(row.file_path), nf);
    if (fs.existsSync(row.file_path)) fs.renameSync(row.file_path, np);
    const { sql: renameSql, params: renameParams } = buildKnowledgeRename(fileId, userId, nf, np);
    await dbRun(renameSql, renameParams);
  }

  static async getFileTags(fileId: number): Promise<Tag[]> {
    const { sql, params } = buildKnowledgeTagsSelect(fileId);
    return dbAll<Tag>(sql, params);
  }

  static async setFileTags(fileId: number, tagIds: number[]): Promise<void> {
    const { sql, params } = buildKnowledgeTagsDelete(fileId);
    await dbRun(sql, params);
    for (const tid of tagIds)
      await dbRun('INSERT OR IGNORE INTO knowledge_file_tags (file_id, tag_id) VALUES (?, ?)', [fileId, tid]);
  }

  static detectFileType(ext: string): FileType {
    const m: Record<string, FileType> = {
      '.docx': 'docx',
      '.doc': 'docx',
      '.xlsx': 'xlsx',
      '.xls': 'xlsx',
      '.pptx': 'pptx',
      '.ppt': 'pptx',
      '.pdf': 'pdf',
      '.txt': 'txt',
      '.md': 'txt',
      '.png': 'image',
      '.jpg': 'image',
      '.jpeg': 'image',
      '.gif': 'image',
      '.webp': 'image',
      '.svg': 'image',
    };
    return m[ext] || 'other';
  }

  private static rowToFile(row: KbFileRow): KnowledgeFile {
    return {
      id: row.id,
      userId: row.user_id,
      filename: row.filename,
      filePath: row.file_path,
      fileType: row.file_type as FileType,
      fileSize: row.file_size,
      status: row.status as 'active' | 'trash',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
