---
name: fix-cycle
description: Developer (码农) fix cycle for the Local Blog KB project. Use when processing Auditor findings from redo.md — read pending items (📋), fix bugs in priority order (🔴P0 → 🟡P1 → 🟢P2), update redo.md status to ✅, and verify with build + tests. Also use when the user says "fix redo", "fix the bugs", "process redo items", "开始修 bug", "继续修复", or any instruction to address redo.md issues.
---

# Fix Cycle — Developer Workflow

Core loop for processing Auditor findings (R items) from redo.md and implementing tasks from todo.md.

## Workflow

### Step 1: Read redo.md

Read `redo.md` and scan the `## 当前待修复` section. Identify all items with 📋 status. Sort by priority:
- 🔴 P0 — blocking stability/security, must fix first
- 🟡 P1 — code quality / minor functionality
- 🟢 P2/P3 — low priority, can defer

### Step 2: Fix in Order

For each 📋 item, starting from the highest priority:

1. **Read the problem description** — understand the root cause from the redo.md entry
2. **Locate the files** — the redo.md entry includes file paths and line numbers
3. **Write the fix** — modify code following project constraints (see `references/constraints.md`)
4. **Build to verify** — `npm run build` must pass before proceeding to next item
5. **Batch independent fixes** — parallel edits in separate files are OK; sequential edits in the same file must be serial

### Step 3: Update redo.md

After each fix, update the redo.md entry:
- Change status from 📋 to ✅ (or ⏭ if deferred)
- Add a one-line fix description under `**Developer**: <what changed, why>`
- Keep the `**Auditor 验证**:` field blank (Auditor fills it later)

### Step 4: Verify

After all fixes:
```bash
npm run build 2>&1 | grep -E "built|error|ERROR"
npm run test 2>&1
```

- Build: must show all three `✓ built` lines (main + preload + renderer)
- Test: must show `27 passed` (3 files)
- If build or test fails, debug before marking items as done

### Step 5: Report

Output a summary table:

```
| # | 等级 | 问题 | 修复 |
|---|------|------|------|
| Rxx | 🔴 | ... | ✅ fixed — one-line summary |
```

## Project Quick Reference

**Start verification:** `npm run build && npm run test`

**Key files to know:**
- redo.md — Auditor findings (read/write)
- todo.md — task specs (read, update status only)
- src/shared/types.ts — all data structures
- src/shared/ipc-channels.ts — IPC channel names
- src/shared/window-api.ts — WindowApi interface

**Developer boundaries (from prompts/developer.md):**
- ✅ Can update: redo.md fix status, todo.md task status + Developer 备注
- ❌ Cannot modify: AGENTS.md, README.md (Boss-owned)

For detailed constraints (DB patterns, IPC format, datetime handling, CSS tokens), read `references/constraints.md`.
