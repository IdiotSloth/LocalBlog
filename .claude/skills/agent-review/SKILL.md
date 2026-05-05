---
name: agent-review
description: Agent-to-Agent code review pipeline. Invoke after implementing features, before committing, or when user asks for review. Launches architecture boundary checks, Biome lint, TypeScript validation, and a full build, then cross-references changes against AGENTS.md constraints and common pitfalls.
---

# Agent-to-Agent Review Skill

Automated code review pipeline for the Local Blog KB project. Verifies architecture compliance, code quality, type safety, and build integrity.

## Trigger

Invoke after any implementation task, before `git commit`, or when the user asks for a code review.

## Review Pipeline

Execute each step in order. Stop at first failure and report.

### Step 1: Architecture Boundary Check

Verify no directory constraint violations from `AGENTS.md §1`:

| Rule | Check |
|------|-------|
| `src/main/` no React/JSX | `grep -r "from 'react'" src/main/` must return empty |
| `src/renderer/` no Node API | `grep -r "from 'electron'" src/renderer/` must return empty; `grep -r "require('fs')\|require('path')" src/renderer/` only in lib/ |
| `src/preload/` minimal API only | Only `contextBridge`, `ipcRenderer` imports allowed |
| `src/shared/` no runtime deps | No `fetch`, `fs`, `useEffect`, `electron` imports |
| `src/server/` no Electron API | No `BrowserWindow`, `ipcMain` imports |
| No direct sync DB calls | `grep -r "from '../db'" src/main/services/` must be empty (use `dbGet`/`dbAll`/`dbRun`) |
| IPC channels defined | All `ipcMain.handle('xxx',` strings in `src/main/ipc/` must exist in `src/shared/ipc-channels.ts` |

### Step 2: Biome Check

```bash
npx biome check src/ tests/ --max-diagnostics=50
```

Fixable issues: `npx biome check --write src/ tests/`

### Step 3: TypeScript Validation

```bash
npx tsc -p tsconfig.node.json --noEmit
npx tsc -p tsconfig.web.json --noEmit
```

### Step 4: Build

```bash
npm run build
```

Output must show zero errors across main, preload, and renderer.

### Step 5: AGENTS.md Compliance

Read `AGENTS.md` and verify changes comply with:
- **Directory constraints** (§1.1) — no cross-process imports
- **Database API constraints** (§1.2) — async wrappers, parameterized queries, no sync calls
- **IPC channel constraints** (§1.3) — channels defined, response format `{success, data?, error?}`
- **CSS design token constraints** (§1.4) — no hardcoded colors, use `var(--token)`

### Step 6: Common Pitfall Check

Verify changes against `AGENTS.md` 常见陷阱 list:

- `paths.ts` functions are async — all callers use `await`
- MySQL `LIMIT ? OFFSET ?` is inlined, not parameterized
- `INSERT OR IGNORE` handled in `toMySQL()` translation
- Schema changes synced to 3 DDL locations + sql.js ALTER TABLE migration
- `req.userId` guarded with `if (!userId) return res.status(401)` pattern
- `setContent` in Tiptap uses `isSettingRef` guard against infinite loop
- `datetime('now')` replaced with `new Date().toISOString()` for timezone safety
- `permanentlyDeleteItem` deletes files before DB records

### Step 7: Test (Optional)

```bash
npm run test
```

## Report Format

```
Agent Review Report
===================
Architecture: ✅ pass / ❌ N violations
Biome: ✅ pass / ❌ N errors + N warnings
TypeScript: ✅ pass / ❌ N errors
Build: ✅ pass / ❌ N errors
AGENTS.md: ✅ compliant / ❌ N issues
Pitfalls: ✅ clear / ❌ N issues
Tests: ✅ N/N pass / ❌ N failures

Details:
[file:line] Rule violated — fix suggestion
```

## Rules

- **Report only** — do not automatically fix unless user explicitly asks
- **Be specific** — every violation must include file path, line number, and the relevant AGENTS.md rule
- **Stop on first failure** — fix blockages before proceeding to next step
