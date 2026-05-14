import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { TagService } from '../services/tag.service';

export function registerTagHandlers(): void {
  ipcMain.handle(IPC.TAG_LIST, async (_event, userId: number) => {
    try {
      const tags = await TagService.listTags(userId);
      return { success: true, data: tags };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.TAG_CREATE, async (_event, data: { userId: number; name: string }) => {
    try {
      const tag = await TagService.createTag(data.userId, data.name);
      return { success: true, data: tag };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.TAG_UPDATE, async (_event, data: { userId: number; tagId: number; name: string; description?: string }) => {
    try {
      await TagService.updateTag(data.userId, data.tagId, data.name, data.description);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.TAG_DELETE, async (_event, data: { userId: number; tagId: number }) => {
    try {
      await TagService.deleteTag(data.userId, data.tagId);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
