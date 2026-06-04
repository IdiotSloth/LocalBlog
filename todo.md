# 本地博客与知识库存储系统 — 待办事项

> 最后更新: 2026-06-04 04:10:35 | 自动同步

---

## 1. 图例与权限

| 标记 | 含义 |
|------|------|
| ✅ | 已完成 |
| 🚧 | 进行中 |
| ✅ | 待实施 |
| ⏭ | 已跳过 |

| 角色 | 权限 |
|------|------|
| **Boss** | 完全控制：新增/修改/删除任务、调整优先级、裁决 |
| **Developer** | 更新状态 (✅/🚧/⏭) + 追加备注 |
| **Auditor** | 不可写 |

---

## 2. Phase 完成状态

| Phase | 范围 | 估算 | 完成日期 | 状态 |
|-------|------|------|----------|------|
| Phase 1-16 | 项目骨架 → 交互深化 | ~400.5h | 2026-05-08 | ✅ |
| Phase 17 | 体验收尾 + 分发就绪 | ~18.5h | 2026-05-14 | ✅ |
| Phase 18 | 工程收官 + 产品收尾 — FTS5/CRUD收敛/错误反馈/测试/UX补缺 | ~22.5h | 2026-05-14 | ✅ |
| Phase 19 | 质量收敛 + 体验深化 — 测试覆盖/标签面板/自动保存/浏览历史/字数统计/笔记渲染 | ~0h | 2026-05-16 | ✅ |
| Phase 20 | 信息架构升级 — 3栏布局/[[链接]]/知识图谱/今日中枢/AI接入/设计语言重塑 | ~85h | 2026-05-18 | ✅ |
| Phase 21 | 编辑器进化 + 信息流动 + 知识连接 + 内容中枢 — 分屏框架/搜索/语义搜索/剪藏/KB编辑/局部图谱 | ~67.3h | 2026-05-19 | ✅ |
| Phase 22 | "知识活化" — 被动发现/Transclusion/AI集成/标签页/Blog↔KB打通/Obsidian日历/Bookmarks | ~65h | 2026-05-20 | ✅ |
| Phase 23 | "精炼书房" — 设计语言统一 + 知识中枢激活: 国风主题/去硬核化/原地编辑/便签改造/KB重塑/导航重塑/白板 | ~48h | — | 📋 |
| Phase 24 | "羽化" (Feathering) — 从功能系统收敛为思考空间: Runtime Collapse/Visualization Purge/Interaction Collapse/The Orb/遗留修复 | ~60h | — | 📋 |

**总计**: ~774.8h (Phase 1-24 计划)

> 已完成 Phase 的详细任务规格见 [docs/phase-archive.md](docs/phase-archive.md)。
> 关联: [redo.md](redo.md) (修复清单) | [docs/development-guide.md](docs/development-guide.md) (开发参考)

---


> 已完成 Phase 17-21 的详细任务规格、Boss 裁决、实施顺序、Schema 变更 → [docs/phase-archive.md](docs/phase-archive.md)


## 3. Phase 22 — "知识活化" ✅

> 来源: Boss suggest.md (8 场景深度分析) + Boss 用户反馈 (HomePage 三栏冗余 / Blog↔KB 割裂) + Phase 21 延后项
> 核心命题: Phase 20 建了骨架, Phase 21 让血液流动, **Phase 22 让大脑开始"思考"** — 已积累的知识应主动服务用户, 而非被动等待检索
> 竞品驱动: Obsidian (Vault Curate 被动发现) / TiddlyWiki (Transclusion 嵌入) / Logseq (Saved Query) / Roam (Sidebar 排练) — 取对我们架构友好的能力
> 设计原则: 优先做"让已有基础设施发光的"功能 (语义搜索/MCP/SplitPane 是底座, 不是终点)

### 8.1 UX 修复 — 用户直接痛点 (Phase 22 前置)

**T2201 — HomePage 信息架构融合 + Obsidian Calendar 风格日历 (5h, P1)**

问题分析 (Boss 使用者反馈):
- "最近草稿" 每项展示 title + 100 字正文 + 日期, 3 条就占满整个左栏, 导致右侧的"上次停留"和"最近素材"被推到折叠区以下, 用户根本看不到
- 三个区块功能同质: "最近草稿"(继续写)、"上次停留"(继续看)、"最近素材"(最近的文件) — 都是"帮你回忆起上次在哪", 却占了三个独立面板
- 设计语言违规: 区块标题用 📅/📓 emoji, 违反 Phase 20 "Lucide SVG 细线图标" 约束
- 日历太弱: 当前 CalendarView 只展示 `memoType='schedule'` 的日程便签, 每日便签 (daily notes) 在日历上完全不可见。Obsidian Calendar 插件的核心价值是"一眼看到哪些日子写了笔记"——用圆点标记, 点击直接跳转

方案:
```
HomePage 重构布局 (从上到下):
┌─────────────────────────────────────────────┐
│ 问候语 + 日期 + 快捷操作 (新建博客/便签)      │
├──────────────────┬──────────────────────────┤
│ 今日便签 (左6)    │ 待办 (右6)                │
├──────────────────┴──────────────────────────┤
│ 继续... (统一面板, 3 Tab 切换)                │
│ [草稿 (N)] [最近打开] [最近素材]              │
│ ┌─────────────────────────────────────────┐ │
│ │ 草稿 Tab 内容 — 每行: 图标 + 标题 + 日期  │ │
│ │ (紧凑列表, 不展示正文片段, 最多 5 条)      │ │
│ └─────────────────────────────────────────┘ │
├──────────────────┬──────────────────────────┤
│ 日历月视图 (左8)   │ 迷你图谱 (右4)           │
└──────────────────┴──────────────────────────┘
```

变更:
- "最近草稿"+"上次停留"+"最近素材" → 合并为单个"继续..."面板, 3 个 Tab (草稿/最近打开/最近素材)
- 草稿列表从展示 100 字正文片段 → 紧凑行 (仅标题+日期), 最多 5 条可滚动
- "最近打开"合并原来的"上次停留"博客 + localStorage 最近浏览记录 (Phase 19)
- emoji 图标 (📅/📓) 替换为 Lucide 图标 (Calendar/StickyNote)
- 迷你图谱从顶部移到右侧栏 (与日历并排), 给"继续"面板腾空间

**日历升级 — Obsidian Calendar 插件风格 (+2h)**:
```
Obsidian Calendar 核心特征:
  ┌──┬──┬──┬──┬──┬──┬──┐
  │一│二│三│四│五│六│日│
  ├──┼──┼──┼──┼──┼──┼──┤
  │  │  │  │  │  │  │1 │
  │2 │3 │4 │5 │6 │7 │8 │
  │  │ ●│  │●●│  │● │  │  ← 圆点标记有内容的日期
  │9 │10│11│12│13│14│15│
  │●●│  │ ●│  │●●│  │  │
  │...                     │
  └──┴──┴──┴──┴──┴──┴──┘
  ● = 每日便签 (蓝)  ○ = 日程便签 (绿)

关键差异 vs 当前实现:
  当前: 只显示 memoType='schedule' 的日程, 用数字角标
  Obsidian: 同时显示 daily notes + schedule, 用圆点标记, 无数字

实现:
  1. 扩展 CalendarView 数据源:
     - 当前仅加载 schedule → 同时加载 daily notes (memoType='daily')
     - API: noteList(userId, 'schedule', ...) + 新增 noteList(userId, 'daily', ...)
     - IPC: note:list 已支持 memoType 过滤, 前端并发两个请求
  2. 日历圆点系统 (替代当前数字角标):
     - 有 daily note 的日期 → 蓝色小圆点 (--accent-blue, 6px)
     - 有 schedule 的日期 → 绿色小圆点 (--accent-green, 6px)
     - 两者都有的日期 → 两个圆点并排
     - 无内容的日期 → 留空 (当前是空占位 <span>)
  3. 交互:
     - 点击日期 → handleCalendarDateSelect(dateStr) → 加载/创建该日 daily note
     - 不再弹出 Schedule 模态框 — 日程编辑移入右侧"今日便签"/待办区域
     - 当前月份高亮 today, 选中的日期用 accent-blue 边框
  4. 周数 (可选):
     - 日历左侧显示 ISO 周数 (小字, text-muted)
     - 一行: `W21  │ 1 │ 2 │ 3 │ ... │ 7 │`
  5. 导航:
     - ← → 月份切换保留, 新增"今天"快捷按钮 (跳回当前月份)
     - 年份切换: 点击月份标签 → 弹出月份快速选择 (12 格)
  6. 日程 popup 移除:
     - 当前点击日期弹出模态框编辑日程 → 改为点击圆点展开 mini 面板 (非模态)
     - 日程创建移入 HomePage 的"待办"区域 (memoType='schedule' 便签)
```

