# redo.md — 技术债与修复跟踪

> 定位: 已发现但未修复的问题。历史审计档案见 docs/history-audit.md。
> 最后更新: 2026-05-21 | Boss 核查已修复项 + 当前开放: 🔴0 🟠1 🟡1 🟢(Phase23返工令)

---

## Phase 23 竞品分析总结

### 分析日期: 2026-05-20 | 三仓库源码完整阅读

| 竞品 | 仓库 | 核心技术 | Phase 23 映射 |
|------|------|---------|-------------|
| **memos** | github.com/usememos/memos | `MEMO_CARD_BASE_CLASSES` 常量、`react-markdown`+`Components` 映射、ResizeObserver 自适应、inline-editor 替换 | T2302 博客卡片化 |
| **花笺** | github.com/Achilng/floral-notepaper | `transparent:true` 透明窗口、`react-markdown`+自定义 `Components`、resize handles 四角、`saveState` 状态机 | T2303 原地编辑 + T2304 快捷便签 |
| **tiez** | github.com/jimuzhe/tiez-clipboard | SessionHistory(内存)+DbState(SQLite) 双存储、pin/加密双队列、`clipboard-changed` 事件驱动 | T2304 剪贴板监听 |

### 花笺的 "物理感" 设计语言（全 Phase 贯穿）

花笺不只是一个便签工具，它的设计语言回答了"精炼书房"的核心问题——**软件 UI 如何有物理质感**：

1. **透明窗口** (`transparent:true`, `backgroundColor:'#00000000'`) — 内容浮在桌面上，不是"一个应用窗口"
2. **四角 resize handles** — 像真的便签纸可以任意拉扯
3. **磁贴模式** — 便签可以"贴"在桌面任意位置，六种半透明色调
4. **无框编辑器** — border:none, bg:transparent, padding:0。文字开始接受输入，不是"打开了个编辑框"
5. **350ms 全局过渡** — 所有颜色变化有呼吸感，不生硬

---

## 逐项差异：Spec vs 竞品最佳实践 vs 现状

### T2301 — 五套国风主题 + 背景图

| Spec 要求 | 竞品参考 | 当前实现 | 差距 |
|----------|---------|---------|------|
| 5 套主题 [data-theme] | — | ✅ themes.css 完整 | — |
| 8 选项 (system+5国风+light+dark) | — | ✅ SettingsPage 8选项 | — |
| 350ms 全局过渡 | 花笺 CSS: `transition: color 0.35s ease, background-color 0.35s ease` | ✅ index.css L4-9 | — |
| 背景图系统 (::before + opacity) | — | ✅ BgImageSection + CSS | Electron file:// 路径被安全策略拦截，实际不生效 |
| 加载失败 toast 回退 | — | ✅ App.tsx 已移除有问题的 probe | 当前静默失败 |

### T2302 — 博客展示去硬核化

| Spec 要求 | 竞品参考 | 当前实现 | 差距 |
|----------|---------|---------|------|
| **BlogCard 组件** | memos: `MEMO_CARD_BASE_CLASSES` = `"relative group flex flex-col bg-card w-full px-4 py-3 mb-2 gap-2 rounded-lg border transition-colors"` | ✅ BlogCard.tsx + index.css `.card` | 接近，但我们的 card 无 `group` class，hover 操作需补 |
| **标题是绝对锚点** (text-lg font-semibold) | memos: 标题独立一行，大字号 | ✅ blog-card-title | — |
| **元信息退后** (text-xs muted) | memos: `relative-time` 组件 + 小字号 | ✅ blog-card-meta | — |
| **内容预览 2-3 行** | memos: `MemoContent` 组件渲染 markdown 摘要 | ✅ blog-card-excerpt (line-clamp-3) | — |
| **标签 + 引用数** | memos: `Tag` 组件带自定义 hex 颜色 | ⚠️ Tag 已有，引用数有但不总显示 | 引用数仅在 BlogListPage 批量 fetch 后有 |
| **操作按钮 hover 才出现** | memos: `group` + `opacity-0 group-hover:opacity-100` | ⚠️ 删除按钮已有，但使用 `group-hover` 模式不统一 | 文件夹移动 + 删除按钮在 BlogCard children 中 |
| **无限滚动** | memos: 无分页器，全量无限滚动 | ⚠️ 有 IntersectionObserver sentinel，但仍保留分页按钮 | 分页器未移除 |
| **代码块复制 + 语言标签** | 花笺: `CodeBlock` 组件 `opacity-0 group-hover:opacity-100` | ✅ BlogPreviewPage useEffect | — |
| **highlight.js** | 花笺: `react-markdown` 自定义 `Components`，memos: `highlight.js` + code copy | ✅ BlogPreviewPage | — |

