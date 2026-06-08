---
name: write-code
description: Developer (码农) writes code for the Local Blog KB project. Use when implementing new tasks from todo.md, adding features, modifying existing code, or starting new work. Triggers on: "写代码", "开始写", "实现 Txxxx", "开始开发", "implement", "开始 Phase N", "Step 5", or any instruction to write or modify source code.
---

# Write Code — 编码

> Workflow Step 5。前置: Step 4 规格回译通过。后置: 完成后切到 `self-check`。
> 完整流程见 `docs/workflow.md`。

在动键盘之前先想清楚要改什么、改哪里、怎么验证。然后边写边对照 checklist 自检。

## Step 0: 规划（先读后写）

1. **判断任务类型**: 是"新增功能"还是"Collapse 塌缩"？Collapse 类任务遵循 **delete-first** 原则——不自动建替代，不预设用户需要。
2. **读规格来源**: `todo.md` 对应 T 任务描述 + Boss 验收条件, 或 `redo.md` 对应 R-编号问题描述
3. **列受影响文件**: grep 相关符号, 列出会修改的文件清单（新增/修改/删除）。Collapse 类特别标注：哪些是隐藏（Stage A），哪些是删除（Stage B）。
4. **写 3 行回译**: 用自己话写: "我要做 X, 改 Y 文件, 验证方法是 Z" — 5 分钟可省一轮返工
5. **不确定先问**: 规格有歧义 → 标注 `⚠️ 不确定` 暂停，不要猜

### Collapse 类任务特别规划

当 todo.md 标注"交互塌缩"或 Boss 明确要求删除系统时：

- 默认：**功能可以死亡**。不自动寻找替代方案。
- Stage A 只做减法：断开渲染 / 隐藏入口 / 停止写入 / 保留文件
- Stage B 才物理删除：组件 + 状态 + IPC + CSS + localStorage
- **禁止**："先做个轻量替代""顺手迁移功能""先保留以后再删"
- **Constitution 升级**: 若 redo.md 标记 "Stage B" 但涉及 runtime mutation（persistence leakage / orphan runtime / unilateral persistence）→ **升级为立即修复**，不等 Stage B。观测期内状态机继续写入 = 观测无效

## Step 1-4: 编码中自检

每改完一个文件或一个逻辑块，过以下 checklist。不必一次全过，但提交前必须全打勾。

| # | 检查项 | 为什么 | 方法 |
|---|--------|--------|------|
| □ | 新 IPC: channel → handler → preload → WindowApi → api-client | 漏一步 = renderer 调用 undefined | grep 每层 |
| □ | 新 BrowserWindow: `nodeIntegration:false, contextIsolation:true, sandbox:true` | 安全基线 | 对照代码 |
| □ | 新 Schema 列: `schema.ts` ALTER TABLE | 数据库迁移可重入 | grep 两处 |
| □ | SQL: 参数化查询, 禁 `datetime('now')` 裸用 | SQLite 方言兼容 | grep |
| □ | XSS: `dangerouslySetInnerHTML` 前有 `DOMPurify.sanitize()` | 用户内容入 DOM | grep |
| □ | 路径: `fs.readFile`/`fs.unlink` 有 `path.basename()` 或 workspace startsWith | 路径穿越防护 | grep |
| □ | 无 `prompt()` / `alert()` / `confirm()` | Electron renderer 拦截 | grep `prompt(\|alert(\|confirm(` src/renderer/ |
| □ | 无 `console.log` 残留 | 仅 `console.error` 允许 | grep |
| □ | 导入方向: renderer 不碰 `src/main/`, main 不碰 `src/renderer/` | 目录约束 | grep |
| □ | `data:` URL onclick 用 `window.fn()` 前缀 | `data:text/html` 下裸函数名解析不到 | grep |
| □ | React hooks 全部在条件 return 之前 | `if (loading) return` 后 `useEffect` → 崩溃 | 读组件顶部 |
| □ | CSS 只用 `var(--token)`, 禁硬编码 hex | 主题切换失效 | grep `#[0-9a-fA-F]{3,6}` → 仅 `:root`/theme 块 |
| □ | 新文件无 `file://` 硬编码路径 | Electron CSP 拦截 | grep `file://` |
| □ | 新 UI 为瞬时交互: click-outside + Escape dismiss + 单层 + 无 persist | 防 panel 再生 | 检查 popup/dropdown/popover |
| □ | 无 Ghost Risk: `fixed` panel / expandable section / localStorage UI 状态 / hidden context / 模块级 pub/sub / **unilateral persistence** | 防复杂度反弹 | grep `position:\s*fixed\|expandable\|localStorage\.setItem\|display:\s*none\|window\.__`；**unilateral = write path 存在且 read path 死 → Constitution violation** |
| □ | **无 `prompt()` / `alert()` / `confirm()`** — Electron renderer 静默拦截 | 功能不可用且无报错 | grep `prompt(\|alert(\|confirm(` src/renderer/ → 0 |
| □ | **数据链完整** — 新增字段逐层验证: TypeScript type → mapper → SQL → IPC handler → UI 调用 | R356/R362: UI 正确但数据层断链 | 每层 grep 确认字段存在 |
| □ | **新路由 null 安全** — 路由变更后检查组件中 `obj.prop` 对 `null`/`undefined` 安全 | R365: `/blog/new` → `blog.title` 崩溃 | 检查 `?.` 可选链或条件守卫 |
| □ | **fixed 定位 overflow 分区** — 固定元素含动态内容时，固定区 `flex-shrink:0`，动态区 `overflow-y:auto` | R364: 长目录推出按钮 | 目视: 按钮始终可见 |
| □ | **reducer 解构完整** — `const { ... } = state` 包含 JSX 中所有 `{xyz}` 引用 | R367: `sortBy is not defined` | grep `value={[a-z]` → 确认变量已声明 |

## Step 5: 清理引用

如果删除了代码/API/组件:

### 标准清理（7 层 IPC）
- [ ] IPC channel: 删 `ipc-channels.ts` 条目
- [ ] WindowApi: 删类型声明
- [ ] preload: 删 `contextBridge` 绑定
- [ ] main handler: 删 `ipcMain.handle`
- [ ] handler 注册: 删 `registerAllIpcHandlers` 中的调用
- [ ] api-client: 删 web stub
- [ ] imports: 删所有 `import`

每清完一处 grep 确认。

### Collapse 类任务额外清理
- [ ] shared types: 删已删除功能专用的 interface/type
- [ ] CSS: 删已删除组件的样式
- [ ] 路由标签: 删 tab-context / 路由白名单中的引用
- [ ] localStorage key: 删持久化读写
- [ ] 模块级状态: 删 `window.__` 全局 / pub-sub
- [ ] store slice: 删 Zustand context/reducer 中对应状态

## Step 6: 构建验证

```
npm run build
```

必须看到三条 `✓ built`（main + preload + renderer），否则不进入下一项修改。
