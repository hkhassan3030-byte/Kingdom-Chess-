import * as THREE from 'three';
import { getCharacterAudioProfile, type CombatAction } from '../audio/combatAudioProfiles';
import { CHARACTER_SETS } from './characterSets';
import type { CharacterRig } from './createCharacterPieces';
import type {
  CharacterSetId,
  MoveAnimationPayload,
  PieceColor,
  PieceType,
} from '../types/chess';

export interface CombatSoundEvent {
  characterSet: CharacterSetId;
  characterClass: PieceType;
  action: CombatAction;
  defenderClass?: PieceType;
}

export type CombatSoundCue = CombatSoundEvent;

const _soundEvent: CombatSoundEvent = {
  characterSet: 'human',
  characterClass: 'p',
  action: 'swing',
  defenderClass: 'p',
};

function emitSound(
  ctx: CombatDuelContext,
  playSound: (event: CombatSoundEvent) => void,
  action: CombatAction,
  characterClass: PieceType = ctx.payload.piece
) {
  _soundEvent.characterSet = ctx.characterSet ?? ctx.attacker.characterSet ?? 'human';
  _soundEvent.characterClass = characterClass;
  _soundEvent.action = action;
  _soundEvent.defenderClass = ctx.defenderClass ?? ctx.payload.captured;
  playSound(_soundEvent);
}

