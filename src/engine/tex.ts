import * as THREE from 'three';
import { hashString, mulberry32 } from './rng';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  return [canvas, ctx];
}

function finalizeTexture(canvas: HTMLCanvasElement, repeat = false): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  } else {
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
  }
  tex.needsUpdate = true;
  return tex;
}

export function makeConcreteWallTex(seedKey = 'concrete_wall', w = 1024, h = 1024): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(w, h);
  const rng = mulberry32(hashString(seedKey));

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#12161b');
  grad.addColorStop(0.5, '#191f26');
  grad.addColorStop(1, '#0d1014');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Concrete panel blocks & recessed seams
  const cols = 4;
  const rows = 4;
  const pw = w / cols;
  const ph = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const shade = Math.floor((rng() - 0.5) * 14);
      ctx.fillStyle = `rgb(${24 + shade}, ${29 + shade}, ${35 + shade})`;
      ctx.fillRect(c * pw + 3, r * ph + 3, pw - 6, ph - 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 4;
      ctx.strokeRect(c * pw + 1, r * ph + 1, pw - 2, ph - 2);
    }
  }

  // Mottled grime patches
  for (let i = 0; i < 320; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const rad = 12 + rng() * 68;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const dark = rng() > 0.35;
    g.addColorStop(0, dark ? 'rgba(6,8,10,0.18)' : 'rgba(58,64,70,0.08)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  // Rust & moisture drip streaks
  for (let i = 0; i < 42; i++) {
    const x = rng() * w;
    const y = rng() * h * 0.7;
    const len = 60 + rng() * 260;
    const rw = 2 + rng() * 7;
    const rg = ctx.createLinearGradient(x, y, x, y + len);
    rg.addColorStop(0, 'rgba(92, 42, 22, 0.36)');
    rg.addColorStop(0.5, 'rgba(66, 30, 16, 0.22)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(x, y, rw, len);
  }

  // Hazard stripe band near bottom
  const bandY = h * 0.84;
  ctx.fillStyle = '#241e12';
  ctx.fillRect(0, bandY, w, 34);
  ctx.fillStyle = 'rgba(182, 132, 24, 0.42)';
  for (let x = -40; x < w + 40; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, bandY);
    ctx.lineTo(x + 24, bandY);
    ctx.lineTo(x + 8, bandY + 34);
    ctx.lineTo(x - 16, bandY + 34);
    ctx.closePath();
    ctx.fill();
  }

  return finalizeTexture(canvas, false);
}

export function makeSteelFloorTex(seedKey = 'steel_floor', w = 1024, h = 1024): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(w, h);
  const rng = mulberry32(hashString(seedKey));

  ctx.fillStyle = '#0e1115';
  ctx.fillRect(0, 0, w, h);

  // Steel tile grid
  const step = 128;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const v = 15 + Math.floor(rng() * 8);
      ctx.fillStyle = `rgb(${v}, ${v + 2}, ${v + 5})`;
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
    }
  }

  // Scuff & boot scratches
  ctx.strokeStyle = 'rgba(130, 146, 162, 0.14)';
  for (let i = 0; i < 180; i++) {
    const x1 = rng() * w;
    const y1 = rng() * h;
    const ang = rng() * Math.PI * 2;
    const len = 18 + rng() * 75;
    ctx.lineWidth = 1 + rng() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + Math.cos(ang) * len, y1 + Math.sin(ang) * len);
    ctx.stroke();
  }

  // Subtle floor damp sheen
  for (let i = 0; i < 16; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const rad = 70 + rng() * 140;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(42, 54, 68, 0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  return finalizeTexture(canvas, false);
}

export function makeBlastDoorTex(seedKey = 'blast_door', w = 768, h = 1536): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(w, h);
  const rng = mulberry32(hashString(seedKey));

  // Reinforced steel slab
  const metal = ctx.createLinearGradient(0, 0, w, h);
  metal.addColorStop(0, '#272e36');
  metal.addColorStop(0.5, '#1c2229');
  metal.addColorStop(1, '#14191f');
  ctx.fillStyle = metal;
  ctx.fillRect(0, 0, w, h);

  // Heavy perimeter frame + bolts
  ctx.strokeStyle = '#39434f';
  ctx.lineWidth = 22;
  ctx.strokeRect(11, 11, w - 22, h - 22);
  ctx.strokeStyle = '#0c0f12';
  ctx.lineWidth = 6;
  ctx.strokeRect(26, 26, w - 52, h - 52);

  for (let y = 60; y < h - 40; y += 120) {
    for (const bx of [44, w - 44]) {
      ctx.fillStyle = '#0d1115';
      ctx.beginPath();
      ctx.arc(bx, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a5664';
      ctx.beginPath();
      ctx.arc(bx - 1.5, y - 1.5, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Stencil header: GATE 07
  ctx.fillStyle = 'rgba(205, 62, 52, 0.85)';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GATE 07', w / 2, 118);

  // Recessed wired safety glass window cutout (clear transparent center so corridor + girl show through)
  const wx = 128;
  const wy = 190;
  const ww = w - 256;
  const wh = 560;

  ctx.clearRect(wx, wy, ww, wh);

  // Subtle cold-glass tint & wired mesh grid (NO breath fog!)
  ctx.fillStyle = 'rgba(130, 165, 190, 0.07)';
  ctx.fillRect(wx, wy, ww, wh);

  ctx.save();
  ctx.beginPath();
  ctx.rect(wx, wy, ww, wh);
  ctx.clip();

  // Diagonal safety wire mesh inside glass
  ctx.strokeStyle = 'rgba(30, 36, 42, 0.62)';
  ctx.lineWidth = 2.2;
  const pitch = 38;
  for (let d = -wh; d < ww + wh; d += pitch) {
    ctx.beginPath();
    ctx.moveTo(wx + d, wy);
    ctx.lineTo(wx + d + wh, wy + wh);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(wx + d, wy + wh);
    ctx.lineTo(wx + d + wh, wy);
    ctx.stroke();
  }

  // Fine surface scratches across glass (for L06 flashlight catch)
  for (let i = 0; i < 42; i++) {
    const sx = wx + rng() * ww;
    const sy = wy + rng() * wh;
    const ang = -0.35 + rng() * 0.7;
    const len = 30 + rng() * 140;
    ctx.strokeStyle = `rgba(215, 232, 245, ${0.14 + rng() * 0.24})`;
    ctx.lineWidth = 1.2 + rng() * 1.4;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    ctx.stroke();
  }
  ctx.restore();

  // Window bevel bezel
  ctx.strokeStyle = '#0b0e12';
  ctx.lineWidth = 16;
  ctx.strokeRect(wx - 4, wy - 4, ww + 8, wh + 8);
  ctx.strokeStyle = '#475361';
  ctx.lineWidth = 4;
  ctx.strokeRect(wx - 12, wy - 12, ww + 24, wh + 24);

  // Heavy lower push plate & hazard stripe
  ctx.fillStyle = '#151a20';
  ctx.fillRect(88, 860, w - 176, 520);
  ctx.strokeStyle = '#2d3742';
  ctx.lineWidth = 4;
  ctx.strokeRect(88, 860, w - 176, 520);

  // Red unlock switch & sensor housing on right jamb
  ctx.fillStyle = '#111418';
  ctx.fillRect(w - 110, 820, 68, 170);
  ctx.fillStyle = '#8b1e1e';
  ctx.fillRect(w - 94, 845, 36, 56);
  ctx.fillStyle = '#303942';
  ctx.fillRect(w - 94, 916, 36, 54);

  return finalizeTexture(canvas, false);
}

export function makeCorridorTex(seedKey = 'corridor', w = 1024, h = 1280): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(w, h);
  const rng = mulberry32(hashString(seedKey));

  // Pitch-dark underground bunker tunnel receding to vanishing point
  ctx.fillStyle = '#030507';
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.44;
  const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, w * 0.62);
  glow.addColorStop(0, '#0a141d');
  glow.addColorStop(0.55, '#060a0f');
  glow.addColorStop(1, '#020304');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Perspective corridor ribs
  for (let i = 1; i <= 9; i++) {
    const s = Math.pow(0.76, i);
    const rw = w * s;
    const rh = h * s * 0.92;
    const rx = cx - rw / 2;
    const ry = cy - rh / 2;
    ctx.strokeStyle = `rgba(38, 54, 68, ${0.42 * s})`;
    ctx.lineWidth = Math.max(2, 10 * s);
    ctx.strokeRect(rx, ry, rw, rh);

    // Overhead dim cold fixture
    ctx.fillStyle = `rgba(120, 175, 205, ${0.22 * s})`;
    ctx.fillRect(cx - rw * 0.12, ry + 4, rw * 0.24, Math.max(2, 8 * s));
  }

  // Wall pipes along perspective edges
  ctx.strokeStyle = 'rgba(26, 35, 44, 0.7)';
  ctx.lineWidth = 8;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * w * 0.48, h * 0.16);
    ctx.lineTo(cx + side * w * 0.08, cy - 30);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + side * w * 0.48, h * 0.24);
    ctx.lineTo(cx + side * w * 0.08, cy - 12);
    ctx.stroke();
  }

  // Grime grain
  for (let i = 0; i < 400; i++) {
    const x = rng() * w;
    const y = rng() * h;
    ctx.fillStyle = `rgba(0,0,0,${0.12 + rng() * 0.2})`;
    ctx.fillRect(x, y, 4, 4);
  }

  return finalizeTexture(canvas, false);
}

