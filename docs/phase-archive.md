# Phase 实施档案

> 本文档是从 [todo.md](../todo.md) 拆分出的历史档案，完整保留 Phase 1-7 的详细任务规格。
> 所有任务均已完成 ✅。仅供查阅，不作为当前待办。
> 最后更新: 2026-05-02

---

## Phase 1 — 项目骨架与用户认证 ✅

### 需求覆盖

| FR | 功能 | 状态 |
|----|------|------|
| FR-01 | 用户注册 | ✅ |
| FR-02 | 用户登录 | ✅ |
| FR-03 | 会话保持 / 记住我 | ✅ |
| FR-04 | 用户切换/注销 | ✅ |
| FR-05 | 账户删除 | ✅ |
| FR-06 | 设置存储根目录 | ✅ 注册时选择 |
| FR-07 | 默认目录结构 | ✅ 自动创建 |

### 已完成事项清单

- [x] T001: Electron 41 + React 19 + Vite 7 项目骨架搭建
- [x] T002: sql.js 数据库层 (文件持久化 WASM SQLite)
- [x] T003: 数据库 Schema (9 表: users, tags, blogs, blog_tags, knowledge_files, knowledge_file_tags, recycle_bin, blog_drafts, sessions)
- [x] T004: 密码哈希工具 (PBKDF2-SHA512, 100000 迭代)
- [x] T005: AuthService: register / login / verifyToken / logout / deleteAccount
- [x] T006: Auth IPC Handlers (5 channels)
- [x] T007: Preload API (60+ methods exposed to renderer)
- [x] T008: Zustand auth-store (localStorage/sessionStorage 持久化)
- [x] T009: LoginPage + RegisterPage UI
- [x] T010: ProtectedRoute 登录守卫
- [x] T011: MainLayout 侧边栏 + 导航 + 注销
- [x] T012: scripts/run.js (清除 ELECTRON_RUN_AS_NODE)
- [x] T013: README.md 项目文档

---

## Phase 2 — 博客 CRUD + Tiptap 编辑器 + 标签系统 ✅

### 需求覆盖

| FR | 功能 | 状态 |
|----|------|------|
| FR-10 | 创建博客 (Markdown / HTML) | ✅ |
| FR-11 | 编辑博客 (分屏预览 / 源码切换) | ✅ |
| FR-12 | 删除博客 (移至回收站) | ✅ |
| FR-13 | 博客列表与检索 | ✅ |
| FR-14 | Markdown 文件批量导入 | ✅ |
| FR-15 | 导出博客 | ✅ |
| FR-16 | 博客附件管理 (粘贴图片自动保存) | ✅ (base64) |
| FR-17 | 分类与标签系统 | ✅ |
| FR-18 | 博客收藏 (网页转 Markdown) | ✅ Phase 4 |
| FR-19 | 博客历史版本 (草稿自动保存) | ✅ |

### 技术栈 (Phase 2 新增)

| 包 | 用途 | 版本 |
|----|------|------|
| `@tiptap/react` | React 编辑器组件 | ^3.22.0 |
| `@tiptap/starter-kit` | 基础扩展包 | ^3.22.0 |
| `@tiptap/pm` | ProseMirror 核心 | ^3.22.0 |
| `@tiptap/extension-image` | 图片支持 | 按需安装 |
| `@tiptap/extension-link` | 链接支持 | 按需安装 |
| `@tiptap/extension-placeholder` | 占位文本 | 按需安装 |
| `@tiptap/extension-table` | 表格 | 按需安装 |
| `@tiptap/extension-table-cell` | 表格单元格 | 按需安装 |
| `@tiptap/extension-table-header` | 表格表头 | 按需安装 |
| `@tiptap/extension-table-row` | 表格行 | 按需安装 |
| `@tiptap/extension-task-item` | 任务列表项 | 按需安装 |
| `@tiptap/extension-task-list` | 任务列表 | 按需安装 |
| `@tiptap/extension-underline` | 下划线 | 按需安装 |
| `@tiptap/extension-code-block-lowlight` | 代码块语法高亮 | 按需安装 |
| `lowlight` | 语法高亮语言包 | ^3.2.0 |
| `shiki` | Shiki 代码高亮 (备选) | 按需 |
| `markdown-it` | Markdown 渲染 (列表预览) | ^14.1.0 (已安装) |

### 任务列表

#### T101: BlogService — 博客文件读写服务

**需求**: FR-10, FR-11, FR-12, FR-15, FR-19
**文件**: `src/main/services/blog.service.ts`
**依赖**: T002 (数据库)

