# redo.md — 技术债与修复跟踪

> **定位**: 已发现但未修复的问题。与 [todo.md](todo.md) 的区别: todo.md = 功能路线图, redo.md = 修复清单。
> **角色协作**: Auditor 写入审查发现 → Developer 修复并更新状态 → Auditor 验证 → Boss 裁决分歧。
> **历史审计**: 已关闭的审计报告 → [docs/history-audit.md](docs/history-audit.md)
>
> 最后更新: 2026-05-17 | Phase 19 后全量审计修复 — 12/12 全部关闭，🔴🟠🟡🟢 全零

---

## 1. 输入格式规范

> **目的**: 保持文件精简。历史审计详情在问题关闭后移入"历史摘要"段（≤50 行）。

### Auditor 新增发现

```
| RXX | 严重性 | 问题 — 简洁描述 |
| **位置**: 文件:行号 |
| **后果**: 用户/开发者可见的影响 |
| **修复方向**: 建议 |
```

- 编号递增。每条 ≤5 行。必须标注文件:行号
- 必须描述"对谁产生了什么影响"——不写"可能影响"
- 🔴 P0 必须标注"阻断什么"

### Developer 修复

```
| RXX | ✅ 已修复 — 修复方式 (一句话) | **验证**: (留空) |
```

### Auditor 验证

```
| RXX | ✅ 验证通过 / 🔄 退回 — 证据 |
```

### 决策点 (Auditor 提 → Boss 裁决)

```
| DXX | 选项 A | 选项 B | 建议 | **Boss 裁决**: |
```

- 每轮审查 ≤5 个。Boss 裁决后关闭

### 禁止放入的内容

| 禁止 | 应放何处 |
|------|---------|
| 已完成 Phase 的完整审计报告 | 本文件"历史摘要"段 (≤2行/审计) |
| 已关闭 R-item 的完整修复/验证过程 | "历史摘要"段 (一行概括) |
| 需求/功能任务 | [todo.md](todo.md) |
| 代码实现方案 | 代码注释 / PR description |

---

## 2. 当前待修复

### 🔴 P0 (0 项) — **全部清零** ✅

| R158 | ✅ 已修复 — blogs INSERT 补 content/folder_id/series_id/series_name，tags 补 description，knowledge_files 补 content_text/folder_id | ✅ 已验证 — L283-284, L291-293, L319-320 全加列 + null coalescing |

### 🟠 P1 (0 项) — **全部清零** ✅

| R159 | ✅ 已修复 — updateNote/togglePin 3 处 SELECT 全部加 AND user_id = ? | ✅ 已验证 — L85, L95, L98 全加 user_id 参数化 |

### 🟡 P2 (0 项) — **全部清零** ✅

| R160 | ✅ 已修复 — blog.ts/knowledge.ts 改用 buildXxxDelete(id, userId) 变体消除 TOCTOU | ✅ 已验证 — blog.ts L153 buildBlogDelete(id,userId), knowledge.ts L172 buildKnowledgeDelete(id,userId) |
| R161 | ✅ 已修复 — :any 11→3: KnowledgeListPage backRefs + BlogPreviewPage refs 类型化为 Reference; TagManagePage map 回调类型化 | ✅ 已验证 — grep 确认 renderer `: any` 仅剩 3 处 (KnowledgeListPage 2 + ReferencePicker 1 TODO) |
| R162 | ✅ 已修复 — FolderService.getFolderTree() + server route GET /tree 改用 buildFolderTreeQuery，server route POST /create 改用 buildFolderDuplicateCheck/buildFolderCreate | ✅ 已验证 — folder.service.ts L3 import + L18 调用; folder.ts L2-6 import + L19/L36/L40 全部使用 |
| R163 | ✅ 已修复 — webApi 补 onBlogRefresh + onTrayAction + onPetAction + onUpdateStatus 空 stub | ✅ 已验证 — api-client.ts L158/L162/L163/L164 4 个 `() => () => {}` stub |
| R164 | ✅ 已修复 — noteList 全链路 (WindowApi→preload→IPC→Service) 加 dueDateFrom/dueDateTo，CalendarView 传当月首尾日期 | ✅ 已验证 — WindowApi L148 + preload L161 + IPC L16 + Service L28 + CalendarView L34-37 全链路通过 |

