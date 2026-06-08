# redo.md — 技术债与修复跟踪

> 定位: 已发现但未修复的问题。历史审计档案见 docs/history-audit.md。
> 最后更新: 2026-06-08 | Rebuild 三轮验收通过 · 全仓库 prompt() 清零
> 当前开放: 🔴0 🟠0 🟡0 🟢0 | 全部清零 — 所有已知问题已修复

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

## Phase 24 "羽化" 规格审查 (Shift-Left Audit)

> 审查日期: 2026-05-21 | 代码未写，仅审查 todo.md 规格 + 对照当前代码状态
> 代码基线: build ✅ test ✅ 87/87 tsc ✅ 0

### 审查方法论

逐条对照 todo.md Phase 24 规格，grep 验证当前代码引用量，评估删除/修改的 blast radius，识别 spec 缺口和架构风险。

### 逐项风险矩阵

| 任务 | 影响文件 | Blast Radius | 主要风险 | 风险等级 |
|------|---------|-------------|---------|---------|
| T2401 | ~35 files | db/index.ts + mysql.ts(180L) + server/(19 files) + search.service.ts(200L+) + mcp-server + package.json | ① MySQL→sqlite 反向迁移无路径 ② 搜索降级完整性 ③ MCP HTTP 客户端断裂 | 🔴 高 |
| T2402 | ~8 files | GraphPage + MiniGraph + LocalGraph + preview.service + package.json | ① LocalGraph 漏列** (见 D120) ② 重型库懒加载破坏同步调用链 ③ 死代码 IPC 误删 | 🟠 中高 |
| T2403 | ~5 files | db/index.ts + schema.ts + worker + 87 tests | ① `@sqlite.org/sqlite-wasm` Node.js 兼容性待验证 (见 D121) ② FTS5 支持未知 ③ API 签名迁移量 | 🔴 高 |
| T2404 | ~5 files | quick-note.ts + orb.html + new IPC | ① Drop zone XSS/路径穿越 ② 与快捷便签窗口生命周期竞态 ③ SVG 动画 CPU 开销 | 🟡 中 |
| T2405 | ~15 files | 各处 | 低风险，修已知项 | 🟢 低 |

---

### D120 — 🔴 T2402 遗漏: `LocalGraph.tsx` 使用 d3-force 但未列入删除

| 项目 | 内容 |
|------|------|
| **现状** | `LocalGraph.tsx` 在 ContextPanel "图谱" Tab 中使用 `import('d3-force').then(...)` 动态导入 d3-force，做 1-hop 局部力导向图。当前被 `BlogPreviewPage.tsx:286` 和可能的 KB 页面引用。 |
| **Spec 描述** | "物理删除 D3 全部: GraphPage.tsx, MiniGraph.tsx, d3/d3-force 依赖" — **仅列出 2 个文件，未列 LocalGraph.tsx** |
| **冲突** | 若按 spec 删除 d3-force 依赖 → `import('d3-force')` 失败 → LocalGraph 崩溃 → ContextPanel "图谱" Tab 白屏。若保留 d3-force 依赖 → 不算"全量删除" |
| **选项 A** | 连 LocalGraph.tsx 一起删。ContextPanel "图谱" Tab 移除。后果：博客/KB 的局部图谱功能消失 |
| **选项 B** | 保留 d3-force, LocalGraph, 和白板都是力导向图的一种实现。从 `d3-force` 已动态 import（非全量 d3），体积影响 ~30KB gzipped |
| **建议** | **选项 B**。`d3-force` 是 tree-shaken import（不是全量 d3），体积很小。LocalGraph 已做动态导入。GraphPage + MiniGraph 删除即可达成 90% 的 D3 清理目标。或者如果 Boss 坚持全删，用 React Flow 的 `useReactFlow().fitView()` 替代力导向布局 |

### D121 — 🔴 T2403 `@sqlite.org/sqlite-wasm` 在 Electron 主进程可行性未验证

| 项目 | 内容 |
|------|------|
| **现状** | `sql.js` 在 Node.js 主进程中加载 WASM 文件 → `initSqlJs()` → `new SQL.Database()` → `db.run()`/`db.exec()`。文件持久化用 `db.export()` → `fs.writeFileSync()` |
| **问题** | `@sqlite.org/sqlite-wasm` 的官方设计目标是**浏览器环境**。它依赖 OPFS (Origin Private File System) 做持久化——这是浏览器 API，在 Node.js 中不存在。虽然它可能有 Node.js 适配层，但: (a) 文件持久化 API 完全不同 (b) 当前代码里 `saveToDisk()` 调用 `db.export()` 写入文件，新引擎没有这个 API (c) 87 个单元测试可能全部需要重写 |
| **建议** | **在 T2403 实施前，先用一个独立脚本验证** `@sqlite.org/sqlite-wasm` 在 Electron 41 主进程 (Node.js 22) 中的行为：能否创建文件数据库？能否执行 SELECT/INSERT？能否支持 FTS5 CREATE VIRTUAL TABLE？如果不行，有两个替代方案: |

| 替代 | 库 | 优点 | 缺点 |
|------|-----|------|------|
| B1 | 保持 `sql.js` | 已验证 23 个 Phase，零风险 | 包体积较大(~3MB WASM)，但已在用 |
| B2 | `better-sqlite3` | 原生性能，Node 原生支持 | 原生编译风险(D117 已否决) |
| B3 | `wa-sqlite` | 更小的 WASM，Node 友好 | 需要自建 API wrapper |

### D122 — 🔴 T2401 缺少 MySQL→sqlite 反向迁移路径

| 项目 | 内容 |
|------|------|
| **现状** | `db/index.ts:344-500` 有一个 `migrateSqlJsToMySQL()` 函数，在首次 MySQL 连接时自动迁移 sql.js 数据→MySQL。如果用户在使用 MySQL 模式，数据全在 MySQL 里。移除 MySQL 后，需要反向迁移 MySQL→sqlite。 |
| **问题** | T2401 spec 只说了"物理删除"，没提迁移。如果用户数据在 MySQL 中，删掉 MySQL 客户端后数据无法读取 |
| **选项 A** | 提供一次性 `npm run migrate:mysql-to-sqlite` 脚本，导出 MySQL 数据 → 写入 sqlite 文件。需在 T2401 删除代码前先跑 |
| **选项 B** | 假设 MySQL 用户极少 (debug 配置)，不做迁移。风险：遇到 MySQL 用户的愤怒 issue |

### D123 — 🟠 T2401 删除 Express Server 影响 MCP HTTP 客户端

| 项目 | 内容 |
|------|------|
| **现状** | `src/server/routes/mcp.ts` 提供 `POST /api/mcp/message` HTTP 端点。SettingsPage 中有文档说明 HTTP 模式 (line 406-408): `POST http://localhost:3456/api/mcp/message — 远程 AI 接入 (JWT 认证)` |
| **Spec 描述** | "MCP Server 仅保留 stdio 模式, 移除 HTTP 传输层" |
| **冲突** | 设置页文档和路由都需同步清理。需确认没有外部工具依赖 HTTP MCP 端点 |
| **建议** | SettingsPage "AI 接入" 部分移除以 HTTP 模式文档。保留 stdio 部分文案。可选 D89 的 MCP 配置保留 |

### D124 — 🟠 T2402 重型库懒加载破坏 preview.service 同步调用链

| 项目 | 内容 |
|------|------|
| **现状** | `preview.service.ts:4-5`: `import ExcelJS from 'exceljs'` 和 `import mammoth from 'mammoth'` 是顶层同步导入。`pdfjs-dist` (L297) 已改为 `await import()` 动态导入。 |
| **问题** | 把 `mammoth`/`exceljs` 改为动态 `import()` 后，使用它们的函数变为 async。当前 `preview.service.ts` 中 `getPreview()` 方法混合同步和异步调用——部分分支同步 return，部分 async。TypeScript + Electron 主进程中 commonjs→ESM 的动态 import 可能有路径解析问题 |
| **建议** | `pdfjs-dist` 已成功做到动态导入，`mammoth` 和 `exceljs` 按相同模式改即可。风险低但需逐分支测试 DOCX/XLSX 预览 |