**实现步骤**:
1. 实现 `createBlog(userId, title, format, content)` → 写入 .md/.html 文件到 `{workspace}/Blogs/{blogId}.md`, 在 DB 插入 blog 记录
2. 实现 `getBlog(blogId)` → 读取 DB 记录 + 从文件读取 content
3. 实现 `updateBlog(blogId, title?, content?)` → 更新 DB + 覆盖文件
4. 实现 `deleteBlog(blogId)` → 标记 status='trash', 插入 recycle_bin 记录
5. 实现 `listBlogs(userId, filters?)` → 查询 + 排序 + 关键词筛选 + 标签筛选
6. 实现 `exportBlogs(blogIds, outputDir)` → 复制文件到指定目录
7. 实现 `saveDraft(blogId, content)` → 插入 blog_drafts 表
8. 实现 `getHistory(blogId)` → 查询 blog_drafts 最近 10 条
9. 实现 `rollback(blogId, draftId)` → 将博客内容回滚到指定草稿

**测试用例**:
```
TC101-01: createBlog with md format → blog file exists at {workspace}/Blogs/{id}.md
TC101-02: createBlog with html format → blog file exists at {workspace}/Blogs/{id}.html
TC101-03: updateBlog(title only) → DB updated, file unchanged
TC101-04: updateBlog(content only) → file overwritten, DB updated_at changed
TC101-05: deleteBlog → status='trash', recycle_bin entry created
TC101-06: listBlogs with keyword → returns filtered results (via SQL LIKE)
TC101-07: listBlogs with tag filter → returns blogs with specific tag
TC101-08: listBlogs sorted by created_at desc → correct order
TC101-09: exportBlogs → files copied to outputDir with correct names
TC101-10: saveDraft + getHistory → returns drafts in reverse chronological order
TC101-11: rollback → blog content replaced with draft content
```

**估算**: 4h

---

#### T102: Blog IPC Handlers

**需求**: FR-10 ~ FR-19
**文件**: `src/main/ipc/blog.ts`
**依赖**: T101

**IPC Channels**:
```
BLOG_LIST       → BlogService.listBlogs()
BLOG_GET        → BlogService.getBlog()
BLOG_CREATE     → BlogService.createBlog()
BLOG_UPDATE     → BlogService.updateBlog()
BLOG_DELETE     → BlogService.deleteBlog()
BLOG_RESTORE    → BlogService.restoreBlog()
BLOG_EXPORT     → BlogService.exportBlogs()
BLOG_IMPORT_MD  → BlogService.importMarkdownFiles()
BLOG_SAVE_DRAFT → BlogService.saveDraft()
BLOG_GET_HISTORY→ BlogService.getHistory()
BLOG_ROLLBACK   → BlogService.rollback()
```

**估算**: 2h

---

#### T103: Tiptap 编辑器集成 — Markdown 模式

**需求**: FR-11
**文件**: `src/renderer/components/editor/TiptapEditor.tsx`
**依赖**: 无 (独立组件)

**实现步骤**:
1. 创建 `TiptapEditor` 组件: 接收 `content: string`, `format: 'md' | 'html'`, `onChange: (html: string) => void`
2. 创建 `EditorToolbar` 组件: Bold / Italic / Underline / Strikethrough / H1/H2/H3 / List / Blockquote / Code / Link / Image / Undo/Redo
3. 实现 Markdown 快捷键: `#` → Heading 1, `##` → Heading 2, `- ` → Bullet List, etc.
4. 实现 `MarkdownPreview` 组件 (分屏预览): 使用 `markdown-it` 实时渲染 HTML

**估算**: 6h

---

#### T104: Tiptap 编辑器集成 — HTML / WYSIWYG 模式

**需求**: FR-11
**文件**: `src/renderer/components/editor/TiptapEditor.tsx`
**依赖**: T103

**实现步骤**:
1. 添加 `mode` prop: `'wysiwyg' | 'source' | 'split'`
2. WYSIWYG 模式: 默认 Tiptap 所见即所得编辑
3. 源码模式: 显示原始 HTML textarea
4. 切换按钮: 工具栏右侧三个图标按钮切换模式

**估算**: 3h

---

#### T105: 图片粘贴与附件管理

**需求**: FR-16
**文件**: `src/main/services/blog.service.ts`, `src/renderer/components/editor/TiptapEditor.tsx`
**依赖**: T101, T103

**实现步骤**:
- 主进程: `saveImage(userId, blogId, imageBuffer, filename)` → 保存到 `{workspace}/Assets/blog_{blogId}/`
- 编辑器: 自定义 `ImageUploadExtension` 监听 paste 事件，调用 IPC 保存，插入 `<img>`

**估算**: 3h

---

#### T106: Markdown 文件批量导入

**需求**: FR-14
**文件**: `src/main/services/blog.service.ts`, `src/main/ipc/blog.ts`
**依赖**: T101

**估算**: 2h

---

#### T107: 博客列表页

**需求**: FR-13
**文件**: `src/renderer/features/blog/BlogListPage.tsx`
**依赖**: T101, T102

**实现**: 卡片视图 (标题/格式/标签/时间) + 搜索/排序/筛选 + 列表视图 + 右键菜单 + 空状态

**估算**: 4h

---

#### T108: 博客编辑页

**需求**: FR-10, FR-11
**文件**: `src/renderer/features/blog/BlogEditorPage.tsx`
**依赖**: T103, T104, T105

