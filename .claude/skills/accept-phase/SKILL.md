---
name: accept-phase
description: Boss专属 — Phase 结项验收。触发：用户说"验收"、"结项"、"Phase N 验收"、"检查交付"、Auditor 全部 ✅ 后。这是 workflow.md Step 8，核心是 Spec vs 实现对照——文件存在 ≠ 功能正确。
boss-only: true
---

# Accept Phase — Boss 验收

> **Boss 专属 · workflow.md Step 8** — 触发：Auditor 验证全部 ✅ → 输出：通过 (进 Step 9) 或 返工清单

## 验收清单 (来自 workflow.md Step 8)

| # | 检查项 | 方法 |
|---|--------|------|
| □ | redo.md P0+P1 全部 ✅ | 读 redo.md 当前开放项 |
| □ | Auditor 验证报告无 🔄 | 读 redo.md 逐项验证表 |
| □ | `tsc --noEmit` 零错误 | `npx tsc --noEmit 2>&1` |
| □ | `npm run build` 通过 | `npm run build 2>&1` |
| □ | `npm run test` 全绿 | `npm run test -- --run 2>&1` |
| □ | 打开应用，浏览核心页面，无崩溃/明显异常 | 启动 → 点击主要页面 → 看白屏/报错 |
| □ | **Spec vs 实现对照** | 下面详述 |

## Spec vs 实现对照 (流程七 — Phase 23 教训)

逐项 grep 验证 spec 中的关键交付物。**文件存在 ≠ 功能正确**：

1. **色值精确匹配**: spec 写 `#b8826a` → grep 实际代码，必须一致，不接受"差不多"
2. **布局/交互匹配**: spec 写"卡片不等高 + 空白分隔" → 读组件 CSS，不接受"改了样式"
3. **行为匹配**: spec 写"hover 才出现操作按钮" → 检查 CSS class，不接受"能点就行"
4. **IPC/数据流匹配**: spec 写"调 noteCreate" → grep 调用链

### 对照方法

```
对每个任务 Txxxx：
  1. grep spec 中提到的文件名 → 文件存在？
  2. grep spec 中提到的色值/数值 → 精确匹配？
  3. 读关键组件 → 渲染逻辑匹配 spec 描述？
  4. 差距 → 记录 (具体到 文件:行号、spec要求、实际行为)
```

差距写入 redo.md "Boss 验收发现" 节，Developer 修复后重新验收。

## 使用验收 (Rebuild 教训 — Spec 验收 ≠ 使用验收)

Spec 全部通过 ≠ 产品可用。Boss 必须**亲自打开应用**使用每项功能：

| # | 检查项 | 方法 |
|---|--------|------|
| □ | 打开应用，以用户身份操作 | 不是看 Developer 演示，是自己点击 |
| □ | 核心路径走一遍 | 今日页→点击日期→添加待办→勾选 / 博客列表→点卡片→看浮动菜单→编辑→保存→返回 |
| □ | "第一眼"检查 | 每个页面加载后 2 秒内，信息是否清晰？便签颜色太浅？标签在卡片上吗？ |
| □ | 记录"感觉不对" | 不是 bug，是体验问题。同样写入反馈 → spec → 二轮修复 |

Rebuild 的 R361-R368 全部是使用验收发现的问题——Spec 验收 13/13 ✅ 但仍需要二轮修复。**这是正常的设计闭环，不是失败。**

## 验收速览 (快速判断)

快速打开应用浏览这些页面 (不逐项测试，那是 Step 6 smoke test)：
- 今日页：不白屏，待办区可见，日历可见
- 博客页：列表可见，点击一篇文章可见内容
- 知识库：卡片可见
- 设置：主题可切
- 侧边栏：折叠展开正常

如果这些都能过且无报错 → 快速验收通过。

## Collapse 验证 (Phase 24+ — 涉及 UI 删除时必查)

如果本 Phase 涉及任何 UI 系统删除，额外检查：

| # | 检查项 | 方法 |
|---|--------|------|
| □ | 无 hidden state machine | grep 删除的 store/context → 零消费者时物理删除，不能只隐藏入口 |
| □ | 无 persistence leakage | grep 废弃 localStorage key → 物理清理；检查 DB 中是否仍在写入已删除系统的数据 |
| □ | 无 ghost infrastructure | 已删除的组件 → grep 文件仍存在但零导入 = 物理删除文件，不能"留着以后用" |
| □ | 无 ghost component | 新建但未接入的组件 → 标记 DEPRECATED 或物理删除 |
| □ | Soft Collapse 观察期已满 | Stage A 隐藏 ≥7 天 → Boss 已确认"不产生阻塞" → Stage B 才允许物理删除 |
| □ | 系统数量净下降 | 删除的系统数 > 新增的替代系统数。删 1 换 3 = 不通过 |
| □ | 瞬时交互合规 | 新增 popup/dropdown 满足: click outside dismiss + 无 persistent state + 无跨页面状态 |
| □ | **Mechanically verifiable deletion** (T2406 R352) | 五条全部消失: write path + read path + ownership + persistence + runtime mutation。缺一条 = UI dead ≠ system dead |
| □ | **无 unilateral persistence** (T2406 R352) | grep 新增 storage key → 确认每个 key 有对应的读路径。只写不读 = 单向积累 |
| □ | **无 orphan runtime** (T2406 R344/R345) | 已删除 UI 的状态机仍在后台变异 → 观测数据被污染。此检查在 Stage A 观测期内同样适用 |
| □ | **无 conceptual similarity trap** (T2406 R353) | 语义相似的机制各自独立管理，不抽象为统一系统 |

## 输出

```
Accept Report:
- Phase: N
- 验收清单: 7/7 ✅ (或列出未通过项)
- Spec vs 实现: N/N tasks pass (或列出差距)
- Verdict: ✅ 通过 → Step 9  /  ❌ 返工 → Developer
- 差距清单 (如有): [具体到文件:行号的修复要求]
```
