# Project Constraints — Quick Reference

## Architecture
- **Electron 41** + React 19 + TypeScript + Vite 7
- Three processes: Main (Node.js) + Preload (contextBridge) + Renderer (React)
- Express 5 web server on port 3456 (optional)
- Routing: `createHashRouter` + `RouterProvider` (data router, NOT legacy `<HashRouter>`)

## Directory Rules
| Directory | Allowed | Forbidden |
|-----------|---------|-----------|
| src/main/ | Node.js, Electron APIs, DB | React, DOM |
| src/renderer/ | React, CSS, DOM | Node.js APIs (fs, path, electron) |
| src/preload/ | contextBridge only | Business logic |
| src/shared/ | Types, constants, handlers, channels | Runtime code, side effects |
| src/shared/handlers/ | Pure SQL builder functions (string + params only) | File I/O, DB execution, side effects |
| src/server/ | Express, MySQL | Electron APIs |

## Database
- **Dual backend**: sql.js (SQLite WASM) / MySQL 8.3
- **Async wrappers only**: `dbGet<T>()`, `dbAll<T>()`, `dbRun()` — never use deprecated `get()`/`all()`/`run()`
- **Parameterized SQL**: always use `?, ?, ?` placeholders
- **MySQL DATETIME format**: `YYYY-MM-DD HH:MM:SS` — never ISO 8601 (`T`/`Z` separators)
- **Helper**: `toMySQLDateTime(date?)` / `nowMySQL()` from `src/shared/datetime.ts`
- **Schema changes**: sync 4 locations: sql.js DDL (`schema.ts`) + MySQL DDL (`db-schema-mysql.ts`) + sql.js migrations (`db/index.ts`) + MySQL migrations (`db-schema-mysql.ts` MYSQL_MIGRATIONS)
- **T1105 Schema freeze**: No new DB tables or columns. Exceptions require Boss approval (D22 pattern: functional need + migration path + DDL sync)
- **MySQL LIMIT**: `LIMIT ? OFFSET ?` not supported as prepared params → inline to SQL string
- **MySQL FULLTEXT INDEX**: Not a schema change (D43=A). Use `ALTER TABLE ... ADD FULLTEXT INDEX` in MYSQL_MIGRATIONS. Column names must match actual table structure.
- **CRUD convergence**: All SQL strings shared via `src/shared/handlers/*-crud.ts` builder functions. Pattern: `buildXxx(...)` → `{ sql: string, params: any[] }`. Service calls `dbRun(buildBlogCreate(...).sql, buildBlogCreate(...).params)`. Server routes use same builders. D45: builders are pure (SQL + params only), side effects stay in callers.

## IPC
- **Channel names**: defined in `src/shared/ipc-channels.ts` only
- **Invoke channels**: `DOMAIN:ACTION` format (e.g., `blog:create`)
- **Event channels**: `EVT_*` prefix in IPC constant name (e.g., `IPC.EVT_BLOG_REFRESH = 'blog:refresh'`)
- **Both ends must use IPC constants**: sender `webContents.send(IPC.EVT_XXX)` / receiver `ipcRenderer.on(IPC.EVT_XXX)` — never hardcode event strings
- **Response format**: `{ success: boolean, data?: T, error?: string }`
- **WindowApi**: typed interface in `src/shared/window-api.ts` — update preload + api-client together
- **Events (main→renderer)**: expose via preload as `onXxx(cb): () => void` unsubscribe pattern
- **api-client mirroring**: `webApi` method names must EXACTLY match `WindowApi` (including `app` prefix, `on` event prefix). Every new method needs a stub.

