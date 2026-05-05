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
