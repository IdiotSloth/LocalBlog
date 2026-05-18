---
name: fix-cycle
description: Developer (码农) fix cycle for the Local Blog KB project. Use when processing Auditor findings from redo.md, implementing tasks from todo.md, or responding to audit reports. Triggers on: "fix redo", "fix the bugs", "process redo items", "开始修 bug", "继续修复", "开始 phase N", audit result responses, or any instruction to address redo.md/todo.md issues.
---

# Fix Cycle — Developer Workflow

Core loop for processing Auditor findings (R items) from redo.md and implementing tasks (T items) from todo.md. Covers bug fixing, feature implementation, and self-audit.

## Workflow

### Step 1: Read redo.md First

Read `redo.md` and scan the `## 当前待修复` section. Identify all items with 📋 status.

**Iron rule**: If 🔴 P0 or 🟠 P1 items exist, fix them ALL before starting any new feature work.
**Iron rule**: Audit findings → Boss ruling → Developer fix. Never fix before Boss rules.

Sort by priority:
- 🔴 P0 — blocking stability/security/crash, must fix first
- 🟠 P1 — data safety / user-visible breakage
- 🟡 P2 — architecture / type safety / maintainability
- 🟢 P3 — code quality / minor UX / cleanup
- 🔵 P4 — cosmetic / known-acceptable

### Step 2: Fix in Order

For each 📋 item, starting from the highest priority:

1. **Read the problem description** — understand the root cause from the redo.md entry (includes file paths + line numbers)
2. **Locate the files** — verify the paths are still valid (files may have moved since Auditor wrote the entry)
3. **Write the fix** — modify code following project constraints (see `references/constraints.md`)
4. **Clean up all references** — if removing code, remove ALL 7 reference points: IPC channel, WindowApi, preload, handler reg, service file, imports, api-client stub
5. **Build to verify** — `npm run build` must pass before proceeding to next item
6. **Batch independent fixes** — parallel edits in separate files are OK; sequential edits in the same file must be serial

### Step 3: Update redo.md

After each fix, update the redo.md entry:
- Change status from 📋 to ✅ (or ⏭ if deferred)
- Add a one-line fix description under `**Developer**: <what changed, why>`
- Keep the `**Auditor 验证**:` field blank (Auditor fills it later)

### Step 4: Implement Tasks (only when redo P0 is clear)

When redo.md has no P0 blocking items, read `todo.md` for 📋 tasks:

1. **Read the task spec** — 实现步骤, 技术方案, 测试用例
2. **Check Auditor rulings** — tasks may have Dxx constraints (方案 A/B, scope limits, storage decisions). Follow the ruling exactly.
3. **Implement** — follow spec exactly; don't expand scope
4. **Build after each subtask** — `npm run build` must pass
5. **Report unknowns** — if spec is unclear, write `**Developer 备注**` and pause; don't guess

### Step 5: Self-Audit (after each Phase batch)

After completing a batch of fixes/tasks:

```bash
npm run build 2>&1
npm run test 2>&1
npx tsc -p tsconfig.node.json --noEmit 2>&1 | grep -c "TS2532\|TS18048"
npx tsc -p tsconfig.web.json --noEmit 2>&1 | grep -c "TS2532\|TS18048"
```

Checklist:
- [ ] Build: three `✓ built` lines (main + preload + renderer) + worker chunk output
- [ ] Test: 87 passed (12 files)
- [ ] `noUncheckedIndexedAccess`: 0 new errors
- [ ] `as any` renderer: 0 (maintained)
- [ ] `: any` renderer: 0 — 新增检查项
- [ ] New IPC channels: 7-file pattern completed
- [ ] New code: no hardcoded colors (CSS Token only)
- [ ] `fs.writeFileSync`: all wrapped in try-catch
- [ ] New pages: error state + retry button (not just console.error)
- [ ] Existing list pages: error state + retry button (BlogListPage/KnowledgeListPage — R168)
- [ ] useEffect async: abortedRef guard in all .then()/.catch() callbacks
- [ ] **abortedRef reset**: every load function starts with `abortedRef.current = false` (effect cleanup sets to true, must re-enable)
- [ ] IPC channels: ALL registered in ipc-channels.ts (including pet/mini-window)
- [ ] SVG <img>: onError fallback handler
- [ ] Migration: migrateSqlJsToMySQL() covers ALL tables AND all ALTER TABLE added columns
- [ ] api-client: all WindowApi methods AND event stubs present
- [ ] New Worker: onerror + onmessageerror handler + postMessage try-catch
- [ ] shared/handlers/: SQL builders are pure + snake_case→camelCase mapping in services
- [ ] **shared/handlers/ actually used**: Service + Server route both import and use shared builders, no inline duplicate SQL
- [ ] useReducer converged: no bare variable names left, no setter functions left, all hook imports correct
- [ ] Tiptap: no duplicate imports (StarterKit includes Link + Underline)
- [ ] FloatingBlogTabs: BlogPreviewPage has "minimize" entry button

