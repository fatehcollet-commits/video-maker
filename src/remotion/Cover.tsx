import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { ensureLocalFontsLoaded } from '../engine/captions';
import { CAPTION_HIGHLIGHT_HEX, COMP_HEIGHT, COMP_WIDTH } from '../engine/contract';
import { shotAt } from '../stories/ep01_rule_four/story';
import { buildEp01World } from '../stories/ep01_rule_four/world';

export interface EpisodeCoverProps {
  episodeTag?: string;
  titleLine1?: string;
  titleHighlight?: string;
  titleLine2?: string;
  footerHook?: string;
  keyframeTimeSec?: number;
  waitForFonts?: boolean;
}

export const EpisodeCover: React.FC<EpisodeCoverProps> = ({
  episodeTag = 'SECTOR 07 // LOG 01',
  titleLine1 = 'RULE FOUR:',
  titleHighlight = 'NO BREATH',
  titleLine2 = 'ON THE GLASS',
  footerHook = 'NEVER OPEN AFTER MIDNIGHT',
  keyframeTimeSec = 49.0,
  waitForFonts = true,
}) => {
  const { width, height } = useVideoConfig();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [fontsReady, setFontsReady] = useState(!waitForFonts);

  useEffect(() => {
    let cancelled = false;
    let handle: number | null = null;
    if (waitForFonts) {
      handle = delayRender('Loading local fonts for TikTok cover');
    }
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        setFontsReady(true);
        if (handle !== null) continueRender(handle);
      }
    }, 8000);

    ensureLocalFontsLoaded()
      .then(() => {
        window.clearTimeout(timer);
        if (!cancelled) {
          setFontsReady(true);
          if (handle !== null) continueRender(handle);
        }
      })
      .catch(() => {
        window.clearTimeout(timer);
        if (!cancelled) {
          setFontsReady(true);
          if (handle !== null) continueRender(handle);
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (handle !== null) continueRender(handle);
    };
  }, [waitForFonts]);

  useLayoutEffect(() => {
    const mount = stageRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setPixelRatio(1);
    renderer.setSize(COMP_WIDTH, COMP_HEIGHT, false);
    renderer.setClearColor(0x020305, 1);

    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020305);
    const camera = new THREE.PerspectiveCamera(36, COMP_WIDTH / COMP_HEIGHT, 0.1, 40);
    const world = buildEp01World();
    scene.add(world.root);

    const state = shotAt(keyframeTimeSec);
    world.update(state, keyframeTimeSec);
    camera.fov = state.fov;
    camera.position.set(state.pos[0], state.pos[1], state.pos[2]);
    camera.lookAt(state.look[0], state.look[1], state.look[2]);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);

    return () => {
      world.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [keyframeTimeSec]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#020305', width, height }}>
      <div
        ref={stageRef}
        style={{ width: '100%', height: '100%', position: 'relative' }}
      />

      {/* Heavy horror vignette + crimson edge wash */}
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0.12) 25%, rgba(0,0,0,0.82) 100%)',
        }}
      />
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background:
            'linear-gradient(180deg, rgba(120,10,16,0.34) 0%, rgba(0,0,0,0.08) 38%, rgba(0,0,0,0.55) 76%, rgba(0,0,0,0.92) 100%)',
        }}
      />

      {/* TikTok 3:4 profile-grid safe-zone cover lockup (center 1080x1440 band) */}
      {fontsReady && (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: Math.round(height * 0.11),
            paddingBottom: Math.round(height * 0.18),
            paddingLeft: Math.round(width * 0.08),
            paddingRight: Math.round(width * 0.08),
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(185, 28, 28, 0.92)',
              color: '#f8fafc',
              fontFamily: "'LocalMontserrat', 'Montserrat', sans-serif",
              fontWeight: 900,
              fontSize: '30px',
              letterSpacing: '0.16em',
              padding: '12px 26px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              boxShadow: '0 8px 28px rgba(0,0,0,0.75)',
            }}
          >
            {episodeTag}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '10px',
              marginTop: Math.round(height * 0.25),
            }}
          >
            <div
              style={{
                fontFamily: "'LocalAnton', 'Anton', sans-serif",
                fontSize: '124px',
                lineHeight: 0.96,
                letterSpacing: '0.025em',
                color: '#f8fafc',
                textTransform: 'uppercase',
                textShadow:
                  '0 10px 34px rgba(0,0,0,0.98), 0 3px 10px rgba(0,0,0,0.98)',
              }}
            >
              <div>{titleLine1}</div>
              <div style={{ color: CAPTION_HIGHLIGHT_HEX }}>{titleHighlight}</div>
              <div>{titleLine2}</div>
            </div>

            <div
              style={{
                marginTop: '18px',
                fontFamily: "'LocalMontserrat', 'Montserrat', sans-serif",
                fontWeight: 900,
                fontSize: '34px',
                letterSpacing: '0.08em',
                color: '#e2e8f0',
                textTransform: 'uppercase',
                textShadow: '0 4px 18px rgba(0,0,0,0.98)',
              }}
            >
              {footerHook}
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export interface TikTokAvatarProps {
  badgeCode?: string;
}

