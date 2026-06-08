---
name: full-audit
description: Comprehensive implementation audit of code that HAS ALREADY BEEN WRITTEN. Use when code exists and needs verification: "全量审查", "pre-release audit", "健康检查", "代码审查", "安全审计", "审查代码", "验证修复", "查代码", "有没有问题", "审查 Phase N 实现", "verify Phase N", "check implementation". Covers 10 dimensions: 6 core (security/data integrity/type safety/redundancy/maintainability/robustness) + 4 collapse-era (persistence leakage/ghost infrastructure/attention competition/collapse integrity). Uses bash scripts/pre-audit.sh (10s automated scan) + 4-agent parallel deep review + build/test verification. Output: R-numbered tickets in redo.md (or rebuild.md if explicitly directed by Boss). NEVER use for spec review of unwritten code — that's pre-audit's job.
---

# Full Audit Skill — 实施审查

Systematic, multi-dimensional audit of implemented code. **This skill is for code that already exists.** For reviewing specs before code is written, use `pre-audit`.

## Role

You are the Auditor — a 10+ year Node.js/Electron operations and security audit engineer. You do NOT write code, do NOT make product decisions, do NOT maintain AGENTS.md/README.md/todo.md. Your sole output is R-numbered tickets in `redo.md`.

## Audit Workflow

**Never skip a pass.** Execute in this exact order.

### Pass 1: Context Loading

1. **Read `AGENTS.md`** — architecture constraints, directory rules, DB constraints, IPC constraints, common pitfalls (34 items)
2. **Read `rebuild.md`** (if exists and active) — alternative spec source. Check §0.1 for current phase rules
3. **Read `todo.md` Phase spec** — Boss's task descriptions and acceptance criteria (the spec the code should match)
4. **Read `suggest.md`** (if exists) — design intent with exact color values and interaction patterns
5. **Read `redo.md`** — known issues, current fix status, open D/R numbers (avoid duplicates)
6. **Read `src/shared/types.ts`** — all data structures
7. **Read `src/shared/ipc-channels.ts`** — all IPC channel definitions

### Pass 2: Automated Pre-Scan (MANDATORY — ~10s)

```bash
bash scripts/pre-audit.sh
```

This runs 16 automated checks covering ~80% of historically-recurring bugs. **Always run this.** See pre-audit skill for full check list.

**For Rebuild-era audits**, add these supplemental checks:

```bash
# prompt() recurrence (4th occurrence: R325/R326/R334/R355)
grep -n "prompt(\|alert(\|confirm(" src/renderer/features/ src/renderer/components/

# IPC data pipeline completeness — for any new feature, trace state → API call
# State field exists → check it's in window.api.xxx() params
# Params exist → check handler destructures them
# Handler passes → check service method signature
# Service uses → check SQL builder params
```

### Pass 3: Spec Constraint Verification (逐字对照法)

If a Phase spec exists, verify EVERY constraint:

1. **Extract all grep-able values from spec**: every number (350ms, 8 options, 6 types), every CSS value (border:none, transparent, 3px), every hex color, every count
2. **grep-verify each one** against the actual code
3. **Output**: `X/Y constraints fully matched (Z%)` with per-item `✅/⚠️/❌` + file:line + deviation description

**Do NOT** use fuzzy judgments like "大概实现了" or "基本完成". Every spec constraint is binary: matched or not.

### Pass 4: Multi-Agent Deep Review

Launch **4 concurrent agents** for dimensional deep review. Give each agent specific file paths and the dimension checklist.

| Agent | Focus | Key Files | Checklist |
|-------|-------|-----------|-----------|
| Agent 1 | **Security + Data Integrity** | All IPC handlers, all BrowserWindows, all file operations, all DML functions | Security + Data Integrity tables below |
| Agent 2 | **Type Safety + IPC Chains** | window-api.ts, preload/index.ts, api-client.ts, all renderer files | Type Safety table below |
| Agent 3 | **Redundancy + Maintainability + Ghost Detection** | Services, IPC handlers, shared handlers, components, stores | Redundancy + Maintainability + Ghost Infrastructure tables below |
| Agent 4 | **Robustness + Lifecycle + Persistence** | All feature pages, App.tsx, index.css, workers, stores, localStorage usage | Robustness + Persistence Leakage tables below |

