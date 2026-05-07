# 本地博客与知识库存储系统 — 待办事项

> 最后更新: 2026-05-07 04:48:23 | 自动同步

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
| ⏭ | 已跳过 |

### 关联文档

| 文档 | 用途 |
|------|------|
| [redo.md](redo.md) | 技术债与修复清单 |
| [docs/phase-archive.md](docs/phase-archive.md) | Phase 1-12 完整任务规格（历史档案） |
| [docs/development-guide.md](docs/development-guide.md) | 测试策略、工作流程图、文件清单 |

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
| Phase 7 | 核心增强 + 趣味功能 | 55h | 2026-05-02 | ✅ |
| Phase 8 | 体验增强与互联互通 | 24h | 2026-05-03 | ✅ |
| Phase 9 | 工程质量夯实 + 架构债清偿 | 36h | 2026-05-03 | ✅ |
| Phase 10 | 桌面体验 + PDF 修复 + 翻页 | 22h | 2026-05-05 | ✅ |
| Phase 11 | 工程收敛 — 安全加固 + 架构收敛 + 质量基线 | 28h | 2026-05-06 | ✅ |
| Phase 12 | 缺陷修复 + E2E 兜底 + 体验收尾 | 22h | 2026-05-06 | ✅ |
| Phase 13 | 程序轻量化 + 用户体验 — 隐藏唤醒/宠物CSS化/乐观更新/柔和服务/续写视图 | 18h | 2026-05-07 | ✅ |
| Phase 14 | 工程质量深化 + 体验交付 — 状态机/类型收敛/IPC文档/UI重组/快捷键/迷你窗/剪贴板/阅读进度/成就/文件预览 | 33.5h | 2026-05-07 | ✅ |

**总计**: ~366.5h (Phase 1-14)

> 详细任务规格 (T101-T1007, F601-F605) 见 [docs/phase-archive.md](docs/phase-archive.md)。

---

## 3. Phase 11 — 工程收敛 ✅

> 来源: suggest.md。暂停新功能，集中清偿核心技术债。零新功能。
> 结项日期: 2026-05-06。P0 安全底线 + P1 架构收敛全部完成。

### 任务总览

| 任务 | 名称 | 类型 | 估算 | 优先级 | 状态 |
|------|------|------|------|--------|------|
| T1101 | DOMPurify XSS 加强 | 安全 | 1h | 🔴 P0 | ✅ |
| T1102 | catch {} 全量修复 | 安全 | 2h | 🔴 P0 | ✅ |
| T1103 | DB 参数边界校验 | 安全 | 1h | 🔴 P0 | ✅ |
| T1104 | DI 模式复制 — blog-list → knowledge/list | 架构 | 4h | 🟡 P1 | ✅ |
| T1105 | sql.js Schema 冻结 | 架构 | 2h | 🟡 P1 | ✅ |
| T1106 | IPC 类型收敛 — WindowApi + preload 契约闭合 | 类型 | 6h | 🟡 P1 | ✅ |
| T1107 | Biome 清零 — 53 errors 残存 | 质量 | 4h | 🟡 P2 | ⏭ |
| T1108 | E2E 核心路径 — Playwright 5 条链路 | 质量 | 10h | 🟡 P2 | 📋 |

**🔴 P0 (3 项)**: ~4h — 安全底线 ✅
**🟡 P1 (3 项)**: ~12h — 架构收敛 ✅
**🟡 P2 (2 项)**: T1107 ⏭ (边际收益低，维持不恶化即可)，T1108 📋 立项为 Phase 12

---

## 4. 后续改进方向

以下暂不立项，待 Phase 14 完成后评估：

| # | 方向 | 优先级 | 说明 |
|---|------|--------|------|
| 1 | 国际化 i18n | 🟡 P2 | 中英文翻译，react-i18next |
| 2 | FTS5 全文搜索 | 🟢 P3 | MySQL FULLTEXT (ngram)，sql.js 降级 LIKE |
| 3 | TypeScript strict 模式 | 🟢 P3 | 需较大改动 |
| 4 | API 文档 | 🟢 P3 | IPC 通道文档、DB Schema 文档 |