**实现**: 标题输入 + 编辑器 + 标签选择 + Ctrl+S 保存 + 自动保存草稿 (30s) + 更多菜单

**估算**: 6h

---

#### T109: 标签系统 (TagService + IPC + 管理页)

**需求**: FR-17, FR-24
**文件**: `src/main/services/tag.service.ts`, `src/main/ipc/tags.ts`, `src/renderer/features/tags/TagManagePage.tsx`
**依赖**: T002

**估算**: 4h

---

#### T110: 博客历史版本 UI

**需求**: FR-19
**文件**: `src/renderer/features/blog/BlogHistoryPanel.tsx`
**依赖**: T101, T108

**估算**: 2h

### Phase 2 完成检查清单

- [x] T101: BlogService 文件读写 ✅
- [x] T102: Blog IPC Handlers ✅
- [x] T103: Tiptap Markdown 编辑器 ✅
- [x] T104: Tiptap HTML/WYSIWYG 模式 ✅
- [x] T105: 图片粘贴与附件管理 ✅ (base64 图片粘贴)
- [x] T106: Markdown 批量导入 ✅ (含 frontmatter 解析)
- [x] T107: 博客列表页 ✅ (卡片视图/搜索/排序/导入)
- [x] T108: 博客编辑页 ✅ (自动保存草稿/Ctrl+S/历史面板)
- [x] T109: 标签系统 ✅ (Service + IPC + 完整 CRUD UI)
- [x] T110: 博客历史版本 UI ✅ (侧栏查看 + 一键回滚)
- [x] `npm run dev` 全流程验证 ✅
- [x] README.md + todo.md 更新 ✅

**Phase 2 完成: 12/12 项** ✅

---

## Phase 3 — 知识库文件管理 ✅

### 需求覆盖

| FR | 功能 | 状态 |
|----|------|------|
| FR-20 | 文件导入 (batch import) | ✅ |
| FR-21 | 文件预览 (Office/PDF → HTML) | ✅ |
| FR-22 | 文件删除 | ✅ |
| FR-23 | 文件重命名 | ✅ |
| FR-24 | Tag 分类系统 | ✅ Phase 2 实现 |
| FR-25 | 文件检索 | ✅ |
| FR-26 | 文件详情查看 | ✅ |

### 技术栈 (Phase 3 新增)

| 包 | 用途 | 版本 |
|----|------|------|
| `mammoth` | DOCX → HTML 转换 | ^1.8.0 |
| `exceljs` | XLSX → HTML 转换 | ^4.4.0 |
| `pdfjs-dist` | PDF 渲染 | ^5.1.0 |
| 系统默认程序 | PPT 及其他格式 | Electron `shell.openPath()` |

### 任务列表

#### T201: KnowledgeService — 文件管理服务
**估算**: 5h | **文件**: `src/main/services/knowledge.service.ts`

#### T202: 文件预览服务
**估算**: 4h | **文件**: `src/main/services/preview.service.ts`

#### T203: 知识库列表页
**估算**: 5h | **文件**: `src/renderer/features/knowledge/KnowledgeListPage.tsx`

#### T204: 文件预览面板
**估算**: 5h | **文件**: `src/renderer/components/preview/FilePreview.tsx`

#### T205: Knowledge IPC Handlers
**估算**: 2h | **文件**: `src/main/ipc/knowledge.ts`

### Phase 3 完成检查清单

- [x] T201-T205 全部完成 ✅
- [x] `npm run build` 验证 ✅ (22 main + 2 preload + 108 renderer)

**Phase 3 核心完成: 7/7 项** ✅

---

## Phase 4 — 网页收藏 + 全文检索 + 回收站 ✅

### 需求覆盖

| FR | 功能 | 状态 |
|----|------|------|
| FR-18 | 博客收藏 (网页 → Markdown) | ✅ |
| FR-25 | 文件全文检索 | ✅ (SQL LIKE) |
| FR-27 | 统一搜索栏 (全局) | ✅ |
| FR-28 | 搜索结果高亮与定位 | ⏭ (Phase 5 UI) |
| FR-29 | 回收站机制 | ✅ |
| FR-30 | FTS5 全文索引重建 | ⏭ (待 better-sqlite3) |

### 技术栈 (Phase 4 新增)

| 包 | 用途 | 版本 |
|----|------|------|
| `@mozilla/readability` | 网页正文提取 | ^0.5.0 |
| `turndown` | HTML → Markdown 转换 | ^7.2.0 |
| `better-sqlite3` | 替代 sql.js (需要 FTS5) | ^11.7.0 (需原生编译) |

> ⚠️ FTS5 风险: sql.js 不含 FTS5。改用 SQL LIKE 实现基础搜索。

### 任务列表

#### T301: 网页收藏服务
**估算**: 4h | **文件**: `src/main/services/web-scraper.service.ts`

#### T302: 数据库迁移: sql.js → better-sqlite3
**估算**: 5h | ⏭ 跳过 (无 VS Build Tools)

