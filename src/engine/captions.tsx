import React, { useEffect, useState } from 'react';
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  CAPTION_CUTIN_FRAMES,
  CAPTION_CUTIN_SCALE,
  CAPTION_FINAL_SIZE_PX,
  CAPTION_HIGHLIGHT_HEX,
  CAPTION_LONG_CHAR_THRESHOLD,
  CAPTION_LONG_SIZE_PX,
  CAPTION_SIZE_PX,
  SAFE_BOTTOM_PCT,
  SAFE_TOP_PCT,
} from './contract';
import { clamp, lerp } from './rng';
import type { CaptionCard } from '../stories/ep01_rule_four/timeline';

let fontsLoadedPromise: Promise<void> | null = null;

export function ensureLocalFontsLoaded(): Promise<void> {
  if (fontsLoadedPromise) return fontsLoadedPromise;
  fontsLoadedPromise = (async () => {
    if (typeof document === 'undefined' || !('fonts' in document)) return;
    const montFace = new FontFace(
      'LocalMontserrat',
      `url("${staticFile('fonts/Montserrat-900.ttf')}")`,
      { weight: '900', style: 'normal' },
    );
    const antonFace = new FontFace(
      'LocalAnton',
      `url("${staticFile('fonts/Anton.ttf')}")`,
      { weight: '400', style: 'normal' },
    );
    const loaded = await Promise.all([montFace.load(), antonFace.load()]);
    for (const f of loaded) {
      document.fonts.add(f);
    }
    await document.fonts.ready;
  })();
  return fontsLoadedPromise;
}

export interface CaptionsOverlayProps {
  cards: readonly CaptionCard[];
  waitForFonts?: boolean;
}

export const CaptionsOverlay: React.FC<CaptionsOverlayProps> = ({
  cards,
  waitForFonts = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let handle: number | null = null;
    if (waitForFonts) {
      handle = delayRender('Loading local Montserrat-900 and Anton fonts');
    }
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        setReady(true);
        if (handle !== null) continueRender(handle);
      }
    }, 8000);

    ensureLocalFontsLoaded()
      .then(() => {
        window.clearTimeout(timer);
        if (!cancelled) {
          setReady(true);
          if (handle !== null) continueRender(handle);
        }
      })
      .catch(() => {
        window.clearTimeout(timer);
        if (!cancelled) {
          setReady(true);
          if (handle !== null) continueRender(handle);
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (handle !== null) continueRender(handle);
    };
  }, [waitForFonts]);

  if (!ready) return null;

  const activeCard = cards.find((c) => t >= c.start && t <= c.end);
  if (!activeCard) return null;

  const framesSinceStart = Math.max(0, (t - activeCard.start) * fps);
  const cutInProgress = clamp(framesSinceStart / CAPTION_CUTIN_FRAMES, 0, 1);
  const scale = lerp(CAPTION_CUTIN_SCALE, 1.0, cutInProgress);

  const isFinal = activeCard.isFinal;
  const isLong = activeCard.text.length >= CAPTION_LONG_CHAR_THRESHOLD;
  const fontSize = isFinal
    ? CAPTION_FINAL_SIZE_PX
    : isLong
      ? CAPTION_LONG_SIZE_PX
      : CAPTION_SIZE_PX;

  const fontFamily = isFinal
    ? "'LocalAnton', 'Anton', sans-serif"
    : "'LocalMontserrat', 'Montserrat', sans-serif";

  const padTop = Math.round(height * SAFE_TOP_PCT);
  const padBottom = Math.round(height * SAFE_BOTTOM_PCT);
  const padSide = Math.round(width * 0.075);

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        paddingTop: padTop,
        paddingBottom: padBottom,
        paddingLeft: padSide,
        paddingRight: padSide,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: isFinal ? 'center' : 'flex-end',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          transform: `scale(${scale.toFixed(4)})`,
          transformOrigin: 'center center',
          textAlign: 'center',
          fontFamily,
          fontWeight: isFinal ? 400 : 900,
          fontSize: `${fontSize}px`,
          lineHeight: isFinal ? 1.06 : 1.12,
          letterSpacing: isFinal ? '0.03em' : '-0.015em',
          textTransform: 'uppercase',
          color: '#f8fafc',
          textShadow:
            '0 6px 24px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.98), 0 0 2px rgba(0,0,0,1)',
          maxWidth: '100%',
          marginTop: isFinal ? Math.round(height * 0.14) : 0,
          marginBottom: isFinal ? 0 : Math.round(height * 0.06),
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {activeCard.words.map((word, idx) => {
          const isHighlight = idx === activeCard.highlightIndex;
          return (
            <React.Fragment key={`${activeCard.id}-${idx}`}>
              <span
                style={{
                  color: isHighlight ? CAPTION_HIGHLIGHT_HEX : '#f8fafc',
                  display: 'inline-block',
                }}
              >
                {word}
              </span>
              {idx < activeCard.words.length - 1 ? ' ' : null}
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