---

---

## 5. Phase 12 — 缺陷修复 + E2E 兜底 + 体验收尾

> 来源: suggest.md (Boss 筛选) + T1207 复议批准。Phase 11 顺延 T1108 + PDF 修复 + 编辑器 bug + 快捷浮窗 MVF + 品牌细节 + 新手引导 + 全局交互。
> 执行顺序: T1204 → T1205 → T1207 ↔ T1108 (并行) → T1206 → T1209a → T1209b → T1208

### 任务总览

| 任务 | 名称 | 类型 | 估算 | 优先级 | 状态 |
|------|------|------|------|--------|------|
| T1204 | PDF 导出正文丢失修复 — 修正 PDF 导出模板 CSS（非预览页 CSS，两者不共享样式） | 缺陷 | 2h | 🔴 P0 | ✅ |
| T1205 | 博客编辑器代码块横向溢出修复 | 缺陷 | 1h | 🟡 P1 | ✅ |
| T1207 | 轻量 MD 快捷写作浮窗 (MVF) — auto-create 宿主 blog + draft 原子写入 | 功能 | 3h | 🟡 P1 | ✅ |
| T1108 | E2E 核心路径 — Playwright 11 tests: register→login→blog CRUD→recycle→restore→search | 质量 | 3h | 🟡 P1 | ✅ |
| T1206 | 托盘/桌宠图标品牌统一 — 替换为 favicon.ico | 品牌 | 1h | 🟢 P3 | ✅ |
| T1209a | 全局快捷键唤起 — Ctrl+Shift+N 直达浮窗 | 交互 | 1h | 🟢 P3 | ✅ |
| T1209b | 统一 Toast/Progress 反馈组件 | 交互 | 2h | 🟢 P3 | ✅ |
| T1208 | 内置《使用指南》静态页面 — 独立路由 `/guide` + 内嵌 Markdown | 内容 | 2h | 🟡 P2 | ✅ |

**🔴 P0 (1 项)**: ~2h — PDF 正文丢失 ✅
**🟡 P1 (3 项)**: ~14h — 代码块溢出 ✅ + 快捷浮窗 MVF ✅ + E2E ✅
**🟡 P2 (1 项)**: ~2h — 使用指南 ✅
**🟢 P3 (3 项)**: ~4h — 图标 ✅ + 快捷键 ✅ + Toast ✅
**完成: 8/8 项, ~15h — Phase 12 全部完成**

### T1207 MVF 硬性约束

| 约束 | 内容 |
|------|------|
| 工时硬顶 | 3h，超时立即裁剪降级，不延期 |
| 技术路线 | 独立 BrowserWindow + 纯 HTML + preload IPC（复用 showQuickNote 模式），不加载 React |
| IPC 通道 | 最多新增 1 个，复用现有 pet 模式 |
| 功能边界 | 标题栏 + Markdown 输入区 (纯 textarea) + 保存/关闭。无工具栏、无标签、无图片 |
| 数据路径 | 复用 `BlogService.quickCreate()` 模式：关闭时 auto-create 宿主 blog + draft 原子写入（解决 blog_drafts.blog_id FK 约束）。主窗口监听 blog:refresh |
| 降级条款 | 3h 到期未完成 → 砍掉 markdown 支持，退化为纯文本 textarea |

### T1108 E2E 优先级裁剪

10h 硬顶。工时不足时从底部砍：

| 优先级 | 链路 | 工时 |
|--------|------|------|
| 必须 | 注册→登录→创建博客 | 2.5h |
| 必须 | 博客列表→详情→编辑保存 | 2.5h |
| 重要 | 知识库导入→预览 | 2h |
| 重要 | 回收站→恢复 | 1.5h |
| 重要 | PDF 导出成功/失败 | 1h |
| 低 | T1207 浮窗→草稿→主列表 | 1h |

### T1208 实施方案

Boss 裁决: **静态页面**，不碰 DB Schema（与 T1105 sql.js 冻结一致）。

