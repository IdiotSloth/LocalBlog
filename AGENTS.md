# AGENTS.md — Local Blog KB

> 面向 AI Agent 的工程上下文文档。供 Claude Code、Codex、Cline 等 AI 工具读取。
> 最后更新：2026-05-07 (Phase 14 全部完成, redo.md 清零, ship)

---

## 架构概览

```
┌──────────────────────────────────────────────────────┐
│                    Electron 41 桌面壳                  │
│  ┌──────────┐   contextBridge    ┌──────────────────┐ │
│  │ 主进程    │◄─────IPC───────►│ 渲染进程 (React 19) │ │
│  │ Node.js  │  91 个通道      │ Vite 7 + Tailwind │ │
│  └────┬─────┘                   └────────┬─────────┘ │
│       │                                  │            │
│       │  ┌────────────────────┐          │            │
│       └─►│ MySQL 8.3 (主)      │◄─────────┘            │
│          │ sql.js WASM (回退)  │                       │
│          └────────┬───────────┘                       │
└───────────────────┼──────────────────────────────────┘
                    │
    ┌───────────────┴───────────────┐
    │      Express 5 Web 服务器      │
    │      端口 3456 · JWT Cookie   │
    │      React SPA 静态托管        │
    └───────────────────────────────┘
```

**关键原则**：桌面端与 Web 端共享同一 MySQL 数据库和业务逻辑。桌面端用 IPC 通信，Web 端用 REST API + JWT Cookie。

---

## 目录约束

| 目录 | 作用 | 不可放入 |
|------|------|---------|
| `src/main/` | Electron 主进程 (Node.js) | React 组件、DOM API |
| `src/main/db/` | 数据库抽象层 (MySQL + sql.js) | 业务逻辑 |
| `src/main/services/` | 业务逻辑服务类 | IPC 注册、DOM |
| `src/main/ipc/` | IPC 通道注册 (ipcMain.handle) | 业务逻辑 |
| `src/main/utils/` | 工具函数 (加密、路径) | 状态管理 |
| `src/preload/` | contextBridge 暴露 API | 业务逻辑、DOM |
| `src/renderer/` | React 前端 | Node.js API |
| `src/renderer/components/` | 可复用 UI 组件 | 业务逻辑、路由 |
| `src/renderer/features/` | 页面级组件 (路由目标) | IPC 通信 |
| `src/renderer/stores/` | Zustand 状态管理 | 渲染逻辑 |
| `src/renderer/lib/` | 前端工具、API 客户端 | 组件 |
| `src/server/` | Express Web 服务器 | Electron API |
| `src/server/routes/` | REST 路由 | 业务逻辑 |
| `src/server/middleware/` | Express 中间件 | 业务逻辑 |
| `src/shared/` | 跨进程共享 (类型、常量、IPC 通道名) | 任何运行时逻辑 |
| `prompts/` | 角色提示词 (boss/developer/auditor) | 运行时逻辑、代码文件 |


---

## 数据库约束