### D125 — 🟡 T2404 The Orb 全局 Drop Zone 安全性

| 项目 | 内容 |
|------|------|
| **Spec** | "全局 Drop Zone: 接收文件/文本/URL, IPC 自动分类入库 (文本→便签/URL→剪藏/文件→KB)" |
| **风险** | ① 接受任意 URL → IPC `scrapeWebpage` 可能被用来 SSRF 内网 ② 接受任意文件路径 → 文件导入可能写入恶意文件 ③ 接受任意文本 → 便签创建可能包含恶意内容 |
| **建议** | URL 需验证协议 (仅 http/https)。文件需限制扩展名白名单。文本需长度限制 (≤10KB)。均在主进程 handler 中校验 |

### D126 — 🟡 T2405 `as any` / `: any` 清零范围界定

| 项目 | 内容 |
|------|------|
| **现状** | renderer 中 ~40 处 `as any`/`: any`。分布: D3 相关 (LocalGraph/MiniGraph/GraphPage) ~10 处、Worker 相关 ~5 处、WhiteboardPage ~8 处、其他 ~17 处 |
| **问题** | T2402 删除 D3 后 ~10 处自动消失。WhiteboardPage 的 `as any` 来自 ReactFlow 的 `Node.data` 类型 (泛型默认为 any)，可通过定义具体 data 类型消除。Workers 的 `(window as any).__searchWorker` 是架构级的持久化 hack，消除需要 Worker 管理器模块 |
| **建议** | Phase 24 目标: 0 处（D3 删除后自动消除部分，WhiteboardPage 定义具体 data 接口，Worker 封装 getter/setter）。保底目标: ≤5 处（仅 Worker 豁免） |

---

### Phase 24 隐含交叉依赖

```
T2401 (删 MySQL) ──→ search.service.ts 移除 MySQL 分支 ──→ 搜索必走 Worker ──→ 依赖 T2403 sqlite-wasm 的 FTS5 ✅
T2401 (删 Server) ──→ MCP HTTP 移除 ──→ 设置页 UI 更新 ──→ 依赖 T2405
T2402 (删 D3)    ──→ LocalGraph.tsx 处理 ──→ 依赖 D120 裁决
T2402 (删 D3)    ──→ MiniGraph → 依赖 HomePage 更新 ──→ 依赖 T2405
T2404 (Orb)      ──→ 共用快捷便签窗口 ──→ 依赖 quick-note.ts 的 BrowserWindow 管理
```

### 建议调整的实施顺序

```
Phase 24A: T2403 (sqlite-wasm 先验证可行性) → 若失败, 切换方案 B1/B3
Phase 24B: T2401 (基于 T2403 成功后删 MySQL) + T2402 (D3/懒加载)
Phase 24C: T2404 (Orb) → T2405 (收尾清零)
```

原 spec 顺序是 T2401→T2402→T2403。但 T2403 应先验证——如果 `@sqlite.org/sqlite-wasm` 不能用，T2401 删 MySQL 后没有回退数据库。

---

## Boss 裁决 — Phase 24 D120-D126 (2026-05-21)

### D120 — 🔴 LocalGraph.tsx 去留

| 选项 | 内容 |
|------|------|
| A | 连 LocalGraph.tsx 一起删，ContextPanel "图谱" Tab 移除 |
| B | 保留 d3-force + LocalGraph（~30KB gzipped, 已是动态 import） |

**裁决: A** — 删。

理由：D119 已裁决"全量删除 D3"。留一个例外会让"全量"变成"几乎全量"。ContextPanel 图谱 Tab 可替换为 React Flow 迷你视图（Phase 25+），或直接用已有的反向链接 Tab 覆盖此场景。30KB 虽小，但"全删"的纪律性比 30KB 更重要。

### D121 — 🔴 sqlite-wasm Node.js 可行性

**裁决: T2403 实施前先写独立验证脚本。**

脚本内容：
1. `npm install @sqlite.org/sqlite-wasm`
2. 独立 Node.js 脚本（不依赖 Electron/React）
3. 验证：创建文件数据库 → CREATE TABLE → INSERT → SELECT → FTS5 CREATE VIRTUAL TABLE → 文件持久化后重启读取
4. 若全部通过 → T2403 正式迁移
5. 若 OPFS 不可用 → **回退方案 B1（保持 sql.js）**，T2403 取消，工时释放给 T2404

这是 Phase 24 的第一件事。验证脚本跑通之前，T2401 不动。

### D122 — 🔴 MySQL 反向迁移

| 选项 | 内容 |
|------|------|
| A | 提供 `npm run migrate:mysql-to-sqlite` 一次性脚本 |
| B | 不提供迁移，假设 MySQL 用户极少 |

**裁决: A** — 提供迁移脚本。

纳入 T2401 范围（+2h 工时）。脚本逻辑：连接 MySQL → `SELECT * FROM` 全部 12 表 → 写入 sqlite 文件 → 覆盖 `lbkb.db`。T2401 删除 MySQL 客户端前必须先执行此脚本（或检测无 MySQL 配置则跳过）。T2401 估算从 12h → 14h。

### D123 — 🟠 MCP HTTP 文档清理

**裁决: 纳入 T2401 范围。** SettingsPage 移除 HTTP MCP 模式文档，仅保留 stdio 说明。同步检查 README.md 和 AGENTS.md 中是否有 HTTP MCP 引用。

### D124 — 🟠 mammoth/exceljs 动态导入

**裁决: 纳入 T2402 范围。** 按 pdfjs-dist 已有模式改造。`preview.service.ts` 中对应函数改为 async。逐分支测试 DOCX/XLSX 预览。

### D125 — 🟡 Orb Drop Zone 安全边界

**裁决: 纳入 T2404 范围。** 主进程 handler 中强制校验：
- URL: 仅 `http://` / `https://` 协议，拒绝 `file://` / `javascript:` / 内网 IP
- 文件: 扩展名白名单（与 KB 导入相同），MIME type 检测
- 文本: ≤10KB 截断

### D126 — 🟡 as any 清零范围

**裁决: 采纳建议。**
- Phase 24 目标: 0 处
- D3 删除 → ~10 处自动消失
- WhiteboardPage ReactFlow Node.data → 定义具体 data 接口
- Worker `__searchWorker` hack → 封装 getter/setter 模块
- 保底: ≤5 处（仅 Worker 豁免，且需注释说明原因）

---

## 实施顺序 — Boss 最终裁定

```
Phase 24A — 验证 + 破旧 (~24h):
  Step 0: T2403 验证脚本（先跑 sqlite-wasm 可行性, 1-2h）
     ↓ 若通过 ↓                    ↓ 若失败 ↓
  T2403 完整迁移 (10h)          回退 B1 (保持 sql.js)
     ↓                             ↓
  T2401 废弃 MySQL/Web (14h, 含 D122 迁移脚本)
  T2402 清除 D3 + 懒加载 (8h)

Phase 24B — 立新 (~12h):
  T2404 The Orb 桌宠 (12h, 含 D125 安全校验)

Phase 24C — 收尾 (~8h):
  T2405 遗留修复 (8h, 含 D126 as any 清零)
     ↓
  P0+P1+P2+P3 全零 🎉
```

**关键变更 vs 原 spec:**
- T2403 移到最前面（先验证后迁移）
- T2401 +2h（D122 迁移脚本）
- T2404 含 D125 安全校验
- 总工时 ~52h（原 50h + D122 迁移 2h）

---

## Auditor 验证报告 — Phase 24 "羽化" 实施审查

> 审查日期: 2026-05-21 | 方法: pre-audit.sh + grep sweep + 关键文件全读 + 构建

### 总体评价

Phase 24 是 23 个 Phase 以来**变更量最大但引入问题最少的 Phase**。核心目标全部达成：MySQL/Express/D3 物理删除、sqlite-wasm 引擎升级、Orb 桌宠重写、as any 收敛。零 P0，零 P1。4 个新发现均为 P2/P3（命名残留 + 注释残留 + 类型优化）。

### 逐项验证

