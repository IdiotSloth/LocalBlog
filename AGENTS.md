# AGENTS.md — Local Blog KB

> 面向 AI Agent 的工程上下文文档。供 Claude Code 等 AI 工具读取。
> 最后更新：2026-05-21 | Phase 24 📋

---

## 架构概览

```
┌──────────────────────────────────────────────────────────────┐
│                    Electron 41 桌面壳                         │
│  ┌──────────┐   contextBridge    ┌──────────────────────────┐ │
│  │ 主进程    │◄───139 IPC──────►│ 渲染进程 (React 19)        │ │
│  │ Node.js  │                   │ Vite 7 + Tailwind CSS v4  │ │
│  │ 18 svc   │                   │ HashRouter · Zustand 5    │ │
│  └────┬─────┘                   └────────┬─────────────────┘ │
│       │                                  │                    │
│       │  ┌────────────────────┐          │                    │
│       └─►│ sql.js WASM (主)    │◄─────────┘                   │
│          │ MySQL 8.3 (可选)     │  ⚠️ Phase 24 移除 MySQL     │
│          └────────┬───────────┘                              │
└───────────────────┼─────────────────────────────────────────┘
                    │
    ┌───────────────┴───────────────┐
    │  Express 5 Web 服务器 ⚠️ 废弃  │
    │  端口 3456 (Phase 24 移除)     │
    └───────────────┬───────────────┘
                    │
    ┌───────────────┴───────────────┐
    │  MCP Server (stdio)           │
    │  12 tools · 默认只读          │
    └───────────────────────────────┘
```

**当前架构**: 桌面端 sql.js WASM 为主数据库，IPC 为唯一数据通道。MySQL + Express + Web Server 为历史遗留，Phase 24 正式移除。

---

## 目录约束

| 目录 | 作用 | 不可放入 | 文件数 |
|------|------|---------|--------|
| `src/main/` | Electron 主进程 (Node.js) | React 组件、DOM API | — |
| `src/main/db/` | 数据库抽象层 (sql.js + MySQL→废弃) | 业务逻辑 | 4 |
| `src/main/services/` | 业务逻辑服务类 | IPC 注册、DOM | 18 |
| `src/main/ipc/` | IPC 通道注册 (ipcMain.handle) | 业务逻辑 | 19 |
| `src/main/utils/` | 工具函数 (加密、路径) | 状态管理 | — |
| `src/preload/` | contextBridge 暴露 API | 业务逻辑、DOM | 1 |
| `src/renderer/` | React 前端 | Node.js API | — |
| `src/renderer/components/` | 可复用 UI 组件 | 业务逻辑、路由 | — |
| `src/renderer/features/` | 页面级组件 (路由目标) | IPC 通信 | — |
| `src/renderer/stores/` | Zustand 状态管理 | 渲染逻辑 | — |
| `src/renderer/lib/` | 前端工具、API 客户端、hooks | 组件 | — |
| `src/renderer/workers/` | Web Worker (search + embedding) | DOM API | 2 |
| `src/server/` | Express Web 服务器 ⚠️ 废弃中 | Electron API | 13 routes |
| `src/shared/` | 跨进程共享 (类型、常量、IPC 通道名) | 任何运行时逻辑 | — |
| `src/mcp-server/` | MCP Server 独立 CLI + 工具实现 | Electron API | — |

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

### 数据库 API 约束

- **所有 DB 调用必须 async** — 使用 service 层 `dbGet`/`dbAll`/`dbRun` 包装器
- **禁止直接调用** `get()`/`all()`/`run()` from `../db`
- **`saveToDisk()`** — sql.js 模式下导出 WASM 内存到文件
- **修改 Schema 必须同步** — `schema.ts` (sql.js) + `db/index.ts` ALTER TABLE migration

> ⚠️ **Phase 24 变更预告**: MySQL 双后端 + Express 服务器正式移除。Schema 同步从三处 DDL 简化为单处。`isUsingMySQL()` / `toMySQL()` 全面清理。

---

## IPC 通道约束

