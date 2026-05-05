# 本地博客与知识库存储系统 — 待办事项

> 最后更新: 2026-05-05 17:45:54 | 自动同步

---

## 1. 概览与图例

### 状态图例

| 标记 | 含义 |
|------|------|
| ✅ | 已完成 |
| 🚧 | 进行中 |
| 📋 | 待实施 |
| 🔴 | 阻塞 |
| ⚠️ | 有风险 |
| 🆕 | 后续新增 |

### 关联标记

每个任务标注对应的需求编号 (FR-XX)，便于追溯。

> **技术债与修复清单** 见 [redo.md](redo.md) — 记录已发现但未修复的问题。
> **历史任务规格** 见 [docs/phase-archive.md](docs/phase-archive.md) — Phase 1-7 完整任务详情。
> **开发参考** 见 [docs/development-guide.md](docs/development-guide.md) — 测试策略、工作流程图、文件清单。

### 角色权限

| 角色 | 对 todo.md 的权限 |
|------|-------------------|
| **Boss** | 完全控制：新增/修改/删除任务、调整优先级、标注"当前优先" |
| **Developer** | 部分可写：更新任务状态 ✅/🚧/⏭、追加"Developer 备注" |
| **Auditor** | 不可写 |

---

## 2. Phase 完成状态

| Phase | 范围 | 估算 | 完成日期 | 状态 |
|-------|------|------|----------|------|
| Phase 1 | 项目骨架 + 用户认证 + Session 管理 | — | 2026-04-30 | ✅ |
| Phase 2 | 博客 CRUD + Tiptap 编辑器 + 标签系统 | 32h | 2026-04-30 | ✅ |
| Phase 3 | 知识库文件导入/管理/预览 | 21h | 2026-04-30 | ✅ |
| Phase 4 | 网页收藏 + SQL LIKE 搜索 + 回收站 | 14h | 2026-05-01 | ✅ |
| Phase 5 | 全局搜索 + 深色主题 + 仪表盘 + 快捷键 | 16h | 2026-05-01 | ✅ |
| Phase 6 | 测试 + 性能优化 + 备份 + 打包 | 30h | 2026-05-01 | ✅ |
| Phase 7 | 核心增强 + 趣味功能 (TOC/文件夹/模板/专注/成就/PDF/双向引用) | 55h | 2026-05-02 | ✅ |
| Phase 8 | 体验增强与互联互通 (系列链/便签/标签清理/关联展示/热力图/Word导出/设计审查) | 24h | 2026-05-03 | ✅ |
| Phase 9 | 工程质量夯实 + 架构债清偿 (逻辑去重/类型安全/XSS/DDL/校验/UI打磨) | 36h | 2026-05-03 | ✅ |
| Phase 10 | 桌面体验 + PDF修复 + 翻页 + UI圆润 (托盘/桌面宠物/PDF/分页/圆角) | 22h | 2026-05-05 | ✅ |
| Phase 11 | 工程收敛 — 安全加固 + 架构收敛 + 质量基线 | 28h | 2026-05-06 (P0+P1+P2-T1108) | 🚧 |

**总计**: ~275h (Phase 2-10 完成, Phase 11 待启动)

> 详细任务规格 (T101-T614, F601-F605) 见 [docs/phase-archive.md](docs/phase-archive.md)。

---

## 3. Phase 8 — 体验增强与互联互通 ✅

> 基于 Boss（使用者身份）实际使用反馈提炼的功能。全部基于现有基础设施做薄 UI 层，零新依赖（T806 除外：`docx` 包）。
> 评估维度: 用户痛点明确 / 实现复杂度低 / 利用已有数据表。

### 任务总览

| 任务 | 名称 | 类型 | 估算 | 优先级 | 解决什么 |
|------|------|------|------|--------|----------|
| T801 | 博客系列/章节链 | 内容组织 | 4h | 🔴 P1 | ✅ 系列文章之间加 prev/next 导航 |
| T802 | 快速便签 | 创作效率 | 2.5h | 🔴 P1 | ✅ 一句话快速记录，不打断工作流 |
| T803 | 标签健康检查 | 数据维护 | 1.5h | 🟡 P2 | ✅ 发现并清理零关联标签 |
| T804 | 阅读页关联展示 | 模块打通 | 4h | 🟡 P2 | ✅ 博客↔知识库双向关联在阅读页可见 |
| T805 | 写作热力图 | 数据激励 | 6h | 🟡 P2 | ✅ GitHub 风格贡献日历，可视化写作节奏 |
| T806 | 博客导出为 Word (.docx) | 分享导出 | 3h | 🟢 P3 | ✅ 导出可编辑 Word 格式，补充 PDF 导出 |
| T904 | UI 设计系统审查与标准化 | 设计一致性 | 3h | 🟢 P3 | ✅ 审查 token 覆盖率、间距/字体一致性、补充缺失规范 |