- 独立路由 `/guide`，纯前端渲染 Markdown 文件
- 不污染用户数据（无过滤逻辑、无防删除保护）
- 指南内容硬编码在 `src/renderer/features/guide/` 或 `resources/` 中

### Boss 驳回记录

| 提案 | 驳回原因 |
|------|----------|
| T1107 Biome 清零 | 已 ⏭，边际收益低，维持不恶化即可 |
| T1205 编辑器全面打磨 | 范围太模糊（4 个独立问题一锅炖），只保留具体 bug：代码块溢出 |

### Phase 12 补充 — 便签独立模块

> Boss 批准，待排期。将便签从 blog_drafts 剥离为独立 notes 表。

| 任务 | 名称 | 估算 | 状态 |
|------|------|------|------|
| T12S1 | notes 表 DDL + NoteService + IPC (note:list\|create\|delete\|pin\|clipboard) + 24h 清理定时器 + 剪贴板 handler | 2.5h | ✅ |
| T12S2 | NoteListPage — 前端路由 /notes + 侧栏入口 + pinned toggle UI | 2h | ✅ |
| T12S3 | showQuickNote() 改造 — 写 notes 表替代 quickCreate + note:refresh 事件 | 0.5h | ✅ |

**总计: 3 项, ~5h — 全部完成**

```sql
CREATE TABLE notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL
);
```

**清理策略**: 主进程 5min 定时器 + 打开列表时懒清理 — `DELETE FROM notes WHERE pinned=0 AND created_at < datetime('now', '-1 day')`
**剪贴板**: 手动触发 — 便签页按钮 → IPC `note:clipboard` → 主进程 `clipboard.readText()` → 填入输入框
**Web 端**: 不做 — 便签是桌面专属功能，与 pet/MVF 同层
**Boss 裁决**: D7 手动剪贴板 / D8 历史保留 / D9 created_at 清理

---

## 6. Phase 13 — 程序轻量化 + 用户体验

> 来源: suggest.md (Boss 筛选)。核心命题: 轻量化是手段，用户心流是目的。零架构冒险，全用户可感知。

### 任务总览

| 任务 | 名称 | 类型 | 估算 | 优先级 | 状态 |
|------|------|------|------|--------|------|
| T1301 | 主窗口关闭改为隐藏 + 后台节流 — hide 替代 destroy，后台 pause 定时器/动画 | 轻量 | 3h | 🔴 P0 | ✅ |
| T1302 | 桌面宠物拖拽优化 — setInterval(16ms) 迁至 setTimeout 递归，CSS transition 优化视觉过渡 | 轻量 | 2h | 🟡 P1 | ✅ |
| T1303 | 乐观更新 — DB 写入即时响应，fs 写临时文件→rename 原子替换，失败 Toast 回滚 | 体验 | 3h | 🟡 P1 | ✅ |
| T1304 | 柔性关闭 — 编辑器/设置/便签关闭自动保存+Toast，破坏性操作保留 Modal，边缘 box-shadow 脉动提示 | 体验 | 2h | 🟡 P2 | ✅ |
| T1305 | 一键备份导出 + 本地优先宣言 — Settings 导出 .zip + Guide/Settings 显性标注零云端 | 体验 | 3h | 🟡 P2 | ✅ |
| T1306 | 侧边栏默认折叠为图标态 — hover 展开，U901 localStorage 基础已有 | 体验 | 2h | 🟢 P3 | ✅ |
| T1307 | 「续写与回顾」默认视图 — 草稿置顶 + 上次停留 + 关联素材，无活跃路由时渲染 | 体验 | 3h | 🟢 P3 | ✅ |

**🔴 P0 (1 项)**: ~3h — 隐藏唤醒
**🟡 P1 (2 项)**: ~5h — 宠物 CSS + 乐观更新
**🟡 P2 (2 项)**: ~5h — 柔性关闭 + 一键备份
**🟢 P3 (2 项)**: ~5h — 侧栏折叠 + 续写视图
**总计: 7 项, ~18h**

