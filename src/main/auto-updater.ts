import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';
import { IPC } from '../shared/ipc-channels';

export function setupAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  // Only check for updates in packaged app
  if (!require('electron').app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.EVT_UPDATE_STATUS, { status: 'checking' });
    }
  });

  autoUpdater.on('update-available', (info) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.EVT_UPDATE_STATUS, {
        status: 'available',
        version: info.version,
      });
    }
  });

  autoUpdater.on('update-not-available', () => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.EVT_UPDATE_STATUS, { status: 'not-available' });
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.EVT_UPDATE_STATUS, {
        status: 'downloading',
        percent: progress.percent,
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.EVT_UPDATE_STATUS, {
        status: 'downloaded',
        version: info.version,
      });
    }
  });

  autoUpdater.on('error', (error) => {
    console.error('[AutoUpdater] Error:', error.message);
  });

  // Start checking after a 5-second delay to avoid slowing startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Silently fail — updates are best-effort
    });
  }, 5000);
}
