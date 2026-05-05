---
name: sync-docs
description: After any implementation task or document change, auto-sync README.md and todo.md to reflect the latest project state. Also detects documentation drift (stale claims vs actual code), prunes outdated content, and cross-references consistency across AGENTS.md, README.md, and todo.md. Invoke after each task completion, bug fix, or feature delivery.
---

# Sync Docs Skill

Combined documentation synchronization and drift detection. Replaces two former skills (sync-docs, doc-gardening).

## Trigger

Invoke after completing any implementation task, bug fix, or feature addition. Also invoke periodically or when documentation looks outdated.

## Part 1: Synchronize Documentation State

### 1. Build Verification

```bash
npm run build 2>&1
```

If build fails, record the error in todo.md's known issues section instead of marking phases complete.

### 2. Gather Current State

Count from actual code:
- Main process modules: `src/main/` TypeScript files
- Preload modules: `src/preload/` TypeScript files
- Renderer modules: Vite build output module count
- Test pass/fail: `npm run test` results
- Services: files in `src/main/services/`
- IPC handlers: registered channels in `src/main/ipc/index.ts`
- Server routes: files in `src/server/routes/`

### 3. Update Documents

Update README.md:
- Replace `构建状态` line with current build result (never append — always replace)
- Update Phase completion status table
- Update file counts in directory structure

Update todo.md:
- Refresh `最后更新` timestamp
- Update Phase status from 📋 to ✅ when all tasks complete
- Update task checkboxes

### 4. Sync Format

Use marker comments to delimit auto-generated regions:
```markdown
<!-- sync-start -->
> 构建状态: ✅ 通过 (XXX modules) | 测试: X/X | 最后同步: YYYY-MM-DD HH:MM:SS
<!-- sync-end -->
```

Script only replaces content between markers. Never modifies hand-written content outside markers.

## Part 2: Documentation Drift Detection

### 5. Detect Claims vs. Reality

Compare documented claims against actual code:

**AGENTS.md vs. Code:**
- IPC channel count in AGENTS.md ↔ `src/shared/ipc-channels.ts` exports
- All listed services exist and have correct method signatures
- Directory structure in AGENTS.md ↔ actual filesystem
- CSS token list ↔ `src/renderer/assets/index.css`

**README.md vs. Code:**
- Phase completion status ↔ actual feature implementation
- Version number ↔ `package.json`
- Tech stack versions ↔ `package.json` dependencies

**todo.md vs. Code:**
- Completed tasks marked ✅ ↔ actual code exists
- Stale items that no longer apply
- Completed items not yet marked done

### 6. Prune Stale Content

- Remove references to deleted files
- Update file counts throughout all docs
- Remove completed TODO items older than 30 days
- Update timestamps on all modified docs

### 7. Cross-Reference Consistency

- `package.json` version ↔ README version string ↔ SettingsPage version
- IPC channel count ↔ `ipc-channels.ts` definitions
- Database table count ↔ schema DDL
- Route count ↔ server route files
- All markdown relative links in `docs/` point to existing files

## Part 3: Generate Change Report

Output a summary:
```
Sync-Docs Report:
- Build: ✅ pass / ❌ fail
- Modules: X main + Y preload + Z renderer
- Documents updated: [list]
- Stale content removed: N items
- Cross-reference fixes: N
- Drift detected: [list of discrepancies with file:line]
```

## Important Rules

- **Never delete** AGENTS.md, README.md, or todo.md — only update them
- **Preserve user-written content** in todo.md (task descriptions, notes)
- **Only change** machine-generated sections (counts, timestamps, status badges)
- **Replace, never append** — use markers to delimit auto-generated regions
