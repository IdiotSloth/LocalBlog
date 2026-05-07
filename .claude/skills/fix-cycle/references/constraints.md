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
