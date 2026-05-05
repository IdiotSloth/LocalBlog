import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import { createPet, getPetWindow } from './pet';

// Late-bound imports to avoid circular deps — these are set by pet.ts
let petActions: Record<string, () => void> = {};

export function setPetActions(actions: Record<string, () => void>): void {
  petActions = actions;
}

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;

/** Generate tray icon as SVG data URI — open book design */
function makeIcon(size: number): nativeImage {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16">
    <path d="M8 2.5C8 2.5 5.5 1.5 4 1.5C2.5 1.5 1.5 2 1.5 2v10c0 0 1-.5 2.5-.5C5.5 11.5 8 12.5 8 12.5V2.5z" fill="#58a6ff"/>
    <path d="M8 2.5C8 2.5 10.5 1.5 12 1.5S14.5 2 14.5 2v10c0 0-1-.5-2.5-.5S8 12.5 8 12.5V2.5z" fill="#4090e0"/>
    <line x1="8" y1="2.5" x2="8" y2="12.5" stroke="#1a3a5c" stroke-width="0.5"/>
  </svg>`;
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
}

/** Send an action to the renderer */
function sendAction(action: string): void {
  if (!mainWindow) return;
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('tray-action', action);
}

function buildMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: '📝 快速便签', click: () => petActions['quick-note']?.() },
    { label: '📄 新建博客', click: () => petActions['new-blog']?.() },
    { label: '📥 导入 MD', click: () => petActions['import-md']?.() },
    { label: '📎 导入文件', click: () => petActions['import-file']?.() },
    { label: '🌐 收藏网页', click: () => petActions['scrape-web']?.() },
    { type: 'separator' },
    { label: '📂 打开主窗口', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
    { type: 'separator' },
    { label: '🐱 桌面宠物', click: () => togglePet(), type: 'checkbox', checked: petActive },
    { type: 'separator' },
    { label: '❌ 退出', click: () => { app.exit(); } },
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
  tray.on('double-click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
}

export function refreshTrayMenu(): void {
  if (tray) tray.setContextMenu(buildMenu());
}