## New IPC Channel Checklist (7 files)
1. `src/shared/ipc-channels.ts` — channel constant (invoke: `DOMAIN:ACTION`, event: `EVT_*`)
2. `src/shared/window-api.ts` — typed method signature
3. `src/preload/index.ts` — `ipcRenderer.invoke` wiring + event listener (using IPC constant)
4. `src/main/ipc/xxx.ts` — handler implementation (new or existing file)
5. `src/main/ipc/index.ts` — `registerXxxHandlers()` call
6. `src/main/services/xxx.service.ts` — business logic (if new)
7. `src/renderer/lib/api-client.ts` — web stub (return `{ success: false, error: '...' }`; events return `() => () => {}`)

## FTS5 / Web Worker
- **Worker file**: `src/renderer/workers/search.worker.ts` — Vite auto-chunks as `out/renderer/assets/search.worker-*.js`
- **Tokenizer**: `Intl.Segmenter` (browser API, zero deps) for CJK; whitespace fallback
- **Scoring**: TF-IDF with title match boost. Results sorted by relevance.
- **Index cache**: `localStorage` serialized index for warm restart on page load
- **Dual mode**: MySQL uses `MATCH ... AGAINST` + FULLTEXT INDEX; sql.js uses Worker inverted index
- **CRUD sync**: Main process sends `EVT_BLOG_REFRESH` / `EVT_KB_REFRESH` after create/update/delete/import → renderer re-indexes
- **Correlation ID**: Worker messaging MUST use `Map<correlationId, resolve>` — NEVER a single-slot `pendingRef`. Single slot causes race condition: rapid typing overwrites previous resolve → UI permanently stuck in loading
- **Worker safety**: Must have `self.onerror` + `worker.onerror` + postMessage try-catch. Worker crash without handlers = silent terminal failure, UI loading forever
- **use-search hook**: `src/renderer/lib/use-search.ts` — detects MySQL vs sql.js, manages Worker lifecycle, exposes `{ search, results, loading, ready }`

## Server-Side Constraints
- **user_id isolation**: All write operations (UPDATE/DELETE/INSERT) must include `AND user_id = ?` or ownership check. Includes recycle_bin DELETE.
- **Read operations**: Covered by `requireAuth` middleware (`WHERE user_id = ?`)
- **File storage**: `server/uploads/{userId}/` — subdirectory per user
- **File upload**: multer middleware, 10MB limit, type whitelist
- **blog format preservation**: Server `buildBlogUpdate` must query existing format first — never hardcode `'md'` (R131). HTML blogs get format reset silently otherwise.

## Error Feedback
- **Main process**: `process.on('uncaughtException')` → `webContents.send(IPC.EVT_APP_ERROR, { message })`
- **Renderer**: Listen via `onAppError` → render ErrorToast component at App root
- **Minimal pattern**: Zero file I/O. Don't write log files. Just tell user something went wrong.
- **Worker errors**: `self.onerror` + `worker.onerror` + try-catch around postMessage. Crash without handlers = UI stuck.


## Phase 19: Security Hardening + Full Audit (R144-R157)

### Read-Path user_id Isolation (R145)
- IPC read handlers (KB_GET, KB_PREVIEW, KB_OPEN_EXTERNAL) MUST verify userId
- Use `buildKnowledgeSelectByUser(id, userId)` instead of `buildKnowledgeSelect(id)`
- Pattern: handler accepts `{ fileId, userId }` data object, passes userId to service

### Path Traversal Prevention (R147)
- ALL user-provided filenames MUST go through `path.basename(name)` before `path.join()`
- Reject filenames that are empty, `.`, `..`, or contain `\0`
- Pattern: `validateFilename(name: string): string { const s = path.basename(name); if (!s || s === '.' || s === '..' || s.includes('\0')) throw new Error('Invalid filename'); return s; }`

### Migration Completeness (R144)
- `migrateSqlJsToMySQL()` MUST cover ALL tables in schema.ts
- Wrap each table migration in try-catch (table may not exist in old DB)
- Phase 19 added: notes, refs, folders (previously missing 3 of 12 tables)

