// Post-build: prepare out/ for electron-packager
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');

// 1. Create minimal package.json in out/ for electron-packager
const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
const outPkg = {
  name: rootPkg.name,
  version: rootPkg.version,
  description: rootPkg.description,
  main: 'main/index.js',
  author: rootPkg.author,
  license: rootPkg.license,
};
fs.writeFileSync(path.join(OUT_DIR, 'package.json'), JSON.stringify(outPkg, null, 2));
console.log('[post-build] Created out/package.json');

// 2. Strip crossorigin from renderer HTML (breaks Electron file:// loading)
const htmlPath = path.join(OUT_DIR, 'renderer', 'index.html');
if (fs.existsSync(htmlPath)) {
  let html = fs.readFileSync(htmlPath, 'utf-8');
  html = html.replace(/\s+crossorigin/g, '');
  fs.writeFileSync(htmlPath, html);
  console.log('[post-build] Stripped crossorigin from renderer HTML');
}

// 3. Copy img/ to out/renderer/img/ so favicon.ico is available to renderer HTML
const imgDir = path.join(ROOT, 'img');
const outImgDir = path.join(OUT_DIR, 'renderer', 'img');
if (fs.existsSync(imgDir)) {
  fs.mkdirSync(outImgDir, { recursive: true });
  for (const f of fs.readdirSync(imgDir)) {
    fs.copyFileSync(path.join(imgDir, f), path.join(outImgDir, f));
  }
  console.log('[post-build] Copied img/ to out/renderer/img/');
}

// 4. Copy SVG assets from src/renderer/assets/ to out/renderer/assets/ (guide images etc.)
const assetsDir = path.join(ROOT, 'src', 'renderer', 'assets');
const outAssetsDir = path.join(OUT_DIR, 'renderer', 'assets');
if (fs.existsSync(assetsDir)) {
  for (const f of fs.readdirSync(assetsDir)) {
    if (f.endsWith('.svg')) {
      fs.copyFileSync(path.join(assetsDir, f), path.join(outAssetsDir, f));
    }
  }
  console.log('[post-build] Copied SVG assets to out/renderer/assets/');
}
