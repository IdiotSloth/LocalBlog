import fs from 'node:fs';
import path from 'node:path';
import { dialog, ipcMain, shell } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import type { WorkspaceInfo } from '../../shared/types';
import { dbAll, dbGet } from '../db';
import { getWorkspacePath } from '../utils/paths';

export function registerWorkspaceHandlers(): void {
  ipcMain.handle(IPC.WORKSPACE_GET_INFO, async (_event, userId: number): Promise<WorkspaceInfo> => {
    try {
      const wsPath = await getWorkspacePath(userId);
      const getCount = async (sql: string, params: unknown[]): Promise<number> => {
        const row = await dbGet<{ c: number }>(sql, params);
        return row?.c || 0;
      };
      const blogCount = await getCount('SELECT COUNT(*) as c FROM blogs WHERE user_id = ? AND status = ?', [
        userId,
        'active',
      ]);
      const knowledgeCount = await getCount(
        'SELECT COUNT(*) as c FROM knowledge_files WHERE user_id = ? AND status = ?',
        [userId, 'active'],
      );
      const tagCount = await getCount('SELECT COUNT(*) as c FROM tags WHERE user_id = ?', [userId]);
      let storageSize = 0;
      try {
        const files = fs.readdirSync(wsPath, { recursive: true, withFileTypes: true });
        for (const f of files) {
          if (f.isFile()) {
            try {
              storageSize += fs.statSync(path.join(f.parentPath || wsPath, f.name)).size;
            } catch {
              /* file may have been deleted since readdir */
            }
          }
        }
      } catch {
        /* directory listing failed, return 0 size */
      }
      return { path: wsPath, totalFiles: blogCount + knowledgeCount, blogCount, knowledgeCount, tagCount, storageSize };
    } catch {
      console.error('[workspace] Failed to get workspace info');
      return { path: '', totalFiles: 0, blogCount: 0, knowledgeCount: 0, tagCount: 0, storageSize: 0 };
    }
  });

  ipcMain.handle(IPC.WORKSPACE_SET_PATH, async (_event, data: { userId: number; newPath: string }) => {
    /* TODO */
  });
  ipcMain.handle(IPC.WORKSPACE_MIGRATE, async (_event, data: { userId: number; newPath: string }) => {
    /* TODO */
  });
  ipcMain.handle(IPC.WORKSPACE_OPEN_IN_FOLDER, async (_event, userId: number) => {
    try {
      shell.openPath(await getWorkspacePath(userId));
    } catch {
      /* shell.openPath may fail if path does not exist */
    }
  });
  ipcMain.handle(IPC.FS_SELECT_DIR, async () => {
    const r = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return r.canceled ? null : r.filePaths[0];
  });
  ipcMain.handle(IPC.FS_SELECT_FILES, async (_event, filters: { extensions: string[] }) => {
    const r = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'All', extensions: filters.extensions }],
    });
    return r.canceled ? [] : r.filePaths;
  });

  // T2210: MD bulk export
  ipcMain.handle(IPC.WORKSPACE_EXPORT_MD, async (_event, userId: number) => {
    try {
      const wsPath = await getWorkspacePath(userId);
      const exportDir = path.join(wsPath, 'Export');
      await fs.promises.mkdir(exportDir, { recursive: true });

      const blogs = await dbAll<{ id: number; title: string; content: string; format: string; created_at: string; updated_at: string }>(
        'SELECT id, title, content, format, created_at, updated_at FROM blogs WHERE user_id = ? AND status = ? ORDER BY updated_at DESC',
        [userId, 'active'],
      );

      const kbs = await dbAll<{ id: number; filename: string; file_type: string; file_path: string; created_at: string }>(
        'SELECT id, filename, file_type, file_path, created_at FROM knowledge_files WHERE user_id = ? AND status = ? ORDER BY created_at DESC',
        [userId, 'active'],
      );

      let count = 0;

      // Export blogs as .md — R288: wikilink degradation
      for (const b of blogs) {
        const safeTitle = path.basename(b.title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 80) || 'untitled');
        const frontmatter = [
          '---',
          `title: "${b.title.replace(/"/g, '\\"')}"`,
          `date: ${b.created_at}`,
          `updated: ${b.updated_at}`,
          `format: ${b.format}`,
          '---',
          '',
        ].join('\n');
        let body = b.format === 'html' ? `<!-- HTML format blog, content not converted -->\n\n${b.content}` : b.content;
        // R288: Degrade [[wikilinks]] to [title](title.md) Markdown links for portability
        body = body.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m: string, target: string, alias: string) => {
          const t = (target as string).trim();
          const safeLink = t.replace(/[<>:"/\\|?*]/g, '_').substring(0, 80);
          return `> [${(alias || t).trim()}](${safeLink}.md)`;
        });
        body = body.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m: string, target: string, alias: string) => {
          const t = (target as string).trim();
          const safeLink = t.replace(/[<>:"/\\|?*]/g, '_').substring(0, 80);
          return `[${(alias || t).trim()}](${safeLink}.md)`;
        });
        await fs.promises.writeFile(path.join(exportDir, `${safeTitle}.md`), frontmatter + body, 'utf-8');
        count++;
      }

      // R288: Copy knowledge files to export directory
      const kbDir = path.join(exportDir, 'knowledge');
      await fs.promises.mkdir(kbDir, { recursive: true });
      for (const k of kbs) {
        try {
          // S1: path safety — basename strips traversal, resolve + startsWith prevents escape
          const safeRelPath = path.basename(k.file_path);
          const srcPath = path.resolve(wsPath, safeRelPath);
          const realWs = fs.existsSync(wsPath) ? fs.realpathSync(wsPath) : wsPath;
          if (!srcPath.startsWith(realWs + path.sep) && srcPath !== realWs) continue;
          if (fs.existsSync(srcPath)) {
            const safeName = path.basename(k.filename.replace(/[<>:"/\\|?*]/g, '_'));
            await fs.promises.copyFile(srcPath, path.join(kbDir, safeName));
          }
        } catch { /* skip unreadable files */ }
      }

      // Generate index.md
      let index = '# 知识库导出\n\n';
      index += `导出时间: ${new Date().toISOString().slice(0, 19)}\n`;
      index += `博客: ${blogs.length} 篇 | 知识文件: ${kbs.length} 个\n\n`;
      index += '## 博客列表\n\n';
      for (const b of blogs) {
        const safeTitle = path.basename(b.title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 80) || 'untitled');
        index += `- [${b.title}](${encodeURI(safeTitle)}.md) — ${b.created_at?.slice(0, 10) || ''}\n`;
      }
      if (kbs.length > 0) {
        index += '\n## 知识文件\n\n';
        for (const k of kbs) {
          index += `- ${k.filename} (${k.file_type}) — ${k.created_at?.slice(0, 10) || ''}\n`;
        }
      }

      await fs.promises.writeFile(path.join(exportDir, 'index.md'), index, 'utf-8');

      return { success: true, data: { dir: exportDir, count } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