### T2303 — 原地编辑 + 发布态预览

| Spec 要求 | 竞品参考 | 当前实现 | 差距 |
|----------|---------|---------|------|
| **无框编辑器** (border:none/bg:transparent/padding:0) | 花笺: 编辑器直接坐在窗口透明底上 | ✅ TiptapEditor variant="frameless" + `.frameless-editor` CSS | ProseMirror attributes 在 frameless 时已移除 min-h/padding |
| **300ms 原地变形** (无路由跳转) | — | ✅ BlogPreviewPage `isEditMode` + fadeIn 0.3s | — |
| **发布态预览 Tab** (markdown-it → wikilink → transclusion → callout → DOMPurify) | 花笺: `react-markdown` 自定义 `Components` 管线 | ✅ BlogEditorPage ContextPanel preview tab + 500ms debounce | 管道已含 renderWikilinks，未含 transclusion |
| **浮动 mini 工具栏 (BubbleMenu)** | 花笺: `toolbarButtons` 数组 + 内联按钮 | ❌ | @tiptap/extension-bubble-menu 导出 Extension 非 JSX 组件，当前 Tiptap 版本不支持 |
| **KB 编辑器复用** | — | ✅ KbContentEditor .md 用 Tiptap | — |
| **双入口 (inline/full)** | 花笺: `NotePad`(快捷) vs `Tile`(磁贴) 两种窗口 | ✅ variant='inline' 分支已实现 | inline 分支仅含工具栏无卡片包装 |

### T2304 — 便签改造

| Spec 要求 | 竞品参考 | 当前实现 | 差距 |
|----------|---------|---------|------|
| **Alt+Space 全局快捷** | 花笺: `Ctrl+Space` + `e.preventDefault()` 阻止系统菜单 | ✅ quick-note.ts Alt+Space | — |
| **透明窗口** (transparent:true) | 花笺: `transparent: true, backgroundColor: '#00000000'` | ❌ | 当前 `frame:false` 但无 `transparent:true`，背景是墨砚色块而非透明 |
| **四角 resize** | 花笺: `surfaceResizeHandles` 4 方向 | ❌ | 仅有 `resizable:true`，无可拖拽 resize handles |
| **Pin 按钮 → 磁贴** | 花笺: Pin → `openTileWindow` → 磁贴窗口 | ⚠️ Pin 保存为 pinned 便签但无磁贴窗口 | 磁贴系统延 Phase 24 |
| **剪贴板监听** | tiez: OS 原生事件(非轮询), text+HTML+image, Hash 去重, 双存储(内存+SQLite) | ⚠️ | 500ms 轮询 text only, settings 表 JSON 持久化 |
| **剪贴板历史 popover** | 花笺 spec: 底部"剪贴板历史"按钮 → popover 列表 | ❌ | 无可视化 popover |
| **隐私遮蔽** | tiez: 手机号/身份证/邮箱 正则打码 | ✅ clipboard.service.ts | — |
| **设置页开关** | tiez: 设置页控制启用/禁用 | ✅ SettingsPage ClipboardSection | 默认关闭 |
| **Draft 持久化** | 花笺: 有内容→自动保存草稿 | ✅ settings 表 `quick_note_draft` key | 跨重启恢复已实现 |

### T2305 — KB 重塑

| Spec 要求 | 竞品参考 | 当前实现 | 差距 |
|----------|---------|---------|------|
| **卡片画布** (非列表) | Pogget: "不搬运文件，直接呈现" — 文件即卡片 | ✅ 默认卡片视图 | — |
| **Lucide 文件类型图标** | — | ✅ TYPE_ICONS (FileCode/FileText/FileSpreadsheet/...) | — |
| **点击 → 中央栏打开** (不跳路由) | Pogget: "点击即用，不预览" — 点卡片直接打开，无中间预览页 | ❌ | 点击卡片 → 右侧 480px 预览面板 (非中央栏) |
| **`/knowledge?select=<id>`** | — | ✅ useSearchParams 读取 select | — |
| **拖入导入** | Pogget: 整个页面是 drop target | ✅ onDragOver/onDrop 已实现 | — |
| **冲突裁决** | — | ✅ prompt 三选 (替换/保留两者/跳过) | — |
| **>50MB toast** | — | ✅ 非阻塞 toast | — |
| **ContextPanel 元信息** | — | ✅ 信息/预览/引用/相似文件 Tab | — |
| **embedding 相似 KB** | — | ✅ SimilarKbTab 组件 | — |
| **弹入动画** | — | ✅ `.kb-pop-in` CSS animation | — |