| 步骤 | 项目 | 状态 | 证据 |
|------|------|------|------|
| Step 0 | sqlite-wasm 验证脚本 | ✅ | 16/16 通过 (Developer 报告) |
| Step 1A | db/index.ts 重写 | ✅ | `sqlite3InitModule` + `sqlite3.oo1.DB`, `dbGet`/`dbAll`/`dbRun` 签名不变, WAL 模式, 事务支持, FTS5 |
| Step 2 | MySQL 删除 | ⚠️ | 物理删除完成 (`mysql.ts`/`mysql2`/server/19 files gone). 3 处命名残留见 R340-R342 |
| Step 2 | Express Server 删除 | ✅ | `src/server/` 目录不存在, `npm run server` 已移除, `express`/`cors`/`cookie-parser`/`multer`/`jsonwebtoken` 从 package.json 清除 |
| Step 3 | D3 删除 | ✅ | `GraphPage.tsx`/`MiniGraph.tsx`/`LocalGraph.tsx` 物理删除, `d3`/`d3-force` 从 package.json 清除. HomePage 关系图谱区域已移除, ContextPanel 图谱 Tab 已移除 |
| Step 3 | 重型库懒加载 | ✅ | `mammoth`/`exceljs`/`pdfjs-dist` 全部改为 `await import()` 动态导入. `preview.service.ts` + `knowledge.service.ts` 均已转换 |
| Step 4 | The Orb | ✅ | SVG 流体光球替换 PNG. BrowserWindow: `transparent:true` `alwaysOnTop:true` `sandbox:true` `contextIsolation:true` `nodeIntegration:false`. Drop Zone D125 合规: 文件扩展名白名单 + 文本 ≤10KB + URL http/https only + 内网/本地 IP 拒绝 |
| Step 5 | R338 修复 | ✅ | `app.ts:258-266`: `path.resolve` + `..` 遍历检查 + 扩展名白名单 |
| Step 5 | R339 修复 | ✅ | `KnowledgeListPage.tsx:675-695`: "替换"先删后导 / "保留两者"直接导入 / "跳过"过滤冲突 |
| Step 5 | as any 收敛 | ✅ | renderer: 37→25 (WhiteboardPage: 8→6, D3 删除自动消除 ~10) |

### 新发现 (4 项, 全 P2/P3)

| # | 级别 | 问题 | 位置 |
|---|------|------|------|
| R340 | 🟡 P2 | `isUsingMySQL()` 死函数 — MySQL 已删除但函数仍存在, 永远 return false | `db/index.ts:189-191` |
| R341 | 🟡 P2 | `toMySQLDateTime` 仍以 MySQL 命名 — MySQL 已删除, 函数名和导入应改为 `toDateTime` 或直接内联 | `shared/datetime.ts:5-7` + `auth.service.ts:2,58,86` |
| R342 | 🟢 P3 | MySQL 遗留注释 — 4 处注释提到 MySQL | `search.ts:33`, `folder.service.ts:28`, `recycle.service.ts:56`, `stats.service.ts:17` |
| R343 | 🟢 P3 | WhiteboardPage 遗留 6 处 `_event: any` — ReactFlow 事件 handler 参数, 可定义具体类型消除 | `WhiteboardPage.tsx:188,227,234,239,322,353` |

### pre-audit.sh 扫描结果 (Phase 24 专项)

| Flag | 真问题 | 假阳性 | 说明 |
|------|--------|--------|------|
| BrowserWindow 安全 | 0 | 1 | blog.ts 假阳性 (非 BrowserWindow 文件) |
| prompt() 残留 | 2 | 2 | SlashCommand + api-client 预存, 非 Phase 24 引入 |
| XSS 无 DOMPurify | 2 | 0 | CodePreview + GuidePage 预存, 非 Phase 24 引入 |
| SQLite 语法 | 2 | 20+ | clipboard + quick-note 预存, schema DDL 预期 |
| IPC 裸字符串 | 5 | 0 | quick-note 模块预存, 非 Phase 24 引入 |
| 模块级 let | 2 | 0 | Toast + tab-context 预存 |

**Phase 24 零新增 P0/P1 问题。** pre-audit.sh 所有 flag 均为预存项，非本次引入。

---

## 构建/测试基线

| 指标 | 结果 |
|------|------|
| build | ✅ 55+2+2206 (Phase 24: sqlite-wasm + MySQL/Express/D3 全删) |
| test | ✅ 87/87 (12 files) |
| tsc --noEmit | ✅ 0 |
| as any (renderer) | 25 (↓ from 37: D3 删除 -10, WhiteboardPage 8→6) |
| : any (renderer) | ~15 (预存: Worker/event handler/ContextPanel, 非本次引入) |

---

## 当前开放项 (2026-05-25 — T2406 Stage A Collapse Validation Audit)

| # | 严重性 | 问题 | 处置 |
|---|--------|------|------|
| R340 | 🟡 P2 | `isUsingMySQL()` 死函数 | T2405 残留清理 |
| R341 | 🟡 P2 | `toMySQLDateTime` MySQL 命名残留 | T2405 残留清理 |
| R342 | 🟢 P3 | MySQL 遗留注释 ×4 | 可顺手修 |
| R343 | 🟢 P3 | WhiteboardPage `_event: any` ×6 | 可顺手修 |
| R344 | 🟠 P1 | TabBar/tab-context store 存活——"browser tabs"状态机仍在 SplitPane 中运行 | ✅ R344 修复: localStorage 读写移除 + TabProvider 零挂载。R346 (物理删除) Stage B |
| R345 | 🟠 P1 | SplitPane 保留 ContextPanel 所有权机制 (activePaneId/focusPane) | ✅ R345 修复: activePaneId/focusPane 移除。SplitPane 纯左右分屏 |
| R346 | 🟡 P2 | ContextPanel.tsx 217行完整保留——一行 import 可复活 | T2406 Stage B 物理删除 |
| R347 | 🟡 P2 | TableOfContents.tsx 新建浮动 panel 组件(105行)但未接入——ghost component | **Boss 裁决: 立刻标记 DEPRECATED + Stage B 删除** — permanent panel 复活预制件 |
| R348 | 🟡 P2 | BlogPreviewPage 内 144行死函数 (ContextLinksTab/OutlineTab/RecommendTab) | T2406 Stage B |
| R349 | 🟢 P3 | BlogPreviewPage.tsx.bak 备份文件残留 | T2406 Stage B |
| R350 | 🟢 P3 | FloatingBlogTabs.tsx + floating-tabs-state.ts 121行死代码 | T2406 Stage B |
| R351 | 🟢 P3 | localStorage 废弃 keys (`lbkb_open_tabs`, `lbkb_minimized_blogs`) | ✅ R351 修复: App.tsx init 一次性 removeItem 清理 |
| R352 | 🟡 P2 | 死 `scrollContainerRef` + 无效 `blog-scroll-ratio-${id}` 写入 — 读路径孤儿，写路径存活 | ✅ 已删除 L268-276 + 两处编辑按钮写入。grep 确认 0 残留 |
| R353 | 🟢 P3 | 三套"最近"机制概念重叠 (阅读位置/浏览历史/编辑连续性) | 仅记录，不修改 |
| Phase 23 返工令 | 🟢 P3 | T2302-T2307 spec-implementation gap | 延 Phase 24+ |
| Phase 24 实施 | ✅ | T2401-T2405 全部完成 | build ✅ test ✅ 87/87 |
| T2406 Stage A | ✅ | Soft Collapse 完成 — ContextPanel/BottomTabs/FloatingBlogTabs 断开 | 见下方 Collapse Validation Audit |

---

## T2406 Stage A — Collapse Validation Audit (2026-05-25)

> 审查类型: 实施后验证审计 (非 pre-audit)。重点: 旧系统是否以微系统形式重新长出。
> 审查方法: grep sweep + 关键文件全读 + 交互模式分析

### 逐系统状态

