# 历史审计档案

> 收录 Phase 13-16 关键审计报告和 Phase 15-17 规格审查。审计工单详情见 [redo.md](../redo.md)，任务规格见 [phase-archive.md](phase-archive.md)。
> 最后整理: 2026-05-14 | Boss | +Phase 17 审计

---

## 1. 审计方法论

每次审计覆盖六个维度，每个维度评分 1-10：

| 维度 | 检查内容 |
|------|----------|
| **安全性** | XSS/注入/Electron sandbox/路径穿越/权限隔离 |
| **数据完整性** | Schema 三处同步/时间戳正确性/方言翻译/CASCADE/外键 |
| **类型安全** | noUncheckedIndexedAccess/as any 密度/WindowApi-IPC 对齐/跨进程契约 |
| **冗余性** | Server-Main 双写/IPC 通道重复/映射函数重复/死代码 |
| **可维护性** | 组件复杂度/目录约束/新依赖合规/错误处理一致性 |
| **健壮性** | ErrorBoundary 覆盖/空状态/Loading 状态/超时保护/资源清理 |

---

## 2. Phase 16 全量审计 (2026-05-08)

> **类型**: Full Audit — 结项后全项目健康检查
> **范围**: 全部源文件 (shared/main/preload/server/renderer)

### 审查统计

| 维度 | 检查项 | 通过 | 发现问题 |
|------|--------|------|----------|
| 安全性 | 17 | 10 | 7 (4 P1 + 1 P2 + 1 P3 + 1 P4) |
| 数据完整性 | 14 | 10 | 4 (1 P2 + 1 P3 + 2 known) |
| 类型安全 | 16 | 13 | 3 (1 P1 + 2 P2) |
| 冗余性 | 11 | 6 | 5 (3 P2 + 2 P3) |
| 可维护性 | 12 | 7 | 5 (3 P2 + 2 P3) |
| 健壮性 | 18 | 7 | 11 (2 P2 + 6 P3 + 3 P4) |
| **总计** | **88** | **53** | **35** |

### 健康度评分

| 维度 | 评分 | 关键因素 |
|------|------|----------|
| 安全性 | 8.0 | XSS/SQL注入/沙箱全部通过。Server user_id 隔离 4 个 P1 |
| 数据完整性 | 9.0 | Schema 三处同步，时间戳/方言翻译完整 |
| 类型安全 | 8.5 | tsc 零错误, as any renderer=0。6 Record 返回类型缺口 |
| 冗余性 | 7.5 | Shared handler 仅覆盖 list。CRUD 双写 + 3 套映射 |
| 可维护性 | 7.0 | 3 组件 useState 超 10 + 14/16 服务无测试 |
| 健壮性 | 7.5 | printToPDF 无超时 + pet.ts 裸 writeFileSync |
| **综合** | **7.9** | 35 项发现，零 P0。Server user_id 隔离是最大单一风险 |

### 关键发现 (P1)

| # | 问题 | 位置 |
|---|------|------|
| R203 | Server 文件夹删除缺少 user_id 所有权检查 | `server/routes/folder.ts:96` |
| R204 | Server 文件夹重命名缺少 user_id 所有权检查 | `server/routes/folder.ts:84` |
| R205 | Server 博客保存草稿未验证博客所有权 | `server/routes/blog.ts:207-220` |
| R206 | Server 文件夹移动项目缺少 user_id 所有权检查 | `server/routes/folder.ts:103-119` |
| R209 | api-client webApi App 方法名与 WindowApi 不匹配 | `api-client.ts:28,135-140,157` |

> **全部 4 P1 + 7 P2-P4 已在 Phase 16 修复验证通过 (11/11)**

### 四层治理框架评估

| 层级 | 评分 | 说明 |
|------|------|------|
| Layer 1 (Constrain) | 8/10 | Server 路由 user_id 隔离不完整。其余约束全部合规 |
| Layer 2 (Inform) | 8/10 | 3 组件 useState 超 10 + 15 处 `: any`。WindowApi 6 Record 类型 |
| Layer 3 (Verify) | 8/10 | tsc 零错误 + noUncheckedIndexedAccess。14/16 Service 无测试 |
| Layer 4 (Correct) | 7/10 | CRUD 双写使修复需同步两个路径。asyncHandler 存在但未采用 |

---

## 3. Phase 15 实施审计 (2026-05-08)

