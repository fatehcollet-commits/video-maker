#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BROWSER_EXECUTABLE = '/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell';

async function main() {
  const outDir = path.join(ROOT, 'out/ep01_rule_four');
  const publicCoversDir = path.join(ROOT, 'public/covers');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(publicCoversDir, { recursive: true });

  console.log('[cover] Bundling Remotion entry once...');
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

  const coverComp = await selectComposition({
    serveUrl,
    id: 'Ep01Cover',
    inputProps: { waitForFonts: true },
    ...browserOpts,
  });
  const coverOut = path.join(outDir, 'cover.png');
  const coverPublic = path.join(publicCoversDir, 'ep01_cover.png');
  await renderStill({
    composition: coverComp,
    serveUrl,
    output: coverOut,
    frame: 0,
    scale: 1,
    inputProps: { waitForFonts: true },
    ...browserOpts,
  });
  fs.copyFileSync(coverOut, coverPublic);
  console.log('[cover] Rendered 1080x1920 TikTok cover -> public/covers/ep01_cover.png');

  const avatarComp = await selectComposition({
    serveUrl,
    id: 'TikTokAvatar',
    inputProps: { badgeCode: '07' },
    ...browserOpts,
  });
  const avatarOut = path.join(outDir, 'avatar.png');
  const avatarPublic = path.join(publicCoversDir, 'tiktok_avatar.png');
  await renderStill({
    composition: avatarComp,
    serveUrl,
    output: avatarOut,
    frame: 0,
    scale: 1,
    inputProps: { badgeCode: '07' },
    ...browserOpts,
  });
  fs.copyFileSync(avatarOut, avatarPublic);
  console.log('[cover] Rendered 1080x1080 TikTok avatar -> public/covers/tiktok_avatar.png');
}

main().catch((err) => {
  console.error('[cover] Failed:', err);
  process.exit(1);
});
