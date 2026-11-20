export const COMP_WIDTH = 1080;
export const COMP_HEIGHT = 1920;
export const FPS = 30;
export const EXPORT_SCALE = 4 / 3; // exact 1440x2560 export target

// Exact 60-second suspense format contract
export const TARGET_VOICE_SEC = 58.5;
export const TAIL_SEC = 2.0;
export const TOTAL_DURATION_SEC = TARGET_VOICE_SEC + TAIL_SEC; // 60.5s (monetization >60s)
export const TOTAL_FRAMES = Math.round(TOTAL_DURATION_SEC * FPS); // 1815 frames
export const SHOT_LEAD_SEC = 0.12;

// Camera FOV bounds (degrees)
export const FOV_MIN = 30;
export const FOV_MAX = 44;

// Physical scale contract (meters)
export const ACTOR_HEIGHT_M = 1.76;
export const ACTOR_WIDTH_M = ACTOR_HEIGHT_M * 0.6; // 1.056m (600x1000 canvas aspect)
export const HEAD_HEIGHT_M = 0.33;
export const DOOR_WIDTH_M = 1.05;
export const DOOR_HEIGHT_M = 2.10;
export const CAM_DIST_MIN_M = 4.0;
export const CAM_DIST_MAX_M = 8.0;

// Caption contract (pixels @ 1080x1920)
export const CAPTION_SIZE_PX = 74;
export const CAPTION_LONG_SIZE_PX = 64;
export const CAPTION_FINAL_SIZE_PX = 96;
export const CAPTION_LONG_CHAR_THRESHOLD = 19;
export const CAPTION_HIGHLIGHT_HEX = '#ffd84a';
export const CAPTION_CUTIN_FRAMES = 3;
export const CAPTION_CUTIN_SCALE = 1.07;

// Safe areas (fractions of height)
export const SAFE_TOP_PCT = 0.08;
export const SAFE_BOTTOM_PCT = 0.12;

// Caption chunking limits
export const CAPTION_MAX_WORDS = 4;
export const CAPTION_MAX_CHARS = 26;

export function clampFov(fov: number): number {
  return Math.max(FOV_MIN, Math.min(FOV_MAX, fov));
}

export function clampCameraDistance(dist: number): number {
  return Math.max(CAM_DIST_MIN_M, Math.min(CAM_DIST_MAX_M, dist));
}

export function validateCameraRig(
  pos: readonly [number, number, number],
  look: readonly [number, number, number],
  fov: number,
): { pos: [number, number, number]; look: [number, number, number]; fov: number } {
  const dx = pos[0] - look[0];
  const dy = pos[1] - look[1];
  const dz = pos[2] - look[2];
  const dist = Math.hypot(dx, dy, dz);
  let outPos: [number, number, number] = [pos[0], pos[1], pos[2]];
  if (dist > 0.0001 && (dist < CAM_DIST_MIN_M || dist > CAM_DIST_MAX_M)) {
    const clamped = clampCameraDistance(dist);
    const ratio = clamped / dist;
    outPos = [
      look[0] + dx * ratio,
      look[1] + dy * ratio,
      look[2] + dz * ratio,
    ];
  }
  return {
    pos: outPos,
    look: [look[0], look[1], look[2]],
    fov: clampFov(fov),
  };
}
