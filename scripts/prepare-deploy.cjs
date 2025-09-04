#!/usr/bin/env node
// Prepare output folder for GitHub Pages single-page deploy under /wkw-deckbuilder
// Copies everything from dist/ to out/wkw-deckbuilder/

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const distDir = path.join(root, 'dist');
const outRoot = path.join(root, 'out');
const outDir = path.join(outRoot, 'wkw-deckbuilder');

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

if (!fs.existsSync(distDir)) {
  console.error('[prepare-deploy] dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

// Ensure Pages doesn’t treat /assets as Jekyll
fs.writeFileSync(path.join(distDir, '.nojekyll'), '');

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
copyRecursive(distDir, outDir);

console.log('[prepare-deploy] Copied', path.relative(root, distDir), '→', path.relative(root, outDir));