- **所有 IPC 通道定义在** `src/shared/ipc-channels.ts` (139 条)
- **通道命名**: `domain:action` (如 `blog:create`, `tag:list`, `whiteboard:node-create`)
- **主进程注册**: `src/main/ipc/*.ts` (19 files)，通过 `registerAllIpcHandlers()` 汇总
- **Preload 暴露**: `src/preload/index.ts`，`contextBridge.exposeInMainWorld('api', ...)`
- **响应格式**: `{ success: boolean, data?: T, error?: string }`
- **完整链路 (5 步)**: `ipc-channels.ts` → `src/main/ipc/*.ts` handler → `registerAllIpcHandlers()` → `preload/index.ts` → `window-api.ts`

---

## 前端路由

| 路径 | 组件 | 用途 | Phase |
|------|------|------|-------|
| `/` | HomePage | 今日中枢 — 便签+待办+日历+迷你图谱+继续面板+统计 | P20/22 |
| `/blog` | BlogListPage | 博客列表 (BlogCard Feed) | P2/23 |
| `/blog/new` | BlogEditorPage | 新建博客 | P2 |
| `/blog/:id` | BlogPreviewPage | 博客详情 + 原地编辑 + ContextPanel | P2/23 |
| `/blog/:id/edit` | BlogEditorPage | 编辑博客 (独立页) | P2 |
| `/knowledge` | KnowledgeListPage | 知识库卡片画布 | P3/23 |
| `/tags` | TagManagePage | 标签管理 + 标签聚合 BlogCard Feed | P5/23 |
| `/recycle` | RecycleBinPage | 回收站 (30 天自动清理) | P4 |
| `/settings` | SettingsPage | 设置 (主题/AI/更新/剪贴板/背景图) | P1/23 |
| `/notes` | NoteListPage | 便签列表 | P8 |
| `/series` | SeriesListPage | 博客系列列表 | P8 |
| `/series/:seriesId` | SeriesDetailPage | 系列详情 (BlogCard ①②③) | P8/23 |
| `/guide` | GuidePage | 交互式使用指南 (13 章 markdown) | P16/23 |
| `/graph` | → 302 `/whiteboards` | D3 图谱 (Phase 24 移除) | P20→P24 |
| `/whiteboards` | WhiteboardPage | React Flow 无限画布白板 | P23 |
| `/bookmarks` | BookmarksPage | 跨模块统一书签 | P22 |
| `/timeline` | TimelinePage | 博客/知识库时间轴视图 | P22 |
| `*` | NotFoundPage | 404 | P20 |
| `/standalone/editor` | BlogEditorPage | 独立编辑器浮窗 | P20 |

**ContextPanel 路由白名单**: `/knowledge`, `/blog/*`, `/whiteboards` — 右侧展开 ContextPanel。

---

## CSS 设计 Token — "精炼书房" (The Study)

### 设计隐喻
深夜书房，一盏台灯照在桌上。UI 是书架和桌面——低调、坚固、不抢戏。你进来是为了思考和写作。

### 三原则
- **I. 内容即焦点** — UI 是画框，写作/阅读时一切 chrome 隐退
- **II. 空间即秩序** — 每个元素有固定位置，侧边栏固定不躲闪
- **III. 颜色即信号** — 彩色仅标记"当前"(accent-blue)和"危险"(accent-red)，99% UI 用灰度层次

### 核心约束
- **禁止硬编码颜色** — 始终使用 `var(--token-name)`。grep `#[0-9a-fA-F]{3,6}` 仅 `:root`/theme 块可出现
- **间距 8px 网格** — `--space-1: 4px` 到 `--space-6: 48px`
- **字体**: 正文 Inter，代码 JetBrains Mono
- **图标**: Lucide SVG 细线图标 (无 Emoji, 无粗体)
- **动效**: 150ms 颜色过渡 + 200ms 面板滑出，无弹跳/呼吸/fadeUp
- **卡片**: 8px 圆角，无阴影，hover 仅边框变色，空白分隔替代分割线
- **侧边栏**: 固定 220px，手动折叠 → 48px，3 分区 (写作/收纳/思考)

### 主题系统 (Phase 23)

**5 套国风主题**: `[data-theme]` CSS 属性选择器驱动，每套 14 个 CSS token + rgba() 半透明边框。

