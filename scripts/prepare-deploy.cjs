#!/usr/bin/env node
// Copies the Vite build output from dist/ into out/wkw-deckbuilder/
// so GitHub Pages can serve it at https://systemplasma.github.io/wkw-deckbuilder/

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

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
copyRecursive(distDir, outDir);

console.log('[prepare-deploy] Copied dist ->', path.relative(root, outDir));

