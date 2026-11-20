import * as THREE from 'three';
import { mulberry32 } from './rng';

export class BunkerDustFX {
  public readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly uniforms: {
    uTime: { value: number };
    uOpacity: { value: number };
    uColor: { value: THREE.Color };
  };

  constructor(count = 160, seed = 777) {
    const rng = mulberry32(seed);
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (rng() - 0.5) * 4.4;
      positions[i * 3 + 1] = 0.15 + rng() * 2.55;
      positions[i * 3 + 2] = -2.2 + rng() * 4.4;
      phases[i] = rng() * Math.PI * 2;
      sizes[i] = 4.0 + rng() * 8.0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    this.uniforms = {
      uTime: { value: 0 },
      uOpacity: { value: 0.34 },
      uColor: { value: new THREE.Color(0x9fb8c9) },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aPhase;
        attribute float aSize;
        uniform float uTime;
        varying float vAlpha;

        void main() {
          vec3 p = position;
          p.x += sin(uTime * 0.45 + aPhase) * 0.14;
          p.y += mod(uTime * 0.06 + aPhase * 0.25, 0.45) - 0.22;
          p.z += cos(uTime * 0.35 + aPhase * 1.3) * 0.10;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = aSize * (3.5 / max(1.0, -mv.z));
          vAlpha = 0.45 + 0.55 * sin(uTime * 1.1 + aPhase * 2.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform vec3 uColor;
        varying float vAlpha;

        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float soft = smoothstep(0.5, 0.05, d);
          gl_FragColor = vec4(uColor, soft * vAlpha * uOpacity);
        }
      `,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.renderOrder = 6;
    this.points.frustumCulled = false;
  }

  public update(t: number, opacity: number, redTint = 0): void {
    this.uniforms.uTime.value = t;
    this.uniforms.uOpacity.value = opacity;
    // Shift floating spores from cold slate-blue to crimson during L24 red strobe
    this.uniforms.uColor.value.setRGB(
      0.62 + redTint * 0.36,
      0.72 * (1 - redTint * 0.78),
      0.79 * (1 - redTint * 0.82),
    );
  }

  public dispose(): void {
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