| 系统 | Stage A 前 | Stage A 后 | 状态 |
|------|-----------|-----------|------|
| ContextPanel | 渲染, 11 files 引用 | 文件保留(217行), 零处导入, 未渲染 | ⚠️ 物理文件存在 |
| Bottom Tabs (blog editor) | 4 tabs: tags/attachments/refs/series | 删除。替换: TagSelector + ReferencePicker(readOnly) inline chips | ✅ |
| FloatingBlogTabs | 渲染, App.tsx 导入 | 文件保留(71行), 零处导入 | ⚠️ 死代码 |
| TabBar / tab-context | 渲染, 自动追踪路由 | TabBar 未渲染, **但 tab-context store 完全存活**, SplitPane 导入 useTabs | 🔴 状态机运行中 |
| SplitPane | 含 ContextPanel 所有权机制 | activePaneId/focusPane 仍保留, 但无消费者 | 🟠 死机制 |
| Graph IPC handler | graph.ts 110行 | 物理删除, channel 清理 | ✅ |
| MiniGraph/LocalGraph | 已由 T2402 删除 | — | ✅ |

### 四维度评分

**Complexity Regression** — ✅ 通过
- HoverPreview: `pointer-events-none`, 200ms delay, 零交互——真正瞬时
- TOC dropdown: 点击出现/失焦消失, 选择后自动关闭
- TagSelector popover: click-outside dismiss, Escape 关闭
- **唯一风险**: TableOfContents.tsx ghost component (新建浮动 panel, 未接入)

**Hidden System Re-growth** — ⚠️ 警戒
- R344: TabBar store 存活, SplitPane 依赖——隐形 browser tabs
- R345: SplitPane 保留 activePaneId/focusPane——ContextPanel 所有权幽灵
- R346: ContextPanel.tsx 217行完整保留——一行 import 复活

**Attention Competition** — ✅ 通过
- 永久可见系统: sidebar + header + 2px progress bar = 2.5 (规格 ≤3)
- AiChatPanel 按需切换, 非永久
- 所有新增 UI 均为瞬时交互

**Persistence Leakage** — ⚠️ 警戒
- `lbkb_open_tabs` localStorage key 持续写入——用户不可见的 tab 积累
- `lbkb_minimized_blogs` 旧数据残留
- `window.__lbkb_context_panel__` 定义保留

### Stage B 就绪条件

| 阻塞项 | 需要 |
|--------|------|
| R344 | Boss 裁决 D131 (TabBar 完全删除 vs 保留) |
| R347 | Boss 裁决 TableOfContents.tsx 去留 |
| R344+R345 | Developer 解耦 SplitPane → tab-context 依赖 |
| R346-R351 | 批量物理删除 (非阻塞, 可一键执行) |

### Boss 裁决 (2026-05-25)

**R344 — tab-context 状态机存活**: D131 已裁决 Continue Flow 替代 TabBar。tab-context 在后台持续写入 lbkb_open_tabs = 裁决未执行到位。**Stage B 必删**：物理删除 tab-context.tsx + TabProvider + useTabs + localStorage key。SplitPane label 改为 `useLocation().pathname` 派生。这是当前最大的隐藏 persistence leakage — 浏览器 tabs 思维在无 UI 状态下仍隐形运行。

**R345 — SplitPane 所有权幽灵**: D128 已裁决"保留 SplitPane，删所有权逻辑"。activePaneId/focusPane/switchActivePane 是 ContextPanel 的幽灵肢体，零消费者但完整运行。**Stage B 必删**：仅移除三个所有权字段，SplitPane 退化为纯左右分屏。0.5h。

**R347 — TableOfContents.tsx ghost component**: Auditor 判断准确 — "不是 dead code，是 permanent panel 复活预制件"。105 行新建浮动 panel 组件，未接入但坐等被接入。**立刻标记废弃 + Stage B 物理删除**：文件头加 `// DEPRECATED: Phase 24 Interaction Collapse — do not connect. Will be deleted in Stage B.` 防止任何人顺手接入。

**R346/R348/R349/R350/R351**: Stage B 批量清理。当前不提前处理 — 两阶段观察不能退化为一步硬删。同意 Auditor。

---

## Phase 24 T2406 "Interaction Collapse" 规格审查 (Pre-Audit)

> 审查日期: 2026-05-25 | 代码未写，仅审查 todo.md 规格 + 对照当前代码状态
> 代码基线: T2401-T2405 已实施, build ✅ test ✅ 87/87
> 审查重点: Inline Context 信息边界 / Continue Flow 可行性 / Inline Chips 约束 / 两阶段执行 / 验收指标

### D127 — 🔴 Part 1: ContextPanel 替换范围——hover popover 覆盖不了的 tab 怎么处置

| 项目 | 内容 |
|------|------|
| **现状** | ContextPanel 通过 `registerTabs` 机制被 5 个页面动态注册 tabs。当前承载：TOC/大纲树、反向链接列表、AI 推荐、KB 文件元数据+相似文件、系列阅读进度、KB 被引列表。200ms hover popover 的信息密度（6 字段）只能覆盖 wikilink 前向链接场景 |
| **Spec 描述** | "Wikilink hover → inline popover preview。信息边界: title, excerpt, updatedAt, tags, related count, backlinks count" |
| **冲突** | 以下信息类型无法用 hover popover 承载：大纲树（需层级展开+滚动）、AI 推荐列表（需交互：接受/忽略）、KB 元数据表格（字段数 >6）、阅读进度 checkbox（需交互）。Spec 未说明这些 tab 的处置 |
| **选项 A** | **逐 tab 列死刑方案（+2h）**：大纲树→编辑器内浮动 dropdown；AI 推荐→toast 通知；KB 元数据→卡片内联展开；阅读进度→系列页自身 UI。每个 tab 有明确替代方案后才能删。验收：grep 每个 tab ID → 0 |
| **选项 B** | **保留大纲树为唯一例外** — 编辑器右侧 240px mini panel（不可注册 tabs，不可扩展）。风险：mini panel 是下一代 ContextPanel 的种子 |
| **建议** | **A** — Phase 22-23 的教训：spec 说"删"但没说"替代方案"→ spec-implementation gap。逐 tab 定死刑方案，不留模糊空间 |
| **Boss 裁决** | **A — 逐 tab 死刑方案**。理由：B 的"保留大纲树 mini panel"就是下一代 ContextPanel 的种子，违反产品宪法「永久可见 panel ≤ 1」。大纲树改为瞬时 dropdown，需要时才出现。+2h 值这个价——每个 tab 有明确替代方案 = 不留复杂度反弹空间 |

### D128 — 🔴 Part 1: SplitPane 联动——ContextPanel 删后 SplitPane 是否保留

| 项目 | 内容 |
|------|------|
| **现状** | SplitPane 通过 `SplitProvider` + `useSplit` 管理分屏状态。`activePaneId` 驱动 ContextPanel 的 pane 所有权。当前使用场景：BlogEditorPage Ctrl+\ MD 预览、KB 文件并排查看 |
| **Spec 描述** | "删除 SplitPane 分屏状态" |
| **冲突** | 若连 SplitPane 一起删：Ctrl+\ 分屏 MD 预览消失（编辑器核心功能）。若不删：需移除 ContextPanel 所有权耦合 |
| **选项 A** | **保留 SplitPane，删所有权逻辑** — 移除 `activePaneId`/`focusPane`/`switchActivePane`，退化为纯左右分屏。0.5h，低风险 |
| **选项 B** | **删除 SplitPane** — Ctrl+\ 预览改为 BrowserWindow 浮窗。引入新 BrowserWindow 安全审计负担 |
| **建议** | **A** — SplitPane 是编辑器核心功能，不应作为 ContextPanel 清理的连带牺牲品 |
| **Boss 裁决** | **A — 保留 SplitPane，删所有权逻辑**。理由：Ctrl+\ 分屏预览是编辑器核心功能。删 `activePaneId`/`focusPane`/`switchActivePane` 即可去耦合，不伤编辑器 |

### D129 — 🔴 Part 2: 附件和系列的归宿——Bottom Tabs 包含写操作 UI