#### T303: 回收站服务
**估算**: 3h | **文件**: `src/main/services/recycle.service.ts`

#### T304: 回收站 UI
**估算**: 2h | **文件**: `src/renderer/features/recycle/RecycleBinPage.tsx`

### Phase 4 完成检查清单

- [x] T301: 网页收藏服务 ✅ (readability + turndown)
- [ ] T302: 数据库迁移 ⏭ 跳过
- [x] T303: 回收站服务 ✅
- [x] T304: 回收站 UI ✅
- [x] 基础搜索 ✅ (SQL LIKE 替代 FTS5)

**Phase 4 完成: 5/6 项 (T302 因环境限制跳过)** ✅

---

## Phase 5 — 全局搜索 + 主题 + 仪表盘 ✅

### 需求覆盖

| FR | 功能 | 状态 |
|----|------|------|
| FR-27 | 统一搜索栏 | ✅ |
| FR-28 | 搜索结果高亮与定位 | ✅ (键盘导航+跳转) |
| FR-30 | 快捷键支持 | ✅ (Ctrl+N/H/F) |
| FR-31 | 主题切换 (浅色/深色) | ✅ (3 模式 + 持久化) |
| FR-32 | 数据统计仪表盘 | ✅ |
| FR-33 | 帮助与反馈 | ✅ (设置页关于) |

### 任务列表

- T401: 全局搜索服务 (3h) ✅
- T402: GlobalSearch 组件 (3h) ✅ (下拉面板 + 键盘导航 + 防抖)
- T403: 主题切换 (2h) ✅ (深色 CSS 变量 + 3 模式 + 持久化)
- T404: 仪表盘统计 (3h) ✅
- T405: 设置页 + 帮助 (3h) ✅
- T406: 快捷键系统 (2h) ✅ (Ctrl+N/H/F)

**Phase 5 完成: 8/8 项** ✅

---

## Phase 6 — 测试 + 性能优化 + 打包 ✅

### 任务列表

- T501: 单元测试 (8h) ✅ (crypto 工具函数, 7 个测试通过)
- T502: E2E 测试 (6h) ⏭ (独立迭代)
- T503: 性能优化 (6h) ✅ (8 个 SQL 索引)
- T504: 打包配置 (4h) ✅ (forge.config.ts + electron-vite 5)
- T505: 数据库自动备份 (2h) ✅ (24h 周期, 保留 7 份)
- T506: 中英文国际化 (4h) ⏭ (独立迭代)

**Phase 6 核心完成: 6/8 项** ✅

---

## Phase 7 — 功能增强与体验提升

> 基于全量代码审查 (2026-04-30) 及 new.txt 功能提案，经多重标准评估后制定。
> 评估维度: 适配度 / 趣味程度 / 内容丰富度 / 冗余增加程度 / 维护难度 / 健壮性 / 整体性 / 协调性。

### 代码审查发现 (已修复)

| 问题 | 位置 | 严重性 | 状态 |
|------|------|--------|------|
| `dbSave()` 未导入被 5 处调用 | knowledge.service.ts / recycle.service.ts | 🔴 运行时错误 | ✅ 已修复 |
| `searchBlogs/searchKnowledge` 缺少 `await` | search.ts IPC handler | 🔴 返回 Promise 而非数据 | ✅ 已修复 |
| `SearchResult` 缺少 `scope` 字段 | search.service.ts 返回类型 | 🟡 类型不匹配 | ✅ 已修复 |
| `emptyTrash/autoClean` 重复删除逻辑 | recycle.service.ts | 🟢 代码冗余 | ✅ 已重构 |
| `debounce/truncate` 函数未使用 | renderer/lib/utils.ts | 🟢 死代码 | ✅ 已清理 |
| Drizzle ORM 配置未注明状态 | drizzle.config.ts | 🟢 误导性 | ✅ 已标注 |

### 任务评估与筛选

> 原有方案 11 项 + new.txt 新增 6 项趣味功能 = 17 项候选。逐项评估后: **保留 15 项 (~51h), 移除 2 项, 1 项融入日常重构**。

#### 移除项及理由

| 移除项 | 类型 | 理由 |
|--------|------|------|
| T608 统一 MySQL DDL | 技术债 | 应在日常重构中逐步完成 |
| T609 工作区迁移向导 | 低频高风险 | 复杂度超出收益 |
| T611 electron-log | 基建微任务 | 应在其他任务开发时顺手完成 |
| F606 Emoji 快捷输入 | 依赖代价 > 功能价值 | 需新增依赖，维护成本高 |

#### 保留项总览

