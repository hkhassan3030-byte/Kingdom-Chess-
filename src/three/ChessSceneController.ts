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
import { createSceneMaterialBank, type SceneMaterialBank } from './materials';
import {
  CombatEffectsManager,
  getCombatDuration,
  shortestAngleLerp,
  updateCombatDuel,
  type CombatDuelContext,
  type CombatSoundEvent,
} from './combatChoreography';
import { recordFrameMetrics } from '../utils/devPerfMonitor';
import { isSoftwareGlRenderer } from '../utils/webglDetect';
import type {
  BoardPiece,
  CharacterSetId,
  GraphicsQuality,
  MoveAnimationPayload,
  PieceColor,
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

interface ActiveMoveAnim {
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
  private quality: GraphicsQuality = 'high';
  private characterSet: CharacterSetId = 'human';
  private currentSide: PieceColor = 'w';
  private lastDefaultDist = 24;
  private lastBoardPieces: BoardPiece[] = [];
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;
  private matchEpoch = 0;

  private materials: SceneMaterialBank;
  private charGeos: CharacterGeometryBank;
  private gltfProvider = new CharacterGLTFProvider();
  private battlefield: BattlefieldRefs;
  private keyLight: THREE.DirectionalLight;

  private piecesGroup = new THREE.Group();
  private highlightsGroup = new THREE.Group();
  private effectsGroup = new THREE.Group();

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
  private lastTickStart = 0;
  private combatEffects: CombatEffectsManager;

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

  // Raycasting & mobile touch disambiguation
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private pointerDownInfo: { x: number; y: number; time: number; pointerId: number } | null = null;
  private activePointers = new Set<number>();
  private lastMultiTouchTime = 0;

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
    }
  ) {
    this.container = container;
    this.characterSet = options.characterSet ?? 'human';
    this.onSquareTapCallback = options.onSquareTap;
    this.onCombatSoundCallback = options.onCombatSound;
    this.onContextLostCallback = options.onContextLost;
    this.onContextRestoredCallback = options.onContextRestored;

    this.isSoftwareGl = isSoftwareGlRenderer();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.25));
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
    this.renderer.domElement.className = 'touch-canvas';
    container.appendChild(this.renderer.domElement);

    // Dark Fantasy Citadel Twilight Sky & Horizon Mist
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x131a28);
    this.sceneFog = new THREE.FogExp2(0x161f2f, 0.01);
    this.scene.fog = this.sceneFog;

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.72;
    pmremGenerator.dispose();

    // Fixed Elevated Isometric Camera (68° downward, zero rotation, full 8x8 board visible)
    this.camera = new THREE.PerspectiveCamera(44, width / height, 0.8, 95);
    this.currentSide = options.initialSide ?? 'w';
    const { defaultDist, minDist, maxDist } = this.computeCameraDistances();
    this.lastDefaultDist = defaultDist;
    this.sceneFog.density = Math.min(0.014, 0.24 / defaultDist);
    this.getBoardCameraPosition(this.currentSide, defaultDist, this.camera.position);

    // OrbitControls configured strictly for Bounded Zoom-Only (Rotation & Pan completely disabled)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(BOARD_CENTER_TARGET);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.08;
    this.controls.enableRotate = false;
    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 0.85;
    this.controls.minDistance = minDist;
    this.controls.maxDistance = maxDist;
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE, // Blocked by enableRotate = false; single finger never moves camera
      TWO: THREE.TOUCH.DOLLY_PAN, // Only dolly/zoom runs because enablePan = false
    };

    this.controls.addEventListener('start', () => {
      if (this.activePointers.size >= 2) {
        this.cameraGlide.active = false;
      }
    });

    // Optimized 3-Light Rig for Mobile GPU (Hemisphere + Shadow Key + Balanced Back/Fill Rim)
    const hemi = new THREE.HemisphereLight(0x7c9ad0, 0x2f2622, 1.18);
    this.scene.add(hemi);

    this.keyLight = new THREE.DirectionalLight(0xcce0ff, 2.0);
    this.keyLight.position.set(10.0, 14.5, 7.5);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.width = 768;
    this.keyLight.shadow.mapSize.height = 768;
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 34;
    const d = 5.8;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0008;
    this.keyLight.shadow.normalBias = 0.032;
    this.scene.add(this.keyLight);

    const fillRimLight = new THREE.DirectionalLight(0xffe1c4, 1.05);
    fillRimLight.position.set(-6.5, 6.2, -8.0);
    this.scene.add(fillRimLight);

    // Build Battlefield, Material Bank, Character Geo Bank
    this.materials = createSceneMaterialBank(this.renderer, this.characterSet);
    this.charGeos = createCharacterGeometryBank();
    this.battlefield = createBattlefield(this.materials);
    this.scene.add(this.battlefield.group);
    this.scene.add(this.highlightsGroup);
    this.scene.add(this.piecesGroup);
    this.scene.add(this.effectsGroup);
    this.combatEffects = new CombatEffectsManager(this.effectsGroup);

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
    this.tick();
  }

  private bindEvents() {
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDown);
    dom.addEventListener('pointerup', this.handlePointerUp);
    dom.addEventListener('pointercancel', this.handlePointerCancel);
    window.addEventListener('pointerup', this.handleWindowPointerCleanup);
    window.addEventListener('pointercancel', this.handleWindowPointerCleanup);
    window.addEventListener('blur', this.handleWindowBlur);
    dom.addEventListener('webglcontextlost', this.handleContextLost);
    dom.addEventListener('webglcontextrestored', this.handleContextRestored);
    window.addEventListener('resize', this.handleResize);
  }

  private handleWindowPointerCleanup = (e: PointerEvent) => {
    this.activePointers.delete(e.pointerId);
    if (this.pointerDownInfo?.pointerId === e.pointerId && e.target !== this.renderer.domElement) {
      this.pointerDownInfo = null;
    }
  };

  private handleWindowBlur = () => {
    this.activePointers.clear();
    this.pointerDownInfo = null;
  };

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.onContextLostCallback?.();
  };

  private handleContextRestored = () => {
    this.onContextRestoredCallback?.();
  };

  private computeCameraDistances(): { defaultDist: number; minDist: number; maxDist: number } {
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    const aspect = width / height;
    const tanHalfV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5));
    const tanHalfH = tanHalfV * aspect;

    // 8x8 playable squares span [-4.6, +4.6]; stone coordinate apron spans [-5.775, +5.775]
    const fitHalfWidth = 6.35;
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
    this.controls.target.copy(BOARD_CENTER_TARGET);
    const clampedDist = THREE.MathUtils.clamp(defaultDist * ratio, minDist, maxDist);
    this.getBoardCameraPosition(this.currentSide, clampedDist, this.camera.position);
    if (this.cameraGlide.active) {
      this.cameraGlide.target.copy(BOARD_CENTER_TARGET);
      this.getBoardCameraPosition(this.currentSide, defaultDist, this.cameraGlide.pos);
    }
    this.controls.update();
  };

  private applyPixelRatio() {
    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
    } else {
      const maxDpr = this.quality === 'high' ? 1.25 : 1.0;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
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

  private handlePointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    this.activePointers.add(e.pointerId);
    if (this.activePointers.size >= 2) {
      // Multi-touch pinch gesture -> cancel tap and guard release window
      this.lastMultiTouchTime = performance.now();
      this.pointerDownInfo = null;
      return;
    }

    this.pointerDownInfo = {
      x: e.clientX,
      y: e.clientY,
      time: performance.now(),
      pointerId: e.pointerId,
    };
  };

  private handlePointerCancel = (e: PointerEvent) => {
    this.activePointers.delete(e.pointerId);
    if (this.pointerDownInfo?.pointerId === e.pointerId) {
      this.pointerDownInfo = null;
    }
  };

  private handlePointerUp = (e: PointerEvent) => {
    this.activePointers.delete(e.pointerId);
    const down = this.pointerDownInfo;
    this.pointerDownInfo = null;

    if (!down || down.pointerId !== e.pointerId) return;
    if (this.activePointers.size > 0) {
      this.lastMultiTouchTime = performance.now();
      return;
    }

    const now = performance.now();
    // Prevent accidental ghost taps right after lifting fingers from pinch-to-zoom
    if (now - this.lastMultiTouchTime < 240) return;

    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    const dist = Math.hypot(dx, dy);
    const dt = now - down.time;

    // Forgiving Android tap tolerance (ignores tiny finger roll/micro-movement)
    if (dist > 24 || dt > 650) return;
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
    if (this.isSoftwareGl) return;
    const high = quality === 'high';
    this.renderer.shadowMap.enabled = high;
    this.keyLight.castShadow = high;
    if (high) this.shadowsDirty = true;
    this.applyPixelRatio();
  }

  public abortActiveAnimation(invokeCallback = false) {
    const anim = this.activeAnim;
    if (!anim) return;

    if (anim.duelCtx) {
      this.camera.position.copy(anim.duelCtx.savedCamPos);
      this.controls.target.copy(anim.duelCtx.savedTarget);
      this.controls.update();
    }

    const done = anim.onComplete;
    anim.duelCtx = null;
    anim.defender = null;
    anim.rookRig = null;
    this.activeAnim = null;

    if (invokeCallback) {
      done();
    }
  }

  /**
   * Completely clears active animations, combat effects, piece rigs/pools, highlights,
   * and input state before optionally rebuilding a fresh match board & resetting the camera.
   */
  public resetGame(side: PieceColor, initialPieces?: BoardPiece[]) {
    if (this.disposed) return;

    this.matchEpoch++;
    this.abortActiveAnimation(false);
    this.combatEffects.clearActive();
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

    this.materials.switchCharacterSet(nextSet);
    this.characterSet = nextSet;

    if (this.lastBoardPieces.length > 0) {
      this.syncBoard(this.lastBoardPieces);
    }
    this.shadowsDirty = true;
  }

  public resetCamera(side: PieceColor, immediate = false) {
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
    this.controls.target.copy(BOARD_CENTER_TARGET);
    _v1.copy(this.camera.position).sub(this.controls.target);
    const dist = _v1.length();
    const newDist = THREE.MathUtils.clamp(
      dist * factor,
      this.controls.minDistance,
      this.controls.maxDistance
    );
    _v1.setLength(newDist).add(this.controls.target);
    this.camera.position.copy(_v1);
    this.controls.update();
  }

  /**
   * Smoothly zooms in within safe board-preserving bounds while keeping the entire board centered.
   */
  public focusCharacter(_square: string) {
    const { minDist, maxDist, defaultDist } = this.computeCameraDistances();
    this.lastDefaultDist = defaultDist;
    this.controls.minDistance = minDist;
    this.controls.maxDistance = maxDist;

    this.cameraGlide.target.copy(BOARD_CENTER_TARGET);
    this.getBoardCameraPosition(this.currentSide, minDist, this.cameraGlide.pos);
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

    if (!this.reusableMoveAnim) {
      this.reusableMoveAnim = {
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
    this.setRigMatrixAutoUpdate(attacker, true);
    if (defender) this.setRigMatrixAutoUpdate(defender, true);
    if (rookRig) this.setRigMatrixAutoUpdate(rookRig, true);
    this.activeAnim = anim;
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

    this.shadowsDirty = true;

    if (p >= 1) {
      attacker.root.position.copy(anim.toPos);
      this.resetRigPose(attacker);

      if (rookRig) {
        rookRig.root.position.copy(anim.rookToPos);
        this.resetRigPose(rookRig);
      }

      if (defender) {
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

      if (anim.duelCtx) {
        this.camera.position.copy(anim.duelCtx.savedCamPos);
        this.controls.target.copy(anim.duelCtx.savedTarget);
        this.controls.update();
      }

      const done = anim.onComplete;
      anim.duelCtx = null;
      anim.defender = null;
      anim.rookRig = null;
      this.activeAnim = null;
      done();
    }
  }

  private updateEnvironment(elapsed: number, dt: number) {
    this.materials.waterNormalMap.offset.x = (this.materials.waterNormalMap.offset.x + dt * 0.015) % 1;
    this.materials.waterNormalMap.offset.y = (this.materials.waterNormalMap.offset.y + dt * 0.01) % 1;

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

    const posAttr = this.battlefield.embers.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const vels = this.battlefield.emberVelocities;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] += vels[i] * dt + Math.sin(elapsed + i) * 0.002;
      arr[i + 1] += vels[i + 1] * dt;
      arr[i + 2] += vels[i + 2] * dt;
      if (arr[i + 1] > 6.0) {
        arr[i] = (Math.random() - 0.5) * 16;
        arr[i + 1] = 0.2;
        arr[i + 2] = (Math.random() - 0.5) * 16;
      }
    }
    posAttr.needsUpdate = true;

    if (this.checkRing.visible) {
      const s = 1 + Math.sin(elapsed * 5.2) * 0.08;
      this.checkRing.scale.set(s, s, 1);
      this.checkRing.updateMatrix();
      this.checkRing.updateMatrixWorld(true);
    }

    this.combatEffects.update(dt);
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
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
    if (this.disposed) return;

    const tickStart = import.meta.env.DEV ? performance.now() : 0;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

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

    this.controls.update();
    if (this.camera.position.y < 0.45) {
      this.camera.position.y = 0.45;
    }

    if (this.shadowsDirty && this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowsDirty = false;
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
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.handlePointerDown);
    dom.removeEventListener('pointerup', this.handlePointerUp);
    dom.removeEventListener('pointercancel', this.handlePointerCancel);
    window.removeEventListener('pointerup', this.handleWindowPointerCleanup);
    window.removeEventListener('pointercancel', this.handleWindowPointerCleanup);
    window.removeEventListener('blur', this.handleWindowBlur);
    dom.removeEventListener('webglcontextlost', this.handleContextLost);
    dom.removeEventListener('webglcontextrestored', this.handleContextRestored);
    window.removeEventListener('resize', this.handleResize);

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
    this.sharedHighlightGeos.forEach((g) => g.dispose());
    this.sharedHighlightMats.forEach((m) => m.dispose());
    this.battlefield.dispose();
    this.charGeos.dispose();
    this.gltfProvider.dispose();
    this.materials.dispose();
    this.renderer.dispose();

    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
