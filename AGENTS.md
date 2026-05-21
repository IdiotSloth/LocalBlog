# AGENTS.md — Local Blog KB

> 面向 AI Agent 的工程上下文文档。供 Claude Code、Codex、Cline 等 AI 工具读取。
> 最后更新：2026-05-19

---

## 架构概览

```
┌──────────────────────────────────────────────────────────────┐
│                    Electron 41 桌面壳                         │
│  ┌──────────┐   contextBridge    ┌──────────────────────────┐ │
│  │ 主进程    │◄─────IPC───────►│ 渲染进程 (React 19)        │ │
│  │ Node.js  │  114 个通道     │ Vite 7 + Tailwind CSS v4  │ │
│  │ 16 svc   │                   │ 18 条路由                 │ │
│  └────┬─────┘                   └────────┬─────────────────┘ │
│       │                                  │                    │
│       │  ┌────────────────────┐          │                    │
│       └─►│ MySQL 8.3 (主)      │◄─────────┘                   │
│          │ sql.js WASM (回退)  │                              │
│          └────────┬───────────┘                              │
└───────────────────┼─────────────────────────────────────────┘
                    │
    ┌───────────────┴───────────────┐
    │  Express 5 Web 服务器          │
    │  端口 3456 · JWT Cookie       │
    │  11 条路由 (含 MCP HTTP)       │
    └───────────────┬───────────────┘
                    │
    ┌───────────────┴───────────────┐
    │  MCP Server (stdio + HTTP)    │
    │  12 tools · JWT · 默认只读    │
    └───────────────────────────────┘
```

**关键原则**：桌面端与 Web 端共享同一 MySQL 数据库和业务逻辑。桌面端用 IPC 通信，Web 端用 REST API + JWT Cookie。MCP Server 独立进程（stdio CLI），同时 Express `/api/mcp/message` 提供 HTTP 接入。

---

## 目录约束

| 目录 | 作用 | 不可放入 |
|------|------|---------|
| `src/main/` | Electron 主进程 (Node.js) | React 组件、DOM API |
| `src/main/db/` | 数据库抽象层 (MySQL + sql.js) | 业务逻辑 |
| `src/main/services/` | 业务逻辑服务类 (16 services) | IPC 注册、DOM |
| `src/main/ipc/` | IPC 通道注册 (ipcMain.handle, 16 files) | 业务逻辑 |
| `src/main/utils/` | 工具函数 (加密、路径) | 状态管理 |
| `src/preload/` | contextBridge 暴露 API | 业务逻辑、DOM |
| `src/renderer/` | React 前端 | Node.js API |
| `src/renderer/components/` | 可复用 UI 组件 | 业务逻辑、路由 |
| `src/renderer/features/` | 页面级组件 (路由目标) | IPC 通信 |
| `src/renderer/stores/` | Zustand 状态管理 | 渲染逻辑 |
| `src/renderer/lib/` | 前端工具、API 客户端、hooks | 组件 |
| `src/server/` | Express Web 服务器 | Electron API |
| `src/server/routes/` | REST 路由 (11 routes) | 业务逻辑 |
| `src/server/middleware/` | Express 中间件 | 业务逻辑 |
| `src/shared/` | 跨进程共享 (类型、常量、IPC 通道名) | 任何运行时逻辑 |
| `src/mcp-server/` | MCP Server 独立 CLI + 工具实现 | Electron API |
| `src/renderer/workers/` | Web Worker (search.worker.ts) | DOM API |

---

## 数据库约束

### 表结构 (12 张表)

```
users ─┬─► blogs ─┬─► blog_tags ◄── tags
       │          ├─► blog_drafts
       │          └─► refs (source_type/target_type: blog|knowledge|note)
       ├─► knowledge_files ─► knowledge_file_tags ◄── tags
       ├─► recycle_bin
       ├─► sessions
       ├─► folders
       ├─► notes (memo_type: note|schedule|todo|daily)
       └─► tags
```

### 类型映射 (SQLite → MySQL)

| SQLite | MySQL |
|--------|-------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `INT AUTO_INCREMENT PRIMARY KEY` |
| `TEXT` | `VARCHAR(n)` / `LONGTEXT` |
| `TEXT NOT NULL DEFAULT (datetime('now'))` | `DATETIME DEFAULT CURRENT_TIMESTAMP` |
| `REFERENCES ... ON DELETE CASCADE` | `FOREIGN KEY ... REFERENCES ... ON DELETE CASCADE` |
| `INSERT OR IGNORE INTO` | `INSERT IGNORE INTO` |
| `datetime('now', '-N days')` | `DATE_SUB(NOW(), INTERVAL N DAY)` |

