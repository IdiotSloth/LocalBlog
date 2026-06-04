#!/usr/bin/env bash
# pre-audit.sh — Auditor 自动扫描 (Step 7 Pass 1)
# 运行时间: ~10s. 捕获 ~80% 的常见 bug 模式.
# 用法: bash scripts/pre-audit.sh
# 退出码 0 = 零发现, 非零 = 有可疑项 (需人工确认, 不是所有都一定是 bug)

set -euo pipefail
cd "$(dirname "$0")/.."

FOUND=0
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

warn() { echo -e "${YELLOW}[!]${NC} $*"; FOUND=$((FOUND+1)); }
section() { echo -e "\n${YELLOW}═══ $* ═══${NC}"; }

# ═══════════════════════════════════════════
section "1. Electron 安全 — BrowserWindow 配置"
# ═══════════════════════════════════════════
for f in $(grep -rl "new BrowserWindow" src/main/ --include="*.ts" 2>/dev/null); do
  if ! grep -q "contextIsolation.*true" "$f"; then
    warn "$f: BrowserWindow 可能缺 contextIsolation:true"
  fi
  if ! grep -q "nodeIntegration.*false" "$f"; then
    warn "$f: BrowserWindow 可能缺 nodeIntegration:false"
  fi
  if grep -q "new BrowserWindow" "$f" && ! grep -q "preload" "$f" && ! grep -q "sandbox.*true" "$f"; then
    warn "$f: BrowserWindow 缺 preload 或 sandbox:true"
  fi
done

# ═══════════════════════════════════════════
section "2. Renderer 内原生弹窗 (prompt/alert/confirm)"
# ═══════════════════════════════════════════
PROMPTS=$(grep -rn "prompt(" src/renderer/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "node_modules\|\.d\.ts\|//\|console\." || true)
if [ -n "$PROMPTS" ]; then
  warn "Renderer 中发现 prompt() 调用 (Electron 可能拦截):"
  echo "$PROMPTS" | while read line; do warn "  $line"; done
fi

# ═══════════════════════════════════════════
section "3. 空 catch 块 (吞错误)"
# ═══════════════════════════════════════════
EMPTY_CATCH=$(grep -rn "catch\s*{\s*}" src/main/ --include="*.ts" 2>/dev/null | grep -v "node_modules\|\.d\.ts" || true)
if [ -n "$EMPTY_CATCH" ]; then
  warn "Main process 中发现空 catch {} (错误被静默丢弃):"
  echo "$EMPTY_CATCH" | while read line; do warn "  $line"; done
fi

# ═══════════════════════════════════════════
section "4. XSS — dangerouslySetInnerHTML 无 DOMPurify"
# ═══════════════════════════════════════════
# 检测每个文件: 如果有 dangerouslySetInnerHTML, 必须有 DOMPurify import/调用
for f in $(grep -rl "dangerouslySetInnerHTML" src/renderer/ --include="*.tsx" 2>/dev/null); do
  if ! grep -q "DOMPurify\|dompurify" "$f"; then
    warn "$f: dangerouslySetInnerHTML 使用但未导入 DOMPurify"
  else
    # 检查 sanitize 调用是否在每处 dangerouslySetInnerHTML 附近
    COUNT_HTML=$(grep -c "dangerouslySetInnerHTML" "$f" || true)
    COUNT_SANITIZE=$(grep -c "DOMPurify.sanitize\|\.sanitize(" "$f" || true)
    if [ "$COUNT_HTML" -gt "$COUNT_SANITIZE" ]; then
      warn "$f: dangerouslySetInnerHTML ($COUNT_HTML 处) > DOMPurify.sanitize ($COUNT_SANITIZE 处) — 可能遗漏"
    fi
  fi
done

# ═══════════════════════════════════════════
section "5. SQLite 专属语法 (MySQL 不兼容)"
# ═══════════════════════════════════════════
for pattern in "INSERT OR REPLACE INTO" "datetime('now'" "date('now'" "strftime(" "last_insert_rowid()"; do
  HITS=$(grep -rn "$pattern" src/main/ --include="*.ts" 2>/dev/null | grep -v "node_modules\|\.d\.ts\|mysql.ts\|toMySQL\|// " || true)
  if [ -n "$HITS" ]; then
    warn "SQLite 专属语法 '$pattern' 出现在非 mysql.ts 文件:"
    echo "$HITS" | while read line; do warn "  $line"; done
  fi
done

# ═══════════════════════════════════════════
section "6. 路径穿越 — 文件操作缺 basename/workpace 检查"
# ═══════════════════════════════════════════
for f in $(grep -rl "fs\.readFile\|fs\.writeFile\|fs\.unlink\|fs\.copyFile" src/main/ --include="*.ts" 2>/dev/null | grep -v "node_modules\|\.d\.ts\|backup\|pre-audit"); do
  if ! grep -q "path.basename\|path.resolve\|startsWith\|normalize\|workspace\|safeFilename\|\.includes.*\.\." "$f"; then
    warn "$f: 文件操作可能缺少路径穿越防护"
  fi
done