### 健康度评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 安全性 | 9 | upload.ts 路径穿越防护正确，文件类型白名单，10MB 上限 |
| 数据完整性 | 10 | Schema 三处同步完整，Server 端复用 MYSQL_DDL |
| 类型安全 | 8 | `noUncheckedIndexedAccess` 启用是重大里程碑 |
| 冗余性 | 9 | R106 已修复，IPC 通道无重复 |
| 可维护性 | 9 | SeriesListPage/SeriesDetailPage 简洁，multer 是标准中间件 |
| 健壮性 | 10 | Series 4 方法 Web stub 全覆盖，三态完整 |
| **综合** | **9.2** | 7/7 完成。T1502 strict 永久启用 + IPC 无重复 |

### 关键成果

1. **`noUncheckedIndexedAccess` 永久启用** — 47 个类型错误在 10 个文件中全部修复。继 Phase 14 `as any` 归零后的第二个类型安全里程碑
2. **组织系统差异化** — tags.description 三处 DDL 同步 + Series 独立路由 + 面包屑导航
3. **Web 功能对等基础** — multer 上传路由 + 用户隔离 + API stub 降级

### 发现 (R106-R109, 4 项, 全部 P2/P3)

| # | 等级 | 问题 |
|---|------|------|
| R106 | 🟡 P2 | BLOG_GET_ALL_SERIES 与 BLOG_SERIES_LIST 功能重复 |
| R107 | 🟢 P3 | blogSeriesList/Get/Set 缺 Web fallback stub |
| R108 | 🟢 P3 | SeriesDetailPage `list[0]!.seriesName` 非空断言绕过 strict |
| R109 | 🟢 P3 | KnowledgeListPage 面包屑 `tree: any[]` |

> 全部 4 项在 Phase 15 内修复验证通过。

---

## 4. Phase 14 实施审计 (2026-05-07)

### 健康度评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 安全性 | 9 | 无新攻击面。preview.service 路径来自 DB 非用户输入 |
| 数据完整性 | 10 | 零 Schema 变更。ShortcutService/ProgressService 用 userData JSON |
| 类型安全 | 9 | renderer `as any` 32→0 是重大里程碑 |
| 冗余性 | 8 | R102 ProgressService 死存储（有写无读） |
| 可维护性 | 9 | T1402 reducer 分离干净。ShortcutSettings 独立组件 |
| 健壮性 | 9 | T1412 10s 超时 + 降级。T1407 冲突检测 + 5s 录制超时 |
| **综合** | **9.0** | 11/11 任务完成 |

### 关键成果

1. **`as any` renderer 32→0** — 13 个 Phase 中类型安全最大的单次跃升
2. **状态机重构** — BlogEditorPage 30 useState → useReducer + 18 actions
3. **成就精简 + canvas 热力图** — 365 DOM → 单 canvas

### 发现 (R102-R105, 4 项, 全部 P2/P3)

| # | 等级 | 问题 |
|---|------|------|
| R102 | 🟡 P2 | ProgressService 有写无读 — JSON 文件为死存储 |
| R103 | 🟢 P3 | ShortcutSettings 录制时 listener 泄漏 |
| R104 | 🟢 P3 | BlogEditorPage drafts 类型残留 `any[]` |
| R105 | 🟢 P3 | 热力图色彩硬编码不跟随主题 |

> 全部 4 项在 Phase 14 内修复验证通过。

---

## 5. Phase 13 实施审计 (2026-05-07)

### 健康度评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 安全性 | 9 | 无新攻击面。ZIP writer 纯 Buffer 操作无注入 |
| 数据完整性 | 10 | 零 Schema 变更。ContinueService 全参数化查询 |
| 类型安全 | 8 | WindowApi/preload 双向闭合。3 处 P3 常量问题 |
| 冗余性 | 10 | 零新重复。ContinueService 是独立新增领域 |
| 可维护性 | 9 | ContinueWritingPage 仅 3 useState |
| 健壮性 | 9 | T1304 双保险(useBlocker+beforeunload) |
| **综合** | **9.2** | 7/7 任务全部合格，零 P0/P1/P2，3 项 P3 |

### 发现 (R98-R100, 3 项, 全部 P3)

| # | 问题 |
|---|------|
| R98 | ContinueService 传输完整全文，UI 仅用 150 字符 — 延后 |
| R99 | `app:visibility` 4 处硬编码未用 IPC 常量 — 已修复 |
| R100 | NOTE IPC 常量分散两处 — Boss 关闭（审美偏好） |

---

## 6. 重大事件