export function makeThermalMonitorTex(alertFlash = false): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(768, 512);

  // Rugged steel bezel
  ctx.fillStyle = '#101418';
  ctx.fillRect(0, 0, 768, 512);
  ctx.strokeStyle = '#2c353f';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 752, 496);

  // CRT screen inset
  ctx.fillStyle = '#03130e';
  ctx.fillRect(36, 36, 696, 440);

  // Grid lines
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.14)';
  ctx.lineWidth = 1;
  for (let x = 36; x < 732; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 36);
    ctx.lineTo(x, 476);
    ctx.stroke();
  }
  for (let y = 36; y < 476; y += 44) {
    ctx.beginPath();
    ctx.moveTo(36, y);
    ctx.lineTo(732, y);
    ctx.stroke();
  }

  // Header telemetry
  ctx.fillStyle = alertFlash ? '#ef4444' : '#34d399';
  ctx.font = 'bold 26px monospace';
  ctx.fillText('THERMAL GATE-07 // EXT CAM', 60, 82);

  // Cold blue thermal map showing NO warm human signature outside!
  const thermGrad = ctx.createRadialGradient(485, 290, 12, 485, 290, 145);
  thermGrad.addColorStop(0, 'rgba(30, 64, 175, 0.85)');
  thermGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.65)');
  thermGrad.addColorStop(1, 'rgba(3, 19, 14, 0)');
  ctx.fillStyle = thermGrad;
  ctx.fillRect(340, 120, 300, 320);

  // Silhouette outline in icy blue (dead cold 2C!)
  ctx.fillStyle = 'rgba(56, 189, 248, 0.42)';
  ctx.beginPath();
  ctx.ellipse(485, 215, 36, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(435, 265, 100, 145, 24);
  ctx.fill();

  // Huge temperature readout: 2°C
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 104px monospace';
  ctx.fillText('2°C', 64, 245);

  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 28px monospace';
  ctx.fillText('CORE HEAT: 0.0°C', 64, 310);
  ctx.fillStyle = 'rgba(248, 113, 113, 0.85)';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('NO RESPIRATION DETECTED', 64, 355);

  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  for (let y = 36; y < 476; y += 4) {
    ctx.fillRect(36, y, 696, 1.5);
  }

  return finalizeTexture(canvas, false);
}