const _tmpA = new THREE.Vector3();
const _tmpB = new THREE.Vector3();
const _tmpC = new THREE.Vector3();
const _tmpD = new THREE.Vector3();

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function seg(p: number, start: number, end: number): number {
  return clamp01((p - start) / (end - start));
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

const TAU = Math.PI * 2;

export function shortestAngleLerp(current: number, target: number, t: number): number {
  const diff = (((target - current + Math.PI) % TAU) + TAU) % TAU - Math.PI;
  return current + diff * t;
}

export function getCombatDuration(
  type: PieceType,
  characterSet: CharacterSetId = 'human'
): number {
  const speedScale =
    characterSet === 'titan' || characterSet === 'shadow'
      ? 0.88
      : characterSet === 'celestial'
      ? 0.94
      : 1.0;
  let base = 1.85;
  switch (type) {
    case 'k':
      base = 1.95;
      break;
    case 'q':
      base = 1.85;
      break;
    case 'r':
      base = 2.0;
      break;
    case 'b':
      base = 1.9;
      break;
    case 'n':
      base = characterSet === 'titan' ? 1.75 : 2.05;
      break;
    case 'p':
      base = 1.65;
      break;
  }
  return base * speedScale;
}

interface PooledTrail {
  active: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  maxAge: number;
}

interface PooledSpark {
  active: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
}

interface PooledShockwave {
  active: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  maxAge: number;
  maxScale: number;
}

interface PooledFlash {
  active: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  maxAge: number;
  maxScale: number;
}

interface PooledProjectile {
  active: boolean;
  group: THREE.Group;
  coreMat: THREE.MeshBasicMaterial;
  ringMat: THREE.MeshBasicMaterial;
  start: THREE.Vector3;
  end: THREE.Vector3;
  age: number;
  duration: number;
}

interface PooledDust {
  active: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
}

interface PooledBloodDrop {
  active: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  landed: boolean;
}

interface PooledBloodDecal {
  active: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  maxAge: number;
  targetScale: number;
}

function createBloodDecalTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    const cx = size * 0.5;
    const cy = size * 0.5;
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26);
    grad.addColorStop(0, 'rgba(84, 7, 11, 0.92)');
    grad.addColorStop(0.45, 'rgba(105, 10, 16, 0.72)');
    grad.addColorStop(0.8, 'rgba(72, 6, 10, 0.25)');
    grad.addColorStop(1, 'rgba(50, 4, 6, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fill();

    // Subtle organic irregular droplets around the main stain
    const lobes: Array<[number, number, number]> = [
      [cx - 10, cy - 8, 7.5],
      [cx + 11, cy - 5, 6.2],
      [cx + 7, cy + 10, 7.8],
      [cx - 9, cy + 9, 5.8],
      [cx + 16, cy + 2, 3.6],
      [cx - 15, cy - 2, 3.4],
    ];
    for (let i = 0; i < lobes.length; i++) {
      const [lx, ly, lr] = lobes[i];
      const lg = ctx.createRadialGradient(lx, ly, 0.5, lx, ly, lr);
      lg.addColorStop(0, 'rgba(92, 8, 13, 0.78)');
      lg.addColorStop(1, 'rgba(65, 5, 8, 0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(lx, ly, lr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Zero-GC Pre-Allocated Combat Effects Pool for smooth 60 FPS mobile combat.
 */
export class CombatEffectsManager {
  private group: THREE.Group;
  private trailGeo: THREE.RingGeometry;
  private sparkGeo: THREE.OctahedronGeometry;
  private shockGeo: THREE.RingGeometry;
  private flashGeo: THREE.SphereGeometry;
  private orbGeo: THREE.SphereGeometry;
  private auraGeo: THREE.TorusGeometry;
  private dustGeo: THREE.DodecahedronGeometry;
  private bloodDropGeo: THREE.SphereGeometry;
  private bloodDecalGeo: THREE.PlaneGeometry;
  private bloodDecalTex: THREE.CanvasTexture;

  private trails: PooledTrail[] = [];
  private sparks: PooledSpark[] = [];
  private shockwaves: PooledShockwave[] = [];
  private flashes: PooledFlash[] = [];
  private projectiles: PooledProjectile[] = [];
  private dust: PooledDust[] = [];
  private bloodDrops: PooledBloodDrop[] = [];
  private bloodDecals: PooledBloodDecal[] = [];

  constructor(parent: THREE.Group) {
    this.group = parent;
    this.trailGeo = new THREE.RingGeometry(0.42, 0.62, 16, 1, -Math.PI * 0.42, Math.PI * 0.84);
    this.sparkGeo = new THREE.OctahedronGeometry(0.036, 0);
    this.shockGeo = new THREE.RingGeometry(0.14, 0.28, 20);
    this.flashGeo = new THREE.SphereGeometry(0.24, 10, 8);
    this.orbGeo = new THREE.SphereGeometry(0.1, 10, 8);
    this.auraGeo = new THREE.TorusGeometry(0.16, 0.02, 6, 14);
    this.dustGeo = new THREE.DodecahedronGeometry(0.11, 0);
    this.bloodDropGeo = new THREE.SphereGeometry(0.02, 6, 5);
    this.bloodDecalGeo = new THREE.PlaneGeometry(0.5, 0.5);
    this.bloodDecalTex = createBloodDecalTexture();

    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x93c5fd,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(this.trailGeo, mat);
      mesh.visible = false;
      mesh.rotation.order = 'YXZ';
      this.group.add(mesh);
      this.trails.push({ active: false, mesh, mat, age: 0, maxAge: 0.24 });
    }

    for (let i = 0; i < 28; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfde68a,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.sparks.push({
        active: false,
        mesh,
        mat,
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 0.3,
      });
    }

    for (let i = 0; i < 5; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(this.shockGeo, mat);
      mesh.visible = false;
      mesh.rotation.x = -Math.PI / 2;
      this.group.add(mesh);
      this.shockwaves.push({ active: false, mesh, mat, age: 0, maxAge: 0.34, maxScale: 3.0 });
    }

    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(this.flashGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.flashes.push({ active: false, mesh, mat, age: 0, maxAge: 0.16, maxScale: 1.8 });
    }

    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x9aa6b8,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.dustGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.dust.push({
        active: false,
        mesh,
        mat,
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 0.45,
      });
    }

    for (let i = 0; i < 3; i++) {
      const group = new THREE.Group();
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x93c5fd,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      group.add(new THREE.Mesh(this.orbGeo, coreMat));
      group.add(new THREE.Mesh(this.auraGeo, ringMat));
      group.visible = false;
      this.group.add(group);
      this.projectiles.push({
        active: false,
        group,
        coreMat,
        ringMat,
        start: new THREE.Vector3(),
        end: new THREE.Vector3(),
        age: 0,
        duration: 0.22,
      });
    }

    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x52080d,
        transparent: true,
        opacity: 0.86,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.bloodDropGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.bloodDrops.push({
        active: false,
        mesh,
        mat,
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 0.72,
        landed: false,
      });
    }

    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: this.bloodDecalTex,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const mesh = new THREE.Mesh(this.bloodDecalGeo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.renderOrder = 1;
      mesh.visible = false;
      this.group.add(mesh);
      this.bloodDecals.push({
        active: false,
        mesh,
        mat,
        age: 0,
        maxAge: 1.4,
        targetScale: 1.0,
      });
    }
  }

  public clearActive() {
    for (const t of this.trails) {
      t.active = false;
      t.mesh.visible = false;
    }
    for (const s of this.sparks) {
      s.active = false;
      s.mesh.visible = false;
    }
    for (const sw of this.shockwaves) {
      sw.active = false;
      sw.mesh.visible = false;
    }
    for (const f of this.flashes) {
      f.active = false;
      f.mesh.visible = false;
    }
    for (const d of this.dust) {
      d.active = false;
      d.mesh.visible = false;
    }
    for (const p of this.projectiles) {
      p.active = false;
      p.group.visible = false;
    }
    for (const bd of this.bloodDrops) {
      bd.active = false;
      bd.mesh.visible = false;
    }
    for (const bc of this.bloodDecals) {
      bc.active = false;
      bc.mesh.visible = false;
    }
  }

  public spawnSwingTrail(
    origin: THREE.Vector3,
    facingY: number,
    color: PieceColor,
    options: {
      tiltX?: number;
      tiltZ?: number;
      scale?: number;
      fullSpin?: boolean;
      height?: number;
      colorHex?: number;
    } = {}
  ) {
    let slot = this.trails[0];
    for (let i = 0; i < this.trails.length; i++) {
      if (!this.trails[i].active) {
        slot = this.trails[i];
        break;
      }
    }
    slot.active = true;
    slot.age = 0;
    slot.maxAge = options.fullSpin ? 0.28 : 0.2;
    slot.mat.color.setHex(options.colorHex ?? (color === 'w' ? 0x93c5fd : 0xfb7185));
    slot.mat.opacity = 0.78;
    slot.mesh.position.set(origin.x, options.height ?? 0.92, origin.z);
    slot.mesh.rotation.y = facingY;
    slot.mesh.rotation.x = Math.PI / 2 + (options.tiltX ?? 0);
    slot.mesh.rotation.z = options.tiltZ ?? 0;
    slot.mesh.scale.setScalar(options.scale ?? 1.0);
    slot.mesh.visible = true;
  }

  public spawnSparks(pos: THREE.Vector3, colorHex: number, count = 10) {
    let spawned = 0;
    for (let i = 0; i < this.sparks.length && spawned < count; i++) {
      const slot = this.sparks[i];
      if (slot.active) continue;
      slot.active = true;
      slot.age = 0;
      slot.maxAge = 0.24 + Math.random() * 0.14;
      slot.mat.color.setHex(colorHex);
      slot.mat.opacity = 0.95;
      slot.mesh.position.copy(pos);
      slot.mesh.scale.setScalar(1);
      const speed = 1.6 + Math.random() * 2.3;
      const angle = Math.random() * Math.PI * 2;
      slot.vel.set(Math.cos(angle) * speed, 0.9 + Math.random() * 2.0, Math.sin(angle) * speed);
      slot.mesh.visible = true;
      spawned++;
    }
  }

  public spawnImpactFlash(pos: THREE.Vector3, colorHex = 0xfff3c4, maxScale = 1.75) {
    let slot = this.flashes[0];
    for (let i = 0; i < this.flashes.length; i++) {
      if (!this.flashes[i].active) {
        slot = this.flashes[i];
        break;
      }
    }
    slot.active = true;
    slot.age = 0;
    slot.maxAge = 0.16;
    slot.maxScale = maxScale;
    slot.mat.color.setHex(colorHex);
    slot.mat.opacity = 0.88;
    slot.mesh.position.copy(pos);
    slot.mesh.scale.setScalar(0.5);
    slot.mesh.visible = true;
  }

  public spawnShockwave(pos: THREE.Vector3, colorHex: number, maxScale = 3.0, height = 0.12) {
    let slot = this.shockwaves[0];
    for (let i = 0; i < this.shockwaves.length; i++) {
      if (!this.shockwaves[i].active) {
        slot = this.shockwaves[i];
        break;
      }
    }
    slot.active = true;
    slot.age = 0;
    slot.maxAge = 0.32;
    slot.maxScale = maxScale;
    slot.mat.color.setHex(colorHex);
    slot.mat.opacity = 0.85;
    slot.mesh.position.set(pos.x, height, pos.z);
    slot.mesh.scale.set(1, 1, 1);
    slot.mesh.visible = true;
  }

  public spawnDust(pos: THREE.Vector3, count = 5) {
    let spawned = 0;
    for (let i = 0; i < this.dust.length && spawned < count; i++) {
      const slot = this.dust[i];
      if (slot.active) continue;
      slot.active = true;
      slot.age = 0;
      slot.maxAge = 0.4 + Math.random() * 0.16;
      slot.mat.opacity = 0.4;
      const ang = Math.random() * Math.PI * 2;
      slot.mesh.position.set(pos.x + Math.cos(ang) * 0.14, 0.08, pos.z + Math.sin(ang) * 0.14);
      slot.mesh.scale.setScalar(0.85);
      const speed = 0.7 + Math.random() * 1.05;
      slot.vel.set(Math.cos(ang) * speed, 0.35 + Math.random() * 0.5, Math.sin(ang) * speed);
      slot.mesh.visible = true;
      spawned++;
    }
  }

  public spawnMagicProjectile(
    start: THREE.Vector3,
    end: THREE.Vector3,
    color: PieceColor,
    duration = 0.2,
    coreColorHex?: number,
    ringColorHex?: number
  ) {
    let slot = this.projectiles[0];
    for (let i = 0; i < this.projectiles.length; i++) {
      if (!this.projectiles[i].active) {
        slot = this.projectiles[i];
        break;
      }
    }
    slot.active = true;
    slot.age = 0;
    slot.duration = duration;
    slot.start.copy(start);
    slot.end.copy(end);
    slot.coreMat.color.setHex(coreColorHex ?? (color === 'w' ? 0x93c5fd : 0xf43f5e));
    slot.ringMat.color.setHex(ringColorHex ?? (color === 'w' ? 0xe0f2fe : 0xfda4af));
    slot.group.position.copy(start);
    slot.group.rotation.set(0, 0, 0);
    slot.group.visible = true;
  }

  /**
   * Subtle, grounded pooled blood splash & short-lived board stain on lethal defeat.
   * Stays anchored on the board surface (y=0.008-0.012) with zero floating gore.
   */
  public spawnBloodSplash(pos: THREE.Vector3, count = 7) {
    let spawned = 0;
    for (let i = 0; i < this.bloodDrops.length && spawned < count; i++) {
      const slot = this.bloodDrops[i];
      if (slot.active) continue;
      slot.active = true;
      slot.age = 0;
      slot.landed = false;
      slot.maxAge = 0.62 + Math.random() * 0.2;
      slot.mat.opacity = 0.84;
      const ang = Math.random() * Math.PI * 2;
      const startH = 0.1 + Math.random() * 0.2;
      slot.mesh.position.set(
        pos.x + Math.cos(ang) * 0.05,
        startH,
        pos.z + Math.sin(ang) * 0.05
      );
      slot.mesh.scale.setScalar(0.7 + Math.random() * 0.4);
      const speed = 0.55 + Math.random() * 1.05;
      slot.vel.set(Math.cos(ang) * speed, 0.35 + Math.random() * 0.72, Math.sin(ang) * speed);
      slot.mesh.visible = true;
      spawned++;
    }

    let decalSlot = this.bloodDecals[0];
    for (let i = 0; i < this.bloodDecals.length; i++) {
      if (!this.bloodDecals[i].active) {
        decalSlot = this.bloodDecals[i];
        break;
      }
    }
    decalSlot.active = true;
    decalSlot.age = 0;
    decalSlot.maxAge = 1.4;
    decalSlot.targetScale = 0.88 + Math.random() * 0.22;
    decalSlot.mat.opacity = 0.72;
    decalSlot.mesh.position.set(pos.x, 0.008, pos.z);
    decalSlot.mesh.rotation.z = Math.random() * Math.PI * 2;
    decalSlot.mesh.scale.setScalar(0.32);
    decalSlot.mesh.visible = true;
  }

  public update(dt: number) {
    for (let i = 0; i < this.trails.length; i++) {
      const t = this.trails[i];
      if (!t.active) continue;
      t.age += dt;
      const p = t.age / t.maxAge;
      if (p >= 1) {
        t.active = false;
        t.mesh.visible = false;
      } else {
        t.mesh.rotation.z += dt * 8.5;
        t.mat.opacity = (1 - p) * 0.76;
      }
    }

    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i];
      if (!s.active) continue;
      s.age += dt;
      const p = s.age / s.maxAge;
      if (p >= 1) {
        s.active = false;
        s.mesh.visible = false;
      } else {
        s.vel.y -= 6.8 * dt;
        s.mesh.position.addScaledVector(s.vel, dt);
        s.mesh.scale.setScalar(1 - p);
        s.mat.opacity = 1 - p;
      }
    }

    for (let i = 0; i < this.flashes.length; i++) {
      const f = this.flashes[i];
      if (!f.active) continue;
      f.age += dt;
      const p = f.age / f.maxAge;
      if (p >= 1) {
        f.active = false;
        f.mesh.visible = false;
      } else {
        const sc = 0.5 + easeOutCubic(p) * f.maxScale;
        f.mesh.scale.setScalar(sc);
        f.mat.opacity = (1 - p) * 0.85;
      }
    }

    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      if (!sw.active) continue;
      sw.age += dt;
      const p = sw.age / sw.maxAge;
      if (p >= 1) {
        sw.active = false;
        sw.mesh.visible = false;
      } else {
        const s = 1 + easeOutCubic(p) * sw.maxScale;
        sw.mesh.scale.set(s, s, 1);
        sw.mat.opacity = (1 - p) * 0.85;
      }
    }

    for (let i = 0; i < this.projectiles.length; i++) {
      const pr = this.projectiles[i];
      if (!pr.active) continue;
      pr.age += dt;
      const p = pr.age / pr.duration;
      if (p >= 1) {
        pr.active = false;
        pr.group.visible = false;
      } else {
        pr.group.position.lerpVectors(pr.start, pr.end, p);
        pr.group.rotation.y += dt * 15;
        pr.group.rotation.x += dt * 10;
      }
    }

    for (let i = 0; i < this.dust.length; i++) {
      const d = this.dust[i];
      if (!d.active) continue;
      d.age += dt;
      const p = d.age / d.maxAge;
      if (p >= 1) {
        d.active = false;
        d.mesh.visible = false;
      } else {
        d.mesh.position.addScaledVector(d.vel, dt);
        d.vel.multiplyScalar(Math.exp(-3.5 * dt));
        const sc = 0.85 + p * 1.65;
        d.mesh.scale.setScalar(sc);
        d.mat.opacity = (1 - p) * 0.4;
      }
    }

    for (let i = 0; i < this.bloodDrops.length; i++) {
      const b = this.bloodDrops[i];
      if (!b.active) continue;
      b.age += dt;
      const p = b.age / b.maxAge;
      if (p >= 1) {
        b.active = false;
        b.mesh.visible = false;
      } else {
        if (!b.landed) {
          b.vel.y -= 9.5 * dt;
          b.mesh.position.addScaledVector(b.vel, dt);
          if (b.mesh.position.y <= 0.012) {
            b.mesh.position.y = 0.012;
            b.landed = true;
            b.vel.set(0, 0, 0);
            b.mesh.scale.set(1.3, 0.24, 1.3);
          }
        }
        b.mat.opacity = p < 0.45 ? 0.88 : (1 - (p - 0.45) / 0.55) * 0.88;
      }
    }

    for (let i = 0; i < this.bloodDecals.length; i++) {
      const dc = this.bloodDecals[i];
      if (!dc.active) continue;
      dc.age += dt;
      const p = dc.age / dc.maxAge;
      if (p >= 1) {
        dc.active = false;
        dc.mesh.visible = false;
      } else {
        const grow = clamp01(dc.age / 0.22);
        const s = THREE.MathUtils.lerp(0.32, dc.targetScale, easeOutCubic(grow));
        dc.mesh.scale.setScalar(s);
        dc.mat.opacity = p < 0.5 ? 0.72 : (1 - (p - 0.5) / 0.5) * 0.72;
      }
    }
  }

  public dispose() {
    this.trails.forEach((t) => {
      this.group.remove(t.mesh);
      t.mat.dispose();
    });
    this.sparks.forEach((s) => {
      this.group.remove(s.mesh);
      s.mat.dispose();
    });
    this.shockwaves.forEach((sw) => {
      this.group.remove(sw.mesh);
      sw.mat.dispose();
    });
    this.flashes.forEach((f) => {
      this.group.remove(f.mesh);
      f.mat.dispose();
    });
    this.projectiles.forEach((pr) => {
      this.group.remove(pr.group);
      pr.coreMat.dispose();
      pr.ringMat.dispose();
    });
    this.dust.forEach((d) => {
      this.group.remove(d.mesh);
      d.mat.dispose();
    });
    this.bloodDrops.forEach((b) => {
      this.group.remove(b.mesh);
      b.mat.dispose();
    });
    this.bloodDecals.forEach((dc) => {
      this.group.remove(dc.mesh);
      dc.mat.dispose();
    });
    this.trails = [];
    this.sparks = [];
    this.shockwaves = [];
    this.flashes = [];
    this.projectiles = [];
    this.dust = [];
    this.bloodDrops = [];
    this.bloodDecals = [];
    this.trailGeo.dispose();
    this.sparkGeo.dispose();
    this.shockGeo.dispose();
    this.flashGeo.dispose();
    this.orbGeo.dispose();
    this.auraGeo.dispose();
    this.dustGeo.dispose();
    this.bloodDropGeo.dispose();
    this.bloodDecalGeo.dispose();
    this.bloodDecalTex.dispose();
  }
}

