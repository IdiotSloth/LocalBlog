import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { app, dialog, ipcMain, shell } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { BackupService } from '../services/backup.service';
import { StatsService, getDailyStats } from '../services/stats.service';

const SHORTCUT_NAME = 'Idiot.lnk';
const STARTUP_BAT_NAME = 'Idiot-LocalBlogKB.bat';

function getAppDataDir(): string {
  return process.env.APPDATA || path.join(process.env.HOME || '', 'AppData', 'Roaming');
}

function getStartMenuProgramsDir(): string {
  return path.join(getAppDataDir(), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
}

function getShortcutPath(): string {
  return path.join(getStartMenuProgramsDir(), SHORTCUT_NAME);
}

function getStartupDir(): string {
  return path.join(getAppDataDir(), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
}

function getStartupBatPath(): string {
  return path.join(getStartupDir(), STARTUP_BAT_NAME);
}

function getProjectRoot(): string {
  return path.join(__dirname, '..', '..');
}

/** Create a Start Menu shortcut named "Idiot" pointing to a launcher .bat */
async function createShortcut(): Promise<boolean> {
  const shortcutPath = getShortcutPath();
  const projectRoot = getProjectRoot();

  // Always create a .bat launcher that clears ELECTRON_RUN_AS_NODE for the shortcut
  const launcherBatPath = path.join(app.getPath('userData'), 'launcher.bat');

  // Prefer packaged exe if available (matches main/index.ts path)
  const packagedExe = path.join(projectRoot, 'release', 'Idiot-win32-x64', 'Idiot.exe');
  let batContent: string;
  let workingDir: string;

  if (fs.existsSync(packagedExe)) {
    batContent = `@echo off\r\nset ELECTRON_RUN_AS_NODE=\r\nstart "" "${packagedExe}"\r\n`;
    workingDir = path.dirname(packagedExe);
  } else {
    batContent = `@echo off\r\nset ELECTRON_RUN_AS_NODE=\r\ncd /d "${projectRoot}"\r\nstart "" npm run dev\r\n`;
    workingDir = projectRoot;
  }

  fs.writeFileSync(launcherBatPath, batContent, 'utf-8');

  // Write PS1 script to temp location to avoid escaping issues with Windows paths
  const ps1Path = path.join(app.getPath('userData'), 'lbkb-shortcut.ps1');
  const psScript = [
    `$ws = New-Object -ComObject WScript.Shell`,
    `$sc = $ws.CreateShortcut('${shortcutPath.replace(/'/g, "''")}')`,
    `$sc.TargetPath = '${launcherBatPath.replace(/'/g, "''")}'`,
    `$sc.WorkingDirectory = '${workingDir.replace(/'/g, "''")}'`,
    `$sc.Save()`,
    `Write-Output 'OK'`,
  ].join('\n');
  fs.writeFileSync(ps1Path, psScript, 'utf-8');

  return new Promise((resolve) => {
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${ps1Path}"`, (err, stdout) => {
      // Clean up temp file
      try { fs.unlinkSync(ps1Path); } catch { /* ignore */ }
      resolve(!err && stdout.includes('OK'));
    });
  });
}

export function registerAppHandlers(): void {
  ipcMain.handle(IPC.SHELL_OPEN_EXTERNAL, async (_event, url: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { success: false, error: '仅允许打开 http/https 链接' };
      }
      await shell.openExternal(url);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.APP_GET_VERSION, async (): Promise<string> => {
    return app.getVersion();
  });

  ipcMain.handle(IPC.APP_GET_SYSTEM_LANGUAGE, async (): Promise<string> => {
    return app.getLocale();
  });

  ipcMain.handle(IPC.APP_SET_AUTO_START, async (_event, enabled: boolean) => {
    try {
      // Use Electron's native login item settings whenever we have a real exe
      // (packaged NSIS, portable build, or dev mode with electron).
      // Fall back to Startup folder .bat only when running from source.
      const portableExe = path.join(getProjectRoot(), 'release', 'Idiot-win32-x64', 'Idiot.exe');
      if (app.isPackaged || fs.existsSync(portableExe)) {
        app.setLoginItemSettings({ openAtLogin: enabled });
      } else {
        // Dev mode — no real exe, use Startup folder .bat
        const startupDir = getStartupDir();
        const batPath = getStartupBatPath();
        if (enabled) {
          if (!fs.existsSync(startupDir)) fs.mkdirSync(startupDir, { recursive: true });
          const batContent = `@echo off\r\nset ELECTRON_RUN_AS_NODE=\r\ncd /d "${getProjectRoot()}"\r\nstart "" npm run dev\r\n`;
          fs.writeFileSync(batPath, batContent, 'utf-8');
        } else {
          if (fs.existsSync(batPath)) fs.unlinkSync(batPath);
        }
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.APP_GET_AUTO_START, async () => {
    try {
      let enabled: boolean;
      const portableExe = path.join(getProjectRoot(), 'release', 'Idiot-win32-x64', 'Idiot.exe');
      if (app.isPackaged || fs.existsSync(portableExe)) {
        const settings = app.getLoginItemSettings();
        enabled = settings.openAtLogin;
      } else {
        enabled = fs.existsSync(getStartupBatPath());
      }
      return { success: true, data: { enabled } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.APP_CREATE_START_MENU_SHORTCUT, async () => {
    try {
      const ok = await createShortcut();
      return { success: ok, error: ok ? undefined : '创建快捷方式失败' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.APP_HAS_START_MENU_SHORTCUT, async () => {
    try {
      const exists = fs.existsSync(getShortcutPath());
      return { success: true, data: { exists } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // Backup
  ipcMain.handle(IPC.BACKUP_LIST, async () => {
    try {
      const list = BackupService.listBackups();
      return { success: true, data: list };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.BACKUP_CREATE, async () => {
    try {
      const path = BackupService.createBackup();
      return { success: !!path, data: { path } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.BACKUP_RESTORE, async (_event, filename: string) => {
    try {
      const backupDir = BackupService.getBackupDir();
      const dbPath = BackupService.getDbPath();
      const backupPath = path.join(backupDir, filename);
      if (!fs.existsSync(backupPath)) return { success: false, error: '备份文件不存在' };
      // Create a safety backup of current DB before restoring
      const safetyName = `${filename}.pre-restore`;
      try {
        fs.copyFileSync(dbPath, path.join(backupDir, safetyName));
      } catch {
        /* best-effort safety backup, non-critical */
      }
      fs.copyFileSync(backupPath, dbPath);
      return { success: true, data: { needsRestart: true } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.BACKUP_DELETE, async (_event, filename: string) => {
    try {
      const backupDir = BackupService.getBackupDir();
      const backupPath = path.join(backupDir, filename);
      if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.WORKSPACE_EXPORT_ZIP, async (_event, userId: number) => {
    try {
      const { filePath } = await dialog.showSaveDialog({
        defaultPath: `LocalBlogKB-export-${new Date().toISOString().substring(0, 10)}.zip`,
        filters: [{ name: 'ZIP 档案', extensions: ['zip'] }],
      });
      if (!filePath) return { success: false, error: '已取消' };
      const result = await BackupService.exportWorkspaceAsZip(userId, filePath);
      return { success: true, data: { path: result } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.STATS_GET, async (_event, userId: number) => {
    try {
      const stats = await StatsService.getUserStats(userId);
      return { success: true, data: stats };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.STATS_DAILY, async (_event, userId: number) => {
    try {
      const stats = await getDailyStats(userId);
      return { success: true, data: stats };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
