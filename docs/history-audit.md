# 历史审计档案

> 收录 Phase 13-21 审计报告和决策点。工单详情见 [redo.md](../redo.md)，任务规格见 [phase-archive.md](phase-archive.md)。
> 最后整理: 2026-05-19 | Auditor | 压缩 redo.md 至 history-audit.md

---

## 1. 审计方法论

每次审计覆盖六个维度：

| 维度 | 检查内容 |
|------|----------|
| **安全性** | XSS/注入/Electron sandbox/路径穿越/权限隔离 |
| **数据完整性** | Schema 三处同步/时间戳正确性/方言翻译/CASCADE/外键 |
| **类型安全** | noUncheckedIndexedAccess/as any 密度/WindowApi-IPC 对齐/跨进程契约 |
| **冗余性** | Server-Main 双写/IPC 通道重复/映射函数重复/死代码 |
| **可维护性** | 组件复杂度/目录约束/新依赖合规/错误处理一致性 |
| **健壮性** | ErrorBoundary 覆盖/空状态/Loading 状态/超时保护/资源清理 |

---

## 2. 架构趋势 (Phase 14 → Phase 21)

| 指标 | Phase 14 | Phase 16 | Phase 18 | Phase 20 | Phase 21 |
|------|----------|----------|----------|----------|----------|
| IPC 通道数 | 91 | 93 | 99 | 115 | 120 |
| `as any` (renderer) | 0 | 0 | 0 | 0 | 6* |
| `: any` (renderer) | — | 15 | 5 | 0 | 4* |
| tsc 错误 | 0 | 0 | 0 | 0 | 0 |
| 测试 | — | — | 49/49 | 87/87 | 87/87 |
| P0/P1/P2 开放 | — | — | 0/0/0 | 0/0/0 | 0/3/3 |
| 健康度综合 | 9.0 | 7.9 | — | — | 8.5 |

> *`as any`/`:any` 全为 D3 worker/全局状态桥接等预存项。Phase 21 新增文件零新增。

---

## 3. Phase 19 审计 (2026-05-16~17)

### 实施审计 (5/16)
**8/8 全部完成。** 构建 ✅ 测试 79/79。IPC 99→100。P0+P1+P2 从 4/0/3 降至 0/0/0。

关键修复: R137-R141 + R77 + R115 + R202 + R214 + R216 + R218 + R219 (10 项批修复)

### 全量审计 (5/17)
4 Agent 并行。发现 12 新工单: P0 1 (R158 迁移缺列) + P1 1 (R159 note SELECT 缺 user_id) + P2 5 + P3 5。健康度 7.7/10。首次检测 P0 数据丢失级。

### 全量审计修复 (5/17)
12/12 + `:any`→0 全部修复 ✅。构建 51+2+225 ✅。测试 87/87 ✅。`: any` renderer 首次达成 0。

---

## 4. Phase 20 审计 (2026-05-18)

### 立案前审查
4 Agent 并行规格审查。24 项问题: P0 5 + P1 5 + P2 8 + P3 6。9 项 Boss 裁决 D54-D62。健康度 4.7/10。

关键 P0 发现: R170 refs CHECK 冲突 / R171 notes CHECK 冲突 / R172 MCP 进程模型 / R173 非原子 ref / R174 DOMPurify 管线

### 终审
18/18 全部完成 ✅。修复: 管道三重断裂(R206) / batchDelete 崩溃(R204/R205) / syncWikilinkRefs 事务(R207)。新增: wikilink / 图谱 / 3栏布局 / MCP Server / CommandPalette / 设计系统重塑。

---

## 5. Phase 21 审计 (2026-05-19)

### 规格审查
4 Agent 并行。发现 5 个 D 编号 D83-D88: CJK 索引策略 / 分屏 ContextPanel / 热修复调度 / 路径安全 / 语义搜索 Worker。Boss 全部裁决 ✅。

### 引用搜索排查
发现搜索系统分裂: ref:search 用 SQL LIKE vs 全局搜索用 FTS5 Worker → R225/R226/R227 + D88。

### 实施审计 (首轮)
4 Agent 并行。发现 23 新工单: P0 3 (R228 metadata.title / R229 buildEmbeddingIndex 空函数 / R230 word TF bug) + P1 5 + P2 7 + P3 6。

### 深度审计 + 规格差异
4 Agent 并行。任务完成度: 4/12 全完 + 8 PARTIAL。P0 2: R249 PDF RCE + R250 openSplit 死代码。P1 8 规格缺口。

### 终审修复验证 (多轮)
R228-R230 修 + R249-R250 修 + R271-R275 修 + R276-R281 修 + D88 修。全部验证通过 ✅。

