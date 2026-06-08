---
name: phase-init
description: Boss专属 — 创建新 Phase 规格并写入 todo.md。触发：用户说"立案"、"新建 Phase"、"规划 Phase N"、"下一个 Phase"、"suggest.md 纳入"、要写新任务规格时。这是 workflow.md Step 1，输出必须通过自检清单才能交给 Auditor。
boss-only: true
---

# Phase Init — Boss 立案

> **Boss 专属 · workflow.md Step 1** — 输入：使用体验/竞品分析/产品愿景 → 输出：todo.md 新 Phase 章节

## 输入

读三个文件建立上下文：
- `todo.md` — 当前 Phase 表 + 最后 Phase 号 + 代码质量基线
- `redo.md` — 当前开放项 (避免新 Phase 与遗留冲突)
- `AGENTS.md` — 架构约束 (目录/DB/IPC/CSS Token)

如果 `suggest.md` 存在，按 suggest.md 生命周期处理：通读提案 → 讨论细化 → 逐条确认 → 纳入 → 删除。

## 核心流程

### 1. 竞品分析 (如有)

不是看官网截图。是：
1. `git clone --depth 1` 克隆仓库
2. 读核心组件源码 → 提取可复用模式 → 适配架构
3. 读 CSS/tailwind 配置 → 理解颜色/间距/动效体系
4. 对照 spec 检查"感觉"——不是功能清单，是视觉气质

### 2. 撰写 Phase 规格

```
Phase 名称：主题隐喻 (英文代号)
来源: Boss suggest.md / 用户反馈 / 竞品分析
核心命题: 一句话说清这个 Phase 解决什么
设计原则: 2-3 条指导性原则

Txxxx — 任务名 (估算, 优先级)
- Spec: 具体到文件/组件/色值/交互
- 验收: 可量化的通过标准 (grep 命令 / 行为描述 / 数值范围)
```

### 3. 自检 (写完后自己过，对照 workflow.md Step 1 清单)

| # | 检查项 | 不合格例子 |
|---|--------|-----------|
| □ | 每个任务有具体验收条件 | "优化掉" / "改进" → 打回 |
| □ | 涉及 Schema 变更已标注 | "存到 settings 表" 但未注 |
| □ | 涉及新 IPC 已标注通道名 (domain:action) | 只写"新增 IPC" |
| □ | 涉及 UI 有交互描述 | "做卡片模式" 没说点击后 |
| □ | 有色值/数值精确到具体值 | "柔色" → `#e0dcd5` |
| □ | 有竞品参考已注明出处 | "像 memos 那样" 不够 |
| □ | 若经 suggest.md 讨论，已删除 suggest.md | `git status` 可见残留 |
| □ | 跨任务术语一致 | T2302/T2305 都写"卡片"但间距不同 |
| □ | 涉及新 UI 系统已检查复杂度预算 (Phase 24+) | 新 popup/dropdown/panel → 确认不超过宪法上限，确认无 hidden state machine / persistence leakage 风险 |
| □ | 涉及 UI 删除已标注是 Soft Collapse 还是 Hard Delete | 大规模 UI 删除没写"先隐藏入口 → 观察 ≥7 天 → 物理删除" → 打回 |
| □ | 推翻重建级: 写 rebuild.md 而非 todo.md | 全应用大改 → 创建 `rebuild.md` 作为工作文件。格式同 todo.md 但无需受 Phase 表约束 |

### 4. 写入 todo.md

- 更新 `## 2. Phase 完成状态` 表：新增一行
- 新增 `## N. Phase XX` 章节（含任务总览表 + 实施顺序）
- 更新 `最后更新` 时间戳
- 更新 `总计` 工时
- 更新 `当前优先`

## 建议：何时走 suggest.md vs 直接写 todo.md

- **用 suggest.md**：竞品分析驱动的 Phase（多轮讨论 + 三方审阅）+ 争议性大的提案
- **直接写 todo.md**：小范围修复 Phase（如 T2405 纯修 bug）+ 方向明确的后续 Phase（如 Phase 25+）
- 无论哪种路径，自检 8 条全部打钩才能交给 Auditor

## 输出

```
Phase Init Report:
- Phase: N — "主题名" (英文代号)
- Tasks: N 项, ~Xh
- 自检: 8/8 ✅
- Next: Auditor Shift-Left (Step 2 / pre-audit)
```
