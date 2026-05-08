import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { BrowserWindow, app, globalShortcut, shell } from 'electron';
import { IPC } from '../shared/ipc-channels';
import { closeDatabase, initDatabase } from './db';
import { registerAllIpcHandlers } from './ipc';
import { setNoteRefreshTarget } from './ipc/note';
import { handleClipboardNote, initPetActions, showMdFloatWindow } from './pet';
import { BackupService } from './services/backup.service';
import { NoteService } from './services/note.service';
import { setupTray } from './tray';

// Disable GPU hardware acceleration to prevent white screen on some Windows environments
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
// Set custom cache directory to avoid ACCESS_DENIED errors with default cache path
app.setPath('cache', path.join(app.getPath('userData'), 'cache'));

let mainWindow: BrowserWindow | null = null;
let noteCleanTimer: ReturnType<typeof setInterval> | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: '本地博客与知识库',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
    webviewTag: true,
    show: false,
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
    if (!app.isPackaged) mainWindow?.webContents.openDevTools();
  });
  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow?.hide();
  });
  mainWindow.on('hide', () => {
    if (noteCleanTimer) { clearInterval(noteCleanTimer); noteCleanTimer = null; }
    mainWindow?.webContents.send(IPC.APP_VISIBILITY, 'hidden');
  });
  mainWindow.on('show', () => {
    if (!noteCleanTimer) {
      noteCleanTimer = setInterval(() => {
        NoteService.cleanOldNotes().catch(() => { /* best-effort */ });
      }, 5 * 60 * 1000);
    }
    mainWindow?.webContents.send(IPC.APP_VISIBILITY, 'visible');
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  try {
    await initDatabase();
    console.log('[Main] Database ready');
    BackupService.startAutoBackup();
  } catch (err) {
    console.warn('[Main] Database unavailable:', (err as Error).message);
  }
  registerAllIpcHandlers();
  createWindow();
  if (mainWindow) {
    setupTray(mainWindow);
    setNoteRefreshTarget(mainWindow.webContents);
  }
  initPetActions(); // tray menu actions work even if pet never opened

  // T12S1: Auto-clean old unpinned notes every 5 minutes
  noteCleanTimer = setInterval(() => {
    NoteService.cleanOldNotes().catch(() => { /* best-effort */ });
  }, 5 * 60 * 1000);

  // T1209a: Global shortcut Ctrl+Shift+N → MD float window
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    showMdFloatWindow();
  });

  // T1507: Global shortcut Ctrl+Shift+M → clipboard to note
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    handleClipboardNote();
  });

  // Auto-create Start Menu shortcut on first launch (uses .bat launcher to avoid ELECTRON_RUN_AS_NODE)
  const shortcutDir = path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs');
  const shortcutPath = path.join(shortcutDir, 'Idiot.lnk');
  if (!fs.existsSync(shortcutPath)) {
    const projectRoot = path.join(__dirname, '..', '..');
    const packagedExe = path.join(projectRoot, 'release', 'Idiot-win32-x64', 'Idiot.exe');
    const launcherBatPath = path.join(app.getPath('userData'), 'launcher.bat');
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
    const psCmd = `$ws=New-Object -ComObject WScript.Shell;$sc=$ws.CreateShortcut('${shortcutPath.replace(/'/g, "''")}');$sc.TargetPath='${launcherBatPath.replace(/'/g, "''")}';$sc.WorkingDirectory='${workingDir.replace(/'/g, "''")}';$sc.Save()`;
    exec(`powershell -NoProfile -Command "${psCmd}"`, (err) => {
      if (!err) console.log('[Main] Start Menu shortcut created');
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    if (noteCleanTimer) { clearInterval(noteCleanTimer); noteCleanTimer = null; }
  });
});

app.on('window-all-closed', () => {
  BackupService.stopAutoBackup();
  closeDatabase();
  if (process.platform !== 'darwin') app.quit();
});
