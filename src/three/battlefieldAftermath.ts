import * as THREE from 'three';
import {
  BOARD_SPAN,
  GRAVEYARD_BOUNDS,
  GRAVEYARD_SURFACE_Y,
} from './createBattlefield';
import {
  createCharacterPiece,
  type CharacterGeometryBank,
  type CharacterRig,
} from './createCharacterPieces';
import type { SceneMaterialBank } from './materials';
import type { CharacterSetId, PieceColor, PieceType } from '../types/chess';

const MAX_STAINS_PER_VARIANT = 36;
const STAIN_VARIANT_COUNT = 4;

const _corpseBox = new THREE.Box3();
const _stainDummy = new THREE.Object3D();
const _stainColor = new THREE.Color();

// Natural dark arterial-to-coagulated crimson palette (never bright neon cartoon red)
const STAIN_COLOR_PALETTE = [
  0x4b060a,
  0x5e090f,
  0x6b0b12,
  0x3e0508,
  0x55080d,
  0x730d14,
] as const;

export interface PersistentStainRecord {
  moveIndex: number;
  variant: 0 | 1 | 2 | 3;
  x: number;
  y: number;
  z: number;
  scaleX: number;
  scaleZ: number;
  rotY: number;
  colorHex: number;
  orderIndex: number;
}

export interface FallenPieceRecord {
  moveIndex: number;
  color: PieceColor;
  type: PieceType;
  characterSet: CharacterSetId;
  poseVariant: number;
  jitter: number;
  slotIndex: number;
  rig: CharacterRig;
}

export interface GraveyardSlotTransform {
  x: number;
  y: number;
  z: number;
  yaw: number;
  scale: number;
}

/**
 * Computes exact battlefield surface Y at (x, z) so persistent ground blood stains
 * rest flush on tiles, stone apron, or graveyard sanctuaries without floating over water.
 */
export function getBattlefieldSurfaceY(x: number, z: number): number | null {
  const halfBoard = BOARD_SPAN * 0.5 + 0.02;
  const ax = Math.abs(x);
  const az = Math.abs(z);

  if (ax <= halfBoard && az <= halfBoard) {
    return 0.0;
  }
  const apronHalf = BOARD_SPAN * 0.5 + 1.16;
  if (ax <= apronHalf && az <= apronHalf) {
    return -0.005;
  }
  if (
    ax >= GRAVEYARD_BOUNDS.innerX &&
    ax <= GRAVEYARD_BOUNDS.outerX &&
    az <= GRAVEYARD_BOUNDS.halfZ
  ) {
    return GRAVEYARD_SURFACE_Y;
  }
  return null;
}

/**
 * Clamps an impact ground stain coordinate onto solid stone/board surfaces so stray
 * edge splatter never hovers above the water moat.
 */
export function clampStainToSolidGround(x: number, z: number): { x: number; y: number; z: number } {
  const directY = getBattlefieldSurfaceY(x, z);
  if (directY !== null) {
    return { x, y: directY, z };
  }
  const apronLimit = BOARD_SPAN * 0.5 + 1.05;
  const cx = THREE.MathUtils.clamp(x, -apronLimit, apronLimit);
  const cz = THREE.MathUtils.clamp(z, -apronLimit, apronLimit);
  const clampedY = getBattlefieldSurfaceY(cx, cz) ?? -0.005;
  return { x: cx, y: clampedY, z: cz };
}

/**
 * Computes non-overlapping Graveyard Sanctuary slot positions beside the chessboard.
 * - White Fallen: West flank (-X)
 * - Black Fallen: East flank (+X)
 * Automatically switches from 2x8 (16 slots) to a denser 3-column layout if > 16 pieces fall.
 */
