#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BROWSER_EXECUTABLE = '/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell';

async function main() {
  const linesData = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'out/ep01_rule_four/lines.json'), 'utf8'),
  );
  const byId = Object.fromEntries(linesData.lines.map((l) => [l.id, l]));

  const stills = [
    { name: 'wide_booth', t: (byId.L02.start + byId.L02.end) * 0.5 },
    { name: 'girl_glass', t: (byId.L08.start + byId.L08.end) * 0.5 },
    { name: 'thermal_check', t: (byId.L13.start + byId.L13.end) * 0.5 },
    { name: 'jaw_reveal', t: (byId.L22.start + byId.L22.end) * 0.5 },
    { name: 'cliffhanger_final', t: byId.L26.end + 0.08 },
  ];

  const stillsDir = path.join(ROOT, 'out/ep01_rule_four/stills');
  const publicStillsDir = path.join(ROOT, 'public/stills');
  fs.mkdirSync(stillsDir, { recursive: true });
  fs.mkdirSync(publicStillsDir, { recursive: true });

  console.log('[stills] Bundling Remotion entry once...');
  const serveUrl = await bundle({
    entryPoint: path.join(ROOT, 'src/remotion/index.ts'),
    publicDir: path.join(ROOT, 'public'),
  });

  const browserOpts = {
    browserExecutable: fs.existsSync(BROWSER_EXECUTABLE) ? BROWSER_EXECUTABLE : undefined,
    chromiumOptions: {
      gl: 'swangle',
      enableMultiProcessOnLinux: true,
    },
  };

  const composition = await selectComposition({
    serveUrl,
    id: 'Ep01RuleFour',
    inputProps: { includeAudio: false, waitForFonts: true },
    ...browserOpts,
  });

  for (const s of stills) {
    const frame = Math.max(0, Math.min(composition.durationInFrames - 1, Math.round(s.t * composition.fps)));
    const outPath = path.join(stillsDir, `${s.name}.png`);
    await renderStill({
      composition,
      serveUrl,
      output: outPath,
      frame,
      scale: 0.5,
      imageFormat: 'png',
      inputProps: { includeAudio: false, waitForFonts: true },
      ...browserOpts,
    });
    fs.copyFileSync(outPath, path.join(publicStillsDir, `${s.name}.png`));
    console.log(`[stills] Rendered ${s.name}.png @ frame ${frame} (${s.t.toFixed(2)}s)`);
  }
}

main().catch((err) => {
  console.error('[stills] Failed:', err);
  process.exit(1);
});
