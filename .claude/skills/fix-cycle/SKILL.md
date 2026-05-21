---
name: fix-cycle
description: Developer (码农) fix cycle for the Local Blog KB project. Use when processing Auditor findings from redo.md, implementing tasks from todo.md, or responding to audit reports. Triggers on: "fix redo", "fix the bugs", "process redo items", "开始修 bug", "继续修复", "开始 phase N", "修复 Rxxx", audit result responses, or any instruction to address redo.md/todo.md issues. **Iron rule: 不得有延后项 — ALL P0+P1+P2 must be cleared. P3 must be fixed unless explicitly ruled by Boss.**
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
- [ ] **Phase 21: All search entry points use same backend** — searchDirect() Worker, not SQL LIKE (R225/D88)
- [ ] **Phase 21: Function bodies are NOT comment-only** — every async function that should postMessage/dispatch must have actual implementation, not just `// handled in caller` (R229)
- [ ] **Phase 21: All HTML template literal interpolations are escaped** — PDF/DOCX/XLSX/CSV preview paths each verified (R276/R277/R279/R273)
- [ ] **Phase 21: Hybrid scores are normalized before weighting** — keyword scores divided by max before mixing with cosine [0,1] (R239)
- [ ] **Phase 21: Function signature changes grep all callers** — when adding a parameter, verify every caller across all files passes the new argument (R251)
- [ ] **Phase 21: Module-level state uses React context/useRef** — no `let`/`const` module-scope state in .tsx files (HMR risk, R231)
- [ ] **Phase 21: Dynamic import .then() has unmount guard** — `if (!ref.current) return` before any DOM/simulation/state side effects (R233)
- [ ] **Phase 21: Multi-step DML wrapped in BEGIN/COMMIT/ROLLBACK** — TAG_MERGE, batch operations, any function with ≥2 DML statements (R278)

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

## Proven Patterns (Phase 13-23)

### Schema & Data (Phase 13-23)
- **T1105 Schema freeze**: Never add DB tables/columns. Boss must explicitly approve exceptions.
- **Schema sync three places**: DDL changes must appear in schema.ts + db-schema-mysql.ts + MYSQL_MIGRATIONS. New tables must be added to `migrateSqlJsToMySQL()` for data migration.
- **settings 表**: The settings table (key-value with user_id) exists since Phase 23. Use for cross-window persistent config (drafts, clipboard history, tile positions).
- **Atomic writes**: `writeFileSync(tmp) → renameSync(tmp, real)` to prevent corruption on crash.
- **writeFileSync safety**: All `fs.writeFileSync` calls must be wrapped in try-catch.

### IPC & Types (Phase 13-23)
- **7-file checklist**: Adding IPC channel requires changes in: ipc-channels.ts → window-api.ts → preload/index.ts → main/ipc/xxx.ts → main/ipc/index.ts → optionally main/services/xxx.ts → renderer/lib/api-client.ts (web stubs).
- **WindowApi type declaration**: Missing WindowApi method declarations cause all callers to use `as any` — 11+ tsc errors from one gap. Always add type declaration when adding IPC.
- **user_id isolation**: ALL new IPC handlers must filter by `AND user_id = ?` in every query. Even in single-user Electron apps, this is defense-in-depth.
- **api-client mirroring**: webApi method names must EXACTLY match WindowApi.
- **noUncheckedIndexedAccess**: Permanently enabled. All `arr[i]` / `obj[key]` need guards.

### Frontend (Phase 13-23)
- **Data router**: `createHashRouter` + `RouterProvider` (NOT legacy `<HashRouter>`).
- **Route uniqueness**: Each route path must appear ONLY ONCE in App.tsx. Duplicate paths (e.g. `/graph` defined twice) cause first-match wins and dead redirects.
- **DOMPurify before dangerouslySetInnerHTML**: ALL content from user DB must pass through `DOMPurify.sanitize()`. This includes md.render() output, previewHtml, and transclusion innerHTML.
- **Component existence ≠ usage**: A component can be imported but never rendered in JSX. Verify with grep on JSX usage, not just import.
- **Suggest.md alignment**: When implementing visual features (themes, colors), cross-reference suggest.md for exact hex values. Deviation from Boss-approved design spec = redo.

