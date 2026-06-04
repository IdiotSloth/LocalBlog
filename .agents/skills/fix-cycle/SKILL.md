---
name: fix-cycle
description: Developer (码农) processes Auditor findings from redo.md, fixes bugs, and updates fix status. Use when responding to audit reports, fixing R-编号 items, processing redo.md issues, or handling the Step 7 → Step 6 feedback loop. Triggers on: "fix redo", "fix the bugs", "process redo items", "开始修 bug", "继续修复", "修复 Rxxx", "修 redo", "处理审计", "查 redo.md", audit result responses, or any instruction to address redo.md issues. **Iron rule: 不得有延后项 — ALL P0+P1+P2 must be cleared. P3 must be fixed unless explicitly ruled by Boss.**
---

# Fix Cycle — 修复循环

> Workflow Step 7 → Step 6 反馈环。Auditor 审查发现 R-编号 → Developer 修复 → 自检 → Auditor 再审查。
> 编码时参考 `write-code`，完成后切 `self-check`。完整流程见 `docs/workflow.md`。

Auditor 审查 → R-编号工单 → Developer 修复 → 更新状态。这是整个协作流程中最频繁的循环。每一步都要思考"为什么出这个 bug"而非"怎么让它消失"。

## Step 1: 读 redo.md，排优先级

读 `redo.md` `## 当前开放项` 表和 `## 当前待修复` 区域。找出所有 📋 状态条目。

**优先级排序**:
1. 🔴 P0 — 功能完全不可用、崩溃、安全漏洞
2. 🟠 P1 — 核心功能异常、数据安全
3. 🟡 P2 — 细节偏差、类型安全
4. 🟢 P3 — 代码质量、优化

**铁律**: P0+P1+P2 必须清零。P3 也必须修，除非 Boss 明确裁决"延后"。

## Step 2: 逐个修复

对每个 📋 条目，从最高优先级开始:

1. **理解根因**: redo.md 条目包含文件路径 + 行号 + 问题代码。读代码理解为什么错了——不是"它不工作"，是"什么导致它不工作"

2. **写修复**: 遵循项目约束（参见 `write-code` skill 的编码 checklist）

	3. **清理引用**: 如果删代码，确认 7 处引用全清（IPC channel / WindowApi / preload / handler / ipc/index / imports / api-client）。**若删除 UI 组件（系统坍缩）**，额外确认 5 项：① store/context provider 是否仍被其他模块导入 ② localStorage keys 是否仍在写入 ③ pub/sub 订阅是否仍存活 ④ 物理文件是否删除（不只是断开 import） ⑤ `.bak` 备份文件是否清理

4. **构建验证**: `npm run build` 必须通过。批量子项可并行改不同文件，同文件必须串行

## Step 3: 更新 redo.md

每修完一项:

```
状态: 📋 → ✅
追加: **Developer**: <一句话修复摘要，说明改了什么、为什么>
保留: Auditor 问题描述行 + **Auditor 验证**: 字段（留空，Auditor 填）
```

**修复报告格式**:

```
| # | 等级 | 问题 | 修复 | 文件 |
|---|------|------|------|------|
| Rxxx | 🔴 | ... | ✅ <一句话> | path:line |
构建: ✅ (X main + Y preload + Z renderer) | 测试: 87/87
```

## Step 4: 追加新发现

修复过程中发现的新问题 → 追加到 redo.md `## 当前待修复` 对应优先级表格:

```
| R-编号 | 严重性 | 问题描述 | 文件:行号 | Developer 发现 |
```

如果自己修了 → 标记 `✅ + **Developer 自纠**`。

## Step 5: 自检（批量修复后）

修复完毕 → 切到 `self-check` 技能跑门禁。全部通过后才算完成。

## 执行规范

- **批次粒度**: 5-8 个 R 项一批，每批后 build + 更新 redo.md。不攒 20 个一起修，修复质量随批次增大而下降
- **根因思考**: 每条修复前问自己"为什么这个 bug 会发生？是类型系统没拦住，还是编码时疏忽？"——用答案决定要不要加 grep 防御或改约束
- **不得自行裁决**: Auditor 发现 → Boss 裁决 → Developer 修复。裁决前不自行决定"这个不用修"——写在 redo.md 里由 Boss 判断
- **系统删除五步法 (Phase 24+)**: 删除 UI 组件时: ① 断开渲染树 (移除 import + JSX) → ② 检查 store/context 是否被其他模块 import (grep 验证) → ③ 删除 store/context 模块 + 清理 localStorage key → ④ 删除物理文件 (不只是断开 import) → ⑤ 清理 .bak / 备份文件。UI 断开 ≠ 系统删除——状态机可能在后台继续运行
- **Collapse 类修复纪律（T2406 追加）**: 若 Auditor 报告"Ghost Risk"（fixed panel / expandable section / 新 persist / 新 pub-sub）→ 修复方向是**删除**而非"改成轻量版"。观察期内只做减法，不建替代。Stage A 的 bug = 隐藏不干净，不是功能缺失
