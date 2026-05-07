---
name: ship
description: Boss专属 — Complete ship pipeline: sync docs, package Electron app, commit and push to GitHub. Combines sync-docs + package + git push into a single automated workflow. Invoke when the user says "ship", "打包上传", "发布", "推送", or wants to finalize and deliver changes.
boss-only: true
---

# Ship Skill

> **Boss 专属** — 一键完成文档同步、打包、提交、推送全流程。

## Pipeline

按顺序执行，任一步失败即停止并报告。

### Step 1: Sync Docs

调用 `sync-docs` 技能，验证并更新 AGENTS.md、README.md、todo.md 与代码的一致性。

或手动执行关键检查：

```bash
# 验证 IPC 通道数
grep -c ":" src/shared/ipc-channels.ts

# 验证测试
npx vitest run 2>&1 | grep "Tests"
```

更新 AGENTS.md 的"当前状态"和 README.md 的 Phase 表。

### Step 2: Package

```bash
node scripts/pack.js
```

验证打包输出包含 `HashRouter`、`disableHardwareAcceleration`、`webviewTag`，且无 `crossorigin` 残留。

### Step 3: Commit

```bash
git add -A
git commit -m "<message>"
```

Commit message 格式：`Phase <N>: <scope> — <key deliverables>`

### Step 4: Push

```bash
git push
```

## Report Format

```
Ship Report
===========
Docs: ✅ synced / ⚠️ N drifts
Package: ✅ Ns / ❌ fail
Commit: <hash> — <message>
Push: ✅ main -> main / ❌ rejected
```

## Rules

- **Stop on failure** — 任一步失败不继续
- **Boss-only** — Developer 和 Auditor 不可调用
- **Commit 前确认** — 如果工作区有未预期的文件，先报告
