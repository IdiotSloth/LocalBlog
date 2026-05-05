import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { ReferenceService } from '../services/reference.service';

export function registerReferenceHandlers(): void {
  ipcMain.handle(
    IPC.REF_ADD,
    async (_event, data: { sourceType: string; sourceId: number; targetType: string; targetId: number }) => {
      try {
        await ReferenceService.addRef(data.sourceType, data.sourceId, data.targetType, data.targetId);
        return { success: true };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );
  ipcMain.handle(IPC.REF_REMOVE, async (_event, refId: number) => {
    try {
      await ReferenceService.removeRef(refId);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.REF_GET_FROM, async (_event, data: { sourceType: string; sourceId: number }) => {
    try {
      const refs = await ReferenceService.getRefsFrom(data.sourceType, data.sourceId);
      return { success: true, data: refs };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.REF_GET_TO, async (_event, data: { targetType: string; targetId: number }) => {
    try {
      const refs = await ReferenceService.getRefsTo(data.targetType, data.targetId);
      return { success: true, data: refs };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.REF_SEARCH, async (_event, data: { userId: number; scope: string; query: string }) => {
    try {
      const items = await ReferenceService.searchItems(
        data.userId,
        data.scope as 'blog' | 'knowledge' | 'all',
        data.query,
      );
      return { success: true, data: items };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
