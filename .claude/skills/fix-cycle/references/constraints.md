# Project Constraints — Quick Reference

## Architecture
- **Electron 41** + React 19 + TypeScript + Vite 7
- Three processes: Main (Node.js) + Preload (contextBridge) + Renderer (React)
- Express 5 web server on port 3456 (optional)

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
- **Schema changes**: sync sql.js DDL (schema.ts) + MySQL DDL (db-schema-mysql.ts) + sql.js migrations (db/index.ts)

## IPC
- **Channel names**: defined in `src/shared/ipc-channels.ts` only
- **Response format**: `{ success: boolean, data?: T, error?: string }`
- **WindowApi**: typed interface in `src/shared/window-api.ts` — update preload + WindowApi together
- **Events (main→renderer)**: expose via preload as `onXxx(cb): () => void` unsubscribe pattern

## Frontend
- **Routing**: HashRouter + React.lazy + Suspense
- **CSS**: use `var(--token-name)` only — never hardcode colors
- **Tokens**: `--text-primary`, `--text-secondary`, `--text-muted`, `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--color-primary`, `--border-default`, `--accent-amber`, `--accent-red`, `--text-on-accent`, `--font-mono`, `--color-bg-card`, `--color-bg-base`
- **XSS**: all `dangerouslySetInnerHTML` must go through `DOMPurify.sanitize()`
- **a11y**: form inputs need `placeholder`, `title`, or `aria-label`

## Common Patterns
- **Error handling**: never bare `catch {}` — use `catch (e) { console.error('[Context]', e); }`
- **DB timestamps**: use `nowMySQL()` for all INSERT/UPDATE `created_at`/`updated_at`
- **Pagination**: use `sanitizePagination(offset, limit)` from `src/shared/pagination.ts`
- **Type safety**: eliminate `as any` where WindowApi provides types; prefer `const r = await window.api.xxx()` without intermediate casts
- **IPC events**: register listener in useEffect, return cleanup function
- **Data router**: use `createHashRouter` + `RouterProvider` (NOT legacy `<HashRouter>`) — required for `useBlocker`
- **File-based storage**: use `app.getPath('userData') + JSON` (posFile pattern) for new data — **never add DB tables** (T1105 Schema freeze)
- **Atomic writes**: `fs.writeFileSync(tmpPath, data); fs.renameSync(tmpPath, realPath)` to prevent corruption
- **Dead code cleanup**: removing a service requires cleaning ~7 reference points: IPC channel, WindowApi, preload, handler reg, service file, imports, api-client stub
- **React.lazy named exports**: `.then(m => ({ default: m.NamedExport }))` — default exports work directly with `React.lazy`
- **Dashboard tab state**: `useSearchParams` for URL-persistent state, not local useState
- **Web Workers**: `inlineDynamicImports: true` blocks Worker chunk output → fall back to main-process `setTimeout` yield

## New IPC Channel Checklist (7 files)
1. `src/shared/ipc-channels.ts` — channel constant
2. `src/shared/window-api.ts` — typed method signature
3. `src/preload/index.ts` — `ipcRenderer.invoke` wiring
4. `src/main/ipc/xxx.ts` — handler implementation (new or existing file)
5. `src/main/ipc/index.ts` — `registerXxxHandlers()` call
6. `src/main/services/xxx.service.ts` — business logic (if new)
7. `src/renderer/lib/api-client.ts` — web stub (return `{ success: false, error: '...' }`)

## CSS Tokens (complete list)
| Token | Usage |
|-------|-------|
| `--text-primary` | Primary text color |
| `--text-secondary` | Secondary/body text |
| `--text-muted` | Muted/hint text |
| `--text-placeholder` | Input placeholders |
| `--bg-primary` | Page background |
| `--bg-secondary` | Card/sidebar background |
| `--bg-tertiary` | Subtle element background |
| `--border-default` | Default borders |
| `--color-primary` | Primary accent (brand color) |
| `--accent-blue` | Blue accent (links, active) |
| `--accent-green` | Green accent (success, local-first) |
| `--accent-amber` | Amber accent (warnings, tips) |
| `--accent-red` | Red accent (danger, delete) |
| `--text-on-accent` | Text on accent-colored backgrounds |
| `--font-mono` | Monospace font family |
| `--color-bg-card` | Card background variant |
| `--color-bg-base` | Base background variant |
| `--heatmap-0` | Heatmap empty cell |
| `--heatmap-1` ~ `--heatmap-4` | Heatmap intensity levels (theme-adaptive) |
