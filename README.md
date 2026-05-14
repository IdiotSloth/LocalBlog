# Local Blog KB

> 离线可用的个人桌面应用 — 博客撰写、知识库管理、网页收藏。
> Electron 41 + React 19 + TypeScript + Vite 7 + sql.js

构建: ✅ 通过 | 测试: 49/49 pass | E2E: 11/11 pass | Phase 1-18 ✅ | `as any`: 0 | strict ✅ | P0/P1/P2: 0

---

## 特性

| 模块 | 功能 |
|------|------|
| **博客** | Markdown/WYSIWYG 编辑 (Tiptap 3)，系列链 prev/next 导航，批量操作，历史版本回滚，附件管理 |
| **知识库** | PDF/DOCX/XLSX/TXT 导入与预览，文件夹分类，拖放导入，全文搜索 |
| **网页收藏** | URL → readability 正文提取 → turndown Markdown，一键保存为博客 |
| **搜索** | 全局搜索 (博客+知识库)，FTS5 Worker 倒排索引 + MySQL FULLTEXT，中文分词 |
| **回收站** | 30 天自动清理，批量恢复/删除，磁盘文件同步清理 |
| **仪表盘** | 统计数据，写作热力图 (GitHub 风格)，成就系统 (6 核心里程碑) |
| **编辑器** | 专注写作模式，模板系统，阅读时间 + TOC，双向引用 (博客↔知识库) |
| **导出** | PDF (Electron printToPDF)，Word (.docx) |
| **便签** | 独立 notes 表，剪贴板读取，24h 自动清理，置顶永久保留 |
| **桌面** | 托盘常驻，桌面宠物 (可拖拽 + 动画)，快捷写作浮窗，全局快捷键 (Ctrl+Shift+N) |
| **主题** | 暗色/亮色/系统，5 套阅读主题，CSS Token 驱动的圆润 UI，统一 Toast/Progress 反馈 |
| **质量** | 27 单元测试 + 11 E2E 核心链路，DOMPurify XSS 防护，renderer `as any` 清零，30 useState→useReducer |
| **自定义** | 快捷键录制+冲突检测，迷你窗口可拖拽+位置记忆，托盘剪贴板一键存入 |
| **预览** | 知识库 Markdown/图片/视频/音频 内嵌预览，大文件 10s 超时降级，阅读进度跟踪 |
| **Web 版** | Express 5 服务器 (端口 3456)，JWT 认证，MySQL 双模支持 |
| **指南** | 内置使用指南 (`/guide`)，冷启动零门槛 |

---

## 快速开始

```bash
npm install
npm run dev        # 开发模式 (HMR)
npm run build      # 生产构建
npm run make       # 打包安装程序
npm run test       # 27 单元测试 + 11 E2E
```

**首次使用**: 注册 → 选择工作区目录 → 自动创建 `Blogs/` `KnowledgeBase/` `Assets/`



---

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面 | Electron 41, electron-vite 5, electron-forge |
| 前端 | React 19, TypeScript 5.7, Tailwind CSS v4, Zustand 5 |
| 编辑器 | Tiptap 3 (ProseMirror) |
| 数据库 | sql.js (SQLite WASM) / MySQL 8.3 双模 |
| Web | Express 5, JWT Cookie, mysql2 |
| 文档处理 | mammoth (DOCX), exceljs (XLSX), pdfjs-dist (PDF), markdown-it, turndown |
| 测试 | Vitest (49 tests), Playwright (11 E2E) |
| 质量 | Biome (lint + format), DOMPurify (XSS) |

---

## 架构

```
┌──────────────────────────────────────────────┐
│              Electron 41 桌面壳               │
│  ┌──────────┐  IPC (99 ch)  ┌──────────────┐ │
│  │ 主进程    │◄────────────►│ 渲染进程       │ │
│  │ Node.js  │  contextBridge│ React 19      │ │
│  │ 15 svc   │               │ 7 features    │ │
│  └────┬─────┘               └──────┬────────┘ │
│       │                            │          │
│       │  sql.js WASM / MySQL 8.3   │          │
│       └────────────┬───────────────┘          │
└────────────────────┼──────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │  Express 5 Web Server │
         │  端口 3456 · JWT     │
         └───────────────────────┘
```

---

