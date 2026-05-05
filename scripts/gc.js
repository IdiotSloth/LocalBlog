#!/usr/bin/env node
/**
 * Continuous Garbage Collection
 *
 * Detects dead code, unused imports, orphan files, and stale configurations.
 * Run: node scripts/gc.js [--audit | --fix]
 *
 *   --audit  Report dead code without making changes (CI mode)
 *   --fix    Remove dead code (interactive/manual mode — just reports for now)
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const args = process.argv.slice(2);
const mode = args.includes('--audit') ? 'audit' : args.includes('--fix') ? 'fix' : 'audit';

let deadCount = 0;
let orphanCount = 0;
let staleCount = 0;

function readFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf-8'); } catch { return ''; }
}

function getAllTsFiles(dir) {
  const results = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'out', 'dist', 'release', 'user-data', 'migrations'].includes(entry.name)) continue;
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        results.push(full);
      }
    }
  }
  walk(dir);
  return results;
}

// 1. Find unused imports
console.log('\n🔍 扫描未使用的导入...');
const allFiles = getAllTsFiles(SRC);
const importMap = new Map();

allFiles.forEach(f => {
  const content = readFile(f);
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content))) {
    const names = match[1].split(',').map(n => n.trim()).filter(n => n && !n.startsWith('type'));
    names.forEach(name => {
      if (name === 'useState' || name === 'useEffect' || name === 'useCallback' || name === 'useRef') return; // React hooks
      if (!importMap.has(name)) importMap.set(name, []);
      importMap.get(name).push({ file: path.relative(ROOT, f), line: 0 });
    });
  }
});

// Check if each imported name is used elsewhere in the same file
allFiles.forEach(f => {
  const content = readFile(f);
  const relPath = path.relative(ROOT, f);
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    const importMatch = line.match(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/);
    if (!importMatch) return;
    const names = importMatch[1].split(',').map(n => {
      const parts = n.trim().split(/\s+as\s+/);
      return { original: parts[0].trim(), alias: (parts[1] || parts[0]).trim() };
    });

    names.forEach(({ original, alias }) => {
      // Skip type imports
      if (line.includes('type')) return;
      // Check if the alias is used elsewhere in the file (excluding the import line)
      const restOfFile = lines.filter((_, j) => j !== i).join('\n');
      const usedInFile = new RegExp(`\\b${alias}\\b`).test(restOfFile);
      if (!usedInFile) {
        console.log(`  ⚠️  未使用的导入: ${alias} in ${relPath}:${i + 1}`);
        deadCount++;
      }
    });
  });
});

// 2. Find orphan files (not imported by any other file)
console.log('\n🔍 扫描孤立文件 (未被任何文件导入)...');
allFiles.forEach(f => {
  const relPath = path.relative(ROOT, f);
  const basename = path.basename(f, path.extname(f));
  // Skip entry points and config files
  if (f.includes('main.tsx') || f.includes('App.tsx') || f.includes('index.ts') ||
      f.includes('main/index.ts') || f.includes('server/index.ts') ||
      f.includes('preload/index.ts') || f.includes('ipc/index.ts')) return;

  // Check if this file is imported by any OTHER file
  let imported = false;
  for (const other of allFiles) {
    if (other === f) continue;
    const content = readFile(other);
    // Check for various import patterns
    if (content.includes(basename)) {
      imported = true;
      break;
    }
  }

  if (!imported) {
    console.log(`  ⚠️  可能的孤立文件: ${relPath}`);
    orphanCount++;
  }
});

// 3. Find empty directories
console.log('\n🔍 扫描空目录...');
function findEmptyDirs(dir) {
  const results = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    const entries = fs.readdirSync(d, { withFileTypes: true });
    if (entries.length === 0) {
      results.push(path.relative(ROOT, d));
      return;
    }
    const allDirs = entries.every(e => e.isDirectory());
    if (allDirs && entries.length > 0) {
      // Check if all subdirectories are empty
      let allEmpty = true;
      for (const e of entries) {
        const sub = path.join(d, e.name);
        const subEntries = fs.readdirSync(sub, { withFileTypes: true });
        if (subEntries.length > 0) { allEmpty = false; break; }
      }
      if (allEmpty) {
        results.push(path.relative(ROOT, d));
        return;
      }
    }
    for (const e of entries) {
      if (e.isDirectory() && !['node_modules', '.git', 'out', 'dist', 'release'].includes(e.name)) {
        walk(path.join(d, e.name));
      }
    }
  }
  walk(dir);
  return results;
}

const emptyDirs = findEmptyDirs(SRC);
emptyDirs.forEach(d => {
  console.log(`  ⚠️  空目录: ${d}/`);
  staleCount++;
});

// 4. Find stale configuration files
console.log('\n🔍 扫描过期配置文件...');
const configChecks = [
  { file: 'drizzle.config.ts', check: 'migrations/' },
  { file: 'vitest.config.mjs', check: 'tests/' },
];
configChecks.forEach(({ file, check }) => {
  const fpath = path.join(ROOT, file);
  if (!fs.existsSync(fpath)) return;
  const content = readFile(fpath);
  // Check if drizzle has actual migrations
  if (file === 'drizzle.config.ts') {
    const migrationsDir = path.join(ROOT, 'src', 'main', 'db', 'migrations');
    if (fs.existsSync(migrationsDir) && fs.readdirSync(migrationsDir).length === 0) {
      console.log(`  ⚠️  Drizzle 配置存在但 migrations/ 为空: ${file}`);
      staleCount++;
    }
  }
});

// 5. Check for TODO/XXX/FIXME comments
console.log('\n🔍 扫描遗留 TODO/XXX/FIXME 标记...');
const todoRegex = /\/\/\s*(TODO|XXX|FIXME|HACK|WARN):?\s*(.+)/g;
let todoCount = 0;
allFiles.forEach(f => {
  const content = readFile(f);
  let match;
  while ((match = todoRegex.exec(content))) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    console.log(`  📝 ${match[1]}: ${match[2].trim()}  (${path.relative(ROOT, f)}:${lineNum})`);
    todoCount++;
  }
});

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log(`🗑️  Garbage Collection ${mode === 'audit' ? 'Audit' : 'Report'}:`);
console.log(`   未使用的导入: ${deadCount}`);
console.log(`   孤立文件:     ${orphanCount}`);
console.log(`   过期配置:     ${staleCount}`);
console.log(`   遗留标记:     ${todoCount}`);
console.log(`   总计可清理:   ${deadCount + orphanCount + staleCount}`);

if (mode === 'audit' && (deadCount + orphanCount + staleCount) > 0) {
  console.log('\n⚠️  发现可清理项。运行 `node scripts/gc.js` 查看详情。');
}

if (todoCount > 20) {
  console.log('\n⚠️  遗留标记较多 (>{20})，建议逐步清理。');
  process.exit(1);
}