export function computeGraveyardSlotTransform(
  color: PieceColor,
  slotIndex: number,
  totalForSide: number,
  jitter = 0.5
): GraveyardSlotTransform {
  const sideSign = color === 'w' ? -1 : 1;
  const crowded = totalForSide > 16;

  if (!crowded) {
    const col = Math.floor(slotIndex / 8); // 0 inner, 1 outer
    const row = slotIndex % 8;
    const xBase = col === 0 ? 6.62 : 8.32;
    const zSpacing = 1.18;
    const zBase = (row - 3.5) * zSpacing + (col === 1 ? (row % 2 === 0 ? 0.14 : -0.14) : 0);
    const xJitter = (jitter - 0.5) * 0.14;
    const zJitter = ((jitter * 1.7) % 1 - 0.5) * 0.12;
    const yaw = sideSign * (Math.PI * 0.5) + (jitter - 0.5) * 0.42;
    return {
      x: sideSign * (xBase + xJitter),
      y: GRAVEYARD_SURFACE_Y,
      z: zBase + zJitter,
      yaw,
      scale: 0.96,
    };
  }

  // Crowded 3-column x 10-row fallback for 17+ captured pieces
  const cols = 3;
  const rowsPerCol = Math.max(8, Math.ceil(totalForSide / cols));
  const col = Math.min(cols - 1, Math.floor(slotIndex / rowsPerCol));
  const row = slotIndex % rowsPerCol;
  const xBase = 6.38 + col * 1.18;
  const zSpan = Math.min(9.2, rowsPerCol * 1.02);
  const zStep = rowsPerCol > 1 ? zSpan / (rowsPerCol - 1) : 0;
  const zBase = -zSpan * 0.5 + row * zStep;
  const yaw = sideSign * (Math.PI * 0.5) + (jitter - 0.5) * 0.34;
  return {
    x: sideSign * xBase,
    y: GRAVEYARD_SURFACE_Y,
    z: zBase,
    yaw,
    scale: 0.84,
  };
}

let _cachedAtlasCanvas: HTMLCanvasElement | null = null;

function seededRand(seed: number): () => number {
  let s = seed | 0 || 1337;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 10000) / 10000;
  };
}

