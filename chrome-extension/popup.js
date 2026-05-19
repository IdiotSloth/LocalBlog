// T2106: Browser Clipper — Popup logic

const clipBtn = document.getElementById('clipBtn');
const statusEl = document.getElementById('status');
const lastClipEl = document.getElementById('lastClip');
let lastClipContent = '';

// Show last clip on open
(async () => {
  const { lastClip } = await chrome.storage.local.get('lastClip');
  if (lastClip) {
    lastClipContent = lastClip.content || '';
    lastClipEl.hidden = false;
    lastClipEl.innerHTML =
      `<h3>最近剪藏</h3>
      <div class="title">${escapeHtml(lastClip.title)}</div>
      <div class="excerpt">${escapeHtml(lastClip.excerpt)}</div>
      <button id="copyBtn" style="margin-top:8px;padding:6px 12px;font-size:12px;border-radius:4px;border:1px solid #30363d;background:#1a1f2b;color:#c9d1d9;cursor:pointer;">复制 Markdown 到剪贴板</button>`;
    // Add copy handler
    document.getElementById('copyBtn')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(lastClipContent);
        const btn = document.getElementById('copyBtn');
        if (btn) { btn.textContent = '已复制!'; btn.style.color = '#3fb950'; }
      } catch {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = lastClipContent;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    });
  }
})();

clipBtn.addEventListener('click', async () => {
  clipBtn.disabled = true;
  statusEl.textContent = '正在提取页面内容...';
  statusEl.className = 'status';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) {
      statusEl.textContent = '无法获取当前页面 URL';
      statusEl.className = 'status error';
      clipBtn.disabled = false;
      return;
    }

    const result = await chrome.runtime.sendMessage({ type: 'clip', url: tab.url });
    if (result.success) {
      lastClipContent = result.data.content || '';
      statusEl.textContent = '已剪藏: ' + result.data.title;
      statusEl.className = 'status success';
      // Update last clip display
      lastClipEl.hidden = false;
      lastClipEl.innerHTML =
        `<h3>刚刚剪藏</h3>
        <div class="title">${escapeHtml(result.data.title)}</div>
        <div class="excerpt">${escapeHtml(result.data.excerpt)}</div>
        <button id="copyBtn" style="margin-top:8px;padding:6px 12px;font-size:12px;border-radius:4px;border:1px solid #30363d;background:#1a1f2b;color:#c9d1d9;cursor:pointer;">复制 Markdown 到剪贴板</button>`;
      document.getElementById('copyBtn')?.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(lastClipContent);
          const btn = document.getElementById('copyBtn');
          if (btn) { btn.textContent = '已复制!'; btn.style.color = '#3fb950'; }
        } catch {
          const ta = document.createElement('textarea');
          ta.value = lastClipContent;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
      });
    } else {
      statusEl.textContent = result.error || '剪藏失败';
      statusEl.className = 'status error';
    }
  } catch (e) {
    statusEl.textContent = '无法连接到应用。请确保 Local Blog KB 正在运行 (端口 3456)';
    statusEl.className = 'status error';
  }
  clipBtn.disabled = false;
});

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