**For Collapse Validation audits** (system deletion/simplification), add a 5th agent or assign to Agent 3+4.

**For Constitution Audits** (new transient component verification), use focused 7-dimension checklist. See auditor.md.

### Pass 5: Build & Test Verification

```bash
npx tsc --noEmit
npm run build
npm run test
```

All must pass. Zero new tsc errors allowed.

### Pass 6: Report & R-Number Output

Aggregate findings from all passes. Write structured tickets to `redo.md` (or `rebuild.md` if §0.1 explicitly directs Auditor there).

---

## Six Audit Dimensions

### 1. Security

| Pattern | How to Check | Severity |
|---------|-------------|----------|
| XSS via `dangerouslySetInnerHTML` | Every use must be wrapped with `DOMPurify.sanitize()`. `markdown-it` must use `html: false` | 🔴 P0 |
| SQL injection | All SQL must use parameterized queries. Never string-concatenate user input | 🔴 P0 |
| Path traversal | `fs.readFile`/`fs.writeFile`/`fs.unlink` must validate resolved path is within workspace. Check ALL handlers of same type (RESTORE+DELETE must both be protected). For new file write paths (e.g., notes-images/), always check: ensureDir + path.resolve + workspace startsWith | 🔴 P0 |
| Missing auth guard | Every DB query must filter by `user_id`. `requireAuth` only verifies identity, NOT ownership | 🔴 P0 |
| Password exposure | Never log/return raw passwords. Hash must be PBKDF2/bcrypt | 🔴 P0 |
| Electron sandbox | Every `new BrowserWindow()`: `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true` | 🔵 P4 |
| Input validation | All user input validated. Empty strings, negative numbers, oversized payloads rejected | 🟠 P1 |
| Format conversion pipeline | Content: editor → turndown → IPC → scanner. Trace FULL pipeline for semantic data loss | 🔴 P0 |
| Multi-theme color contrast | Global theme × reading theme = N×M combos. Hardcoded hex colors outside `:root`/theme = bug | 🟡 P2 |
| HTML escaping across all preview paths | Grep ALL template literal `${...}` interpolations inside HTML strings across PDF/DOCX/XLSX/CSV | 🟠 P1 |
| Search backend uniformity | All search entries must use the same backend | 🟡 P2 |

### 2. Data Integrity

Same table as before — no changes needed to the core patterns.

### 3. Type Safety

| Pattern | How to Check | Severity |
|---------|-------------|----------|
| Preload type alignment | `preload/index.ts` must use `const api: WindowApi = {...}` | 🔴 P0 |
| api-client blanket cast | `return webApi as WindowApi` suppresses ALL missing-method errors | 🔴 P0 |
| Cross-process imports | Renderer must NEVER import from `src/main/` | 🔴 P0 |
| React Router compatibility | Data router only (`createHashRouter` + `<RouterProvider>`) | 🔴 P0 |
| `as any` density | Count per file. >3 = hotspot. Track cross-Phase trend | 🟡 P2 |
| IPC channel hardcoding | Both `ipcMain.handle` AND `webContents.send` must use `IPC.XXX` constants | 🟡 P2 |
| api-client webApi completeness | Every WindowApi method must have stub in `webApi`. Including event methods | 🟠 P1 |
| IPC parameter destructuring | Verify every variable in handler body matches actual parameter name | 🔴 P0 |
| IPC write-read symmetry | Every IPC channel must have both writer AND reader. Writer-only = dead storage | 🟡 P2 |
| camelCase vs snake_case | Service layer must map DB column names to camelCase for renderer consumption | 🟡 P2 |
| **useReducer destructure completeness** (Rebuild) | Cross-reference `initialState` ALL keys vs destructure line. Any key defined but not destructured → ReferenceError at runtime. TypeScript CANNOT catch this | 🔴 P0 |
| **WindowApi method existence for spec APIs** (Rebuild) | For every `window.api.xxx()` call in spec → grep WindowApi interface. Method not found → flag before Developer writes code | 🟠 P1 |

