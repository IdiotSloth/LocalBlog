---
name: full-audit
description: Comprehensive implementation audit of code that HAS ALREADY BEEN WRITTEN. Use when code exists and needs verification: "全量审查", "pre-release audit", "健康检查", "代码审查", "安全审计", "审查代码", "验证修复", "查代码", "有没有问题", "审查 Phase N 实现", "verify Phase N", "check implementation". Covers 10 dimensions: 6 core (security/data integrity/type safety/redundancy/maintainability/robustness) + 4 collapse-era (persistence leakage/ghost infrastructure/attention competition/collapse integrity). Uses bash scripts/pre-audit.sh (10s automated scan) + 4-agent parallel deep review + build/test verification. Output: R-numbered tickets in redo.md. NEVER use for spec review of unwritten code — that's pre-audit's job.
---

# Full Audit Skill — 实施审查

Systematic, multi-dimensional audit of implemented code. **This skill is for code that already exists.** For reviewing specs before code is written, use `pre-audit`.

## Role

You are the Auditor — a 10+ year Node.js/Electron operations and security audit engineer. You do NOT write code, do NOT make product decisions, do NOT maintain AGENTS.md/README.md/todo.md. Your sole output is R-numbered tickets in `redo.md`.

## Audit Workflow

**Never skip a pass.** Execute in this exact order.

### Pass 1: Context Loading

1. **Read `AGENTS.md`** — architecture constraints, directory rules, DB constraints, IPC constraints, common pitfalls (34 items)
2. **Read `todo.md` Phase spec** — Boss's task descriptions and acceptance criteria (the spec the code should match)
3. **Read `suggest.md`** (if exists) — design intent with exact color values and interaction patterns
4. **Read `redo.md`** — known issues, current fix status, open D/R numbers (avoid duplicates)
5. **Read `src/shared/types.ts`** — all data structures
6. **Read `src/shared/ipc-channels.ts`** — all IPC channel definitions

### Pass 2: Automated Pre-Scan (MANDATORY — ~10s)

```bash
bash scripts/pre-audit.sh
```

This runs 16 automated checks covering ~80% of historically-recurring bugs:

| # | Check | What It Catches |
|---|-------|----------------|
| 1 | BrowserWindow security | `nodeIntegration:true`, `contextIsolation:false`, missing `preload` |
| 2 | `prompt()` in renderer | Electron 拦截导致静默失效 |
| 3 | Empty `catch {}` | 真实错误被吞 |
| 4 | `dangerouslySetInnerHTML` without `DOMPurify` | XSS 入口 |
| 5 | SQLite-only SQL outside `mysql.ts` | `INSERT OR REPLACE`, `datetime('now')`, `strftime()` |
| 6 | Path traversal on file operations | `fs.readFile`/`writeFile` 无 `basename`/`resolve` 防护 |
| 7 | JSX event handlers with undefined vars | `onClick={handleXxx}` but `handleXxx` never defined |
| 8 | `lazy()` imports never rendered in JSX | 死导入（组件存在但不渲染） |
| 9 | `React.xxx` used but `React` not imported | 运行时 `ReferenceError` |
| 10 | IPC raw strings | `ipcMain.handle('xxx')` / `.send('xxx')` 非 `IPC.XXX` 常量 |
| 11 | Module-level `let` in renderer | HMR / Fast Refresh 脆弱 |
| 12 | IPC channel without WindowApi type | 类型安全空洞 |
| 13 | Multi-DML without `BEGIN`/`COMMIT` | 非事务写入 |
| 14 | Dynamic `import()` without unmount guard | 卸载后异步回调泄漏 |
| 15 | Duplicate routes in `App.tsx` | 路由静默失效 |
| 16 | Comment-only function bodies | 空实现——代码存在但功能死路 |

**Every flagged item requires manual confirmation.** Not all flags are bugs — but all must be verified. False positives on schema DDL, type annotations, and comments are expected and should be dismissed after confirmation.

### Pass 3: Spec Constraint Verification (逐字对照法)

If a Phase spec exists in `todo.md`, verify EVERY constraint:

1. **Extract all grep-able values from spec**: every number (350ms, 8 options, 6 types), every CSS value (border:none, transparent, 3px), every hex color, every count
2. **grep-verify each one** against the actual code
3. **Output**: `X/Y constraints fully matched (Z%)` with per-item `✅/⚠️/❌` + file:line + deviation description

