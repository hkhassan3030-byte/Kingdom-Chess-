import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  createCharacterGeometryBank,
  createCharacterPiece,
  type CharacterRig,
} from './createCharacterPieces';
import { createSceneMaterialBank } from './materials';
import { isSoftwareGlRenderer } from '../utils/webglDetect';
import type { GraphicsQuality } from '../types/chess';

interface HomeDioramaCanvasProps {
  quality: GraphicsQuality;
}

function createWispyCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 128);

  const puffs = [
    [68, 66, 54, 0.22],
    [118, 58, 62, 0.28],
    [168, 64, 56, 0.24],
    [206, 72, 42, 0.16],
    [95, 78, 48, 0.18],
  ];
  for (const [cx, cy, r, a] of puffs) {
    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
    grad.addColorStop(0, `rgba(195, 214, 244, ${a})`);
    grad.addColorStop(0.55, `rgba(145, 170, 212, ${a * 0.45})`);
    grad.addColorStop(1, 'rgba(90, 115, 155, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function HomeDioramaCanvas({ quality }: HomeDioramaCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const qualityRef = useRef(quality);
  qualityRef.current = quality;
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const moonKeyRef = useRef<THREE.DirectionalLight | null>(null);
  const isSoftwareGlRef = useRef(false);

  useEffect(() => {
    if (!rendererRef.current || !moonKeyRef.current || isSoftwareGlRef.current) return;
    const high = quality === 'high';
    rendererRef.current.shadowMap.enabled = high;
    moonKeyRef.current.castShadow = high;
    rendererRef.current.setPixelRatio(
      Math.min(window.devicePixelRatio, high ? 1.5 : 1.15)
    );
  }, [quality]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let disposed = false;
    let frameId = 0;

    const isSoftwareGl = isSoftwareGlRenderer();
    isSoftwareGlRef.current = isSoftwareGl;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      stencil: false,
    });
    rendererRef.current = renderer;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl
        ? 1
        : Math.min(window.devicePixelRatio, qualityRef.current === 'high' ? 1.25 : 1.0)
    );
    renderer.shadowMap.enabled = !isSoftwareGl && qualityRef.current === 'high';
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1220);
    scene.fog = new THREE.FogExp2(0x0e1626, 0.032);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.65;
    pmrem.dispose();

    let cachedAspect = w / h;
    const camera = new THREE.PerspectiveCamera(40, cachedAspect, 0.1, 140);
    const updateCameraForAspect = (aspect: number) => {
      // Pull camera slightly further back on narrow portrait phones so both Kings stay framed clearly
      const portraitShift = aspect < 0.72 ? 1.55 : aspect < 1.0 ? 1.25 : 1.0;
      camera.position.set(0, 1.58 * (portraitShift > 1 ? 1.06 : 1), 4.6 * portraitShift);
      camera.lookAt(0, 0.88, 0.1);
    };
    updateCameraForAspect(cachedAspect);

    // Lighting: Dramatic Moonlight Key + Cool Rim + Warm Torchlights
    const hemi = new THREE.HemisphereLight(0x6f8ec8, 0x221a16, 0.9);
    scene.add(hemi);

    const moonKey = new THREE.DirectionalLight(0xbcd6ff, 2.05);
    moonKeyRef.current = moonKey;
    moonKey.position.set(-4.5, 9.5, -5.5);
    moonKey.castShadow = !isSoftwareGl && qualityRef.current === 'high';
    moonKey.shadow.mapSize.set(1024, 1024);
    moonKey.shadow.camera.near = 1;
    moonKey.shadow.camera.far = 28;
    moonKey.shadow.camera.left = -5;
    moonKey.shadow.camera.right = 5;
    moonKey.shadow.camera.top = 5;
    moonKey.shadow.camera.bottom = -5;
    moonKey.shadow.bias = -0.0005;
    moonKey.shadow.normalBias = 0.025;
    scene.add(moonKey);

    // Soft front face fill so both Kings' sculpted faces & armor read cleanly
    const frontFill = new THREE.DirectionalLight(0xd9e6ff, 1.05);
    frontFill.position.set(0, 3.2, 6.5);
    scene.add(frontFill);

    const materials = createSceneMaterialBank(renderer);
    const charGeos = createCharacterGeometryBank();
    const extraGeos: THREE.BufferGeometry[] = [];
    const extraMats: THREE.Material[] = [];
    const extraTex: THREE.Texture[] = [];

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      extraGeos.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      extraMats.push(m);
      return m;
    };

    // Foreground Citadel Stone Dais / Duel Bridge
    const ground = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(38, 48)),
      materials.citadelGround
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.34;
    ground.receiveShadow = true;
    scene.add(ground);

    const daisBase = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(3.45, 3.9, 0.34, 8)),
      materials.stoneApron
    );
    daisBase.position.set(0, -0.17, 0.15);
    daisBase.receiveShadow = true;
    scene.add(daisBase);

    const daisTrim = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(3.46, 0.032, 8, 8)),
      materials.boardGoldTrim
    );
    daisTrim.rotation.x = Math.PI / 2;
    daisTrim.rotation.z = Math.PI / 8;
    daisTrim.position.set(0, 0.005, 0.15);
    scene.add(daisTrim);

    // Subtle 2-square royal inlay under the Kings
    const whiteTileInlay = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.18, 0.04, 1.18)),
      materials.lightTile
    );
    whiteTileInlay.position.set(-1.12, 0.005, 0.35);
    whiteTileInlay.receiveShadow = true;
    scene.add(whiteTileInlay);

    const blackTileInlay = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.18, 0.04, 1.18)),
      materials.darkTile
    );
    blackTileInlay.position.set(1.12, 0.005, 0.35);
    blackTileInlay.receiveShadow = true;
    scene.add(blackTileInlay);

    // Foreground Rival Kings using existing high-detail character models
    const whiteKing: CharacterRig = createCharacterPiece('k', 'w', charGeos, materials, 0.4);
    whiteKing.root.position.set(-1.12, 0.025, 0.35);
    whiteKing.body.rotation.y = Math.PI * 0.34;
    whiteKing.root.scale.setScalar(1.06);
    scene.add(whiteKing.root);

    const blackKing: CharacterRig = createCharacterPiece('k', 'b', charGeos, materials, 2.3);
    blackKing.root.position.set(1.12, 0.025, 0.35);
    blackKing.body.rotation.y = -Math.PI * 0.34;
    blackKing.root.scale.setScalar(1.06);
    scene.add(blackKing.root);

    // Flanking Torches / Stone Braziers
    const flames: THREE.Mesh[] = [];
    const torchLights: THREE.PointLight[] = [];
    const brazierPositions: Array<[number, number]> = [
      [-2.35, -0.3],
      [2.35, -0.3],
      [-3.1, -3.4],
      [3.1, -3.4],
    ];
    const pedestalGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.26, 0.92, 8));
    const bowlGeo = trackGeo(new THREE.CylinderGeometry(0.28, 0.14, 0.2, 8));
    const flameGeo = trackGeo(new THREE.ConeGeometry(0.13, 0.42, 7));

    brazierPositions.forEach(([bx, bz], idx) => {
      const ped = new THREE.Mesh(pedestalGeo, materials.ruinStone);
      ped.position.set(bx, 0.42, bz);
      ped.castShadow = idx < 2;
      ped.receiveShadow = true;
      scene.add(ped);

      const bowl = new THREE.Mesh(bowlGeo, materials.brazierIron);
      bowl.position.set(bx, 0.96, bz);
      scene.add(bowl);

      const flame = new THREE.Mesh(flameGeo, materials.brazierFlame);
      flame.position.set(bx, 1.2, bz);
      scene.add(flame);
      flames.push(flame);

      if (idx < 2) {
        const pt = new THREE.PointLight(0xff8e3c, 2.6, 8.5, 1.5);
        pt.position.set(bx, 1.45, bz + 0.15);
        scene.add(pt);
        torchLights.push(pt);
      }
    });

    // Distant Ancient Gothic Castle Silhouette
    const castleGroup = new THREE.Group();
    castleGroup.position.set(0, -0.34, -19.5);
    const castleMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x161d2c,
        roughness: 0.9,
        metalness: 0.12,
      })
    );
    const roofMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0f1522,
        roughness: 0.85,
        metalness: 0.18,
      })
    );
    const windowMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xffa642,
      })
    );

    const addTower = (tx: number, tz: number, r: number, th: number, spireH: number, hasWin = true) => {
      const tower = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(r * 0.92, r, th, 10)), castleMat);
      tower.position.set(tx, th * 0.5, tz);
      castleGroup.add(tower);

      const spire = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(r * 1.12, spireH, 10)), roofMat);
      spire.position.set(tx, th + spireH * 0.5 - 0.1, tz);
      castleGroup.add(spire);

      if (hasWin) {
        const win = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.14, 0.36)), windowMat);
        win.position.set(tx, th * 0.72, tz + r + 0.02);
        castleGroup.add(win);
      }
    };

    // Central Citadel Keep & Gatehouse
    const mainKeep = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.2, 6.2, 3.6)), castleMat);
    mainKeep.position.set(0, 3.1, 0);
    castleGroup.add(mainKeep);

    const keepRoof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(3.4, 3.8, 4)), roofMat);
    keepRoof.rotation.y = Math.PI / 4;
    keepRoof.position.set(0, 8.0, 0);
    castleGroup.add(keepRoof);

    // Curtain walls
    const leftWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(7.2, 3.2, 1.4)), castleMat);
    leftWall.position.set(-5.6, 1.6, 1.1);
    castleGroup.add(leftWall);

    const rightWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(7.2, 3.2, 1.4)), castleMat);
    rightWall.position.set(5.6, 1.6, 1.1);
    castleGroup.add(rightWall);

    addTower(0, -0.4, 1.35, 9.6, 3.6, true);
    addTower(-2.4, 0.9, 0.95, 7.1, 2.5, true);
    addTower(2.4, 0.9, 0.95, 7.1, 2.5, true);
    addTower(-5.2, 1.2, 0.85, 5.4, 2.2, true);
    addTower(5.2, 1.2, 0.85, 5.4, 2.2, true);
    addTower(-8.8, 1.3, 1.05, 6.2, 2.6, false);
    addTower(8.8, 1.3, 1.05, 6.2, 2.6, false);

    // Castle gatehouse glow
    const gateGlow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.95, 1.4)), windowMat);
    gateGlow.position.set(0, 1.1, 1.84);
    castleGroup.add(gateGlow);
    scene.add(castleGroup);

    // Jagged Mountain Silhouettes framing horizon
    const mountainMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0f1624,
        roughness: 0.95,
        metalness: 0.05,
      })
    );
    const mountainGeo = trackGeo(new THREE.ConeGeometry(1, 1, 5));
    const peaks: Array<[number, number, number, number]> = [
      [-24, -29, 11, 15],
      [-15, -31, 9, 13],
      [-6, -34, 12, 16],
      [7, -33, 11, 15],
      [16, -30, 9.5, 14],
      [25, -28, 11.5, 15.5],
    ];
    peaks.forEach(([px, pz, rad, mh], i) => {
      const m = new THREE.Mesh(mountainGeo, mountainMat);
      m.scale.set(rad, mh, rad * 0.85);
      m.position.set(px, mh * 0.34 - 0.5, pz);
      m.rotation.y = i * 0.7;
      scene.add(m);
    });

    // Dramatic Moon Disc & Halo in Twilight Sky
    const moonDisc = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(2.6, 32)),
      trackMat(new THREE.MeshBasicMaterial({ color: 0xdae8ff, fog: false }))
    );
    moonDisc.position.set(-7.5, 9.4, -36);
    scene.add(moonDisc);

    // Drifting Moving Clouds & Low-Lying Fog Planes
    const cloudTex = createWispyCloudTexture();
    extraTex.push(cloudTex);
    const cloudMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: cloudTex,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        fog: false,
      })
    );
    const cloudGeo = trackGeo(new THREE.PlaneGeometry(14, 4.5));
    const clouds: Array<{ mesh: THREE.Mesh; speed: number; baseX: number }> = [];
    const cloudSeeds: Array<[number, number, number, number, number]> = [
      [-12, 6.8, -24, 0.28, 1.1],
      [4, 8.2, -27, 0.22, 1.3],
      [14, 6.2, -22, 0.34, 1.0],
      [-6, 1.2, -10.5, 0.38, 0.9],
      [7, 1.0, -11.5, 0.31, 0.95],
    ];
    cloudSeeds.forEach(([cx, cy, cz, spd, sc]) => {
      const cm = new THREE.Mesh(cloudGeo, cloudMat);
      cm.position.set(cx, cy, cz);
      cm.scale.setScalar(sc);
      scene.add(cm);
      clouds.push({ mesh: cm, speed: spd, baseX: cx });
    });

    // Floating Fire Embers / Particles (mobile-optimized count)
    const emberCount = 45;
    const emberPositions = new Float32Array(emberCount * 3);
    const emberSpeeds = new Float32Array(emberCount);
    for (let i = 0; i < emberCount; i++) {
      emberPositions[i * 3] = (Math.random() - 0.5) * 9.5;
      emberPositions[i * 3 + 1] = Math.random() * 4.8;
      emberPositions[i * 3 + 2] = (Math.random() - 0.5) * 7.0;
      emberSpeeds[i] = 0.28 + Math.random() * 0.45;
    }
    const emberGeo = trackGeo(new THREE.BufferGeometry());
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
    const emberMat = trackMat(
      new THREE.PointsMaterial({
        map: materials.emberTexture,
        color: 0xffa644,
        size: 0.14,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    const embers = new THREE.Points(emberGeo, emberMat);
    scene.add(embers);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const handleResize = () => {
      if (disposed) return;
      const rw = container.clientWidth || window.innerWidth;
      const rh = container.clientHeight || window.innerHeight;
      cachedAspect = rw / rh;
      camera.aspect = cachedAspect;
      camera.updateProjectionMatrix();
      updateCameraForAspect(cachedAspect);
      renderer.setSize(rw, rh);
    };
    window.addEventListener('resize', handleResize);

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
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      // Subtle breathing, cape sway, head turns & weapon readiness on both rival Kings
      const animateKing = (rig: CharacterRig, phase: number, dirSign: number) => {
        const b = t * 1.9 + phase;
        rig.torso.position.y = rig.torsoBaseY + Math.sin(b) * 0.011;
        rig.head.rotation.y = Math.sin(b * 0.52) * 0.09 + dirSign * 0.06;
        rig.head.rotation.x = Math.sin(b * 0.4) * 0.025;
        rig.rightArm.rotation.x = -0.3 + Math.sin(b * 0.85) * 0.045;
        rig.leftArm.rotation.x = -0.24 + Math.cos(b * 0.75) * 0.03;
        if (rig.cape) {
          rig.cape.rotation.x = 0.16 + Math.sin(b * 1.35) * 0.05;
          rig.cape.rotation.z = Math.sin(b * 1.05) * 0.03;
        }
      };
      animateKing(whiteKing, 0.2, 1);
      animateKing(blackKing, 2.1, -1);

      // Torch flicker
      for (let idx = 0; idx < flames.length; idx++) {
        const f = flames[idx];
        const s = 1 + Math.sin(t * 10.2 + idx * 1.9) * 0.15;
        f.scale.set(0.92 * s, 1.32 * s, 0.92 * s);
        f.rotation.y = t * 2.1 + idx;
      }
      for (let idx = 0; idx < torchLights.length; idx++) {
        torchLights[idx].intensity = 2.5 + Math.sin(t * 11.4 + idx * 2.3) * 0.35;
      }

      // Cloud & fog drift
      for (let idx = 0; idx < clouds.length; idx++) {
        const c = clouds[idx];
        c.mesh.position.x += c.speed * dt;
        if (c.mesh.position.x > 22) c.mesh.position.x = -22;
      }

      // Rising fire embers
      const attr = emberGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < emberCount; i++) {
        const i3 = i * 3;
        arr[i3 + 1] += emberSpeeds[i] * dt;
        arr[i3] += Math.sin(t * 1.4 + i) * 0.0025;
        if (arr[i3 + 1] > 4.8) {
          arr[i3 + 1] = 0.05;
          arr[i3] = (Math.random() - 0.5) * 9.5;
        }
      }
      attr.needsUpdate = true;

      // Subtle living camera sway (uses cached aspect ratio — zero DOM reflow)
      const portraitShift = cachedAspect < 0.72 ? 1.55 : cachedAspect < 1.0 ? 1.25 : 1.0;
      camera.position.x = Math.sin(t * 0.25) * 0.22;
      camera.position.y = (1.58 * (portraitShift > 1 ? 1.06 : 1)) + Math.sin(t * 0.35) * 0.04;
      camera.lookAt(0, 0.88, 0.1);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      rendererRef.current = null;
      moonKeyRef.current = null;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      for (let i = 0; i < whiteKing.disposableGeos.length; i++) {
        whiteKing.disposableGeos[i].dispose();
      }
      for (let i = 0; i < blackKing.disposableGeos.length; i++) {
        blackKing.disposableGeos[i].dispose();
      }
      extraGeos.forEach((g) => g.dispose());
      extraMats.forEach((m) => m.dispose());
      extraTex.forEach((tx) => tx.dispose());
      charGeos.dispose();
      materials.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 h-full w-full overflow-hidden" />;
}