function drawOrganicStainVariant(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  qSize: number,
  variant: number
) {
  const rand = seededRand(4109 + variant * 7919);
  const cx = ox + qSize * 0.5;
  const cy = oy + qSize * 0.5;

  // Main arterial pool
  const coreRadius = variant === 1 ? qSize * 0.19 : qSize * 0.24;
  const coreGrad = ctx.createRadialGradient(cx, cy, coreRadius * 0.08, cx, cy, coreRadius);
  coreGrad.addColorStop(0, 'rgba(66, 6, 10, 0.95)');
  coreGrad.addColorStop(0.52, 'rgba(104, 11, 17, 0.82)');
  coreGrad.addColorStop(0.84, 'rgba(84, 8, 12, 0.38)');
  coreGrad.addColorStop(1, 'rgba(54, 4, 7, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
  ctx.fill();

  // Irregular organic lobes so silhouette is never a uniform circle
  const lobeCount = variant === 2 ? 12 : 9;
  for (let i = 0; i < lobeCount; i++) {
    const ang = (i / lobeCount) * Math.PI * 2 + (rand() - 0.5) * 0.45;
    const dist =
      variant === 1
        ? (0.08 + rand() * 0.26) * qSize * (Math.abs(Math.cos(ang)) * 0.7 + 0.45)
        : (0.07 + rand() * 0.16) * qSize;
    const lx = cx + Math.cos(ang) * dist;
    const ly = cy + Math.sin(ang) * dist;
    const lr = (0.055 + rand() * 0.095) * qSize;

    const lg = ctx.createRadialGradient(lx, ly, lr * 0.1, lx, ly, lr);
    lg.addColorStop(0, 'rgba(92, 9, 14, 0.88)');
    lg.addColorStop(0.65, 'rgba(72, 7, 11, 0.44)');
    lg.addColorStop(1, 'rgba(48, 4, 6, 0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Directional streaks for slash/impact splatter variants (1 & 2)
  const streakCount = variant === 1 ? 11 : variant === 2 ? 14 : 6;
  for (let i = 0; i < streakCount; i++) {
    const baseAngle =
      variant === 1
        ? (rand() - 0.5) * 0.85 + (i % 2 === 0 ? 0 : Math.PI * 0.12)
        : rand() * Math.PI * 2;
    const rStart = (0.14 + rand() * 0.12) * qSize;
    const rEnd = rStart + (0.07 + rand() * 0.16) * qSize;
    const x1 = cx + Math.cos(baseAngle) * rStart;
    const y1 = cy + Math.sin(baseAngle) * rStart;
    const x2 = cx + Math.cos(baseAngle) * rEnd;
    const y2 = cy + Math.sin(baseAngle) * rEnd;

    ctx.strokeStyle = `rgba(98, 10, 15, ${(0.35 + rand() * 0.42).toFixed(2)})`;
    ctx.lineWidth = 1.6 + rand() * 3.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Terminal satellite droplet at tip of streak
    const dropR = 1.8 + rand() * 4.2;
    const dg = ctx.createRadialGradient(x2, y2, 0.5, x2, y2, dropR);
    dg.addColorStop(0, 'rgba(88, 9, 13, 0.85)');
    dg.addColorStop(1, 'rgba(54, 5, 8, 0)');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(x2, y2, dropR, 0, Math.PI * 2);
    ctx.fill();
  }
}

function createPersistentBloodAtlasTexture(maxAnisotropy: number): THREE.CanvasTexture {
  if (!_cachedAtlasCanvas) {
    const size = 512;
    const q = size * 0.5;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, size, size);
      drawOrganicStainVariant(ctx, 0, 0, q, 0);
      drawOrganicStainVariant(ctx, q, 0, q, 1);
      drawOrganicStainVariant(ctx, 0, q, q, 2);
      drawOrganicStainVariant(ctx, q, q, q, 3);
    }
    _cachedAtlasCanvas = canvas;
  }

  const tex = new THREE.CanvasTexture(_cachedAtlasCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.max(1, maxAnisotropy);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createAtlasQuadrantPlane(variant: 0 | 1 | 2 | 3): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(1, 1);
  const col = variant % 2;
  const row = Math.floor(variant / 2);
  const uMin = col * 0.5 + 0.01;
  const uMax = (col + 1) * 0.5 - 0.01;
  const vMax = 1 - row * 0.5 - 0.01;
  const vMin = 1 - (row + 1) * 0.5 + 0.01;

  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i) > 0.5 ? uMax : uMin;
    const v = uv.getY(i) > 0.5 ? vMax : vMin;
    uv.setXY(i, u, v);
  }
  return geo;
}

