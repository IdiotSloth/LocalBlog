# Local Blog KB

> 离线可用的个人桌面应用 — 博客撰写、知识库管理、网页收藏。
> Electron 41 + React 19 + TypeScript + Vite 7 + sql.js

构建: ✅ 通过 | 测试: 87/87 pass | Phase 1-22 ✅ Phase 23 📋 | IPC: 139 | Service: 18 | strict ✅ | 语义搜索 ✅

---

## 特性

| 模块 | 功能 |
|------|------|
| **博客** | Markdown/WYSIWYG 编辑 (Tiptap 3)，系列链 prev/next 导航，批量操作，历史版本回滚，附件管理，[[双向链接]] (博客↔知识库↔便签)，自动引用持久化 |
| **知识库** | PDF/DOCX/XLSX/TXT 导入与预览，文件夹分类，拖放导入，全文搜索，自定义属性 (status/rating/source/notes)，反向链接面板 |
| **网页收藏** | URL → readability 正文提取 → turndown Markdown，一键保存为博客 |
| **搜索** | 全局搜索 (博客+知识库)，FTS5 Worker 倒排索引 + MySQL FULLTEXT，中文分词，Ctrl+K 命令面板 (搜索+最近+命令) |
| **回收站** | 30 天自动清理，批量恢复/删除，磁盘文件同步清理 |
| **首页** | 今日中枢：每日便签 + 日历月视图 + 待办 + 快捷操作 + 迷你知识图谱 + 续写回顾 + 统计 |
| **关系图谱** | D3 力导向图 — 博客/知识文件/便签/标签节点与边，迷你版 (首页) + 全屏版 (/graph)，类型/标签/日期过滤 |
| **备忘录** | 独立便签增强版，Markdown 渲染，置顶/归档，每日便签自动创建 (memoType='daily') |
| **编辑器** | 专注写作模式，模板系统，字数统计+阅读时间状态栏，TOC，[[双向链接]] Tiptap 自动补全，底部 Tab 化面板 (标签/附件/引用/系列)，30s 自动保存 |
| **导出** | PDF (Electron printToPDF)，Word (.docx) |
| **便签** | 独立 notes 表，剪贴板读取，24h 自动清理，置顶永久保留 |
| **桌面** | 托盘常驻，桌面宠物 (可拖拽 + 动画)，快捷写作浮窗，全局快捷键 (Ctrl+Shift+N) |
| **主题** | 暗色/亮色/暖色 Sepia 3 套阅读主题，CSS Token 驱动的精炼 UI，Lucide SVG 图标，无弹跳动效 |
| **布局** | 3 栏布局 (侧边栏固定 + 主内容 + 上下文面板)，右侧面板：大纲/反向链接/关系图/属性，响应式折叠 |
| **质量** | 87 单元测试 + 11 E2E 核心链路，DOMPurify XSS 防护，renderer `as any` 0 + `: any` 0，50 useState→3 useReducer |
| **自定义** | 快捷键录制+冲突检测+动态注册即时生效，迷你窗口可拖拽+位置记忆，托盘剪贴板一键存入 |
| **预览** | 知识库 Markdown/图片/视频/音频 内嵌预览，大文件 10s 超时降级，阅读进度跟踪 |
| **Web 版** | Express 5 服务器 (端口 3456)，JWT 认证，MySQL 双模支持 |
| **AI 接入** | MCP Server (stdio + HTTP 双模式)，12 工具 (搜索/读取/创建)，Claude Code 可直接操作知识库 |
| **指南** | 内置使用指南 (`/guide`)，配架构流程图+操作示意图，冷启动零门槛 |
| **快捷切换** | 博客缩小化为底部浮动标签条，最多 5 篇，一键快速切换 |
| **AI 对话** | 侧边 AI 面板，RAG 上下文自动注入 (KB+博客)，多 Provider 支持 (OpenAI/Ollama/DeepSeek)，标签自动建议 |
| **书签** | 博客/知识库一键收藏，跨模块统一书签管理 |
| **时间轴** | 博客/知识库按时间排列的纵向时间轴视图 |
| **白板** | React Flow 无限画布，6 种卡片 (想法/任务/文本/博客/KB/书签)，3 种连线 (关联/依赖/引用)，右键转化，双向同步 |
| **便签增强** | Alt+Space 快捷便签浮窗，剪贴板 MD5 去重监听，隐私遮蔽，磁贴系统 |
| **更新管理** | 用户可控自动更新 (检查/下载/安装 3 步)，状态通知，进度显示 |
| **国风主题** | 五套 CSS Token 驱动主题 (墨砚/茶竹/夜灯/宣纸/青瓷)，350ms 全局过渡，半透明 rgba 边框，背景图系统 |
| **标签页** | BlogCard Feed 标签聚合页，标签云离散字号，系列卡片前 4 篇预览 |
| **已存搜索** | 搜索查询持久化，一键复用 |

