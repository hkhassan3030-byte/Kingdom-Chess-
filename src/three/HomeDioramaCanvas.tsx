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

let _cachedSkyCanvas: HTMLCanvasElement | null = null;
let _cachedMoonDiscCanvas: HTMLCanvasElement | null = null;
let _cachedMoonHaloCanvas: HTMLCanvasElement | null = null;
let _cachedMasonryCanvases: { albedo: HTMLCanvasElement; normal: HTMLCanvasElement } | null = null;
let _cachedCloudCanvas: HTMLCanvasElement | null = null;

function createSkyGradientTexture(): THREE.CanvasTexture {
  if (!_cachedSkyCanvas) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, '#040811');
    grad.addColorStop(0.24, '#091224');
    grad.addColorStop(0.54, '#11213f');
    grad.addColorStop(0.82, '#1b3054');
    grad.addColorStop(1.0, '#0f192d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 512);

    // Subtle deterministic starfield high in the night canopy
    for (let i = 0; i < 34; i++) {
      const sx = (i * 47 + 19) % 124 + 2;
      const sy = 14 + ((i * 73 + 11) % 210);
      const alpha = 0.28 + ((i * 29) % 45) / 100;
      const sz = i % 7 === 0 ? 2 : 1;
      ctx.fillStyle = `rgba(220, 234, 255, ${alpha.toFixed(2)})`;
      ctx.fillRect(sx, sy, sz, sz);
    }
    _cachedSkyCanvas = canvas;
  }

  const tex = new THREE.CanvasTexture(_cachedSkyCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMoonDiscTexture(): THREE.CanvasTexture {
  if (!_cachedMoonDiscCanvas) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const baseGrad = ctx.createRadialGradient(104, 96, 18, 128, 128, 128);
    baseGrad.addColorStop(0.0, '#f4f8ff');
    baseGrad.addColorStop(0.68, '#dceaff');
    baseGrad.addColorStop(1.0, '#b5ceef');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, size, size);

    // Subtle lunar mare shading for depth without visual noise
    const patches: Array<[number, number, number, number]> = [
      [94, 88, 36, 0.12],
      [152, 118, 42, 0.1],
      [118, 162, 30, 0.09],
      [164, 76, 22, 0.08],
    ];
    for (const [px, py, r, a] of patches) {
      const g = ctx.createRadialGradient(px, py, 2, px, py, r);
      g.addColorStop(0, `rgba(116, 146, 194, ${a})`);
      g.addColorStop(1, 'rgba(116, 146, 194, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    _cachedMoonDiscCanvas = canvas;
  }

  const tex = new THREE.CanvasTexture(_cachedMoonDiscCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMoonHaloTexture(): THREE.CanvasTexture {
  if (!_cachedMoonHaloCanvas) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 124);
    grad.addColorStop(0.0, 'rgba(220, 236, 255, 0.52)');
    grad.addColorStop(0.32, 'rgba(136, 182, 248, 0.24)');
    grad.addColorStop(0.68, 'rgba(84, 132, 208, 0.08)');
    grad.addColorStop(1.0, 'rgba(40, 72, 128, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    _cachedMoonHaloCanvas = canvas;
  }
  const tex = new THREE.CanvasTexture(_cachedMoonHaloCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCastleMasonryMaps(): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  if (!_cachedMasonryCanvases) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const hCanvas = document.createElement('canvas');
    hCanvas.width = size;
    hCanvas.height = size;
    const hCtx = hCanvas.getContext('2d')!;

    ctx.fillStyle = '#334157';
    ctx.fillRect(0, 0, size, size);
    hCtx.fillStyle = '#808080';
    hCtx.fillRect(0, 0, size, size);

    const rows = 8;
    const rowH = size / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const cols = 4;
      const colW = size / cols;
      const offset = (r % 2) * (colW * 0.5);

      for (let c = -1; c <= cols; c++) {
        const x = c * colW + offset;
        const shade = 48 + ((r * 7 + c * 13) & 15);
        ctx.fillStyle = `rgb(${shade}, ${shade + 13}, ${shade + 32})`;
        ctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);

        hCtx.fillStyle = `rgb(${132 + ((r * 5 + c * 11) & 15)}, ${132 + ((r * 5 + c * 11) & 15)}, ${132 + ((r * 5 + c * 11) & 15)})`;
        hCtx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);

        // Subtle moonlit top bevel on stone blocks
        ctx.fillStyle = 'rgba(182, 208, 246, 0.1)';
        ctx.fillRect(x + 2, y + 2, colW - 4, 3);
      }

      // Horizontal mortar seam
      ctx.fillStyle = 'rgba(12, 18, 28, 0.68)';
      ctx.fillRect(0, y, size, 2);
      hCtx.fillStyle = '#2c2c2c';
      hCtx.fillRect(0, y, size, 2);
    }

    // Sobel normal generation from masonry heightfield
    const src = hCtx.getImageData(0, 0, size, size).data;
    const nCanvas = document.createElement('canvas');
    nCanvas.width = size;
    nCanvas.height = size;
    const nCtx = nCanvas.getContext('2d')!;
    const nImg = nCtx.createImageData(size, size);
    const dst = nImg.data;
    const sample = (x: number, y: number): number => {
      const wx = ((x % size) + size) % size;
      const wy = ((y % size) + size) % size;
      return src[(wy * size + wx) * 4] / 255;
    };
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = sample(x + 1, y) - sample(x - 1, y);
        const dy = sample(x, y + 1) - sample(x, y - 1);
        let nx = -dx * 2.2;
        let ny = -dy * 2.2;
        let nz = 1.0;
        const inv = 1 / Math.hypot(nx, ny, nz);
        nx *= inv;
        ny *= inv;
        nz *= inv;
        const idx = (y * size + x) * 4;
        dst[idx] = Math.round((nx * 0.5 + 0.5) * 255);
        dst[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        dst[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        dst[idx + 3] = 255;
      }
    }
    nCtx.putImageData(nImg, 0, 0);
    _cachedMasonryCanvases = { albedo: canvas, normal: nCanvas };
  }

  const map = new THREE.CanvasTexture(_cachedMasonryCanvases.albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);

  const normalMap = new THREE.CanvasTexture(_cachedMasonryCanvases.normal);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(3, 3);

  return { map, normalMap };
}