### T2306 — 导航重塑

| Spec 要求 | 竞品参考 | 当前实现 | 差距 |
|----------|---------|---------|------|
| **三分区侧边栏** (写作/收纳/思考) | — | ✅ navGroups 三组 | — |
| **选中态 3px accent 竖条** | — | ✅ borderLeft: '3px solid var(--accent-blue)' | — |
| **数量 badge** | — | ✅ statsGet 计数 badge | — |
| **底栏固定** | — | ✅ footer 在 scrollable div 外 | — |
| **标签云离散字号** | — | ✅ 1-2→12px, 3-5→14px, 6-10→16px, 11+→18px | — |
| **标签页 BlogCard feed** | memos: Tag 点击 → 过滤 feed | ✅ TagResultsSection BlogCard + Tab | — |
| **系列卡片前4篇预览** | — | ✅ SeriesListPage 加载 previews | — |
| **系列详情 BlogCard ①②③** | — | ✅ SeriesDetailPage BlogCard + CIRCLE_NUMS | — |
| **系列页 ContextPanel 阅读进度** | — | ✅ localStorage 阅读进度 | — |

### T2307 — 白板

| Spec 要求 | 竞品参考 | 当前实现 | 差距 |
|----------|---------|---------|------|
| **React Flow 无限画布** | YouTrack: 自由放置卡片(d3-force 替代) | ✅ ReactFlow + Background + Controls + MiniMap | — |
| **6 种卡片类型** (idea/task/text + blog/kb/bookmark link) | YouTrack: 卡片与项目数据双向绑定 | ⚠️ 6 种类型已定义但 link node 创建缺 UI | prompt() 在 Electron 中被拦截 |
| **连线类型选择** (关联/依赖/引用) | — | ⚠️ 默认 'reference'，创建时可选 | prompt() 被拦截，当前无选择 UI |
| **拖入白板** | YouTrack: 从任何地方拖入 | ✅ KB 卡片 draggable + WhiteboardPage onDrop | — |
| **右键转化菜单** | — | ✅ ctxNode 右键菜单 | — |
| **任务状态循环** (todo→in_progress→done) | — | ✅ onNodeClick 三态循环 | — |
| **双向同步** | YouTrack: "卡片是活的，与项目数据双向绑定" | ⚠️ 源→白板 (EVT_REFRESH) 已通；白板→源 (blog link title 编辑) 部分通 | KB link 无写回 |
| **/graph→302→/whiteboards** | — | ✅ Navigate redirect | — |
| **Error 状态 + 重试** | — | ✅ error state + reload | — |
| **Edge 创建失败回退** | — | ✅ 乐观创建 + 失败移除 | — |

---

## 优先级差异汇总

### 🔴 P0 — 架构级差距

| # | 任务 | 问题 | 竞品参照 |
|---|------|------|---------|
| 1 | T2305 | 点击 KB 卡片 → 右侧 480px 预览面板，非中央栏 | Pogget: "点击即用，不预览" |
| 2 | T2304 | 快捷便签窗口无 `transparent:true` | 花笺: 透明窗口浮于桌面 |
| 3 | T2307 | 白板 link 节点创建依赖 prompt() 在 Electron 中不可用 | — |

### 🟠 P1 — 体验差距

| # | 任务 | 问题 | 竞品参照 |
|---|------|------|---------|
| 4 | T2302 | 博客列表分页器未移除 | memos: 纯无限滚动，无分页按钮 |
| 5 | T2303 | Transclusion 未接入预览管道 | 花笺: markdown 完整渲染管线 |
| 6 | T2304 | 剪贴板仅轮询文本，缺 HTML/图片 | tiez: text+HTML+image 全类型 |
| 7 | T2304 | 快捷便签无可拖拽 resize handles | 花笺: 四角 resize handles |

### 🟡 P2 — 细节偏差

