import * as THREE from 'three';
import { makeLightPoolTex } from './tex';

export interface PlaneOptions {
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
  renderOrder?: number;
  color?: number;
}

export function makeUnlitPlane(
  width: number,
  height: number,
  map: THREE.Texture | null,
  opts: PlaneOptions = {},
): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const geo = new THREE.PlaneGeometry(width, height);
  const mat = new THREE.MeshBasicMaterial({
    map: map ?? undefined,
    color: opts.color ?? 0xffffff,
    side: THREE.DoubleSide,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1.0,
    depthWrite: opts.depthWrite ?? true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  if (opts.renderOrder !== undefined) {
    mesh.renderOrder = opts.renderOrder;
  }
  return mesh;
}

export function makeLightPool(
  width: number,
  height: number,
  rgb: readonly [number, number, number],
  opacity = 0.45,
  innerAlpha = 0.55,
): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const tex = makeLightPoolTex(rgb[0], rgb[1], rgb[2], innerAlpha);
  const geo = new THREE.PlaneGeometry(width, height);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 5;
  return mesh;
}

export function setActiveSubsets<T extends string>(
  subsets: Record<T, THREE.Group>,
  visibleIds: readonly T[],
): void {
  const active = new Set<string>(visibleIds);
  for (const [id, group] of Object.entries(subsets) as [T, THREE.Group][]) {
    group.visible = active.has(id);
  }
}
