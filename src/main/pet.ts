import fs from 'node:fs';
import path from 'node:path';
import { BrowserWindow, Menu, Notification, app, clipboard, dialog, ipcMain, screen } from 'electron';
import { IPC } from '../shared/ipc-channels';
import { setPetActions } from './tray';

let petWin: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;
let isDragging = false;
let dragTimer: ReturnType<typeof setTimeout> | null = null;
let dragOffset: { x: number; y: number } = { x: 0, y: 0 };

let _posFile: string;
function posFile(): string {
  return _posFile || (_posFile = path.join(app.getPath('userData'), 'pet-position.json'));
}

/** Validate a stored position is visible on any connected display */
function isPosOnScreen(x: number, y: number, w: number, h: number): boolean {
  return screen.getAllDisplays().some((d) => {
    const wa = d.workArea;
    return x >= wa.x - 20 && y >= wa.y - 20 && x <= wa.x + wa.width - 100 && y <= wa.y + wa.height - 100;
  });
}

function loadMiniPos(name: string, dw: number, dh: number): { x: number; y: number } {
  const file = path.join(app.getPath('userData'), `mini-${name}-pos.json`);
  try {
    if (fs.existsSync(file)) {
      const pos = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (isPosOnScreen(pos.x, pos.y, dw, dh)) return pos;
    }
  } catch { /* ignore */ }
  return { x: -1, y: -1 };
}

function saveMiniPos(name: string, x: number, y: number): void {
  const file = path.join(app.getPath('userData'), `mini-${name}-pos.json`);
  try { fs.writeFileSync(file, JSON.stringify({ x, y })); } catch { /* best-effort */ }
}
let _petDir: string;
function petDir(): string {
  return _petDir || (_petDir = path.join(app.getPath('userData'), 'pet'));
}

let cachedUserId: number | null = null;

/** Called by auth IPC after successful login to keep pet/tray in sync with current user */
export function setCurrentUserId(id: number): void {
  cachedUserId = id;
}

async function getUserId(): Promise<number> {
  if (cachedUserId) return cachedUserId;
  const { dbGet } = await import('./db');
  // Fallback: resolve from active session if setCurrentUserId was never called
  const session = await dbGet<{ user_id: number }>(
    "SELECT user_id FROM sessions WHERE expires_at > datetime('now') ORDER BY id DESC LIMIT 1",
  );
  if (session?.user_id) {
    cachedUserId = session.user_id;
    return cachedUserId;
  }
  const user = await dbGet<{ id: number }>('SELECT id FROM users LIMIT 1');
  if (user?.id) cachedUserId = user.id;
  else cachedUserId = 0;
  return cachedUserId;
}

function ensurePetImages(): { static: string; drug: string } {
  const imgDir = path.join(petDir(), 'img');
  fs.mkdirSync(imgDir, { recursive: true });
  const srcDir = path.join(__dirname, '..', '..', 'img');
  const files = ['static.png', 'drug.png'];
  for (const f of files) {
    const dest = path.join(imgDir, f);
    if (!fs.existsSync(dest)) {
      const src = path.join(srcDir, f);
      if (fs.existsSync(src)) fs.copyFileSync(src, dest);
    }
  }
  return {
    static: path.join(imgDir, 'static.png').replace(/\\/g, '/'),
    drug: path.join(imgDir, 'drug.png').replace(/\\/g, '/'),
  };
}

// ==================== Mini Windows ====================

// Dynamic mini preload — written to userData at startup (avoids build pipeline entry)
function ensureMiniPreload(): string {
  const p = path.join(app.getPath('userData'), 'mini-preload.js');
  if (!fs.existsSync(p)) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    try { fs.writeFileSync(
      p,
      `const{contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('miniApi',{invoke:(c,...a)=>ipcRenderer.invoke(c,...a),send:(c,...a)=>ipcRenderer.send(c,...a)});`,
    ); } catch { /* best-effort */ }
  }
  return p;
}

// Mini window singleton guards — prevent stacking on rapid clicks
let miniNoteWin: BrowserWindow | null = null;
let miniScrapeWin: BrowserWindow | null = null;