| # | 任务 | 问题 | 竞品参照 |
|---|------|------|---------|
| 8 | T2302 | BlogCard 无 `group` class，hover 操作不统一 | memos: group hover 模式 |
| 9 | T2304 | 剪贴板历史无可视化 popover | 花笺 spec: 底部"剪贴板历史"按钮 |
| 10 | T2307 | 连线创建无类型选择 UI | — |

---

---

## 🔴 Boss 全应用 Bug 报告 (2026-05-21)

> 审计范围: 全部 8 个页面 + AI 对话。逐项代码追踪根因。

### 🔴 P0 — 功能完全不可用

#### R322 — BlogPreviewPage 编辑按钮无效果：`isEditMode` 死代码

| 项目 | 内容 |
|------|------|
| **位置** | `src/renderer/features/blog/BlogPreviewPage.tsx:30` + 全文 |
| **代码** | `const isEditMode = searchParams.get('mode') === 'edit';` — `isEditMode` 被读取但 **全文 0 处使用**。`BlogEditorPage` 在 L18 lazy import 了但 JSX 中从未引用。编辑按钮设 `setSearchParams({ mode: 'edit' })` 但 nothing switches rendering。 |
| **后果** | 用户点击"编辑"按钮 → URL 参数变为 `?mode=edit` → 组件 re-render → 仍是预览页。编辑功能 100% 不可用。 |
| **修复** | 在 JSX return 最外层加 `if (isEditMode) return <Suspense><BlogEditorPage /></Suspense>;`。或使用条件渲染 `{isEditMode ? <BlogEditorPage /> : <preview>}`。同时需保留滚动位置恢复逻辑。 |

#### R323 — KnowledgeListPage `viewMode` 未定义：列表/卡片视图双缺失

| 项目 | 内容 |
|------|------|
| **位置** | `src/renderer/features/knowledge/KnowledgeListPage.tsx:561` + `:780` |
| **代码** | JSX 中 `{viewMode === 'list' && ( ... )}` (L561) 和 `{viewMode === 'card' && ( ... )}` (L780)。但 `viewMode` **既不在 useReducer state 定义中，也不在 destructure L137 中，也不在任何 useState 中**。访问未定义变量导致 ReferenceError 或 undefined === 'xxx' 为 false，两个分支均不渲染。 |
| **后果** | 当 `files.length > 0` 时，既不渲染列表也不渲染卡片 — **知识库文件列表为空白**。reducer state 类型 `KnowledgeListState` 缺 `viewMode` 字段，也没有 viewMode toggle 按钮。 |
| **修复** | (1) 在 `KnowledgeListState` interface 加 `viewMode: 'card' | 'list'`。(2) 在 reducer 初始值加 `viewMode: 'card'`。(3) 在 destructure 加 `viewMode`。(4) 移除 list 视图或将 card 设为默认。Boss 要求"应该只保存卡片模式"。 |

#### R324 — KnowledgeListPage 卡片点击打开预览而非外部打开

| 项目 | 内容 |
|------|------|
| **位置** | `KnowledgeListPage.tsx:788-793` |
| **代码** | 卡片 `onClick` 调用 `dispatch(PREVIEW_START)` + `window.api.kbPreview(...)`，展示右侧 480px 预览面板。而列表视图的"打开"按钮 (L750) 调的是 `window.api.kbOpenExternal(...)`（用系统默认程序打开文件）。 |
| **后果** | Boss spec 要求"点击即用，不预览" (Pogget 模式)。当前卡片点击变成了预览面板，用户期望的"直接打开文件"行为仅在列表视图的"打开"按钮上存在。且 redo.md P0#1 早已标注此差异但未修复。 |
| **修复** | 卡片 `onClick` 改为调用 `window.api.kbOpenExternal({ fileId: f.id, userId: user.id })`。预览面板保留在 ContextPanel 即可。 |

#### R325 — FolderTree `prompt()` 在 Electron 中被拦截，无法重命名文件夹

| 项目 | 内容 |
|------|------|
| **位置** | `src/renderer/components/common/FolderTree.tsx:91` |
| **代码** | `const newName2 = prompt('重命名文件夹:', name);` — `prompt()` 在 Electron `contextIsolation: true` 渲染进程中会被静默拦截，返回 `null`。 |
| **后果** | 右键文件夹 → 重命名 → prompt 对话框不出现 → `newName2` 为 null → 函数直接 return。重命名永久不可用。 |
| **修复** | 替换为自定义 modal/quickInput 组件（参照 WhiteboardPage 已实现的 `quickInput` 模式）。不依赖原生 prompt()。 |

