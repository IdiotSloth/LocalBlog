import { BrowserWindow, globalShortcut, ipcMain } from 'electron';

let quickNoteWin: BrowserWindow | null = null;
let currentUserId = 0;

function getQuickNoteHtml(): string {
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Inter,system-ui,sans-serif;background:#1a1816;color:#e0dcd5;height:100vh;display:flex;flex-direction:column}
    .hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#151412;border-bottom:1px solid rgba(224,220,213,0.07);-webkit-app-region:drag}
    .hdr span{font-size:13px;font-weight:600;color:#a09890}
    .hdr button{background:none;border:none;color:#a09890;cursor:pointer;font-size:16px;-webkit-app-region:no-drag}
    textarea{flex:1;background:transparent;border:none;color:#c9d1d9;font-size:14px;line-height:1.6;padding:14px;resize:none;outline:none;font-family:inherit}
    .ftr{display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-top:1px solid rgba(224,220,213,0.07);font-size:11px;color:#605850}
    .ftr button{background:#b8826a;color:#fff;border:none;border-radius:4px;padding:6px 16px;font-size:12px;font-weight:500;cursor:pointer}
    .ftr button:hover{opacity:.85}
    .toast{position:fixed;bottom:12px;left:50%;transform:translateX(-50%);background:#8a9e7a;color:#fff;font-size:12px;padding:6px 14px;border-radius:4px;opacity:0;transition:opacity .3s}
    .toast.show{opacity:1}
    .clip-popover{position:fixed;bottom:52px;right:8px;width:320px;max-height:260px;overflow-y:auto;background:#211f1c;border:1px solid rgba(224,220,213,0.07);border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,0.3);display:none;z-index:10}
    .clip-popover.show{display:block}
    .clip-popover .clip-item{padding:6px 10px;font-size:12px;color:#a09890;cursor:pointer;border-bottom:1px solid rgba(224,220,213,0.04);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .clip-popover .clip-item:hover{background:rgba(224,220,213,0.04);color:#e0dcd5}
  </style></head><body>
    <div class="hdr"><span>快捷便签</span><button onclick="closeWin()">&times;</button></div>
    <textarea id="ta" placeholder="写下你的想法...&#10;&#10;Esc 关闭 | Ctrl+Enter 保存"></textarea>
    <div class="ftr"><span id="cnt">0 字</span><span><button onclick="save()">保存</button> <button style="background:#2d2a26;color:#a09890;border:none;border-radius:4px;padding:6px 12px;font-size:12px;cursor:pointer" onclick="window.quickNote.pin(ta.value.trim());ta.value='';document.getElementById('cnt').textContent='0 字';showToast('已固定')">📌 固定</button> <button onclick="save();window.quickNote.hide()">保存并关闭</button> <button style="background:transparent;color:#a09890;border:1px solid rgba(224,220,213,0.1);border-radius:4px;padding:4px 10px;font-size:12px;cursor:pointer" onclick="window.toggleClipPopover()">📋</button></span></div>
    <div class="toast" id="toast"></div>
    <div class="clip-popover" id="clipPopover"></div>
    <script>
      const ta=document.getElementById('ta');ta.focus();
      ta.oninput=()=>document.getElementById('cnt').textContent=ta.value.length+' 字';
      document.onkeydown=(e)=>{
        if(e.key==='Escape'){e.preventDefault();window.quickNote.hide()}
        if(e.key==='Enter'&&e.ctrlKey){e.preventDefault();save()}
      };
      window.closeWin=()=>window.quickNote.hide();
      window.save=()=>{const t=ta.value.trim();if(t){window.quickNote.save(t);ta.value='';document.getElementById('cnt').textContent='0 字';showToast('已保存')}};
      function showToast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1500)}
      var clipVisible=false;
      var clipCache=[];
      async function loadClipboard(){
        try{
          if(window.quickNote && window.quickNote.getClipboardHistory){
            var resp=await window.quickNote.getClipboardHistory();
            if(resp && resp.success && Array.isArray(resp.data)){clipCache=resp.data;return}
          }
        }catch(e){}
        clipCache=[];
      }
      async function toggleClipPopover(){
        var pop=document.getElementById('clipPopover');
        clipVisible=!clipVisible;
        if(clipVisible){
          await loadClipboard();
          if(clipCache.length===0){
            pop.innerHTML='<div class="clip-item" style="color:#605850">暂无剪贴板记录<br><span style="font-size:10px">复制文本后 Ctrl+C，再点此按钮</span></div>';
          }else{
            var html='';
            for(var i=0;i<clipCache.length;i++){
              var t=(clipCache[i].text||'').replace(/</g,'&lt;').replace(/"/g,'&quot;');
              html+='<div class="clip-item" onclick="window.pasteClipItem('+i+')" title="点击粘贴">'+t.slice(0,80)+(t.length>80?'...':'')+'</div>';
            }
            pop.innerHTML=html;
          }
          pop.classList.add('show');
        }else{pop.classList.remove('show')}
      }
      window.pasteClipItem=function(i){
        if(clipCache[i]){ta.value=clipCache[i].text||'';ta.focus();document.getElementById('cnt').textContent=ta.value.length+' 字';showToast('已粘贴')}
        document.getElementById('clipPopover').classList.remove('show');clipVisible=false;
      };
      window.toggleClipPopover=toggleClipPopover;
    </script>
  </body></html>`;
}

export function registerQuickNote(): void {
  ipcMain.on('quick-note:save', async (_event, content: string) => {
    try {
      if (!currentUserId) return;
      const { dbRun } = await import('./db');
      const { nowTimestamp } = await import('../shared/datetime');
      const now = nowTimestamp();
      await dbRun(
        'INSERT INTO notes (user_id, content, title, source, memo_type, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
        [currentUserId, content, '', 'quick-note', 'note', now, now],
      );
    } catch (e) { console.error('[QuickNote]', e); }
  });

  // T2304: Pin — save then keep window open
  ipcMain.on('quick-note:pin', async (_event, content: string) => {
    try {
      if (!currentUserId || !content) return;
      const { dbRun } = await import('./db');
      const { nowTimestamp } = await import('../shared/datetime');
      const now = nowTimestamp();
      await dbRun(
        'INSERT INTO notes (user_id, content, title, source, memo_type, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
        [currentUserId, content, '', 'quick-note', 'pinned', now, now],
      );
    } catch (e) { console.error('[QuickNote Pin]', e); }
  });

  // T2304: Draft persistence via settings table
  async function saveDraft(text: string) {
    if (!currentUserId || !text) return;
    try {
      const { dbRun } = await import('./db');
      const { nowTimestamp } = await import('../shared/datetime');
      const now = nowTimestamp();
      await dbRun(
        'INSERT OR REPLACE INTO settings (user_id, key, value, updated_at) VALUES (?,?,?,?)',
        [currentUserId, 'quick_note_draft', text, now],
      );
    } catch { /* best-effort */ }
  }

  async function loadDraft(): Promise<string> {
    if (!currentUserId) return '';
    try {
      const { dbGet } = await import('./db');
      const row = await dbGet<{ value: string }>(
        'SELECT value FROM settings WHERE user_id = ? AND key = ?',
        [currentUserId, 'quick_note_draft'],
      );
      return row?.value || '';
    } catch { return ''; }
  }

  ipcMain.on('quick-note:hide', () => {
    quickNoteWin?.webContents.executeJavaScript('document.getElementById("ta")?.value || ""').then((text: string) => {
      if (text.trim()) saveDraft(text);
    }).catch(() => {});
    quickNoteWin?.hide();
  });

  // P2: Restore draft on show
  const _origShowQuickNote = showQuickNote;
  showQuickNote = () => {
    _origShowQuickNote();
    loadDraft().then((draft) => {
      if (draft && quickNoteWin && !quickNoteWin.isDestroyed()) {
        setTimeout(() => {
          quickNoteWin?.webContents.executeJavaScript(`(function(){var t=document.getElementById("ta");if(t&&!t.value)t.value=${JSON.stringify(draft)};t?.focus()})()`).catch(() => {});
        }, 150);
      }
    });
  };

  ipcMain.handle('quick-note:show', async (_event, userId: number) => {
    currentUserId = userId;
    showQuickNote();
  });
}

let showQuickNote = function(): void {
  if (quickNoteWin && !quickNoteWin.isDestroyed()) {
    quickNoteWin.show();
    quickNoteWin.focus();
    quickNoteWin.webContents.executeJavaScript('document.getElementById("ta")?.focus()');
    return;
  }
  try {
    quickNoteWin = new BrowserWindow({
      width: 420, height: 320,
      center: true, frame: false, transparent: true, alwaysOnTop: true, resizable: true, skipTaskbar: true,
      backgroundColor: '#00000000',
      title: '快捷便签',
      webPreferences: { nodeIntegration: false, contextIsolation: true, preload: require('path').join(__dirname, 'quick-note-preload.js'), sandbox: false },
    });
    quickNoteWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getQuickNoteHtml())}`);
    quickNoteWin.on('closed', () => { quickNoteWin = null; });
  } catch (e) {
    console.error('[QuickNote] Failed to create window:', e);
    quickNoteWin = null;
  }
}

export function registerQuickNoteShortcut(mainWindow: BrowserWindow): void {
  globalShortcut.register('Alt+Space', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('quick-note:trigger');
    }
  });
}