### 🟢 P3 (0 项) — **全部清零** ✅

| R165 | ✅ 已修复 — BlogPreviewPage .catch(() => setLoading(false)) 防止永久 loading | ✅ 已验证 — L114 `.catch(() => setLoading(false))` |
| R166 | ✅ 已修复 — ContinueWritingPage 本地类型改为 import shared DraftItem/LastBlog/RecentFile | ✅ 已验证 — L3 `import type { DraftItem, LastBlog, RecentFile }` 替代本地 interface |
| R167 | ✅ 已修复 — cleanOldNotes() 先 SELECT COUNT(*) 再 DELETE，返回实际清理数 | ✅ 已验证 — L106-108 `SELECT COUNT(*)` + `return before?.c ?? 0` |
| R168 | ✅ 已修复 — BlogListPage/KnowledgeListPage/DashboardPage 全加 error state + retry 按钮 | ✅ 已验证 — BlogListPage L131/170/440-443, KnowledgeListPage L113/146/410-413, DashboardPage L34/50-83/208-211 |
| R169 | ✅ 已修复 — TagManagePage `:any` map 回调改为 BlogWithTags/KnowledgeFileWithTags | ✅ 已验证 — L217 `b: BlogWithTags`, L218 `f: KnowledgeFileWithTags` |

### 全量审计修复 ✅ (R144-R157)

| # | ✅ 已修复 | **验证** |
|---|---------|---------|
| R144 | ✅ db/index.ts migrateSqlJsToMySQL() 补 notes/refs/folders 3 表 try-catch | ✅ 已验证 |
| R145 | ✅ KB_GET/KB_PREVIEW/KB_OPEN_EXTERNAL +userId, getFile/genPreview + buildKnowledgeSelectByUser | ✅ 已验证 |
| R146 | ✅ rowToReference() snake→camelCase 映射 + DraftRow saved_at→savedAt 别名 | ✅ 已验证 |
| R147 | ✅ validateFilename() path.basename 防 ../ 穿越 | ✅ 已验证 |
| R148 | ✅ upload.ts 改用 buildKnowledgeCreate() 自动含时间戳 | ✅ 已验证 |
| R149 | ✅ NoteListPage/CalendarView/SeriesListPage error 状态 + retry 按钮 | ✅ 已验证 |
| R150 | ✅ KB_PREVIEW 返回 {success: false, error} 修复 IPC 契约 | ✅ 已验证 |
| R151 | ✅ 新建 shared/handlers/folder-crud.ts 共享 handlers | ✅ 已验证 |
| R152 | ✅ NoteListPage/CalendarView/TimelineView abortedRef 防卸载后 setState | ✅ 已验证 |
| R153 | ✅ ipc-channels.ts IPC.PET_* 6 常量, pet.ts + pet-preload.ts 改用常量 | ✅ 已验证 |
| R154 | ✅ R146 根因修复后 `: any` 自动从 9 回落 | ✅ 已验证 |
| R155 | ✅ CalendarView/NoteListPage/FloatingBlogTabs 加 aria-label | ✅ 已验证 |
| R156 | ✅ worker.onmessageerror handler | ✅ 已验证 |
| R157 | ✅ 3 张 SVG img onError display:none 回退 | ✅ 已验证 |

### 🔵 P4 / 已知可接受

- R201: recycle.service.ts `days` 内联 SQL (已文档化)
- R218: shortcut.service.ts `writeFileSync` (已有 best-effort 注释)
- JWT secret 硬编码 fallback / MySQL 密码默认 123456 — 本地单用户应用，D13 已知可接受
- Electron sandbox 正确; CORS/CSRF/Rate Limiting 已知可接受状态

### Phase 19 已修复 ✅

