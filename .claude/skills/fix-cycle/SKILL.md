---
name: fix-cycle
description: Developer (码农) fix cycle for the Local Blog KB project. Use when processing Auditor findings from redo.md, implementing tasks from todo.md, or responding to audit reports. Triggers on: "fix redo", "fix the bugs", "process redo items", "开始修 bug", "继续修复", "开始 phase N", audit result responses, or any instruction to address redo.md/todo.md issues.
---

# Fix Cycle — Developer Workflow

Core loop for processing Auditor findings (R items) from redo.md and implementing tasks (T items) from todo.md.

## Workflow

### Step 1: Read redo.md First

Read `redo.md` and scan the `## 当前待修复` section. Identify all items with 📋 status.

**Iron rule**: If 🔴 P0 items exist, fix them ALL before starting any new feature work.

Sort by priority:
- 🔴 P0 — blocking stability/security/crash, must fix first
- 🟡 P1 — code quality / minor functionality / type safety
- 🟢 P2/P3 — low priority, can defer

### Step 2: Fix in Order

For each 📋 item, starting from the highest priority:

1. **Read the problem description** — understand the root cause from the redo.md entry (includes file paths + line numbers)
2. **Locate the files** — verify the paths are still valid (files may have moved since Auditor wrote the entry)
3. **Write the fix** — modify code following project constraints (see `references/constraints.md`)
4. **Clean up all references** — if removing code, remove IPC channel + WindowApi + preload + api-client stubs + handler registration
5. **Build to verify** — `npm run build` must pass before proceeding to next item
6. **Batch independent fixes** — parallel edits in separate files are OK; sequential edits in the same file must be serial

### Step 3: Update redo.md

After each fix, update the redo.md entry:
- Change status from 📋 to ✅ (or ⏭ if deferred)
- Add a one-line fix description under `**Developer**: <what changed, why>`
- Keep the `**Auditor 验证**:` field blank (Auditor fills it later)

### Step 4: Implement Tasks (only when redo P0 is clear)

When redo.md has no P0 blocking items, read `todo.md` for 📋 tasks:

1. **Read the task spec** — 实现步骤, 技术方案, 测试用例, Auditor 裁决
2. **Check Auditor rulings** — tasks may have Dxx constraints (方案 A/B, scope limits, storage decisions)
3. **Implement** — follow spec exactly; don't expand scope
4. **Build after each subtask** — `npm run build` must pass
5. **Report unknowns** — if spec is unclear, write `**Developer 备注**` and pause; don't guess

### Step 5: Verify

After all fixes/tasks:
```bash
npm run build 2>&1
npm run test 2>&1
```

- Build: must show all three `✓ built` lines (main + preload + renderer)
- Test: must show `27 passed` (3 files)
- Module counts: note main/preload/renderer module counts for reports
- If build or test fails, debug before marking items as done

### Step 6: Report

Output a summary table:

```
| # | 等级 | 问题 | 修复 | 文件 |
|---|------|------|------|------|
| Rxx | 🔴 | ... | ✅ fixed — one-line summary | path:line |
构建: ✅ (X main + Y preload + Z renderer) | 测试: 27/27 pass
```

## Phase 14 Patterns (proven through 2 audit cycles)

**File-based storage**: When spec says "no Schema change" (T1105 freeze), use `app.getPath('userData') + JSON` (reuse `posFile()` pattern from pet.ts). Examples: `shortcuts.json`, `reading-progress.json`.

**Atomic writes**: Write to `path.tmp` then `fs.renameSync(tmp, path)` to prevent corruption on crash.

**Data router**: Use `createHashRouter` + `RouterProvider` (not legacy `<HashRouter>`) for `useBlocker` support.

**Type convergence**: `window.api.xxx()` returns typed `ApiResponse<T>` already — remove intermediate `const r = d as any` casts. The type system works.

**Dead code removal**: If removing a service/IPC/file, clean up ALL 5-7 reference points (channel def, WindowApi, preload, handler registration, api-client stub, imports).

**React.lazy named exports**: Use `.then(m => ({ default: m.ComponentName }))` pattern for named-export lazy loading.

**Dashboard tabs**: Use `useSearchParams` for URL-persistent tab state, not local useState.

## Project Quick Reference

**Start verification:** `npm run build && npm run test`

**Key files to know:**
- `redo.md` — Auditor findings (read/write)
- `todo.md` — task specs (read, update status only)
- `src/shared/types.ts` — all data structures + interfaces
- `src/shared/ipc-channels.ts` — IPC channel names (add here first)
- `src/shared/window-api.ts` — WindowApi interface
- `src/preload/index.ts` — contextBridge bindings
- `src/main/ipc/index.ts` — handler registration hub
- `src/renderer/lib/api-client.ts` — web-side stubs (add desktop-only stubs here)
- `src/shared/achievements.ts` — achievement definitions
- `src/shared/shortcuts.ts` — shortcut defaults

**Developer boundaries (from prompts/developer.md):**
- ✅ Can update: redo.md fix status, todo.md task status + Developer 备注
- ❌ Cannot modify: AGENTS.md, README.md (Boss-owned)
- ❌ Cannot modify: task descriptions, priorities, implementation steps in todo.md

**Adding new IPC channels** (exactly 5-7 files must change):
1. `src/shared/ipc-channels.ts` — add channel constant
2. `src/shared/window-api.ts` — add typed method signature
3. `src/preload/index.ts` — wire `ipcRenderer.invoke`
4. `src/main/ipc/xxx.ts` — handler implementation
5. `src/main/ipc/index.ts` — register handler
6. `src/main/services/xxx.service.ts` — business logic (if new)
7. `src/renderer/lib/api-client.ts` — web stub

For detailed constraints (DB patterns, IPC format, datetime handling, CSS tokens, new patterns), read `references/constraints.md`.