### Type System Integrity (R146)
- Service methods returning data via WindowApi MUST map snake_case DB rows to camelCase
- Add private `rowToXxx(row: XxxRow): XxxType` mappers in each service
- Type mismatch between DB and WindowApi forces renderer to use `: any` (R154)

### IPC Contract (R150)
- ALL IPC handler catch blocks MUST return `{ success: false, error: "..." }`
- NEVER return bare `{ error: "..." }` — missing `success` field breaks `ApiResponse<T>` contract
- Callers check `r.success` which is undefined for bare `{ error }`

### Component Error States (R149)
- Every new page MUST have error UI: red banner/toast + retry button
- Catch blocks: `setError('message')` in addition to `console.error`
- Loading state → Error state → Empty state → Data rendered (4-state coverage)

### useEffect Race Conditions (R152)
- ALL async useEffect callbacks MUST use `abortedRef = useRef(false)` pattern
- In .then()/.catch()/.finally(): `if (abortedRef.current) return;` before setState
- Cleanup: `return () => { abortedRef.current = true; };`
- Without this: setState on unmounted component = React warning + potential memory leak

### IPC Channel Registration (R153)
- EVERY `ipcMain.handle()` / `ipcMain.on()` MUST use IPC.* constant from ipc-channels.ts
- This includes pet/mini-window/internal channels — no exceptions
- Preload side MUST use same IPC.* constant

### Worker Safety (R156)
- Workers need 3 error handlers: `self.onerror` + `worker.onerror` + `worker.onmessageerror`
- `onmessageerror` handles deserialization failures (e.g., corrupted postMessage data)
- Without it: message decode errors are silently dropped

### Asset Loading (R157)
- All `<img>` tags must have `onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}`
- Broken images should be hidden, not shown as broken icon placeholders

### :any Budget (R154)
- Renderer `: any` count threshold: ≤5
- When count rises, fix the root type break (usually in WindowApi or Service return types)
- Don't add per-site `as any` casts to work around type mismatches

### Accessibility (R155)
- Icon-only buttons MUST have `aria-label` attribute
- Screen readers announce "button" with no description for unlabeled icon buttons

### useReducer Convergence (R143)
- Proven pattern: 3 components converged (50 useState → 3 useReducer)
- Exported reducer function for testability
- Discriminated union action types (not generic payload objects)
- Keep refs and effects unchanged

## Audit Protocol
- **裁决后再修**: Auditor submits findings → Boss issues rulings → Developer fixes. Never skip the ruling step.

## Frontend
- **Routing**: createHashRouter + RouterProvider + React.lazy + Suspense + ErrorBoundary
- **Route merging**: Use `?mode=edit` / `?tab=xxx` query params instead of separate routes. Navigate with `{replace: true}`.
- **CSS**: use `var(--token-name)` only — never hardcode colors
- **XSS**: all `dangerouslySetInnerHTML` must go through `DOMPurify.sanitize()`
- **a11y**: form inputs need `placeholder`, `title`, or `aria-label`

## CSS Tokens (Phase 20 — 3-color system)
| Token | Usage |
|-------|-------|
| `--text-primary` | Primary text color |
| `--text-secondary` | Secondary/body text |
| `--text-muted` | Muted/hint text |
| `--text-placeholder` | Input placeholders |
| `--bg-primary` | Page background |
| `--bg-secondary` | Card background |
| `--bg-sidebar` | Sidebar background (independent from bg-primary) |
| `--bg-tertiary` | Subtle element background |
| `--bg-code` | Code block background |
| `--border-default` | Default borders |
| `--border-emphasis` | Emphasis borders |
| `--accent-blue` | Blue accent (links, active, pinned) |
| `--accent-green` | Green accent (success, local-first) |
| `--accent-red` | Red accent (danger, delete) |
| `--text-on-accent` | Text on accent-colored backgrounds |
| `--font-mono` | Monospace font family |
| `--color-bg-card` | Card background variant (Tailwind mapped) |
| `--color-bg-base` | Base background variant (Tailwind mapped) |
| `--color-bg-sidebar` | Sidebar background variant (Tailwind mapped) |
| `--shadow-dropdown` | Dropdown shadow (dark + light override) |
| `--heatmap-0` | Heatmap empty cell |
| `--heatmap-1` ~ `--heatmap-4` | Heatmap intensity levels (theme-adaptive) |