### Boss 验收裁决 (2026-05-07)

Auditor 审查结论: 9.2/10，零 P0/P1/P2，3 项 P3。

| 编号 | 问题 | 裁决 | 理由 |
|------|------|------|------|
| R98 | ContinueService 传输全文，UI 仅用 150 字符 | ⏭ 延后 | 3 行草稿全文传输开销可忽略。与 R78 状态机重构时一并优化 SQL SUBSTR |
| R99 | `app:visibility` 4 处硬编码，未用 IPC.APP_VISIBILITY | ✅ 批准修复 | 常量已定义却不用，5 分钟修 4 行，类型安全收益直接 |
| R100 | NOTE IPC 常量被 CONTINUE 块隔开 | 关闭 | 排列顺序纯审美偏好，运行时零影响。不修 |

### Boss 驳回记录

| 提案 | 原因 |
|------|------|
| 意图目录重构 (write/capture/read/organize) | 架构重构不是轻量化。20h+，高风险，当前结构已够用 |
| `src/kernel/` 独立内核层 | 过度工程。窗口生命周期放 main process 即可 |
| Web Worker 迁移 markdown/PDF | markdown-it 毫秒级渲染，搬 Worker 收益为负 |
| Zustand 意图切片 + useShallow | 独立任务，随 R78 状态机重构时一并处理 |
| 手动分包 / 字体裁剪 | 纯构建优化，Dev 自行处理即可 |

### 审查裁决

| 编号 | 问题 | 裁决 |
|------|------|------|
| D10 | T1302 petWin.setPosition() 是 BrowserWindow API，CSS 不可达 | 修正为 rAF + CSS transition，2h 不变 |
| D11 | T1304 spec 太模糊——哪些面板、什么行为、微光长啥样 | 已补具体 spec（见下表） |

### T1304 柔性关闭 Spec

| 面板/场景 | 关闭行为 | 提示 |
|-----------|----------|------|
| 博客编辑器（未保存） | 自动存草稿 | Toast "草稿已保存" |
| 博客编辑器（已保存） | 直接关闭 | 无 |
| 设置面板 | 自动保存变更 | 无 |
| 便签编辑 | 自动保存 | Toast "便签已保存" |
| 删除账户 / 清空回收站 | **保留 Modal** | 破坏性操作不弱化 |

微光效果: `box-shadow` 用 `--accent-blue` 单次脉动 `@keyframes edge-breathe 1.2s ease-out`

### T1303 数据安全约束

- 乐观更新仅用于 DB 写入（dbRun 微异步），不用于文件系统
- fs.writeFile → 先写临时文件 → rename 原子替换，防崩溃丢数据
- 保存按钮保留"写入中"中间态，写入完成后显示"已保存"

### T1307 「续写与回顾」视图 Spec

- **触发**: 打开主窗口 + 无活跃路由时默认渲染。点击侧边栏"全部博客"后切换回标准列表，选择持久化至 localStorage
- **布局**: 三区域 — 最近草稿(3篇) / 上次停留(1篇) / 关联素材(横向滚动5项)。容器 max-width 780px 居中，复用 .card + CSS Token
- **数据**: 仅查元数据 (LIMIT)，不加载全文。blog_drafts 最近 3 条 + blogs 最后访问 1 条 + knowledge_files 最近 5 项
- **边界**: 不批量、不筛选、不图表。纯"思维续接台"，非数据看板
- **约束**: 零新依赖，零架构变更，复用现有组件

---

## 7. Phase 14 — 工程质量深化 + 体验交付

> 来源: suggest.md (Boss 筛选 + 复议)。核心命题: 减重、提质、提效。零新依赖、零 Schema 变更、零破坏性重构。
> T1411/T1412 初版因 spec 空洞驳回，补全方案 A-G 后复议批准（采纳 A+B 和 E+F）。

### 任务总览