### BrowserWindow Safety (Phase 23+)
- **Every `new BrowserWindow()`** must explicitly set: `nodeIntegration: false, contextIsolation: true` + minimal preload script.
- **Preload scripts** must only expose the minimum required API via `contextBridge.exposeInMainWorld`.
- **globalShortcut registration**: Must check for conflicts (e.g. Ctrl+Space conflicts with CJK IME).
- **Path traversal**: All file operations must use `path.basename()` + `fs.realpathSync()` + `startsWith` triple guard.

### Self-Check Before Marking "Fixed" (Phase 23+)
1. `npx tsc --noEmit` — zero new errors
2. `npx tsc -p tsconfig.node.json --noEmit` — zero new errors
3. `npx tsc -p tsconfig.web.json --noEmit` — zero new errors
4. `npm run build` — passes
5. `npm run test` — 87/87 pass
6. All R items claimed as fixed must have corresponding code change verifiable by `git diff`
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

### Phase 20: Information Architecture Upgrade (18/18 ✅)

### Design System
- **3-Color palette**: blue (links/active), green (success), red (danger). Amber + purple removed (T2001/T2017).
- **Card style**: 8px radius, no shadow, hover only changes border-color. No translateY/shadow effects (T2017).
- **Animations**: 150ms color transitions only. No keyframe effects (fadeUp/edge-breathe removed).
- **Reading themes**: 3 (dark/light/sepia). 5→3 migration: forest→dark, sakura→light, paper→sepia, midnight→dark (D59).
- **Lucide icons**: Replaced emoji in sidebar (StickyNote/FileEdit/Library/Tags/Pencil/LayoutDashboard/Layers/Trash2/HelpCircle/Settings).

### 3-Column Layout
- **Sidebar**: Fixed 220px, manual toggle → 48px. Ctrl+B shortcut. aria-expanded + aria-label (D46/R193).
- **ContextPanel**: Right 280px panel. Route whitelist (/blog/:id, /knowledge, /graph). Ownership token (sessionId) prevents cross-page tab leaks (R186). Responsive: hides < 1200px (R200).
- **HomePage**: Merged Dashboard + ContinueWriting → "今日中枢" at `/`. Hero + stats + calendar + daily note + todos + mini graph + drafts + recent (D53/D61).

### Wikilink System
- **Rendering**: `md.render → renderWikilinks([[regex]] with code-block protection) → DOMPurify → dangerouslySetInnerHTML` (R174).
- **Editing**: Tiptap WikilinkSuggestion on `[[` trigger, searches blogs/knowledge/notes, inserts `<a class="wiki-link">`.
- **Persistence**: `syncWikilinkRefs` dual scanner (extractWikilinkRefs for HTML tags + extractWikilinkTitles for [[text]]). Turndown custom rule preserves `[[Title]]` syntax.
- **Ref sync**: blog:create/update/quickCreate → syncWikilinkRefs. note:create/update → syncWikilinkRefs. knowledge:import → syncWikilinkRefs (R219).
- **Transaction**: BEGIN/COMMIT/ROLLBACK wrapping (R207).

### Knowledge Graph
- **D3 forceSimulation** (D49): `forceLink` + `forceManyBody` + `forceCenter` + `forceCollide`. `sim.tick()` cold start, `sim.stop()` cleanup.
- **graph:getData IPC**: Aggregates blogs + knowledge + notes + tags + refs. All queries user_id filtered (R181). 7 ORDER BY for all LIMIT queries (R207b).

### MCP Server
- **HTTP**: Express route `POST /api/mcp/message` on port 3456. JWT Cookie auth. 7 tools (search/list_blogs/list_knowledge/list_notes/list_tags/get_stats/get_refs).
- **stdio**: `src/mcp-server/index.ts` standalone CLI. `npm run mcp` script.

### Toolchain & Build
- **d3-force**: Dependency for force-directed graph. Ensure `npm install` before dev. Clear `.vite` cache after adding new deps.
- **mysql strict mode**: TEXT columns cannot have DEFAULT. Always omit DEFAULT for MySQL TEXT columns.