### 数据库 API 约束

- **所有 DB 调用必须 async** — 使用 service 层的 `dbGet`/`dbAll`/`dbRun` 包装器
- **禁止直接调用** `get()`, `all()`, `run()` from `../db` — MySQL 模式下会抛错
- **`saveToDisk()`** 仅在 sql.js 模式下有效，MySQL 下为 no-op
- **`isUsingMySQL()`** 用于运行时检测当前后端
- **修改 Schema 必须同步三处** — `schema.ts`(sql.js) + `mysql.ts`(主进程 MySQL) + `db.ts`(服务器 MySQL)

---

## IPC 通道约束

- **所有 IPC 通道定义在** `src/shared/ipc-channels.ts`
- **通道命名**：`domain:action` (如 `blog:create`, `tag:list`)
- **主进程注册**：`src/main/ipc/*.ts`，通过 `registerAllIpcHandlers()` 汇总
- **Preload 暴露**：`src/preload/index.ts`，通过 `contextBridge.exposeInMainWorld('api', ...)`
- **响应格式**：`{ success: boolean, data?: T, error?: string }`
- **例外**：`tagList` 和 `recycleList` 直接返回数组（历史遗留）

---

## 前端路由

| 路径 | 组件 | 用途 | Phase |
|------|------|------|-------|
| `/` (index) | HomePage | 今日中枢 — 每日便签+日历+待办+迷你图谱+统计 | P20 |
| `/login` | LoginPage | 登录 | P1 |
| `/register` | RegisterPage | 注册 | P1 |
| `/dashboard` | → 重定向到 `/` | 已合并到 HomePage (D53) | P20 |
| `/blog` | BlogListPage | 博客列表 | P2 |
| `/blog/new` | BlogEditorPage / WebEditorPage | 新建博客 (桌面/Web 不同编辑器) | P2/P17 |
| `/blog/:id` | BlogPreviewPage | 博客详情 + 右侧 ContextPanel (链接/大纲/图谱) | P2 |
| `/blog/:id/edit` | BlogEditorPage / WebEditorPage | 编辑博客 | P2 |
| `/knowledge` | KnowledgeListPage | 知识库 | P3 |
| `/tags` | TagManagePage | 标签管理 | P5 |
| `/recycle` | RecycleBinPage | 回收站 (30 天自动清理) | P4 |
| `/settings` | SettingsPage | 设置 | P1 |
| `/notes` | NoteListPage | 便签 | P8 |
| `/series` | SeriesListPage | 博客系列列表 | P8 |
| `/series/:seriesId` | SeriesDetailPage | 系列详情 | P8 |
| `/guide` | GuidePage | 内置使用指南 (架构流程图+操作示意图) | P16 |
| `/graph` | GraphPage | 全屏 D3 知识图谱 — 类型/标签/日期过滤+缩放拖拽 | P20 |
| `*` | NotFoundPage | 404 | P20 |
| `/standalone/editor` | BlogEditorPage | 独立编辑器浮窗 (无侧边栏) | P20 |

**ContextPanel 路由白名单**：`/knowledge`, `/graph`, `/blog/*` — 这些路由右侧展开 ContextPanel (反向链接/大纲/图谱 Tab)。

---

## CSS 设计 Token 约束 — "精炼书房" (The Study)

### 设计隐喻
深夜书房，一盏台灯照在桌上。UI 是书架和桌面——低调、坚固、不抢戏。你进来是为了思考和写作。

### 三原则
- **I. 内容即焦点** — UI 是画框，不是画本身。写作/阅读时一切 chrome 隐退
- **II. 空间即秩序** — 每个元素有固定位置。侧边栏固定不躲闪，面板不漂浮
- **III. 颜色即信号** — 彩色仅标记"当前"(accent-blue)和"危险"(accent-red)。99% UI 用灰度层次

### 核心约束
- **禁止硬编码颜色** — 始终使用 `var(--token-name)`
- **暗色模式在 `:root`** 中定义，亮色模式在 `.light` 中覆盖，暖色 Sepia 在 `.sepia` 中覆盖
- **间距使用 8px 网格** — `--space-1: 4px` 到 `--space-6: 48px`
- **字体**：正文 Inter，代码 JetBrains Mono
- **图标**：Lucide SVG 细线图标 (无 Emoji, 无粗体图标)
- **强调色**：3 色 (蓝 accent/绿 success/红 danger)，琥珀和紫已移除 (Phase 20)
- **动效**：仅 150ms 颜色过渡 + 200ms 面板滑出，无弹跳、无 fadeUp、无呼吸
- **卡片**：8px 圆角，无阴影，hover 仅边框变色
- **侧边栏**：固定 220px，手动折叠 → 48px
- **阅读主题**：3 套 (暗 dark/亮 light/暖 Sepia)，对应 CSS class `.dark` / `.light` / `.sepia`
- **详情见** [STYLE.md](STYLE.md)