#### R326 — KnowledgeListPage 拖入文件冲突裁决用 `prompt()`，被 Electron 拦截

| 项目 | 内容 |
|------|------|
| **位置** | `KnowledgeListPage.tsx:301` |
| **代码** | `const choice = prompt('文件冲突: ...\n\n1 = 替换  2 = 保留两者  3 = 跳过', '2');` |
| **后果** | 拖入同名文件 → 冲突检测触发 → prompt 被拦截 → choice 为 null → 代码未进入任何分支 → 文件静默丢弃。拖入导入在冲突时 100% 失败。 |
| **修复** | 替换为 `conflictDialog` state 驱动的自定义 modal（页面已有 `conflictDialog` state 但未被使用于 prompt）。 |

### 🟠 P1 — 核心功能异常

#### R327 — HomePage 待办完成 → memoType 改为 'note' → 直接消失

| 项目 | 内容 |
|------|------|
| **位置** | `src/renderer/features/dashboard/HomePage.tsx:150-156` |
| **代码** | `await window.api.noteCreate({ userId: user.id, noteId: todo.id, content: todo.content, title: todo.title, memoType: 'note', dueDate: todo.dueDate });` — 将 `memoType` 从 `'todo'` 改为 `'note'`。`loadData()` 只加载 `noteList(user.id, 'todo')`，已完成的项不再返回。 |
| **后果** | 用户点击待办前的空心框 → 调用 handleCompleteTodo → todo 的 memo_type 被改为 'note' → reload 后该项从列表消失。用户以为数据丢失。实际上数据变成了普通便签，但无任何完成反馈、无可撤销、无"已完成"列表。 |
| **修复** | 二选一 (Boss裁决): **A)** 改用 `noteDelete` 直接删除（简单直接） **B)** 添加 `completed` 状态栏位并在 todo 列表中显示删除线。当前 UX 最差：项消失但数据仍在却不可见。 |

#### R328 — CalendarView 点击日期 → HomePage 不显示该日行程

| 项目 | 内容 |
|------|------|
| **位置** | `HomePage.tsx:164-176`  `handleCalendarDateSelect` |
| **代码** | `const r = await window.api.noteList(user.id, 'daily', dateStr, dateStr);` — 只加载 `memoType='daily'`，不加载 `'schedule'`。CalendarView 内部有 schedule 展示（L300-312），但 HomePage 的右侧面板只显示 daily notes。 |
| **后果** | 用户在日历中点击某天 → 下方显示当天的 daily note（今日便签）→ 但看不到该天添加的行程（schedule）。用户不知道行程去哪了。实际上行程数据在 CalendarView 自己的 tooltip 区域以绿色点+列表显示，但不够明显。 |
| **修复** | `handleCalendarDateSelect` 同时加载 schedules：`Promise.all([noteList('daily'), noteList('schedule')])`。在 HomePage 日历区域下方展示当日行程列表。 |

#### R329 — 设置页快捷键不全 + 大部分快捷键无实际效果

| 项目 | 内容 |
|------|------|
| **位置** | `src/shared/shortcuts.ts:9-22` + `src/main/services/shortcut.service.ts` |
| **代码** | SHORTCUTS 仅定义 12 个快捷键。其中仅 `new-blog(Ctrl+N)` 和 `md-float(Ctrl+Shift+N)` 和 `clipboard-note(Ctrl+Shift+V)` 有对应的 action handler（在 main/index.ts 注册）。其余如 `global-search/Ctrl+F`、`dashboard/Ctrl+H`、`save/Ctrl+S`、`help/?` 等均无对应 IPC handler 或 renderer 响应。 |
| **后果** | 用户在设置页看到快捷键列表，按了之后没有反应。快速便签 (Alt+Space) 是通过 `globalShortcut` 在 main process 单独注册的，不走 ShortcutService，因此不在设置页显示。 |
| **修复** | (1) 在设置页快捷键列表中加入 `quick-note: Alt+Space`。(2) 为每个已有快捷键添加实际的处理逻辑或从列表中移除无实现的项。(3) ShortcutService.reregisterAll() 需要 action handler 注入，确保所有 global 组快捷键在主进程有对应 action。 |

#### R330 — 背景图 `file://` 路径被 Electron CSP 拦截

