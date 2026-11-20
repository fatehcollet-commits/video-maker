import * as THREE from 'three';
import { ActorCard } from '../../engine/cast';
import { DOOR_HEIGHT_M, DOOR_WIDTH_M } from '../../engine/contract';
import { BunkerDustFX } from '../../engine/fx';
import { makeLightPool, makeUnlitPlane, setActiveSubsets } from '../../engine/setkit';
import {
  makeBlastDoorTex,
  makeConcreteWallTex,
  makeCorridorTex,
  makeFloorTwistTex,
  makeRearDoorTex,
  makeRearLatchTex,
  makeRule4SignTex,
  makeSteelFloorTex,
  makeThermalMonitorTex,
} from '../../engine/tex';
import type { ShotEval } from './story';

export type SubsetId =
  | 'booth'
  | 'door_closeup'
  | 'corridor_reveal'
  | 'floor_twist'
  | 'rear_door_blackout';

export interface Ep01World {
  root: THREE.Group;
  subsets: Record<SubsetId, THREE.Group>;
  watchman: ActorCard;
  girlBooth: ActorCard;
  girlClose: ActorCard;
  hordeEyes: ActorCard;
  dustFx: BunkerDustFX;
  update: (evalState: ShotEval, t: number) => void;
  dispose: () => void;
}

