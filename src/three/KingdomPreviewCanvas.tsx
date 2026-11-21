import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CHARACTER_SETS } from './characterSets';
import {
  createCharacterGeometryBank,
  createCharacterPiece,
  type CharacterRig,
} from './createCharacterPieces';
import { createSceneMaterialBank } from './materials';
import { isSoftwareGlRenderer } from '../utils/webglDetect';
import type { CharacterSetId, GraphicsQuality, PieceType } from '../types/chess';

interface KingdomPreviewCanvasProps {
  characterSet: CharacterSetId;
  quality?: GraphicsQuality;
  focusPiece?: PieceType;
}

const KINGDOM_STAGE_BG: Record<CharacterSetId, number> = {
  human: 0x101727,
  titan: 0x0e191e,
  inferno: 0x1a1114,
  shadow: 0x121024,
  celestial: 0x0f1a2e,
};

let _cachedFloorGlowCanvas: HTMLCanvasElement | null = null;

function createFloorGlowTexture(): THREE.CanvasTexture {
  if (!_cachedFloorGlowCanvas) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.52)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.16)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    _cachedFloorGlowCanvas = canvas;
  }
  const tex = new THREE.CanvasTexture(_cachedFloorGlowCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function KingdomPreviewCanvas({
  characterSet,
  quality = 'high',
  focusPiece = 'n',
}: KingdomPreviewCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const switchPresentationRef = useRef<((nextSet: CharacterSetId, nextPiece: PieceType) => void) | null>(null);
  const applyQualityRef = useRef<((nextQuality: GraphicsQuality) => void) | null>(null);
  const initialSetRef = useRef<CharacterSetId>(characterSet);
  const initialPieceRef = useRef<PieceType>(focusPiece);
  const qualityRef = useRef<GraphicsQuality>(quality);
  qualityRef.current = quality;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let disposed = false;
    let frameId = 0;
    let initRaf = 0;
    let teardownScene: (() => void) | null = null;

    const initScene = () => {
      if (disposed) return;

      const motionQuery =
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
          ? window.matchMedia('(prefers-reduced-motion: reduce)')
          : null;
      let prefersReducedMotion = Boolean(motionQuery?.matches);

      const isSoftwareGl = isSoftwareGlRenderer();

      const renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false,
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.14;

      const applyDpr = (q: GraphicsQuality) => {
        const maxDpr = isSoftwareGl ? 1 : q === 'balanced' ? 1 : 1.35;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
      };
      applyDpr(qualityRef.current);
      applyQualityRef.current = applyDpr;

      const w = container.clientWidth || 320;
      const h = container.clientHeight || 220;
      renderer.setSize(w, h);
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.touchAction = 'pan-y';
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const targetBgColor = new THREE.Color(KINGDOM_STAGE_BG[initialSetRef.current]);
      const currentBgColor = targetBgColor.clone();
      scene.background = currentBgColor;

      const pmrem = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envRT = pmrem.fromScene(roomEnv, 0.04);
      scene.environment = envRT.texture;
      scene.environmentIntensity = 0.78;
      roomEnv.dispose();
      pmrem.dispose();

      const camera = new THREE.PerspectiveCamera(36, w / h, 0.1, 40);
      const updateCamera = (rw: number, rh: number) => {
        const aspect = rw / Math.max(rh, 1);
        camera.aspect = aspect;
        camera.fov = aspect < 1.35 ? 38 : 35;
        camera.updateProjectionMatrix();
        camera.position.set(0, 1.46, aspect < 1.35 ? 3.8 : 3.58);
        camera.lookAt(0, 0.88, 0);
      };
      updateCamera(w, h);

      const hemi = new THREE.HemisphereLight(0x95b3e8, 0x261d17, 1.08);
      scene.add(hemi);

      const key = new THREE.DirectionalLight(0xe8f2ff, 2.0);
      key.position.set(2.8, 4.8, 4.2);
      scene.add(key);

      const warmFill = new THREE.DirectionalLight(0xffe1be, 0.65);
      warmFill.position.set(-2.6, 2.2, 2.8);
      scene.add(warmFill);

      const initialCfg = CHARACTER_SETS[initialSetRef.current];
      const targetAccentColor = new THREE.Color(initialCfg.accentHex);
      const rim = new THREE.PointLight(initialCfg.accentHex, 2.8, 9);
      rim.position.set(-1.8, 1.9, -1.7);
      scene.add(rim);

      const materials = createSceneMaterialBank(renderer, initialSetRef.current);
      const charGeos = createCharacterGeometryBank();
      const extraGeos: THREE.BufferGeometry[] = [];
      const extraMats: THREE.Material[] = [];
      const extraTex: THREE.Texture[] = [];

      const stageGroup = new THREE.Group();
      scene.add(stageGroup);

      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(1.58, 1.74, 0.2, 12),
        materials.stoneApron
      );
      extraGeos.push(plinth.geometry);
      plinth.position.y = -0.1;
      stageGroup.add(plinth);

      const plinthStep = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 1.48, 0.05, 12),
        materials.boardFrame
      );
      extraGeos.push(plinthStep.geometry);
      plinthStep.position.y = 0.015;
      stageGroup.add(plinthStep);

      const goldRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.4, 0.024, 8, 36),
        materials.boardGoldTrim
      );
      extraGeos.push(goldRing.geometry);
      goldRing.rotation.x = Math.PI / 2;
      goldRing.position.y = 0.042;
      stageGroup.add(goldRing);

      const auraMat = new THREE.MeshBasicMaterial({
        color: initialCfg.accentHex,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
      });
      extraMats.push(auraMat);
      const auraGeo = new THREE.RingGeometry(1.22, 1.34, 36);
      extraGeos.push(auraGeo);
      const aura = new THREE.Mesh(auraGeo, auraMat);
      aura.rotation.x = -Math.PI / 2;
      aura.position.y = 0.044;
      stageGroup.add(aura);

      const glowTex = createFloorGlowTexture();
      extraTex.push(glowTex);
      const floorGlowMat = new THREE.MeshBasicMaterial({
        map: glowTex,
        color: initialCfg.accentHex,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      extraMats.push(floorGlowMat);
      const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 2.7), floorGlowMat);
      extraGeos.push(floorGlow.geometry);
      floorGlow.rotation.x = -Math.PI / 2;
      floorGlow.position.y = 0.043;
      stageGroup.add(floorGlow);

      const piecesRoot = new THREE.Group();
      piecesRoot.position.y = 0.04;
      stageGroup.add(piecesRoot);

      const rigs: CharacterRig[] = [];
      let entranceScale = 1;
      let activeSet = initialSetRef.current;
      let activePiece = initialPieceRef.current;

      const buildShowcasePieces = (setId: CharacterSetId, piece: PieceType) => {
        for (let i = 0; i < rigs.length; i++) {
          const geos = rigs[i].disposableGeos;
          for (let j = 0; j < geos.length; j++) geos[j].dispose();
        }
        rigs.length = 0;
        piecesRoot.clear();

        const cfg = CHARACTER_SETS[setId];
        targetAccentColor.set(cfg.accentHex);
        targetBgColor.setHex(KINGDOM_STAGE_BG[setId]);

        if (piece === 'k') {
          const kingRig = createCharacterPiece('k', 'w', charGeos, materials, 0.25, setId);
          kingRig.root.position.set(0, 0, 0.06);
          kingRig.body.rotation.y = 0.22;
          kingRig.root.scale.setScalar(1.04);
          piecesRoot.add(kingRig.root);
          rigs.push(kingRig);
        } else {
          const kingRig = createCharacterPiece('k', 'w', charGeos, materials, 0.25, setId);
          kingRig.root.position.set(-0.62, 0, 0.1);
          kingRig.body.rotation.y = 0.32;
          kingRig.root.scale.setScalar(0.98);
          piecesRoot.add(kingRig.root);

          const companionScale = piece === 'n' ? 0.92 : piece === 'p' ? 0.96 : 0.98;
          const companionRig = createCharacterPiece(piece, 'w', charGeos, materials, 1.35, setId);
          companionRig.root.position.set(0.64, 0, -0.02);
          companionRig.body.rotation.y = -0.38;
          companionRig.root.scale.setScalar(companionScale);
          piecesRoot.add(companionRig.root);

          rigs.push(kingRig, companionRig);
        }

        if (!prefersReducedMotion) {
          entranceScale = 0.92;
          piecesRoot.scale.setScalar(entranceScale);
        } else {
          entranceScale = 1;
          piecesRoot.scale.setScalar(1);
        }
      };

      buildShowcasePieces(initialSetRef.current, initialPieceRef.current);

      switchPresentationRef.current = (nextSet: CharacterSetId, nextPiece: PieceType) => {
        if (disposed) return;
        if (nextSet === activeSet && nextPiece === activePiece) return;
        activeSet = nextSet;
        activePiece = nextPiece;
        materials.switchCharacterSet(nextSet);
        buildShowcasePieces(nextSet, nextPiece);
      };

      // Interactive horizontal turntable drag (vertical scroll remains free on touch devices)
      let dragging = false;
      let dragStartX = 0;
      let dragOffsetYaw = 0;
      let targetDragYaw = 0;
      const onPointerDown = (e: PointerEvent) => {
        dragging = true;
        dragStartX = e.clientX;
      };
      const onPointerMove = (e: PointerEvent) => {
        if (!dragging) return;
        const dx = e.clientX - dragStartX;
        dragStartX = e.clientX;
        targetDragYaw = THREE.MathUtils.clamp(targetDragYaw + dx * 0.0085, -0.95, 0.95);
      };
      const onPointerUp = () => {
        dragging = false;
      };

      const dom = renderer.domElement;
      dom.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);

      const handleResize = () => {
        if (disposed) return;
        const rw = container.clientWidth || 320;
        const rh = container.clientHeight || 220;
        updateCamera(rw, rh);
        renderer.setSize(rw, rh);
        applyDpr(qualityRef.current);
        if (prefersReducedMotion) {
          renderer.render(scene, camera);
        }
      };
      window.addEventListener('resize', handleResize);
      const resizeObserver =
        typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
      resizeObserver?.observe(container);

      let contextLost = false;
      let isPausedHidden = typeof document !== 'undefined' ? document.hidden : false;

      const stopLoop = () => {
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        frameId = 0;
      };

      const handleContextLost = (e: Event) => {
        e.preventDefault();
        contextLost = true;
        stopLoop();
      };
      const handleContextRestored = () => {
        if (disposed) return;
        contextLost = false;
        handleResize();
        if (!isPausedHidden) {
          clock.getDelta();
          stopLoop();
          tick();
        }
      };
      dom.addEventListener('webglcontextlost', handleContextLost);
      dom.addEventListener('webglcontextrestored', handleContextRestored);

      const handleMotionChange = (ev: MediaQueryListEvent) => {
        prefersReducedMotion = ev.matches;
      };
      motionQuery?.addEventListener('change', handleMotionChange);

      const clock = new THREE.Clock();

      const afterDraw = (cb: () => void) => {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed || contextLost || isPausedHidden) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      };

      const tick = () => {
        if (disposed || contextLost || isPausedHidden) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;

        const colorLerp = prefersReducedMotion ? 1 : Math.min(1, dt * 6.5);
        currentBgColor.lerp(targetBgColor, colorLerp);
        rim.color.lerp(targetAccentColor, colorLerp);
        auraMat.color.lerp(targetAccentColor, colorLerp);
        floorGlowMat.color.lerp(targetAccentColor, colorLerp);

        if (!dragging) {
          targetDragYaw = THREE.MathUtils.damp(targetDragYaw, 0, 2.2, dt);
        }
        dragOffsetYaw = THREE.MathUtils.damp(dragOffsetYaw, targetDragYaw, 8.5, dt);

        if (prefersReducedMotion) {
          stageGroup.rotation.y = dragOffsetYaw;
          piecesRoot.scale.setScalar(1);
        } else {
          entranceScale = THREE.MathUtils.damp(entranceScale, 1, 10, dt);
          piecesRoot.scale.setScalar(entranceScale);
          stageGroup.rotation.y = Math.sin(t * 0.42) * 0.24 + dragOffsetYaw;

          for (let i = 0; i < rigs.length; i++) {
            const rig = rigs[i];
            const p = t * 2.1 + rig.phaseOffset;
            rig.torso.position.y = rig.torsoBaseY + Math.sin(p) * 0.011;
            rig.head.rotation.y = Math.sin(p * 0.55) * 0.09;
            if (rig.cape) {
              rig.cape.rotation.x = 0.16 + Math.sin(p * 1.15) * 0.035;
            }
          }
        }

        renderer.render(scene, camera);

        if (disposed || contextLost || isPausedHidden) return;
        if (isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      };

      const handleVisibilityChange = () => {
        isPausedHidden = document.hidden;
        if (isPausedHidden) {
          stopLoop();
        } else if (!disposed && !contextLost) {
          clock.getDelta();
          stopLoop();
          tick();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      if (!isPausedHidden) {
        tick();
      } else {
        renderer.render(scene, camera);
      }

      teardownScene = () => {
        switchPresentationRef.current = null;
        applyQualityRef.current = null;
        stopLoop();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        resizeObserver?.disconnect();
        window.removeEventListener('resize', handleResize);
        dom.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        dom.removeEventListener('webglcontextlost', handleContextLost);
        dom.removeEventListener('webglcontextrestored', handleContextRestored);
        motionQuery?.removeEventListener('change', handleMotionChange);
        for (let i = 0; i < rigs.length; i++) {
          const geos = rigs[i].disposableGeos;
          for (let j = 0; j < geos.length; j++) geos[j].dispose();
        }
        rigs.length = 0;
        extraGeos.forEach((g) => g.dispose());
        extraMats.forEach((m) => m.dispose());
        extraTex.forEach((tx) => tx.dispose());
        envRT.dispose();
        scene.environment = null;
        charGeos.dispose();
        materials.dispose();
        renderer.dispose();
        if (dom.parentElement === container) {
          container.removeChild(dom);
        }
      };
    };

    initRaf = requestAnimationFrame(initScene);

    return () => {
      disposed = true;
      cancelAnimationFrame(initRaf);
      teardownScene?.();
    };
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      switchPresentationRef.current?.(characterSet, focusPiece);
    });
    return () => cancelAnimationFrame(raf);
  }, [characterSet, focusPiece]);

  useEffect(() => {
    applyQualityRef.current?.(quality);
  }, [quality]);

  return <div ref={mountRef} className="h-full w-full cursor-grab overflow-hidden active:cursor-grabbing" />;
}
