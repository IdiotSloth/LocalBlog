---
name: pre-audit
description: Phase specification review (Shift-Left Audit) — performed BEFORE any code is written. Use when Boss has written a new Phase in todo.md and needs architecture validation, spec gap detection, dependency conflict analysis, and risk assessment. Triggers on: "规格审查", "shift-left", "Phase N 审查", "Phase N spec", "立案审查", "开工前审查", "评估 Phase", "审查 todo.md", "D-编号", "预审". Input: todo.md Phase spec + suggest.md (if exists). Output: D-numbered decision proposals in redo.md. NEVER use for code review or implementation verification — that's full-audit's job.
---

# Pre-Audit Skill — Phase 规格审查

审查 Boss 写入 todo.md 的新 Phase 规格。**代码一行未写**，在此阶段拦截架构冲突、spec 模糊、依赖冲突、工时偏差。

## Role

You are the Auditor performing a Shift-Left review. You do NOT review code (no code exists yet). You review **spec text** against **existing codebase state** and **AGENTS.md constraints**. Your output is D-numbered decision proposals in redo.md — Boss rulings required before Developer can start coding.

## When to Use (vs full-audit)

| | pre-audit (this skill) | full-audit |
|---|----------------------|------------|
| **When** | Before code | After code |
| **Input** | todo.md spec text | git diff / Developer report |
| **Output** | D-numbered decisions | R-numbered tickets |
| **Typical catch** | "settings 表" violates Schema freeze | `viewMode` undefined in JSX |

## Audit Workflow

Execute in this exact order.

### Phase 1: Context Loading

1. **Read `AGENTS.md`** — architecture constraints, directory rules, DB constraints, IPC constraints, common pitfalls, table list (12 tables)
2. **Read `todo.md` Phase spec** — every task's scope, constraints, acceptance criteria, keywords
3. **Read `suggest.md`** (if exists) — design intent, exact color palettes, interaction patterns
4. **Read `redo.md`** — current open issues, previous D-decisions, fix status
5. **Read `src/shared/types.ts`** — current data structures (to detect schema-implying keywords)
6. **Read `src/shared/ipc-channels.ts`** — current IPC channel list (to detect new channel needs)

### Phase 2: Constraint Extraction

For EVERY task in the spec, fill out this table. Every cell must be filled — blank cells are themselves a finding.

```
| T# | 约束类型 | Spec 原文 | grep 命令 (实施后验证用) | 当前代码状态 | 风险 |
|----|---------|----------|------------------------|-------------|------|
| T2401 | 删除目录 | "物理删除 src/server/" | find src/server -name "*.ts" | 19 文件存在 | — |
| T2401 | 删除依赖 | "移除 mysql2" | grep mysql2 package.json | 存在于 dependencies | — |
| T2401 | Schema 简化 | "三处 DDL→单处" | grep CREATE TABLE src/ | 3 处 (schema/mysql/server) | 反向迁移缺失 |
```

### Phase 3: Architecture Constraint Check

Run every spec keyword through AGENTS.md constraint filter:

| Keyword in Spec | Triggers Check | Verify |
|----------------|---------------|--------|
| "表" / "table" / "CREATE TABLE" / "DDL" | Schema change | Is table already in schema.ts? Is ALTER TABLE needed in migrateDatabase()? |
| "新 IPC" / "通道" / "ipc" / "handler" | New IPC channel | Channel name defined? ipc-channels.ts updated? Handler registered? preload exposed? WindowApi typed? |
| "新依赖" / "npm install" / "import" | New dependency | Package in package.json? Native compilation needed? License compatible? |
| "BrowserWindow" / "窗口" / "浮窗" / "Window" | New Electron window | nodeIntegration:false? contextIsolation:true? sandbox:true? preload defined? |
| "settings JSON" / "localStorage" / "存" / "持久化" | New persistence | Where EXACTLY? localStorage vs settings table vs file? Is the storage location in schema.ts? |
| "删除" / "废弃" / "移除" / "删" | Code removal | Blast radius: grep for all importers of the deleted module. What breaks if removed? |
| "升级" / "替换" / "迁移" | Engine/library swap | API compatibility? Existing callers need change? Tests affected? |
| "MCP" / "Server" / "HTTP" | Server-side change | Which server module affected? MCP tools affected? |
| "路由" / "route" / "页面" | New route | Path in App.tsx? Component exists? ContextPanel whitelist updated? |

### Phase 4: Spec Gap Detection

Flag every vague phrase. These are NOT implementable and must be clarified:

| Vague Phrase | Required Clarification | Example Good Spec |
|-------------|----------------------|-------------------|
| "优化掉" | What specifically removed? Replaced by what? | "物理删除 src/server/ 目录下全部 19 个 .ts 文件" |
| "做个窗口" | Window type? Features? Security config? Size? | "BrowserWindow 420×320, frame:false, transparent:true, alwaysOnTop:true" |
| "改进" / "完善" | What metric? From what to what? | "首屏加载从 3s 降至 1.5s" |
| "像 XXX 那样" | Which specific behavior? Paste source code excerpt. | 标注竞品仓库 + 文件路径 + 行号 |
| "大概" / "差不多" / "基本" | Demand specific numbers/values | "5 套主题, 每套 14 个 CSS token, 色值精确到 hex" |
| "更好看" / "更流畅" | Quantify: CSS values? Animation ms? | "transition: color 350ms ease" |
| "支持 XXX" | What does "support" mean? List features? | "支持: 拖入导入 / 冲突裁决 / >50MB toast / 弹入动画" |