| 项目 | 内容 |
|------|------|
| **位置** | `SettingsPage.tsx:73-81` `applyBg()` + `index.css` `#root::before` |
| **代码** | `document.documentElement.style.setProperty('--bg-image', 'url("${image.replace(/\\/g, '/')}")');` → CSS 中 `background-image: var(--bg-image)`。Electron 的 `file://` 协议下 CSP 默认阻止 `url("file:///C:/Users/...")` 引用。 |
| **后果** | redo.md T2301 第 39 行已记录此问题但未修复。用户选择背景图 → 路径存入 localStorage → CSS 变量设置成功 → 浏览器/Chromium 安全策略拒绝加载 → 背景静默空白。 |
| **修复** | 两种方案: **A)** 主进程通过 IPC 将图片文件转为 base64 data URL，传回 renderer 设入 CSS 变量。**B)** 在主进程用 `protocol.registerFileProtocol` 注册自定义协议（如 `lbkb://bg-image`），绕过 `file://` 限制。方案 A 更简单可靠。 |

#### R331 — AiChatPanel 搜索可能只搜KB不搜博客 (sql.js 模式)

| 项目 | 内容 |
|------|------|
| **位置** | `src/renderer/components/ai/AiChatPanel.tsx:60` `searchDirect()` |
| **代码** | `searchDirect` → `window.api.searchQuery` → sql.js 模式下 SearchService.searchAll 返回 `null` → `resp.data !== null` 为 false → 降级到 Worker。但 Worker 仅在 `useSearch` hook 挂载时才初始化 (`window.__searchWorker`)。若 AiChatPanel 打开时全局搜索从未被使用过，Worker 为 undefined → `searchDirect` 返回空数组 → RAG context 为空 → AI 没有上下文。 |
| **后果** | AI 在 sql.js 模式下可能完全搜不到任何内容（包括 KB 和博客）。在 MySQL 模式下，`searchAll` 同时搜索 blogs + knowledge 且结果合并，应该两者都能搜到。但 PDF 文件内容存储在 `content_text` 列，MySQL FULLTEXT 索引可能未包含此列，导致 PDF 内容搜不到。 |
| **修复** | (1) `searchDirect` 应首先尝试 `searchQuery` IPC，若返回 null 则直接调用 `getIndexableDocuments` + 本地过滤，不依赖 Worker 的初始化状态。(2) 验证 MySQL FULLTEXT 索引是否包含 `knowledge_files.content_text` 列。(3) 确保 Worker 索引同时覆盖 blogs 和 knowledge_files。 |

### 🟡 P2 — 体验/细节问题

#### R332 — 全局暗/亮切换不存在（`handleThemeChange` is not define）

| 项目 | 内容 |
|------|------|
| **位置** | `src/renderer/stores/theme-store.ts` |
| **代码** | Phase 23 将主题系统从 `.dark/.light` 改为 `[data-theme]`（5 套国风 + system）。旧的 `handleThemeChange('dark')` / `handleThemeChange('light')` 调用可能残留在某个组件中。BlogPreviewPage 的 `handleThemeChange` 只改阅读主题，不改全局主题。 |
| **后果** | 用户在某处点击暗/亮切换 → 报错 `handleThemeChange is not defined` → 主题无法切换。 |
| **修复** | 全局搜索 `handleThemeChange` 引用点，确认所有调用都已迁移到 `useThemeStore.setTheme()`。检查是否有组件仍使用旧 API。 |

#### R333 — KB 卡片模式无 tag 选择器和文件夹移动功能

| 项目 | 内容 |
|------|------|
| **位置** | `KnowledgeListPage.tsx:780-816` (card view) |
| **代码** | 卡片视图仅渲染图标+文件名+文件类型+大小+日期。列表视图有完整的标签编辑按钮 (L734-747)、文件夹移动下拉 (L700-733)、打开按钮 (L748-755)。卡片视图缺失所有这些操作。 |
| **后果** | Boss spec 要求"应该只保存卡片模式"，但卡片模式下用户无法: 选 tag、移动文件夹、直接打开文件。必须切回列表视图才能操作。 |
| **修复** | 在卡片按钮上添加 hover 出现的操作区（参照 BlogCard 的 group-hover 模式）：tag 选择器 + 文件夹移动 + 外部打开。 |

#### R334 — 白板页面 `window.prompt()` 编辑 link 节点标题被拦截

