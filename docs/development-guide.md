# 开发指南

> 本文档从 [todo.md](../todo.md) 拆分而出，包含测试策略、工作流程图、文件清单和依赖关系图。
> 供开发者在实现和审查时参考。

---

## 测试策略

### 测试金字塔

```
        ┌──────┐
        │ E2E  │  ~15 个场景 (Playwright)
       ┌┴──────┴┐
       │ 组件   │  ~30 个测试 (Vitest + RTL)
      ┌┴────────┴┐
      │  单元    │  ~60 个测试 (Vitest)
     ┌┴──────────┴┐
     │  类型检查   │ TypeScript strict
    └─────────────┘
```

### 关键业务流程测试

**认证流程**:
1. 注册新用户 → 工作区目录创建 → 自动登录 → 仪表盘
2. 登录 → 记住我 → 关闭应用 → 重新打开 → 自动登录
3. 错误密码 → 错误提示
4. 注销 → 跳转登录页

**博客流程**:
1. 创建 Markdown 博客 → 编辑 → 保存 → 列表显示
2. 创建 HTML 博客 → WYSIWYG 编辑 → 保存
3. 导入 .md 文件 → 标题自动提取
4. 博客删除 → 回收站 → 恢复 → 列表显示
5. 博客删除 → 回收站 → 清空 → 永久删除

**知识库流程**:
1. 导入 PDF/DOCX/XLSX/TXT → 列表显示
2. 文件预览 → HTML 渲染
3. 文件重命名 → 磁盘同步
4. 文件删除 → 回收站

---

## 工作流程图

### 整体开发流程

```
Phase 1 (✅)               Phase 2 (✅)               Phase 3 (✅)
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ 项目骨架         │      │ 博客 CRUD        │      │ 知识库管理       │
│ 用户认证         │ ───▶ │ Tiptap 编辑器    │ ───▶ │ 文件导入/预览    │
│ 数据库           │      │ 标签系统         │      │ 文件搜索         │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
        ┌─────────────────┐      │      ┌─────────────────┐
        │ Phase 5 (✅)    │      │      │ Phase 4 (✅)    │
        │ 全局搜索 UI     │ ◀────┼────▶ │ 网页收藏         │
        │ 主题切换        │      │      │ SQL LIKE 搜索   │
        │ 仪表盘完善      │      │      │ 回收站           │
        └─────────────────┘      │      └─────────────────┘
                                 │
        ┌─────────────────┐      │      ┌─────────────────┐
        │ Phase 6 (✅)    │      │      │ Phase 7 (✅)    │
        │ 测试 + 优化      │ ◀────┼────▶ │ TOC + 阅读时间   │
        │ 打包 + 备份     │      │      │ 模板 + 批量操作   │
        └─────────────────┘             └─────────────────┘
```

### 博客创建流程

```
用户点击「新建博客」
        │
        ▼
┌──────────────────┐
│ 选择格式          │
│ ○ Markdown        │
│ ○ HTML            │
└──────┬───────────┘
       │
       ├─── Markdown ───▶ Tiptap (Markdown 模式)
       │                   ├─ 工具栏 (B/I/U/H1/List/Code/...)
       │                   ├─ Markdown 快捷键 (#, **, -, etc.)
       │                   ├─ 分屏预览 (markdown-it 渲染)
       │                   └─ 自动保存草稿 (30s)
       │
       └─── HTML ───────▶ Tiptap (WYSIWYG 模式)
                           ├─ 工具栏 (B/I/U/H1/List/Code/...)
                           ├─ 所见即所得编辑
                           ├─ 源码切换 (textarea)
                           └─ 自动保存草稿 (30s)
                                    │
                                    ▼
                            ┌──────────────┐
                            │ 保存 (Ctrl+S) │
                            └──────┬───────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ 写入文件  │ │ 更新 DB  │ │ 更新 FTS │
              │ Blogs/    │ │ blogs    │ │ blog_fts │
              └──────────┘ └──────────┘ └──────────┘
```

### 知识库文件导入流程

```
用户拖放文件 / 点击「导入」
        │
        ▼
┌───────────────────┐
│ window.api        │
│ .selectFiles()    │
│ (多选文件)         │
└──────┬────────────┘
       │
       ▼
┌───────────────────┐
│ 显示导入预览       │
│ ┌────────────────┐│
│ │ file1.pdf   ✓  ││
│ │ file2.docx  ✓  ││
│ │ file3.exe   ✗  ││  ← 不支持的类型
│ │ file4.pdf   ⚠  ││  ← 重名, 将添加时间戳
│ └────────────────┘│
│   [确认导入]       │
└──────┬────────────┘
       │
       ▼
┌───────────────────┐
│ KnowledgeService   │
│ .importFiles()     │
│                    │
│ For each file:     │
│ 1. 检测 MIME 类型  │
│ 2. 复制到 KB/      │
│ 3. 提取文本 (索引) │
│ 4. 插入 DB 记录    │
└──────┬────────────┘
       │
       ▼
┌───────────────────┐
│ 知识库列表更新     │
│ 文件卡片显示       │
│ [PDF] report.pdf  │
│ [DOC] notes.docx  │
└───────────────────┘
```

### Session 认证流程

