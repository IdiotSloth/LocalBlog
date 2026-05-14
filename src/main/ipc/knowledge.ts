import { ipcMain, type WebContents } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { KnowledgeService } from '../services/knowledge.service';
import { PreviewService } from '../services/preview.service';

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
  ipcMain.handle(IPC.KB_GET, async (_event, fileId: number) => {
    try {
      const f = await KnowledgeService.getFile(fileId);
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
  ipcMain.handle(IPC.KB_PREVIEW, async (_event, fileId: number) => {
    try {
      return await PreviewService.generatePreview(fileId);
    } catch (err) {
      return { error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.KB_OPEN_EXTERNAL, async (_event, fileId: number) => {
    try {
      const f = await KnowledgeService.getFile(fileId);
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
      return { success: true, data: { deleted: fileIds.length } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