---

## 构建与发包

```bash
npm run build    # electron-vite build + post-build script
npm run dev      # electron-vite dev (热重载)
npm run server   # Express Web 服务器 (端口 3456)
npm run test     # Vitest 单元测试
npm run lint     # Biome 代码检查
npm run ci       # 一键全量验证
```

### 打包方式

| 方式 | 命令 | 产出 | 用途 |
|------|------|------|------|
| **便携版** (方案 A) | `node scripts/pack.js` | `release/Idiot-win32-x64/Idiot.exe` | 绿色免安装 |
| **NSIS 安装包** (方案 B) | `npx electron-builder --win` | `dist/Idiot_SetUp.exe` | 含自动升级 |

### 关键脚本

- **`scripts/run.js`** — 剥离 `ELECTRON_RUN_AS_NODE` 环境变量后运行命令
- **`scripts/post-build.js`** — 在 `out/` 中生成 `package.json`，去除 HTML 中 `crossorigin`，复制 img/ 到 ASAR
- **`scripts/launcher.bat`** — 清除 `ELECTRON_RUN_AS_NODE` 后启动 exe，快捷方式必须指向此 .bat

### 打包后白屏修复清单

| 问题 | 原因 | 修复 |
|------|------|------|
| `ELECTRON_RUN_AS_NODE=1` 系统环境变量 | Electron 以 Node.js 模式运行，`require('electron')` 返回路径字符串 | 快捷方式必须指向 `scripts/launcher.bat`；`scripts/run.js` 启动时清除 |
| GPU 硬件加速不兼容 | Chromium GPU 进程在某些 Windows 环境崩溃 | `app.disableHardwareAcceleration()` + `--disable-gpu` |
| `BrowserRouter` + `file://` 不兼容 | History API 在 `file://` 协议下无法工作 | 使用 `HashRouter` |
| `crossorigin` 阻止 ES 模块 | Vite 给 `<script type="module">` 加 `crossorigin` | `post-build.js` 中 `html.replace(/\s+crossorigin/g, '')` |
| CSP meta 标签过严 | 开发时 CSP 阻止打包后资源加载 | 移除 `index.html` 中 `<meta http-equiv="Content-Security-Policy">` |

### 打包资源检查 (安装版)

| 检查项 | 方法 |
|--------|------|
| `img/` 三位置 | `resources/img/` (extraResources) + `app.asar.unpacked/img/` (asarUnpack) + ASAR 内 `out/renderer/img/` (post-build.js) |
| `build/icon.png` | ≥ 30KB (256×256 真实图标)。~1KB = 透明/黑色 → NSIS 黑块。需用 Electron nativeImage 从 `img/favicon.ico` 生成 |
| 关键符号 | `grep "HashRouter"` / `grep "disableHardwareAcceleration"` / `grep "webviewTag"` / `grep "autoUpdater"` |

---

## 项目角色与协作机制

### 角色列表

| 角色 | 代号 | 核心职责 | 提示词 |
|------|------|----------|--------|
| 统筹策划者 | **Boss** | 使用产品、构思功能、裁决分歧、维护文档 | `prompts/boss.md` |
| 码农 | **Developer** | 编写/修改代码、重构、实现功能 | `prompts/developer.md` |
| 运维审计员 | **Auditor** | 审查代码、发现缺陷、验证修复 | `prompts/auditor.md` |

### 文档所有权

| 文档 | Boss | Developer | Auditor |
|------|------|-----------|---------|
| **todo.md** | ✅ 完全控制 | 更新状态 + 写备注 | 不可写 |
| **redo.md** | 裁决分歧 | 更新修复状态 + 写备注 | 写问题 + 验证结果 |
| **AGENTS.md** | ✅ Boss-only | 不可写 | 不可写 (通过报告建议) |
| **README.md** | ✅ Boss-only | 不可写 | 不可写 |
| **STYLE.md** | ✅ Boss 维护 | 不可写 | 不可写 |

### 协作流程