### R101 🔴 P0 — HashRouter→data router 迁移 (2026-05-07)

**问题**: `useBlocker()` 在 legacy `<HashRouter>` 下不可用，导致 BlogEditorPage 渲染崩溃（Phase 13 T1304 引入的回归）。

**修复**: `<HashRouter>` → `createHashRouter` data router。App.tsx 路由从 JSX `<Routes>` 改为 JS 对象数组。1.5h。

**影响**: 此后所有 React Router v6.4+ API（useBlocker、loader、action）均可正常使用。

---

## 7. 架构趋势 (Phase 14 → Phase 16)

| 指标 | Phase 14 | Phase 15 | Phase 16 | 趋势 |
|------|----------|----------|----------|------|
| IPC 通道数 | 91 | 91 | 93 | ↑ 受控 |
| `as any` (renderer) | 0 | 0 | 0 | → 维持 |
| `as any` (shared+preload) | 0 | 0 | 0 | → 维持 |
| `: any` 类型标注 | — | — | 15 | 新发现 |
| `Record<string,unknown>` in WindowApi | 9 | — | 6 | ↓ 改善 |
| tsc 错误 | 0 | 0 | 0 | → 维持 |
| `noUncheckedIndexedAccess` | 未启用 | ✅ 已启用 | ✅ 已启用 | 里程碑 |
| Server user_id 隔离缺口 | — | — | 4 (P1) | 新发现→已修复 |
| Service 无测试率 | — | — | 87.5% (14/16) | 新发现 |
| 组件 useState >10 | BlogEditorPage(30) | — | 3 组件 (12-20) | BlogEditorPage已收敛 |
| 健康度综合评分 | 9.0 | 9.2 | 7.9 | 全量审计更严 |

---

## 8. Phase 17 实施审计 (2026-05-14)

> **类型**: Implementation Audit — 代码已完成
> **范围**: Phase 17 全部 9 项任务

### 验证结果

**9/9 全部通过。** tsc 零错误 | 构建 ✅ | 测试 27/27 pass | 零新工单。

### 架构趋势 (Phase 16 → Phase 17)

| 指标 | Phase 16 | Phase 17 | 趋势 |
|------|----------|----------|------|
| IPC 通道数 | 93 | 95 | +2 (blog:seriesRename, shell:openExternal) |
| `as any` (renderer) | 0 | 0 | → |
| `: any` 类型标注 | 15 | 5 | ↓ 10 (T1709) |
| Service user_id 覆盖率 | 部分 | 100% (6/6 UPDATE/DELETE) | ↑ 重大里程碑 |
| 安装包 | 仅绿色版 | NSIS 安装程序 | ↑ 新能力 |
| Schema 变更 | 0 | 0 | → |
| 新依赖 | 0 | 1 (electron-builder, 构建时) | +1 |

### 审计附注 (非工单)

1. `blog.service.ts` SELECT before UPDATE 未校验 user_id。单用户桌面端无影响。多用户化后评估。
2. `blog_tags` junction 表 DELETE 无 user_id。中间表设计约束，低风险。
3. `ReferenceService.removeRef` — refs 表无 user_id 列。预存设计约束。

---

## 9. 规格审查索引

### Phase 17 (2026-05-14)

| 编号 | 决策点 | 裁决 | 关键理由 |
|------|--------|------|----------|
| D36 | T1702 IPC 通道 | A — 新建 `blog:seriesRename` | blogSeriesSet 是单 blog，系列改名需批量 UPDATE |
| D37 | T1704 IPC 桥 | A — 新增 `shell:openExternal` | IPC 层协议白名单校验 |
| D38 | T1701 编辑器架构 | B — 新建 WebEditorPage.tsx | 桌面端零改动，Web 端 ~150 行独立组件 |

### Phase 16 (2026-05-08)

| 编号 | 决策点 | 裁决 | 关键理由 |
|------|--------|------|----------|
| D28 | T1602 cheerio vs linkedom | B — linkedom | 已安装，零新依赖 |
| D29 | T1603 spec 描述偏差 | 修正 spec | TOC 交互代码已存在，只需 heading id |
| D30 | T1601 风险缓冲 | A — 全量 scrollRatio | 不加 scrollRatio 就是改了个 query param |

### Phase 15 (2026-05-08)

