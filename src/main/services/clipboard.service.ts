import { clipboard } from 'electron';

const MAX_ITEMS = 50;
const SETTINGS_KEY = 'clipboard_history';
let history: { text: string; hash: string; time: number }[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
let enabled = false;

// T2304: Privacy masking patterns
const MASK_PHONE = /\b1[3-9]\d{9}\b/g;
const MASK_ID = /\b\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g;
const MASK_EMAIL = /\b[\w.-]+@[\w.-]+\.\w+\b/g;

function maskPrivacy(text: string): string {
  return text
    .replace(MASK_PHONE, (m) => m.slice(0, 3) + '****' + m.slice(-4))
    .replace(MASK_ID, (m) => m.slice(0, 4) + '**********' + m.slice(-4))
    .replace(MASK_EMAIL, (m) => { const [u, d] = m.split('@'); return (u ? u.slice(0, 3) + '***' : '') + '@' + d; });
}

function hash64(s: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
}

// T2304: Persist history to settings table
async function persistHistory() {
  try {
    const { dbRun } = await import('../db');
    const json = JSON.stringify(history.map(({ text, hash, time }) => ({ text, hash, time })));
    await dbRun(
      "INSERT OR REPLACE INTO settings (user_id, key, value, updated_at) VALUES (0, ?, ?, datetime('now'))",
      [SETTINGS_KEY, json],
    );
  } catch { /* DB may not be ready */ }
}

async function loadHistory() {
  try {
    const { dbGet } = await import('../db');
    const row = await dbGet<{ value: string }>(
      'SELECT value FROM settings WHERE user_id = 0 AND key = ?',
      [SETTINGS_KEY],
    );
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed)) history = parsed.slice(0, MAX_ITEMS);
    }
  } catch { /* DB may not be ready */ }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim().slice(0, 200);
}

let autoSaveUserId = 0;

export function setClipboardUserId(uid: number): void { autoSaveUserId = uid; }

function poll() {
  try {
    const text = clipboard.readText() || '';
    const html = clipboard.readHTML() || '';
    const content = text || (html.length > 20 ? stripHtml(html) : '');
    if (!content || content.length > 10000) return;
    const h = hash64(content);
    if (history.length > 0 && history[0].hash === h) return;
    console.log('[Clipboard] New item:', content.slice(0, 60));
    history.unshift({ text: content, hash: h, time: Date.now() });
    if (history.length > MAX_ITEMS) history.length = MAX_ITEMS;
    persistHistory();
    // Auto-save as note for the current user
    if (autoSaveUserId > 0) {
      autoSaveAsNote(content);
    }
  } catch (e) { console.error('[Clipboard] poll error:', e); }
}

async function autoSaveAsNote(content: string) {
  try {
    const { dbRun } = await import('../db');
    const { nowMySQL } = await import('../../shared/datetime');
    await dbRun(
      "INSERT INTO notes (user_id, content, title, source, memo_type, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
      [autoSaveUserId, content, content.slice(0, 50), 'clipboard', 'note', nowMySQL(), nowMySQL()],
    );
  } catch { /* best-effort */ }
}

export function getHistoryLength(): number { return history.length; }

export async function startClipboardMonitor(): Promise<void> {
  if (timer || enabled) return;
  enabled = true;
  await loadHistory();
  poll();
  timer = setInterval(poll, 500);
}

export function stopClipboardMonitor(): void {
  enabled = false;
  if (timer) { clearInterval(timer); timer = null; }
}

export function isClipboardMonitorRunning(): boolean {
  return enabled;
}

export function getClipboardHistory(): { text: string; time: number }[] {
  return history.map(({ text, time }) => ({ text: maskPrivacy(text), time }));
}

export async function clearClipboardHistory(): Promise<void> {
  history = [];
  await persistHistory();
}