| 任务 | 名称 | 类型 | 估算 | 优先级 |
|------|------|------|------|--------|
| T601 | 博客 TOC + 阅读时间 | 阅读体验 | 3h | 🔴 P1 |
| T602 | 知识库全文搜索增强 | 搜索能力 | 5h | 🔴 P1 |
| T603 | 备份管理 UI | 数据安全 | 3h | 🔴 P1 |
| T606 | 批量操作 | 效率提升 | 4h | 🔴 P1 |
| T610 | 博客模板系统 | 创作效率 | 3h | 🔴 P1 |
| T612 | 文件夹分类管理 | 内容组织 | 4h | 🔴 P1 |
| T614 | 博客附件管理器 | 本地特色 | 3h | 🔴 P1 |
| T604 | 快捷键帮助面板 | UX 优化 | 2h | 🟡 P2 |
| T605 | 拖放导入 | UX 优化 | 2h | 🟡 P2 |
| T613 | 写作统计仪表盘 | 数据激励 | 4h | 🟡 P2 |
| T615 | 博客知识库双向引用 | 模块打通 | 4h | 🟡 P2 |
| F601 | 专注写作模式 | 趣味功能 | 3h | 🟡 P2 |
| F602 | 写作成就系统 | 趣味功能 | 4h | 🟡 P2 |
| F603 | 博客时间线视图 | 趣味功能 | 3h | 🟡 P2 |
| F605 | 导出精美 PDF | 趣味功能 | 3h | 🟡 P2 |
| T607 | React.lazy 代码分割 | 性能优化 | 2h | 🟢 P3 |
| F604 | 自定义阅读主题 | 趣味功能 | 2h | 🟢 P3 |

**P1 核心 (7 项)**: ~25h | **P2 增强 (8 项)**: ~24h | **P3 改良 (2 项)**: ~4h
**总计: 17 项, ~53h**

### Phase 7 完成检查清单

**P1 核心 (7/7 ✅)**
- [x] T601: 博客 TOC + 阅读时间 + 进度条 (3h)
- [x] T602: 知识库全文搜索增强 (5h)
- [x] T603: 备份管理 UI (3h)
- [x] T606: 批量操作基础设施 (4h)
- [x] T610: 博客模板系统 (3h)
- [x] T612: 文件夹分类管理 (4h)
- [x] T614: 博客附件管理器 (3h)

**P2 增强 (8/8 ✅)**
- [x] T604: 快捷键帮助面板 (2h)
- [x] T605: 拖放导入基础设施 (2h)
- [x] T613: 写作统计仪表盘 (4h)
- [x] T615: 博客知识库双向引用
- [x] F601: 专注写作模式 (3h)
- [x] F602: 写作成就系统 (4h)
- [x] F603: 博客时间线视图 (3h)
- [x] F605: 导出精美 PDF (3h)

**P3 改良 (2/2 ✅)**
- [x] T607: React.lazy 代码分割 (2h)
- [x] F604: 自定义阅读主题 (2h)

**Phase 7 实施: 17/17 全部完成, ~55h 已投入**

### 后续改进方向

1. 批量操作 UI 集成: BlogListPage 添加批量模式切换按钮
2. 拖放导入 UI 集成: KnowledgeListPage 添加 onDrop 事件监听
3. E2E 测试: Playwright 测试用例编写
4. 国际化 i18n: 中英文翻译文件 + react-i18next 集成
5. MySQL DDL 统一: 提取共享 DDL 文件 (已通过 F36 完成)
6. FTS5 全文搜索: 迁移到 better-sqlite3 后启用原生全文索引

---

## Phase 8 — 体验增强与互联互通 ✅

> 基于 Boss（使用者身份）实际使用反馈提炼的功能。全部基于现有基础设施做薄 UI 层，零新依赖（T806 除外：`docx` 包）。
> 评估维度: 用户痛点明确 / 实现复杂度低 / 利用已有数据表。

### 任务总览

| 任务 | 名称 | 类型 | 估算 | 优先级 | 解决什么 |
|------|------|------|------|--------|----------|
| T801 | 博客系列/章节链 | 内容组织 | 4h | 🔴 P1 | ✅ 系列文章之间加 prev/next 导航 |
| T802 | 快速便签 | 创作效率 | 2.5h | 🔴 P1 | ✅ 一句话快速记录，不打断工作流 |
| T803 | 标签健康检查 | 数据维护 | 1.5h | 🟡 P2 | ✅ 发现并清理零关联标签 |
| T804 | 阅读页关联展示 | 模块打通 | 4h | 🟡 P2 | ✅ 博客↔知识库双向关联在阅读页可见 |
| T805 | 写作热力图 | 数据激励 | 6h | 🟡 P2 | ✅ GitHub 风格贡献日历，可视化写作节奏 |
| T806 | 博客导出为 Word (.docx) | 分享导出 | 3h | 🟢 P3 | ✅ 导出可编辑 Word 格式，补充 PDF 导出 |
| T904 | UI 设计系统审查与标准化 | 设计一致性 | 3h | 🟢 P3 | ✅ 审查 token 覆盖率、间距/字体一致性、补充缺失规范 |

**P1 (2 项)**: ~6.5h — 系列链 + 便签
**P2 (3 项)**: ~11.5h — 标签清理 + 关联展示 + 热力图
**P3 (2 项)**: ~6h — Word 导出 + 设计审查
**总计: 7 项, ~24h**