| 编号 | 决策点 | 裁决 | 关键理由 |
|------|--------|------|----------|
| D23 | T1504 Web 上传存储 | A — server/uploads/{userId}/ | Base64 膨胀 33% 不可接受 |
| D24 | T1504 multer 引入 | A — 引入 | Express 事实标准 |
| D25 | T1509 Series IPC | B — 复用 + 1 通道 | Series 非独立实体 |
| D26 | T1502 strict 影响面 | dry-run 前置 | 按错误数分档决策 |
| D27 | T1506 验收标准 | 补 6 条硬性标准 | 全含具体数值 |

### Phase 14 (2026-05-07)

| 编号 | 决策点 | 裁决 |
|------|--------|------|
| D12 | T1402 reducer 范围 | A — 严格 reducer 迁移 |
| D13 | T1403 as any 范围 | B — shared+preload+Service+IPC |
| D14 | T1405/T1411 冲突 | A — T1411 先做 |
| D15 | T1407 存储机制 | B — userData JSON 文件 |
| D16 | T1406 movable 冲突 | A — 仅便签窗+抓取窗 |
| D17 | T1410 存储机制 | A — userData JSON 文件 |

---

## 10. Phase 18 实施审计 (2026-05-14)

> **类型**: Implementation Audit — 代码已完成

### 验证结果

**7/7 实施完成。13 项发现。6 项 P1+P2 全部修复。**

### 首次 P0+P1+P2 全零 ⭐

自 Phase 11 引入分级修复机制以来，这是第一次所有三个严重级别同时为零。

### 发现 (R130-R141)

| 等级 | 数 | 典型问题 |
|------|-----|------|
| P1 | 2→0 | FULLTEXT INDEX 错列 (title→filename) + format 硬编码 'md' |
| P2 | 4→0 | 搜索竞态 (单槽→Map+correlationId) + Worker 无 onerror + restore 缺 updated_at + recycle 缺 user_id |
| P3 | 7 | 超时泄漏/unmount 守卫/HTML 未剥离/tsc 预存 |

### 架构趋势 (Phase 17 → Phase 18)

| 指标 | Phase 17 | Phase 18 | 趋势 |
|------|----------|----------|------|
| IPC 通道数 | 95 | 99 | +4 |
| 单元测试 | 27/27 (3 files) | 49/49 (6 files) | +22 |
| CRUD 双写 | 存在 | blog+knowledge 收敛 | 重大里程碑 |
| FTS5 | 无 | Worker 倒排 + MySQL FULLTEXT | 新能力 |
| 错误反馈 | 无 | uncaughtException→IPC→Toast | 新能力 |
| P0/P1/P2 | 0/0/5 | **0/0/0** | 首次全零 ⭐ |

---

## 11. 安全里程碑时间线

| Phase | 里程碑 | 日期 |
|-------|--------|------|
| Phase 11 | DOMPurify XSS 加强 + catch{} 全量修复 + DB 参数化 | 2026-05-06 |
| Phase 14 | `as any` renderer 32→0 | 2026-05-07 |
| Phase 15 | `noUncheckedIndexedAccess` 永久启用 (47 errors→0) | 2026-05-08 |
| Phase 15 | multer 上传路径穿越防护 + 文件类型白名单 | 2026-05-08 |
| Phase 16 | Server user_id 隔离 4 P1 全部修复 | 2026-05-08 |
| Phase 16 | IPC 事件硬编码全量替换 (6 处 → IPC 常量) | 2026-05-08 |
| Phase 16 | 11/11 P1-P4 首轮修复验证通过 | 2026-05-08 |
| Phase 17 | Service user_id 隔离 — 6 Service UPDATE/DELETE 全量守卫 | 2026-05-14 |
| Phase 17 | shell:openExternal IPC — 协议白名单 (http/https) + 超链接事件委托 | 2026-05-14 |
| Phase 17 | electron-builder NSIS 安装包 + requestSingleInstanceLock 单实例 | 2026-05-14 |
| Phase 17 | renderer `: any` 14→5 | 2026-05-14 |
| Phase 18 | CRUD 双写收敛 — blog-crud.ts 17 + knowledge-crud.ts 13 | 2026-05-14 |
| Phase 18 | FTS5 Worker 倒排索引 + MySQL FULLTEXT INDEX | 2026-05-14 |
| Phase 18 | 错误反馈通道 — uncaughtException→IPC→Toast | 2026-05-14 |
| Phase 18 | Service 测试 27→49 (6 files) | 2026-05-14 |
| Phase 18 | P0+P1+P2 首次全零 ⭐ | 2026-05-14 |
