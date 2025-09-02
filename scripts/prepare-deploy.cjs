#!/usr/bin/env node
/*
  Prepare a staging folder for GitHub Pages deploy with a single site path:
  - /wkw/ -> the app (no other redirects or legacy paths)
*/
const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
}

const root = process.cwd();
const dist = path.join(root, 'dist');
const out = path.join(root, 'out');
const outWkw = path.join(out, 'wkw');

// Clean staging dir
try { fs.rmSync(out, { recursive: true, force: true }); } catch {}
fs.mkdirSync(out, { recursive: true });

// Choose source: prefer existing wkw/ folder, else dist/
let srcDir = null;
if (fs.existsSync(path.join(root, 'wkw'))) srcDir = path.join(root, 'wkw');
else if (fs.existsSync(dist)) srcDir = dist;
else {
  console.error('[prepare-deploy] Missing build. Run npm run build first.');
  process.exit(1);
}

// Copy build to /wkw
copyDir(srcDir, outWkw);

console.log('[prepare-deploy] Staged deploy at', path.relative(root, out));