# ═══════════════════════════════════════════
section "7. useRef/useState 变量在 JSX 中使用但未定义"
# ═══════════════════════════════════════════
# 扫描每个组件文件: 提取 JSX 中的 {变量名} 或 onClick={handleXxx}, 验证是否已定义
for f in $(grep -rl "export function\|export const.*=.*()" src/renderer/ --include="*.tsx" 2>/dev/null | grep -v "node_modules\|\.d\.ts"); do
  # Extract words used in JSX event handlers: onClick={handleXxx} / onChange={handleXxx}
  HANDLERS=$(grep -oP '(?:onClick|onChange|onSubmit|onKeyDown|onBlur|onFocus)=\{[a-zA-Z_][a-zA-Z0-9_]*\b' "$f" 2>/dev/null | sed 's/.*={//' | sort -u || true)
  for h in $HANDLERS; do
    case "$h" in
      # Skip generic patterns
      "()"|"e"|"event"|"dispatch"|"navigate"|"loadData"|"loadFiles"|"loadBlogs"|"loadTree"|"loadKbFolders"|"loadSeries"|"handleChange"|"loadFolders") continue ;;
      *) ;;
    esac
    if ! grep -q "\bconst $h\b\|\bfunction $h\b\|$h =" "$f"; then
      warn "$f: JSX 引用了 '$h' 但可能未定义"
    fi
  done
done

# ═══════════════════════════════════════════
section "8. import 了但未使用 (死导入)"
# ═══════════════════════════════════════════
# 重点检查: lazy import 的组件是否在 JSX 中使用
for f in $(grep -rl "const.*=.*lazy(()" src/renderer/ --include="*.tsx" 2>/dev/null); do
  while read -r line; do
    VAR=$(echo "$line" | grep -oP '\bconst\s+\K\w+' || true)
    if [ -n "$VAR" ] && ! grep -q "<$VAR" "$f" && ! grep -q "{$VAR}" "$f"; then
      warn "$f: lazy 导入的 '$VAR' 在 JSX 中从未使用 (死导入)"
    fi
  done < <(grep "const.*=.*lazy(" "$f")
done

# ═══════════════════════════════════════════
section "9. React 命名空间使用但未导入"
# ═══════════════════════════════════════════
for f in $(grep -rl "React\.\|react\." src/renderer/ --include="*.tsx" 2>/dev/null); do
  if ! grep -q "import React\|import \* as React" "$f"; then
    warn "$f: 使用了 React.xxx 但未 import React 命名空间"
    grep -n "React\." "$f" | while read line; do warn "  $line"; done
  fi
done

# ═══════════════════════════════════════════
section "10. IPC 通道 hardcode 裸字符串"
# ═══════════════════════════════════════════
HARDCODE_IPC=$(grep -rn "ipcMain.handle('" src/main/ --include="*.ts" 2>/dev/null | grep -v "node_modules\|IPC\." || true)
if [ -n "$HARDCODE_IPC" ]; then
  warn "IPC handle 使用了裸字符串而非 IPC.XXX 常量:"
  echo "$HARDCODE_IPC" | while read line; do warn "  $line"; done
fi
EVT_HARDCODE=$(grep -rn "\.send('" src/main/ --include="*.ts" 2>/dev/null | grep -v "node_modules\|IPC\." || true)
if [ -n "$EVT_HARDCODE" ]; then
  warn "IPC send 使用了裸字符串而非 IPC.EVT_* 常量:"
  echo "$EVT_HARDCODE" | while read line; do warn "  $line"; done
fi

# ═══════════════════════════════════════════
section "11. 模块级可变状态 (HMR 脆弱)"
# ═══════════════════════════════════════════
for f in $(grep -rl "^let \|^const.*=\|^var " src/renderer/ --include="*.tsx" 2>/dev/null | grep -v "node_modules\|\.d\.ts\|types.ts\|constants"); do
  MODULE_LET=$(grep -n "^let [a-z]" "$f" 2>/dev/null | grep -v "interface\|type\|// " || true)
  if [ -n "$MODULE_LET" ]; then
    warn "$f: 模块级 let 变量 (React Fast Refresh 下可能重置):"
    echo "$MODULE_LET" | while read line; do warn "  $line"; done
  fi
done

# ═══════════════════════════════════════════
section "12. 新 IPC 通道的 WindowApi 类型声明"
# ═══════════════════════════════════════════
# grep ipc-channels.ts 中的所有 handle channel 名称
# 每个必须在 window-api.ts 中有对应方法声明
CHANNELS=$(grep -oP "'[a-zA-Z]+:[a-zA-Z_]+'" src/shared/ipc-channels.ts 2>/dev/null | tr -d "'" | grep -v "^EVT_" | sort -u)
for ch in $CHANNELS; do
  # Convert channel name to camelCase method name: blog:create -> blogCreate
  METHOD=$(echo "$ch" | sed 's/:/ /' | awk '{print $1 toupper(substr($2,1,1)) substr($2,2)}' | sed 's/_[a-z]/\U&/g' | sed 's/_//g')
  METHOD2=$(echo "$ch" | sed 's/:\([a-z]\)/\U\1/g')
  if ! grep -q "$METHOD\|$METHOD2" src/shared/window-api.ts 2>/dev/null; then
    warn "IPC channel '$ch' 在 window-api.ts 中未找到对应方法声明"
  fi
