import * as THREE from 'three';
import { ACTOR_HEIGHT_M, ACTOR_WIDTH_M } from './contract';
import { DOLL_H, DOLL_W, DollState, SOLES_Y, drawDoll, poseKey } from './doll';
import { makeContactShadowTex } from './tex';

export class ActorCard {
  public readonly group: THREE.Group;
  public readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  public readonly shadow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: THREE.CanvasTexture;
  private lastKey = '';

  constructor(initialState: DollState, scale = 1.0) {
    this.group = new THREE.Group();

    this.canvas = document.createElement('canvas');
    this.canvas.width = DOLL_W;
    this.canvas.height = DOLL_H;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable for ActorCard');
    this.ctx = ctx;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;

    const h = ACTOR_HEIGHT_M * scale;
    const w = ACTOR_WIDTH_M * scale;
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    // Align canvas y=SOLES_Y (968/1000) flush with world y=0
    const soleLift = 1.0 - SOLES_Y / DOLL_H; // 0.032
    this.mesh.position.y = h * (0.5 - soleLift);
    this.mesh.renderOrder = 3;
    this.group.add(this.mesh);

    const shadowTex = makeContactShadowTex();
    const shadowGeo = new THREE.PlaneGeometry(1.05 * scale, 0.36 * scale);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.015;
    this.shadow.renderOrder = 1;
    this.group.add(this.shadow);

    this.update(initialState);
  }

  public update(state: DollState): void {
    const key = poseKey(state);
    if (key === this.lastKey) return;
    this.lastKey = key;
    drawDoll(this.ctx, state);
    this.texture.needsUpdate = true;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.texture.dispose();
    this.shadow.geometry.dispose();
    this.shadow.material.map?.dispose();
    this.shadow.material.dispose();
  }
}