export interface CombatDuelContext {
  payload: MoveAnimationPayload;
  attacker: CharacterRig;
  defender: CharacterRig;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  capturedPos: THREE.Vector3;
  duelSpot: THREE.Vector3;
  normDir: THREE.Vector3;
  sidePerp: THREE.Vector3;
  travelAngle: number;
  homeAngle: number;
  firedCues: Set<string>;
  shakeIntensity: number;
  savedCamPos: THREE.Vector3;
  savedTarget: THREE.Vector3;
  claimStartPos: THREE.Vector3;
  hasClaimStart: boolean;
  characterSet?: CharacterSetId;
  defenderClass?: PieceType;
}

function shouldFire(ctx: CombatDuelContext, id: string): boolean {
  if (ctx.firedCues.has(id)) return false;
  ctx.firedCues.add(id);
  return true;
}

function applyDefenderFall(
  defender: CharacterRig,
  pFall: number,
  pFade: number,
  ctx: CombatDuelContext,
  effects: CombatEffectsManager,
  playSound: (event: CombatSoundEvent) => void
) {
  defender.body.rotation.order = 'YXZ';
  const fallEase = easeInOutQuad(pFall);
  defender.body.rotation.x = -fallEase * Math.PI * 0.48;
  defender.body.position.y = THREE.MathUtils.lerp(defender.baseY, 0.13, fallEase);
  defender.torso.rotation.x = -fallEase * 0.22;
  defender.rightArm.rotation.z = -fallEase * 0.72;
  defender.leftArm.rotation.z = fallEase * 0.72;

  if (pFall > 0.04 && shouldFire(ctx, 'death_vocal')) {
    emitSound(ctx, playSound, 'deathVocal', ctx.defenderClass ?? ctx.payload.captured ?? 'p');
  }
  if (pFall > 0.08 && shouldFire(ctx, 'death_blood')) {
    _tmpD.set(defender.root.position.x, 0, defender.root.position.z);
    effects.spawnBloodSplash(_tmpD);
  }
  if (pFall > 0.42 && shouldFire(ctx, 'defeat_sound')) {
    emitSound(ctx, playSound, 'defenderReaction', ctx.defenderClass ?? ctx.payload.captured ?? 'p');
  }

  if (pFade > 0) {
    const scaleFade = THREE.MathUtils.lerp(1, 0.02, Math.pow(pFade, 1.35));
    defender.root.scale.setScalar(scaleFade);
    defender.root.position.y = 0;
  }
  defender.contactShadow.position.y = -defender.root.position.y + 0.004;
}