验收: 日历上能看到哪些日期写了每日便签 (蓝色圆点) 和日程 (绿色圆点)。点击日期 → 加载那天的便签。今天高亮, 有内容的日期一眼可辨。

**T2202 — Blog↔KB 知识深度打通 (6h, P1)**

问题分析 (Boss 使用者反馈):
- 博客编辑器里要引用知识库文件 → 必须滚到页面最底部的 Tab 面板 (标签/附件/引用/系列) → 找到"引用"Tab → 打开 ReferencePicker。路径太长
- 知识库页面看不到"哪些博客引用了这个文件" → ContextPanel 虽然有链接 Tab, 但知识库路由不在 ContextPanel 白名单? (当前白名单: `/knowledge`, `/graph`, `/blog/*`)
- 博客和知识库在 UI 层面完全隔离, 只有 wikilink 文本在默默连接它们, 用户看不见这种连接

方案:
```
BlogEditorPage 右侧 ContextPanel:
┌─────────────────────┐
│ [链接] [大纲] [图谱] │  ← 现有 Tab
│ [知识库] ← 新增      │  ← 显示与当前博客标题/标签相关的 KB 文件
│ ┌─────────────────┐ │
│ │ 📄 Docker部署指南 │ │  ← 点击 → 在右侧 SplitPane 预览
│ │ 📄 Nginx配置模板  │ │
│ └─────────────────┘ │
└─────────────────────┘

ReferencePicker 入口前移:
  编辑器工具栏 [@] 按钮 → 点击弹出 ReferencePicker (不再藏在底部 Tab)
  底部"引用"Tab 保留但改为只读列表 (展示已添加的引用, 可删除)
```

变更:
- ContextPanel 新增"知识库"Tab: 用 embedding.worker 计算当前博客与 KB 文件的语义相似度, 显示 Top-5 相关文件 (复用 T2203 被动发现的 embedding 管线)
- 编辑器工具栏加 `[@]` 按钮 (Lucide AtSign 图标) → 浮动弹出 ReferencePicker → 选择后以 wikilink 形式插入编辑器光标位置
- 底部"引用"Tab 从编辑器入口改为只读引用列表 (管理已添加的引用, 支持删除)
- KB 预览页 ContextPanel 显示"被哪些博客引用"(已有 refGetTo, 只是 UI 没展示)

### 8.2 被动发现 — 知识"自己说话"

**T2203 — 被动知识发现 "你可能想链接到..." (4h, P1)**

场景来源: Scenario 1 (林博士 — Vault Curate 插件自动提醒关联)

根因: 我们的 wikilink 需要用户主动输入 `[[` 才能触发。Obsidian 的 Vault Curate 会在后台分析新笔记, 提醒"这篇可能与你库中的 X、Y 相关"。用户的知识连接是被动发现的, 不是主动搜索的。

方案:
```
触发时机:
  1. 博客保存后 → 后台计算 embedding(新博客) × embedding(已有内容) → Top-3 相似
  2. 知识文件导入后 → 同上
  3. 应用空闲时 (idle detection) → 扫描所有内容, 发现 "应链接但未链接" 的内容对

展示:
  ContextPanel 新增"推荐"Tab (仅在有关联推荐时显示, 带红点角标)
  或 Toast: "这篇博客可能与 [[X]]、[[Y]] 相关, 是否建立链接?"
  点击推荐 → 自动插入 [[wikilink]] 到编辑器光标位置

技术:
  复用 embedding.worker.ts + IndexedDB 向量缓存
  余弦相似度排序, 阈值 >0.75 才推荐
  已存在的链接自动过滤 (检查 refs 表)
```

验收: 保存一篇关于"Docker"的博客后, 系统推荐关联到已有的"容器化部署"知识文件。点击推荐自动插入 wikilink。

### 8.3 AI 集成 — 战略差异化

**T2204 — AI 集成: RAG + 编辑器AI + 自动标签 (22h, P1, D67)**

场景来源: Scenario 1-8 全部 — 每个场景的终极形态都涉及 AI (辅助写作/自动分类/智能检索)

根因: MCP Server (Phase 20) 让外部 AI 能操作知识库, 但应用本身没有内置 AI 能力。语义搜索 (Phase 21) 让机器"理解"了内容, 但用户不能直接与 AI 对话。

方案 (三阶段):
```
A. RAG 知识库问答 (~6h):
   - 后端: POST /api/chat { query, history? }
   - embedding.worker 检索 Top-5 相关内容 → 拼入 prompt
   - 调用 LLM API (用户配置: OpenAI/Claude/DeepSeek/Ollama)
   - 流式响应 (SSE) → 前端打字机效果
   - 引用溯源: 回答中标注信息来源 (哪篇博客/哪个知识文件)

B. 编辑器 AI (~5h):
   - 选中文本 → 右键菜单: "AI 续写" / "AI 摘要" / "AI 润色" / "AI 翻译"
   - Ctrl+J 唤起 AI 指令面板 (类似 SlashCommand 交互)
   - 编辑器底部浮动 AI 对话条 (非模态, 不打断写作流)
   - 复用 BlogEditorPage 的 SplitPane → AI 输出在右侧 pane 预览

C. 自动标签 (~4h):
   - 博客保存后 → embedding + LLM → 建议 3-5 个标签
   - 用户确认/修改 → 写入 blog_tags
   - 也支持知识文件导入时建议标签
   - 降级: 无 AI 配置时用纯关键词提取 (TF-IDF top terms)
```

关键技术决策:
- LLM 配置存储在 `settings` 表 (不硬编码): provider, apiKey, model, baseUrl
- 默认关闭, 用户需主动配置
- 隐私保护: API key 仅存本地, 对话记录可选不保存
- 离线降级: Ollama 本地模型可用时完全离线, 否则依赖用户配置的外部 API

### 8.4 知识表达 — 内容的新形态

**T2205 — 内容嵌入 Transclusion (4h, P2)**

场景来源: Scenario 8 (苏老师 — TiddlyWiki `{{条目}}` 嵌入) / Scenario 1 (林博士 — Obsidian `![[note]]`)

根因: wikilink 是"指针"——你知道那里有东西, 但要点击才能看到。Transclusion 是"嵌入"——内容直接展现在当前页面。两者互补: 指针用于导航, 嵌入用于引用和拼凑。

方案:
```
语法: ![[目标标题]] 或 ![[目标标题|别名]]
  - 区别于 [[...]] (链接), 加 ! 前缀表示嵌入
  - 渲染: markdown-it 正则替换 → <blockquote class="transclusion" data-ref-id="N" data-ref-type="blog|knowledge|note">
  - 内容: 博客显示摘要 (前 200 字), 便签显示全文, 知识文件显示描述
  - 点击嵌入块 → 跳转到目标内容
  - DOMPurify 白名单允许 blockquote.transclusion

实现:
  - src/shared/wikilink.ts: renderWikilinks() 扩展, 检测 ![[ 前缀
  - 嵌入内容在渲染时实时拉取 (useEffect + IPC fetch), 不写入源内容
  - 嵌入块样式: 左边框 accent-blue, 略小字号 (13px), 灰色背景, 右上角来源链接
```

验收: 在博客 A 中写 `![[博客B]]` → 保存后预览, 看到博客 B 的前 200 字嵌入在博客 A 中, 带左边框和来源链接。

**T2206 — 结构化查询 Saved Search (3h, P2)**

