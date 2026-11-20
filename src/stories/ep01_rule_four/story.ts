import {
  FPS,
  SHOT_LEAD_SEC,
  TOTAL_DURATION_SEC,
  validateCameraRig,
} from '../../engine/contract';
import type { GirlEyes, GirlMouth, WatchmanPose } from '../../engine/doll';
import { clamp, lerp, smootherstep } from '../../engine/rng';
import { LINE_IDS, type LineId } from './lines';
import { LINE_WINDOWS } from './timeline';
import type { SubsetId } from './world';

export interface ShotSpec {
  lineId: LineId;
  subset: SubsetId;
  posStart: readonly [number, number, number];
  posEnd: readonly [number, number, number];
  lookStart: readonly [number, number, number];
  lookEnd: readonly [number, number, number];
  fovStart: number;
  fovEnd: number;
  watchmanPose: WatchmanPose;
  flashlightOn: boolean;
  watchmanHeadTurn: number;
  badgeHeld: boolean;
  girlCrying: boolean;
  girlHeadTilt: number;
  girlMouth: GirlMouth;
  girlMouthOpen: number;
  girlEyes: GirlEyes;
  shiverAmt: number;
  hordeReveal: number;
  shockAtStart?: boolean;
  strobeActive?: boolean;
  sensorBlink?: boolean;
}

