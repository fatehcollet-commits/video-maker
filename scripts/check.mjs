#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function fail(msg) {
  errors.push(msg);
}

// 1. Check required local fonts
for (const fontFile of ['public/fonts/Montserrat-900.ttf', 'public/fonts/Anton.ttf']) {
  const full = path.join(ROOT, fontFile);
  if (!fs.existsSync(full) || fs.statSync(full).size < 10_000) {
    fail(`Missing or invalid local font: ${fontFile}`);
  }
}

// 2. Scan src/ for remote font URLs or Math.random() in engine/stories
function walkDir(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkDir(p));
    else if (/\.(ts|tsx|css|html)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const srcFiles = [...walkDir(path.join(ROOT, 'src')), path.join(ROOT, 'index.html')];
for (const file of srcFiles) {
  const rel = path.relative(ROOT, file);
  const text = fs.readFileSync(file, 'utf8');
  if (/fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net/i.test(text)) {
    fail(`Remote font URL found in ${rel}`);
  }
  if (/https?:\/\/[^\s"'`<>]+\.(woff2?|ttf|otf|mp3|wav|png|jpe?g|webp)/i.test(text)) {
    fail(`Remote external asset URL found in ${rel}`);
  }
  if ((rel.startsWith('src/engine/') || rel.startsWith('src/stories/')) && /\bMath\.random\s*\(/.test(text)) {
    fail(`Non-deterministic Math.random() found in ${rel}`);
  }
}

// 3. Verify all LINES keys exist in SHOTS and vice versa
const linesTs = fs.readFileSync(path.join(ROOT, 'src/stories/ep01_rule_four/lines.ts'), 'utf8');
const storyTs = fs.readFileSync(path.join(ROOT, 'src/stories/ep01_rule_four/story.ts'), 'utf8');
const lineIds = [...linesTs.matchAll(/^\s*['"]?(L\d{2})['"]?\s*:\s*\{/gm)].map((m) => m[1]);
const shotIds = [...storyTs.matchAll(/^\s*['"]?(L\d{2})['"]?\s*:\s*\{/gm)].map((m) => m[1]);

if (lineIds.length !== 26) {
  fail(`Expected 26 LINES entries, found ${lineIds.length}`);
}
for (const lid of lineIds) {
  if (!shotIds.includes(lid)) {
    fail(`LINE ${lid} is missing from SHOTS in story.ts`);
  }
}
for (const sid of shotIds) {
  if (!lineIds.includes(sid)) {
    fail(`SHOT ${sid} in story.ts does not exist in LINES`);
  }
}

// 4. Check generated timeline.ts exists and satisfies 60s contract
const timelinePath = path.join(ROOT, 'src/stories/ep01_rule_four/timeline.ts');
if (!fs.existsSync(timelinePath)) {
  fail('Missing src/stories/ep01_rule_four/timeline.ts (run python3 scripts/timeline.py)');
} else {
  const tlText = fs.readFileSync(timelinePath, 'utf8');
  const totalMatch = tlText.match(/export const TOTAL_DURATION = ([0-9.]+);/);
  if (!totalMatch || Math.abs(parseFloat(totalMatch[1]) - 60.5) > 0.05) {
    fail(`TOTAL_DURATION must be ~60.5s, got ${totalMatch ? totalMatch[1] : 'missing'}`);
  }
}

if (errors.length > 0) {
  console.error('[check] BUILD GUARD FAILED:');
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}

console.log('[check] All determinism, local font, lineId-shot parity, and 60s contract checks passed.');