Write findings to redo.md as a "Developer 自纠自查" section.

### Step 6: Report

Output a summary table:

```
| # | 等级 | 问题 | 修复 | 文件 |
|---|------|------|------|------|
| Rxx | 🔴 | ... | ✅ fixed — one-line summary | path:line |
构建: ✅ (X main + Y preload + Z renderer) | 测试: 87/87
```

---

## Proven Patterns (Phase 13-16)

### Schema & Data
- **T1105 Schema freeze**: Never add DB tables/columns. Boss must explicitly approve exceptions (D22 pattern).
- **File-based storage**: `app.getPath('userData') + JSON` (posFile pattern). For new data that needs persistence.
- **Atomic writes**: `writeFileSync(tmp) → renameSync(tmp, real)` to prevent corruption on crash.
- **writeFileSync safety**: All `fs.writeFileSync` calls must be wrapped in try-catch (disk full / permission errors crash main process).

### IPC & Types
- **IPC event channels**: Use `EVT_*` prefix constants in ipc-channels.ts. Both sender (`webContents.send(IPC.EVT_XXX)`) and receiver (`ipcRenderer.on(IPC.EVT_XXX)`) must use the constant — never hardcode strings.
- **7-file checklist**: Adding IPC channel requires changes in: ipc-channels.ts, window-api.ts, preload/index.ts, main/ipc/xxx.ts, main/ipc/index.ts, optionally main/services/xxx.ts, renderer/lib/api-client.ts.
- **api-client mirroring**: webApi method names must EXACTLY match WindowApi (including `app` prefix, `on` event prefix). Missing methods cause `undefined is not a function` at runtime.
- **Type convergence**: Remove intermediate `as any` casts — `window.api.xxx()` returns `ApiResponse<T>` already.
- **noUncheckedIndexedAccess**: Permanently enabled. All `arr[i]` / `obj[key]` need guards or non-null assertions.

### Frontend
- **Data router**: `createHashRouter` + `RouterProvider` (NOT legacy `<HashRouter>`) — required for `useBlocker`.
- **Route merging**: `?mode=edit` pattern merges read/edit at same route. Remove separate `/edit` routes. Use `navigate('?mode=edit', {replace: true})` to avoid history pollution.
- **React.lazy named exports**: `.then(m => ({ default: m.NamedExport }))`.
- **Dashboard tabs**: `useSearchParams` for URL-persistent state, not local useState.
- **useEffect cleanup**: Event listeners registered via `window.api.onXxx()` must return the unsubscribe function. If `onXxx` might not exist (webApi), check existence first.

### Server
- **user_id isolation**: Server routes must verify `user_id` on ALL write operations (UPDATE/DELETE/INSERT). Read operations are covered by `requireAuth` middleware.
- **linkedom in node**: `parseHTML()` returns `Window & typeof globalThis`. Cast: `as unknown as { document: Document }`.

### Dead Code & Cleanup
- **Dead code removal**: 7 reference points must be cleaned: IPC channel, WindowApi, preload, handler registration, service file, imports, api-client stub.
- **Dead storage detection**: If a service has only writers and no readers (R102 pattern), the entire IPC + Service + JSON file chain is dead. Remove it.

### Phase 17-18: Shared Handlers, FTS5, Error Feedback

