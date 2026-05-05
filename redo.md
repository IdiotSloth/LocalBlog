# redo.md — 技术债与修复跟踪

> **定位**: 记录已发现但未修复的问题、需要重构的代码、以及日常维护任务。
> 与 todo.md 的区别: todo.md = 功能路线图, redo.md = 修复清单。
> **角色协作**: Auditor 在此写入审查发现的问题；Developer 修复后更新状态；Boss 裁决分歧。详见 [AGENTS.md](AGENTS.md#项目角色与协作机制)。
>
> **工单字段说明**:
> - **状态** (📋/🚧/✅/⏭/🔄): Developer 更新，Auditor 验证后确认
> - **Boss 裁决**: Boss 对争议或优先级的最终决定
> - **Auditor 审查意见**: Auditor 验证修复后的结论（✅ 通过 / 🔄 不完整 + 具体原因）
> - **Developer 备注**: Developer 对问题的技术分析或修复过程中的发现
> 最后更新: 2026-05-06 | Phase 11 P0+P1 完成

---

## 当前待修复

### 🔴 高优先级 (影响稳定性)

| # | 问题 | 位置 | 状态 | Boss 裁决 / Auditor 审查意见 |
|---|------|------|------|
| R34 | Tiptap `setContent` → Tiptap 规范化 HTML → `onUpdate` 发出不同 HTML → `content !== editor.getHTML()` 恒真 → 死循环 | `TiptapEditor.tsx:69-71` | ✅ |

### 🟡 中优先级 (代码质量)

| # | 问题 | 位置 | 状态 | Boss 裁决 / Auditor 审查意见 |
|---|------|------|------|
| R32 | Electron IPC `BLOG_IMPORT_MD` handler 仅接受 `filePaths`，忽略 `contents`。Web 回退路径的 `contents` 被丢弃 | `ipc/blog.ts:63` + `blog.service.ts:100` | ✅ |
| R35 | SQLite `datetime('now')` 返回 UTC 无时区标识，JS `new Date()` 在 V8 中当本地时间解析，UTC+8 差 8 小时 | `utils.ts:formatDate` + blog/knowledge/recycle/folder.service.ts | ✅ |
| R36 | F61 修复不完整 — UPDATE 已修 ✓，9 处 INSERT 仍依赖 DB DEFAULT。MySQL `CURRENT_TIMESTAMP` 返回服务器本地时间，formatDate 按 UTC 解析 → UTC+8 服务器上显示时间多 8h | `auth.service.ts:33,47,67` + `blog.service.ts:19,56,132` + `knowledge.service.ts:46,75` + `folder.service.ts:35` | ✅ |
| R37 | T804 前端用 camelCase 访问 RefRow snake_case 字段 | `BlogPreviewPage.tsx:15` + `KnowledgeListPage.tsx:121` | ✅ |
| R38 | 文件夹移动后端完整但前端零入口 | `BlogListPage.tsx` + `KnowledgeListPage.tsx` | ✅ |
| R33 | `permanentlyDeleteItem` 仅删 DB 记录不删磁盘文件 — 清空回收站后博客正文(.md)、附件目录(Assets/)、知识库副本残留在工作区 | `recycle.service.ts` | ✅ |

### 🟢 低优先级 (体验改进)

| # | 问题 | 位置 | 状态 | Boss 裁决 / Auditor 审查意见 |
|---|------|------|------|
| R13 | sql.js 旧数据库无 folder_id/content_text/refs 列 | `db/index.ts` ALTER TABLE + SCHEMA_SQL IF NOT EXISTS 已覆盖 | ✅ |
| R39 | T806 Word 导出仅处理 markdown 格式 — HTML 格式博客的 `<h1>`/`<p>` 等标签会被当成纯文本逐行输出，导出为乱码 | `ipc/blog.ts:179` | ✅ |
| R40 | 6 处 `color: '#fff'` 硬编码白色 — 应定义 `--text-on-accent` CSS 变量统一管理 | `BlogListPage.tsx`, `KnowledgeListPage.tsx`, `TagSelector.tsx`, `SettingsPage.tsx` | ✅ |
| R41 | T902 `WindowApi` 方法名与 preload 不一致 | `window-api.ts` vs `preload/index.ts` | ✅<br>**Auditor 验证**: 方法名已对齐 preload 运行时；preload 加 `const api: WindowApi` 实现双向类型约束 |
| R42 | BlogListPage:155 `<span>` 双 `className` — 第二个覆盖第一个，批量模式标题无样式 | `BlogListPage.tsx:155` | ✅ |
| R43 | PDF 导出无内容 — `blog:exportPdf` 未等 `did-finish-load` → 空 buffer | `ipc/blog.ts` PDF 导出逻辑 | ✅ |
| R44 | 知识库 PDF 预览失败 — `pdfjs-dist` `{ url }` 在 Electron sandbox 受限 | `preview.service.ts` + `FilePreview.tsx` | ✅ |
| R45 | Widget 窗口 `nodeIntegration: true, contextIsolation: false` | `tray.ts:123` | ✅<br>**Auditor 验证**: 改为 `sandbox: true, contextIsolation: true, nodeIntegration: false`；动态生成 tiny preload (`widgetApi.onClick()`) 写入 userData；HTML 用 `window.widgetApi?.onClick()` 替代 `require('electron')` |
| R46 | `tray-action` import-md 用 `document.querySelector('button')?.click()` | `MainLayout.tsx:29` | ✅<br>**Auditor 验证**: 所有 DOM query 已移除，改为纯 `navigate()` 路由跳转 |
| R47 | `tray-action` import-md `setTimeout(100ms)` 竞态 | `MainLayout.tsx:29` | ✅<br>**Auditor 验证**: 随 R46 一起移除，不依赖 DOM 加载时序 |
| R48 | 悬浮球 `-webkit-app-region: drag` 点击不灵敏 | `tray.ts` | ✅ |
| R49 | PDF 导出 `did-finish-load` 监听器在 `loadFile()` 之后注册 | `ipc/blog.ts:152` | ✅ |
| R50 | 图标为纯色蓝圆，无识别度 | `tray.ts` | ✅ |
| R51 | pet.html 图片路径硬编码 — 打包后 ASAR 内路径失效 | `pet.ts` | ✅ |
| R52 | 托盘菜单依赖 `createPet()` 内的 `setPetActions()` | `tray.ts` + `pet.ts` | ✅ |
| R53 | scrape mini 窗缺 `doImport()` | `pet.ts` | ✅ |
| R54 | 快速便签 × 关闭丢内容 | `pet.ts` | ✅ |
| R55 | `togglePet()` 不销毁 petWin | `tray.ts` | ✅ |
| R56 | `public/pet.html` 遗留文件 | `public/` | ✅ |
| R58 | `main/index.ts` launcher.bat 写 ASAR 只读区 | `main/index.ts` | ✅<br>**Auditor 验证**: `launcherBatPath` 已改为 `app.getPath('userData')/launcher.bat` |
| R59 | `ipc/app.ts` launcher.bat 写 ASAR 只读区 | `ipc/app.ts` | ✅<br>**Auditor 验证**: 同上；`getProjectRoot()` 仅用于只读检查与字符串拼接 |

---

## 本次审查修复记录 (2026-05-02)

| # | 严重性 | 问题 | 修复方式 | Auditor 验证 |
|---|--------|------|----------|
| F01 | 🔴 | `stats.service.ts` 使用 `strftime()` 在 MySQL 崩溃 | 改为 JS 端计算小时分布 |
| F02 | 🔴 | `recycle.service.ts` `datetime('now', ?)` 参数化不翻译 | 内联 days 到 SQL 字符串 |
| F03 | 🔴 | `recycle.service.ts` `permanentlyDeleteItem` 用 camelCase 访问 snake_case 列 → 静默数据损坏 | 重构为 `RecycleRow` 接口 + snake_case 访问 |
| F04 | 🔴 | `db/index.ts` sync `run()` 产生未处理 rejection | 移除 fire-and-forget 模式 |
| F05 | 🟡 | `api-client.ts` 缺少 19 个 Phase 7 新增方法 → 浏览器模式 TypeError | 添加 web stub 方法 |
| F06 | 🟡 | `achievements.ts` / `DashboardPage` 跨进程边界导入 `UserStats` | 移至 `shared/types.ts` |
| F07 | 🟡 | `dbSave()` 未导入被 5 处调用 (2026-04-30 审查) | 移除冗余调用 |
| F08 | 🟡 | `searchBlogs()` 缺少 `await` (2026-04-30 审查) | 添加 `await` |
| F09 | 🟢 | `emptyTrash`/`autoClean` 重复逻辑 (2026-04-30 审查) | 提取私有方法 |
| F10 | 🟢 | `debounce`/`truncate` 未使用 (2026-04-30 审查) | 删除 |
| F11 | 🟢 | README.md 含 ~5000 字节重复内容 | 清理 header |
| F12 | 🟢 | Phase 7 P3 未完成 (T607/F604) | 实施 React.lazy + 阅读主题 |
| F13 | 🟢 | App.tsx 8 个页面组件全量加载 | 改为 React.lazy 按需加载 |
| F14 | 🟢 | BlogPreviewPage 无阅读主题切换 | 添加 5 套 CSS 主题 |
| F15 | 🟡 | TagManagePage 标签无点击导航 | tag click → blog list with filter |
| F16 | 🔴 | TimelineView 加载中永久卡住 | 添加 catch + loading 状态重置 |
| F17 | 🟡 | FolderTree 跨边界 import FolderTreeNode | 移至 shared/types.ts |
| F18 | 🟡 | T615 双向引用未实现 | refs 表 + ReferenceService + ReferencePicker |
| F19 | 🔴 | PDF导出 margins 错误 | 移除自定义 margins，使用默认值 |
| F20 | 🔴 | 文件夹在旧数据库不可用 | sql.js ALTER TABLE 迁移 |
| F21 | 🟡 | 标签页点击无知识库结果 | 改为内联显示博客+知识库双列表 |
| F22 | 🟡 | TOC 遮挡正文 | 添加收起/展开切换按钮 |
| F23 | 🟡 | 博客/KB页左侧固定留白 | 文件夹侧栏改为可折叠 |
| F24 | 🟡 | PDF预览可能失败 | 添加 getDocument 函数检查 |
| F25 | 🔴 | 启动时 Chromium cache ACCESS_DENIED 错误 | 设置自定义 cache 目录到 userData 路径 |
| F26 | 🔴 | 文件夹创建 Enter 键无反馈 | 添加 actionError 状态 + 错误信息展示 |
| F27 | 🟡 | 博客/KB搜索栏 input-dark 样式不可靠 | 改为显式 inline 样式 border/background/color |
| F28 | 🔴 | 文件夹创建 `parent_id IS ?` MySQL 语法错误 | 按 parentId 是否为 null 分两路查询 |
| F29 | 🔴 | `toMySQL()` `'now'` 替换破坏 `datetime('now', '-N days')` / 缺 `date()`/`time()`/`strftime()` | 重排替换顺序 (modifier 优先) + 新增 4 种 SQLite→MySQL 翻译 | ✅ 已验证 (2026-05-02 Auditor) |
| F30 | 🔴 | `deleteAccount` 忽略 `keepFiles` 参数 | `keepFiles=false` 时 `fs.rmSync` 递归删除工作区 | ✅ 已验证 (2026-05-02 Auditor) |
| F31 | 🔴 | `auth.service.ts:48` console.log 密码验证结果 | 移除日志行 | ✅ 已验证 (2026-05-02 Auditor) |
| F32 | 🔴 | `mysql.ts` 硬编码数据库凭据 | 改为读取 `MYSQL_HOST/USER/PASSWORD/DATABASE` 环境变量 | 🔄 修复不完整 → F33 补修<br>**Auditor 验证**: `getMySQLConfig()` 正确，R23 残留由 F33 修复<br>**Boss 裁决**: F32+F33 合并结案 |
| F33 | 🔴 | R23 `CREATE DATABASE` 不跟随 `MYSQL_DATABASE` 环境变量 | 改为 `` `\`${cfg.database}\`` `` | ✅ 已验证 (Auditor) |
| F34 | 🟡 | R04 IPC 响应格式不一致 — `tagList`/`recycleList` | 改为标准 `{success, data}` 格式；更新 preload 类型 + 3 处前端调用 | ✅ 已验证 (Auditor) |
| F35 | 🟡 | R05 `electron-log` 已安装但未使用 | `npm uninstall electron-log` | ✅ 已验证 (Auditor) |
| F36 | 🟡 | R06 三处 DDL 重复定义 | 提取 `src/shared/db-schema-mysql.ts`；main/db/mysql.ts 和 server/db.ts 统一导入 | ✅ 已验证 (Auditor) |
| F37 | 🟡 | R07+R08 sync API 泄露 + preview/paths 直接调用 | `get`/`all`/`run` 标记 `@deprecated`；preview.service.ts 和 paths.ts 迁移至 `dbGet` | ✅ 已验证 (Auditor) |
| F38 | 🟡 | R17 跨包导入 `main/utils/crypto` | 创建 `src/server/utils/crypto.ts`；server/routes/auth.ts 改为本地导入 | ✅ 已验证 (Auditor) |
| F39 | 🟡 | R18 `req.userId!` 非空断言 | 替换为 `if (uid == null) return res.status(401)` 守卫 | 🔄 修复范围不足 → 残留 R25<br>**Auditor 验证**: `auth.ts:85` 已修复；但其余 7 个路由文件 (blog/knowledge/search/tags/recycle/workspace) 仍有 26 处 `req.userId!`<br>**Boss 裁决**: 核准 R25，统一任务：为所有路由文件中的 `req.userId` 添加运行时守卫 |
| F40 | 🟢 | R10 拖放导入未绑定 KnowledgeListPage | onDrop/onDragOver 事件绑定到根容器 | ✅ 已验证 (Auditor) |
| F41 | 🟢 | R11 `start.cmd` 遗留批处理 | 删除 | ✅ 已验证 (Auditor) |
| F42 | 🟢 | R12 评审报告未归档 | 移至 `docs/` | ✅ 已验证 (Auditor) |
| F43 | 🟢 | R19 `drizzle-orm` + `drizzle-kit` 零次导入 | 卸载 + 删除 `drizzle.config.ts` (移除 34 包) | 🔄 清理不彻底 → 残留 R24<br>**Auditor 验证**: 包已卸载、config 已删；但 `npm run db:generate/migrate/studio` 三个脚本仍引用 `drizzle-kit`<br>**Boss 裁决**: 核准 R24，这是简单的脚本清理，无风险 |
| F44 | 🟢 | R20 theme-store matchMedia 泄漏 | `mqlListener` 守卫 + removeEventListener 清理 | ✅ 已验证 (Auditor) |
| F45 | 🟢 | R21 DashboardPage effect 无卸载清理 | `aborted` 标志 + useEffect cleanup | ✅ 已验证 (Auditor) |
| F46 | 🟢 | R22 sandbox: false | 改为 `sandbox: true` | ✅ 已验证 (Auditor) |
| F47 | 🟢 | R09 KnowledgeListPage 批量模式 | useBatchSelect + 切换按钮 + 复选框 + 批量删除 | ✅ 已验证 (Auditor) |
| F48 | 🟢 | R13 sql.js 旧数据库迁移 | 已有覆盖（SCHEMA_SQL refs 表 + ALTER TABLE） | ✅ 已验证 (Auditor) |
| F49 | 🟡 | R25 `req.userId!` 26 处遍布 6 个路由文件 | 所有 26 处替换为 `const uid = req.userId; if (!uid) return res.status(401).json(...)` 守卫 | ✅ 已验证 (Auditor)<br>0 处 `req.userId!` 残留，24 个守卫覆盖全部 6 个路由文件 |
| F50 | 🟢 | R24 drizzle-kit npm scripts 残留 | 删除 `db:generate`/`db:migrate`/`db:studio` 3 行 | ✅ 已验证 (Auditor)<br>3 个 dead scripts 已移除 |
| F51 | 🟢 | R26 `server/db.ts` 数据库名未转义 | 添加反引号：`` \`${DB_CONFIG.database}\` `` | ✅ 已验证 (Auditor) |
| F52 | 🟢 | R09 BlogListPage 批量模式 | useBatchSelect + 批量切换按钮 + 复选框卡片 + 批量移至回收站 | ✅ 已验证 (Auditor)<br>初始实现有 Link click bug → F53 修复；**Boss 裁决**: F52+F53 合并结案，R09 完成 |
| F53 | 🟡 | R27 批量模式标题 Link 导航 Bug | 批量模式下标题改为 `<span>` 替代 `<Link>`，消除跳转 | ✅ 已验证 (Auditor)<br>`batch.isBatchMode ? <span> : <Link>` 条件渲染，批量模式下无导航元素 |
| F54 | 🟡 | R28 `keepFiles=true` 语义修复 | 不 DELETE CASCADE：改为清空 password_hash + sessions；注册时检测 workspace 下空密码用户并 reclaim | ✅ 已验证 (Auditor)<br>两阶段设计：deleteAccount 清空 auth → register 检测 `password_hash=''` + 同 workspace 则 reclaim |
| F55 | 🟡 | R29 `handleImportMd` 静默失败 | `!user` 加 alert；`selectFiles` 加 try-catch + alert | ✅ 已验证 (Auditor)<br>line 45 alert('请先登录')；lines 53-55 catch → alert IPC 错误信息 |
| F56 | 🔴 | R30 sql.js blogs 缺 content 列 | schema.ts 加 `content TEXT NOT NULL DEFAULT ''`；db/index.ts ALTER TABLE 迁移；frontend 检查 resp.success | ✅ 已验证 (Auditor)<br>DDL、迁移、前端错误处理三处全部修复到位 |
| F57 | 🟡 | R31 批量按钮 toggle 死循环 | 移除 toggle onClick 中的 `clearSelection()` 调用，仅保留 `setIsBatchMode(!isBatchMode)` | ✅ 已验证 (Auditor)<br>BlogListPage:111 + KnowledgeListPage:86 两处均已修复 |
| F58 | 🟡 | R32 BLOG_IMPORT_MD 忽略 contents | IPC handler 新增 `contents?` 参数；importMarkdownFiles 新增 inline content 导入分支 | ✅ 已验证 (Auditor)<br>IPC 接受 `{filePaths?, contents?}` 双参数；Service 双循环：disk files + inline contents，title 默认 '未命名' |
| F59 | 🟡 | R33 permanentlyDeleteItem 磁盘泄漏 | 删 DB 前取 blog user_id+format / kf file_path+user_id；删 .md 文件 + Assets 目录；仅删工作区内 kf 文件；disk ops try-catch | ✅ 已验证 (Auditor)<br>先取路径 → 删 DB → 后清磁盘；kf 仅删 workspace 内副本；emptyTrash+autoClean 双受益 |
| F60 | 🔴 | R34 Tiptap setContent 死循环 | `isSettingRef` 标志：`setContent` 前设 true，`onUpdate` 检测后跳过 `onChange`，杜绝规范化 HTML 回环 | ✅ 已验证 (Auditor)<br>ref 守卫在 onUpdate 回调中检查，跳过 content sync；外部 setContent 不受影响 |
| F61 | 🟡 | R35 datetime 时区偏移 | 存储层：9 处 `datetime('now')` → `new Date().toISOString()`；显示层：`formatDate` 对无 TZ 字符串追加 `Z` 强制 UTC 解析 | ✅ 已验证 (Auditor)<br>存储时间统一为 ISO 8601 UTC；formatDate 对 `2026-05-02T...` 格式直接解析，对 `2026-05-02 00:00:00` 格式追加 `Z` |
| F62 | 🟡 | R36 INSERT 仍依赖 DB DEFAULT | 9 处 INSERT 全部加显式 `new Date().toISOString()`：users/sessions/blogs/recycle_bin/blog_drafts/knowledge_files/folders | ✅ 已验证 (Auditor)<br>auth.service.ts blog.service.ts knowledge.service.ts folder.service.ts 共 9 处 INSERT 已加日期 |
| F63 | 🟡 | R37 T804 camelCase/snake_case 混用 | `ref.targetType`→`target_type`, `ref.sourceType`→`source_type`, `ref.sourceId`→`source_id`, `ref.targetId`→`target_id` | ✅ 已验证 (Auditor)<br>BlogPreviewPage:15 target_type + KnowledgeListPage:129 source_type + :147 source_id |
| F64 | 🟡 | R38 文件夹移动前端零入口 | BlogListPage/KnowledgeListPage 操作区加「移至」`<select>` 下拉，调用 `folderMoveItem` |
| F65 | 🟢 | R39 HTML 格式 Word 导出乱码 | 导出前 `blog.format === 'html'` 时用 turndown 转 markdown 再解析 |
| F66 | 🟢 | R40 `#fff` 硬编码 | 新增 `--text-on-accent` token，暗/亮双模式定义，替换 6 处 `'#fff'` |
| F67 | 🔴 | B3 Server 路由权限遗漏 | knowledge GET /:id 加 `AND user_id = ?`；blog rollback 加 uid 守卫+ownership；blog/knowledge tags 加 ownership 验证 |
| F68 | 🟡 | B5 sql.js 每次写入全量 fs.writeFileSync | 500ms debounce：`sqlJsSave()` 合并连续写入，`saveToDisk()`/`closeDatabase()` 用 `sqlJsSaveNow()` 立即落盘 |
| F69 | 🟡 | B1 17 处 `catch {}` 静默吞错 | 全部替换为 `catch (e) { console.error(e); }`：BlogListPage+KnowledgeListPage+RecycleBinPage+BlogEditorPage+QuickNote |

## Phase 9 修复记录 (2026-05-03)

| # | 严重性 | 问题 | 修复方式 |
|---|--------|------|----------|
| F70 | 🔴 | T914 DDL 顺序 — `folders` 在 `blogs` 后定义，FK 无法创建 | `folders` 移到 `blogs` 前；MYSQL_MIGRATIONS 加 ADD CONSTRAINT | ✅ 已验证 (Auditor)<br>DDL 顺序修正 + 2 条 FK migration |
| F71 | 🔴 | T903 XSS — `markdown-it` `html: true` 透传 `<script>` | BlogEditorPage + BlogPreviewPage 两处改为 `html: false` | ✅ 已验证 (Auditor) |
| F72 | 🔴 | T907 Server 输入无校验 | `src/shared/validation.ts` (+zod)；auth register/login + blog create/update 覆盖 | ✅ 已验证 (Auditor)<br>9 个 zod schema + 类型推导 |
| F73 | 🟢 | T913 Heatmap 周日无标签 | DAY_LABELS 加 `日` | ✅ 已验证 (Auditor)<br>7 元素对齐 Mon=0..Sun=6 |
| F74 | 🟢 | U902 主题切换无过渡 | `html { transition: background-color/color 200ms ease }` | ✅ 已验证 (Auditor) |
| F75 | 🟢 | U903 博客卡片无完整标题 | `<article>` 加 `title={blog.title}` | ✅ 已验证 (Auditor) |
| F76 | 🟡 | U901 文件夹侧栏不持久化 | BlogListPage+KnowledgeListPage 侧栏状态写入 localStorage | ✅ 已验证 (Auditor)<br>`sidebar_folder_blog` / `sidebar_folder_kb` |
| F77 | 🟡 | R38 文件夹移动 UI（之前漏记录） | 两页操作栏加「移至」`<select>` dropdown | ✅ 已验证 (Auditor) |
| F78 | 🔴 | T901 Server/Main blog list 逻辑去重 | `src/shared/handlers/blog-list.ts`：server route + main IPC 双接入 | ✅ 已验证 (Auditor)<br>DI 模式注入 QueryRows/QueryOne 适配两种后端 |
| F79 | 🔴 | T902 IPC 类型安全基础 | `src/shared/window-api.ts`：90+ 方法完整 `WindowApi` 接口 + `declare global` | 🔄 方法名不匹配 → R41<br>接口用 `authLogin/authRegister/authLogout`，preload 实际暴露 `login/register/logout`，类型系统未生效 |
| F80 | 🟡 | T915 Server 列表分页 | blog + knowledge list 加 `offset`/`limit` query params (max 200) | ✅ 已验证 (Auditor) |
| F81 | 🟡 | T908 Server 错误中间件 | `error-handler.ts` (+ `asyncHandler`) wired into server | ✅ 已验证 (Auditor) |
| F82 | 🟡 | T906 inline style 治理 | `index.css` 加 15 个 CSS class | ✅ 已验证 (Auditor)<br>btn-primary/btn-danger/input-dark/card/tag + text/surface token |
| F83 | 🟡 | T905 Service 层测试 | auth (12) + blog (8) + crypto (7)，共 27 测试全通过 | ✅ 已验证 (Auditor)<br>覆盖 createBlog/deleteBlog/listBlogs/getBlog + register/login/verify |

---

## 重构建议 (非紧急)

1. **提取共享 MySQL DDL** ✅ `src/shared/db-schema-mysql.ts` 已创建，main/db/mysql.ts + server/db.ts 统一导入
2. **统一 IPC 响应格式** ✅ `tagList`/`recycleList` 已改为 `{ success, data }` 格式
3. **移除 sync DB API** ✅ `get()`/`all()`/`run()` 已标记 `@deprecated`，推荐使用 `dbGet`/`dbAll`/`dbRun`
4. **集成 electron-log** ✅ 已从 package.json 移除 (零次使用)
5. **TypeScript strict 模式**: 逐步消除 `any` 类型，提升类型安全
6. **修复 Biome lint 错误**: 180 errors + 89 warnings，主要解决 CSS inline styles 和 `any` 类型

---

## Phase 9 深度结构审计 (2026-05-03 Auditor)

> 审查方法：不逐行审查，而是从架构层面识别系统性债务。每一项都有可量化的影响。

### 🔴 架构级缺陷（影响所有后续开发）

| # | 问题 | 量化 | 后果 |
|---|------|------|------|
| S1 | **Server 路由和 Main Service 逻辑完全重复** — blog list / knowledge list / search / tags / recycle 的过滤、排序、分页、camelCase 映射在 server/routes 和 main/services 各写一遍，互不共享。改一个 bug 要改两处 | 8 个 route 文件，每个 100-200 行重复逻辑 | R37（user_id 过滤遗漏）的直接根因；Phase 9 加任何新功能都需双倍工时 |
| S2 | **86 处 `as any` + 64 处 `Promise<unknown>`** — preload→IPC→service 类型链完全断裂。server routes 每个 `pool.execute()` 都 `as any[]` | 150 处类型断言 | Schema 变更无编译期保护；R37（camelCase/snake_case）在 any 类型下完全不可见 |
| S3 | **`mapBlog`/`mapFile`/`rowToBlog`/`rowToFile` 四套映射** — server routes 和 main services 各自实现 snake_case→camelCase 转换，字段名、默认值不完全一致 | 4 套映射函数 | 加一个 DB 列需要在 4 处加字段 |
| S4 | **Server 路由校验不一致** — blog 路由全部校验 `user_id`，但 knowledge 路由修复前只有部分校验。没有统一的 ownership guard 中间件 | 8 个 route 文件 | 每次加新路由都可能遗漏 user_id 过滤 |
| S5 | **Server 无统一错误处理中间件** — 每个 route handler 手动 `try-catch → res.json`。Express 5 的 error middleware 未使用 | 104 处 `res.json` | 未捕获异常会挂起请求，无超时、无 500 兜底 |

### 🟡 代码质量债务

| # | 问题 | 量化 | 后果 |
|---|------|------|------|
| S6 | **`db-schema-mysql.ts` Export 纯字符串数组** — Schema 变更是字符串替换，无类型信息。`MYSQL_MIGRATIONS` 用 `try-catch` 吞所有 ALTER TABLE 错误 | 10 个 DDL 数组 + 3 个 migration 字符串 | R30（content 列缺失）在 MySQL 侧靠 try-catch 掩盖，sql.js 侧完全遗漏 |
| S7 | **Server 创建时无输入校验** — `POST /blog/create` 不校验 title 长度和 format 枚举值（依赖 DB constraint），`POST /knowledge/import` 不校验 fileType 枚举 | 6+ 个 POST 端点 | 无效数据在到达 DB 前没有前置校验 |
| S8 | **`console.log` 作为唯一日志系统** — `electron-log` 已卸载（F35），但 7 处 `console.log` 在打包后不可见 | 7 处残留 | 生产环境崩溃无法排查 |
| S9 | **BlogEditorPage 30 个 useState** — 单个组件管理 template/content/tags/drafts/series/history/focus/title 等全部状态，无 reducer 或状态机 | 1 个组件 30 个 state | 状态更新顺序敏感，加新功能极易引入竞态 |
| S10 | **IPC 领域分散** — tag:set-blog 在 blog.ts，tag:set-file 在 knowledge.ts，statsDaily 在 app.ts。同一领域跨 3 个 IPC 文件 | 11 个 IPC 文件，80 个 handler | 找 handler 需要跨文件搜索 |

### 🟢 性能与体验

| # | 问题 | 量化 | 后果 |
|---|------|------|------|
| S11 | **Server 列表无分页参数** — blog list 硬编码 `LIMIT 50`，knowledge list 同理。没有 offset/limit 查询参数 | 2 个 list 端点 | 51+ 篇博客时无法翻页 |
| S12 | **Tag 列表每次计算关联数** — `listTags` SQL 用两个子查询实时统计 blog_tags + knowledge_file_tags | 1 个查询，O(n×m) | 100 个标签时每次打开标签页都要扫全表 |
| S13 | **Heatmap 日标签从 Mon=0** — `d.getDay() === 0 ? 6 : d.getDay() - 1` 将周一作为每周第一天，但 DAY_LABELS 写死 ['', '一', '', '三', '', '五', ''] | 1 个组件 | 周日起始的 GitHub 热力图与周一起始的标签错位 |
| S14 | **`db-schema-mysql.ts` MYSQL_DDL 数组顺序依赖** — `blogs` 表在 `folders` 表前定义，但 `folder_id` REFERENCES `folders(id)`。MySQL 按数组顺序执行，`blogs` 先创建时 folders 还不存在 → FK 创建失败 | 10 个 DDL 语句 | MySQL 模式下 `folder_id` 外键可能未创建 |
| S15 | **QuickNote 标签无去重** — `quickCreate` 调 `TagService.createTag` 时如果标签已存在会抛异常（已有 `find` 守卫，但竞态下不安全） | 1 个 edge case | 连续快速创建两条便签时第二条可能标签创建失败 |

### 🔵 安全隐患

| # | 问题 | 量化 | 后果 |
|---|------|------|------|
| S16 | **Server 无 rate limiting** — 无请求频率限制，无登录失败次数限制 | 0 处限流 | 暴力破解或 DDoS 无防护 |
| S17 | **Server 无 CORS 配置** — `cors({ origin: true })` 允许任意来源 | 1 行 | CSRF 攻击面 |
| S18 | **blog_drafts 无 user_id** — 草稿表只有 `blog_id` REFERENCES blogs，无法直接校验草稿归属 | 1 张表 | 通过 blog_id 间接校验，但路径更长 |

---

## 测试缺口

| 模块 | 覆盖率 | 需要 |
|------|--------|------|
| crypto.ts | ✅ 7 测试 | — |
| auth.service.ts | ❌ 0 | 注册/登录/验证/注销流程 |
| blog.service.ts | ❌ 0 | CRUD + 附件管理 |
| knowledge.service.ts | ❌ 0 | 导入/列表/搜索 |
| recycle.service.ts | ❌ 0 | 恢复/清空/自动清理 |
| search.service.ts | ❌ 0 | 博客搜索/知识库搜索 |
| folder.service.ts | ❌ 0 | 树形结构/CRUD |
| stats.service.ts | ❌ 0 | 统计查询/成就条件 |
| E2E | ❌ 0 | 全流程 (Playwright) |

---

## Developer 深度评估 (2026-05-03)

> 以下不是 Auditor 的逐行审查结论，而是我（Developer）在修了 60+ 个工单、写了 Phase 8 全部功能之后，对代码库的真实判断。有些问题是 Auditor 永远不会报的——它们不违反任何 lint 规则，但每天都在拖慢开发和运行。

---

### 🟡 架构层面

**A1 — IPC 类型安全为零**

`preload/index.ts` 所有方法返回 `Promise<unknown>`。前端到处是 `const r = d as any; if (r.success)`。后端改一个字段名、前端静默挂掉——编译器不会告诉你。这不是 Bug，但它是 Bug 的温床。60 个 IPC channel，每一个都是 `unknown`。

方向: 给 `contextBridge.exposeInMainWorld` 生成 `.d.ts`，或手写一个 `WindowApi` 接口让 `window.api` 有类型。

**A2 — inline style 失控**

Biome 报了 180 个 lint error，其中大部分是 "CSS inline styles should not be used"。这不是风格问题——当每个组件用 `style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}` 写 15 行时，改一个 token 不需要改 CSS 文件，需要改 40 个 TSX 文件。

方向: 至少把高频组合（card、input-dark、tag、btn）抽成 CSS class。不需要消灭所有 inline style，但 frequency > 20 的 pattern 应该进 index.css。

**A3 — sql.js / MySQL 双轨复杂度**

`db/index.ts` 里有 6 个 deprecated 函数、6 个推荐函数、1 个 `isUsingMySQL()` 开关。`preview.service.ts` 曾经手写 `isUsingMySQL() ? getAsync() : get()` 三元——我们修掉了，但修掉的方式是加了一层 `dbGet/dbAll/dbRun` 包装。现在调用栈是 `blog.service.ts → dbGet() → isUsingMySQL? → _mysqlGet() : get()`。三层跳转，每层都可能是 async 或 sync。

方向: 长期要么彻底迁到 better-sqlite3（有 FTS5 真正全文搜索），要么删掉 MySQL 只留 sql.js。维护两套 Schema（schema.ts + db-schema-mysql.ts）是不可持续的。

---

### 🟡 日常开发摩擦

**B1 — `catch {}` 静默吞错**

搜索 `catch {}` 在 `src/renderer` 里有超过 30 处。任何 IPC 超时、网络错误、JSON 解析失败——用户看到的是"按钮短暂禁用然后恢复，什么都没发生"。R29 修了 `handleImportMd` 一处，但 pattern 是系统性的。

**B2 — 空状态/加载态/错误态无统一模式**

三个页面三种空状态写法，四种 loading 写法。DashboardPage 用 `aborted` flag（F45 修的），其他页面没这个保护。

**B3 — Server 路由权限校验不全**

`server/routes/blog.ts` 的 `/blog/:id` GET 不带 `user_id` 过滤——任何登录用户能读任何人的博客。创建和删除有 `user_id` 检查，但读取漏了。

**B4 — `dangerouslySetInnerHTML` + `html: true`**

`BlogPreviewPage` 用 `markdown-it({ html: true })` 渲染用户输入的 Markdown，结果直接 `dangerouslySetInnerHTML`。如果用户写 `<script>alert('xss')</script>`，markdown-it 会透传。虽然 Electron 的 `contextIsolation` + `nodeIntegration: false` 限制了破坏力，但这仍然是不该存在的攻击面。

**B5 — sql.js 每次写入都 fs.writeFileSync**

`db/index.ts` 的 `run()` 每次调用都 `sqlJsSave()` → `fs.writeFileSync(database.db)`。连续创建 10 篇博客 = 10 次全量数据库写入。数据库膨胀到 50MB 时每次保存都是同步阻塞。

方向: 至少加个 debounce（500ms 内的多次写入合并为一次 `export()`+`writeFileSync`）。

---

### 🔵 长期隐患

**C1 — 零测试覆盖的 service 层**

7 个 service 模块全是 0% 覆盖率。现在靠 Auditor 人工审查和 `npm run build` 验证——这不能替代自动化测试。任何重构（比如 A3 提到的 DB 迁移）都像在没有安全网的情况下走钢丝。

**C2 — R30 类型的幽灵列**

`blogs.content` 列在 sql.js schema 里缺失了不知道多久——直到用户报"导入没反应"才发现。没有测试，这类 schema-drift 问题会反复出现。MySQL DDL 和 sql.js DDL 是两套独立维护的字符串，任何一方的任何修改都可能产生 R30。

**C3 — 前端 bundle 1.85MB**

单个 JS bundle 1.85MB。Tiptap + lowlight + pdfjs-dist + exceljs + mammoth + docx 全打进一个 chunk。桌面应用不差这几百毫秒，但随着功能增加这数字只会涨。

---

### 建议优先级

| 优先级 | 项目 | 为什么先做 |
|--------|------|-----------|
| 1 | A1 IPC 类型 | 每次改 IPC 都在赌命 |
| 2 | B1 catch {} | 用户报"没反应"时无法定位 |
| 3 | B3 权限校验 | 安全隐患 |
| 4 | B5 sql.js debounce | 数据量上来后体验断崖式下跌 |
| 5 | A2 inline style | 重构成本随代码量线性增长 |
| 6 | C1 测试 | 没有测试就不敢重构 |

---

> **Developer 注**: 这不是"积怨"——这是修了 66 个 Fix 工单、实现了 7 个 Phase 8 任务之后的工程判断。代码能跑、功能齐全、架构方向正确。上面列的每一项都不是"错了"，而是"如果不做，一年后会很痛"。

---

## Phase 11 审计 (2026-05-06 Auditor)

> 审计方法：对照 todo.md Phase 11 8 项任务规格，对代码库现状做逐项摸底 + 交叉验证。不重复 Phase 9 已列入但 ⏭ 的项目（S6/S8-S10/S12-S13/S15-S18），聚焦三项：契约一致性（IPC→Preload→前端闭环）、数据流完整性（DB 包装器方言隔离）、失败可见性（错误边界与静默吞噬）。

### 一、Phase 11 任务规格逐项评估

#### T1101 DOMPurify XSS 加强

**现状摸底**：`dangerouslySetInnerHTML` 当前 4 处调用点：
- `BlogPreviewPage.tsx:170` — 博客渲染（主入口）
- `BlogEditorPage.tsx` (TiptapEditor.tsx:116) — 编辑器预览
- `FocusMode.tsx:60` — 专注模式渲染
- 共 4 个渲染点，非规格所述的 2 个

**结论**：规格覆盖范围不足。FocusMode 和 TiptapEditor 的 dangerouslySetInnerHTML 同样需要 DOMPurify。另外 DOMPurify 默认配置会剥离部分安全标签（如 `<video>`、`<audio>`），需确认用户是否使用这些元素后再决定白名单策略。

**风险等级**：规格偏差（范围少计 2 处），非阻塞。

---

#### T1102 catch {} 全量修复

**现状摸底**：
- 裸 `catch {}`：26 处（含 6 处 ALTER TABLE 迁移、4 处磁盘清理 fallout、16 处业务逻辑）
- `.catch(() => {})` 空回调：3 处（DashboardPage:21/30、TimelineView:36、auth-store:108）
- **合计约 30 处**，规格 "30+" 准确

**关键分类**：
| 类别 | 数量 | 当前行为 | 修复策略 |
|------|------|---------|---------|
| ALTER TABLE 迁移 | 6 | 静默吞错 | 可保留（列已存在是预期错误）；但需加注释说明 WHY |
| 磁盘清理 fallout | 5 | 静默吞错 | `console.error`（文件可能已被手动删除，非关键） |
| 业务逻辑 | 16 | 用户无感知 | `console.error` + 关键路径加 Notification |
| 空 `.catch(() => {})` | 3 | Promise rejection 被吞 | `console.error` 最低限度 |

**结论**：规格的 "替换为 console.error(e)" 策略对主进程代码不够——主进程 console 在打包后不可见。关键用户操作（如 save、import、restore）需要 Notification 反馈。另外 6 处 ALTER TABLE 迁移的 `catch {}` 是设计意图（幂等迁移），不应机械替换。

**风险等级**：修复策略一维化，需分类处理。

---

#### T1103 DB 参数边界校验

**现状摸底**：
- `Math.max/parseInt` 校验已存在于 **server 侧**（`knowledge.ts:29-30`、`blog.ts:33-34`）
- **shared handler**（`blog-list.ts:51-52`）仅设默认值 `offset = 0, limit = 50`，**无边界强转**
- **main services**（`blog.service.ts:84`、`knowledge.service.ts:63`）直接用 `filters.offset || 0`，无 `Math.floor(Number())` 强转
- 关键：offset/limit 在进入 `dbAll` 前已内联到 SQL 字符串（`LIMIT ${limit} OFFSET ${offset}`），**dbAll/dbGet/dbRun 包装层无法拦截**

**结论**：**规格的修复位置有误**。规格说 "在 dbAll/dbGet/dbRun 包装层对 offset/limit 做数值强转"，但 offset/limit 不是作为独立参数传入包装层的——它们已经烘焙在 SQL 字符串里了。正确修复点：
1. shared handler `blog-list.ts:51-52` — 加入 `Math.max(0, Math.floor(Number(offset)))` 
2. main service `blog.service.ts`、`knowledge.service.ts` — 同上
3. 未来 DI 推广后的新 shared handlers — 建立统一校验函数 `sanitizePagination(offset, limit)`

**风险等级**：规格设计缺陷（修复点错误），必须修正否则实现无效。

---

#### T1104 DI 模式复制

**现状摸底**：
| 领域 | Server 路由 | Main IPC/Service | 共享 Handler | DI 收益 |
|------|------------|------------------|-------------|---------|
| blog/list | ✅ 已接入 `getSharedBlogList` | `blog.service.ts:listBlogs` 独立实现 | `blog-list.ts` | — |
| knowledge/list | ❌ `knowledge.ts:20-53` 独立 SQL | `knowledge.service.ts:listFiles` 独立 SQL | 无 | **高** — 过滤维度多 |
| search | ❌ `search.ts:8-80` 独立 SQL | `search.service.ts` 独立 SQL | 无 | **低** — 3 个简单端点，无排序/分页复用 |
| tags | ❌ `tags.ts:8-57` 独立 SQL | `tag.service.ts` 独立 SQL | 无 | **低** — 纯 CRUD，无跨域共享逻辑 |
| recycle | ❌ `recycle.ts:8-79` 独立 SQL | `recycle.service.ts` 独立 SQL | 无 | **低** — 单个 list 查询，无过滤参数 |

**结论**：规格要求 4 个领域全做 DI，但 search/tags/recycle 三个领域的共享逻辑极薄——server 和 main 的实现几乎相同且极其简单（~10 行 SQL），套 DI 层反而增加调用栈深度。建议：**knowledge/list 优先（真有重复逻辑），search/tags/recycle 暂缓**。省下的工时可用于 T1103 的正确修复和 T1106 的深度类型化。

**风险等级**：过度工程化（8h→4h 合理范围）。

---

#### T1105 sql.js Schema 冻结

**现状摸底**：
- 两套 DDL 已存在差异：
  - MySQL `knowledge_files`：`content_text` 和 `folder_id` 在 MIGRATIONS 中，不在 DDL 正文
  - sql.js `knowledge_files`：两者均在 CREATE TABLE 正文中
  - MySQL `blogs`：`folder_id` 在 MIGRATIONS 中
  - sql.js `blogs`：`folder_id` 在 CREATE TABLE 正文中
- sql.js `db/index.ts:65-70`：6 条 ALTER TABLE 用裸 `catch {}` 做幂等迁移
- 现有 sql.js 用户数据库已包含所有列

**结论**：规格方向正确（减少双写 DDL 的维护负担），但需明确：
1. sql.js 用户的期望：如果新功能需要新列，sql.js 模式是报错还是降级？需 Boss 决策
2. 当前所有列 sql.js 已补齐——短期无实际影响
3. 建议：冻结 sql.js DDL 的同时，在 `db/index.ts` 添加注释标记 "SCHEMA FROZEN as of 2026-05-06"

**风险等级**：产品决策待定（sql.js 用户降级策略）。

---

#### T1106 IPC 类型收敛

**现状摸底**：
- `WindowApi` 接口存在，80+ 方法，但 ~50 个返回 `Promise<unknown>`
- `preload/index.ts` 已使用 `const api: WindowApi`（双向类型约束生效）
- `ipcRenderer.invoke()` 返回 `Promise<any>`——类型丢失发生在 Electron 层面，非 preload 层面
- 前端 86 处 `as any` 分布：27 个文件，主要集中在 KnowledgeListPage(4)、BlogListPage(5)、BlogEditorPage(7)、BlogPreviewPage(3) 等
- **核心矛盾**：WindowApi 返回 `Promise<unknown>` → 前端不得不 `as any` → 类型安全链断裂

**结论**：规格 "auth 4 + blog 5 + delete" 的 10 通道 Zod 校验是正确的切入点。但需要同步完成：
1. WindowApi 中对应方法从 `Promise<unknown>` → 具体类型（如 `Promise<ApiResponse<Blog>>`）
2. 前端调用点消除对应的 `as any` 断言
3. Zod schema 放在 shared/validation.ts 中，IPC handler 调用 `schema.parse()` 做 runtime guard

注意：当前 preload 已经通过 `const api: WindowApi` 做了编译期约束——如果 WindowApi 中 `blogList` 返回 `Promise<unknown>`，前端拿到 `unknown` 必须 cast。修复 WindowApi 的返回类型比加 Zod 更优先。

**风险等级**：方向正确，但修复优先级应调整为：先收紧 WindowApi 返回类型 → 再消前端 `as any` → 最后加 Zod runtime guard。

---

#### T1107 Biome 清零

**现状摸底**（`npx biome check` 实测）：
- 格式问题：`tsconfig.json`（references 数组格式）、`release/` 目录文件
- Lint 错误：`useNodejsImportProtocol`（`node:path`/`node:child_process`）、`noDelete`（`delete process.env`）、CSS inline styles
- `release/` 目录是构建产物，不应被 Biome 扫描——需加 `biome.json` ignore 配置

**结论**：规格合理。建议第一步配置 ignore（排除 `release/`、`out/`、`node_modules/`），第二步 `biome check --fix` 自动修复格式类，第三步手动处理剩余 lint 规则。4h 工时在配置好 ignore 后可行。

**风险等级**：无设计风险，纯机械执行。

---

#### T1108 E2E 核心路径

**现状摸底**：零 E2E 基础设施。Playwright 未安装。Electron + Playwright 集成需 `electron` 作为 browser context。

**结论**：6h 覆盖 5 条链路极度乐观。业界基准：Electron E2E 首条链路（含环境搭建）通常 3-4h。建议：Phase 11 只覆盖 2-3 条最核心路径（注册→登录→写博客），剩余 2 条延后。

**风险等级**：工时估算不足（6h→10-12h 现实），不影响正确性但影响完成度。

---

### 二、新发现（Phase 11 规格未覆盖的系统性裂缝）

#### 🔴 P0 — 安全与数据完整性

| # | 问题 | 位置 | 后果 |
|---|------|------|------|
| **R60** | **workspace.ts 方言隔离破裂** — `import { get as dbGet } from '../db'` 导入已弃用的同步 `get()`，绕过 async 包装层直接操作 sql.js。与 Phase 9 F37（标记 deprecated）直接矛盾 | `src/main/ipc/workspace.ts:6,16` | sql.js 路径使用同步 API，MySQL 路径使用 async API，同一文件内两种调用约定并存。新增开发者容易复制错误模式 |
| **R61** | **Server INSERT 缺时间戳** — Phase 9 R36 修复了 main process 的 9 处 INSERT，但 server routes 遗漏。`POST /register`（auth.ts:22-25）和 `POST /import`（knowledge.ts:84-87）依赖 DB DEFAULT `CURRENT_TIMESTAMP`，在非 UTC 服务器上产生时间偏移 | `server/routes/auth.ts:22-25,30`、`server/routes/knowledge.ts:84-87` | 用户注册时间和文件导入时间在 UTC+8 服务器上偏移 8 小时 |
| **R62** | **Server recycle restore UPDATE 无 user_id 过滤** — `recycle.ts:27` `UPDATE blogs SET status = 'active' WHERE id = ?` 仅用 blog id 过滤，不加 `AND user_id = ?`。虽通过 recycle_bin 间接限制了范围，但缺少 defense-in-depth | `server/routes/recycle.ts:27,29` | 若 recycle_bin 数据损坏，用户 A 可能恢复用户 B 的博客 |

#### 🟡 P1 — 类型安全与架构一致性

| # | 问题 | 位置 | 后果 |
|---|------|------|------|
| **R63** | **共享 handler 自身使用 `any`** — `blog-list.ts:55` `sortBy as any`、`:92` `tags.map((t: any) => ...)`。作为 DI 模式推广的范本，自身不应包含 `any` 类型断言 | `src/shared/handlers/blog-list.ts:55,92` | T1104 推广前应先修复范本的类型污染 |
| **R64** | **WindowApi 类型系统未生效于前端** — `KnowledgeListPage.tsx:47` `const resp = r as any` 绕过 WindowApi 类型。根本原因是 WindowApi 中 `kbList` 返回 `Promise<unknown>`，前端无法推导具体类型 | `KnowledgeListPage.tsx:47`、`BlogPreviewPage.tsx:14` | T1106 修复后应在 plan 中明确要求消除对应前端 `as any` |
| **R65** | **Server recycle empty 无磁盘清理** — 与 main process RecycleService（F59 修复）行为不一致。Server 侧 `emptyTrash` 删 DB 记录但不删工作区文件 | `server/routes/recycle.ts:36-55` | Web 端清空回收站后磁盘文件残留 |
| **R66** | **`server/routes/blog.ts:89` UPDATE 用 `NOW()` 而非 ISO 8601** — `updates.push('updated_at = NOW()')` 用 MySQL `NOW()` 函数（服务器本地时间）。main process 已统一用 `new Date().toISOString()` | `server/routes/blog.ts:89` | 与 Phase 9 R35 修复方向不一致；server 侧更新时间可能为本地时间而非 UTC |
| **R67** | **`server/routes/auth.ts` DELETE account 无 keepFiles 参数** — 硬删 DB（CASCADE），不清理磁盘也不保留文件。与 main process 的 `deleteAccount(keepFiles)` 双路径设计不一致 | `server/routes/auth.ts:87-95` | Web 端删号行为与桌面端不一致；用户无法选择保留文件 |

#### 🟢 P3 — 文档与可维护性

| # | 问题 | 位置 | 后果 |
|---|------|------|------|
| **R68** | **6 处 ALTER TABLE 裸 `catch {}` 无注释** — `db/index.ts:65-70` 的迁移 catch 没有解释为何空 catch 是可接受的 | `src/main/db/index.ts:65-70` | 新开发者可能模仿此模式用于非幂等操作 |

---

### 三、Phase 11 规格总体评价

**正确识别的核心问题**：T1101（XSS）、T1102（静默吞错）、T1103（参数边界）三者确实构成安全底线，P0 优先级合理。

**规格中的三个偏差**：
1. **T1103 修复位置错误** — 不能在 dbAll/dbGet/dbRun 包装层修复，因为 offset/limit 已内联到 SQL 字符串。需改为 caller 级别。
2. **T1104 范围过大** — search/tags/recycle 三个领域的 DI 收益极低（~10 行 SQL，无共享过滤逻辑）。建议收缩到 knowledge/list 一个领域，省下 4h 分配给 T1106 的 WindowApi 类型收紧。
3. **T1106 优先级倒置** — 当前 preload 已通过 `const api: WindowApi` 做好编译期锚定，真正的类型断裂在 WindowApi 返回 `Promise<unknown>` 和前端 `as any` 消费。应先收紧 WindowApi 返回类型，再消前端 as any，最后加 Zod runtime guard。Zod 是锦上添花，类型才是雪中送炭。

**遗漏的系统性裂缝**：R60-R68 共 9 项，其中 R60（方言隔离）、R61（时间戳遗漏）、R62（权限过滤不全）、R63（shared handler any 类型）、R65（Server 磁盘清理）、R66（NOW()→ISO）、R67（deleteAccount keepFiles）已在 Phase 11 P0/P1 实施中全部修复。R64（WindowApi 类型未生效于前端）随 T1106 WindowApi 100% 类型化改善。R68（ALTER TABLE catch 注释）随 T1102 修复。

**工时评估**：总 28h 估算偏乐观。T1104 可省 4h（收缩范围），但 T1106 需 +2h（WindowApi 类型化），T1108 需 +4h（环境搭建），新发现 R60-R67 需 +4h（P0 三项），净增 ~6h → 建议总工时调整为 34h。

---

### 四、Boss 提请裁决

| # | 问题 | 选项 A | 选项 B |
|---|------|--------|--------|
| D1 | T1105 sql.js 冻结后，sql.js 用户遇新功能怎么办？ | 报错 "离线模式下此功能不可用" | 保留 sql.js DDL 同步维护（违背 T1105） |
| D2 | T1104 是否收缩到 knowledge/list 一个领域？ | 收缩（省 4h，分配给类型安全） | 全部 4 领域推广（8h，按原计划） |
| D3 | R60-R62 是否纳入 Phase 11 P0？ | 纳入（+3h，安全优先） | 延后到 Phase 12 |

---

> **Auditor 注**: 本审计执行了 6 轮并行 grep + 9 个关键文件精读 + Biome 实跑。未逐行审查——聚焦契约一致性、数据流完整性与失败可见性三类隐性风险。T1101/T1102/T1103 方向正确但实现细节需修正。R60-R62 三项需紧急纳入 Phase 11 P0，它们分别对应"方言隔离破裂""时间戳修复遗漏""权限过滤不全"，恰好命中用户指定的三个审查维度。Phase 11 是我对这个项目的最后一次结构性审计建议——8 个 Phase、260+ 工时之后，代码库的主干已经健康。接下来一年最大的风险不是新功能写错，而是旧假设被新代码悄悄打破。DI 模式、WindowApi 类型、dbGet/dbAll 包装器——这三层防护网一旦建立，新代码在编译期就会被拦住。这才是 Phase 11 的真正价值。

---

## Phase 11 实施验证 (2026-05-06 Auditor)

> 验证方法：对照实施报告逐项检查代码变更。tsc --noEmit 实测 + Biome 实测 + 文件逐行比对。

### 一、逐项验证结果

#### P0 安全底线

| 任务 | 验证结果 | 证据 |
|------|---------|------|
| **T1101** DOMPurify | ✅ 通过 | 3/3 站点：BlogPreviewPage:204、FocusMode:66、TiptapEditor:119。`dompurify` + `@types/dompurify` 已安装 |
| **T1102** catch{} | ✅ 通过 | `grep -r "catch {}" src/` 返回 0 结果。所有 catch 已分类：ALTER TABLE 有注释说明幂等性，业务逻辑有 console.error，磁盘清理有注释 |
| **T1103** sanitizePagination | ✅ 通过 | `src/shared/pagination.ts` 存在。`Math.max(0, Math.floor(Number())` + `Math.min(200, Math.max(1, ...))` 边界正确。3 处调用：blog-list.ts:55、knowledge-list.ts:54、blog.service.ts:141 |
| **R60** workspace 方言隔离 | ✅ 通过 | `workspace.ts:6` 改为 `import { dbGet } from '../db'`（统一 async 包装器）。`getAsync`/`isUsingMySQL` 条件分支已移除。单一 dbGet 调用路径 |
| **R61** Server INSERT 时间戳 | ✅ 通过 | auth.ts:22-26 (users INSERT + created_at)、auth.ts:31-36 (sessions INSERT + created_at)、knowledge.ts:96-99 (knowledge_files INSERT + created_at/updated_at)、blog.ts:78-82 (blogs INSERT + created_at/updated_at)、blog.ts:196-199 (import-md INSERT)、blog.ts:213-216 (save-draft INSERT + saved_at)。共 6 处，全部使用 `new Date().toISOString()` |
| **R62** Server recycle 权限 | ✅ 通过 | recycle.ts:30: `WHERE id = ? AND user_id = ?`（blog restore）、recycle.ts:32: `WHERE id = ? AND user_id = ?`（knowledge_file restore）。defense-in-depth 已建立 |

#### P1 架构收敛

| 任务 | 验证结果 | 证据 |
|------|---------|------|
| **T1104** knowledge-list DI | ✅ 通过 | `src/shared/handlers/knowledge-list.ts` 存在。DI 接口（QueryRows/QueryOne）与 blog-list.ts 一致。sanitizePagination 接入。server/routes/knowledge.ts:29-40 使用 getSharedKnowledgeList |
| **T1105** sql.js 冻结 | ✅ 通过 | `db/index.ts:66` "SCHEMA FROZEN as of 2026-05-06" 注释。6 条 ALTER TABLE 均有 `/* column already exists */` 注释。biome.json files.ignore 已含 release/scripts |
| **R63** blog-list.ts 类型 | ✅ 通过 | `tags.map((t) => ({ id: t.id as number, ... }))` — 不再使用 `(t: any)` |
| **R65** Server recycle 磁盘清理 | ✅ 通过 | recycle.ts:58-68 (empty) + recycle.ts:96-106 (auto-clean)：先 SELECT file_path → fs.unlinkSync → 再 DELETE DB 记录。catch 有注释 `/* file already deleted or locked */` |
| **R66** Server NOW()→ISO | ✅ 通过 | blog.ts:78/124-125/151-152/172-173/196-199/213-216/252-254 全部使用 `new Date().toISOString()`。knowledge.ts:96-99/166-168 同上。recycle.ts:131-135 DELETE→INSERT recycle_bin 加 `deleted_at`。0 处 `NOW()` 残留 |
| **R67** Server deleteAccount | ✅ 通过 | auth.ts:115-123: `if (keepFiles)` 清空 password_hash + sessions；`else` DELETE CASCADE。与 main process 双路径一致 |

#### P2 质量基线

| 任务 | 验证结果 | 证据 |
|------|---------|------|
| **T1106** WindowApi 类型化 | ❌ **修复不完整** — 见下文详述 | WindowApi 接口已 100% 类型化（136 行，0 处 `Promise<unknown>`）。但 preload/index.ts 未同步更新，63 处 `Promise<unknown>` 残留 + `(data: object)` 参数未改为 `Record<string, unknown>` |
| **T1107** Biome | ⚠️ **部分完成** | biome.json ignore 已含 release/scripts。tsc 实测 77 错误（含 63 preload + 13 main 预存）。Biome 实测仍有错误输出 |

---

### 二、关键发现：T1106 契约断裂（R69）

**严重程度**：🔴 P0

**问题**：WindowApi 接口已完整类型化——每个方法都有精确的返回类型（如 `blogList(): Promise<ApiResponse<{ blogs: BlogWithTags[]; total: number }>>`）。但 `preload/index.ts` 仍使用旧签名：

```ts
// preload/index.ts:16 — 当前状态
blogList: (filters?: object): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_LIST, filters),

// WindowApi 要求
blogList(filters?: Record<string, unknown>): Promise<ApiResponse<{ blogs: BlogWithTags[]; total: number }>>;
```

**影响**：
- `tsc -p tsconfig.node.json --noEmit` 报告 **63 个 preload 类型错误**（全部源于此 mismatch）
- `const api: WindowApi = { ... }` 的双向检查**确实在工作** — 但 preload 没被修复
- electron-vite 使用 esbuild 编译，**不进行类型检查**，所以 `npm run build` 表面通过但类型安全并未生效
- 前端 `window.api.blogList()` 仍然返回 `Promise<unknown>` → 前端必须继续 `as any`

**根因**：WindowApi 类型化只做了一半。接口定义更新了，preload 实现没跟上。这是典型的"类型安全幻觉"——接口文件看起来健康，但运行时路径（preload → IPC → handler）仍然无类型保障。

**修复方向**：移除 preload 中所有 63 处显式 `Promise<unknown>` 返回类型标注，让 TypeScript 从 `const api: WindowApi` 推导返回类型。同时将 `(data: object)` 改为 `(data: Record<string, unknown>)` 以匹配 WindowApi 参数类型。

---

### 三、预存问题（非本次变更引入）

tsc 在 main process 检测到 13 个预存类型错误：

| 文件 | 错误数 | 代表性问题 |
|------|--------|-----------|
| `forge.config.ts:32` | 1 | maker-zip 缺少 config 字段 |
| `db/index.ts:112,152` | 2 | `unknown[]` 与 `never[]` 不兼容 |
| `index.ts:32` | 1 | `webviewTag` 不在 BrowserWindowConstructorOptions 类型中 |
| `ipc/blog.ts:316` | 1 | `TextRun` 用作类型（应为 `typeof TextRun`） |
| `pet.ts:428` | 1 | `scrapeWebpage` 不存在于 WebScraperService |
| `blog.service.ts:324-325` | 2 | Tag.count 必需但缺失；quickTag 可能 undefined |
| `knowledge.service.ts:103-104` | 2 | QueryRows DI 类型不匹配（KbFileRow vs Record） |
| `reference.service.ts:81,93` | 2 | `.title` 不存在于联合类型 |
| `web-scraper.service.ts:63` | 1 | `document` 属性不存在 |

这些是 electron-vite（esbuild）不检查类型导致的累积问题。tsc --noEmit 可一次性暴露全部。

---

### 四、总体评估

**14 项声称完成，实际验证**：
- ✅ 12 项通过（T1101/T1102/T1103/T1104/T1105/R60/R61/R62/R63/R65/R66/R67）
- ❌ 1 项不完整（T1106 — preload 未更新，63 tsc 错误）
- ⚠️ 1 项部分完成（T1107 — Biome 有改进但仍有错误；77 tsc 总错误）

**Build 报告 "✅" 的准确度**：electron-vite 构建确实通过了（esbuild 不检查类型），但 `tsc --noEmit` 揭示 77 个类型错误。如果 CI 中加入 `tsc --noEmit`，当前状态会阻断合入。

**建议优先修复顺序**：
1. 🔴 T1106 preload 更新 — 移除 63 处 `Promise<unknown>`，消除新引入的类型错误（~2h）
2. 🟡 tsc 13 个预存错误 — 分批修复 main process 的类型问题（~4h）
3. 🟢 Biome 残存错误 — `biome check --fix` + 手动收尾（~1h）
4. 🔵 T1108 E2E — 独立安排（~10h）

---

> **验证注**: 本次验证使用 `tsc --noEmit` + `Biome check` + `grep` + 逐文件比对。P0/P1 的 12 项代码变更质量好——DOMPurify 覆盖完整、sanitizePagination 边界正确、R60-R67 的修复点位精准、server 时间戳全部统一为 ISO。唯一结构性缺陷是 T1106 的 preload 契约断裂——WindowApi 接口精美的类型签名悬在空中，没有落地到运行时路径。这是"类型安全"与"编译器失明"的经典分界线：接口声明了类型 ≠ 代码通过了类型检查。
>
> **Boss 裁决 (2026-05-06)**: T1106 合并不完整但方向正确，Developer 已修复 preload。核收。

---

## Phase 11 二次验证 (2026-05-06 Auditor)

### 修复确认：T1106 preload 契约闭合（R69 ✅）

**变更**：`preload/index.ts` 移除全部 63 处显式类型标注，改为依赖 `const api: WindowApi` 的上下文类型推导。

**验证结果**：

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| preload tsc 错误 | 63 | **0** |
| `Promise<unknown>` 残留 | 63 | **0** |
| `catch {}` 裸块 | 0 | **0** |
| `as any` 总计 | 86 (27 files) | **40 (16 files)** |
| main tsc 错误 | 14 (预存) | **14 (预存)** |
| renderer tsc 错误 | 7 (预存) | **7 (预存)** |
| `npm run build` | pass | **pass** (2.27s) |

**分析**：
- Preload 修复方式正确：移除显式 `Promise<unknown>` 标注后，TypeScript 从 `const api: WindowApi` 推导每个方法的参数和返回类型。`ipcRenderer.invoke()` 返回 `Promise<any>`，TypeScript 在赋值检查时将其与 WindowApi 的具体类型比较——如果 mismatch 会报错
- `as any` 从 86 降到 40（减少 53%），但仍有 16 个文件存在——主要原因是部分 IPC 方法的 WindowApi 返回类型仍用 `ApiResponse<Record<string, unknown>[]>`（如 blogSeriesGet），前端消费时为访问字段仍需 cast
- renderer 7 个 tsc 错误全为预存（EditorToolbar:4 + GlobalSearch:1 + SettingsPage:2），非本次引入

### Phase 11 最终成绩

| 类别 | 完成/总数 | 明细 |
|------|----------|------|
| P0 安全底线 | **6/6** ✅ | T1101/T1102/T1103/R60/R61/R62 |
| P1 架构收敛 | **5/5** ✅ | T1104/T1105/R63/R65/R66/R67 |
| P2 质量基线 | **1.5/2** ⚠️ | T1106 ✅ (二修后通过) / T1107 ⚠️ (Biome 有改进但仍有残存) |
| 延期 | **1** 📋 | T1108 E2E |

**Phase 11 结案条件**：
- ✅ 契约一致性：IPC→Preload→前端闭环已建立（`const api: WindowApi` 双向检查生效，63 preload 错误清零）
- ✅ 数据流完整性：dbGet/dbAll 包装器统一，0 处 deprecated sync API 残留，方言隔离恢复
- ✅ 失败可见性：0 裸 `catch {}`，所有吞错点有注释或 console.error
- ⚠️ CI 阻断链：tsc --noEmit 仍有 21 个预存错误（14 main + 7 renderer），暂不阻断构建但需后续清理
- 📋 T1108 E2E 骨架待建

> **二审注**: R69 修复正确且干净——Developer 选择了正确的方案（移除标注而非修补标注），让 TypeScript 的类型推导引擎接管了契约校验。21 个预存 tsc 错误建议在后续独立安排一次 "tsc strict 冲刺"，批量修复后纳入 CI 阻断。Phase 11 核心目标（安全底线 + 架构收敛 + 契约闭环）已达成。