**Removed** (Phase 20): `--accent-amber`, `--accent-purple`, `--shadow-card`, `--shadow-hover`.
**Card style**: 8px radius, border-only, no shadow, hover changes border-color. No translateY.
**Rule**: All tokens that differ between dark/light must have BOTH `:root` and `.light` definitions.

## Common Patterns
- **Error handling**: never bare `catch {}` — use `catch (e) { console.error('[Context]', e); }`
- **DB timestamps**: use `nowMySQL()` for all INSERT/UPDATE `created_at`/`updated_at`
- **Pagination**: use `sanitizePagination(offset, limit)` from `src/shared/pagination.ts`
- **Type safety**: eliminate `as any` where WindowApi provides types; `noUncheckedIndexedAccess` permanently enabled — all indexed access needs guards
- **IPC events**: register listener in useEffect, return cleanup function. Check event method existence if using optional chaining.
- **useEffect cleanup**: must return function or undefined, never an object
- **Data router**: use `createHashRouter` + `RouterProvider` (NOT legacy `<HashRouter>`) — required for `useBlocker`
- **File-based storage**: use `app.getPath('userData') + JSON` (posFile pattern) for new data — **never add DB tables** (T1105 Schema freeze)
- **Atomic writes**: `fs.writeFileSync(tmpPath, data); fs.renameSync(tmpPath, realPath)` to prevent corruption
- **writeFileSync safety**: all `fs.writeFileSync` must be wrapped in try-catch (disk full/permission errors crash main process)
- **Dead code cleanup**: removing a service requires cleaning ~7 reference points: IPC channel, WindowApi, preload, handler reg, service file, imports, api-client stub
- **Dead storage detection**: if a service writes but nothing reads (R102 pattern), the entire chain is dead — remove it
- **React.lazy named exports**: `.then(m => ({ default: m.NamedExport }))` — default exports work directly with `React.lazy`
- **Dashboard tab state**: `useSearchParams` for URL-persistent state, not local useState
- **Web Workers**: `inlineDynamicImports: true` blocks Worker chunk output → fall back to main-process `setTimeout` yield
- **linkedom in node**: `parseHTML()` type is `Window & typeof globalThis`, cast as `as unknown as { document: Document }` in tsconfigs without DOM lib
- **Service method names**: Renaming a method requires full-text search across the entire codebase. Mismatch = runtime bug (R122 pattern)
- **printToPDF / long operations**: Use `Promise.race([operation, timeout])` to prevent indefinite hang
- **Route merging**: Use `?mode=edit` + `replace` navigation instead of separate `/xxx/edit` routes. Save scroll ratio before switching.
- **Server blog update format**: Always query existing format before `buildBlogUpdate` — never hardcode `'md'`. HTML blogs get format reset silently otherwise (R131).
- **FULLTEXT INDEX columns**: Must match actual table structure. `knowledge_files` is `filename`, not `title` (R130).
- **Worker correlation ID**: Use `Map<number, resolve>` for search promises, NOT single-slot ref. Rapid typing = race condition = UI stuck (R132).
- **Worker onerror**: Every Worker must have `self.onerror` + `worker.onerror` + postMessage try-catch. Crash without handlers = silent failure (R133).
- **buildRestore updated_at**: All restore handlers must set `updated_at = nowMySQL()`. Missing = recovered items sort by deletion time (R134).
- **Server recycle user_id**: recycle_bin DELETE must include `AND user_id = ?`. Otherwise user A can delete user B's entries (R135).

## Phase 20: Architecture Upgrade (R170-R224)