#### 建议实施顺序

```
T801 (系列链) → T802 (便签) → T803 (标签清理) → T804 (关联展示) → T805 (热力图) → T806 (Word导出) → T904 (设计审查)
```

### Phase 8 实施成果

7 项全部完成，每个都基于现有基础设施做薄 UI 层。

### Boss 使用者评估 (2026-05-03)

| 功能 | 评价 |
|------|------|
| **系列链** | 写系列教程的核心体验闭环。读者从第一篇能一路读到最后。prev/next 导航低调但有用 |
| **快速便签** | 开应用 → 打字 → 回车，两秒完成记录。比之前快 4 步。已成为日常使用最高频功能 |
| **标签清理** | 零关联标签一目了然，一键清理。标签列表终于不会越用越脏 |
| **关联展示** | 博客底部能看到关联的 PDF/文件，知识库文件能看到被哪些博客引用。两个模块之间的墙拆了 |
| **热力图** | 仪表盘上最显眼的东西。看到空白天数会有"今天该写点什么"的压力感——正是设计目的 |
| **Word 导出** | 给不用 Markdown 的人分享时有用。排版保留良好 |
| **设计审查** | 用户不可见，但间接提升了全局一致性（R40 `#fff` 硬编码已消除） |

---

## Phase 9 — 工程质量夯实 + 架构债清偿 ✅

> 三源合并：Developer 深度评估 (A1-C3) + Auditor 结构审计 (S1-S18) + Boss 使用者 UI 反馈。
> 全部 13 项已完成。构建: ✅ 34 main + 2 preload + 211 renderer, 测试: 27/27 pass。
> Boss 裁决: 首轮聚焦 S1/S2/S4/S7/S14 + A2 + B4 + C1 + UI 三项，共 12 项 ~28h。

### 任务总览

| 任务 | 名称 | 来源 | 估算 | 优先级 |
|------|------|------|------|--------|
| T901 | Server/Main 逻辑去重 — blog list 试点→推广 | S1+S3+S4 | 8h | 🔴 P1 | ✅ |
| T902 | IPC 类型安全 — `WindowApi` + 消灭 `as any` | S2/A1 | 6h | 🔴 P1 | ✅ |
| T903 | XSS 防护 — markdown-it `html: false` + strip 脚本 | B4 | 1h | 🔴 P1 | ✅ |
| T914 | DDL 顺序修复 + ALTER TABLE 存量迁移 | S14 | 1h | 🔴 P1 | ✅ |
| T907 | Server 输入校验 — zod schema 覆盖 POST 端点 | S7 | 3h | 🔴 P1 | ✅ |
| T908 | Server 统一错误处理中间件 | S5 | 2h | 🟡 P2 | ✅ |
| T906 | inline style 治理 — 抽取高频 CSS class | A2 | 4h | 🟡 P2 | ✅ |
| T905 | Service 层基础测试 | C1 | 7h | 🟡 P2 | ✅ |
| T913 | Heatmap 日标签修正 — 周日起始 vs 周一起始 | S13 | 0.5h | 🟢 P3 | ✅ |
| T915 | Server 列表分页 — offset/limit query params | S11 | 0.5h | 🟢 P3 | ✅ |
| U901 | 文件夹侧栏折叠状态持久化 | Boss UI | 1h | 🟡 P2 | ✅ |
| U902 | 主题切换过渡动画 — 200ms CSS transition | Boss UI | 0.5h | 🟢 P3 | ✅ |
| U903 | 博客卡片统一高度 + 标题 hover 完整展示 | Boss UI | 1h | 🟢 P3 | ✅ |

**🔴 P1 (5 项)**: ~19h — 架构 + 类型 + 安全
**🟡 P2 (4 项)**: ~14h — 样式 + 测试 + 错误 + UI
**🟢 P3 (4 项)**: ~3h — 小修小补
**总计: 13 项, ~36h**

### 纳入说明

Auditor 的 18 项 S 级发现评估如下：

