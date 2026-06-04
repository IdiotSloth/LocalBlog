# 协作流程规范 — Boss · Developer · Auditor

> 目标: 在 Boss 发现问题之前，Developer 和 Auditor 已经把所有能自动化的检查跑完了。
> 原则: 每个交接点都有 checklist。每个角色知道自己进什么、出什么、怎么算完成。

---

## 全局流程图

```
Boss 立案                    Auditor 规格审查               Boss 裁决
   │                              │                           │
   ▼                              ▼                           ▼
┌──────┐  todo.md   ┌──────────┐  D-编号   ┌────────┐  裁决结果  ┌──────────┐
│ Step │ ────────→ │  Step 2  │ ────────→ │ Step 3 │ ────────→ │  Step 4  │
│  1   │           │  Auditor │           │  Boss  │           │ Developer│
│ Boss │           │ 规格审查  │           │  裁决   │           │  规格回译 │
└──────┘           └──────────┘           └────────┘           └─────┬────┘
                                                                     │
                    ┌────────────────────────────────────────────────┘
                    ▼
              ┌──────────┐    修复报告    ┌──────────┐   R-编号    ┌──────────┐
              │  Step 7  │ ───────────→  │  Step 6  │ ─────────→ │  Step 5  │
              │ Auditor  │ ←─────────── │ Developer│            │ Developer│
              │ 实施审查  │  二次修复     │  自检+修复 │            │   写代码  │
              └────┬─────┘              └──────────┘            └──────────┘
                   │
                   │ 验证通过
                   ▼
             ┌──────────┐   sync-docs  ┌──────────┐   ship     ┌──────────┐
             │  Step 8  │ ───────────→ │  Step 9  │ ─────────→ │  Step 10 │
             │  Boss    │              │  Boss    │            │  Boss    │
             │  验收     │              │  文档同步  │            │   发布    │
             └──────────┘              └──────────┘            └──────────┘
```

---

## Step 1 — Boss 立案

**输入**: 使用体验、竞品分析、产品愿景  
**输出**: `todo.md` 新 Phase 章节

**Boss 自检 (写完后自己过一遍)**:

| # | 检查项 | 不合格例子 |
|---|--------|-----------|
| □ | 每个任务有具体验收条件 | "优化掉" / "改进" / "做个窗口" → 打回 |
| □ | 涉及 Schema 变更已标注 | "存到 settings 表" 但 settings 不在 schema.ts |
| □ | 涉及新 IPC 已标注通道名 | "新增 xxx IPC" 没说通道叫啥 |
| □ | 涉及 UI 有交互描述 | "做卡片模式" 没说点击后发生什么 |
| □ | 有色值/数值精确到具体值 | "柔色" → 打回，应写 `#e0dcd5` |
| □ | 有竞品参考已注明出处 | "像 memos 那样" 没说 memos 具体怎么做的 |
| □ | **若经 suggest.md 讨论，已删除 suggest.md** | suggest.md 残留 → `git status` 可见未跟踪文件 |
| □ | **跨任务术语一致**: 同名概念用同一套色值/间距/交互描述 | T2302/T2305 都写"卡片"但间距一个 12px 一个 8px |

**交付物**: `todo.md` 新 Phase 章节，包含任务编号、规格描述、验收条件、工时估算。

---

## Step 2 — Auditor 规格审查 (Shift-Left)

**触发**: Boss 写入新 Phase spec  
**技能**: `.claude/skills/pre-audit/SKILL.md`  
**输出**: `redo.md` 中 D-编号决策点

**审查维度**: 约束提取 → 架构约束检查 → Spec 缺口检测 → 跨任务依赖分析 → 风险评分 → D-编号输出

| 工具 | 作用 |
|------|------|
| pre-audit 技能 | 8 阶段系统化审查流程 |
| AGENTS.md | 约束对照表 |
| grep | 验证 spec 关键词与现有代码不冲突 |

