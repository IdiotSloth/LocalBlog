// Auto-sync README.md and todo.md after each task
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

// ---- Phase status scanning ----
function scanCodebase() {
  const srcDir = path.join(ROOT, 'src');
  const stats = {
    authService: false,
    blogService: false,
    blogPreview: false,
    knowledgeService: false,
    previewService: false,
    searchService: false,
    recycleService: false,
    webScraperService: false,
    backupService: false,
    darkMode: false,
    themeStore: false,
    shortcuts: false,
    webServer: false,
    mysqlDesktop: false,
    vitestConfig: false,
  };

  function fileExists(relPath) { return fs.existsSync(path.join(ROOT, relPath)); }
  function fileHasContent(relPath, pattern) {
    try { return fs.readFileSync(path.join(ROOT, relPath), 'utf-8').includes(pattern); } catch { return false; }
  }

  stats.authService = fileHasContent('src/main/services/auth.service.ts', 'login');
  stats.blogService = fileHasContent('src/main/services/blog.service.ts', 'createBlog');
  stats.blogPreview = fileExists('src/renderer/features/blog/BlogPreviewPage.tsx');
  stats.knowledgeService = fileHasContent('src/main/services/knowledge.service.ts', 'importFiles');
  stats.previewService = fileHasContent('src/main/services/preview.service.ts', 'generatePreview');
  stats.searchService = fileHasContent('src/main/services/search.service.ts', 'globalSearch');
  stats.recycleService = fileHasContent('src/main/services/recycle.service.ts', 'emptyTrash');
  stats.webScraperService = fileHasContent('src/main/services/web-scraper.service.ts', 'scrape');
  stats.backupService = fileHasContent('src/main/services/backup.service.ts', 'createBackup');
  stats.darkMode = fileHasContent('src/renderer/assets/index.css', '.dark');
  stats.themeStore = fileHasContent('src/renderer/stores/theme-store.ts', 'initTheme');
  stats.shortcuts = fileExists('src/renderer/hooks/useShortcuts.ts');
  stats.webServer = fileExists('src/server/index.ts');
  stats.mysqlDesktop = fileExists('src/main/db/mysql.ts');
  stats.vitestConfig = fileExists('vitest.config.mjs') || fileExists('vitest.config.ts');

  return stats;
}

// ---- Build status ----
function getBuildStatus() {
  try {
    execSync('npm run build 2>&1', { cwd: ROOT, timeout: 30000, stdio: 'pipe' });
    return { ok: true, output: 'build passed' };
  } catch (e) {
    return { ok: false, output: e.stdout?.toString().substring(0, 500) || e.message };
  }
}

// ---- Update todo.md ----
function updateTodoMd(stats) {
  const todoPath = path.join(ROOT, 'todo.md');
  if (!fs.existsSync(todoPath)) return;

  let content = fs.readFileSync(todoPath, 'utf-8');

  // Update timestamp
  content = content.replace(
    /> 最后更新: .*/,
    `> 最后更新: ${now} | 自动同步`
  );

  // Phase status auto-update based on code scan
  const phase2Complete = stats.blogService && stats.blogPreview;
  const phase3Complete = stats.knowledgeService && stats.previewService;
  const phase4Complete = stats.webScraperService && stats.recycleService && stats.searchService;
  const phase5Complete = stats.darkMode && stats.themeStore && stats.shortcuts;
  const phase6OK = stats.backupService && stats.vitestConfig;

  if (phase2Complete) content = content.replace('Phase 2 — 博客 CRUD + Tiptap 编辑器 + 标签系统 ✅ (已完成)', 'Phase 2 — 博客 CRUD + Tiptap 编辑器 + 标签系统 ✅ (已完成)');
  if (phase3Complete) content = content.replace('Phase 3 — 知识库文件管理 ✅ (已完成)', 'Phase 3 — 知识库文件管理 ✅ (已完成)');
  if (phase4Complete) content = content.replace('Phase 4 — 网页收藏 + 全文检索 + 回收站 ✅ (已完成)', 'Phase 4 — 网页收藏 + 全文检索 + 回收站 ✅ (已完成)');
  if (phase5Complete) content = content.replace('Phase 5 — 全局搜索 + 主题 + 仪表盘 ✅ (已完成)', 'Phase 5 — 全局搜索 + 主题 + 仪表盘 ✅ (已完成)');
  if (phase6OK) content = content.replace('Phase 6 — 测试 + 性能优化 + 备份 ✅ (核心完成)', 'Phase 6 — 测试 + 性能优化 + 备份 ✅ (核心完成)');

  fs.writeFileSync(todoPath, content);
  console.log(`[sync-docs] todo.md updated (timestamp: ${now})`);
}

// ---- Update README.md ----
function updateReadmeMd(stats, buildStatus) {
  const readmePath = path.join(ROOT, 'README.md');
  if (!fs.existsSync(readmePath)) return;

  let content = fs.readFileSync(readmePath, 'utf-8');

  // Add build status badge at top
  const statusLine = buildStatus.ok
    ? `> 构建状态: ✅ 通过 | 最后同步: ${now}`
    : `> 构建状态: ❌ 失败 | 最后同步: ${now}`;

  content = content.replace(
    /> 基于 \*\*Electron.*/,
    `> 基于 **Electron 41 + React 19 + TypeScript + Vite 7** 构建。\n> ${statusLine}`
  );

  // Add synced features section
  const features = [];
  if (stats.mysqlDesktop) features.push('MySQL 统一存储');
  if (stats.webServer) features.push('Web 浏览器版');
  if (stats.blogPreview) features.push('博客阅读模式');
  if (stats.darkMode) features.push('深色主题');
  if (stats.backupService) features.push('数据库自动备份');

  content = content.replace(
    /\n---\n\n## 技术栈/,
    `\n\n**当前特性**: ${features.join(' | ')}  \n\n---\n\n## 技术栈`
  );

  fs.writeFileSync(readmePath, content);
  console.log(`[sync-docs] README.md updated (timestamp: ${now})`);
}

// ---- Main ----
try {
  const stats = scanCodebase();
  const buildStatus = getBuildStatus();
  console.log(`[sync-docs] Build: ${buildStatus.ok ? 'PASS' : 'FAIL'}`);
  console.log(`[sync-docs] Features detected: ${Object.entries(stats).filter(([,v]) => v).map(([k]) => k).join(', ')}`);
  updateTodoMd(stats);
  updateReadmeMd(stats, buildStatus);
  console.log('[sync-docs] Done.');
} catch (err) {
  console.error('[sync-docs] Error:', err.message);
  process.exit(1);
}
