import fs from 'node:fs';
import path from 'node:path';
import { ipcMain, type WebContents } from 'electron';
import { nowMySQL } from '../../shared/datetime';
import { IPC } from '../../shared/ipc-channels';
import { dbGet, dbRun } from '../db';
import { syncWikilinkRefs } from './blog';
import { KnowledgeService } from '../services/knowledge.service';
import { PreviewService } from '../services/preview.service';
import { getWorkspacePath } from '../utils/paths';

let kbRefreshTarget: WebContents | null = null;

export function setKbRefreshTarget(wc: WebContents | null): void {
  kbRefreshTarget = wc;
}

export function registerKnowledgeHandlers(): void {
  ipcMain.handle(
    IPC.KB_LIST,
    async (
      _event,
      f: {
        userId: number;
        tagId?: number;
        fileType?: string;
        query?: string;
        sortBy?: string;
        sortOrder?: string;
        limit?: number;
        offset?: number;
      },
    ) => {
      try {
        const r = await KnowledgeService.listFiles(f);
        return { success: true, data: r };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );
  ipcMain.handle(IPC.KB_GET, async (_event, data: { fileId: number; userId: number }) => {
    try {
      const f = await KnowledgeService.getFile(data.fileId, data.userId);
      if (!f) return { success: false, error: '文件不存在' };
      return { success: true, data: f };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(
    IPC.KB_IMPORT,
    async (_event, data: { userId: number; filePaths: string[]; copyToWorkspace: boolean }) => {
      try {
        const files = await KnowledgeService.importFiles(data.userId, data.filePaths, data.copyToWorkspace);
        // Sync wikilink refs from extracted text (R219)
        for (const f of files) {
          try {
            const row = await dbGet<{ content_text?: string }>('SELECT content_text FROM knowledge_files WHERE id = ?', [f.id]);
            if (row?.content_text) await syncWikilinkRefs('knowledge', f.id, row.content_text, data.userId);
          } catch { /* content_text may not exist */ }
        }
        kbRefreshTarget?.send(IPC.EVT_KB_REFRESH);
        return { success: true, data: files };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );
  ipcMain.handle(IPC.KB_DELETE, async (_event, data: { userId: number; fileId: number; deletePhysicalFile: boolean }) => {
    try {
      await KnowledgeService.deleteFile(data.userId, data.fileId, data.deletePhysicalFile);
      kbRefreshTarget?.send(IPC.EVT_KB_REFRESH);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.KB_RESTORE, async (_event, data: { userId: number; fileId: number }) => {
    try {
      await KnowledgeService.restoreFile(data.userId, data.fileId);
      kbRefreshTarget?.send(IPC.EVT_KB_REFRESH);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.KB_RENAME, async (_event, data: { userId: number; fileId: number; newFilename: string }) => {
    try {
      await KnowledgeService.renameFile(data.userId, data.fileId, data.newFilename);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.KB_PREVIEW, async (_event, data: { fileId: number; userId: number }) => {
    try {
      return await PreviewService.generatePreview(data.fileId, data.userId);
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.KB_OPEN_EXTERNAL, async (_event, data: { fileId: number; userId: number }) => {
    try {
      const f = await KnowledgeService.getFile(data.fileId, data.userId);
      if (!f) return { success: false, error: '文件不存在' };
      await PreviewService.openExternal(f.filePath);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.TAG_SET_FILE, async (_event, data: { fileId: number; tagIds: number[] }) => {
    try {
      await KnowledgeService.setFileTags(data.fileId, data.tagIds);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.KB_BATCH_DELETE, async (_event, data: { userId: number; fileIds: number[] }) => {
    try {
      for (const id of data.fileIds) await KnowledgeService.deleteFile(data.userId, id, false);
      kbRefreshTarget?.send(IPC.EVT_KB_REFRESH);
      return { success: true, data: { deleted: data.fileIds.length } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // T2009: Set structured properties on a knowledge file
  ipcMain.handle(IPC.KB_SET_PROPERTIES, async (_event, data: { fileId: number; userId: number; properties: Record<string, string> }) => {
    try {
      const json = JSON.stringify(data.properties);
      await dbRun('UPDATE knowledge_files SET properties = ?, updated_at = datetime("now") WHERE id = ? AND user_id = ?', [
        json, data.fileId, data.userId,
      ]);
      kbRefreshTarget?.send(IPC.EVT_KB_REFRESH); // R221
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // T2112: Update knowledge file content with D86 path safety (dual-guard)
  ipcMain.handle(IPC.KB_UPDATE_CONTENT, async (_event, data: { fileId: number; userId: number; content: string }) => {
    try {
      // 1. DB lookup — verify ownership + get file path
      const file = await dbGet<{ file_path: string; user_id: number; file_type: string }>(
        'SELECT file_path, user_id, file_type FROM knowledge_files WHERE id = ? AND user_id = ?',
        [data.fileId, data.userId],
      );
      if (!file) return { success: false, error: '文件不存在或无权访问' };

      // 2. D86: Dual-guard path safety — resolve against workspace + symlink boundary check
      const workspace = await getWorkspacePath(data.userId);
      const resolved = path.resolve(workspace, file.file_path);
      // Resolve symlinks on workspace to prevent symlink escape
      const realWorkspace = fs.existsSync(workspace) ? fs.realpathSync(workspace) : workspace;
      if (!resolved.startsWith(realWorkspace + path.sep) && resolved !== realWorkspace) {
        return { success: false, error: '路径验证失败' };
      }

      // 3. Write file to disk (create dir if needed)
      await fs.promises.mkdir(path.dirname(resolved), { recursive: true });
      await fs.promises.writeFile(resolved, data.content, 'utf-8');

      // 4. Update content_text in DB
      const now = nowMySQL();
      await dbRun('UPDATE knowledge_files SET content_text = ?, updated_at = ? WHERE id = ? AND user_id = ?', [
        data.content, now, data.fileId, data.userId,
      ]);

      // 5. Notify renderer
      kbRefreshTarget?.send(IPC.EVT_KB_REFRESH);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
