import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BOARD_SPAN,
  TILE_SIZE,
  createBattlefield,
  squareToWorld,
  type BattlefieldRefs,
} from './createBattlefield';
import {
  createCharacterGeometryBank,
  createCharacterPiece,
  type CharacterGeometryBank,
  type CharacterRig,
} from './createCharacterPieces';
import { CharacterGLTFProvider } from './characterAssetLoader';
import { BOARD_ARENAS } from './arenaPresets';
import { CHARACTER_SETS } from './characterSets';
import { createSceneMaterialBank, type SceneMaterialBank } from './materials';
import {
  CombatEffectsManager,
  getCombatDuration,
  shortestAngleLerp,
  updateCombatDuel,
  type CombatDuelContext,
  type CombatSoundEvent,
} from './combatChoreography';
import { BattlefieldAftermathManager } from './battlefieldAftermath';
import { recordFrameMetrics } from '../utils/devPerfMonitor';
import { isLowTierDevice, isSoftwareGlRenderer } from '../utils/webglDetect';
import type {
  BoardPiece,
  BoardThemeId,
  CharacterSetId,
  GraphicsQuality,
  MoveAnimationPayload,
  PieceColor,
  PieceSkinId,
  PieceType,
} from '../types/chess';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();
const _boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.005);
const _planeHit = new THREE.Vector3();
const _flameDummy = new THREE.Object3D();

const BOARD_CENTER_TARGET = new THREE.Vector3(0, 0.12, 0);
const CAMERA_PITCH_RAD = THREE.MathUtils.degToRad(68); // Higher 68° top-down isometric view (65–75°)
const CAMERA_YAW_RAD = THREE.MathUtils.degToRad(8); // Slight 8° isometric angle toward the battlefield

const _camRightPan = new THREE.Vector3();
const _camForwardPan = new THREE.Vector3();
const _worldUpAxis = new THREE.Vector3(0, 1, 0);

export interface CameraPanBounds {
  maxX: number;
  maxZ: number;
}

/**
 * Converts screen-space pointer drag pixels into ground-plane (XZ) camera pan deltas
 * matching the active camera orientation with zero pitch drift.
 */
export function screenDeltaToGroundPan(
  dxPixels: number,
  dyPixels: number,
  cameraMatrixWorld: THREE.Matrix4,
  fovDeg: number,
  distance: number,
  viewportHeight: number,
  out: { x: number; z: number }
): { x: number; z: number } {
  const safeHeight = Math.max(1, viewportHeight);
  const worldPerPixel =
    (2 * distance * Math.tan(THREE.MathUtils.degToRad(fovDeg * 0.5))) / safeHeight;

  _camRightPan.setFromMatrixColumn(cameraMatrixWorld, 0).setY(0);
  if (_camRightPan.lengthSq() > 1e-6) {
    _camRightPan.normalize();
  } else {
    _camRightPan.set(1, 0, 0);
  }

  _camForwardPan.crossVectors(_worldUpAxis, _camRightPan);
  if (_camForwardPan.lengthSq() > 1e-6) {
    _camForwardPan.normalize();
  } else {
    _camForwardPan.set(0, 0, -1);
  }

  const pitchComp = 1 / Math.max(0.5, Math.sin(CAMERA_PITCH_RAD));
  const moveRight = -dxPixels * worldPerPixel;
  const moveForward = dyPixels * worldPerPixel * pitchComp;

  out.x = _camRightPan.x * moveRight + _camForwardPan.x * moveForward;
  out.z = _camRightPan.z * moveRight + _camForwardPan.z * moveForward;
  return out;
}

/**
 * Computes zoom-aware horizontal and vertical pan limits over the battlefield.
 * Keeps the chessboard centered at default/zoomed-out framing and expands smoothly
 * across the 8x8 board and flanking Graveyard Sanctuaries as the player zooms in.
 */
export function computeCameraPanBounds(
  distance: number,
  defaultDist: number,
  minDist: number,
  maxDist: number
): CameraPanBounds {
  if (distance <= defaultDist) {
    const span = Math.max(0.01, defaultDist - minDist);
    const zoomInT = THREE.MathUtils.clamp((defaultDist - distance) / span, 0, 1);
    return {
      maxX: THREE.MathUtils.lerp(1.6, 7.35, zoomInT),
      maxZ: THREE.MathUtils.lerp(1.2, 5.35, zoomInT),
    };
  }
  const outSpan = Math.max(0.01, maxDist - defaultDist);
  const zoomOutT = THREE.MathUtils.clamp((distance - defaultDist) / outSpan, 0, 1);
  return {
    maxX: THREE.MathUtils.lerp(1.6, 0.35, zoomOutT),
    maxZ: THREE.MathUtils.lerp(1.2, 0.25, zoomOutT),
  };
}

export type AdaptivePerfTier = 0 | 1 | 2;

export interface AdaptivePerfState {
  tier: AdaptivePerfTier;
  emaFrameMs: number;
  slowSustainSec: number;
  fastSustainSec: number;
  warmupFrames: number;
}

export function createAdaptivePerfState(): AdaptivePerfState {
  return {
    tier: 0,
    emaFrameMs: 16.67,
    slowSustainSec: 0,
    fastSustainSec: 0,
    warmupFrames: 10,
  };
}

/**
 * Hysteresis-driven adaptive frame-budget controller.
 * Scales back non-critical ambient frequency, combat particle counts, and mid-duel
 * shadow updates only under sustained slow frames, ignoring brief stalls (> 48ms)
 * and recovering smoothly without backbuffer thrashing.
 */
export function stepAdaptivePerfTier(
  state: AdaptivePerfState,
  frameMs: number,
  dtSec: number
): AdaptivePerfTier {
  if (state.warmupFrames > 0) {
    state.warmupFrames--;
    return state.tier;
  }
  if (!Number.isFinite(frameMs) || frameMs <= 0 || frameMs > 48) {
    return state.tier;
  }
  const clampedDt = Math.min(Math.max(dtSec, 0), 0.05);
  state.emaFrameMs = state.emaFrameMs * 0.9 + frameMs * 0.1;

  if (state.tier === 0) {
    if (state.emaFrameMs > 26) {
      state.slowSustainSec += clampedDt;
      state.fastSustainSec = 0;
      if (state.slowSustainSec >= 1.5) {
        state.tier = 1;
        state.slowSustainSec = 0;
      }
    } else {
      state.slowSustainSec = Math.max(0, state.slowSustainSec - clampedDt * 0.5);
    }
  } else if (state.tier === 1) {
    if (state.emaFrameMs > 36) {
      state.slowSustainSec += clampedDt;
      state.fastSustainSec = 0;
      if (state.slowSustainSec >= 2.0) {
        state.tier = 2;
        state.slowSustainSec = 0;
      }
    } else if (state.emaFrameMs < 19) {
      state.fastSustainSec += clampedDt;
      state.slowSustainSec = 0;
      if (state.fastSustainSec >= 3.5) {
        state.tier = 0;
        state.fastSustainSec = 0;
      }
    } else {
      state.slowSustainSec = Math.max(0, state.slowSustainSec - clampedDt * 0.5);
      state.fastSustainSec = Math.max(0, state.fastSustainSec - clampedDt * 0.5);
    }
  } else if (state.emaFrameMs < 24) {
    state.fastSustainSec += clampedDt;
    if (state.fastSustainSec >= 3.5) {
      state.tier = 1;
      state.fastSustainSec = 0;
    }
  } else {
    state.fastSustainSec = Math.max(0, state.fastSustainSec - clampedDt * 0.5);
  }
  return state.tier;
}

interface KingdomArenaTheme {
  bg: number;
  fog: number;
  key: number;
  fillRim: number;
  trim: number;
  moat: number;
  flame: number;
  ember: number;
}

const KINGDOM_ARENA_THEMES: Record<CharacterSetId, KingdomArenaTheme> = {
  human: {
    bg: 0x131a28,
    fog: 0x161f2f,
    key: 0xcce0ff,
    fillRim: 0xffe1c4,
    trim: 0xc29e60,
    moat: 0x0c1d2b,
    flame: 0xffa638,
    ember: 0xff5a12,
  },
  titan: {
    bg: 0x101922,
    fog: 0x15212a,
    key: 0xd4eaf5,
    fillRim: 0xc2e6d0,
    trim: 0xa49262,
    moat: 0x0a1e22,
    flame: 0xffb35c,
    ember: 0xf97316,
  },
  inferno: {
    bg: 0x191218,
    fog: 0x22161b,
    key: 0xebd4cc,
    fillRim: 0xffab75,
    trim: 0xc97f3c,
    moat: 0x181014,
    flame: 0xff8a24,
    ember: 0xff3b0f,
  },
  shadow: {
    bg: 0x121324,
    fog: 0x18172f,
    key: 0xc9d4fe,
    fillRim: 0xc7b8fd,
    trim: 0x8e82b2,
    moat: 0x0d1226,
    flame: 0xa78bfa,
    ember: 0x7c3aed,
  },
  celestial: {
    bg: 0x101c30,
    fog: 0x162640,
    key: 0xe3f0ff,
    fillRim: 0xfde68a,
    trim: 0xd8b254,
    moat: 0x0c2238,
    flame: 0x7dd3fc,
    ember: 0x0ea5e9,
  },
  frostguard: {
    bg: 0x0e1c2b,
    fog: 0x13263b,
    key: 0xe2f5ff,
    fillRim: 0x99f6e4,
    trim: 0x99d9f2,
    moat: 0x0b2336,
    flame: 0x67e8f9,
    ember: 0x06b6d4,
  },
  sylvan: {
    bg: 0x111d15,
    fog: 0x17261c,
    key: 0xf2f5dc,
    fillRim: 0xcbef90,
    trim: 0xc9a853,
    moat: 0x0e241b,
    flame: 0xd9f99d,
    ember: 0x65a30d,
  },
  storm: {
    bg: 0x11152b,
    fog: 0x181e3d,
    key: 0xe3ebff,
    fillRim: 0xc4b5fd,
    trim: 0xd9c252,
    moat: 0x0d1530,
    flame: 0xa5b4fc,
    ember: 0x6366f1,
  },
};