function animateWalkStride(rig: CharacterRig, phase: number, amp = 0.45) {
  for (let idx = 0; idx < rig.legs.length; idx++) {
    rig.legs[idx].rotation.x = Math.sin(phase + idx * Math.PI) * amp;
  }
  if (rig.horse) {
    const legs = rig.horse.legs;
    for (let idx = 0; idx < legs.length; idx++) {
      const offset = idx === 0 || idx === 3 ? 0 : Math.PI;
      legs[idx].rotation.x = Math.sin(phase + offset) * (amp * 1.15);
    }
    rig.horse.neck.rotation.x = Math.sin(phase) * 0.12;
  }
}

function resetLimbsNeutral(rig: CharacterRig) {
  for (let i = 0; i < rig.legs.length; i++) {
    rig.legs[i].rotation.x = 0;
  }
  if (rig.horse) {
    const legs = rig.horse.legs;
    for (let i = 0; i < legs.length; i++) {
      legs[i].rotation.x = 0;
    }
    rig.horse.neck.rotation.x = 0;
  }
}

export function updateCombatDuel(
  ctx: CombatDuelContext,
  p: number,
  dt: number,
  effects: CombatEffectsManager,
  camera: THREE.PerspectiveCamera,
  targetOut: THREE.Vector3,
  playSound: (event: CombatSoundEvent) => void
) {
  const { attacker, defender, fromPos, toPos, duelSpot, normDir, sidePerp, travelAngle, homeAngle } = ctx;
  const type = ctx.payload.piece;
  const setId: CharacterSetId = ctx.characterSet ?? attacker.characterSet ?? 'human';
  const audioProfile = getCharacterAudioProfile(setId, type);
  const combatTheme = CHARACTER_SETS[setId].combat;
  const isW = ctx.payload.color === 'w';
  const trailColor = isW ? combatTheme.wTrailHex : combatTheme.bTrailHex;
  const flashColor = isW ? combatTheme.wFlashHex : combatTheme.bFlashHex;
  const sparkColor = isW ? combatTheme.wSparkHex : combatTheme.bSparkHex;
  const magicColor = isW ? combatTheme.wMagicHex : combatTheme.bMagicHex;
  const shockColor = isW ? combatTheme.wShockHex : combatTheme.bShockHex;
  const isMountedKnight = type === 'n' && Boolean(CHARACTER_SETS[setId].pieces.n.mounted);
  const isDualWield = Boolean(CHARACTER_SETS[setId].pieces[type].dualWield);
  const defenderFaceAngle = travelAngle + Math.PI;
  const rotAlpha = 1 - Math.exp(-18 * dt);

  defender.body.rotation.order = 'YXZ';
  attacker.body.rotation.order = 'YXZ';

  // Common Approach (0.00 -> 0.18)
  if (p < 0.18) {
    const t = easeOutCubic(seg(p, 0, 0.18));
    attacker.root.position.lerpVectors(fromPos, duelSpot, t);
    attacker.body.rotation.y = shortestAngleLerp(attacker.body.rotation.y, travelAngle, rotAlpha);
    defender.body.rotation.y = shortestAngleLerp(defender.body.rotation.y, defenderFaceAngle, rotAlpha);

    if (type === 'n') {
      if (isMountedKnight) {
        if (p > 0.01 && shouldFire(ctx, 'horse_charge_start')) {
          emitSound(ctx, playSound, 'horseMove');
          effects.spawnDust(fromPos, 5);
        }
        if (p > 0.1 && shouldFire(ctx, 'horse_charge_step2')) {
          emitSound(ctx, playSound, 'horseMove');
        }
        animateWalkStride(attacker, t * Math.PI * 3.5, 0.54);
        attacker.root.position.y = Math.abs(Math.sin(t * Math.PI * 2)) * 0.14;
      } else {
        // Titan Vanguard aerial scout dash-leap
        if (p > 0.02 && shouldFire(ctx, 'aerial_dash_start')) {
          emitSound(ctx, playSound, 'movement');
          effects.spawnDust(fromPos, 4);
        }
        animateWalkStride(attacker, t * Math.PI * 4.2, 0.45);
        attacker.root.position.y = Math.sin(t * Math.PI) * 0.32;
      }
    } else {
      if (type === 'r' && p > 0.03 && shouldFire(ctx, 'rook_approach')) {
        emitSound(ctx, playSound, 'movement');
      }
      animateWalkStride(attacker, t * Math.PI * 3, 0.42);
      attacker.root.position.y = Math.abs(Math.sin(t * Math.PI * 3)) * 0.05;
    }

    const windup = seg(p, 0.12, 0.18);
    attacker.torso.rotation.x = windup * 0.12;
    attacker.rightArm.rotation.x = THREE.MathUtils.lerp(-0.28, -0.78, t);
    attacker.leftArm.rotation.x = THREE.MathUtils.lerp(-0.25, isDualWield ? -0.82 : -0.58, t);
    defender.leftArm.rotation.x = THREE.MathUtils.lerp(-0.25, -0.85, t);
    defender.rightArm.rotation.x = THREE.MathUtils.lerp(-0.28, -0.65, t);
    defender.torso.rotation.x = THREE.MathUtils.lerp(0, 0.08, t);
  } else if (p < 0.88) {
    // Character-specific combat combos (0.18 -> 0.88)
    resetLimbsNeutral(attacker);
    attacker.root.position.y = 0;

    if (type === 'k') {
      // KING: Heavy royal sword attack — step forward -> raise sword -> horizontal cleave -> heavy overhead strike
      if (p < 0.42) {
        const b = seg(p, 0.18, 0.42);
        const swing = easeInOutQuad(clamp01((b - 0.12) / 0.56));
        _tmpA.copy(duelSpot).addScaledVector(normDir, 0.18);
        attacker.root.position.lerpVectors(duelSpot, _tmpA, Math.sin(b * Math.PI));
        attacker.rightArm.rotation.set(
          THREE.MathUtils.lerp(-0.78, -0.25, swing),
          THREE.MathUtils.lerp(-0.9, 0.9, swing),
          -0.85
        );
        attacker.torso.rotation.y = THREE.MathUtils.lerp(-0.4, 0.45, swing);

        if (b > 0.18 && shouldFire(ctx, 'k_sw1')) {
          emitSound(ctx, playSound, 'swing');
          effects.spawnSwingTrail(attacker.root.position, travelAngle, ctx.payload.color, {
            tiltZ: 0.2,
            height: 1.02,
            colorHex: trailColor,
          });
        }
        // Exact contact occurs as swing finishes reaching 1.0 (~b >= 0.65)
        if (b >= 0.64) {
          if (shouldFire(ctx, 'k_hit1')) {
            emitSound(ctx, playSound, 'armorBlock');
            _tmpB.copy(toPos).setY(1.0);
            effects.spawnImpactFlash(_tmpB, flashColor, 1.4);
            effects.spawnSparks(_tmpB, sparkColor, 10);
          }
          const stag = seg(b, 0.64, 1.0);
          defender.leftArm.rotation.x = -1.25;
          defender.torso.rotation.x = -Math.sin(stag * Math.PI) * 0.3;
          _tmpC.copy(toPos).addScaledVector(normDir, 0.16);
          defender.root.position.lerpVectors(toPos, _tmpC, Math.sin(stag * Math.PI));
        }
      } else if (p < 0.72) {
        const b = seg(p, 0.42, 0.72);
        if (b < 0.4) {
          const raise = easeOutCubic(b / 0.4);
          attacker.rightArm.rotation.set(THREE.MathUtils.lerp(-0.25, -2.4, raise), 0, -0.15);
          attacker.torso.rotation.y = THREE.MathUtils.lerp(0.45, 0, raise);
          attacker.torso.rotation.x = -0.2 * raise;
          attacker.root.position.y = Math.sin(raise * Math.PI * 0.5) * 0.2;
        } else {
          const strike = easeOutCubic((b - 0.4) / 0.38);
          attacker.rightArm.rotation.set(THREE.MathUtils.lerp(-2.4, 0.58, strike), 0, -0.12);
          attacker.torso.rotation.x = THREE.MathUtils.lerp(-0.2, 0.34, strike);
          attacker.root.position.y = THREE.MathUtils.lerp(0.2, 0, strike);
          _tmpA.copy(duelSpot).addScaledVector(normDir, 0.26);
          attacker.root.position.lerpVectors(duelSpot, _tmpA, strike);

          if (b > 0.43 && shouldFire(ctx, 'k_sw2')) {
            emitSound(ctx, playSound, 'swingSecondary');
            effects.spawnSwingTrail(attacker.root.position, travelAngle, ctx.payload.color, {
              tiltX: Math.PI * 0.45,
              scale: 1.25,
              height: 1.1,
              colorHex: trailColor,
            });
          }
          // Exact contact at strike >= 0.88 (b >= 0.73)
          if (b >= 0.73) {
            if (shouldFire(ctx, 'k_fin')) {
              emitSound(ctx, playSound, 'finisherImpact');
              ctx.shakeIntensity = 0.042;
              _tmpB.copy(toPos).setY(0.98);
              effects.spawnImpactFlash(_tmpB, flashColor, 2.0);
              effects.spawnShockwave(toPos, shockColor, 3.2);
              effects.spawnSparks(_tmpB, sparkColor, 14);
              effects.spawnDust(toPos, 5);
            }
            const knock = seg(b, 0.73, 1.0);
            defender.torso.rotation.x = -0.35 * knock;
            _tmpC.copy(toPos).addScaledVector(normDir, 0.22);
            defender.root.position.lerpVectors(toPos, _tmpC, knock);
          }
        }
      } else {
        const f = seg(p, 0.72, 0.88);
        applyDefenderFall(defender, clamp01(f / 0.65), seg(f, 0.7, 1.0), ctx, effects, playSound);
        attacker.rightArm.rotation.set(THREE.MathUtils.lerp(0.58, -0.9, f), 0, -0.15);
        attacker.torso.rotation.set(THREE.MathUtils.lerp(0.34, 0, f), 0, 0);
      }
    } else if (type === 'q') {
      // QUEEN: Fast agile warrior — quick side-step -> 360 spin slash -> dash finishing strike
      if (p < 0.34) {
        const b = seg(p, 0.18, 0.34);
        defender.rightArm.rotation.set(
          THREE.MathUtils.lerp(-0.65, 0.4, Math.sin(b * Math.PI)),
          0.3,
          -0.3
        );
        if (b > 0.16 && shouldFire(ctx, 'q_def_sw')) {
          emitSound(ctx, playSound, 'movement');
        }
        const dodgeArc = Math.sin(b * Math.PI);
        attacker.root.position.copy(duelSpot).addScaledVector(sidePerp, dodgeArc * 0.54);
        attacker.torso.rotation.z = dodgeArc * 0.24;
      } else if (p < 0.54) {
        const b = seg(p, 0.34, 0.54);
        _tmpA.copy(duelSpot).addScaledVector(sidePerp, 0.14);
        _tmpB.copy(duelSpot).addScaledVector(normDir, 0.18);
        attacker.root.position.lerpVectors(_tmpA, _tmpB, b);
        attacker.body.rotation.y = travelAngle + easeInOutQuad(b) * Math.PI * 2;
        attacker.rightArm.rotation.set(-0.35, 0.4, -1.15);
        if (isDualWield) {
          attacker.leftArm.rotation.set(-0.35, -0.4, 1.15);
        }
        attacker.torso.rotation.z = 0;

        if (b > 0.16 && shouldFire(ctx, 'q_spin')) {
          emitSound(ctx, playSound, 'swing');
          effects.spawnSwingTrail(attacker.root.position, travelAngle, ctx.payload.color, {
            scale: 1.32,
            fullSpin: true,
            height: 0.98,
            colorHex: trailColor,
          });
        }
        if (b >= 0.6) {
          if (shouldFire(ctx, 'q_hit1')) {
            emitSound(ctx, playSound, 'weaponImpact');
            _tmpC.copy(toPos).setY(1.0);
            effects.spawnImpactFlash(_tmpC, flashColor, 1.5);
            effects.spawnSparks(_tmpC, sparkColor, 12);
          }
          defender.torso.rotation.y = -0.45 * Math.sin((b - 0.6) * Math.PI * 2);
          defender.torso.rotation.x = -0.26;
        }
      } else if (p < 0.73) {
        const b = seg(p, 0.54, 0.73);
        const dash = easeOutCubic(clamp01(b / 0.54));
        attacker.body.rotation.y = travelAngle;
        _tmpA.copy(duelSpot).addScaledVector(normDir, 0.32);
        attacker.root.position.lerpVectors(duelSpot, _tmpA, dash);
        attacker.root.position.y = Math.sin(dash * Math.PI) * 0.26;
        attacker.rightArm.rotation.set(THREE.MathUtils.lerp(-1.9, 0.55, dash), 0, -0.2);
        if (isDualWield) {
          attacker.leftArm.rotation.set(THREE.MathUtils.lerp(-1.9, 0.55, dash), 0, 0.2);
        }
        attacker.torso.rotation.x = THREE.MathUtils.lerp(-0.15, 0.26, dash);

        if (b > 0.16 && shouldFire(ctx, 'q_sw2')) {
          emitSound(ctx, playSound, 'swingSecondary');
          if (isDualWield) {
            effects.spawnSwingTrail(attacker.root.position, travelAngle, ctx.payload.color, {
              tiltZ: -0.42,
              scale: 1.15,
              height: 0.95,
              colorHex: trailColor,
            });
          }
        }
        // Dash strike completes at b = 0.54 -> exact impact frame at b >= 0.52
        if (b >= 0.52 && shouldFire(ctx, 'q_fin')) {
          emitSound(ctx, playSound, 'finisherImpact');
          ctx.shakeIntensity = 0.038;
          _tmpB.copy(toPos).setY(1.04);
          effects.spawnImpactFlash(_tmpB, flashColor, 2.0);
          effects.spawnShockwave(toPos, shockColor, 3.4, 0.82);
          effects.spawnSparks(_tmpB, sparkColor, 14);
        }
      } else {
        const f = seg(p, 0.73, 0.88);
        applyDefenderFall(defender, clamp01(f / 0.65), seg(f, 0.7, 1.0), ctx, effects, playSound);
        attacker.torso.rotation.set(THREE.MathUtils.lerp(0.26, 0, f), 0, 0);
        attacker.rightArm.rotation.set(THREE.MathUtils.lerp(0.55, -0.45, f), 0, -0.15);
        if (isDualWield) {
          attacker.leftArm.rotation.set(THREE.MathUtils.lerp(0.55, -0.35, f), 0, 0.15);
        }
      }
    } else if (type === 'r') {
      // ROOK: Heavy armored guard — shield bash -> heavy overhead axe slam -> strong impact
      if (p < 0.42) {
        const b = seg(p, 0.18, 0.42);
        const lunge = Math.sin(b * Math.PI);
        attacker.root.position.copy(duelSpot).addScaledVector(normDir, lunge * 0.34);
        attacker.leftArm.rotation.set(THREE.MathUtils.lerp(-0.55, -1.35, lunge), 0.35, 0.2);
        attacker.torso.rotation.y = lunge * 0.48;

        if (b > 0.06 && shouldFire(ctx, 'r_bash_move')) {
          emitSound(ctx, playSound, 'movement');
        }
        // Shield bash peaks at b = 0.50 -> exact contact at b >= 0.48
        if (b >= 0.48) {
          if (shouldFire(ctx, 'r_bash')) {
            emitSound(ctx, playSound, 'armorBlock');
            ctx.shakeIntensity = 0.032;
            _tmpB.copy(toPos).setY(0.95);
            effects.spawnImpactFlash(_tmpB, 0xfde68a, 1.5);
            effects.spawnShockwave(_tmpB, 0xfbbf24, 2.1, 0.95);
            effects.spawnSparks(_tmpB, 0xfbbf24, 10);
          }
          const stag = seg(b, 0.48, 1.0);
          defender.root.position.copy(toPos).addScaledVector(normDir, Math.sin(stag * Math.PI) * 0.28);
          defender.torso.rotation.x = -Math.sin(stag * Math.PI) * 0.38;
        }
      } else if (p < 0.73) {
        const b = seg(p, 0.42, 0.73);
        if (b < 0.44) {
          const lift = easeOutCubic(b / 0.44);
          attacker.rightArm.rotation.set(THREE.MathUtils.lerp(-0.3, -2.55, lift), 0, -0.1);
          attacker.torso.rotation.set(-0.22 * lift, THREE.MathUtils.lerp(0.35, 0, lift), 0);
        } else {
          const slam = easeOutCubic((b - 0.44) / 0.34);
          attacker.rightArm.rotation.set(THREE.MathUtils.lerp(-2.55, 0.65, slam), 0, -0.1);
          attacker.torso.rotation.x = THREE.MathUtils.lerp(-0.22, 0.38, slam);
          if (b > 0.45 && shouldFire(ctx, 'r_sw2')) {
            emitSound(ctx, playSound, 'swing');
            effects.spawnSwingTrail(attacker.root.position, travelAngle, ctx.payload.color, {
              tiltX: Math.PI * 0.46,
              scale: 1.28,
              height: 1.05,
              colorHex: trailColor,
            });
          }
          // Overhead warhammer/axe reaches defender at slam ~ 0.91 -> b >= 0.75
          if (b >= 0.75 && shouldFire(ctx, 'r_fin')) {
            emitSound(ctx, playSound, 'finisherImpact');
            ctx.shakeIntensity = 0.048;
            _tmpB.copy(toPos).setY(0.92);
            effects.spawnImpactFlash(_tmpB, flashColor, 2.2);
            effects.spawnShockwave(toPos, shockColor, 3.8, 0.14);
            effects.spawnSparks(_tmpB, sparkColor, 15);
            effects.spawnDust(toPos, 7);
          }
        }
      } else {
        const f = seg(p, 0.73, 0.88);
        applyDefenderFall(defender, clamp01(f / 0.65), seg(f, 0.7, 1.0), ctx, effects, playSound);
        attacker.torso.rotation.set(THREE.MathUtils.lerp(0.38, 0, f), 0, 0);
        attacker.rightArm.rotation.set(THREE.MathUtils.lerp(0.65, -0.32, f), 0, -0.14);
        attacker.leftArm.rotation.set(-0.35, 0, 0.08);
      }
    } else if (type === 'b') {
      // BISHOP: Magic-based attack for magic sets; crisp rapier lunge for Titan Tactical Officer
      _tmpA.copy(toPos).addScaledVector(normDir, -1.25);
      attacker.root.position.lerp(_tmpA, 0.2);

      if (p < 0.38) {
        const b = seg(p, 0.18, 0.38);
        attacker.rightArm.rotation.set(THREE.MathUtils.lerp(-0.75, -1.42, b), 0, -0.2);
        attacker.leftArm.rotation.set(-0.65, 0.25, 0.2);
        attacker.torso.rotation.x = -0.1 * b;
        if (attacker.crystal) {
          attacker.crystal.rotation.y += dt * 12;
          attacker.crystal.scale.setScalar(0.92 + Math.sin(b * Math.PI * 3) * 0.26);
        }
        if (b > 0.04 && shouldFire(ctx, 'b_charge')) {
          if (audioProfile.usesMagic) {
            emitSound(ctx, playSound, 'magicCharge');
            _tmpB.copy(attacker.root.position).setY(1.42);
            effects.spawnShockwave(_tmpB, magicColor, 1.5, 1.42);
          } else {
            emitSound(ctx, playSound, 'movement');
          }
        }
      } else if (p < 0.74) {
        const b = seg(p, 0.38, 0.74);
        if (b < 0.52) {
          const cast = easeOutCubic(clamp01(b / 0.32));
          attacker.rightArm.rotation.set(THREE.MathUtils.lerp(-1.42, -0.25, cast), 0, -0.1);
          attacker.torso.rotation.x = THREE.MathUtils.lerp(-0.1, 0.18, cast);

          if (b > 0.12 && shouldFire(ctx, 'b_proj1')) {
            emitSound(ctx, playSound, audioProfile.usesMagic ? 'magicRelease' : 'swing');
            _tmpB.copy(attacker.root.position).add(_tmpD.set(0, 1.42, 0));
            _tmpC.copy(toPos).add(_tmpD.set(0, 0.95, 0));
            effects.spawnMagicProjectile(_tmpB, _tmpC, ctx.payload.color, 0.2, magicColor, flashColor);
          }
          // Projectile 1 (duration 0.20s) reaches defender at b >= 0.41
          if (b >= 0.41) {
            if (shouldFire(ctx, 'b_imp1')) {
              emitSound(ctx, playSound, audioProfile.usesMagic ? 'magicImpact' : 'weaponImpact');
              _tmpC.copy(toPos).setY(0.96);
              effects.spawnImpactFlash(_tmpC, magicColor, 1.7);
              effects.spawnShockwave(toPos, magicColor, 2.5, 0.92);
              effects.spawnSparks(_tmpC, sparkColor, 12);
            }
            const recoil = seg(b, 0.41, 0.68);
            defender.leftArm.rotation.set(-1.35, 0.4, 0.1);
            defender.torso.rotation.x = -Math.sin(recoil * Math.PI) * 0.34;
          }
        } else {
          const b2 = seg(b, 0.52, 1.0);
          const sweep = easeOutCubic(b2);
          attacker.rightArm.rotation.set(THREE.MathUtils.lerp(-1.65, -0.38, sweep), 0.25, -0.1);
          if (b2 > 0.14 && shouldFire(ctx, 'b_proj2')) {
            emitSound(ctx, playSound, audioProfile.usesMagic ? 'magicRelease' : 'swingSecondary');
            _tmpB.copy(attacker.root.position).add(_tmpD.set(0, 1.44, 0));
            _tmpC.copy(toPos).add(_tmpD.set(0, 0.95, 0));
            effects.spawnMagicProjectile(_tmpB, _tmpC, ctx.payload.color, 0.16, magicColor, flashColor);
          }
          // Projectile 2 (duration 0.16s) reaches defender at b2 >= 0.62
          if (b2 >= 0.62 && shouldFire(ctx, 'b_fin')) {
            emitSound(ctx, playSound, audioProfile.usesMagic ? 'magicImpact' : 'finisherImpact');
            ctx.shakeIntensity = 0.036;
            _tmpC.copy(toPos).setY(0.96);
            effects.spawnImpactFlash(_tmpC, flashColor, 2.1);
            effects.spawnShockwave(toPos, shockColor, 3.6, 0.84);
            effects.spawnSparks(_tmpC, sparkColor, 16);
          }
        }
      } else {
        const f = seg(p, 0.74, 0.88);
        applyDefenderFall(defender, clamp01(f / 0.65), seg(f, 0.7, 1.0), ctx, effects, playSound);
        if (attacker.crystal) attacker.crystal.scale.setScalar(0.92);
        attacker.rightArm.rotation.set(-0.22, 0, -0.1);
        attacker.torso.rotation.set(0, 0, 0);
      }
    } else if (type === 'n' && !isMountedKnight) {
      // TITAN AERIAL KNIGHT: High-speed aerial spin & twin-blade X-slash
      if (p < 0.44) {
        const b = seg(p, 0.18, 0.44);
        const arc = Math.sin(b * Math.PI);
        attacker.root.position.copy(duelSpot).addScaledVector(sidePerp, arc * 0.46).addScaledVector(normDir, b * 0.22);
        attacker.root.position.y = arc * 0.48;
        attacker.body.rotation.y = travelAngle + easeInOutQuad(b) * Math.PI * 2;
        attacker.rightArm.rotation.set(-0.55, 0.5, -1.25);
        attacker.leftArm.rotation.set(-0.55, -0.5, 1.25);

        if (b > 0.18 && shouldFire(ctx, 'tn_sw1')) {
          emitSound(ctx, playSound, 'swing');
          effects.spawnSwingTrail(toPos, travelAngle, ctx.payload.color, {
            fullSpin: true,
            scale: 1.28,
            height: 1.05,
            colorHex: trailColor,
          });
        }
        if (b >= 0.54 && shouldFire(ctx, 'tn_hit1')) {
          emitSound(ctx, playSound, 'weaponImpact');
          _tmpC.copy(toPos).setY(0.98);
          effects.spawnImpactFlash(_tmpC, flashColor, 1.5);
          effects.spawnSparks(_tmpC, sparkColor, 12);
          defender.torso.rotation.x = -0.28;
        }
      } else if (p < 0.74) {
        const b = seg(p, 0.44, 0.74);
        const strike = easeOutCubic(clamp01(b / 0.65));
        attacker.body.rotation.y = travelAngle;
        _tmpA.copy(duelSpot).addScaledVector(normDir, 0.34);
        attacker.root.position.lerpVectors(duelSpot, _tmpA, strike);
        attacker.root.position.y = Math.sin(strike * Math.PI) * 0.26;
        attacker.rightArm.rotation.set(THREE.MathUtils.lerp(-1.9, 0.55, strike), -0.35, -0.2);
        attacker.leftArm.rotation.set(THREE.MathUtils.lerp(-1.9, 0.55, strike), 0.35, 0.2);
        attacker.torso.rotation.x = THREE.MathUtils.lerp(-0.12, 0.3, strike);

        if (b > 0.18 && shouldFire(ctx, 'tn_sw2')) {
          emitSound(ctx, playSound, 'swingSecondary');
          effects.spawnSwingTrail(attacker.root.position, travelAngle, ctx.payload.color, {
            tiltZ: 0.45,
            scale: 1.18,
            height: 0.96,
            colorHex: trailColor,
          });
        }
        // Strike arrives at defender at b >= 0.62
        if (b >= 0.62 && shouldFire(ctx, 'tn_fin')) {
          emitSound(ctx, playSound, 'finisherImpact');
          ctx.shakeIntensity = 0.04;
          _tmpB.copy(toPos).setY(0.98);
          effects.spawnImpactFlash(_tmpB, flashColor, 1.9);
          effects.spawnShockwave(toPos, shockColor, 3.0, 0.16);
          effects.spawnSparks(_tmpB, sparkColor, 14);
        }
      } else {
        const f = seg(p, 0.74, 0.88);
        applyDefenderFall(defender, clamp01(f / 0.65), seg(f, 0.7, 1.0), ctx, effects, playSound);
        attacker.torso.rotation.set(THREE.MathUtils.lerp(0.3, 0, f), 0, 0);
        attacker.rightArm.rotation.set(THREE.MathUtils.lerp(0.55, -0.35, f), 0, -0.15);
        attacker.leftArm.rotation.set(THREE.MathUtils.lerp(0.55, -0.35, f), 0, 0.15);
      }
    } else if (type === 'n') {
      // KNIGHT: Horse charge — mounted pass & slash -> fast turn -> final charge strike
      const passStart = duelSpot;
      const passMid = _tmpA.copy(toPos).addScaledVector(sidePerp, 0.72);
      const passEnd = _tmpB.copy(toPos).addScaledVector(normDir, 1.0).addScaledVector(sidePerp, 0.32);

      if (p < 0.42) {
        const b = seg(p, 0.18, 0.42);
        const inv = 1 - b;
        attacker.root.position.set(
          inv * inv * passStart.x + 2 * inv * b * passMid.x + b * b * passEnd.x,
          Math.abs(Math.sin(b * Math.PI * 3)) * 0.12,
          inv * inv * passStart.z + 2 * inv * b * passMid.z + b * b * passEnd.z
        );
        animateWalkStride(attacker, b * Math.PI * 5, 0.62);

        const tanX = 2 * inv * (passMid.x - passStart.x) + 2 * b * (passEnd.x - passMid.x);
        const tanZ = 2 * inv * (passMid.z - passStart.z) + 2 * b * (passEnd.z - passMid.z);
        attacker.body.rotation.y = shortestAngleLerp(attacker.body.rotation.y, Math.atan2(tanX, tanZ), rotAlpha);

        const sw = Math.sin(clamp01((b - 0.25) / 0.5) * Math.PI);
        attacker.rightArm.rotation.set(-0.45 - sw * 0.72, sw * 0.9, -0.35);

        if (b > 0.08 && shouldFire(ctx, 'n_hoof1')) {
          emitSound(ctx, playSound, 'horseMove');
        }
        if (b > 0.26 && shouldFire(ctx, 'n_sw1')) {
          emitSound(ctx, playSound, 'swing');
          effects.spawnSwingTrail(toPos, travelAngle, ctx.payload.color, {
            tiltZ: 0.25,
            scale: 1.25,
            height: 1.0,
            colorHex: trailColor,
          });
        }
        // Mounted pass reaches closest point (passMid) at b = 0.50 -> exact contact at b >= 0.49
        if (b >= 0.49) {
          if (shouldFire(ctx, 'n_hit1')) {
            emitSound(ctx, playSound, 'weaponImpact');
            _tmpC.copy(toPos).setY(1.0);
            effects.spawnImpactFlash(_tmpC, flashColor, 1.5);
            effects.spawnSparks(_tmpC, sparkColor, 12);
          }
          defender.torso.rotation.y = -0.5 * Math.sin((b - 0.49) * Math.PI * 2);
          defender.leftArm.rotation.x = -1.1;
        }
      } else if (p < 0.58) {
        const b = seg(p, 0.42, 0.58);
        if (b > 0.08 && shouldFire(ctx, 'gallop2')) {
          emitSound(ctx, playSound, 'horseMove');
        }
        _tmpC.copy(toPos).addScaledVector(normDir, 1.08);
        attacker.root.position.lerpVectors(passEnd, _tmpC, easeInOutQuad(b));
        animateWalkStride(attacker, b * Math.PI * 3, 0.45);
        attacker.body.rotation.y = shortestAngleLerp(attacker.body.rotation.y, travelAngle + Math.PI, rotAlpha);
        defender.body.rotation.y = shortestAngleLerp(defender.body.rotation.y, travelAngle, rotAlpha);
        attacker.rightArm.rotation.set(-1.1, 0, -0.15);
      } else if (p < 0.76) {
        const b = seg(p, 0.58, 0.76);
        _tmpC.copy(toPos).addScaledVector(normDir, 1.08);
        _tmpD.copy(toPos).addScaledVector(normDir, 0.4);
        attacker.root.position.lerpVectors(_tmpC, _tmpD, easeOutCubic(b));
        attacker.root.position.y = Math.sin(b * Math.PI) * 0.16;
        animateWalkStride(attacker, b * Math.PI * 4, 0.58);
        attacker.body.rotation.y = travelAngle + Math.PI;
        attacker.rightArm.rotation.set(THREE.MathUtils.lerp(-1.1, 0.35, b), 0, -0.15);

        if (b > 0.06 && shouldFire(ctx, 'n_hoof3')) {
          emitSound(ctx, playSound, 'horseMove');
        }
        if (b > 0.34 && shouldFire(ctx, 'n_sw2')) {
          emitSound(ctx, playSound, 'swingSecondary');
        }
        // Final mounted lance/sword impact at b >= 0.76
        if (b >= 0.76 && shouldFire(ctx, 'n_fin')) {
          emitSound(ctx, playSound, 'finisherImpact');
          ctx.shakeIntensity = 0.045;
          _tmpD.copy(toPos).setY(1.0);
          effects.spawnImpactFlash(_tmpD, flashColor, 2.0);
          effects.spawnShockwave(toPos, shockColor, 3.5, 0.14);
          effects.spawnSparks(_tmpD, sparkColor, 14);
          effects.spawnDust(toPos, 6);
        }
      } else {
        const f = seg(p, 0.76, 0.88);
        applyDefenderFall(defender, clamp01(f / 0.65), seg(f, 0.7, 1.0), ctx, effects, playSound);
        attacker.rightArm.rotation.set(-0.25, 0, -0.1);
      }
    } else {
      // PAWN: Simple soldier combat — slash -> shield block -> final thrust/slash
      if (p < 0.44) {
        const b = seg(p, 0.18, 0.44);
        const swing = easeInOutQuad(clamp01(b / 0.68));
        attacker.rightArm.rotation.set(
          THREE.MathUtils.lerp(-0.85, 0.35, swing),
          THREE.MathUtils.lerp(-0.4, 0.6, swing),
          -0.35
        );
        attacker.torso.rotation.y = THREE.MathUtils.lerp(-0.25, 0.32, swing);
        if (b > 0.18 && shouldFire(ctx, 'p_sw1')) {
          emitSound(ctx, playSound, 'swing');
          effects.spawnSwingTrail(attacker.root.position, travelAngle, ctx.payload.color, {
            scale: 0.9,
            height: 0.78,
            colorHex: trailColor,
          });
        }
        // Swing finishes at b = 0.68 -> exact contact at b >= 0.64
        if (b >= 0.64) {
          if (shouldFire(ctx, 'p_hit1')) {
            emitSound(ctx, playSound, 'armorBlock');
            _tmpB.copy(toPos).setY(0.84);
            effects.spawnImpactFlash(_tmpB, flashColor, 1.3);
            effects.spawnSparks(_tmpB, sparkColor, 8);
          }
          defender.leftArm.rotation.x = -1.15;
          defender.torso.rotation.x = -0.16;
        }
      } else if (p < 0.72) {
        const b = seg(p, 0.44, 0.72);
        const strike = easeOutCubic(clamp01(b / 0.65));
        _tmpA.copy(duelSpot).addScaledVector(normDir, 0.24);
        attacker.root.position.lerpVectors(duelSpot, _tmpA, strike);
        attacker.rightArm.rotation.set(THREE.MathUtils.lerp(-1.25, 0.45, strike), 0, -0.15);
        attacker.leftArm.rotation.set(-0.3, 0, 0.1);
        attacker.torso.rotation.set(THREE.MathUtils.lerp(-0.1, 0.26, strike), 0, 0);

        if (b > 0.18 && shouldFire(ctx, 'p_sw2')) {
          emitSound(ctx, playSound, 'swingSecondary');
          effects.spawnSwingTrail(attacker.root.position, travelAngle, ctx.payload.color, {
            tiltX: 0.6,
            scale: 0.95,
            height: 0.8,
            colorHex: trailColor,
          });
        }
        // Final strike hits at b = 0.65 -> exact contact at b >= 0.62
        if (b >= 0.62 && shouldFire(ctx, 'p_fin')) {
          emitSound(ctx, playSound, 'finisherImpact');
          ctx.shakeIntensity = 0.03;
          _tmpB.copy(toPos).setY(0.84);
          effects.spawnImpactFlash(_tmpB, flashColor, 1.65);
          effects.spawnShockwave(toPos, shockColor, 2.3, 0.14);
          effects.spawnSparks(_tmpB, sparkColor, 11);
        }
      } else {
        const f = seg(p, 0.72, 0.88);
        applyDefenderFall(defender, clamp01(f / 0.65), seg(f, 0.7, 1.0), ctx, effects, playSound);
        attacker.torso.rotation.set(THREE.MathUtils.lerp(0.26, 0, f), 0, 0);
        attacker.rightArm.rotation.set(THREE.MathUtils.lerp(0.45, -0.22, f), 0, -0.12);
      }
    }
  } else {
    // 0.88 -> 1.00: Claim defeated square & face enemy kingdom cleanly
    if (shouldFire(ctx, 'death_vocal')) {
      emitSound(ctx, playSound, 'deathVocal', ctx.defenderClass ?? ctx.payload.captured ?? 'p');
    }
    if (shouldFire(ctx, 'death_blood')) {
      effects.spawnBloodSplash(ctx.capturedPos);
    }
    const t = easeOutCubic(seg(p, 0.88, 1.0));
    if (!ctx.hasClaimStart) {
      ctx.claimStartPos.copy(attacker.root.position);
      ctx.hasClaimStart = true;
    }
    defender.root.visible = false;
    attacker.root.position.lerpVectors(ctx.claimStartPos, toPos, t);
    attacker.root.position.y = Math.sin(t * Math.PI) * 0.07;
    animateWalkStride(attacker, t * Math.PI * 2, 0.3);
    attacker.body.rotation.y = shortestAngleLerp(attacker.body.rotation.y, homeAngle, rotAlpha);
    attacker.torso.rotation.set(0, 0, 0);
    attacker.rightArm.rotation.set(-0.28, 0, -0.12);
    attacker.leftArm.rotation.set(-0.25, 0, 0.12);
  }

  // Keep attacker ground shadow anchored onto tile y=0.004 during jumps & combat leaps
  attacker.contactShadow.position.y = -attacker.root.position.y + 0.004;

  // Rock-steady fixed camera during combat: NO rotation, only tiny damped micro-shake on heavy impacts!
  camera.position.copy(ctx.savedCamPos);
  targetOut.copy(ctx.savedTarget);
  if (ctx.shakeIntensity > 0.001) {
    camera.position.x += (Math.random() - 0.5) * ctx.shakeIntensity;
    camera.position.y += (Math.random() - 0.5) * ctx.shakeIntensity * 0.65;
    ctx.shakeIntensity *= Math.exp(-18 * dt);
  } else {
    ctx.shakeIntensity = 0;
  }
}
