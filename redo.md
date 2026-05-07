# redo.md — 技术债与修复跟踪

> **定位**: 已发现但未修复的问题。与 [todo.md](todo.md) 的区别: todo.md = 功能路线图, redo.md = 修复清单。
> **角色协作**: Auditor 写入审查发现 → Developer 修复并更新状态 → Auditor 验证 → Boss 裁决分歧。详见 [AGENTS.md](AGENTS.md#项目角色与协作机制)。
>
> 最后更新: 2026-05-07 (Phase 14 审计)

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

## 重构建议 (非紧急)

1. TypeScript strict 模式 — 消除残存 `any` (当前 ~40 处)
2. BlogEditorPage 状态机重构 — 30 useState → useReducer (~4h, R78)
3. Server knowledge import 文本提取 — 引入 mammoth/exceljs (~2h, R77)
