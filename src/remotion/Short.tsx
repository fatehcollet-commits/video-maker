import React, { useLayoutEffect, useRef } from 'react';
import {
  AbsoluteFill,
  Audio,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import * as THREE from 'three';
import { CaptionsOverlay } from '../engine/captions';
import { COMP_HEIGHT, COMP_WIDTH } from '../engine/contract';
import { shotAt } from '../stories/ep01_rule_four/story';
import { CAPTION_CARDS } from '../stories/ep01_rule_four/timeline';
import { buildEp01World, type Ep01World } from '../stories/ep01_rule_four/world';

export interface ShortProps {
  includeAudio?: boolean;
  waitForFonts?: boolean;
}

export const Short: React.FC<ShortProps> = ({
  includeAudio = false,
  waitForFonts = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const latestT = useRef(t);
  latestT.current = t;

  const glRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    world: Ep01World;
  } | null>(null);

  const renderAtTime = (timeSec: number) => {
    const ctx = glRef.current;
    if (!ctx) return;
    const { renderer, scene, camera, world } = ctx;
    const state = shotAt(timeSec);

    world.update(state, timeSec);

    camera.fov = state.fov;
    camera.position.set(state.pos[0], state.pos[1], state.pos[2]);
    camera.lookAt(state.look[0], state.look[1], state.look[2]);
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
  };

  useLayoutEffect(() => {
    const mount = containerRef.current;
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

    glRef.current = { renderer, scene, camera, world };
    renderAtTime(latestT.current);

    return () => {
      world.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      glRef.current = null;
    };
  }, []);

  const evalState = shotAt(t);

  useLayoutEffect(() => {
    renderAtTime(t);
  }, [frame, t]);

  const blackOverlay = Math.max(evalState.cutDip, evalState.blackoutAmount);

  return (
    <AbsoluteFill style={{ backgroundColor: '#020305' }}>
      <div
        ref={containerRef}
        data-testid="three-stage"
        style={{ width: '100%', height: '100%', position: 'relative' }}
      />

      {/* Measured horror vignette scrim */}
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 46%, rgba(0,0,0,0.72) 100%)',
        }}
      />

      {/* Red emergency wash overlay during L24-L25 strobe */}
      {evalState.strobeGate > 0.02 && (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            backgroundColor: `rgba(195, 16, 22, ${(evalState.strobeGate * 0.22).toFixed(3)})`,
          }}
        />
      )}

      {/* 2-frame cutDip and 1.5s pitch-black freeze tail */}
      {blackOverlay > 0.005 && (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            backgroundColor: '#000000',
            opacity: blackOverlay,
          }}
        />
      )}

      <CaptionsOverlay cards={CAPTION_CARDS} waitForFonts={waitForFonts} />

      {includeAudio && <Audio src={staticFile('audio/ep01_master.wav')} />}
    </AbsoluteFill>
  );
};