### 表结构 (10 张表)
```
users ─┬─► blogs ─┬─► blog_tags ◄── tags
       │          └─► blog_drafts
       ├─► knowledge_files ─► knowledge_file_tags ◄── tags
       ├─► recycle_bin
       ├─► sessions
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
- **所有 DB 调用必须 async** — 使用 `service` 层的 `dbGet/dbAll/dbRun` 包装器
- **禁止直接调用** `get()`, `all()`, `run()` from `../db` — MySQL 模式下会抛错
- **`saveToDisk()`** 仅在 sql.js 模式下有效，MySQL 下为 no-op
- **`isUsingMySQL()`** 用于运行时检测当前后端

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

| 路径 | 组件 | 用途 |
|------|------|------|
| `/login` | LoginPage | 登录 |
| `/register` | RegisterPage | 注册 |
| `/dashboard` | DashboardPage | 仪表盘 |
| `/blog` | BlogListPage | 博客列表 |
| `/blog/new` | BlogEditorPage | 新建博客 |
| `/blog/:id` | BlogPreviewPage | 博客详情 |
| `/blog/:id/edit` | BlogEditorPage | 编辑博客 |
| `/knowledge` | KnowledgeListPage | 知识库 |
| `/tags` | TagManagePage | 标签管理 |
| `/recycle` | RecycleBinPage | 回收站 |
| `/settings` | SettingsPage | 设置 |

---

## CSS 设计 Token 约束

- **禁止硬编码颜色** — 始终使用 `var(--token-name)`
- **暗色模式在 `:root`** 中定义，亮色模式在 `.light` 中覆盖
- **间距使用 8px 网格** — `--space-1: 4px` 到 `--space-6: 48px`
- **字体**：正文 Inter，代码 JetBrains Mono
- **内容最大宽度**：`var(--content-max) = 780px`

---

## 构建与发包

```bash
npm run build    # electron-vite build + post-build script
npm run dev      # electron-vite dev (热重载)
npm run server   # Express Web 服务器 (端口 3456)
npm run make     # 打包为 Windows 安装程序
npm run test     # Vitest 单元测试
npm run lint     # Biome 代码检查
```

- **`scripts/run.js`** — 剥离 `ELECTRON_RUN_AS_NODE` 环境变量后运行命令
- **`scripts/post-build.js`** — 在 `out/` 中生成供 electron-packager 使用的 `package.json`
- **`forge.config.ts`** 输出目录：`./release`
- **`forge.config.ts` ignore**：排除 `src/`, `tests/`, `.claude/`, `scripts/`, `resources/`, `*.ts` 源文件
- **打包后白屏修复清单** (常见于 Windows 环境):

| 问题 | 原因 | 修复 |
|------|------|------|
| `ELECTRON_RUN_AS_NODE=1` 系统环境变量 | Electron 以 Node.js 模式运行，`require('electron')` 返回路径字符串而非 API 对象 | 开始菜单快捷方式必须指向 `scripts/launcher.bat`（先 `set ELECTRON_RUN_AS_NODE=` 再启动 exe）；`scripts/run.js` 启动时自动清除 |
| GPU 硬件加速不兼容 | Chromium GPU 进程在某些 Windows 环境崩溃 | `app.disableHardwareAcceleration()` + `app.commandLine.appendSwitch('disable-gpu')` 放在入口最顶部 |
| `BrowserRouter` + `file://` 不兼容 | History API 在 `file://` 协议下无法工作 | 改用 `HashRouter`（URL hash 路由） |
| `crossorigin` 阻止 ES 模块 | Vite 在 `<script type="module">` 上加 `crossorigin`，`file://` 下无法加载 | `post-build.js` 中 `html.replace(/\s+crossorigin/g, '')` |
| CSP meta 标签过严 | 开发时设置的 CSP 阻止打包后资源加载 | 移除 `index.html` 中 `<meta http-equiv="Content-Security-Policy">` |
| `electron-forge make` 卡在 Finalizing | Squirrel 安装器创建缓慢或失败 | 手动 ASAR 打包：`asar extract` → 替换 `out/` → `asar pack` |

- **手动 ASAR 更新** (当 electron-forge 卡住时)：
  ```bash
  npx asar extract release/LocalBlogKB-win32-x64/resources/app.asar /tmp/app
  cp -r out/main out/preload out/renderer out/package.json /tmp/app/out/
  rm release/LocalBlogKB-win32-x64/resources/app.asar
  npx asar pack /tmp/app release/LocalBlogKB-win32-x64/resources/app.asar
  ```

---

---

## 项目角色与协作机制

> 详细角色提示词见 `prompts/` 目录。以下为精简概览，AI 工具首次加载时应了解。

### 角色列表

