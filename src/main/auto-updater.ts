import type { BrowserWindow } from 'electron';
import { IPC } from '../shared/ipc-channels';

let updateInfo: { version: string } | null = null;
let checking = false;
let downloading = false;

export function setupAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  const { app, ipcMain } = require('electron');

  if (!app.isPackaged) return;

  let autoUpdater: typeof import('electron-updater').autoUpdater;
  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch {
    console.warn('[AutoUpdater] electron-updater not available');
    return;
  }

  // User-controlled: never auto-download
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  const send = (data: Record<string, unknown>) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.EVT_UPDATE_STATUS, data);
    }
  };

  autoUpdater.on('checking-for-update', () => {
    checking = true;
    send({ status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    checking = false;
    updateInfo = { version: info.version };
    send({ status: 'available', version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    checking = false;
    updateInfo = null;
    send({ status: 'not-available' });
  });

  autoUpdater.on('download-progress', (progress) => {
    send({ status: 'downloading', percent: progress.percent });
  });

  autoUpdater.on('update-downloaded', (info) => {
    downloading = false;
    updateInfo = { version: info.version };
    send({ status: 'downloaded', version: info.version });
  });

  autoUpdater.on('error', (error) => {
    checking = false;
    downloading = false;
    send({ status: 'error', message: error.message });
  });

  // --- IPC handlers for manual control ---

  ipcMain.handle(IPC.APP_CHECK_UPDATE, async () => {
    if (checking || downloading) return { success: false, error: '检查或下载已在进行中' };
    try {
      const result = await autoUpdater.checkForUpdates();
      return {
        success: true,
        data: { updateAvailable: !!result?.updateInfo, version: result?.updateInfo?.version || null },
      };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  });

  ipcMain.handle(IPC.APP_DOWNLOAD_UPDATE, async () => {
    if (!updateInfo) return { success: false, error: '没有可用的更新信息，请先检查' };
    if (downloading) return { success: false, error: '已在下载中' };
    try {
      downloading = true;
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (e) {
      downloading = false;
      return { success: false, error: (e as Error).message };
    }
  });

  ipcMain.handle(IPC.APP_INSTALL_UPDATE, () => {
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  });

  // Initial check on startup (5s delay, silent — only notifies if update available)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 5000);
}