export function buildEp01World(): Ep01World {
  const root = new THREE.Group();

  const concreteTex = makeConcreteWallTex('ep01_concrete');
  const floorTex = makeSteelFloorTex('ep01_floor');
  const doorTex = makeBlastDoorTex('ep01_door');
  const corridorTex = makeCorridorTex('ep01_corridor');
  const monitorNormalTex = makeThermalMonitorTex(false);
  const monitorAlertTex = makeThermalMonitorTex(true);
  const rule4Tex = makeRule4SignTex();
  const floorTwistTex = makeFloorTwistTex();
  const rearDoorTex = makeRearDoorTex();
  const rearLatchTex = makeRearLatchTex();

  const subsets: Record<SubsetId, THREE.Group> = {
    booth: new THREE.Group(),
    door_closeup: new THREE.Group(),
    corridor_reveal: new THREE.Group(),
    floor_twist: new THREE.Group(),
    rear_door_blackout: new THREE.Group(),
  };

  for (const g of Object.values(subsets)) {
    root.add(g);
  }

  // -------------------------------------------------------------------------
  // 1) BOOTH (wide guard station + door + thermal monitor + rule 4 sign)
  // -------------------------------------------------------------------------
  const booth = subsets.booth;

  const boothCorridor = makeUnlitPlane(3.2, 3.6, corridorTex);
  boothCorridor.position.set(0, 1.35, -2.1);
  booth.add(boothCorridor);

  const girlBooth = new ActorCard(
    {
      kind: 'INFECTED_GIRL',
      shiver: 0,
      headTilt: 0,
      mouth: 'normal',
      mouthOpen: 0,
      eyes: 'normal',
      badgeHeld: false,
      crying: false,
    },
    1.0,
  );
  girlBooth.group.position.set(0.02, 0, -0.48);
  booth.add(girlBooth.group);

  // Left & Right concrete bunker walls framing the 1.05m x 2.10m steel door
  const wallLeft = makeUnlitPlane(1.4, 2.8, concreteTex);
  wallLeft.position.set(-1.225, 1.4, 0.0);
  booth.add(wallLeft);

  const wallRight = makeUnlitPlane(1.4, 2.8, concreteTex);
  wallRight.position.set(1.225, 1.4, 0.0);
  booth.add(wallRight);

  const headerWall = makeUnlitPlane(DOOR_WIDTH_M + 0.1, 0.72, concreteTex);
  headerWall.position.set(0, DOOR_HEIGHT_M + 0.36, 0.0);
  booth.add(headerWall);

  // Blast door (exact 1.05m x 2.10m contract)
  const boothDoor = makeUnlitPlane(DOOR_WIDTH_M, DOOR_HEIGHT_M, doorTex, {
    transparent: true,
    depthWrite: true,
    renderOrder: 4,
  });
  boothDoor.position.set(0, DOOR_HEIGHT_M / 2, 0.02);
  booth.add(boothDoor);

  // Booth steel floor
  const boothFloor = makeUnlitPlane(4.6, 5.2, floorTex);
  boothFloor.rotation.x = -Math.PI / 2;
  boothFloor.position.set(0, 0, 1.4);
  booth.add(boothFloor);

  // Side walls for depth perspective
  const sideWallL = makeUnlitPlane(4.2, 2.8, concreteTex);
  sideWallL.rotation.y = Math.PI / 2;
  sideWallL.position.set(-1.75, 1.4, 1.8);
  booth.add(sideWallL);

  const sideWallR = makeUnlitPlane(4.2, 2.8, concreteTex);
  sideWallR.rotation.y = -Math.PI / 2;
  sideWallR.position.set(1.75, 1.4, 1.8);
  booth.add(sideWallR);

  // Paper RULE 4 sign on right jamb
  const rule4Sign = makeUnlitPlane(0.38, 0.48, rule4Tex);
  rule4Sign.position.set(0.82, 1.54, 0.04);
  booth.add(rule4Sign);

  // Thermal monitor on left console
  const monitorMesh = makeUnlitPlane(0.68, 0.46, monitorNormalTex);
  monitorMesh.position.set(-0.92, 1.28, 0.08);
  monitorMesh.rotation.y = 0.22;
  booth.add(monitorMesh);

  // Sensor LED indicator above unlock switch
  const sensorPool = makeLightPool(0.45, 0.45, [245, 50, 50], 0.4, 0.65);
  sensorPool.position.set(0.48, 1.24, 0.06);
  booth.add(sensorPool);

  // Overhead cold fluorescent light pool
  const boothOverheadPool = makeLightPool(2.8, 2.8, [160, 215, 225], 0.28, 0.45);
  boothOverheadPool.position.set(0, 2.1, 0.8);
  booth.add(boothOverheadPool);

  // Watchman (Elias) inside booth foreground-left
  const watchman = new ActorCard(
    {
      kind: 'WATCHMAN',
      pose: 'idle',
      flashlightOn: false,
      headTurn: 0,
      facingRight: true,
    },
    1.0,
  );
  watchman.group.position.set(-0.58, 0, 1.15);
  booth.add(watchman.group);

  // Flashlight beam pool on door glass
  const boothFlashPool = makeLightPool(1.15, 1.15, [255, 240, 195], 0.0, 0.55);
  boothFlashPool.position.set(0.0, 1.48, 0.06);
  booth.add(boothFlashPool);

  // Red strobe wash in booth
  const boothRedStrobe = makeLightPool(4.2, 4.2, [235, 32, 32], 0.0, 0.55);
  boothRedStrobe.position.set(0, 1.3, 1.0);
  booth.add(boothRedStrobe);

  // -------------------------------------------------------------------------
  // 2) DOOR CLOSEUP (thermal monitor close-up + wired glass & girl mouth/face)
  // -------------------------------------------------------------------------
  const doorClose = subsets.door_closeup;

  const closeCorridor = makeUnlitPlane(3.4, 3.6, corridorTex);
  closeCorridor.position.set(0, 1.35, -1.9);
  doorClose.add(closeCorridor);

  const girlClose = new ActorCard(
    {
      kind: 'INFECTED_GIRL',
      shiver: 0,
      headTilt: 0,
      mouth: 'normal',
      mouthOpen: 0,
      eyes: 'normal',
      badgeHeld: false,
      crying: true,
    },
    1.15,
  );
  girlClose.group.position.set(0, 0.08, -0.34);
  doorClose.add(girlClose.group);

  const closeDoor = makeUnlitPlane(DOOR_WIDTH_M * 1.18, DOOR_HEIGHT_M * 1.18, doorTex, {
    transparent: true,
    depthWrite: true,
    renderOrder: 4,
  });
  closeDoor.position.set(0, 1.24, 0.03);
  doorClose.add(closeDoor);

  // Large thermal monitor close-up panel positioned on left flank for L12-L13
  const closeMonitor = makeUnlitPlane(1.36, 0.92, monitorAlertTex);
  closeMonitor.position.set(-1.32, 1.38, 0.14);
  doorClose.add(closeMonitor);

  const closeFlashPool = makeLightPool(1.25, 1.25, [255, 242, 204], 0.35, 0.58);
  closeFlashPool.position.set(0, 1.56, 0.09);
  doorClose.add(closeFlashPool);

  // -------------------------------------------------------------------------
  // 3) CORRIDOR REVEAL (L21-L23 head crack, jaw drop, 12 white eyes in depth)
  // -------------------------------------------------------------------------
  const corridorRev = subsets.corridor_reveal;

  const revCorridor = makeUnlitPlane(4.0, 4.4, corridorTex);
  revCorridor.position.set(0, 1.45, -2.3);
  corridorRev.add(revCorridor);

  const hordeEyes = new ActorCard(
    {
      kind: 'HORDE_EYES',
      revealProgress: 1,
      pulsePhase: 0,
    },
    1.55,
  );
  hordeEyes.group.position.set(0, -0.05, -1.35);
  corridorRev.add(hordeEyes.group);

  const girlReveal = new ActorCard(
    {
      kind: 'INFECTED_GIRL',
      shiver: 0,
      headTilt: 0.45,
      mouth: 'unhinged',
      mouthOpen: 1,
      eyes: 'white_glow',
      badgeHeld: false,
      crying: false,
    },
    1.18,
  );
  girlReveal.group.position.set(0, 0.08, -0.35);
  corridorRev.add(girlReveal.group);

  const revDoor = makeUnlitPlane(DOOR_WIDTH_M * 1.18, DOOR_HEIGHT_M * 1.18, doorTex, {
    transparent: true,
    depthWrite: true,
    renderOrder: 4,
  });
  revDoor.position.set(0, 1.24, 0.03);
  corridorRev.add(revDoor);

  const revStrobePool = makeLightPool(3.6, 3.6, [245, 28, 32], 0.0, 0.55);
  revStrobePool.position.set(0, 1.45, 0.12);
  corridorRev.add(revStrobePool);

  // -------------------------------------------------------------------------
  // 4) FLOOR TWIST (L24-L25 red strobe flashing + cut lock from inside)
  // -------------------------------------------------------------------------
  const floorTwist = subsets.floor_twist;

  const twistSlab = makeUnlitPlane(2.4, 2.4, floorTwistTex);
  twistSlab.position.set(0, 1.35, 0);
  floorTwist.add(twistSlab);

  const twistStrobePool = makeLightPool(2.8, 2.8, [245, 25, 30], 0.45, 0.6);
  twistStrobePool.position.set(0, 1.35, 0.1);
  floorTwist.add(twistStrobePool);

  // -------------------------------------------------------------------------
  // 5) REAR DOOR BLACKOUT (L26 cliffhanger + rotating deadbolt latch + tail freeze)
  // -------------------------------------------------------------------------
  const rearDoor = subsets.rear_door_blackout;

  const rearDoorSlab = makeUnlitPlane(DOOR_WIDTH_M * 1.35, DOOR_HEIGHT_M * 1.35, rearDoorTex);
  rearDoorSlab.position.set(0, 1.4, 0);
  rearDoor.add(rearDoorSlab);

  const latchPivot = new THREE.Group();
  latchPivot.position.set(0.35, 1.54, 0.05);
  const latchMesh = makeUnlitPlane(0.32, 0.32, rearLatchTex, {
    transparent: true,
    depthWrite: false,
    renderOrder: 5,
  });
  latchMesh.position.set(-0.08, 0, 0);
  latchPivot.add(latchMesh);
  rearDoor.add(latchPivot);

  const rearColdRim = makeLightPool(1.6, 1.6, [120, 165, 210], 0.24, 0.45);
  rearColdRim.position.set(0.32, 1.54, 0.08);
  rearDoor.add(rearColdRim);

  // Dust / spore atmosphere across all shots (zero breath fog!)
  const dustFx = new BunkerDustFX(165, 777);
  root.add(dustFx.points);

  function update(evalState: ShotEval, t: number): void {
    setActiveSubsets(subsets, [evalState.subset]);

    const lineNum = Number(evalState.lineId.slice(1));
    girlBooth.group.visible = lineNum >= 5;

    // Update Watchman only when booth is active
    if (evalState.subset === 'booth') {
      watchman.update({
        kind: 'WATCHMAN',
        pose: evalState.watchmanPose,
        flashlightOn: evalState.flashlightOn,
        headTurn: evalState.watchmanHeadTurn,
        facingRight: true,
      });
    }

    const shiverVal = evalState.shiverAmt > 0 ? Math.sin(t * 28.0) * evalState.shiverAmt : 0;

    // Update only the Girl card in the active visible subset
    const girlState = {
      kind: 'INFECTED_GIRL' as const,
      shiver: shiverVal,
      headTilt: evalState.girlHeadTilt,
      mouth: evalState.girlMouth,
      mouthOpen: evalState.girlMouthOpen,
      eyes: evalState.girlEyes,
      badgeHeld: evalState.badgeHeld,
      crying: evalState.girlCrying,
    };
    if (evalState.subset === 'booth' && lineNum >= 5) {
      girlBooth.update(girlState);
    } else if (evalState.subset === 'door_closeup') {
      girlClose.update(girlState);
    } else if (evalState.subset === 'corridor_reveal') {
      girlReveal.update(girlState);
    }

    // Update Horde Eyes (L23+)
    hordeEyes.group.visible = evalState.hordeReveal > 0.01;
    if (hordeEyes.group.visible) {
      hordeEyes.update({
        kind: 'HORDE_EYES',
        revealProgress: evalState.hordeReveal,
        pulsePhase: t * 2.2,
      });
    }

    // Sensor LED blink (L04+)
    sensorPool.material.opacity = evalState.sensorPulse;

    // Flashlight beam pool
    boothFlashPool.material.opacity = evalState.flashlightOn ? 0.36 : 0.0;
    closeFlashPool.material.opacity = evalState.flashlightOn ? 0.34 : 0.06;

    // Red strobe pools (L24-L25)
    boothRedStrobe.material.opacity = evalState.strobeGate * 0.48;
    revStrobePool.material.opacity = evalState.strobeGate * 0.52;
    twistStrobePool.material.opacity = 0.14 + evalState.strobeGate * 0.58;

    // Rear door latch rotation (snaps open on L26 cliffhanger!)
    latchPivot.rotation.z = -evalState.rearLatchOpen * 0.62;
    rearColdRim.material.opacity = evalState.blackoutAmount > 0.5 ? 0.0 : 0.24;

    // Dust FX (no fog on glass!)
    dustFx.points.visible = evalState.blackoutAmount < 0.95;
    dustFx.update(t, 0.34 * (1 - evalState.blackoutAmount), evalState.strobeGate);
  }

  function dispose(): void {
    watchman.dispose();
    girlBooth.dispose();
    girlClose.dispose();
    girlReveal.dispose();
    hordeEyes.dispose();
    dustFx.dispose();

    const disposedTextures = new Set<THREE.Texture>();
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (mat instanceof THREE.MeshBasicMaterial) {
          if (mat.map && !disposedTextures.has(mat.map)) {
            disposedTextures.add(mat.map);
            mat.map.dispose();
          }
          mat.dispose();
        }
      }
    });
  }

  return {
    root,
    subsets,
    watchman,
    girlBooth,
    girlClose,
    hordeEyes,
    dustFx,
    update,
    dispose,
  };
}