export function makeRule4SignTex(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 640);

  // Aged off-white laminated sheet
  ctx.fillStyle = '#d9d2c3';
  ctx.fillRect(0, 0, 512, 640);

  // Dirty smudges & vignette
  const g = ctx.createRadialGradient(256, 320, 40, 256, 320, 360);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(40, 32, 22, 0.32)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 640);

  // Red warning header bar
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(28, 36, 456, 86);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SECTOR 7 // NIGHT', 256, 94);

  // RULE 4
  ctx.fillStyle = '#7f1d1d';
  ctx.font = '900 84px sans-serif';
  ctx.fillText('RULE 4', 256, 232);

  ctx.strokeStyle = '#7f1d1d';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(54, 260);
  ctx.lineTo(458, 260);
  ctx.stroke();

  ctx.fillStyle = '#18181b';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('NEVER OPEN THE DOOR', 256, 336);
  ctx.fillText('AFTER MIDNIGHT.', 256, 388);

  ctx.fillStyle = '#991b1b';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('EVEN IF THEY KNOW', 256, 480);
  ctx.fillText('YOUR NAME.', 256, 524);

  // Masking tape strips at top corners
  ctx.fillStyle = 'rgba(196, 175, 130, 0.85)';
  ctx.save();
  ctx.translate(60, 28);
  ctx.rotate(-0.35);
  ctx.fillRect(-55, -16, 110, 32);
  ctx.restore();

  ctx.save();
  ctx.translate(452, 28);
  ctx.rotate(0.32);
  ctx.fillRect(-55, -16, 110, 32);
  ctx.restore();

  return finalizeTexture(canvas, false);
}