### Architecture
- **shared/handlers/**: SQL builder functions shared by main services AND server routes. Pure functions (string + params only), zero side effects (D45). Callers handle file writes, drafts, etc.
- **CRUD pattern**: `buildBlogCreate(...)` / `buildBlogUpdate(...)` / `buildBlogDelete(...)` → `{ sql, params }`. Service calls `dbRun(buildBlogCreate(...).sql, buildBlogCreate(...).params)`.
- **Mapping unification**: One canonical `mapBlogRow(row)` in shared handler, consumed by both service and server. No duplicate `rowToBlog`/`mapBlog` functions.

### FTS5 / Web Worker
- **Worker file**: `src/renderer/workers/search.worker.ts`. Vite auto-chunks as `search.worker-*.js` in production build.
- **Tokenization**: `Intl.Segmenter` for CJK (browser built-in, zero deps). TF-IDF scoring with title boost.
- **Cache**: `localStorage` serialized index for warm restart.
- **Dual mode**: MySQL uses `MATCH ... AGAINST` + FULLTEXT INDEX; sql.js uses Worker inverted index.
- **Correlation ID**: Worker messaging MUST use `Map<correlationId, resolve>` — single-slot `pendingRef` causes race condition hang (R132).

### Error Feedback
- **Minimal channel**: `process.on('uncaughtException')` → `IPC.EVT_APP_ERROR` → renderer ErrorToast.
- **Zero file I/O**: Don't write log files. Just tell the user something went wrong.

### Audit Protocol
- **裁决后再修**: Auditor findings → Boss ruling → Developer fix. Never skip the ruling step (Phase 18 pattern).

---

## Project Quick Reference

**Start verification:** `npm run build && npm run test`

**Key files to know:**
- `redo.md` — Auditor findings (read/write)
- `todo.md` — task specs (read, update status only)
- `src/shared/types.ts` — all data structures + interfaces
- `src/shared/ipc-channels.ts` — IPC channel names + event names (add here first)
- `src/shared/window-api.ts` — WindowApi interface
- `src/shared/shortcuts.ts` — shortcut defaults
- `src/shared/handlers/blog-crud.ts` — blog SQL builders (shared by service + server)
- `src/shared/handlers/knowledge-crud.ts` — knowledge SQL builders (shared by service + server)
- `src/shared/handlers/folder-crud.ts` — folder SQL builders (shared by service + server)
- `src/shared/db-schema-mysql.ts` — MySQL DDL + MYSQL_MIGRATIONS
- `src/main/db/schema.ts` — sql.js DDL
- `src/main/db/index.ts` — sql.js init + ALTER TABLE migrations
- `src/preload/index.ts` — contextBridge bindings
- `src/main/ipc/index.ts` — handler registration hub
- `src/renderer/lib/api-client.ts` — web-side stubs (add desktop-only stubs here)
- `src/renderer/workers/search.worker.ts` — FTS5 inverted index Worker
- `src/renderer/lib/use-search.ts` — React search hook (dual-mode: MySQL/Worker)
- `src/server/routes/` — REST API (must validate user_id on writes)

**Developer boundaries (from prompts/developer.md):**
- ✅ Can update: redo.md fix status + self-audit, todo.md task status + Developer 备注
- ❌ Cannot modify: AGENTS.md, README.md (Boss-owned)
- ❌ Cannot modify: task descriptions, priorities, implementation steps in todo.md

### Phase 19: Security Hardening, Type Convergence, Full Audit Cycle

### Security
- **Read-path user_id isolation**: IPC read handlers (KB_GET/KB_PREVIEW/KB_OPEN_EXTERNAL) must verify userId, not just write ops (R145).
- **Path traversal prevention**: All user-provided filenames must go through `path.basename()` before `path.join()` (R147).
- **Migration completeness**: `migrateSqlJsToMySQL()` must cover ALL tables. Missing tables = silent data loss (R144).

### Type System
- **snake_case→camelCase mapping**: Service methods returning data via WindowApi must map DB rows to camelCase. Type mismatch forces renderer to use `: any` (R146).
- **IPC response contract**: Every IPC handler catch block must return `{ success: false, error: "..." }`. Bare `{ error: "..." }` violates the contract (R150).
- **`: any` budget**: Threshold ≤5. When `: any` rises, fix the root type breakage; don't add per-site casts (R154).

### Component Robustness
- **Error states mandatory**: New pages must have error UI + retry button, not just console.error (R149).
- **useEffect abortedRef**: All async useEffect callbacks need abortedRef guard. setState on unmounted component = bug (R152).
- **useReducer convergence**: Proven across 3 components (50 useState → 3 useReducer). Pattern: exported reducer + discriminated union actions (R143).

### IPC Completeness
- **All channels registered**: Every ipcMain.handle/on must use IPC.* constants defined in ipc-channels.ts — including pet/mini-window internal channels (R153).
- **New shared handler domain**: Create `*-crud.ts` in shared/handlers/ for folder/tag/search SQL convergence (R151).

### Worker & Assets
- **Worker onmessageerror**: Required alongside onerror. Missing = silent deserialization failures (R156).
- **SVG img onError**: All `<img>` tags must have onError fallback to hide broken images (R157).
- **Post-build assets**: SVG assets in src/renderer/assets/ must be copied to out/renderer/assets/ by post-build.js (T1908).

### Accessibility
- **aria-label on icon buttons**: Every icon-only button needs aria-label. Screen readers cannot describe unlabeled buttons (R155).

### Phase 20: abortedRef, Folder, Note Service, Full IPC Chain, Error States

### abortedRef Reset (Critical Bug Pattern)
- **Effect cleanup sets `abortedRef.current = true`** → next effect execution starts with flag still true → all `.then()/.finally()` guards short-circuit → `setLoading(false)` never runs → UI stuck on loading forever
- **Fix**: Add `abortedRef.current = false` as the FIRST line of every load function (not just in effect)
- Affected: CalendarView, NoteListPage (both were stuck on loading due to missing reset)

### DB Column → Type → Mapper 3-Layer Sync
- ALTER TABLE adds a column (e.g., `folder_id`) → must also update: (1) `shared/types.ts` interface, (2) `shared/handlers/*.ts` map function, (3) `migrateSqlJsToMySQL()` INSERT statement
- Missing any layer = data silently lost or inaccessible (R158 pattern: blogs content lost on migration)

### migration INSERT Column Completeness
- `migrateSqlJsToMySQL()` INSERT statements MUST include ALL columns added by ALTER TABLE migrations
- R158: blogs missing content/folder_id/series_id/series_name → blog body permanently lost on sql.js→MySQL upgrade
- R158: tags missing description, knowledge_files missing content_text/folder_id

### note.service SELECT user_id Guards
- Even read-back SELECTs after a guarded UPDATE need their own `AND user_id = ?`
- R159: `updateNote` and `togglePin` UPDATE with user_id, but subsequent `SELECT * WHERE id = ?` without user_id

### Server TOCTOU with ById Delete
- `buildXxxSelectByUser(id, userId)` check → `buildXxxDeleteById(id)` creates TOCTOU window
- Fix: `buildXxxDelete(id, userId)` — combines ownership + delete in one WHERE clause

### webApi Event Stub Completeness
- Every WindowApi `onXxx` event method needs a `() => () => {}` stub in webApi
- `as WindowApi` blanket cast masks missing stubs → browser mode crashes

### shared/handlers/ Must Actually Be Used
- folder-crud.ts had `buildFolderTreeQuery`/`buildFolderDuplicateCheck`/`buildFolderCreate` but Service and Server both used inline SQL
- Must import and call shared builders in BOTH service and server route

### Full IPC Chain for New Parameters
- Adding params to an existing IPC method requires: WindowApi → preload → IPC handler → Service — all 4 layers
- R164: CalendarView month filter needed `dueDateFrom`/`dueDateTo` through entire chain

### Error States on List Pages
- BlogListPage, KnowledgeListPage, DashboardPage — catch blocks must set error state with retry button
- R168: Previously only console.error, user saw blank page with no recovery path

### Tiptap StarterKit Includes Link + Underline
- `StarterKit` already bundles `Link` and `Underline` extensions
- Separate imports cause "Duplicate extension names" console warning

### FloatingBlogTabs Entry Point
- BlogPreviewPage must have a visible "最小化" button calling `addTab()` 
- Without it, users can't discover the blog quick-switch feature

For detailed constraints (DB patterns, IPC format, datetime handling, CSS tokens), read `references/constraints.md`.