**交付物**: redo.md 中 D-编号表格，每个 D 含: 问题描述 / 选项 A (含工时风险) / 选项 B / 建议。

**退出条件**: 所有模糊 spec 转为 D 编号 或 Boss 已补全。

---

## Step 3 — Boss 裁决

**触发**: Auditor 提交 D-编号  
**输出**: 每个 D 的裁决 (A / B / 否决 / 自定义) + 理由

**裁决前**: D-编号中涉及工时 >4h 或架构变更的，先让 Developer 确认可行性再裁决。避免 Boss 选了方案 A 但 Developer 实现不了。

**裁决选项**:

| 选项 | 含义 | 例子 |
|------|------|------|
| A | 采纳方案 A | "D120: 选 A — 删 LocalGraph，纪律性优先" |
| B | 采纳方案 B | "D121: 选 B — 保留 sql.js，sqlite-wasm 验证失败" |
| 否决 | D 本身是伪问题，关闭 | "D125 否决 — Drop Zone 已有 URL 协议白名单" |
| 自定义 | Boss 提出第三种方案 | "不走 A 也不走 B，做 C: ..." |

**交付物**: redo.md 中 D-编号标注 `Boss 裁决: 选项 X / 否决(理由) / 自定义 — 理由`

---

## Step 4 — Developer 规格回译

**触发**: Boss 裁决完毕  
**输出**: redo.md 中 Developer 回译确认

**Developer 用自己话写一遍关键验收条件**, 同时标注不确定项。Boss 确认理解一致。

```
Developer 回译 (Phase N):
- Txxxx: 我要做 ____，验收标准是: ① ___ ② ___ ③ ___
- Txxxy: 我要删 ____，验证方法是: grep "xxx" → 0 结果
- ⚠️ 不确定: "卡片 hover 操作按钮出现" — 是 opacity 0→1 还是 display none→block？
```

**范围门禁 (硬约束)**:
- ✅ 可以讨论: 验收条件的具体含义、技术可行性、工时估算、实现方案选择
- ❌ 不可重开: Phase 主题方向、是否该做某任务、产品哲学立场——这些是 Step 1-3 已锁定的决策
- 若 Developer 认为某任务技术上不可行 → 标注 ⚠️ 并说明具体障碍，由 Boss 裁决，但不可以此为入口重新讨论"该不该做"

**为什么**: Phase 23 75 个色值 90% 偏差的根因就是 Developer 看了 spec 但理解不同。但同样重要的是——方向在 Step 3 已锁定，回译是确认执行路线图，不是重新画地图。

**退出条件**: Boss 回复 "理解一致" + 所有 ⚠️ 已澄清。

---

## Step 5 — Developer 写代码

**触发**: 规格回译通过  
**输出**: git diff

**编码中自检 (边写边查)**:

| # | 检查项 | 工具 |
|---|--------|------|
| □ | 新 IPC: channel → handler → preload → WindowApi → api-client 五步全 | grep 确认每层 |
| □ | 新 BrowserWindow: `nodeIntegration:false, contextIsolation:true, sandbox:true` | 对照 AGENTS.md |
| □ | 新 Schema 列: `schema.ts` + `migrateDatabase()` ALTER TABLE | grep 两处 |
| □ | SQL 兼容: 无 `datetime('now')` / `INSERT OR REPLACE` / `INSERT OR IGNORE` 裸用 | grep |
| □ | XSS 防护: `dangerouslySetInnerHTML` 前有 `DOMPurify.sanitize()` | grep |
| □ | 路径安全: `fs.readFile`/`fs.unlink` 有 `path.basename()` 或 workspace 检查 | grep |
| □ | 无 `prompt()` / `alert()` / `confirm()` 在 renderer | grep `prompt(\|alert(\|confirm(` src/renderer/ → 0 (Phase 23 confirm 在 KB 批量删除用过) |
| □ | 无 `console.log` 残留 (仅 `console.error` 保留) | grep `console.log` src/ → 0 |
| □ | 导入路径: renderer 不 import `src/main/`, main 不 import `src/renderer/` | grep |
| □ | **`data:` URL 页面内 onclick 必须用 `window.fn()` 前缀** | `data:text/html` 下裸函数名解析不到全局作用域 |
| □ | **React hooks 全部在条件 return 之前** | `if (loading) return <Spinner/>` 之后再有 `useEffect` → "Rendered more hooks" 崩溃 |
| □ | **CSS 颜色只用 `var(--token)`，禁止硬编码 hex** | grep `#[0-9a-fA-F]\{3,6\}` src/renderer/ → 仅 `:root` / theme 块 |

