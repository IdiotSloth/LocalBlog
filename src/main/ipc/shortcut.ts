import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { ShortcutService } from '../services/shortcut.service';

export function registerShortcutHandlers(): void {
  ipcMain.handle(IPC.SHORTCUT_GET_ALL, async () => {
    try {
      return { success: true, data: ShortcutService.load() };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.SHORTCUT_UPDATE, async (_event, id: string, keys: string) => {
    try {
      ShortcutService.update(id, keys);
      ShortcutService.reregisterAll();
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.SHORTCUT_RESET, async () => {
    try {
      ShortcutService.reset();
      ShortcutService.reregisterAll();
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