| # | 问题 | 任务 | 验证 |
|---|------|------|------|
| R142 | notes sql.js 迁移缺 ALTER TABLE | T1906 | ✅ db/index.ts:120-124 4 条迁移 |
| R143 | 组件 useState→useReducer | T1909 | ✅ 3 组件共 50 useState→3 useReducer |
| R136 | use-search 超时未清理 | T1901 | ✅ safetyTimeoutRef |
| R137 | ContinueWritingPage unmount 守卫 | T1913 | ✅ abortedRef |
| R138 | blog_drafts 缺 saved_at | T1913 | ✅ buildBlogDraftInsert |
| R139 | mapFile 重复 | T1913 | ✅ mapKnowledgeRow |
| R140 | HTML 未剥离 | T1901 | ✅ stripHtml() |
| R141 | use-search tsc 类型错误 | T1901 | ✅ uid narrowing |
| R77 | Server 缺文本提取 | T1913 | ✅ mammoth/exceljs |
| R115 | Server 冗余 userId 守卫 | T1913 | ✅ 30+ 处移除 |
| R202 | knowledge filePath 验证 | T1913 | ✅ 校验已加 |
| R208 | WindowApi 6 处类型化 | T1912 | ✅ 全部具体类型 |
| R214 | preview 解析超时 | T1913 | ✅ 30s timeout |
| R216 | ShortcutSettings 泄漏 | T1913 | ✅ entry cleanup |
| R219 | db/index try-catch | T1913 | ✅ 已加 |

### Phase 18 已修复 ✅

| # | 问题 | Phase 18 任务 | 验证 |
|---|------|--------------|------|
| R112 | CRUD 双写 | **T1802** | ✅ shared handlers: blog-crud.ts (17) + knowledge-crud.ts (13) |
| R117 | Service 测试缺口 | **T1804** | ✅ 4 核心 Service, 49 tests (6 files) |
| R113 | Blog 映射函数 | **T1806** | ✅ rowToBlog/mapBlog/mapBlogRow→mapBlogRow |
| R211 | Dashboard loading | **T1807** | ✅ 分节 loading+error 状态 |
| R212 | ContinueWriting loading | **T1807** | ✅ 三区域 loading+error + catch 修复 |
| R213 | 编辑器闪烁 | **T1805** | ✅ loading 状态骨架屏 |
| R119 | ContinueWriting 空 catch | **T1807** | ✅ console.error + setError |

### Phase 19 已修复 ✅

| # | 问题 | Phase 19 任务 | 验证 |
|---|------|--------------|------|
| R137 | ContinueWritingPage unmount 守卫 | **T1913** | ✅ abortedRef + .then/.catch/.finally 守卫 |
| R138 | blog_drafts INSERT 缺 saved_at | **T1913** | ✅ buildBlogDraftInsert 替代内联 SQL |
| R139 | mapFile 重复 + 未类型化 | **T1913** | ✅ mapKnowledgeRow + mapFileWithTags |
| R77 | Server knowledge text extraction | **T1913** | ✅ mammoth/exceljs server-side |
| R115 | Server routes 冗余 userId guard | **T1913** | ✅ 全部替换为 `req.userId!` |
| R214 | preview.service.ts 解析超时 | **T1913** | ✅ Promise.race 30s |
| R216 | ShortcutSettings 监听器泄漏 | **T1913** | ✅ handleRecord 入口 cleanup |
| R218 | shortcut.service.ts try-catch | **T1913** | ✅ 已确认存在 |
| R219 | db/index.ts try-catch | **T1913** | ✅ sqlJsSave + sqlJsSaveNow |
| R202 | knowledge import filePath 验证 | **T1913** | ✅ 类型/空值/空字节校验 |
| R117 | Service 全覆盖测试 | **T1914** | ✅ 5 新文件: folder/recycle/stats/preview/reference (79 tests, 11 files) |

### 🔵 P4 / 已知可接受

- Electron sandbox 正确 (`sandbox:true`/`contextIsolation:true`/`nodeIntegration:false`)
- CORS/CSRF/Rate Limiting 为已知可接受状态
- Server routes `as any[]` 29 处 (MySQL 驱动豁免，D13 确认)

---

## 3. 当前决策点

### Phase 18 规格审查 (2026-05-14) — Boss 已裁决

| 编号 | 决策点 | Auditor 建议 | Boss 裁决 |
|------|--------|-------------|-----------|
| D43 | FULLTEXT INDEX 是否 Schema 变更 | A — INDEX 不算 | ✅ A — T1105 冻结表结构非索引 |
| D44 | Worker 线程位置 | A — Renderer Worker | ✅ A — Intl.Segmenter 浏览器 API |
| D45 | shared handler 覆盖范围 | A — SQL 构建, 副作用各自处理 | ✅ A — 6h 限定 |