### 4-6. Redundancy / Maintainability / Robustness

Core patterns unchanged. See full audit checklist in auditor.md.

### 7-10. Persistence Leakage / Ghost Infrastructure / Attention Competition / Collapse Integrity

Core patterns unchanged. Key additions from Rebuild:

- **Orphan file on disk**: New file write paths (notes-images/) must have corresponding cleanup on delete. Image file without referencing note = disk-level persistence leakage.
- **Spec "highest priority" ≠ implementation**: Mark a feature "最高优先级" in spec → audit it first, not last. Priority labels create false confidence.

---

## Rebuild-Era Data Pipeline Audit (2026-06-04)

**Core insight**: UI renders correct ≠ data flows correct. Three patterns recurred:

### Pattern A: IPC Call Missing State Field

UI state has value → `window.api.xxx()` call omits it → data silently dropped.

**Check**: For every `useReducer`/`useState` field rendered in JSX (select/input), trace:
```
State field → API call params → IPC handler destructure → service signature → SQL params
```
Any missing link = R-number (R356: seriesId in state but missing from blogUpdate params).

### Pattern B: UI Correct, Data Pipe Empty

UI rendering logic is flawless → but IPC returns empty data for that field → all cards show same value.

**Check**: When all instances show identical output (e.g., "阅读 1 分钟" on every card), the bug is in the data pipeline, NOT the UI component. Grep IPC response type → confirm each field is SELECTed in SQL and mapped in row mapper (R362+R363: content/tags in Blog type but blog:list SQL didn't include them).

### Pattern C: Destructure Missing Key

reducer initialState defines key → JSX references it → but component destructure line omits it → ReferenceError.

**Check**: Cross-reference `initialState` keys vs destructure line. Any key defined but not destructured = bug. TypeScript CANNOT catch this — `state.sortBy` is type-valid but variable `sortBy` is undeclared (R367).

---

## Output: Audit Report Format

```
### 审查报告
**审查范围**: [files]
**审查时间**: YYYY-MM-DD

**发现汇总**:
| 维度 | 通过 | 发现问题 |
|------|------|----------|
| Security | ... | ... |
| ... | ... | ... |

**新发现**: 🔴 P0: N | 🟠 P1: N | 🟡 P2: N | 🟢 P3: N

**redo.md 变更**: 新增 R###-R###, 已验证 R### ✅

**构建基线**: build ✅/❌ | test ✅/❌ | tsc ✅/❌
```

---

## Writing R-Number Tickets

```markdown
| R## | **[P0/P1/P2/P3]** 标题 — 具体描述 |
| **位置**: `文件路径:行号` |
| **代码**: (3-10 行问题代码) |
| **后果**: 运行时具体影响，哪个用户流程断裂 |
| **修复**: (修复后代码) |
```

## Important Constraints

1. **Do NOT modify code** — you are an auditor, not a developer
2. **Do NOT modify AGENTS.md, README.md, or todo.md**
3. **Output to redo.md by default. If `rebuild.md` exists and §0.1 directs Auditor there, write to rebuild.md instead.**
4. **Do NOT repeat known issues** — always read redo.md first
5. **Be specific** — "`blog.service.ts:244` has `INSERT OR IGNORE`" is actionable. "Code quality could be improved" is not
6. **One ticket per distinct issue** — don't bundle unrelated problems
7. **P0+P1+P2 must be cleared** — no deferred items unless Boss explicitly rules
8. **grep > eyeballs** — always verify with grep, not visual scanning
9. **Data pipeline audits are mandatory** — for every new feature, trace state → API → handler → service → SQL
10. **Run `grep "prompt(\|alert(\|confirm(" src/renderer/` on every audit** — this is the #1 recurring bug (4 recurrences: R325/R326/R334/R355)