**Do NOT** use fuzzy judgments like "大概实现了" or "基本完成". Every spec constraint is binary: matched or not.

### Pass 4: Multi-Agent Deep Review

Launch **4 concurrent agents** for dimensional deep review. Give each agent specific file paths and the dimension checklist.

| Agent | Focus | Key Files | Checklist |
|-------|-------|-----------|-----------|
| Agent 1 | **Security + Data Integrity** | All IPC handlers, all BrowserWindows, all file operations, all DML functions | Security + Data Integrity tables below |
| Agent 2 | **Type Safety + IPC Chains** | window-api.ts, preload/index.ts, api-client.ts, all renderer files | Type Safety table below |
| Agent 3 | **Redundancy + Maintainability + Ghost Detection** | Services, IPC handlers, shared handlers, components, stores | Redundancy + Maintainability + Ghost Infrastructure tables below |
| Agent 4 | **Robustness + Lifecycle + Persistence** | All feature pages, App.tsx, index.css, workers, stores, localStorage usage | Robustness + Persistence Leakage tables below |

**For Collapse Validation audits** (system deletion/simplification), add a 5th agent or assign to Agent 3+4:

| Extra Focus | Key Checks |
|-------------|------------|
| **Collapse Integrity** | System count delta, transient verification, persistent state audit, Stage A→B completeness |
| **Attention Competition** | Permanent panel count, chrome growth, low-frequency controls, always-visible affordance |

### Pass 5: Build & Test Verification

```bash
npx tsc --noEmit
npx tsc -p tsconfig.node.json --noEmit
npx tsc -p tsconfig.web.json --noEmit
npm run build
npm run test
```

All must pass. Zero new tsc errors allowed.

### Pass 6: Report & R-Number Output

Aggregate findings from all passes. Write structured tickets to `redo.md`.

---

## Six Audit Dimensions

### 1. Security