| 纳入 | # | 决策逻辑 |
|------|---|---------|
| ✅ | S1 | Server/Main 逻辑重复 — 是 R37 和所有双写 bug 的根因。去重后维护成本减半（→ T901） |
| ✅ | S2 | 150 处类型断言 — 每次改 Schema 都赌命。与 Developer 的 A1 完全对齐（→ T902） |
| ✅ | S3 | 四套映射 — 随 S1 去重统一为共享映射函数（→ T901） |
| ✅ | S4 | 校验不一致 — 随 S1 统一为 ownershipGuard 中间件（→ T901） |
| ✅ | S5 | 无错误中间件 — Express 5 内置能力零使用（→ T908） |
| ✅ | S7 | 输入无校验 — 无效数据在到达 DB 前没有前置拦截（→ T907） |
| ✅ | S14 | DDL 顺序 — `folders` 在 `blogs` 后定义但 FK 指向 folders。简单但影响 FK（→ T914） |
| ⏭ | S6 | Schema 无类型 — 随 S2 IPC 类型化间接缓解 |
| ⏭ | S8 | console.log 残留 — 7 处运维日志，暂不阻塞 |
| ⏭ | S9 | 30 useState — 影响一个组件，非系统性 |
| ⏭ | S10 | IPC 分散 — 不阻塞功能，重构风险 > 收益 |
| ✅ | S11 | 无分页 — 追回为 T915 (0.5h P3, 仅改两个 route 的 query params) |
| ⏭ | S12 | Tag 子查询 — 100 个标签以内 O(n×m) 不痛 |
| ⏭ | S13 | Heatmap 日标签 — 纳入为小修 (→ T913) |
| ⏭ | S15 | QuickNote 竞态 — edge case |
| ⏭ | S16 | 无限流 — 自用桌面应用，无公网暴露 |
| ⏭ | S17 | CORS any — 内网开发用，非生产 API |
| ⏭ | S18 | drafts 无 user_id — 通过 blog_id 间接校验已覆盖 |

### Boss 使用者 UI 反馈

| # | 痛点 | 方案 |
|---|------|------|
| **U901** | 文件夹侧栏我每次都折叠，一切换页面它又展开了 | `localStorage` 记住 `sidebarCollapsed` 状态 |
| **U902** | 暗色/亮色切换是瞬间的——眼睛来不及适应 | `html` 上加 `transition: background-color 200ms ease, color 200ms ease` |
| **U903** | 博客卡片列表里，长标题被截断 | 卡片 `title` 属性展示完整标题，或 hover 时 tooltip 浮出 |

---

## Phase 10 — 桌面体验 + PDF 修复 + 翻页 ✅

> 来源：Boss 使用反馈 (2026-05-03)。四项需求：关闭行为/托盘快捷操作/PDF 双修/列表翻页。
> 原则：零新 npm 依赖，全部使用 Electron 原生 API + 现有基础设施。

### 任务总览

| 任务 | 名称 | 估算 | 优先级 |
|------|------|------|--------|
| T1001 | 关闭按钮行为 — 最小化到托盘 + 右键菜单 | 3h | 🔴 P1 | ✅ |
| T1002 | 桌面宠物 — static/drug.png + 呼吸动画 + 独立小窗体系 | 8h | 🟡 P2 | ✅ |
| T1003 | PDF 导出修复 — 改临时文件方案 | 2h | 🔴 P1 | ✅ |
| T1004 | PDF 预览修复 — 改 webview 方案 | 2h | 🟡 P2 | ✅ |
| T1005 | 博客/知识库列表翻页 — 纯前端分页 UI | 4h | 🟡 P2 | ✅ |
| T1006 | UI 圆润化 — radius + shadow + transition | 2h | 🟡 P2 | ✅ |
| T1007 | 个性化配色微调 | 1h | 🟢 P3 | ✅ |

**Phase 10 全部完成: 7 项, ~22h**

### T1001: 关闭按钮行为 + 托盘快捷菜单

- 拦截 `close` → `e.preventDefault(); win.hide()`，创建托盘图标
- 托盘图标：`nativeImage.createFromDataURL()` 生成 16×16 + 32×32 两套尺寸
- 托盘右键菜单：快速便签 / 导入 MD / 导入文件 / 收藏网页 / 打开主窗口 / 退出
- 双击托盘 → `win.show()` + `win.focus()`

### T1002: 桌面宠物

- 宠物窗口 128×128，frame:false, transparent:true, alwaysOnTop:true
- 图像切换 + 动效：静息 static.png + 呼吸动画 / 拖拽 drug.png + scale(1.08)
- 点击 vs 拖拽严格区分：DRAG_THRESHOLD=5px
- 拖拽用主进程 setInterval(16ms) 更新 win.setPosition()
- 坐标持久化到 userData/pet-position.json，多显示器安全
- 点击菜单：快速便签(迷你窗380×60) / 新建博客(独立编辑器900×650) / 导入MD(原生对话框) / 导入文件(原生对话框) / 收藏网页(迷你窗500×420) / 打开主窗口

### T1003: PDF 导出修复

- 根因: (a) printToPDF() 在 did-finish-load 前被调用（竞态），(b) data:text/html URL 超长度限制
- 修复: 临时文件方案 — fs.writeFileSync(tmpPath) → loadFile → did-finish-load → printToPDF() → unlinkSync

### T1004: PDF 预览修复

- 根因: pdfjs-dist 在 Electron sandbox 中 Worker 初始化不稳定
- 修复: 改用 Electron 原生 `<webview>` — 自带翻页/缩放/搜索

### T1005: 列表翻页

- 纯前端任务，API 已有 offset/limit 支持
- usePagination hook + 页码条组件

### T1006: UI 圆润化

- 圆角 --radius-sm: 6px / --radius-md: 8px / --radius-lg: 12px
- 阴影三层 --shadow-card/dropdown/hover
- 过渡 transition: all 150ms ease

