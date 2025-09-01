#!/usr/bin/env node
/*
  Prepare a staging folder for GitHub Pages deploy that includes a single page app at:
  - /wkw-deckbuilder/        (the original, working path)

  It copies built files and rewrites index.html to use the /wkw-deckbuilder/ base.
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
const builtWkw = path.join(root, 'wkw');

// Clean staging dir
try { fs.rmSync(out, { recursive: true, force: true }); } catch {}
fs.mkdirSync(out, { recursive: true });

// Source of truth for built files
let srcDir = null;
if (fs.existsSync(builtWkw)) srcDir = builtWkw;
else if (fs.existsSync(dist)) srcDir = dist;
else {
  console.error('[prepare-deploy] Could not find built files in wkw/ or dist/. Run build first.');
  process.exit(1);
}

// Copy assets and favicon into /wkw-deckbuilder
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