| 项目 | 内容 |
|------|------|
| **现状** | BlogEditorPage 底部 4 tab：`tags`（标签选择+自动标签）、`attachments`（附件上传/管理）、`refs`（引用列表+[@]入口）、`series`（系列选择+新建）。attachments 和 series 是**写操作 UI**，不是信息展示 |
| **Spec 描述** | "替代: inline chips — 严格限制 2 类: (A) tags (B) related links" |
| **冲突** | 附件上传和系列分配功能在 inline chips 模型中无家可归。删除后博客丢失两个能力 |
| **选项 A** | **附件入口→工具栏，系列选择→元数据行** — 编辑器工具栏加 📎 附件按钮（popover），系列选择移到标题下方元数据行（与日期/格式同级）。tags + related links 保留为 inline chips |
| **选项 B** | **删除附件功能** — 博客附件使用率可能极低，直接删除。系列保留在元数据行 |
| **建议** | **A** — 附件功能不应在"交互塌缩"中意外死亡。建议 Boss 确认附件实际使用率后再定 |
| **Boss 裁决** | **A — 附件→工具栏 popover, 系列→元数据行**。理由：附件和系列是写操作 UI，不是被动信息展示。工具栏按钮 + 元数据行是它们的自然归宿，不新增 panel。但加一个约束：附件 popover 不是 persistent，点击外部关闭。Stage A 观察期内我会特意检查附件使用频率 |

### D130 — 🔴 Part 3: "停留 >3min" 需要全新驻留计时子系统

| 项目 | 内容 |
|------|------|
| **现状** | 无任何页面驻留时间追踪。TabBar 只追踪"打开了哪些路由"，不追踪停留时长 |
| **Spec 描述** | "数据来源 = 未完成思考: [最近编辑] + [停留 >3min] + [未关闭/标记完成] + [7 天内]" |
| **冲突** | "最近编辑"（DB updated_at）、"7天内"（时间过滤）、"未标记完成"（需新字段）均可实现。"停留 >3min"**需要全新计时子系统**：页面聚焦→启动计时，失焦→暂停，导航离开→持久化。当前完全不存在 |
| **选项 A** | **去掉"停留 >3min"** — 继续候选 = 最近 7 天修改过的博客/便签/KB，排除已完成（新增 `completed_at` 或复用 todo 完成标记）。零新基础设施 |
| **选项 B** | **实现驻留计时** — 新增 localStorage 驻留追踪 + useEffect 计时器。+2h+，引入后台计时状态 |
| **建议** | **A** — "最近编辑"已是强信号（用户主动写了 = 确实在处理）。为一个模糊信号增加 2h+ 和新的状态复杂度，ROI 不划算 |
| **Boss 裁决** | **A — 去掉"停留>3min"**。理由：驻留计时是一个新子系统，引入后台计时状态，与「交互塌缩」的哲学矛盾。"最近编辑"已是强信号——一个人最近改了某篇博客 = 他在思考这件事。不完美的信号 > 完美的复杂度 |

### D131 — 🟠 Part 3: Continue Flow 与现有 TabBar 的关系——两个"继续"机制并存？

| 项目 | 内容 |
|------|------|
| **现状** | 两套"继续"机制已存在：① TabBar（`tab-context.tsx`）自动追踪所有访问路由，最多 8 个，localStorage 持久化 ② FloatingBlogTabs（`floating-tabs-state.ts`）仅存用户显式最小化的博客，最多 5 个，底部固定栏 |
| **Spec 描述** | "保留 floating tabs 机制, 语义重定义" — **没说 TabBar（T2208 标签页系统）是否保留** |
| **冲突** | TabBar + Continue Flow 并存 = 顶部"打开的标签页" + 底部"继续思考" = 两套"继续"语义，认知负担不降反升。TabBar 是浏览器式"去过哪都留着"——与 Continue Flow 的"只有未完成的才出现"哲学冲突 |
| **选项 A** | **Continue Flow 替代 TabBar** — 删除 `tab-context.tsx` + TabBar UI + localStorage 持久化。Continue Flow 成为唯一"继续"机制。路由导航改为单向（无 tab 积累） |
| **选项 B** | **TabBar 保留，FloatingBlogTabs 删除，Continue Flow 新组件** — 三套并存，复杂度净增，违反 Phase 24 复杂度预算宪法 |
| **建议** | **A** — TabBar 的"open tabs"语义与"思考流"哲学冲突。删除 TabBar 减少 renderer 状态复杂度（TabProvider/useTabs/MAX_TABS/自动添加逻辑），是真正的 Collapse |
| **Boss 裁决** | **A — Continue Flow 替代 TabBar**。这是本次裁决中最重要的决定。理由：TabBar = 浏览器隐喻（"去过哪都留着"），Continue Flow = 思考隐喻（"只有未完成的才出现"）。两套并存 = 认知负担不降反升。删除 TabContext/TabProvider/useTabs/MAX_TABS/localStorage 持久化，单向路由导航。Sidebar 负责导航，Continue Flow 负责连续性——两个机制，各司其职 |

### D132 — 🟡 Part 4: MiniGraph/LocalGraph 已被 T2402 删除——工时释放 + 残余清理

| 项目 | 内容 |
|------|------|
| **现状** | `grep "MiniGraph\|LocalGraph" src/renderer/` → 仅 `.bak` 文件。物理文件均不存在。`/graph` → 302 `/whiteboards` 路由已在 App.tsx。T2402 已完成组件删除 |
| **仍残留** | ① `src/main/ipc/graph.ts` — GRAPH_GET_DATA handler 完整存在（110 行），renderer 中零调用方 ② `tab-context.tsx:32` — `'/graph': '图谱'` 路由标签 ③ `ipc-channels.ts:141-142` — `GRAPH_GET_DATA` 定义 ④ `shared/types.ts` — GraphData/GraphNode/GraphEdge/GraphFilter 类型 |
| **建议** | Part 4 从"删除组件"改为"残余 IPC + 类型 + 路由标签清理"（~0.5h，大部分已被 T2402 覆盖）。释放 7.5h 分配给 Part 1/2 的替代方案实现 |
| **Boss 裁决** | **A — 缩小为残余清理**。T2402 已删组件，Part 4 实际只剩 graph.ts handler + Graph* 类型 + GRAPH_GET_DATA IPC 通道 + tab-context 路由标签。0.5h 足够。T2406 工时从 8h 重新基数为 ~10.5h（D127 +2h / 其他 Part 仍 ~8h / Part 4 -7.5h 已反映在 T2402） |

### D133 — 🟠 Part 5: 状态清理清单——Spec 假设的 Zustand slices 不存在

| 项目 | 内容 |
|------|------|
| **现状** | Spec 说"删除 Zustand store slice (contextPanel, bottomTabs, graph, splitPane 等)"。实际架构：ContextPanel → 模块级 pub/sub（`window.__lbkb_context_panel__`）；SplitPane → React context（`useState`）；TabBar → React context（`TabProvider`）；FloatingBlogTabs → pub/sub（`floating-tabs-state.ts`）。**无一使用 Zustand** |
| **修正清单** | ① `window.__lbkb_context_panel__` 全局 pub/sub ② `SplitProvider` 中 `activePaneId`/`focusPane`/`switchActivePane` ③ `floating-tabs-state.ts`（若 D131 选 A） ④ `tab-context.tsx`（若 D131 选 A） ⑤ `graph.ts` IPC handler + types.ts Graph* 类型 ⑥ `ipc-channels.ts` GRAPH_GET_DATA ⑦ `App.tsx` `<FloatingBlogTabs />` ⑧ `index.css` ContextPanel 样式 |
| **建议** | 更新 T2406 Part 5 spec 为实际模块名 |
| **Boss 裁决** | **A — 修正 spec 为实际架构**。Spec 写的 Zustand slices 不存在，实际是 pub/sub + React context。按 Auditor 的 8 项修正清单更新 Part 5。这恰好证明了 Auditor pre-audit 的价值——spec 里的假设在代码面前原形毕露 |

### D134 — 🟡 验收指标可验证性——2 项存在缺陷