export const SHOTS: Record<LineId, ShotSpec> = {
  L01: {
    lineId: 'L01',
    subset: 'booth',
    posStart: [0.55, 1.56, 4.45],
    posEnd: [0.42, 1.52, 4.15],
    lookStart: [0.52, 1.48, 0.02],
    lookEnd: [0.22, 1.42, 0.02],
    fovStart: 36,
    fovEnd: 34,
    watchmanPose: 'idle',
    flashlightOn: false,
    watchmanHeadTurn: 0.1,
    badgeHeld: false,
    girlCrying: false,
    girlHeadTilt: 0,
    girlMouth: 'normal',
    girlMouthOpen: 0,
    girlEyes: 'normal',
    shiverAmt: 0,
    hordeReveal: 0,
  },
  L02: {
    lineId: 'L02',
    subset: 'booth',
    posStart: [0.35, 1.48, 4.35],
    posEnd: [0.0, 1.42, 4.65],
    lookStart: [0.15, 1.38, 0.0],
    lookEnd: [0.0, 1.25, 0.0],
    fovStart: 38,
    fovEnd: 41,
    watchmanPose: 'idle',
    flashlightOn: false,
    watchmanHeadTurn: 0.05,
    badgeHeld: false,
    girlCrying: false,
    girlHeadTilt: 0,
    girlMouth: 'normal',
    girlMouthOpen: 0,
    girlEyes: 'normal',
    shiverAmt: 0,
    hordeReveal: 0,
  },
  L03: {
    lineId: 'L03',
    subset: 'booth',
    posStart: [-0.25, 1.36, 4.8],
    posEnd: [-0.15, 1.38, 4.45],
    lookStart: [-0.15, 1.28, 0.2],
    lookEnd: [0.0, 1.32, 0.0],
    fovStart: 42,
    fovEnd: 39,
    watchmanPose: 'idle',
    flashlightOn: false,
    watchmanHeadTurn: -0.06,
    badgeHeld: false,
    girlCrying: false,
    girlHeadTilt: 0,
    girlMouth: 'normal',
    girlMouthOpen: 0,
    girlEyes: 'normal',
    shiverAmt: 0,
    hordeReveal: 0,
  },
  L04: {
    lineId: 'L04',
    subset: 'booth',
    posStart: [0.22, 1.32, 4.25],
    posEnd: [0.32, 1.28, 4.08],
    lookStart: [0.42, 1.24, 0.04],
    lookEnd: [0.46, 1.24, 0.04],
    fovStart: 33,
    fovEnd: 31,
    watchmanPose: 'idle',
    flashlightOn: false,
    watchmanHeadTurn: 0.16,
    badgeHeld: false,
    girlCrying: false,
    girlHeadTilt: 0,
    girlMouth: 'normal',
    girlMouthOpen: 0,
    girlEyes: 'normal',
    shiverAmt: 0,
    hordeReveal: 0,
    sensorBlink: true,
  },
  L05: {
    lineId: 'L05',
    subset: 'door_closeup',
    posStart: [0.08, 1.48, 4.22],
    posEnd: [0.0, 1.50, 4.05],
    lookStart: [0.0, 1.46, 0.0],
    lookEnd: [0.0, 1.48, 0.0],
    fovStart: 32,
    fovEnd: 30,
    watchmanPose: 'idle',
    flashlightOn: false,
    watchmanHeadTurn: 0.18,
    badgeHeld: false,
    girlCrying: true,
    girlHeadTilt: 0,
    girlMouth: 'normal',
    girlMouthOpen: 0.2,
    girlEyes: 'wide',
    shiverAmt: 0.5,
    hordeReveal: 0,
  },
  L06: {
    lineId: 'L06',
    subset: 'booth',
    posStart: [-0.28, 1.38, 4.42],
    posEnd: [-0.08, 1.44, 4.18],
    lookStart: [-0.15, 1.38, 0.1],
    lookEnd: [0.0, 1.46, -0.1],
    fovStart: 38,
    fovEnd: 34,
    watchmanPose: 'aim_flashlight',
    flashlightOn: true,
    watchmanHeadTurn: 0.12,
    badgeHeld: false,
    girlCrying: true,
    girlHeadTilt: 0,
    girlMouth: 'normal',
    girlMouthOpen: 0.25,
    girlEyes: 'wide',
    shiverAmt: 0.65,
    hordeReveal: 0,
  },
  L07: {
    lineId: 'L07',
    subset: 'door_closeup',
    posStart: [0.0, 1.44, 4.32],
    posEnd: [0.0, 1.48, 4.08],
    lookStart: [0.0, 1.42, -0.15],
    lookEnd: [0.0, 1.48, -0.25],
    fovStart: 34,
    fovEnd: 31,
    watchmanPose: 'aim_flashlight',
    flashlightOn: true,
    watchmanHeadTurn: 0.12,
    badgeHeld: false,
    girlCrying: true,
    girlHeadTilt: 0,
    girlMouth: 'normal',
    girlMouthOpen: 0.3,
    girlEyes: 'wide',
    shiverAmt: 0.75,
    hordeReveal: 0,
  },
  L08: {
    lineId: 'L08',
    subset: 'door_closeup',
    posStart: [-0.16, 1.40, 4.15],
    posEnd: [-0.22, 1.38, 4.02],
    lookStart: [-0.14, 1.38, -0.25],
    lookEnd: [-0.20, 1.36, -0.28],
    fovStart: 32,
    fovEnd: 30,
    watchmanPose: 'aim_flashlight',
    flashlightOn: true,
    watchmanHeadTurn: 0.12,
    badgeHeld: true,
    girlCrying: true,
    girlHeadTilt: 0,
    girlMouth: 'normal',
    girlMouthOpen: 0.25,
    girlEyes: 'wide',
    shiverAmt: 0.65,
    hordeReveal: 0,
  },
  L09: {
    lineId: 'L09',
    subset: 'door_closeup',
    posStart: [-0.22, 1.38, 4.05],
    posEnd: [-0.12, 1.44, 4.02],
    lookStart: [-0.20, 1.36, -0.28],
    lookEnd: [-0.06, 1.44, -0.28],
    fovStart: 30,
    fovEnd: 31,
    watchmanPose: 'aim_flashlight',
    flashlightOn: true,
    watchmanHeadTurn: 0.12,
    badgeHeld: true,
    girlCrying: true,
    girlHeadTilt: 0,
    girlMouth: 'normal',
    girlMouthOpen: 0.25,
    girlEyes: 'wide',
    shiverAmt: 0.6,
    hordeReveal: 0,
  },
  L10: {
    lineId: 'L10',
    subset: 'door_closeup',
    posStart: [0.06, 1.54, 4.12],
    posEnd: [0.0, 1.56, 4.02],
    lookStart: [0.0, 1.54, -0.28],
    lookEnd: [0.0, 1.56, -0.32],
    fovStart: 31,
    fovEnd: 30,
    watchmanPose: 'aim_flashlight',
    flashlightOn: true,
    watchmanHeadTurn: 0.14,
    badgeHeld: true,
    girlCrying: true,
    girlHeadTilt: 0.04,
    girlMouth: 'panting',
    girlMouthOpen: 0.45,
    girlEyes: 'wide',
    shiverAmt: 0.85,
    hordeReveal: 0,
  },
  L11: {
    lineId: 'L11',
    subset: 'booth',
    posStart: [-0.1, 1.32, 4.32],
    posEnd: [0.22, 1.28, 4.12],
    lookStart: [0.1, 1.22, 0.2],
    lookEnd: [0.36, 1.2, 0.06],
    fovStart: 37,
    fovEnd: 33,
    watchmanPose: 'reach_switch',
    flashlightOn: true,
    watchmanHeadTurn: 0.16,
    badgeHeld: true,
    girlCrying: true,
    girlHeadTilt: 0.04,
    girlMouth: 'panting',
    girlMouthOpen: 0.5,
    girlEyes: 'wide',
    shiverAmt: 0.8,
    hordeReveal: 0,
  },
  L12: {
    lineId: 'L12',
    subset: 'door_closeup',
    posStart: [-1.18, 1.40, 4.28],
    posEnd: [-1.30, 1.38, 4.08],
    lookStart: [-1.25, 1.38, 0.14],
    lookEnd: [-1.32, 1.38, 0.14],
    fovStart: 33,
    fovEnd: 30,
    watchmanPose: 'reach_switch',
    flashlightOn: false,
    watchmanHeadTurn: -0.2,
    badgeHeld: false,
    girlCrying: true,
    girlHeadTilt: 0,
    girlMouth: 'panting',
    girlMouthOpen: 0.55,
    girlEyes: 'wide',
    shiverAmt: 0.7,
    hordeReveal: 0,
  },
  L13: {
    lineId: 'L13',
    subset: 'door_closeup',
    posStart: [-1.32, 1.38, 4.06],
    posEnd: [-1.42, 1.36, 4.02],
    lookStart: [-1.34, 1.38, 0.14],
    lookEnd: [-1.42, 1.36, 0.14],
    fovStart: 30,
    fovEnd: 30,
    watchmanPose: 'reach_switch',
    flashlightOn: false,
    watchmanHeadTurn: -0.22,
    badgeHeld: false,
    girlCrying: true,
    girlHeadTilt: 0,
    girlMouth: 'panting',
    girlMouthOpen: 0.55,
    girlEyes: 'wide',
    shiverAmt: 0.7,
    hordeReveal: 0,
  },
  L14: {
    lineId: 'L14',
    subset: 'door_closeup',
    posStart: [-0.22, 1.54, 4.18],
    posEnd: [0.0, 1.56, 4.04],
    lookStart: [-0.08, 1.52, -0.25],
    lookEnd: [0.0, 1.54, -0.32],
    fovStart: 32,
    fovEnd: 30,
    watchmanPose: 'reach_switch',
    flashlightOn: true,
    watchmanHeadTurn: 0.15,
    badgeHeld: false,
    girlCrying: true,
    girlHeadTilt: 0,
    girlMouth: 'panting',
    girlMouthOpen: 0.72,
    girlEyes: 'wide',
    shiverAmt: 0.9,
    hordeReveal: 0,
  },
  L15: {
    lineId: 'L15',
    subset: 'door_closeup',
    posStart: [0.0, 1.56, 4.06],
    posEnd: [0.0, 1.52, 4.02],
    lookStart: [0.0, 1.52, -0.30],
    lookEnd: [0.0, 1.50, -0.30],
    fovStart: 30,
    fovEnd: 30,
    watchmanPose: 'reach_switch',
    flashlightOn: true,
    watchmanHeadTurn: 0.15,
    badgeHeld: false,
    girlCrying: true,
    girlHeadTilt: 0,
    girlMouth: 'panting',
    girlMouthOpen: 0.85,
    girlEyes: 'wide',
    shiverAmt: 0.95,
    hordeReveal: 0,
  },
  L16: {
    lineId: 'L16',
    subset: 'door_closeup',
    posStart: [0.0, 1.52, 4.04],
    posEnd: [0.0, 1.52, 4.04],
    lookStart: [0.0, 1.50, -0.10],
    lookEnd: [0.0, 1.50, -0.05],
    fovStart: 30,
    fovEnd: 30,
    watchmanPose: 'idle',
    flashlightOn: true,
    watchmanHeadTurn: 0.15,
    badgeHeld: false,
    girlCrying: false,
    girlHeadTilt: 0,
    girlMouth: 'panting',
    girlMouthOpen: 0.8,
    girlEyes: 'wide',
    shiverAmt: 0.2,
    hordeReveal: 0,
  },
  L17: {
    lineId: 'L17',
    subset: 'door_closeup',
    posStart: [0.06, 1.50, 4.08],
    posEnd: [-0.04, 1.50, 4.02],
    lookStart: [0.0, 1.48, 0.02],
    lookEnd: [0.0, 1.48, 0.02],
    fovStart: 31,
    fovEnd: 30,
    watchmanPose: 'idle',
    flashlightOn: true,
    watchmanHeadTurn: 0.14,
    badgeHeld: false,
    girlCrying: false,
    girlHeadTilt: 0,
    girlMouth: 'panting',
    girlMouthOpen: 0.8,
    girlEyes: 'wide',
    shiverAmt: 0.0,
    hordeReveal: 0,
  },
  L18: {
    lineId: 'L18',
    subset: 'door_closeup',
    posStart: [-0.04, 1.50, 4.02],
    posEnd: [0.0, 1.54, 4.02],
    lookStart: [0.0, 1.48, 0.02],
    lookEnd: [0.0, 1.52, -0.18],
    fovStart: 30,
    fovEnd: 30,
    watchmanPose: 'idle',
    flashlightOn: true,
    watchmanHeadTurn: 0.14,
    badgeHeld: false,
    girlCrying: false,
    girlHeadTilt: 0,
    girlMouth: 'panting',
    girlMouthOpen: 0.7,
    girlEyes: 'wide',
    shiverAmt: 0.0,
    hordeReveal: 0,
  },
  L19: {
    lineId: 'L19',
    subset: 'booth',
    posStart: [0.18, 1.32, 4.18],
    posEnd: [-0.18, 1.38, 4.55],
    lookStart: [0.24, 1.24, 0.2],
    lookEnd: [-0.25, 1.26, 0.7],
    fovStart: 34,
    fovEnd: 38,
    watchmanPose: 'pull_back',
    flashlightOn: true,
    watchmanHeadTurn: 0.1,
    badgeHeld: false,
    girlCrying: false,
    girlHeadTilt: 0,
    girlMouth: 'normal',
    girlMouthOpen: 0.1,
    girlEyes: 'wide',
    shiverAmt: 0.0,
    hordeReveal: 0,
  },
  L20: {
    lineId: 'L20',
    subset: 'corridor_reveal',
    posStart: [0.0, 1.54, 4.16],
    posEnd: [0.0, 1.54, 4.04],
    lookStart: [0.0, 1.52, -0.32],
    lookEnd: [0.0, 1.52, -0.32],
    fovStart: 32,
    fovEnd: 30,
    watchmanPose: 'pull_back',
    flashlightOn: true,
    watchmanHeadTurn: 0.1,
    badgeHeld: false,
    girlCrying: false,
    girlHeadTilt: 0,
    girlMouth: 'normal',
    girlMouthOpen: 0,
    girlEyes: 'wide',
    shiverAmt: 0,
    hordeReveal: 0,
  },
  L21: {
    lineId: 'L21',
    subset: 'corridor_reveal',
    posStart: [0.0, 1.54, 4.04],
    posEnd: [0.04, 1.54, 4.02],
    lookStart: [0.0, 1.52, -0.32],
    lookEnd: [0.0, 1.52, -0.32],
    fovStart: 30,
    fovEnd: 30,
    watchmanPose: 'pull_back',
    flashlightOn: true,
    watchmanHeadTurn: 0.1,
    badgeHeld: false,
    girlCrying: false,
    girlHeadTilt: 0.56,
    girlMouth: 'normal',
    girlMouthOpen: 0.15,
    girlEyes: 'wide',
    shiverAmt: 0,
    hordeReveal: 0,
    shockAtStart: true,
  },
  L22: {
    lineId: 'L22',
    subset: 'corridor_reveal',
    posStart: [0.04, 1.52, 4.02],
    posEnd: [0.0, 1.50, 4.02],
    lookStart: [0.0, 1.48, -0.32],
    lookEnd: [0.0, 1.46, -0.32],
    fovStart: 30,
    fovEnd: 31,
    watchmanPose: 'pull_back',
    flashlightOn: true,
    watchmanHeadTurn: 0.1,
    badgeHeld: false,
    girlCrying: false,
    girlHeadTilt: 0.56,
    girlMouth: 'unhinged',
    girlMouthOpen: 1.0,
    girlEyes: 'wide',
    shiverAmt: 0,
    hordeReveal: 0,
    shockAtStart: true,
  },
  L23: {
    lineId: 'L23',
    subset: 'corridor_reveal',
    posStart: [0.0, 1.48, 4.10],
    posEnd: [0.0, 1.46, 4.55],
    lookStart: [0.0, 1.44, -0.5],
    lookEnd: [0.0, 1.42, -1.35],
    fovStart: 32,
    fovEnd: 38,
    watchmanPose: 'pull_back',
    flashlightOn: true,
    watchmanHeadTurn: 0.1,
    badgeHeld: false,
    girlCrying: false,
    girlHeadTilt: 0.56,
    girlMouth: 'unhinged',
    girlMouthOpen: 1.0,
    girlEyes: 'white_glow',
    shiverAmt: 0,
    hordeReveal: 1.0,
    shockAtStart: true,
  },
  L24: {
    lineId: 'L24',
    subset: 'floor_twist',
    posStart: [0.16, 1.42, 4.32],
    posEnd: [-0.08, 1.36, 4.08],
    lookStart: [0.0, 1.35, 0.0],
    lookEnd: [-0.05, 1.32, 0.0],
    fovStart: 36,
    fovEnd: 33,
    watchmanPose: 'pull_back',
    flashlightOn: false,
    watchmanHeadTurn: 0.0,
    badgeHeld: false,
    girlCrying: false,
    girlHeadTilt: 0.56,
    girlMouth: 'unhinged',
    girlMouthOpen: 1.0,
    girlEyes: 'white_glow',
    shiverAmt: 0,
    hordeReveal: 1.0,
    strobeActive: true,
  },
  L25: {
    lineId: 'L25',
    subset: 'floor_twist',
    posStart: [-0.14, 1.36, 4.08],
    posEnd: [-0.24, 1.28, 4.02],
    lookStart: [-0.14, 1.30, 0.0],
    lookEnd: [-0.20, 1.24, 0.0],
    fovStart: 33,
    fovEnd: 30,
    watchmanPose: 'pull_back',
    flashlightOn: false,
    watchmanHeadTurn: 0.0,
    badgeHeld: false,
    girlCrying: false,
    girlHeadTilt: 0.56,
    girlMouth: 'unhinged',
    girlMouthOpen: 1.0,
    girlEyes: 'white_glow',
    shiverAmt: 0,
    hordeReveal: 1.0,
    strobeActive: true,
  },
  L26: {
    lineId: 'L26',
    subset: 'rear_door_blackout',
    posStart: [0.22, 1.50, 4.35],
    posEnd: [0.34, 1.50, 4.02],
    lookStart: [0.32, 1.50, 0.02],
    lookEnd: [0.35, 1.52, 0.02],
    fovStart: 34,
    fovEnd: 30,
    watchmanPose: 'pull_back',
    flashlightOn: false,
    watchmanHeadTurn: -0.22,
    badgeHeld: false,
    girlCrying: false,
    girlHeadTilt: 0.56,
    girlMouth: 'unhinged',
    girlMouthOpen: 1.0,
    girlEyes: 'white_glow',
    shiverAmt: 0,
    hordeReveal: 0,
    shockAtStart: true,
  },
};

