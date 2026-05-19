# 本地博客与知识库存储系统 — 待办事项

> 最后更新: 2026-05-19 07:21:13 | 自动同步

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

**总计**: ~592.8h (Phase 1-21)

> 已完成 Phase 的详细任务规格见 [docs/phase-archive.md](docs/phase-archive.md)。
> 关联: [redo.md](redo.md) (修复清单) | [docs/development-guide.md](docs/development-guide.md) (开发参考)

---

## 3. Phase 17 — 体验收尾 + 分发就绪 ✅

> 来源: Boss 使用者体验反馈 + todo.md 遗留 (T1504b) + redo.md P2 择优 (R207/R118)
> 核心命题: 修复剩余交互摩擦点，让应用达到可分发状态。零 Schema 变更。
> 结项日期: 2026-05-14 — 9/9 全部完成 ✅。IPC 93→95。

| 任务 | 名称 | 类型 | 估算 | 优先级 | 状态 |
|------|------|------|------|--------|------|
| T1701 | Web Tiptap 编辑器 (新建 WebEditorPage.tsx, D38=B) | 平台 | 3.5h | 🟡 P2 | ✅ |
| T1702 | 系列页修改系列名 (内联编辑 + blog:seriesRename IPC, D36=A) | 体验 | 1h | 🟡 P2 | ✅ |
| T1703 | 系列博客默认不出现在 BlogListPage (excludeSeries 参数) | 体验 | 0.5h | 🟡 P2 | ✅ |
| T1704 | 博客超链接安全跳转 (shell:openExternal IPC + 事件委托, D37=A) | 安全 | 2h | 🟠 P1 | ✅ |
| T1705 | 系列博客下一篇自动滚到顶部 (useEffect 监听 id) | 体验 | 0.5h | 🟡 P2 | ✅ |
| T1706 | 单实例应用锁定 (requestSingleInstanceLock) | 工程 | 1h | 🟠 P1 | ✅ |
| T1707 | Windows 安装包 (electron-builder NSIS) | 分发 | 4h | 🟠 P1 | ✅ |
| T1708 | 主进程 Service user_id 隔离 (R207) | 安全 | 4h | 🟠 P1 | ✅ |
| T1709 | 组件 `: any` 类型收敛 (R118, 14→5) | 质量 | 2h | 🟡 P2 | ✅ |

**🟠 P1 (4 项)**: ~11h | **🟡 P2 (5 项)**: ~7.5h | **总计: 9 项, ~18.5h**

### 实施顺序

```
Phase 17A (安全底线 ~6h): T1708 → T1704
Phase 17B (交互收尾 ~3h): T1702 → T1703 → T1705 → T1706
Phase 17C (分发+平台 ~9.5h): T1707 → T1701 → T1709
```

IPC 变更: 93→95 (+2: blog:seriesRename, shell:openExternal)

### 裁决记录

| 编号 | 决策点 | 裁决 | 理由 |
|------|--------|------|------|
| D36 | T1702 IPC 通道 | A — 新建 blog:seriesRename | blogSeriesSet 是单 blog 操作，系列改名需批量 UPDATE |
| D37 | T1704 IPC 桥 | A — 新增 shell:openExternal | IPC 层协议白名单校验，T1704 +0.5h |
| D38 | T1701 编辑器架构 | B — 新建 WebEditorPage.tsx | 桌面端 600+ 行状态机零改动，Web 端 ~150 行 |

### 驳回/延后

| 项 | 原因 |
|----|------|
| FTS5 全文搜索 (~8h) | Phase 18 |
| 嵌套文件夹 (~4h) | Phase 18 |
| R112 CRUD 双写 (~8h) | Phase 18 |

---

## 4. Phase 18 — 工程收官 + 产品收尾 ✅

> 来源: Developer 前线反馈 + Auditor 审计建议 + todo.md 遗留
> 核心命题: 清偿最大工程债 + 补上最大产品缺口。零列变更（FULLTEXT INDEX 不算 Schema 变更，D43=A）。
> 结项日期: 2026-05-14 — 7/7 全部完成 ✅。IPC 95→99。测试 27→49。

| 任务 | 名称 | 类型 | 估算 | 优先级 | 状态 |
|------|------|------|------|--------|------|
| T1801 | FTS5 全文搜索 — Worker 倒排索引，博客+知识库标题+正文 (D19=B) | 产品 | 8h | 🟠 P1 | ✅ |
| T1802 | CRUD 双写收敛 — shared handlers (R112) | 工程 | 6h | 🟠 P1 | ✅ |
| T1803 | 错误反馈通道 — uncaughtException → IPC → renderer Toast | 工程 | 2h | 🟡 P2 | ✅ |
| T1804 | Service 单元测试 — blog/knowledge/note/tag 各 3-5 条 (R117) | 质量 | 4h | 🟡 P2 | ✅ |
| T1805 | 编辑器空白闪烁修复 — 加载时保留上次内容/骨架屏 (R213) | 体验 | 0.5h | 🟢 P3 | ✅ |
| T1806 | Blog 映射函数统一 — rowToBlog/mapBlog/mapBlogRow→1 (R113) | 质量 | 1h | 🟢 P3 | ✅ |
| T1807 | 仪表盘/ContinueWriting loading+error 状态 (R211/R212) | 体验 | 1h | 🟢 P3 | ✅ |

**🟠 P1 (2 项)**: ~14h — FTS5 + CRUD 双写
**🟡 P2 (2 项)**: ~6h — 错误反馈 + Service 测试
**🟢 P3 (3 项)**: ~2.5h — 编辑器闪烁 + 映射统一 + 仪表盘 loading
**总计: 7 项, ~22.5h**

### 实施顺序

```
Phase 18A (工程根基 ~10h): T1802 CRUD 双写 → T1804 Service 测试
Phase 18B (产品能力 ~10h): T1801 FTS5 → T1803 错误反馈
Phase 18C (UX 收尾 ~2.5h): T1805 编辑器闪烁 → T1806 映射统一 → T1807 仪表盘 loading
```

先收敛 CRUD 再写测试（测试基于 shared handler），再上 FTS5。

### T1801: FTS5 全文搜索

**方案** (D19=B): Worker 线程维护倒排索引。
- sql.js 模式: Worker 中构建内存倒排索引（分词 + TF-IDF），启动时全量扫描 blogs + knowledge_files 建索引，后续增量更新
- MySQL 模式: 利用 MySQL 原生 FULLTEXT INDEX，`MATCH ... AGAINST`
- 分词: 前端分词用 `Intl.Segmenter`（浏览器内置，零依赖）
- 搜索入口: 全局搜索框（已有）→ 后端查索引 → 返回排序结果

**验收**: 搜索"docker 部署"能命中正文中的相关博客。中文分词正确。搜索结果按相关度排序。

### T1802: CRUD 双写收敛

**方案**: 抽取 `src/shared/handlers/` 共享 SQL 构建函数。
- `buildBlogListQuery(filters)` → `{ sql, params }`，Service 和 Server route 共用
- 先收敛 blog (create/update/delete/list)，再 knowledge
- Phase 11 的 `shared/blog-list.ts` 已证明模式可行

**验收**: blog.service.ts 和 server/routes/blog.ts 中无重复 SQL 字符串。改一处 WHERE 条件两边生效。

### T1803: 错误反馈通道

**方案**: `main process process.on('uncaughtException') → IPC event → renderer Toast`
- 不需要日志文件、不需要写盘。只做"出错了，告诉用户"这一个事
- 2h，零新依赖

### T1804: Service 单元测试

**方案**: 4 个最常改的 Service 各 3-5 条测试。
- blog.service: createBlog / updateBlog / deleteBlog / list
- knowledge.service: importFile / deleteFile / list
- note.service: createNote / togglePin / cleanOldNotes
- tag.service: createTag / updateTag / deleteTag

**验收**: `npm run test` 新增 15+ 测试，全部 pass。

