#!/usr/bin/env node
/**
 * Update roles in src/assets/data/cards.csv by card name.
 * - Merges with existing roles (deduped, lowercase)
 * - Leaves unspecified cards untouched
 * - Prints a list of cards with empty roles afterwards
 */
const fs = require('fs');
const path = require('path');

function parseCSV(raw) {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = split(lines[0]).map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l || !l.trim()) continue;
    const parts = split(l);
    const r = {};
    headers.forEach((h, idx) => { r[h] = (parts[idx] ?? '').trim(); });
    rows.push(r);
  }
  return { headers, rows };
}
function split(line) {
  const out = []; let cur = ''; let q = false;
  for (let i=0;i<line.length;i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') { if (line[i+1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += ch;
    } else {
      if (ch === ',') { out.push(cur); cur = ''; }
      else if (ch === '"') q = true;
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}
function toCSV(headers, rows) {
  const esc = (s) => {
    if (s == null) s = '';
    s = String(s);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const head = headers.map(esc).join(',');
  const body = rows.map(r => headers.map(h => esc(r[h] ?? '')).join(',')).join('\n');
  return head + '\n' + body + '\n';
}

const map = {
  // Special
  "infinity": ['special'],
  "mend": ['special','search_draw'],
  "excalibur's blessing": ['special','power_increase','movement_increase'],
  "divine intervention": ['special','power_increase','counter'],
  "wish": ['special'],
  "thought acceleration": ['special'],
  // Combat
  "enhance": ['power_increase'],
  "shield": ['defensive','counter'],
  "haste": ['power_increase','movement_increase'],
  "flexible tactics": ['power_increase','movement_increase','search_draw'],
  "fool's courage": ['power_increase'],
  // Draw
  "sorcerer's gambit": ['search_draw'],
  "arcane vision": ['search_draw'],
  "gain wisdom": ['search_draw','movement_increase'],
  "trial and error": ['search_draw'],
  "call of ancients": ['search_draw','movement_increase'],
  "cry of the banshee": ['search_draw','counter'],
  "radiant retrieval": ['search_draw'],
  // Disrupt
  "counter": ['counter'],
  "manticores' wrath": ['counter','movement_increase'],
  "medusa's gaze": ['counter','inflict_status'],
  "sirens' song": ['counter'],
  "hourglass of fate": ['counter'],
  "fear": ['counter','inflict_status'],
  "arcane reset": ['counter'],
  // Move
  "speed": ['movement_increase'],
  "teleport": ['movement_increase'],
  // Reveal
  "glimpse of insight": ['search_draw'],
};

function norm(s){ return (s||'').trim().toLowerCase(); }

function main(){
  const csvPath = path.join(process.cwd(), 'src','assets','data','cards.csv');
  const raw = fs.readFileSync(csvPath,'utf8');
  const {headers, rows} = parseCSV(raw);
  const hasRoles = headers.some(h => h.toLowerCase()==='roles' || h.toLowerCase()==='role');
  const rolesHeader = headers.find(h=>h.toLowerCase()==='roles') || headers.find(h=>h.toLowerCase()==='role') || 'roles';
  const nextHeaders = hasRoles ? headers : [...headers, 'roles'];

  for (const r of rows){
    const nm = norm(r.name);
    const existing = (r[rolesHeader] || r.roles || r.role || '').trim();
    let roles = existing? existing.split(/[,;]+/).map(s=>norm(s)).filter(Boolean):[];
    const add = map[nm];
    if (add){
      roles = Array.from(new Set([...roles, ...add.map(norm)])).filter(Boolean);
    }
    r['roles'] = roles.join(';');
  }

  const missing = rows.filter(r => !(r['roles']||'').trim());
  const out = toCSV(nextHeaders, rows);
  fs.writeFileSync(csvPath, out, 'utf8');
  if (missing.length){
    console.log('[update-roles] Missing roles for', missing.length, 'cards:');
    missing.slice(0,50).forEach(r=>console.log(' -', r.name));
    if (missing.length>50) console.log(' ... and', missing.length-50, 'more');
  } else {
    console.log('[update-roles] All cards have roles.');
  }
}

main();
