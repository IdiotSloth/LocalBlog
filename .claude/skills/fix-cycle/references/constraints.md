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
| src/shared/ | Types, constants, handlers | Runtime code |
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

## Server-Side Constraints
- **user_id isolation**: All write operations (UPDATE/DELETE/INSERT) must include `AND user_id = ?` or ownership check
- **Read operations**: Covered by `requireAuth` middleware (`WHERE user_id = ?`)
- **File storage**: `server/uploads/{userId}/` — subdirectory per user
- **File upload**: multer middleware, 10MB limit, type whitelist

## Frontend
- **Routing**: createHashRouter + RouterProvider + React.lazy + Suspense + ErrorBoundary
- **Route merging**: Use `?mode=edit` / `?tab=xxx` query params instead of separate routes. Navigate with `{replace: true}`.
- **CSS**: use `var(--token-name)` only — never hardcode colors
- **XSS**: all `dangerouslySetInnerHTML` must go through `DOMPurify.sanitize()`
- **a11y**: form inputs need `placeholder`, `title`, or `aria-label`

## CSS Tokens (complete list)
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
| `--accent-blue` | Blue accent (links, active) |
| `--accent-green` | Green accent (success, local-first) |
| `--accent-amber` | Amber accent (warnings, tips) |
| `--accent-red` | Red accent (danger, delete) |
| `--accent-purple` | Purple accent (code, prose) |
| `--text-on-accent` | Text on accent-colored backgrounds |
| `--font-mono` | Monospace font family |
| `--color-bg-card` | Card background variant (Tailwind mapped) |
| `--color-bg-base` | Base background variant (Tailwind mapped) |
| `--color-bg-sidebar` | Sidebar background variant (Tailwind mapped) |
| `--shadow-card` | Card shadow (dark + light override) |
| `--shadow-dropdown` | Dropdown shadow (dark + light override) |
| `--shadow-hover` | Hover shadow (dark + light override) |
| `--heatmap-0` | Heatmap empty cell |
| `--heatmap-1` ~ `--heatmap-4` | Heatmap intensity levels (theme-adaptive) |

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
