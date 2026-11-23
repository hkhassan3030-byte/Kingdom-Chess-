import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { SceneMaterialBank } from './materials';

export const TILE_SIZE = 1.15;
export const BOARD_SPAN = TILE_SIZE * 8;
export const GRAVEYARD_SURFACE_Y = -0.058;
export const GRAVEYARD_BOUNDS = {
  innerX: 5.82,
  outerX: 9.3,
  halfZ: 5.1,
} as const;

export interface BrazierFlameSpec {
  x: number;
  y: number;
  z: number;
  scaleXZ: number;
  scaleY: number;
}

export interface BattlefieldRefs {
  group: THREE.Group;
  tileHitMeshes: THREE.Mesh[];
  coordGroup: THREE.Group;
  banners: THREE.Mesh[];
  brazierFlameInst: THREE.InstancedMesh;
  brazierFlameSpecs: BrazierFlameSpec[];
  brazierLights: THREE.PointLight[];
  embers: THREE.Points;
  emberVelocities: Float32Array;
  dispose: () => void;
}

export function squareToWorld(square: string, target = new THREE.Vector3()): THREE.Vector3 {
  const file = square.charCodeAt(0) - 97; // 'a' = 0 .. 'h' = 7
  const rank = parseInt(square[1], 10) - 1; // '1' = 0 .. '8' = 7
  const x = (file - 3.5) * TILE_SIZE;
  const z = (3.5 - rank) * TILE_SIZE;
  return target.set(x, 0, z);
}

function buildCoordAtlasQuad(
  basePlane: THREE.PlaneGeometry,
  glyphIdx: number,
  matrix: THREE.Matrix4
): THREE.BufferGeometry {
  const g = basePlane.clone();
  const col = glyphIdx % 4;
  const row = Math.floor(glyphIdx / 4);
  const uMin = col * 0.25;
  const vMin = 1.0 - (row + 1) * 0.25;

  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uMin + uv.getX(i) * 0.25, vMin + uv.getY(i) * 0.25);
  }
  g.applyMatrix4(matrix);
  return g;
}