### Boss 裁决

| 编号 | 决策点 | 裁决 | 理由 |
|------|--------|------|------|
| **D39** | FTS5 方案 | **继续 D19=B Worker 倒排** | Phase 15 已裁定，技术路线不变 |
| **D40** | CRUD 双写范围 | **先 blog + knowledge，后续扩展** | 6h 限定。note/tag/folder/reference 等后续 Phase |
| **D41** | Service 测试范围 | **4 核心 Service (Dev 估算), 不全覆盖** | 4h 够给高频改动上保险。全覆盖独立 Phase |
| **D42** | 错误反馈方案 | **最小通道 — uncaughtException + IPC + Toast** | 不建日志系统。只解决"用户看不到错"这一个问题 |
| **D43** | FULLTEXT INDEX 是否 Schema 变更 | **A — INDEX 不算 Schema 变更** | T1105 冻结的是表结构（列/表），不是索引。sql.js 侧 Worker 内存索引不变 schema.ts |
| **D44** | Worker 位置 | **A — Renderer Worker** | Intl.Segmenter 是浏览器 API。索引序列化到 localStorage 缓存 |
| **D45** | shared handler 范围 | **A — 共享 SQL 构建, 副作用各自处理** | 6h 限定。文件写入/草稿等副作用桌面和 Web 本来就不同 |

### 驳回/延后

| 提议 | 裁决 | 理由 |
|------|------|------|
| 组件状态收敛 R116 (~3h) | 延 Phase 19 | FTS5 + CRUD 双写优先级更高 |
| 键盘可访问性 (~2h) | 延 Phase 19 | v1 分发优先，可访问性 v1.1 |
| 嵌套文件夹 (~4h) | 延 Phase 19 | Dev 自己说"数据量涨了再做不迟" |
| Service 全覆盖测试 (6-8h) | 先 4 核心 4h | 跑通后再评估扩展范围 |

---

## 5. Phase 19 — 质量收敛 + 体验深化 ✅

> 来源: Phase 18 驳回/延后 + Auditor 审计 R137-R141 + UX 体验补缺
> 核心命题: 清偿已发现修复项 + 服务测试全覆盖 + 标签/自动保存/浏览历史/字数统计/笔记渲染
> 结项日期: 2026-05-16 — 8/8 全部完成 ✅。IPC 99。测试 79/79 (11 files)。

| 任务 | 名称 | 类型 | 估算 | 优先级 | 状态 |
|------|------|------|------|--------|------|
| T1913 | 10 项批修复 — R137-R139/R77/R115/R214/R216/R218/R219/R202 | 修复 | — | 🟡 P2 | ✅ |
| T1914 | 5 新 Service 测试文件 — folder/recycle/stats/preview/reference (30 tests, total 79) | 质量 | — | 🟡 P2 | ✅ |
| T1915 | 标签关联面板 — blogCount/kbCount 拆分 + 导航链接 | 体验 | — | 🟢 P3 | ✅ |
| T1916 | 博客自动保存 — 草稿恢复提示 + Toast 指示器 | 体验 | — | 🟢 P3 | ✅ |
| T1917 | 最近浏览历史 — localStorage LRU (max 10) + 仪表盘卡片 | 体验 | — | 🟢 P3 | ✅ |
| T1918 | 编辑器字数/阅读时间状态栏 | 体验 | — | 🟢 P3 | ✅ |
| T1919 | 便签 Markdown 渲染 — 每笔记切换纯文本/HTML 视图 (DOMPurify) | 体验 | — | 🟢 P3 | ✅ |
| T1920 | 构建+测试验证 — `npm run build` + `npm run test` 79/79 | 验证 | — | 🔴 P0 | ✅ |

### 实施顺序

```
Phase 19A (修复 ~?h): T1913 R137-R202 批修复
Phase 19B (测试 ~?h): T1914 5 新 Service 测试 → 总计 79 tests
Phase 19C (UX ~?h): T1915 标签面板 → T1916 自动保存 → T1917 浏览历史 → T1918 字数统计 → T1919 笔记渲染
Phase 19D (验证 ~?h): T1920 构建+测试全绿
```

### 驳回/延后

| 提议 | 裁决 | 理由 |
|------|------|------|
| 组件状态收敛 R116 (~3h) | 延后续 | 20/19/12 useState 性能可接受 |
| 键盘可访问性 (~2h) | 延后续 | v1 分发优先，可访问性 v1.1 |
| 嵌套文件夹 (~4h) | 延后续 | Dev 自己说"数据量涨了再做不迟" |

## 6. Phase 20 — 信息架构升级 ✅

> 来源: Boss 竞品分析（Obsidian/Notion/印象笔记）+ 用户痛点（内容孤岛/无今日锚点）
> 核心命题: 从"功能孤岛"升级为"知识中枢"——3栏布局 + [[双向链接]] + 关系图谱 + 今日中枢 + 设计语言重塑
> 设计隐喻: **"精炼书房"**（The Study）——内容即焦点、UI即画框、颜色即信号、空间即秩序
> 参考: Obsidian（链接+图谱）、Linear（克制色彩+3变量主题）、Bear（字体+留白）、Craft（卡片布局）

| 任务 | 名称 | 类型 | 估算 | 优先级 | 状态 |
|------|------|------|------|--------|------|
| T2001 | 设计Token升级 — CSS变量/Lucide图标/STYLE.md重写/托盘菜单去emoji/卡片去弹跳 | 设计 | 3h | 🟠 P1 | ✅ |
| T2002 | MainLayout 3栏 — 侧边栏固定+顶部栏升级+ContextPanel框架+响应式折叠(<1200px) | 架构 | 10h | 🟠 P1 | ✅ |
| T2003 | ContextPanel 组件 — React Context+所有权token防竞态(R186)+Tab切换+4个Tab | 架构 | 6h | 🟠 P1 | ✅ |
| T2004 | HomePage — 融合Dashboard+ContinueWriting+今日便签+快捷操作+迷你图谱+统计 | 体验 | 10h | 🟠 P1 | ✅ |
| T2005 | 今日便签 — memoType='daily'(应用层校验+D54/D57)+HomePage挂载自动创建+CalendarView打通 | 体验 | 2h | 🟠 P1 | ✅ |
| T2006 | [[wikilink]] — Tiptap扩展+DOMPurify管线(R174)+blog:update扫描diff(R173/D58)+Markdown渲染 | 产品 | 10h | 🟠 P1 | ✅ |
| T2007 | 上下文面板·链接Tab — 反向链接(refGetTo)+正向引用(refGetFrom)+点击跳转 | 体验 | 2h | 🟡 P2 | ✅ |
| T2008 | 上下文面板·大纲Tab — 博客/知识文件实时标题树+当前位置高亮 | 体验 | 1.5h | 🟡 P2 | ✅ |
| T2009 | 知识文件属性 — 4处迁移(R176)+结构化预设字段MVP(R185)+IPC+属性面板 | 产品 | 3h | 🟡 P2 | ✅ |
| T2010 | BlogEditorPage底部Tab化 — 标签/附件/引用/系列 垂直堆叠→水平Tab切换 (在T2002后做,R187) | 体验 | 2h | 🟡 P2 | ✅ |
| T2011 | 阅读主题精简 — 5→3主题+load时映射迁移(R183/D59)+切换器改版 | 体验 | 1h | 🟢 P3 | ✅ |
| T2012 | 关系图谱·数据层 — GraphNode/Edge/Data/Filter类型(R180)+graph:getData IPC+userId过滤(R181) | 产品 | 3h | 🟡 P2 | ✅ |
| T2013 | 迷你图谱 — Home页 D3力导向(15-20节点)+节点点击跳转 | 产品 | 3h | 🟡 P2 | ✅ |
| T2014 | 全屏图谱页 — /graph路由+类型/标签/日期过滤+缩放拖拽+悬浮详情 | 产品 | 4h | 🟡 P2 | ✅ |
| T2015 | CommandPalette — GlobalSearch升级(Ctrl+K)+内容搜索+命令列表+最近访问 | 体验 | 3h | 🟡 P2 | ✅ |
| T2016 | MCP Server — stdio独立CLI+HTTP Express路由(D55)+12 tools+JWT+默认只读 | 平台 | 8h | 🟢 P3 | ✅ |
| T2017 | 设计打磨 — 卡片去阴影+动效去弹跳+间距审计+色彩审计+旧token别名清理(R192) | 设计 | 2h | 🟡 P2 | ✅ |
| T2018 | 测试+build — 拆为验证(tsc+build,1h)+新功能测试(8-10h,R188)+三元态(R189)+abortedRef(R190) | 验证 | 10h | 🔴 P0 | ✅ |

