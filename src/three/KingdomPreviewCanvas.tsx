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
import type { CharacterSetId, GraphicsQuality } from '../types/chess';

interface KingdomPreviewCanvasProps {
  characterSet: CharacterSetId;
  quality?: GraphicsQuality;
}

export function KingdomPreviewCanvas({
  characterSet,
  quality = 'high',
}: KingdomPreviewCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const switchSetRef = useRef<((nextSet: CharacterSetId) => void) | null>(null);
  const initialSetRef = useRef<CharacterSetId>(characterSet);
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

      const isSoftwareGl = isSoftwareGlRenderer();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    const applyDpr = () => {
      const maxDpr = isSoftwareGl ? 1 : qualityRef.current === 'balanced' ? 1 : 1.35;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
    };
    applyDpr();

    const w = container.clientWidth || 320;
    const h = container.clientHeight || 220;
    renderer.setSize(w, h);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1523);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.75;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(36, w / h, 0.1, 40);
    camera.position.set(0, 1.46, 3.65);
    camera.lookAt(0, 0.88, 0);

    const hemi = new THREE.HemisphereLight(0x90aee2, 0x261d17, 1.05);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xe4efff, 1.95);
    key.position.set(2.8, 4.8, 4.2);
    scene.add(key);

    const initialCfg = CHARACTER_SETS[initialSetRef.current];
    const rim = new THREE.PointLight(initialCfg.accentHex, 2.6, 9);
    rim.position.set(-1.8, 1.9, -1.7);
    scene.add(rim);

    const materials = createSceneMaterialBank(renderer, initialSetRef.current);
    const charGeos = createCharacterGeometryBank();
    const extraGeos: THREE.BufferGeometry[] = [];
    const extraMats: THREE.Material[] = [];

    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.58, 1.74, 0.2, 10),
      materials.stoneApron
    );
    extraGeos.push(plinth.geometry);
    plinth.position.y = -0.1;
    stageGroup.add(plinth);

    const goldRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.42, 0.025, 8, 32),
      materials.boardGoldTrim
    );
    extraGeos.push(goldRing.geometry);
    goldRing.rotation.x = Math.PI / 2;
    goldRing.position.y = 0.01;
    stageGroup.add(goldRing);

    const auraMat = new THREE.MeshBasicMaterial({
      color: initialCfg.accentHex,
      transparent: true,
      opacity: 0.36,
      side: THREE.DoubleSide,
    });
    extraMats.push(auraMat);
    const auraGeo = new THREE.RingGeometry(1.26, 1.38, 36);
    extraGeos.push(auraGeo);
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = 0.014;
    stageGroup.add(aura);

    const piecesRoot = new THREE.Group();
    stageGroup.add(piecesRoot);

    const rigs: CharacterRig[] = [];

    const buildShowcasePieces = (setId: CharacterSetId) => {
      for (let i = 0; i < rigs.length; i++) {
        const geos = rigs[i].disposableGeos;
        for (let j = 0; j < geos.length; j++) geos[j].dispose();
      }
      rigs.length = 0;
      piecesRoot.clear();

      const cfg = CHARACTER_SETS[setId];
      rim.color.set(cfg.accentHex);
      auraMat.color.set(cfg.accentHex);

      // Showcase Royal Sovereign (White King) + Signature Knight (White Knight)
      const kingRig = createCharacterPiece('k', 'w', charGeos, materials, 0.25, setId);
      kingRig.root.position.set(-0.62, 0, 0.1);
      kingRig.body.rotation.y = 0.32;
      kingRig.root.scale.setScalar(0.98);
      piecesRoot.add(kingRig.root);

      const knightRig = createCharacterPiece('n', 'w', charGeos, materials, 1.35, setId);
      knightRig.root.position.set(0.66, 0, -0.04);
      knightRig.body.rotation.y = -0.44;
      knightRig.root.scale.setScalar(0.92);
      piecesRoot.add(knightRig.root);

      rigs.push(kingRig, knightRig);
    };

    buildShowcasePieces(initialSetRef.current);

    switchSetRef.current = (nextSet: CharacterSetId) => {
      if (disposed) return;
      materials.switchCharacterSet(nextSet);
      buildShowcasePieces(nextSet);
    };

    const handleResize = () => {
      if (disposed) return;
      const rw = container.clientWidth || 320;
      const rh = container.clientHeight || 220;
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
      applyDpr();
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    resizeObserver?.observe(container);

    const clock = new THREE.Clock();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
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
      if (disposed) return;
      clock.getDelta();
      const t = clock.elapsedTime;

      stageGroup.rotation.y = Math.sin(t * 0.42) * 0.28;

      for (let i = 0; i < rigs.length; i++) {
        const rig = rigs[i];
        const p = t * 2.1 + rig.phaseOffset;
        rig.torso.position.y = rig.torsoBaseY + Math.sin(p) * 0.011;
        rig.head.rotation.y = Math.sin(p * 0.55) * 0.09;
        if (rig.cape) {
          rig.cape.rotation.x = 0.16 + Math.sin(p * 1.15) * 0.035;
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

      teardownScene = () => {
        switchSetRef.current = null;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        resizeObserver?.disconnect();
        window.removeEventListener('resize', handleResize);
        for (let i = 0; i < rigs.length; i++) {
          const geos = rigs[i].disposableGeos;
          for (let j = 0; j < geos.length; j++) geos[j].dispose();
        }
        rigs.length = 0;
        extraGeos.forEach((g) => g.dispose());
        extraMats.forEach((m) => m.dispose());
        charGeos.dispose();
        materials.dispose();
        renderer.dispose();
        if (renderer.domElement.parentElement === container) {
          container.removeChild(renderer.domElement);
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
      switchSetRef.current?.(characterSet);
    });
    return () => cancelAnimationFrame(raf);
  }, [characterSet]);

  return <div ref={mountRef} className="h-full w-full overflow-hidden" />;
}