---

## Step 6 — Developer 自检 (提交修复报告前强制)

**触发**: 编码完成  
**输出**: 自检报告写入 redo.md 修复记录

> **若是二次修复 (Auditor 打回后)**: 只跑 6a 自动化门禁 + grep 修复涉及的具体模式 + 被 Auditor 打回的 smoke test 项。不用重跑全部 15 步。

### 6a. 自动化门禁 (必须全绿)

```bash
npm run ci          # 一键: lint:arch + biome + tsc + build + test
```

| 指标 | 门禁 |
|------|------|
| `tsc --noEmit` | 0 错误 |
| `tsc -p tsconfig.node.json --noEmit` | 0 新增错误 |
| `tsc -p tsconfig.web.json --noEmit` | 0 新增错误 |
| `npm run build` | 通过 |
| `npm run test` | 87+/87+ pass, 0 fail |

### 6b. 逻辑防御 grep (针对本次改动)

```bash
# 根据改动类型选择性执行
grep "prompt(\|alert(\|confirm(" src/renderer/ -r     # 确保无原生弹窗残留
grep "dangerouslySetInnerHTML" src/ -r -A2 | grep -v "DOMPurify"  # 确保全部包裹
grep "catch {}" src/main/ -r             # 确保无空 catch
grep "catch {" src/main/ -r | grep -v "console.error\|catch (err\|catch (e"  # 确保 catch 有内容
grep "INSERT OR REPLACE\|INSERT OR IGNORE\|datetime('now'" src/main/ -r  # 确保 SQL 兼容
grep "as any\|: any" src/renderer/ -r | wc -l          # 计数，应 ≤ 上一次基线
grep "console.log" src/ -r                              # 确保 0（仅 console.error 可保留）
grep "#[0-9a-fA-F]\{3,6\}" src/renderer/ -r --include="*.css" | grep -v "var(--" | grep -v ":root\|theme"  # 硬编码颜色 0
```

### 6c. Smoke Test Checklist (手动, 15 步核心路径)

```
□ 启动应用, 无白屏, 渲染正常
□ 今日页: 添加待办 → 勾选完成 → 有删除线+绿勾 或 消失(看产品规则)
□ 今日页: 保存便签 → 日历上出现蓝点
□ 博客页: 新建博客 → 保存 → 列表页可看到
□ 博客页: 点击文章 → 点编辑 → 编辑器出现, 可输入
□ 博客页: 暗/亮/暖 三阅读主题切换正常
□ 知识库: 拖入文件 → 卡片出现
□ 知识库: 点击卡片"打开"→ 系统默认程序打开文件
□ 白板: 添加节点 → 连线 → 编辑 → 删除
□ 设置: 主题切换 → 全局生效
□ 设置: 背景图选择 → 全局可见
□ 侧边栏: 折叠/展开 → 布局自适应
□ AI: 打开对话面板 → 发消息 → 有回复
□ 回收站: 可看到已删项 → 恢复/永久删除正常
□ Ctrl+B 侧边栏 / ? 快捷键帮助 / Escape 关闭弹窗
□ 快捷便签: Alt+Space → 输入文字 → 保存 → 便签列表可见
□ 背景图: 设置页选图 → 全局可见 → 重启应用后仍存在
□ 侧边栏: 头像和注销按钮始终可见（不随导航滚动隐藏）
```