### Phase 5: Cross-Task Dependency Analysis

| Check | Method | Risk if Missed |
|-------|--------|---------------|
| Two tasks modify same file | grep file path across task descriptions → serial order | Merge conflicts, overwritten work |
| Task A output consumed by Task B | Trace data flow → verify format compatibility | Pipeline breakage |
| Task C deletes what Task D imports | grep the deleted module → find callers | Broken imports |
| Task E depends on Task F's dependency | Dependency chain: if F deleted first, E's dep gone | Orphaned dependency |

### Phase 6: Risk Scoring

Rate each task:

```
| T# | 架构风险 | 工时风险 | 依赖风险 | 综合 | 建议缓冲 |
|----|---------|---------|---------|------|---------|
| T2401 | 🔴 高 | 🟡 中 | 🔴 高 | 🔴 | +50% |
| T2402 | 🟡 中 | 🟢 低 | 🟢 低 | 🟡 | +20% |
```

- 🔴 高: 全新架构模式、跨 >15 文件、涉及 DB schema、删除核心模块
- 🟡 中: 跨 5–15 文件、修改已有模块、新增 IPC
- 🟢 低: ≤5 文件、纯 UI 重组、修复已知 bug

### Phase 7: D-Number Output

Write findings to `redo.md` in D-number format. Each D must contain:

```
| D## | 问题描述 | 选项 A（含工时/风险） | 选项 B（含工时/风险） | 建议 |
```

Rules:
- D-numbers increment from the last D in redo.md
- Every D must have exactly 2 options + a recommendation
- P0 issues blocking spec review → D must be resolved before Developer starts
- P1/P2 issues can be resolved during implementation

**Common D-number categories**:

| Category | Example |
|----------|---------|
| Architecture choice | "D120: LocalGraph 去留 — 删 vs 保留 d3-force" |
| Feasibility gate | "D121: sqlite-wasm 在 Node.js 下可行性 — 先验证 vs 直接替换" |
| Missing migration path | "D122: MySQL→sqlite 反向迁移 — 提供脚本 vs 不做" |
| Service continuity | "D123: MCP HTTP 客户端断裂 — 同步清理 UI vs 保留文档" |
| Implementation risk | "D124: 动态导入调用链 — 按 pdfjs-dist 模式 vs 保留同步" |
| Security boundary | "D125: Drop Zone 安全 — 白名单限制 vs 开放接受" |
| Quality target | "D126: as any 清零范围 — 0 处 vs ≤5 处 Worker 豁免" |

### Phase 8: Suggested Execution Order

After all D-numbers are written, propose an execution order. The default is spec order, but cross-task dependencies and risk levels may suggest a different sequence. Write it as:

```
建议顺序: T2403 (先验证) → T2401 → T2402 → T2404 → T2405
理由: T2403 验证 sqlite-wasm 可行性后, T2401 才能安全删除 MySQL
```

---

## Output Format

After completing all phases, output a structured report:

```markdown
### Pre-Audit 报告 — Phase N

**审查日期**: YYYY-MM-DD
**审查范围**: todo.md Phase N (Txxxx-Txxxy)
**代码基线**: build ✅ test ✅ tsc ✅

**发现汇总**:
| 类型 | 数量 |
|------|------|
| 架构约束冲突 | N |
| Spec 模糊需澄清 | N |
| 跨任务依赖冲突 | N |
| 工时/风险偏差 | N |
| D-编号决策点 | N |

**D-编号列表**:
| D## | 级别 | 议题 | 选项 A | 选项 B | 建议 |
|-----|------|------|--------|--------|------|

**建议执行顺序**: ...

**阻塞项** (Boss 必须裁决才能开工): D###, D###
```

---

## Important Constraints

1. **Do NOT read source code beyond context files** — this is a SPEC review, not code review. Only read AGENTS.md, types.ts, ipc-channels.ts, redo.md, and the spec in todo.md.
2. **Do NOT suggest code fixes** — no code exists yet. Suggest spec clarifications and architecture decisions.
3. **Every D must have exactly 2 options** — this forces binary decisions. Boss can always choose "other" but the framework demands clear alternatives.
4. **Write D-numbers to redo.md only** — same output rules as full-audit.
5. **Spec gaps are NOT "findings to ignore"** — they are D-numbers demanding Boss clarification before Developer starts.
6. **Don't be vague in D writeups** — "D121: 需要验证 sqlite-wasm" is useless. "D121: sqlite-wasm 在 Electron 主进程 (Node.js 22) 中: A) 先跑独立验证脚本 (2h, 零风险) B) 直接替换并根据报错调试 (10h+, 可能全部回退)" is actionable.
