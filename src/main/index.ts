import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { BrowserWindow, app, globalShortcut, protocol, shell } from 'electron';
import { IPC } from '../shared/ipc-channels';
import { closeDatabase, initDatabase } from './db';
import { registerAllIpcHandlers } from './ipc';
import { setNoteRefreshTarget } from './ipc/note';
import { handleClipboardNote, initPetActions, showMdFloatWindow } from './pet';
import { setBlogRefreshTarget } from './ipc/blog';
import { setKbRefreshTarget } from './ipc/knowledge';
import { ShortcutService } from './services/shortcut.service';
import { BackupService } from './services/backup.service';
import { NoteService } from './services/note.service';
import { setupTray } from './tray';
import { registerQuickNote, registerQuickNoteShortcut } from './quick-note';
import { setupAutoUpdater } from './auto-updater';

// T1803: Catch uncaught exceptions and notify renderer via IPC
process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught exception:', error);
  try {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0 && !wins[0]!.isDestroyed()) {
      wins[0]!.webContents.send(IPC.EVT_APP_ERROR, { message: error.message || '未知错误' });
    }
  } catch {
    // Cannot notify renderer — best-effort
  }
});

// Disable GPU hardware acceleration to prevent white screen on some Windows environments
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
// Set custom cache directory to avoid ACCESS_DENIED errors with default cache path
app.setPath('cache', path.join(app.getPath('userData'), 'cache'));

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.show();
    }
  });

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

  mainWindow.setMenuBarVisibility(false);

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
  // Register local-resource protocol to proxy file:// access (CSP-safe)
  protocol.handle('local-resource', (request) => {
    try {
      const url = request.url.replace('local-resource://', '');
      // Decode URI-encoded path, handle Windows drive letter
      const decoded = decodeURIComponent(url);
      const filePath = decoded.replace(/^\/([a-zA-Z]:)\//, '$1\\').replace(/\//g, path.sep);
      const buf = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
      return new Response(buf, { headers: { 'Content-Type': mimeMap[ext] || 'image/png' } });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });

  registerAllIpcHandlers();
  createWindow();
  if (mainWindow) {
    setupTray(mainWindow);
    setupAutoUpdater(() => mainWindow);
    registerQuickNote();
    registerQuickNoteShortcut(mainWindow);
    setNoteRefreshTarget(mainWindow.webContents);
    setBlogRefreshTarget(mainWindow.webContents);
    setKbRefreshTarget(mainWindow.webContents);
  }
  initPetActions(); // tray menu actions work even if pet never opened

  // T12S1: Auto-clean old unpinned notes every 5 minutes
  noteCleanTimer = setInterval(() => {
    NoteService.cleanOldNotes().catch(() => { /* best-effort */ });
  }, 5 * 60 * 1000);

  // Register global shortcuts from saved config (not hardcoded)
  ShortcutService.setActions({
    'md-float': () => showMdFloatWindow(),
    'clipboard-note': () => handleClipboardNote(),
  });
  ShortcutService.reregisterAll();

  // Auto-create Start Menu shortcut on first launch (dev mode only — NSIS
  // installer creates its own shortcuts via installer.nsh)
  if (!app.isPackaged) {
    const shortcutDir = path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs');
    const shortcutPath = path.join(shortcutDir, 'Idiot.lnk');
    if (!fs.existsSync(shortcutPath)) {
      const projectRoot = path.join(__dirname, '..', '..');
      const launcherVbsPath = path.join(app.getPath('userData'), 'launcher.vbs');
      const vbsContent = [
        'Set WshShell = CreateObject("WScript.Shell")',
        'WshShell.Environment("Process")("ELECTRON_RUN_AS_NODE") = ""',
        `WshShell.CurrentDirectory = "${projectRoot.replace(/\\/g, '\\\\')}"`,
        'WshShell.Run "npm run dev", 1, False',
      ].join('\r\n');
      fs.writeFileSync(launcherVbsPath, vbsContent, 'utf-8');
      const psCmd = `$ws=New-Object -ComObject WScript.Shell;$sc=$ws.CreateShortcut('${shortcutPath.replace(/'/g, "''")}');$sc.TargetPath='${launcherVbsPath.replace(/'/g, "''")}';$sc.WorkingDirectory='${projectRoot.replace(/'/g, "''")}';$sc.Save()`;
      exec(`powershell -NoProfile -Command "${psCmd}"`, (err) => {
        if (!err) console.log('[Main] Start Menu shortcut created');
      });
    }
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
}