| 主题 | 模式 | 主色 | 气质 |
|------|------|------|------|
| 墨砚 (Inkstone) | 暗 | accent-blue `#b8826a` 赭石铜赤 | 深夜书房，沉稳厚重 |
| 茶竹 (Bamboo) | 暗 | accent-blue `#7a9e7a` 干竹灰绿 | 竹林茶室，清冷雅致 |
| 夜灯 (Lantern) | 暗 | accent-blue `#c4a860` 旧黄铜 | 烛光下，温暖沉静 |
| 宣纸 (Rice Paper) | 亮 | accent-blue `#5d7a8a` 靛蓝 | 宣纸墨迹，冷调素雅 |
| 青瓷 (Celadon) | 亮 | accent-blue `#6b9e8a` 青釉玉色 | 青瓷釉面，温润清新 |

**8 选项**: system (自动跟随 OS) + 5 国风 + light + dark。读旧 localStorage `theme` 字段自动映射。

### 阅读主题 (3 套，博客/KB 独立)
- `.dark` / `.light` / `.sepia` — 仅博客预览页和 KB 编辑器。全局主题切换不影响阅读区。

**详情**: [STYLE.md](STYLE.md) | 主题 CSS: `src/renderer/assets/themes.css`

---

## 构建与发包

```bash
npm run build    # electron-vite build + post-build (去 crossorigin, 复制 img/SVG)
npm run dev      # electron-vite dev (HMR 热重载)
npm run test     # Vitest 单元测试 (87/87)
npm run ci       # 一键全量: lint:arch + biome + tsc + build + test
```

### 打包方式

| 方式 | 命令 | 产出 | 用途 |
|------|------|------|------|
| **便携版** | `node scripts/pack.js` | `release/Idiot-win32-x64/Idiot.exe` | 绿色免安装 |
| **NSIS 安装包** | `npx electron-builder --win` | `dist2/Idiot_SetUp.exe` | 含自动升级 |

### 关键脚本
- **`scripts/pack.js`** — 程序化打包 (build → api.package → ASAR 更新 → 验证)
- **`scripts/post-build.js`** — `out/package.json` 生成 + crossorigin 去除 + img/SVG 复制
- **`scripts/launcher.bat`** — 清除 `ELECTRON_RUN_AS_NODE` 后启动 exe
- **`scripts/installer.nsh`** — NSIS 自定义安装脚本 (快捷方式直指 `$INSTDIR\Idiot.exe`)

### 打包后白屏修复清单

| 问题 | 原因 | 修复 |
|------|------|------|
| `ELECTRON_RUN_AS_NODE=1` | Electron 以 Node 模式运行 | 便携版: `scripts/launcher.bat` 清除环境变量；NSIS: 快捷方式直指 exe |
| GPU 硬件加速不兼容 | Chromium GPU 进程崩溃 | `app.disableHardwareAcceleration()` + `--disable-gpu` |
| `BrowserRouter` + `file://` | History API 不兼容 | 使用 `HashRouter` |
| `crossorigin` 阻止 ES 模块 | Vite 注入 crossorigin 属性 | `post-build.js` 正则去除 |
| CSP meta 过严 | 开发时 CSP 阻止打包资源 | 移除 `index.html` CSP meta |

### 打包资源检查 (安装版)

| 检查项 | 方法 |
|--------|------|
| `img/` 三位置 | `resources/img/` (extraResources) + `app.asar.unpacked/img/` (asarUnpack) + ASAR 内 `out/renderer/img/` (post-build.js 注入) |
| `build/icon.ico` | ≥30KB 且 <50KB, 256×256。ICO >50KB 导致标题栏图标裁切 |
| 关键符号 | `grep "HashRouter"` / `grep "disableHardwareAcceleration"` / `grep "webviewTag"` / `grep "autoUpdater"` |

---

## 项目角色与协作机制

### 角色列表

| 角色 | 核心职责 | 提示词 |
|------|----------|--------|
| **Boss** (统筹策划者) | 使用产品、构思功能、裁决分歧、维护文档 | `prompts/boss.md` |
| **Developer** (码农) | 编写/修改代码、重构、实现功能 | `prompts/developer.md` |
| **Auditor** (运维审计员) | 审查代码、发现缺陷、验证修复 | `prompts/auditor.md` |

### 文档所有权

| 文档 | Boss | Developer | Auditor |
|------|------|-----------|---------|
| **todo.md** | ✅ 完全控制 | 更新状态 + 备注 | 不可写 |
| **redo.md** | 裁决分歧 | 更新修复状态 + 备注 | 写问题 + 验证结果 |
| **AGENTS.md** | ✅ Boss-only | 不可写 | 不可写 |
| **README.md** | ✅ Boss-only | 不可写 | 不可写 |
| **STYLE.md** | ✅ Boss 维护 | 不可写 | 不可写 |