| 角色 | 代号 | 核心职责 | 详细提示词 |
|------|------|----------|-----------|
| 统筹策划者 | **Boss** | 使用产品、构思功能、裁决分歧、维护文档 | `prompts/boss.md` |
| 码农 | **Developer** | 编写/修改代码、重构、实现功能 | `prompts/developer.md` |
| 运维审计员 | **Auditor** | 审查代码、发现缺陷、验证修复 | `prompts/auditor.md` |

### 文档所有权

| 文档 | Boss | Developer | Auditor |
|------|------|-----------|---------|
| **redo.md** | 裁决分歧 | 更新修复状态 + 写备注 | 写问题 + 验证结果 |
| **todo.md** | 完全控制 | 更新状态 + 写备注 | 不可写 |
| **AGENTS.md** | 巡检后更新 | 不可写 | 不可写（通过报告建议） |
| **README.md** | 巡检后更新 | 不可写 | 不可写 |

### 协作流程

Auditor 审查代码 → 写入 redo.md (📋)
↓
Developer 读取并修复
↓
更新 redo.md (✅) + todo.md (✅)
↓
Auditor 验证 → ✅ 结案 / 🔄 退回重修
↓
Boss 巡检 → 更新 AGENTS.md + README.md


### 工单生命周期（redo.md）

📋 待修复 → 🚧 修复中 → ✅ 已修复（Auditor 验证通过）
→ 🔄 修复不完整（Auditor 退回）
→ ⏭ 已跳过（Boss 批准）


### 关键约束

1. **redo.md 有 🔴 P0 时，Developer 禁止开始新功能**
2. **Auditor 不改代码，Developer 不做审查，Boss 不写代码**
3. **AGENTS.md 和 README.md 仅 Boss 可写**（Auditor 通过审查报告建议）
4. **todo.md 的任务描述仅 Boss 可改**（Developer 只更新状态和写备注）
5. **角色间的分歧由 Boss 裁决**，裁决结果写入 redo.md "Boss 裁决"字段

### 角色切换

在对话中通过以下指令切换角色，AI 应读取对应 `prompts/*.md` 文件获取完整规则：

- `你现在以 Boss 身份工作` → 读取 `prompts/boss.md`
- `你现在以 Developer 身份工作` → 读取 `prompts/developer.md`
- `你现在以 Auditor 身份工作` → 读取 `prompts/auditor.md`

---

## 常见陷阱

