---
name: rule-on
description: Boss专属 — 对 Auditor 提交的 D-编号决策点逐条裁决。触发：用户说"裁决"、"处理 D-编号"、"看下 redo.md D"、Auditor 提交了 D-series 后。这是 workflow.md Step 3，裁决选项为 A / B / 否决 / 自定义 + 理由。
boss-only: true
---

# Rule On — Boss 裁决

> **Boss 专属 · workflow.md Step 3** — 输入：redo.md 中未裁决 D-编号 → 输出：每条 D 的裁决 + 理由

## 前置

读 `redo.md`，找到所有标注 "需 Boss 裁决" 或尚无 `Boss 裁决:` 标记的 D-编号。

同时读 `todo.md` 对应 Phase spec，理解 D-编号涉及的原始规格。

## 裁决流程

对每个未裁决的 D-编号：

### 1. 理解问题

提取 Auditor 的描述：问题是什么 / 选项 A (含工时风险) / 选项 B / 建议。

### 2. 确认可行性 (条件触发)

如果 D-编号涉及 **工时 >4h** 或 **架构变更**：
- 先让 Developer 确认可行性再裁决
- 避免 Boss 选了方案 A 但 Developer 实现不了

### 3. 裁决

四个选项：

| 选项 | 含义 | 示例 |
|------|------|------|
| **A** | 采纳方案 A | "D120: 选 A — 删 LocalGraph，纪律性优先" |
| **B** | 采纳方案 B | "D121: 选 B — 保留 sql.js，验证失败回退" |
| **否决** | D 本身是伪问题，关闭 | "该库已验证可用，此 D 不成立" |
| **自定义** | 提出第三种方案 | "不走 A 也不走 B，做 C: ..." |

每条裁决必须有**理由**——哪怕只有一句话。不搞折中，二元制。

### 4. 写入 redo.md

在 D-编号下方追加：
```
**裁决: 选项 X — 理由**
```

### 5. 回写 todo.md (如需要)

如果裁决改变了任务范围/工时/优先级，同步更新 todo.md 对应 Phase 任务描述。

## 裁决原则

- **二元制**：A/B 选一个，不搞折中
- **Developer 工时优先**：Dev 的估算比 Auditor 准，分歧时取 Dev
- **架构匹配度**：竞品好的功能 ≠ 我们应该做
- **安全优先**：涉及安全的 D，选更安全的选项
- **复杂度预算优先 (Phase 24+)**：裁决时检查变更是否突破复杂度预算上限。突破 → 必须先有减项再批准。「系统数量下降」优先级高于「单系统大小下降」
- **不接受"删大的换小的"**：删 A 换 3 个 B/C/D 不叫 collapse。裁决时要求净系统数量下降
- **Boss 也可以主动加 D 编号**：如果 spec 审查中发现 Auditor 未捕捉的问题，Boss 有权新增 D 并直接裁决

## 输出

```
Rule-On Report:
- D-numbers processed: N
- A: N | B: N | 否决: N | 自定义: N
- todo.md changes: [list if any]
- Next: Developer 规格回译 (Step 4)
```
