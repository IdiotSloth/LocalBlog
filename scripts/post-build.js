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