### 协作流程 (10 步)

详见 **[docs/workflow.md](docs/workflow.md)**。

```
Step 1  Boss 立案 (phase-init)          → todo.md 新 Phase
Step 2  Auditor 规格审查 (pre-audit)     → D-编号
Step 3  Boss 裁决 (rule-on)             → 裁决写入 redo.md
Step 4  Developer 规格回译              → Boss 确认理解一致
Step 5  Developer 写代码 (write-code)   → git diff
Step 6  Developer 自检 (self-check)     → 修复报告
Step 7  Auditor 实施审查 (full-audit)    → R-编号
Step 8  Boss 验收 (accept-phase)        → 通过 / 返工
Step 9  Boss 文档同步 (sync-docs)       → 6 文档更新 + 交叉验证
Step 10 Boss 发布 (ship)               → Pre-Flight → 打包 → 验证 → 推送
```

**Boss**: `phase-init` · `rule-on` · `accept-phase` · `sync-docs` · `ship`
**Developer**: `write-code` · `self-check` · `fix-cycle`
**Auditor**: `pre-audit` · `full-audit`

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
4. **todo.md 的任务描述仅 Boss 可改** (Developer 只更新状态和备注)
5. **角色分歧由 Boss 裁决**，写入 redo.md · 分歧升级路径见 [workflow.md §分歧升级路径](docs/workflow.md)

---

## 常见陷阱

### 数据与存储
1. **`paths.ts` 的函数是 async** — `getWorkspacePath()`/`getBlogsDir()`/`getBlogPath()` 都需要 `await`
2. **SQLite `datetime('now')` 返回无时区字符串** — 统一用 `new Date().toISOString()` (ISO 8601 UTC)
3. **INSERT 也必须显式传时间戳** — 避免隐式默认值导致的时区偏移
4. **内容双存储** — 桌面端写文件 + DB。`getBlog()` 优先读文件，回退 DB

