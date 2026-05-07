import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { ContinueService } from '../services/continue.service';

export function registerContinueHandlers(): void {
  ipcMain.handle(IPC.CONTINUE_GET_DRAFTS, async (_event, userId: number) => {
    try {
      const data = await ContinueService.getRecentDrafts(userId);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.CONTINUE_GET_LAST_BLOG, async (_event, userId: number) => {
    try {
      const data = await ContinueService.getLastBlog(userId);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.CONTINUE_GET_RECENT_FILES, async (_event, userId: number) => {
    try {
      const data = await ContinueService.getRecentFiles(userId);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