**退出条件**: 自动化门禁全绿 + grep 零意外 + smoke test 全部通过。

---

## Step 7 — Auditor 实施审查

**触发**: Developer 提交修复报告  
**技能**: `.claude/skills/full-audit/SKILL.md`  
**输出**: redo.md 验证结果 + 新 R-编号

**审查流程 (6 Pass)**:

| Pass | 名称 | 耗时 | 方法 |
|------|------|------|------|
| 1 | 上下文加载 | 30s | 读 AGENTS.md → todo.md → suggest.md → redo.md → types.ts → ipc-channels.ts |
| 2 | 自动扫描 | **10s** | `bash scripts/pre-audit.sh` — 16 类自动检查，抓 80% 常见 bug |
| 3 | Spec 约束验证 | 5min | 逐字对照法：提取 spec 每个数字/色值/关键词，grep 验证 |
| 4 | 四 Agent 深审 | 并行 | 安全+数据 / 类型+IPC / 冗余+维护 / 健壮+生命周期 |
| 5 | 构建验证 | 6s | `tsc --noEmit` + `tsc -p tsconfig.node.json` + `tsc -p tsconfig.web.json` + `npm run build` + `npm run test` |
| 6 | 报告输出 | 5min | 汇总 → R-编号 tickets → 写入 redo.md |

> **若是二次审查 (Developer 二次修复后)**: 只验证被标记 🔄 的 R-编号 + 运行 Pass 2 (pre-audit.sh) 确认无新引入问题。不必重跑全部 Pass。

**4 条铁律**:

1. **不得有延后项** — P0+P1+P2 必须清零
2. **grep 验证优于肉眼** — "大概有了"不算验证
3. **新 BrowserWindow = 安全必审** — nodeIntegration/contextIsolation/sandbox/preload
4. **Pass 2 必须跑** — 永远先跑 `pre-audit.sh`，再人工审查

**交付物**: redo.md 每条 R-编号的验证结果 ✅/🔄/⚠️ + 新发现 R-编号。

---

## Step 8 — Boss 验收

**触发**: Auditor 验证全部 ✅  
**输出**: Boss 裁决

**Boss 验收清单**:

| # | 检查项 |
|---|--------|
| □ | redo.md P0+P1 全部 ✅ |
| □ | Auditor 验证报告无 🔄 |
| □ | `tsc --noEmit` 零错误 |
| □ | `npm run build` 通过 |
| □ | `npm run test` 全绿 |
| □ | 打开应用, 快速浏览核心页面, 无崩溃或明显异常 |
| □ | **Spec vs 实现对照**: 逐项 grep spec 中的关键交付物 — 例: spec 写 "#b8826a" → grep 实际色值; spec 写 "卡片不等高" → 读组件 CSS。文件存在 ≠ 功能正确。色值/间距/交互必须与 spec 精确匹配 |

---

## 分歧升级路径

| 分歧类型 | 升级到 | 裁决方式 |
|----------|--------|---------|
| Developer 对 D-编号工时/可行性有异议 | Boss | Boss 听取双方后裁决 |
| Auditor vs Developer 对 R-编号严重性有分歧 | Boss | Boss 终裁 P 级别 |
| Developer 报告完成, Auditor 认为未完成 | Boss | Boss 对照 spec grep 验证, 逐项裁定 |
| Boss 对 Auditor 审查质量不满 | — | Boss 直接要求重审, 写具体原因 |

## Step 9 — Boss 文档同步

**触发**: 验收通过  
**输出**: 文档更新

```
sync-docs skill:
- todo.md: 任务状态 → ✅, 工时 → 实际, 代码质量基线更新
- README.md: 构建状态/版本/功能表/架构计数 (IPC/Service/Route)
- AGENTS.md: "当前状态"段更新 (Phase/工单/构建基线/as any 计数)
- redo.md: "当前开放"状态更新
- phase-archive.md: 已完成 Phase 归档 (含任务摘要+Boss 裁决)
- history-audit.md: 审计趋势 + R/D 编号统计更新
- 跨文档交叉验证: IPC/Service/Test 计数一致性, 链接有效性
```