export interface ShotEval {
  lineId: LineId;
  subset: SubsetId;
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
  watchmanPose: WatchmanPose;
  flashlightOn: boolean;
  watchmanHeadTurn: number;
  badgeHeld: boolean;
  girlCrying: boolean;
  girlHeadTilt: number;
  girlMouth: GirlMouth;
  girlMouthOpen: number;
  girlEyes: GirlEyes;
  shiverAmt: number;
  hordeReveal: number;
  sensorPulse: number;
  strobeGate: number;
  cutDip: number; // 0 = clear, 1 = black
  rearLatchOpen: number; // 0..1
  blackoutAmount: number; // 0..1 during 1.5s pitch-black freeze
}

export function lineIdAt(t: number): {
  lineId: LineId;
  prevLineId: LineId | null;
  localT: number;
  lineStart: number;
  lineEnd: number;
  nextStart: number;
} {
  const leadT = clamp(t + SHOT_LEAD_SEC, 0, TOTAL_DURATION_SEC);
  let activeIdx = 0;
  for (let i = 0; i < LINE_IDS.length; i++) {
    const id = LINE_IDS[i];
    if (leadT >= LINE_WINDOWS[id].start) {
      activeIdx = i;
    }
  }
  const lineId = LINE_IDS[activeIdx];
  const prevLineId = activeIdx > 0 ? LINE_IDS[activeIdx - 1] : null;
  const win = LINE_WINDOWS[lineId];
  const nextStart =
    activeIdx + 1 < LINE_IDS.length
      ? LINE_WINDOWS[LINE_IDS[activeIdx + 1]].start
      : TOTAL_DURATION_SEC;

  return {
    lineId,
    prevLineId,
    localT: Math.max(0, leadT - win.start),
    lineStart: win.start,
    lineEnd: win.end,
    nextStart,
  };
}