done

# ═══════════════════════════════════════════
section "13. 多步 DML 缺事务包裹"
# ═══════════════════════════════════════════
for f in $(grep -rl "dbRun\|dbAll\|dbGet" src/main/services/ --include="*.ts" 2>/dev/null); do
  # Count dbRun calls — if >=2 in same async function, check for BEGIN/COMMIT
  FUNCS_WITH_MULTI_DML=$(grep -n "async\|static async" "$f" | grep -oP '(?:async\s+)?\w+\s*\(' | sed 's/(//' | tr -d ' ' | sort -u)
  # This is a heuristic — a more precise check needs AST parsing
  # For now, flag files with high density of dbRun but no BEGIN
  DBWRITE_COUNT=$(grep -c "dbRun\|await db" "$f" 2>/dev/null || echo 0)
  BEGIN_COUNT=$(grep -c "BEGIN\|COMMIT\|ROLLBACK" "$f" 2>/dev/null || echo 0)
  if [ "$DBWRITE_COUNT" -gt 3 ] && [ "$BEGIN_COUNT" -eq 0 ]; then
    warn "$f: $DBWRITE_COUNT 个 DML 语句但零个 BEGIN/COMMIT — 可能缺事务包裹"
  fi
done

# ═══════════════════════════════════════════
section "14. 动态 import 的 .then() 缺卸载守卫"
# ═══════════════════════════════════════════
for f in $(grep -rl "import(" src/renderer/ --include="*.tsx" --include="*.ts" 2>/dev/null); do
  if grep -q "import(" "$f" && ! grep -q "ref.current\|aborted\|cancell\|mounted" "$f"; then
    warn "$f: 动态 import() 的 .then() 缺少组件卸载守卫 (abortedRef/mountedRef)"
  fi
done

# ═══════════════════════════════════════════
section "15. 路由重复定义"
# ═══════════════════════════════════════════
ROUTES=$(grep -oP "path:\s*['\"][^'\"]+['\"]" src/renderer/App.tsx 2>/dev/null | sort)
DUPS=$(echo "$ROUTES" | uniq -d)
if [ -n "$DUPS" ]; then
  warn "App.tsx 中发现重复路由定义:"
  echo "$DUPS" | while read line; do warn "  $line"; done
fi

# ═══════════════════════════════════════════
section "16. 函数体空实现 / 仅含注释"
# ═══════════════════════════════════════════
EMPTY_FUNC=$(grep -rn "^\s*{\s*$" src/main/services/ --include="*.ts" -A1 2>/dev/null | grep -B1 "^\s*//.*\|^\s*}$" | grep "{" | grep -v "node_modules\|\.d\.ts\|constructor\|interface" || true)
# Simplified: find functions that are just { \n // comment \n }
for f in $(find src/main/ src/renderer/ -name "*.ts" -o -name "*.tsx" 2>/dev/null | grep -v "node_modules\|\.d\.ts\|out/"); do
  # Look for async function with body that's only comments and return
  EMPTY_BODIES=$(awk '/async.*\(.*\)\s*\{/ {in_func=1; lines=0} in_func {lines++; if(/\/\//) comments++; if(/\}$/) {if(lines<=3 && comments>=1) print NR": possible empty implementation"; in_func=0; comments=0; lines=0}}' "$f" 2>/dev/null || true)
  if [ -n "$EMPTY_BODIES" ]; then
    warn "$f: 疑似空实现函数 (body 仅含注释):"
    echo "$EMPTY_BODIES" | while read line; do warn "  $line"; done
  fi
done

# ═══════════════════════════════════════════
section "17. Collapse Constitution Defense — QuickNav memory-only 保证"
# ═══════════════════════════════════════════
# R352 closure: quick-nav-store.ts must remain pure in-memory ring.
# Nearest resurrection path: single import { persist } from 'zustand/middleware'.
if [ -f src/renderer/stores/quick-nav-store.ts ]; then
  if grep -q "persist\|PersistStorage\|createJSONStorage" src/renderer/stores/quick-nav-store.ts 2>/dev/null; then
    warn "quick-nav-store.ts: 检测到 persist middleware — 突破 memory-only 保证. 见 AGENTS.md § Collapse 工程本能"
  fi
  if grep -q "localStorage\|sessionStorage" src/renderer/stores/quick-nav-store.ts 2>/dev/null; then
    warn "quick-nav-store.ts: 检测到 storage API — 突破 memory-only 保证. 见 AGENTS.md § Collapse 工程本能"
  fi
fi

# ═══════════════════════════════════════════
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$FOUND" -eq 0 ]; then
  echo -e "${YELLOW}✅ pre-audit 扫描完成: 零可疑发现${NC}"
else
  echo -e "${RED}⚠ pre-audit 扫描完成: $FOUND 个可疑项需人工确认${NC}"
  echo "  注意: 不是所有标记项都是 bug。部分可能是误报。"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit $FOUND
