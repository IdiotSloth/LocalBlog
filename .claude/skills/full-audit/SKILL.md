---
name: full-audit
description: Perform a comprehensive, multi-dimensional code audit of a Node.js/Electron/React/TypeScript full-stack project. Covers security (XSS/CORS/CSRF/injection), data integrity (schema sync/timestamp/dialect isolation), type safety (WindowApi closure/as any density), redundancy (server-main duplication/mapping functions), maintainability (component complexity/coupling/error handling), and robustness (error boundaries/timeouts/race conditions). Also handles Phase specification review (shift-left audit before implementation). Use for full project health checks, pre-release audits, new Phase spec evaluation, or when the user asks for a thorough code review, security review, or architecture assessment.
---

# Full Audit Skill

Perform a systematic, multi-dimensional code audit of this Electron/React/TypeScript project. The audit covers six dimensions: Security, Data Integrity, Type Safety, Redundancy, Maintainability, and Robustness. Findings are organized by priority (P0-P4) and written to `redo.md`.

## Role

You are the Auditor — a 10+ year Node.js/Electron operations and security audit engineer. You do NOT write code (Developer does), do NOT make product decisions (Boss does), and do NOT maintain AGENTS.md/README.md/todo.md. Your sole output is tickets in `redo.md`.

## Audit Workflow

Execute in this exact order:

### Phase 1: Context Loading

1. **Read `AGENTS.md`** — absorb architecture constraints, directory rules, DB constraints, IPC constraints, common pitfalls, and the AI governance framework (four layers: Constrain → Inform → Verify → Correct)
2. **Read `redo.md`** — note all previously reported issues (to avoid duplicates), understand current fix status
3. **Read `src/shared/types.ts`** — understand all data structures
4. **Read `src/shared/ipc-channels.ts`** — note all IPC channel definitions

### Phase 2: Systematic File Review

For efficiency on large codebases, launch **4 concurrent Explore agents** each covering specific dimensions:

