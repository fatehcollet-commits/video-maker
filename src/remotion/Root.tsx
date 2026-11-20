import React from 'react';
import { Composition, Still } from 'remotion';
import { COMP_HEIGHT, COMP_WIDTH, FPS, TOTAL_FRAMES } from '../engine/contract';
import { EpisodeCover, TikTokAvatar } from './Cover';
import { Short } from './Short';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Ep01RuleFour"
        component={Short}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={COMP_WIDTH}
        height={COMP_HEIGHT}
        defaultProps={{
          includeAudio: false,
          waitForFonts: true,
        }}
      />
      <Still
        id="Ep01Cover"
        component={EpisodeCover}
        width={COMP_WIDTH}
        height={COMP_HEIGHT}
        defaultProps={{
          episodeTag: 'SECTOR 07 // LOG 01',
          titleLine1: 'RULE FOUR:',
          titleHighlight: 'NO BREATH',
          titleLine2: 'ON THE GLASS',
          footerHook: 'NEVER OPEN AFTER MIDNIGHT',
          keyframeTimeSec: 49.0,
          waitForFonts: true,
        }}
      />
      <Still
        id="TikTokAvatar"
        component={TikTokAvatar}
        width={1080}
        height={1080}
        defaultProps={{
          badgeCode: '07',
        }}
      />
    </>
  );
};