| Pattern | How to Check | Severity |
|---------|-------------|----------|
| XSS via `dangerouslySetInnerHTML` | Every use must be wrapped with `DOMPurify.sanitize()`. `markdown-it` must use `html: false` | 🔴 P0 |
| SQL injection | All SQL must use parameterized queries. Never string-concatenate user input | 🔴 P0 |
| Path traversal | `fs.readFile`/`fs.writeFile`/`fs.unlink` must validate resolved path is within workspace, or at minimum have `path.basename()` + extension whitelist. Check ALL handlers of the same type (RESTORE+DELETE must both be protected) | 🔴 P0 |
| Missing auth guard | Every DB query must filter by `user_id`. `requireAuth` middleware only verifies identity, NOT ownership — check UPDATE/DELETE for `AND user_id = ?` | 🔴 P0 |
| Password exposure | Never log/return raw passwords. Hash must be PBKDF2/bcrypt | 🔴 P0 |
| Electron sandbox | Every `new BrowserWindow()` must have `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`, and a minimal preload script | 🔵 P4 |
| Input validation | All user input validated. Empty strings, negative numbers, oversized payloads rejected | 🟠 P1 |
| Format conversion pipeline breakage | Content goes through: editor → turndown → IPC → scanner. Each step can lose semantic data. Trace the FULL pipeline | 🔴 P0 |
| Multi-theme color contrast | Global theme × reading theme = N×M combos. Check all, not just same-theme pairs | 🟡 P2 |
| HTML escaping across all preview paths | Grep ALL template literal `${...}` interpolations inside HTML strings across all preview paths (PDF/DOCX/XLSX/CSV). Same-file inconsistency (CSV escapes but XLSX doesn't) is a red flag | 🟠 P1 |
| Search backend uniformity | All search entries (global search, ref picker, wikilink autocomplete, quick switcher) must use the same backend | 🟡 P2 |

### 2. Data Integrity

| Pattern | How to Check | Severity |
|---------|-------------|----------|
| Schema sync | DDL changes in ALL locations. Each ALTER TABLE must be in `migrateDatabase()` | 🔴 P0 |
| Timestamp standardization | INSERT/UPDATE must pass `new Date().toISOString()` — never rely on DB defaults | 🟠 P1 |
| Dialect isolation | SQLite syntax must go through `toMySQL()` translation. Grep for `INSERT OR REPLACE`/`datetime('now')`/`strftime()` outside schema files | 🔴 P0 |
| Cascade delete correctness | Before DELETE FROM parent, clean up children or CASCADE. Before DB delete, collect disk file paths (DB won't have them after) | 🔴 P0 |
| user_id isolation | Every SELECT/UPDATE/DELETE on user data must include `AND user_id = ?`. Shared handler read paths must use `*ByUser` variants, not `*ById` | 🟠 P1 |
| DB wrapper compliance | All calls use `dbGet`/`dbAll`/`dbRun`, never direct `get()`/`all()`/`run()` | 🟠 P1 |
| INSERT completeness | INSERT must include ALL business columns — `content_text`, `file_size`, `created_at`, `updated_at` | 🟠 P1 |
| Response format | All API responses must use `{success, data?, error?}` format | 🟡 P2 |
| Multi-step DML without transaction | ≥2 DML in one function must have `BEGIN`/`COMMIT`/`ROLLBACK`. Process crash mid-way = partial writes | 🔴 P0 |
| LIMIT without ORDER BY | SELECT with LIMIT needs ORDER BY for deterministic results. VACUUM/DELETE changes default row order | 🟡 P2 |
| Service read-back SELECT user_id guard | After UPDATE/DELETE with user_id, the read-back SELECT only uses `WHERE id = ?` — leaks other user's data if write affected 0 rows | 🟠 P1 |
| Server delete TOCTOU | Ownership check + delete operation must use the same `*ByUser` variant. `SelectByUser` then `DeleteById` creates a 2-line TOCTOU window | 🟡 P2 |

### 3. Type Safety

| Pattern | How to Check | Severity |
|---------|-------------|----------|
| Preload type alignment | `preload/index.ts` must use `const api: WindowApi = {...}` for bidirectional type inference | 🔴 P0 |
| api-client blanket cast | `return webApi as WindowApi` suppresses ALL missing-method errors. Remove it and let TypeScript enumerate gaps | 🔴 P0 |
| Cross-process imports | Renderer code must NEVER import from `src/main/`. Check with `grep "from '.*main/" src/renderer/` | 🔴 P0 |
| React Router compatibility | `useBlocker`/`useBeforeUnload` require data router (`createHashRouter` + `<RouterProvider>`), not legacy `<HashRouter>` | 🔴 P0 |
| `as any` density | Count per file. >3 = hotspot. Track cross-Phase trend — goal is declining/zero | 🟡 P2 |
| `: any` annotation density | Count in renderer. Map callbacks, useState generics, filter predicates are common hotspots | 🟡 P2 |
| IPC channel hardcoding | `ipcMain.handle('xxx')` must use `IPC.XXX`. `webContents.send('xxx')` must use `IPC.EVT_XXX`. Both sender AND receiver must use constants | 🟡 P2 |
| api-client webApi completeness | Every WindowApi method must have a stub in `webApi`. Missing stub = `undefined is not a function` in browser mode. Including event methods (`onXxx`) | 🟠 P1 |
| IPC parameter destructuring | Verify every variable used in handler body matches the actual parameter name. `data` parameter but `blogIds` usage = ReferenceError | 🔴 P0 |
| IPC write-read symmetry | Every IPC channel must have both a writer (IPC handler) AND a reader (renderer call site). Writer without reader = dead storage | 🟡 P2 |
| camelCase vs snake_case | Renderer must not access `row.user_id`/`row.created_at`. Service layer must map to camelCase | 🟡 P2 |
| Service→IPC→WindowApi type chain | Service returns Row → IPC handler → WindowApi → renderer. Type must be consistent at every hop, not just at either end | 🟡 P2 |

### 4. Redundancy

| Pattern | How to Check | Severity |
|---------|-------------|----------|
| Server/Main logic duplication | Same WHERE/SORT/LIMIT/pagination in both server route and main service | 🟡 P2 |
| Multiple mapping functions | One entity should have ONE snake→camel mapper, not 3 (server, service, shared handler each with their own) | 🟡 P2 |
| Dead code | Unused imports, unused functions, unused variables, stale npm scripts | 🟢 P3 |
| Repeated try-catch templates | Adjacent handlers with identical `try { ... } catch (err) { return {success: false, error} }` | 🟢 P3 |
| Partial convergence false security | Some domains converged to shared handlers, others still dual-written. List which remain unconverged | 🟡 P2 |
| Shared handler dead code | Builder functions exported but NEVER called — grep all consumers. File existing ≠ code used | 🟡 P2 |
| Duplicate local types vs shared | Component defines `interface Foo` already in `shared/types.ts` | 🟢 P3 |

### 5. Maintainability

| Pattern | How to Check | Severity |
|---------|-------------|----------|
| Directory constraint violations | File in wrong directory per AGENTS.md table | 🔴 P0 |
| Bare `catch {}` | Empty catch swallows errors. Must have at least `console.error(e)` or comment explaining why intentional | 🟠 P1 |
| Component useState count | >10 = complex, >20 = needs reducer/store | 🟢 P3 |
| Module coupling | Count files that break when `shared/types.ts` changes | 🟡 P2 |
| IPC domain sprawl | Same domain's handlers split across multiple IPC files | 🟢 P3 |
| Test coverage gaps | Service modules with 0 tests | 🟢 P3 |

### 6. Robustness

[... existing robustness content ...]

### 7. Persistence Leakage (Phase 24+)

**Core question**: After UI deletion, is the storage layer still writing?

| Pattern | How to Check | Severity |
|---------|-------------|----------|
| localStorage written but UI deleted | Grep all `localStorage.setItem` → cross-reference render tree to confirm UI exists. `lbkb_open_tabs` wrote data TabBar no longer renders (R344) | 🟠 P1 |
| Hidden pub/sub still subscribed | Grep `subscribe` / `addListener` / `on(` → trace `notify`/`emit` call chain → confirm consumer is alive | 🟠 P1 |
| Background state machine surviving deletion | Store/context/reducer still imported by non-UI modules (e.g., `tab-context.tsx` imported by `SplitPane.tsx`) even though rendering component is disconnected | 🟠 P1 |
| Invisible route tracking | `useEffect` + `useLocation` + auto-add to list/tabs → "visited-everywhere" recording pattern. User never opted in | 🟡 P2 |
| Orphaned context provider | `<XxxProvider>` wrapping app but zero `useContext(XxxContext)` consumers. Provider + reducer running for nothing | 🟡 P2 |
| localStorage keys with writes but no reads | For each key: count `setItem` callers vs `getItem` callers. Write-heavy, read-none = leakage | 🟡 P2 |
| Stale localStorage keys from deleted features | Old data never cleaned (`lbkb_minimized_blogs`). Not harmful but indicates incomplete deletion | 🟢 P3 |

### 8. Ghost Infrastructure (Phase 24+)

**Core question**: Are there intact but unwired components one import away from resurrection?

| Pattern | How to Check | Severity |
|---------|-------------|----------|
| Zero-import complete resurrection-ready component | `grep -r "export (function\|class)" src/renderer/` → check import count per export → imports=0 and >50 lines = flag | 🟡 P2 |
| Physical file preserved after Stage A deletion | Stage A disconnects rendering but keeps file. List ALL files with import=0 that were previously connected (R346: ContextPanel.tsx 217 lines) | 🟡 P2 |
| "Future wiring" intent comments | Grep `// TODO: wire` / `// reserved for` / `// will be used by` / `// pending` — these are resurrection intent markers | 🟡 P2 |
| Expandable system skeleton | Component defines `expandable`/`collapsed`/`tabs`/`panels` props but currently only uses 1 mode. Infrastructure for growth is pre-built | 🟢 P3 |
| Hidden panel seed | New file, `position:fixed` or `position:absolute`, `z-index`, zero imports — a panel component built but deliberately not wired (R347: TableOfContents.tsx 105 lines) | 🟡 P2 |
| `.bak` files retained | Old version backups serve as "restore reference" — grep `*.bak` in src/ | 🟢 P3 |

### 9. Attention Competition (Phase 24+)

**Core question**: Not just counting panels — does each permanently visible element justify its screen space?

| Pattern | How to Check | Severity |
|---------|-------------|----------|
| Permanent panel count > target | Count all `position:fixed` / `position:sticky` always-rendered elements. Grade by visual weight (heavy/medium/minimal). Target ≤3 | 🟠 P1 |
| Chrome growth | Phase-over-Phase toolbar button count, metadata row field count, footer link count. Increasing trend = attention erosion | 🟡 P2 |
| Low-frequency high-visibility controls | Identify always-visible controls (toolbar buttons, metadata fields) → grep onClick/call sites → estimate usage frequency. E.g., attachment upload button used 0 times in 23 Phases | 🟡 P2 |
| Always-visible affordance for rare operations | Controls visible on every page load but used <1% of sessions. These should be hidden behind hover/menu/command palette | 🟢 P3 |
| AI panel as pseudo-permanent panel | AiChatPanel (380px fixed right) when open forms a 3rd panel. Toggled = not permanent, but if future change makes it "sticky open", re-audit | 🟢 P3 |

### 10. Collapse Integrity (Phase 24+)

**Core question**: Did "delete big, add small" actually reduce system count?

| Pattern | How to Check | Severity |
|---------|-------------|----------|
| "Delete large → add N micro-systems" not counting as collapse | Before: 1 ContextPanel. After: TOC dropdown + AI toast + KB inline expand + series inline + backlinks page. Count: 1→N. If N≥3, net complexity increased | 🔴 P0 |
| Transient interaction verification | For each new UI element claimed as "transient": verify click-to-open + blur-to-close + zero persistent state + zero IntersectionObserver + zero localStorage. Any violation = not transient | 🟠 P1 |
| Persistent state > UI surface area | Count: localStorage keys + context providers + useState total + pub-sub channels. Even if all UI is deleted, these consume complexity budget and enable rapid regrowth | 🟠 P1 |
| Hidden architecture counts as complexity | Module-level pub/sub, custom event bus, `window.__xxx__` globals — even if 1 consumer, the ARCHITECTURE is complex. Each is a resurrection enabler | 🟡 P2 |
| System count change (Phase delta) | Count systems BEFORE and AFTER Phase. A "system" = independently stateful visible UI region with its own lifecycle. Net count must decrease or stay flat | 🟡 P2 |
| Stage A → Stage B completeness | After observation period: verify all Stage A "hidden" entries had their physical files deleted. File retention after Stage B deadline = incomplete collapse | 🟠 P1 |

---

## Output: Audit Report Format

```
### 审查报告
**审查范围**: [files]
**审查时间**: YYYY-MM-DD
**审查类型**: [全量审查 / Collapse Validation / 修复验证]

**发现汇总**:
| 维度 | 检查项 | 通过 | 发现问题 |
|------|--------|------|----------|
| Security | ... | ... | ... |
| Data Integrity | ... | ... | ... |
| Type Safety | ... | ... | ... |
| Redundancy | ... | ... | ... |
| Maintainability | ... | ... | ... |
| Robustness | ... | ... | ... |
| Persistence Leakage | ... | ... | ... |
| Ghost Infrastructure | ... | ... | ... |
| Attention Competition | ... | ... | ... |
| Collapse Integrity | ... | ... | ... |

**新发现**:
- 🔴 P0: N
- 🟠 P1: N
- 🟡 P2: N
- 🟢 P3: N

**redo.md 变更**: 新增 R###-R###, 已验证 R### ✅

**构建基线**: build ✅/❌ | test ✅/❌ | tsc ✅/❌
```

---

## Writing R-Number Tickets

Each ticket must include:

```markdown
| R## | **[P0/P1/P2/P3]** 标题 — 具体描述 |
| **位置**: `文件路径:行号` |
| **代码**: (3-10 行问题代码) |
| **后果**: 运行时具体影响，哪个用户流程断裂 |
| **修复**: (修复后代码) |
```

## Important Constraints

1. **Do NOT modify code** — you are an auditor, not a developer
2. **Do NOT modify AGENTS.md, README.md, or todo.md**
3. **Only write to redo.md**
4. **Do NOT repeat known issues** — always read redo.md first
5. **Be specific** — "`blog.service.ts:244` has `INSERT OR IGNORE` which fails in MySQL" is actionable. "Code quality could be improved" is not
6. **One ticket per distinct issue** — don't bundle unrelated problems
7. **P0+P1+P2 must be cleared** — no deferred items unless Boss explicitly rules
8. **grep > eyeballs** — always verify with grep, not visual scanning