function poseFallenRig(
  rig: CharacterRig,
  poseVariant: number,
  jitter: number,
  slot: GraveyardSlotTransform
) {
  rig.root.position.set(slot.x, slot.y, slot.z);
  rig.root.rotation.set(0, 0, 0);
  rig.root.scale.setScalar(slot.scale);
  rig.root.visible = true;

  // Disable hitProxy so corpses NEVER interfere with chessboard raycasting
  rig.hitProxy.visible = false;
  rig.hitProxy.layers.set(0);
  if (rig.hitProxy.parent) {
    rig.hitProxy.parent.remove(rig.hitProxy);
  }

  const isMounted = Boolean(rig.horse);
  rig.body.position.set(0, 0, 0);
  rig.torso.position.y = rig.torsoBaseY;

  if (isMounted && rig.horse) {
    const sideDir = poseVariant % 2 === 0 ? 1 : -1;
    rig.body.rotation.order = 'YXZ';
    rig.body.rotation.set(0.08 * (jitter - 0.5), slot.yaw, sideDir * Math.PI * 0.46);
    rig.torso.rotation.set(0.18, -sideDir * 0.22, sideDir * 0.16);
    rig.head.rotation.set(0.15, -sideDir * 0.35, sideDir * 0.2);
    rig.rightArm.rotation.set(-0.52, 0.24, -0.58);
    rig.leftArm.rotation.set(-0.36, -0.2, 0.48);

    const hLegs = rig.horse.legs;
    for (let i = 0; i < hLegs.length; i++) {
      hLegs[i].rotation.x = (i % 2 === 0 ? 0.34 : -0.28) + (jitter - 0.5) * 0.18;
    }
    rig.horse.neck.rotation.x = 0.24;
    rig.horse.tail.rotation.set(0.28, sideDir * 0.3, 0);
  } else {
    const v = poseVariant % 4;
    const j = jitter - 0.5;
    rig.body.rotation.order = 'YXZ';

    if (v === 0) {
      // Supine back collapse
      rig.body.rotation.set(-Math.PI * 0.48, slot.yaw, j * 0.26);
      rig.torso.rotation.set(0.08, j * 0.18, 0);
      rig.head.rotation.set(-0.2, j * 0.52, j * 0.22);
      rig.rightArm.rotation.set(-0.24, 0.35, -0.82 - jitter * 0.28);
      rig.leftArm.rotation.set(-0.32, -0.32, 0.78 + jitter * 0.24);
      if (rig.legs[0]) rig.legs[0].rotation.x = 0.14;
      if (rig.legs[1]) rig.legs[1].rotation.x = -0.22;
    } else if (v === 1) {
      // Left flank collapse
      rig.body.rotation.order = 'YZX';
      rig.body.rotation.set(-0.16, slot.yaw, Math.PI * 0.46);
      rig.torso.rotation.set(0.14, -0.18, 0.12);
      rig.head.rotation.set(0.18, -0.34, 0.22);
      rig.rightArm.rotation.set(-0.62, 0.22, -0.44);
      rig.leftArm.rotation.set(0.24, -0.2, 0.54);
      if (rig.legs[0]) rig.legs[0].rotation.x = 0.36;
      if (rig.legs[1]) rig.legs[1].rotation.x = -0.14;
    } else if (v === 2) {
      // Right flank collapse
      rig.body.rotation.order = 'YZX';
      rig.body.rotation.set(-0.15, slot.yaw, -Math.PI * 0.46);
      rig.torso.rotation.set(0.12, 0.18, -0.12);
      rig.head.rotation.set(0.16, 0.36, -0.22);
      rig.rightArm.rotation.set(0.2, 0.24, -0.62);
      rig.leftArm.rotation.set(-0.56, -0.18, 0.38);
      if (rig.legs[0]) rig.legs[0].rotation.x = -0.16;
      if (rig.legs[1]) rig.legs[1].rotation.x = 0.34;
    } else {
      // Prone collapse
      rig.body.rotation.set(Math.PI * 0.47, slot.yaw, j * 0.24);
      rig.torso.rotation.set(-0.08, j * 0.16, 0);
      rig.head.rotation.set(0.12, j * 0.62, 0);
      rig.rightArm.rotation.set(-0.92, 0.16, -0.5);
      rig.leftArm.rotation.set(-0.78, -0.16, 0.46);
      if (rig.legs[0]) rig.legs[0].rotation.x = -0.12;
      if (rig.legs[1]) rig.legs[1].rotation.x = 0.18;
    }
  }

  if (rig.cape) {
    rig.cape.rotation.set(poseVariant % 4 === 3 ? 0.06 : -0.14, 0, 0);
  }
  if (rig.crystal) {
    rig.crystal.scale.setScalar(0.84);
  }

  // Calibrate exact ground contact on the graveyard stone surface (slot.y)
  rig.root.updateMatrixWorld(true);
  _corpseBox.setFromObject(rig.body);
  if (Number.isFinite(_corpseBox.min.y)) {
    const localDelta = (slot.y + 0.008 - _corpseBox.min.y) / Math.max(0.1, slot.scale);
    rig.body.position.y += localDelta;
  }

  // Elongated soft contact shadow under the prostrate silhouette
  rig.contactShadow.position.set(0, 0.0035, 0);
  rig.contactShadow.rotation.set(-Math.PI / 2, 0, slot.yaw);
  rig.contactShadow.scale.set(isMounted ? 1.15 : 0.92, isMounted ? 1.55 : 1.42, 1);

  // Freeze static matrices so fallen bodies consume zero per-frame transform CPU
  rig.root.updateMatrixWorld(true);
  rig.root.traverse((obj) => {
    obj.matrixAutoUpdate = false;
  });
}

