// T2106: Browser Clipper — Service Worker (Manifest V3)

const API_BASE = 'http://localhost:3456/api/clip';

// Context menu: right-click → "剪藏到 Local Blog KB"
chrome.runtime.onInstalled.addListener(() => {
  // Remove existing first to avoid "duplicate id" error on extension reload
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'clip-to-lbkb',
      title: '剪藏到 Local Blog KB',
      contexts: ['page', 'selection'],
    }, () => {
      // Silently ignore lastError — menu creation is best-effort
      void chrome.runtime.lastError;
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'clip-to-lbkb' && tab?.url) {
    clipAndStore(tab.url);
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'clip') {
    clipAndStore(msg.url)
      .then(sendResponse)
      .catch((e) => sendResponse({ success: false, error: e.message }));
    return true; // keep channel open for async response
  }
});

async function clipAndStore(url) {
  try {
    const resp = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await resp.json();

    if (data.success && data.data) {
      await chrome.storage.local.set({
        lastClip: { ...data.data, url, timestamp: Date.now() },
      });
      return { success: true, data: data.data };
    }
    return { success: false, error: data.error || '剪藏失败' };
  } catch (e) {
    return { success: false, error: '无法连接到 Local Blog KB (端口 3456)。请确保应用正在运行。' };
  }
}
