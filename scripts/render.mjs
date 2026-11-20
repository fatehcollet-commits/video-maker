#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BROWSER_EXECUTABLE = '/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell';

function parseArgs(argv) {
  let part = null;
  let muxOnly = false;
  for (const arg of argv) {
    if (arg.startsWith('--part=')) {
      const [idxStr, totalStr] = arg.slice('--part='.length).split('/');
      const idx = Number(idxStr);
      const total = Number(totalStr);
      if (!Number.isInteger(idx) || !Number.isInteger(total) || idx < 1 || idx > total) {
        throw new Error(`Invalid --part argument: ${arg}`);
      }
      part = { idx, total };
    } else if (arg === '--mux-only') {
      muxOnly = true;
    }
  }
  return { part, muxOnly };
}

async function main() {
  const { part, muxOnly } = parseArgs(process.argv.slice(2));
  const outDir = path.join(ROOT, 'out/ep01_rule_four');
  const partsDir = path.join(outDir, 'parts');
  const masterWav = path.join(outDir, 'master.wav');
  if (!fs.existsSync(masterWav)) {
    throw new Error('Missing out/ep01_rule_four/master.wav; run python3 scripts/audio/mix.py first.');
  }

  const silentMp4 = path.join(outDir, 'video_silent.mp4');
  const finalMp4 = path.join(outDir, 'EP01_RULE_FOUR.mp4');
  const publicMp4 = path.join(ROOT, 'public/EP01_RULE_FOUR.mp4');

  if (!muxOnly) {
    console.log('[render] Bundling Remotion entry once...');
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

    let frameRange;
    let outputLocation = silentMp4;
    if (part) {
      fs.mkdirSync(partsDir, { recursive: true });
      const totalFrames = composition.durationInFrames;
      const chunk = Math.ceil(totalFrames / part.total);
      const start = (part.idx - 1) * chunk;
      const end = Math.min(totalFrames - 1, part.idx * chunk - 1);
      frameRange = [start, end];
      outputLocation = path.join(partsDir, `part_${part.idx}_of_${part.total}.mp4`);
      console.log(
        `[render] Part ${part.idx}/${part.total}: frames ${start}-${end} (${end - start + 1} frames) @ ${composition.width}x${composition.height} (scale 4/3 -> 1440x2560)...`,
      );
    } else {
      console.log(
        `[render] Rendering ${composition.durationInFrames} frames @ ${composition.width}x${composition.height} (scale 4/3 -> 1440x2560)...`,
      );
    }

    let lastPct = -10;
    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      outputLocation,
      scale: 4 / 3,
      crf: 14,
      imageFormat: 'jpeg',
      jpegQuality: 96,
      concurrency: 2,
      frameRange,
      inputProps: { includeAudio: false, waitForFonts: true },
      onProgress: ({ progress }) => {
        const pct = Math.floor(progress * 100);
        if (pct >= lastPct + 10) {
          lastPct = pct;
          console.log(`[render] Progress: ${pct}%`);
        }
      },
      ...browserOpts,
    });

    if (part) {
      console.log(`[render] Part ${part.idx}/${part.total} complete -> ${path.relative(ROOT, outputLocation)}`);
      return;
    }
  } else {
    const partFiles = fs
      .readdirSync(partsDir)
      .filter((f) => /^part_\d+_of_\d+\.mp4$/.test(f))
      .sort((a, b) => {
        const ai = Number(a.match(/^part_(\d+)_of_/)?.[1] ?? 0);
        const bi = Number(b.match(/^part_(\d+)_of_/)?.[1] ?? 0);
        return ai - bi;
      });
    if (partFiles.length === 0) {
      throw new Error('No part files found in out/ep01_rule_four/parts for --mux-only.');
    }
    const concatListPath = path.join(partsDir, 'concat.txt');
    fs.writeFileSync(
      concatListPath,
      partFiles.map((f) => `file '${path.join(partsDir, f)}'`).join('\n') + '\n',
      'utf8',
    );
    console.log(`[render] Concatenating ${partFiles.length} rendered parts via ffmpeg...`);
    execFileSync(
      'ffmpeg',
      ['-y', '-f', 'concat', '-safe', '0', '-i', concatListPath, '-c', 'copy', silentMp4],
      { stdio: 'inherit' },
    );
  }

  console.log('[render] Muxing 1440x2560 H.264 video with 48kHz master.wav via ffmpeg...');
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i', silentMp4,
      '-i', masterWav,
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '256k',
      '-ar', '48000',
      '-shortest',
      '-movflags', '+faststart',
      finalMp4,
    ],
    { stdio: 'inherit' },
  );

  fs.copyFileSync(finalMp4, publicMp4);
  console.log(`[render] Done -> ${path.relative(ROOT, finalMp4)}`);
}

main().catch((err) => {
  console.error('[render] Failed:', err);
  process.exit(1);
});
