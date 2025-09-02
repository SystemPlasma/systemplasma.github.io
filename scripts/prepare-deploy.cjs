#!/usr/bin/env node
/*
  Option A: Deploy to /wkw-deckbuilder/ only (no redirects)
  - Copies built files from existing wkw/ (or dist/) and rewrites index.html
    to point to the /wkw-deckbuilder/ base.
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
const outDeck = path.join(out, 'wkw-deckbuilder');

// Clean staging dir
try { fs.rmSync(out, { recursive: true, force: true }); } catch {}
fs.mkdirSync(out, { recursive: true });

// Choose source: prefer existing wkw/ folder (built previously for /wkw/), else dist/
let srcDir = null;
if (fs.existsSync(path.join(root, 'wkw'))) srcDir = path.join(root, 'wkw');
else if (fs.existsSync(dist)) srcDir = dist;
else {
  console.error('[prepare-deploy] Missing build. Run npm run build first.');
  process.exit(1);
}

// Copy assets and root files to /wkw-deckbuilder
fs.mkdirSync(outDeck, { recursive: true });
if (fs.existsSync(path.join(srcDir, 'assets'))) {
  copyDir(path.join(srcDir, 'assets'), path.join(outDeck, 'assets'));
}
for (const f of ['favicon.ico', 'vite.svg']) {
  const p = path.join(srcDir, f);
  if (fs.existsSync(p)) fs.copyFileSync(p, path.join(outDeck, f));
}

// Rewrite index.html to point to /wkw-deckbuilder/
const idxPath = path.join(srcDir, 'index.html');
if (!fs.existsSync(idxPath)) {
  console.error('[prepare-deploy] Missing index.html in', srcDir);
  process.exit(1);
}
let html = fs.readFileSync(idxPath, 'utf8');
html = html.replaceAll('/wkw/', '/wkw-deckbuilder/');
html = html.replace('WK:W Grimoire Binding', 'WK:W Deck Builder');
fs.writeFileSync(path.join(outDeck, 'index.html'), html);

console.log('[prepare-deploy] Staged deploy at', path.relative(root, out));