| 任务 | 名称 | 类型 | 估算 | 优先级 | 状态 |
|------|------|------|------|--------|------|
| T1402 | 编辑器状态机重构 — 16 useState → useReducer + EditorState/EditorAction 导出 | 工程 | 5h | 🟡 P1 | ✅ |
| T1403 | 类型系统收敛 — renderer 32 `as any` → 0 + ContinueService 具体接口 + kbPreview 类型修正 | 工程 | 5h | 🟡 P1 | ✅ |
| T1404 | IPC 通道文档自动化 — `scripts/generate-ipc-doc.ts` → `docs/ipc-api.md` 88 channels | 工程 | 3h | 🟡 P2 | ✅ |
| T1405 | UI 信息架构重组 — 侧栏4组 + 仪表盘3tab + 快捷键设置分区 | UI/UX | 4h | 🟡 P2 | ✅ |
| T1407 | 快捷键自定义设置 — `userData/shortcuts.json` + 录制UI + 冲突检测 + 重置 | 功能 | 5h | 🟡 P2 | ✅ |
| T1408 | 剪贴板到便签 — 托盘/桌宠菜单 + `clipboard.readText()` + Notification | 功能 | 2h | 🟢 P3 | ✅ |
| T1406 | 迷你窗口可拖拽 — `movable:true` + `-webkit-app-region:drag` + 位置持久化 | 体验 | 1.5h | 🟢 P3 | ✅ |
| T1409 | 标签页快速搜索过滤 — 200ms 防抖 + "没有匹配的标签"空状态 | 体验 | 0.5h | 🟢 P3 | ✅ |
| T1410 | 博客阅读进度标记 — `reading-progress.json` LRU 100 + `blog:save-progress` IPC + 滚动恢复 | 体验 | 2h | 🟢 P3 | ✅ |
| T1411 | 成就精简 + 热力图 canvas — 14→6 核心 + canvas 替代 365 DOM + React.lazy | 优化 | 3.5h | 🟢 P3 | ✅ |
| T1412 | 文件预览增强 + 大文件 — Markdown/视频/音频 + 骨架屏 + 10s 超时降级 | 功能 | 4h | 🟡 P2 | ✅ |

**🟡 P1 (2 项)**: ~10h — 状态机 + 类型收敛
**🟡 P2 (4 项)**: ~16h — IPC 文档 + UI 重组 + 快捷键 + 文件预览增强
**🟢 P3 (5 项)**: ~7.5h — 迷你窗 + 剪贴板 + 标签搜索 + 阅读进度 + 成就/热力图
**总计: 11 项, ~33.5h**

### T1411 实施方案（复议批准）

> 原 spec 空洞被驳回。现采纳方案 A + 方案 B（3.5h），方案 C 被 T1405 覆盖，方案 D 不可逆删除否决。

| 方案 | 内容 | 工时 |
|------|------|------|
| 方案 A | 精简成就系统 — 16 枚→4-6 枚核心（首次博客/连续7天/100篇/50知识文件），移除触发率最低的 10-12 枚逻辑；仪表盘改为"仅展示已获得 + 下一枚进度条" | 2h |
| 方案 B | 热力图 canvas 化 — canvas 替代 365 个 DOM 元素（消除重排），`React.lazy` 延迟加载组件，仅渲染近 1 年数据 + "显示全部"按钮 | 1.5h |

**验收**: 成就 service 调用点减少 60%+；仪表盘初次渲染 < 100ms（DevTools Performance）；热力图亮/暗色自适应

### T1412 实施方案（复议批准）

> 原 spec 空洞被驳回。现采纳方案 E 轻量版 + 方案 F（4h），方案 G 独立窗口否决（额外维护负担）。

| 方案 | 内容 | 工时 |
|------|------|------|
| 方案 E 轻量 | 补充常见格式预览 — 图片(bmp/gif/webp) `<img>` 内嵌、视频/音频 `<video>/<audio>` 播放、Markdown 复用 markdown-it 渲染、PPT 外部打开引导。preview.service.ts 新增 `previewFile()` 方法 | 2.5h |
| 方案 F | 大文件异步加载 — Web Worker 解析 + 骨架屏进度条 + 10s 超时自动降级提示 | 1.5h |