场景来源: Scenario 5 (陈医生 — Logseq Query 一键提取所有标注了 #核心信念 的段落)

根因: 搜索操作符 `tag:`/`type:`/`after:`/`before:` (Phase 21 T2104) 很强大, 但用户需要每次重新输入。频繁使用的查询条件应该可以保存。

方案:
```
SavedQuery:
  - 用户在搜索框输入 "tag:心理 note after:2026-01-01" → 搜索
  - 搜索结果页顶部出现 "保存此查询" 按钮
  - 命名后 → 写入 localStorage 'lbkb_saved_queries'
  - HomePage 侧边栏或"继续..."面板下方显示已保存的查询列表
  - 点击查询 → 跳转 /search?q=... → 实时搜索结果
  - 支持删除/重命名

UI:
  - 保存的查询以标签形式展示: [🔍 心理笔记] [🔍 部署相关] [🔍 近期草稿]
  - Simple, no query builder — 用户手写条件
```

验收: 保存查询 "tag:心理 note", 点击后看到所有标注了"心理"标签的便签。

**T2207 — 时间轴视图 (2h, P2)**

场景来源: Scenario 8 (苏老师 — TiddlyWiki Timeline 可视化时间轴)

根因: 博客和知识文件都有时间维度, 但当前只能用列表或搜索按时间排序。时间轴让用户看到"知识的生长过程"。

方案:
```
/timeline 路由:
  - 垂直时间轴: 左侧竖线 + 右侧内容卡片
  - 按 created_at 倒序排列博客 + 知识文件
  - 每张卡片: 日期标签 + 类型图标 (FileEdit/Library) + 标题 + 摘要 (50 字)
  - 点击卡片 → 跳转到对应内容
  - 支持过滤: 类型 (博客/知识文件) + 日期范围
  - 侧边栏新入口: "时间轴" (Lucide Clock 图标, 放在"洞察"组)

纯前端实现, 复用 blog:list + kb:list IPC, 0 新 Schema。
```

验收: `/timeline` 显示按月分组的博客+知识文件时间轴, 点击跳转。

### 8.5 工作流增强 — 多任务操作

**T2208 — 标签页系统 (8h, P1, D76)**

问题: 单路由模型下, 用户写作时需要参考另一篇内容 → 必须离开当前页面 → 打断写作流

方案 (基于 Phase 21 SplitPane 框架):
```
TabBar 组件:
  - 位置: MainLayout 顶部, 侧边栏右侧, 面包屑下方
  - 每个 Tab: 类型图标 + 标题 (截断 max 15 字) + 关闭按钮 (hover 显示)
  - 最多 8 个 Tab, 超出显示 "..." 溢出菜单
  - 当前 Tab: accent-blue 下划线
  - 点击 Tab → 切换内容区 (不卸载组件, 用 display:none 保持滚动位置)
  - Ctrl+1-8 切换 Tab
  - 关闭 Tab → 导航到最右侧未关闭的 Tab
  - Tab 状态持久化到 localStorage (下次启动恢复)

与 SplitPane 的关系:
  - 单 Pane 模式: TabBar 管理主内容区
  - 分屏模式: 每个 Pane 有自己的 TabBar mini 版 (1-3 个 Tab)
  - Pane 聚焦时其 TabBar 高亮

ContextPanel 所有权:
  - D84 (Phase 21) 已扩展为 { paneId, sessionId } 二元组
  - Tab 切换 → sessionId 变更 → ContextPanel 自动更新为当前 Tab 的内容
```

**T2209 — Bookmarks 收藏夹 (3h, P2, D78)**

场景来源: 用户频繁访问特定内容 (参考文档/常用模板)

方案:
```
bookmarks 表: id, user_id, target_type, target_id, title, created_at
IPC: bookmark:add, bookmark:remove, bookmark:list
UI:
  - 侧边栏"洞察"组下新增"收藏"入口 (Lucide Bookmark 图标)
  - 收藏夹页: /bookmarks 路由, 列表显示所有收藏, 按时间倒序
  - 收藏按钮: 博客预览页/知识库预览右上角 → 空心/实心 Bookmark 切换
  - 右键菜单: 列表项右键 → "添加到收藏"
```

验收: 在博客预览页点 Bookmark 图标 → 已收藏。侧边栏"收藏"显示该博客。再次点击取消收藏。

**T2210 — MD 全量导出 (2h, P2)**

场景来源: 数据主权 (Obsidian 的核心价值之一)

方案:
```
npm run export-md:
  - 遍历所有博客 → 生成 .md 文件 (YAML frontmatter + Markdown 正文)
  - 输出到 workspace/Export/ 目录
  - 保留 wikilink: [[...]] 语法降级为 [标题](路径)
  - 知识文件原样复制 (PDF/DOCX 等)
  - 生成 index.md 目录页 (按标签/系列分组)
```

验收: `npm run export-md` → workspace/Export/ 下生成可被任何 Markdown 编辑器打开的知识库完整副本。

### 8.6 质量收尾

**T2211 — 键盘可访问性 + 全局打磨 (2h, P2)**

- 所有按钮/链接: `tabIndex` + `onKeyDown` (Enter/Space) — 对照 AGENTS.md 约束
- Tiptap 编辑器: Escape 退出聚焦模式, Ctrl+S 手动保存
- 侧边栏: Tab 键在导航项间移动
- 回收站: Delete 键快捷删除
- 参考: R220 (WikilinkSuggestion 键盘导航 — Phase 21 已修?), 补充遗漏的可访问性项

**T2212 — Phase 21 遗留修复 (3h, P0)**

- redo.md 当前开放的 P2/P3 项 (R198 MiniGraph forceSimulation, R207 graph ORDER BY, R208 batchDelete refs, R220-R224 终审等)
- tsc + build + test 验证全绿
- redo.md P0+P1+P2+P3 清零

**T2213 — 设置页更新管理 (3h, P2)**

问题:
- 当前 autoUpdater 完全自动: `autoDownload=true` + `autoInstallOnAppQuit=true`, 用户无感知、无控制
- 用户无法手动检查更新、无法选择是否下载、无法决定何时安装
- 设置页已有工作区/主题/备份/快捷键/启动/AI/关于等区块, 唯独缺少更新管理

方案:
1. 改造 auto-updater.ts: `autoDownload=false`, `autoInstallOnAppQuit=false`
2. 新增 IPC 通道: `app:check-update` (手动检查), `app:download-update` (手动下载), `app:install-update` (手动安装重启)
3. 保留 5 秒延迟自动检查, 结果仅通知 (不下载), 用户在设置页看到后自行决定
4. 新增 `UpdateSection` 组件嵌入 SettingsPage:
   - 显示当前版本 + 检查更新按钮
   - 状态流转: idle → checking → available/not-available → downloading (进度条) → downloaded (立即重启)
   - 每个阶段可取消/关闭, error 状态可重试
5. 监听 `onUpdateStatus` 事件驱动状态流转, `appCheckUpdate`/`appDownloadUpdate`/`appInstallUpdate` 驱动行为

组件: `<UpdateSection>` — 5 态: idle/checking/available/downloading/downloaded + error
IPC: app:check-update, app:download-update, app:install-update (3 通道)
验收: 设置页检查更新 → 看到版本信息 → 选择下载/稍后 → 下载进度 → 重启生效。全链路手动可控。

### 任务总览

| 任务 | 名称 | 类型 | 估算 | 优先级 | 状态 |
|------|------|------|------|--------|------|
| T2201 | HomePage 重构 + Obsidian Calendar — 三栏合并+统一"继续"面板+日历圆点系统(daily+schedule)+周数 | 体验 | 5h | 🟠 P1 | 📋 |
| T2202 | Blog↔KB 知识打通 — ContextPanel KB Tab+[@]浮动引用+KB 被引列表 | 体验 | 6h | 🟠 P1 | 📋 |
| T2203 | 被动知识发现 — embedding 相似度 Top-3 推荐+ContextPanel"推荐"Tab | 产品 | 4h | 🟠 P1 | 📋 |
| T2204 | AI 集成 — RAG 问答+编辑器AI(续写/摘要/润色)+自动标签 | 产品 | 22h | 🟠 P1 | 📋 |
| T2205 | 内容嵌入 Transclusion — ![[note]] 嵌入块+markdown-it 扩展+blockquote 渲染 | 产品 | 4h | 🟡 P2 | 📋 |
| T2206 | 结构化查询 Saved Search — 保存搜索条件+HomePage 快捷查询列表 | 产品 | 3h | 🟡 P2 | 📋 |
| T2207 | 时间轴视图 — /timeline 路由+垂直时间轴+类型/日期过滤 | 产品 | 2h | 🟡 P2 | 📋 |
| T2208 | 标签页系统 — TabBar+多文档并存+localStorage 持久化+与 SplitPane 协作 (D76) | 架构 | 8h | 🟠 P1 | 📋 |
| T2209 | Bookmarks 收藏夹 — bookmarks 表+IPC+右键菜单+侧边栏入口 (D78) | 产品 | 3h | 🟡 P2 | 📋 |
| T2210 | MD 全量导出 — npm run export-md → YAML frontmatter + wikilink 降级 | 工程 | 2h | 🟡 P2 | 📋 |
| T2211 | 键盘可访问性 + 全局打磨 — tabIndex+onKeyDown+Escape+CKbd+S 快捷键 | 质量 | 2h | 🟡 P2 | 📋 |
| T2212 | Phase 21 遗留修复 — redo P2/P3 清零+tsc+build+test 全绿 | 修复 | 3h | 🔴 P0 | 📋 |
| T2213 | 设置页更新管理 — 手动检查/下载/安装+进度条+版本展示+5态流转 | 工程 | 0.5h | 🟡 P2 | ✅ |

**🟠 P1 (5 项)**: ~45h | **🟡 P2 (7 项)**: ~16.5h | **🔴 P0 (1 项)**: ~3h | **总计: 13 项, ~65h**

### 实施顺序

```
Phase 22 前置修复 (🔴 P0, ~3h): T2212 Phase 21 遗留清零
  ↓
Phase 22A — UX 修复 (~9h): T2201 HomePage 重构 → T2202 Blog↔KB 打通
  用户可见: 首页不再冗长, 博客编辑器里一键引用知识库
  ↓
Phase 22B — 知识活化 (~18h): T2203 被动发现 → T2205 Transclusion → T2206 Saved Search → T2207 时间轴
  用户可见: 保存博客后系统推荐关联, ![[...]] 嵌入内容, 保存的查询一键直达
  ↓
Phase 22C — AI 集成 (~22h): T2204 RAG + 编辑器AI + 自动标签
  用户可见: 与知识库对话, AI 辅助写作, 自动建议标签
  ↓
Phase 22D — 工作流 (~13h): T2208 标签页 → T2209 Bookmarks → T2210 MD 导出 → T2211 键盘打磨
  用户可见: 多文档并开不打断, 收藏夹快速访问, 数据可导出
  (T2213 更新管理已提前完成 ✅, 仅剩 WindowApi 类型收尾 0.5h)
```

### Schema + IPC 变更

Schema: bookmarks 表 (id, user_id, target_type, target_id, title, created_at), 1 次 ALTER TABLE.
IPC: bookmark:add, bookmark:remove, bookmark:list (3 通道). T2204 AI chat 走 REST POST /api/chat.
T2213 更新管理: app:check-update, app:download-update, app:install-update (3 通道, ✅ 已实现).
搜索增强: ContextPanel "推荐"Tab 复用 embedding.worker + graph:getData.
SavedQuery 纯 localStorage, 零 Schema.
新路由: /timeline, /bookmarks.
新组件: `<TabBar>`, `<TransclusionBlock>`, `<Timeline>`, `<SavedQueryList>`, `<AIChat>`, `<BookmarkButton>` (UpdateSection 已提前完成 ✅)

### 不做的事 (明确排除)

| 项 | 理由 |
|----|------|
| E2E 加密 | Boss 明确说暂时不做 |
| PDF 批注/OCR/录音 | Scenario 1/4/5 需要, 但工程量过大 (~10h+), 且我们已有语义搜索兜底搜索能力 |
| 块级引用/拖拽重组 (Roam 式) | 需要 Tiptap→outliner 架构变更, 与我们"文档+wikilink"路线冲突 |
| 自定义仪表盘/数据库 (Notion 式) | 需要全新 UI 范式 + schema-free 引擎, 偏离"知识中枢"定位 |
| 脚本自动化 (Trilium 式) | 安全风险, MCP Server 已是外部可编程接口 |
| 闪卡系统 | 独立功能模块, 内容嵌入+被动发现更优先 |
| 画布视图 | 与知识图谱重叠, 等图谱使用数据验证后再评估 |

### Phase 22 场景对照

| suggest.md 场景 | Phase 22 覆盖 | 如何覆盖 |
|-----------------|-------------|---------|
| 1 林博士 (Obsidian) | ✅ 核心 | T2203 被动发现 (Vault Curate 等效) + T2205 Transclusion (内容嵌入) |
| 2 Alex (Notion) | ⚠️ 部分 | T2209 Bookmarks (代替数据库收藏) + T2208 标签页 (多任务) |
| 3 Sarah (Roam) | ⚠️ 间接 | T2208 标签页+分屏 (Sidebar 排练的替代: 多文档并排) |
| 4 大刘 (印象笔记) | ✅ 已有 | 剪藏 (Phase 21) + 语义搜索 (Phase 21) |
| 5 陈医生 (Logseq) | ✅ | T2206 Saved Search (Query 等效) + T2203 被动发现 |
| 6 周工 (Trilium) | ⚠️ 间接 | MCP Server (Phase 20) 是脚本替代, T2205 Transclusion |
| 7 林经理 (Joplin) | ❌ | E2E 加密明确排除 |
| 8 苏老师 (TiddlyWiki) | ✅ 核心 | T2205 Transclusion (嵌入) + T2207 时间轴 |

### Boss 裁决

| 编号 | 决策点 | 裁决 | 理由 |
|------|--------|------|------|
| **D89** | **E2E 加密** | **否决 (Phase 22)** | Boss 明确暂时不做 |
| **D90** | **闪卡 vs 被动发现** | **被动发现优先** | 被动发现每天自动触发, 闪卡需要用户主动投入。前者 ROI 更高 |
| **D91** | **PDF 批注 vs RAG AI** | **RAG AI 优先** | PDF 批注 ~10h 工程量大且用户群窄 (学术)。RAG 覆盖全部场景 |
| **D92** | **Notion 式数据库 vs 标签+wikilink** | **维持标签+wikilink 路线** | 自定义仪表盘/数据库需要全新范式, 偏离"精炼书房"设计语言 |
| **D93** | **HomePage "继续..." 面板** | **A — 统一 3 Tab 面板** | 合并"最近草稿"+"上次停留"+"最近素材"为一个紧凑面板 |
| **D94** | **T2213 更新管理已实现** | **A — 标记完成 + 补类型** | 功能完整存在 (3 IPC+autoUpdater+5态UI), 仅 WindowApi 类型声明滞后, 0.5h |
| **D95** | **Blog KB Tab 位置** | **A — 全迁 ContextPanel** | 统一入口降低认知负担, 不再保留底部临时入口 |
| **D96** | **日历同时加载 daily+schedule** | **A — 前端并发 2×noteList** | 零后端改动, 独立查询无需合并 API |
| **D97** | **Transclusion N 个嵌入块的 N+1** | **A — 前端批量 gather 后一次 IPC** | 收集所有目标 ID → kb:getBatch → 返回 Map |
| **D98** | **TabBar 状态与 SplitPane 的关系** | **A — 独立 TabContext** | 状态爆炸避免: TabBar 管"打开哪些", SplitPane 管"怎么排列", 正交分离 |
| **D99** | **AI 集成 15h 不够** | **B — 扩至 22h** | 三子功能独立完整, 拆开反增集成测试成本, 22h 对应现实估算 |

---

## 4. Phase 23 — "精炼书房" 📋

> 来源: Boss suggest.md (花笺/memos/Pogget/YouTrack/tiez 竞品分析) + Boss 使用者反馈
> 核心命题: Phase 22 让大脑"思考", **Phase 23 让书房"像一间书房"** —— 统一设计语言渗透到每个像素, 所有模块在同一套卡片/空白/柔色/国风体系里和谐共处, 白板作为中央粘合层把博客/KB/便签/任务串成一张可操作的知识网
> 竞品驱动: 花笺 (无框编辑器/桌面磁贴) / memos (卡片Feed/软渲染) / Pogget (拖入即导入/点击即打开) / YouTrack (白板双向同步) / tiez (剪贴板监听)
> 设计原则: 每改一处, 所有模块受益。卡片 > 行列表。空白分隔 > 实线分隔。hover 显操作 > 始终可见。柔色 > 高饱和。

### 9.1 视觉基础 — 所有模块的"皮肤"

**T2301 — 五套国风主题 + 自定义背景图 (7h, P1)**

> 替换当前 GitHub 暗色翻版 (#0d1117)。新建 `[data-theme]` 体系, 五套完整语义色表, 所有现有组件零改动（CSS 变量不变, 值被 theme 覆盖）。

五套主题:
```
暗色系 (3):
  墨砚 Inkstone — 端砚灰底 #1a1816 + 赭石铜赤强调。中性微暖, 新默认暗色
  茶竹 Tea-Bamboo — 深烘茶棕底 #1e1b17 + 干竹灰绿强调。有生命力, 不冷
  夜灯 Brass Lamp — 暖炭底 #1c1b19 + 旧黄铜强调。稳重沉静

亮色系 (2):
  宣纸 Rice Paper — 生宣冷白底 #f5f4f3 + 靛蓝强调。冷清有精神, 新默认亮色
  青瓷 Celadon — 青瓷胎白底 #f4f6f3 + 青釉玉色强调。唯一冷调亮色
```

每套主题是一个 `[data-theme="xxx"]` CSS 块, 14 个 token (bg-primary/secondary/sidebar/tertiary/code, text-primary/secondary/placeholder, border-default/emphasis, accent-blue/green/red/yellow, shadow)。语义别名 (`--color-accent` 等) 保证向后兼容。

核心铁律: 不刺眼 (饱和度<35%), 内容永远是主角 (边框 6-7% 几乎消失, 卡片面与底面亮度差仅 2-3%), 柔色 (无纯黑/纯白/高饱和), 全局 350ms 主题切换过渡。

背景图系统: `<body>` 底层用户图片 (Electron dialog → file://) + `::before` 中间层主题色 (opacity 滑块 0.85-0.98) + `#root` 顶层内容。图片加载失败回退纯色 + toast。

融合要点: 这是所有后续任务的**前置**——T2302 的 CSS 柔化、T2303 的无框编辑器、T2304 的磁贴颜色、T2305 的 KB 卡片色条、T2307 的白板卡片颜色——全部建在这套色表之上。

**T2302 — 博客展示去硬核化 + Markdown 渲染柔化 (4h, P1)**

> 参考 memos (usememos/memos) 博客列表卡片 feed + 纯 CSS markdown 元素柔化。

博客列表卡片化:
```
当前: 等高等宽行 + border-bottom 分隔线 → 电子表格感
改为: BlogCard 组件:
  ┌──────────────────────────────────────┐
  │ Docker 容器化部署实践                  │ ← text-lg font-semibold (视觉锚点)
  │ 3天前 · 12 分钟阅读                   │ ← text-xs text-placeholder (退后)
  │ Docker 容器化是现代运维的核心实践...    │ ← line-clamp-3 text-secondary (摘要预览)
  │ [部署] [Docker] [后端]       🔗 3    │ ← 标签 + 引用数
  │                           [···]     │ ← hover 才出现
  └──────────────────────────────────────┘
  不等高 (摘要长短不一 = 自然节奏) + mb-3 空白分隔 + 无限滚动
```

Markdown 10 个元素柔化 (纯 CSS, 不动 markdown-it 管线):
```
h2:       border-left 4px accent → border-bottom 1px + padding-bottom
blockquote: bg-secondary 灰底 → 透明底 + border-l-2 accent/30 + italic
code inline: red → accent 色 + rounded-md pill
code block: 蓝左边框 → 圆角 + 顶部语言标签 + [复制] 按钮 + highlight.js
a:         实线下划线 → underline-offset-2 + decoration-accent/50
img:       无圆角 → rounded-lg
hr:       默认粗线 → h-0 border-0 border-b border-default 细线
table:    硬边框 → 半透明边框
```

融合要点: BlogCard 被 T2306 标签页和系列页直接复用。代码块复制按钮在白板 (T2307) 中的 KB 卡片预览也生效。

### 9.2 模块升级 — 每个模块的"重塑"

**T2303 — 原地编辑 + 发布态实时预览 (4.5h, P1)**

> 参考花笺的单窗口多态 + memos 的双击行内编辑。不是新编辑器, 是编辑体验的革命。

```
/blog/:id 预览态 → 点"编辑" → 300ms 原地变形 → 编辑态:
┌────┬──────────────────┬──────────────┐
│侧栏│ 标题+正文 (无框编辑)│ 发布态预览     │
│    │ · border:none    │ wikilink解析  │
│    │ · bg:transparent │ transclusion  │
│    │ · 与预览态同字号  │ callout渲染   │
│    │ 浮动mini工具栏    │              │
│    │ [保存] [取消]     │              │
└────┴──────────────────┴──────────────┘
```

核心设计:
- **无框编辑器**: 不是"打开编辑框", 是"文字开始接受输入"。border:none / bg:transparent / padding:0, 与预览态共用同一套字号/行高/颜色
- **右栏发布态预览**: ContextPanel 编辑态自动切到"预览"Tab。markdown-it 完整管道渲染: wikilink→链接, transclusion→嵌入块, callout→最终样式。500ms 防抖刷新
- **浮动 mini 工具栏**: 选区附近出现 bubble (加粗/斜体/链接/行内代码), 不固定占空间
- **双入口**: variant="inline" (从预览进入, 轻量) / variant="full" (新建, 完整)

不新增路由 (`/blog/:id` 通过 `isEditing` 状态原地变形)。BlogEditor 抽取核心编辑器组件。

融合要点: 无框编辑器在 T2305 KB 重塑中直接复用 (KB 文本文档双击打开时用同一组件)。发布态预览的 markdown-it 管道在 T2302 markdown 柔化之后渲染, 视觉效果统一。

**T2304 — 便签系统改造 — 快捷便签 + 桌面磁贴 + 剪贴板 (8h, P1)**

> 参考花笺 Ctrl+Space 快捷便签 + 磁贴模式 + tiez-clipboard 剪贴板管理。便签从"侧边栏二等公民"升级为"随时呼出的生产力工具"。

三大子系统:
```
A. 快捷便签 (Ctrl+Space):
   BrowserWindow 420×320, frameless, alwaysOnTop, 屏幕中心弹出
   ESC隐藏(自动草稿) / 保存为便签 / 📌固定为桌面磁贴
   底部状态栏: 字数 + 剪贴板历史 popover

B. 桌面磁贴 (Note Tiles):
   每个磁贴一个 BrowserWindow (3-8个 × 30MB ≈ 90-240MB)
   可以拖到桌面任意位置 / 四角 resize / 右键换颜色
   6 种半透明色调 (同 T2301 主题适配)
   便签面板拖出或点击Pin按钮 → 磁贴从卡片位置"生长"出来

C. 剪贴板监听:
   主进程 500ms 轮询 clipboard.readText/readHTML/readImage
   MD5 去重 → clipboard_history 表
   隐私遮蔽: 手机号/身份证/邮箱正则打码
   设置页开关控制 (默认关闭)
```

数据: `clipboard_history` 表 (id/type/content/hash/summary/pinned/created_at), 自动清理 (默认 500 条)。

融合要点: 便签卡片可拖入白板 (T2307) 成为便签链接卡片。剪贴板条目右键"添加到白板"成为参考卡片。磁贴色调系统与 T2301 国风主题的色板对齐。

**T2305 — 知识库重塑 — 卡片画布 + 拖入导入 + 点击即开 (6.5h, P1)**

> 参考 Pogget "不搬运文件, 直接呈现。点击即用, 不预览。" 去掉 KB 列表页的中间预览层。

```
当前: 列表页 → 点文件 → 预览页 (多余!) → 点编辑 → 编辑器
改为: 卡片画布 → 点文件 → 中央栏直接打开编辑/查看器 (零预览页)

卡片画布:
  ┌──────┐ ┌──────┐ ┌──────┐  每张卡片: 类型图标 + 标题 + 摘要
  │📄    │ │📊    │ │🖼️   │  7 种文件类型 × 专属 Lucide 图标 + 强调色
  │Docker│ │数据   │ │架构图 │  点击 → 中央栏原地打开 (不跳路由)
  │部署   │ │分析   │ │      │  /knowledge?select=<id> 替代 /knowledge/:id
  └──────┘ └──────┘ └──────┘
```

拖入导入: 整个 KB 页面是 drop target。桌面文件拖入 → 自动导入 (复制到 kb-files/ → 分析类型/摘要 → 写入 knowledge_files 表) → 卡片 pop-in 动画。冲突裁决 (替换/保留两者/跳过)。大文件 (>50MB) toast 警告。

中央栏: 根据文件类型显示不同内容——.md/.txt/.csv → Tiptap 无框编辑器 (复用 T2303); .pdf → PDF 查看器; .docx → mammoth 渲染; 图片 → 图片查看器。

ContextPanel: 选中文件时显示元信息 + "被博客引用"列表 (refs 表) + "相关 KB 文件" (embedding 相似度)。

融合要点: KB 卡片可拖入白板 (T2307) 成为 KB 链接卡片。KB 标签筛选与 T2306 标签页联动 (Tag Cloud 选中标签 → KB 卡片网格同步筛选)。"被博客引用"列表点击博客 → SplitPane 右侧分屏打开 (KB + 博客同时可见)。拖入导入的 drop zone 与 T2306 侧边栏"收纳"入口形成空间协奏。

**T2306 — 侧边栏 + 标签页 + 系列页重塑 (6.5h, P1)**

> 导航体系从"功能菜单"升级为"空间门户"。侧边栏/标签云/系列卡片共用空白的 BlogCard 体系, 三个视图是同一家族的不同面孔。

侧边栏重塑:
```
┌──────────────────┐
│ Idiot  精炼书房   │
│                  │
│ ── 写作 ──       │  三分区 (写作/收纳/思考)
│ 📝 博客     12   │  选中 = 左侧 3px accent 竖条 + bg-tertiary
│ 📋 便签      5   │  (不是整行高亮)
│                  │  hover = bg-tertiary/50
│ ── 收纳 ──       │  icon 16px Lucide outline
│ 📂 知识库    8   │  数量 badge 右对齐
│ 🏷️ 标签     15   │
│ 📚 系列      4   │  白板入口在"思考"分区下
│ 🔖 书签      7   │  设置 + 回收站固定在底部
│                  │
│ ── 思考 ──       │
│ 🗺️ 白板      3   │
│                  │
│ ⚙ 设置           │
│ 🗑️ 回收站        │
└──────────────────┘
```

标签页:
```
无选中 → 标签云 (字号按文章数加权: 1-2篇→text-xs, 3-5→text-sm, 6-10→text-base, 11+→text-lg)
         搜索框实时过滤 chip
选中   → BlogCard feed (复用 T2302 卡片) + ContextPanel 关联标签/系列
         KB Tab: [博客(12)] [知识库(3)] 切换
         标签 chip 可拖入白板 → 智能标签卡片 (自动列出该标签所有博客)
```

系列页:
```
无选中 → 系列卡片: 系列名 + 文章数 + 目录预览(前4篇标题) + 标签
选中   → 有序 BlogCard feed (序号①②③标注) + 底部篇间导航条
         ContextPanel: 阅读进度 (localStorage checkbox) + 关联系列
```

融合要点: 三个视图用同一套 BlogCard (T2302)。侧边栏是进入每个视图的"门", 标签云是"索引", 系列是"书单", 博客 feed 是"书架"。四者在白板 (T2307) 上以卡片形态重新汇聚——侧边栏导航项拖到白板 = 创建链接卡片, 标签 chip 拖到白板 = 智能标签卡片, 系列卡片拖到白板 = 展开为有序卡片序列。

### 9.3 中央粘合 — 知识网的"桌面"

**T2307 — 白板 — 知识中枢的中央桌面 (11.5h, P1)**

> 参考 YouTrack Whiteboard "卡片是活的, 与项目数据双向绑定" + React Flow (MIT) 无限画布。砍掉只读 d3-force 图谱, 替换为可自由放置/连线/转化的知识桌面。

核心概念: 白板 = 无限画布 + 卡片 + 连线 + 文本块

卡片类型系统 (6 种 + 2 来源):
```
链接卡片 (从已有内容拖入, 双向同步):
  博客卡片 / KB卡片 / 便签卡片 / 书签卡片
  标题/摘要随原内容自动更新。双击→原地编辑。删除→仅从白板移除, 不删原内容

独立卡片 (在白板上创建, 可择机转化):
  想法卡片 → 右键"转化为..." → 博客 / 便签 / 任务
  任务卡片 → checkbox 状态流转: todo → in_progress → done
            (填补项目管理缺失)

文本块: 浮在画布上的标题/标签, 用于分区 ("本周待办" "参考资料")
```

核心交互:
- **创建**: 工具栏 [+卡片] [+任务] [+文本] / 空白处双击 / 从侧边栏/KB/便签拖入
- **连线**: 拖拽卡片边缘 handle → 到另一张卡片 → 创建连线 (关联/依赖/引用)
- **转化**: 独立卡片 → 右键"转化为博客/便签/任务" → 卡片变链接卡片
- **双向同步**: 博客标题改了 → 白板上卡片自动刷新。白板上双击编辑 → 原内容同步更新

数据模型: `whiteboards` 表 + `whiteboard_nodes` 表 (id/x/y/type/ref_type/ref_id/title/summary/color/task_status...) + `whiteboard_edges` 表 (source/target/type/label)。3 张新表, 零 ALTER TABLE。

技术: React Flow (MIT, ~200KB) 提供无限画布/节点渲染/边连线/缩放平移/小地图。我们定制 WhiteboardCard (6 种 type 切 render)、WhiteboardEdge (自定义样式+标签)、工具栏、双向同步服务。

融合要点: 白板是所有提案的**终点**。每个模块改造的"可拖入"能力在此汇聚:
```
T2302 BlogCard  ──拖入──→  博客链接卡片
T2305 KB Card   ──拖入──→  KB 链接卡片
T2304 便签卡片  ──拖入──→  便签链接卡片
T2306 标签 chip ──拖入──→  智能标签卡片
T2209 书签      ──拖入──→  书签卡片
```
白板上双击链接卡片 → T2303 原地编辑。白板上所有卡片的颜色/字体 → T2301 国风主题适配。白板是"精炼书房"的**书桌**——所有知识资产随手可取, 可视可连可操作。

图谱页 `/graph` → 302 重定向到 `/whiteboards`。

### 任务总览

| 任务 | 名称 | 类型 | 估算 | 优先级 | 状态 |
|------|------|------|------|--------|------|
| T2301 | 五套国风主题 — [data-theme] 体系+墨砚/宣纸/茶竹/夜灯/青瓷+背景图透明度 | 视觉 | 7h | 🟠 P1 | 📋 |
| T2302 | 博客去硬核化 — BlogCard 卡片Feed+10元素markdown柔化+代码块复制 | 视觉 | 4h | 🟠 P1 | 📋 |
| T2303 | 原地编辑 — 无框编辑器+发布态预览+浮动mini工具栏+isEditing原地变形 | 体验 | 4.5h | 🟠 P1 | 📋 |
| T2304 | 便签改造 — Ctrl+Space快捷便签+桌面磁贴(多BrowserWindow)+剪贴板监听 | 产品 | 8h | 🟠 P1 | 📋 |
| T2305 | KB重塑 — 卡片画布+7种文件类型图标+拖入导入+点击即开(删除预览页) | 产品 | 6.5h | 🟠 P1 | 📋 |
| T2306 | 导航重塑 — 侧边栏三分区+标签云加权字号+搜索+系列卡片+篇间导航 | 体验 | 6.5h | 🟠 P1 | 📋 |
| T2307 | 白板 — ReactFlow无限画布+6种卡片+连线+双向同步+砍图谱页 | 架构 | 11.5h | 🟠 P1 | 📋 |

**🟠 P1 (7 项)**: ~48h | **总计: 7 项, ~48h**

### 实施顺序

```
Phase 23A — 视觉基础 (~11h):
  T2301 五套国风主题 → T2302 博客去硬核化 + MD 柔化
  所有的"皮肤"和"字形"先到位, 后续模块改造才有统一的视觉基准

Phase 23B — 模块升级 (~25.5h):
  T2306 导航重塑 → T2303 原地编辑 → T2305 KB重塑 → T2304 便签改造
  导航先 (影响所有页面) → 编辑器 (博客/KB 共用) → KB → 便签
  每个模块复用前一个模块的组件: T2303 的无框编辑器→T2305 KB 编辑, T2302 的 BlogCard→T2306 标签/系列 feed

Phase 23C — 中央粘合 (~11.5h):
  T2307 白板
  最后: 所有模块的"可拖入"能力在白板上汇聚。T2301-2306 交付的卡片/编辑器/颜色系统全部在白板中复用
```

### Schema + IPC 变更

```
Schema (4 张新表, 零 ALTER):
  whiteboards (id/title/description/created_at/updated_at)
  whiteboard_nodes (id/whiteboard_id/x/y/width/height/node_type/ref_type/ref_id/title/summary/color/task_status/task_priority/task_estimate/text_content/created_at)
  whiteboard_edges (id/whiteboard_id/source_node_id/target_node_id/edge_type/label)
  clipboard_history (id/type/content/hash/summary/created_at/pinned)

settings 表新增 key:
  theme (TEXT, 'inkstone') / bgImage (TEXT, NULL) / bgOpacity (REAL, 0.95)
  clipboardEnabled (TEXT, 'false') / clipboardMaxItems (TEXT, '500')
  tile_positions (TEXT, JSON)

IPC 新增 (~20 通道):
  剪贴板: clipboard:toggle/status/list/delete/clear/copy-back + EVT_CLIPBOARD_CHANGED
  磁贴:   tile:create/destroy/update-color
  白板:   whiteboard:list/create/get/delete/node-* × 4/edge-* × 3/drag-from-*
          EVT_WHITEBOARD_NODE_SYNC/EVT_WHITEBOARD_NODE_UPDATED
  导出:   workspace:export-md (T2210 已实现)
  KB导入: kb:import-files + EVT_KB_IMPORT_PROGRESS

新增路由:
  /whiteboards / /whiteboards/:id
  /graph → 302 → /whiteboards
```

### 和已有 Phase 22 模块的联动

| Phase 22 模块 | Phase 23 怎么联动 |
|--------------|-----------------|
| TabBar (T2208) | 白板页是一个 Tab, 可从白板切回博客/KB 继续工作 |
| AI (T2204) | AI 自动标签建议可应用到 KB 卡片 + 白板任务卡片 |
| Transclusion (T2205) | 发布态预览中可见嵌入块最终效果 |
| Bookmarks (T2209) | 书签可拖入白板 → 书签链接卡片 |
| Saved Search (T2206) | 保存的查询在白板上可创建"动态搜索结果卡片" (Phase 24+) |
| 更新管理 (T2213) | 5 个国风主题 + 背景图设置均通过 settings 表持久化 |

### Boss 裁决

| 编号 | 决策点 | 裁决 | 理由 |
|------|--------|------|------|
| **D100** | **Phase 23 主题定位** | **"精炼书房"** | Phase 20 "信息架构" → Phase 21 "信息流动" → Phase 22 "知识活化" → Phase 23 "设计语言统一 + 中枢激活"。不改功能骨架, 改"皮肤的每一个毛孔" |
| **D101** | **便签编辑 Markdown vs 纯文本** | **纯文本, Phase 23+ 升级 mini Tiptap** | 快捷便签的核心价值是"快"。Markdown 编辑增加复杂度 |
| **D102** | **磁贴单画布 vs 多 BrowserWindow** | **多 BrowserWindow** | 原生 z-order/拖拽/resize, 3-8 个磁贴 90-240MB 可接受 |
| **D103** | **白板 vs 保留图谱** | **砍图谱, 建白板** | 图谱 d3-force 只读/不可控/无执行。白板可自由放置/连线/转化/双向同步 |
| **D104** | **剪贴板轮询 vs 原生 hook** | **500ms 轮询** | Electron 无原生 change 事件, 轮询对剪贴板场景够用 |
| **D105** | **markdown 渲染 react-markdown vs 保持 markdown-it** | **保持 markdown-it** | 不改渲染管线, 只改 CSS + 少量组件 (CodeBlock/TaskList)。风险最低 |

### 不做的事 (明确排除)

| 项 | 理由 |
|----|------|
| 实时多人协作 (YouTrack 多人光标) | 单机应用定位 |
| Gantt/Sprint 重型项目管理 | 任务是卡片+勾选框, 不是 Jira |
| 跨设备剪贴板同步 (tiez WebDAV/MQTT) | 离线定位 |
| 卡片自由拖拽重排 (Pogget 桌面布局) | 复杂度高, Phase 24+ |
| 白板导出为图片/PDF | Phase 24+ |
| 单链接展开为富卡片预览 (memos LinkMetadataCard) | Phase 24+ |

---

## 5. Phase 24 — "羽化" (Feathering) 📋

> 副标题: **从功能系统收敛为思考空间**
> 来源: Boss suggest.md + 战略裁决 + Auditor Shift-Left 审查 (D120-D126) + Boss 交互哲学讨论
> 核心命题: 不是"删代码"，是重新定义产品重心。从功能控制台收敛为思考空间——信息只在需要时出现，不永远挂着第二个 App。
> 设计原则: (1) 信息提示 ≠ 第二工作区 (2) 删入口再删代码, 先软后硬 (3) 永久可见 panel ≤ 1
> 目标: 包体积 -30%, 运行时内存 -20%, 首屏系统模块 ≤3, 正文宽度 +20%

**Boss 裁决记录**:
| 决策 | 议题 | 裁决 |
|------|------|------|
| D117 | T2403 引擎选择 | `@sqlite.org/sqlite-wasm` — 官方 WASM, 免编译 |
| D118 | T2404 范围 | 全量纳入, 不拆分 |
| D119 | D3 处置 | 全量删除含 GraphPage |
| D120 | LocalGraph 去留 | 删 — 纪律性 > 30KB |
| D121 | sqlite-wasm 验证 | T2403 前先跑独立验证脚本，失败则回退 sql.js |
| D122 | MySQL 反向迁移 | 提供 `npm run migrate:mysql-to-sqlite` (+2h) |
| D123 | MCP HTTP 清理 | 纳入 T2401 — 删 SettingsPage HTTP 文档 |
| D124 | mammoth/exceljs 动态导入 | 纳入 T2402 — 按 pdfjs-dist 模式改造 |
| D125 | Orb Drop Zone 安全 | 纳入 T2404 — URL/文件/文本 三层校验 |
| D126 | as any 清零 | 0 处（D3 删 + WhiteboardPage 接口 + Worker 封装） |

### T2401 — 废弃 MySQL 双后端与 Express Web Server (14h, 🔴 P0)

- 物理删除 `mysql2` 依赖、`src/server/` 整个目录 (Express/JWT/REST 路由, 19 files)
- 物理删除 `db-schema-mysql.ts`、所有 `toMySQL()`、`isUsingMySQL()` 分支
- MCP Server 仅保留 `stdio` 模式, 移除 HTTP 传输层
- Schema 同步从三处 DDL 简化为单处
- **D122**: 提供 `npm run migrate:mysql-to-sqlite` 一次性迁移脚本 (检测 MySQL 配置 → 全 12 表导出 → sqlite 写入)
- **D123**: SettingsPage 移除 HTTP MCP 模式文档, 仅保留 stdio。同步检查 README/AGENTS
- 验收: `grep -ri "mysql" src/` 零残留, `npm run server` 命令移除

### T2402 — 依赖瘦身: 清除 D3 + 重型库懒加载 + 死代码 (8h, 🟠 P1)

- **D120**: 物理删除 D3 全部: `GraphPage.tsx`, `MiniGraph.tsx`, **`LocalGraph.tsx`**, `d3`/`d3-force` 依赖
- ContextPanel "图谱" Tab 移除 (延 Phase 25+ React Flow 替代)
- 路由 `/graph` → 302 → `/whiteboards`
- **D124**: `mammoth`/`exceljs` → 动态 `import()` (按 pdfjs-dist 已有模式), `preview.service.ts` 对应函数改 async
- `knip` / `ts-prune` 死代码检测, 清理未使用 IPC 通道和组件

### T2403 — SQLite 引擎升级: sql.js → @sqlite.org/sqlite-wasm (10h, 🟠 P1)

- **D121 前置**: 先写独立验证脚本 (1-2h) — 验证 Node.js 环境下文件数据库/CRUD/FTS5/持久化。若 OPFS 不可用 → **回退方案 B1 (保持 sql.js)**, T2403 取消
- 替换 `sql.js` 为 `@sqlite.org/sqlite-wasm` (官方 WASM, 免编译, 性能更优)
- 重写 `src/main/db/index.ts`, 保持 `dbGet`/`dbAll`/`dbRun` 签名不变
- 验证 FTS5 全文搜索 + 87 单元测试全绿

### T2404 — The Orb 流体桌宠与全局收集器 (12h, 🟠 P1)

- 废弃现有 `pet.png` 独立窗口 (30MB+)
- 与快捷便签共用透明 BrowserWindow, 原生 HTML+CSS 绘制 SVG 流体光球, 内存 < 5MB
- IPC 状态感知: AI 思考→旋转, 拖入文件→漩涡
- 全局 Drop Zone: 接收文件/文本/URL, IPC 自动分类入库 (文本→便签/URL→剪藏/文件→KB)
- 点击 Orb → CSS transition 平滑放大为 420×320 快捷便签
- **D125**: 主进程 handler 安全校验 — URL 仅 http/https, 拒绝 file:///javascript:/内网IP; 文件扩展名+MIME 白名单; 文本 ≤10KB 截断

### T2405 — Phase 23 遗留修复 (8h, 🟡 P2)

- R338 (P1): bgImage:read IPC 路径穿越防护 — path.resolve + workspaceDir startsWith + 扩展名白名单
- R339 (P2): KB 冲突 "替换"/"保留两者" 行为分流 — 后端 kbImport 加 onConflict 参数
- **D126**: renderer `: any` / `as any` 清零 → 目标 0 处（D3 删除 ~10 处自动消失 / WhiteboardPage 定义 data 接口 / Worker hack 封装模块 / 保底 ≤5 处仅 Worker 豁免）
- Auditor 标记的其他体验断点

### T2406 — Interaction Collapse: 交互塌缩 (8h, 🟠 P1)

> **核心哲学**: 「信息只在需要时出现」— Inline Context 是信息提示，不是第二工作区。
> **执行策略**: 两阶段 — Stage A Soft Collapse (隐藏入口 → inline 化 → command 化 → 观察 7 天) → Stage B Hard Delete (删组件/Store/IPC/路由)。
> **为什么现在做**: 信息分裂式 UI 已在产生 bug/状态同步/认知负担——不是未来问题，是正在发生的问题。

**Part 1 — 删除 ContextPanel, 替代为 Inline Hover Preview**
- 删除 `ContextPanel` 组件 + route whitelist 逻辑 + `registerTabs`/`ownerSid` 竞态机制 + SplitPane 分屏状态
- Wikilink hover → inline popover preview (200ms delay, 复用已有 wikilink 解析管线)
- **信息边界** (防微型 ContextPanel 再生):
  | 允许 | 禁止 |
  |------|------|
  | title, excerpt, updatedAt, tags, related count, backlinks count | full editor, tab system, AI actions, graph preview, nested navigation, resize |
- 验收: `grep -r "ContextPanel" src/renderer/` → 0; `grep -r "registerTabs" src/renderer/` → 0

**Part 2 — 删除 Bottom Tabs, 替代为 Inline Chips**
- 删除标签/附件/引用/系列的底部 tab 栏组件
- 替代: 正文下方 inline chips — **严格限制 2 类**: (A) tags `#docker #k8s` (B) related links `Related: - xxx - xxx`
- **禁止清单** (防底部重长成 tabs): attachment manager, nested tabs, pagination, filter, expandable sections
- chips 不是 tabs — 不维护选中态/展开态/滚动位置
- 验收: 底部 tab 组件文件删除; `grep "BottomTab" src/renderer/` → 0

**Part 3 — Floating Tabs 改为 Continue Flow (思考流)**
- 保留 floating tabs 机制, 语义重定义: "打开的标签" → "思考流" (cognitive continuity)
- **数据来源 = 未完成思考**: [最近编辑] + [停留 >3min] + [未关闭/标记完成] + [7 天内] → continuation candidates
- 不是 open tabs, 不是 browser history, 不是 embedding relation
- UI: tab label 改为 continue context; 文案从"标签页"改为"继续"
- 验收: `grep "FloatingTab\|floatingTab"` 逻辑保留但 label 文案变更; 候选列表数据源可追溯

**Part 4 — 删除 Mini Graph + Full Graph Page**
- 删除 HomePage 迷你图谱组件 (MiniGraph) + LocalGraph 组件
- `/graph` → 302 `/whiteboards` (T2402 已处理路由, 本任务清理残余)
- 替代: related content list (纯文本链接列表, 不渲染 canvas/SVG)
- 验收: `grep "MiniGraph\|LocalGraph" src/renderer/` → 0

**Part 5 — State Collapse (工程收益)**
- 删除上述 panel 对应的 Zustand store slice (contextPanel, bottomTabs, graph, splitPane 等)
- 删除 resize observer / scroll sync / conditional rendering 对应的 useEffect
- 验收 (工程): renderer `useEffect` 调用减少 ≥5; `ResizeObserver` 引用减少 ≥3
- 验收 (产品, Boss 亲自验证):
  | 指标 | 目标 | 验证方法 |
  |------|------|----------|
  | 永久可见 panel ≤ 1 | 仅 sidebar 可永久存在 | 打开应用, 目视检查: 右侧/底部无永久系统 panel |
  | 正文宽度 ≥+20% | ContextPanel 删除后阅读区恢复 | 对比 T2406 前后博客预览页正文列宽度 |
  | 首屏系统模块 ≤3 | HomePage 同时竞争注意力的系统 ≤3 | 目视计数: sidebar + 主内容 + ? (不能更多) |

**两阶段执行**:
```
Stage A — Soft Collapse (~5h):
  隐藏入口 (ContextPanel 折叠按钮/底部 tab 栏/图谱入口)
  → Inline hover preview 实现
  → Command palette 集成 (search/recent/backlinks/related → Ctrl+K)
  → 观察 7 天: Boss 自己使用, 记录是否还想打开已隐藏的 panel

Stage B — Hard Delete (~3h, Stage A 观察期后):
  确认 ≥7 天未使用 + 替代方案稳定
  → 物理删除组件/Store/IPC/路由
  → 运行 grep 验收 + build 通过
```

### 任务总览

| 任务 | 名称 | 估算 | 优先级 |
|------|------|------|--------|
| T2401 | Runtime Collapse — 废弃 MySQL 与 Web Server (含 D122 迁移 + D123 文档) | 14h | 🔴 P0 |
| T2402 | Visualization Purge — D3/懒加载/死代码 (含 D120 LocalGraph + D124) | 8h | 🟠 P1 |
| T2403 | SQLite 升级 — sqlite-wasm (D121 先验证) | 10h | 🟠 P1 |
| T2404 | The Orb 桌宠重构 (含 D125 安全) | 12h | 🟠 P1 |
| T2405 | 遗留修复 — P2/P3 + any 清零 (含 D126) | 8h | 🟡 P2 |
| T2406 | Interaction Collapse — 交互塌缩 (两阶段: Soft Collapse → Hard Delete) | 8h | 🟠 P1 |

🔴 P0 (1): ~14h | 🟠 P1 (4): ~38h | 🟡 P2 (1): ~8h | **总计: 6 项, ~60h**

### 实施顺序 (Boss 最终裁定)

```
Phase 24A — 验证 + 破旧 (~32h):
  Step 0: T2403 验证脚本（D121 — 先跑 sqlite-wasm 可行性, 1-2h）
     ↓ 若通过 ↓                    ↓ 若失败 ↓
  T2403 完整迁移 (10h)          回退 B1 (保持 sql.js)
     ↓                             ↓
  T2401 Runtime Collapse (14h, 含 D122 迁移 + D123 文档)
  T2402 Visualization Purge (8h, 含 D3 + LocalGraph + D124)
  T2406 Stage A — Soft Collapse (5h, 隐藏入口 + inline hover + command palette)

Phase 24B — 立新 + 观察 (~20h):
  T2404 The Orb 桌宠 (12h, 含 D125 安全校验)
  T2406 观察期 (7 天, Boss 使用 → 记录 → 决定哪些 Hard Delete)

Phase 24C — 收尾 + 硬删 (~8h + 3h):
  T2405 遗留修复 (8h, 含 D126 as any 清零)
  T2406 Stage B — Hard Delete (3h, 确认 ≥7 天未使用 → 物理删除组件/Store/IPC/路由)
     ↓
  P0+P1+P2+P3 全零 🎉
```

---

## 6. 后续改进方向 (Phase 25+)

| # | 方向 | 优先级 | 说明 |
|---|------|--------|------|
| 1 | PDF 批注 + 批注→wikilink (Scenario 1/5) | 🟡 P2 | pdfjs-dist v4+ annotation layer |
| 2 | E2E 加密 + 加密导出 (Scenario 7) | 🟡 P2 | node:crypto AES-256-GCM |
| 3 | 内容克隆/同步嵌入 (Scenario 6) | 🟢 P3 | 一段内容多处嵌入, 改一处全更新 |
| 4 | 闪卡系统 (SM-2) | 🟢 P3 | 独立功能模块 |
| 5 | DOCX 编辑 (MD 往返) | 🟢 P3 | mammoth→MD→编辑→docx |
| 6 | XLSX 单元格编辑 | 🟢 P3 | 完整 spreadsheet |
| 7 | 国际化 i18n | ❌ 否决 | D18=C |

---

## 7. 代码质量基线

| 指标 | Phase 22 基线 | Phase 23 目标 |
|------|-------------|------|
| `strict` + `noUncheckedIndexedAccess` | ✅ | 维持 |
| `as any` (renderer) | 15 | 0 (T2405) |
| `: any` 类型标注 (renderer) | 15 | 0 (T2405) |
| 单元测试 | 87/87 pass (12 files) | 87+ pass (保持) |
| 🔴🟠🟡🔵 P0-P3 | **0/0/0/0** Phase 22 全零 | Phase 23 全零 |
| IPC 通道 | 114 (+3 bookmark +2 AI +3 update +1 export) ~123 | ~143 (+20 Phase 23) |
| 设计Token | Lucide SVG + 3色 + 无阴影动效 | 5 套国风主题 + [data-theme] 体系 |
| MCP Server | stdio CLI + Express 路由 | 维持 |
| 语义搜索 | Transformers.js + multilingual-e5-small | 维持, 白板"相关卡片"推荐复用 |
| AI 集成 | 内置 RAG 问答 + 编辑器 AI + 自动标签 | 维持, 白板"智能标签卡片"复用 AI 标签建议 |
| 标签页 | TabBar + 多文档并开 + localStorage | 维持, 白板作为 Tab 可切回 |
| 设计语言 | 功能化 — 行列表/实线分隔/高饱和 | **卡片化/空白分隔/柔色/国风** — 全模块统一 |

---

## 8. 输入格式规范

> **目的**: 保持文件精简。所有角色必须遵守。

### 添加任务

```
| TXXXX | 名称 — 一句话描述 | 类型 | Xh | P0/P1/P2/P3 | ✅ |
```

- 编号递增，Boss 分配。详细 spec 写在当前 Phase 下，每项 ≤5 行
- **Phase 结项后**移入 `docs/phase-archive.md`

### 添加裁决

```
| DXX | 决策点 | 裁决 | 一句话理由 |
```

- Auditor 提 → Boss 裁决。每 Phase ≤5 个。关闭后不保留

### 禁止放入的内容

| 禁止 | 应放何处 |
|------|---------|
| 已完成 Phase 的详细任务规格 | `docs/phase-archive.md` |
| 已关闭的裁决 | `docs/phase-archive.md` |
| 代码实现细节 | 代码注释 / PR description |
| Auditor 审查发现 | [redo.md](redo.md) |

---

## 9. 文件职责边界

| | todo.md | redo.md |
|------|---------|---------|
| **职责** | 功能路线图 — "要做什么" | 修复清单 — "什么坏了" |
| **核心内容** | Phase 表 + 活跃任务 + 改进方向 | 待修复 + 决策点 + 重构建议 |
| **谁写** | Boss (任务/优先级/裁决), Developer (状态) | Auditor (发现), Developer (修复), Boss (裁决) |
| **归档** | 完成 → `docs/phase-archive.md` | 关闭 → 本文件"历史摘要"段 |

---

## 10. 当前优先

| 优先级 | 事项 | 负责 |
|--------|------|------|
| 🔴 P0 | **Phase 24A 破旧** — T2403 sqlite-wasm 验证 → T2401 Runtime Collapse → T2402 Visualization Purge → T2406 Stage A Soft Collapse | Developer |
| 🟠 P1 | **Phase 24B 立新** — T2404 The Orb 桌宠 → T2406 观察期 (Boss 使用 7 天) | Developer + Boss |
| 🟡 P2 | **Phase 24C 收尾** — T2405 遗留修复 → T2406 Stage B Hard Delete | Developer |