1. **`paths.ts` 的函数现在是 async** — `getWorkspacePath()`, `getBlogsDir()`, `getBlogPath()` 都需要 `await`
2. **MySQL 不支持** `LIMIT ? OFFSET ?` 预处理参数 — 必须内联到 SQL 字符串
3. **搜索使用 SQL LIKE** — 全文搜索 (FTS5) 尚未实现
4. **内容双存储**：桌面端写文件 + DB，Web 端仅 DB — `getBlog()` 优先读文件，再回退 DB
5. **`blog_drafts`** 同时作草稿历史 + Web 端内容存储
6. **Drizzle ORM 配置指向 SQLite** — MySQL 版本未使用 ORM
7. **数据库持久化由 `dbRun` 自动完成** — 不需要手动调用 `saveToDisk()`/`dbSave()` (会报 ReferenceError)
8. **Service 返回 Promise 时 IPC handler 必须 `await`** — 否则 renderer 收到 Promise 对象而非数据
9. **修改 Schema 需同步三处 DDL** — `schema.ts`(sql.js) + `mysql.ts`(主进程 MySQL) + `db.ts`(服务器 MySQL)，目前存在重复定义
10. **开始菜单快捷方式必须指向 .bat 包装器** — 不能直接指向 exe，否则系统级 `ELECTRON_RUN_AS_NODE=1` 会导致 Electron 以 Node 模式运行。`.bat` 包装器先 `set ELECTRON_RUN_AS_NODE=` 再 `start "" "exe路径"`
11. **打包环境不会自动清除 `ELECTRON_RUN_AS_NODE`** — `cmd.exe` 从 Windows 注册表重新读取系统环境变量，即使 shell 中已清除。快捷方式必须通过 `.bat` 包装器启动
12. **`npm run make` 不自动构建** — 必须先 `npm run build` 再 `npm run make`，否则打包的是旧构建产物
13. **修改 `SCHEMA_SQL` 后必须添加对应的 ALTER TABLE 迁移** — sql.js 用户使用旧数据库文件，新增列不会自动添加。在 `db/index.ts` 的 `migrateDatabase()` 中添加 `ALTER TABLE ... ADD COLUMN` 语句 (R30)
14. **`req.userId` 在路由中必须做运行时守卫** — Express `req.userId` 类型为 `string | undefined`，禁止使用 `!` 非空断言。应使用 `const userId = req.userId; if (!userId) return res.status(401).json({success:false, error:'Unauthorized'})` 模式。所有 7 个路由文件已统一应用 (F49)
15. **`deleteAccount` 的 `keepFiles` 语义已明确定义** — `keepFiles=true` 仅保留磁盘文件，DB 元数据全部清空（CASCADE）。文件成为无主孤魂，但可通过重新注册（同用户名+同 workspace）reclaim (F54)
16. **`clearSelection()` 不应重置 `isBatchMode`** — 批量模式下清除选中项不应退出批量模式，否则 `toggle` 按钮在 `clearSelection` 后立即被重置，形成死循环 (R31)
17. **删除 DB 记录前先取文件路径** — `permanentlyDeleteItem` 需在 DELETE 语句执行前读取 `user_id`/`format`/`file_path` 等字段，因为删完 DB 就取不到了。知识库文件仅删工作区内副本，不碰外部引用文件 (R33)
18. **Tiptap `setContent` 会触发 `onUpdate`** — Tiptap 规范化 HTML（加空格、改属性顺序）导致 `setContent(content)` ≈ `onUpdate(editor.getHTML() ≠ content)` ≈ 死循环。修复：用 `isSettingRef` 标志在 `onUpdate` 中跳过本次 `onChange` (R34)
19. **SQLite `datetime('now')` 返回无时区字符串** — `datetime('now')` 返回 `2026-05-02 00:00:00` 不带 Z 后缀。JS `new Date()` 在 V8 中当本地时间解析。存储统一用 `new Date().toISOString()` (ISO 8601 UTC)；显示端 `formatDate` 检测无 TZ 字符串时追加 `Z` 强制 UTC 解析 (R35)
20. **INSERT 也必须显式传时间戳** — UPDATE 语句已改用 `new Date().toISOString()`，但 INSERT 若省略 `created_at` 列仍依赖 DB DEFAULT。MySQL `CURRENT_TIMESTAMP` 返回服务器本地时间而非 UTC，导致显示端二次偏移。所有 INSERT 必须显式传入时间戳 (R36)
21. **`markdown-it` 的 `html: true` 是 XSS 入口** — `dangerouslySetInnerHTML` + `html: true` 会透传 `<script>` 标签。DOMPurify 已在渲染前做白名单过滤 (T1101)。Electron 的 `contextIsolation` 进一步限制了破坏力 (B4/T903)

---

## 当前状态 (2026-05-07)

- **Phase 1-14**: ✅ 全部完成 (~366.5h)
  - Phase 14 11/11 任务 + R102-R105 全关闭，renderer `as any` 32→0，BlogEditorPage 30 useState→1 useReducer
- **审查修复** (2026-04-30 ~ 05-07): 累计 85 项修复 (F01-F85), 105 个工单 (R01-R105)
- **当前待修复**: 🔴0 🟡0 🟢0 — redo.md 全部清零
- **已知缺口**: 国际化、FTS5、TypeScript strict 模式 (T1403 前置完成，开关未开)
- **构建状态**: ✅ 测试 27/27 pass | E2E 11/11 pass

---

## AI Agent 治理框架 (四层)