function createWispyCloudTexture(): THREE.CanvasTexture {
  if (!_cachedCloudCanvas) {
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
      grad.addColorStop(0, `rgba(188, 212, 246, ${a})`);
      grad.addColorStop(0.55, `rgba(132, 162, 210, ${a * 0.45})`);
      grad.addColorStop(1, 'rgba(72, 100, 148, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    _cachedCloudCanvas = canvas;
  }

  const tex = new THREE.CanvasTexture(_cachedCloudCanvas);
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
      Math.min(window.devicePixelRatio, high ? 1.35 : 1.0)
    );
  }, [quality]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let disposed = false;
    let contextLost = false;
    let isPausedHidden = typeof document !== 'undefined' ? document.hidden : false;
    let frameId = 0;
    const stopLoop = () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      frameId = 0;
    };

    const motionQuery =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    let prefersReducedMotion = Boolean(motionQuery?.matches);

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
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(
      isSoftwareGl
        ? 1
        : Math.min(window.devicePixelRatio, qualityRef.current === 'high' ? 1.35 : 1.0)
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
    scene.background = new THREE.Color(0x0b1324);
    // Calibrated atmospheric depth haze that preserves castle & keep readability
    scene.fog = new THREE.FogExp2(0x101c34, 0.0155);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmrem.fromScene(roomEnv, 0.04);
    roomEnv.dispose();
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.65;
    pmrem.dispose();

    // Camera rig: keeps both foreground Kings completely uncropped on 360-430px portrait phones
    // while revealing the full stone causeway & background medieval castle between/above them
    let cachedAspect = w / Math.max(h, 1);
    const camera = new THREE.PerspectiveCamera(44, cachedAspect, 0.1, 160);
    const camRig = {
      baseY: 1.72,
      baseZ: 7.4,
      lookY: 1.38,
      lookZ: -0.2,
    };

    const updateCameraForAspect = (aspect: number) => {
      const vFov = aspect < 0.72 ? 46 : aspect < 1.0 ? 43 : 40;
      camera.fov = vFov;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();

      const tanHalfV = Math.tan(THREE.MathUtils.degToRad(vFov * 0.5));
      const tanHalfH = tanHalfV * Math.max(aspect, 0.36);
      // Kings stand at x = +/-0.70, z = 0.92 with weapons/capes extending cleanly within portrait margins
      const targetHalfWidth = aspect < 0.72 ? 1.46 : 1.42;
      const distToKings = THREE.MathUtils.clamp(targetHalfWidth / tanHalfH, 5.65, 7.6);

      camRig.baseZ = 0.92 + distToKings;
      camRig.baseY = aspect < 0.72 ? 1.76 : 1.74;
      camRig.lookY = aspect < 0.72 ? 1.62 : 1.48;
      camRig.lookZ = -0.35;

      camera.position.set(0, camRig.baseY, camRig.baseZ);
      camera.lookAt(0, camRig.lookY, camRig.lookZ);
    };
    updateCameraForAspect(cachedAspect);

    // 4-point cinematic lighting: Cool Blue Moonlight Key & Rim + Warm Foreground Torchlight
    const hemi = new THREE.HemisphereLight(0x7ca3e8, 0x261c15, 0.96);
    scene.add(hemi);

    const moonKey = new THREE.DirectionalLight(0xc2dcff, 2.25);
    moonKeyRef.current = moonKey;
    moonKey.position.set(-5.2, 11.5, -5.5);
    moonKey.castShadow = !isSoftwareGl && qualityRef.current === 'high';
    moonKey.shadow.mapSize.set(1024, 1024);
    moonKey.shadow.camera.near = 1;
    moonKey.shadow.camera.far = 30;
    moonKey.shadow.camera.left = -5.5;
    moonKey.shadow.camera.right = 5.5;
    moonKey.shadow.camera.top = 5.5;
    moonKey.shadow.camera.bottom = -5.5;
    moonKey.shadow.bias = -0.0005;
    moonKey.shadow.normalBias = 0.025;
    scene.add(moonKey);

    // Cool moonlight rim light raking across the castle battlements & Kings' silhouettes
    const moonRim = new THREE.DirectionalLight(0x79b2ff, 1.55);
    moonRim.position.set(4.5, 9.2, -26);
    moonRim.target.position.set(0, 2.2, -8);
    scene.add(moonRim);
    scene.add(moonRim.target);

    // Soft front face fill + warm royal foreground key so upper bodies, crowns, weapons & armor stand out
    const frontFill = new THREE.DirectionalLight(0xdce9ff, 1.28);
    frontFill.position.set(0, 2.75, 7.4);
    scene.add(frontFill);

    const kingHeroLight = new THREE.PointLight(0xffbe6b, 2.15, 6.2, 1.4);
    kingHeroLight.position.set(0, 2.35, 2.45);
    scene.add(kingHeroLight);

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
    const trackTex = <T extends THREE.Texture>(t: T): T => {
      extraTex.push(t);
      return t;
    };

    // Twilight Gradient Sky Backdrop
    const skyTex = trackTex(createSkyGradientTexture());
    const skyPlane = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(118, 54)),
      trackMat(
        new THREE.MeshBasicMaterial({
          map: skyTex,
          fog: false,
          depthWrite: false,
        })
      )
    );
    skyPlane.position.set(0, 12.5, -45);
    scene.add(skyPlane);

    // Full Moon Disc + Soft Atmospheric Halo positioned safely inside portrait & wide frames
    const moonHaloTex = trackTex(createMoonHaloTexture());
    const moonHalo = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(11.5, 11.5)),
      trackMat(
        new THREE.MeshBasicMaterial({
          map: moonHaloTex,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          fog: false,
          blending: THREE.AdditiveBlending,
        })
      )
    );
    moonHalo.position.set(-4.6, 8.8, -36.5);
    scene.add(moonHalo);

    const moonDiscTex = trackTex(createMoonDiscTexture());
    const moonDisc = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(2.05, 32)),
      trackMat(new THREE.MeshBasicMaterial({ map: moonDiscTex, fog: false }))
    );
    moonDisc.position.set(-4.6, 8.8, -36.0);
    scene.add(moonDisc);

    // Foreground Citadel Ground & Royal Duel Dais
    const ground = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(44, 48)),
      materials.citadelGround
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.34;
    ground.receiveShadow = true;
    scene.add(ground);

    const daisBase = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(3.25, 3.72, 0.34, 8)),
      materials.stoneApron
    );
    daisBase.position.set(0, -0.17, 0.35);
    daisBase.receiveShadow = true;
    scene.add(daisBase);

    const daisTrim = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(3.26, 0.032, 8, 8)),
      materials.boardGoldTrim
    );
    daisTrim.rotation.x = Math.PI / 2;
    daisTrim.rotation.z = Math.PI / 8;
    daisTrim.position.set(0, 0.005, 0.35);
    scene.add(daisTrim);

    // Royal Duel Squares under the opposing Kings with framed gold trim bevels
    const whiteTileInlay = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.06, 0.04, 1.06)),
      materials.lightTile
    );
    whiteTileInlay.position.set(-0.7, 0.005, 0.92);
    whiteTileInlay.receiveShadow = true;
    scene.add(whiteTileInlay);

    const blackTileInlay = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.06, 0.04, 1.06)),
      materials.darkTile
    );
    blackTileInlay.position.set(0.7, 0.005, 0.92);
    blackTileInlay.receiveShadow = true;
    scene.add(blackTileInlay);

    const tileTrimGeo = trackGeo(new THREE.BoxGeometry(1.13, 0.026, 1.13));
    for (const tx of [-0.7, 0.7]) {
      const tileFrame = new THREE.Mesh(tileTrimGeo, materials.boardGoldTrim);
      tileFrame.position.set(tx, -0.001, 0.92);
      tileFrame.receiveShadow = true;
      scene.add(tileFrame);
    }

    // Existing Detailed White & Black King Characters Facing Off in Commanding 3/4 Champion Stance
    const whiteKing: CharacterRig = createCharacterPiece('k', 'w', charGeos, materials, 0.4);
    whiteKing.root.position.set(-0.7, 0.025, 0.92);
    whiteKing.body.rotation.y = Math.PI * 0.36;
    whiteKing.root.scale.setScalar(1.14);
    scene.add(whiteKing.root);

    const blackKing: CharacterRig = createCharacterPiece('k', 'b', charGeos, materials, 2.3);
    blackKing.root.position.set(0.7, 0.025, 0.92);
    blackKing.body.rotation.y = -Math.PI * 0.36;
    blackKing.root.scale.setScalar(1.14);
    scene.add(blackKing.root);

    // Midground Stepped Stone Causeway connecting the Royal Dais toward the Castle Gatehouse
    const masonryMaps = createCastleMasonryMaps();
    trackTex(masonryMaps.map);
    trackTex(masonryMaps.normalMap);

    const causewayMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: masonryMaps.map,
        normalMap: masonryMaps.normalMap,
        normalScale: new THREE.Vector2(0.55, 0.55),
        color: 0x627392,
        roughness: 0.84,
        metalness: 0.1,
      })
    );
    const causewayCurbMat = trackMat(
      new THREE.MeshStandardMaterial({
        normalMap: masonryMaps.normalMap,
        normalScale: new THREE.Vector2(0.4, 0.4),
        color: 0x41526e,
        roughness: 0.78,
        metalness: 0.16,
      })
    );
    const causewaySteps = 5;
    for (let s = 0; s < causewaySteps; s++) {
      const stepW = 2.6 + s * 0.14;
      const stepY = -0.24 + s * 0.18;
      const stepZ = -3.4 - s * 2.4;
      const slab = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(stepW, 0.36, 2.6)), causewayMat);
      slab.position.set(0, stepY, stepZ);
      slab.receiveShadow = true;
      scene.add(slab);

      const leftCurb = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.44, 2.6)), causewayCurbMat);
      leftCurb.position.set(-stepW * 0.5 + 0.09, stepY + 0.06, stepZ);
      scene.add(leftCurb);

      const rightCurb = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.44, 2.6)), causewayCurbMat);
      rightCurb.position.set(stepW * 0.5 - 0.09, stepY + 0.06, stepZ);
      scene.add(rightCurb);
    }

    // Flanking Torches / Stone Braziers (foreground dais + midground causeway)
    const flames: THREE.Mesh[] = [];
    const torchLights: THREE.PointLight[] = [];
    const brazierPositions: Array<[number, number, number]> = [
      [-1.76, 0.0, 0.02],
      [1.76, 0.0, 0.02],
      [-1.78, 0.08, -4.6],
      [1.78, 0.08, -4.6],
      [-1.95, 0.42, -9.8],
      [1.95, 0.42, -9.8],
    ];
    const pedestalGeo = trackGeo(new THREE.CylinderGeometry(0.16, 0.24, 0.88, 8));
    const bowlGeo = trackGeo(new THREE.CylinderGeometry(0.25, 0.13, 0.18, 8));
    const flameGeo = trackGeo(new THREE.ConeGeometry(0.12, 0.38, 7));

    brazierPositions.forEach(([bx, by, bz], idx) => {
      const ped = new THREE.Mesh(pedestalGeo, materials.ruinStone);
      ped.position.set(bx, by + 0.42, bz);
      ped.castShadow = idx < 2;
      ped.receiveShadow = true;
      scene.add(ped);

      const bowl = new THREE.Mesh(bowlGeo, materials.brazierIron);
      bowl.position.set(bx, by + 0.94, bz);
      scene.add(bowl);

      const flame = new THREE.Mesh(flameGeo, materials.brazierFlame);
      flame.position.set(bx, by + 1.16, bz);
      scene.add(flame);
      flames.push(flame);

      if (idx < 2) {
        const pt = new THREE.PointLight(0xff8e3c, 2.75, 8.8, 1.45);
        pt.position.set(bx, by + 1.45, bz + 0.25);
        scene.add(pt);
        torchLights.push(pt);
      }
    });

    // Background Medieval Fantasy Castle with Integrated Archway & Portcullis Gatehouse
    const castleGroup = new THREE.Group();
    castleGroup.position.set(0, -0.34, -16.8);

    const castleStoneMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: masonryMaps.map,
        normalMap: masonryMaps.normalMap,
        normalScale: new THREE.Vector2(0.7, 0.7),
        color: 0x8ea4c4,
        roughness: 0.84,
        metalness: 0.12,
      })
    );
    const castleTrimMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x4b5d7a,
        roughness: 0.78,
        metalness: 0.2,
      })
    );
    const roofMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x182338,
        roughness: 0.72,
        metalness: 0.24,
      })
    );
    const darkRecessMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x090d16,
        roughness: 0.95,
        metalness: 0.05,
      })
    );
    const ironMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x1d2432,
        roughness: 0.48,
        metalness: 0.78,
      })
    );
    const windowMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xffa642,
      })
    );

    // Elevated Citadel Cliff / Terrace Plinth grounding the castle cleanly
    const plinthLower = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(22.5, 1.4, 7.8)),
      castleTrimMat
    );
    plinthLower.position.set(0, 0.1, 0.2);
    castleGroup.add(plinthLower);

    const plinthUpper = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(11.6, 0.85, 6.2)),
      castleStoneMat
    );
    plinthUpper.position.set(0, 1.05, 0.1);
    castleGroup.add(plinthUpper);

    const addMerlons = (
      startX: number,
      endX: number,
      y: number,
      z: number,
      step = 0.48
    ) => {
      const merlonGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.3, 0.28));
      for (let mx = startX; mx <= endX + 0.01; mx += step) {
        const m = new THREE.Mesh(merlonGeo, castleTrimMat);
        m.position.set(mx, y, z);
        castleGroup.add(m);
      }
    };

    const addLancetWindow = (wx: number, wy: number, wz: number, scaleY = 1) => {
      const frame = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.2, 0.46 * scaleY, 0.08)),
        castleTrimMat
      );
      frame.position.set(wx, wy, wz);
      castleGroup.add(frame);

      const pane = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(0.11, 0.34 * scaleY)),
        windowMat
      );
      pane.position.set(wx, wy, wz + 0.045);
      castleGroup.add(pane);
    };

    const addTower = (
      tx: number,
      tz: number,
      baseY: number,
      r: number,
      th: number,
      spireH: number,
      windows = true
    ) => {
      const tower = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(r * 0.94, r * 1.04, th, 10)),
        castleStoneMat
      );
      tower.position.set(tx, baseY + th * 0.5, tz);
      castleGroup.add(tower);

      const collar = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(r * 1.08, r * 1.02, 0.32, 10)),
        castleTrimMat
      );
      collar.position.set(tx, baseY + th + 0.04, tz);
      castleGroup.add(collar);

      const spire = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(r * 1.14, spireH, 10)),
        roofMat
      );
      spire.position.set(tx, baseY + th + spireH * 0.5 + 0.14, tz);
      castleGroup.add(spire);

      const finial = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.025, 0.04, 0.42, 6)),
        castleTrimMat
      );
      finial.position.set(tx, baseY + th + spireH + 0.24, tz);
      castleGroup.add(finial);

      if (windows) {
        addLancetWindow(tx, baseY + th * 0.68, tz + r * 0.96, 1.0);
        if (th > 4.5) {
          addLancetWindow(tx, baseY + th * 0.36, tz + r * 0.98, 0.82);
        }
      }
    };

    // Integrated Central Gatehouse (centered cleanly between the two foreground Kings)
    const gateBaseY = 1.45;
    const gateWallLeft = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.55, 2.55, 1.5)),
      castleStoneMat
    );
    gateWallLeft.position.set(-0.76, gateBaseY + 1.27, 2.05);
    castleGroup.add(gateWallLeft);

    const gateWallRight = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.55, 2.55, 1.5)),
      castleStoneMat
    );
    gateWallRight.position.set(0.76, gateBaseY + 1.27, 2.05);
    castleGroup.add(gateWallRight);

    const gateLintel = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.15, 1.05, 1.55)),
      castleStoneMat
    );
    gateLintel.position.set(0, gateBaseY + 2.95, 2.05);
    castleGroup.add(gateLintel);
    addMerlons(-0.96, 0.96, gateBaseY + 3.6, 2.7, 0.48);

    // Carved stone archway piers & crown around the gate opening
    const archCrown = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.54, 0.11, 8, 16, Math.PI)),
      castleTrimMat
    );
    archCrown.position.set(0, gateBaseY + 1.45, 2.82);
    castleGroup.add(archCrown);

    const leftPier = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.2, 1.55, 0.22)),
      castleTrimMat
    );
    leftPier.position.set(-0.54, gateBaseY + 0.78, 2.82);
    castleGroup.add(leftPier);

    const rightPier = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.2, 1.55, 0.22)),
      castleTrimMat
    );
    rightPier.position.set(0.54, gateBaseY + 0.78, 2.82);
    castleGroup.add(rightPier);

    // Deep recessed gate tunnel + warm inner hearth glow behind wrought-iron portcullis
    const gateRecessBack = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.12, 2.05, 0.2)),
      darkRecessMat
    );
    gateRecessBack.position.set(0, gateBaseY + 1.02, 1.55);
    castleGroup.add(gateRecessBack);

    const gateLanternBounce = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(0.78, 1.28)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: 0xd97d2e,
          transparent: true,
          opacity: 0.72,
        })
      )
    );
    gateLanternBounce.position.set(0, gateBaseY + 0.86, 1.72);
    castleGroup.add(gateLanternBounce);

    // Iron portcullis grille bars recessed inside the stone arch
    const barGeo = trackGeo(new THREE.CylinderGeometry(0.022, 0.022, 1.38, 6));
    for (let bx = -0.36; bx <= 0.37; bx += 0.18) {
      const bar = new THREE.Mesh(barGeo, ironMat);
      bar.position.set(bx, gateBaseY + 1.25, 2.48);
      castleGroup.add(bar);
    }
    const crossBarGeo = trackGeo(new THREE.BoxGeometry(0.92, 0.045, 0.045));
    for (const by of [0.76, 1.15, 1.54]) {
      const cBar = new THREE.Mesh(crossBarGeo, ironMat);
      cBar.position.set(0, gateBaseY + by, 2.48);
      castleGroup.add(cBar);
    }

    // Subtle warm bounce light inside the gatehouse archway
    const gateWarmLight = new THREE.PointLight(0xff9238, 2.4, 7.2, 1.6);
    gateWarmLight.position.set(0, gateBaseY + 1.2, 2.55);
    castleGroup.add(gateWarmLight);

    // Twin Drum Gatehouse Towers framing the central arch + heraldic gatehouse banners
    addTower(-1.42, 2.05, gateBaseY, 0.68, 4.15, 1.75, true);
    addTower(1.42, 2.05, gateBaseY, 0.68, 4.15, 1.75, true);

    const bannerPoleGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.04, 0.04));
    const bannerClothGeo = trackGeo(new THREE.PlaneGeometry(0.34, 1.15));
    const whiteBannerMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.72, metalness: 0.08 })
    );
    const blackBannerMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x8b1a24, roughness: 0.72, metalness: 0.08 })
    );
    const bannerSpecs: Array<[number, THREE.Material]> = [
      [-1.42, whiteBannerMat],
      [1.42, blackBannerMat],
    ];
    for (const [bx, bMat] of bannerSpecs) {
      const pole = new THREE.Mesh(bannerPoleGeo, materials.boardGoldTrim);
      pole.position.set(bx, gateBaseY + 3.45, 2.75);
      castleGroup.add(pole);
      const cloth = new THREE.Mesh(bannerClothGeo, bMat);
      cloth.position.set(bx, gateBaseY + 2.84, 2.76);
      castleGroup.add(cloth);
    }

    // Grand Tiered Citadel Keep rising behind the Gatehouse (framed below title lockup)
    const mainKeep = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.3, 4.0, 2.8)),
      castleStoneMat
    );
    mainKeep.position.set(0, gateBaseY + 2.0, -0.35);
    castleGroup.add(mainKeep);
    addMerlons(-1.95, 1.95, gateBaseY + 4.14, 1.0, 0.48);

    const upperKeep = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.5, 1.75, 2.0)),
      castleStoneMat
    );
    upperKeep.position.set(0, gateBaseY + 4.65, -0.45);
    castleGroup.add(upperKeep);

    const keepRoof = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(1.86, 1.95, 4)),
      roofMat
    );
    keepRoof.rotation.y = Math.PI / 4;
    keepRoof.position.set(0, gateBaseY + 6.45, -0.45);
    castleGroup.add(keepRoof);

    // Keep upper lancet windows
    addLancetWindow(-0.52, gateBaseY + 4.6, 0.56, 1.0);
    addLancetWindow(0.52, gateBaseY + 4.6, 0.56, 1.0);
    addLancetWindow(0, gateBaseY + 3.25, 1.06, 1.15);

    // Portrait-Visible Inner Bastion Towers (x = +/-3.1 and +/-4.3 stay inside 360px phone frame)
    const innerCurtainL = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.2, 2.65, 1.1)),
      castleStoneMat
    );
    innerCurtainL.position.set(-2.9, gateBaseY + 1.32, 0.9);
    castleGroup.add(innerCurtainL);
    addMerlons(-4.2, -1.8, gateBaseY + 2.78, 1.35, 0.48);

    const innerCurtainR = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.2, 2.65, 1.1)),
      castleStoneMat
    );
    innerCurtainR.position.set(2.9, gateBaseY + 1.32, 0.9);
    castleGroup.add(innerCurtainR);
    addMerlons(1.8, 4.2, gateBaseY + 2.78, 1.35, 0.48);

    addTower(-2.85, 0.55, gateBaseY, 0.72, 4.95, 1.95, true);
    addTower(2.85, 0.55, gateBaseY, 0.72, 4.95, 1.95, true);
    addTower(-4.25, 1.15, 0.8, 0.64, 3.85, 1.65, true);
    addTower(4.25, 1.15, 0.8, 0.64, 3.85, 1.65, true);

    // Outer Fortress Wings & Bastion Towers (revealed on tablets & desktop landscape)
    const outerWallL = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(6.4, 2.35, 1.1)),
      castleStoneMat
    );
    outerWallL.position.set(-7.1, 1.8, 1.1);
    castleGroup.add(outerWallL);

    const outerWallR = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(6.4, 2.35, 1.1)),
      castleStoneMat
    );
    outerWallR.position.set(7.1, 1.8, 1.1);
    castleGroup.add(outerWallR);

    addTower(-6.9, 1.25, 0.75, 0.78, 4.4, 1.85, true);
    addTower(6.9, 1.25, 0.75, 0.78, 4.4, 1.85, true);
    addTower(-9.9, 1.35, 0.7, 0.92, 5.1, 2.2, false);
    addTower(9.9, 1.35, 0.7, 0.92, 5.1, 2.2, false);

    scene.add(castleGroup);

    // Distant Jagged Mountain Silhouettes framing horizon
    const mountainMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x131d32,
        roughness: 0.94,
        metalness: 0.06,
      })
    );
    const mountainGeo = trackGeo(new THREE.ConeGeometry(1, 1, 5));
    const peaks: Array<[number, number, number, number]> = [
      [-23, -29, 10.5, 14.5],
      [-13.5, -31.5, 8.8, 12.8],
      [-5.2, -33.5, 9.6, 13.6],
      [5.8, -33, 9.4, 13.2],
      [14.5, -30.5, 9.2, 13.5],
      [24, -28.5, 11.2, 15.0],
    ];
    peaks.forEach(([px, pz, rad, mh], i) => {
      const m = new THREE.Mesh(mountainGeo, mountainMat);
      m.scale.set(rad, mh, rad * 0.85);
      m.position.set(px, mh * 0.33 - 0.5, pz);
      m.rotation.y = i * 0.7;
      scene.add(m);
    });

    // Drifting High Clouds & Midground Valley Mist Planes
    const cloudTex = trackTex(createWispyCloudTexture());
    const cloudMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: cloudTex,
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
        fog: false,
      })
    );
    const mistMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: cloudTex,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        fog: true,
      })
    );
    const cloudGeo = trackGeo(new THREE.PlaneGeometry(14, 4.2));
    const clouds: Array<{ mesh: THREE.Mesh; speed: number }> = [];
    const cloudSeeds: Array<[number, number, number, number, number, boolean]> = [
      [-10, 7.6, -26, 0.26, 1.15, false],
      [3.5, 8.8, -28, 0.2, 1.25, false],
      [13, 7.0, -24, 0.3, 1.0, false],
      [-4.2, 0.85, -8.5, 0.34, 0.78, true],
      [4.5, 0.95, -11.5, 0.28, 0.86, true],
    ];
    cloudSeeds.forEach(([cx, cy, cz, spd, sc, isMist]) => {
      const cm = new THREE.Mesh(cloudGeo, isMist ? mistMat : cloudMat);
      cm.position.set(cx, cy, cz);
      cm.scale.setScalar(sc);
      scene.add(cm);
      clouds.push({ mesh: cm, speed: spd });
    });

    // Floating Fire Embers / Particles (mobile-optimized count)
    const emberCount = 36;
    const emberPositions = new Float32Array(emberCount * 3);
    const emberSpeeds = new Float32Array(emberCount);
    for (let i = 0; i < emberCount; i++) {
      emberPositions[i * 3] = (Math.random() - 0.5) * 7.5;
      emberPositions[i * 3 + 1] = Math.random() * 4.2;
      emberPositions[i * 3 + 2] = (Math.random() - 0.5) * 6.5;
      emberSpeeds[i] = 0.26 + Math.random() * 0.42;
    }
    const emberGeo = trackGeo(new THREE.BufferGeometry());
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
    const emberMat = trackMat(
      new THREE.PointsMaterial({
        map: materials.emberTexture,
        color: 0xffa644,
        size: 0.13,
        transparent: true,
        opacity: 0.82,
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
      cachedAspect = rw / Math.max(rh, 1);
      updateCameraForAspect(cachedAspect);
      renderer.setSize(rw, rh);
      if (!isSoftwareGl) {
        const high = qualityRef.current === 'high';
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 1.35 : 1.0));
      }
      if (prefersReducedMotion) {
        renderer.render(scene, camera);
      }
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    resizeObserver?.observe(container);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
      stopLoop();
    };
    const handleContextRestored = () => {
      contextLost = false;
      if (disposed) return;
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
      if (prefersReducedMotion) {
        camera.position.set(0, camRig.baseY, camRig.baseZ);
        camera.lookAt(0, camRig.lookY, camRig.lookZ);
        renderer.render(scene, camera);
      }
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

      if (prefersReducedMotion) {
        whiteKing.torso.position.y = whiteKing.torsoBaseY;
        blackKing.torso.position.y = blackKing.torsoBaseY;
        camera.position.set(0, camRig.baseY, camRig.baseZ);
        camera.lookAt(0, camRig.lookY, camRig.lookZ);
      } else {
        // Subtle breathing, cape sway, head turns & weapon readiness on both rival Kings
        const animateKing = (rig: CharacterRig, phase: number, dirSign: number) => {
          const b = t * 1.9 + phase;
          rig.torso.position.y = rig.torsoBaseY + Math.sin(b) * 0.011;
          rig.head.rotation.y = Math.sin(b * 0.52) * 0.08 + dirSign * 0.05;
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
          const s = 1 + Math.sin(t * 10.2 + idx * 1.9) * 0.14;
          f.scale.set(0.92 * s, 1.28 * s, 0.92 * s);
          f.rotation.y = t * 2.1 + idx;
        }
        for (let idx = 0; idx < torchLights.length; idx++) {
          torchLights[idx].intensity = 2.6 + Math.sin(t * 11.4 + idx * 2.3) * 0.36;
        }
        gateWarmLight.intensity = 2.35 + Math.sin(t * 7.6) * 0.22;

        // Cloud & fog drift
        for (let idx = 0; idx < clouds.length; idx++) {
          const c = clouds[idx];
          c.mesh.position.x += c.speed * dt;
          if (c.mesh.position.x > 21) c.mesh.position.x = -21;
        }

        // Rising fire embers
        const attr = emberGeo.getAttribute('position') as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        for (let i = 0; i < emberCount; i++) {
          const i3 = i * 3;
          arr[i3 + 1] += emberSpeeds[i] * dt;
          arr[i3] += Math.sin(t * 1.4 + i) * 0.0022;
          if (arr[i3 + 1] > 4.2) {
            arr[i3 + 1] = 0.05;
            arr[i3] = (Math.random() - 0.5) * 7.5;
          }
        }
        attr.needsUpdate = true;

        // Gentle camera breath keeping both Kings safely inside portrait margins
        camera.position.x = Math.sin(t * 0.24) * 0.13;
        camera.position.y = camRig.baseY + Math.sin(t * 0.34) * 0.035;
        camera.position.z = camRig.baseZ;
        camera.lookAt(0, camRig.lookY, camRig.lookZ);
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPausedHidden = true;
        stopLoop();
      } else {
        isPausedHidden = false;
        if (!disposed && !contextLost) {
          clock.getDelta();
          stopLoop();
          tick();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (!isPausedHidden) {
      tick();
    } else {
      renderer.render(scene, camera);
    }

    return () => {
      disposed = true;
      rendererRef.current = null;
      moonKeyRef.current = null;
      stopLoop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      motionQuery?.removeEventListener('change', handleMotionChange);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      for (let i = 0; i < whiteKing.disposableGeos.length; i++) {
        whiteKing.disposableGeos[i].dispose();
      }
      for (let i = 0; i < blackKing.disposableGeos.length; i++) {
        blackKing.disposableGeos[i].dispose();
      }
      extraGeos.forEach((g) => g.dispose());
      extraMats.forEach((m) => m.dispose());
      extraTex.forEach((tx) => tx.dispose());
      envRT.dispose();
      scene.environment = null;
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