| 指标 | 问题 | 建议 |
|------|------|------|
| "ResizeObserver 引用减少 ≥3" | `grep "ResizeObserver" src/renderer/` → **0 结果**。指标测量对象不存在 | 替换为 "React context provider 减少 ≥2" 或 "模块级 pub/sub 删除 ≥2" |
| "首屏系统模块 ≤3" | "系统模块"无定义 | 明确定义：HomePage 渲染时永久可见的独立状态管理 UI 块。写进验收 grep 命令 |
| "正文宽度 ≥+20%" | 可验证但需基线 | T2406 实施前截图测量当前正文列 px 宽度作为基线 |

### D135 — 🟡 复杂度反弹防御——禁止清单需要自动化门禁

| 项目 | 内容 |
|------|------|
| **历史教训** | Phase 22 spec 说"BlogCard 卡片 Feed"但列表视图同时存在。Phase 23 spec 说"点击即用不预览"但保留预览面板。**禁止清单在 spec 中被写下来，但在实施中无自动化检查** |
| **建议** | `scripts/pre-audit.sh` 新增 `T2406_REGRESSION_PATTERNS` 数组，grep 禁止清单关键词（`registerTabs`, `ownerSid`, `activePaneId`, `bottomTab`, `setBottomTab`, `nested tabs`, `expandable sections`）。Phase 25+ 每个 Phase 结项时自动扫描。Hard Delete 之前就位 |
| **裁决需要** | Boss 确认是否纳入 pre-audit.sh（常驻检查 vs 仅 Phase 25 临时检查） |
| **Boss 裁决** | **A — pre-audit.sh 常驻反弹检测**。理由：禁止清单写在 AGENTS.md 产品宪法里了，但没有自动化门禁就是纸老虎。纳为常驻检查，每次 `npm run ci` 或 pre-audit 时自动扫描。验证项采纳 D134 修正后的指标 |

### D134 补充裁决

| **Boss 裁决** | 三个指标修正如下 — (1) ResizeObserver → "React context provider 减少 ≥2" (当前 ContextPanel pub/sub + SplitProvider + TabProvider + FloatingBlogTabs pub/sub = 4，目标 ≤2) (2) "首屏系统模块 ≤3" → 明确定义为 "HomePage 渲染时永久可见的独立数据源 UI 块: sidebar / 主内容区 / (不超过 1 个其他)" (3) 正文宽度基线在 Stage A 前截图记录 |

### D135

### 汇总

| D# | 决策点 | 选项 A | 选项 B | 建议 | Boss 裁决 |
|----|--------|--------|--------|------|-----------|
| D127 | ContextPanel 替换范围 | 逐 tab 死刑方案（+2h） | 保留大纲树例外 | A | **A** |
| D128 | SplitPane 是否随 ContextPanel 删 | 保留 SplitPane，删所有权逻辑 | 删除 SplitPane | A | **A** |
| D129 | 附件/系列 Bottom Tabs 删除后归宿 | 移入工具栏+元数据行 | 删除附件功能 | A | **A** |
| D130 | "停留 >3min" 需驻留计时 | 去掉此条件，简化数据源 | 实现驻留计时（+2h+） | A | **A** |
| D131 | Continue Flow vs TabBar 关系 | Continue Flow 替代 TabBar | 两者并存 | A | **A** |
| D132 | Part 4 组件已删，工时释放 | 缩小为残余清理（0.5h） | 按原 spec 执行 | A | **A** |
| D133 | 状态清理清单偏差 | 修正 spec 为实际模块名 | 不改 spec | A | **A** |
| D134 | 验收指标缺陷 | 替换为可验证指标 | 保留原指标 | A | **A** |
| D135 | 禁止清单无自动化防御 | pre-audit.sh 常驻反弹检测 | 信任禁止清单 | A | **A** |

**裁决统计**: A: 9 | B: 0 | 否决: 0 | 自定义: 0

**工时影响**: Part 1 +2h (D127 逐 tab 替代方案), Part 4 由 T2402 覆盖。T2406 净工时 ~10.5h (Developer 回译时确认)。
**关键前提**: D127/D128/D129/D130 不裁决 Developer 无法开工。D131 影响与 TabBar 的架构冲突。

---

## 阅读位置记忆 — Focused Audit, Round 2 (2026-05-28)

> 审查类型: 实施后聚焦审计。Developer 声称已完成 patch。
> 审查范围: 仅 continuity patch，不重审整个 T2406。
> 方法: 逐行审查 BlogPreviewPage.tsx + grep sweep 全部 sessionStorage/localStorage key。

### 7 项 Compliance Check

#### 1. 是否真的只有 2 个 sessionStorage keys？

**否。实际有 3 类 sessionStorage key 在活跃写入：**

| Key 模式 | 存储 | 写入点 | 读取点 | 合法？ |
|----------|------|--------|--------|--------|
| `lbkb_last_blog_id` | sessionStorage | L328 | L286 | ✅ T2406 spec |
| `lbkb_last_scroll_top` | sessionStorage | L329 | L287 | ✅ T2406 spec |
| `blog-scroll-ratio-${id}` | sessionStorage | L544, L680 | L270 | ❌ **per-article dead write** |

`blog-scroll-ratio-${id}` 使用动态 key（blog ID 嵌入 key 名），每次点"编辑"创建一个新 key。在一个长会话中访问 5 篇不同博客 → 5 个 `blog-scroll-ratio-N` key 累积在 sessionStorage 中。读路径 (`scrollContainerRef` L268-276) 从未被调用——callback ref 在全文 JSX 中 0 处挂载 (grep 确认仅出现于定义行)。

**违反边界: B2 (超 2 key), B3 (per-article map)**

#### 2. 是否存在 hidden accumulation？

**是。** `blog-scroll-ratio-${id}` 随用户编辑操作静默累积。每次点击"编辑"按钮 (L540-547 或 L675-683) → `sessionStorage.setItem('blog-scroll-ratio-N', ...)`。没有清理机制（读路径死掉后 `sessionStorage.removeItem` 永不触发）。sessionStorage tab-close 自动清空，**但 tab 生命周期内无限增长**。

`lbkb_last_blog_id` + `lbkb_last_scroll_top` 机制本身无 accumulation——每次覆写同一对 key。✅

#### 3. 是否仍残留旧 blog-progress-* 写入路径？

**活跃代码中无。** `blog-progress-${id}` 仅存在于 `.bak:226,309`，是旧版 localStorage 阅读进度机制。活跃代码 (`BlogPreviewPage.tsx`) 中零出现。✅

#### 4. 是否有 useEffect/background autosave？

**无后台自动保存。** 审计全部 8 个 useEffect：

| useEffect | 行号 | 作用 | 写 sessionStorage？ |
|-----------|------|------|---------------------|
| blog load | L278-300 | 加载博客数据 + 恢复滚动位置 | 否 (只读) |
| IntersectionObserver | L303-318 | 大纲高亮 | 否 |
| unmount save | L321-333 | **cleanup 中写 scrollTop** | 是 ✅ 合规 |
| scroll progress | L340-342 | 进度条更新 | 否 |
| wikiResolver | L346-363 | wikilink 解析 | 否 |
| transclusion | L366-433 | 嵌入内容加载 | 否 |
| code highlight | L442-468 | highlight.js | 否 |
| HoverPreview | L201-265 | hover popover | 否 |

**无 setInterval / scroll event → save / requestIdleCallback 等后台写入。** 唯一写入点是 unmount cleanup (L321-333)。✅

#### 5. 是否存在 attention surface？

**零 attention surface。** Grep 确认：
- 无 `<ReadingPosition>` / `<ScrollRestore>` 组件
- 无 "继续阅读" / "上次读到" / "resume reading" 文案
- 无 indicator / badge / toast / tooltip 提示阅读位置
- 无新 DOM 节点
- 进度条 (L518-526) 是预存功能，不涉及阅读位置记忆

✅

#### 6. mount/unmount 生命周期是否符合 Boss 裁决？

**逐路径追踪：**

**Write path (unmount cleanup, L321-333):**
```
组件卸载 (页面导航)
  → useEffect cleanup 触发 ([id] 依赖)
  → 闭包捕获当前 id
  → scrollY >= 100? → 是
  → lastId !== id? → 是 (假设导航到不同博客)
  → setItem('lbkb_last_blog_id', id)
  → setItem('lbkb_last_scroll_top', scrollY)
```
✅ 符合 B7 (unmount 写入), B9 (<100 不写)

