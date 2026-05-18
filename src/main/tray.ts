import path from 'node:path';
import { type BrowserWindow, Menu, Tray, app, nativeImage } from 'electron';
import { IPC } from '../shared/ipc-channels';
import { createPet, getPetWindow } from './pet';

// Late-bound imports to avoid circular deps — these are set by pet.ts
let petActions: Record<string, () => void> = {};

export function setPetActions(actions: Record<string, () => void>): void {
  petActions = actions;
}

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;

/** Find favicon path — resources/ in packaged, img/ in dev. Checks ASAR-unpacked and nested paths. */
function getFaviconPath(): string {
  const candidates = [
    // 1. extraResources (real files outside ASAR)
    path.join(process.resourcesPath || '', 'img', 'favicon.ico'),
    // 2. ASAR root (electron-builder files)
    path.join(app.getAppPath(), 'img', 'favicon.ico'),
    // 3. ASAR nested via post-build.js
    path.join(app.getAppPath(), 'out', 'renderer', 'img', 'favicon.ico'),
    // 4. Dev fallback
    path.join(__dirname, '..', '..', 'img', 'favicon.ico'),
  ];
  for (const p of candidates) {
    try {
      if (require('node:fs').existsSync(p)) return p;
    } catch {
      /* try next */
    }
  }
  // Fallback: try to find any PNG/ICO in img/ relative to resources
  try {
    const imgDir = path.join(process.resourcesPath || app.getAppPath(), 'img');
    if (require('node:fs').existsSync(imgDir)) {
      const files = require('node:fs').readdirSync(imgDir);
      const ico = files.find((f: string) => f.endsWith('.ico') || f.endsWith('.png'));
      if (ico) return path.join(imgDir, ico);
    }
  } catch { /* last resort */ }
  return candidates[0]!;
}

/** Generate tray icon — uses favicon.ico for brand consistency */
function makeIcon(size: number): Electron.NativeImage {
  const icoPath = getFaviconPath();
  const img = nativeImage.createFromPath(icoPath!);
  if (!img.isEmpty()) return img.resize({ width: size, height: size });
  // Fallback SVG if .ico not loadable
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16">
    <rect width="16" height="16" rx="3" fill="#2563eb"/>
    <text x="8" y="12" text-anchor="middle" font-size="10" fill="#fff">B</text>
  </svg>`;
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
}

/** Send an action to the renderer */
function sendAction(action: string): void {
  if (!mainWindow) return;
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send(IPC.EVT_TRAY_ACTION, action);
}

function buildMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: '快速便签', click: () => petActions['quick-note']?.() },
    { label: '新建博客', click: () => petActions['new-blog']?.() },
    { label: '导入 MD', click: () => petActions['import-md']?.() },
    { label: '导入文件', click: () => petActions['import-file']?.() },
    { label: '收藏网页', click: () => petActions['scrape-web']?.() },
    { label: '收藏在线手册', click: () => petActions['manual-collect']?.() },
    { label: '剪贴板→便签', click: () => petActions['clipboard-note']?.() },
    { type: 'separator' },
    {
      label: '打开主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    { label: '桌面宠物', click: () => togglePet(), type: 'checkbox', checked: petActive },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.exit();
      },
    },
  ]);
}

let petActive = false;
function togglePet(): void {
  if (petActive) {
    petActive = false;
    const pw = getPetWindow();
    if (pw && !pw.isDestroyed()) pw.close();
    if (tray) tray.setContextMenu(buildMenu());
    return;
  }
  petActive = true;
  if (mainWindow) createPet(mainWindow);
  if (tray) tray.setContextMenu(buildMenu());
}

export function setupTray(win: BrowserWindow): void {
  mainWindow = win;

  if (tray) tray.destroy();
  tray = new Tray(makeIcon(16));
  tray.setToolTip('本地博客与知识库');
  tray.setContextMenu(buildMenu());
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

export function refreshTrayMenu(): void {
  if (tray) tray.setContextMenu(buildMenu());
}