### Wikilink System
- **Dual scanner**: `syncWikilinkRefs` must use BOTH `extractWikilinkRefs` (HTML `<a class="wiki-link">` tags) and `extractWikilinkTitles` (`[[...]]` plain text). Never use only one.
- **Turndown wikilink rule**: Must add custom turndown rule to preserve wikilinks as `[[Title]]` instead of `[Title](url)`. Without it, wikilink data attributes are lost.
- **resolveTitles**: sourceType and sourceId must come from function parameters, never hardcoded (was hardcoded to `sourceId: 0`).
- **WikilinkSuggestion**: Tiptap extension triggers on `[[`, searches via `refSearch`/`noteList`, inserts `<a class="wiki-link">`. Keyboard nav: ArrowDown/Up/Enter/Escape.
- **Ref sync points**: blog:create/update/quickCreate, note:create/update, knowledge:import — all call `syncWikilinkRefs`.
- **Blog delete cleanup**: DELETE FROM refs WHERE source_type='blog' AND source_id=? + target_type='blog' AND target_id=? (R208).
- **Transaction**: syncWikilinkRefs wrapped in BEGIN/COMMIT/ROLLBACK. Use `BEGIN` (not `BEGIN IMMEDIATE` — MySQL incompatible).

### Design System (Phase 20)
- **3 colors only**: blue (active), green (success), red (danger). No amber, no purple.
- **Card style**: `.card` class — 8px radius, border-only, no shadow, hover only changes `border-color`.
- **Animations**: 150ms `border-color`/`color` transitions only. No keyframe effects (fadeUp/edge-breathe removed).
- **Reading themes**: 3 (dark/light/sepia). localStorage migration: `{ forest:'dark', sakura:'light', paper:'sepia', midnight:'dark' }`.

### 3-Column Layout + ContextPanel
- **Sidebar**: Fixed 220px, manual toggle → 48px. Toggle button needs `aria-expanded` + `aria-label` + `Ctrl+B`.
- **ContextPanel**: 280px right panel. `useContextPanel()` hook with `registerTabs(tabs)` → returns cleanup.
- **Ownership token**: sessionId increments on route change. Cleanup checks sessionId match before clearing tabs (R186).
- **Route whitelist**: Only `/blog/:id`, `/blog/:id/edit`, `/knowledge`, `/graph` show the panel. Others degrade to 2-column (R195).
- **Responsive**: Panel hides when `window.innerWidth < 1200` (R200).

### Knowledge Graph (D3)
- **D3 forceSimulation** (D49): `forceLink` + `forceManyBody` + `forceCenter` + `forceCollide`. `sim.tick(N)` cold start, `sim.stop()` in cleanup.
- **graph:getData IPC**: All 6 queries must include `user_id` WHERE clause AND `ORDER BY ... DESC` before `LIMIT`.
- **MiniGraph**: HomePage 200×180 SVG, listens to onBlogRefresh/onKbRefresh/onNoteRefresh (R223).
- **GraphPage**: `/graph` route, drag-to-pan + wheel-zoom + Ctrl-wheel fine-zoom + type filter buttons + hover tooltip.

### MCP Server
- **HTTP**: Express route `POST /api/mcp/message` on port 3456, JWT Cookie auth (requireAuth middleware).
- **stdio**: `src/mcp-server/index.ts` standalone CLI, `npm run mcp` script. No Electron dependency.
- **7 tools**: search, list_blogs, list_knowledge, list_notes, list_tags, get_stats, get_refs.

### MySQL Strict Mode
- **TEXT columns**: Never use `TEXT DEFAULT '...'` in MySQL DDL. MySQL strict mode forbids defaults on TEXT/BLOB. Omit DEFAULT, handle NULL in application code.
- MySQL DDL and SQLite DDL may differ on DEFAULT clauses — check both when adding columns.