**Restore path (mount effect, L278-300):**
```
组件挂载
  → useEffect 触发 ([id, user, isEditMode])
  → blogGet(id).then()
    → getItem('lbkb_last_blog_id') === id? 
      → 是 → requestAnimationFrame → window.scrollTo(savedTop)
      → 否 → window.scrollTo(0, 0)
```
✅ 符合 B8 (mount + blogId 匹配恢复)

**edit→return 场景 (out of scope, 仅记录):**
进入编辑模式时 `isEditMode` 变化不触发 unmount → `lbkb_last_scroll_top` 不更新。返回阅读时恢复的是**上一次页面导航**保存的位置，非进入编辑前的位置。这不是 Boss spec 范围（spec 说的是页面切换，非编辑模式），但用户点击"返回阅读"后可能不在原来位置。当前由 `blog-scroll-ratio-${id}` 尝试覆盖此场景但读路径失效。

#### 7. 是否与 T2406 Stage B persistence cleanup 冲突？

**无冲突。** Stage B 清理目标与阅读位置 key 无交集：

| Stage B 清理项 | 存储 | 冲突？ |
|---------------|------|--------|
| R344 `lbkb_open_tabs` | localStorage | 否 — 不同 key/不同存储 |
| R351 `lbkb_minimized_blogs` | localStorage | 否 |
| R346 ContextPanel.tsx | 物理文件 | 否 |
| R347 TableOfContents.tsx | 物理文件 | 否 |
| R349 `.bak` 文件 | 物理文件 | 否 (`.bak` 含旧 `blog-progress-*` 引用，但已是死文件) |

`lbkb_last_blog_id` + `lbkb_last_scroll_top` 在 sessionStorage 中，不在 Stage B 任何清理路径上。✅

**但 Stage B 应追加清理**: `blog-scroll-ratio-${id}` 残留 sessionStorage 写入 (R352 修复后自然消失)。

---

### 结论矩阵 (Round 2 — Post R352 Fix)

| 检查项 | 结果 | 证据 |
|--------|------|------|
| 1. 仅 2 个 sessionStorage key | ✅ **通过** | `blog-scroll-ratio-${id}` 已删除。grep 确认活跃代码 0 残留 |
| 2. Hidden accumulation | ✅ **消除** | per-article key pattern 已删除。仅存 lbkb_last_blog_id + lbkb_last_scroll_top 单对覆写 |
| 3. blog-progress-* 残留 | ✅ 无 | 仅 `.bak`，活跃代码零引用 |
| 4. Background autosave | ✅ 无 | 无 setInterval/scroll-event 写入 |
| 5. Attention surface | ✅ 无 | 零 UI / 零文案 / 零 indicator |
| 6. Mount/unmount 生命周期 | ✅ 正确 | unmount 写入 + mount 恢复 + id 匹配 |
| 7. Stage B 冲突 | ✅ 无 | sessionStorage vs localStorage 隔离 |

**7/7 全部通过。**

### Boss 裁决 (2026-05-28)

| R# | 裁决 | 理由 |
|----|------|------|
| R352 | **立即删除，不等 Stage B** | Dead code。正在污染 sessionStorage。与本轮"仅 2 key"裁决矛盾 |
| R353 | **仅记录，不修改** | 概念观察点，无 code issue |
| R354 | **Won't Fix** | Boss spec 仅要求页面切换场景，不包含编辑模式往返。若未来需修：编辑按钮 onClick 中写 `lbkb_last_scroll_top` 替代死掉的 `blog-scroll-ratio-${id}` |

> **R352 Closure Note (2026-05-28)**: 本次修复的价值不仅是"删了 4 行代码"。它标志着团队从"UI 删除"到 **persistence-aware collapse audit** 的成熟度跃迁。Auditor 贡献的三项诊断术语 — **Unilateral persistence** (只写不读) / **Orphan runtime** (UI 死但状态机呼吸) / **Conceptual similarity trap** (语义相似 ≠ 应该统一) — 已正式写入 AGENTS.md 第五层，成为 Collapse Constitution。详见 AGENTS.md §第五层 → Collapse 工程本能。

### 修复报告

```
| R352 | 🟡 P2 | 死 scrollContainerRef + blog-scroll-ratio-${id} | ✅ 删除 L268-276 定义 + 两处编辑按钮写入 | BlogPreviewPage.tsx |
构建: ✅ (55+2+2172)
grep scrollContainerRef: 0 | grep blog-scroll-ratio: 0
```

---

## QuickNav — Constitution Audit (2026-05-28)

> 审查类型: 完整宪章审查。Boss 指定。
> 核心问题: QuickNav 是否真的只是 transient traversal，而没有重新长成 latent workspace。

### 系统定位

QuickNav 是 MainLayout 中三个瞬时 overlay 之一：

| 系统 | 快捷鍵 | 数据源 | 持久化 | z-index | 功能 |
|------|--------|--------|--------|---------|------|
| GlobalSearch | Ctrl+K / Ctrl+F | FTS Worker + localStorage | localStorage | z-50 | 全文搜索 + 命令 |
| QuickSwitcher | Ctrl+O | IPC blogList + kbList (DB) | 无 | z-60/61 | 按标题即时跳转 |
| QuickNav | Ctrl+Shift+K | Zustand in-memory ring | **无** | z-62/63 | 最近 5 篇遍历环 |

### 七维宪章审查

#### 1. Persistence Surface

逐文件 grep `localStorage|sessionStorage|persist|save|restore|keep|pin|workspace`:

| 文件 | 行数 | 命中 | 结果 |
|------|------|------|------|
| `quick-nav-store.ts` | 22 | 0 | ✅ |
| `QuickNav.tsx` | 90 | 0 | ✅ |
| `BlogPreviewPage.tsx:278` (唯一 write path) | — | 0 (仅调用 `.push()`) | ✅ |

**存储类型**: Zustand `create()` 无 `persist` middleware。仅 import `{ create } from 'zustand'`。

**存储内容**: `ring: QuickNavEntry[]` — 仅 `{id: number, title: string}`。无 timestamp / scroll position / cursor / metadata。

**应用重启后**: ring = `[]`。Zustand 内存 store，进程退出即丢失。

**结论: 零持久化面。** ✅

#### 2. Hidden Accumulation

**ring 容量**: `filtered.slice(0, 5)` — 硬上限 5，在 reducer 中执行，不可绕过。

**写入路径**: 仅 1 处 — `BlogPreviewPage.tsx:278`。无定时器、无 scroll event、无 background sync。

**去重**: 相同 id 先 `filter` 移除再插入队首。同一博客重复访问不增加条目数。

**最大占用**: 5 × (8 + ~50) ≈ 290 bytes。不随使用时间增长。

**结论: 零累积。** ✅

#### 3. Traversal Ring Eviction

```
filtered = ring.filter(e => e.id !== id)  // 去重
filtered.unshift({ id, title })           // 新条目 → 队首
return { ring: filtered.slice(0, 5) }     // 硬截断
```

- 无 timestamp-based 过期
- 无 LRU 计数器
- 纯 FIFO: 第 6 条永不被存储
- Evicted 数据不可恢复

**结论: FIFO eviction 正确。** ✅

#### 4. Overlay Lifecycle

**Open**: 仅 `Ctrl+Shift+K` (L36-42)。前置条件 `ring.length > 0` — 空 ring 时快捷键无操作。

**Close 路径**:

| 触发器 | 代码 | 行为 |
|--------|------|------|
| Backdrop click | L52 `onClick={() => setOpen(false)}` | 关闭 |
| Escape | L29-31 | 关闭 |
| Enter (选中项) | L26-28 → `handleSelect` → `setOpen(false)` + `navigate()` | 关闭 + 导航 |

**Modal-Backdrop 结构**: Fragment siblings (`<><div backdrop/><div modal/></>`). 点击 modal 内部不冒泡到 sibling backdrop。✅

**结论: 生命周期正确。** 显式打开 + 3 条独立关闭路径。✅

#### 5. Keyboard Shortcut

