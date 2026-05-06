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

### What NOT to change
- Task descriptions (Boss-owned)
- Priority labels (Boss-owned)
- "当前优先" markers (Boss-owned)

## 2. Detect Drift: AGENTS.md vs Code

Verify these claims with a quick check (grep / count files):

| Claim in AGENTS.md | Verify against |
|---------------------|----------------|
| IPC channel count | `grep -c ":" src/shared/ipc-channels.ts` |
| Service file count | `ls src/main/services/*.ts` |
| Server route count | `ls src/server/routes/*.ts` |
| "当前状态" Phase list | `todo.md` Phase 完成状态 table |
| `docs/phase-archive.md` coverage | Check if latest phases are included |

If drift > 2 items or a stale claim exists, flag it for Boss review.

## 3. Detect Drift: README.md vs Code

| Claim in README.md | Verify against |
|---------------------|----------------|
| Version number | `package.json` `version` field |
| Phase completion list | `todo.md` Phase table |
| File/directory counts in project structure | actual `src/` tree |
| Tech stack versions | `package.json` dependencies |
| `npm run test` count | actual test output |
| Links to `docs/` files | Check files exist at those paths |

## 4. Cross-Reference Consistency

Quick consistency checks across all three docs:

- AGENTS.md "当前状态" ↔ todo.md Phase table ↔ README.md Phase table (same completion status)
- Biome error/warning counts match between AGENTS.md, todo.md, README.md
- All cross-document relative links (e.g., `[redo.md](redo.md)`) point to existing files
- Phase-archive description matches actual archive coverage (e.g., "Phase 1-10" vs actual content)

## 5. Output Format

```
Sync-Docs Report:
- Documents touched: [list]
- Drift detected: [list of "doc claims X, code has Y"]
- Cross-reference fixes: [N]
- Items flagged for Boss: [list]
```

Keep it brief. Don't write a paragraph when a table row works.

## Key Rules

- **Replace, never append** status lines — the build-status line and timestamp are single-line replacements
- **Verify before writing** a number — if you claim "27 tests", run the test command or check recent output
- **Don't invent counts** — if you can't verify a number, don't include it
- **Boss-only edits** for AGENTS.md and README.md — when not Boss, report drift as a finding