### Updated Self-Audit Checklist
- [ ] Design tokens: no `--accent-amber`/`--accent-purple` in new code (3-color system)
- [ ] Card styles: no shadow/translateY on hover
- [ ] Wikilink sync: dual scanner used (HTML tag + [[text]])
- [ ] ContextPanel: ownership token + route whitelist
- [ ] Rediscoverable routes: `*` catch-all 404 page present
- [ ] Skip-to-content link: uses button onClick, not `<a href="#">` (HashRouter compatible)
- [ ] D3 simulation: sim.stop() in useEffect cleanup
- [ ] MySQL DDL: no `TEXT DEFAULT '...'` (strict mode incompatible)
- [ ] New IPC: graph:getData / kb:set-properties use IPC.* constants
- [ ] Refresh events: graph/MiniGraph listen to onBlogRefresh/onKbRefresh
- [ ] CSS token: replaced `--accent-amber` → `--text-secondary`, `--accent-purple` → `--accent-blue`

### Updated Key Files
- `src/shared/wikilink.ts` — wikilink rendering + extraction utilities
- `src/shared/types.ts` — MemoType, RefType, WikiLinkSearchResult, GraphNode/Edge/Data/Filter
- `src/renderer/components/editor/WikilinkSuggestion.tsx` — [[ autocomplete popup
- `src/renderer/components/layout/ContextPanel.tsx` — context panel + ownership token + route whitelist
- `src/renderer/components/editor/TiptapEditor.tsx` — wikilink detection + suggestion integration
- `src/renderer/components/common/MiniGraph.tsx` — D3 force mini graph
- `src/renderer/components/CalendarView.tsx` — moved from features/dashboard/
- `src/renderer/features/dashboard/HomePage.tsx` — merged dashboard + continue writing
- `src/renderer/features/graph/GraphPage.tsx` — full graph page with drag/zoom/filter
- `src/renderer/features/misc/NotFoundPage.tsx` — 404 recovery page
- `src/main/ipc/blog.ts` — syncWikilinkRefs (exported) + dual scanner + transaction + batch ref cleanup
- `src/main/ipc/graph.ts` — graph:getData with ORDER BY + user_id filtering
- `src/main/ipc/note.ts` — wikilink ref sync on create/update
- `src/main/ipc/knowledge.ts` — wikilink ref sync on import + kb:set-properties
- `src/server/routes/mcp.ts` — MCP HTTP tools
- `src/mcp-server/index.ts` — MCP stdio CLI
- `src/shared/db-schema-mysql.ts` — properties TEXT (no DEFAULT for MySQL strict mode)
- `electron.vite.config.ts` — optimizeDeps: { include: ['d3-force'] }

### Phase 21: Editor Evolution + Search + Knowledge Graph + KB Editing

### Search & CJK
- **MySQL FULLTEXT ngram**: ALL FULLTEXT INDEX must use `WITH PARSER ngram`. Without it, CJK text is treated as single token — "面试通关手册" indexed as one token, "面试" never matches.
- **CJK fallback**: `hasCjk(query)` check — if FULLTEXT returns empty AND query has CJK chars, automatically fall back to LIKE `%q%`. Covers pre-migration databases.
- **Three-layer tokenizer**: Unigram (single char, weight 0.25) + Bigram (2-char pairs, weight 0.5) + Word (Intl.Segmenter, weight 1.0). LS key `lbkb_fts_index_v3`.
- **searchDirect()**: Exported from use-search.ts for ReferencePicker/WikilinkSuggestion. Worker shared via `window.__searchWorker`. D88 unified ref search.
- **Hybrid scoring**: 0.6×vector + 0.4×keyword. Keyword scores normalized to [0,1] before merge.
- **Embedding worker**: `embedding.worker.ts` — multilingual-e5-small (384-dim), IndexedDB vector cache, batch writes.

### React Patterns
- **Hooks before returns**: ALL `useState`/`useEffect` must come before ANY `if (x) return` conditional. Hook count mismatch = crash.
- **HMR-safe state**: Module-level state must use `window.__key` persistence to survive Vite HMR. `getStore()` wrapper pattern.
- **HashRouter href**: Every `<a href>` needs `#` prefix. `renderWikilinks()`, TiptapEditor wikilink insertion, all use `#/blog/N`.
- **WikiLinkResolver**: `Map<string, {type, id}>` built from `refGetFrom` + `refGetTo`. Passed to `renderWikilinks(html, resolver)` for direct links instead of search links.

### Layout & UI
- **SplitPane**: Generic two-pane container with `useSplit()` context. `openSplit(content)` / `closeSplit()` / `activePaneId`. Ctrl+\ toggles MD preview in BlogEditorPage.
- **D84 ContextPanel ownership**: `{ paneId, sessionId }` tuple. `getStore().paneStates` per-pane tab storage. `activePaneId` drives which pane's tabs are shown.
- **CalendarView**: `String(dueDate).slice(0,10)` for type-safe date key. Blue count badges on days with schedules.
- **iframe sandbox**: `allow-same-origin allow-scripts` required for interactive previews (XLSX sort/filter, PDF search).

### Security
- **D86 path safety**: `path.resolve(workspace, filePath)` + `fs.realpathSync(workspace)` + `startsWith` — dual guard for kb:updateContent.
- **escHtml() 5-char**: `& <> "'` all escaped. Used in all HTML template injection points.
- **HTML sanitization**: Strip `<script>`, `on*` handlers, `<iframe>` before injecting user/source content into HTML templates (PDF export, DOCX preview).
- **Transaction wrapping**: Multi-step DML must use BEGIN/COMMIT/ROLLBACK (TAG_MERGE).

### New Components
- `CalloutNode.tsx` — Tiptap Node extension with parseHTML/renderHTML
- `QuickSwitcher.tsx` — Ctrl+O title search for instant navigation
- `MetadataPanel.tsx` — blog metadata editor (cover/icon/series/format)
- `Skeleton.tsx` — TextSkeleton/CardSkeleton/ListSkeleton
- `CodePreview.tsx` — shiki syntax highlighting + line numbers
- `LocalGraph.tsx` — D3 1-degree neighbor graph for ContextPanel
- `KbContentEditor.tsx` — TXT/MD editing with kb:updateContent

### Updated Self-Audit Checklist
- [ ] MySQL FULLTEXT INDEX: all use `WITH PARSER ngram`
- [ ] CJK search: hasCjk() fallback to LIKE when FULLTEXT empty
- [ ] React hooks: all useState/useEffect before any conditional return
- [ ] `<a href>`: all have `#` prefix for HashRouter
- [ ] Module-level state: HMR-safe via window persistence
- [ ] renderWikilinks: resolver Map passed when refs available
- [ ] iframe sandbox: includes `allow-scripts`
- [ ] Multi-step DML: BEGIN/COMMIT/ROLLBACK wrapped
- [ ] HTML injection: all points escHtml() or script/event stripped
- [ ] kb:updateContent: D86 dual-guard path check
- [ ] dueDate: String() wrapped before .slice()
- [ ] D3: simLocal + svgRef guard for async import cleanup
- [ ] IndexedDB: batch writes (not per-entry)
- [ ] wikilink href: `#/` prefix in both TiptapEditor and renderWikilinks
- [ ] searchDirect() export: used by ReferencePicker + WikilinkSuggestion

### Updated Key Files
- `src/shared/wikilink.ts` — renderWikilinks with resolver param + WikiLinkResolver type
- `src/shared/template-vars.ts` — expandTemplateVars() for {{date}} etc.
- `src/renderer/workers/embedding.worker.ts` — semantic search ONNX inference
- `src/renderer/components/layout/SplitPane.tsx` — generic split pane + SplitContext
- `src/renderer/components/layout/QuickSwitcher.tsx` — Ctrl+O quick jump
- `src/renderer/components/editor/SlashCommand.tsx` — 17 slash commands + CalloutNode
- `src/renderer/components/editor/CalloutNode.tsx` — Tiptap Node extension
- `src/renderer/components/knowledge/KbContentEditor.tsx` — TXT/MD/Code preview+edit
- `src/renderer/components/knowledge/CodePreview.tsx` — shiki syntax highlighting
- `src/renderer/components/common/LocalGraph.tsx` — 1-degree graph for ContextPanel
- `src/renderer/components/common/Skeleton.tsx` — loading placeholders
- `src/renderer/components/common/EmptyState.tsx` — warm empty states
- `src/renderer/components/blog/MetadataPanel.tsx` — blog metadata editor
- `src/renderer/features/guide/GuidePage.tsx` — rewritten (Lucide, no emoji, Phase 20-21 content)
- `src/main/services/search.service.ts` — CJK fallback + hasCjk() + ngram migration
- `src/main/ipc/graph.ts` — getLocalGraph() for scope=local mode
- `src/main/ipc/tags.ts` — TAG_MERGE with transaction wrapping
- `src/shared/db-schema-mysql.ts` — FULLTEXT ngram rebuild migration
- `src/server/routes/clip.ts` — browser clipper endpoint + timeout/size limits
- `chrome-extension/` — 4-file Manifest V3 extension

### Phase 22: Knowledge Activation — AI/Transclusion/Tabs/Bookmarks/Calendar

#### AI System (T2204)
- **IPC**: `ai:chat` + `ai:tag-suggest` (2 channels). Desktop calls AiService → OpenAI/Anthropic API with 30s AbortSignal timeout.
- **Server**: `POST /api/chat` + `POST /api/chat/tags` — requireAuth guarded. Web mode uses fetch to these endpoints.
- **Settings**: localStorage `lbkb_ai_settings` (provider/apiKey/model/baseUrl). API key never sent to server — only used in main process IPC handler.
- **RAG**: `searchDirect(query, userId)` retrieves Top-3 context → injected into system prompt. Typewriter effect via 15ms setInterval.
- **Editor AI**: `✦ AI` toolbar button dropdown (续写/摘要/润色/翻译) + Ctrl+J shortcut + right-click contextMenu. `useAiSettings()` hook provides config.
- **Auto-tag**: Post-save `aiTagSuggest()` → toast suggested tags.

#### Transclusion (T2205)
- **Syntax**: `![[title]]` detected BEFORE regular `[[title]]` in `renderWikilinks()`.
- **Loading**: `useEffect` 100ms setTimeout → `document.querySelectorAll('.transclusion')` → batch IPC → replace innerHTML with DOMPurify.sanitize.
- **Security**: All transclusion content MUST go through `escT()` + `DOMPurify.sanitize()` before innerHTML. `DOMPurify.Config.ADD_ATTR` for data-ref-*.

#### Bookmarks (T2209)
- **Schema**: `bookmarks` table (id/user_id/target_type/target_id/title/created_at). 3-way sync: schema.ts + db-schema-mysql.ts + db/index.ts migration.
- **IPC**: `bookmark:add/remove/list` (3 channels). Full 7-file chain: ipc-channels → window-api → preload → handler → ipc/index → api-client.
- **Components**: `BookmarkButton` (toggle on BlogPreviewPage/KB), `BookmarksPage` (/bookmarks route).

#### Tab System (T2208)
- **TabContext**: Independent from SplitContext (D98). Manages open tabs via localStorage `lbkb_open_tabs`.
- **TabBar**: Auto-captures routes via `useEffect` watching `location.pathname`. Max 8 tabs. Home tab ('/') cannot be closed. Ctrl+1-8 switching.
- **Critical**: `navigate()` must NOT be called inside `setState` callback — causes cross-component render warning.

#### Calendar (T2201)
- **Dual data source**: `Promise.all([noteList('daily'), noteList('schedule')])` — concurrent loading.
- **Dot system**: Blue dot (6px, --accent-blue) = daily note. Green dot (6px, --accent-green) = schedule.
- **Quick create**: Click date → panel with input + green button → creates schedule note. No modal popup.

#### Saved Search (T2206)
- **useSavedQueries**: `useSyncExternalStore` pattern. CRITICAL: getSnapshot must return cached reference.
- **GlobalSearch**: "保存此查询" button → saves to localStorage → HomePage display.

#### Timeline (T2207)
- **Data shape**: `blogList` returns `{ blogs, total }` NOT bare array. Access `blogR.data?.blogs`.
- **Date safety**: `String(date).slice(0,10)` everywhere — DB timestamps may not be string type at runtime.

### Phase 23: The Study — Guofeng Themes, Cards, Whiteboard, Guide

#### Theme System (T2301)
- **5 themes**: 墨砚(赭石铜赤)/茶竹(竹绿)/夜灯(黄铜)/宣纸(靛蓝)/青瓷(青釉). Each theme has UNIQUE accent hue.
- **CSS order**: `@import "./themes.css"` MUST come AFTER `:root` + `.light` blocks — otherwise overridden.
- **:root default**: Changed to inkstone values. Old dark→inkstone, light→rice-paper auto-migration in `initTheme()`.
- **Transition**: 350ms ease on `html, body, #root, [data-theme]`.
- **Borders**: Use `rgba()` semi-transparent, not solid hex.

#### BlogCard & MD Softening (T2302)
- **BlogCard component**: `src/renderer/components/blog/BlogCard.tsx` — title + date + reading time + excerpt + tags + ref count.
- **Must verify usage**: Import is not enough — grep for `<BlogCard` in JSX to confirm rendering.
- **MD softening**: 10 elements via `.prose` CSS overrides: h2(border-bottom), blockquote(transparent+italic), code(pill), a(underline-offset), img(rounded), hr(thin), table(semi-transparent).

#### Whiteboard (T2307)
- **React Flow**: `@xyflow/react` (MIT). `useNodesState<Node>([])` — MUST provide type to avoid `never[]`.
- **Optimistic create**: Add node with temp ID immediately → replace with server ID on success → remove on failure.
- **Double-click edit**: `onNodeDoubleClick` → `prompt()` → `setNodes` + `whiteboardNodeUpdate` IPC.
- **Task toggle**: `onNodeClick` checking `node.type === 'task'` → cycle todo→in_progress→done.
- **Delete**: `deleteKeyCode={['Delete', 'Backspace']}` on ReactFlow.
- **Colors**: Use CSS var function `nodeColor(name)` returning `var(--accent-blue)` etc. No hardcoded hex.

#### Guide Page
- **Raw imports**: `import indexMd from '../../../../docs/guide/index.md?raw'` — Vite ?raw suffix.
- **TOC**: 13 chapters with Lucide icons, scroll spy, ← → keyboard navigation.
- **AI panel**: Reuse `AiChatPanel` component, toggleable from sidebar.
- **Inline links**: `[→ 试试](url)` links throughout — user action prompts.

#### Common Phase 23 Pitfalls
- **CSS dead code**: Defining `.blog-card-*` classes but not using them in JSX.
- **NODE_COLORS variable**: Deleting hardcoded map but missing residual references (TaskNode fallback to NODE_COLORS.green).
- **`/graph` double route**: Two path entries — first matches, second (Navigate) never fires.
- **Emoji in KB icons**: TYPE_LABELS using emoji strings → must use Lucide components.
- **Sidebar header**: Changed from "~/kb" to "精炼书房". Icons from 20px to 16px.

#### Updated Key Files
- `src/renderer/components/blog/BlogCard.tsx` — blog card component (Phase 23)
- `src/renderer/assets/themes.css` — 5 guofeng themes with [data-theme] (Phase 23)
- `src/renderer/stores/theme-store.ts` — theme migration + data-theme attribute management (Phase 23)
- `src/renderer/stores/tab-context.tsx` — TabProvider + useTabs hook (Phase 22)
- `src/renderer/components/ai/AiChatPanel.tsx` — RAG chat panel (Phase 22)
- `src/renderer/stores/ai-settings.ts` — AI config with useSyncExternalStore (Phase 22)
- `src/renderer/features/whiteboard/WhiteboardPage.tsx` — React Flow whiteboard (Phase 23)
- `src/renderer/features/guide/GuidePage.tsx` — interactive handbook (Phase 23)
- `src/renderer/features/timeline/TimelinePage.tsx` — vertical timeline (Phase 22)
- `src/renderer/features/bookmarks/BookmarksPage.tsx` — bookmarks list (Phase 22)
- `src/renderer/hooks/useSavedQueries.ts` — localStorage-based saved search (Phase 22)
- `src/main/quick-note.ts` — Alt+Space quick note window (Phase 23)
- `src/main/ipc/whiteboard.ts` — whiteboard IPC handlers with user_id isolation (Phase 23)
- `docs/guide/*.md` — 13 guide markdown files (Phase 23)

### Phase 23: 精炼书房 — 竞品驱动/国风主题/收纳哲学/白板

#### Design System (T2301)
- **Theme specs**: 5 themes with exact hex values in `suggest.md` §提案 2. `themes.css` + `:root` + `.light` must match suggest.md exactly. No approximate colors.
- **bg-code**: All themes use `rgba()` semi-transparent, not solid hex. Dark themes: `rgba(255,255,255,0.025)`. Light themes: `rgba(0,0,0,0.025)`.
- **8 theme options**: system + dark + light + inkstone + tea-bamboo + brass-lamp + rice-paper + celadon. SettingsPage must show all 8.
- **Background image**: `#root::before` pseudo-element + opacity slider. file:// paths blocked by Electron security in renderer.

#### Card Feed (T2302)
- **memos pattern**: Cards with `group` class for hover actions. No pagination buttons — pure infinite scroll via IntersectionObserver sentinel.
- **BlogCard component**: `src/renderer/components/blog/BlogCard.tsx` — title anchor (text-lg), meta (text-xs muted), excerpt (line-clamp-3), footer (tags + refs + hover ops).
- **Code blocks**: highlight.js + language label (top-left) + copy button (top-right, hover visible).

#### Frameless Editor (T2303)
- **variant prop**: `TiptapEditor` supports `'full' | 'inline' | 'frameless'`. `BlogEditorPage` passes variant through. `BlogPreviewPage` edit mode uses `variant="frameless"`.
- **300ms transition**: `isEditMode` → fadeIn 0.3s CSS animation, no route jump.
- **BubbleMenu**: NOT available — `@tiptap/extension-bubble-menu` exports Extension, not JSX component. Do not import and render as component.
- **Transclusion**: `renderWikilinks()` already processes `![[...]]` via `TRANSCLUDE_RE` before wikilinks. Full pipeline: md.render → renderWikilinks → DOMPurify.sanitize.

#### Quick Note + Clipboard (T2304)
- **Alt+Space**: BrowserWindow 420×320, `transparent:true`, `backgroundColor:'#00000000'` (花笺 style).
- **Clipboard monitor**: 500ms polling via `clipboard.readText()` (text-first, HTML fallback). MD5 dedup, settings table persistence, privacy masking.
- **Preload pattern**: `quick-note-preload.ts` exposes `window.quickNote.{save,pin,hide,getClipboardHistory}`. `ipcRenderer.invoke` for clipboard (not `send`).
- **Popover**: data: URL onclick must use `window.functionName` prefix. Local `clipCache[]` array avoids repeat IPC.

#### KB Redesign (T2305)
- **Pogget philosophy**: "Don't transport files, present them directly. Click to open, no preview page."
- **KbFileDetail**: `src/renderer/components/knowledge/KbFileDetail.tsx` — renders in center area (not 480px side panel). Conditional on `previewFileId != null`.
- **Card grid**: Lucide icons (`TYPE_ICONS[ft]`) + 3px left color border + title + metadata. Grid with `repeat(auto-fill, minmax(280px, 1fr))`.
- **Drag to whiteboard**: KB cards `draggable` + `application/lbkb-whiteboard` dataTransfer. Whiteboard `onDrop` creates kbLink node.
- **Conflict detection**: Drop handler checks existing filenames. 3-option prompt: 1=替换, 2=保留两者, 3=跳过.

#### Navigation (T2306)
- **Sidebar**: 3 sections (写作/收纳/思考) + fixed footer. 3px accent left bar on active item. Count badges via `statsGet`.
- **Tag cloud**: Discrete font sizes (1-2→12px, 3-5→14px, 6-10→16px, 11+→18px). BlogCard feed when selected.
- **Series pages**: Card previews (first 4 titles). BlogCard with ①②③. Bottom navigation bar. Reading progress via localStorage.

#### Whiteboard (T2307)
- **ReactFlowProvider wrapping**: `useReactFlow()` must be called INSIDE ReactFlowProvider. Split into WhiteboardPage (provider wrapper) + WhiteboardCanvas (inner component).
- **6 node types**: idea, task, text, blogLink, kbLink, bookmarkLink. LinkNode uses Lucide icons (FileEdit/Library/Bookmark).
- **Edge picker**: 3-button floating UI (关联/依赖/引用) replacing blocked `prompt()`.
- **quickInput dialog**: Custom state-based prompt (`{msg, resolve}`) replacing blocked `prompt()` for node editing.
- **Bidirectional sync**: EVT_BLOG_REFRESH/EVT_KB_REFRESH events → `reloadNodes()`. Blog link title edit → `blogUpdate`. KB link title edit → `kbRename`.
- **Props sync**: WhiteboardCanvas parameters must be updated in 3 places (function signature + JSX props + state declaration).

#### Electron-Specific Gotchas
- **prompt() blocked**: `window.prompt()` throws in Electron renderer. Use custom state dialogs everywhere.
- **file:// blocked**: Background images, Image() probes all fail in renderer. Design around this limitation.

#### Updated Self-Audit Checklist (Phase 23 additions)
- [ ] themes.css: all colors match suggest.md exact hex (not approximate)
- [ ] bg-code: rgba() semi-transparent (not solid hex)
- [ ] 8 theme options in SettingsPage
- [ ] BlogCard: `group` in className for hover patterns
- [ ] No pagination buttons in blog list (infinite scroll sentinel only)
- [ ] TiptapEditor: variant prop passed through BlogEditorPage
- [ ] BlogPreviewPage: isEditMode branch renders BlogEditorPage variant="frameless"
- [ ] Code blocks: highlight.js + language label + copy button
- [ ] KB: KbFileDetail in center area, not 480px side panel
- [ ] KB: Card grid uses TYPE_ICONS[ft] (Lucide, not emoji)
- [ ] Whiteboard: ReactFlowProvider wrapping, no useReactFlow() outside
- [ ] Whiteboard: WhiteboardCanvas params match props passed
- [ ] Whiteboard: edgePicker + quickInput not using prompt()
- [ ] Quick note: transparent:true + backgroundColor:'#00000000'
- [ ] Quick note: data: URL onclick uses window. prefix
- [ ] Clipboard: poll() text-first, not HTML-first
- [ ] No prompt() calls in renderer code
- [ ] No @tiptap/extension-bubble-menu JSX rendering (tsc error)

#### Updated Key Files
- `src/renderer/assets/themes.css` — 5 themes with exact suggest.md hex
- `src/renderer/assets/index.css` — :root/:light aligned to inkstone/rice-paper specs
- `src/renderer/components/blog/BlogCard.tsx` — card with group/refCount/tags
- `src/renderer/components/editor/TiptapEditor.tsx` — variant prop (full/inline/frameless)
- `src/renderer/components/knowledge/KbFileDetail.tsx` — center-pane file detail (NEW)
- `src/renderer/features/knowledge/KnowledgeListPage.tsx` — KbFileDetail + card grid + ContextPanel
- `src/renderer/features/blog/BlogPreviewPage.tsx` — isEditMode frameless editor + hljs copy
- `src/renderer/features/blog/BlogEditorPage.tsx` — variant prop → TiptapEditor
- `src/renderer/features/whiteboard/WhiteboardPage.tsx` — ReactFlowProvider + 6 node types + edgePicker
- `src/renderer/features/dashboard/HomePage.tsx` — calendar selectedDate fix
- `src/renderer/features/settings/SettingsPage.tsx` — BackgroundImageSection + ClipboardSection + 8 themes
- `src/renderer/components/layout/MainLayout.tsx` — accent bar + badges + fixed footer
- `src/main/quick-note.ts` — transparent window + clipboard popover JS
- `src/main/quick-note-preload.ts` — getClipboardHistory invoke
- `src/main/services/clipboard.service.ts` — 500ms poll + text-first + privacy masking + settings persistence
- `src/main/ipc/app.ts` — clipboard IPC handlers (history/toggle/status/clear)
- `docs/guide/*.md` — 13 guide chapters updated for Phase 23

For detailed constraints, read `references/constraints.md`.
