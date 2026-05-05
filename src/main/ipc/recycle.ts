import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { RecycleService } from '../services/recycle.service';

export function registerRecycleHandlers(): void {
  ipcMain.handle(IPC.RECYCLE_LIST, async (_event, userId: number) => {
    try { const items = await RecycleService.listItems(userId); return { success: true, data: items }; }
    catch (err) { return { success: false, error: (err as Error).message }; }
  });
  ipcMain.handle(IPC.RECYCLE_RESTORE, async (_event, data: { userId: number; itemId: number; itemType: string }) => {
    try { await RecycleService.restoreItem(data.userId, data.itemId, data.itemType); return { success: true }; }
    catch (err) { return { success: false, error: (err as Error).message }; }
  });
  ipcMain.handle(IPC.RECYCLE_EMPTY, async (_event, userId: number) => {
    try { const removed = await RecycleService.emptyTrash(userId); return { success: true, data: { removed } }; }
    catch (err) { return { success: false, error: (err as Error).message }; }
  });
  ipcMain.handle(IPC.RECYCLE_SET_AUTO_CLEAN, async (_event, data: { userId: number; days: number }) => {
    try { const cleaned = await RecycleService.autoClean(data.userId, data.days); return { success: true, data: { cleaned } }; }
    catch (err) { return { success: false, error: (err as Error).message }; }
  });
  ipcMain.handle(IPC.RECYCLE_BATCH_RESTORE, async (_event, data: { userId: number; items: { itemId: number; itemType: string }[] }) => {
    try {
      let restored = 0;
      for (const item of data.items) {
        try { await RecycleService.restoreItem(data.userId, item.itemId, item.itemType); restored++; } catch {}
      }
      return { success: true, data: { restored } };
    } catch (err) { return { success: false, error: (err as Error).message }; }
  });
}
