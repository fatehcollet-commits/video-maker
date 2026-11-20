import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { Download, Image as ImageIcon, Mic, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import {
  COMP_HEIGHT,
  COMP_WIDTH,
  FPS,
  TAIL_SEC,
  TARGET_VOICE_SEC,
  TOTAL_DURATION_SEC,
  TOTAL_FRAMES,
} from './engine/contract';
import { Short } from './remotion/Short';
import { LINE_IDS, LINES, type LineId } from './stories/ep01_rule_four/lines';
import { SHOTS, lineIdAt, shotAt } from './stories/ep01_rule_four/story';
import { LINE_WINDOWS } from './stories/ep01_rule_four/timeline';

type WorkspaceTab = 'screening' | 'shots' | 'stills';
type PlayerSource = 'live' | 'mp4';

const STILLS_LIST = [
  { id: 'wide_booth', label: 'Wide Booth', lineId: 'L02' as LineId, desc: 'Guard booth, RULE 4 sign, and reinforced blast door.' },
  { id: 'girl_glass', label: 'Girl at Wired Glass', lineId: 'L08' as LineId, desc: 'Lab coat researcher holding bloodstained Level 3 badge.' },
  { id: 'thermal_check', label: 'Thermal 2°C Check', lineId: 'L13' as LineId, desc: 'Exterior thermal camera showing 2°C and zero core heat.' },
  { id: 'jaw_reveal', label: 'Jaw Reveal', lineId: 'L22' as LineId, desc: 'Head cracked sideways with jaw dropped past human limits.' },
  { id: 'cliffhanger_final', label: 'Cliffhanger Tail', lineId: 'L26' as LineId, desc: 'Rear door deadbolt latch click into 1.5s blackout freeze.' },
];

const CUE_SUMMARY: Partial<Record<LineId, string>> = {
  L04: 'Sensor red strobe ping',
  L05: 'Wired glass thump',
  L06: 'Glass claw scratches',
  L11: 'Heartbeat enters (64 BPM)',
  L15: 'Muffled glass thump',
  L16: '+0.25s dramatic pause · zero breath fog',
  L21: 'Bone crack · 8-frame camera kick',
  L22: 'Jaw crack · unhinged transform',
  L23: '12 white eyes · shock kick',
  L24: 'Red strobe pings & floor sweep',
  L25: 'Heartbeat peaks (112 BPM) then cuts silent',
  L26: '+0.25s pause · rear latch click + sub boom (1.5s tail)',
};

function formatTime(sec: number): string {
  return `${sec.toFixed(2)}s`;
}

export default function App() {
  const [tab, setTab] = useState<WorkspaceTab>('screening');
  const [source, setSource] = useState<PlayerSource>('live');
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [mp4Available, setMp4Available] = useState(false);
  const [renderingMp4, setRenderingMp4] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [audioVersion, setAudioVersion] = useState(0);
  const [voiceGenerating, setVoiceGenerating] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const playerRef = useRef<PlayerRef | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTime = currentFrame / FPS;
  const activeLineInfo = useMemo(() => lineIdAt(currentTime), [currentTime]);
  const activeShotEval = useMemo(() => shotAt(currentTime), [currentTime]);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch('/api/video/status');
        if (!res.ok) return;
        const data = (await res.json()) as {
          exists: boolean;
          rendering: boolean;
          progress: number;
          error: string | null;
        };
        if (!active) return;
        setMp4Available(Boolean(data.exists));
        setRenderingMp4(Boolean(data.rendering));
        setRenderProgress(data.progress || 0);
        if (data.error) {
          setVoiceNotice(data.error);
        }
      } catch {
        // Fallback HEAD check for static preview
        try {
          const head = await fetch('/EP01_RULE_FOUR.mp4', { method: 'HEAD' });
          const ct = head.headers.get('content-type') || '';
          if (active && head.ok && ct.includes('video/')) setMp4Available(true);
        } catch {
          if (active) setMp4Available(false);
        }
      }
    };

    void poll();
    const id = window.setInterval(() => {
      if (renderingMp4) void poll();
    }, 2500);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [renderingMp4]);

  // Poll player frame cleanly when playing or scrubbing
  useEffect(() => {
    if (source !== 'live') return;
    let rafId = 0;
    const syncFrame = () => {
      const p = playerRef.current;
      if (p) {
        const f = p.getCurrentFrame();
        setCurrentFrame((prev) => (prev !== f ? f : prev));
        const playing = p.isPlaying();
        setIsPlaying((prev) => (prev !== playing ? playing : prev));
      }
      rafId = requestAnimationFrame(syncFrame);
    };
    rafId = requestAnimationFrame(syncFrame);
    return () => cancelAnimationFrame(rafId);
  }, [source]);

  // Keep master WAV audio element synchronized with Remotion Player
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = muted;
    if (source !== 'live') {
      audio.pause();
      return;
    }
    if (isPlaying) {
      if (Math.abs(audio.currentTime - currentTime) > 0.14) {
        audio.currentTime = currentTime;
      }
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, muted, source, currentTime]);

  const jumpToLine = (lineId: LineId) => {
    const targetSec = LINE_WINDOWS[lineId].start + 0.04;
    const targetFrame = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(targetSec * FPS)));
    setTab('screening');
    setSource('live');
    setCurrentFrame(targetFrame);
    window.setTimeout(() => {
      playerRef.current?.seekTo(targetFrame);
      if (audioRef.current) {
        audioRef.current.currentTime = targetFrame / FPS;
      }
    }, 20);
  };

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (p.isPlaying()) {
      p.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.currentTime = p.getCurrentFrame() / FPS;
      }
      p.play();
      setIsPlaying(true);
    }
  };

  const handleScrub = (frame: number) => {
    setCurrentFrame(frame);
    playerRef.current?.seekTo(frame);
    if (audioRef.current) {
      audioRef.current.currentTime = frame / FPS;
    }
  };

  const restartShort = () => {
    handleScrub(0);
    playerRef.current?.play();
    setIsPlaying(true);
  };

  const handleGenerateElevenLabs = async () => {
    if (voiceGenerating) return;
    setVoiceGenerating(true);
    setVoiceNotice(null);
    try {
      const res = await fetch('/api/voice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setVoiceNotice(
          data.error || 'Add ELEVENLABS_API_KEY in AI Studio Secrets, then retry.',
        );
        return;
      }
      setAudioVersion((v) => v + 1);
      setVoiceNotice(`ElevenLabs voiceover synced and remixed at ${TOTAL_DURATION_SEC.toFixed(1)}s.`);
      if (audioRef.current) {
        audioRef.current.load();
      }
    } catch {
      setVoiceNotice('Unable to reach server voice endpoint.');
    } finally {
      setVoiceGenerating(false);
    }
  };

  const handleExportMp4 = async () => {
    if (mp4Available) {
      const a = document.createElement('a');
      a.href = '/EP01_RULE_FOUR.mp4';
      a.download = 'EP01_RULE_FOUR.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    if (renderingMp4) return;
    setRenderingMp4(true);
    setRenderProgress(0);
    setVoiceNotice('Rendering 1440×2560 MP4 export in background…');
    try {
      await fetch('/api/video/render', { method: 'POST' });
    } catch {
      setRenderingMp4(false);
      setVoiceNotice('Unable to start MP4 render.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <audio
        ref={audioRef}
        src={`/audio/ep01_master.wav${audioVersion > 0 ? `?v=${audioVersion}` : ''}`}
        preload="auto"
      />

      {/* Three-zone Top Bar Contract */}
      <header className="border-b border-neutral-800/90 px-6 py-4 flex items-center justify-between gap-8">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setTab('screening');
          }}
          className="font-display-anton text-xl tracking-wide text-neutral-100 whitespace-nowrap shrink-0"
        >
          SECTOR SEVEN
        </a>

        <nav className="flex items-center gap-6 text-sm font-medium text-neutral-400">
          <button
            type="button"
            onClick={() => setTab('screening')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 ${
              tab === 'screening'
                ? 'text-amber-400 border-b border-amber-400'
                : 'hover:text-neutral-100'
            }`}
          >
            Screening Room
          </button>
          <button
            type="button"
            onClick={() => setTab('shots')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 ${
              tab === 'shots'
                ? 'text-amber-400 border-b border-amber-400'
                : 'hover:text-neutral-100'
            }`}
          >
            Shot Breakdown
          </button>
          <button
            type="button"
            onClick={() => setTab('stills')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 ${
              tab === 'stills'
                ? 'text-amber-400 border-b border-amber-400'
                : 'hover:text-neutral-100'
            }`}
          >
            TikTok Kit & Stills
          </button>
        </nav>

        <div className="shrink-0">
          {mp4Available ? (
            <a
              href="/EP01_RULE_FOUR.mp4"
              download="EP01_RULE_FOUR.mp4"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-amber-400 text-neutral-950 rounded-md hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Download MP4
            </a>
          ) : (
            <button
              type="button"
              onClick={handleExportMp4}
              disabled={renderingMp4}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-amber-400 text-neutral-950 rounded-md hover:bg-amber-300 disabled:opacity-70 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              {renderingMp4 ? `Exporting MP4 (${renderProgress}%)` : 'Download MP4'}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {tab === 'screening' && (
          <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-10 items-start">
            {/* Left column: 9:16 Vertical Viewport */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-lg font-semibold text-neutral-100">
                    Episode 1: Rule Four
                  </h1>
                  <p className="text-xs text-neutral-400 tabular-nums mt-0.5">
                    1080×1920 · 30 fps · {TARGET_VOICE_SEC.toFixed(1)}s + {TAIL_SEC.toFixed(1)}s tail · {TOTAL_FRAMES} frames
                  </p>
                </div>
                {mp4Available && (
                  <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-md">
                    <button
                      type="button"
                      onClick={() => setSource('live')}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                        source === 'live'
                          ? 'bg-neutral-800 text-amber-400'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      Live 2.5D
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        setSource('mp4');
                      }}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                        source === 'mp4'
                          ? 'bg-neutral-800 text-amber-400'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      Final MP4
                    </button>
                  </div>
                )}
              </div>

              <div
                className="relative w-full max-w-[380px] mx-auto bg-black border border-neutral-800 rounded-lg overflow-hidden"
                style={{ aspectRatio: '9 / 16' }}
              >
                {source === 'live' ? (
                  <Player
                    ref={playerRef}
                    component={Short}
                    durationInFrames={TOTAL_FRAMES}
                    compositionWidth={COMP_WIDTH}
                    compositionHeight={COMP_HEIGHT}
                    fps={FPS}
                    inputProps={{ includeAudio: false, waitForFonts: false }}
                    style={{ width: '100%', height: '100%' }}
                    controls={false}
                    loop={false}
                  />
                ) : (
                  <video
                    src="/EP01_RULE_FOUR.mp4"
                    controls
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                )}
              </div>

              {source === 'live' && (
                <div className="w-full max-w-[380px] mx-auto flex flex-col gap-3 pt-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={togglePlay}
                        aria-label={isPlaying ? 'Pause playback' : 'Play episode'}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-amber-400 text-neutral-950 rounded-md hover:bg-amber-300 transition-colors whitespace-nowrap"
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {isPlaying ? 'Pause' : 'Play'}
                      </button>
                      <button
                        type="button"
                        onClick={restartShort}
                        aria-label="Restart episode"
                        className="p-2 text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md hover:text-white transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMuted((m) => !m)}
                        aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                        className="p-2 text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md hover:text-white transition-colors"
                      >
                        {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-neutral-400">
                      {formatTime(currentTime)} / {TOTAL_DURATION_SEC.toFixed(1)}s · F{currentFrame}
                    </span>
                  </div>

                  <label className="sr-only" htmlFor="frame-scrubber">
                    Timeline frame scrubber
                  </label>
                  <input
                    id="frame-scrubber"
                    type="range"
                    min={0}
                    max={TOTAL_FRAMES - 1}
                    value={currentFrame}
                    onChange={(e) => handleScrub(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />

                  <div className="text-xs text-neutral-400 font-mono tabular-nums flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-neutral-800/80 pt-2">
                    <span>Line {activeShotEval.lineId}</span>
                    <span aria-hidden="true">·</span>
                    <span>Set {activeShotEval.subset}</span>
                    <span aria-hidden="true">·</span>
                    <span>FOV {activeShotEval.fov.toFixed(1)}°</span>
                    <span aria-hidden="true">·</span>
                    <span>Z {activeShotEval.pos[2].toFixed(2)}m</span>
                  </div>
                </div>
              )}

              <div className="w-full max-w-[380px] mx-auto grid grid-cols-2 gap-2.5 pt-1">
                {mp4Available ? (
                  <a
                    href="/EP01_RULE_FOUR.mp4"
                    download="EP01_RULE_FOUR.mp4"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-amber-400 text-neutral-950 rounded-md hover:bg-amber-300 transition-colors whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download MP4
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleExportMp4}
                    disabled={renderingMp4}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-amber-400 text-neutral-950 rounded-md hover:bg-amber-300 disabled:opacity-70 transition-colors whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {renderingMp4 ? `MP4 ${renderProgress}%` : 'Download MP4'}
                  </button>
                )}
                <a
                  href="/covers/ep01_cover.png"
                  download="EP01_RULE_FOUR_COVER.png"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-md hover:border-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Cover PNG
                </a>
              </div>
            </section>

            {/* Right column: Line-ID Keyed Script & Cue Sheet */}
            <section className="flex flex-col gap-4 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-neutral-100">
                    Line-Keyed Shot Script
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Click any line from L01 to L26 to seek the 2.5D camera and audio mix directly.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleGenerateElevenLabs}
                    disabled={voiceGenerating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-900 border border-neutral-700 text-neutral-200 rounded-md hover:border-amber-400 hover:text-amber-300 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    {voiceGenerating ? 'Generating Voice…' : 'Sync ElevenLabs Voice'}
                  </button>
                  <span className="text-xs font-mono tabular-nums text-neutral-400 whitespace-nowrap">
                    Active: {activeLineInfo.lineId}
                  </span>
                </div>
              </div>
              {voiceNotice && (
                <p className="text-xs text-amber-300 bg-amber-400/10 border border-amber-400/30 rounded-md px-3 py-2 break-words">
                  {voiceNotice}
                </p>
              )}

              <div className="divide-y divide-neutral-800/70 border border-neutral-800/80 rounded-lg bg-neutral-900/40 max-h-[660px] overflow-y-auto">
                {LINE_IDS.map((id) => {
                  const line = LINES[id];
                  const win = LINE_WINDOWS[id];
                  const shot = SHOTS[id];
                  const isActive = activeLineInfo.lineId === id;
                  const cueNote = CUE_SUMMARY[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => jumpToLine(id)}
                      className={`w-full text-left px-4 py-3 transition-colors flex items-start gap-4 ${
                        isActive
                          ? 'bg-amber-400/10 text-neutral-100'
                          : 'hover:bg-neutral-800/50 text-neutral-300'
                      }`}
                    >
                      <span
                        className={`text-xs font-mono tabular-nums pt-0.5 shrink-0 ${
                          isActive ? 'text-amber-400 font-semibold' : 'text-neutral-500'
                        }`}
                      >
                        {id}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug text-neutral-100">
                          {line.text}
                        </p>
                        <div className="text-xs text-neutral-400 font-mono tabular-nums mt-1 flex flex-wrap items-center gap-x-2">
                          <span>{win.start.toFixed(2)}s–{win.end.toFixed(2)}s</span>
                          <span aria-hidden="true">·</span>
                          <span>{shot.subset}</span>
                          {cueNote && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-neutral-300">{cueNote}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {tab === 'shots' && (
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between border-b border-neutral-800 pb-3">
              <div>
                <h1 className="text-lg font-semibold text-neutral-100">
                  Camera, Scale & Cue Breakdown
                </h1>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Contract bounds: FOV 30°–44° · Distance 4.0–8.0m · Actor height 1.76m · Door 1.05×2.10m · Shot lead 0.12s
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-neutral-400">
                26 shots · {TOTAL_DURATION_SEC.toFixed(1)}s total
              </span>
            </div>

            <div className="overflow-x-auto border border-neutral-800 rounded-lg bg-neutral-900/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 font-mono">
                    <th className="py-3 px-4">Line</th>
                    <th className="py-3 px-4">Window</th>
                    <th className="py-3 px-4">Subset</th>
                    <th className="py-3 px-4">FOV</th>
                    <th className="py-3 px-4">Dialogue</th>
                    <th className="py-3 px-4">Audio / Shock Cue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {LINE_IDS.map((id) => {
                    const win = LINE_WINDOWS[id];
                    const shot = SHOTS[id];
                    return (
                      <tr
                        key={id}
                        className="hover:bg-neutral-800/40 transition-colors cursor-pointer"
                        onClick={() => jumpToLine(id)}
                      >
                        <td className="py-2.5 px-4 font-mono font-semibold text-amber-400">
                          {id}
                        </td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-neutral-300 whitespace-nowrap">
                          {win.start.toFixed(2)}s – {win.end.toFixed(2)}s
                        </td>
                        <td className="py-2.5 px-4 font-mono text-neutral-300 whitespace-nowrap">
                          {shot.subset}
                        </td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-neutral-300 whitespace-nowrap">
                          {shot.fovStart}° → {shot.fovEnd}°
                        </td>
                        <td className="py-2.5 px-4 text-neutral-100">
                          {LINES[id].text}
                        </td>
                        <td className="py-2.5 px-4 text-neutral-400">
                          {CUE_SUMMARY[id] ?? 'Fluorescent hum & rising sub drone'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'stills' && (
          <section className="flex flex-col gap-10">
            <div className="flex flex-col gap-5">
              <div className="flex items-baseline justify-between border-b border-neutral-800 pb-3">
                <div>
                  <h1 className="text-lg font-semibold text-neutral-100">
                    TikTok Export Kit
                  </h1>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Ready-to-upload 9:16 video cover (centered 3:4 grid safe zone) and 1:1 channel profile picture.
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-neutral-400">
                  PNG · Code-rendered
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="flex flex-col gap-3 max-w-[300px]">
                  <div
                    className="overflow-hidden rounded-lg border border-neutral-800 bg-black"
                    style={{ aspectRatio: '9 / 16' }}
                  >
                    <img
                      src="/covers/ep01_cover.png"
                      alt="Episode 1 TikTok Cover"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-100">Episode 1 Cover</p>
                      <p className="text-xs text-neutral-400">1080×1920 PNG</p>
                    </div>
                    <a
                      href="/covers/ep01_cover.png"
                      download="EP01_RULE_FOUR_COVER.png"
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-amber-400 text-neutral-950 rounded-md hover:bg-amber-300 transition-colors whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Cover
                    </a>
                  </div>
                </div>

                <div className="flex flex-col gap-3 max-w-[300px]">
                  <div
                    className="overflow-hidden rounded-full border border-neutral-800 bg-black"
                    style={{ aspectRatio: '1 / 1' }}
                  >
                    <img
                      src="/covers/tiktok_avatar.png"
                      alt="TikTok Channel Profile Picture"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-100">TikTok Profile Picture</p>
                      <p className="text-xs text-neutral-400">1080×1080 PNG (circular crop preview)</p>
                    </div>
                    <a
                      href="/covers/tiktok_avatar.png"
                      download="TIKTOK_PROFILE_AVATAR.png"
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-neutral-100 text-neutral-950 rounded-md hover:bg-white transition-colors whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Avatar
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex items-baseline justify-between border-b border-neutral-800 pb-3">
                <div>
                  <h2 className="text-base font-semibold text-neutral-100">
                    Regression Stills (0.5× Scale)
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Deterministic stills rendered directly by Remotion + Three.js WebGL via scripts/stills.mjs.
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-neutral-400">
                  5 keyframes · 540×960 PNG
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                {STILLS_LIST.map((st) => (
                  <div key={st.id} className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => jumpToLine(st.lineId)}
                      className="group relative block w-full overflow-hidden rounded-lg border border-neutral-800 bg-black text-left focus-visible:outline-2 focus-visible:outline-amber-400"
                      style={{ aspectRatio: '9 / 16' }}
                    >
                      <img
                        src={`/stills/${st.id}.png`}
                        alt={st.label}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                    </button>
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-100">{st.label}</span>
                        <span className="font-mono tabular-nums text-amber-400">{st.lineId}</span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                        {st.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