function showQuickNote(): void {
  if (miniNoteWin && !miniNoteWin.isDestroyed()) {
    miniNoteWin.focus();
    return;
  }
  const miniPreload = ensureMiniPreload();
  let closing = false;
  const win = new BrowserWindow({
    width: 380,
    height: 60,
    frame: false,
    movable: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, preload: miniPreload },
  });
  const qPos = loadMiniPos('note', 380, 60);
  if (qPos.x >= 0) win.setPosition(qPos.x, qPos.y);
  else win.center();
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{display:flex;align-items:center;height:60px;padding:0 12px;background:#1a1a2e;border-radius:8px;transition:background .2s;-webkit-app-region:drag}
    body.saved{background:#1a3a2e}
    input{flex:1;background:transparent;border:none;outline:none;color:#e0e0e0;font-size:15px;font-family:sans-serif;-webkit-app-region:no-drag}
    input::placeholder{color:#666}
    .hint{color:#555;font-size:11px;white-space:nowrap;margin-left:8px;transition:color .2s}
    body.saved .hint{color:#3fb950}
  </style></head><body>
    <input id="inp" placeholder="快速便签..." autofocus>
    <span class="hint" id="hint">Enter 保存 · Esc 关闭</span>
  </body></html>`;
  miniNoteWin = win;
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => {
    if (miniNoteWin && !miniNoteWin.isDestroyed()) {
      const [x, y] = miniNoteWin.getPosition();
      saveMiniPos('note', x, y);
    }
    miniNoteWin = null;
  });

  // Save function with visual feedback + force-close safety
  const saveAndClose = async () => {
    if (closing) return;
    closing = true;
    const text: string = await win.webContents
      .executeJavaScript('document.getElementById("inp").value')
      .catch(() => '');
    if (text.trim()) {
      try {
        const { NoteService } = await import('./services/note.service');
        const uid = await getUserId();
        const note = await NoteService.createNote(uid, text.trim(), 'quick');
        await win.webContents.executeJavaScript(`
          document.body.classList.add('saved');
          document.getElementById('hint').textContent='✓ 已保存';
        `);
        await new Promise((r) => setTimeout(r, 400));
        new Notification({ title: '便签已保存', body: text.trim().substring(0, 60) }).show();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(IPC.EVT_NOTE_REFRESH);
        }
      } catch (e) {
        console.error('[QuickNote/MVF] Save failed:', e);
        new Notification({ title: '保存失败', body: (e as Error).message || '未知错误' }).show();
      }
    }
    if (!win.isDestroyed()) win.close();
  };

  // Force close after 5s to prevent stranded window
  const forceClose = setTimeout(() => {
    if (!win.isDestroyed()) win.close();
  }, 5000);

  // Enter saves, Esc closes
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.key === 'Escape') {
      clearTimeout(forceClose);
      win.close();
    }
    if (input.key === 'Enter') {
      clearTimeout(forceClose);
      saveAndClose();
    }
  });
  // Clicking × also saves (prevent re-entrant close)
  win.on('close', (e) => {
    if (!closing) {
      e.preventDefault();
      clearTimeout(forceClose);
      saveAndClose();
    }
  });
}

// ---- T1207 MVF: Lightweight MD quick-writing floating window ----
let mdFloatWin: BrowserWindow | null = null;

export function showMdFloatWindow(): void {
  if (mdFloatWin && !mdFloatWin.isDestroyed()) {
    mdFloatWin.focus();
    return;
  }
  let closing = false;
  const win = new BrowserWindow({
    width: 550,
    height: 420,
    minWidth: 400,
    minHeight: 280,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    titleBarStyle: 'hidden',
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  win.center();
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{display:flex;flex-direction:column;height:100vh;background:#1a1a2e;border-radius:8px;font-family:-apple-system,system-ui,sans-serif;overflow:hidden}
    .titlebar{display:flex;align-items:center;padding:8px 12px;background:#16162a;gap:8px;-webkit-app-region:drag}
    .titlebar .dot{width:10px;height:10px;border-radius:50%;-webkit-app-region:no-drag}
    .dot.r{background:#ff5f57;cursor:pointer}
    .dot.y{background:#febc2e}
    .dot.g{background:#28c840}
    .titlebar .label{flex:1;font-size:12px;color:#888;text-align:center}
    .title-input{border:none;outline:none;background:transparent;color:#e0e0e0;font-size:18px;font-weight:600;padding:10px 16px 4px;font-family:inherit}
    .title-input::placeholder{color:#555}
    #content{flex:1;border:none;outline:none;resize:none;background:transparent;color:#c0c0c0;font-size:14px;line-height:1.7;padding:10px 16px;font-family:"JetBrains Mono","Courier New",monospace;tab-size:2}
    #content::placeholder{color:#444}
    .statusbar{display:flex;align-items:center;justify-content:space-between;padding:6px 14px;background:#16162a;font-size:11px;color:#555}
    .statusbar .hint{transition:color .3s}
    .statusbar .hint.saved{color:#3fb950}
    .close-btn{cursor:pointer;-webkit-app-region:no-drag}
  </style></head><body>
    <div class="titlebar">
      <span class="dot r close-btn" title="关闭并保存" onclick="window.close()"></span>
      <span class="dot y"></span>
      <span class="dot g"></span>
      <span class="label">MD 快捷写作</span>
    </div>
    <input id="title" class="title-input" placeholder="标题..." autofocus>
    <textarea id="content" placeholder="Markdown 内容...&#10;&#10;Ctrl+S / 点红点 → 保存并关闭&#10;Esc → 丢弃并关闭"></textarea>
    <div class="statusbar">
      <span id="hint" class="hint">Ctrl+S 保存 · Esc 丢弃 · 拖标题栏移动</span>
      <span id="wc">0 字</span>
    </div>
    <script>
      const titleEl = document.getElementById('title');
      const contentEl = document.getElementById('content');
      const hintEl = document.getElementById('hint');
      const wcEl = document.getElementById('wc');
      let saved = false;
      contentEl.addEventListener('input', function() {
        const len = contentEl.value.length;
        wcEl.textContent = len + ' 字';
      });
      function getData() {
        return { title: titleEl.value.trim(), content: contentEl.value };
      }
      // Expose for main process to read
      window._getData = getData;
    </script>
  </body></html>`;
  mdFloatWin = win;
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => {
    mdFloatWin = null;
  });

  // Close button (red dot)
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.key === 'Escape') {
      if (!win.isDestroyed()) win.close();
    }
  });

  const saveAndClose = async () => {
    const data: { title: string; content: string } = await win.webContents
      .executeJavaScript('window._getData ? window._getData() : {title:"",content:""}')
      .catch(() => ({ title: '', content: '' }));
    const title = data.title || '快捷写作';
    const body = data.content || '';
    if (body.trim() || data.title) {
      try {
        const { BlogService } = await import('./services/blog.service');
        const uid = await getUserId();
        await BlogService.quickCreate(uid, title.substring(0, 100), body);
        await win.webContents.executeJavaScript(`
          hintEl.textContent='\\u2713 已保存';
          hintEl.classList.add('saved');
        `);
        new Notification({ title: '已保存', body: title }).show();
        // Notify main window to refresh blog list
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(IPC.EVT_BLOG_REFRESH);
        }
      } catch (e) {
        console.error('[QuickNote/MVF] Save failed:', e);
        new Notification({ title: '保存失败', body: (e as Error).message || '未知错误' }).show();
      }
    }
    if (!win.isDestroyed()) win.close();
  };

  // Save on Ctrl+S / Cmd+S
  win.webContents.on('before-input-event', (_e, input) => {
    if ((input.control || input.meta) && input.key === 's') {
      saveAndClose();
    }
    if (input.key === 'Escape') {
      if (!win.isDestroyed()) win.close();
    }
  });

  // Close window → save
  win.on('close', (e) => {
    if (!closing) {
      e.preventDefault();
      closing = true;
      saveAndClose();
    }
  });
}

