---
name: ship
description: Boss专属 — Complete ship pipeline: sync docs, package Electron app (portable + NSIS installer with auto-update), commit and push to GitHub. Combines sync-docs + package + git push into a single automated workflow. Invoke when the user says "ship", "打包上传", "发布", "推送", "一条龙", or wants to finalize and deliver changes.
boss-only: true
---

# Ship Skill

> **Boss 专属** — 一键完成文档同步、打包、提交、推送全流程。

## Pre-Flight

Before starting, quick sanity check:
- `git status` — any unexpected files? (.env, credentials, node_modules, .claude/worktrees/, large binaries)
- redo.md — any 🔴 P0 or 🟠 P1? If yes, warn before shipping. P0 blocks ship. P1 should be fixed or explicitly deferred.
- redo.md — P2/P3 count. Phase 19+ targets P0+P1+P2+P3 all-zero. Non-zero P2/P3 should have explicit deferral reason.
- `suggest.md` — should NOT exist. If it does, unprocessed proposals remain.

## Pipeline

按顺序执行，任一步失败即停止并报告。

### Step 1: Sync Docs

执行 sync-docs 检查并更新：
- 收集代码实际数据（IPC 通道数、service 数、`: any`/`as any` 计数、测试数）
- 对比 AGENTS.md 和 README.md 中的声明 → 修正漂移
- 更新 AGENTS.md "当前状态" 段
- 更新 README.md Phase 表 + 构建状态行 + 架构图中计数 + 功能描述
- 更新 `docs/phase-archive.md` 归档最新完成的 Phase
- 更新 `docs/history-audit.md` 审计趋势 + 安全里程碑
- 同步 todo.md 时间戳 + 代码质量基线
- 验证 `noUncheckedIndexedAccess` 仍在启用状态

### Step 2: Package

**方案 A — 便携版（绿版，最快）：**
```bash
node scripts/pack.js
```
输出：`release/Idiot-win32-x64/Idiot.exe`

**方案 B — NSIS 安装包（带自动升级）：**
```bash
npx electron-builder --win --config electron-builder.yml
```
输出：`dist/Idiot_SetUp.exe`（约 140MB, NSIS 安装向导）。若 dist/ 文件锁，`electron-builder.yml` 可设 `directories.output: dist2/`。

如果方案 B 网络不通（无法下载 Electron 二进制），回退到方案 A，然后手动更新便携版 ASAR：
```bash
# 手动更新便携版 ASAR（本地离线）
npx asar extract release/Idiot-win32-x64/resources/app.asar /tmp/fe
rm -rf /tmp/fe/out && cp -r out/ /tmp/fe/out
npx asar pack /tmp/fe release/Idiot-win32-x64/resources/app.asar
rm -rf /tmp/fe
```

### Step 3: Verify

打包后验证：

| 检查项 | 便携版 | 安装版 |
|--------|--------|--------|
| HashRouter ≥ 1 | `grep -c "HashRouter" out/renderer/assets/index-*.js` | 解压 ASAR 后同 |
| disableHardwareAcceleration ≥ 1 | `grep -c "disableHardwareAcceleration" out/main/index.js` | 同 |
| crossorigin = 0 | `grep "crossorigin" out/renderer/index.html \| wc -l` | 同 |
| webviewTag ≥ 1 | `grep -c "webviewTag" out/main/index.js` | 同 |
| autoUpdater ≥ 1 | `grep -c "autoUpdater\|electron-updater" out/main/index.js` | 同 |
| search.worker 已打包 | `grep "search.worker" out/renderer/index.html` 或 ASAR list | 同 |
| guide SVG ≥ 1 | `ls out/renderer/assets/guide-*.svg \| wc -l` | ASAR list `grep guide-` |
| img/ 资源存在 | `ls out/renderer/img/` (drug.png/favicon.ico/static.png) | 安装版: `ls resources/img/` (extraResources) |

### Step 4: Commit

```bash
git add -A
git commit -m "<message>"
```

**`git add -A` 注意**：检查暂存区是否混入了 `.claude/worktrees/`（嵌入 git 仓库）或临时脚本。如有，`git rm --cached -f` 移除后再 commit。确保 `.gitignore` 已包含 `dist2/` 和 `.claude/worktrees/`。

Commit message 格式：
- 完整 Phase: `Phase <N>: <scope> — <key deliverables> 全部完成`
- 修复提交: `Phase <N>: Rxxx/Rxxx 修复 — <what was fixed>`
- 打包/配置: `Phase <N>: 添加 electron-builder NSIS 安装包 + 自动升级配置`

例：`Phase 18: 工程收官 + 产品收尾 — FTS5/CRUD收敛/错误反馈/测试/UX补缺 7/7 全部完成`

### Step 5: Push

```bash
git push
```

## Report Format

```
Ship Report
===========
Docs: ✅ synced (N drifts fixed)
Package: ✅ Xs (HashRouter/disableGPU/crossorigin/webviewTag/autoUpdater OK)
Commit: <short-hash> — <message>
Push: ✅ main -> main
```

If packaging failed (network), note the reason and which artifacts are available.

## Rules

- **Stop on failure** — 任一步失败不继续，报告失败原因
- **Boss-only** — Developer 和 Auditor 不可调用
- **Commit 前确认** — 如果工作区有未预期的文件（.env, 大二进制, node_modules），先报告
- **不要在 redo.md 有 P0 或 P1 时 ship** — P0/P1 阻断应先修复
- **Phase 结项 ship 确保归档完整** — AGENTS/README/phase-archive/history-audit 四处 Phase 状态一致
- **打包产物不入 git** — `dist/`、`dist2/`、`release/` 在 .gitignore 中。安装包通过 GitHub Releases 分发
- **Commit 前检查 .gitignore** — 确保 `dist2/` 和 `.claude/worktrees/` 已加入 `.gitignore`，防止 `git add -A` 混入大文件或嵌入仓库
