import { quantize, seededFloat } from './rng';

export type WatchmanPose = 'idle' | 'aim_flashlight' | 'reach_switch' | 'pull_back';
export type GirlEyes = 'normal' | 'wide' | 'white_glow';
export type GirlMouth = 'normal' | 'panting' | 'unhinged';

export interface WatchmanState {
  kind: 'WATCHMAN';
  pose: WatchmanPose;
  flashlightOn: boolean;
  headTurn: number; // -0.25 .. 0.25
  facingRight?: boolean;
}

export interface GirlState {
  kind: 'INFECTED_GIRL';
  shiver: number; // -1 .. 1
  headTilt: number; // 0 .. 0.65 rad (cracked sideways)
  mouth: GirlMouth;
  mouthOpen: number; // 0 .. 1
  eyes: GirlEyes;
  badgeHeld: boolean;
  crying: boolean;
}

export interface HordeEyesState {
  kind: 'HORDE_EYES';
  revealProgress: number; // 0 .. 1
  pulsePhase: number;
}

export type DollState = WatchmanState | GirlState | HordeEyesState;

export const DOLL_W = 600;
export const DOLL_H = 1000;
export const SOLES_Y = 968;

export function poseKey(state: DollState): string {
  if (state.kind === 'WATCHMAN') {
    return `W|${state.pose}|${state.flashlightOn ? 1 : 0}|${quantize(state.headTurn, 0.03).toFixed(2)}|${state.facingRight ? 1 : 0}`;
  }
  if (state.kind === 'INFECTED_GIRL') {
    return `G|${quantize(state.shiver, 0.15).toFixed(2)}|${quantize(state.headTilt, 0.02).toFixed(2)}|${state.mouth}|${quantize(state.mouthOpen, 0.04).toFixed(2)}|${state.eyes}|${state.badgeHeld ? 1 : 0}|${state.crying ? 1 : 0}`;
  }
  return `H|${quantize(state.revealProgress, 0.04).toFixed(2)}|${quantize(state.pulsePhase, 0.15).toFixed(2)}`;
}

export function drawDoll(ctx: CanvasRenderingContext2D, state: DollState): void {
  ctx.clearRect(0, 0, DOLL_W, DOLL_H);
  if (state.kind === 'WATCHMAN') {
    drawWatchman(ctx, state);
  } else if (state.kind === 'INFECTED_GIRL') {
    drawInfectedGirl(ctx, state);
  } else {
    drawHordeEyes(ctx, state);
  }
}