export function shotAt(t: number): ShotEval {
  const { lineId, prevLineId, localT, lineStart, lineEnd, nextStart } = lineIdAt(t);
  const spec = SHOTS[lineId];
  const span = Math.max(0.25, nextStart - lineStart);
  const u = smootherstep(0, span, localT);

  const rawPos: [number, number, number] = [
    lerp(spec.posStart[0], spec.posEnd[0], u),
    lerp(spec.posStart[1], spec.posEnd[1], u),
    lerp(spec.posStart[2], spec.posEnd[2], u),
  ];
  const rawLook: [number, number, number] = [
    lerp(spec.lookStart[0], spec.lookEnd[0], u),
    lerp(spec.lookStart[1], spec.lookEnd[1], u),
    lerp(spec.lookStart[2], spec.lookEnd[2], u),
  ];
  const rawFov = lerp(spec.fovStart, spec.fovEnd, u);
  const rig = validateCameraRig(rawPos, rawLook, rawFov);

  // Decaying 8-frame alternating kick on shocks (L21 head crack, L22 jaw drop, L23 white eyes, L26 rear latch)
  let kickX = 0;
  let kickY = 0;
  if (spec.shockAtStart) {
    const shockFrame = Math.floor(localT * FPS);
    if (shockFrame >= 0 && shockFrame < 8) {
      const decay = 1.0 - shockFrame / 8.0;
      const sign = shockFrame % 2 === 0 ? 1 : -1;
      kickX = sign * 0.042 * decay;
      kickY = sign * 0.028 * decay;
    }
  }

  // Also kick right when the rear latch clicks open at the end of L26 (start of 1.5s tail)
  const latchTriggerTime = LINE_WINDOWS.L26.end + 0.01;
  let rearLatchOpen = 0;
  let blackoutAmount = 0;
  if (lineId === 'L26') {
    const tailDt = t - latchTriggerTime;
    if (tailDt >= 0) {
      rearLatchOpen = clamp(tailDt / 0.08, 0, 1);
      const latchFrame = Math.floor(tailDt * FPS);
      if (latchFrame >= 0 && latchFrame < 8) {
        const decay = 1.0 - latchFrame / 8.0;
        const sign = latchFrame % 2 === 0 ? 1 : -1;
        kickX += sign * 0.055 * decay;
        kickY += sign * 0.036 * decay;
      }
      // Hold rear latch briefly (~0.18s) on the metallic click, then slam pitch-black for the remaining 1.5s tail freeze!
      if (tailDt > 0.16) {
        blackoutAmount = clamp((tailDt - 0.16) / 0.08, 0, 1);
      }
    }
  }

  // 2-frame black cutDip on scene jumps between distinct subsets
  let cutDip = 0;
  if (prevLineId && SHOTS[prevLineId].subset !== spec.subset) {
    const framesIntoCut = localT * FPS;
    if (framesIntoCut < 2.0) {
      cutDip = 1.0 - framesIntoCut / 2.0;
    }
  }

  // Strobe gate (L24-L25 red emergency strobe)
  let strobeGate = 0;
  if (spec.strobeActive) {
    const cycle = (t * 2.15) % 1.0;
    strobeGate = cycle < 0.28 ? Math.sin((cycle / 0.28) * Math.PI) : 0.06;
  }

  // Sensor blink (L04+)
  let sensorPulse = 0.08;
  if (spec.sensorBlink) {
    sensorPulse = (Math.floor(t * 6) % 2 === 0) ? 0.72 : 0.15;
  } else if (LINE_IDS.indexOf(lineId) > 3) {
    sensorPulse = 0.22 + 0.12 * Math.sin(t * 4.0);
  }

  // Animate head crack / jaw drop / horde eyes reveal smoothly over first ~0.3s of L21-L23
  let girlHeadTilt = spec.girlHeadTilt;
  if (lineId === 'L21') {
    girlHeadTilt = lerp(0, spec.girlHeadTilt, smootherstep(0, 0.22, localT));
  }
  let girlMouthOpen = spec.girlMouthOpen;
  if (lineId === 'L22') {
    girlMouthOpen = lerp(0.2, spec.girlMouthOpen, smootherstep(0, 0.28, localT));
  }
  let hordeReveal = spec.hordeReveal;
  if (lineId === 'L23') {
    hordeReveal = smootherstep(0, 0.75, localT);
  }

  return {
    lineId,
    subset: spec.subset,
    pos: [rig.pos[0] + kickX, rig.pos[1] + kickY, rig.pos[2]],
    look: [rig.look[0] + kickX * 0.4, rig.look[1] + kickY * 0.4, rig.look[2]],
    fov: rig.fov,
    watchmanPose: spec.watchmanPose,
    flashlightOn: spec.flashlightOn,
    watchmanHeadTurn: spec.watchmanHeadTurn,
    badgeHeld: spec.badgeHeld,
    girlCrying: spec.girlCrying,
    girlHeadTilt,
    girlMouth: spec.girlMouth,
    girlMouthOpen,
    girlEyes: spec.girlEyes,
    shiverAmt: spec.shiverAmt,
    hordeReveal,
    sensorPulse,
    strobeGate,
    cutDip,
    rearLatchOpen,
    blackoutAmount,
  };
}