function showScrapeWindow(): void {
  if (miniScrapeWin && !miniScrapeWin.isDestroyed()) {
    miniScrapeWin.focus();
    return;
  }
  const miniPreload = ensureMiniPreload();
  const win = new BrowserWindow({
    width: 500,
    height: 420,
    frame: false,
    movable: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, preload: miniPreload },
  });
  const sPos = loadMiniPos('scrape', 500, 420);
  if (sPos.x >= 0) win.setPosition(sPos.x, sPos.y);
  else win.center();
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{padding:16px;background:#1a1a2e;color:#e0e0e0;font-family:sans-serif;border-radius:8px;-webkit-app-region:drag}
    h2{font-size:16px;margin-bottom:12px}
    input{-webkit-app-region:no-drag;width:100%;padding:10px 12px;border:1px solid #333;border-radius:6px;background:#0d1117;color:#e0e0e0;font-size:14px;outline:none;margin-bottom:12px}
    input:focus{border-color:#58a6ff}
    .btn{-webkit-app-region:no-drag}
    .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-radius:6px;font-size:13px;cursor:pointer;font-weight:500}
    .btn-primary{background:#58a6ff;color:#fff}
    .btn-primary:disabled{opacity:.4;cursor:default}
    .status{margin-top:8px;font-size:12px;color:#888}
    .preview{margin-top:12px;padding:12px;background:#0d1117;border-radius:6px;max-height:180px;overflow-y:auto;font-size:13px;line-height:1.6}
    .close-btn{position:absolute;top:8px;right:12px;cursor:pointer;color:#666;font-size:16px;background:none;border:none}
    .close-btn:hover{color:#e0e0e0}
    @keyframes spin{to{transform:rotate(360deg)}}
    .spinner{display:none;width:16px;height:16px;border:2px solid #333;border-top-color:#58a6ff;border-radius:50%;animation:spin .6s linear infinite;margin-left:8px}
  </style></head><body>
    <button class="close-btn" onclick="window.close()">✕</button>
    <h2>🌐 收藏网页</h2>
    <input id="url" placeholder="粘贴网页 URL" autofocus>
    <button class="btn btn-primary" id="scrape-btn" onclick="doScrape()">抓取</button>
    <div class="status" id="status"><span class="spinner" id="spinner"></span></div>
    <div class="preview" id="preview" style="display:none"></div>
    <button class="btn btn-primary" id="import-btn" style="display:none;margin-top:8px" onclick="doImport()">导入为博客</button>
  </body></html>`;
  miniScrapeWin = win;
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  win.on('closed', () => {
    if (miniScrapeWin && !miniScrapeWin.isDestroyed()) {
      const [x, y] = miniScrapeWin.getPosition();
      saveMiniPos('scrape', x, y);
    }
    miniScrapeWin = null;
  });

  win.webContents.once('did-finish-load', () => {
    win.webContents.executeJavaScript(`
      let lastResult=null;
      window.doScrape=async()=>{
        const url=document.getElementById('url').value.trim();
        if(!url)return;
        document.getElementById('status').innerHTML='<span class="spinner" style="display:inline-block"></span> 抓取中...';
        document.getElementById('scrape-btn').disabled=true;
        try{
          const result=await window.miniApi.invoke('pet:scrape',url);
          if(result.success){
            lastResult=result.data;
            document.getElementById('status').textContent='✓ '+result.data.title;
            document.getElementById('preview').style.display='block';
            document.getElementById('preview').textContent=result.data.excerpt||result.data.content?.substring(0,1500)||'';
            document.getElementById('import-btn').style.display='inline-flex';
          }else{
            document.getElementById('status').textContent='✗ '+(result.error||'抓取失败');
          }
        }catch(e){document.getElementById('status').textContent='✗ 抓取失败';}
        document.getElementById('scrape-btn').disabled=false;
      };
      window.doImport=async()=>{
        if(!lastResult)return;
        document.getElementById('import-btn').disabled=true;
        document.getElementById('import-btn').textContent='导入中...';
        try{
          const result=await window.miniApi.invoke('pet:scrape-import',lastResult);
          document.getElementById('status').textContent=result.success?'✓ 已导入':'✗ 导入失败';
          if(result.success)setTimeout(()=>window.close(),800);
        }catch(e){document.getElementById('status').textContent='✗ 导入失败';}
        document.getElementById('import-btn').disabled=false;
        document.getElementById('import-btn').textContent='导入为博客';
      };
    `);
  });

  win.once('ready-to-show', () => win.show());
}

async function handleImportMd(): Promise<void> {
  const result = await dialog.showOpenDialog({
    title: '导入 Markdown 文件',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Markdown', extensions: ['md', 'txt', 'html'] }],
  });
  if (result.canceled || !result.filePaths.length) return;
  try {
    const { BlogService } = await import('./services/blog.service');
    const uid = await getUserId();
    const blogs = await BlogService.importMarkdownFiles(uid, result.filePaths);
    new Notification({ title: '导入完成', body: `已导入 ${blogs.length} 篇博客` }).show();
  } catch (e) {
    new Notification({ title: '导入失败', body: (e as Error).message }).show();
  }
}

async function handleImportFile(): Promise<void> {
  const result = await dialog.showOpenDialog({
    title: '导入知识库文件',
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'All Supported',
        extensions: [
          'docx',
          'doc',
          'xlsx',
          'xls',
          'pptx',
          'ppt',
          'pdf',
          'txt',
          'md',
          'png',
          'jpg',
          'jpeg',
          'gif',
          'webp',
          'svg',
        ],
      },
    ],
  });
  if (result.canceled || !result.filePaths.length) return;
  try {
    const { KnowledgeService } = await import('./services/knowledge.service');
    const uid = await getUserId();
    await KnowledgeService.importFiles(uid, result.filePaths, true);
    new Notification({ title: '导入完成', body: `已导入 ${result.filePaths.length} 个文件` }).show();
  } catch (e) {
    new Notification({ title: '导入失败', body: (e as Error).message }).show();
  }
}

function showStandaloneEditor(): void {
  if (mainWindow) {
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send(IPC.EVT_PET_ACTION, 'new-blog');
  }
}

// ==================== Pet Menu ====================

export async function handleClipboardNote(): Promise<void> {
  const text = clipboard.readText();
  if (!text.trim()) {
    new Notification({ title: '剪贴板为空', body: '无法读取剪贴板内容' }).show();
    return;
  }
  try {
    const { NoteService } = await import('./services/note.service');
    const uid = await getUserId();
    await NoteService.createNote(uid, text.trim(), 'clipboard');
    new Notification({ title: '便签已保存', body: text.trim().substring(0, 60) }).show();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC.EVT_NOTE_REFRESH);
    }
  } catch (e) {
    new Notification({ title: '保存失败', body: (e as Error).message || '未知错误' }).show();
  }
}

function petMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: '📝 快速便签', click: () => showQuickNote() },
    { label: '📄 新建博客', click: () => showStandaloneEditor() },
    { label: '📥 导入 MD', click: () => handleImportMd() },
    { label: '📎 导入文件', click: () => handleImportFile() },
    { label: '🌐 收藏网页', click: () => showScrapeWindow() },
    { label: '📋 剪贴板→便签', click: () => handleClipboardNote() },
    { type: 'separator' },
    {
      label: '📂 打开主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
  ]);
}

// ==================== Pet Window ====================

function loadPosition(): { x: number; y: number } {
  try {
    if (fs.existsSync(posFile())) {
      const pos = JSON.parse(fs.readFileSync(posFile(), 'utf-8'));
      const displays = screen.getAllDisplays();
      const inBounds = displays.some((d) => {
        const { x, y, width, height } = d.workArea;
        return pos.x >= x - 20 && pos.y >= y - 20 && pos.x <= x + width && pos.y <= y + height;
      });
      if (inBounds) return pos;
    }
  } catch {
    /* position file missing or corrupt, use default */
  }
  const primary = screen.getPrimaryDisplay().workArea;
  return { x: primary.width - 160, y: primary.height - 160 };
}

export function createPet(win: BrowserWindow): void {
  mainWindow = win;
  if (petWin && !petWin.isDestroyed()) petWin.close();

  const pos = loadPosition();
  const images = ensurePetImages();
  const preloadPath = path.join(app.getPath('userData'), 'pet-preload.js');

  // Write pet HTML — always regenerate to pick up image path changes
  const petHtmlPath = path.join(app.getPath('userData'), 'pet.html');
  try { fs.writeFileSync(
    petHtmlPath,
    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{margin:0;overflow:hidden;background:transparent}
#pet{width:128px;height:128px;background:url('${images.static}') center/contain no-repeat;transition:transform .08s linear;cursor:grab;user-select:none;-webkit-user-drag:none}
#pet:active{cursor:grabbing}
@keyframes idle-breathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
#pet.idle{animation:idle-breathe 2.5s ease-in-out infinite}
#pet.dragging{background-image:url('${images.drug}');animation:none;transform:scale(1.08)}
@keyframes click-pop{0%{transform:scale(1)}50%{transform:scale(.92)}100%{transform:scale(1)}}
#pet.clicked{animation:click-pop .2s ease}
#pet:hover{transform:scale(1.05)}
#pet.dragging:hover{transform:scale(1.08)}
</style></head><body><div id="pet" class="idle"></div>
<script>
let mouseDownPos=null,hasMoved=false;
const pet=document.getElementById('pet');
pet.addEventListener('mousedown',e=>{mouseDownPos={x:e.screenX,y:e.screenY};hasMoved=false;pet.classList.add('dragging');pet.classList.remove('idle','clicked');window.petApi?.startDrag()});
window.addEventListener('mousemove',e=>{if(!mouseDownPos)return;if(Math.abs(e.screenX-mouseDownPos.x)>5||Math.abs(e.screenY-mouseDownPos.y)>5)hasMoved=true});
window.addEventListener('mouseup',()=>{if(!mouseDownPos)return;pet.classList.remove('dragging');window.petApi?.stopDrag();if(!hasMoved){pet.classList.add('clicked');setTimeout(()=>pet.classList.remove('clicked'),200);pet.classList.add('idle');window.petApi?.onClick()}else{pet.classList.add('idle');window.petApi?.savePosition()}mouseDownPos=null});
</script></html>`,
  ); } catch { /* best-effort */ }

  // Write preload if not built
  if (!fs.existsSync(preloadPath)) {
    fs.mkdirSync(path.dirname(preloadPath), { recursive: true });
    try { fs.writeFileSync(
      preloadPath,
      `const{contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('petApi',{startDrag:()=>ipcRenderer.send('pet:startDrag'),stopDrag:()=>ipcRenderer.send('pet:stopDrag'),onClick:()=>ipcRenderer.send('pet:click'),savePosition:()=>ipcRenderer.send('pet:savePosition')});`,
    ); } catch { /* best-effort */ }
  }

  petWin = new BrowserWindow({
    width: 128,
    height: 128,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
    },
  });
  petWin.loadFile(petHtmlPath);
  petWin.once('ready-to-show', () => petWin?.show());

  registerPetIpc();
  // Wire tray menu to same mini-window actions
  setPetActions({
    'quick-note': showQuickNote,
    'md-float': showMdFloatWindow,
    'new-blog': showStandaloneEditor,
    'import-md': handleImportMd,
    'import-file': handleImportFile,
    'scrape-web': showScrapeWindow,
    'clipboard-note': handleClipboardNote,
    'manual-collect': showManualCollect,
  });
}

function showManualCollect(): void {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send(IPC.EVT_NAVIGATE, '/blog?tab=manual');
  }
}

/** Initialize tray actions without requiring pet window to be open */
export function initPetActions(): void {
  registerPetIpc();
  setPetActions({
    'quick-note': showQuickNote,
    'md-float': showMdFloatWindow,
    'new-blog': showStandaloneEditor,
    'import-md': handleImportMd,
    'import-file': handleImportFile,
    'scrape-web': showScrapeWindow,
    'clipboard-note': handleClipboardNote,
    'manual-collect': showManualCollect,
  });
}

// ==================== IPC Registration (deferred to avoid top-level electron access) ====================
let _ipcRegistered = false;

function registerPetIpc(): void {
  if (_ipcRegistered) return;
  _ipcRegistered = true;

  // Scrape IPC (mini window → main process)
  ipcMain.handle('pet:scrape', async (_e, url: string) => {
    try {
      const { WebScraperService } = await import('./services/web-scraper.service');
      return await WebScraperService.scrape(url);
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  });

  ipcMain.handle('pet:scrape-import', async (_e, data: { title: string; content: string }) => {
    try {
      const { BlogService } = await import('./services/blog.service');
      const uid = await getUserId();
      const blog = await BlogService.createBlog(uid, data.title, 'md', data.content);
      new Notification({ title: '已导入', body: data.title }).show();
      return { success: true, data: blog };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  });

  // Pet Drag/Click IPC Handlers
  ipcMain.on('pet:startDrag', () => {
    if (!petWin || petWin.isDestroyed()) return;
    const cursor = screen.getCursorScreenPoint();
    const [wx = 0, wy = 0] = petWin.getPosition();
    dragOffset = { x: cursor.x - wx, y: cursor.y - wy };
    isDragging = true;
    const dragLoop = () => {
      if (!isDragging || !petWin || petWin.isDestroyed()) {
        if (dragTimer) { clearTimeout(dragTimer); dragTimer = null; }
        return;
      }
      const c = screen.getCursorScreenPoint();
      petWin.setPosition(c.x - dragOffset.x, c.y - dragOffset.y);
      dragTimer = setTimeout(dragLoop, 16);
    };
    dragLoop();
  });

  ipcMain.on('pet:stopDrag', () => {
    isDragging = false;
    if (dragTimer) { clearTimeout(dragTimer); dragTimer = null; }
  });

  ipcMain.on('pet:savePosition', () => {
    if (petWin && !petWin.isDestroyed()) {
      const [x, y] = petWin.getPosition();
      try {
        fs.writeFileSync(posFile(), JSON.stringify({ x, y }));
      } catch {
        /* save position is best-effort */
      }
    }
  });

  ipcMain.on('pet:click', () => {
    if (petWin && !petWin.isDestroyed()) {
      petMenu().popup({ window: petWin, x: 64, y: 64 });
    }
  });
}

export function getPetWindow(): BrowserWindow | null {
  return petWin;
}