function drawWatchman(ctx: CanvasRenderingContext2D, s: WatchmanState): void {
  ctx.save();
  if (!s.facingRight) {
    ctx.translate(DOLL_W, 0);
    ctx.scale(-1, 1);
  }

  const cx = 300;
  // Two-tone cel shading, zero outlines, subtle cold-blue rim light
  // Legs & boots anchored at SOLES_Y = 968
  ctx.fillStyle = '#0e131b';
  ctx.fillRect(cx - 64, 610, 52, 330);
  ctx.fillRect(cx + 12, 610, 52, 330);
  // Shadow split on pants
  ctx.fillStyle = '#182130';
  ctx.fillRect(cx - 58, 610, 26, 320);
  ctx.fillRect(cx + 18, 610, 26, 320);

  // Heavy tactical boots (soles exact at y = 968)
  ctx.fillStyle = '#080a0d';
  ctx.beginPath();
  ctx.roundRect(cx - 72, 926, 68, 42, 8);
  ctx.roundRect(cx + 8, 926, 76, 42, 8);
  ctx.fill();

  // Torso guard parka (two-tone)
  ctx.fillStyle = '#151e2b';
  ctx.beginPath();
  ctx.roundRect(cx - 98, 290, 196, 340, 34);
  ctx.fill();

  // Lit front chest half
  ctx.fillStyle = '#223044';
  ctx.beginPath();
  ctx.roundRect(cx - 20, 294, 114, 332, 28);
  ctx.fill();

  // Rim highlight on front shoulder
  ctx.fillStyle = 'rgba(135, 185, 225, 0.34)';
  ctx.fillRect(cx + 82, 304, 10, 250);

  // Security utility belt
  ctx.fillStyle = '#0b0e13';
  ctx.fillRect(cx - 96, 560, 192, 34);
  ctx.fillStyle = '#475569';
  ctx.fillRect(cx + 10, 565, 28, 24);

  // Head + peaked guard cap
  ctx.save();
  ctx.translate(cx + 4, 240);
  ctx.rotate(s.headTurn * 0.45);
  // Neck
  ctx.fillStyle = '#8b6f5e';
  ctx.fillRect(-22, 10, 44, 52);
  // Face profile (two-tone)
  ctx.fillStyle = '#a48370';
  ctx.beginPath();
  ctx.ellipse(0, -30, 56, 68, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#735849';
  ctx.beginPath();
  ctx.ellipse(-22, -28, 34, 62, 0, Math.PI * 0.5, Math.PI * 1.5);
  ctx.fill();

  // Guard cap
  ctx.fillStyle = '#0f1722';
  ctx.beginPath();
  ctx.roundRect(-62, -98, 124, 46, 16);
  ctx.fill();
  ctx.fillStyle = '#090d14';
  ctx.fillRect(-10, -62, 92, 16); // visor brim

  // Eye
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.ellipse(26, -34, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(29, -34, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Front arm pose
  ctx.save();
  ctx.translate(cx + 38, 336);
  if (s.pose === 'aim_flashlight') {
    ctx.rotate(-0.48);
  } else if (s.pose === 'reach_switch') {
    ctx.rotate(-0.78);
  } else if (s.pose === 'pull_back') {
    ctx.rotate(0.42);
  } else {
    ctx.rotate(0.12);
  }
  ctx.fillStyle = '#25354b';
  ctx.beginPath();
  ctx.roundRect(-22, 0, 44, 190, 18);
  ctx.fill();
  // Hand
  ctx.fillStyle = '#a48370';
  ctx.beginPath();
  ctx.arc(0, 198, 20, 0, Math.PI * 2);
  ctx.fill();

  if (s.pose === 'aim_flashlight' || s.flashlightOn) {
    // Heavy steel flashlight
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-12, 188, 72, 26);
    ctx.fillStyle = '#334155';
    ctx.fillRect(46, 183, 22, 36);
    if (s.flashlightOn) {
      ctx.fillStyle = 'rgba(254, 243, 199, 0.88)';
      ctx.beginPath();
      ctx.ellipse(70, 201, 7, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.restore();
}

function drawInfectedGirl(ctx: CanvasRenderingContext2D, s: GirlState): void {
  const cx = 300 + s.shiver * 4.5;

  // Boots/shoes anchored at SOLES_Y = 968
  ctx.fillStyle = '#14171c';
  ctx.fillRect(cx - 50, 650, 38, 290);
  ctx.fillRect(cx + 12, 650, 38, 290);

  ctx.fillStyle = '#0b0d10';
  ctx.beginPath();
  ctx.roundRect(cx - 56, 932, 48, 36, 8);
  ctx.roundRect(cx + 8, 932, 48, 36, 8);
  ctx.fill();

  // Torn bloodstained lab coat skirt + torso (two-tone cold grey-white)
  ctx.fillStyle = '#9aa3ad';
  ctx.beginPath();
  ctx.moveTo(cx - 72, 305);
  ctx.lineTo(cx + 72, 305);
  ctx.lineTo(cx + 96, 755);
  ctx.lineTo(cx + 46, 738);
  ctx.lineTo(cx + 12, 772);
  ctx.lineTo(cx - 32, 744);
  ctx.lineTo(cx - 94, 766);
  ctx.closePath();
  ctx.fill();

  // Shadow side of coat
  ctx.fillStyle = '#687380';
  ctx.beginPath();
  ctx.moveTo(cx, 305);
  ctx.lineTo(cx + 72, 305);
  ctx.lineTo(cx + 96, 755);
  ctx.lineTo(cx + 46, 738);
  ctx.lineTo(cx + 12, 772);
  ctx.lineTo(cx, 756);
  ctx.closePath();
  ctx.fill();

  // Dark bloodstain patches on lab coat
  ctx.fillStyle = 'rgba(115, 16, 22, 0.82)';
  ctx.beginPath();
  ctx.ellipse(cx - 28, 450, 34, 62, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 22, 580, 26, 48, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Cold rim light along left silhouette
  ctx.fillStyle = 'rgba(186, 214, 238, 0.35)';
  ctx.fillRect(cx - 72, 315, 7, 360);

  // Arms
  ctx.fillStyle = '#8b95a0';
  if (s.badgeHeld) {
    // Left arm raised UP pressing bloodstained Level 3 badge directly against wired glass
    ctx.save();
    ctx.translate(cx - 64, 330);
    ctx.rotate(2.92);
    ctx.beginPath();
    ctx.roundRect(-16, 0, 32, 145, 14);
    ctx.fill();
    ctx.translate(0, 148);
    // Pale frostbitten hand
    ctx.fillStyle = '#aeb6bf';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    // Level 3 Clearance badge upright toward camera
    ctx.rotate(-2.92);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-44, -36, 88, 56);
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(-44, -36, 88, 15);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-36, -14, 24, 26);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-6, -10, 38, 6);
    ctx.fillRect(-6, 1, 28, 5);
    // Vivid blood smear on corner of badge
    ctx.fillStyle = 'rgba(153, 27, 27, 0.88)';
    ctx.beginPath();
    ctx.ellipse(24, 6, 18, 12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(cx - 66, 324);
    ctx.rotate(0.18);
    ctx.beginPath();
    ctx.roundRect(-16, 0, 32, 200, 14);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(cx + 66, 324);
  ctx.rotate(-0.16);
  ctx.fillStyle = '#626d7a';
  ctx.beginPath();
  ctx.roundRect(-16, 0, 32, 205, 14);
  ctx.fill();
  ctx.restore();

  // Head pivot with cracked sideways tilt (L21+)
  ctx.save();
  ctx.translate(cx, 286);
  ctx.rotate(s.headTilt);

  // Neck
  ctx.fillStyle = '#8f9aa3';
  ctx.fillRect(-18, -22, 36, 44);

  // Matted dark hair behind head
  ctx.fillStyle = '#12151a';
  ctx.beginPath();
  ctx.ellipse(0, -76, 68, 86, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pale frostbitten face (two-tone)
  ctx.fillStyle = '#b4bec7';
  ctx.beginPath();
  ctx.ellipse(0, -82, 50, 64, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8b96a1';
  ctx.beginPath();
  ctx.ellipse(18, -82, 30, 58, 0, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.fill();

  // Parted matted hair strands along crown and temples (no forehead bar)
  ctx.fillStyle = '#101318';
  ctx.beginPath();
  ctx.moveTo(-54, -80);
  ctx.quadraticCurveTo(-48, -146, 0, -148);
  ctx.quadraticCurveTo(48, -146, 54, -80);
  ctx.quadraticCurveTo(36, -124, 6, -124);
  ctx.lineTo(0, -108);
  ctx.lineTo(-8, -124);
  ctx.quadraticCurveTo(-36, -124, -54, -80);
  ctx.closePath();
  ctx.fill();

  // Eyes
  if (s.eyes === 'white_glow') {
    // Piercing glowing white pupils in dark sunken sockets (L23+)
    ctx.fillStyle = '#07090c';
    ctx.beginPath();
    ctx.ellipse(-20, -90, 14, 11, 0, 0, Math.PI * 2);
    ctx.ellipse(20, -90, 14, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-20, -90, 6.2, 0, Math.PI * 2);
    ctx.arc(20, -90, 6.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const eyeScale = s.eyes === 'wide' ? 1.25 : 1.0;
    ctx.fillStyle = '#0d1117';
    ctx.beginPath();
    ctx.ellipse(-20, -90, 12, 8 * eyeScale, 0, 0, Math.PI * 2);
    ctx.ellipse(20, -90, 12, 8 * eyeScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.ellipse(-20, -90, 9, 6 * eyeScale, 0, 0, Math.PI * 2);
    ctx.ellipse(20, -90, 9, 6 * eyeScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-20, -90, 3.6, 0, Math.PI * 2);
    ctx.arc(20, -90, 3.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tears before crying stops
  if (s.crying) {
    ctx.fillStyle = 'rgba(186, 230, 253, 0.55)';
    ctx.fillRect(-23, -82, 4, 22);
    ctx.fillRect(19, -82, 4, 22);
  }

  // Mouth transformation: normal -> panting -> unhinged elongated black void (L22+)
  if (s.mouth === 'unhinged') {
    const drop = 24 + s.mouthOpen * 72;
    ctx.fillStyle = '#050608';
    ctx.beginPath();
    ctx.ellipse(0, -48 + drop * 0.45, 24, 16 + drop * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    // Upper teeth silhouettes inside black maw
    ctx.fillStyle = '#cbd5e1';
    for (let tx = -14; tx <= 14; tx += 7) {
      ctx.fillRect(tx - 2, -62, 4, 9);
    }
  } else if (s.mouth === 'panting') {
    const openH = 7 + s.mouthOpen * 9;
    ctx.fillStyle = '#180c10';
    ctx.beginPath();
    ctx.ellipse(0, -48, 16, openH, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#3f2a2d';
    ctx.beginPath();
    ctx.ellipse(0, -48, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawHordeEyes(ctx: CanvasRenderingContext2D, s: HordeEyesState): void {
  // 12 distinct pairs of glowing white pupils deep in the dark corridor behind the girl
  const count = 12;
  const revealed = Math.floor(s.revealProgress * count + 0.999);
  for (let i = 0; i < Math.min(count, revealed); i++) {
    const fx = 0.14 + seededFloat(901, i * 3) * 0.72;
    const fy = 0.24 + seededFloat(901, i * 3 + 1) * 0.46;
    const depthScale = 0.55 + seededFloat(901, i * 3 + 2) * 0.55;
    const ex = fx * DOLL_W;
    const ey = fy * DOLL_H;
    const sep = 15 * depthScale;
    const rad = 4.2 * depthScale;
    const pulse = 0.78 + 0.22 * Math.sin(s.pulsePhase + i * 1.37);

    // Subtle soft white halo
    ctx.fillStyle = `rgba(255, 255, 255, ${0.22 * pulse})`;
    ctx.beginPath();
    ctx.arc(ex - sep, ey, rad * 2.4, 0, Math.PI * 2);
    ctx.arc(ex + sep, ey, rad * 2.4, 0, Math.PI * 2);
    ctx.fill();

    // Crisp glowing white pupils
    ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * pulse})`;
    ctx.beginPath();
    ctx.arc(ex - sep, ey, rad, 0, Math.PI * 2);
    ctx.arc(ex + sep, ey, rad, 0, Math.PI * 2);
    ctx.fill();
  }
}