### IPC 与通信
5. **Service 返回 Promise 时 IPC handler 必须 `await`** — 否则 renderer 收到 Promise 对象
6. **IPC 5 步链路**: channels.ts 定义 → ipc/*.ts handler → registerAllIpcHandlers() → preload/index.ts → window-api.ts
7. **`window.api.xxx is not a function`** — 检查 5 步链路每一步是否存在

### 编辑器 (Tiptap)
8. **`setContent` 触发 `onUpdate`** — 用 `isSettingRef` 标志跳过规范化触发的更新，避免死循环
9. **Wikilink 提取用纯文本正则** — `/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g`，不用 HTML 解析
10. **Wikilink 在 blog:update 时统一处理** — 保存时 scan+diff+事务写入。渲染管线: `md.render → wikilink 正则 → DOMPurify.sanitize → dangerouslySetInnerHTML`

### 安全
11. **`markdown-it` 的 `html: true` 是 XSS 入口** — DOMPurify 白名单过滤在渲染前执行
12. **图片资源必须 `asarUnpack`** — `nativeImage.createFromPath()` 需要真实路径。`asarUnpack: ["img/**"]`
13. **`dangerouslySetInnerHTML` 前必须有 `DOMPurify.sanitize()`** — grep 验证

### 构建与部署
14. **便携版 ASAR 28 bytes = 空 JSON = 崩溃** — 手动更新 ASAR 时验证每一步，不用 `2>/dev/null`
15. **`build/icon.ico` 必须 < 50KB** — PNG→ICO 膨胀 >50KB 导致 Windows 标题栏图标裁切
16. **`prompt()`/`alert()`/`confirm()` 在 Electron renderer 中被静默拦截** — 用 React 自定义 modal 替代。编码自检: `grep "prompt(\|alert(\|confirm(" src/renderer/` → 0

### 环境
17. **`Intl.Segmenter` 仅限浏览器** — 主进程 (Node.js) 不可用。搜索索引构建/查询全在 Renderer Worker
18. **ContextPanel 防竞态** — `registerTabs` 捕获 `ownerSid`, cleanup 检查 `sessionId` 匹配
19. **React hooks 必须在条件 return 之前** — `if (loading) return <Spinner/>` 之后再有 `useEffect` → "Rendered more hooks" 崩溃
20. **`data:` URL 页面内 onclick 必须用 `window.fn()` 前缀** — data:text/html 下裸函数名解析不到全局

---

## 当前状态 (2026-05-21)

- **Phase 1-22**: ✅ 全部完成
  - Phase 22 13/13: 知识活化 — HomePage 重构 / Obsidian 日历 / Blog↔KB 打通 / 被动发现 / AI 集成 / Transclusion / 标签页 / Bookmarks / Saved Search / 时间轴 / 更新管理 / 剪贴板 / 快捷便签
  - Phase 21 12/12: 编辑器进化 + 知识连接 + 内容中枢
- **当前活跃**: 
  - Phase 23 📋 "精炼书房" (7 项 ~48h): 五套国风 / 博客卡片化 / 原地编辑 / 便签改造 / KB 重塑 / 导航重塑 / 白板
  - Phase 24 📋 "羽化" (5 项 ~52h): 废弃 MySQL/Web Server / 清除 D3 / sqlite-wasm / The Orb 桌宠 / 遗留修复
- **审查修复**: 累计 ~339 个工单 (R01-R339), ~126 个决策点 (D01-D126)。D120-D126 Boss 已裁决。
- **当前待修复**: 🔴0 🟠1 (R338 bgImage 路径穿越 → T2405) 🟡1 (R339 KB 冲突 → T2405) 🟢Phase 23 spec gap → Phase 24+
- **构建基线**: ✅ 测试 87/87 pass (12 files) | tsc 零错误 | build ✅
- **类型安全**: `noUncheckedIndexedAccess` 永久启用。renderer `: any`=15 `as any`=25 (延 T2405 清零)
- **架构数字**: IPC 139 · Service 18 · IPC files 19 · Server routes 13 (废弃中) · DB 12 表 · 前端路由 18 条
- **已知缺口**: 国际化 i18n (否决 D18=C)；PDF 批注/OCR (延 Phase 25+)；E2E 加密 (否决 D89)
- **Phase 24 后**: **2 周使用期** (Boss 亲自体验无 ContextPanel 的产品, 记录信息缺失, 决定 Phase 25 Entity Engine 具体范围)
- **Phase 25 约束**: 只统一在 UI 行为层已自然收敛的对象, 不做"为统一而统一"的过早抽象

---

## AI Agent 治理框架

### 第一层 — 约束 (Constrain)
- `src/main/` 禁放 React/JSX | `src/renderer/` 禁放 Node API | `src/preload/` 禁放业务逻辑 | `src/shared/` 禁放运行时逻辑
- 禁止直接调用 `get()`/`all()`/`run()` from `../db` — 用 service 层 `dbGet`/`dbAll`/`dbRun`
- 禁止 SQL 拼接用户输入 — 始终参数化查询
- IPC 通道名仅定义在 `ipc-channels.ts`，响应格式 `{ success, data?, error? }`
- 禁止在 renderer 直接 `ipcRenderer.invoke` — 通过 `window.api.*`

### 第二层 — 告知 (Inform)

必读文件 (按优先级):
- **P0**: `AGENTS.md` (本文档) | `src/shared/types.ts` | `src/shared/ipc-channels.ts`
- **P1**: `src/shared/constants.ts` | `todo.md` | `redo.md` | `STYLE.md` | `prompts/*.md` | `docs/workflow.md`
- **P2**: `docs/phase-archive.md` | `docs/history-audit.md` | `docs/development-guide.md` | `package.json` | `src/main/db/schema.ts`
- **P3**: `README.md`

### 第三层 — 验证 (Verify)

```bash
npm run ci       # 一键: lint:arch + biome + tsc + build + test
npm run review   # 提交前: lint:arch + biome + tsc + build
npm run gc       # 死代码检测
```

验证流水线: TypeScript 编译 → Biome Lint → 架构检查 → 单元测试 → 构建产物验证

### 第四层 — 纠正 (Correct)

| 错误特征 | 根因 | 修复方向 |
|----------|------|----------|
| `Cannot find module 'fs'` in renderer | 违反目录约束 | 移除 Node API，或通过 IPC 桥接 |
| `window.api.xxx is not a function` | IPC 未注册 | 检查 5 步: channels → handler → register → preload → window-api |
| `Rendered more hooks than expected` | hooks 在条件 return 后 | 移到条件之前 |
| `Type '...' is not assignable` | shared types 未同步 | 对照 `src/shared/types.ts` 更新引用点 |

**纠正原则**: 默认为删除而非添加 | 修改最小化 | 修复后必须 `npm run build` 通过 | 新增功能必须更新 todo.md

### 第五层 — 复杂度预算 (Complexity Budget)

> **产品宪法** — Phase 24 确立，T2406 Collapse Validation Audit 完善。
> 「增加功能消耗预算，不是默认允许继续增长。」

#### 核心指标

| 指标 | 上限 | 当前 (Phase 23) | Phase 24 目标 | 验证方法 |
|------|------|-----------------|---------------|----------|
| IPC 通道 | ≤ 40 | 139 | ~30 | `grep -cE "'[a-z]+:[a-z]" src/shared/ipc-channels.ts` |
| 永久可见 panel | ≤ 1 | 3 (sidebar + ContextPanel + BottomTabs) | 1 | 目视: 右侧/底部无永久系统 panel |
| renderer store slice | ≤ 12 | — | ≤ 12 | `grep -c "create\|createWithEqualityFn" src/renderer/stores/` |
| 前端路由页面 | ≤ 8 | 18 | ≤ 8 | 见路由表; 其余 → View 模式 |
| useEffect per page | ≤ 15 | — | ≤ 15 | 目视审查 |
| 跨 panel 同步状态 | 0 | 5+ (ContextPanel↔BottomTab↔Graph↔Selection↔SplitPane) | 0 | 死代码: contextPanel/bottomTabs/graph store slice |
| Graph/Canvas 系统 | ≤ 1 | 2 (D3 + React Flow) | 1 (仅 React Flow) | `grep "d3\|d3-force" package.json` → 0 |
| DB 后端 | 1 | 2 (sql.js + MySQL) | 1 (sql.js 或 sqlite-wasm) | `grep -ri "mysql" src/` → 0 |
| 运行时 | 1 | 2 (Electron + Express) | 1 | `ls src/server/` → 不存在 |
| 内容主 schema | 1 | 4 (blogs/notes/knowledge_files/bookmarks) | 4→1 (Phase 25) | 见 `src/main/db/schema.ts` |

#### 不可见复杂度指标 (T2406 确立)

以下属于复杂度，即使 UI 已隐藏：

| 指标 | 上限 | 说明 | 验证方法 |
|------|------|------|----------|
| 隐藏状态机 (dead UI + live state machine) | 0 | UI 不渲染但状态机持续运行 (如 tab-context 后台写 localStorage) | grep state store → 确认零消费者时物理删除 |
| Persistence leakage | 0 | 不可见的 localStorage/DB 积累 (如 `lbkb_open_tabs` 持续写入) | grep localStorage keys → 废弃 key 物理清理 |
| Ghost infrastructure | 0 | 组件完整保留、零处导入但一行 import 即可复活 (如 ContextPanel.tsx 217行) | Stage B grep → 0 |
| Ghost component (复活预制件) | 0 | 新建组件、未接入但坐等被接入 (如 TableOfContents.tsx 105行) | 发现即标记 DEPRECATED |
| "为了以后可能需要" 的保留 | 0 | 任何删除时保留"以备将来"的代码 → 立刻物理删除 |

**判定原则**:
- **"删大的换小的"不算 collapse** — 删 ContextPanel 换 TOC dropdown ≠ 复杂度下降。净删除才是 collapse
- **系统数量 > 系统大小** — 系统数量下降优先级高于单系统大小下降。10 个轻量系统 > 1 个重量系统
- **UI 断开 ≠ 系统死亡** — 入口隐藏但实现完整保留 = 复杂度未下降，只是不可见
- **Permanent UI 数量 > UI 面积** — 3 个 20px 轻量 bar 比 1 个 300px panel 更危险

#### Soft Collapse 标准流程 (T2406 确立)

```
Stage A — Soft Collapse:
  隐藏入口 → inline/瞬时替代 → command palette 集成
  → 观察 ≥7 天: 真实使用中是否产生阻塞
  → 价值: 暴露 hidden persistence leakage (只有观察期能发现)

Stage B — Hard Delete:
  确认 ≥7 天未使用 + 替代方案稳定
  → 物理删除: 组件 + Store + IPC + 路由 + localStorage key + 类型
  → grep 验收: 禁止清单关键词 → 0

铁律: 不可跳过 Stage A 直接 Hard Delete。
"一步硬删"会掩盖 hidden state machine / persistence leakage / ghost infrastructure。
```

#### 瞬时交互约束

Popup / dropdown / popover / hover preview 必须满足**全部**三项：

| 约束 | 说明 |
|------|------|
| click outside dismiss | 点击组件外任意位置关闭 |
| 无 persistent state | 关闭后不残留任何状态 (选中项/滚动位置/输入内容) |
| 无跨页面状态 | 不依赖也不写入任何跨路由共享状态 |

违反任一项 → 认定为**新 panel 系统**，需消耗 panel 预算。

**Expandable section 属于 panel 种子** — 内联展开区域若支持嵌套/滚动/持久化展开态 → 视为微型 panel，触发预算审查。

#### 预算治理规则

1. 任何突破上限的变更 → 必须先通过 Boss 裁决 (Phase 立案阶段)
2. 已在预算内的变更 → 正常 Phase 流程
3. 突破预算的变更必须有对应的**减项** (删除 ≥1 项同等复杂度的现有内容)
4. 预算上限每 Phase 复评一次 (sync-docs 阶段), Boss 可根据产品成熟度下调
5. 「跨 panel 同步状态 = 0」为永久硬上限 — 不得突破
6. **「不可见复杂度指标」为硬上限** — hidden state machine / persistence leakage / ghost infrastructure / ghost component 和「跨 panel 同步状态」一样，永久 = 0

#### 设计宪法 (Phase 24 确立)

- 「Inline Context 是信息提示，不是第二工作区」
- 「chips 不是 tabs」
- 「信息只在需要时出现」
- 「删入口再删代码, 先软后硬」
- 「系统数量下降 > 单系统大小下降」
- 「瞬时交互不带状态 — click outside dismiss, 无 persistent state, 无跨页面状态」
- 「"为了以后可能需要" = 高风险信号 — 立刻物理删除」

#### Collapse 工程本能 (T2406 R352 确立)

> 从"删 UI"到"mechanically verifiable deletion"的成熟度跃迁。
> 核心问题不再是"入口还在不在"，而是"系统还在不在呼吸"。

**三个核心诊断模式**:

| 模式 | 定义 | 检测方法 |
|------|------|----------|
| **Unilateral persistence** | 只写不读，只积累不消费 (如 `blog-scroll-ratio-${id}` 持续写入但永远不读) | grep localStorage/sessionStorage keys → 确认每个 key 有对应的读路径 |
| **Orphan runtime** | UI 已死但状态机仍在后台持续变异 (如 tab-context 在 ContextPanel 移除后仍写 `lbkb_open_tabs`) | grep 已删除 UI 的 store/context → 确认零消费者且 write path 已移除 |
| **Conceptual similarity trap** | 因语义相似而强行统一系统 ("滚动位置/浏览历史/编辑连续性都像'最近' → 抽象 UnifiedResumeSystem") | 拒绝过早抽象。三个概念分别管理，不做 unified "最近"系统 |

**Mechanically Verifiable Deletion** — 真正删除 = 五条路径全部消失:

```
write path 消失   — setItem / dispatch / INSERT 不再执行
read path 消失    — getItem / selector / SELECT 不再执行
ownership 消失    — 无组件 import 该 store/slice
persistence 消失  — localStorage key / DB row 物理清理
runtime mutation 消失 — 状态机不再变异任何数据
```

五条中缺一条 → `UI dead ≠ system dead` → 复杂度未下降。

**Persistence Boundary**:

| 允许 (transient continuity) | 禁止 (persistent habitat) |
|----------------------------|--------------------------|
| session-scoped | 跨 session 累积 |
| 仅上一篇文章 (非 per-article 集合) | per-article accumulation map/collection |
| continuity only (导航连续性) | history / queue / workspace resurrection |
| 退出即失效 | 跨重启恢复 |
| 零 UI 表面 | 任何"继续阅读"/"最近阅读"面板 |

**Habitat Formation 识别** — 系统从 transient interaction 向 persistent environment 演化的路径:

```
transient interaction
  → 持久化状态
    → 多条目积累
      → UI 面板
        → 跨 session 记忆
          → workspace resurrection
            → browser-tabs thinking 再生
```

任何一步出现 → 立即阻断。T2406 的职责是在第一步之前识别并拒绝。