## 项目结构

```
src/
├── main/              # Electron 主进程
│   ├── index.ts       #   窗口创建、托盘、宠物
│   ├── tray.ts        #   托盘菜单 + 桌面宠物
│   ├── pet.ts         #   宠物窗口 + 独立小窗
│   ├── ipc/           #   IPC handlers (15 文件)
│   ├── services/      #   业务逻辑 (15 services)
│   ├── db/            #   sql.js + MySQL 抽象层
│   └── utils/         #   加密、路径工具
├── preload/           # contextBridge API
├── renderer/          # React 前端
│   ├── features/      #   页面组件 (auth/blog/knowledge/guide/...)
│   ├── components/    #   通用组件 (editor/layout/common/toast)
│   ├── stores/        #   Zustand stores
│   └── hooks/         #   自定义 hooks
├── tests/             # E2E Playwright (11 tests)
├── server/            # Express Web 服务器
│   ├── routes/        #   REST API
│   └── middleware/     #   auth, error-handler
├── shared/            # 跨进程共享 (types, constants, IPC channels)
│   └── handlers/      #   共享逻辑 (blog-list, knowledge-list)
└── docs/              # 开发文档
```

---

## 分阶段实施 (16 Phase, ~400.5h)

| Phase | 范围 | 工时 | 状态 |
|-------|------|------|------|
| 1 | 项目骨架 + 认证 + Session | — | ✅ |
| 2 | 博客 CRUD + Tiptap + 标签 | 32h | ✅ |
| 3 | 知识库 + 文件预览 (mammoth/exceljs/pdf.js) | 21h | ✅ |
| 4 | 网页收藏 + 搜索 + 回收站 | 14h | ✅ |
| 5 | 全局搜索 UI + 主题 + 仪表盘 | 16h | ✅ |
| 6 | 测试 + 性能 + 打包 + 备份 | 30h | ✅ |
| 7 | TOC/文件夹/模板/专注/成就/PDF/双向引用 | 55h | ✅ |
| 8 | 系列链/便签/标签清理/关联展示/热力图/Word | 24h | ✅ |
| 9 | 架构去重/类型安全/XSS/DDL/校验/测试 | 36h | ✅ |
| 10 | 托盘/桌面宠物/PDF修复/翻页/UI圆润 | 22h | ✅ |
| 11 | 工程收敛 — 安全加固 + 架构收敛 + 质量基线 | 28h | ✅ |
| 12 | 缺陷修复 + E2E 兜底 + 体验收尾 — PDF/编辑器/浮窗/E2E/图标/快捷键/Toast/指南/便签 | 22h | ✅ |
| 13 | 程序轻量化 + 用户体验 — 隐藏唤醒/宠物rAF/乐观更新/柔性关闭/一键备份/侧栏折叠/续写视图 | 18h | ✅ |
| 14 | 工程质量深化 + 体验交付 — 状态机/类型收敛/IPC文档/UI重组/快捷键/迷你窗/剪贴板/阅读进度/成就/文件预览 | 33.5h | ✅ |
| 15 | 产品成熟化 — UI减重/布局统一/strict全覆盖/组织差异化/Web对等/剪贴板键/界面去杂 | ~19h | ✅ |
| 16 | 交互深化 — 阅读即编辑/手册收纳/TOC修复/剪贴板键补齐/图标收尾 | ~15h | ✅ |

---

## 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | Electron 开发模式 (HMR) |
| `npm run build` | 生产构建 (main + preload + renderer) |
| `npm run server` | Express Web 服务器 (端口 3456) |
| `npm run make` | 打包安装程序 |
| `npm run test` | Vitest 单元测试 |
| `npm run lint` | Biome 检查 |
| `npm run check` | Biome 自动修复 |

---

## 开发参考

- [AGENTS.md](AGENTS.md) — AI Agent 工程上下文 (架构约束、常见陷阱)
- [STYLE.md](STYLE.md) — 设计系统规范
- [todo.md](todo.md) — 当前待办与 Phase 状态
- [redo.md](redo.md) — 技术债与修复清单
- [docs/phase-archive.md](docs/phase-archive.md) — Phase 1-16 详细任务规格
- [docs/development-guide.md](docs/development-guide.md) — 测试策略、工作流程图

## License

MIT