| 快捷鍵 | 系统 | 条件 |
|--------|------|------|
| Ctrl+K | GlobalSearch | `ctrlKey && k` |
| Ctrl+F | GlobalSearch | `ctrlKey && f` |
| Ctrl+O | QuickSwitcher | `ctrlKey && o && !metaKey` |
| Ctrl+Shift+K | QuickNav | `ctrlKey && shiftKey && k && !metaKey` |

**冲突**: 无。Ctrl+K vs Ctrl+Shift+K 的 `shiftKey` 阻断。Meta+K (Cmd+K) 显式排除。

**结论: 快捷键隔离正确。** ✅

#### 6. Click Outside Dismiss

Backdrop (L52): `fixed inset-0 z-[62]` + `onClick={dismiss}`。Modal 在 z-63。两者是 siblings——modal 内点击不触发 backdrop onClick。✅

#### 7. Memory-Only Guarantee

| 检查项 | 结果 |
|--------|------|
| `zustand/middleware` import | ❌ 无 |
| `persist` 配置 | ❌ 无 |
| `localStorage.setItem` | ❌ 无 |
| `sessionStorage.setItem` | ❌ 无 |
| IndexedDB / fs | ❌ 无 |
| 应用重启后 ring | `[]` |

**结论: 严格 memory-only。** ✅

### Habitat Formation 路径

| 演化路径 | 所需变更 | 当前状态 | 风险 |
|---------|---------|---------|------|
| ring → persistent 历史 | +`persist` middleware + storage adapter | ❌ | 🟡 单行 import |
| "pin" / "keep" | +store `pin()` + UI + persist | ❌ | 🟡 需 persist 先 |
| per-item scroll position | +`QuickNavEntry` 加字段 | ❌ 仅 id+title | 🟢 |
| drag-to-reorder | +`reorder()` + dnd lib | ❌ | 🟢 |
| 与 `lbkb_recent_blogs` 统一 | +persist localStorage + merge | ❌ 独立 | 🟡 **R353 已防御** |

**最脆弱点**: `persist` middleware。单行 import 可将 session-only traversal ring 变成 persistent workspace history。

**防御**: pre-audit.sh 检测 `quick-nav-store.ts` 中 `persist|localStorage|sessionStorage`。

### 结论

```
QuickNav 是 transient traversal.
不是 latent workspace.
```

**七维全部通过。零新工单。**

### 建议防御规则

```bash
# QuickNav constitution: detect persist breach
grep -n 'persist\|localStorage\|sessionStorage' src/renderer/stores/quick-nav-store.ts
# Expected: (empty)

# QuickNav constitution: detect feature creep
grep -n 'pin\|save\|workspace\|keep' src/renderer/components/common/QuickNav.tsx
# Expected: (empty)
```

---

## R344/R345/R351 修复验证 — Auditor Verification (2026-05-28)

> 验证类型: Developer 修复后审计。
> 范围: R344 (tab-context persist) + R345 (SplitPane 所有权) + R351 (localStorage cleanup)。

### 逐项验证

#### R344 — 🟠 P1: tab-context localStorage 写入路径移除

| 检查项 | 结果 | 证据 |
|--------|------|------|
| `saveTabs()` 函数 | ✅ 已删除 | grep → 0 |
| `loadTabs()` 函数 | ✅ 已删除 | grep → 0 |
| `LS_KEY` 常量 | ✅ 已删除 | grep → 0 |
| `localStorage` 调用 | ✅ 已删除 | grep → 0 (仅 L50 注释提及) |
| `persist` / middleware | ✅ 无 | 仅 `import { createContext, useCallback, useContext, useEffect, useMemo, useState }` |
| TabProvider 状态初始化 | ✅ 内存 `useState([{ id: nextId(), path: '/', label: '今日' }])` | 无外部读取 |
| TabProvider 在 MainLayout 挂载状态 | ✅ **未挂载** | `grep TabProvider MainLayout.tsx` → 0 |

**TabProvider auto-accumulation 确认已停止**: MainLayout 中无 `<TabProvider>` → TabProvider 的 `useEffect([location.pathname])` (L58-72) 永不触发 → 无路由自动追踪 → 无内存 tab 累积。

**残余引用 (无害)**:
- `TabBar.tsx:3`: 仍 `import { useTabs }` — 但 TabBar 本身未被 MainLayout 导入，不进 bundle
- `tab-context.tsx`: 文件仍存在 — R346 (Stage B) 物理删除

#### R345 — 🟠 P1: SplitPane 所有权机制移除

| 检查项 | 结果 | 证据 |
|--------|------|------|
| `SplitContextValue.activePaneId` | ✅ 已移除 | interface 仅含 `isSplit, rightContent, openSplit, closeSplit` |
| `SplitContextValue.focusPane` | ✅ 已移除 | 同上 |
| `SplitProvider` 所有权 state | ✅ 已移除 | 仅 `isSplit` + `rightContent` state |
| `useTabs` import | ✅ 已移除 | grep → 0 |
| Mini tab bars (R293) | ✅ 已移除 | 无 JSX 渲染 |
| SplitPane 当前功能 | ✅ 纯分屏 | `left \| divider \| right` + drag resize + `lbkb_split_ratio` persist |

**残余引用 (无害)**:
- `ContextPanel.tsx:68-133`: 仍引用 `activePaneId`/`switchActivePane`/`useSplit` — 但 ContextPanel.tsx 零处 import (MainLayout 已断开)，不进 bundle。TypeScript 会报 `activePaneId` 不存在于 `SplitContextValue` 类型，但文件未被任何模块导入 → 编译器跳过

#### R351 — 🟢 P3: localStorage 废弃 key 清理

| 检查项 | 结果 | 证据 |
|--------|------|------|
| `lbkb_open_tabs` 写入 | ✅ 已停止 | tab-context 无 localStorage 写入 + TabProvider 未挂载 |
| `lbkb_open_tabs` 清理 | ✅ App init `removeItem` | `App.tsx:145` |
| `lbkb_minimized_blogs` 写入 | ✅ 已停止 | `floating-tabs-state.ts` 是死代码 (零 import) |
| `lbkb_minimized_blogs` 清理 | ✅ App init `removeItem` | `App.tsx:146` |
| 清理策略 | ✅ 一次性 | `useEffect([], [initSession, initTheme])` — 仅 App mount 时执行一次 |

**`lbkb_minimized_blogs` STORAGE_KEY 残余**: `floating-tabs-state.ts:11` 仍定义该常量 — R350 (Stage B) 物理删除。当前文件无 import → 无写入 → 无害。

### 构建/测试基线

| 指标 | 结果 |
|------|------|
| build (main + preload + renderer) | ✅ 55+2+2173 |
| test | ✅ 87/87 (12 files) |
| CSS (renderer) | 80.04 kB (+0.39 kB: QuickNav CSS) |
| JS (renderer) | 4,355.08 kB (+1.35 kB: QuickNav component) |

### 系统状态快照 (Post R344/R345/R351)

```
lbkb_open_tabs         ─── 清除 (App init) + 停止写入 (tab-context 无 save)
lbkb_minimized_blogs   ─── 清除 (App init) + 停止写入 (floating-tabs-state 死代码)
SplitPane.activePaneId ─── 已删除 (类型 + 状态 + 函数)
SplitPane.focusPane    ─── 已删除
TabProvider mount      ─── 已断开 (MainLayout 零 import)
TabBar render          ─── 已断开 (MainLayout 零 import)

仍待 Stage B:
  R346 ContextPanel.tsx (217L, 零 import, 物理文件存在)
  R347 TableOfContents.tsx (105L ghost component)
  R348 BlogPreviewPage 死函数 (ContextLinksTab/OutlineTab/RecommendTab, 144L)
  R349 BlogPreviewPage.tsx.bak
  R350 FloatingBlogTabs.tsx + floating-tabs-state.ts (121L)
```

### 结论

```
R344 ✅ | R345 ✅ | R351 ✅
3/3 修复验证通过
零回归 | 零新问题
```

**P0+P1 清零。** R344 和 R345 是当前开放的最后两个 P1 项。修复后剩余全部为 P2/P3。
