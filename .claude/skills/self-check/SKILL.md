---
name: self-check
description: Developer (码农) self-checks code before submitting to Auditor. Use after completing a batch of fixes or feature implementations, before marking work as done. Triggers on: "自检", "自我检查", "跑一下检查", "验证代码", "check my code", "build + test", "跑门禁", "Step 6", or any situation where code is ready for review.
---

# Self Check — 自检

> Workflow Step 6。前置: `write-code` 或 `fix-cycle` 完成编码。后置: 通过后提交给 Auditor (Step 7)。
> 完整流程见 `docs/workflow.md`。

提交给 Auditor 之前，先把机器能查的查完。Auditor 收到的应是"难题"不是"疏漏"。

## Part A: 自动化门禁（必须全绿）

```bash
npm run ci          # 一键: lint:arch + biome + tsc + build + test
# 或分步:
npm run build       # 三条 ✓ built
npm run test        # 87/87 pass
npx tsc --noEmit    # 0 error
```

任一项不过 = 不能提交。

## Part B: 逻辑防御 grep

根据改动类型选择性执行。目标是抓到"肉眼容易漏"的问题。

```bash
# 通用（每次跑）
grep "prompt(\|alert(\|confirm(" src/renderer/ -r       # 原生弹窗 → 0
grep "console.log" src/ -r                              # debug 残留 → 0
grep "catch {}" src/main/ -r                             # 空 catch → 0
grep "as any\|: any" src/renderer/ -r | wc -l            # 计数，应 ≤ 上次基线
grep "#[0-9a-fA-F]\{3,6\}" src/renderer/ -r --include="*.css" | grep -v "var(--" | grep -v ":root\|theme"  # 硬编码颜色 → 0

# 有 IPC 改动时
grep "ipcRenderer.invoke\|ipcMain.handle" src/ -r | grep -v "IPC\."   # 裸通道名 → 0

# 有 DB 改动时
grep "INSERT OR REPLACE\|datetime('now'" src/main/ -r     # SQLite 方言兼容

# 有 HTML 渲染改动时
grep "dangerouslySetInnerHTML" src/ -r -A2 | grep -v "DOMPurify"  # XSS 防护

# 有文件操作时
grep "fs\.readFile\|fs\.writeFile\|fs\.unlink" src/main/ -r | grep -v "try {\|catch\|basename\|resolve"  # 路径安全
```

## Part C: Smoke Test（15 步核心路径）

```
□ 启动应用, 无白屏, 渲染正常
□ 今日页: 添加待办 → 勾选完成 → 反馈正常
□ 今日页: 保存便签 → 日历上出现蓝点
□ 博客页: 新建博客 → 保存 → 列表页可看到
□ 博客页: 点击文章 → 点编辑 → 编辑器出现可输入
□ 博客页: 暗/亮/暖 三阅读主题切换正常
□ 知识库: 拖入文件 → 卡片出现
□ 知识库: 点击卡片"打开"→ 系统默认程序打开
□ 白板: 添加节点 → 连线 → 编辑 → 删除
□ 设置: 主题切换 → 全局生效
□ 设置: 背景图选择 → 全局可见 → 重启后仍存在
□ 侧边栏: 折叠/展开 → 布局自适应
□ 侧边栏: 头像和注销按钮始终可见
□ AI: 打开对话面板 → 发消息 → 有回复
□ 快捷便签: Alt+Space → 输入 → 保存 → 便签列表可见
```

**若是二次修复**: 只跑 A + grep 修复涉及的具体模式 + 被 Auditor 打回的 smoke 项。

## 退出条件

自动化门禁全绿 + grep 零意外 + smoke 全部通过 → 输出报告:

```
| 检查 | 结果 |
|------|------|
| build | ✅ 55+2+NNNN |
| test | ✅ 87/87 |
| tsc | ✅ 0 |
| as any | NN (基线: 30) |
| console.log | 0 |
| hardcoded color | 0 |
| prompt/alert/confirm | 0 |
| reducer 解构完整性 | 0 遗漏 |
| mapXxxRow 覆盖度 | N/N |
| Ghost Risk | 0 fixed panel / 0 expandable / 0 hidden context |
| IPC 7 层残留 | 0 孤立 channel/handler/preload |
| smoke test | 15/15 ✅ |
```

将此报告写入 redo.md 修复记录。

## Part D: Collapse 残留检测（T2406 追加）

当改动涉及系统删除/交互塌缩时，额外执行：

```bash
# Ghost Risk — 复杂度反弹信号
grep "position:\s*fixed" src/renderer/ -r --include="*.tsx" | grep -v "z-50\|Toast\|ErrorToast\|AiChat\|ShortcutHelp\|QuickSwitcher"  # 新 fixed panel → 0 非预存
grep "expandable\|collapsible\|accordion" src/renderer/ -r --include="*.tsx"    # expandable section → 0
grep "localStorage.setItem\|localStorage.getItem" src/renderer/ -r | grep -v "lbkb_\|reading-\|search-cache\|draft"  # 新持久化 → 0. R351 已清 lbkb_open_tabs/lbkb_minimized_blogs. R352 已清 blog-progress-/blog-scroll-ratio-
grep "ResizeObserver\|IntersectionObserver" src/renderer/ -r                    # 观察者再生 → 0 新增
grep "window\.__" src/renderer/ -r                                               # 模块级 pub/sub → 0 新增

# IPC 7 层残留（若本次删除了功能）
# 1. channel 定义仍存在但无 handler?  2. handler 注册了但 preload 不绑定?
# 检查目标: 被删功能的 IPC 通道在 7 层中均为 0 引用
```

**Ghost Risk 基线**: 每次 Collapse Phase 结项时更新允许列表，防止基线漂移。

## Part E: Rebuild 时代检测（Rebuild 追加）

无论改动类型，每次自检必跑：

```bash
# prompt()/alert()/confirm() — Electron renderer 静默拦截 (R355)
grep "prompt(\|alert(\|confirm(" src/renderer/ -r              # → 0

# reducer 解构完整性 — JSX 引用必须在解构中 (R367)
# 目视: 每个使用 useReducer 的组件，const { ... } = state 包含所有 JSX {value} 引用

# mapXxxRow 覆盖度 — mapper 字段数 ≥ DB 列数 (R362)
# 对照 schema.ts 数 DB 列 → 对照 mapXxxRow 数映射字段 → 差值 = 0

# 新路由 null 安全 — 路由变更后检查组件 (R365)
# grep 组件中 obj.prop → 确认对 null/undefined 有 ?. 或条件守卫

# 数据链完整性 — 新增字段 5 层验证 (R356)
# TypeScript interface → mapper → SQL → IPC handler → UI 调用
# 每层 grep 字段名 → 确认存在
```

**Rebuild 基线**: 每次自检报告增加以下行：

```
| prompt/alert/confirm | 0 (含 KnowledgeListPage/SlashCommand 预存已知项) |
| mapXxxRow 覆盖度 | N/N (schema.ts DB 列 / mapper 字段) |
```
