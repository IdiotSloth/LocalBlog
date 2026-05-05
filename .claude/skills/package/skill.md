---
name: package
description: Electron 应用打包流程——构建、ASAR 打包、白屏问题修复、开始菜单快捷方式创建。使用程序化 API 替代 CLI 命令，一键完成。
---

# Electron 应用打包技能

## 触发条件

当用户要求打包 Electron 应用、创建 exe、或解决打包后白屏问题时触发。

## 一键打包

```bash
node scripts/pack.js
```

此脚本通过 `@electron-forge/core` 的**程序化 API** 完成全部打包流程，无需手动 CLI 分步操作：

```
pack.js 流程:
  1. npm run build             → 编译 main/preload/renderer
  2. api.package({ ... })      → Electron Forge 程序化打包（跳过 Squirrel 安装器）
  3. ASAR 更新                 → 自动将 out/ 写入 app.asar
  4. 验证                      → 检查 HashRouter / disableGPU / crossorigin / webviewTag
  5. 报告                      → 输出构建摘要
```

如果 `scripts/pack.js` 不存在，回退到分步打包流程。

---

## 分步打包（回退方案）

### 第一步：构建

```bash
npm run build
```

产物位于 `out/` 目录。`scripts/post-build.js` 会创建 `out/package.json` 并去除 HTML 中的 `crossorigin`。

### 第二步：程序化打包

使用 `@electron-forge/core` 的程序化 API，消除 CLI 依赖：

```js
// scripts/pack.js 核心逻辑
import { api } from '@electron-forge/core';

const appPaths = await api.package({
  dir: __dirname,
  interactive: false,
});
```

此方法等效于 `npx electron-forge package` 但**程序化调用**，可嵌入脚本无需 shell。产物位于 `release/LocalBlogKB-win32-x64/`。

**为什么不用 `api.make()`**：`make()` 会创建 Squirrel 安装程序（NSIS），在本项目中已知会卡在 "Finalizing package"。直接用 `package()` 跳过安装程序创建，只生成可运行的 exe 目录。

### 第三步：更新 ASAR

```bash
npx asar extract release/LocalBlogKB-win32-x64/resources/app.asar /tmp/app
cp -r out/main out/preload out/renderer out/package.json /tmp/app/out/
rm release/LocalBlogKB-win32-x64/resources/app.asar
npx asar pack /tmp/app release/LocalBlogKB-win32-x64/resources/app.asar
rm -rf /tmp/app
```

---

## 验证打包结果

### 自动验证（推荐）

`scripts/pack.js` 内置自动验证，检查：

| 检查项 | 方法 |
|--------|------|
| HashRouter | `grep -c "HashRouter" out/renderer/assets/index-*.js` |
| disableHardwareAcceleration | `grep -c "disableHardwareAcceleration" out/main/index.js` |
| crossorigin 去除 | `grep "crossorigin" out/renderer/index.html` 应为空 |
| webviewTag | `grep -c "webviewTag" out/main/index.js` |
| 宠物资源 | ASAR 中 `static.png` 存在 |

### 手动验证

```bash
npx asar extract release/LocalBlogKB-win32-x64/resources/app.asar /tmp/check
grep -c "HashRouter" /tmp/check/out/renderer/assets/index-*.js
grep -c "disableHardwareAcceleration" /tmp/check/out/main/index.js
rm -rf /tmp/check
```

### 启动测试

```bash
cmd.exe /c "scripts\launcher.bat"
tasklist //fi "IMAGENAME eq LocalBlogKB.exe"
```

---

## 打包后白屏问题

### 1. ELECTRON_RUN_AS_NODE（系统级）

**症状**: 双击 exe 白屏/闪退。

**原因**: 系统环境变量 `ELECTRON_RUN_AS_NODE=1` 导致 Electron 以 Node.js 模式运行。

**修复**: 快捷方式指向 `scripts/launcher.bat`（先清除环境变量再启动 exe）。快捷方式创建见 `src/main/index.ts`。

### 2. GPU 硬件加速不兼容

**修复**: `app.disableHardwareAcceleration()` + `--disable-gpu`（已在 `src/main/index.ts:9-10`）。

### 3. BrowserRouter + file:// 不兼容

**修复**: 使用 `HashRouter`（已在 `src/renderer/App.tsx` 中）。

### 4. crossorigin 阻止 ES 模块

**修复**: `scripts/post-build.js` 中 `html.replace(/\s+crossorigin/g, '')`。

### 5. CSP 阻止内联脚本

**修复**: 移除 `index.html` 中的 `<meta http-equiv="Content-Security-Policy">`。

---

## 开始菜单快捷方式

- **名称**: Idiot
- **位置**: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Idiot.lnk`
- **目标**: `scripts/launcher.bat`
- 首次启动 `app.whenReady()` 自动创建

---

## 常见问题

| 问题 | 排查 |
|------|------|
| ASAR 不含 out/ | 检查 forge.config.ts ignore 规则 |
| Squirrel 卡住 | 使用 `api.package()` 替代 `api.make()` |
| 快捷方式打不开 | 确认 launcher.bat 路径为绝对路径 |
| 首次启动未创建快捷方式 | 以 `npm run dev` 启动一次触发创建逻辑 |