interface ActiveMoveAnim {
  moveIndex: number;
  payload: MoveAnimationPayload;
  attacker: CharacterRig;
  defender: CharacterRig | null;
  rookRig: CharacterRig | null;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  rookFromPos: THREE.Vector3;
  rookToPos: THREE.Vector3;
  elapsed: number;
  duration: number;
  isCapture: boolean;
  duelCtx: CombatDuelContext | null;
  onComplete: () => void;
}

export class ChessSceneController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private sceneFog: THREE.FogExp2;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private isSoftwareGl: boolean;
  private isLowTierHw: boolean;
  private quality: GraphicsQuality = 'high';
  private characterSet: CharacterSetId = 'human';
  private pieceSkin: PieceSkinId = 'royal-standard';
  private boardTheme: BoardThemeId = 'classic-citadel';
  private currentSide: PieceColor = 'w';
  private lastDefaultDist = 24;
  private lastBoardPieces: BoardPiece[] = [];
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;
  private contextLost = false;
  private isPausedHidden = typeof document !== 'undefined' ? document.hidden : false;
  private envRT: THREE.WebGLRenderTarget | null = null;
  private matchEpoch = 0;

  private materials: SceneMaterialBank;
  private charGeos: CharacterGeometryBank;
  private gltfProvider = new CharacterGLTFProvider();
  private battlefield: BattlefieldRefs;
  private hemiLight: THREE.HemisphereLight;
  private keyLight: THREE.DirectionalLight;
  private fillRimLight: THREE.DirectionalLight;
  private resizeObserver: ResizeObserver | null = null;
  private motionQuery: MediaQueryList | null = null;
  private prefersReducedMotion = false;

  private piecesGroup = new THREE.Group();
  private highlightsGroup = new THREE.Group();
  private effectsGroup = new THREE.Group();
  private aftermathGroup = new THREE.Group();

  private pieceMap = new Map<string, CharacterRig>();
  private activeRigs: CharacterRig[] = [];
  private rigPool: CharacterRig[] = [];
  private hitProxyToSquare = new Map<THREE.Object3D, string>();
  private raycastTargets: THREE.Object3D[] = [];

  // Pre-allocated scratch collections for zero-GC syncBoard
  private _sparePieceMap = new Map<string, CharacterRig>();
  private _spareHitProxy = new Map<THREE.Object3D, string>();
  private _unmatchedPieces: BoardPiece[] = [];
  private _leftoverActive: CharacterRig[] = [];

  // Highlight state & meshes
  private currentSelectedSquare: string | null = null;
  private currentLegalTargets = new Map<string, boolean>();
  private selectedRing: THREE.Mesh;
  private checkRing: THREE.Mesh;
  private lastMoveMeshes: THREE.Mesh[] = [];
  private legalMoveMeshes: THREE.Mesh[] = [];
  private legalCaptureMeshes: THREE.Mesh[] = [];
  private sharedHighlightGeos: THREE.BufferGeometry[] = [];
  private sharedHighlightMats: THREE.Material[] = [];

  private activeAnim: ActiveMoveAnim | null = null;
  private reusableMoveAnim: ActiveMoveAnim | null = null;
  private reusableDuelCtx: CombatDuelContext | null = null;
  private shadowsDirty = true;
  private lastShadowUpdateMs = 0;
  private lastTickStart = 0;
  private lastFrameTimeMs = 0;
  private envAccumDt = 0;
  private adaptivePerf = createAdaptivePerfState();
  private combatEffects: CombatEffectsManager;
  private aftermath: BattlefieldAftermathManager;
  private committedCaptureMoves = new Set<number>();
  private fallbackCaptureSeq = 10000;

  // Smooth zoom/focus glide state (maintains fixed viewing direction, zero rotation)
  private cameraGlide: {
    active: boolean;
    pos: THREE.Vector3;
    target: THREE.Vector3;
  } = {
    active: false,
    pos: new THREE.Vector3(),
    target: new THREE.Vector3(),
  };

  // Raycasting & mobile touch / mouse pan disambiguation
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private pointerDownInfo: {
    x: number;
    y: number;
    time: number;
    pointerId: number;
    pointerType: string;
    movedBeyondTap: boolean;
    startedOnPiece: boolean;
    startedOnLegalTarget: boolean;
  } | null = null;
  private activePointers = new Set<number>();
  private lastMultiTouchTime = 0;

  // Low-latency one-finger ground-plane pan state for empty-space touch drags
  private oneFingerPan = {
    active: false,
    pointerId: -1,
    lastX: 0,
    lastY: 0,
    pendingX: 0,
    pendingZ: 0,
    velX: 0,
    velZ: 0,
  };
  private _panDeltaTmp = { x: 0, z: 0 };

  private onSquareTapCallback: (square: string) => void;
  private onContextLostCallback?: () => void;
  private onContextRestoredCallback?: () => void;
  private onCombatSoundCallback?: (event: CombatSoundEvent) => void;

  private triggerCombatSound = (event: CombatSoundEvent) => {
    this.onCombatSoundCallback?.(event);
  };

  constructor(
    container: HTMLElement,
    options: {
      onSquareTap: (square: string) => void;
      onCombatSound?: (event: CombatSoundEvent) => void;
      onContextLost?: () => void;
      onContextRestored?: () => void;
      initialSide?: PieceColor;
      characterSet?: CharacterSetId;
      pieceSkin?: PieceSkinId;
      boardTheme?: BoardThemeId;
    }
  ) {
    this.container = container;
    this.characterSet = options.characterSet ?? 'human';
    this.pieceSkin = options.pieceSkin ?? 'royal-standard';
    this.boardTheme = options.boardTheme ?? 'classic-citadel';
    this.onSquareTapCallback = options.onSquareTap;
    this.onCombatSoundCallback = options.onCombatSound;
    this.onContextLostCallback = options.onContextLost;
    this.onContextRestoredCallback = options.onContextRestored;

    this.isSoftwareGl = isSoftwareGlRenderer();
    this.isLowTierHw = isLowTierDevice();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.getTargetPixelRatio());
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.shadowsDirty = true;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.cursor = 'grab';
    this.renderer.domElement.className = 'touch-canvas';
    container.appendChild(this.renderer.domElement);

    // Dark Fantasy Citadel Twilight Sky & Horizon Mist
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x131a28);
    this.sceneFog = new THREE.FogExp2(0x161f2f, 0.01);
    this.scene.fog = this.sceneFog;

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    roomEnv.dispose();
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.72;
    pmremGenerator.dispose();

    // Fixed Elevated Isometric Camera (68° downward, zero rotation, bounded zoom + pan)
    this.camera = new THREE.PerspectiveCamera(44, width / height, 0.8, 95);
    this.currentSide = options.initialSide ?? 'w';
    const { defaultDist, minDist, maxDist } = this.computeCameraDistances();
    this.lastDefaultDist = defaultDist;
    this.sceneFog.density = Math.min(0.014, 0.24 / defaultDist);
    this.getBoardCameraPosition(this.currentSide, defaultDist, this.camera.position);

    // OrbitControls configured for Bounded Zoom + Ground-Plane Pan (Rotation strictly disabled)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(BOARD_CENTER_TARGET);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.18;
    this.controls.enableRotate = false;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = false;
    this.controls.panSpeed = 1.05;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 0.85;
    this.controls.minDistance = minDist;
    this.controls.maxDistance = maxDist;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE, // Blocked by enableRotate = false; single finger taps select chess pieces only
      TWO: THREE.TOUCH.DOLLY_PAN, // Two-finger pinch zoom + two-finger drag pan
    };

    this.controls.addEventListener('start', () => {
      if (this.activePointers.size >= 2) {
        this.cameraGlide.active = false;
      }
    });

    // Optimized 3-Light Rig for Mobile GPU (Hemisphere + Shadow Key + Balanced Back/Fill Rim)
    this.hemiLight = new THREE.HemisphereLight(0x7c9ad0, 0x2f2622, 1.18);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xcce0ff, 2.0);
    this.keyLight.position.set(10.0, 14.5, 7.5);
    this.keyLight.castShadow = !this.isSoftwareGl;
    const shadowSize = this.isLowTierHw ? 512 : 1024;
    this.keyLight.shadow.mapSize.width = shadowSize;
    this.keyLight.shadow.mapSize.height = shadowSize;
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 34;
    const d = 5.8;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0007;
    this.keyLight.shadow.normalBias = 0.028;
    this.scene.add(this.keyLight);

    this.fillRimLight = new THREE.DirectionalLight(0xffe1c4, 1.05);
    this.fillRimLight.position.set(-6.5, 6.2, -8.0);
    this.scene.add(this.fillRimLight);

    // Build Battlefield, Material Bank, Character Geo Bank
    this.materials = createSceneMaterialBank(this.renderer, this.characterSet);
    if (this.pieceSkin !== 'royal-standard') {
      this.materials.switchPieceSkin(this.pieceSkin);
    }
    this.charGeos = createCharacterGeometryBank();
    this.battlefield = createBattlefield(this.materials);
    this.applyArenaAtmosphere();
    this.scene.add(this.battlefield.group);
    this.scene.add(this.highlightsGroup);
    this.scene.add(this.piecesGroup);
    this.scene.add(this.effectsGroup);
    this.combatEffects = new CombatEffectsManager(this.effectsGroup);
    this.scene.add(this.aftermathGroup);
    this.aftermath = new BattlefieldAftermathManager(
      this.aftermathGroup,
      this.renderer,
      this.charGeos,
      this.materials
    );
    this.syncEffectsMotionAndQuality();

    // Highlight rings & discs tuned for clear top-down isometric readability
    const selGeo = new THREE.RingGeometry(0.37, 0.5, 28);
    const selMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.96,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.selectedRing = new THREE.Mesh(selGeo, selMat);
    this.selectedRing.rotation.x = -Math.PI / 2;
    this.selectedRing.position.y = 0.022;
    this.selectedRing.renderOrder = 3;
    this.selectedRing.visible = false;
    this.highlightsGroup.add(this.selectedRing);

    const chkGeo = new THREE.RingGeometry(0.36, 0.52, 26);
    const chkMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.checkRing = new THREE.Mesh(chkGeo, chkMat);
    this.checkRing.rotation.x = -Math.PI / 2;
    this.checkRing.position.y = 0.024;
    this.checkRing.renderOrder = 3;
    this.checkRing.visible = false;
    this.highlightsGroup.add(this.checkRing);

    const lastMoveGeo = new THREE.PlaneGeometry(1.06, 1.06);
    const lastMoveMat = new THREE.MeshBasicMaterial({
      color: 0xd4a438,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    for (let i = 0; i < 2; i++) {
      const m = new THREE.Mesh(lastMoveGeo, lastMoveMat);
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.012;
      m.renderOrder = 2;
      m.visible = false;
      this.highlightsGroup.add(m);
      this.lastMoveMeshes.push(m);
    }

    const legalMoveGeo = new THREE.CircleGeometry(0.2, 20);
    const legalMoveMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    for (let i = 0; i < 32; i++) {
      const m = new THREE.Mesh(legalMoveGeo, legalMoveMat);
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.018;
      m.renderOrder = 3;
      m.visible = false;
      this.highlightsGroup.add(m);
      this.legalMoveMeshes.push(m);
    }

    const legalCapGeo = new THREE.RingGeometry(0.35, 0.51, 24);
    const legalCapMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(legalCapGeo, legalCapMat);
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.02;
      m.renderOrder = 3;
      m.visible = false;
      this.highlightsGroup.add(m);
      this.legalCaptureMeshes.push(m);
    }

    this.sharedHighlightGeos.push(selGeo, chkGeo, lastMoveGeo, legalMoveGeo, legalCapGeo);
    this.sharedHighlightMats.push(selMat, chkMat, lastMoveMat, legalMoveMat, legalCapMat);

    // Freeze highlight matrices until highlight state changes
    this.highlightsGroup.updateMatrixWorld(true);
    this.highlightsGroup.traverse((obj) => {
      obj.matrixAutoUpdate = false;
    });
    this.piecesGroup.matrixAutoUpdate = false;
    this.piecesGroup.updateMatrix();

    // Layer 1 raycasting
    this.raycaster.layers.set(1);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.controls.update();
    this.bindEvents();
    if (!this.isPausedHidden) {
      this.tick();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private applyArenaAtmosphere() {
    const arena = BOARD_ARENAS[this.boardTheme] ?? BOARD_ARENAS['classic-citadel'];
    this.materials.switchBoardTheme(this.boardTheme);
    this.hemiLight.color.setHex(arena.hemiSky);
    this.hemiLight.groundColor.setHex(arena.hemiGround);

    if (this.boardTheme === 'classic-citadel') {
      const theme = KINGDOM_ARENA_THEMES[this.characterSet] ?? KINGDOM_ARENA_THEMES.human;
      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.setHex(theme.bg);
      }
      this.sceneFog.color.setHex(theme.fog);
      this.keyLight.color.setHex(theme.key);
      this.fillRimLight.color.setHex(theme.fillRim);
      this.materials.boardGoldTrim.color.setHex(theme.trim);
      this.materials.waterMoat.color.setHex(theme.moat);
      this.materials.brazierFlame.color.setHex(theme.flame);
      this.materials.brazierEmber.emissive.setHex(theme.ember);
      const emberMat = this.battlefield.embers.material as THREE.PointsMaterial;
      emberMat.color.setHex(theme.flame);
      return;
    }

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.setHex(arena.bg);
    }
    this.sceneFog.color.setHex(arena.fog);
    this.keyLight.color.setHex(arena.keyLight);
    this.fillRimLight.color.setHex(arena.fillRim);
    const emberMat = this.battlefield.embers.material as THREE.PointsMaterial;
    emberMat.color.setHex(arena.flame);
  }

  public getAdaptiveTier(): AdaptivePerfTier {
    return this.adaptivePerf.tier;
  }

  private syncEffectsMotionAndQuality() {
    const baseScale = this.quality === 'high' ? 1.0 : 0.65;
    const tierScale =
      this.adaptivePerf.tier === 2 ? 0.5 : this.adaptivePerf.tier === 1 ? 0.72 : 1.0;
    this.combatEffects.setMotionAndQuality(
      this.prefersReducedMotion,
      this.quality,
      baseScale * tierScale
    );
    this.aftermath?.setShadowsEnabled(this.quality === 'high' && !this.isSoftwareGl);
    if (this.controls) {
      this.controls.enableDamping = !this.isSoftwareGl && !this.prefersReducedMotion;
    }
  }

  private handleBloodStain = (
    x: number,
    z: number,
    dirX: number,
    dirZ: number,
    intensity: number
  ) => {
    if (this.disposed || !this.activeAnim?.isCapture) return;
    this.aftermath.addImpactStainCluster({
      moveIndex: this.activeAnim.moveIndex,
      x,
      z,
      dirX,
      dirZ,
      intensity,
    });
  };

  private commitPendingCapture(anim: ActiveMoveAnim) {
    if (!anim.isCapture || !anim.defender) return;
    if (this.committedCaptureMoves.has(anim.moveIndex)) return;
    this.committedCaptureMoves.add(anim.moveIndex);
    this.aftermath.addFallenPiece({
      moveIndex: anim.moveIndex,
      color: anim.defender.color,
      type: anim.defender.type,
      characterSet: this.characterSet,
    });
    this.shadowsDirty = true;
  }

  private handleMotionChange = (e: MediaQueryListEvent) => {
    this.prefersReducedMotion = e.matches;
    this.syncEffectsMotionAndQuality();
    if (this.prefersReducedMotion) {
      this.selectedRing.scale.set(1, 1, 1);
      this.selectedRing.updateMatrix();
      this.checkRing.scale.set(1, 1, 1);
      this.checkRing.updateMatrix();
      this.highlightsGroup.updateMatrixWorld(true);
    }
  };

  private bindEvents() {
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDown);
    dom.addEventListener('pointermove', this.handlePointerMove);
    dom.addEventListener('pointerup', this.handlePointerUp);
    dom.addEventListener('pointercancel', this.handlePointerCancel);
    dom.addEventListener('wheel', this.handleWheel, { passive: true });
    window.addEventListener('pointerup', this.handleWindowPointerCleanup);
    window.addEventListener('pointercancel', this.handleWindowPointerCleanup);
    window.addEventListener('blur', this.handleWindowBlur);
    dom.addEventListener('webglcontextlost', this.handleContextLost);
    dom.addEventListener('webglcontextrestored', this.handleContextRestored);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('resize', this.handleResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.container);
    }
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion = this.motionQuery.matches;
      this.motionQuery.addEventListener('change', this.handleMotionChange);
      this.syncEffectsMotionAndQuality();
    }
  }

  private stopLoop() {
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.frameId = 0;
  }

  private handleVisibilityChange = () => {
    if (document.hidden) {
      this.isPausedHidden = true;
      this.stopLoop();
    } else {
      this.isPausedHidden = false;
      if (!this.disposed && !this.contextLost) {
        this.adaptivePerf.warmupFrames = 8;
        this.lastFrameTimeMs = 0;
        this.clock.getDelta();
        this.stopLoop();
        this.tick();
      }
    }
  };

  private handleWindowPointerCleanup = (e: PointerEvent) => {
    this.activePointers.delete(e.pointerId);
    if (e.pointerType === 'mouse') {
      this.renderer.domElement.style.cursor = 'grab';
    }
    if (this.oneFingerPan.pointerId === e.pointerId) {
      this.oneFingerPan.active = false;
      this.oneFingerPan.pointerId = -1;
    }
    if (this.pointerDownInfo?.pointerId === e.pointerId && e.target !== this.renderer.domElement) {
      this.pointerDownInfo = null;
    }
  };

  private handleWindowBlur = () => {
    this.activePointers.clear();
    this.pointerDownInfo = null;
    this.cancelOneFingerPan();
    this.renderer.domElement.style.cursor = 'grab';
  };

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.contextLost = true;
    this.stopLoop();
    this.onContextLostCallback?.();
  };

  private handleContextRestored = () => {
    this.contextLost = false;
    if (this.disposed) return;
    this.handleResize();
    if (!this.isPausedHidden) {
      this.clock.getDelta();
      this.stopLoop();
      this.tick();
    }
    this.onContextRestoredCallback?.();
  };

  private computeCameraDistances(): { defaultDist: number; minDist: number; maxDist: number } {
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    const aspect = width / height;
    const tanHalfV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5));
    const tanHalfH = tanHalfV * aspect;

    // 8x8 playable squares span [-4.6, +4.6]; stone apron + flanking Graveyard Sanctuaries
    const fitHalfWidth = 6.85;
    const minFitHalfWidth = 5.2;
    const fitHalfHeight = 7.4;
    const minFitHalfHeight = 6.0;

    const distH = fitHalfWidth / tanHalfH + 2.85;
    const distV = fitHalfHeight / tanHalfV + 2.35;
    const defaultDist = Math.max(distH, distV);

    const minDistH = minFitHalfWidth / tanHalfH + 2.3;
    const minDistV = minFitHalfHeight / tanHalfV + 1.95;
    const baseMinDist = Math.max(minDistH, minDistV, defaultDist * 0.78);
    const prevMinDist = Math.max(10.5, baseMinDist * 0.78);
    // Allow ~65% closer zoom-in than previous limit while keeping a safe clearance above pieces & board
    const minDist = Math.max(4.8, prevMinDist * 0.35);
    const maxDist = defaultDist * 1.32;

    return { defaultDist, minDist, maxDist };
  }

  private getBoardCameraPosition(side: PieceColor, distance: number, out: THREE.Vector3): THREE.Vector3 {
    const sideSign = side === 'w' ? 1 : -1;
    const horiz = Math.cos(CAMERA_PITCH_RAD) * distance;
    out.set(
      sideSign * Math.sin(CAMERA_YAW_RAD) * horiz,
      BOARD_CENTER_TARGET.y + Math.sin(CAMERA_PITCH_RAD) * distance,
      sideSign * Math.cos(CAMERA_YAW_RAD) * horiz
    );
    return out;
  }

  private cancelOneFingerPan() {
    this.oneFingerPan.active = false;
    this.oneFingerPan.pointerId = -1;
    this.oneFingerPan.pendingX = 0;
    this.oneFingerPan.pendingZ = 0;
    this.oneFingerPan.velX = 0;
    this.oneFingerPan.velZ = 0;
  }

  private applyWorldPanDelta(dx: number, dz: number) {
    if (dx === 0 && dz === 0) return;
    this.controls.target.x += dx;
    this.controls.target.z += dz;
    this.camera.position.x += dx;
    this.camera.position.z += dz;
  }

  private stepOneFingerPan(dt: number) {
    const pan = this.oneFingerPan;
    const directMode = this.prefersReducedMotion || this.isSoftwareGl;

    if (pan.active) {
      const followAlpha = directMode ? 1 : 1 - Math.exp(-44 * dt);
      const stepX = pan.pendingX * followAlpha;
      const stepZ = pan.pendingZ * followAlpha;
      pan.pendingX -= stepX;
      pan.pendingZ -= stepZ;

      if (directMode) {
        pan.velX = 0;
        pan.velZ = 0;
      } else if (dt > 0.001) {
        const instVx = THREE.MathUtils.clamp(stepX / dt, -14, 14);
        const instVz = THREE.MathUtils.clamp(stepZ / dt, -14, 14);
        const velAlpha = 1 - Math.exp(-22 * dt);
        pan.velX = THREE.MathUtils.lerp(pan.velX, instVx, velAlpha);
        pan.velZ = THREE.MathUtils.lerp(pan.velZ, instVz, velAlpha);
      }

      this.applyWorldPanDelta(stepX, stepZ);
      return;
    }

    // Finger lifted: flush micro residual and glide lightly with damped inertia
    const flushAlpha = directMode ? 1 : 1 - Math.exp(-32 * dt);
    const remX = pan.pendingX * flushAlpha;
    const remZ = pan.pendingZ * flushAlpha;
    pan.pendingX -= remX;
    pan.pendingZ -= remZ;

    if (directMode) {
      this.applyWorldPanDelta(remX, remZ);
      pan.velX = 0;
      pan.velZ = 0;
      return;
    }

    const coastX = pan.velX * dt;
    const coastZ = pan.velZ * dt;
    this.applyWorldPanDelta(remX + coastX, remZ + coastZ);

    const decay = Math.exp(-13 * dt);
    pan.velX *= decay;
    pan.velZ *= decay;
    if (Math.hypot(pan.velX, pan.velZ) < 0.03) {
      pan.velX = 0;
      pan.velZ = 0;
    }
  }

  private clampCameraPanBounds() {
    const dist = this.camera.position.distanceTo(this.controls.target);
    const { maxX, maxZ } = computeCameraPanBounds(
      dist,
      this.lastDefaultDist,
      this.controls.minDistance,
      this.controls.maxDistance
    );

    const curX = this.controls.target.x;
    const curY = this.controls.target.y;
    const curZ = this.controls.target.z;

    const clampedX = THREE.MathUtils.clamp(curX, -maxX, maxX);
    const clampedY = BOARD_CENTER_TARGET.y;
    const clampedZ = THREE.MathUtils.clamp(curZ, -maxZ, maxZ);

    const dx = clampedX - curX;
    const dy = clampedY - curY;
    const dz = clampedZ - curZ;

    if (dx !== 0 || dy !== 0 || dz !== 0) {
      this.controls.target.set(clampedX, clampedY, clampedZ);
      this.camera.position.x += dx;
      this.camera.position.y += dy;
      this.camera.position.z += dz;
      if (dx !== 0) {
        this.oneFingerPan.pendingX = 0;
        this.oneFingerPan.velX = 0;
      }
      if (dz !== 0) {
        this.oneFingerPan.pendingZ = 0;
        this.oneFingerPan.velZ = 0;
      }
    }
  }

  private handleResize = () => {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.applyPixelRatio();

    const { defaultDist, minDist, maxDist } = this.computeCameraDistances();
    const curDist = this.camera.position.distanceTo(this.controls.target);
    const ratio = this.lastDefaultDist > 0 ? curDist / this.lastDefaultDist : 1;
    this.lastDefaultDist = defaultDist;
    this.sceneFog.density = Math.min(0.014, 0.24 / defaultDist);

    this.controls.minDistance = minDist;
    this.controls.maxDistance = maxDist;
    const clampedDist = THREE.MathUtils.clamp(defaultDist * ratio, minDist, maxDist);
    this.getBoardCameraPosition(this.currentSide, clampedDist, _v1);
    _v1.sub(BOARD_CENTER_TARGET);
    this.camera.position.copy(this.controls.target).add(_v1);
    this.clampCameraPanBounds();
    if (this.cameraGlide.active) {
      this.cameraGlide.target.copy(BOARD_CENTER_TARGET);
      this.getBoardCameraPosition(this.currentSide, defaultDist, this.cameraGlide.pos);
    }
    this.controls.update();
  };

  private getTargetPixelRatio(): number {
    if (this.isSoftwareGl || this.quality !== 'high') return 1;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    return Math.min(dpr, this.isLowTierHw ? 1.1 : 1.25);
  }

  private applyPixelRatio() {
    const target = this.getTargetPixelRatio();
    if (Math.abs(this.renderer.getPixelRatio() - target) > 0.001) {
      this.renderer.setPixelRatio(target);
    }
  }

  private worldToSquare(x: number, z: number, edgeMargin = 0.04): string | null {
    const halfSpan = BOARD_SPAN * 0.5;
    if (Math.abs(x) > halfSpan + edgeMargin || Math.abs(z) > halfSpan + edgeMargin) {
      return null;
    }
    const file = THREE.MathUtils.clamp(Math.floor((x + halfSpan) / TILE_SIZE), 0, 7);
    const rank = THREE.MathUtils.clamp(7 - Math.floor((z + halfSpan) / TILE_SIZE), 0, 7);
    return `${String.fromCharCode(97 + file)}${rank + 1}`;
  }

  private findNearbyLegalTarget(x: number, z: number, maxDist = TILE_SIZE * 0.62): string | null {
    let bestSq: string | null = null;
    let bestDistSq = maxDist * maxDist;
    this.currentLegalTargets.forEach((_isCap, sq) => {
      squareToWorld(sq, _v1);
      const dx = x - _v1.x;
      const dz = z - _v1.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestSq = sq;
      }
    });
    return bestSq;
  }

  private handleWheel = () => {
    this.cameraGlide.active = false;
    this.cancelOneFingerPan();
  };

  private handlePointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) {
      if (e.button === 2) {
        this.cameraGlide.active = false;
        this.cancelOneFingerPan();
        this.renderer.domElement.style.cursor = 'grabbing';
      }
      return;
    }

    // Halt any residual inertia immediately so camera responds crisply under the new touch
    this.oneFingerPan.velX = 0;
    this.oneFingerPan.velZ = 0;
    this.oneFingerPan.pendingX = 0;
    this.oneFingerPan.pendingZ = 0;

    this.activePointers.add(e.pointerId);
    if (this.activePointers.size >= 2) {
      // Multi-touch pinch/pan gesture -> yield immediately to OrbitControls two-finger handling
      this.lastMultiTouchTime = performance.now();
      this.pointerDownInfo = null;
      this.cancelOneFingerPan();
      this.cameraGlide.active = false;
      return;
    }

    let startedOnPiece = false;
    let startedOnLegalTarget = false;
    if (e.pointerType !== 'mouse') {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointerNdc.x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      this.pointerNdc.y = -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
      this.raycaster.setFromCamera(this.pointerNdc, this.camera);

      const hasPlaneHit = this.raycaster.ray.intersectPlane(_boardPlane, _planeHit) !== null;
      const exactPlaneSq = hasPlaneHit ? this.worldToSquare(_planeHit.x, _planeHit.z, 0.04) : null;
      const hits = this.raycaster.intersectObjects(this.raycastTargets, false);

      let hitPieceSq: string | null = null;
      for (let i = 0; i < hits.length; i++) {
        const pieceSq = this.hitProxyToSquare.get(hits[i].object);
        if (pieceSq) {
          hitPieceSq = pieceSq;
          break;
        }
      }
      startedOnPiece = Boolean((exactPlaneSq && this.pieceMap.has(exactPlaneSq)) || hitPieceSq);
      startedOnLegalTarget = Boolean(exactPlaneSq && this.currentLegalTargets.has(exactPlaneSq));
    }

    this.pointerDownInfo = {
      x: e.clientX,
      y: e.clientY,
      time: performance.now(),
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      movedBeyondTap: false,
      startedOnPiece,
      startedOnLegalTarget,
    };
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (this.activePointers.size >= 2 || this.activeAnim?.isCapture) return;

    // Continue active one-finger ground-plane pan with zero latency
    if (this.oneFingerPan.active && this.oneFingerPan.pointerId === e.pointerId) {
      const dx = e.clientX - this.oneFingerPan.lastX;
      const dy = e.clientY - this.oneFingerPan.lastY;
      this.oneFingerPan.lastX = e.clientX;
      this.oneFingerPan.lastY = e.clientY;

      if (dx !== 0 || dy !== 0) {
        this.camera.updateMatrixWorld();
        const dist = this.camera.position.distanceTo(this.controls.target);
        const viewportH = this.renderer.domElement.clientHeight || window.innerHeight;
        screenDeltaToGroundPan(
          dx,
          dy,
          this.camera.matrixWorld,
          this.camera.fov,
          dist,
          viewportH,
          this._panDeltaTmp
        );
        this.oneFingerPan.pendingX += this._panDeltaTmp.x;
        this.oneFingerPan.pendingZ += this._panDeltaTmp.z;
      }
      return;
    }

    const down = this.pointerDownInfo;
    if (!down || down.pointerId !== e.pointerId) return;

    const dist = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const heldMs = performance.now() - down.time;

    if (down.pointerType === 'mouse') {
      if (dist > 8) {
        down.movedBeyondTap = true;
        this.cameraGlide.active = false;
        this.renderer.domElement.style.cursor = 'grabbing';
      }
      return;
    }

    // Touch gesture separation:
    // - Piece touches stay strictly reserved for chess selection/capture (never trigger pan).
    // - Empty battlefield / board touches smoothly enter one-finger pan once past tap deadzone.
    if (down.startedOnPiece) {
      if (dist > 22) {
        down.movedBeyondTap = true;
      }
      return;
    }

    const panEngageThreshold = down.startedOnLegalTarget
      ? heldMs >= 150
        ? 7
        : 13
      : heldMs >= 110
      ? 5
      : 8;

    if (dist > panEngageThreshold) {
      down.movedBeyondTap = true;
      this.cameraGlide.active = false;
      this.oneFingerPan.active = true;
      this.oneFingerPan.pointerId = e.pointerId;
      // Anchor at exact current coordinate so crossing the threshold produces 0px camera snap
      this.oneFingerPan.lastX = e.clientX;
      this.oneFingerPan.lastY = e.clientY;
      this.oneFingerPan.pendingX = 0;
      this.oneFingerPan.pendingZ = 0;
      this.oneFingerPan.velX = 0;
      this.oneFingerPan.velZ = 0;
    }
  };

  private handlePointerCancel = (e: PointerEvent) => {
    const wasMulti = this.activePointers.size >= 2;
    this.activePointers.delete(e.pointerId);
    if (wasMulti) {
      this.lastMultiTouchTime = performance.now();
    }
    if (e.pointerType === 'mouse') {
      this.renderer.domElement.style.cursor = 'grab';
    }
    if (this.oneFingerPan.pointerId === e.pointerId) {
      this.oneFingerPan.active = false;
      this.oneFingerPan.pointerId = -1;
    }
    if (this.pointerDownInfo?.pointerId === e.pointerId) {
      this.pointerDownInfo = null;
    }
  };

  private handlePointerUp = (e: PointerEvent) => {
    const wasMulti = this.activePointers.size >= 2;
    this.activePointers.delete(e.pointerId);
    if (e.pointerType === 'mouse') {
      this.renderer.domElement.style.cursor = 'grab';
    }
    if (this.oneFingerPan.pointerId === e.pointerId) {
      this.oneFingerPan.active = false;
      this.oneFingerPan.pointerId = -1;
    }
    const down = this.pointerDownInfo;
    this.pointerDownInfo = null;

    if (wasMulti || this.activePointers.size > 0) {
      this.lastMultiTouchTime = performance.now();
      return;
    }
    if (!down || down.pointerId !== e.pointerId) return;
    if (down.movedBeyondTap) return;

    const now = performance.now();
    // Guard against accidental hardware touch bounce immediately after multi-touch gestures
    if (down.time - this.lastMultiTouchTime < 140) return;

    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    const dist = Math.hypot(dx, dy);
    const dt = now - down.time;

    const maxTapDist = down.pointerType === 'mouse' ? 8 : 22;
    if (dist > maxTapDist || dt > 650) return;
    if (this.activeAnim) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);

    const hasPlaneHit = this.raycaster.ray.intersectPlane(_boardPlane, _planeHit) !== null;
    const exactPlaneSq = hasPlaneHit ? this.worldToSquare(_planeHit.x, _planeHit.z, 0.04) : null;
    const paddedPlaneSq = hasPlaneHit ? this.worldToSquare(_planeHit.x, _planeHit.z, 0.24) : null;

    const hits = this.raycaster.intersectObjects(this.raycastTargets, false);
    let firstPieceSq: string | null = null;
    let firstLegalPieceSq: string | null = null;
    let firstTileSq: string | null = null;
    for (let i = 0; i < hits.length; i++) {
      const obj = hits[i].object;
      const pieceSq = this.hitProxyToSquare.get(obj);
      if (pieceSq) {
        if (!firstPieceSq) firstPieceSq = pieceSq;
        if (!firstLegalPieceSq && this.currentLegalTargets.has(pieceSq)) {
          firstLegalPieceSq = pieceSq;
        }
      }
      if (!firstTileSq) {
        const tileSq = obj.userData.square as string | undefined;
        if (tileSq) firstTileSq = tileSq;
      }
    }

    // When a piece is already selected, tapping ANYWHERE on a legal destination tile moves immediately
    if (this.currentSelectedSquare) {
      if (exactPlaneSq && this.currentLegalTargets.has(exactPlaneSq)) {
        this.onSquareTapCallback(exactPlaneSq);
        return;
      }
      if (firstTileSq && this.currentLegalTargets.has(firstTileSq)) {
        this.onSquareTapCallback(firstTileSq);
        return;
      }
      if (firstLegalPieceSq) {
        this.onSquareTapCallback(firstLegalPieceSq);
        return;
      }
      if (
        paddedPlaneSq &&
        this.currentLegalTargets.has(paddedPlaneSq) &&
        !(exactPlaneSq && this.pieceMap.has(exactPlaneSq))
      ) {
        this.onSquareTapCallback(paddedPlaneSq);
        return;
      }
      if (hasPlaneHit && !(exactPlaneSq && this.pieceMap.has(exactPlaneSq))) {
        const nearbyLegalSq = this.findNearbyLegalTarget(_planeHit.x, _planeHit.z, TILE_SIZE * 0.62);
        if (nearbyLegalSq) {
          this.onSquareTapCallback(nearbyLegalSq);
          return;
        }
      }

      const fallbackSq =
        (exactPlaneSq && this.pieceMap.has(exactPlaneSq) ? exactPlaneSq : null) ??
        exactPlaneSq ??
        firstTileSq ??
        firstPieceSq;
      if (fallbackSq) {
        this.onSquareTapCallback(fallbackSq);
      }
      return;
    }

    // No piece selected yet: prefer the piece standing on the tapped tile, then 3D piece hit, then padded border
    const resolvedSquare =
      (exactPlaneSq && this.pieceMap.has(exactPlaneSq) ? exactPlaneSq : null) ??
      firstPieceSq ??
      (paddedPlaneSq && this.pieceMap.has(paddedPlaneSq) ? paddedPlaneSq : null) ??
      exactPlaneSq ??
      firstTileSq;
    if (resolvedSquare) {
      this.onSquareTapCallback(resolvedSquare);
    }
  };

  private rebuildRaycastTargets() {
    this.raycastTargets.length = 0;
    for (let i = 0; i < this.battlefield.tileHitMeshes.length; i++) {
      this.raycastTargets.push(this.battlefield.tileHitMeshes[i]);
    }
    this.hitProxyToSquare.forEach((_sq, proxy) => {
      this.raycastTargets.push(proxy);
    });
  }

  public setShowCoordinates(show: boolean) {
    this.battlefield.coordGroup.visible = show;
    this.battlefield.coordGroup.updateMatrixWorld(true);
  }

  public setQuality(quality: GraphicsQuality) {
    this.quality = quality;
    this.syncEffectsMotionAndQuality();
    if (this.isSoftwareGl) return;
    const high = quality === 'high';
    this.renderer.shadowMap.enabled = high;
    this.keyLight.castShadow = high;
    if (high) {
      this.lastShadowUpdateMs = 0;
      this.shadowsDirty = true;
    }
    this.applyPixelRatio();
  }

  public abortActiveAnimation(invokeCallback = false) {
    const anim = this.activeAnim;
    if (!anim) return;

    if (invokeCallback && anim.isCapture && anim.defender) {
      this.commitPendingCapture(anim);
    }

    if (anim.duelCtx) {
      this.camera.position.copy(anim.duelCtx.savedCamPos);
      this.controls.target.copy(anim.duelCtx.savedTarget);
      this.controls.update();
      this.clampCameraPanBounds();
    }

    const done = anim.onComplete;
    anim.duelCtx = null;
    anim.defender = null;
    anim.rookRig = null;
    this.activeAnim = null;
    this.controls.enabled = true;

    if (invokeCallback) {
      done();
    }
  }

  /**
   * Completely clears active animations, combat effects, piece rigs/pools, highlights,
   * fallen graveyard corpses, persistent blood stains, and input state before rebuilding.
   */
  public resetGame(side: PieceColor, initialPieces?: BoardPiece[]) {
    if (this.disposed) return;

    this.matchEpoch++;
    this.abortActiveAnimation(false);
    this.controls.enabled = true;
    this.cancelOneFingerPan();
    this.combatEffects.clearActive();
    this.aftermath.clear();
    this.committedCaptureMoves.clear();
    this.cameraGlide.active = false;
    this.pointerDownInfo = null;
    this.activePointers.clear();

    for (let i = 0; i < this.activeRigs.length; i++) {
      const geos = this.activeRigs[i].disposableGeos;
      for (let j = 0; j < geos.length; j++) geos[j].dispose();
    }
    for (let i = 0; i < this.rigPool.length; i++) {
      const geos = this.rigPool[i].disposableGeos;
      for (let j = 0; j < geos.length; j++) geos[j].dispose();
    }

    this.piecesGroup.clear();
    this.activeRigs.length = 0;
    this.rigPool.length = 0;
    this.pieceMap.clear();
    this.hitProxyToSquare.clear();
    this.raycastTargets.length = 0;
    this.lastBoardPieces = [];

    this.updateHighlights({
      selectedSquare: null,
      legalTargets: [],
      lastMove: null,
      checkSquare: null,
    });
    this.rebuildRaycastTargets();

    if (initialPieces && initialPieces.length > 0) {
      this.syncBoard(initialPieces);
    }
    this.resetCamera(side, true);
    this.lastShadowUpdateMs = 0;
    this.shadowsDirty = true;
  }

  public rollbackAftermathToMove(maxMoveIndex: number) {
    if (this.disposed) return;
    for (const moveIdx of this.committedCaptureMoves) {
      if (moveIdx > maxMoveIndex) {
        this.committedCaptureMoves.delete(moveIdx);
      }
    }
    this.aftermath.rollbackToMove(maxMoveIndex);
    this.shadowsDirty = true;
  }

  public setCharacterSet(nextSet: CharacterSetId) {
    if (nextSet === this.characterSet || this.disposed) return;

    this.matchEpoch++;
    this.abortActiveAnimation(true);
    this.combatEffects.clearActive();

    for (let i = 0; i < this.activeRigs.length; i++) {
      const geos = this.activeRigs[i].disposableGeos;
      for (let j = 0; j < geos.length; j++) geos[j].dispose();
    }
    for (let i = 0; i < this.rigPool.length; i++) {
      const geos = this.rigPool[i].disposableGeos;
      for (let j = 0; j < geos.length; j++) geos[j].dispose();
    }

    this.piecesGroup.clear();
    this.activeRigs.length = 0;
    this.rigPool.length = 0;
    this.pieceMap.clear();
    this.hitProxyToSquare.clear();
    this.raycastTargets.length = 0;

    this.characterSet = nextSet;
    this.materials.switchCharacterSet(nextSet);
    this.applyArenaAtmosphere();
    this.aftermath.rebuildForCharacterSet(nextSet);

    if (this.lastBoardPieces.length > 0) {
      this.syncBoard(this.lastBoardPieces);
    }
    this.lastShadowUpdateMs = 0;
    this.shadowsDirty = true;
  }

  public setPieceSkin(nextSkin: PieceSkinId) {
    if (nextSkin === this.pieceSkin || this.disposed) return;
    this.pieceSkin = nextSkin;
    this.materials.switchPieceSkin(nextSkin);
    this.lastShadowUpdateMs = 0;
    this.shadowsDirty = true;
  }

  public setBoardTheme(nextTheme: BoardThemeId) {
    if (nextTheme === this.boardTheme || this.disposed) return;
    this.boardTheme = nextTheme;
    this.applyArenaAtmosphere();
    this.lastShadowUpdateMs = 0;
    this.shadowsDirty = true;
  }

  public triggerCheckEffect(square: string) {
    if (this.disposed || this.prefersReducedMotion || !square) return;
    squareToWorld(square, _v1);
    this.combatEffects.spawnCheckPulse(_v1);
  }

  public triggerOutcomeEffect(
    kind: 'checkmate' | 'victory' | 'defeat' | 'draw',
    square?: string | null
  ) {
    if (this.disposed || this.prefersReducedMotion) return;
    if (square) {
      squareToWorld(square, _v1);
    } else {
      _v1.set(0, 0, 0);
    }
    const accentNum = parseInt(CHARACTER_SETS[this.characterSet].accentHex.replace('#', ''), 16);
    this.combatEffects.spawnOutcomeBurst(
      _v1,
      kind,
      Number.isFinite(accentNum) ? accentNum : undefined
    );
  }

  public resetCamera(side: PieceColor, immediate = false) {
    this.cancelOneFingerPan();
    this.currentSide = side;
    const { defaultDist, minDist, maxDist } = this.computeCameraDistances();
    this.lastDefaultDist = defaultDist;
    this.sceneFog.density = Math.min(0.014, 0.24 / defaultDist);
    this.controls.minDistance = minDist;
    this.controls.maxDistance = maxDist;

    if (immediate) {
      this.controls.target.copy(BOARD_CENTER_TARGET);
      this.getBoardCameraPosition(side, defaultDist, this.camera.position);
      this.controls.update();
      this.cameraGlide.active = false;
    } else {
      this.cameraGlide.target.copy(BOARD_CENTER_TARGET);
      this.getBoardCameraPosition(side, defaultDist, this.cameraGlide.pos);
      this.cameraGlide.active = true;
    }
  }

  public adjustZoom(factor: number) {
    this.cameraGlide.active = false;
    this.cancelOneFingerPan();
    _v1.copy(this.camera.position).sub(this.controls.target);
    const dist = _v1.length();
    const newDist = THREE.MathUtils.clamp(
      dist * factor,
      this.controls.minDistance,
      this.controls.maxDistance
    );
    _v1.setLength(newDist).add(this.controls.target);
    this.camera.position.copy(_v1);
    this.clampCameraPanBounds();
    this.controls.update();
  }

  /**
   * Smoothly zooms in onto the selected character within safe battlefield pan bounds.
   */
  public focusCharacter(square: string) {
    this.cancelOneFingerPan();
    const { minDist, maxDist, defaultDist } = this.computeCameraDistances();
    this.lastDefaultDist = defaultDist;
    this.controls.minDistance = minDist;
    this.controls.maxDistance = maxDist;

    const bounds = computeCameraPanBounds(minDist, defaultDist, minDist, maxDist);
    let targetX = BOARD_CENTER_TARGET.x;
    let targetZ = BOARD_CENTER_TARGET.z;
    if (square) {
      squareToWorld(square, _v1);
      targetX = THREE.MathUtils.clamp(_v1.x, -bounds.maxX, bounds.maxX);
      targetZ = THREE.MathUtils.clamp(_v1.z, -bounds.maxZ, bounds.maxZ);
    }

    this.cameraGlide.target.set(targetX, BOARD_CENTER_TARGET.y, targetZ);
    this.getBoardCameraPosition(this.currentSide, minDist, _v2);
    this.cameraGlide.pos.set(_v2.x + targetX, _v2.y, _v2.z + targetZ);
    this.cameraGlide.active = true;
  }

  public updateHighlights(params: {
    selectedSquare: string | null;
    legalTargets: Array<{ square: string; isCapture: boolean }>;
    lastMove: { from: string; to: string } | null;
    checkSquare: string | null;
  }) {
    this.currentSelectedSquare = params.selectedSquare;
    this.currentLegalTargets.clear();
    for (let i = 0; i < params.legalTargets.length; i++) {
      const t = params.legalTargets[i];
      this.currentLegalTargets.set(t.square, t.isCapture);
    }

    if (params.selectedSquare) {
      squareToWorld(params.selectedSquare, _v1);
      this.selectedRing.position.set(_v1.x, 0.022, _v1.z);
      this.selectedRing.visible = true;
    } else {
      this.selectedRing.visible = false;
      this.selectedRing.scale.set(1, 1, 1);
    }

    if (params.checkSquare) {
      squareToWorld(params.checkSquare, _v1);
      this.checkRing.position.set(_v1.x, 0.024, _v1.z);
      this.checkRing.visible = true;
    } else {
      this.checkRing.visible = false;
    }

    if (params.lastMove) {
      squareToWorld(params.lastMove.from, _v1);
      this.lastMoveMeshes[0].position.set(_v1.x, 0.012, _v1.z);
      this.lastMoveMeshes[0].visible = true;
      squareToWorld(params.lastMove.to, _v1);
      this.lastMoveMeshes[1].position.set(_v1.x, 0.012, _v1.z);
      this.lastMoveMeshes[1].visible = true;
    } else {
      this.lastMoveMeshes[0].visible = false;
      this.lastMoveMeshes[1].visible = false;
    }

    let quietIdx = 0;
    let capIdx = 0;
    for (let i = 0; i < params.legalTargets.length; i++) {
      const target = params.legalTargets[i];
      squareToWorld(target.square, _v1);
      if (target.isCapture) {
        if (capIdx < this.legalCaptureMeshes.length) {
          const m = this.legalCaptureMeshes[capIdx++];
          m.position.set(_v1.x, 0.02, _v1.z);
          m.visible = true;
        }
      } else {
        if (quietIdx < this.legalMoveMeshes.length) {
          const m = this.legalMoveMeshes[quietIdx++];
          m.position.set(_v1.x, 0.018, _v1.z);
          m.visible = true;
        }
      }
    }
      for (let i = quietIdx; i < this.legalMoveMeshes.length; i++) {
      this.legalMoveMeshes[i].visible = false;
    }
    for (let i = capIdx; i < this.legalCaptureMeshes.length; i++) {
      this.legalCaptureMeshes[i].visible = false;
    }

    this.selectedRing.updateMatrix();
    this.checkRing.updateMatrix();
    this.lastMoveMeshes[0].updateMatrix();
    this.lastMoveMeshes[1].updateMatrix();
    for (let i = 0; i < quietIdx; i++) this.legalMoveMeshes[i].updateMatrix();
    for (let i = 0; i < capIdx; i++) this.legalCaptureMeshes[i].updateMatrix();
    this.highlightsGroup.updateMatrixWorld(true);
  }

  private setRigMatrixAutoUpdate(rig: CharacterRig, enabled: boolean) {
    rig.root.traverse((obj) => {
      obj.matrixAutoUpdate = enabled;
    });
    if (!enabled) {
      rig.root.updateMatrixWorld(true);
    }
  }

  private resetRigPose(rig: CharacterRig) {
    const homeAngle = rig.color === 'w' ? Math.PI : 0;
    rig.root.visible = true;
    rig.root.scale.setScalar(1);
    rig.root.position.y = 0;
    rig.contactShadow.position.set(0, 0.004, 0);
    rig.body.rotation.order = 'XYZ';
    rig.body.position.set(0, rig.baseY, 0);
    rig.body.rotation.set(0, homeAngle, 0);
    rig.torso.rotation.order = 'XYZ';
    rig.torso.position.y = rig.torsoBaseY;
    rig.torso.rotation.set(0, 0, 0);
    rig.head.rotation.set(0, 0, 0);
    rig.rightArm.rotation.set(-0.28, 0, -0.12);
    rig.leftArm.rotation.set(-0.25, 0, 0.12);
    for (let i = 0; i < rig.legs.length; i++) {
      rig.legs[i].rotation.x = 0;
    }
    if (rig.cape) {
      rig.cape.rotation.set(0.12, 0, 0);
    }
    if (rig.crystal) {
      rig.crystal.scale.setScalar(0.92);
      rig.crystal.rotation.set(0, 0, 0);
    }
    if (rig.horse) {
      for (let i = 0; i < rig.horse.legs.length; i++) {
        rig.horse.legs[i].rotation.x = 0;
      }
      rig.horse.neck.rotation.x = 0;
      rig.horse.tail.rotation.set(0, 0, 0);
    }
    rig.root.updateMatrixWorld(true);
    this.setRigMatrixAutoUpdate(rig, false);
  }

  private takeFromPool(color: PieceColor, type: PieceType): CharacterRig | null {
    for (let i = 0; i < this.rigPool.length; i++) {
      const rig = this.rigPool[i];
      if (rig.color === color && rig.type === type) {
        this.rigPool.splice(i, 1);
        return rig;
      }
    }
    return null;
  }

  /**
   * Reuses persistent CharacterRigs across moves/undo/restart instead of destroying and rebuilding 32 human meshes!
   */
  public syncBoard(pieces: BoardPiece[]) {
    this.lastBoardPieces = pieces;
    const prevBySquare = this.pieceMap;
    const nextPieceMap = this._sparePieceMap;
    const nextHitProxy = this._spareHitProxy;
    const unmatchedPieces = this._unmatchedPieces;
    const leftoverActive = this._leftoverActive;

    nextPieceMap.clear();
    nextHitProxy.clear();
    unmatchedPieces.length = 0;
    leftoverActive.length = 0;
    this.activeRigs.length = 0;

    // Pass 1: Keep rigs whose square, color, and type did not change
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      const existing = prevBySquare.get(p.square);
      if (existing && existing.color === p.color && existing.type === p.type) {
        prevBySquare.delete(p.square);
        squareToWorld(p.square, _v1);
        existing.root.position.copy(_v1);
        this.resetRigPose(existing);
        if (!existing.root.parent) {
          this.piecesGroup.add(existing.root);
        }
        nextPieceMap.set(p.square, existing);
        nextHitProxy.set(existing.hitProxy, p.square);
        this.activeRigs.push(existing);
      } else {
        unmatchedPieces.push(p);
      }
    }

    const needFullRebuild =
      unmatchedPieces.length > 0 || prevBySquare.size > 0 || this.raycastTargets.length === 0;

    if (needFullRebuild) {
      // Collect remaining previous rigs into an available list
      for (const unused of prevBySquare.values()) {
        leftoverActive.push(unused);
      }
      prevBySquare.clear();

      // Pass 2: Match moved pieces, undo restorations, or pooled captured pieces
      for (let i = 0; i < unmatchedPieces.length; i++) {
        const p = unmatchedPieces[i];
        let rig: CharacterRig | null = null;

        for (let j = 0; j < leftoverActive.length; j++) {
          const candidate = leftoverActive[j];
          if (candidate.color === p.color && candidate.type === p.type) {
            leftoverActive.splice(j, 1);
            rig = candidate;
            break;
          }
        }

        if (!rig) {
          rig = this.takeFromPool(p.color, p.type);
        }

        if (!rig) {
          rig = createCharacterPiece(
            p.type,
            p.color,
            this.charGeos,
            this.materials,
            Math.random() * Math.PI * 2,
            this.characterSet
          );
          if (this.gltfProvider.hasModel(p.color, p.type)) {
            const targetSq = p.square;
            const targetRig = rig;
            const loadEpoch = this.matchEpoch;
            void this.gltfProvider.loadCharacterModel(p.color, p.type).then((gltf) => {
              if (!gltf || this.disposed || loadEpoch !== this.matchEpoch) return;
              if (this.pieceMap.get(targetSq) !== targetRig) return;
              const clone = gltf.scene.clone();
              targetRig.body.clear();
              targetRig.body.add(clone);
              this.setRigMatrixAutoUpdate(targetRig, false);
            });
          }
        }

        squareToWorld(p.square, _v1);
        rig.root.position.copy(_v1);
        this.resetRigPose(rig);
        if (!rig.root.parent) {
          this.piecesGroup.add(rig.root);
        }
        nextPieceMap.set(p.square, rig);
        nextHitProxy.set(rig.hitProxy, p.square);
        this.activeRigs.push(rig);
      }

      // Pass 3: Return captured/unreferenced rigs to pool (hidden, never destroyed!)
      for (let i = 0; i < leftoverActive.length; i++) {
        const unused = leftoverActive[i];
        unused.root.visible = false;
        this.piecesGroup.remove(unused.root);
        this.rigPool.push(unused);
      }
      leftoverActive.length = 0;
    }

    // Swap active maps in-place (zero Map allocation per move)
    this.pieceMap = nextPieceMap;
    this._sparePieceMap = prevBySquare;
    this._sparePieceMap.clear();

    const oldHitProxy = this.hitProxyToSquare;
    this.hitProxyToSquare = nextHitProxy;
    this._spareHitProxy = oldHitProxy;
    this._spareHitProxy.clear();

    if (needFullRebuild) {
      this.rebuildRaycastTargets();
    }
    this.shadowsDirty = true;
  }

  public playMoveAnimation(payload: MoveAnimationPayload, onComplete: () => void) {
    if (this.activeAnim) {
      this.abortActiveAnimation(false);
    }
    const attacker = this.pieceMap.get(payload.from);
    if (!attacker) {
      onComplete();
      return;
    }

    const capturedSq = payload.capturedSquare ?? payload.to;
    const defender = payload.captured ? this.pieceMap.get(capturedSq) ?? null : null;
    const rookRig = payload.rookFrom ? this.pieceMap.get(payload.rookFrom) ?? null : null;

    const moveIndex = payload.moveIndex ?? ++this.fallbackCaptureSeq;

    if (!this.reusableMoveAnim) {
      this.reusableMoveAnim = {
        moveIndex,
        payload,
        attacker,
        defender,
        rookRig,
        fromPos: new THREE.Vector3(),
        toPos: new THREE.Vector3(),
        rookFromPos: new THREE.Vector3(),
        rookToPos: new THREE.Vector3(),
        elapsed: 0,
        duration: 0.36,
        isCapture: false,
        duelCtx: null,
        onComplete,
      };
    }

    const anim = this.reusableMoveAnim;
    anim.moveIndex = moveIndex;
    anim.payload = payload;
    anim.attacker = attacker;
    anim.defender = defender;
    anim.rookRig = rookRig;
    anim.elapsed = 0;
    anim.onComplete = onComplete;

    squareToWorld(payload.from, anim.fromPos);
    squareToWorld(payload.to, anim.toPos);

    if (payload.rookFrom) {
      squareToWorld(payload.rookFrom, anim.rookFromPos);
    } else {
      anim.rookFromPos.set(0, 0, 0);
    }
    if (payload.rookTo) {
      squareToWorld(payload.rookTo, anim.rookToPos);
    } else {
      anim.rookToPos.set(0, 0, 0);
    }

    const isCapture = Boolean(defender);
    anim.isCapture = isCapture;
    anim.duration = isCapture ? getCombatDuration(payload.piece, this.characterSet) : 0.36;

    if (isCapture && defender) {
      if (!this.reusableDuelCtx) {
        this.reusableDuelCtx = {
          payload,
          attacker,
          defender,
          fromPos: anim.fromPos,
          toPos: anim.toPos,
          capturedPos: new THREE.Vector3(),
          duelSpot: new THREE.Vector3(),
          normDir: new THREE.Vector3(),
          sidePerp: new THREE.Vector3(),
          travelAngle: 0,
          homeAngle: 0,
          firedCues: new Set<string>(),
          shakeIntensity: 0,
          savedCamPos: new THREE.Vector3(),
          savedTarget: new THREE.Vector3(),
          claimStartPos: new THREE.Vector3(),
          hasClaimStart: false,
          characterSet: this.characterSet,
          defenderClass: payload.captured,
          onBloodStain: this.handleBloodStain,
        };
      }
      const dCtx = this.reusableDuelCtx;
      dCtx.payload = payload;
      dCtx.attacker = attacker;
      dCtx.defender = defender;
      dCtx.fromPos = anim.fromPos;
      dCtx.toPos = anim.toPos;
      squareToWorld(capturedSq, dCtx.capturedPos);
      dCtx.characterSet = this.characterSet;
      dCtx.defenderClass = payload.captured;
      dCtx.onBloodStain = this.handleBloodStain;

      _v1.copy(anim.toPos).sub(anim.fromPos);
      const dist = _v1.length();
      if (dist > 0.001) {
        dCtx.normDir.copy(_v1).multiplyScalar(1 / dist);
      } else {
        dCtx.normDir.set(0, 0, 1);
      }
      dCtx.duelSpot.copy(anim.toPos).addScaledVector(dCtx.normDir, -Math.min(0.94, dist * 0.72));

      _v2.lerpVectors(anim.fromPos, anim.toPos, 0.72);
      dCtx.sidePerp.set(-dCtx.normDir.z, 0, dCtx.normDir.x);
      _v3.copy(this.camera.position).sub(_v2);
      if (dCtx.sidePerp.dot(_v3) < 0) dCtx.sidePerp.negate();

      dCtx.savedCamPos.copy(this.camera.position);
      dCtx.savedTarget.copy(this.controls.target);
      dCtx.travelAngle = Math.atan2(anim.toPos.x - anim.fromPos.x, anim.toPos.z - anim.fromPos.z);
      dCtx.homeAngle = payload.color === 'w' ? Math.PI : 0;
      dCtx.firedCues.clear();
      dCtx.shakeIntensity = 0;
      dCtx.claimStartPos.set(0, 0, 0);
      dCtx.hasClaimStart = false;

      anim.duelCtx = dCtx;
    } else {
      anim.duelCtx = null;
    }

    this.cameraGlide.active = false;
    if (isCapture) {
      this.cancelOneFingerPan();
      this.controls.enabled = false;
    }
    this.setRigMatrixAutoUpdate(attacker, true);
    if (defender) this.setRigMatrixAutoUpdate(defender, true);
    if (rookRig) this.setRigMatrixAutoUpdate(rookRig, true);
    this.activeAnim = anim;
    this.lastShadowUpdateMs = 0;
    this.shadowsDirty = true;
  }

  private updateActiveAnimation(dt: number) {
    const anim = this.activeAnim;
    if (!anim) return;

    anim.elapsed += dt;
    const p = Math.min(anim.elapsed / anim.duration, 1);

    const { attacker, defender, rookRig, payload } = anim;
    const dx = anim.toPos.x - anim.fromPos.x;
    const dz = anim.toPos.z - anim.fromPos.z;
    const travelAngle = Math.atan2(dx, dz);
    const homeAngle = payload.color === 'w' ? Math.PI : 0;

    if (!anim.isCapture) {
      const ease = 1 - Math.pow(1 - p, 3);
      attacker.root.position.lerpVectors(anim.fromPos, anim.toPos, ease);

      if (attacker.type === 'n') {
        attacker.root.position.y = Math.sin(p * Math.PI) * 0.75;
        if (attacker.horse) {
          for (let i = 0; i < attacker.horse.legs.length; i++) {
            attacker.horse.legs[i].rotation.x =
              Math.sin(p * Math.PI * 3 + (i < 2 ? 0 : Math.PI)) * 0.52;
          }
        }
      } else {
        attacker.root.position.y = Math.sin(p * Math.PI) * 0.14;
        for (let i = 0; i < attacker.legs.length; i++) {
          attacker.legs[i].rotation.x = Math.sin(p * Math.PI * 4 + i * Math.PI) * 0.42;
        }
      }

      const rotAlpha = 1 - Math.exp(-16 * dt);
      if (p < 0.78) {
        attacker.body.rotation.y = shortestAngleLerp(attacker.body.rotation.y, travelAngle, rotAlpha);
      } else {
        attacker.body.rotation.y = shortestAngleLerp(attacker.body.rotation.y, homeAngle, rotAlpha);
      }
      attacker.contactShadow.position.y = -attacker.root.position.y + 0.004;

      if (rookRig) {
        rookRig.root.position.lerpVectors(anim.rookFromPos, anim.rookToPos, ease);
        rookRig.root.position.y = Math.sin(p * Math.PI) * 0.12;
        rookRig.contactShadow.position.y = -rookRig.root.position.y + 0.004;
      }
    } else if (anim.duelCtx) {
      updateCombatDuel(
        anim.duelCtx,
        p,
        dt,
        this.combatEffects,
        this.camera,
        this.controls.target,
        this.triggerCombatSound
      );
    }

    if (p >= 1 || this.adaptivePerf.tier < 2) {
      this.shadowsDirty = true;
    }

    if (p >= 1) {
      attacker.root.position.copy(anim.toPos);
      this.resetRigPose(attacker);

      if (rookRig) {
        rookRig.root.position.copy(anim.rookToPos);
        this.resetRigPose(rookRig);
      }

      if (defender) {
        this.commitPendingCapture(anim);
        defender.root.visible = false;
        if (defender.root.parent) {
          this.piecesGroup.remove(defender.root);
        }
      }

      // Sync pieceMap & activeRigs immediately for non-promotion moves so syncBoard takes the O(N) zero-churn fast path
      if (!payload.promotion) {
        const capturedSq = payload.capturedSquare ?? payload.to;
        if (defender) {
          this.pieceMap.delete(capturedSq);
          this.hitProxyToSquare.delete(defender.hitProxy);
          const defIdx = this.activeRigs.indexOf(defender);
          if (defIdx !== -1) this.activeRigs.splice(defIdx, 1);
          this.rigPool.push(defender);
        }
        this.pieceMap.delete(payload.from);
        this.pieceMap.set(payload.to, attacker);
        this.hitProxyToSquare.set(attacker.hitProxy, payload.to);

        if (rookRig && payload.rookFrom && payload.rookTo) {
          this.pieceMap.delete(payload.rookFrom);
          this.pieceMap.set(payload.rookTo, rookRig);
          this.hitProxyToSquare.set(rookRig.hitProxy, payload.rookTo);
        }
        this.rebuildRaycastTargets();
      }

      if (payload.promotion) {
        const promoColor = payload.color === 'w' ? 0xfde047 : 0xc084fc;
        _v1.copy(anim.toPos).setY(0.95);
        this.combatEffects.spawnImpactFlash(_v1, promoColor, 1.85);
        this.combatEffects.spawnShockwave(anim.toPos, promoColor, 2.8, 0.16);
        this.combatEffects.spawnSparks(_v1, 0xfef08a, 14);
      }

      if (anim.duelCtx) {
        this.camera.position.copy(anim.duelCtx.savedCamPos);
        this.controls.target.copy(anim.duelCtx.savedTarget);
        this.controls.update();
        this.clampCameraPanBounds();
      }

      const done = anim.onComplete;
      anim.duelCtx = null;
      anim.defender = null;
      anim.rookRig = null;
      this.activeAnim = null;
      this.controls.enabled = true;
      done();
    }
  }

  private updateEnvironment(elapsed: number, dt: number) {
    if (!this.prefersReducedMotion) {
      const envInterval =
        this.quality === 'high' && this.adaptivePerf.tier === 0
          ? 0
          : this.adaptivePerf.tier === 2
            ? 1 / 15
            : 1 / 28;
      this.envAccumDt += dt;

      if (envInterval === 0 || this.envAccumDt >= envInterval) {
        const stepDt = this.envAccumDt;
        this.envAccumDt = 0;

        this.materials.waterNormalMap.offset.x =
          (this.materials.waterNormalMap.offset.x + stepDt * 0.015) % 1;
        this.materials.waterNormalMap.offset.y =
          (this.materials.waterNormalMap.offset.y + stepDt * 0.01) % 1;

        const flameInst = this.battlefield.brazierFlameInst;
        const flameSpecs = this.battlefield.brazierFlameSpecs;
        for (let i = 0; i < flameSpecs.length; i++) {
          const spec = flameSpecs[i];
          const f = 1 + Math.sin(elapsed * 9.5 + i * 1.7) * 0.13;
          _flameDummy.position.set(spec.x, spec.y, spec.z);
          _flameDummy.rotation.set(0, elapsed * 1.8 + i, 0);
          _flameDummy.scale.set(spec.scaleXZ * f, spec.scaleY * f, spec.scaleXZ * f);
          _flameDummy.updateMatrix();
          flameInst.setMatrixAt(i, _flameDummy.matrix);
        }
        flameInst.instanceMatrix.needsUpdate = true;

        const posAttr = this.battlefield.embers.geometry.getAttribute(
          'position'
        ) as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const vels = this.battlefield.emberVelocities;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i] += vels[i] * stepDt + Math.sin(elapsed + i) * 0.002;
          arr[i + 1] += vels[i + 1] * stepDt;
          arr[i + 2] += vels[i + 2] * stepDt;
          if (arr[i + 1] > 6.0) {
            arr[i] = (Math.random() - 0.5) * 16;
            arr[i + 1] = 0.2;
            arr[i + 2] = (Math.random() - 0.5) * 16;
          }
        }
        posAttr.needsUpdate = true;
      }

      if (this.selectedRing.visible) {
        const sp = 1 + Math.sin(elapsed * 4.2) * 0.045;
        this.selectedRing.scale.set(sp, sp, 1);
        this.selectedRing.updateMatrix();
        this.selectedRing.updateMatrixWorld(true);
      }

      if (this.checkRing.visible) {
        const s = 1 + Math.sin(elapsed * 5.2) * 0.08;
        this.checkRing.scale.set(s, s, 1);
        this.checkRing.updateMatrix();
        this.checkRing.updateMatrixWorld(true);
      }
    }

    this.combatEffects.update(dt);
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed || this.contextLost || this.isPausedHidden) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.disposed || this.contextLost || this.isPausedHidden) return;

    const tickStart = performance.now();
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    if (!this.isSoftwareGl && !this.prefersReducedMotion && this.lastFrameTimeMs > 0) {
      const prevTier = this.adaptivePerf.tier;
      const nextTier = stepAdaptivePerfTier(this.adaptivePerf, tickStart - this.lastFrameTimeMs, dt);
      if (nextTier !== prevTier) {
        this.syncEffectsMotionAndQuality();
      }
    }
    this.lastFrameTimeMs = tickStart;

    if (this.activeAnim) {
      this.updateActiveAnimation(dt);
    }
    this.updateEnvironment(elapsed, dt);

    if (this.cameraGlide.active && !this.activeAnim) {
      const alpha = 1 - Math.exp(-7.5 * dt);
      _camGoalPos.copy(this.cameraGlide.pos);
      _camGoalTarget.copy(this.cameraGlide.target);
      this.camera.position.lerp(_camGoalPos, alpha);
      this.controls.target.lerp(_camGoalTarget, alpha);
      if (
        this.camera.position.distanceToSquared(_camGoalPos) < 0.002 &&
        this.controls.target.distanceToSquared(_camGoalTarget) < 0.002
      ) {
        this.camera.position.copy(_camGoalPos);
        this.controls.target.copy(_camGoalTarget);
        this.cameraGlide.active = false;
      }
    }

    if (!this.activeAnim?.isCapture) {
      if (
        this.oneFingerPan.active ||
        Math.abs(this.oneFingerPan.pendingX) > 1e-5 ||
        Math.abs(this.oneFingerPan.pendingZ) > 1e-5 ||
        Math.abs(this.oneFingerPan.velX) > 1e-4 ||
        Math.abs(this.oneFingerPan.velZ) > 1e-4
      ) {
        this.stepOneFingerPan(dt);
      }
      this.controls.update();
      this.clampCameraPanBounds();
    }
    if (this.camera.position.y < 0.45) {
      this.camera.position.y = 0.45;
    }

    if (this.shadowsDirty && this.renderer.shadowMap.enabled) {
      const shadowThrottleMs = this.adaptivePerf.tier === 1 ? 48 : 30;
      const canUpdateNow =
        !this.activeAnim ||
        this.lastShadowUpdateMs === 0 ||
        (this.adaptivePerf.tier < 2 && tickStart - this.lastShadowUpdateMs >= shadowThrottleMs);
      if (canUpdateNow) {
        this.renderer.shadowMap.needsUpdate = true;
        this.shadowsDirty = false;
        this.lastShadowUpdateMs = tickStart;
      }
    }

    this.renderer.render(this.scene, this.camera);

    if (import.meta.env.DEV) {
      const now = performance.now();
      const workMs = now - tickStart;
      const frameMs = this.lastTickStart > 0 ? tickStart - this.lastTickStart : 16.7;
      this.lastTickStart = tickStart;
      recordFrameMetrics(
        frameMs,
        workMs,
        this.renderer.info.render.calls,
        this.renderer.info.render.triangles
      );
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose() {
    this.disposed = true;
    this.stopLoop();

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.handlePointerDown);
    dom.removeEventListener('pointermove', this.handlePointerMove);
    dom.removeEventListener('pointerup', this.handlePointerUp);
    dom.removeEventListener('pointercancel', this.handlePointerCancel);
    dom.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('pointerup', this.handleWindowPointerCleanup);
    window.removeEventListener('pointercancel', this.handleWindowPointerCleanup);
    window.removeEventListener('blur', this.handleWindowBlur);
    dom.removeEventListener('webglcontextlost', this.handleContextLost);
    dom.removeEventListener('webglcontextrestored', this.handleContextRestored);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('resize', this.handleResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.motionQuery?.removeEventListener('change', this.handleMotionChange);
    this.motionQuery = null;

    for (let i = 0; i < this.activeRigs.length; i++) {
      const geos = this.activeRigs[i].disposableGeos;
      for (let j = 0; j < geos.length; j++) geos[j].dispose();
    }
    for (let i = 0; i < this.rigPool.length; i++) {
      const geos = this.rigPool[i].disposableGeos;
      for (let j = 0; j < geos.length; j++) geos[j].dispose();
    }
    this.activeRigs.length = 0;
    this.rigPool.length = 0;
    this.pieceMap.clear();
    this.hitProxyToSquare.clear();

    this.controls.dispose();
    this.combatEffects.dispose();
    this.aftermath.dispose();
    this.committedCaptureMoves.clear();
    this.sharedHighlightGeos.forEach((g) => g.dispose());
    this.sharedHighlightMats.forEach((m) => m.dispose());
    this.battlefield.dispose();
    this.charGeos.dispose();
    this.gltfProvider.dispose();
    this.materials.dispose();
    this.envRT?.dispose();
    this.envRT = null;
    this.scene.environment = null;
    this.renderer.dispose();
    this.activeAnim = null;
    this.reusableMoveAnim = null;
    this.reusableDuelCtx = null;
    this.onCombatSoundCallback = undefined;

    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
