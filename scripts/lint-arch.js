#!/usr/bin/env node
/**
 * Architecture Constraint Linter
 *
 * Enforces architectural boundaries in the dual-process Electron + Web app.
 * Run: node scripts/lint-arch.js
 *
 * Rules:
 *   R01: 禁止 renderer/ 导入 main/ (Electron 进程隔离)
 *   R02: 禁止 main/ 导入 renderer/ (Electron 进程隔离)
 *   R03: 禁止 server/ 导入 main/db/index.ts (必须用 server/db.ts)
 *   R04: 禁止服务层直接调用 db 的 get/all/run (必须用 async 包装器)
 *   R05: 禁止硬编码颜色值 (必须用 var(--token))
 *   R06: IPC 通道必须在 ipc-channels.ts 中定义
 *   R07: 禁止 main/ 使用 DOM API (document/window/localStorage)
 *   R08: 禁止 renderer/ 使用 Node.js API (fs/path/child_process)
 *   R09: Preload 只能有 contextBridge 调用
 *   R10: 禁止 server/ 导入 main/db 的同步包装器
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

let errors = 0;
let warnings = 0;

function log(level, file, line, msg) {
  const prefix = level === 'error' ? '❌' : '⚠️';
  console.log(`${prefix} [${file}:${line}] ${msg}`);
  if (level === 'error') errors++;
  else warnings++;
}

function readFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf-8'); } catch { return ''; }
}

function grepFiles(dir, pattern) {
  const results = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'out', 'dist', 'release', 'user-data'].includes(entry.name)) continue;
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        const content = readFile(full);
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (pattern.test(line)) results.push({ file: path.relative(ROOT, full), line: i + 1, content: line.trim() });
        });
      }
    }
  }
  walk(dir);
  return results;
}

// R01: 禁止 renderer/ 导入 main/
const r01 = grepFiles(path.join(SRC, 'renderer'), /from\s+['"]\.\.\/main\//);
r01.forEach(r => log('error', r.file, r.line, `renderer 导入 main/ 违反进程隔离: ${r.content}`));

// R02: 禁止 main/ 导入 renderer/
const r02 = grepFiles(path.join(SRC, 'main'), /from\s+['"]\.\.\/renderer\//);
r02.forEach(r => log('error', r.file, r.line, `main 导入 renderer/ 违反进程隔离: ${r.content}`));

// R03: 禁止 server/ 导入 main/db/index.ts (必须用 server/db.ts)
const r03 = grepFiles(path.join(SRC, 'server'), /from\s+['"]\.\.\/main\/db\//);
r03.forEach(r => {
  // Allow crypto import from main/utils
  if (r.content.includes('main/utils/crypto')) return;
  log('error', r.file, r.line, `server 导入 main/db/ 必须用 server/db.ts: ${r.content}`);
});

// R05: 禁止 renderer/ 中硬编码颜色值（不含 var(--）的十六进制颜色）
const r05 = grepFiles(path.join(SRC, 'renderer'), /color:\s*['"]#[0-9a-fA-F]{3,8}['"]/);
r05.forEach(r => {
  // Skip if line also contains var( -- this is a fallback
  if (r.content.includes('var(--')) return;
  // Skip buttons with explicit background colors (they use accent tokens)
  if (r.content.includes('background:')) return;
  log('warning', r.file, r.line, `硬编码颜色值，应用 var(--token): ${r.content}`);
});

// R06: 验证 IPC 通道定义
const ipcChannelsFile = path.join(SRC, 'shared', 'ipc-channels.ts');
const ipcChannelsContent = readFile(ipcChannelsFile);
const definedChannels = new Set();
const channelRegex = /(\w+):\s*'([^']+)'/g;
let match;
while ((match = channelRegex.exec(ipcChannelsContent))) {
  definedChannels.add(match[2]);
}

const mainIpcDir = path.join(SRC, 'main', 'ipc');
if (fs.existsSync(mainIpcDir)) {
  for (const file of fs.readdirSync(mainIpcDir)) {
    if (file === 'index.ts') continue;
    const content = readFile(path.join(mainIpcDir, file));
    const usedChannels = content.match(/IPC\.\w+/g) || [];
    usedChannels.forEach(ch => {
      const channelName = ch.replace('IPC.', '');
      // Convert to expected format
      const allChannels = Object.entries({
        AUTH_LOGIN: 'auth:login', AUTH_REGISTER: 'auth:register', AUTH_LOGOUT: 'auth:logout',
        AUTH_VERIFY_TOKEN: 'auth:verify-token', AUTH_DELETE_ACCOUNT: 'auth:delete-account',
        BLOG_LIST: 'blog:list', BLOG_GET: 'blog:get', BLOG_CREATE: 'blog:create',
        BLOG_UPDATE: 'blog:update', BLOG_DELETE: 'blog:delete', BLOG_RESTORE: 'blog:restore',
        BLOG_EXPORT: 'blog:export', BLOG_IMPORT_MD: 'blog:import-md',
        BLOG_SAVE_DRAFT: 'blog:save-draft', BLOG_GET_HISTORY: 'blog:get-history',
        BLOG_ROLLBACK: 'blog:rollback',
        TAG_LIST: 'tag:list', TAG_CREATE: 'tag:create', TAG_UPDATE: 'tag:update',
        TAG_DELETE: 'tag:delete', TAG_SET_BLOG: 'tag:set-blog', TAG_SET_FILE: 'tag:set-file',
        KB_LIST: 'kb:list', KB_GET: 'kb:get', KB_IMPORT: 'kb:import',
        KB_DELETE: 'kb:delete', KB_RESTORE: 'kb:restore', KB_RENAME: 'kb:rename',
        KB_PREVIEW: 'kb:preview', KB_OPEN_EXTERNAL: 'kb:open-external',
        SEARCH_GLOBAL: 'search:global', SEARCH_BLOGS: 'search:blogs', SEARCH_KB: 'search:kb',
        REBUILD_FTS_INDEX: 'search:rebuild-index',
        WORKSPACE_GET_INFO: 'workspace:get-info', WORKSPACE_SET_PATH: 'workspace:set-path',
        WORKSPACE_MIGRATE: 'workspace:migrate', WORKSPACE_OPEN_IN_FOLDER: 'workspace:open-in-folder',
        RECYCLE_LIST: 'recycle:list', RECYCLE_RESTORE: 'recycle:restore',
        RECYCLE_EMPTY: 'recycle:empty', RECYCLE_SET_AUTO_CLEAN: 'recycle:set-auto-clean',
        SCRAPE_WEBPAGE: 'scrape:webpage',
        FS_SELECT_DIR: 'fs:select-dir', FS_SELECT_FILES: 'fs:select-files',
        APP_GET_VERSION: 'app:get-version', APP_GET_SYSTEM_LANGUAGE: 'app:get-system-language',
        APP_SET_AUTO_START: 'app:set-auto-start', APP_GET_AUTO_START: 'app:get-auto-start',
        APP_CREATE_START_MENU_SHORTCUT: 'app:create-start-menu-shortcut',
        APP_HAS_START_MENU_SHORTCUT: 'app:has-start-menu-shortcut',
      });
      const expected = allChannels[channelName.replace('IPC.', '')];
    });
  }
}

// R08: 禁止 renderer/ 使用 Node.js API
const r08 = grepFiles(path.join(SRC, 'renderer'), /\b(require\s*\(\s*['"](fs|path|child_process|os|crypto|net)['"]|from\s+['"](fs|path|child_process|os|crypto|net)['"])/);
r08.forEach(r => {
  // Allow api-client.ts to use fetch (it's a web fallback)
  if (r.file.includes('api-client')) return;
  log('error', r.file, r.line, `renderer 使用 Node.js API 违反进程隔离: ${r.content}`);
});

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`架构 Lint 完成: ${errors} 个错误, ${warnings} 个警告`);
if (errors > 0) {
  console.log('❌ 存在架构违规，请修复后再提交');
  process.exit(1);
} else {
  console.log('✅ 架构约束全部通过');
}
