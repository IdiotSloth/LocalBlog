import fs from 'node:fs';
import path from 'node:path';
import { SUPPORTED_KB_EXTENSIONS } from '../../shared/constants';
import { nowMySQL } from '../../shared/datetime';
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

      const now = nowMySQL();
      await dbRun(
        'INSERT INTO knowledge_files (user_id, filename, file_path, file_type, file_size, content_text, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
        [userId, path.basename(destPath), destPath, fileType, stat.size, contentText, now, now],
      );
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
    const row = await dbGet<KbFileRow>('SELECT * FROM knowledge_files WHERE id = ?', [fileId]);
    if (!row) return null;
    return { ...KnowledgeService.rowToFile(row), tags: await KnowledgeService.getFileTags(fileId) };
  }

  static async deleteFile(fileId: number, dpf: boolean): Promise<void> {
    const row = await dbGet<KbFileRow>('SELECT * FROM knowledge_files WHERE id = ?', [fileId]);
    if (!row) throw new Error('文件不存在');
    await dbRun("UPDATE knowledge_files SET status = 'trash', updated_at = ? WHERE id = ?", [nowMySQL(), fileId]);
    await dbRun('INSERT INTO recycle_bin (user_id, item_type, item_id, deleted_at) VALUES (?, ?, ?, ?)', [
      row.user_id,
      'knowledge_file',
      fileId,
      nowMySQL(),
    ]);
    if (dpf && fs.existsSync(row.file_path)) fs.unlinkSync(row.file_path);
  }

  static async restoreFile(fileId: number): Promise<void> {
    const row = await dbGet<KbFileRow>('SELECT * FROM knowledge_files WHERE id = ? AND status = ?', [fileId, 'trash']);
    if (!row) throw new Error('文件不在回收站中');
    await dbRun("UPDATE knowledge_files SET status = 'active', updated_at = ? WHERE id = ?", [nowMySQL(), fileId]);
    await dbRun('DELETE FROM recycle_bin WHERE item_type = ? AND item_id = ?', ['knowledge_file', fileId]);
  }

  static async renameFile(fileId: number, nf: string): Promise<void> {
    const row = await dbGet<KbFileRow>('SELECT * FROM knowledge_files WHERE id = ?', [fileId]);
    if (!row) throw new Error('文件不存在');
    if (!nf.trim()) throw new Error('文件名不能为空');
    const np = path.join(path.dirname(row.file_path), nf);
    if (fs.existsSync(row.file_path)) fs.renameSync(row.file_path, np);
    await dbRun('UPDATE knowledge_files SET filename = ?, file_path = ?, updated_at = ? WHERE id = ?', [
      nf,
      np,
      nowMySQL(),
      fileId,
    ]);
  }

  static async getFileTags(fileId: number): Promise<Tag[]> {
    return dbAll<Tag>(
      'SELECT t.id, t.user_id, t.name FROM tags t JOIN knowledge_file_tags kft ON kft.tag_id = t.id WHERE kft.file_id = ?',
      [fileId],
    );
  }

  static async setFileTags(fileId: number, tagIds: number[]): Promise<void> {
    await dbRun('DELETE FROM knowledge_file_tags WHERE file_id = ?', [fileId]);
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