> 本项目的 AI Agent 安全机制分为四个层次，依次递进。每层解决上一层的盲区。

### 第一层 — 约束 (Constrain)

**目标**: 在 AI Agent 产生输出之前就限定其行为空间，防止不可逆的破坏。

#### 1.1 文件放置约束

| 规则 | 详情 |
|------|------|
| `src/main/` 禁放 React/JSX | 主进程不渲染 UI，引入 React 会导致运行时 `SyntaxError` |
| `src/renderer/` 禁放 Node API | `fs`, `path`, `electron` 在沙箱中不可用；需要时通过 IPC 调用 |
| `src/preload/` 禁放业务逻辑 | 仅 `contextBridge.exposeInMainWorld('api', {...})` |
| `src/shared/` 禁放运行时逻辑 | 仅类型定义、常量、IPC 通道名 — 不加任何 `fetch`/`fs`/`useEffect` |
| `src/server/` 禁放 Electron API | 服务器运行在纯 Node.js 环境，`BrowserWindow`/`ipcMain` 不可用 |

#### 1.2 数据库约束

| 规则 | 详情 |
|------|------|
| 禁止直接调用 `get()`/`all()`/`run()` from `../db` | 必须使用 service 层的 `dbGet`/`dbAll`/`dbRun` — MySQL 下同步版会抛错 |
| 禁止 SQL 拼接用户输入 | 始终使用参数化查询 `dbAll(sql, [param1, param2])` |
| 禁止 `LIMIT ? OFFSET ?` 预处理 | MySQL 不支持 — 内联到 SQL 字符串 |
| 禁止 `INSERT OR IGNORE INTO` | SQLite 语法 → MySQL 用 `INSERT IGNORE INTO` |
| 禁止 `datetime('now')` | SQLite 语法 → MySQL 用 `NOW()` |
| 修改 Schema 必须同步三处 | `schema.ts`(sql.js) + `mysql.ts`(主进程 MySQL) + `db.ts`(服务器 MySQL) |

#### 1.3 IPC 通信约束

| 规则 | 详情 |
|------|------|
| 通道名仅定义在 `ipc-channels.ts` | 不在 handler 或 preload 中硬编码字符串 |
| 响应格式: `{ success, data?, error? }` | 例外: `tag:list`/`recycle:list` 直接返回数组 (历史遗留, 已知) |
| 异常必须在 handler 中 catch | Service 冒出的异常必须转换为 `{ success: false, error }` |
| 禁止在 renderer 直接 `ipcRenderer.invoke` | 始终通过 `window.api.*` (preload 暴露) |

#### 1.4 样式约束

| 规则 | 详情 |
|------|------|
| 禁止硬编码颜色值 | 使用 `var(--token-name)` |
| 暗色在 `:root` 定义, 亮色在 `.light` 覆盖 | 不混写 |
| 间距用 8px 网格 | `--space-1: 4px` 到 `--space-6: 48px` |

---

### 第二层 — 告知 (Inform)

**目标**: 在 AI Agent 已有足够上下文的前提下产生高质量代码，减少返工轮次。

#### 2.1 必读文件 (按优先级)

| 优先级 | 文件 | 为什么 |
|--------|------|--------|
| P0 | `AGENTS.md` | 本文档 — 架构约束 + 常见陷阱 |
| P0 | `src/shared/types.ts` | 所有数据结构的权威定义 |
| P0 | `src/shared/ipc-channels.ts` | 91 个 IPC 通道签名 |
| P1 | `src/shared/constants.ts` | 目录名、扩展名白名单、限制值 |
| P1 | `todo.md` | 当前待办与 Phase 完成状态 (详细任务规格已移至 docs/) |
| P1 | `redo.md` | 技术债与修复清单 |
| P1 | `STYLE.md` | 设计系统规范 (颜色/间距/字体) |
| P1 | `prompts/*.md` | 角色切换时读取对应文件，获取完整工作规则 |
| P2 | `docs/phase-archive.md` | Phase 1-13 完整任务规格 (历史档案) |
| P2 | `docs/development-guide.md` | 测试策略、工作流程图、文件清单、依赖关系 |
| P2 | `package.json` | 依赖版本、可执行脚本 |
| P2 | `src/main/db/schema.ts` | SQLite DDL (sql.js 回退) |
| P2 | `src/main/db/mysql.ts` | MySQL DDL + 方言翻译 |
| P3 | `README.md` | 人类可读的项目概览 |