关键架构成果:
- CJK Unigram+Bigram+Word 三层索引 + 语义搜索 (multilingual-e5-small)
- SplitPane 通用分屏 + ContextPanel D84 所有权 + Ctrl+\ toggle
- 斜杠命令 18 条 + Callout Tiptap Node + 模板变量
- 搜索统一 (D88 searchDirect 替代 SQL LIKE)
- 浏览器剪藏 Chrome Extension + TAG_MERGE
- 知识库多格式编辑 + DOCX/XLSX/PDF 预览增强
- 指南页重写 (Lucide + 配图)
- shiki 语法高亮 + Skeleton + EmptyState

### 存留 (3 项非阻断)
R251 resolveTitles 跨用户 / R264 KB_SET_PROPERTIES datetime / R272 搜索操作符未过滤

---

## 6. 决策点索引 (Phase 18-21)

### Phase 21 (D63-D88)

| 编号 | 决策点 | 裁决 |
|------|--------|------|
| D63-D72 | Boss 原始提案裁决 (Toggle/Embed/视图/AI/闪卡等) | 见 todo.md |
| D73 | T2101 分屏架构 | A — 通用 SplitPane |
| D74 | Ctrl+O 快速切换 | 纳入 T2104 |
| D75 | 局部图谱 | 纳入 T2111 |
| D76 | 标签页系统 | 延 Phase 22 |
| D77 | 模板变量 | 纳入 T2109 |
| D78 | Bookmarks | 延 Phase 22 |
| D79 | CJK 搜索修复 | 纳入 T2104 (P0) |
| D80 | 语义搜索方案 | multilingual-e5-small |
| D81 | 知识库编辑能力 | 纳入 T2112 |
| D82 | 模型下载策略 | A — 首次空闲后台下载 |
| D83 | CJK 单字搜索索引 | A — Unigram+Bigram+Word |
| D84 | 分屏 ContextPanel | B — 跟随焦点 Pane |
| D85 | CJK 修复调度 | A — 热修复前置 |
| D86 | kb:updateContent 安全 | B — 双重校验 |
| D87 | 语义搜索 Worker | B — 独立 embedding.worker |
| D88 | 引用搜索后端 | A — 接入 FTS5 Worker |

### Phase 20 (D46-D62)

| 编号 | 决策点 | 裁决 |
|------|--------|------|
| D46-D53 | 设计/架构决策 (侧边栏/面板/链接/图谱/主题等) | 见 todo.md |
| D54 | refs CHECK 约束 | A — 移除 CHECK |
| D55 | MCP Server 进程模型 | A — 拆分入口 |
| D56 | MCP HTTP CSRF | 由 D55 解决 |
| D57 | 自动创建时机 | A — HomePage 挂载 |
| D58 | wikilink 引用删除 | A — 扫描+diff |
| D59 | 主题迁移 | A — 加载时映射 |
| D60 | 托盘菜单 emoji | A — 纯文本 |
| D61 | Dashboard/ContinueWriting 去留 | A — 删除 |
| D62 | 工时调整 | A — 不限工时 |

### Phase 18 (D39-D45)

| 编号 | 决策点 | 裁决 |
|------|--------|------|
| D39 | FTS5 方案 | Worker 倒排 |
| D40 | CRUD 双写范围 | blog + knowledge 先行 |
| D41 | Service 测试范围 | 4 核心 Service |
| D42 | 错误反馈方案 | uncaughtException→IPC→Toast |
| D43 | FULLTEXT INDEX | A — INDEX 不算 Schema 变更 |
| D44 | Worker 位置 | A — Renderer Worker |
| D45 | shared handler 范围 | A — SQL 构建 |

---

## 7. 安全里程碑

| Phase | 里程碑 | 日期 |
|-------|--------|------|
| Phase 11 | DOMPurify XSS + catch{} 全量修复 + DB 参数化 | 2026-05-06 |
| Phase 14 | `as any` renderer 32→0 | 2026-05-07 |
| Phase 15 | `noUncheckedIndexedAccess` 永久启用 | 2026-05-08 |
| Phase 16 | Server user_id 隔离 4 P1 全部修复 | 2026-05-08 |
| Phase 16 | IPC 事件硬编码全量替换 | 2026-05-08 |
| Phase 17 | Service user_id 6/6 UPDATE/DELETE 全量守卫 | 2026-05-14 |
| Phase 17 | renderer `: any` 14→5 | 2026-05-14 |
| Phase 18 | CRUD 双写收敛 blog+knowledge | 2026-05-14 |
| Phase 18 | FTS5 Worker 倒排索引 + MySQL FULLTEXT | 2026-05-14 |
| Phase 18 | P0+P1+P2 首次全零 ⭐ | 2026-05-14 |
| Phase 19 | renderer `: any` → 0 (首次归零) ⭐ | 2026-05-17 |
| Phase 20 | wikilink/图谱/3栏/MCP/设计系统 | 2026-05-18 |
| Phase 21 | CJK 三层索引/语义搜索/分屏/搜索统一 | 2026-05-19 |
| Phase 21 | XSS 全量修复 (PDF/DOCX/XLSX/CSV 预览) | 2026-05-19 |