**P1 (2 项)**: ~6.5h — 系列链 + 便签
**P2 (3 项)**: ~11.5h — 标签清理 + 关联展示 + 热力图
**P3 (2 项)**: ~6h — Word 导出 + 设计审查
**总计: 7 项, ~24h**

#### 建议实施顺序

```
T801 (系列链) → T802 (便签) → T803 (标签清理) → T804 (关联展示) → T805 (热力图) → T806 (Word导出) → T904 (设计审查)
```

---

### Phase 8 实施成果

7 项全部完成，每个都基于现有基础设施做薄 UI 层。详细规格见 [docs/phase-archive.md](docs/phase-archive.md#phase-8-实施)。

### Boss 使用者评估 (2026-05-03)

Phase 8 全部 7 项已完成。作为使用者逐项评价：

| 功能 | 评价 |
|------|------|
| **系列链** | 写系列教程的核心体验闭环。读者从第一篇能一路读到最后。prev/next 导航低调但有用 |
| **快速便签** | 开应用 → 打字 → 回车，两秒完成记录。比之前快 4 步。已成为日常使用最高频功能 |
| **标签清理** | 零关联标签一目了然，一键清理。标签列表终于不会越用越脏 |
| **关联展示** | 博客底部能看到关联的 PDF/文件，知识库文件能看到被哪些博客引用。两个模块之间的墙拆了 |
| **热力图** | 仪表盘上最显眼的东西。看到空白天数会有"今天该写点什么"的压力感——正是设计目的 |
| **Word 导出** | 给不用 Markdown 的人分享时有用。排版保留良好 |
| **设计审查** | 用户不可见，但间接提升了全局一致性（R40 `#fff` 硬编码已消除） |

**Phase 8 总结**: 7 个功能没有一个是"大而全"的，但每个都解决了真实的使用摩擦。从"能用"到"用着舒服"的转变。

---

## 4. Phase 9 — 工程质量夯实 + 架构债清偿 ✅

> 三源合并：Developer 深度评估 (A1-C3) + Auditor 结构审计 (S1-S18) + Boss 使用者 UI 反馈。
> 全部 13 项已完成。构建: ✅ 34 main + 2 preload + 211 renderer, 测试: 27/27 pass (7 crypto + 12 auth + 8 blog)。
> 见 [redo.md](redo.md) "Developer 深度评估" 和 "Phase 9 深度结构审计"。
> Boss 裁决: 首轮聚焦 S1/S2/S4/S7/S14 + A2 + B4 + C1 + UI 三项，共 12 项 ~28h。

### 任务总览

| 任务 | 名称 | 来源 | 估算 | 优先级 |
|------|------|------|------|--------|
| T901 | Server/Main 逻辑去重 — blog list 试点→推广 | S1+S3+S4 | 8h | 🔴 P1 | ✅ |
| T902 | IPC 类型安全 — `WindowApi` + 消灭 `as any` | S2/A1 | 6h | 🔴 P1 | ✅ |
| T903 | XSS 防护 — markdown-it `html: false` + strip 脚本 | B4 | 1h | 🔴 P1 | ✅ |
| T914 | DDL 顺序修复 + ALTER TABLE 存量迁移 | S14 | 1h | 🔴 P1 | ✅ |
| T907 | Server 输入校验 — zod schema 覆盖 POST 端点 | S7 | 3h | 🔴 P1 | ✅ |
| T908 | Server 统一错误处理中间件 | S5 | 2h | 🟡 P2 | ✅ |
| T906 | inline style 治理 — 抽取高频 CSS class | A2 | 4h | 🟡 P2 | ✅ |
| T905 | Service 层基础测试 | C1 | 7h | 🟡 P2 | ✅ |
| T913 | Heatmap 日标签修正 — 周日起始 vs 周一起始 | S13 | 0.5h | 🟢 P3 | ✅ |
| T915 | Server 列表分页 — offset/limit query params | S11 | 0.5h | 🟢 P3 | ✅ |
| U901 | 文件夹侧栏折叠状态持久化 | Boss UI | 1h | 🟡 P2 | ✅ |
| U902 | 主题切换过渡动画 — 200ms CSS transition | Boss UI | 0.5h | 🟢 P3 | ✅ |
| U903 | 博客卡片统一高度 + 标题 hover 完整展示 | Boss UI | 1h | 🟢 P3 | ✅ |

**🔴 P1 (5 项)**: ~19h — 架构 + 类型 + 安全
**🟡 P2 (4 项)**: ~14h — 样式 + 测试 + 错误 + UI
**🟢 P3 (4 项)**: ~3h — 小修小补
**总计: 13 项, ~36h**

> ⚠️ 工时风险: T901/T905 可能超时（架构重构 + 测试 setup 固有不确定性）。建议 T901 先出 0.5h 设计文档再进入实现。
> ⚠️ T904 编号已被 Phase 8 (UI 设计审查) 占用，Phase 9 不再使用此编号。

---

### 纳入说明

Auditor 的 18 项 S 级发现评估如下：

| 纳入 | # | 决策逻辑 |
|------|---|---------|
| ✅ | S1 | Server/Main 逻辑重复 — 是 R37 和所有双写 bug 的根因。去重后维护成本减半（→ T901） |
| ✅ | S2 | 150 处类型断言 — 每次改 Schema 都赌命。与 Developer 的 A1 完全对齐（→ T902） |
| ✅ | S3 | 四套映射 — 随 S1 去重统一为共享映射函数（→ T901） |
| ✅ | S4 | 校验不一致 — 随 S1 统一为 ownershipGuard 中间件（→ T901） |
| ✅ | S5 | 无错误中间件 — Express 5 内置能力零使用（→ T908） |
| ✅ | S7 | 输入无校验 — 无效数据在到达 DB 前没有前置拦截（→ T907） |
| ✅ | S14 | DDL 顺序 — `folders` 在 `blogs` 后定义但 FK 指向 folders。简单但影响 FK（→ T914） |
| ⏭ | S6 | Schema 无类型 — 随 S2 IPC 类型化间接缓解 |
| ⏭ | S8 | console.log 残留 — 7 处运维日志，暂不阻塞 |
| ⏭ | S9 | 30 useState — 影响一个组件，非系统性 |
| ⏭ | S10 | IPC 分散 — 不阻塞功能，重构风险 > 收益 |
| ✅ | S11 | 无分页 — 追回为 T915 (0.5h P3, 仅改两个 route 的 query params) |
| ⏭ | S12 | Tag 子查询 — 100 个标签以内 O(n×m) 不痛 |
| ⏭ | S13 | Heatmap 日标签 — 纳入为小修 (→ T913) |
| ⏭ | S15 | QuickNote 竞态 — edge case |
| ⏭ | S16 | 无限流 — 自用桌面应用，无公网暴露 |
| ⏭ | S17 | CORS any — 内网开发用，非生产 API |
| ⏭ | S18 | drafts 无 user_id — 通过 blog_id 间接校验已覆盖 |

---

---

### Boss 使用者 UI 反馈

作为日常使用者，Phase 8 功能到位了，但 UI 还有几个让我每次用都皱眉的地方：

| # | 痛点 | 方案 |
|---|------|------|
| **U901** | 文件夹侧栏我每次都折叠，一切换页面它又展开了。这不是 Bug 但让我不想用它 | `localStorage` 记住 `sidebarCollapsed` 状态，跨页面还原 |
| **U902** | 暗色/亮色切换是瞬间的——眼睛来不及适应。加 200ms 过渡就能从 "切了" 变成 "融入了" | `html` 上加 `transition: background-color 200ms ease, color 200ms ease` |
| **U903** | 博客卡片列表里，长标题被截断成 "Docker 入门教程：从零搭建..."。我 hover 上去想看完整标题，什么都没有 | 卡片 `title` 属性展示完整标题，或 hover 时 tooltip 浮出 |

---

## 5. Phase 10 — 桌面体验 + PDF 修复 + 翻页

> 来源：Boss 使用反馈 (2026-05-03)。四项需求：关闭行为/托盘快捷操作/PDF 双修/列表翻页。
> 原则：零新 npm 依赖，全部使用 Electron 原生 API + 现有基础设施。

### 任务总览

| 任务 | 名称 | 估算 | 优先级 |
|------|------|------|--------|
| T1001 | 关闭按钮行为 — 最小化到托盘 + 右键菜单 | 3h | 🔴 P1 | ✅ |
| T1002 | 桌面宠物 — static/drug.png + 呼吸动画 + 独立小窗体系 | 8h | 🟡 P2 | ✅ |
| T1003 | PDF 导出修复 — 改临时文件方案 | 2h | 🔴 P1 | ✅ |
| T1004 | PDF 预览修复 — 改 webview 方案 | 2h | 🟡 P2 | ✅ |
| T1005 | 博客/知识库列表翻页 — 纯前端分页 UI | 4h | 🟡 P2 | ✅ |
| T1006 | UI 圆润化 — radius + shadow + transition | 2h | 🟡 P2 | ✅ |
| T1007 | 个性化配色微调 | 1h | 🟢 P3 | ✅ |

**Phase 10 全部完成: 7 项, ~22h**

---

### T1001: 关闭按钮行为 + 托盘快捷菜单

**痛点**: 点 × 直接退出；最小化后想快速操作必须打开主窗口。
**文件**: `src/main/index.ts`, `src/main/tray.ts`(新建)
**估算**: 3h / P1 / 零新依赖（Electron 原生 `Tray`）

**实现方案**:
1. 拦截 `close` → `e.preventDefault(); win.hide()`，创建托盘图标
2. 托盘图标：`nativeImage.createFromDataURL()` 生成 16×16 + 32×32 两套尺寸（适配不同 DPI）
3. 托盘右键菜单（同时也是悬浮球的快捷操作菜单）：
   ```
   📝 快速便签    📥 导入 MD    📎 导入文件    🌐 收藏网页
   ──────────────────────────────────────────────
   📂 打开主窗口                               ❌ 退出
   ```
4. 菜单项点击 → **与桌面宠物共用同一套独立窗口逻辑**（见 T1002 §D）。托盘菜单和宠物菜单是同一个功能的两个入口：
   - 「快速便签」→ 迷你输入窗 380×60（不碰主窗口）
   - 「新建博客」→ 独立编辑器窗 900×650 `/standalone/editor`（不碰主窗口）
   - 「导入 MD」→ 原生文件对话框 `dialog.showOpenDialog`（不碰主窗口）
   - 「导入文件」→ 原生文件对话框（不碰主窗口）
   - 「收藏网页」→ 迷你抓取窗 500×420（不碰主窗口）
   - 「打开主窗口」→ **唯一恢复主窗口的入口**，保持当前页面不跳转
5. 复用现有 IPC，不新增 service 层代码
6. 双击托盘 → `win.show()` + `win.focus()`
7. `tray.ts` 独立模块，从 `main/index.ts` 传入 `mainWindow` 引用

**验收标准**:
- 点 × → 窗口隐藏 + 托盘图标出现（16×16 + 32×32 均清晰）
- 托盘菜单项 → 主窗口打开到**对应页面**（不是首页）
- 「打开主窗口」保持当前页面不跳转

---

### T1002: 桌面宠物（替代悬浮球）

**痛点**: 悬浮球是死的。桌面宠物是活的——有表情变化、有拖拽反馈、有性格。看一眼就觉得这个应用不一样。
**前置依赖**: T1001（托盘已存在，宠物窗口复用同一套 IPC 通信路径）。
**素材**: `img/static.png`（静息态）, `img/drug.png`（拖拽态）——已在项目中。
**文件**: `src/main/pet.ts`(新建, 宠物窗口管理), `src/main/tray.ts`(IPC 路由复用)
**估算**: 6h / 🟡 P2 / 零新依赖（Electron 原生 + CSS animation）

---

### A. 宠物窗口配置

```js
const petWin = new BrowserWindow({
  width: 128, height: 128,
  frame: false,            // 无边框
  transparent: true,       // 透明背景
  alwaysOnTop: true,       // 桌面顶层
  resizable: false,
  skipTaskbar: true,       // 不在任务栏显示
  hasShadow: false,
  focusable: false,        // 不抢焦点
  webPreferences: {
    sandbox: true,
    contextIsolation: true,
    nodeIntegration: false,
    preload: path.join(__dirname, '../preload/pet-preload.js'), // 新建迷你 preload
  }
})
```

内存开销：~30-40MB。

---

### B. 图像切换 + 动效

宠物窗口只加载一个纯 HTML 文件（不加载 React），内容极简：

```html
<!-- pet.html -->
<style>
  body { margin: 0; overflow: hidden; background: transparent; }
  #pet {
    width: 128px; height: 128px;
    /* 图片通过 file:// 绝对路径加载，由主进程在 pet.ts 中注入到 HTML */
    /* 不使用相对路径 — 宠物窗口的 HTML 位置与 img/ 目录的相对关系不确定 */
    background: url('IMG_STATIC_PATH') center/contain no-repeat;
    transition: transform 0.1s ease;
    cursor: grab;
    user-select: none;
    -webkit-user-drag: none;  /* 禁止默认图片拖拽 */
  }
  #pet:active { cursor: grabbing; }

  /* 静息态动画：轻微上下浮动，像在呼吸 */
  @keyframes idle-breathe {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  #pet.idle { animation: idle-breathe 2.5s ease-in-out infinite; }

  /* 拖拽态：切换为 drug.png，取消动画，轻微放大表示被抓住 */
  #pet.dragging {
    background-image: url('IMG_DRAG_PATH');
    animation: none;
    transform: scale(1.08);
  }

  /* 点击反馈：短暂缩放 */
  @keyframes click-pop {
    0% { transform: scale(1); }
    50% { transform: scale(0.92); }
    100% { transform: scale(1); }
  }
  #pet.clicked { animation: click-pop 0.2s ease; }

  /* hover 时略微放大，提示可交互 */
  #pet:hover { transform: scale(1.05); }
  #pet.dragging:hover { transform: scale(1.08); }
</style>
<div id="pet" class="idle"></div>
<script src="pet-renderer.js"></script>
```

**动效规则**:
| 状态 | 图片 | CSS |
|------|------|-----|
| 静息（默认） | `static.png` | `animation: idle-breathe 2.5s` 上下微浮 |
| 鼠标悬停 | `static.png` | `scale(1.05)` |
| 被拖拽中 | `drug.png` | `scale(1.08)`, 取消呼吸动画 |
| 被点击 | `static.png` | `click-pop 0.2s` 短触发后恢复静息 |

---

### C. 点击 vs 拖拽 —— 严格区分

**核心逻辑**: 用鼠标移动距离判断意图，而非仅靠时间。

```js
// pet-renderer.js (宠物窗口的渲染进程脚本)
let mouseDownPos = null;
let hasMoved = false;
const DRAG_THRESHOLD = 5; // px，移动超过 5px 才算拖拽

petEl.addEventListener('mousedown', (e) => {
  mouseDownPos = { x: e.screenX, y: e.screenY };
  hasMoved = false;
  petEl.classList.add('dragging');
  petEl.classList.remove('idle', 'clicked');
  // 通知主进程开始跟踪全局鼠标位置
  window.petApi.startDrag();
});

window.addEventListener('mousemove', (e) => {
  if (!mouseDownPos) return;
  const dx = e.screenX - mouseDownPos.x;
  const dy = e.screenY - mouseDownPos.y;
  if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
    hasMoved = true;
  }
});

window.addEventListener('mouseup', () => {
  if (!mouseDownPos) return;
  petEl.classList.remove('dragging');
  window.petApi.stopDrag();

  if (!hasMoved) {
    // 点击：播放点击动画 → 弹出菜单
    petEl.classList.add('clicked');
    setTimeout(() => petEl.classList.remove('clicked'), 200);
    petEl.classList.add('idle');
    window.petApi.onClick(); // 通知主进程弹出菜单
  } else {
    // 拖拽结束：保存新位置，回到静息态
    petEl.classList.add('idle');
    window.petApi.savePosition();
  }
  mouseDownPos = null;
});
```

**主进程拖拽（pet.ts）**：
```
mousedown → ipcMain.on('pet:startDrag')
  → 记录 cursorPos - winPos 偏移量
  → setInterval(16ms) 每帧用 screen.getCursorScreenPoint() 更新 win.setPosition()
mouseup → ipcMain.on('pet:stopDrag')
  → clearInterval()
  → 保存坐标到 userData/pet-position.json
```

此方案优于 `-webkit-app-region: drag` 的原因：
- 不会吞掉 click 事件
- 可以精确区分点击 vs 拖拽（DRAG_THRESHOLD）
- 拖拽不丢帧（主进程 setInterval 比 DOM mousemove 更稳）

---

### D. 点击菜单 —— 每种操作一个独立小窗口，绝不碰主窗口

**核心原则**: 主窗口只在「打开主窗口」时显示。其余操作各自拥有独立的小窗口或原生对话框，用完即关。用户在看 PDF/写 Word/刷网页时，主窗口绝不弹出来打扰。

| 菜单项 | 窗口形态 | 大小 | 技术栈 |
|--------|---------|------|--------|
| 快速便签 | 迷你输入窗 | 380×60 | 纯 HTML + preload IPC |
| 新建博客 | 独立编辑器窗 | 900×650 | React `/standalone/editor` 路由（无 MainLayout） |
| 导入 MD | **原生文件对话框** | N/A | `dialog.showOpenDialog` + 后台 `blogImportMd` |
| 导入文件 | **原生文件对话框** | N/A | `dialog.showOpenDialog` + 后台 `kbImport` |
| 收藏网页 | 迷你抓取窗 | 500×420 | 纯 HTML + preload IPC（输入URL → 抓取预览 → 确认导入） |
| 打开主窗口 | 主窗口恢复 | 正常 | 保持当前页面，不跳转 |

**关键**: 导入 MD/文件不需要任何自定义窗口——操作系统的文件选择器就是最好的 UI。

---

**D1. 快速便签 — 迷你输入窗**

`src/main/pet.ts` 中新建 380×60 迷你 BrowserWindow：
- `frame: false, alwaysOnTop: true, resizable: false`
- 加载纯 HTML（不加载 React）: 一个 `<input>` + 回车即保存
- 回车 → preload IPC `pet:quickNote` → 主进程调 `BlogService.createBlog(...)` → Notification "已保存" → 关闭窗口
- Esc → 关闭窗口，不保存
- 内存: ~15MB，用完即关释放

**D2. 新建博客 — 独立编辑器窗**

`src/main/pet.ts` 中新建 900×650 BrowserWindow：
- 加载 React 应用，URL 为 `file://.../index.html#/standalone/editor`
- App.tsx 检测路由 `/standalone/editor` → **不渲染 MainLayout**，直接渲染 BlogEditorPage（无侧栏/导航/搜索栏）
- 窗口标题: "新建博客 · Local Blog KB"
- 关闭窗口时自动保存草稿（复用现有 auto-save 逻辑）

**D3. 导入 MD — 原生文件对话框**

```ts
// pet.ts — 零自定义窗口
case 'import-md': {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: '选择 Markdown 文件',
    filters: [{ name: 'Markdown', extensions: ['md', 'txt', 'markdown'] }],
    properties: ['openFile', 'multiSelections']
  })
  if (canceled || filePaths.length === 0) return
  const count = await BlogService.importMarkdownFiles(userId, filePaths)
  new Notification({ title: '导入完成', body: `已导入 ${count} 篇博客` }).show()
}
```

**D4. 导入文件 — 原生文件对话框**

同上，调 `dialog.showOpenDialog` → `KnowledgeService.importFiles(...)` → Notification。

**D5. 收藏网页 — 迷你抓取窗**

`src/main/pet.ts` 中新建 500×420 BrowserWindow：
- 纯 HTML（不加载 React），布局：
  ```
  ┌──────────────────────────┐
  │ 🌐 收藏网页              │
  │ [________________] [抓取] │  ← URL 输入 + 按钮
  │ ┌──────────────────────┐ │
  │ │ 标题: ...            │ │  ← 抓取后显示预览
  │ │ 摘要: ...            │ │
  │ └──────────────────────┘ │
  │        [确认导入]         │
  └──────────────────────────┘
  ```
- 「抓取」→ preload IPC `pet:scrape` → 主进程调 `WebScraperService.scrapeWebpage(url)` → 返回 title/excerpt → 渲染预览
- 「确认导入」→ 主进程调 `BlogService.createBlog(...)` → Notification → 关闭窗口

**D6. 打开主窗口 — 唯一恢复主窗口的入口**

```ts
case 'open-window':
  mainWindow.show()
  mainWindow.focus()
  // 不导航，保持用户上次离开时的页面
```

---

**App.tsx 独立路由**: 新增路由 `/standalone/editor` — 不包裹 MainLayout，直接渲染 `BlogEditorPage`（用于宠物「新建博客」窗口和托盘「新建博客」）。

---

### E. 多显示器 + 坐标安全

- 坐标持久化到 `app.getPath('userData')/pet-position.json`
- 启动时读取坐标 → `screen.getAllDisplays()` 校验坐标在至少一块屏幕范围内 → 越界则复位到主屏右下角
- 拔掉副屏后宠物自动归位

---

### F. 生命周期

```
应用启动 → T1001 托盘创建 → 宠物窗口创建（从 userData 读坐标）
用户最小化主窗口 → 主窗口隐藏，宠物保持
用户退出（托盘菜单） → 宠物窗口关闭 → app.exit(0)
```

### G. 图片路径解析（pet.ts 主进程）

宠物窗口加载的 HTML 中 `IMG_STATIC_PATH` / `IMG_DRAG_PATH` 是占位符。主进程加载前替换为实际 file:// URL：

```ts
// pet.ts
const staticPath = path.join(__dirname, '../../img/static.png')
const dragPath = path.join(__dirname, '../../img/drag.png')
let html = fs.readFileSync(path.join(__dirname, '../pet/pet.html'), 'utf-8')
html = html.replace('IMG_STATIC_PATH', `file://${staticPath}`)
            .replace('IMG_DRAG_PATH', `file://${dragPath}`)
petWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
```

备选（更可靠）：读图片 → base64 → 嵌入 HTML 的 `<img>` 标签 `src="data:image/png;base64,..."`。128px 图标仅几 KB，无性能问题。

**验收标准**:
- [ ] 宠物使用 `static.png`，有呼吸上下浮动动画
- [ ] 鼠标悬停放大，按下后切换为 `drug.png` + 放大
- [ ] 移动 < 5px 松开 = 点击，弹出菜单，宠物播放 click-pop 动画
- [ ] 移动 ≥ 5px 松开 = 拖拽，宠物跟随鼠标，松手后保存位置
- [ ] 「快速便签」→ 迷你输入窗 380×60，不碰主窗口，回车保存 + Notification
- [ ] 「新建博客」→ 独立编辑器窗 900×650 `/standalone/editor`，不碰主窗口
- [ ] 「导入 MD」→ 原生文件对话框，选择后后台导入 + Notification
- [ ] 「导入文件」→ 原生文件对话框，选择后后台导入 + Notification
- [ ] 「收藏网页」→ 迷你抓取窗 500×420（URL输入→抓取→预览→确认），不碰主窗口
- [ ] 「打开主窗口」→ 主窗口恢复，保持当前页面。**这是唯一能恢复主窗口的入口**
- [ ] 拔掉副屏宠物不丢失，重启后位置正确
- [ ] 零新 npm 依赖

---

### T1003: PDF 导出修复

**痛点**: 博客「导出为 PDF」后文件空白。
**根因**: (a) `printToPDF()` 在 `did-finish-load` 前被调用（竞态），(b) `data:text/html` URL 加载含大量 base64 图片时可能超 URL 长度限制。
**文件**: `src/main/ipc/blog.ts`
**估算**: 2h / P1 / 零新依赖

**实现方案**:
1. 改为临时文件方案：`fs.writeFileSync(tmpPath, html)` → `win.loadFile(tmpPath)` → 等 `did-finish-load` → `printToPDF()` → `fs.unlinkSync(tmpPath)`
2. 临时文件路径：`app.getPath('temp')/blog-export-{id}.html`
3. 10s 超时保护
4. cleanup 放在 finally 块，确保磁盘不留残留

**验收标准**:
- 导出的 PDF 包含完整博客正文（含图片）
- 中文正常显示
- 超时返回错误，临时文件已清理

---

### T1004: PDF 预览修复

**痛点**: 知识库 PDF 点击预览显示"无法预览"。pdfjs-dist 在 Electron sandbox 中 Worker 初始化不稳定。
**文件**: `src/main/index.ts` (+ `webviewTag: true`), `src/main/services/preview.service.ts` (删 pdfjs-dist 路径), `src/renderer/components/preview/FilePreview.tsx`
**估算**: 2h / P2 / 零新依赖（Electron 原生 `<webview>`）

**实现方案**:
1. `main/index.ts` BrowserWindow 配置加 `webviewTag: true`（一行）
2. FilePreview 检测 PDF 文件 → 渲染 `<webview src="file:///path/to/file.pdf">` 替代当前 pdfjs-dist Canvas
3. webview 自带：翻页、缩放、搜索、文本选择、打印 — 全部免费
4. 知识库中的 PDF 路径已存储在 `knowledge_files.file_path`，直接传给 webview
5. 如果 sandbox 限制 webview 加载 file:// → 回退：主进程读文件 → `webview.loadURL('data:application/pdf;base64,...')`

**为什么换 webview**: Chromium 原生 PDF 渲染引擎，稳定可靠。当前 pdfjs-dist 方案在两个审查周期里都报告"无法预览"，改方案比修 bug 更快。

**验收标准**:
- 上传 PDF → 预览 → 内容正常显示
- 自带翻页/缩放可用
- 零新 npm 依赖

---

### T1005: 列表翻页

**痛点**: 50+ 篇博客/知识库滚不到头。
**现状**: Phase 9 T901 共享 handler 和 T915 Server 分页已经让 `blog:list` 和 `kb:list` 支持 `{ offset, limit }` 参数。Electron 桌面端同样可用——IPC handler 和 Service 层都已有分页支持。**纯前端任务。**
**文件**: `src/renderer/features/blog/BlogListPage.tsx`, `src/renderer/features/knowledge/KnowledgeListPage.tsx`, `src/renderer/hooks/usePagination.ts`(新建)
**估算**: 4h / P2 / 零新依赖

**实现方案**:
1. `usePagination(totalItems, pageSize)` hook
2. 页码条：`[←] 1 2 3 ... 10 [→]`（纯 Tailwind）
3. 每页 20 条
4. BlogListPage + KnowledgeListPage 各加 `<Pagination>`
5. API 直接传 offset/limit，total 从响应取

**验收标准**:
- 两个列表页底部有分页条，翻页不刷新页面

---

### T1006: UI 圆润化 — radius + shadow + transition

**痛点**: 当前 UI "太硬"——直角边框、无阴影层次、过渡生硬。
**文件**: `src/renderer/assets/index.css`
**估算**: 2h / 🟡 P2 / 零新依赖（纯 CSS 变量替换，零风险）

**实施项**:
1. **圆角**: `--radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px`，驱动全局 border-radius
2. **阴影**: `--shadow-card/dropdown/hover` 三层，暗色模式用 `rgba(0,0,0,0.30)` 系列
3. **过渡**: 按钮 `transition: all 150ms ease`，卡片 `hover: translateY(-2px)`，侧栏 `transition: width 200ms ease`

**验收标准**:
- 卡片/按钮/输入框圆角 ≥ 8px
- 暗色/亮色下均有可见阴影层次
- hover 交互平滑，无 0ms 突变

---

### T1007: 个性化配色微调

**痛点**: 当前配色偏冷灰（`#0D1117`/`#161B22`），像开发工具。想要一点点暖意和个性。
**文件**: `src/renderer/assets/index.css`
**估算**: 1h / 🟢 P3 / 零新依赖 — **需 Boss 视觉验收后再定稿**

**实施项**:
1. `--bg-primary` 加 1-2% 暖色调偏移（`#0D1117` → `#0F1318` 方向）
2. 强调色尝试蓝紫渐变替代纯蓝（仅用于渐变背景/图标，不用于文字）
3. ⚠️ `linear-gradient` 不能直接替代 `var(--accent-blue)`——只新增 `--accent-gradient` token 用于装饰性元素

**验收标准**:
- Boss 看过后点头才算通过
- 不影响功能性元素的对比度（链接、按钮文字）

---
## 6. Phase 11 — 工程收敛与质量基线 📋

> 来源: suggest.md。暂停新功能，集中 2-3 周清偿核心技术债。
> 原则：只做"已验证模式推广 + 真实安全修补 + 质量基线左移"，零新功能。

### 任务总览

| 任务 | 名称 | 类型 | 估算 | 优先级 |
|------|------|------|------|--------|
| T1101 | DOMPurify XSS 加强 — `dangerouslySetInnerHTML` 前加白名单 | 安全 | 1h | 🔴 P0 |
| T1102 | catch {} 全量修复 — 30+ 处空 catch 替换为 console.error | 安全 | 2h | 🔴 P0 |
| T1103 | DB 参数边界校验 — offset/limit 做 Math.max(0, floor(Number(val))) | 安全 | 1h | 🔴 P0 |
| T1104 | DI 模式复制 — blog-list → knowledge/search/tags/recycle | 架构 | 8h | 🟡 P1 |
| T1105 | sql.js Schema 冻结 — 新 DDL 仅写 mysql.ts + db.ts | 架构 | 2h | 🟡 P1 |
| T1106 | IPC 类型收敛 — 核心 10 通道 (auth 4 + blog 5 + delete) Zod 签名 | 类型 | 4h | 🟡 P2 | ✅ |
| T1107 | Biome 清零 — 修复 180 errors + 89 warnings，纳入 CI 阻断 | 质量 | 4h | 🟡 P2 |
| T1108 | E2E 核心路径 — Playwright 5 条链路：注册→登录→写博客→导出→回收站 | 质量 | 6h | 🟡 P2 |

**🔴 P0 (3 项)**: ~4h — 安全底线，必须优先
**🟡 P1 (2 项)**: ~10h — 架构收敛，降低维护摩擦
**🟡 P2 (3 项)**: ~14h — 质量基线，建立自动化安全网
**总计: 8 项, ~28h**

### 实现要点

**T1101 DOMPurify**：1 个依赖 (~10KB gzipped)，`BlogPreviewPage` 和 `BlogEditorPage` 的渲染点各加一行 `DOMPurify.sanitize(html)`。

**T1102 catch {} 修复**：`grep -r "catch {}" src/renderer` → 逐个替换为 `catch (e) { console.error(e) }`，关键操作加降级 toast。验收：grep 返回 0 结果。

**T1103 DB 参数边界**：在 `dbAll` / `dbGet` / `dbRun` 包装层对 offset/limit 做数值强转和边界校验。

**T1104 DI 模式**：复制 `src/shared/handlers/blog-list.ts` 的 DI 模式（注入 QueryRows/QueryOne 适配两种后端）到 knowledge/list、search、tags、recycle 四个领域。server/routes 和 main/ipc 均调用 shared handler。

**T1105 sql.js 冻结**：sql.js 侧的 schema.ts 不再新增表/列，新 DDL 仅写 mysql.ts + db.ts。sql.js 模式下涉及新功能的入口显示"离线模式下此功能不可用"。

**T1106 IPC 类型**：auth (login/register/logout/verify) + blog (list/get/create/update/delete) 共 10 个通道补充 Zod 运行时校验。preload 层消除 `as any`。

**T1107 Biome**：Day 1 执行 `npx biome check --fix` 自动修复大部分；Day 2 手动收尾剩余 error。确认 0 error 后纳入 `npm run ci` 阻断项。

**T1108 E2E**：Playwright 覆盖 5 条核心路径，建立回归安全网。不需要全覆盖，先有骨架。

---

## 7. 后续改进方向

以下暂不立项，待 Phase 11 完成后评估：

| # | 方向 | 优先级 | 关联 |
|---|------|--------|------|
| 1 | 国际化 i18n — 中英文翻译 | 🟡 P2 | T506 |
| 2 | FTS5 全文搜索 — MySQL FULLTEXT (ngram 分词)，sql.js 降级 LIKE | 🟢 P3 | T302 |
| 3 | TypeScript strict 模式 | 🟢 P3 | — |

---

## 8. 跨阶段关注事项

### 8.1 安全性检查清单

- [x] 密码使用 PBKDF2 加盐哈希 (Phase 1)
- [x] Session Token 使用 crypto.randomBytes (Phase 1)
- [x] IPC 通信通过 contextBridge 隔离 (Phase 1)
- [x] 文件操作限于工作区目录
- [x] 网络请求仅访问用户提供的 URL (Phase 4)
- [x] 敏感操作二次确认 (删除账户、清空回收站)
- [x] XSS 防护: 渲染用户内容时使用 sandbox iframe

### 8.2 代码质量

- [ ] Biome lint 零错误 (当前: 180 errors + 89 warnings)
- [ ] TypeScript strict 模式通过
- [ ] 无 `any` 类型 (或记录例外)
- [ ] 关键路径有 JSDoc 注释

### 8.3 文档

- [x] README.md 每个 Phase 后更新
- [ ] API 文档 (IPC channels)
- [ ] 数据库 Schema 文档
- [ ] 构建与发布文档

