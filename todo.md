# 本地博客与知识库存储系统 — 待办事项

> 最后更新: 2026-05-16 15:48:13 | 自动同步

---

## 1. 图例与权限

| 标记 | 含义 |
|------|------|
| ✅ | 已完成 |
| 🚧 | 进行中 |
| 📋 | 待实施 |
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

**总计**: ~441.5h (Phase 1-19 计划)

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

## 6. 后续改进方向

| # | 方向 | 优先级 | 目标 Phase |
|---|------|--------|-----------|
| 1 | 组件状态收敛 (R116) | 🟢 P3 | 后续 |
| 2 | 键盘可访问性 | 🟢 P3 | 后续 |
| 3 | 嵌套文件夹 | 🟢 P3 | 后续 |
| 4 | 国际化 i18n | ❌ 否决 | D18=C |

---

## 6. 代码质量基线

| 指标 | 状态 | 目标 |
|------|------|------|
| `strict` + `noUncheckedIndexedAccess` | ✅ | 维持 |
| `as any` (renderer) | 0 | 维持 |
| `as any` (shared+preload) | 0 | 维持 |
| `: any` 类型标注 (renderer) | 5 处 | ≤3 (T1709 完成，14→5) |
| 单元测试 | 79/79 pass (11 files, +30 T1914) | 维持 |
| E2E 测试 | 11/11 pass | 维持 |
| 🔴🟠🟡 P0/P1/P2 | **0/0/0** — Phase 11 以来首次全零 | 维持 |

---

## 7. 输入格式规范

> **目的**: 保持文件精简。所有角色必须遵守。

### 添加任务

```
| TXXXX | 名称 — 一句话描述 | 类型 | Xh | P0/P1/P2/P3 | 📋 |
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

## 8. 文件职责边界

| | todo.md | redo.md |
|------|---------|---------|
| **职责** | 功能路线图 — "要做什么" | 修复清单 — "什么坏了" |
| **核心内容** | Phase 表 + 活跃任务 + 改进方向 | 待修复 + 决策点 + 重构建议 |
| **谁写** | Boss (任务/优先级/裁决), Developer (状态) | Auditor (发现), Developer (修复), Boss (裁决) |
| **归档** | 完成 → `docs/phase-archive.md` | 关闭 → 本文件"历史摘要"段 |

---

## 9. 当前优先

| 优先级 | 事项 | 负责 |
|--------|------|------|
| — | Phase 1-19 全部完成 ✅ (441.5h)。P0+P1+P2 持续全零。测试 79/79。 | — |