**🟠 P1 (6 项)**: ~40h — 设计底座+3栏布局+首页+每日便签+[[链接]]
**🟡 P2 (9 项)**: ~23.5h — 上下文面板+属性+Tab化+图谱+命令面板+打磨
**🟢 P3 (2 项)**: ~9h — MCP Server+阅读主题
**🔴 P0 (1 项)**: ~10h — 测试验证
**总计: 18 项, ~82.5h (审计调整后)**

> 注: 这是本项目首个"不限工时"Phase（参考 Phase 19 模式）。以完成度为目标，非以工时限范围。结项标准: 18/18 ✅ + P0-P3 全零 + 测试全绿。

### 设计宣言

**设计隐喻**: "精炼书房"（The Study）——深夜书房，一盏台灯照在桌上。窗外是夜色，UI 是书架和桌面——低调、坚固、不抢戏。你进来不是为了玩，是为了思考和写作。

**三原则**:
- **I. 内容即焦点** — UI 是画框，不是画本身。写作/阅读时一切 chrome 隐退
- **II. 空间即秩序** — 每个元素有固定位置。侧边栏不躲闪，面板不漂浮
- **III. 颜色即信号** — 彩色仅标记"当前"(accent-blue)和"危险"(accent-red)。99% UI 用灰度层次

**设计参考**:
| 工具 | 借鉴什么 |
|------|---------|
| Linear | 3变量主题(暗黑+单色调+像素对齐)、LCH色彩空间、Lucide细线图标 |
| Bear | 字体专注(定制字体+留白)、UI隐退让内容说话 |
| Craft | SF字体+卡片布局+Apple原生感 |
| Obsidian | 链接索引Worker、右侧上下文面板、图谱交互模式 |