| 项目 | 内容 |
|------|------|
| **位置** | `src/renderer/features/whiteboard/WhiteboardPage.tsx:189` |
| **代码** | `const newTitle = window.prompt('编辑文件名 (同步更新 KB)', d.label);` — kbLink 节点双击编辑时调用。 |
| **后果** | 双击 KB link 节点 → prompt 被 Electron 拦截 → `newTitle` 为 null → 不执行后续逻辑 → 编辑静默失败。 |
| **修复** | 复用已有的 `quickInput` 组件（WhiteboardCanvas L387-405 已实现此模式）替代 `window.prompt()`。 |

#### R335 — 今日便签保存后日历蓝色标记不刷新

| 项目 | 内容 |
|------|------|
| **位置** | `HomePage.tsx:179-188` `handleSaveDaily` |
| **代码** | `handleSaveDaily` → `noteCreate` → IPC 返回 → `loadData()` → 只刷新 HomePage 的 todo/daily state。CalendarView 有自己独立的 `loadData` 和 `onNoteRefresh` 监听。但若 `broadcastRefresh()` 未正确触发或 renderer 未接收，日历上的蓝色标记不会更新。 |
| **后果** | 用户保存今日便签 → HomePage 面板显示已保存 → 但日历上当天没有出现蓝色圆点。需要手动切换月份才能触发 CalendarView 重新加载。 |
| **修复** | 确认 `IPC.EVT_NOTE_REFRESH` 事件链路完整：main process `broadcastRefresh()` → `mainWindow.webContents.send(EVT_NOTE_REFRESH)` → preload `onNoteRefresh` → CalendarView 的 useEffect 触发 `loadData()`。 |

#### R336 — 页面整体布局宽度过大，内容被截断

| 项目 | 内容 |
|------|------|
| **位置** | `MainLayout.tsx:347` `main` 区域 + 各页面 `maxWidth: 'var(--content-max)'` |
| **代码** | 侧边栏 220px + main 内容区 + ContextPanel 480px（按需）。`--content-max` 定为 720px。220+720+480=1420px > 典型笔记本 1366px。 |
| **后果** | 小屏笔记本上内容被截断，需横向滚动。ContextPanel 打开时内容区被挤压。 |
| **修复** | (1) `--content-max` 做响应式：侧边栏折叠时 780px，ContextPanel 打开时 640px。(2) 在 `MainLayout` 中根据 sidebar+ContextPanel 状态动态设置 CSS 变量。 |

---

---

## Auditor 验证报告 (R322-R336) — 2026-05-21

> 审查范围: 11 个修改文件，逐行审查代码逻辑 + IPC 链路 + 类型安全 + 路径穿越

### 验证概要

| 总工单 | ✅ 验证通过 | 🔄 需二次修复 | ⚠️ 引入新问题 |
|--------|------------|--------------|--------------|
| 15 | 13 | 0 | 2 |

### 逐项验证

| # | 原 P | 问题 | 验证 | 发现 |
|---|------|------|------|------|
| R322 | P0 | 编辑按钮死代码 | ✅ | `Suspense` 已加入 import (L1: `import { lazy, Suspense, ... }`)，L486-488 `<Suspense>` 正确渲染 |
| R323 | P0 | viewMode 未定义 | ✅ | 列表视图已移除，纯卡片模式。renderNode→div 改为非按钮 div + 操作按钮区 |
| R324 | P0 | 卡片点击逻辑错误 | ✅ | 卡片 `onClick` 已移除，"打开"按钮调 `kbOpenExternal` |
| R325 | P0 | FolderTree prompt() | ✅ | 替换为内联 input + renameId/renameName state。Enter/Escape/onBlur 完整 |
| R326 | P0 | KB 冲突 prompt() | ✅ | conflictDialog 三按钮模态框功能正确。细微差异见 R339 (P3 降级) |
| R327 | P1 | 待办完成消失 | ✅ | `completedTodoIds` Set + localStorage。绿色勾 + 删除线。可 toggle 取消完成 |
| R328 | P1 | 日历行程不可见 | ✅ | `handleCalendarDateSelect` 并行加载 daily+schedules。`dateSchedules` 渲染在日历下方 |
| R329 | P1 | 快捷键空壳 | ✅ | 列表 10 项均对应实际实现。quick-note(Alt+Space)、sidebar-toggle(Ctrl+B) 已加 |
| R330 | P1 | 背景图静默失败 | ⚠️ | IPC 链完整(bgImage:read → base64 data URL)，功能可用。**但 handler `app.ts:254` 无路径穿越防护**: `fs.readFileSync(filePath)` 可读任意系统文件。需加 `path.resolve` + workspace startsWith 检查或至少文件扩展名白名单 |
| R331 | P1 | AI 搜不到博客 | ✅ | 额外 `blogList(limit:5)` 拉取最近博客全文(300字)作为 context |
| R332 | P2 | handleThemeChange | ✅ | `handleThemeChange` 函数存在于 BlogPreviewPage:453，阅读主题切换正常 |
| R333 | P2 | KB 卡片缺操作 | ✅ | 卡片底部有 打开/标签/移至/删除 完整操作栏。tag 编辑内联展开 |
| R334 | P2 | 白板 prompt() | ✅ | kbLink 编辑改用 `setQuickInput`。已复用 WhiteboardCanvas 的 quickInput 组件 |
| R335 | P2 | 日历刷新链路 | ✅ | IPC.EVT_NOTE_REFRESH 全链验证通过: note.ts broadcastRefresh → preload onNoteRefresh → CalendarView useEffect loadData |
| R336 | P2 | 布局溢出 | ✅ | `--content-max` 动态计算(640-960px range)，响应 sidebar 折叠 + window resize |