---

## 快速开始

```bash
npm install
npm run dev        # 开发模式 (HMR)
npm run build      # 生产构建
node scripts/pack.js  # 便携版打包
npm run test       # 87 单元测试
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
| 测试 | Vitest (87 tests), Playwright (11 E2E) |
| 质量 | Biome (lint + format), DOMPurify (XSS) |

---

## 架构

```
┌──────────────────────────────────────────────┐
│              Electron 41 桌面壳               │
│  ┌──────────┐  IPC (112 ch) ┌──────────────┐ │
│  │ 主进程    │◄────────────►│ 渲染进程       │ │
│  │ Node.js  │  contextBridge│ React 19      │ │
│  │ 16 svc   │               │ 7 features    │ │
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
│   ├── services/      #   业务逻辑 (16 services)
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

## 分阶段实施 (21 Phase)

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
| 12 | 缺陷修复 + E2E 兜底 + 体验收尾 | 22h | ✅ |
| 13 | 程序轻量化 + 用户体验 | 18h | ✅ |
| 14 | 工程质量深化 + 体验交付 | 33.5h | ✅ |
| 15 | 产品成熟化 — strict全覆盖/Web对等/界面去杂 | ~19h | ✅ |
| 16 | 交互深化 — 阅读即编辑/手册收纳/TOC修复 | ~15h | ✅ |
| 17 | 体验收尾 + 分发就绪 — Web Tiptap/系列交互/超链接安全/单实例/NSIS安装包 | ~18.5h | ✅ |
| 18 | 工程收官 — FTS5全文搜索/CRUD双写收敛/错误反馈/测试49/UX补缺 | ~22.5h | ✅ |
| 19 | 积压清偿 + 体验深化 — redo全清/日历备忘录/快捷键修复/指南配图/测试87/便签增强 | ~34h | ✅ |
| 20 | 信息架构升级 — 3栏布局/[[双向链接]]/知识图谱/今日中枢/MCP AI接入/设计语言重塑 | ~85h | ✅ |
| 21 | 编辑器进化 + 知识连接 + 内容中枢 — 分屏框架/CJK语义搜索/KB编辑/局部图谱/斜杠/Callout | ~67.3h | ✅ |

---

## 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | Electron 开发模式 (HMR) |
| `npm run build` | 生产构建 (main + preload + renderer) |
| `npm run server` | Express Web 服务器 (端口 3456) |
| `npm run make` | 打包安装程序 |
| `npm run test` | Vitest 单元测试 (87 tests) |
| `npm run lint` | Biome 检查 |
| `npm run check` | Biome 自动修复 |

---

## 开发参考

- [AGENTS.md](AGENTS.md) — AI Agent 工程上下文 (架构约束、常见陷阱)
- [STYLE.md](STYLE.md) — 设计系统规范
- [todo.md](todo.md) — 当前待办与 Phase 状态
- [redo.md](redo.md) — 技术债与修复清单
- [docs/phase-archive.md](docs/phase-archive.md) — Phase 1-19 详细任务规格
- [docs/development-guide.md](docs/development-guide.md) — 测试策略、工作流程图

## License

MIT