**验收**: 知识库 90%+ 文件类型可预览；20MB+ 文件加载 UI 无冻结；超时有降级提示
**约束**: 方案 E 轻量版不引入 EPUB 库（跳过 epubjs ~200KB），零新 npm 依赖

### 依赖链

```
T1411 (成就/热力图精简) → T1405 (仪表盘 tab 化，基于精简后内容)
T1405 (设置页分区) → T1407 (快捷键 UI) → T1408 (剪贴板键注册)
其余任务无依赖，可并行推进
```

### Boss 驳回记录

| 提案 | 原因 |
|------|------|
| T1401 目录结构现代化 (Feature-First 重组) | 纯 cosmetic。Phase 13 已驳回同类提案（意图目录重构）。7 个 feature 每 feature 仅 1 页，建子目录放单文件是过度工程。100+ import 路径修改换零用户收益 |
| T1411 初版 / T1412 初版 | spec 空洞（"优化掉"/"做个窗口"不是可执行方案），已驳回。补全方案 A-G 后复议批准，分别采纳 A+B 和 E+F |
| T1411 方案 C（仪表盘视图重构） | T1405 仪表盘 tab 化已覆盖，免做 |
| T1411 方案 D（彻底移除成就/热力图） | 不可逆删除。Phase 7-8 投入 10h，先精简再评估 |
| T1412 方案 G（独立预览窗口） | 额外 3h + 窗口生命周期维护负担。嵌入预览面板够用 |

### Auditor 审查裁决 (2026-05-07)

| 编号 | 问题 | 裁决 | 方案 |
|------|------|------|------|
| D12 | T1402 5h 覆盖副作用（autoSave/useBlocker） | 方案 A — 严格 reducer 迁移，副作用在 useEffect 外处理。5h 不变 |
| D13 | T1403 "零 as any" 范围含 28 处 server MySQL 转换 | 方案 B — 限定 shared+preload+Service+IPC handler。与 T1403a-d 子任务一致。Server 不纳入。5h 不变 |
| D14 | T1405+T1411 同时改 Dashboard 同一文件 | 方案 A — T1411 先完成内容精简，T1405 后做 tab 结构重组。已加入依赖链 |
| D15 | T1407 "settings 表" 涉嫌 Schema 变更，违反 T1105 冻结 | 方案 B — `userData/shortcuts.json` 文件存储，复用 pet `posFile()` 模式。**T1105 冻结不可破** |
| D16 | T1406 movable 与 MVF drag region 冲突 | 方案 A — 仅便签窗 + 抓取窗 movable，MVF 跳过。工时 2h→1.5h |
| D17 | T1410 存储方案未指定 + 需评估 IPC 通道 | 方案 A — `userData/reading-progress.json`，新增 1 个 IPC `blog:save-progress` |

**工时校准**: 34h → 33.5h (T1406 -0.5h)。Auditor 风险缓冲 +3.5h 仅作参考不纳入计划。

---

## 8. 代码质量基线

| 子任务 | 内容 | 工时 |
|--------|------|------|
| T1403a | 消除 `src/shared/` 和 `src/preload/` 中的 `any` | 1h |
| T1403b | 所有 Service 方法显式标注返回类型 | 1.5h |
| T1403c | 所有 IPC handler 显式标注参数/返回类型 | 1h |
| T1403d | 消除 `as any` 类型断言 (收尾 T1106 遗留) | 1.5h |

**验收**: `grep -r "as any" src/` 零结果（或仅含注释）；所有 Service 方法有显式返回类型

---

## 8. 代码质量基线

| 指标 | 当前状态 | 目标 |
|------|----------|------|
| Biome lint errors | 55 (T1107 ⏭) | 维持不恶化 |
| TypeScript 编译 | ✅ 通过 | — |
| 单元测试 | 27/27 pass (3 files) | 维持 |
| `any` 类型 | preload 已消除 | renderer 逐步收敛 |
| Biome warnings | 117 | 评估后修复或 suppress |
| E2E 测试 | 11/11 pass | ✅ Phase 12 建成 |
