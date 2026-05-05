#!/usr/bin/env node
/**
 * 一键打包脚本 — 程序化 API，零 CLI 分步操作
 * 用法: node scripts/pack.js
 * 等效于: npm run build → electron-forge package → ASAR 更新 → 验证
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const RELEASE_DIR = path.join(PROJECT_ROOT, 'release', 'Idiot-win32-x64');
const ASAR_PATH = path.join(RELEASE_DIR, 'resources', 'app.asar');
const TMP_DIR = '/tmp/app';

function run(cmd, label) {
  console.log(`\n[${label}]`);
  const result = execSync(cmd, { cwd: PROJECT_ROOT, encoding: 'utf-8', stdio: 'pipe' });
  return result;
}

async function main() {
  const start = Date.now();

  // Step 1: Build
  console.log('[1/4] 构建...');
  run('npm run build', 'build');
  const buildOutput = run('npm run build 2>&1 | tail -5', 'build-summary');
  console.log(buildOutput.trim());

  // Step 2: Package (programmatic via CLI fallback since forge.config.ts exists)
  console.log('[2/4] 打包...');
  const { api } = await import('@electron-forge/core');
  await api.package({ dir: PROJECT_ROOT, interactive: false });
  console.log('  package done →', RELEASE_DIR);

  // Step 3: Update ASAR
  console.log('[3/4] 更新 ASAR...');
  run(`npx asar extract "${ASAR_PATH}" ${TMP_DIR}`, 'asar-extract');
  const outSrc = path.join(PROJECT_ROOT, 'out');
  for (const sub of ['main', 'preload', 'renderer', 'package.json']) {
    const src = path.join(outSrc, sub);
    const dst = path.join(TMP_DIR, 'out', sub);
    if (fs.existsSync(src)) {
      if (fs.statSync(src).isDirectory()) {
        fs.cpSync(src, dst, { recursive: true });
      } else {
        fs.copyFileSync(src, dst);
      }
    }
  }
  fs.rmSync(ASAR_PATH);
  run(`npx asar pack ${TMP_DIR} "${ASAR_PATH}"`, 'asar-pack');
  fs.rmSync(TMP_DIR, { recursive: true, force: true });

  // Step 4: Verify
  console.log('[4/4] 验证...');
  const tmpCheck = '/tmp/check';
  run(`npx asar extract "${ASAR_PATH}" ${tmpCheck}`, 'asar-extract-check');
  const rendererJS = fs.readdirSync(path.join(tmpCheck, 'out', 'renderer', 'assets')).find(f => f.startsWith('index-') && f.endsWith('.js'));
  const rendererContent = fs.readFileSync(path.join(tmpCheck, 'out', 'renderer', 'assets', rendererJS), 'utf-8');
  const mainContent = fs.readFileSync(path.join(tmpCheck, 'out', 'main', 'index.js'), 'utf-8');
  const htmlContent = fs.readFileSync(path.join(tmpCheck, 'out', 'renderer', 'index.html'), 'utf-8');

  const checks = {
    HashRouter: (rendererContent.match(/HashRouter/g) || []).length,
    disableHardware: (mainContent.match(/disableHardwareAcceleration/g) || []).length,
    crossorigin: (htmlContent.match(/crossorigin/g) || []).length === 0 ? 'OK' : 'FAIL',
    webviewTag: (mainContent.match(/webviewTag/g) || []).length,
  };
  fs.rmSync(tmpCheck, { recursive: true, force: true });

  const asarStat = fs.statSync(ASAR_PATH);
  console.log(`  HashRouter: ${checks.HashRouter}  disableHardware: ${checks.disableHardware}  crossorigin: ${checks.crossorigin}  webviewTag: ${checks.webviewTag}`);
  console.log(`  ASAR: ${(asarStat.size / 1024 / 1024).toFixed(0)} MB`);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ 打包完成 (${elapsed}s)`);
  console.log(`  exe: ${RELEASE_DIR}/Idiot.exe`);
  console.log(`  启动: cmd.exe /c "scripts\\launcher.bat"`);
}

main().catch(err => {
  console.error('\n❌ 打包失败:', err.message);
  process.exit(1);
});