### T1007: 个性化配色微调

- --bg-primary 加 1-2% 暖色调偏移
- 强调色尝试蓝紫渐变替代纯蓝（仅装饰性元素）

---

## Phase 11 — 工程收敛 ✅

> 来源: suggest.md。结项日期: 2026-05-06。
> P0 安全底线 + P1 架构收敛全部完成。P2 质量基线中 T1107 放弃追零（边际收益低），T1108 延期为 Phase 12。

### 任务总览

| 任务 | 名称 | 估算 | 优先级 | 状态 |
|------|------|------|--------|------|
| T1101 | DOMPurify XSS 加强 | 1h | 🔴 P0 | ✅ |
| T1102 | catch {} 全量修复 — 30+ 处空 catch → console.error | 2h | 🔴 P0 | ✅ |
| T1103 | DB 参数边界校验 — offset/limit Math.max(0, floor) | 1h | 🔴 P0 | ✅ |
| T1104 | DI 模式复制 — blog-list → knowledge/list | 4h | 🟡 P1 | ✅ |
| T1105 | sql.js Schema 冻结 — 新 DDL 仅写 mysql.ts + db.ts | 2h | 🟡 P1 | ✅ |
| T1106 | IPC 类型收敛 — WindowApi 100% 类型化 + preload 契约闭合 | 6h | 🟡 P1 | ✅ |
| T1107 | Biome 清零 — 180→53 errors | 4h | 🟡 P2 | ⏭ |
| T1108 | E2E 核心路径 — Playwright 5 条链路 | 10h | 🟡 P2 | 📋 → Phase 12 |

**🔴 P0**: ~4h ✅ | **🟡 P1**: ~12h ✅ | **🟡 P2**: T1107 ⏭, T1108 延期
**总计: 8 项, 6/8 完成, ~22h 已投入**

### 结项评估

- T1106 WindowApi + preload 类型闭合是本次最大产出 — 消除了 `as any` 的根源
- T1107 从 180 errors 压到 53，剩余 53 个边际收益低，改为"维持不恶化"
- T1108 E2E 从 Phase 11 剥离，独立为 Phase 12 专注投入

---

## Phase 12 — 缺陷修复 + E2E 兜底 + 体验收尾 ✅

> 来源: suggest.md (Boss 筛选) + T1207 复议。结项日期: 2026-05-06。
> 8/8 任务完成 + 3 审计修复 (R83-R85)。~15h 实际投入。

### 任务总览

| 任务 | 名称 | 估算 | 优先级 | 状态 |
|------|------|------|--------|------|
| T1204 | PDF 导出正文丢失修复 — 修正 PDF 导出模板 CSS | 2h | 🔴 P0 | ✅ |
| T1205 | 博客编辑器代码块横向溢出修复 | 1h | 🟡 P1 | ✅ |
| T1207 | 轻量 MD 快捷写作浮窗 (MVF) | 3h | 🟡 P1 | ✅ |
| T1108 | E2E 核心路径 — Playwright 11 tests | 3h | 🟡 P1 | ✅ |
| T1206 | 托盘/桌宠图标品牌统一 | 1h | 🟢 P3 | ✅ |
| T1209a | 全局快捷键 Ctrl+Shift+N | 1h | 🟢 P3 | ✅ |
| T1209b | 统一 Toast/Progress 反馈组件 | 2h | 🟢 P3 | ✅ |
| T1208 | 内置使用指南静态页面 `/guide` | 2h | 🟡 P2 | ✅ |

**🔴 P0**: ~2h ✅ | **🟡 P1**: ~7h ✅ | **🟡 P2**: ~2h ✅ | **🟢 P3**: ~4h ✅
**总计: 8 项, ~15h**

### 审计修复 (R83-R85)

| 工单 | 内容 | 状态 |
|------|------|------|
| R83 | T1207 浮窗关闭后主窗口无刷新 — 新增 onBlogRefresh IPC 桥接 + useEffect 监听 + unsubscribe 清理 | ✅ |
| R84 | T1209a 快捷键退出未注销 — app.on('will-quit', globalShortcut.unregisterAll) | ✅ |
| R85 | 时间戳双轨 — toMySQLDateTime() 统一入口，5 个服务 21 处迁移 | ✅ |

### Boss 驳回

| 提案 | 原因 |
|------|------|
| T1107 Biome 清零 | 边际收益低，维持不恶化 |
| T1205 编辑器全面打磨 | 范围太模糊（4 个问题一锅炖），仅保留代码块溢出 |
| T1207 初版 | 范围不可控；复议 MVF 版批准 |

### 结项评估

- PDF 导出正文丢失是真实用户缺陷，修复后导出功能完整可用
- T1207 快捷浮窗实现了 Phase 10 未完成的独立编辑器设计
- E2E 从 0 到 11 tests，覆盖注册→登录→博客 CRUD→回收站核心链路
- 图标/快捷键/Toast/使用指南补齐了品牌和交互细节
