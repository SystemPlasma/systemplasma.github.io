#!/usr/bin/env node
/*
  Prepare a staging folder for GitHub Pages deploy that includes:
  - wkw/            -> contents of dist/
  - wkw-deckbuilder/index.html -> redirect to /wkw/
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
const outLegacy = path.join(out, 'wkw-deckbuilder');

// Clean staging dir
try { fs.rmSync(out, { recursive: true, force: true }); } catch {}
fs.mkdirSync(out, { recursive: true });

// Copy build into /wkw
if (!fs.existsSync(dist)) {
  console.error('[prepare-deploy] Missing dist/. Run build first.');
  process.exit(1);
}
copyDir(dist, outWkw);

// Add legacy redirect for /wkw-deckbuilder -> /wkw/
fs.mkdirSync(outLegacy, { recursive: true });
const redirectHtml = `<!doctype html>
<meta charset="utf-8"/>
<title>Redirecting…</title>
<meta http-equiv="refresh" content="0; url=/wkw/"/>
<link rel="canonical" href="/wkw/"/>
<script>location.replace('/wkw/');</script>
<p>If you are not redirected, <a href="/wkw/">click here</a>.</p>
`;
fs.writeFileSync(path.join(outLegacy, 'index.html'), redirectHtml);

// Add root index.html and 404.html redirecting to /wkw/
fs.writeFileSync(path.join(out, 'index.html'), redirectHtml);
fs.writeFileSync(path.join(out, '404.html'), redirectHtml);

console.log('[prepare-deploy] Staged deploy at', path.relative(root, out));