**全部裁决关闭** ✅

---

## 4. 重构建议 (非紧急)

1. **CRUD 双写收敛** (R112) — Blog/Knowledge 共享 SQL handler 模式。~8h。Phase 18
2. **Service 单元测试** (R117) — 14/16 Service 补测试。需独立 Phase
3. **Server knowledge text extraction** (R77) — 引入 mammoth/exceljs。~2h

---

## 5. 历史摘要

### 修复统计
累计 ~115 项修复 (F01-F115+)、169 个工单 (R01-R169)、50 个决策点 (D01-D50)。
当前 🔴0 🟠0 🟡0 🟢0。`noUncheckedIndexedAccess` ✅, `as any` renderer=0, `: any` renderer=0 (↓ 从 11)。

### Phase 19 后全量审计修复 (2026-05-17)
12/12 + :any→0 全部修复验证通过 ✅。构建 51+2+225 ✅。测试 87/87 (12 files) ✅。`: any` renderer=11→0 (全清，含 KnowledgeListPage 2 API 回调 + ReferencePicker 1 TODO)。R158 迁移补列 (blogs +4/tags +1/knowledge_files +2)。R159 note 3 SELECT +user_id。R160 删除 TOCTOU 消窗口。R161 :any 11 处类型化。R162 folder-crud 3 builder 去死代码。R163 webApi 补 4 stub。R164 CalendarView noteList 全链路 due_date 过滤。R165 BlogPreviewPage .catch。R166 ContinueWritingPage 共享类型。R167 cleanOldNotes SELECT COUNT。R168 3 页面 error+retry。R169 TagManagePage map 类型化。P0-P3 再次全零。`: any` renderer 首次达成 0。

### Phase 19 后全量审计 (2026-05-17)
4 Agent 并行审计 + 10 场景用例验证 (Security+Data / Type Safety+Redundancy / Maintainability+Robustness / TestCaseVerification)。发现 12 新工单: P0 1项 (R158 迁移缺列数据丢失) + P1 1项 (R159 note SELECT 缺 user_id) + P2 5项 (R160 TOCTOU删除 + R161 :any↑6 + R162 folder-crud弃用 + R163 api-client缺stub + R164 CalendarView无月份过滤) + P3 5项 (R165 BlogPreviewPage无catch + R166 ContinueWriting重复类型 + R167 cleanOldNotes返0 + R168 列表页缺error状态 + R169 TagManagePage :any残留)。健康度综合 7.7/10 (↓0.2)。`: any` renderer=5→11。首次检测到 P0（数据丢失级）。MemoPage.tsx 已删除（合并入 CalendarView+NoteListPage），但 redo.md/todo.md 仍引用。folder-crud.ts 共享 handler 为死代码。CalendarView 无 due_date 范围过滤加载全量数据。

### Phase 19 全量审计 (2026-05-16)
4 Agent 并行审计 (Security+Data / Type Safety / Redundancy+Maintainability / Robustness)。验证 Phase 19 实施 + R142/R143 修复全部通过。发现 14 新工单: P1 2项 (R144 迁移缺表 + R145 跨用户访问) + P2 6项 (R146 命名不匹配 + R147 路径穿越 + R148 缺时间戳 + R149 缺 error 状态 + R150 格式不一致 + R151 SQL 仍双写) + P3 6项 (R152 竞态 + R153 IPC 硬编码 + R154 :any 上升 + R155 缺 aria + R156 onmessageerror + R157 SVG onerror)。健康度综合 7.9/10 (↓0.1)。`noUncheckedIndexedAccess` ✅, `as any` renderer=0, `: any` renderer=5。

### Phase 19 实施审计 (2026-05-16)
19/19 实施完成。构建 50+2+227 ✅。测试 87/87 (12 files, +38) ✅。IPC 99→100 (+folder:move)。发现 2 项: R142 (notes sql.js 迁移) → ✅ 已修复。R143 (组件收敛) → 🔄 BlogListPage ✅ + TagManagePage ✅，KnowledgeListPage 未收敛延 Phase 20。P0+P1+P2 从 4/0/3 降至 0/0/0。17 项 redo 积压全部清偿。

