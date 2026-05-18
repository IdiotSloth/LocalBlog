# 本地博客与知识库存储系统 — 待办事项

> 最后更新: 2026-05-18 13:22:17 | 自动同步

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

**总计**: ~526.5h (Phase 1-20 计划)

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

## 7. 后续改进方向

| # | 方向 | 优先级 | 目标 Phase |
|---|------|--------|-----------|
| 1 | 组件状态收敛 (R116) | 🟢 P3 | Phase 21 |
| 2 | 键盘可访问性 | 🟢 P3 | Phase 21 |
| 3 | 嵌套文件夹 | 🟢 P3 | Phase 21 |
| 4 | 国际化 i18n | ❌ 否决 | D18=C |
| 5 | 移动端适配 (Web版响应式) | 🟢 P3 | Phase 21+ |

---

## 8. 代码质量基线

| 指标 | Phase 20 基线 | 目标 |
|------|-------------|------|
| `strict` + `noUncheckedIndexedAccess` | ✅ | 维持 |
| `as any` (renderer) | 0 | 维持 |
| `: any` 类型标注 (renderer) | 0 | 维持 |
| 单元测试 | 87/87 pass (12 files) | 维持 |
| E2E 测试 | 11/11 pass | 维持 |
| 🔴🟠🟡🔵 P0-P3 | **0/0/0/0** 阻断 (P2/P3 延 Phase 21) | Phase 21 清零 |
| IPC 通道 | 114 (+2: graph:getData) | 维持 |
| 设计Token | Lucide SVG + 3色 + 无阴影动效 | 维持 |
| MCP Server | stdio CLI + Express 路由 | 维持 |

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
| — | Phase 20 核心功能已完成 ✅ (18/18)。P2/P3 终审项延 Phase 21 收尾 | — |
| 🟡 P2 | Phase 21 启动 — 终审 R198/R207-R209/R220-R224 等 12+6 项修复 | Developer |
| 🔴 P0 | NSIS 安装包打包 + 图片验证 → ship | Boss |
