---
name: sync-docs
description: Boss专属 — After any implementation task or document change, auto-sync README.md and todo.md to reflect the latest project state. Also detects documentation drift (stale claims vs actual code), prunes outdated content, and cross-references consistency across AGENTS.md, README.md, and todo.md. Invoke after each task completion, bug fix, or feature delivery.
boss-only: true
---

# Sync Docs Skill

> **Boss 专属技能** — Developer 和 Auditor 不可调用此技能。仅 Boss 有权写入 AGENTS.md 和 README.md。

## Role Constraint

AGENTS.md and README.md are **Boss-owned**. Developer must NOT modify them. When invoked as Developer, only update todo.md (status + notes). When the skill detects AGENTS.md or README.md drift, report it — do not silently edit. Auditor has no write access to any of these files.

## 1. Sync todo.md

### What to update
- Refresh `最后更新` timestamp at top
- Mark completed tasks ✅ (Developer can do this)
- Update Phase table status when all tasks in a phase are done
- Update total hours in phase summary

### What NOT to change
- Task descriptions (Boss-owned)
- Priority labels (Boss-owned)
- "当前优先" markers (Boss-owned)

## 2. Detect Drift: AGENTS.md vs Code

Verify these claims with a quick check (grep / count files):

| Claim in AGENTS.md | Verify against |
|---------------------|----------------|
| IPC channel count | `grep -c ":" src/shared/ipc-channels.ts` |
| Service file count | `ls src/main/services/*.ts \| wc -l` |
| IPC handler count | `ls src/main/ipc/*.ts \| wc -l` |
| Server route count | `ls src/server/routes/*.ts \| wc -l` |
| renderer `as any` count | `grep -r "as any" src/renderer --include="*.tsx" --include="*.ts" \| wc -l` |
| "当前状态" Phase list | `todo.md` Phase 完成状态 table |
| redo.md P0/P1/P2 counts | `redo.md` 当前待修复 section |
| `docs/phase-archive.md` coverage | Check if latest phases are included |
| `noUncheckedIndexedAccess` in tsconfig | `grep "noUncheckedIndexedAccess" tsconfig.node.json tsconfig.web.json` |
| `suggest.md` existence | Should NOT exist after Boss processes proposals |

If drift > 2 items or a stale claim exists, flag it for Boss review.

Also check for **遗留跟踪**: if any todo.md tasks are marked ⏭, verify they have a stated target Phase.

## 3. Detect Drift: README.md vs Code

| Claim in README.md | Verify against |
|---------------------|----------------|
| Version number | `package.json` `version` field |
| Phase completion list | `todo.md` Phase table |
| File/directory counts in project structure | actual `src/` tree |
| Tech stack versions | `package.json` dependencies |
| `npm run test` count | actual test output |
| Links to `docs/` files | Check files exist at those paths |
| Features table completeness | Check for new modules not listed |

## 4. Cross-Reference Consistency

Quick consistency checks across all three docs:

- AGENTS.md "当前状态" ↔ todo.md Phase table ↔ README.md Phase table (same completion status)
- IPC count: AGENTS.md architecture diagram ↔ README.md architecture diagram ↔ `grep` result
- Service count: AGENTS.md mentions ↔ README.md mentions ↔ `ls` count
- Biome error/warning counts match between AGENTS.md, todo.md, README.md
- All cross-document relative links (e.g., `[redo.md](redo.md)`) point to existing files
- Phase-archive description matches actual archive coverage (e.g., "Phase 1-14" vs actual content)
- All documents reference the same "当前活跃 Phase"

## 5. Output Format

```
Sync-Docs Report
================
Documents touched: [list of files edited]
Drift detected: [each "doc claims X, actual is Y"]
Cross-reference fixes: [N items aligned]
Pending for Boss: [items needing decision]
```

Keep it brief. Don't write a paragraph when a table row works.

## Key Rules

- **Replace, never append** status lines — the build-status line and timestamp are single-line replacements
- **Verify before writing** a number — if you claim "27 tests", run the test command or check recent output
- **Don't invent counts** — if you can't verify a number, don't include it
- **Boss-only edits** for AGENTS.md and README.md — when not Boss, report drift as a finding
- **Check redo.md too** — if redo.md has pending P0 items, flag in report. Do not sync-docs over unrepaired bugs.
- **Check suggest.md is gone** — suggest.md should not exist after Boss processes it. If it does, flag as unprocessed proposals.
- **Verify legacy tracking** — any ⏭ tasks should have a target Phase stated