### Phase 19 关键修复 (2026-05-16)
19/19 全部完成。T1901 FTS5 搜索修复 (stripHtml + userId narrowing + safetyTimeoutRef) + T1902 时间线防御 (createdAt null guard + catch log) + T1903 全局快捷键动态注册 (reregisterAll + globalShortcut) + T1904 安装包图片 (extraResources img/) + T1905 批量分页动态化 + T1906 日历/备忘录 (notes +4列 + CalendarView + NoteListPage + /memo) + T1907 最小化标签条 + T1908 指南 3 张 SVG 配图 + T1909 TagManagePage useReducer (12→1) + T1910 folder:move 7-file IPC + T1911 键盘可访问性 + T1912 WindowApi 6 处类型化 + T1913 P3 批修复 (10/10) + T1914 Service 测试 49→87 + T1915-T1919 5 项体验。构建 ✅ 测试 87/87。IPC 99→100。

### Phase 18 实施审计 (2026-05-14)
7/7 实施完成。发现 13 项: P1 2项 (R130 FULLTEXT INDEX 错列 + R131 format 硬编码) → ✅ 已修复。P2 4项 (R132 搜索竞态 + R133 Worker 崩溃 + R134 restore 缺 updated_at + R135 recycle 缺 user_id) → ✅ 已修复。P3 7项 (R136-R141) → 延 Phase 19。Phase 18 真正结项：P0+P1+P2 全部清零。

### Phase 18 关键修复 (2026-05-14)
7/7 + R130-R135 全部完成。T1801 FTS5 Worker 倒排索引 (Intl.Segmenter + TF-IDF + localStorage 缓存 + correlation ID 竞态修复) + MySQL FULLTEXT INDEX + T1802 CRUD 双写收敛 (blog-crud.ts 17 + knowledge-crud.ts 13) + T1803 错误反馈 (uncaughtException→IPC→Toast) + T1804 Service 测试 27→49 (6 files) + T1805 编辑器闪烁修复 + T1806 映射函数统一 (3→1 mapBlogRow) + T1807 Dashboard/ContinueWriting loading+error。IPC 95→99。构建 ✅ 测试 49/49。

### Phase 17 关键修复 (2026-05-14)
9/9 全部完成。T1708 R207 user_id 隔离 (6 Service + 5 IPC + 7 renderer) + T1704 shell:openExternal IPC + 超链接事件委托 + T1702 blog:seriesRename IPC + 内联编辑 + T1703 系列博客 excludeSeries 过滤 + T1705 系列滚动重置 + T1706 requestSingleInstanceLock + T1707 electron-builder NSIS + T1701 WebEditorPage + T1709 :any 14→5。IPC 93→95。构建 ✅ 测试 27/27。

### Phase 16 关键修复 (2026-05-08)
T1601 mode=edit + scrollRatio + R122-R125 类型错误 + R126 BlogListPage cleanup + R127 api-client webApi 补齐 + R128 TOC_SELECTORS 22项 + R129 顶部编辑按钮

### Phase 15 关键修复 (2026-05-08)
T1502 strict `noUncheckedIndexedAccess` 47 errors→0 + R106 IPC 去重 + R107 Web stub 补齐 + R108 非空断言 + R109 any 收敛

### Phase 14 关键修复 (2026-05-07)
T1403 `as any` 32→0 + T1402 状态机 30 useState→useReducer + R102-R105 修复 + R101 HashRouter→data router

### Phase 13 及之前
Phase 9-13: 安全底线 (PBKDF2/Session/XSS)、架构收敛 (WindowApi/DI模式/IPC契约)、体验增强。详见 git log。

### 安全里程碑
- Phase 11: DOMPurify XSS + catch{} 全量修复 + DB 参数化
- Phase 15: `noUncheckedIndexedAccess` 永久启用
- Phase 16: Server user_id 隔离 4 P1 全部修复 (R203-R206/R209)
- Phase 16: IPC 事件硬编码全量替换 (R210, 6 处)
- Phase 16: 11/11 P1-P4 首轮修复验证通过 (R203-R206/R209/R210/R215/R217/R218/R220/R221)