| Agent | Dimensions | Focus Files |
|-------|-----------|-------------|
| Agent 1 | **Security + Data Integrity** | server/routes/*, main/services/*, main/db/*, preload/index.ts |
| Agent 2 | **Type Safety** | shared/window-api.ts, preload/index.ts, renderer/lib/api-client.ts, all renderer files |
| Agent 3 | **Redundancy + Maintainability** | server/routes/* vs main/services/*, renderer/features/*, renderer/hooks/* |
| Agent 4 | **Robustness** | renderer/App.tsx, renderer/features/*, renderer/assets/index.css, renderer/lib/api-client.ts |

Each agent checks its assigned dimensions across ALL files. Give each agent the full dimension checklists from below.

### Phase 3: Report Generation

Output a structured audit report and write new findings to `redo.md`.

---

## Six Audit Dimensions

### 1. Security

Check each of these concrete patterns:

| Pattern | How to Check | Severity if Violated |
|---------|-------------|---------------------|
| XSS via `dangerouslySetInnerHTML` | Every `dangerouslySetInnerHTML` call must be wrapped with `DOMPurify.sanitize()`. Every `markdown-it` instance must use `html: false` | 🔴 P0 |
| CORS misconfiguration | `cors()` origin must not be `*` or `true` (allow any origin). Must be an explicit allowlist | 🔵 P4 |
| CSRF protection | Cookie must set `sameSite` and `httpOnly`. JWT tokens must not be stored in localStorage without httpOnly cookie backup | 🔵 P4 |
| SQL injection | All SQL must use parameterized queries (`pool.execute(sql, [params])` or `dbAll(sql, [params])`). Never string-concatenate user input into SQL | 🔴 P0 |
| Path traversal | File operations (`fs.readFile`, `fs.unlink`, `fs.writeFile`) must validate that the resolved path is within the user's workspace directory. Use `path.resolve` + startsWith check | 🔴 P0 |
| Missing auth guard | Every route handler must have `requireAuth` middleware or explicit `if (!userId) return 401`. Every DB query must filter by `user_id` | 🔴 P0 |
| Password exposure | Never log or return raw passwords. Hash must use PBKDF2/bcrypt (not MD5/SHA1). Password hash must never appear in API responses | 🔴 P0 |
| Electron sandbox | `nodeIntegration` must be `false`. `contextIsolation` must be `true`. `sandbox` must be `true`. Preload scripts must be minimal | 🔵 P4 |
| Input validation | All user input (body, query params, URL params) must be validated. Check for zod schema usage or equivalent. Empty strings, negative numbers, oversized payloads must be rejected | 🟠 P1 |
| Rate limiting | Check for rate limiting on auth endpoints (login/register). Absence means brute-force is possible | 🔵 P4 |

### 2. Data Integrity

| Pattern | How to Check | Severity if Violated |
|---------|-------------|---------------------|
| Schema sync | DDL changes must appear in all three locations: `src/main/db/schema.ts` (sql.js), `src/main/db/mysql.ts` (MySQL), `src/server/db.ts` (Server MySQL). Check that column names, types, defaults match | 🔴 P0 |
| Timestamp standardization | All INSERT/UPDATE must explicitly pass `new Date().toISOString()` — never rely on `NOW()` or `datetime('now')` or `CURRENT_TIMESTAMP` DB defaults. Grep for `NOW()`, `CURRENT_TIMESTAMP`, `datetime('now')` in non-schema files | 🟠 P1 |
| Dialect isolation | SQLite-specific syntax (`datetime('now')`, `INSERT OR IGNORE INTO`, `strftime()`, `date('now')`) must go through `toMySQL()` translation in `mysql.ts`. Verify the translation is triggered for ALL such queries | 🔴 P0 |
| Cascade delete correctness | Before DELETE FROM parent table, child table records must be cleaned up OR CASCADE must be configured. Before deleting DB records, disk file paths must be collected (since DB won't have them after deletion) | 🔴 P0 |
| user_id isolation | Every SELECT/UPDATE/DELETE on user-owned data must include `AND user_id = ?` or equivalent. This is defense-in-depth even if the item is looked up by ID first. Shared handler `*ByUser` variants exist specifically for this — using `*ById` in IPC read paths (GET/PREVIEW/OPEN) bypasses ownership check (R145) | 🟠 P1 |
| DB wrapper compliance | All DB calls must use `dbGet`/`dbAll`/`dbRun` (not deprecated `get`/`all`/`run`). Server-side must use `getPool()` + `pool.execute()`. Never import sync functions directly | 🟠 P1 |
| INSERT completeness | INSERT statements must include ALL business-critical columns explicitly — especially `content_text`, `file_size`, `created_at`, `updated_at`. A missing column = a data gap between Electron and Web paths | 🟠 P1 |
| Response format consistency | All API responses must use `{success: boolean, data?: T, error?: string}` format. Raw arrays (`res.json(rows)`) on success but `{success: false, error}` on failure creates inconsistent consumption patterns | 🟡 P2 |
| sql.js→MySQL migration table coverage | When new tables are added to schema.ts, the `migrateSqlJsToMySQL()` function in `db/index.ts` must include migration loops for them. Missing tables = unrecoverable data loss when users upgrade from sql.js to MySQL (R144). Grep for CREATE TABLE in schema.ts, cross-reference against migrateSqlJsToMySQL() INSERT loops | 🟠 P1 |
| sql.js→MySQL migration INSERT column coverage | Even when a table's migration loop EXISTS, the INSERT statement's column list may omit columns added via ALTER TABLE after initial schema creation. Cross-reference each table's ALTER TABLE additions in `db/index.ts` against the migration INSERT column list (R158: blogs missing content/folder_id/series_id/series_name; tags missing description; knowledge_files missing content_text/folder_id) | 🔴 P0 |
| Shared handler ByUser/ById variant audit | IPC read paths (GET, PREVIEW, OPEN_EXTERNAL) must use `*ByUser` shared handler variants. `*ById` variants lack `AND user_id = ?` and should only be used post-ownership-check. Finding: `buildKnowledgeSelect(id)` called from KB_GET/KB_PREVIEW/KB_OPEN_EXTERNAL enabled cross-user access (R145) | 🟠 P1 |
| Service read-back SELECT user_id guard | After UPDATE/DELETE (which have user_id guards), the subsequent read-back SELECT often only uses `WHERE id = ?` without `AND user_id = ?`. This is NOT defense-in-depth — if the write affected 0 rows (wrong user), the read leaks another user's data (R159: note.service updateNote + togglePin) | 🟠 P1 |
| Server delete TOCTOU window | Using `buildXxxSelectByUser` for ownership check followed by `buildXxxDeleteById` (no userId) for execution creates a time-of-check-time-of-use gap. Always use the ByUser variant for both check AND operation (R160: blog.ts + knowledge.ts delete routes) | 🟡 P2 |

### 3. Type Safety

| Pattern | How to Check | Severity if Violated |
|---------|-------------|---------------------|
| WindowApi return types | All methods in `WindowApi` interface must have concrete return types (not `Promise<unknown>`). Count occurrences of `Promise<unknown>` in `src/shared/window-api.ts` | 🟡 P2 |
| Preload type alignment | `src/preload/index.ts` must use `const api: WindowApi = {...}` so TypeScript infers types bidirectionally. Explicit type annotations on preload functions that conflict with WindowApi break the contract | 🔴 P0 |
| api-client type escape | `src/renderer/lib/api-client.ts` must not use `(window as any).api` — this bypasses the WindowApi type. The api export should have proper typing | 🟠 P1 |
| `as any` density | Count `as any` occurrences per file. Files with >3 occurrences are hotspots. Track total across codebase — goal is declining trend | 🟡 P2 |
| Cross-process type imports | Renderer code must never import from `src/main/`. All shared types must live in `src/shared/types.ts`. Check with `grep -r "from '.*main/" src/renderer/` | 🔴 P0 |
| Pre-existing tsc errors | Run `npx tsc --noEmit` and count errors. Separate new errors from pre-existing ones. Pre-existing errors that accumulate indicate CI gap | 🟡 P2 |
| IPC channel hardcoding | `ipcMain.handle('xxx', ...)` calls must use `IPC.XXX` constants, not raw strings. Check with `grep "ipcMain.handle('"` | 🟡 P2 |
| IPC event channel hardcoding | `ipcRenderer.on('xxx', ...)` in preload + `webContents.send('xxx', ...)` in main must use `IPC.EVT_XXX` constants (Phase 16 R210). 6+ event channels historically hardcoded — check both sender and receiver | 🟡 P2 |
| api-client webApi completeness | Every method in `WindowApi` must have a corresponding stub in `api-client.ts`'s `webApi` object. Missing stubs cause `undefined is not a function` in browser mode (R209). Check property name alignment (e.g., `appGetVersion` vs `getVersion`). Event methods (onXxx) are especially easy to miss — missing `onBlogRefresh` stub combined with `return webApi as WindowApi` blanket cast silently crashes browser mode (R163) | 🟠 P1 |
| `as WindowApi` blanket cast audit | `api-client.ts` ending with `return webApi as WindowApi` is a type-safety kill switch — it suppresses all missing-method errors. Remove this cast and let TypeScript enumerate every missing stub for you. If the cast is present, manually cross-reference every WindowApi method against webApi | 🔴 P0 |
| `: any` type annotation density | Count `: any` type annotations (not `as any` casts) in renderer components. Goal: declining trend. Map callbacks, useState generics, filter predicates are common hotspots | 🟡 P2 |
| IPC write-read symmetry | Every new IPC channel that writes persistent data must have a corresponding reader somewhere in the codebase. A channel with only a writer (IPC handler → service.save()) but no reader (page mount → service.get()) is dead storage. Audit each IPC channel by tracing both directions | 🟡 P2 |
| camelCase vs snake_case | Frontend code must not access snake_case DB column names directly. Check for patterns like `row.user_id`, `row.created_at` in renderer files — these should be mapped to camelCase by the service/handler layer | 🟡 P2 |
| Service→IPC→WindowApi type chain alignment | The full chain `service returns Row → IPC handler → WindowApi → renderer` must be type-consistent at every hop. Finding: `reference.service.ts` returned `RefRow`(snake) but `window-api.ts` declared `Reference[]`(camel), making the type system a lie that forced renderer `: any` escapes (R146) | 🟡 P2 |
| React Router compatibility | `useBlocker`/`useBeforeUnload`/`usePrompt` require data router (`createHashRouter` + `<RouterProvider>`). Using these hooks inside legacy `<HashRouter>` throws `invariant` error at runtime. Check `App.tsx` router creation method | 🔴 P0 |

### 4. Redundancy

| Pattern | How to Check | Severity if Violated |
|---------|-------------|---------------------|
| Server/Main logic duplication | Compare each domain's server route vs main service. Identical WHERE-building, sort validation, row mapping, pagination logic in both = duplication. Ideal state: shared handler used by both | 🟡 P2 |
| Multiple mapping functions | Count snake_case→camelCase mapping functions: `mapBlog` (server), `rowToBlog` (service), `mapBlogRow` (shared handler), `mapFile` (server), `rowToFile` (service), `mapFileRow` (shared handler). Goal: one per entity | 🟡 P2 |
| Double sanitization | Same parameter validated/filtered in both caller and callee (e.g., offset/limit parsed before passing to function that also parses them) | 🟢 P3 |
| Dead code | Unused imports, unused functions, unused variables, stale npm scripts (check `package.json` scripts against actually implemented commands) | 🟢 P3 |
| Repeated try-catch templates | Adjacent route handlers with identical `try { ... } catch (err) { return res.json({success: false, error: (err as Error).message}) }` patterns — candidate for wrapper | 🟢 P3 |
| Duplicated SQL fragments | Same WHERE clause, ORDER BY, or LIMIT logic appearing in multiple files for the same domain (e.g., blog search in both search service and blog service) | 🟡 P2 |
| Partial convergence false security | When some domains (blog+knowledge) converge to shared handlers but others (folder/search/tag) remain dual-written, the partially-improved state creates false confidence. Always check which domains remain unconverged after a convergence phase (R151) | 🟡 P2 |
| Shared handler dead code (exists but uncalled) | A shared handler file with exported functions that NO caller imports or uses. The file existing on disk creates false confidence of convergence while actual consumers still use inline SQL. Verify every export is grep-able from at least one consumer in both main/ and server/ (R162: folder-crud.ts 3 builders unused by both FolderService and server route) | 🟡 P2 |
| Duplicate local type definitions vs shared | Components that define local `interface Foo { ... }` for data entities already typed in `shared/types.ts`. Creates maintenance drift: changing the shared type doesn't update the local copy (R166: ContinueWritingPage local DraftItem/RecentBlog/KnowledgeItem) | 🟢 P3 |

### 5. Maintainability

| Pattern | How to Check | Severity if Violated |
|---------|-------------|---------------------|
| Component useState count | Count `useState` calls per component. >10 = warning (complex state), >20 = problem (needs reducer/state machine). Check `BlogEditorPage.tsx` especially | 🟢 P3 |
| Missing state management | Components with >5 useState that manage related state (e.g., form fields, async operation status, list+selection) should use useReducer or Zustand store | 🟢 P3 |
| Directory constraint violations | File in wrong directory per AGENTS.md directory table. React components in `src/main/`, Node API in `src/renderer/`, business logic in `src/preload/`, runtime code in `src/shared/` | 🔴 P0 |
| Module coupling | When `src/shared/types.ts` changes, count files that break. High coupling (>10 files) means types are too broad or shared types need splitting | 🟡 P2 |
| Bare `catch {}` | Empty catch blocks swallow errors. Every catch must have at least `console.error(e)` or a comment explaining why it's intentionally empty (e.g., idempotent migration) | 🟠 P1 |
| console.log as only logging | Main process uses only `console.log` which is invisible in packaged app. Critical errors need a proper logging mechanism or IPC notification to renderer | 🟢 P3 |
| IPC domain sprawl | Same domain's handlers split across multiple IPC files (e.g., tag:set-blog in blog.ts, tag:set-file in knowledge.ts). Related handlers should be co-located | 🟢 P3 |
| Test coverage gaps | Service modules with 0 tests. Each service CRUD function should have at least basic test coverage | 🟢 P3 |
| State machine type residuals | After useState→useReducer migration, check that all state fields, action payloads, and map/forEach callbacks use concrete types (not `any`). The DraftRow/DraftItem types should be exported to `shared/types.ts` for cross-component reuse | 🟢 P3 |

### 6. Robustness

| Pattern | How to Check | Severity if Violated |
|---------|-------------|---------------------|
| Missing error boundaries | React app should have at least one `ErrorBoundary` component wrapping page content. Uncaught render errors crash the whole UI | 🟡 P2 |
| Missing loading/empty/error states | Every data-fetching page/component must handle: loading (spinner/skeleton), empty (helpful message), error (retry button). Count pages missing any of these states. New pages are the highest-risk — they often have loading+empty states but catch blocks only `console.error` without setting UI error state (R149, R168: BlogListPage/KnowledgeListPage/DashboardPage all silently swallowed errors) | 🟡 P2 |
| Promise chain missing .catch() | `.then(r => { ...; setLoading(false) })` without `.catch()` — any network error or thrown exception bypasses `setLoading(false)`, leaving UI permanently in loading state (R165: BlogPreviewPage). Also check .finally() as safer alternative | 🟡 P2 |
| Data query scope mismatch (UI vs API) | Component displays "current month" but passes no date range to the API query — loads ALL data. Verify UI display scope (date range, pagination, category filter) matches the actual IPC request parameters (R164: CalendarView fetched all schedule notes regardless of displayed month) | 🟡 P2 |
| No timeout on long operations | PDF export, web scraping, file import — operations that can hang must have timeout + AbortController. Check for `setTimeout` or `AbortController` usage | 🟡 P2 |
| useEffect cleanup missing | useEffect with subscriptions, intervals, or async operations must return a cleanup function. Check for `setInterval` without corresponding `clearInterval` in cleanup | 🟡 P2 |
| Graceful degradation | Web (browser) stubs in `api-client.ts` must return `{success: false, error: '网页版不支持XXX'}` — not undefined, not a thrown error, not a silently resolved Promise | 🟢 P3 |
| File operation error handling | Every `fs.readFileSync`/`fs.writeFileSync`/`fs.unlinkSync` must be in try-catch or have explicit exists check. File operations fail for many reasons (permissions, locks, missing files) | 🟠 P1 |
| Event listener cleanup | Every `ipcRenderer.on()` must have a corresponding `ipcRenderer.removeListener()` or return cleanup function. Check preload event handlers. Also check `addEventListener` in click handlers — if a listener is registered imperatively inside a click handler (not useEffect), component unmount during active listening leaks both the listener and any associated timeout | 🟡 P2 |
| Debounce on frequent writes | sql.js `saveToDisk()` (which writes the entire DB to disk) must be debounced. Check `db/index.ts` for debounce timer logic | 🟡 P2 |
| CSS variable theme coverage | Every new CSS variable defined in `:root` (dark theme) must have a corresponding override in `.light` (light theme). A variable defined only in `:root` leaves the light theme using dark-mode colors. Check `index.css` for variables present in `:root` but absent in `.light` | 🟢 P3 |
| Spec-implementation gap | For tasks with explicit spec constraints (e.g., "不加载全文", "亮/暗色自适应"), verify the implementation matches. Flag mismatches even if they don't cause runtime errors — the gap between spec intent and implementation is itself a finding | 🟢 P3 |
| Functional coverage completeness | For selector/whitelist-based features (e.g., TOC extraction, file type mapping), verify the coverage set is not artificially narrow. 4-framework selector list missing 7 common frameworks is a spec-implementation gap (R128) | 🟡 P2 |
| Interaction placement vs feature value | Verify critical UI entry points are placed where users naturally encounter them. A feature whose core value is "instant access" but whose button is hidden at page bottom is a design-level implementation defect (R129) | 🟠 P1 |
| useEffect cleanup return type | React Strict Mode double-invoke unmasks non-function cleanup values. `useEffect(() => { return someObject }, [])` causes `destroy is not a function` → ErrorBoundary crash (R126). Defensive pattern: `typeof cleanup === 'function'` guard | 🔴 P0 |
| Server route user_id isolation | `requireAuth` middleware verifies identity but does NOT verify resource ownership. Server routes must add `AND user_id = ?` to UPDATE/DELETE or do a pre-check `SELECT ... WHERE id = ? AND user_id = ?` (R203-R206) | 🟠 P1 |
| Shared handler hardcoded values | When CRUD SQL is extracted to shared handlers, callers must not pass hardcoded literals for business-variable fields. `buildBlogUpdate(..., 'md')` silently resets HTML blogs to MD (R131). Check all shared handler call sites for format/status/type parameters that should be dynamic | 🟠 P1 |
| DDL migration error silencing | Empty `catch {}` blocks around ALTER TABLE with misleading comment "migration already applied" silently swallow "column doesn't exist" errors (R130). Check all DDL migration catch blocks: at minimum `console.warn` the error, and distinguish index-exists (ignore) vs column-not-found (alert) | 🟠 P1 |
| Worker lifecycle completeness | Worker threads must have `worker.onerror` and `worker.onmessageerror` handlers. Without onerror, Worker crashes are invisible and leave UI permanently in loading state (R133). Check every `new Worker()` site | 🟡 P2 |
| Promise concurrency pattern (single-ref vs Map) | Using a single `useRef` to store a pending Promise resolver is inherently racy. Concurrent requests overwrite the ref, causing mismatched responses and hung Promises (R132). In postMessage/MessageChannel patterns, use `Map<correlationId, resolve>` + incrementing counter | 🟡 P2 |
| Type narrowing across async closure boundaries | TypeScript cannot narrow `number \| null` across async function boundaries even after early-return guard. `if (!x) return;` before defining `async function init()` does NOT narrow `x` inside `init()`. Capture narrowed value: `const x2 = x;` before async function definition (R141) | 🟡 P2 |
| Shared handler migration completeness | When a domain's CRUD SQL moves to shared handlers, mapping functions (mapFile/rowToFile), type-detection helpers (detectFileType/typeMap), and validation logic should also be unified — not just SQL builders. Check for duplicate mappers/detectors in server routes vs main services (R139) | 🟡 P2 |
| HTML tags in tokenizer input | Worker/segmenter tokenizers that receive raw HTML input will index markup tokens (`<div>`, `class`, etc.), polluting the inverted index. Check that text is stripped of HTML tags before tokenization: `text.replace(/<[^>]*>/g, '')` (R140) | 🟢 P3 |

---

## Output: Audit Report Format

After completing the review, output a report with these sections:

### 1. Audit Statistics Table

```
| Dimension | Items Checked | Passed | Issues Found |
|-----------|--------------|--------|--------------|
| Security | ... | ... | ... |
| Data Integrity | ... | ... | ... |
| Type Safety | ... | ... | ... |
| Redundancy | ... | ... | ... |
| Maintainability | ... | ... | ... |
| Robustness | ... | ... | ... |
```

### 2. Layer-by-Layer Results

Organize by AGENTS.md four-layer governance framework:
- **Layer 1 (Constrain)**: directory placement, DB API usage, IPC format
- **Layer 2 (Inform)**: module coupling, context signals
- **Layer 3 (Verify)**: tsc, Biome, tests, build
- **Layer 4 (Correct)**: fix patterns, error mode→fix mapping

### 3. Health Scores

Rate each dimension 1-10, with a composite score:

```
| Dimension | Score | Key Factors |
|-----------|-------|-------------|
| Security | X/10 | ... |
| Data Integrity | X/10 | ... |
| Type Safety | X/10 | ... |
| Redundancy | X/10 | ... |
| Maintainability | X/10 | ... |
| Robustness | X/10 | ... |
| Composite | X.X/10 | ... |
```

### 4. Architecture Trend

Compare key metrics with previous audit (if data available):

```
| Metric | Previous | Current | Trend |
|--------|----------|---------|--------|
| bare catch {} | N | M | ↑/↓/→ |
| as any count (renderer) | N | M | ↑/↓/→ |
| as any count (shared+preload) | N | M | ↑/↓/→ |
| : any type annotations (renderer) | N | M | ↑/↓/→ |
| Record<string,unknown> in WindowApi | N | M | ↑/↓/→ |
| Preload tsc errors | N | M | ↑/↓/→ |
| Promise<unknown> in preload | N | M | ↑/↓/→ |
| Duplicated domains | N | M | ↑/↓/→ |
| DI shared handlers | N | M | ↑/↓/→ |
| Pre-existing tsc errors (node) | N | M | ↑/↓/→ |
| Pre-existing tsc errors (web) | N | M | ↑/↓/→ |
| Test coverage (modules) | N | M | ↑/↓/→ |
| IPC channels (total, handle) | N | M | ↑/↓/→ |
| IPC event channels (EVT_) | N | M | — |
| IPC write-read symmetry | N | M | — |
| CSS variable theme coverage | N | M | — |
| noUncheckedIndexedAccess | enabled? | enabled? | — |
| Server user_id isolation gaps | N | M | — |
| Shared handler coverage (domains) | N | M | — |
| Shared handler completeness (SQL+mappers) | N | M | — |
| FTS5 index correctness (MySQL FULLTEXT) | — | — | — |
| Worker error handling coverage | N | M | — |
| Promise concurrency safety | N | M | — |
| P0+P1+P2+P3 total count | N | M | ↓ |
| DDL migration catch block safety | N | M | — |
| sql.js→MySQL migration table coverage | N | M | — |
| Service→WindowApi type chain alignment | N | M | — |
| Shared handler ByUser/ById variant usage correctness | N | M | — |
| Partial convergence domains (remaining dual-write) | N | M | — |
| New page error-state completeness | N | M | — |
| AbortedRef coverage (new async components) | N | M | — |
| `: any` type annotation count (renderer) | N | M | ↓ |
| Promise-chain .catch() coverage | N | M | — |
| Data query scope alignment (UI vs API params) | N | M | — |
| api-client webApi event stub completeness | N | M | — |
| Shared handler dead code count | N | M | ↓ |
| Duplicate local types vs shared types | N | M | — |
| Migration INSERT column coverage (vs ALTER TABLE) | N | M | — |
| Service read-back SELECT user_id guard | N | M | — |
```

### 5. New Findings Summary

List all new findings with priority, file location, and one-line description:
- P0 🔴: N items
- P1 🟠: N items
- P2 🟡: N items
- P3 🟢: N items
- P4 🔵: N items

### 6. Recommended Priority

Ordered list for Boss review, with estimated hours and rationale.

---

## Writing Tickets to redo.md

Each finding must include:
- **Priority tag** (🔴 P0 / 🟠 P1 / 🟡 P2 / 🟢 P3 / 🔵 P4)
- **Descriptive title**
- **File location** with line numbers: `path:line`
- **3-10 lines of problem code** (actual code snippet)
- **Concrete consequence**: what happens at runtime, which user flow breaks
- **Fix suggestion**: show the corrected code

Format for redo.md entry:
```markdown
| R## | **[P0/P1/P2/P3]** 问题标题 — 具体描述 | `文件路径:行号` | 📋 | |
```

---

## Important Constraints

1. **Do NOT modify code** — you are an auditor, not a developer. Report findings, don't fix them.
2. **Do NOT modify AGENTS.md, README.md, or todo.md** — those are Boss/Developer territory.
3. **Only write to redo.md** — your sole output artifact is tickets in redo.md.
4. **Do NOT repeat known issues** — always read redo.md first to avoid duplicates.
5. **Be specific, not general** — "`blog.service.ts:244` has `INSERT OR IGNORE` which fails in MySQL without `toMySQL()` translation" is actionable. "Code quality could be improved" is not.
6. **Respect Boss scope** — if directed to audit a specific module, don't expand scope unless you find a P0 issue.
7. **Focus on correctness, safety, and architecture compliance** — not code style preferences.
8. **One ticket per distinct issue** — don't bundle unrelated problems into one ticket.

---

## Phase Spec Review (Shift-Left Audit)

When the Boss has written a new Phase in `todo.md` but code has NOT been written yet, perform a specification review BEFORE implementation starts. This catches constraint violations at design time rather than after code is written.

### Spec Review Workflow

1. **Read the Phase spec** in `todo.md` — understand each task's scope, constraints, and dependencies
2. **Check against AGENTS.md** — every keyword that implies architecture change:
   - "表" / "table" → Schema change (T1105 freeze violation?)
   - "settings JSON" / "store" → Where is data persisted? localStorage? userData file? DB table?
   - "新依赖" → Zero-dependency promise still true?
   - "新 IPC" → Channel added to ipc-channels.ts + preload + handler?
3. **Identify spec gaps** — vague phrases that are not implementable:
   - "优化掉" → What specifically?
   - "做个窗口" → What window? What features?
   - "改进" → What metric improves? How measured?
4. **Cross-reference tasks** — do two tasks touch the same file? → Suggest serial ordering
5. **Output D-numbered proposals** for each decision needed

### D-Number Format

```
| D## | 问题描述 | 选项 A（含工时/风险） | 选项 B（含工时/风险） | 建议 |
```

### Spec Review vs Implementation Audit

| | Spec Review | Implementation Audit |
|---|-------------|---------------------|
| When | Before code | After code |
| Input | todo.md task descriptions | git diff files |
| Output | D-numbered decisions | R-numbered tickets |
| Typical catch | "settings 表" violates Schema freeze | `useBlocker` crashes in `<HashRouter>` |
