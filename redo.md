# redo.md — 技术债与修复跟踪

> **定位**: 已发现但未修复的问题。历史审计档案见 [docs/history-audit.md](docs/history-audit.md)。
> **角色协作**: Auditor 写入 → Developer 修复 → Auditor 验证 → Boss 裁决。
> 最后更新: 2026-05-19 | Phase 21 终审

---

## 1. 格式规范

**新增工单**: `| RXX | 优先级 | 位置:行号 | 问题描述 |`  
**修复**: `| RXX | ✅ 已修复 — 修复方式 |`  
**验证**: `| RXX | ✅ / 🔄 — 证据 |`  
**决策**: `| DXX | 选项 A | 选项 B | 建议 | Boss 裁决 |`

---

## 2. 当前待修复

### 存留 (2 项 — 全非阻断)

| # | 优先级 | 位置 | 问题 | 裁决 |
|----|--------|------|------|------|
| R264 | 🟡 P2 | knowledge.ts:136 | `KB_SET_PROPERTIES` 用 `datetime("now")` 而非 `nowMySQL()` — 功能等价 | 延后 |
| — | 🟢 P3 | — | `tag:` 操作符需后端 tag 数据支持，Phase 22 实现 | 延后 |

---

## 3. 决策点

### Phase 21 — 全部已裁决 ✅

| 编号 | 决策 | 裁决 |
|------|------|------|
| D83 | CJK 索引策略 | A — Unigram+Bigram+Word |
| D84 | 分屏 ContextPanel | B — 跟随焦点 Pane |
| D85 | CJK 修复调度 | A — 热修复前置 |
| D86 | kb:updateContent 安全 | B — 双重校验 |
| D87 | 语义搜索 Worker | B — 独立 embedding.worker |
| D88 | 引用搜索后端 | A — 接入 FTS5 Worker |
| D63-D82 | Boss 提案裁决 | 见 todo.md |

### Phase 20 — 全部已裁决 ✅

| 编号 | 决策 | 裁决 |
|------|------|------|
| D54 | refs CHECK 约束 | A — 移除 CHECK |
| D55 | MCP Server 进程模型 | A — 拆分入口 |
| D56 | MCP HTTP CSRF | D55 自然解决 |
| D57 | 自动创建时机 | A — HomePage 挂载 |
| D58 | wikilink 引用删除 | A — 扫描+diff |
| D59 | 主题迁移 | A — 加载时映射 |
| D60 | 托盘菜单 emoji | A — 纯文本 |
| D61 | Dashboard/ContinueWriting 去留 | A — 删除 |
| D62 | 工时调整 | A — 不限工时 |

---

## 4. 摘要

**累计**: ~145 项修复 / 281 个工单 (R01-R281) / 88 个决策点 (D01-D88) / ~615h

**Phase 21 结项**: 🔴0 🟠0 🟡1 🟢1 | tsc 0 err | build ✅ | 87/87 pass | P0+P1 清零 ✅

**R251 修复**: `resolveTitles` 3 查询 + `AND user_id = ?`，`syncWikilinkRefs` 签名加 `userId`，5 处 callers 传递。blog.ts + knowledge.ts + note.ts。
**R272 修复**: `allResults` 按 `operators.typeFilter` 过滤，`type:blog`/`type:knowledge` 生效。
**T2105 修复**: shortcuts.ts `Ctrl+Shift+M` → `Ctrl+Shift+V`，与 spec 对齐。
