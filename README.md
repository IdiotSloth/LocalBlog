# Local Blog KB

> 离线可用的个人桌面应用 — 博客撰写、知识库管理、网页收藏。
> Electron 41 + React 19 + TypeScript + Vite 7 + sql.js

构建: ✅ 通过 (250 modules) | 测试: 27/27 pass | Phase 1-10 全部完成

---

## 特性

| 模块 | 功能 |
|------|------|
| **博客** | Markdown/WYSIWYG 编辑 (Tiptap 3)，系列链 prev/next 导航，批量操作，历史版本回滚，附件管理 |
| **知识库** | PDF/DOCX/XLSX/TXT 导入与预览，文件夹分类，拖放导入，全文搜索 |
| **网页收藏** | URL → readability 正文提取 → turndown Markdown，一键保存为博客 |
| **搜索** | 全局搜索 (博客+知识库)，SQL LIKE 中文全文检索 |
| **回收站** | 30 天自动清理，批量恢复/删除，磁盘文件同步清理 |
| **仪表盘** | 统计数据，写作热力图 (GitHub 风格)，成就系统 (16 徽章) |
| **编辑器** | 专注写作模式，模板系统，阅读时间 + TOC，双向引用 (博客↔知识库) |
| **导出** | PDF (Electron printToPDF)，Word (.docx) |
| **桌面** | 托盘常驻，桌面宠物 (可拖拽 + 动画)，独立小窗快捷操作 (便签/导入/收藏) |
| **主题** | 暗色/亮色/系统，5 套阅读主题，CSS Token 驱动的圆润 UI |
| **Web 版** | Express 5 服务器 (端口 3456)，JWT 认证，MySQL 双模支持 |

---

## 快速开始

```bash
npm install
npm run dev        # 开发模式 (HMR)
npm run build      # 生产构建
npm run make       # 打包安装程序
npm run test       # 27 单元测试
```

**首次使用**: 注册 → 选择工作区目录 → 自动创建 `Blogs/` `KnowledgeBase/` `Assets/`

> ⚠️ 如遇 `ELECTRON_RUN_AS_NODE=1`，用 `scripts/launcher.bat` 启动而非直接双击 exe。


**当前特性**: MySQL 统一存储 | Web 浏览器版 | 博客阅读模式 | 数据库自动备份  


**当前特性**: MySQL 统一存储 | Web 浏览器版 | 博客阅读模式 | 数据库自动备份  


**当前特性**: MySQL 统一存储 | Web 浏览器版 | 博客阅读模式 | 数据库自动备份  


**当前特性**: MySQL 统一存储 | Web 浏览器版 | 博客阅读模式 | 数据库自动备份  


**当前特性**: MySQL 统一存储 | Web 浏览器版 | 博客阅读模式 | 数据库自动备份  


**当前特性**: MySQL 统一存储 | Web 浏览器版 | 博客阅读模式 | 数据库自动备份  


**当前特性**: MySQL 统一存储 | Web 浏览器版 | 博客阅读模式 | 数据库自动备份  


**当前特性**: MySQL 统一存储 | Web 浏览器版 | 博客阅读模式 | 数据库自动备份  


**当前特性**: MySQL 统一存储 | Web 浏览器版 | 博客阅读模式 | 数据库自动备份  


**当前特性**: MySQL 统一存储 | Web 浏览器版 | 博客阅读模式 | 数据库自动备份  


**当前特性**: MySQL 统一存储 | Web 浏览器版 | 博客阅读模式 | 数据库自动备份  


**当前特性**: MySQL 统一存储 | Web 浏览器版 | 博客阅读模式 | 数据库自动备份  


**当前特性**: MySQL 统一存储 | Web 浏览器版 | 博客阅读模式 | 数据库自动备份  


**当前特性**: MySQL 统一存储 | Web 浏览器版 | 博客阅读模式 | 数据库自动备份  


**当前特性**: MySQL 统一存储 | Web 浏览器版 | 博客阅读模式 | 数据库自动备份  


**当前特性**: MySQL 统一存储 | Web 浏览器版 | 博客阅读模式 | 数据库自动备份  

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
| 测试 | Vitest (27 tests), Playwright (E2E) |
| 质量 | Biome (lint + format), TypeScript strict |

---

## 架构

```
┌──────────────────────────────────────────────┐
│              Electron 41 桌面壳               │
│  ┌──────────┐  IPC (80 ch)  ┌──────────────┐ │
│  │ 主进程    │◄────────────►│ 渲染进程       │ │
│  │ Node.js  │  contextBridge│ React 19      │ │
│  │ 12 svc   │               │ 10 routes     │ │
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
│   ├── ipc/           #   IPC handlers (10 文件)
│   ├── services/      #   业务逻辑 (10 services)
│   ├── db/            #   sql.js + MySQL 抽象层
│   └── utils/         #   加密、路径工具
├── preload/           # contextBridge API
├── renderer/          # React 前端
│   ├── features/      #   页面组件 (auth/blog/knowledge/...)
│   ├── components/    #   通用组件 (editor/layout/common)
│   ├── stores/        #   Zustand stores
│   └── hooks/         #   自定义 hooks
├── server/            # Express Web 服务器
│   ├── routes/        #   REST API
│   └── middleware/     #   auth, error-handler
├── shared/            # 跨进程共享 (types, constants, IPC channels)
└── docs/              # 开发文档
```

---

## 分阶段实施 (10 Phase, ~250h)

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
- [docs/phase-archive.md](docs/phase-archive.md) — Phase 1-7 详细任务规格
- [docs/development-guide.md](docs/development-guide.md) — 测试策略、工作流程图

## License

MIT