/**
 * Manages the Battlefield Aftermath for a match:
 * 1. Persistent fallen character corpses in dedicated White/Black Graveyard Areas.
 * 2. Persistent, z-fighting-free ground blood stains rendered via 4 instanced atlas batches.
 * 3. Deterministic Undo rollback, Kingdom switch rebuilds, and zero-leak match reset/dispose.
 */
export class BattlefieldAftermathManager {
  private group: THREE.Group;
  private charGeos: CharacterGeometryBank;
  private materials: SceneMaterialBank;
  private shadowsEnabled = true;

  private fallenRecords: FallenPieceRecord[] = [];
  private stains: PersistentStainRecord[] = [];
  private stainCounters = [0, 0, 0, 0];
  private stainOrderSeq = 0;

  private atlasTex: THREE.CanvasTexture;
  private stainGeos: THREE.PlaneGeometry[] = [];
  private stainMats: THREE.MeshBasicMaterial[] = [];
  private stainInsts: THREE.InstancedMesh[] = [];

  constructor(
    parentGroup: THREE.Group,
    renderer: THREE.WebGLRenderer,
    charGeos: CharacterGeometryBank,
    materials: SceneMaterialBank
  ) {
    this.group = parentGroup;
    this.charGeos = charGeos;
    this.materials = materials;

    const maxAniso = renderer.capabilities?.getMaxAnisotropy?.() ?? 1;
    this.atlasTex = createPersistentBloodAtlasTexture(maxAniso);

    const opacities = [0.76, 0.82, 0.72, 0.85];
    for (let v = 0 as 0 | 1 | 2 | 3; v < STAIN_VARIANT_COUNT; v = (v + 1) as 0 | 1 | 2 | 3) {
      const geo = createAtlasQuadrantPlane(v);
      const mat = new THREE.MeshBasicMaterial({
        map: this.atlasTex,
        transparent: true,
        opacity: opacities[v],
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const inst = new THREE.InstancedMesh(geo, mat, MAX_STAINS_PER_VARIANT);
      inst.frustumCulled = false;
      inst.renderOrder = 1;
      inst.receiveShadow = false;
      inst.castShadow = false;
      inst.visible = false;

      // Pre-populate instanceColor so USE_INSTANCING_COLOR compiles cleanly at startup
      _stainColor.setHex(STAIN_COLOR_PALETTE[0]);
      for (let i = 0; i < MAX_STAINS_PER_VARIANT; i++) {
        inst.setColorAt(i, _stainColor);
      }
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.count = 0;

      this.group.add(inst);
      this.stainGeos.push(geo);
      this.stainMats.push(mat);
      this.stainInsts.push(inst);
    }
  }

  public setShadowsEnabled(enabled: boolean) {
    this.shadowsEnabled = enabled;
    for (let i = 0; i < this.fallenRecords.length; i++) {
      this.fallenRecords[i].rig.body.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = false;
          obj.receiveShadow = enabled;
        }
      });
    }
  }

  public getFallenCount(color?: PieceColor): number {
    if (!color) return this.fallenRecords.length;
    let count = 0;
    for (let i = 0; i < this.fallenRecords.length; i++) {
      if (this.fallenRecords[i].color === color) count++;
    }
    return count;
  }

  public getStainCount(): number {
    return this.stains.length;
  }

  /**
   * Spawns a persistent ground blood stain on the battlefield.
   * Never fades automatically during the match; naturally supports overlapping layers.
   */
  public addGroundStain(params: {
    moveIndex: number;
    x: number;
    z: number;
    scale?: number;
    elongation?: number;
    rotY?: number;
    variant?: 0 | 1 | 2 | 3;
    colorHex?: number;
  }): void {
    const variant =
      params.variant ??
      ((Math.floor(Math.random() * STAIN_VARIANT_COUNT) % STAIN_VARIANT_COUNT) as 0 | 1 | 2 | 3);

    // Respect per-variant GPU buffer capacity cleanly
    if (this.stainCounters[variant] >= MAX_STAINS_PER_VARIANT) {
      // Fallback to another variant slot if one variant buffer is full
      let alt: (0 | 1 | 2 | 3) | null = null;
      for (let v = 0 as 0 | 1 | 2 | 3; v < STAIN_VARIANT_COUNT; v = (v + 1) as 0 | 1 | 2 | 3) {
        if (this.stainCounters[v] < MAX_STAINS_PER_VARIANT) {
          alt = v;
          break;
        }
      }
      if (alt === null) return;
      return this.addGroundStain({ ...params, variant: alt });
    }

    const ground = clampStainToSolidGround(params.x, params.z);
    const orderIndex = this.stainOrderSeq++;
    // Tiny monotonic vertical micro-step eliminates z-fighting across overlapping stains
    const y = ground.y + 0.0055 + (orderIndex % 48) * 0.00012;
    const baseScale = params.scale ?? 0.44 + Math.random() * 0.24;
    const elong = params.elongation ?? 1.0 + Math.random() * 0.35;
    const rotY = params.rotY ?? Math.random() * Math.PI * 2;
    const colorHex =
      params.colorHex ??
      STAIN_COLOR_PALETTE[Math.floor(Math.random() * STAIN_COLOR_PALETTE.length)];

    const rec: PersistentStainRecord = {
      moveIndex: params.moveIndex,
      variant,
      x: ground.x,
      y,
      z: ground.z,
      scaleX: baseScale * elong,
      scaleZ: baseScale,
      rotY,
      colorHex,
      orderIndex,
    };
    this.stains.push(rec);
    this.appendStainToInstancedMesh(rec);
  }

  /**
   * Creates a realistic multi-stain ground splatter cluster in the combat impact direction.
   */
  public addImpactStainCluster(params: {
    moveIndex: number;
    x: number;
    z: number;
    dirX: number;
    dirZ: number;
    intensity?: number;
  }) {
    const intensity = params.intensity ?? 1.0;
    const dirAngle = Math.atan2(params.dirX, params.dirZ);

    // Primary impact pool under the strike point
    this.addGroundStain({
      moveIndex: params.moveIndex,
      x: params.x + (Math.random() - 0.5) * 0.1,
      z: params.z + (Math.random() - 0.5) * 0.1,
      scale: (0.48 + Math.random() * 0.2) * Math.max(0.75, intensity),
      elongation: 1.08 + Math.random() * 0.22,
      rotY: dirAngle + (Math.random() - 0.5) * 0.5,
      variant: Math.random() < 0.5 ? 0 : 3,
    });

    // Forward directional slash/spray splatters
    const subCount = intensity >= 0.9 ? 2 : 1;
    for (let i = 0; i < subCount; i++) {
      const dist = 0.22 + Math.random() * 0.34;
      const spread = (Math.random() - 0.5) * 0.72;
      const sx = params.x + Math.sin(dirAngle + spread) * dist;
      const sz = params.z + Math.cos(dirAngle + spread) * dist;
      this.addGroundStain({
        moveIndex: params.moveIndex,
        x: sx,
        z: sz,
        scale: (0.28 + Math.random() * 0.18) * Math.max(0.75, intensity),
        elongation: 1.25 + Math.random() * 0.45,
        rotY: dirAngle + spread,
        variant: i % 2 === 0 ? 1 : 2,
      });
    }
  }

  private appendStainToInstancedMesh(rec: PersistentStainRecord) {
    const v = rec.variant;
    const idx = this.stainCounters[v];
    if (idx >= MAX_STAINS_PER_VARIANT) return;

    const inst = this.stainInsts[v];
    _stainDummy.position.set(rec.x, rec.y, rec.z);
    _stainDummy.rotation.set(-Math.PI / 2, 0, rec.rotY);
    _stainDummy.scale.set(rec.scaleX, rec.scaleZ, 1);
    _stainDummy.updateMatrix();
    inst.setMatrixAt(idx, _stainDummy.matrix);

    _stainColor.setHex(rec.colorHex);
    inst.setColorAt(idx, _stainColor);

    this.stainCounters[v] = idx + 1;
    inst.count = this.stainCounters[v];
    inst.visible = true;
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  }

  private rebuildAllStainInstances() {
    this.stainCounters.fill(0);
    for (let v = 0; v < STAIN_VARIANT_COUNT; v++) {
      this.stainInsts[v].count = 0;
      this.stainInsts[v].visible = false;
    }
    for (let i = 0; i < this.stains.length; i++) {
      this.appendStainToInstancedMesh(this.stains[i]);
    }
  }

  /**
   * Adds a fallen captured piece body to its team's dedicated Graveyard Area.
   * Preserves original Kingdom, armor, colors, weapons, and piece identity.
   */
  public addFallenPiece(params: {
    moveIndex: number;
    color: PieceColor;
    type: PieceType;
    characterSet: CharacterSetId;
  }): FallenPieceRecord {
    const slotIndex = this.getFallenCount(params.color);
    const totalForSide = slotIndex + 1;

    // Seed deterministic visual pose variance
    const seedVal = ((params.moveIndex * 2654435761) >>> 0) % 1000;
    const poseVariant = (slotIndex + (seedVal % 4)) % 4;
    const jitter = (seedVal % 100) / 100;

    const rig = createCharacterPiece(
      params.type,
      params.color,
      this.charGeos,
      this.materials,
      jitter * Math.PI * 2,
      params.characterSet
    );

    rig.body.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        // Prostrate graveyard bodies sit outside the board shadow frustum and use contactShadow
        obj.castShadow = false;
        obj.receiveShadow = this.shadowsEnabled;
      }
    });

    this.group.add(rig.root);

    const record: FallenPieceRecord = {
      moveIndex: params.moveIndex,
      color: params.color,
      type: params.type,
      characterSet: params.characterSet,
      poseVariant,
      jitter,
      slotIndex,
      rig,
    };
    this.fallenRecords.push(record);

    // Only earlier slots shift when transitioning past 16 pieces (3-column crowded layout)
    const slot = computeGraveyardSlotTransform(params.color, slotIndex, totalForSide, jitter);
    if (totalForSide > 16) {
      this.layoutSideGraveyard(params.color);
    } else {
      poseFallenRig(rig, poseVariant, jitter, slot);
    }

    // Subtle persistent crimson pool beneath the fallen corpse on the graveyard terrace
    this.addGroundStain({
      moveIndex: params.moveIndex,
      x: slot.x + (jitter - 0.5) * 0.12,
      z: slot.z + (jitter - 0.5) * 0.12,
      scale: 0.54 + jitter * 0.16,
      elongation: 1.32,
      rotY: slot.yaw,
      variant: 3,
      colorHex: 0x450509,
    });

    return record;
  }

  private layoutSideGraveyard(color: PieceColor) {
    const total = this.getFallenCount(color);
    let slotIdx = 0;
    for (let i = 0; i < this.fallenRecords.length; i++) {
      const rec = this.fallenRecords[i];
      if (rec.color !== color) continue;
      rec.slotIndex = slotIdx;
      const slot = computeGraveyardSlotTransform(color, slotIdx, total, rec.jitter);
      poseFallenRig(rec.rig, rec.poseVariant, rec.jitter, slot);
      slotIdx++;
    }
  }

  private disposeRecordRig(rec: FallenPieceRecord) {
    this.group.remove(rec.rig.root);
    for (let i = 0; i < rec.rig.disposableGeos.length; i++) {
      rec.rig.disposableGeos[i].dispose();
    }
    rec.rig.disposableGeos.length = 0;
    rec.rig.root.clear();
  }

  /**
   * Rebuilds existing fallen corpses when the player switches Kingdoms mid-match,
   * disposing every old Kingdom geometry so zero stale meshes remain.
   */
  public rebuildForCharacterSet(nextSet: CharacterSetId) {
    if (this.fallenRecords.length === 0) return;

    const snapshots = this.fallenRecords.map((rec) => ({
      moveIndex: rec.moveIndex,
      color: rec.color,
      type: rec.type,
      poseVariant: rec.poseVariant,
      jitter: rec.jitter,
      slotIndex: rec.slotIndex,
    }));

    for (let i = 0; i < this.fallenRecords.length; i++) {
      this.disposeRecordRig(this.fallenRecords[i]);
    }
    this.fallenRecords.length = 0;

    for (let i = 0; i < snapshots.length; i++) {
      const snap = snapshots[i];
      const rig = createCharacterPiece(
        snap.type,
        snap.color,
        this.charGeos,
        this.materials,
        snap.jitter * Math.PI * 2,
        nextSet
      );
      rig.body.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = false;
          obj.receiveShadow = this.shadowsEnabled;
        }
      });
      this.group.add(rig.root);
      this.fallenRecords.push({
        moveIndex: snap.moveIndex,
        color: snap.color,
        type: snap.type,
        characterSet: nextSet,
        poseVariant: snap.poseVariant,
        jitter: snap.jitter,
        slotIndex: snap.slotIndex,
        rig,
      });
    }

    this.layoutSideGraveyard('w');
    this.layoutSideGraveyard('b');
  }

  /**
   * Rolls back fallen bodies & ground blood stains belonging to undone moves (> maxMoveIndex).
   */
  public rollbackToMove(maxMoveIndex: number) {
    let corpsesChanged = false;
    for (let i = this.fallenRecords.length - 1; i >= 0; i--) {
      if (this.fallenRecords[i].moveIndex > maxMoveIndex) {
        this.disposeRecordRig(this.fallenRecords[i]);
        this.fallenRecords.splice(i, 1);
        corpsesChanged = true;
      }
    }
    if (corpsesChanged) {
      this.layoutSideGraveyard('w');
      this.layoutSideGraveyard('b');
    }

    let stainsChanged = false;
    for (let i = this.stains.length - 1; i >= 0; i--) {
      if (this.stains[i].moveIndex > maxMoveIndex) {
        this.stains.splice(i, 1);
        stainsChanged = true;
      }
    }
    if (stainsChanged) {
      this.rebuildAllStainInstances();
    }
  }

  /**
   * Clears all fallen corpses and all persistent ground blood stains for a fresh match.
   */
  public clear() {
    for (let i = 0; i < this.fallenRecords.length; i++) {
      this.disposeRecordRig(this.fallenRecords[i]);
    }
    this.fallenRecords.length = 0;

    this.stains.length = 0;
    this.stainOrderSeq = 0;
    this.stainCounters.fill(0);
    for (let v = 0; v < this.stainInsts.length; v++) {
      this.stainInsts[v].count = 0;
      this.stainInsts[v].visible = false;
    }
  }

  public dispose() {
    this.clear();
    for (let v = 0; v < this.stainInsts.length; v++) {
      this.group.remove(this.stainInsts[v]);
    }
    for (let v = 0; v < this.stainGeos.length; v++) {
      this.stainGeos[v].dispose();
    }
    for (let v = 0; v < this.stainMats.length; v++) {
      this.stainMats[v].dispose();
    }
    this.stainInsts.length = 0;
    this.stainGeos.length = 0;
    this.stainMats.length = 0;
    this.atlasTex.dispose();
  }
}