**视觉系统变化**:
| 维度 | 当前 | Phase 20 |
|------|------|---------|
| 导航图标 | Emoji (📝✎▤#⌂≡↺?⚙) | Lucide SVG (细线,跨平台一致) |
| 强调色 | 5色(蓝/绿/琥珀/红/紫) | 3色(蓝/绿/红),琥珀和紫移除 |
| 侧边栏 | 悬停展开(64→220px) | 固定220px,手动折叠→48px |
| 卡片 | 12px圆角+阴影+hover弹跳 | 8px圆角+无阴影+hover仅边框变色 |
| 动效 | fadeUp入场+edge-breathe呼吸 | 仅150ms颜色过渡+200ms面板滑出 |
| 阅读主题 | 5套(纸/夜/古/森/樱) | 3套(暗/亮/暖Sepia) |
| 首页 | 被动的"续写回顾" | 主动的"今日中枢" |
| Logo | `~/kb` 等宽终端风 | "Idiot" 文字+小图标 |

### 实施顺序

```
Phase 20A — 骨架 (~31h): T2001 设计Token → T2002 3栏布局 → T2003 ContextPanel 
  → 🔍 验证点: 14条路由在新布局下正常 → T2004 HomePage → T2005 今日便签
  用户可见: 打开后是全新首页，侧边栏固定，3栏布局就位

Phase 20B — 链接 (~19.5h): T2006 [[wikilink]] → T2007 链接Tab → T2008 大纲Tab 
  → T2009 知识文件属性 → 🔍 验证点: T2002稳定后 → T2010 底部Tab化 → T2011 阅读主题
  用户可见: 写博客输入[[自动补全，右侧面板显示反向链接和大纲

Phase 20C — 图谱+AI (~18h): T2012 图谱数据层 → T2013 迷你图谱 → T2014 全屏图谱 
  → T2015 CommandPalette → T2016 MCP Server
  用户可见: 首页迷你图+全屏图谱可探索，Ctrl+K命令面板，AI可接入

Phase 20D — 收尾 (~14h): T2017 设计打磨(清理旧token别名 R192) → T2018 测试验证
  最终: 18/18 ✅, P0-P3 全零, 测试全绿

关键依赖 (R187): T2010(BlogEditorPage底部Tab化)必须在T2002稳定验证后执行
关键守卫 (R186): ContextPanel用所有权token防跨页面Tab泄漏
关键迁移 (R192): T2001保留旧token别名(amber→text-secondary, purple→accent-blue), T2017统一清理
```

**R189/R190 防御规范**（所有新数据组件必须遵守）:
- 每个 `useEffect + fetch` 组件: loading/empty/error 三元态
- 每个 async 组件: `abortedRef` 竞态守卫 (R152 模式)
- 每个 toggle 按钮: `aria-expanded` + `aria-label` (R193)

### 关键设计决策

| 编号 | 决策点 | 裁决 | 理由 |
|------|--------|------|------|
| D46 | 侧边栏交互 | A — 固定展开, 手动折叠 | 空间记忆 > 屏幕空间。Obsidian/Notion/Linear 全部固定侧边栏 |
| D47 | 上下文面板宽度 | A — 280px, <1200px自动折叠 | Obsidian右侧栏参考。窄屏用浮层回退 |
| D48 | [[wikilink]] 范围 | A — 博客+知识文件+便签 三向链接 | 与refs表设计一致, 且这是解决"内容孤岛"的核心 |
| D49 | 图谱渲染引擎 | A — D3.js forceSimulation | 轻量(~20KB), 满足需求。不引入@antv/g6(~200KB) |
| D50 | 阅读主题 | A — 暗/亮/暖 3主题 | 5主题幼稚且无实用差异。Sepia是专业阅读模式(Bear/Medium同款) |
| D51 | MCP Server 定位 | A — 独立模块, stdio+HTTP双模式 | stdio给Claude Code, HTTP给Claude Desktop。复用Service层逻辑 |
| D52 | 设计Token颜色空间 | A — 保持HEX, 暂不迁移LCH | Linear的LCH方案更科学但成本高。Phase 20先用精炼HEX色板 |
| D53 | 首页 vs Dashboard | A — 合并为HomePage, /dashboard保留重定向 | 减少入口重复。Dashboard数据融入Home页 |

### T2006: [[wikilink]] 详细规格 (D58 扫描diff方案)

```
Tiptap 扩展:
  1. 监听输入, [[ 触发补全弹窗(光标位置悬浮, 非模态)
  2. 搜索范围: 博客标题 + 知识文件名 + 便签摘要
  3. 选择后: 编辑器插入 <a class="wiki-link" data-ref-type="blog|knowledge|note" 
     data-ref-id="N" href="/blog/N"> — 不主动调 IPC ref:add
  4. 支持别名: [[target|显示文字]]

引用持久化 (D58 方案 — blog:update 时统一处理):
  1. blog:update handler 收到保存请求
  2. 扫描 content HTML 中所有 .wiki-link → 提取 (source_type, source_id, target_type, target_id)
  3. SELECT 现有 refs WHERE source_id = blogId
  4. diff: INSERT OR IGNORE 新增的, DELETE 不再存在的
  5. 一次 SQL 事务完成创建+删除, 幂等, 可修复

DOMPurify 管线顺序 (R174):
  md.render(mdContent)              # Step 1: markdown-it 渲染, html:false 转义用户HTML
  → wikilink 正则替换 [[...]]       # Step 2: 匹配文本[[title]], 注入<a>标签(href为纯数字路径)
  → DOMPurify.sanitize(html)        # Step 3: 白名单过滤, 默认允许<a>拒绝javascript:
  → dangerouslySetInnerHTML         # Step 4: 渲染
  安全性: ①md.render已转义恶意HTML ②wikilink href=/blog/N非用户输入 ③DOMPurify最后防线

Markdown 渲染(便签/描述):
  1. 预处理正则: /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
  2. 查找对应内容ID → 替换为 <a href="...">
  3. 找不到目标: 显示灰色删除线文本

链接跳转:
  data-ref-type决定目标页面 — blog→BlogPreviewPage, knowledge→KnowledgeListPage, note→NoteListPage
```

### T2016: MCP Server 详细规格 (D55 拆分方案)

```
stdio 模式 (独立进程):
  src/mcp-server/
  ├── index.ts           # 独立 CLI 入口 (npm run mcp), process.stdin/stdout 流
  └── tools/             # 所有工具实现
      ├── search.ts, blogs.ts, knowledge.ts, notes.ts
      ├── tags.ts, refs.ts, stats.ts

HTTP 模式 (Express 路由):
  src/server/routes/mcp.ts   # POST /api/mcp/message
  复用: Express(端口3456) + JWT Cookie = 零CSRF增量(D55/D56)

工具实现层共享: src/mcp-server/tools/ — 两种传输共用同一工具实现
12 tools, 默认只读. create_note 需确认. HTTP模式复用JWT认证.

不引入第二端口, 不引入 CSRF 问题.
```

### R178: IPC 通道注册 5 步 Checklist

新增 IPC 通道 (graph:getData, note:getByDate, note:createDaily) 必须检查:
① `ipc-channels.ts` 常量定义  ② `main/ipc/*.ts` handler + `index.ts` register
③ `preload/index.ts` contextBridge 暴露  ④ `window-api.ts` 类型签名
⑤ `api-client.ts` webApi 降级 stub

### 数据层变更

| 变更 | 位置 | 说明 |
|------|------|------|
| refs CHECK 移除 | schema.ts L94-97 | **D54** — 改应用层 ReferenceService.addRef() 校验 |
| notes CHECK 移除 | schema.ts L109 | **D54** — 改应用层 NoteService.create() 校验, TS联合类型已是编译期守卫 |
| `knowledge_files ADD properties TEXT DEFAULT '{}'` | schema.ts + mysql.ts + db/index.ts + MYSQL_MIGRATIONS | **R176** — 4 处同步, T2009 实现前完成 |
| `notes.memo_type` 扩展 `'daily'` | 应用层校验, 无需 DDL | D54 方案 |
| 新增 `graph:getData` IPC | ipc-channels.ts + graph-handler.ts | 聚合 refs+tags, 带 userId 过滤(R181) |
| `refs` 表结构 | 不变 | source_type/target_type 存储字符串, CHECK 移除后放开到应用层 |

### 路由变更

| 路由 | 当前 | Phase 20 |
|------|------|---------|
| `/` | ContinueWritingPage | **HomePage** (今日中枢) |
| `/dashboard` | DashboardPage | → 重定向到 `/` |
| — | — | **新增 `/graph`** → GraphPage (全屏图谱) |

DashboardPage.tsx + ContinueWritingPage.tsx 删除 (D61). CalendarView.tsx 移入 `src/renderer/components/`.

### IPC 变更

新增: `graph:getData`, `note:getByDate`, `note:createDaily`
不变: 现有 112 通道全部保留
注: MCP 非 Electron IPC, 不列入 IPC 变更表 (R182)

---

## 7. Phase 21 — 编辑器进化 + 信息流动 + 知识连接 + 体验打磨 📋

> 来源: Boss suggest.md (12 提案逐条裁决, 10 纳入 + 2 延后) + Boss 竞品深度分析 (Obsidian 对比 — 8 剩余痛点中 5 个解纳入 Phase 21)
> 核心命题: Phase 20 建好了"知识中枢"的骨架, Phase 21 让它**真正活起来** — 编辑器变创作利器, 信息从外部流入, 知识之间长出连接, 体验达到可分发品质
> 设计原则: 优先做"每次打开都会用到"的功能, 砍掉"做完可能没人用"的
> 竞品驱动: Obsidian 对比后识别 8 个剩余痛点 — 分屏框架/快速切换/局部图谱 进入 Phase 21; 标签页/Bookmarks/数据主权 进入 Phase 22

### 纳入提案分析

**T2101 — 聚焦模式 + 通用分屏框架 + MD 分屏预览 ✅ 纳入 (9.5h, P1)**

纳入理由:
- 聚焦模式 ~2h, CSS dimming + Tiptap FocusMode Extension, 所有写长文的用户都会用
- MD 分屏预览 ~3h, 解决 md 格式用户"写完要看效果必须切页"的核心痛点
- Bear/iA Writer/Obsidian 标配功能
- 不采纳: 同步滚动 → 两侧独立滚动即可

**Phase 21 追加 — 通用 SplitPane 组件 (+2h)**:
- 根因: 当前主内容区是单路由模型, 用户写作+参考时被迫反复切换上下文。这是"空间复用 vs 时间复用"的问题——分屏是空间复用（同时看两样）, 标签页是时间复用（快速切换）。空间复用对写作流更重要
- 方案: T2101 的 MD 分屏不硬编码"编辑+预览", 而是构建通用 `<SplitPane>` 容器:
  - 两个 pane 插槽 `{children}`, 竖分割线 1px `--color-border`, drag 调整比例 (默认 50:50)
  - 响应式: 宽度 <900px 自动堆叠为上下布局
  - MD 分屏是第一个 use case, 配合 Ctrl+\\ 快捷键切换
  - 预览页可打开"右侧参考 pane" — 博客 A 在左 + 博客 B 在右
- 架构价值: 这是标签页系统 (Phase 22) 的前置条件。SplitPane 提供了容纳多内容的容器, Tabs 只需在此基础上加 TabBar
- 设计语言: 分割线极简 — hover 出现 2px accent-blue 竖线手柄。两个 pane 各自独立滚动。`内容即焦点` — 分屏时 chrome 进一步隐退（工具栏折叠为浮动 mini bar）

**Auditor 审查追加 — ContextPanel 所有权扩展 (+1.5h, D84=B)**:
- 问题: 当前 R186 所有权 token 是"单路由"模型 (`{ sessionId }`)。分屏下两个 pane 各有一个活跃内容, ContextPanel 该显示谁的上下文?
- 方案 (D84=B — ContextPanel 跟随焦点 Pane):
  - R186 所有权 token 扩展为 `{ paneId, sessionId }` 二元组
  - 每个 Pane 注册 `onFocus` 事件, 最后获得焦点的 Pane 拥有 ContextPanel
  - 点击左侧博客 A → ContextPanel 显示 A 的链接/大纲/图谱
  - 点击右侧博客 B → ContextPanel 切换到 B 的上下文
  - 与 Phase 22 标签页系统自然衔接: paneId 在无分屏时 = null, 在 TabBar 模式下 = tabId
- Obsidian 实际行为参考: 右侧面板始终跟随当前焦点文档

**T2102 — 斜杠命令 ✅ 纳入 (4h, P1)**

纳入理由:
- 复用 Phase 20 WikilinkSuggestion 弹窗机制, 技术基础已就绪
- Notion 已将 `/` 建立为行业标准交互, 新用户无需学习 Markdown 语法
- `/` → 搜索命令 → Enter 执行, 比点工具栏快 3-5 倍
- 不采纳: Callout (独立为 T2107) / Toggle (NodeView+details 编辑有已知 ProseMirror bug → 否决) / Embed (正则后处理脆�� → 否决)

**T2103 — 博客元数据面板 ✅ 纳入 (5h, P1)**

纳入理由:
- 当前博客标题/标签/系列/格式散布在不同位置, 元数据面板统一入口
- `cover_image` + `icon` 字段让博客有封面图和识别图标
- 不采纳: Emoji picker (用浏览器原生 Win+. ) / YAML 导出 (延后)

Schema: `blogs ADD cover_image TEXT` + `blogs ADD icon TEXT`

**T2104 — 搜索增强 + CJK修复 + 语义搜索 + Ctrl+O + 引用搜索统一 ✅ 纳入 (18h, P1)**

纳入理由:
- Snippet 高亮: FTS5 Worker 已有匹配位置, 只缺 UI 渲染 — Phase 20 "交付后第一分钟会发现的缺失"
- 搜索操作符 `tag:`/`type:`/`after:`/`before:` — 零新增 IPC, 纯前端解析
- `/search` 结果页 — 解决 CommandPalette 无法翻页的瓶颈
- 不采纳: 智能文件夹 (query builder 复杂 → 否决) / 最近搜索 (延后)

**Phase 21 追加 — CJK 搜索修复 (+3h, P0 级 bug fix, D83=A, D85=A)**:
- Bug 1 — 最小查询长度=2: `use-search.ts:139` 和 `GlobalSearch.tsx:42` 硬编码 `query.trim().length < 2`, 单个中文汉字直接被丢弃
- Bug 2 — CJK 分词粒度: `Intl.Segmenter` 将中文切分为词语, "部"不在"部署"的索引中
- Bug 3 — Bigram 单字搜索缺口 (Auditor 发现): 倒排索引是精确 term→doc 映射。bigram 方案下用户搜"部"(1字符) → 无法生成 bigram → Map 中查"部"→ undefined。因为索引中只有"部署"没有"部"
- 修复方案 (D83=A — Unigram + Bigram + Word 三层索引):
  1. 移除 2 字符最小限制 → 1 字符即可搜索
  2. **Unigram**: 对每个 CJK 字符单独索引。搜索"部"→ 直接查 unigram "部" → O(1) 匹配
  3. **Bigram**: CJK 相邻 2 字组合。"部署"→ bigram ["部署"]。搜索"部署"→ bigram 匹配 (权重 0.5)
  4. **Word**: 保持 Intl.Segmenter 词级索引。搜索"部署"→ word 匹配 (权重 1.0)
  5. 索引体积: 增量 ~200KB-1MB (unigram 数量 ≈ CJK 字符数), localStorage 限额内可接受
  6. 旧索引迁移: key `lbkb_fts_index` → `lbkb_fts_index_v3`, 旧 key localStorage.removeItem 清理
- 验收: 搜索"部"→ 查到标题含"部署"的博客。搜索"全"→ 查到"全文搜索"。搜索"文"→ 查到"Markdown"

**Phase 21 追加 — 快速文件切换 Ctrl+O (+1h, D74)**:
- 根因: Ctrl+K CommandPalette 是"命令发现"UI, 不适合"知道找什么"的瞬间跳转场景。探索式搜索 vs 目标式跳转的模态混淆
- 方案: Ctrl+O 作为 CommandPalette 的"极简模式"——同一搜索后端, 换轻量 UI:
  - 只搜标题+文件名, 不搜正文 (更快, 结果更精准)
  - 纯输入框 + 扁平结果列表 (max 4-6 条), 无分类区/命令列表/最近搜索
  - 每个结果: Lucide 类型图标 (FileEdit/Library/StickyNote) + 标题 + 路径片段
  - Enter 跳转, Esc 关闭, 上下键选择
  - 设计语言: 比 CommandPalette 更窄 (max-w 480px)、更轻 (shadow 仅 1px border)、更快 (debounce 100ms vs 300ms)。像在书房里直接走到书架前抽出那本书
- 与 Ctrl+K 的关系: 两种模式共存。Ctrl+K = 探索+命令, Ctrl+O = 瞬间跳转

**Phase 21 追加 — 本地语义搜索 (+6h, P1, D87=B)**:
- 根因: 关键词搜索只能做字面匹配。"哺乳动物"搜不到"鲸鱼"。用户需要"用【意思】搜索"
- 方案: 关键词 + 向量混合搜索 (Hybrid Search)
  ```
  模型: @xenova/transformers + Xenova/multilingual-e5-small (ONNX)
  ~120MB, 384 维向量, 支持 100+ 语言含中文, 首次空闲时后台下载 (idle-detection)
  
  架构 (D87=B — 独立 embedding.worker.ts):
    search.worker.ts — 纯文本索引 (Unigram + Bigram + Word) + TF-IDF 打分
    embedding.worker.ts — 模型加载 + ONNX 推理 + IndexedDB 向量缓存
    协调: use-search hook 管理双 Worker 生命周期 + 结果合并
    
  索引: 批量 embed 所有文档 → 向量存 IndexedDB (384 floats/doc ≈ 1.5KB/doc)
  搜索: search.worker 先返回关键词结果 → embedding.worker 异步返回语义结果 → 合并
  混合: final_score = 0.6 × vector_score + 0.4 × keyword_score
  内存: 无语义搜索需求时 terminate embedding.worker → 释放 ~200MB+
  降级: 模型下载中/失败/worker 错误 → 纯关键词搜索 (不影响基本使用)
  ```
- 为什么选 multilingual-e5-small:
  - Transformers.js 原生支持 (Xenova ONNX), 零 Python/零服务端
  - 专为语义搜索优化的 embedding 模型, 120MB 桌面可接受
  - 比 Qwen3-Embedding-0.6B (600MB) 小 5x, 比外部 API 离线优先
- 不采纳: Qwen3-Embedding-0.6B (600MB 太大) / 外部 API (离线优先) / 单 Worker (模型长期占内存)
- 验收: 搜索"如何让应用更快"→ 返回含"性能优化"的博客。搜索"python"→ 返回含"编程语言"的知识文件。降级路径: kill embedding.worker → 搜索正常返回关键词结果

**Auditor 追加 — 引用搜索统一 (+3h, D88=A)**:
- 问题: 当前存在两套搜索系统——全局搜索 (Ctrl+K) 走 search.worker.ts 的 TF-IDF 倒排索引，引用搜索 ([[自动补全]]) 走 `ReferenceService.searchItems()` 的 SQL `LIKE '%q%'`。后果: 引用搜索不搜正文、无 CJK 分词、无相关度排序。Phase 21 在 Worker 侧投入 ~9h 做 CJK 修复+语义搜索，如果引用搜索不接入 Worker，[[ 补全仍然是坏的
- 方案 (D88=A): 将 `searchItems()` 后端从 SQL LIKE 切换为调用 FTS5 Worker:
  - `ReferenceService.searchItems()` → 改为调用 `SearchService.searchAll()` 或直接 postMessage 到 Worker
  - Worker 搜索结果已含 `docType: 'blog' | 'knowledge'`，天然按 scope 过滤
  - ReferencePicker 和 WikilinkSuggestion 统一为同一搜索后端
  - 统一后: CJK 修复自动惠及引用搜索，零额外维护成本
- 关联修复: R226 (ReferencePicker scope='all' 而非 'knowledge') + R227 (WikilinkSuggestion 从 500 便签全量拉减为 Worker top-10)

**T2105 — 快速捕获 Ctrl+Shift+V ✅ 纳入 (1h, P1)**

纳入理由: ~30 行代码 (ShortcutService + clipboard + note:create), 极高 ROI。阅读时 Ctrl+C→Ctrl+Shift+V 零打断存入便签

**T2106 — 浏览器剪藏 ✅ 纳入 (5h, P2)**

纳入理由:
- Express `POST /api/clip` 路由, 复用 readability + turndown 管线 (核心技术全已有)
- Chrome 扩展右键菜单 → fetch localhost:3456 → 博客草稿, 信息流入的"最后一公里"
- 扩展文件 4 个 (manifest.json/popup.html/background.js/content.js), Manifest V3

**T2107 — Callout 提示块 ✅ 纳入 (3h, P2)**

纳入理由:
- 博客中需要"提示/警告/注意"语义块, 当前只能用 blockquote 模拟
- ProseMirror Node ~40 行, CSS 4 种类型各 1 行
- accent-amber 仅限 Callout 组件内部, 不作为全局 token (不违反 D52)

**T2108 — 博客置顶/颜色标记 + KB 空格预览 ✅ 纳入 (3h, P2)**

纳入理由:
- `is_pinned` + `color` 两个字段, 低成本实现常用组织功能
- 知识库空格键快速预览 — ~20 行键盘事件, 复用 preview.service.ts
- 不采纳: 卡片视图 (工程量大 → 延后) / 画廊视图 (文本文件不适配 → 否决) / 时间线 (已有)

Schema: `blogs ADD is_pinned INTEGER DEFAULT 0` + `blogs ADD color TEXT`

**T2109 — 体验打磨 ✅ 纳入 (6h, P2)**

纳入理由:
- 空状态设计 + 骨架屏: 新用户第一印象, 统一 visual language
- 标签合并: 用户用久了必然出现同义词标签, mergeTags 消除冗余
- 回收站倒计时: "还剩 3 天"比"已删除 X 天"更有紧迫感
- 不采纳: 页面过渡动画 (违反 Phase 20 设计语言 → 否决) / 版本时间线滑块 (延后) / 浮动目录 (ContextPanel 已有大纲 Tab → 否决) / 反向链接发现 (延后) / 标签层级 `/` 分组 (延后) / 设置页重构 (延后, 仅加 AI 配置区)

**Phase 21 追加 — 模板变量 (+1h)**:
- 根因: 模板系统 (Phase 7) 是静态文本片段。每日便签 (Phase 20 T2005) 成为日常入口后, 每天手动改日期从"小摩擦"升级为"日常重复劳动"。用户写了模板"今日计划 {{date}}", 每次插入后都要手动改日期
- 方案: `expandTemplateVars(template: string): string` — ~40 行纯函数解析器:
  - 变量: `{{date}}` → `2026-05-20`, `{{date:YYYY年MM月DD日}}` → `2026年05月20日`, `{{time}}` → `14:30`, `{{yesterday}}` → `2026-05-19`, `{{tomorrow}}` → `2026-05-21`, `{{title}}` → 当前文档标题
  - 集成点: 模板创建博客时、每日便签自动创建时、模板插入到编辑器时
  - 不支持: `{{#if}}`/`{{#each}}`/JavaScript 注入 — 这是"书房的日期印章", 不是编程语言

**T2110 — Phase 20 终审修复 ✅ 纳入 (4h, P0)**

纳入理由: redo.md 终审 ~18 项 P2/P3 开放项 → Phase 21 结项清零。关键修复: R207 graph LIMIT+ORDER BY, R208 batchDelete refs, R220 WikilinkSuggestion 键盘, R221 kb:set-properties refresh, R222 searchItems scope, R223 图谱 refresh

**T2111 — 局部图谱 (Local Graph) ✅ 纳入 (2h, P2) — Phase 21 追加**

纳入理由:
- 根因: Phase 20 做了全局图谱 (探索工具) + 迷你图谱 (点缀), 遗漏了局部图谱——"我现在在读这篇, 我只想看它的连接"。全局图谱是主动探索, 局部图谱是被动上下文。Obsidian 用户数据: 侧边栏局部图谱打开率 > 全屏全局图谱——因为它零操作、自动显示、就在右侧面板里
- 方案: ContextPanel 新增"图谱"Tab (放在"链接"和"大纲"之间), ~150 行组件:
  - 复用 Phase 20 D3 forceSimulation + graph:getData IPC, 参数 `{ scope: 'local', centerId, depth: 1 }`
  - 只展示当前内容 + 1 度邻居 (~5-20 节点)
  - 当前节点 accent-blue 大号圆点高亮, 邻居节点 `--color-bg-tertiary`
  - 连接线 `--color-border`, 无过滤控件/无缩放按钮/无图例 (280px ContextPanel 空间受限)
  - 节点点击 = 跳转到对应内容, 滚轮缩放
- 设计语言: `颜色即信号` — 当前节点 accent-blue, 连接节点灰度。`空间即秩序` — 固定大小 (280×240), 不随内容量变化。这是"地图上的'你在这里'"——不是完整的导航系统
- 代码复用: MiniGraph.tsx 的 D3 初始化/力模拟/tick 渲染逻辑直接复用, 改数据查询层

**T2112 — 知识库多格式编辑 + 预览增强 ✅ 纳入 (6.5h, P1) — Phase 21 追加**

纳入理由:
- 根因: 当前知识库的预览功能太弱——PDF 只有基础渲染, DOCX 预览丢失格式, TXT/MD 只能看不能改。知识库实际是"博客附件的堆放处", 不是真正的文件管理中枢。用户把 DOCX/XLSX/PDF 放进去后, 想做任何操作都只能导出→外部编辑器→重新导入
- 核心命题: 让知识库从"博客的附件仓库"升级为**独立的内容中枢**——能读、能改、能处理多种格式
- 设计语言: `内容即焦点` — 预览界面干净, 编辑模式下工具栏浮层出现。`空间即秩序` — 编辑按钮在预览右上角, 非侵入式

**可编辑格式 (Phase 21)**:
1. **TXT 纯文本** (~0.5h): Monaco Editor (electron-vite 已集成) inline 编辑。保存 → `knowledge:update-content` IPC → 写盘。语法高亮按扩展名自动选择
2. **MD Markdown 文件** (~1h): 复用 Tiptap 编辑器, 只读预览时用 markdown-it 渲染, 编辑时加载到 Tiptap。这是知识库与博客编辑器的**首次打通**——知识库里的 .md 文件可以直接用我们的编辑器修改
3. **CSV 表格** (~1.5h): 轻量表格编辑器 (<100行数据用 react-data-grid 或自建 table)。读→exceljs 解析→可编辑 Grid→exceljs 写回。超过 100 行降级为只读预览

**预览增强 (Phase 21)**:
4. **代码文件** (~0.5h): .ts/.js/.py/.json/.html/.css 等用 shiki 语法高亮渲染, 等宽字体, 暗色代码主题, 只读
5. **DOCX 预览升级** (~1h): mammoth 两次转换提升保真度——第一次 mammoth→HTML 作为基础, 第二次用 `docx-preview` 或 `officegen` 补充表格/图片对齐。目标是保留 80%+ 的原始排版
6. **XLSX 预览升级** (~1h): exceljs 读 → 可交互 HTML 表格 (排序点击列头/搜索过滤/分页), 支持多 Sheet 切换。单元格公式显示计算结果
7. **PDF 增强** (~0.5h): pdfjs-dist 升级到 v4+, 内嵌文本搜索, 页面缩略图导航, 页码跳转

**延 Phase 22**:
- DOCX 编辑: mammoth→MD→Tiptap 编辑→docx 导出 (需要可靠的 MD→DOCX 转换器)
- XLSX 单元格编辑: 完整 spreadsheet 体验 (需 react-data-grid + 公式重算)
- PDF 批注/表单填写: 用 pdf-lib 做基础编辑
- PPTX 预览: pptx-parser → 幻灯片渲染

**Auditor 审查追加 — 安全 + 架构补全 (+0.5h, D86=B)**:
- kb:updateContent 路径安全 (D86=B): DB 查 filePath (import 时服务端规范化生成) + path.resolve(workspace, filePath) + startsWith(workspace) 双重校验。防御路径遍历攻击
- Tiptap 实例: MD 编辑复用 Tiptap **库/组件** (创建新实例), 不复用博客编辑器的同一个编辑器实例 (避免编辑器内容污染)
- CSV 大文件: 先检查文件大小 >1MB → 直接降级只读, 不全文件上传再判断行数 (Auditor 发现 8)

---

### 否决/延后分析 (源自 suggest.md 12 提案)

**AI 集成 (原 T2108) → 延 Phase 22**

不纳入理由: ~15h (AI service + 编辑器操作 + RAG + 自动标签), 规模占半个 Phase。MCP Server (Phase 20) 已是 AI 基础设施底座。建议 Phase 22 作为"AI 集成"专题 Phase 集中做透。

**闪卡系统 (原 T2109) → 延 Phase 22**

不纳入理由: ~10h (review_cards 表 + SM-2 + FlashCardMark + 复习面板)。独立功能, 编辑器进化 + 信息流动更成熟后, 闪卡才有足够内容供给。

**画布视图 (原 T2110) → 延 Phase 22+**

不纳入理由: ~20h (3 表+6 IPC+SVG foreignObject+拖拽连线缩放)。几乎是一个独立应用。需单独评估是否与 Phase 20 知识图谱重叠。

**桌宠增强 (原 T2111) → 延 Phase 22**

不纳入理由: 拖放导入/双击便签/信息气泡都是锦上添花, 桌宠当前功能完整, 增强项边际价值低。

**Toggle 折叠块 / Embed 嵌入语法 (原 T2102 子项) → 否决**

Toggle 否决: NodeView + `<details>` 内嵌编辑在 ProseMirror 中有已知 bug, 跨版本行为不一致。Embed 否决: 纯正则后处理与 R174 wikilink 同类问题, 使用频率极低。

**智能文件夹 (原 T2105 子项) → 否决**

Query builder UI 复杂度高, 搜索操作符 `tag:`/`type:` 已覆盖 80% 场景, 边际价值不值成本。

---

### 任务总览

| 任务 | 名称 | 类型 | 估算 | 优先级 | 状态 |
|------|------|------|------|--------|------|
| T2101 | 聚焦模式 + 通用分屏框架 + MD 分屏预览 — FocusMode + `<SplitPane>` 通用容器 + Ctrl+\\ 分屏切换 + ContextPanel 焦点所有权 (D84) | 架构 | 9.5h | 🟠 P1 | 📋 |
| T2102 | 斜杠命令 — Tiptap SlashCommand (/→菜单)+ 14 种块命令 + 复用 WikilinkSuggestion 弹窗 | 体验 | 4h | 🟠 P1 | 📋 |
| T2103 | 博客元数据面板 — MetadataPanel + blogs cover_image/icon + 统一编辑入口 | 产品 | 5h | 🟠 P1 | 📋 |
| T2104 | 搜索增强 — CJK Unigram/Bigram/Word 修复 (D83) + embedding.worker 语义搜索 (D87) + ref:search 接入 Worker (D88) + 操作符 + Ctrl+O + /search 页 | 产品 | 18h | 🟠 P1 | 📋 |
| T2105 | 快速捕获 Ctrl+Shift+V — clipboard.readText→note:create, 零 UI 打断 (需确认 IPC 桥) | 体验 | 1.3h | 🟠 P1 | 📋 |
| T2106 | 浏览器剪藏 — POST /api/clip+readability/turndown+Chrome 扩展(4 文件 Manifest V3) | 平台 | 5h | 🟡 P2 | 📋 |
| T2107 | Callout 提示块 — Tiptap Callout Node (info/success/warning/danger)+CSS 左边框 | 体验 | 3h | 🟡 P2 | 📋 |
| T2108 | 置顶/颜色+KB 空格预览 — blogs is_pinned/color+6色圆点+Space 半屏预览 (Schema 与 T2103 合并迁移) | 体验 | 3h | 🟡 P2 | 📋 |
| T2109 | 体验打磨 — EmptyState+Skeleton+mergeTags+回收站倒计时+模板变量{{date}}+设置 AI 配置区 | 体验 | 6h | 🟡 P2 | 📋 |
| T2110 | Phase 20 终审修复 + D88/R226/R227 — R207/R208/R220-R224 等 P2/P3 清零+tsc+build+test | 修复 | 4h | 🔴 P0 | 🚧 |
| T2111 | 局部图谱 — ContextPanel Graph Tab + D3 1-degree + 当前节点高亮 + GraphFilter 扩展 scope/centerId/depth | 产品 | 2h | 🟡 P2 | 📋 |
| T2112 | 知识库多格式编辑+预览 — TXT/MD/CSV编辑 + DOCX/XLSX/PDF/Code预览增强 + kb:updateContent 双重路径校验 (D86) | 产品 | 6.5h | 🟠 P1 | 📋 |

**🟠 P1 (6 项)**: ~44.3h | **🟡 P2 (5 项)**: ~19h | **🔴 P0 (1 项)**: ~4h | **总计: 12 项, ~67.3h**

### 实施顺序

```
Phase 21 热修复 (🔴 P0, ~3h): T2104a CJK Unigram+Bigram+Word 三层索引修复 (D85=A) — 在所有新功能之前交付
  ↓
Phase 21A — 编辑器+搜索根基 (~26h): T2101 SplitPane+ContextPanel所有权 (D84) → T2102 斜杠命令 → T2103 元数据面板 → T2104b 语义搜索+embedding.worker (D87)
Phase 21B — 内容中枢 (~18h): T2105 快速捕获 → T2106 浏览器剪藏 → T2112 KB编辑预览 → T2111 局部图谱
Phase 21C — 打磨+修复 (~17h): T2107 Callout → T2108 置顶/颜色/预览 → T2109 体验打磨/模板变量 → T2110 终审修复
```

关键变更 (D85=A): CJK 修复作为独立热修复前置到所有 Phase 21 新功能之前。这是孤立变更, 不依赖 SplitPane/斜杠/元数据。
关键路径: T2101 SplitPane+ContextPanel (D84) → T2104 语义搜索 (在 CJK 修复后的 Worker 基础上叠加 embedding.worker)
Schema 合并: T2103 (cover_image/icon) + T2108 (is_pinned/color) = 一次 ALTER TABLE 4 列迁移 (发现 11)

### Schema + IPC 变更

Schema: blogs 表 +4 列 (cover_image/icon/is_pinned/color), T2103+T2108 合并为一次 ALTER TABLE (Auditor 发现 11). 三处 DDL 同步.
IPC: 新增 kb:setProperties, blog:setPinned, blog:setColor, kb:updateContent (D86 双重路径校验), note:clipboard (T2105 可能需要). 每个遵循 R178 5 步 checklist.
Worker: search.worker.ts (Unigram+Bigram+Word 三层索引 v3) + embedding.worker.ts (新建, D87=B, ONNX 推理). use-search hook 统一协调双 Worker.
新组件: `<SplitPane>` (通用分屏, ContextPanel 焦点所有权 D84), `<QuickSwitcher>` (Ctrl+O), `<LocalGraph>` (ContextPanel 图谱 Tab, GraphFilter 扩展 scope/centerId/depth), `<KbEditor>` (TXT/MD/CSV), `<CodePreview>` (shiki)
新依赖: `@xenova/transformers` (Embedding ONNX ~120MB), `shiki` (语法高亮), `react-data-grid` (CSV 可选)
模板引擎: `expandTemplateVars()` → `src/shared/template-vars.ts`
语义搜索: `src/renderer/lib/vector-search.ts` + `src/renderer/workers/embedding.worker.ts`

### Boss 裁决

| 编号 | 决策点 | 裁决 | 理由 |
|------|--------|------|------|
| D63 | Toggle 折叠块 | **否决** | NodeView+details 编辑在 ProseMirror 中有已知 bug |
| D64 | Embed `{{embed}}` | **否决** | 正则后处理脆弱, 使用频率极低 |
| D65 | 卡片+画廊视图 | **延 Phase 22** | 工程量大, 当前列表/表格功能完整 |
| D66 | 智能文件夹 | **否决** | Query builder 复杂, 操作符已覆盖 80% |
| D67 | AI 集成 | **延 Phase 22** | ~15h 专题, MCP Server 已是基础设施 |
| D68 | 闪卡系统 | **延 Phase 22** | ~10h, 需内容供给更丰富后再做 |
| D69 | 画布视图 | **延 Phase 22+** | ~20h, 需评估与图谱是否重叠 |
| D70 | 桌宠增强 | **延 Phase 22** | 锦上添花, 当前功能完整 |
| D71 | 页面过渡动画 | **否决** | 违反 Phase 20 设计语言 |
| D72 | Callout 中 accent-amber | **纳入 (局部)** | 组件级语义色, 非全局 token |
| **D73** | **T2101 分屏架构** | **A — 通用 SplitPane** | 架构滩头堡: 标签页 (Phase 22) 的前置条件 |
| **D74** | **Ctrl+O 快速文件切换** | **纳入 T2104 (+1h)** | 同一 FTS5 后端, 换轻量 UI |
| **D75** | **局部图谱** | **纳入 T2111 (+2h)** | 复用 D3 代码, ContextPanel 图谱 Tab |
| **D76** | **标签页系统** | **延 Phase 22** | ~8h, 需 SplitPane 就位 |
| **D77** | **模板变量** | **纳入 T2109 (+1h)** | ~40 行纯函数 |
| **D78** | **Bookmarks 收藏夹** | **延 Phase 22** | ~3h 独立模块 |
| **D79** | **CJK 搜索修复** | **纳入 T2104 (+2h) — P0 bug fix** | bigram 字符索引解决"标题里有字但搜不到"。移除 2 字符最小限制 |
| **D80** | **语义搜索方案** | **纳入 T2104 (+4h) — multilingual-e5-small** | 120MB ONNX 模型, Transformers.js 本地运行。Qwen3-Embedding-0.6B (600MB) 否决——太大。外部 API 否决——离线优先 |
| **D81** | **知识库编辑能力** | **纳入 T2112 (+6h)** — TXT/MD/CSV 可编辑; DOCX/XLSX/PDF/Code 预览增强 | 让知识库从"博客附件仓库"升级为"独立内容中枢"。DOCX 编辑 (MD 往返) 延 Phase 22 |
| **D82** | **语义搜索模型下载策略** | **A — 首次空闲时后台下载, 不阻塞搜索** | 下载中/失败 → 降级为纯关键词搜索。下载完成 → 静默启用。补充: app 空闲时触发下载 (idle-detection) |
| **D83** | **CJK 单字搜索的索引策略** (Auditor) | **A — Unigram + Bigram 双索引 (+1h)** | 搜索引擎标准做法。O(1) 查询, 索引体积可接受 |
| **D84** | **分屏 ContextPanel 所有权** (Auditor) | **B — 跟随焦点 Pane (+1.5h)** | R186 token 扩展为 `{ paneId, sessionId }` 二元组。与 Phase 22 标签页自然衔接 |
| **D85** | **CJK 修复调度优先级** (Auditor) | **A — 热修复前置, 所有新功能之前** | P0 bug 不等新功能。孤立变更, 不依赖 T2101-T2103 |
| **D86** | **kb:updateContent 路径安全** (Auditor) | **B — DB 记录+工作区边界双重校验** | 纵深防御。知识库首次文件写入, 多一层校验 |
| **D87** | **语义搜索 Worker 架构** (Auditor) | **B — 新建 embedding.worker.ts (+2h)** | 120MB 模型按需加载/卸载, 不污染 search.worker |
| **D88** | **引用搜索后端** (Auditor) | **A — 接入 FTS5 Worker (+3h)** | 消除搜索系统分裂。Phase 21 CJK 修复自动惠及引用搜索。保留 LIKE 意味着 [[ 补全仍然是坏的 |

---

## 8b. 后续改进方向

| # | 方向 | 优先级 | 目标 Phase |
|---|------|--------|-----------|
| 1 | 标签页系统 (TabBar+TabManager+多文档并开, D76) | 🟠 P1 | Phase 22 |
| 2 | AI 集成 (编辑器AI+RAG+自动标签) | 🟠 P1 | Phase 22 |
| 3 | Bookmarks 收藏夹 (bookmarks 表+IPC+右键菜单+侧边栏, D78) | 🟡 P2 | Phase 22 |
| 4 | 闪卡系统 (SM-2+标记+复习) | 🟡 P2 | Phase 22 |
| 5 | MD 全量导出 (npm run export-md → 博客导出为 .md 文件夹, 数据主权) | 🟡 P2 | Phase 22 |
| 6 | DOCX 编辑 (MD 往返: mammoth→MD→编辑→docx) | 🟡 P2 | Phase 22 |
| 7 | XLSX 单元格编辑 (完整 spreadsheet) | 🟡 P2 | Phase 22 |
| 8 | PDF 批注/表单填写 (pdf-lib) | 🟢 P3 | Phase 22 |
| 9 | 模板增强 (更多变量 + 模板市场) | 🟢 P3 | Phase 22 |
| 10 | 画布视图 | 🟢 P3 | Phase 22+ |
| 11 | 桌宠增强 (拖放/气泡/双击) | 🟢 P3 | Phase 22 |
| 12 | 卡片视图 + 智能文件夹 + 版本时间线滑块 | 🟢 P3 | Phase 22+ |
| 13 | 组件状态收敛 (R116) | 🟢 P3 | Phase 22 |
| 14 | 键盘可访问性 | 🟢 P3 | Phase 22 |
| 7 | 键盘可访问性 | 🟢 P3 | Phase 22 |
| 8 | 嵌套文件夹 | 🟢 P3 | Phase 22 |
| 9 | 国际化 i18n | ❌ 否决 | D18=C |

---

## 8. 代码质量基线

| 指标 | Phase 20 基线 | Phase 21 目标 |
|------|-------------|------|
| `strict` + `noUncheckedIndexedAccess` | ✅ | 维持 |
| `as any` (renderer) | 0 | 维持 |
| `: any` 类型标注 (renderer) | 0 | 维持 |
| 单元测试 | 87/87 pass (12 files) | 87+ pass (保持) |
| E2E 测试 | 11/11 pass | 维持 |
| 🔴🟠🟡🔵 P0-P3 | **0/0/0/0** 阻断 (P2/P3 延 Phase 21) | Phase 21 清零 |
| IPC 通道 | 114 (+2: graph:getData) | 115+ (+1: kb:updateContent) |
| 设计Token | Lucide SVG + 3色 + 无阴影动效 | 维持 |
| MCP Server | stdio CLI + Express 路由 | 维持 |
| 语义搜索 | — | Transformers.js + multilingual-e5-small (~120MB) |
| 知识库编辑 | 只读预览 | TXT/MD/CSV 可编辑 + DOCX/XLSX/PDF/Code 预览增强 |

---

## 9. 输入格式规范

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

## 10. 文件职责边界

| | todo.md | redo.md |
|------|---------|---------|
| **职责** | 功能路线图 — "要做什么" | 修复清单 — "什么坏了" |
| **核心内容** | Phase 表 + 活跃任务 + 改进方向 | 待修复 + 决策点 + 重构建议 |
| **谁写** | Boss (任务/优先级/裁决), Developer (状态) | Auditor (发现), Developer (修复), Boss (裁决) |
| **归档** | 完成 → `docs/phase-archive.md` | 关闭 → 本文件"历史摘要"段 |

---

## 11. 当前优先

| 优先级 | 事项 | 负责 |
|--------|------|------|
| 🔴 P0 | **Phase 21A 启动** — T2101 SplitPane → T2102 斜杠 → T2103 元数据 → T2104 CJK搜索修复 (P0 bug) + Auditor 立案前审查 | Developer + Auditor |
| 🟠 P1 | Phase 20 安装包实测 — 验证 dist2/Idiot_SetUp.exe 图片+图标是否正常 | Boss |
