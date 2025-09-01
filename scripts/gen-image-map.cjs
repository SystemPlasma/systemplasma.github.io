#!/usr/bin/env node
/*
  Generate a JSON image map from files in ./assets
  Output: ./src/assets/data/image-map.json

  The map structure is { [key]: "assets/<filename>" }, where
  key is the basename without extension. For example:
    assets/example-ABC123.png -> { "example-ABC123": "assets/example-ABC123.png" }

  This script is intentionally simple and makes no assumptions about
  filename semantics beyond using the basename as the key. Consumers
  can apply their own normalization if desired.
*/

const fs = require('fs');
const path = require('path');

const exts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

const root = process.cwd();
const assetsDir = path.join(root, 'assets');
const outDir = path.join(root, 'src', 'assets', 'data');
const outFile = path.join(outDir, 'image-map.json');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function listFiles(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...listFiles(full));
    } else if (e.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function main() {
  if (!fs.existsSync(assetsDir)) {
    console.warn(`[gen-image-map] Skipped: directory not found: ${assetsDir}`);
    return;
  }

  const files = listFiles(assetsDir)
    .filter(f => exts.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const map = {};
  for (const abs of files) {
    const rel = path.relative(root, abs).split(path.sep).join('/');
    const base = path.basename(abs, path.extname(abs));
    map[base] = rel; // store as project-relative path like "assets/xyz.png"

    // Also add an alias without a trailing hash segment if present.
    // Pattern: <slug>-<hash> where hash is 6+ word chars.
    const dash = base.lastIndexOf('-');
    if (dash > 0) {
      const possibleHash = base.slice(dash + 1);
      if (/^[A-Za-z0-9_\-]{6,}$/.test(possibleHash)) {
        const slug = base.slice(0, dash);
        if (!(slug in map)) {
          map[slug] = rel;
        }
      }
    }
  }

  ensureDir(outDir);
  fs.writeFileSync(outFile, JSON.stringify(map, null, 2) + '\n');
  console.log(`[gen-image-map] Wrote ${Object.keys(map).length} entries to ${path.relative(root, outFile)}`);
}

main();
