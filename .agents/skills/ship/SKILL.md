---
name: ship
description: Boss专属 — 一条龙发布：Pre-Flight 阻断检查 → 双包构建 (便携版+NSIS安装包) → 验证 → git commit → git push。触发：用户说"ship"、"打包上传"、"发布"、"推送"、"一条龙"、文档同步完成后。这是 workflow.md Step 10，任一步失败即停止。
boss-only: true
---

# Ship — Boss 发布

> **Boss 专属 · workflow.md Step 10** — 一键完成 Pre-Flight → Package → Verify → Commit → Push

## Step 0: Pre-Flight 阻断检查

任一项不通过则阻断 ship：

| □ | 检查项 | 验证 |
|---|--------|------|
| □ | redo.md 🔴P0 = 0 | P0 阻断 ship |
| □ | redo.md 🟠P1 = 0 | P1 需修复或 Boss 显式延后 |
| □ | `suggest.md` 不存在 | `ls suggest.md` → 不存在 (存在 = 未处理提案) |
| □ | git status 无意外文件 | 无 `.env` / `credentials.json` / `node_modules` / `.Codex/worktrees/` |
| □ | `.gitignore` 覆盖关键目录 | `grep -c "dist2\|\.Codex/worktrees\|release" .gitignore` |

附加快速检查：
- `build/icon.ico` ≥30KB 且 <50KB (256×256)
- `electron-builder.yml` `directories.buildResources` 不指向 app 资源目录
- `scripts/installer.nsh` 快捷方式指向 `$INSTDIR\Idiot.exe`

**Phase 24+ Collapse 时代附加阻断检查**:

| □ | 检查项 | 验证 |
|---|--------|------|
| □ | 无 hidden state machine | grep 已删除系统的 store/context → 确认无后台运行的隐形状态机 |
| □ | 无 persistence leakage | grep 废弃 localStorage keys → 确认已物理清理 |
| □ | 无 ghost infrastructure | grep 已删除组件文件名 → 确认物理文件不存在 (不能"留着以后用") |
| □ | 无 ghost component | grep 新建未接入组件 → 确认已 DEPRECATED 或已删除 |
| □ | 永久可见 panel ≤ 1 | 目视确认: 右侧/底部无永久系统 panel |

## Step 1: Package

### 方案 A — 便携版 (最快)

```bash
node scripts/pack.js
```

输出：`release/Idiot-win32-x64/Idiot.exe`

### 方案 B — NSIS 安装包 (带自动升级)

```bash
npx electron-builder --win --config electron-builder.yml
```

输出：`dist2/Idiot_SetUp.exe` (~140MB NSIS 安装向导，含 auto-update)

若方案 B 网络不通，回退方案 A，然后手动更新便携版 ASAR：

```bash
rm -rf /tmp/fe && mkdir -p /tmp/fe
npx asar extract release/Idiot-win32-x64/resources/app.asar /tmp/fe
# ⚠️ 验证: ls /tmp/fe/out/main/index.js 必须存在
rm -rf /tmp/fe/out && cp -r out/ /tmp/fe/out
cp package.json /tmp/fe/
npx asar pack /tmp/fe /tmp/app.asar
# ⚠️ 验证: ls -la /tmp/app.asar — 28 bytes = 打包失败(临时目录空)
npx asar extract /tmp/app.asar /tmp/verify && ls /tmp/verify/out/ 必须有内容
cp /tmp/app.asar release/Idiot-win32-x64/resources/app.asar
rm -rf /tmp/fe /tmp/app.asar /tmp/verify
```

**常见陷阱**: 不用 `2>/dev/null` 隐藏 asar 错误。28 bytes ASAR = `{"files":{}}` → exe 白屏崩溃。

## Step 2: Verify

| 检查项 | 便携版 | 安装版 |
|--------|--------|--------|
| HashRouter ≥ 1 | `grep -c "HashRouter" out/renderer/assets/index-*.js` | 解压 ASAR 同 |
| disableHardwareAcceleration ≥ 1 | `grep -c "disableHardwareAcceleration" out/main/index.js` | 同 |
| crossorigin = 0 | `grep "crossorigin" out/renderer/index.html \| wc -l` | 同 |
| webviewTag ≥ 1 | `grep -c "webviewTag" out/main/index.js` | 同 |
| autoUpdater ≥ 1 | `grep -c "autoUpdater\|electron-updater" out/main/index.js` | 同 |
| search.worker 已打包 | `grep "search.worker" out/renderer/assets/index-*.js` | 同 |
| embedding.worker 已打包 | `ls out/renderer/assets/embedding.worker-*.js \| wc -l` | 同 |
| guide SVG ≥ 1 | `ls out/renderer/assets/guide-*.svg \| wc -l` | ASAR list |

### img/ 三位置验证 (安装版)

1. `ls dist2/win-unpacked/resources/img/` — extraResources, 应有 drug.png/favicon.ico/static.png
2. `ls dist2/win-unpacked/resources/app.asar.unpacked/img/` — asarUnpack
3. `npx asar list dist2/win-unpacked/resources/app.asar | grep "out/renderer/img/"` — post-build.js 注入
4. `md5sum` 对比源文件和打包文件，排除损坏

## Step 3: Commit

```bash
git add -A
git commit -m "<message>"
```

- 检查暂存区无 `.Codex/worktrees/` (嵌入仓库) 或临时脚本
- 确保 `.gitignore` 已包含 `dist2/` 和 `.Codex/worktrees/`

**Commit message 格式**:
- 完整 Phase: `Phase <N>: <scope> — <key deliverables> 全部完成`
- 修复: `Phase <N>: Rxxx/Rxxx 修复 — <what was fixed>`
- 例：`Phase 23: 全应用 bug 修复 + 文档同步 + 双包构建 — 15项修复全部完成`

## Step 4: Push

```bash
git push
```

## 输出

```
Ship Report
===========
Pre-Flight: ✅ 5/5
Package: ✅ portable (Xs) + NSIS (Xs)
  HashRouter:N disableGPU:N crossorigin:OK webviewTag:N autoUpdater:N
  search.worker:OK embedding.worker:OK guide SVG:N img/3pos:OK checksum:一致
Commit: <short-hash> — <message>
Push: ✅ main -> main
```

## 规则

- **Stop on failure** — 任一步失败不继续
- **Boss-only** — Developer 和 Auditor 不可调用
- **P0 阻断 ship** — redo.md 有 P0 时先修复
- **打包产物不入 git** — `dist/`/`dist2/`/`release/` 在 .gitignore
- **图片资源必须 `asarUnpack`** — `nativeImage.createFromPath()` 需真实路径
- **`directories.buildResources` ≠ app 资源目录** — electron-builder 会自动排除此目录
