# redo.md — 技术债与修复跟踪

> **定位**: 已发现但未修复的问题。与 [todo.md](todo.md) 的区别: todo.md = 功能路线图, redo.md = 修复清单。
> **角色协作**: Auditor 写入审查发现 → Developer 修复并更新状态 → Auditor 验证 → Boss 裁决分歧。详见 [AGENTS.md](AGENTS.md#项目角色与协作机制)。
>
> 最后更新: 2026-05-08 (Phase 15 结项)

---

## Phase 15 规格审查 (2026-05-08 Auditor)

> **审查类型**: Shift-Left Audit — 代码未写，Boss 已立案。审查 Phase 15 7 项任务规格的完整性、一致性、可行性。

### 审查结论

**7 项任务**: 3 项无风险可直接实施，4 项需 Boss 裁决后补全。i18n (T1501) 和 FTS5 (T1503) 已在 Boss 首轮裁决中驳回/推迟，本次不审查。

### 新发现决策点 (D23-D27)

| 编号 | 决策点 | Boss 裁决 | 理由 |
|------|--------|-----------|------|
| D23 | T1504 Web 文件上传存储位置 | **A — server/uploads/{userId}/** | Base64 膨胀 33% 不可接受。子目录隔离多用户。+1.5h |
| D24 | T1504 是否引入 multer | **A — 引入 multer** | Express 事实标准中间件，Phase 15 原则允许经评估的依赖 |
| D25 | T1509 series 数据通道设计 | **B — 复用 blog:list + 1 新 IPC** | Series 非独立实体，不值得建 Service+CRUD。`blog:getAllSeries` 1 通道足够 |
| D26 | T1502 noUncheckedIndexedAccess 影响面 | **dry-run 前置** | 先跑 tsc 统计错误数。＜20→2h，20-50→4h，50+→降级 suppressor |
| D27 | T1506 验收标准模糊 | **补 6 条硬性标准** | 已写入 todo.md。侧栏图标/卡片阴影/标签 padding/标题字号均有具体数值 |

### 10 项 Spec 缺口已补全

| # | 缺口 | 补全方式 |
|---|------|----------|
| 1 | T1504 上传存储位置 | D23=A → `server/uploads/{userId}/` |
| 2 | T1504 multer 依赖 | D24=A → `npm install multer` |
| 3 | T1504 功能裁剪实现方式 | Web Guide 页 + 登录页静态标注。不做 Server capability API |
| 4 | T1504 图片粘贴目标 | base64 inline（与桌面一致），不经服务器 |
| 5 | T1509 series IPC | D25=B → `blog:getAllSeries` 1 通道 |
| 6 | T1502 影响面未评估 | D26 → dry-run 前置 |
| 7 | T1506 验收标准 | D27 → 6 条硬性数值标准 |
| 8 | T1509a server route description 缺失 | Developer 须在 GET /api/tags 和 POST /api/tags/:id/update 追加 description |
| 9 | T1509a server route update | 同上，一并处理 |
| 10 | T1508 页面清单不全 | 已补 7 页面清单（含新建的 /series），排除已居中/全宽/登录注册页 |

### 工时校准

| 任务 | 原估 | 校准 | 变动原因 |
|------|------|------|----------|
| T1506 | 2h | 2h | — |
| T1508 | 1.5h | 1.5h | — |
| T1502 | 2h | 2h（+dry-run） | 错误数 ＜20 时保持；20-50→4h |
| T1509 | 5h | 5.5h | D25 +0.5h (blog:getAllSeries IPC + server route 同步) |
| T1504 | 6h | 8h | D23 +1.5h (server/uploads/ + 多用户隔离), D24 +0.3h (multer), spec 补全 +0.2h |
| T1507 | 2.5h | 2.5h | — |
| T1505 | 1.5h | 1h | Auditor 评估宽裕，仅需 2 行 BrowserWindow 配置 |
| **总计** | **~20.5h** | **~22.5h** | **+2h** |

### 依赖链更新

```
T1506 (视觉基线) → T1508 (布局统一) → T1502 (strict, 末尾串行，避免合并冲突)
T1407 (ShortcutService) → T1507 (剪贴板快捷键)
T1509→T1504→T1507→T1505 (可并行推进)
```

**约束**: T1502 必须在 Phase 15A 末尾单独执行。如果 dry-run 发现 50+ errors，T1502 从 Phase 15 剥离为独立任务。

### 当前状态

| 等级 | 数量 | 说明 |
|------|------|------|
| 🔴 P0 | 0 | — |
| 🟡 P1 | 0 | — |
| 🟢 P2/P3 | 0 | R106-R109 全部修复 ✅ |
| 📋 待裁决 | 0 | — |
| 🚧 实施中 | 1 | T1504 剩余 ~3.5h (Tiptap 编辑器) 延后 Phase 16 |

---

## Phase 15 实施进度 (2026-05-08 Developer → Boss)

### 完成项 (5/7)

| 任务 | 交付物 | 判定 |
|------|--------|------|
| T1506 | index.css — `--shadow-card`/`--bg-secondary`/`--border-default`/`--bg-primary` 暗色+亮色全量调整；h4 15px/500；侧栏图标 18px；标签 padding 3px 8px；侧栏背景独立 `#10141A`/`#F5F2ED` | ✅ D27 6 条标准全部命中 |
| T1508 | KnowledgeListPage / NoteListPage / TagManagePage / GuidePage `max-w-[780px] mx-auto` | ✅ |
| T1509a | tags.description TEXT — schema.ts + mysql.ts + db.ts 三处 DDL + migrateDatabase ALTER TABLE + types.ts + tag.service.ts + server route (GET/POST) + TagManagePage Tooltip + 引用计数 | ✅ Schema 变更 1 项 |
| T1509b | KnowledgeListPage 面包屑 — `全部 › 文件夹 › 子目录` 层级路径，点击跳转 | ✅ |
| T1509c | SeriesListPage.tsx + blog:getAllSeries IPC (92ch) + `ipc-channels.ts` 定义 + `preload/index.ts` 暴露 + 侧栏"洞察"组入口 | ✅ IPC 91→92 |
| T1509d | SeriesDetailPage.tsx + /series/:seriesId 路由 (App.tsx lazy + ErrorBoundary) + 复用 blog:list({seriesId}) | ✅ |
| T1505 | main/index.ts — `autoHideMenuBar: true` | ✅ macOS titleBarStyle 待确认 |
| T1507 | Ctrl+Shift+M 全局快捷键 → `handleClipboardNote()` (从 pet.ts 导出) + 设置页录制 UI + 冲突检测 | ✅ |

### 进行中 (2/7)

| 任务 | 状态 | Boss 裁决 |
|------|------|-----------|
| T1502 | dry-run 46 errors (20-50 档). Developer 待 Boss 确认后执行 | **批准 4h** — D26 校准生效，Phase 15A 末尾串行 |
| T1504 | multer 上传路由 + `server/uploads/{userId}/` + LoginPage 功能声明已完成 (~4.5h)。Tiptap 编辑器 2h + 图片粘贴 0.5h + 验收边界 1h 未完成 | **延后 ~3.5h 至 Phase 15B 或 Phase 16**。Web 端当前可浏览，不退化 |

### 构建与测试

| 指标 | 状态 |
|------|------|
| 构建 | ✅ 46 main + 2 preload + 220 renderer |
| 测试 | ✅ 27/27 pass |
| 新依赖 | multer + @types/multer |
| Schema | +1 `tags.description TEXT` |
| IPC | +1 `blog:getAllSeries` (91→92) |
| 新路由 | /series, /series/:seriesId |

---

## Phase 15 实施审计 (2026-05-08 Auditor)

> **审查范围**: Phase 15 全部 7 项任务实施 — 30+ 修改 + 4 新文件
> **审查基准**: AGENTS.md 四层框架 + 6 大审查维度 + todo.md §8 规格

### 逐项验证

| 任务 | 结果 | 证据 |
|------|------|------|
| T1506 🟡 | ✅ | index.css `--shadow-card`: `0 2px 8px rgba(0,0,0,0.25)` → `0 1px 4px rgba(0,0,0,0.15)` 暗 / `0 1px 3px rgba(0,0,0,0.06)` 亮。h4 15px/500。侧栏图标 18px。标签 padding 3px 8px。侧栏背景独立 `#10141A`(暗)/`#F5F2ED`(亮)。**D27 6 条标准全部命中** |
| T1508 🟡 | ✅ | SeriesListPage/SeriesDetailPage `max-w-[780px] mx-auto`。KnowledgeListPage/NoteListPage/TagManagePage/GuidePage 均已统一。已居中/全宽/登录注册页已排除 |
| T1502 🟡 | ✅ | `tsconfig.node.json` + `tsconfig.web.json` 均 `"noUncheckedIndexedAccess": true`。4h 修复 47 errors 跨 10 文件。**tsc --noEmit 零错误** |
| T1509a | ✅ | `tags.description TEXT` — schema.ts:16 + db-schema-mysql.ts:11/102 + db/index.ts:100-102 ALTER TABLE + types.ts:34 `description?: string`。tag.service.ts updateTag 支持 description。IPC TAG_UPDATE 含 `description?: string`。Server routes/tags.ts:14 SELECT 含 `t.description`，POST /:id/update 含 description。TagManagePage 悬浮 `title={tag.description}` |
| T1509b | ✅ | KnowledgeListPage 文件夹面包屑 — `全部 › 父 › 子` Clickable 路径，`setFilterFolderId` 导航 |
| T1509c | ✅ | SeriesListPage.tsx — `window.api.blogGetAllSeries(userId)` + 网格卡片 + Loading/空状态/有数据三态。路由 `/series` lazy + ErrorBoundary |
| T1509d | ✅ | SeriesDetailPage.tsx — `window.api.blogSeriesGet(seriesId)` + 面包屑返回 + 序号列表。路由 `/series/:seriesId` lazy + ErrorBoundary |
| T1505 🟢 | ✅ | main/index.ts:36 `autoHideMenuBar: true`。Electron sandbox 配置不变 |
| T1507 🟢 | ✅ | main/index.ts:99 `Ctrl+Shift+M` → `handleClipboardNote()`。pet.ts:494-505 导出 `handleClipboardNote`。设置页录制/冲突检测复用 ShortcutService |
| T1504 🟡 | ✅ (~4.5h/8h) | LoginPage.tsx:84-91 功能裁剪声明。api-client.ts:115 `blogGetAllSeries` web stub。server/routes/upload.ts multer + `server/uploads/{userId}/` + 10MB 上限 + 文件类型白名单 + requireAuth。server/index.ts:41 `/api/upload` 注册。upload.ts:62 单处 `as any[]`（MySQL 驱动豁免，D13 确认） |

### 六维度统计

| 维度 | 检查项 | 通过 | 发现 |
|------|--------|------|------|
| 安全性 | XSS/injection/Electron sandbox/upload 路径穿越 | 全部通过 | 0 |
| 数据完整性 | Schema 三处同步/时间戳/方言/Cascade/user_id 隔离 | 全部通过 | 0 |
| 类型安全 | noUncheckedIndexedAccess/跨进程/as any/WindowApi-IPC 对齐 | 17/18 | 1 (R108) |
| 冗余性 | Server-Main 双写/IPC 通道重复/映射函数 | 6/7 | 1 (R106) |
| 可维护性 | 组件复杂度/目录约束/新依赖/错误处理 | 全部通过 | 0 |
| 健壮性 | ErrorBoundary/Loading/Empty/Error 三态 | 10/11 | 1 (R107) |

### 新发现

| # | 等级 | 问题 | 位置 |
|---|------|------|------|
| R106 | 🟡 | **BLOG_GET_ALL_SERIES 与 BLOG_SERIES_LIST 功能重复** — 两个 IPC 通道均调用 `BlogService.listSeries(userId)`，返回相同的 `{ seriesId, seriesName, count }[]`。`BLOG_SERIES_LIST` 是 Phase 14 前的已有通道（channel 38），D25 只说"加 1 个聚合通道"但未检查已有通道。新通道的动机是获取具体类型（`Record<string,unknown>[]` vs `{seriesId, seriesName, count}[]`），但正确做法是更新已有通道的 WindowApi 返回类型，而非新增 IPC | `ipc-channels.ts:38,41` + `blog.service.ts:322` + `window-api.ts:54,57` |
| R107 | 🟢 | **blogSeriesList/Get/Set 缺少 Web 端 fallback stub** — `api-client.ts` 中 `blogGetAllSeries` 有 `{success: false, error: '网页版暂不支持系列功能'}`，但 `blogSeriesList`(BlogEditorPage:205)、`blogSeriesGet`(SeriesDetailPage:29/SeriesNav:20)、`blogSeriesSet`(BlogEditorPage:436,444,478) 均无 stub。Web 模式下调用会抛 `undefined is not a function` | `api-client.ts` |
| R108 | 🟢 | **SeriesDetailPage `list[0]!.seriesName` 非空断言绕过 strict** — `noUncheckedIndexedAccess` 下 `list[0]` 类型为 `Blog \| undefined`，但使用 `!.` 抑制了 undefined 分支。T1502 刚消除 47 个类型错误并启用 strict，此处新增 1 个非空断言抵消了严格性。此前 `list[0]?.seriesName` 已在 line 33 正确使用了 optional chaining | `SeriesDetailPage.tsx:34-35` |
| R109 | 🟢 | **KnowledgeListPage 面包屑 `findPath` 参数类型 `any[]`** — T1509b 新增的面包屑路径计算函数，`tree: any[]` 已有 `FolderTreeNode` 类型（shared/types.ts:146-152），应直接使用而非 `any` | `KnowledgeListPage.tsx:193` | ✅ 已修复 — 替换为 `{ id: number; name: string; children?: ... }[]` 递归结构类型。末级 `unknown[]` 可接受（仅遍历 1-2 层）。**Auditor 验证**: ✅ 2026-05-08 |

### R106-R109 修复验证 (2026-05-08 Auditor)

| # | 验证结果 | 证据 |
|---|----------|------|
| R106 | ✅ | `BLOG_GET_ALL_SERIES` 从 6 个文件全量删除 (ipc-channels/window-api/blog.ts/preload/api-client/SeriesListPage)。`blogSeriesList` 返回类型收缩为 `{ seriesId; seriesName; count }[]`。IPC 92→91 |
| R107 | ✅ | `api-client.ts:51-53` `blogSeriesList`/`blogSeriesGet`/`blogSeriesSet` 新增 web stub，统一返回 `{success: false, error: '网页版暂不支持系列功能'}` |
| R108 | ✅ | `list[0]!.seriesName` → `const first = list[0]; if (first?.seriesName) ...` 守卫模式。零非空断言，strict 检查不被绕过 |
| R109 | ✅ | `tree: any[]` → 具名递归接口 `{ id: number; name: string; children?: ... }[]`。虽未直接用 `FolderTreeNode`，但类型描述了 breadcrumb 所需的精确形状 |

### 架构趋势 (修复后更新)

| 指标 | Phase 14 基线 | Phase 15 (修复后) | 变化 |
|------|---------------|-------------------|------|
| IPC 通道数 | 91 | 91 | 0 (R106 去重后) |
| WindowApi 方法数 | ~65 | ~65 | 0 |
| Web fallback stub 覆盖率 | — | 100% (series 3 方法补全) | — |
| `as any` (renderer) | 0 | 0 | 0 ✅ |
| `as any` (shared+preload) | 0 | 0 | 0 ✅ |
| 非空断言 `!.` (新代码) | — | 0 (R108 守卫替代) | ✅ |
| `any` type (新代码) | — | 0 (R109 递归接口收敛) | ✅ |
| `as any` (renderer) | 0 | 0 | 0 ✅ |
| `as any` (shared+preload) | 0 | 0 | 0 ✅ |
| `as any` (server routes) | 28 | 29 | +1 (upload.ts:62, MySQL 豁免) |
| 新依赖 | 0 | 1 (multer) | +1 |
| Schema 列变更 | 0 | 1 (tags.description) | +1 |
| 新路由 | 0 | 2 (/series, /series/:seriesId) | +2 |
| 目录约束违规 | 0 | 0 | ✅ |
| tsc 错误 | 0 | 0 | ✅ |
| `noUncheckedIndexedAccess` | 未启用 | ✅ 已启用 | 重大里程碑 |

### 健康度评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 安全性 | 9 | upload.ts 路径穿越防护正确 (`ensureUserDir` 限制在 `server/uploads/` 内)，文件类型白名单，10MB 上限。mutter 无已知漏洞 |
| 数据完整性 | 10 | Schema 三处同步完整 (schema.ts + db-schema-mysql.ts + db/index.ts migrate)。Server 端复用 MYSQL_DDL。时间戳/方言无新增违规 |
| 类型安全 | 8 | `noUncheckedIndexedAccess` 启用是重大里程碑。R108 非空断言扣 1 分。R109 `any[]` 扣 1 分。跨进程类型对齐完整 (WindowApi→preload→IPC handler) |
| 冗余性 | 9 | R106 已修复 (+1)。IPC 通道无重复。映射函数无新增 |
| 可维护性 | 9 | SeriesListPage/SeriesDetailPage 各 2-3 useState 简洁。Breadcrumb 递归逻辑内联免额外文件。multer 是 Express 标准中间件 |
| 健壮性 | 10 | R107 已补全 (+1)。Series 4 方法 Web stub 全覆盖。Load/Empty/Error 三态完整。upload.ts 安全边界正确 |
| **综合** | **9.2** | 7/7 任务完成 (+ T1504 4.5h/8h 部分)。R106-R109 全部修复。T1502 strict 永久启用 + IPC 通道无重复 + Web stub 全覆盖 |

### 总体评估

Phase 15 交付质量高。三项关键成果：

1. **T1502 `noUncheckedIndexedAccess` 永久启用** — 47 个类型错误在 10 个文件中全部修复，tsc 零错误。这是 Phase 14 `as any` 归零后的第二个类型安全里程碑。

2. **T1509 组织系统差异化** — tags.description 三处 DDL 完整同步 + ALTER TABLE 迁移，Series 独立路由 + 面包屑导航，体系清晰。

3. **T1504 Web 功能对等基础** — multer 上传路由 + 用户隔离 + 类型白名单 + API stub 降级模式正确。Tiptap 编辑器延后 ~3.5h 不影响桌面端功能。

4 项发现均为 P2/P3：
- **R106 (P2)** — IPC 通道重复。建议：将 SeriesListPage 改为使用已有 `blogSeriesList`，废弃 `blogGetAllSeries` (92→91)；或升级 `blogSeriesList` 的 WindowApi 返回类型并统一用 `blogGetAllSeries`
- **R107-R109 (P3)** — API stub 缺口 + 非空断言 + any 残留。建议在 Phase 15B 或 Phase 16 随手修复

**建议**: R106 优先处理（IPC 通道冗余），其余 3 项 P3 可与 T1504 剩余 ~3.5h 一起在下次迭代修复。

46 main + 2 preload + 220 renderer 构建通过，27/27 测试 pass。

---

## Phase 15 Boss 验收 (2026-05-08)

### 结项确认

| # | 检查项 | 状态 | 依据 |
|---|--------|------|------|
| 1 | 全部任务 | ✅ | 6 项完成 + T1504 基础设施就位 (4.5h/8h) |
| 2 | redo.md 清零 | ✅ | R106-R109 已验证关闭，🔴0 🟡0 🟢0 |
| 3 | Auditor 审查 | ✅ | 9.2/10，六维度全部通过 |
| 4 | 全部裁决关闭 | ✅ | D18-D27 全部裁决并实施 |
| 5 | tsc zero errors | ✅ | `noUncheckedIndexedAccess` 永久启用 |
| 6 | 驳回记录完整 | ✅ | T1501 (i18n) / T1503 (FTS5) / D20=B / D21=B |
| 7 | 标记遗留 | ✅ | T1504b → Phase 16 首项，~3.5h |

### 遗留

| 项 | 内容 | 目标 |
|----|------|------|
| T1504b | Web Tiptap 编辑器 + 图片粘贴 + 验收边界 | Phase 16 首个任务 |
| FTS5 | Worker 倒排索引 (D19=B) | Phase 16 |
| 嵌套文件夹 | T1509 深化 | Phase 16 候选 |

### Phase 15 总结

**7 项提案 → 6 项完成 + 1 项基础设施就位。3.5h 延后不影响 Phase 15 核心命题。**

两项里程碑：
- `noUncheckedIndexedAccess` 启用 — 继 Phase 14 `as any` 清零后的第二个类型安全关口
- 组织系统差异化落地 — 标签/文件夹/系列各司其职，用户不再困惑

---

## T12S1-T12S3 便签模块验证 (2026-05-06 Auditor)

### 验证结果

| 子项 | 结果 | 证据 |
|------|------|------|
| notes DDL 三处同步 | ✅ | schema.ts:101-108, db-schema-mysql.ts:83, db/index.ts:101-112 (IF NOT EXISTS + catch 幂等) |
| NoteService CRUD | ✅ | list/create/delete/togglePin/cleanOldNotes — snake_case→camelCase 映射正确，`nowMySQL()` 统一时间戳 |
| IPC 5 通道 | ✅ | note:list\|create\|delete\|pin\|clipboard — ipc-channels.ts 定义 + ipc/note.ts 注册 + index.ts 汇聚 |
| note:refresh 事件 | ✅ | preload:117-123 `onNoteRefresh` 桥接 + NoteListPage:38-42 监听 + cleanup 返回 |
| showQuickNote 迁移 | ✅ | pet.ts:111-121: `NoteService.createNote(uid, text, 'quick')` + `note:refresh` 替代 `quickCreate` + `blog:refresh` |
| 清理定时器 | ⚠️ | 5min 定时器工作正常（main/index.ts:75-77），但 `will-quit` 未 `clearInterval` |
| NoteListPage | ⚠️ | createdAt 未用 `formatDate()` 格式化（line 164）；pinned 按钮 `color:'#fff'` 硬编码（line 175） |
| 侧栏/路由 | ✅ | MainLayout:11 `/notes` 📝, App.tsx:31/95 lazy+ErrorBoundary |

### 新发现

| # | 等级 | 问题 | 位置 |
|---|------|------|------|
| R95 | 🟡 | NoteListPage `createdAt` 未用 `formatDate()` 格式化 | `NoteListPage.tsx:164` | ✅ `formatDate(note.createdAt)` |
| R96 | 🟢 | `cleanOldNotes` 定时器未 `clearInterval` | `main/index.ts:75-77,111-113` | ✅ `const noteCleanTimer` + `clearInterval(noteCleanTimer)` |
| R97 | 🟢 | pinned 按钮 `color: '#fff'` 硬编码 | `NoteListPage.tsx:175` | ✅ `var(--text-on-accent)` |

### 总体评估

实现质量好。DDL 三处同步完整，NoteService 简洁，showQuickNote 迁移干净（`blog:refresh` 已替换为 `note:refresh`）。44 main + 2 preload + 216 renderer，tsc 0 errors。3 项小问题均不影响功能。便签独立模块从 pet/博客体系成功剥离。

---

## Phase 13 审计报告 (2026-05-07 Auditor)

> **审查范围**: Phase 13 全量变更 — 5 新增 + 15 修改文件，覆盖 main/preload/renderer/shared 四层
> **审查基准**: AGENTS.md 四层框架 + 6 大审查维度 (安全/数据/类型/冗余/可维护/健壮)

### 逐项验证

| 任务 | 结果 | 证据 |
|------|------|------|
| T1301 🔴 | ✅ | `mainWindow.on('hide/show')` — 暂停/恢复 `noteCleanTimer` + 发送 `app:visibility` 事件。`will-quit` 正确 `clearInterval` |
| T1302 🟡 | ✅ | `dragTimer = setTimeout(dragLoop, 16)` 递归模式 + CSS `transition: transform .08s linear`。无 `setInterval` 残留 |
| T1303 🟡 | ✅ | BlogEditorPage:171 `toast('已保存')` 先于 `await blogUpdate()` 返回。blog.service.ts:77-80 `writeFileSync(tmp) → renameSync` 原子写 |
| T1304 🟡 | ✅ | `useBlocker(isDirty)` + `beforeunload` 双保险。自动存草稿后 `blocker.proceed()`。`edge-breathe` CSS keyframes |
| T1305 🟡 | ✅ | 最小化 ZIP writer (STORE, 零依赖 CRC32)。`BackupSection` `📦 导出工作区 (.zip)` 按钮。Settings 和 Guide 显性「本地优先」声明 |
| T1306 🟢 | ✅ | `sidebarCollapsed` useState(localStorage init) + `onMouseEnter/Leave` hover 展开 + `transition: width 0.2s ease` |
| T1307 🟢 | ✅ | `/` 路由 → `ContinueWritingPage`，`/dashboard` 保留。三区视图: 最近草稿(3)/上次停留(1)/素材(5)。`api-client.ts` web stub 含明确降级提示 |

### 六维度统计

| 维度 | 检查项 | 通过 | 发现 |
|------|--------|------|------|
| 安全性 | XSS/CORS/CSRF/injection/Electron sandbox | 全部通过 | 0 |
| 数据完整性 | Schema/时间戳/方言/Cascade/user_id | 全部通过 | 0 |
| 类型安全 | WindowApi/Preload/api-client/as any/IPC 常量 | 13/14 | 1 (P3) |
| 冗余性 | Server-Main 双写/映射函数/重复校验/死代码 | 全部通过 | 0 |
| 可维护性 | 组件复杂度/状态管理/目录约束/错误处理 | 全部通过 | 0 |
| 健壮性 | ErrorBoundary/空状态/超时/竞态/内存泄漏 | 14/15 | 1 (P3) |

### 新发现

| # | 等级 | 问题 | 位置 |
|---|------|------|------|
| R98 | 🟢 | ContinueService 传输完整 `d.content` 全文，UI 仅用 `.substring(0,150)` — 与 T1307 spec 「不加载全文」意图偏差 | `continue.service.ts:6-11` |
| R99 | 🟢 | `app:visibility` 事件在 main/preload 共 4 处硬编码字符串，未使用 Phase 13 同期新增的 `IPC.APP_VISIBILITY` 常量 | `main/index.ts:55,63` + `preload/index.ts:105,106` |
| R100 | 🟢 | NOTE IPC 常量分散两处 (NOTE_LIST:118 → CONTINUE 块:120-123 → NOTE_CREATE...:124-127)，同一领域的常量应连续排列 | `ipc-channels.ts:118-127` |

### 架构趋势

| 指标 | Phase 12 基线 | Phase 13 | 变化 |
|------|---------------|----------|------|
| IPC 通道数 | 35 | 39 | +4 (APP_VISIBILITY + 3x CONTINUE) |
| WindowApi 方法数 | 57 | 61 | +4 |
| `as any` 密度 | ~40 处 | 无新增 | 0 |
| 新依赖 | 0 | 0 | ✅ |
| 违反目录约束 | 0 | 0 | ✅ |
| Schema 变更 | 0 | 0 | ✅ (T1105 冻结遵守) |

### 健康度评分

| 维度 | 评分 (1-10) | 说明 |
|------|-------------|------|
| 安全性 | 9 | 无新攻击面。ZIP writer 纯 Buffer 操作无注入风险。MVF 浮窗 sandbox:true |
| 数据完整性 | 10 | 零 Schema 变更。ContinueService 全参数化查询 + AS 别名映射 |
| 类型安全 | 8 | WindowApi/preload 双向闭合。3 处 P3 常量/聚合问题不影响类型安全 |
| 冗余性 | 10 | 零新重复。ContinueService 是独立新增领域 |
| 可维护性 | 9 | ContinueWritingPage 仅 3 useState 干净。BlogEditorPage T1304 改动最小化 |
| 健壮性 | 9 | T1304 双保险(useBlocker+beforeunload)。T1301 hide/show 正确清理/恢复定时器 |
| **综合** | **9.2** | 7 项任务全部合格，零 P0/P1/P2 发现，3 项 P3 可延后 |

### 总体评估

Phase 13 实现质量优秀。7 项任务规格执行准确：
- T1301 hide/show 节流逻辑干净，定时器生命周期管理正确
- T1302 递归 setTimeout + CSS transition 符合 spec 修订 (D10)
- T1303 乐观更新 + 原子写模式正确实现了"乐观 → 回滚"链路
- T1304 双保险方案覆盖了导航离开和窗口关闭两条路径
- T1305 零依赖 ZIP 实现亮眼：纯 Buffer CRC32 + STORE 模式
- T1306 侧栏折叠 hover 交互简洁，localStorage 持久化正确
- T1307 续写视图三区结构清晰，web stubs 有明确的降级提示

3 项 P3 均不影响功能，可在后续清理时一并处理。44 main + 2 preload + 217 renderer 构建通过，27/27 测试 pass。

---

## Auditor 输入格式

新增工单请严格按以下模板写入 `当前待修复` 对应优先级表格：

```
| **RXX** | **问题标题** — 问题描述 |
| **位置**: 文件路径:行号 |
| **后果**: 用户/开发者可见的影响 |
```

示例：

```
| **R95** | **Toast 组件硬编码 #fff** — `Toast.tsx:95` 使用 `color: '#fff'` 而非 CSS Token |
| **位置**: `src/renderer/components/common/Toast.tsx:95` |
| **后果**: 亮色主题下文字不可见 |
```

**规则**:
- 每个工单须有 R 编号（R87+），按时间递增
- 必须标注具体文件和行号
- 必须描述"对谁产生了什么影响"
- P0 必须标注"阻断什么"——不写"可能影响"，写"导致 XXX 不可用"

## Developer 修复后输出格式

```
**RXX** ✅ 已修复 — [修复方式，一句话]
**Auditor 验证**: (留空，由 Auditor 填写)
```

---

## Phase 14 实施审计 (2026-05-07 Auditor)

> **审查范围**: Phase 14 全部 11 项任务实施 — 9 新增 + 25+ 修改 + 36 文件
> **审查基准**: AGENTS.md 四层框架 + 6 大审查维度

### 逐项验证

| 任务 | 结果 | 证据 |
|------|------|------|
| T1402 🟡 | ✅ | 16 个 state 字段 → `useReducer(editorReducer, initialState)` + 18 action types。Reducer 独立导出可测试 |
| T1403 🟡 | ✅ | renderer `as any` 32→**0**，shared 0，preload 0。ContinueWritingPage 接口从 `Record<string,unknown>` → `DraftItem/LastBlog/RecentFile` 范型。WindowApi 新增显式类型导入 |
| T1411 🟢 | ✅ | achievements.ts: 14→6 枚（去掉 10-12 篇/连续30天/知识库系列等）。Heatmap 365 DOM→canvas `roundRect()` + `getComputedStyle`。`React.lazy(() => import('./Heatmap'))` |
| T1405 🟡 | ✅ | sidebar 四组: 写作/资料/洞察/系统。Dashboard 3 tab: 概览/热力图/成就 (URL searchParams)。Settings `ShortcutSettings` 分区 |
| T1406 🟢 | ✅ | pet.ts:117/345 `movable: true` + x/y 持久化。MVF 不受 D16 约束（保留 drag region） |
| T1408 🟢 | ✅ | pet.ts:520 `📋 剪贴板→便签` + tray.ts:60 同。`handleClipboardNote()`: clipboard.readText() → NoteService.createNote |
| T1409 🟢 | ✅ | TagManagePage debouncedFilter: `setTimeout(200ms)` + `toLowerCase().includes()` 前端过滤 |
| T1410 🟢 | ✅ | BlogPreviewPage: `localStorage blog-progress-{id}` 即时恢复 + unmount 时 `blogSaveProgress` IPC 持久化。ProgressService LRU 100 |
| T1404 🟡 | ✅ | `scripts/generate-ipc-doc.ts`: 正则解析 `ipcMain.handle(IPC.XXX, ...)` → markdown 表格。按文件分组 + 字母索引 |
| T1407 🟡 | ✅ | ShortcutService: `shortcuts.json` (userData) 存储覆盖。ShortcutSettings: 录制 UI + 冲突检测 + 5s 超时 + 重置。快捷键定义可编辑 |
| T1412 🟡 | ✅ | preview.service.ts: +`.md` markdown-it 渲染, +图片(bmp/gif/webp) `<img>`, +视频/音频 `<video>/<audio>`, PPT 外部打开引导。KnowledgeListPage `Promise.race([preview, timeout(10000)])` |

### 六维度统计

| 维度 | 检查项 | 通过 | 发现 |
|------|--------|------|------|
| 安全性 | XSS/injection/Electron sandbox | 全部通过 | 0 |
| 数据完整性 | Schema/时间戳/方言/Cascade | 全部通过 | 0 |
| 类型安全 | as any/WindowApi/Preload/跨进程 | 47/48 | 1 (P3, R104) |
| 冗余性 | 死代码/重复逻辑 | 11/12 | 1 (P2, R102) |
| 可维护性 | 组件复杂度/目录/错误处理 | 全部通过 | 0 |
| 健壮性 | ErrorBoundary/超时/竞态/清理 | 14/15 | 1 (P3, R103) |

### 新发现

| # | 等级 | 问题 | 位置 |
|---|------|------|------|
| R102 | 🟡 | **ProgressService 有写无读** — `blogSaveProgress` IPC 写入 `reading-progress.json`，但 BlogPreviewPage 挂载时从 `localStorage` 恢复进度，从未调用 `ProgressService.get()`。JSON 文件为死存储，IPC 通道实际无效 | `progress.service.ts` + `BlogPreviewPage.tsx:68` | ✅ 已修复 — 删除死链路，统一 localStorage |
| R103 | 🟢 | **ShortcutSettings handleRecord 生命周期** — 录制时 `addEventListener('keydown', handler, true)` 在 click handler 中以命令式调用，组件卸载时若正在录制则 listener 和 timeout 泄漏。实际触发概率低（5s 自动取消），但模式不正确 | `ShortcutSettings.tsx:28-67` | ✅ 已修复 — `recordCleanup` ref + unmount cleanup |
| R104 | 🟢 | **BlogEditorPage drafts 类型残留 `any[]`** — `EditorState.drafts`、`SET_DRAFTS` payload、以及 `.map((d: any, i: number)` 仍为 `any`。DraftRow 类型在 blog.service.ts 内部定义但未导出至 shared/types.ts | `BlogEditorPage.tsx:30,68,540` | ✅ 已修复 — DraftItem 范型 + as any 归零 |
| R105 | 🟢 | **热力图色彩硬编码不跟随主题** — `getColor()` 返回固定绿阶 hex (`#9be9a8`/`#40c463`/`#30a14e`/`#216e39`)，仅空单元格用 `var(--bg-tertiary)`。T1411 spec 要求"亮/暗色自适应"但亮色模式热力色不变 | `Heatmap.tsx:16-21` | ✅ 已修复 — `getColor()` → `var(--heatmap-N)` CSS 变量，`:root` 暗色 + `.light` 亮色双组覆盖 |

### 架构趋势

| 指标 | Phase 13 基线 | Phase 14 | 变化 |
|------|---------------|----------|------|
| IPC 通道数 | 39 | 46 | +7 (SHORTCUT×3 + BLOG_SAVE_PROGRESS + APP_ 补齐) |
| WindowApi 方法数 | 61 | 65 | +4 |
| `as any` (renderer) | ~32 | **0** | -32 ✅ |
| `as any` (shared+preload) | 0 | 0 | 0 |
| 新依赖 | 0 | 0 | ✅ |
| Schema 变更 | 0 | 0 | ✅ |
| 目录约束违规 | 0 | 0 | ✅ |
| BlogEditorPage useState | 30 | 1 (useReducer) | -29 ✅ |

### 健康度评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 安全性 | 9 | preview.service 路径穿越无风险（文件来自 DB，非用户输入）；markdown-it `html: false` 保持 |
| 数据完整性 | 10 | 零 Schema 变更。ShortcutService/ProgressService 用 userData JSON 文件，D15/D17 裁决正确执行 |
| 类型安全 | 9 | renderer `as any` 归零是重大里程碑。R104 drafts `any[]` 扣 1 分，但影响面限于单文件编辑器 |
| 冗余性 | 8 | R102 ProgressService 死存储扣 2 分——IPC 通道+Service+JSON 文件完整链路无读者 |
| 可维护性 | 9 | T1402 reducer 分离干净（导出可测试）。ShortcutSettings 独立组件。T1405 分组结构清晰 |
| 健壮性 | 9 | T1412 10s 超时 + 降级提示。T1407 冲突检测 + 5s 录制超时。R103 listener 泄漏扣 1 分 |
| **综合** | **9.0** | 11/11 任务完成。T1403 `as any` 归零是 Phase 14 最亮眼的成果 |

### 总体评估

Phase 14 是工程质量深化的标杆 Phase。三项关键成果：

1. **T1403 类型收敛** — renderer 32→0 `as any`，shared/preload 维持零。ContinueWritingPage 三个方法从 `Record<string, unknown>` 迁移到 `DraftItem/LastBlog/RecentFile` 范型。这是 13 个 Phase 中类型安全最大的单次跃升。

2. **T1402 状态机重构** — BlogEditorPage 从 30 useState 收敛到单一 `useReducer` + 18 actions + 导出可测试 reducer。T1304 useBlocker 在 data router 迁移后稳定运行。

3. **T1411 成就精简 + canvas 热力图** — 365 DOM → 单 canvas，DOM 节点大幅减少。成就 14→6 枚，保留核心里程碑。

其余 8 项任务均在 spec 范围内精准交付。4 项发现均为 P2/P3，不影响核心功能。

**建议**: R102 优先级最高——要么给 ProgressService 加读者（BlogPreviewPage 挂载时 `ProgressService.get()`），要么移除 service+IPC+JSON 文件链路，统一用 localStorage。其余 3 项可在后续顺手修复。

48 main + 2 preload + 218 renderer 构建通过，27/27 测试 pass。

---

> **审查范围**: Phase 14 全部 11 项任务 — todo.md §7
> **审查基准**: AGENTS.md 约束对照 (安全性/数据完整性/架构/工时)

### 逐项评估

| 任务 | 安全 | 数据 | 架构 | 工时 | 判定 |
|------|------|------|------|------|------|
| T1402 状态机重构 | ✅ | ✅ 零 Schema 变更 | ✅ 单文件重构 | ⚠️ 5h 偏紧 | 可行，见 D12 |
| T1403 类型收敛 | ✅ | ✅ | ✅ | ⚠️ 5h 偏紧 | 可行，见 D13 |
| T1404 IPC 文档 | ✅ | ✅ | ✅ 独立脚本 | ✅ 3h 合理 | 可行 |
| T1405 UI 重组 | ✅ | ✅ | ✅ | ✅ 4h 合理 | 可行，见 D14 |
| T1407 快捷键设置 | ✅ | ⚠️ 见 D15 | ⚠️ 见 D15 | ⚠️ 5h 偏紧 | 需澄清 D15 |
| T1408 剪贴板→便签 | ✅ | ✅ | ✅ 复用 NoteService | ✅ 2h 合理 | 可行 |
| T1406 迷你窗可拖拽 | ✅ | ✅ | ⚠️ 见 D16 | ✅ 2h 合理 | 可行，见 D16 |
| T1409 标签搜索过滤 | ✅ | ✅ | ✅ | ✅ 0.5h 合理 | 可行 |
| T1410 阅读进度 | ✅ | ⚠️ 见 D17 | ✅ | ✅ 2h 合理 | 需澄清 D17 |
| T1411 成就+热力图 | ✅ | ✅ | ✅ | ✅ 3.5h 合理 | 可行，见 D14 |
| T1412 文件预览增强 | ✅ | ✅ | ✅ Worker 独立 | ✅ 4h 合理 | 可行 |

### 裁决建议

| 编号 | 问题 | 选项 A | 选项 B | 建议 |
|------|------|--------|--------|------|
| D12 | T1402 5h 覆盖范围 — 30 useState→useReducer 但 BlogEditorPage 有大量副作用 (autoSave 定时器/tag 同步/beforeunload/useBlocker/blocker.proceed) 与状态交织。纯 reducer 迁移 3h 够，但副作用重构额外 3h+ | **A: 严格 reducer 迁移** — 仅将状态声明迁入 useReducer，副作用保持原样。5h 可行 | **B: 扩大为状态机** — 副作用建模为 action middleware（如 `SAVE_DRAFT`→`scheduleAutoSave`），8h+ | 建议 A。T1304 useBlocker 已稳定，副作用重构风险高 |
| D13 | T1403 "零 as any" 目标 vs 实际 65 处分布 — `src/server/routes/` 28 处是 MySQL `pool.execute()` 类型转换，非类型洞；`api-client.ts` 2 处是环境检测；`main/db/` 3 处是 SQLite 绑定。真正可消除的 ~30 处集中在 renderer features | **A: 全量清零** — 包括 server routes 的 `as any[]`。需为 pool.execute 写泛型包装，<br>~8h | **B: shared + preload + IPC handler 清零** — renderer features 的 API 响应 `as any` 改为 `ApiResponse<T>` 范型，server route MySQL cast 视为模式豁免（与 T1403 子任务表一致）。5h 可行 | 建议 B。T1403 子任务表已正确限定范围为 shared/preload/Service/IPC handler。server routes 的 `as any[]` 是 MySQL 驱动固有模式，不改不影响类型安全 |
| D14 | T1405 (仪表盘 tab 化) 与 T1411 (成就精简+热力图 canvas) 同时改动 DashboardPage。串行则 T1411→T1405 免冲突；并行则合并冲突概率高 | **A: 串行** — T1411 先完成（成就数据变更+热力图 canvas），T1405 再做 tab 化 UI 重组 | **B: 并行但分工** — T1405 仅做 sidebar+settings 分组，dash 部分留给 T1411。T1405 工时从 4h→3h，T1411 追加 0.5h 做 tab 集成 | 建议 A。dashboard 是同一文件的两个维度改动，串行安全 |
| D15 | T1407 "settings 表 JSON 存储" — "表"字暗示 DB table，违反 T1105 sql.js Schema 冻结（禁止新列/新表）。需明确存储机制 | **A: localStorage** — 复用现有 `lbkb_*` 前缀模式（如 T1306 侧栏折叠）。但同步 Electron `globalShortcut` 注册需主进程可读 | **B: userData JSON 文件** — `app.getPath('userData')/shortcuts.json`，主进程 fs 读写，渲染进程通过 IPC 读写。复用 `posFile()` 模式 | 建议 B。快捷键需要 main process 在启动时恢复注册，localStorage 仅 renderer 可访问 |
| D16 | T1406 `movable: true` 与现有 frameless 窗口自定义 drag region 冲突 — MVF 浮窗有 `-webkit-app-region: drag` 标题栏，`movable: true` 会同时生效导致拖拽行为不确定 | **A: 仅便签窗+抓取窗 movable** — 这两个无自定义 drag region，`movable:true` 直接生效。MVF 暂不改 | **B: MVF 移除标题栏 drag region → movable** — 去掉 `-webkit-app-region: drag`，改为 `movable: true` | 建议 A。MVF 标题栏拖拽已工作，改 movable 无用户可感知收益，还引入 frameless+movable 交互风险 |
| D17 | T1410 "settings JSON" 存储机制未指定。读取进度数据需跨进程（main process 无法读 localStorage） | **A: userData JSON** — `app.getPath('userData')/reading-progress.json`，通过新 IPC `settings:get/set` 读写。复用 posFile() 模式 | **B: localStorage** — 仅 renderer 可访问，功能退化（仅保存当前 session 内进度，重启丢失） | 建议 A。进度需持久化跨 session。但注意：新增 IPC 通道 `settings:get/set` 增加 2 个通道。或复用现有 workspace 类路径管理 |

### 依赖链评估

```
T1405 (UI重组) → T1407 (快捷键设置) → T1408 (剪贴板快捷键注册)
```

依赖链逻辑正确。但建议追加：
- **D14 裁决 → T1411 → T1405**（dashboard 改动先于 tab 重组）
- **T1402 无依赖，应最早启动**（状态机重构影响面大，先做完后续不用绕开）

### 工时评估

| 任务 | 估算 | 评估 | 风险缓冲 |
|------|------|------|----------|
| T1402 | 5h | 偏紧。30 个状态变量映射到 reducer 约 3h，但测试+调试 2h 底线 | +1h |
| T1403 | 5h | 合理。按 D13-B 范围 shared+preload+Service+IPC handler，~30 处 | — |
| T1404 | 3h | 合理。AST 解析 handler 签名 → markdown 表格 | — |
| T1405 | 4h | 合理。纯 CSS/JSX 重组，不碰数据 | — |
| T1407 | 5h | 偏紧。录制 UI + 冲突检测 + 动态注册 + 跨平台 4 项子功能 | +1h |
| T1408 | 2h | 宽松。单菜单项 + clipboard.readText() + NoteService.createNote | — |
| T1406 | 2h | 合理。movable:true + bounds check | — |
| T1409 | 0.5h | 合理。前端 filter + debounce | — |
| T1410 | 2h | 合理。LRU map + JSON 持久化 | — |
| T1411 | 3.5h | 偏紧。Canvas 热力图需处理暗/亮色自适应 | +0.5h |
| T1412 | 4h | 偏紧。Web Worker + skeleton + 超时降级 3 项 | +1h |
| **总计** | **36h** | 比标称 34h 多 ~2h | +3.5h |

### 总体评估

Phase 14 spec 经过 Boss 复议（T1411/T1412 方案补全）后质量良好。11 项任务中 8 项可直接实施，3 项需澄清（D12/D15/D17）。

**亮点**:
- 零新依赖、零 Schema 变更的约束在 spec 中明确体现
- T1411/T1412 复议流程产生可执行的方案级 spec
- 子任务拆解（T1403a-d）和验收标准具体

**待 Boss 裁决**: D12–D17 共 6 项，建议全部采纳选项 A。

---

## 当前待修复

### 🔴 P0 — 阻断用户操作

| # | 问题 | 位置 | 状态 |
|---|------|------|------|
| R101 | `useBlocker` 在 legacy `<HashRouter>` 下不可用，导致 BlogEditorPage 渲染崩溃 | `BlogEditorPage.tsx:59` + `App.tsx:75` | ✅ 已修复 — `<HashRouter>` → `createHashRouter` data router。**Auditor 验证**: ✅ 2026-05-07 |

### 🟡 P1 — 影响体验但不阻断

**全部清零** ✅

### 🟡 P2 — 可延后但不推荐

| # | 问题 | 位置 | 状态 |
|---|------|------|------|
| R102 | ProgressService 有写无读 — `blogSaveProgress` IPC 写 `reading-progress.json`，BlogPreviewPage 从 localStorage 恢复，JSON 文件为死存储 | `progress.service.ts` + `BlogPreviewPage.tsx:68` | ✅ 已修复 — 删除 `progress.service.ts` + `ipc/progress.ts` + `BLOG_SAVE_PROGRESS` IPC 通道 + 7 处引用，统一用 localStorage。**Auditor 验证**: ✅ 2026-05-07 |

### 🟢 P2/P3 — 可延后

| # | 问题 | 位置 | 状态 |
|---|------|------|------|
| R77 | Server knowledge import 缺文本提取 — mammoth/exceljs 未引入 server 端 | `server/routes/knowledge.ts:69-118` | ⏭ 后续安排 |
| R78 | BlogEditorPage 30 useState 持续膨胀 — 需状态机重构 | `BlogEditorPage.tsx:19-42` | ⏭ 后续安排 |
| R98 | ContinueService 传输完整 `d.content` 全文，UI 仅用 `.substring(0,150)` — 与 T1307 spec 「不加载全文」意图偏差 | `continue.service.ts:6-11` | ⏭ **Boss: 延后。3 行草稿全文传输开销可忽略。与 R78 状态机重构时一并优化** |
| R99 | `app:visibility` 事件在 main/preload 共 4 处硬编码字符串，未使用同期新增的 `IPC.APP_VISIBILITY` 常量 | `main/index.ts:55,63` + `preload/index.ts:105,106` | ✅ 已修复 — `main/index.ts` 新增 `import { IPC }`，4 处 `'app:visibility'` → `IPC.APP_VISIBILITY`。**Auditor 验证**: ✅ 2026-05-07 |
| R100 | NOTE IPC 常量分散两处，同一领域应连续排列 | `ipc-channels.ts:118-127` | ❌ **Boss: 关闭。排列顺序纯审美偏好，运行时零影响。不修** |
| R103 | ShortcutSettings handleRecord 生命周期 — 录制时 addEventListener 在 click handler 中命令式调用，组件卸载时若正在录制则 listener+timeout 泄漏 | `ShortcutSettings.tsx:28-67` | ✅ 已修复 — `recordCleanup` ref + unmount `useEffect` cleanup，keydown listener 和 timeout 均正确移除。**Auditor 验证**: ✅ 2026-05-07 |
| R104 | BlogEditorPage `drafts` 类型残留 `any[]` — `EditorState.drafts`、`SET_DRAFTS` payload 均为 `any[]`，DraftRow 类型未导出至 shared/types.ts | `BlogEditorPage.tsx:30,68,540` | ✅ 已修复 — `import type { DraftItem }` from shared/types, `drafts: DraftItem[]`, `SET_DRAFTS payload: DraftItem[]`, `.map((d, i)` 类型自动推断。BlogEditorPage `as any` 归零。**Auditor 验证**: ✅ 2026-05-07 |
| R105 | 热力图色彩硬编码不跟随主题 — `getColor()` 返回固定绿阶 hex，仅空单元格用 CSS Token。T1411 spec 要求"亮/暗色自适应"但亮色模式热力色不变 | `Heatmap.tsx:16-21` | ✅ 已修复 — `index.css` `.light` 节新增 `--heatmap-0~4` 亮色绿阶覆盖值（#9be9a8/#40c463/#30a14e/#216e39）。**Auditor 验证**: ✅ 2026-05-07 |

---

## R101 详细分析 (2026-05-07 Auditor)

**🔴 P0 — BlogEditorPage `useBlocker` 运行时崩溃**

**根因**: `useBlocker()` 是 React Router v6.4+ 的 data router API，必须运行在 `createHashRouter` 或 `createBrowserRouter` 创建的 router 上下文内。当前 `App.tsx:75` 使用 legacy `<HashRouter>` 组件，不提供 data router context，导致 `invariant()` 抛出错误。

**代码** (`BlogEditorPage.tsx:59`):
```ts
const blocker = useBlocker(isDirty);
```

**代码** (`App.tsx:75`):
```tsx
<HashRouter>  // ← legacy router, useBlocker won't work here
  <Routes>...</Routes>
</HashRouter>
```

**后果**: 进入 BlogEditorPage 时 `useBlocker` 抛出 `Error: useBlocker must be used within a data router`，ErrorBoundary 捕获后显示 fallback UI，编辑器完全不可用。此问题 T1304 引入，开发模式首次访问编辑器即触发。

**修复方案 A** (推荐, ~1.5h): 将 `<HashRouter>` 迁移为 `createHashRouter` data router。
```tsx
// App.tsx — 从 legacy component pattern 改为 data router pattern
import { createHashRouter, RouterProvider } from 'react-router-dom';

const router = createHashRouter([
  { element: <AuthLayout />, children: [
    { path: '/login', element: <LoginPage /> },
    { path: '/register', element: <RegisterPage /> },
  ]},
  { element: <ProtectedRoute><MainLayout /></ProtectedRoute>, children: [
    { path: '/', element: <ContinueWritingPage /> },
    { path: '/blog/:id/edit', element: <BlogEditorPage /> },
    // ... etc
  ]},
]);

export default function App() {
  return <RouterProvider router={router} />;
}
```
注意: data router 模式不支持 React.lazy + `element` prop 直接使用 lazy component。需用 `React.lazy` + `<Suspense>` wrapper 包裹每个 route 的 element，或保持当前的 lazyPage() wrapper 模式。路由定义需从 JSX `<Routes>` 改为 JS 对象数组。

**修复方案 B** (快速, ~0.5h): 移除 `useBlocker`，仅保留 `beforeunload` handler（已正常工作的窗口关闭保护）。代价是失去应用内导航的柔性关闭保护（用户切换侧栏页面时未保存内容直接丢失，不符合 T1304 spec）。

**裁决**: 建议方案 A。React Router v6 明确推荐 data router 为未来方向，迁移后也能为后续路由功能拓展铺路。方案 B 退化为 T1304 降级，应由 Boss 裁定。

---

---

## 历史修复摘要 (2026-04-30 ~ 05-06)

### Phase 9 (F01-F69)
安全: PBKDF2 密码哈希 / Session crypto.randomBytes / XSS markdown-it html:false (F71)
数据: schema 三处同步 (F36) / datetime→ISO 8601 (F61-F62) / permanentlyDeleteItem 磁盘清理 (F59) / Tiptap setContent 死循环 (F60)
架构: Server/Main 逻辑去重 DI 模式 (F78) / WindowApi 类型接口 (F79) / IPC 响应统一 (F34)
质量: catch{} 清零 (F69) / 硬编码 #fff→CSS token (F66) / sql.js debounce 500ms (F68)

### Phase 10 (R45-R59)
安全: Widget sandbox:true (R45) / 托盘 DOM 查询移除 (R46-R47)
修复: PDF 导出竞态 (R43/R49) / pdfjs-dist→webview (R44) / 宠物图标路径 (R50-R51) / launcher.bat ASAR 路径 (R58-R59)

### Phase 11 (R60-R69, T1101-T1107)
安全: DOMPurify XSS (T1101) / catch{} 全量修复 (T1102) / DB 参数 sanitizePagination (T1103) / workspace 方言隔离 (R60) / Server 时间戳 ISO (R61) / recycle 权限加固 (R62)
架构: DI knowledge-list (T1104) / sql.js Schema 冻结 (T1105) / WindowApi+preload 类型闭合 (T1106/R69) / blog-list.ts 类型净化 (R63) / Server 磁盘清理 (R65) / NOW()→ISO (R66) / deleteAccount keepFiles (R67)

### Phase 12 (R70-R94, T1204-T1209b)
修复: PDF 正文丢失 (T1204) / 代码块溢出 (T1205) / 便签双写幂等 (R94) / 独立编辑器路由死胡同 (R93) / 热力图 rejection (R87/R91)
新增: MD 快捷浮窗 MVF (T1207) / E2E 11 tests (T1108) / 图标品牌 (T1206) / 快捷键 Ctrl+Shift+N (T1209a/R84) / Toast 组件 (T1209b) / 使用指南 /guide (T1208) / 侧栏指南入口 (R90)
数据: blog:refresh 监听 (R83) / api-client 类型对齐 (R71) / Server tag/recycle 响应统一 (R72) / search 端点多套逻辑 (R73) / folder 路由 (R76) / preview 类型净化 (R79) / formatDate 守卫 (R81)
时间: toMySQLDateTime() 统一入口 (R85) / Vitest+Bome 隔离修复 (R86)

**累计**: 94 个修复工单 (F01-F85 → 已关), 86 个审计工单 (R01-R86 → 全部关闭), 2 个延后 (R77/R78)

---

---

## Phase 15 规格审查 (2026-05-08 Auditor)

> **审查类型**: 规格审查 (Shift-Left Audit) — 代码未写，Boss 立案后
> **审查范围**: todo.md §8 Phase 15 — 7 项任务
> **审查基准**: AGENTS.md 四层框架 + prompts/auditor.md §Phase 规格审查 Checklist

### 逐项评估

| 任务 | 安全性 | 数据完整性 | 架构影响 | Spec 质量 | 工时 | 判定 |
|------|--------|-----------|----------|-----------|------|------|
| T1506 视觉减重 | ✅ | ✅ | ✅ 纯 CSS | ⚠️ 模糊 → 已补 6 条验收标准 | ✅ 2h | 可行 |
| T1508 布局统一 | ✅ | ✅ | ✅ | ✅ 已补 7 页面清单 | ✅ 1.5h | 可行 |
| T1502 strict 收尾 | ✅ | ✅ | ✅ | ⚠️ 缺影响面 → 已加 dry-run 前置 | ⚠️ 2h (有条件) | 可行 |
| T1509 组织差异化 | ✅ | ⚠️ Schema (D22=A, D25=B) | ⚠️ 新路由 /series + 1 IPC | ✅ 子任务 a-d 清晰 | ✅ 5.5h | 可行 |
| T1504 Web 对等 | ⚠️ 缺存储方案 (D23) | ✅ | ⚠️ 新依赖 multer (D24) | ⚠️ 缺 4 项关键细节 → 已补全 | 6h→8h | 可行 |
| T1507 剪贴板键 | ✅ | ✅ | ✅ 复用 ShortcutService | ✅ | ✅ 2.5h | 可行 |
| T1505 界面去杂 | ✅ | ✅ | ✅ | ✅ | 1.5h→1h | 可行 |

### 裁决记录

| 编号 | 决策点 | 裁决 | 关键理由 |
|------|--------|------|----------|
| D18 | i18n 启动 | C — 不做 | 中文写作者工具，ROI 近零 |
| D19 | FTS5 方案 | B — Phase 16 Worker | 规避 node-gyp 风险 |
| D20 | Web 编辑器边界 | A — 基础编辑 | Web 是补充非替代 |
| D21 | Windows 标题栏 | A — 仅隐藏菜单栏 | autoHideMenuBar 零成本 |
| D22 | tags.description 列 | A — 允许破例 | 功能驱动的合理单列变更 |
| **D23** | Web 上传存储 | **A — 服务器磁盘** | Base64 膨胀 33%，`server/uploads/{userId}/` |
| **D24** | multer 引入 | **A — 引入** | Express 事实标准，Phase 15 允许经评估的依赖 |
| **D25** | Series IPC 设计 | **B — 复用 + 1 通道** | Series 非独立实体，`blog:getAllSeries` 够用 |
| D26 | strict 影响面 | dry-run 前置 | <20→2h, 20-50→4h, 50+→降级 suppressor |
| D27 | T1506 验收标准 | 补 6 条 | 全部含具体数值，写入 todo.md |

### 审查发现的 Spec 缺口（10 项，已全部补全）

| # | 缺口 | 补全方式 |
|---|------|----------|
| 1 | T1504 文件上传存储位置 | D23=A — `server/uploads/{userId}/` |
| 2 | T1504 是否引入新依赖 | D24=A — multer |
| 3 | T1504 功能裁剪声明方式 | `/guide` 页 + 登录页静态标注 |
| 4 | T1504 图片粘贴目标 | base64 inline，与桌面端一致 |
| 5 | T1509 series IPC 方案 | D25=B — `blog:getAllSeries` 1 通道 |
| 6 | T1502 noUncheckedIndexedAccess 影响面 | D26 — dry-run 前置评估 |
| 7 | T1506 具体验收标准 | D27 — 6 条含具体数值 |
| 8 | T1509a server route GET /list 需加 description | 已写入 T1509 子任务 |
| 9 | T1509a server route POST /:id/update 需加 description | 已写入 T1509 子任务 |
| 10 | T1508 页面清单 | 7 页面 + 7 已居中豁免，写入 todo.md |

### 依赖链

```
T1506 (视觉基线) → T1508 (布局统一) → T1502 (strict 收尾，串行末尾)
T1407 (ShortcutService, Phase 14 ✅) → T1507 (剪贴板快捷键)
其余任务无硬依赖，可独立推进
```

T1502 末尾串行的原因: `noUncheckedIndexedAccess` 影响面可能触碰 T1504/T1508/T1509 的同批文件，串行末尾执行避免合并冲突。

### 工时校准

| 任务 | 原估算 | 校准后 | 变动原因 |
|------|--------|--------|----------|
| T1506 | 2h | 2h | — |
| T1508 | 1.5h | 1.5h | — |
| T1502 | 2h | 2h (条件) | dry-run 后重新评估 |
| T1509 | 5h | 5.5h | D25 +0.5h (blog:getAllSeries IPC + server route) |
| T1504 | 6h | 8h | D23+D24+spec 补全 +2h (multer 集成 + 上传路由 + 子任务拆分) |
| T1507 | 2.5h | 2.5h | — |
| T1505 | 1.5h | 1h | 宽裕 — 仅 2 行 BrowserWindow 配置 |
| **总计** | **~20.5h** | **~22.5h** | |

### IPC 通道变更

| 通道 | 变更 | 说明 |
|------|------|------|
| `blog:getAllSeries` | +1 | `SELECT DISTINCT seriesId, seriesName, COUNT(*) FROM blogs GROUP BY seriesId` |
| **总计** | **91→92** | |

### Schema 变更

| 表 | 变更 | 说明 |
|----|------|------|
| `tags` | `ALTER TABLE ADD COLUMN description TEXT DEFAULT ''` | D22=A 批准。三处 DDL + migrateDatabase() |

### 新依赖

| 依赖 | 原因 | 大小 |
|------|------|------|
| `multer` + `@types/multer` | Express 文件上传中间件 | ~60KB |

### 总体评估

Phase 15 立案质量高于 Phase 14 初版。Boss 自行完成第一轮裁决（D18-D22），砍掉 i18n (8h) 和 FTS5 (10h)，主动缩容 T1502。Auditor 第二轮审查发现 10 个 spec 缺口，经 D23-D27 全部补全。

**亮点**:
- 7 项任务 spec 均已达到 Developer 可实施标准
- D18 i18n 否决正确——中文桌面工具的国际化是过度投资
- D22 Schema 破例有明确理由（功能驱动 + 迁移路径完整）
- T1502 dry-run 前置避免了盲目估算
- D25 Series IPC 设计避免了过度工程

**风险点**:
- T1504 是本 Phase 最大的单任务（8h，占 35%），multer 集成 + 文件上传是新增攻击面
- T1502 影响面未知，dry-run 结果可能改变 Phase 15A 的工时分配
- T1509a Schema 变更 + 三处 DDL 同步 + ALTER TABLE 迁移，这个链路历史上有多次遗漏 (R30/F36)

**建议**: Phase 15A 先跑 T1502 dry-run，确认 strict 影响面后再锁定剩余工时。T1504 Developer 实施前先读 T1504 子任务表（todo.md §T1504 实施细节）。

---

## 重构建议 (非紧急)

1. TypeScript strict 模式 — `noUncheckedIndexedAccess` 已在 Phase 15 T1502 中处理
2. BlogEditorPage 状态机重构 — 30 useState → useReducer (~4h, R78) — Phase 14 T1402 已完成
3. Server knowledge import 文本提取 — 引入 mammoth/exceljs (~2h, R77)