#### 2.2 上下文信号

| 信号 | 含义 | Agent 应如何处理 |
|------|------|------------------|
| `isUsingMySQL()` 返回 `true` | 当前运行 MySQL | 使用 `getAsync`/`allAsync`/`runAsync`；避免 SQLite 专有语法 |
| `isUsingMySQL()` 返回 `false` | 当前运行 sql.js | 可使用同步 `get`/`all`/`run`；FTS5 不可用 |
| `window.api` 存在 | 在 Electron 环境中 | 使用 IPC 通信 |
| `window.api` 不存在 | 在浏览器环境中 | 使用 `fetch` REST API (api-client.ts) |
| `app.isPackaged` 为 `true` | 生产打包 | 不唤起 `console.log` 调试输出 |
| `.dark` class 在 `<html>` 上 | 深色模式激活 | 使用 `var(--color-bg-primary)` 等 Token |
| `blog.format === 'md'` | Markdown 格式 | markdown-it 渲染 |
| `blog.format === 'html'` | HTML 格式 | 直接 `dangerouslySetInnerHTML` |

#### 2.3 模块耦合度地图

```
高耦合 (修改需同步多人):
  src/shared/types.ts  ←→  src/main/services/*  ←→  src/server/routes/*
  src/shared/ipc-channels.ts  ←→  src/preload/index.ts  ←→  src/main/ipc/*
  src/main/db/schema.ts  ←→  src/main/db/mysql.ts  ←→  src/server/db.ts

低耦合 (可独立修改):
  src/renderer/features/*     (页面间相互独立)
  src/renderer/stores/*       (store 间相互独立)
  src/main/services/*         (service 间相互独立, 仅依赖 db 层)
    ├─ folder.service.ts      (Phase 7 新增 — 独立)
    ├─ stats.service.ts       (Phase 7 新增 — 独立)
    └─ reference.service.ts   (Phase 7 新增 — 独立)
  src/server/routes/*         (route 间相互独立, 仅依赖 db 层)
```

---

### 第三层 — 验证 (Verify)

**目标**: 代码产生后、合并前，通过自动化检查确证 Agent 的输出是正确的。

#### 3.1 验证流水线

```
Agent 输出代码
     │
     ├── 第1关: TypeScript 编译
     │   npm run build (隐含 tsc)
     │   检查: 类型错误、缺失导入、接口不匹配
     │   失败则: 退回修改
     │
     ├── 第2关: Biome Lint
     │   npm run lint
     │   检查: 代码风格、潜在 bug、复杂度
     │   失败则: npm run check (自动修复)
     │
     ├── 第3关: 架构检查
     │   npm run lint:arch
     │   检查: 目录约束违规 (如 main 中引入 React)
     │   失败则: 对照 §1 约束层修正
     │
     ├── 第4关: 单元测试
     │   npm run test
     │   检查: service/util 逻辑正确性
     │   失败则: 分析测试用例, 修正实现
     │
     └── 第5关: 构建产物验证
         npm run make (或 npm run build)
         检查: electron-forge 打包成功
         失败则: 检查 forge.config.ts ignore 规则
```

#### 3.2 验证命令速查

```bash
npm run ci          # 一键全量验证 (lint:arch + biome + tsc + build + test)
npm run review      # 提交前检查 (lint:arch + biome + tsc + build)
npm run lint:all    # 完整类型 + Lint 检查
npm run gc          # 死代码检测
npm run gc:audit    # 死代码审计报告
```