```
Boss 立案 (suggest.md / 双线提案) → 写入 todo.md
  ↓
Auditor Shift-Left 规格审查 (D-series 决策点)
  ↓
Boss 裁决 (二元制 A/B + 理由)
  ↓
Developer 实施 → Boss 快速自检 (grep/build/test)
  ↓
Auditor 实施审查 (R-series 发现)
  ↓
Developer 修复 → Auditor 确认 ✅
  ↓
Boss 结项验收 → sync-docs → ship
```

### 严重性等级

| 等级 | 处理策略 |
|------|----------|
| 🔴 P0 | 必须修，阻断 ship |
| 🟠 P1 | Phase 内必须清零 |
| 🟡 P2 | 高优先级修；可延后（需写理由） |
| 🟢 P3 | 可延后；顺手修 |

### 关键约束

1. **redo.md 有 🔴 P0 时，Developer 禁止开始新功能**
2. **Auditor 不改代码，Developer 不做审查，Boss 不写代码**
3. **AGENTS.md 和 README.md 仅 Boss 可写**
4. **todo.md 的任务描述仅 Boss 可改** (Developer 只更新状态和写备注)
5. **角色分歧由 Boss 裁决**，裁决写入 redo.md

---

## 常见陷阱

1. **`paths.ts` 的函数是 async** — `getWorkspacePath()`, `getBlogsDir()`, `getBlogPath()` 都需要 `await`
2. **MySQL 不支持** `LIMIT ? OFFSET ?` 预处理参数 — 必须内联到 SQL 字符串
3. **CJK 搜索有两个已知 bug** — (1) `use-search.ts` 和 `GlobalSearch.tsx` 硬编码 `query.trim().length < 2` 阻断单字搜索 (2) `Intl.Segmenter` 词级分词导致单字查不到多字词。Phase 21 T2104 修复
4. **内容双存储**：桌面端写文件 + DB，Web 端仅 DB — `getBlog()` 优先读文件，再回退 DB
5. **`blog_drafts`** 同时作草稿历史 + Web 端内容存储
6. **MySQL FULLTEXT 搜索失败时自动回退 LIKE** — `SearchService.mysqlSearchBlogs` catch 块调用 `fallbackBlogSearch`
7. **Service 返回 Promise 时 IPC handler 必须 `await`** — 否则 renderer 收到 Promise 对象而非数据
8. **修改 Schema 需同步三处 DDL** — `schema.ts`(sql.js) + `mysql.ts`(主进程 MySQL) + `db.ts`(服务器 MySQL)
9. **新增列需添加 ALTER TABLE 迁移** — 在 `db/index.ts` 的 `migrateDatabase()` 中加 `ALTER TABLE ... ADD COLUMN`
10. **开始菜单快捷方式必须指向 .bat** — 不能直接指 exe，否则系统级 `ELECTRON_RUN_AS_NODE` 导致 Electron 以 Node 模式运行
11. **`req.userId` 在路由中必须做运行时守卫** — 使用 `if (!userId) return res.status(401)...` 模式，禁止 `!` 非空断言
12. **Tiptap `setContent` 会触发 `onUpdate`** — Tiptap 规范化 HTML 导致 `setContent(content) ≈ onUpdate(editor.getHTML() ≠ content)` → 死循环。用 `isSettingRef` 标志在 `onUpdate` 中跳过
13. **SQLite `datetime('now')` 返回无时区字符串** — 存储统一用 `new Date().toISOString()` (ISO 8601 UTC)
14. **INSERT 也必须显式传时间戳** — MySQL `CURRENT_TIMESTAMP` 返回服务器本地时间，导致显示端二次偏移
15. **`markdown-it` 的 `html: true` 是 XSS 入口** — DOMPurify 白名单过滤在渲染前执行。HTML 渲染管线顺序：`md.render → wikilink 正则 → DOMPurify.sanitize → dangerouslySetInnerHTML`
16. **`[[wikilink]]` 在 blog:update 时统一处理** — Tiptap 不主动调 IPC ref:add。保存时 scan+diff+事务写入 (D58)。渲染时先 markdown-it 再 wikilink 正则再 DOMPurify (R174)
17. **ContextPanel 使用所有权 token 防竞态** — `registerTabs` 捕获 `ownerSid`, cleanup 检查 `sessionId` 匹配 (R186)
18. **图片资源必须 `asarUnpack`** — `nativeImage.createFromPath()` 依赖真实文件系统路径。`asarUnpack: ["img/**"]` 确保图片提取到 `app.asar.unpacked/img/`
19. **便携版 ASAR 更新必须验证每一步** — 28 bytes ASAR = `{"files":{}}` = 空 JSON = 崩溃。不用 `2>/dev/null` 隐藏 asar 错误
20. **`Intl.Segmenter` 仅限浏览器环境** — 主进程 (Node.js) 不可用。全局搜索索引构建/查询全在 Renderer Worker 中完成
21. **Wikilink 提取不能用 HTML 解析** — 用纯文本正则 `/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g` 扫描 (R206)
22. **阅读主题从 5 减为 3** — forest→dark, sakura→light, paper→sepia, midnight→dark。`migrateTheme()` 在加载时映射 (R183/D59)

