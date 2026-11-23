import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  createCharacterGeometryBank,
  createCharacterPiece,
  type CharacterRig,
} from './createCharacterPieces';
import { createSceneMaterialBank } from './materials';
import { isLowTierDevice, isSoftwareGlRenderer } from '../utils/webglDetect';
import type { GameMode } from '../types/chess';

interface ModePreviewCanvasProps {
  mode: GameMode;
  delayMs?: number;
}

export function ModePreviewCanvas({ mode, delayMs = 0 }: ModePreviewCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let disposed = false;
    let frameId = 0;
    let startRaf = 0;
    let startTimer = 0;
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
        alpha: true,
        powerPreference: 'high-performance',
        stencil: false,
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      const maxDpr = isSoftwareGl ? 1 : isLowTierDevice() ? 1.1 : 1.25;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));

      const w = container.clientWidth || 280;
      const h = container.clientHeight || 140;
      renderer.setSize(w, h);
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(mode === 'pvp' ? 0x101726 : 0x131424);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envRT = pmrem.fromScene(roomEnv, 0.04);
      scene.environment = envRT.texture;
      scene.environmentIntensity = 0.7;
      roomEnv.dispose();
      pmrem.dispose();

      const camera = new THREE.PerspectiveCamera(36, w / h, 0.2, 40);
      camera.position.set(0, 1.38, mode === 'pvp' ? 3.25 : 2.55);
      camera.lookAt(0, 0.88, 0);

      const hemi = new THREE.HemisphereLight(0x8aa8dc, 0x2a1f19, 1.0);
      scene.add(hemi);

      const key = new THREE.DirectionalLight(0xd9e8ff, 1.9);
      key.position.set(2.5, 4.5, 4.0);
      scene.add(key);

      const rim = new THREE.PointLight(mode === 'pvp' ? 0xff9a44 : 0xe14b4b, 2.4, 8);
      rim.position.set(-1.6, 1.8, -1.6);
      scene.add(rim);

      const materials = createSceneMaterialBank(renderer);
      const charGeos = createCharacterGeometryBank();
      const extraGeos: THREE.BufferGeometry[] = [];
      const extraMats: THREE.Material[] = [];

      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(1.35, 1.5, 0.2, 8),
        materials.stoneApron
      );
      extraGeos.push(plinth.geometry);
      plinth.position.y = -0.1;
      scene.add(plinth);

      const goldRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.18, 0.025, 8, 28),
        materials.boardGoldTrim
      );
      extraGeos.push(goldRing.geometry);
      goldRing.rotation.x = Math.PI / 2;
      goldRing.position.y = 0.01;
      scene.add(goldRing);

      const rigs: CharacterRig[] = [];

      if (mode === 'pvp') {
        const whiteChamp = createCharacterPiece('n', 'w', charGeos, materials, 0.2);
        whiteChamp.root.position.set(-0.68, 0, 0.05);
        whiteChamp.body.rotation.y = Math.PI * 0.36;
        whiteChamp.root.scale.setScalar(0.92);
        scene.add(whiteChamp.root);

        const blackChamp = createCharacterPiece('k', 'b', charGeos, materials, 1.5);
        blackChamp.root.position.set(0.68, 0, 0.05);
        blackChamp.body.rotation.y = -Math.PI * 0.36;
        blackChamp.root.scale.setScalar(0.94);
        scene.add(blackChamp.root);

        rigs.push(whiteChamp, blackChamp);
      } else {
        const aiKing = createCharacterPiece('k', 'b', charGeos, materials, 0.8);
        aiKing.root.position.set(0, 0, 0);
        aiKing.body.rotation.y = 0.18;
        aiKing.root.scale.setScalar(1.06);
        scene.add(aiKing.root);

        const auraMat = new THREE.MeshBasicMaterial({
          color: 0xf4b942,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
        });
        extraMats.push(auraMat);
        const auraGeo = new THREE.RingGeometry(0.55, 0.64, 32);
        extraGeos.push(auraGeo);
        const aura = new THREE.Mesh(auraGeo, auraMat);
        aura.rotation.x = -Math.PI / 2;
        aura.position.y = 0.016;
        scene.add(aura);

        rigs.push(aiKing);
      }

      const handleResize = () => {
        if (disposed) return;
        const rw = container.clientWidth || 280;
        const rh = container.clientHeight || 140;
        camera.aspect = rw / rh;
        camera.updateProjectionMatrix();
        renderer.setSize(rw, rh);
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
      renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

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
        clock.getDelta();
        const t = clock.elapsedTime;

        if (!prefersReducedMotion) {
          for (let idx = 0; idx < rigs.length; idx++) {
            const rig = rigs[idx];
            const p = t * 2.0 + rig.phaseOffset;
            rig.torso.position.y = rig.torsoBaseY + Math.sin(p) * 0.01;
            rig.head.rotation.y = Math.sin(p * 0.55) * 0.1;
            if (rig.cape) {
              rig.cape.rotation.x = 0.16 + Math.sin(p * 1.2) * 0.04;
            }
            if (mode === 'ai' && idx === 0) {
              rig.body.rotation.y = Math.sin(t * 0.45) * 0.35;
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
        stopLoop();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        resizeObserver?.disconnect();
        window.removeEventListener('resize', handleResize);
        motionQuery?.removeEventListener('change', handleMotionChange);
        renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
        for (let i = 0; i < rigs.length; i++) {
          const geos = rigs[i].disposableGeos;
          for (let j = 0; j < geos.length; j++) geos[j].dispose();
        }
        extraGeos.forEach((g) => g.dispose());
        extraMats.forEach((m) => m.dispose());
        envRT.dispose();
        scene.environment = null;
        charGeos.dispose();
        materials.dispose();
        renderer.dispose();
        if (renderer.domElement.parentElement === container) {
          container.removeChild(renderer.domElement);
        }
      };
    };

    if (delayMs > 0) {
      startTimer = window.setTimeout(() => {
        startRaf = requestAnimationFrame(initScene);
      }, delayMs);
    } else {
      startRaf = requestAnimationFrame(initScene);
    }

    return () => {
      disposed = true;
      window.clearTimeout(startTimer);
      cancelAnimationFrame(startRaf);
      teardownScene?.();
    };
  }, [mode, delayMs]);

  return <div ref={mountRef} className="h-full w-full overflow-hidden" />;
}