---

## Step 10 — Boss 发布

**触发**: 文档同步完成  
**输出**: 打包版本

**Pre-Flight 阻断检查 (任一项不通过则阻断 ship)**:

| □ | 检查项 | 验证 |
|---|--------|------|
| □ | redo.md 🔴P0 = 0 | P0 阻断 ship |
| □ | redo.md 🟠P1 = 0 | P1 需修复或显式延后 (Boss 签字) |
| □ | suggest.md 不存在 | 存在 = 未处理提案，需先裁决或删除 |
| □ | git status 无意外文件 | `.env` / `credentials.json` / `node_modules` / `.claude/worktrees/` |
| □ | `.gitignore` 覆盖 `dist2/` + `.claude/worktrees/` + `release/` | 防止意外提交 |

```
ship skill:
- 便携版 (pack.js + ASAR)
- NSIS 安装包 (electron-builder)
- git commit + push
```

---

## 角色职责速查

| | Boss | Developer | Auditor |
|------|------|-----------|---------|
| 写代码 | ❌ | ✅ | ❌ |
| 写 spec | ✅ | ❌ | ❌ |
| 审查代码 | ❌ | ❌ | ✅ |
| 改 redo.md | 裁决 | 更新修复状态 | 写问题 + 验证 |
| 改 todo.md | ✅ | 更新状态+备注 | ❌ |
| 改 AGENTS.md | ✅ | ❌ | ❌ |
| 改 README.md | ✅ | ❌ | ❌ |
| 自检 (smoke test) | ❌ | ✅ | ❌ |
| grep 回归检查 | ❌ | ✅ | ✅ |
| 文档同步 | ✅ | ❌ | ❌ |
| 打包发布 | ✅ | ❌ | ❌ |

---

## Boss Execution Boundary (T2406 QuickNav 教训)

> "Boss 同时定义规则 + 实现" 侵蚀去人格化治理。Constitution 靠流程保障，不靠 Boss 直觉。

| 场景 | Boss 是否进入 execution | 理由 |
|------|------------------------|------|
| Emergency unblock (安全漏洞/数据损坏) | ✅ 可 | 时效性 > 流程 |
| Prototype spike (验证可行性) | ✅ 可 | 探索性质，不直接进入产品 |
| Constitution patch (宪法修正后的示范实现) | ⚠️ 尽量不 | QuickNav 是反面案例——spec 边界已足够清晰，Developer 完全能独立完成 |
| 正常 usability fix | ❌ 尽量不 | 走正常流程: spec → pre-audit → implement → verify |
| 常规 feature implementation | ❌ 不应 | 严格通过 workflow.md 10 步流程 |

**核心原则**: Boss 产出 spec + 边界 + 裁决，不是 diff。即使 Boss 能写出 constitution-compliant 的代码，执行流程本身也必须 constitution-compliant。

**QuickNav 事后纠正**: 本次实现已由 Boss 完成并验证通过，不再回退。但未来同类 usability fix 必须走: Boss spec → Auditor pre-audit → Developer implement → Auditor verify 完整链路。

---

## 每个 Phase 关键数字

| 指标 | 目标 |
|------|------|
| spec 回译/裁决耗时 | < Phase 总工时 5% |
| Developer 自检 catches 的问题数 | > 总问题数的 70% (Auditor 收到的应是"难题"不是"疏漏") |
| Auditor 审查发现的 P0 | < 3 个/Phase (超过说明自检不够) |
| 用户(Boss)发现的问题 | 0 |
| 回归 bug | 0 (每 Phase 结项后新增 2-3 条常青 grep) |

---

> 最后更新: 2026-05-21 | 基于 Phase 1-23 协作经验提炼