```
应用启动
    │
    ▼
┌─────────────────────────────────────────┐
│ App.tsx: initSession()                  │
│                                         │
│ 1. loadPersistedToken()                │
│    ├─ localStorage? → 有              │
│    └─ sessionStorage? → 有            │
│                                         │
│ 2. IPC: AUTH_VERIFY_TOKEN(token)       │
│    ├─ 查询 sessions 表                 │
│    ├─ 检查 expires_at > now()          │
│    ├─ JOIN users → 获取用户信息        │
│    └─ 返回 User 或 error               │
│                                         │
│ 3. 结果处理                             │
│    ├─ success → set auth state ✅       │
│    └─ expired/invalid → clear storage   │
└─────────────────────────────────────────┘
    │
    ├── authenticated ──▶ ProtectedRoute → Dashboard
    │
    └── not authenticated ──▶ LoginPage
```

---

## 附录 A: 文件清单 (全部待创建/修改)

### Phase 2 文件

| 操作 | 文件 |
|------|------|
| 修改 | `src/main/services/blog.service.ts` |
| 修改 | `src/main/ipc/blog.ts` |
| 新建 | `src/main/services/tag.service.ts` |
| 修改 | `src/main/ipc/tags.ts` |
| 新建 | `src/renderer/components/editor/TiptapEditor.tsx` |
| 新建 | `src/renderer/components/editor/EditorToolbar.tsx` |
| 新建 | `src/renderer/components/editor/MarkdownPreview.tsx` |
| 修改 | `src/renderer/features/blog/BlogListPage.tsx` |
| 修改 | `src/renderer/features/blog/BlogEditorPage.tsx` |
| 新建 | `src/renderer/features/blog/BlogHistoryPanel.tsx` |
| 新建 | `src/renderer/components/common/TagSelector.tsx` |
| 修改 | `src/renderer/features/tags/TagManagePage.tsx` |

### Phase 3 文件

| 操作 | 文件 |
|------|------|
| 新建 | `src/main/services/knowledge.service.ts` |
| 新建 | `src/main/services/preview.service.ts` |
| 修改 | `src/main/ipc/knowledge.ts` |
| 修改 | `src/renderer/features/knowledge/KnowledgeListPage.tsx` |
| 新建 | `src/renderer/components/preview/FilePreview.tsx` |
| 新建 | `src/renderer/components/preview/PdfPreview.tsx` |

### Phase 4 文件

| 操作 | 文件 |
|------|------|
| 新建 | `src/main/services/web-scraper.service.ts` |
| 新建 | `src/main/services/recycle.service.ts` |
| 修改 | `src/main/db/index.ts` (sql.js → better-sqlite3) |
| 修改 | `src/main/db/schema.ts` (添加 FTS5) |
| 修改 | `src/main/index.ts` (async → sync initDatabase) |
| 修改 | `src/main/ipc/scrape.ts` |
| 修改 | `src/main/ipc/recycle.ts` |
| 修改 | `src/renderer/features/recycle/RecycleBinPage.tsx` |

### Phase 5 文件

| 操作 | 文件 |
|------|------|
| 新建 | `src/main/services/dashboard.service.ts` |
| 修改 | `src/main/services/search.service.ts` |
| 修改 | `src/main/ipc/search.ts` |
| 修改 | `src/renderer/components/layout/GlobalSearch.tsx` |
| 修改 | `src/renderer/features/dashboard/DashboardPage.tsx` |
| 修改 | `src/renderer/features/settings/SettingsPage.tsx` |
| 新建 | `src/renderer/hooks/useShortcuts.ts` |
| 修改 | `src/renderer/stores/theme-store.ts` |

### Phase 6 文件

| 操作 | 文件 |
|------|------|
| 新建 | `src/main/services/backup.service.ts` |
| 新建 | `tests/unit/services/*.test.ts` (多个) |
| 新建 | `tests/e2e/*.spec.ts` (多个) |
| 新建 | `src/shared/i18n/zh-CN.json` |
| 新建 | `src/shared/i18n/en.json` |
| 修改 | `forge.config.ts` |

---

## 附录 B: 依赖关系图

```
T001 ──▶ T002 ──▶ T003 ──▶ T004 ──▶ T005 ──▶ T006 ──▶ T007 ──▶ T008 ──▶ T009 ──▶ T010 ──▶ T011
                                                                                                │
                    ┌───────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
              T101 (BlogService) ──▶ T102 (Blog IPC)
                    │                     │
                    ├──▶ T103 (Tiptap MD) │
                    │       │             │
                    │       └──▶ T104 (Tiptap WYSIWYG)
                    │                     │
                    ├──▶ T105 (图片粘贴)   │
                    │                     │
                    ├──▶ T106 (MD 导入)    │
                    │                     │
                    └──▶ T107 (博客列表) ──┼──▶ T108 (编辑页)
                                          │       │
                                          │       └──▶ T110 (历史版本)
                                          │
                          T109 (标签系统) ─┘

T201 (KnowledgeService) ──▶ T202 (预览服务) ──▶ T205 (IPC)
                    │              │
                    └──▶ T203 (知识库列表)
                                   │
                                   └──▶ T204 (预览面板)

T301 (网页收藏)    T302 (DB 迁移 + FTS5)    T303 (回收站服务)
                                          │
                                          └──▶ T304 (回收站 UI)

T401 (搜索服务) ──▶ T402 (GlobalSearch)
T403 (主题)      T404 (仪表盘)

T501 (单元测试) ──▶ T502 (E2E) ──▶ T503 (性能) ──▶ T504 (打包) ──▶ T505 (备份) + T506 (i18n)
```