### 新发现工单

#### R337 — 🟢 P3: BlogPreviewPage `React.Suspense` 已修复

| 项目 | 内容 |
|------|------|
| **位置** | `BlogPreviewPage.tsx:1` |
| **代码** | `import { lazy, Suspense, useCallback, ... } from 'react';` — `Suspense` 已正确导入。L486: `<Suspense fallback={...}>` 运行时无报错 |
| **状态** | ✅ 修复确认 — Boss 核查通过 |

#### R338 — 🟠 P1: bgImage:read IPC 无路径穿越防护 (仍开放)

| 项目 | 内容 |
|------|------|
| **位置** | `src/main/ipc/app.ts:254-264` |
| **代码** | `const buf = fs.readFileSync(filePath);` — renderer 传入的任意 `filePath` 直接传给 `fs.readFileSync`。无 `path.resolve` + `workspaceDir` startsWith 检查，无文件后缀名校验。 |
| **后果** | 恶意前端代码或 XSS 可调用 `window.api.bgImageRead('/etc/passwd')` 或 `C:/Windows/System32/...` 读取任意系统文件，base64 内容通过 IPC 回传 renderer |
| **修复** | 至少校验文件后缀名 (`['png','jpg','jpeg','webp'].includes(ext)`). 最佳: `const resolved = path.resolve(filePath); if (!resolved.startsWith(getWorkspacePath())) throw new Error('Path traversal denied')` |

#### R339 — 🟡 P2: KB 冲突对话框 "替换"和"保留两者"行为相同 (仍开放)

| 项目 | 内容 |
|------|------|
| **位置** | `KnowledgeListPage.tsx:675-686` |
| **代码** | "替换"和"保留两者"两个按钮的 onClick 完全相同: `await window.api.kbImport({ userId, filePaths: paths, copyToWorkspace: true })`。后端无 overwrite 参数 |
| **后果** | 用户选"替换"→文件被覆盖还是两版本保留取决于后端默认行为（当前可能报错）。选"保留两者"期望自动重命名但不发生。"跳过"功能正确（过滤掉冲突文件） |
| **修复** | 在 `window.api.kbImport` 参数中加 `onConflict: 'replace' | 'keep_both' | 'skip'`。后端 knowledge.service.ts 按参数分流处理 |

---

## 构建/测试基线

| 指标 | 结果 |
|------|------|
| build | ✅ 339ms + 17ms + 5.99s |
| test | ✅ 87/87 (12 files) |
| tsc --noEmit | ✅ 0 |

---

## 当前开放项 (2026-05-21 Boss 核查后)

| # | 严重性 | 问题 | 处置 |
|---|--------|------|------|
| R338 | 🟠 P1 | bgImage:read IPC 路径穿越 | 安全项，Phase 23 内修复 |
| R339 | 🟡 P2 | KB 冲突"替换"/"保留两者"行为相同 | 后端需加 onConflict 参数 |
| Phase 23 返工令 | 🟢 P3 | T2302-T2307 spec-implementation gap | 设计/交互项，延 Phase 24 |
