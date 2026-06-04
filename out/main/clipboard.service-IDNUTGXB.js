"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const MAX_ITEMS = 50;
const SETTINGS_KEY = "clipboard_history";
let history = [];
let timer = null;
let enabled = false;
const MASK_PHONE = /\b1[3-9]\d{9}\b/g;
const MASK_ID = /\b\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g;
const MASK_EMAIL = /\b[\w.-]+@[\w.-]+\.\w+\b/g;
function maskPrivacy(text) {
  return text.replace(MASK_PHONE, (m) => m.slice(0, 3) + "****" + m.slice(-4)).replace(MASK_ID, (m) => m.slice(0, 4) + "**********" + m.slice(-4)).replace(MASK_EMAIL, (m) => {
    const [u, d] = m.split("@");
    return (u ? u.slice(0, 3) + "***" : "") + "@" + d;
  });
}
function hash64(s) {
  let h1 = 3735928559, h2 = 1103547991;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
}
async function persistHistory() {
  try {
    const { dbRun } = await Promise.resolve().then(() => require("./index.js")).then((n) => n.index);
    const json = JSON.stringify(history.map(({ text, hash, time }) => ({ text, hash, time })));
    await dbRun(
      "INSERT OR REPLACE INTO settings (user_id, key, value, updated_at) VALUES (0, ?, ?, datetime('now'))",
      [SETTINGS_KEY, json]
    );
  } catch {
  }
}
async function loadHistory() {
  try {
    const { dbGet } = await Promise.resolve().then(() => require("./index.js")).then((n) => n.index);
    const row = await dbGet(
      "SELECT value FROM settings WHERE user_id = 0 AND key = ?",
      [SETTINGS_KEY]
    );
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed)) history = parsed.slice(0, MAX_ITEMS);
    }
  } catch {
  }
}
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim().slice(0, 200);
}
let autoSaveUserId = 0;
function setClipboardUserId(uid) {
  autoSaveUserId = uid;
}
function poll() {
  try {
    const text = electron.clipboard.readText() || "";
    const html = electron.clipboard.readHTML() || "";
    const content = text || (html.length > 20 ? stripHtml(html) : "");
    if (!content || content.length > 1e4) return;
    const h = hash64(content);
    if (history.length > 0 && history[0].hash === h) return;
    console.log("[Clipboard] New item:", content.slice(0, 60));
    history.unshift({ text: content, hash: h, time: Date.now() });
    if (history.length > MAX_ITEMS) history.length = MAX_ITEMS;
    persistHistory();
    if (autoSaveUserId > 0) {
      autoSaveAsNote(content);
    }
  } catch (e) {
    console.error("[Clipboard] poll error:", e);
  }
}
async function autoSaveAsNote(content) {
  try {
    const { dbRun } = await Promise.resolve().then(() => require("./index.js")).then((n) => n.index);
    const { nowTimestamp } = await Promise.resolve().then(() => require("./index.js")).then((n) => n.datetime);
    await dbRun(
      "INSERT INTO notes (user_id, content, title, source, memo_type, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
      [autoSaveUserId, content, content.slice(0, 50), "clipboard", "note", nowTimestamp(), nowTimestamp()]
    );
  } catch {
  }
}
function getHistoryLength() {
  return history.length;
}
async function startClipboardMonitor() {
  if (timer || enabled) return;
  enabled = true;
  await loadHistory();
  poll();
  timer = setInterval(poll, 500);
}
function stopClipboardMonitor() {
  enabled = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
function isClipboardMonitorRunning() {
  return enabled;
}
function getClipboardHistory() {
  return history.map(({ text, time }) => ({ text: maskPrivacy(text), time }));
}
async function clearClipboardHistory() {
  history = [];
  await persistHistory();
}
exports.clearClipboardHistory = clearClipboardHistory;
exports.getClipboardHistory = getClipboardHistory;
exports.getHistoryLength = getHistoryLength;
exports.isClipboardMonitorRunning = isClipboardMonitorRunning;
exports.setClipboardUserId = setClipboardUserId;
exports.startClipboardMonitor = startClipboardMonitor;
exports.stopClipboardMonitor = stopClipboardMonitor;