#### 3.3 关键验证点

| 验证点 | 检查方式 | 失败时常见原因 |
|--------|----------|---------------|
| 新增 IPC 通道 | `grep -r "ipcMain.handle" src/main/ipc/` | preload 未暴露；ipc-channels.ts 未定义 |
| 新增 Service 方法 | `tsc -p tsconfig.node.json --noEmit` | 返回类型不匹配；dbGet/dbAll 未正确使用 |
| 新增前端路由 | 访问页面是否 404 | App.tsx 未注册；ProtectedRoute 包裹错误 |
| 修改 shared types | `npm run build` 两边都通过 | 服务器和渲染端使用矛盾 |
| 修改数据库 Schema | 三处 DDL 是否一致 | schema.ts ≠ mysql.ts ≠ db.ts |
| 新增依赖 | `npx depcheck` | 未声明在 package.json 中 |

---

### 第四层 — 纠正 (Correct)

**目标**: 当验证层发现错误时, 提供精确的修复路径。反馈越具体, Agent 回归越快。

#### 4.1 错误模式 → 修复映射

| 错误特征 | 根因分类 | 修复方向 |
|----------|----------|----------|
| `Cannot find module 'fs'` in renderer | 违反 §1.1 目录约束 | 移除 Node API 调用, 或通过 IPC 桥接 |
| `window.api.xxx is not a function` | IPC 通道未注册 | 在 `ipc/index.ts` 注册 handler → `preload/index.ts` 暴露 → `ipc-channels.ts` 定义 |
| `MySQL requires async` | 同步 `get()`/`all()`/`run()` 在 MySQL 模式下调 | 替换为 `getAsync`/`allAsync`/`runAsync` 或 `dbGet`/`dbAll`/`dbRun` |
| `ReferenceError: dbSave is not defined` | 直接调用了不存在的持久化函数 | 移除调用 — `dbRun` 内部已调用 `saveToDisk()` |
| `Type '...' is not assignable to type '...'` | shared types 修改未同步 | 对照 `src/shared/types.ts` 更新所有引用点 |
| `FOREIGN KEY constraint failed` | 删除顺序错误 | 先删子表 → 再删父表；或确认 CASCADE 已配置 |
| `ENOTDIR: not a directory` | 路径拼接错误 | 使用 `getWorkspacePath()`/`getBlogsDir()` 等工具函数，不用字符串拼接 |
| `.dark` 色调错误 | 硬编码颜色值 | 替换为 CSS 变量 `var(--color-xxx)` |

#### 4.2 自我修复流程

```
验证失败
    │
    ├── TypeScript 错误?
    │   → 读取错误行号和消息
    │   → 对照 shared/types.ts 检查类型定义
    │   → 修复后重新 npm run build
    │
    ├── Biome 错误?
    │   → npm run check (自动修复)
    │   → 手动处理无法自动修复的规则
    │
    ├── 架构违规?
    │   → npm run lint:arch (查看违规详情)
    │   → 对照 §1 约束层定位违规目录
    │   → 移动文件到正确目录
    │
    ├── 测试失败?
    │   → 读取失败的测试用例
    │   → 确认是实现错误还是测试过期
    │   → 实现错误: 修正业务逻辑
    │   → 测试过期: 更新测试用例 (谨慎)
    │
    └── 构建产物不完整?
        → 检查 forge.config.ts ignore 规则
        → 确认文件不在 ignore 列表中
        → 重新 npm run build
```

#### 4.3 纠正原则

1. **默认为删除而非添加**: 死代码直接删除，不注释不保留
2. **修改最小化**: 一个 PR 只修一个问题，不混入无关重构
3. **修复后必须验证**: 至少 `npm run build` 通过再报告完成
4. **新增功能必须更新 todo.md**: 不在计划中的功能视为偏离
