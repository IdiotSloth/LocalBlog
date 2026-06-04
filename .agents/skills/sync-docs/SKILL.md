---
name: sync-docs
description: Boss专属 — Phase 结项或文档变更后同步所有项目文档。触发：验收通过后、文档变更后、Phase 状态更新时。这是 workflow.md Step 9，更新 todo/README/AGENTS/redo/phase-archive/history-audit 并交叉验证一致性。Developer 和 Auditor 不可调用。
boss-only: true
---

# Sync Docs — Boss 文档同步

> **Boss 专属 · workflow.md Step 9** — 触发：验收通过 (Step 8) → 输出：6 文档更新 + 跨文档交叉验证

## Role Constraint

AGENTS.md 和 README.md 是 **Boss-owned**。Developer 不可修改。Auditor 不可写任何文档。当非 Boss 角色调用时，仅报告漂移，不编辑。

## 同步流程

### 1. todo.md

- 刷新 `最后更新` 时间戳
- 已完成任务标 ✅，更新 Phase 表状态
- 更新代码质量基线 (test count, P0/P1/P2/`: any` 计数)
- 更新工时（估算→实际）

不修改：任务描述 (Boss-owned)、优先级标签、"当前优先" marker。

### 2. README.md

- 构建状态行：版本号、Phase 完成状态、IPC/Service 计数
- Phase 表：与 todo.md 同步完成状态
- 功能表：新增模块是否已列入

### 3. AGENTS.md

- "当前状态"段：Phase 列表、工单统计、构建基线、IPC/Service/Route/`: any` 计数
- 如架构变更：更新约束列表、常见陷阱
- 新交付物存在性：grep 验证关键文件存在

### 4. redo.md

- "当前开放项"状态更新
- 关闭已修复项

### 5. docs/phase-archive.md

- 已完成 Phase 归档：任务摘要 + Boss 裁决 + 关键指标
- 验证覆盖率：最新 Phase 是否已归档

### 6. docs/history-audit.md

- 审计趋势 + R/D 编号统计更新
- 安全里程碑记录

## 跨文档交叉验证

关键数字必须在四处文档一致：

| 指标 | 验证方法 |
|------|---------|
| IPC 通道数 | AGENTS.md ↔ README.md ↔ `grep -cE "'[a-z]+:[a-z]" src/shared/ipc-channels.ts` |
| Service 数 | AGENTS.md ↔ README.md ↔ `ls src/main/services/*.ts \| wc -l` |
| Test 数 | AGENTS.md ↔ README.md ↔ todo.md ↔ `npm run test -- --run` |
| P0/P1/P2/P3 | AGENTS.md ↔ README.md ↔ todo.md ↔ redo.md "当前开放" |
| Phase 状态 | AGENTS.md ↔ README.md ↔ todo.md Phase 表 |
| `: any`/`as any` | AGENTS.md ↔ `grep -r ": any\|as any" src/renderer --include="*.tsx" --include="*.ts" \| wc -l` |

此外验证：
- 所有跨文档相对链接指向存在的文件
- `suggest.md` 不存在 (存在 = 未处理提案)
- `noUncheckedIndexedAccess` 仍启用 (`grep "noUncheckedIndexedAccess" tsconfig.*.json`)
- todo.md 中 ⏭ 任务有目标 Phase
- 各文档遵守自身格式规范 (todo.md §6, redo.md §1)

**Phase 24+ Complexity Budget 验证**:

| 不可见复杂度 | 验证方法 |
|------------|---------|
| Hidden state machine | grep 已删除的 store/context → 确认零消费者且文件已物理删除 |
| Persistence leakage | grep 废弃 localStorage key → 确认已清理 |
| Ghost infrastructure | grep 已删除组件的文件名 → 确认物理文件不存在 |
| Ghost component | grep 新建但未接入的组件 → 确认已标记 DEPRECATED 或已删除 |

## 输出

```
Sync-Docs Report:
- Documents touched: [list]
- Metrics: IPC=N Service=N Test=N/N :any=N as=N
- Drift fixed: [list of "doc claimed X, code has Y → fixed"]
- Cross-reference: N/N consistent
- Flagged for Boss: [items requiring decision]
```

## 常见漂移速查

| 文档声称 | 实际验证 |
|---------|---------|
| IPC N 通道 | `grep -cE "'[a-z]+:[a-z]" src/shared/ipc-channels.ts` |
| Service N 个 | `ls src/main/services/*.ts \| wc -l` |
| renderer `: any` = 0 | `grep -r ": any" src/renderer --include="*.tsx" --include="*.ts" \| wc -l` |
| renderer `as any` = 0 | `grep -r "as any" src/renderer --include="*.tsx" --include="*.ts" \| wc -l` |
| Test N/N pass | `npm run test -- --run 2>&1` |
| `noUncheckedIndexedAccess` | `grep "noUncheckedIndexedAccess" tsconfig.*.json` |
| suggest.md 不存在 | `ls suggest.md` → 不存在 |
| README 功能表完整 | 对照 `ls src/renderer/features/*/` 和 components 新增模块 |
