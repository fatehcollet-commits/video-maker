import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import express from 'express';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const PORT = Number(process.env.PORT || 3000);
const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB';

let isGeneratingVoice = false;
let lastVoiceError: string | null = null;
let isRenderingVideo = false;
let renderProgressPct = 0;
let lastRenderError: string | null = null;

interface LinesJsonSummary {
  source?: string;
  speech_dur?: number;
  voice_dur?: number;
  total_dur?: number;
  lines?: unknown[];
}

function resolveElevenLabsCredentials(voiceIdOverride?: string): {
  apiKey: string;
  voiceId: string;
  swappedWarning: string | null;
} {
  const rawKey = (process.env.ELEVENLABS_API_KEY || '').trim();
  const rawVoice = (voiceIdOverride ?? process.env.ELEVENLABS_VOICE_ID ?? '').trim();

  // If user pasted their secret sk_ key into ELEVENLABS_VOICE_ID instead of ELEVENLABS_API_KEY
  if (!rawKey.startsWith('sk_') && rawVoice.startsWith('sk_')) {
    return {
      apiKey: rawVoice,
      voiceId: DEFAULT_VOICE_ID,
      swappedWarning: null,
    };
  }

  const apiKey = rawKey && !rawKey.startsWith('MY_') ? rawKey : '';
  let voiceId = rawVoice || DEFAULT_VOICE_ID;
  let swappedWarning: string | null = null;

  if (voiceId.startsWith('sk_')) {
    voiceId = DEFAULT_VOICE_ID;
    swappedWarning = 'ELEVENLABS_VOICE_ID looked like an API key; using default voice ID.';
  } else if (!/^[A-Za-z0-9_-]{8,64}$/.test(voiceId)) {
    const urlMatch = voiceId.match(/voiceId=([A-Za-z0-9_-]{8,64})/);
    if (urlMatch) {
      voiceId = urlMatch[1];
    } else {
      swappedWarning = 'Invalid ELEVENLABS_VOICE_ID format; using default voice ID.';
      voiceId = DEFAULT_VOICE_ID;
    }
  }

  return { apiKey, voiceId, swappedWarning };
}

function readVoiceStatus() {
  const linesJsonPath = path.join(ROOT, 'out/ep01_rule_four/lines.json');
  let summary: LinesJsonSummary = {};
  if (fs.existsSync(linesJsonPath)) {
    try {
      summary = JSON.parse(fs.readFileSync(linesJsonPath, 'utf8')) as LinesJsonSummary;
    } catch {
      summary = {};
    }
  }

  const { apiKey, voiceId } = resolveElevenLabsCredentials();
  const safeVoiceId = voiceId.startsWith('sk_') ? DEFAULT_VOICE_ID : voiceId;

  return {
    apiKeyConfigured: Boolean(apiKey),
    voiceId: safeVoiceId,
    source: summary.source || 'offline_synth',
    speechDur: summary.speech_dur ?? 0,
    voiceDur: summary.voice_dur ?? 58.5,
    totalDur: summary.total_dur ?? 60.5,
    lineCount: Array.isArray(summary.lines) ? summary.lines.length : 0,
    generating: isGeneratingVoice,
    lastError: lastVoiceError,
  };
}

function formatPipelineError(err: unknown): string {
  const raw =
    err && typeof err === 'object' && 'stderr' in err && typeof err.stderr === 'string'
      ? `${err.stderr}\n${err instanceof Error ? err.message : ''}`
      : err instanceof Error
        ? err.message
        : 'Voice generation failed.';

  const elMatch = raw.match(/ElevenLabs API HTTP (\d+):\s*(\{[^\n]+\})/);
  if (elMatch) {
    const httpCode = elMatch[1];
    try {
      const parsed = JSON.parse(elMatch[2]) as { detail?: { message?: string; status?: string } };
      const msg = parsed?.detail?.message;
      if (msg) {
        return `ElevenLabs API (${httpCode}): ${msg}`;
      }
    } catch {
      // fall through
    }
    return `ElevenLabs API returned HTTP ${httpCode}. Check ELEVENLABS_API_KEY in Secrets.`;
  }

  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return lines[lines.length - 1] || 'Voice generation failed.';
}

