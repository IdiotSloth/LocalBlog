import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { FolderService } from '../services/folder.service';

export function registerFolderHandlers(): void {
  ipcMain.handle(IPC.FOLDER_TREE, async (_event, data: { userId: number; type: string }) => {
    try {
      const tree = await FolderService.getFolderTree(data.userId, data.type as 'blog' | 'knowledge');
      return { success: true, data: tree };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(
    IPC.FOLDER_CREATE,
    async (_event, data: { userId: number; name: string; type: string; parentId?: number }) => {
      try {
        const folder = await FolderService.createFolder(data.userId, data.name, data.type, data.parentId);
        return { success: true, data: folder };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(IPC.FOLDER_RENAME, async (_event, data: { folderId: number; name: string }) => {
    try {
      await FolderService.renameFolder(data.folderId, data.name);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.FOLDER_DELETE, async (_event, folderId: number) => {
    try {
      await FolderService.deleteFolder(folderId);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(
    IPC.FOLDER_MOVE_ITEM,
    async (_event, data: { itemType: string; itemId: number; folderId: number | null }) => {
      try {
        await FolderService.moveToFolder(data.itemType as 'blog' | 'knowledge_file', data.itemId, data.folderId);
        return { success: true };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );
}