export function createBattlefield(bank: SceneMaterialBank): BattlefieldRefs {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const dummy = new THREE.Object3D();

  // 1. Dark Citadel Basalt Arena Courtyard Floor & Stepped Outer Ring
  const groundGeo = trackGeo(new THREE.CylinderGeometry(68, 68, 1.6, 48));
  const ground = new THREE.Mesh(groundGeo, bank.citadelGround);
  ground.position.y = -1.25;
  ground.receiveShadow = true;
  group.add(ground);

  const daisRingGeo = trackGeo(new THREE.RingGeometry(8.5, 11.4, 44));
  const daisRing = new THREE.Mesh(daisRingGeo, bank.boardFrame);
  daisRing.rotation.x = -Math.PI / 2;
  daisRing.position.y = -0.44;
  daisRing.receiveShadow = true;
  group.add(daisRing);

  // 2. Moonlit Dark Reflecting Water Moat + Merged Carved Basalt Retaining Curb
  const moatSize = BOARD_SPAN + 5.2;
  const waterGeo = trackGeo(new THREE.BoxGeometry(moatSize, 0.2, moatSize));
  const waterMesh = new THREE.Mesh(waterGeo, bank.waterMoat);
  waterMesh.position.y = -0.34;
  waterMesh.receiveShadow = true;
  group.add(waterMesh);

  const curbLen = moatSize + 0.72;
  const curbH = new THREE.BoxGeometry(curbLen, 0.38, 0.46);
  const curbV = new THREE.BoxGeometry(0.46, 0.38, curbLen);
  const curbDist = moatSize / 2 + 0.18;
  const curbParts: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const gh = curbH.clone();
    gh.translate(0, -0.3, s * curbDist);
    curbParts.push(gh);

    const gv = curbV.clone();
    gv.translate(s * curbDist, -0.3, 0);
    curbParts.push(gv);
  }
  curbH.dispose();
  curbV.dispose();
  const mergedCurbGeo = trackGeo(mergeGeometries(curbParts, false)!);
  for (const p of curbParts) p.dispose();
  const curbMesh = new THREE.Mesh(mergedCurbGeo, bank.boardFrame);
  curbMesh.receiveShadow = true;
  group.add(curbMesh);

  // 3. Merged Carved Dark Granite Paver Apron & Merged Gold Trim Frame
  const apronThick = 0.5;
  const apronSpan = BOARD_SPAN + 2.35;
  const apronBandW = BOARD_SPAN + 0.16;

  const apronNSGeo = new THREE.BoxGeometry(apronBandW, apronThick, apronSpan);
  apronNSGeo.translate(0, -apronThick / 2 - 0.005, 0);
  const apronEWGeo = new THREE.BoxGeometry(apronSpan, apronThick, apronBandW);
  apronEWGeo.translate(0, -apronThick / 2 - 0.005, 0);
  const mergedApronGeo = trackGeo(mergeGeometries([apronNSGeo, apronEWGeo], false)!);
  apronNSGeo.dispose();
  apronEWGeo.dispose();

  const apronMesh = new THREE.Mesh(mergedApronGeo, bank.stoneApron);
  apronMesh.receiveShadow = true;
  apronMesh.castShadow = true;
  group.add(apronMesh);

  const trimInner = BOARD_SPAN + 0.12;
  const trimBarHGeo = new THREE.BoxGeometry(trimInner, 0.025, 0.055);
  const trimBarVGeo = new THREE.BoxGeometry(0.055, 0.025, trimInner);
  const trimParts: THREE.BufferGeometry[] = [];
  for (const sign of [-1, 1]) {
    const hb = trimBarHGeo.clone();
    hb.translate(0, 0.002, sign * (BOARD_SPAN / 2 + 0.028));
    trimParts.push(hb);

    const vb = trimBarVGeo.clone();
    vb.translate(sign * (BOARD_SPAN / 2 + 0.028), 0.002, 0);
    trimParts.push(vb);
  }
  trimBarHGeo.dispose();
  trimBarVGeo.dispose();
  const mergedTrimGeo = trackGeo(mergeGeometries(trimParts, false)!);
  for (const p of trimParts) p.dispose();

  const trimMesh = new THREE.Mesh(mergedTrimGeo, bank.boardGoldTrim);
  trimMesh.receiveShadow = true;
  group.add(trimMesh);

  const cornerOffset = BOARD_SPAN / 2 + 0.04;
  const cornerBaseGeo = new THREE.BoxGeometry(0.18, 0.055, 0.18);
  const cornerParts: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const c = cornerBaseGeo.clone();
      c.translate(sx * cornerOffset, 0.008, sz * cornerOffset);
      cornerParts.push(c);
    }
  }
  cornerBaseGeo.dispose();
  const mergedCornerGeo = trackGeo(mergeGeometries(cornerParts, false)!);
  for (const p of cornerParts) p.dispose();
  const cornerFinials = new THREE.Mesh(mergedCornerGeo, bank.boardGoldTrim);
  cornerFinials.receiveShadow = true;
  group.add(cornerFinials);

  // 3b. Dedicated Flanking Fallen Sanctuary Terraces (West -X: White Fallen, East +X: Black Fallen)
  const gyWidth = GRAVEYARD_BOUNDS.outerX - GRAVEYARD_BOUNDS.innerX; // 3.48
  const gyLength = GRAVEYARD_BOUNDS.halfZ * 2; // 10.2
  const gyCenterX = (GRAVEYARD_BOUNDS.innerX + GRAVEYARD_BOUNDS.outerX) * 0.5; // 7.56
  const gySlabThick = 0.28;

  const gySlabParts: THREE.BufferGeometry[] = [];
  const gyRimParts: THREE.BufferGeometry[] = [];
  const gyTrimParts: THREE.BufferGeometry[] = [];

  for (const sideSign of [-1, 1]) {
    const cx = sideSign * gyCenterX;
    // Main recessed stone graveyard deck (top flush at GRAVEYARD_SURFACE_Y = -0.058)
    const deckGeo = new THREE.BoxGeometry(gyWidth, gySlabThick, gyLength);
    deckGeo.translate(cx, GRAVEYARD_SURFACE_Y - gySlabThick * 0.5, 0);
    gySlabParts.push(deckGeo);

    // Lower bastion foundation pier reaching arena courtyard floor (-0.45)
    const baseGeo = new THREE.BoxGeometry(gyWidth - 0.24, 0.2, gyLength - 0.24);
    baseGeo.translate(cx, -0.36, 0);
    gyRimParts.push(baseGeo);

    // Outer perimeter low stone border curbs so bodies are cleanly framed
    const outerBar = new THREE.BoxGeometry(0.14, 0.045, gyLength + 0.14);
    outerBar.translate(sideSign * (GRAVEYARD_BOUNDS.outerX + 0.05), GRAVEYARD_SURFACE_Y + 0.012, 0);
    gyRimParts.push(outerBar);

    for (const sz of [-1, 1]) {
      const endBar = new THREE.BoxGeometry(gyWidth + 0.16, 0.045, 0.14);
      endBar.translate(cx, GRAVEYARD_SURFACE_Y + 0.012, sz * (GRAVEYARD_BOUNDS.halfZ + 0.05));
      gyRimParts.push(endBar);

      const stud = new THREE.BoxGeometry(0.16, 0.055, 0.16);
      stud.translate(
        sideSign * (GRAVEYARD_BOUNDS.outerX + 0.05),
        GRAVEYARD_SURFACE_Y + 0.018,
        sz * (GRAVEYARD_BOUNDS.halfZ + 0.05)
      );
      gyTrimParts.push(stud);
    }
  }

  const mergedGySlabGeo = trackGeo(mergeGeometries(gySlabParts, false)!);
  for (const g of gySlabParts) g.dispose();
  const gySlabMesh = new THREE.Mesh(mergedGySlabGeo, bank.stoneApron);
  gySlabMesh.receiveShadow = true;
  group.add(gySlabMesh);

  const mergedGyRimGeo = trackGeo(mergeGeometries(gyRimParts, false)!);
  for (const g of gyRimParts) g.dispose();
  const gyRimMesh = new THREE.Mesh(mergedGyRimGeo, bank.boardFrame);
  gyRimMesh.receiveShadow = true;
  group.add(gyRimMesh);

  const mergedGyTrimGeo = trackGeo(mergeGeometries(gyTrimParts, false)!);
  for (const g of gyTrimParts) g.dispose();
  const gyTrimMesh = new THREE.Mesh(mergedGyTrimGeo, bank.boardGoldTrim);
  gyTrimMesh.receiveShadow = true;
  group.add(gyTrimMesh);

  // Subtle carved allegiance edge strips along inner graveyard border (White on -X, Black on +X)
  const whiteInlayGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.014, gyLength - 0.5));
  const whiteInlayMesh = new THREE.Mesh(whiteInlayGeo, bank.lightTile);
  whiteInlayMesh.position.set(-GRAVEYARD_BOUNDS.innerX - 0.06, GRAVEYARD_SURFACE_Y + 0.002, 0);
  whiteInlayMesh.receiveShadow = true;
  group.add(whiteInlayMesh);

  const blackInlayGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.014, gyLength - 0.5));
  const blackInlayMesh = new THREE.Mesh(blackInlayGeo, bank.darkTile);
  blackInlayMesh.position.set(GRAVEYARD_BOUNDS.innerX + 0.06, GRAVEYARD_SURFACE_Y + 0.002, 0);
  blackInlayMesh.receiveShadow = true;
  group.add(blackInlayMesh);

  // 4. 64 Tiles rendered via 2 InstancedMeshes (2 draw calls total!) + Invisible Layer 1 Hit Planes
  const tileGeo = trackGeo(new THREE.BoxGeometry(TILE_SIZE - 0.014, 0.1, TILE_SIZE - 0.014));
  const lightTilesInst = new THREE.InstancedMesh(tileGeo, bank.lightTile, 32);
  lightTilesInst.receiveShadow = true;
  const darkTilesInst = new THREE.InstancedMesh(tileGeo, bank.darkTile, 32);
  darkTilesInst.receiveShadow = true;

  const hitGeo = trackGeo(new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE));
  const hitMat = trackMat(new THREE.MeshBasicMaterial({ visible: false }));
  const tileHitMeshes: THREE.Mesh[] = [];

  let lightIdx = 0;
  let darkIdx = 0;
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const square = `${String.fromCharCode(97 + file)}${rank + 1}`;
      const isLight = (file + rank) % 2 === 1;
      const x = (file - 3.5) * TILE_SIZE;
      const z = (3.5 - rank) * TILE_SIZE;

      dummy.position.set(x, -0.05, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();

      if (isLight) {
        lightTilesInst.setMatrixAt(lightIdx++, dummy.matrix);
      } else {
        darkTilesInst.setMatrixAt(darkIdx++, dummy.matrix);
      }

      const hitPlane = new THREE.Mesh(hitGeo, hitMat);
      hitPlane.rotation.x = -Math.PI / 2;
      hitPlane.position.set(x, 0.005, z);
      hitPlane.layers.set(1);
      hitPlane.userData.square = square;
      group.add(hitPlane);
      tileHitMeshes.push(hitPlane);
    }
  }
  lightTilesInst.instanceMatrix.needsUpdate = true;
  lightTilesInst.computeBoundingSphere();
  darkTilesInst.instanceMatrix.needsUpdate = true;
  darkTilesInst.computeBoundingSphere();
  group.add(lightTilesInst);
  group.add(darkTilesInst);

  // 5. All 32 Engraved Coordinate Glyphs merged into 1 single Mesh using 1 4x4 Atlas Texture
  const coordGroup = new THREE.Group();
  const baseCoordGeo = new THREE.PlaneGeometry(0.56, 0.56);
  const edgeOffset = BOARD_SPAN / 2 + 0.56;
  const coordGeos: THREE.BufferGeometry[] = [];

  for (let i = 0; i < 8; i++) {
    const x = (i - 3.5) * TILE_SIZE;
    dummy.position.set(x, 0.014, edgeOffset);
    dummy.rotation.set(-Math.PI / 2, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    coordGeos.push(buildCoordAtlasQuad(baseCoordGeo, i, dummy.matrix));

    dummy.position.set(x, 0.014, -edgeOffset);
    dummy.rotation.set(-Math.PI / 2, 0, Math.PI);
    dummy.updateMatrix();
    coordGeos.push(buildCoordAtlasQuad(baseCoordGeo, i, dummy.matrix));

    const z = (3.5 - i) * TILE_SIZE;
    dummy.position.set(-edgeOffset, 0.014, z);
    dummy.rotation.set(-Math.PI / 2, 0, 0);
    dummy.updateMatrix();
    coordGeos.push(buildCoordAtlasQuad(baseCoordGeo, 8 + i, dummy.matrix));

    dummy.position.set(edgeOffset, 0.014, z);
    dummy.rotation.set(-Math.PI / 2, 0, Math.PI);
    dummy.updateMatrix();
    coordGeos.push(buildCoordAtlasQuad(baseCoordGeo, 8 + i, dummy.matrix));
  }
  baseCoordGeo.dispose();

  const mergedCoordGeo = trackGeo(mergeGeometries(coordGeos, false)!);
  for (const g of coordGeos) g.dispose();

  const coordMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: bank.coordAtlasTex,
      transparent: true,
      depthWrite: false,
    })
  );
  const coordMesh = new THREE.Mesh(mergedCoordGeo, coordMat);
  coordGroup.add(coordMesh);
  group.add(coordGroup);

  // 6. All 8 Carved Stone Braziers consolidated into 6 InstancedMeshes (6 draw calls total, zero PointLights!)
  const brazierDist = moatSize / 2 + 0.92;
  const outerDist = moatSize / 2 + 4.4;
  const brazierSpecs: Array<{ x: number; z: number; sx: number; sy: number }> = [
    { x: -brazierDist, z: brazierDist, sx: 1, sy: 1 },
    { x: brazierDist, z: brazierDist, sx: 1, sy: 1 },
    { x: -brazierDist, z: -brazierDist, sx: 1, sy: 1 },
    { x: brazierDist, z: -brazierDist, sx: 1, sy: 1 },
    { x: -outerDist * 0.65, z: -outerDist, sx: 0.85, sy: 1.35 },
    { x: outerDist * 0.65, z: -outerDist, sx: 0.85, sy: 1.35 },
    { x: -outerDist * 0.65, z: outerDist, sx: 0.85, sy: 1.35 },
    { x: outerDist * 0.65, z: outerDist, sx: 0.85, sy: 1.35 },
  ];

  const plinthGeo = trackGeo(new THREE.CylinderGeometry(0.62, 0.76, 0.36, 8));
  const shaftGeo = trackGeo(new THREE.CylinderGeometry(0.36, 0.48, 0.72, 8));
  const bowlGeo = trackGeo(new THREE.CylinderGeometry(0.54, 0.28, 0.32, 10));
  const rimGeo = trackGeo(new THREE.TorusGeometry(0.52, 0.045, 6, 12));
  const emberBedGeo = trackGeo(
    new THREE.SphereGeometry(0.42, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5)
  );
  const flameGeo = trackGeo(new THREE.ConeGeometry(0.24, 0.65, 7));

  const count = brazierSpecs.length;
  const plinthInst = new THREE.InstancedMesh(plinthGeo, bank.ruinStone, count);
  plinthInst.receiveShadow = true;

  const shaftInst = new THREE.InstancedMesh(shaftGeo, bank.ruinStone, count);
  shaftInst.receiveShadow = true;

  const bowlInst = new THREE.InstancedMesh(bowlGeo, bank.brazierIron, count);
  bowlInst.receiveShadow = true;

  const rimInst = new THREE.InstancedMesh(rimGeo, bank.brazierIron, count);
  const emberBedInst = new THREE.InstancedMesh(emberBedGeo, bank.brazierEmber, count);
  const brazierFlameInst = new THREE.InstancedMesh(flameGeo, bank.brazierFlame, count);
  brazierFlameInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const brazierFlameSpecs: BrazierFlameSpec[] = [];
  const baseY = -0.44;

  for (let i = 0; i < count; i++) {
    const { x, z, sx, sy } = brazierSpecs[i];

    dummy.rotation.set(0, 0, 0);
    dummy.position.set(x, baseY + 0.18 * sy, z);
    dummy.scale.set(sx, sy, sx);
    dummy.updateMatrix();
    plinthInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, baseY + 0.72 * sy, z);
    dummy.scale.set(sx, sy, sx);
    dummy.updateMatrix();
    shaftInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, baseY + 1.22 * sy, z);
    dummy.scale.set(sx, sy, sx);
    dummy.updateMatrix();
    bowlInst.setMatrixAt(i, dummy.matrix);

    dummy.rotation.set(Math.PI / 2, 0, 0);
    dummy.position.set(x, baseY + 1.38 * sy, z);
    dummy.scale.set(sx, sx, sy);
    dummy.updateMatrix();
    rimInst.setMatrixAt(i, dummy.matrix);

    dummy.rotation.set(0, 0, 0);
    dummy.position.set(x, baseY + 1.34 * sy, z);
    dummy.scale.set(sx, 0.45 * sy, sx);
    dummy.updateMatrix();
    emberBedInst.setMatrixAt(i, dummy.matrix);

    const flameY = baseY + 1.62 * sy;
    dummy.position.set(x, flameY, z);
    dummy.scale.set(sx * 0.9, sy * 1.35, sx * 0.9);
    dummy.updateMatrix();
    brazierFlameInst.setMatrixAt(i, dummy.matrix);

    brazierFlameSpecs.push({
      x,
      y: flameY,
      z,
      scaleXZ: sx * 0.9,
      scaleY: sy * 1.35,
    });
  }

  for (const inst of [
    plinthInst,
    shaftInst,
    bowlInst,
    rimInst,
    emberBedInst,
    brazierFlameInst,
  ]) {
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    group.add(inst);
  }

  // 7. Instanced Ancient Ruined Gothic Pillars & Horizon Citadel Monoliths
  const pillarSpecs: Array<[number, number, number, number, number]> = [
    [-13.5, -13.5, 4.6, 1.0, 0.04],
    [-16.2, -6.2, 3.8, 0.9, -0.05],
    [-16.4, 5.8, 5.1, 1.05, 0.03],
    [-13.2, 13.8, 4.2, 0.95, -0.04],
    [13.6, -13.6, 4.9, 1.0, -0.03],
    [16.3, -5.6, 3.5, 0.88, 0.05],
    [16.1, 6.4, 4.7, 1.0, -0.02],
    [13.8, 13.4, 3.9, 0.92, 0.04],
    [-6.2, -16.8, 5.4, 1.1, 0.02],
    [6.4, -16.6, 4.3, 0.96, -0.03],
    [-6.4, 16.6, 4.8, 1.02, 0.03],
    [6.1, 16.9, 5.2, 1.08, -0.02],
  ];

  const colGeo = trackGeo(new THREE.CylinderGeometry(0.46, 0.56, 1.0, 8));
  const capGeo = trackGeo(new THREE.BoxGeometry(1.38, 0.34, 1.38));

  const colInst = new THREE.InstancedMesh(colGeo, bank.ruinStone, pillarSpecs.length);
  colInst.receiveShadow = true;

  const capInst = new THREE.InstancedMesh(capGeo, bank.ruinStone, pillarSpecs.length);
  capInst.receiveShadow = true;

  pillarSpecs.forEach(([px, pz, h, rad, tilt], idx) => {
    dummy.position.set(px, -0.44 + h * 0.5, pz);
    dummy.rotation.set(tilt, idx * 0.65, -tilt * 0.7);
    dummy.scale.set(rad, h, rad);
    dummy.updateMatrix();
    colInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(px, -0.44 + h + 0.14, pz);
    dummy.rotation.set(tilt * 1.4, idx * 0.65 + 0.35, -tilt);
    dummy.scale.set(rad, 1, rad);
    dummy.updateMatrix();
    capInst.setMatrixAt(idx, dummy.matrix);
  });
  colInst.instanceMatrix.needsUpdate = true;
  colInst.computeBoundingSphere();
  capInst.instanceMatrix.needsUpdate = true;
  capInst.computeBoundingSphere();
  group.add(colInst);
  group.add(capInst);

  // Outer jagged dark citadel mountain spires fading into misty horizon fog
  const spireGeo = trackGeo(new THREE.ConeGeometry(3.8, 13.5, 5));
  const spireCount = 16;
  const spireInst = new THREE.InstancedMesh(spireGeo, bank.citadelGround, spireCount);
  for (let i = 0; i < spireCount; i++) {
    const ang = (i / spireCount) * Math.PI * 2 + 0.18;
    const dist = 28 + (i % 3) * 5.5;
    const sx = Math.cos(ang) * dist;
    const sz = Math.sin(ang) * dist;
    const syScale = 0.75 + (i % 4) * 0.28;
    dummy.position.set(sx, -0.5 + 5.2 * syScale, sz);
    dummy.rotation.set(0, ang * 1.7, 0);
    dummy.scale.set(1.0 + (i % 2) * 0.45, syScale, 1.0 + ((i + 1) % 2) * 0.35);
    dummy.updateMatrix();
    spireInst.setMatrixAt(i, dummy.matrix);
  }
  spireInst.instanceMatrix.needsUpdate = true;
  spireInst.computeBoundingSphere();
  group.add(spireInst);

  // 8. Drifting Warm Glowing Fire Embers & Ash Motes (budgeted for mobile 60 FPS)
  const emberCount = 32;
  const emberPositions = new Float32Array(emberCount * 3);
  const emberVelocities = new Float32Array(emberCount * 3);

  for (let i = 0; i < emberCount; i++) {
    emberPositions[i * 3] = (Math.random() - 0.5) * 18;
    emberPositions[i * 3 + 1] = 0.25 + Math.random() * 5.2;
    emberPositions[i * 3 + 2] = (Math.random() - 0.5) * 18;

    emberVelocities[i * 3] = (Math.random() - 0.5) * 0.18;
    emberVelocities[i * 3 + 1] = 0.14 + Math.random() * 0.24;
    emberVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.18;
  }

  const emberGeo = trackGeo(new THREE.BufferGeometry());
  const posAttr = new THREE.BufferAttribute(emberPositions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  emberGeo.setAttribute('position', posAttr);

  const emberMat = trackMat(
    new THREE.PointsMaterial({
      size: 0.14,
      color: 0xffa84c,
      map: bank.emberTexture,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );

  const embers = new THREE.Points(emberGeo, emberMat);
  embers.frustumCulled = false;
  group.add(embers);

  // Freeze all static battlefield matrices so renderer never recalculates static world transforms every frame
  group.updateMatrixWorld(true);
  group.traverse((obj) => {
    obj.matrixAutoUpdate = false;
  });

  return {
    group,
    tileHitMeshes,
    coordGroup,
    banners: [],
    brazierFlameInst,
    brazierFlameSpecs,
    brazierLights: [],
    embers,
    emberVelocities,
    dispose: () => {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
