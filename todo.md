# 本地博客与知识库存储系统 — 待办事项

> 最后更新: 2026-05-06 07:30:26 | 自动同步

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
**总计**: ~297h (Phase 1-12)

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

以下暂不立项，待 Phase 13 完成后评估：

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

## 6. 代码质量基线

| 指标 | 当前状态 | 目标 |
|------|----------|------|
| Biome lint errors | 55 (T1107 ⏭) | 维持不恶化 |
| TypeScript 编译 | ✅ 通过 | — |
| 单元测试 | 27/27 pass (3 files) | 维持 |
| `any` 类型 | preload 已消除 | renderer 逐步收敛 |
| Biome warnings | 117 | 评估后修复或 suppress |
| E2E 测试 | 11/11 pass | ✅ Phase 12 建成 |