---

## 当前状态 (2026-05-21)

- **Phase 1-22**: ✅ 全部完成
  - Phase 22 13/13：知识活化 — HomePage重构/Obsidian日历/Blog↔KB打通/被动发现/AI集成/Transclusion/标签页/Bookmarks/Saved Search/时间轴/更新管理/剪贴板/快捷便签
  - Phase 21 12/12：编辑器进化 + 知识连接 + 内容中枢
  - Phase 20 18/18：3栏布局 / [[双向链接]] / 知识图谱 / 今日中枢 / MCP Server / 设计语言重塑
- **当前活跃**: Phase 23 📋 (7 项 ~48h): "精炼书房" — 五套国风/博客卡片化/原地编辑/便签改造/KB重塑/导航重塑/白板
- **审查修复**: 累计 ~339 个工单 (R01-R339), ~100 个决策点。D-series + R-series 全部裁决
- **当前待修复**: 🔴0 🟠1 (R338 bgImage路径穿越) 🟡1 (R339 KB冲突) 🟢Phase23 spec gap → Phase 24
- **构建状态**: ✅ 测试 87/87 pass (12 files) | tsc 零错误 | build ✅
- **`noUncheckedIndexedAccess`**: 永久启用。renderer `: any` = 15, `as any` = 25 (Phase 23 新增代码引入，延 Phase 24 清零)
- **IPC**: 139 通道。Service: 18。IPC handler files: 19。Server route: 13。DB: 12 表
- **已知缺口**: 国际化 i18n (否决 D18=C); PDF 批注/OCR/块级引用/自定义仪表盘 (路线不重叠)

---

## AI Agent 治理框架 (精简)

### 第一层 — 约束 (Constrain)

- `src/main/` 禁放 React/JSX | `src/renderer/` 禁放 Node API | `src/preload/` 禁放业务逻辑 | `src/shared/` 禁放运行时逻辑 | `src/server/` 禁放 Electron API
- 禁止直接调用 `get()`/`all()`/`run()` from `../db` — 用 service 层 `dbGet`/`dbAll`/`dbRun`
- 禁止 SQL 拼接用户输入 — 始终参数化查询
- IPC 通道名仅定义在 `ipc-channels.ts`，响应格式 `{ success, data?, error? }`
- 禁止在 renderer 直接 `ipcRenderer.invoke` — 通过 `window.api.*`

### 第二层 — 告知 (Inform)

必读文件 (按优先级):
- P0: `AGENTS.md` (本文档) | `src/shared/types.ts` | `src/shared/ipc-channels.ts`
- P1: `src/shared/constants.ts` | `todo.md` | `redo.md` | `STYLE.md` | `prompts/*.md`
- P2: `docs/phase-archive.md` | `docs/history-audit.md` | `docs/development-guide.md` | `package.json` | `src/main/db/schema.ts` | `src/main/db/mysql.ts`
- P3: `README.md`

### 第三层 — 验证 (Verify)

```bash
npm run ci       # 一键全量 (lint:arch + biome + tsc + build + test)
npm run review   # 提交前检查 (lint:arch + biome + tsc + build)
npm run gc       # 死代码检测
```

验证流水线: TypeScript 编译 → Biome Lint → 架构检查 → 单元测试 → 构建产物验证

### 第四层 — 纠正 (Correct)

| 错误特征 | 根因 | 修复方向 |
|----------|------|----------|
| `Cannot find module 'fs'` in renderer | 违反目录约束 | 移除 Node API, 或通过 IPC 桥接 |
| `window.api.xxx is not a function` | IPC 未注册 | 检查 5 步: channels.ts → handler → index.ts register → preload → window-api |
| `MySQL requires async` | 同步调用 | 替换为 `dbGet`/`dbAll`/`dbRun` |
| `Type '...' is not assignable` | shared types 未同步 | 对照 `src/shared/types.ts` 更新引用点 |
| `FOREIGN KEY constraint failed` | 删除顺序错误 | 先删子表 → 再删父表；确认 CASCADE 已配置 |

**纠正原则**: 默认为删除而非添加 | 修改最小化 | 修复后必须 `npm run build` 通过 | 新增功能必须更新 todo.md