async function runElevenLabsPipeline(voiceIdOverride?: string) {
  const { apiKey, voiceId, swappedWarning } = resolveElevenLabsCredentials(voiceIdOverride);
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured in Secrets or .env.');
  }
  if (swappedWarning) {
    console.warn(`[server] ${swappedWarning}`);
  }

  if (isGeneratingVoice) {
    throw new Error('Voice synthesis is already running.');
  }

  isGeneratingVoice = true;
  lastVoiceError = null;
  try {
    const childEnv = {
      ...process.env,
      ELEVENLABS_API_KEY: apiKey,
      ELEVENLABS_VOICE_ID: voiceId,
    };

    await execFileAsync(
      'python3',
      ['scripts/voice_el.py', '--target', '58.5', '--tail', '2.0'],
      { cwd: ROOT, env: childEnv, timeout: 180_000 },
    );
    await execFileAsync('python3', ['scripts/timeline.py'], {
      cwd: ROOT,
      env: childEnv,
      timeout: 60_000,
    });
    await execFileAsync('python3', ['scripts/audio/mix.py'], {
      cwd: ROOT,
      env: childEnv,
      timeout: 120_000,
    });
  } catch (err) {
    const clean = formatPipelineError(err);
    lastVoiceError = clean;
    throw new Error(clean);
  } finally {
    isGeneratingVoice = false;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/voice/status', (_req, res) => {
    res.json(readVoiceStatus());
  });

  app.post('/api/voice/generate', async (req, res) => {
    const { apiKey } = resolveElevenLabsCredentials();
    if (!apiKey) {
      res.status(400).json({
        error: 'ELEVENLABS_API_KEY is missing. Add it in AI Studio Secrets and restart.',
        status: readVoiceStatus(),
      });
      return;
    }

    const rawVoiceId = typeof req.body?.voiceId === 'string' ? req.body.voiceId.trim() : '';
    if (rawVoiceId && !/^[A-Za-z0-9_-]{8,64}$/.test(rawVoiceId)) {
      res.status(400).json({
        error: 'Voice ID must be 8-64 alphanumeric characters.',
        status: readVoiceStatus(),
      });
      return;
    }

    try {
      await runElevenLabsPipeline(rawVoiceId || undefined);
      res.json({ ok: true, status: readVoiceStatus() });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ElevenLabs pipeline error';
      const statusCode = msg.includes('ElevenLabs API (40') ? 400 : 500;
      res.status(statusCode).json({
        error: msg,
        status: readVoiceStatus(),
      });
    }
  });

  const readVideoStatus = () => {
    const publicMp4 = path.join(ROOT, 'public/EP01_RULE_FOUR.mp4');
    const exists = fs.existsSync(publicMp4);
    const sizeBytes = exists ? fs.statSync(publicMp4).size : 0;
    return {
      exists,
      sizeBytes,
      rendering: isRenderingVideo,
      progress: exists && !isRenderingVideo ? 100 : renderProgressPct,
      error: lastRenderError,
      downloadUrl: exists ? '/EP01_RULE_FOUR.mp4' : null,
      coverUrl: fs.existsSync(path.join(ROOT, 'public/covers/ep01_cover.png'))
        ? '/covers/ep01_cover.png'
        : null,
      avatarUrl: fs.existsSync(path.join(ROOT, 'public/covers/tiktok_avatar.png'))
        ? '/covers/tiktok_avatar.png'
        : null,
    };
  };

  app.get('/api/video/status', (_req, res) => {
    res.json(readVideoStatus());
  });

  app.post('/api/video/render', (_req, res) => {
    if (isRenderingVideo) {
      res.json({ started: false, status: readVideoStatus() });
      return;
    }

    isRenderingVideo = true;
    renderProgressPct = 0;
    lastRenderError = null;

    const child = spawn('node', ['scripts/render.mjs'], {
      cwd: ROOT,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let errBuf = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8');
      const m = text.match(/\[render\] Progress:\s*(\d+)%/);
      if (m) {
        renderProgressPct = Number(m[1]);
      }
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      errBuf += chunk.toString('utf8');
    });
    child.on('close', (code) => {
      isRenderingVideo = false;
      if (code === 0) {
        renderProgressPct = 100;
      } else {
        const lastLine = errBuf
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .pop();
        lastRenderError = lastLine || `Render exited with code ${code}`;
      }
    });

    res.status(202).json({ started: true, status: readVideoStatus() });
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.join(ROOT, 'dist');
    app.use(express.static(distDir));
    app.use(express.static(path.join(ROOT, 'public')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] Sector Seven running on http://0.0.0.0:${PORT}`);

    const status = readVoiceStatus();
    if (status.apiKeyConfigured && status.source !== 'elevenlabs' && !isGeneratingVoice) {
      console.log('[server] ELEVENLABS_API_KEY detected; generating ElevenLabs voiceover...');
      void runElevenLabsPipeline().catch((err) => {
        console.error('[server] Auto ElevenLabs generation failed:', err);
      });
    }
  });
}

void startServer();
