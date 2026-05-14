# redo.md — 技术债与修复跟踪

> **定位**: 已发现但未修复的问题。与 [todo.md](todo.md) 的区别: todo.md = 功能路线图, redo.md = 修复清单。
> **角色协作**: Auditor 写入审查发现 → Developer 修复并更新状态 → Auditor 验证 → Boss 裁决分歧。
> **历史审计**: 已关闭的审计报告 → [docs/history-audit.md](docs/history-audit.md)
>
> 最后更新: 2026-05-14 | Phase 18 规格审查

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

### 🟠 P1 (0 项)

**全部清零** ✅

### 🟡 P2 (0 项)

**全部清零** ✅

### 🟢 P3 (7 项) — 延 Phase 19

| # | 问题 | 位置 |
|---|------|------|
| R136 | **use-search 超时未在 unmount 清理** — `setTimeout(5000)` safety timeout 未存入 ref，组件卸载后仍触发 setResults + resolve | `use-search.ts:161-166` |
| R137 | **ContinueWritingPage 无 unmount 守卫** — async `.then()` 回调无 aborted 标志，快速导航离开后 setState on unmounted component | `ContinueWritingPage.tsx:37-63` |
| R138 | **Server blog_drafts INSERT 缺 saved_at 列** — 内联 SQL `INSERT INTO blog_drafts (blog_id, content)` 与 shared `buildBlogDraftInsert`（含 saved_at）不一致 | `server/routes/blog.ts:137` |
| R139 | **知识库 mapFile 重复且未类型化** — server route 中 `mapFile(f: any, tags: any[])` 与 `knowledge.service.ts` 中 `rowToFile` 映射逻辑完全重复 | `server/routes/knowledge.ts:22-35` |
| R140 | **HTML 标签未剥离即索引** — Worker 将原始 HTML 标记（`<div>`, `class` 等）作为搜索词条索引，污染倒排索引 | `search.worker.ts:64` |
| R141 | **use-search.ts web tsc 类型错误** — `userId: number\|null` 在 async 闭包中未 narrowing，传给 `searchQuery({userId})` 和 `fetchAndBuildIndex(worker, userId)` 报 `Type 'number\|null' not assignable to 'number'` | `use-search.ts:45,80` |

### 🟡 P2 (5 项)

| # | 问题 | 位置 | 状态 |
|---|------|------|------|
| R112 | Blog/Knowledge CRUD 逻辑 Server-Main 双写 — 11+ 条 SQL 在 service 和 route 中各实现一份 | `blog.service.ts` ↔ `server/routes/blog.ts` | ✅ T1802 — shared handlers 收敛 (blog-crud.ts 17函数 + knowledge-crud.ts 13函数) |
| R116 | 3 组件 useState 超 10 — KnowledgeListPage(20)/BlogListPage(19)/TagManagePage(12) | `KnowledgeListPage.tsx` 等 | ⏭ Phase 19 |
| R202 | Server 知识库导入存储未验证 filePath — 用户提供的路径直接存 DB | `server/routes/knowledge.ts:105-107` | 📋 |
| R208 | 6 个 WindowApi 方法返回 `Record<string,unknown>` — 无具体返回类型 | `window-api.ts:48,55,99,101-103` | ⏭ Phase 19 |
| R117 | 14/16 Service 文件无单元测试 — 仅 auth/blog 覆盖 | `src/main/services/` | ✅ T1804 — 4 核心 Service 已补 (49 tests, 6 files) |

### 🟢 P3 (8 项)

| # | 问题 | 位置 |
|---|------|------|
| R77 | Server knowledge import 缺文本提取 (mammoth/exceljs 未引入 server 端) | `server/routes/knowledge.ts` |
| R115 | Server routes 中 30+ 处冗余 `if (!userId) return 401` (requireAuth 中间件已做) | `server/routes/*.ts` |
| R201 | recycle.service.ts `days` 参数内联 SQL (已文档化，安全) | `recycle.service.ts:58` |
| R214 | preview.service.ts DOCX/XLSX/PDF 解析无超时 | `preview.service.ts:70-155` |
| R216 | ShortcutSettings 快速点击录制按钮泄漏 keydown 监听器 | `ShortcutSettings.tsx:36-82` |
| R218 | shortcut.service.ts `writeFileSync` 无 try-catch | `shortcut.service.ts:31` |
| R219 | db/index.ts `writeFileSync` 在 setTimeout 回调中无 try-catch | `db/index.ts:230,242` |

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
累计 ~115 项修复 (F01-F115+)、141 个工单 (R01-R141)、45 个决策点 (D01-D45)。
当前 🔴0 🟠0 🟡0 🟢7。`noUncheckedIndexedAccess` ✅, `as any` renderer=0, `: any` renderer=5。

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
