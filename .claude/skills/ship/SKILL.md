---
name: ship
description: Boss专属 — Complete ship pipeline: sync docs, package Electron app, commit and push to GitHub. Combines sync-docs + package + git push into a single automated workflow. Invoke when the user says "ship", "打包上传", "发布", "推送", "一条龙", or wants to finalize and deliver changes.
boss-only: true
---

# Ship Skill

> **Boss 专属** — 一键完成文档同步、打包、提交、推送全流程。

## Pre-Flight

Before starting, quick sanity check:
- `git status` — any unexpected files? (.env, credentials, node_modules, large binaries)
- redo.md — any 🔴 P0? If yes, warn before shipping

## Pipeline

按顺序执行，任一步失败即停止并报告。

### Step 1: Sync Docs

执行 sync-docs 检查并更新：
- 收集代码实际数据（IPC 通道数、service 数、`as any` 计数、IPC handler 数）
- 对比 AGENTS.md 和 README.md 中的声明 → 修正漂移
- 更新 AGENTS.md "当前状态" 段
- 更新 README.md Phase 表 + 构建状态行 + 架构图中计数
- 更新 `docs/phase-archive.md` 归档最新完成的 Phase
- 同步 todo.md 时间戳

### Step 2: Package

```bash
node scripts/pack.js
```

验证打包输出：`HashRouter` ≥ 1, `disableHardwareAcceleration` ≥ 1, `crossorigin` = 0, `webviewTag` ≥ 1。

### Step 3: Commit

```bash
git add -A
git commit -m "<message>"
```

Commit message 格式：`Phase <N>: <scope> — <key deliverables>`

例：`Phase 14: 工程质量深化 + 体验交付 — 11/11 全部完成`

### Step 4: Push

```bash
git push
```

## Report Format

```
Ship Report
===========
Docs: ✅ synced (N drifts fixed)
Package: ✅ Xs (HashRouter/disableGPU/crossorigin/webviewTag OK)
Commit: <short-hash> — <message>
Push: ✅ main -> main
```

## Rules

- **Stop on failure** — 任一步失败不继续，报告失败原因
- **Boss-only** — Developer 和 Auditor 不可调用
- **Commit 前确认** — 如果工作区有未预期的文件（.env, 大二进制, node_modules），先报告
- **不要在 redo.md 有 P0 时 ship** — P0 阻断应先修复
