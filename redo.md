# redo.md — 技术债与修复跟踪

> **定位**: 已发现但未修复的问题。与 [todo.md](todo.md) 的区别: todo.md = 功能路线图, redo.md = 修复清单。
> **角色协作**: Auditor 写入审查发现 → Developer 修复并更新状态 → Auditor 验证 → Boss 裁决分歧。详见 [AGENTS.md](AGENTS.md#项目角色与协作机制)。
>
> 最后更新: 2026-05-06

---

## T12S1-T12S3 便签模块验证 (2026-05-06 Auditor)

### 验证结果

| 子项 | 结果 | 证据 |
|------|------|------|
| notes DDL 三处同步 | ✅ | schema.ts:101-108, db-schema-mysql.ts:83, db/index.ts:101-112 (IF NOT EXISTS + catch 幂等) |
| NoteService CRUD | ✅ | list/create/delete/togglePin/cleanOldNotes — snake_case→camelCase 映射正确，`nowMySQL()` 统一时间戳 |
| IPC 5 通道 | ✅ | note:list\|create\|delete\|pin\|clipboard — ipc-channels.ts 定义 + ipc/note.ts 注册 + index.ts 汇聚 |
| note:refresh 事件 | ✅ | preload:117-123 `onNoteRefresh` 桥接 + NoteListPage:38-42 监听 + cleanup 返回 |
| showQuickNote 迁移 | ✅ | pet.ts:111-121: `NoteService.createNote(uid, text, 'quick')` + `note:refresh` 替代 `quickCreate` + `blog:refresh` |
| 清理定时器 | ⚠️ | 5min 定时器工作正常（main/index.ts:75-77），但 `will-quit` 未 `clearInterval` |
| NoteListPage | ⚠️ | createdAt 未用 `formatDate()` 格式化（line 164）；pinned 按钮 `color:'#fff'` 硬编码（line 175） |
| 侧栏/路由 | ✅ | MainLayout:11 `/notes` 📝, App.tsx:31/95 lazy+ErrorBoundary |

### 新发现

| # | 等级 | 问题 | 位置 |
|---|------|------|------|
| R95 | 🟡 | NoteListPage `createdAt` 未用 `formatDate()` 格式化 | `NoteListPage.tsx:164` | ✅ `formatDate(note.createdAt)` |
| R96 | 🟢 | `cleanOldNotes` 定时器未 `clearInterval` | `main/index.ts:75-77,111-113` | ✅ `const noteCleanTimer` + `clearInterval(noteCleanTimer)` |
| R97 | 🟢 | pinned 按钮 `color: '#fff'` 硬编码 | `NoteListPage.tsx:175` | ✅ `var(--text-on-accent)` |

### 总体评估

实现质量好。DDL 三处同步完整，NoteService 简洁，showQuickNote 迁移干净（`blog:refresh` 已替换为 `note:refresh`）。44 main + 2 preload + 216 renderer，tsc 0 errors。3 项小问题均不影响功能。便签独立模块从 pet/博客体系成功剥离。

---

## Auditor 输入格式

新增工单请严格按以下模板写入 `当前待修复` 对应优先级表格：

```
| **RXX** | **问题标题** — 问题描述 |
| **位置**: 文件路径:行号 |
| **后果**: 用户/开发者可见的影响 |
```

示例：

```
| **R95** | **Toast 组件硬编码 #fff** — `Toast.tsx:95` 使用 `color: '#fff'` 而非 CSS Token |
| **位置**: `src/renderer/components/common/Toast.tsx:95` |
| **后果**: 亮色主题下文字不可见 |
```

**规则**:
- 每个工单须有 R 编号（R87+），按时间递增
- 必须标注具体文件和行号
- 必须描述"对谁产生了什么影响"
- P0 必须标注"阻断什么"——不写"可能影响"，写"导致 XXX 不可用"

## Developer 修复后输出格式

```
**RXX** ✅ 已修复 — [修复方式，一句话]
**Auditor 验证**: (留空，由 Auditor 填写)
```

---

## 当前待修复

### 🔴 P0 — 阻断用户操作

**全部清零** ✅ (R80-R94 已关闭)

### 🟡 P1 — 影响体验但不阻断

**全部清零** ✅

### 🟢 P2/P3 — 可延后

| # | 问题 | 位置 | 状态 |
|---|------|------|------|
| R77 | Server knowledge import 缺文本提取 — mammoth/exceljs 未引入 server 端 | `server/routes/knowledge.ts:69-118` | ⏭ 后续安排 |
| R78 | BlogEditorPage 30 useState 持续膨胀 — 需状态机重构 | `BlogEditorPage.tsx:19-42` | ⏭ 后续安排 |

---

## 历史修复摘要 (2026-04-30 ~ 05-06)

### Phase 9 (F01-F69)
安全: PBKDF2 密码哈希 / Session crypto.randomBytes / XSS markdown-it html:false (F71)
数据: schema 三处同步 (F36) / datetime→ISO 8601 (F61-F62) / permanentlyDeleteItem 磁盘清理 (F59) / Tiptap setContent 死循环 (F60)
架构: Server/Main 逻辑去重 DI 模式 (F78) / WindowApi 类型接口 (F79) / IPC 响应统一 (F34)
质量: catch{} 清零 (F69) / 硬编码 #fff→CSS token (F66) / sql.js debounce 500ms (F68)

### Phase 10 (R45-R59)
安全: Widget sandbox:true (R45) / 托盘 DOM 查询移除 (R46-R47)
修复: PDF 导出竞态 (R43/R49) / pdfjs-dist→webview (R44) / 宠物图标路径 (R50-R51) / launcher.bat ASAR 路径 (R58-R59)

### Phase 11 (R60-R69, T1101-T1107)
安全: DOMPurify XSS (T1101) / catch{} 全量修复 (T1102) / DB 参数 sanitizePagination (T1103) / workspace 方言隔离 (R60) / Server 时间戳 ISO (R61) / recycle 权限加固 (R62)
架构: DI knowledge-list (T1104) / sql.js Schema 冻结 (T1105) / WindowApi+preload 类型闭合 (T1106/R69) / blog-list.ts 类型净化 (R63) / Server 磁盘清理 (R65) / NOW()→ISO (R66) / deleteAccount keepFiles (R67)

### Phase 12 (R70-R94, T1204-T1209b)
修复: PDF 正文丢失 (T1204) / 代码块溢出 (T1205) / 便签双写幂等 (R94) / 独立编辑器路由死胡同 (R93) / 热力图 rejection (R87/R91)
新增: MD 快捷浮窗 MVF (T1207) / E2E 11 tests (T1108) / 图标品牌 (T1206) / 快捷键 Ctrl+Shift+N (T1209a/R84) / Toast 组件 (T1209b) / 使用指南 /guide (T1208) / 侧栏指南入口 (R90)
数据: blog:refresh 监听 (R83) / api-client 类型对齐 (R71) / Server tag/recycle 响应统一 (R72) / search 端点多套逻辑 (R73) / folder 路由 (R76) / preview 类型净化 (R79) / formatDate 守卫 (R81)
时间: toMySQLDateTime() 统一入口 (R85) / Vitest+Bome 隔离修复 (R86)

**累计**: 94 个修复工单 (F01-F85 → 已关), 86 个审计工单 (R01-R86 → 全部关闭), 2 个延后 (R77/R78)

---

## 重构建议 (非紧急)

1. TypeScript strict 模式 — 消除残存 `any` (当前 ~40 处)
2. BlogEditorPage 状态机重构 — 30 useState → useReducer (~4h, R78)
3. Server knowledge import 文本提取 — 引入 mammoth/exceljs (~2h, R77)