### Router Safety
- **404 catch-all**: `{ path: '*', element: <NotFoundPage /> }` with "回到仪表盘" link.
- **HashRouter anchors**: Never `<a href="#xxx">` — HashRouter intercepts as route. Use `<button onClick={...}>` with `scrollIntoView`/`focus()`.
- **errorElement vs ErrorBoundary**: ErrorBoundary wraps each page. errorElement would replace entire layout (including sidebar) — don't use at root level.

### IPC Cross-Module Dependencies
- When importing from another IPC handler (e.g., note.ts imports `syncWikilinkRefs` from blog.ts), verify ALL transitive imports exist.
- Missing import like `dbGet` causes `ReferenceError` → main process silent crash → window disappears instantly.

## Phase 20: Session-Level Patterns (R158-R169)

### abortedRef Must Reset at Load Start (Critical)
- Effect cleanup sets `abortedRef.current = true` → re-render → effect runs → load function called → `!abortedRef.current` is false → all `.then()/.finally()` guards skip → `setLoading(false)` never called → UI stuck on "加载中" forever
- **Fix**: `abortedRef.current = false` as FIRST line of every load function
- Verified: CalendarView L30, NoteListPage L25, DashboardPage L37

### DB Column → Type → Mapper → Migration: 4-Layer Sync
- ALTER TABLE adds column → must update: (1) shared/types.ts interface, (2) shared/handlers/*.ts mapXxxRow(), (3) db/index.ts migrateSqlJsToMySQL() INSERT
- `folder_id`: existed in DB but missing from `Blog`/`KnowledgeFile` types + `mapBlogRow`/`mapKnowledgeRow` → folder counts always 0
- Missing migration columns = permanent data loss (R158: blogs content/tags description)

### note.service Read-Back SELECT user_id
- UPDATE with user_id guard → read-back SELECT must also have `AND user_id = ?`
- R159: `updateNote` L85, `togglePin` L95, L98 — 3 SELECTs with only `WHERE id = ?`

### Server TOCTOU: ById → ByUser Delete
- `buildXxxSelectByUser(id, userId)` → `buildXxxDeleteById(id)` creates TOCTOU
- Fix: `buildXxxDelete(id, userId)` combines ownership + delete

### webApi Event Stub Completeness
- Every `onXxx(cb): () => void` in WindowApi needs `onXxx: () => () => {}` in webApi
- `webApi as WindowApi` blanket cast masks missing stubs → browser mode crashes

### shared/handlers/ Must Be Used (Not Dead Code)
- folder-crud.ts had 3 builders but FolderService + server route both used inline SQL
- Must import + call shared builders in BOTH places

### Full IPC Chain: 4 Layers for New Parameters
- WindowApi → preload → IPC handler → Service — all 4 must add new optional params
- R164: CalendarView date range through entire noteList chain

### Error States on List Pages
- BlogListPage, KnowledgeListPage, DashboardPage catch blocks need `setError(msg)` + retry button UI

### Tiptap: StarterKit Includes Link + Underline
- Don't import them separately — configure via `StarterKit.configure({ link: {...} })`

### FloatingBlogTabs: Need Visible Entry Point
- BlogPreviewPage must have "最小化" button calling `addTab()` from floating-tabs-state.ts

## Phase 21: Editor Evolution + Search + Knowledge + Polish

### MySQL FULLTEXT CJK Search
- **ngram parser required**: `ALTER TABLE ... ADD FULLTEXT INDEX ... WITH PARSER ngram`. Default parser treats contiguous CJK as single token — "面试通关手册" as one token, "面试" never matches.
- **CJK fallback**: `hasCjk(s)` check — if FULLTEXT returns empty AND query has CJK characters, fall back to LIKE `%q%`. Covers pre-migration databases.
- **Migration**: DROP old index → ADD new WITH PARSER ngram. `DROP INDEX ... ON ...` or `ALTER TABLE ... DROP INDEX ...`. Both wrapped in try-catch (idempotent).

### React Hooks Rules
- **Hooks before returns**: ALL `useState`/`useEffect`/`useCallback` must come before ANY `if (x) return` conditional return. Hook count mismatch during re-render = "Rendered more hooks than during the previous render" crash.
- **HMR-safe module state**: `let`/`const` module-level variables reset on Vite HMR. Store in `window.__key` via `getStore()` wrapper with lazy init pattern.

### HashRouter Link Safety
- **`#` prefix required**: Every `<a href>` MUST use `#/blog/N` format. Without `#`, HashRouter doesn't intercept → direct file:// navigation → 404.
- **Affected locations**: `renderWikilinks()`, TiptapEditor wikilink insertContent, any dynamically generated `<a>` tags.

### Wikilink Resolution
- **WikiLinkResolver**: `Map<string, { type: string; id: number }>` — built from `refGetFrom` + `refGetTo` data. Key = `[[title]]` target, value = resolved DB id + type.
- **renderWikilinks signature**: `renderWikilinks(html: string, resolver?: WikiLinkResolver): string`. With resolver → direct links (`#/blog/N`). Without → search links (`#/blog?q=title`).
- **BlogPreviewPage pattern**: useEffect loads both refGetFrom + refGetTo → builds resolver Map → passes to renderWikilinks.

### SplitPane + ContextPanel D84
- **Ownership token**: `{ paneId: string, sessionId: number }` tuple. Per-pane tab storage: `getStore().paneStates` Map.
- **Active pane tracking**: `useSplit()` provides `activePaneId`, `focusPane(id)`. ContextPanel shows tabs for active pane.
- **Pane-aware registerTabs**: Captures `ownerPaneId` at registration. Cleanup checks `getStore().currentPaneId === ownerPaneId`.

### Search Architecture
- **Three-layer CJK**: Unigram (single char, weight 0.25) + Bigram (2-char, weight 0.5) + Word (Intl.Segmenter, weight 1.0). LS key `lbkb_fts_index_v3`.
- **searchDirect()**: Exported from use-search.ts. Worker via `window.__searchWorker`. MySQL via `searchQuery` IPC. D88 unified ref search.
- **Hybrid scoring**: `0.6 × vector_score + 0.4 × keyword_score`. Keyword normalized to [0,1] by dividing by max score before merge.
- **Embedding worker**: `embedding.worker.ts` — `@xenova/transformers` + `Xenova/multilingual-e5-small` (384-dim). IndexedDB for vector cache. Batch writes per transaction.

### Preview Security
- **escHtml() 5-char**: `& <> "'` all escaped. Defined in PreviewService, used in all HTML template injection points.
- **HTML sanitization**: Strip `<script>`, `on*` event handlers, `<iframe>` from user/file content before HTML template injection. Applies to: PDF export bodyHtml, PDF preview text extraction, DOCX mammoth output.
- **iframe sandbox**: Must include `allow-scripts` for interactive previews (XLSX sort/filter, PDF text search JS).

### Database Patterns
- **Multi-step DML transaction**: 2+ UPDATE/DELETE/INSERT → `BEGIN` → try { ops } → `COMMIT` → catch { `ROLLBACK` }. TAG_MERGE pattern.
- **D86 dual-guard path safety**: `path.resolve(workspace, filePath)` → `fs.realpathSync(workspace)` → `startsWith(realWorkspace + sep)`.
- **FULLTEXT ngram migration**: `DROP INDEX` → `ADD FULLTEXT INDEX ... WITH PARSER ngram`. Idempotent via try-catch.

### Type Safety
- **dueDate**: Always `String(s.dueDate).slice(0, 10)` — dueDate may be Date object or null from different code paths.
- **CalendarView date keys**: `const dateStr = \`${year}-${pad(month+1)}-${pad(day)}\`` — zero-padded for consistent Map lookup matching `String(dueDate).slice(0,10)`.