export const TikTokAvatar: React.FC<TikTokAvatarProps> = ({ badgeCode = '07' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const S = 1080;
    const cx = S / 2;
    const cy = S / 2;

    // 1. Dark steel radial backdrop
    const bg = ctx.createRadialGradient(cx, cy, 40, cx, cy, 540);
    bg.addColorStop(0, '#131a24');
    bg.addColorStop(0.65, '#090c12');
    bg.addColorStop(1, '#030407');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);

    // 2. Subtle steel rivets & panel seam
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 4;
    ctx.strokeRect(170, 170, 740, 740);

    // 3. Crimson emergency strobe halo ring (fits circular TikTok avatar crop)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 446, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.72)';
    ctx.lineWidth = 14;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 42;
    ctx.stroke();
    ctx.restore();

    // 4. Recessed wired-glass square aperture
    const wx = 290;
    const wy = 290;
    const ws = 500;
    ctx.fillStyle = '#05070b';
    ctx.fillRect(wx, wy, ws, ws);

    // Silhouette behind glass
    ctx.fillStyle = '#0b1018';
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 118, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 175, wy + ws);
    ctx.lineTo(cx - 120, cy + 100);
    ctx.lineTo(cx + 120, cy + 100);
    ctx.lineTo(cx + 175, wy + ws);
    ctx.closePath();
    ctx.fill();

    // Two stark glowing white horror eyes
    for (const ex of [cx - 46, cx + 46]) {
      ctx.save();
      const glow = ctx.createRadialGradient(ex, cy - 22, 2, ex, cy - 22, 52);
      glow.addColorStop(0, 'rgba(255,255,255,1)');
      glow.addColorStop(0.32, 'rgba(226,232,240,0.7)');
      glow.addColorStop(1, 'rgba(226,232,240,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ex, cy - 22, 52, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, cy - 22, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Diamond safety wire mesh over window
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx, wy, ws, ws);
    ctx.clip();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = 3;
    for (let d = -ws; d <= ws * 2; d += 44) {
      ctx.beginPath();
      ctx.moveTo(wx + d, wy);
      ctx.lineTo(wx + d - ws, wy + ws);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(wx + d, wy);
      ctx.lineTo(wx + d + ws, wy + ws);
      ctx.stroke();
    }

    // Claw scratch gouges (deterministic coordinates)
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.36)';
    ctx.lineWidth = 2.5;
    const scratches: [number, number, number, number][] = [
      [340, 355, 675, 425],
      [355, 385, 650, 442],
      [410, 620, 730, 560],
      [430, 650, 705, 598],
    ];
    for (const [x1, y1, x2, y2] of scratches) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();

    // Heavy steel glass bezel
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 14;
    ctx.strokeRect(wx, wy, ws, ws);

    // Bold crimson stencil code at top inside circular safe zone
    ctx.save();
    ctx.fillStyle = '#ef4444';
    ctx.font = '900 84px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(239, 68, 68, 0.55)';
    ctx.shadowBlur = 18;
    ctx.fillText(badgeCode, cx, 195);
    ctx.restore();
  }, [badgeCode]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#030407' }}>
      <canvas ref={canvasRef} width={1080} height={1080} style={{ width: '100%', height: '100%' }} />
    </AbsoluteFill>
  );
};