export function makeFloorTwistTex(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(1024, 1024);
  const rng = mulberry32(hashString('floor_twist'));

  ctx.fillStyle = '#0c0f14';
  ctx.fillRect(0, 0, 1024, 1024);

  // Concrete & steel seam lines
  ctx.strokeStyle = '#1a2029';
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, 944, 944);
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.12 + rng() * 0.25})`;
    ctx.fillRect(rng() * 1024, rng() * 1024, 18 + rng() * 40, 10 + rng() * 24);
  }

  // Cut heavy steel padlock shackle lying on floor
  ctx.save();
  ctx.translate(390, 560);
  ctx.rotate(-0.42);
  // Padlock body
  ctx.fillStyle = '#334155';
  ctx.fillRect(-58, 0, 116, 128);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-46, 12, 92, 104);
  // Severed shackle left + right with bright fresh shear cut!
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.arc(0, -10, 40, Math.PI, Math.PI * 1.48);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -10, 40, Math.PI * 1.66, Math.PI * 2.0);
  ctx.stroke();
  // Bright sheared steel cut ends
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(-8, -48, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(20, -44, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Dropped bloodstained Level 3 keycard badge next to cut lock
  ctx.save();
  ctx.translate(650, 620);
  ctx.rotate(0.28);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(-95, -60, 190, 120);
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(-95, -60, 190, 32);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('LVL 3 CLEARANCE', -80, -38);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-75, -14, 48, 56);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-15, -6, 90, 12);
  ctx.fillRect(-15, 16, 68, 10);
  // Dark crimson blood smear across badge
  ctx.fillStyle = 'rgba(136, 19, 24, 0.85)';
  ctx.beginPath();
  ctx.ellipse(38, 18, 42, 22, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  return finalizeTexture(canvas, false);
}

export function makeRearDoorTex(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(768, 1536);
  ctx.fillStyle = '#0f1318';
  ctx.fillRect(0, 0, 768, 1536);

  // Heavy recessed steel door slab
  ctx.fillStyle = '#181e25';
  ctx.fillRect(48, 48, 672, 1440);
  ctx.strokeStyle = '#2d3742';
  ctx.lineWidth = 10;
  ctx.strokeRect(48, 48, 672, 1440);

  // Right-side lock housing plate
  ctx.fillStyle = '#252e38';
  ctx.fillRect(540, 670, 130, 260);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 4;
  ctx.strokeRect(540, 670, 130, 260);

  // Stencil warning
  ctx.fillStyle = 'rgba(185, 28, 28, 0.72)';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('REAR ACCESS', 384, 240);
  ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
  ctx.font = 'bold 26px monospace';
  ctx.fillText('BOOTH INTERIOR', 384, 285);

  return finalizeTexture(canvas, false);
}

export function makeRearLatchTex(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.clearRect(0, 0, 256, 256);

  // Metallic brushed steel deadbolt lever
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.roundRect(24, 96, 208, 64, 18);
  ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.roundRect(32, 104, 192, 22, 10);
  ctx.fill();
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(72, 128, 26, 0, Math.PI * 2);
  ctx.fill();
  return finalizeTexture(canvas, false);
}

export function makeLightPoolTex(r: number, g: number, b: number, innerAlpha = 0.55): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  const grad = ctx.createRadialGradient(128, 128, 4, 128, 128, 126);
  grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${innerAlpha})`);
  grad.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, ${innerAlpha * 0.42})`);
  grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  return finalizeTexture(canvas, false);
}

export function makeContactShadowTex(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 128);
  const grad = ctx.createRadialGradient(128, 64, 8, 128, 64, 120);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.35)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 128);
  return finalizeTexture(canvas, false);
}
