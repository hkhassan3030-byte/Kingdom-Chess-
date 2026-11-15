import * as THREE from 'three';
import type { CharacterSetId, PieceColor } from '../types/chess';

export interface KingdomMaterials {
  armorPrimary: THREE.MeshStandardMaterial;
  armorDarkSteel: THREE.MeshStandardMaterial;
  armorSecondary: THREE.MeshStandardMaterial;
  armorTrim: THREE.MeshStandardMaterial;
  chainmail: THREE.MeshStandardMaterial;
  cloth: THREE.MeshStandardMaterial;
  tabard: THREE.MeshStandardMaterial;
  royalTabard: THREE.MeshStandardMaterial;
  pawnCoat: THREE.MeshStandardMaterial;
  crimsonAccent: THREE.MeshStandardMaterial;
  cape: THREE.MeshStandardMaterial;
  gown: THREE.MeshStandardMaterial;
  queenGown: THREE.MeshStandardMaterial;
  crownVelvet: THREE.MeshStandardMaterial;
  furTrim: THREE.MeshStandardMaterial;
  shieldFace: THREE.MeshStandardMaterial;
  skin: THREE.MeshStandardMaterial;
  skinFemale: THREE.MeshStandardMaterial;
  skinWarrior: THREE.MeshStandardMaterial;
  skinMage: THREE.MeshStandardMaterial;
  skinYoung: THREE.MeshStandardMaterial;
  skinBody: THREE.MeshStandardMaterial;
  lips: THREE.MeshStandardMaterial;
  sclera: THREE.MeshStandardMaterial;
  iris: THREE.MeshStandardMaterial;
  lashLine: THREE.MeshStandardMaterial;
  eyebrow: THREE.MeshStandardMaterial;
  leather: THREE.MeshStandardMaterial;
  trousers: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  weaponBlade: THREE.MeshStandardMaterial;
  gem: THREE.MeshStandardMaterial;
  horseCoat: THREE.MeshStandardMaterial;
  horseMane: THREE.MeshStandardMaterial;
  horseCaparison: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  hairAuburn: THREE.MeshStandardMaterial;
  hairSilver: THREE.MeshStandardMaterial;
  accentGlow: THREE.MeshStandardMaterial;
}

export interface SceneMaterialBank {
  characterSet: CharacterSetId;
  white: KingdomMaterials;
  black: KingdomMaterials;
  lightTile: THREE.MeshStandardMaterial;
  darkTile: THREE.MeshStandardMaterial;
  stoneApron: THREE.MeshStandardMaterial;
  boardFrame: THREE.MeshStandardMaterial;
  boardGoldTrim: THREE.MeshStandardMaterial;
  waterMoat: THREE.MeshStandardMaterial;
  waterNormalMap: THREE.CanvasTexture;
  citadelGround: THREE.MeshStandardMaterial;
  ruinStone: THREE.MeshStandardMaterial;
  brazierIron: THREE.MeshStandardMaterial;
  brazierEmber: THREE.MeshStandardMaterial;
  brazierFlame: THREE.MeshBasicMaterial;
  contactShadowMat: THREE.MeshBasicMaterial;
  hitProxyMat: THREE.MeshBasicMaterial;
  emberTexture: THREE.CanvasTexture;
  coordAtlasTex: THREE.CanvasTexture;
  switchCharacterSet: (nextSet: CharacterSetId) => void;
  dispose: () => void;
}

function createNormalMapFromHeightCanvas(
  heightCanvas: HTMLCanvasElement,
  strength: number,
  maxAnisotropy: number,
  repeat = 1
): THREE.CanvasTexture {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const srcCtx = heightCanvas.getContext('2d')!;
  const src = srcCtx.getImageData(0, 0, w, h).data;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d')!;
  const outImg = outCtx.createImageData(w, h);
  const dst = outImg.data;

  const sample = (x: number, y: number): number => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return src[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dx = tr + 2 * r + br - (tl + 2 * l + bl);
      const dy = bl + 2 * b + br - (tl + 2 * t + tr);

      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1.0;
      const invLen = 1 / Math.hypot(nx, ny, nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (y * w + x) * 4;
      dst[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }

  outCtx.putImageData(outImg, 0, 0);
  const tex = new THREE.CanvasTexture(outCanvas);
  tex.anisotropy = maxAnisotropy;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  return tex;
}

function createMarbleTexture(
  baseHex: string,
  veinHex: string,
  accentHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 650; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 0.6 + Math.random() * 2.0;
    ctx.fillStyle = i % 3 === 0 ? accentHex : veinHex;
    ctx.globalAlpha = 0.05 + Math.random() * 0.07;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = veinHex;
  for (let v = 0; v < 5; v++) {
    ctx.lineWidth = 0.8 + Math.random() * 1.8;
    ctx.beginPath();
    let x = Math.random() * size;
    let y = 0;
    ctx.moveTo(x, y);
    for (let step = 1; step <= 8; step++) {
      x += (Math.random() - 0.5) * 44;
      y = (step / 8) * size;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 0.14;
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Carved Dark Citadel Basalt/Granite Stone Paving Apron Texture + Normal Map
 */
function createDarkCitadelStoneMaps(maxAnisotropy: number, repeat = 5): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  const size = 256;
  const aCanvas = document.createElement('canvas');
  aCanvas.width = size;
  aCanvas.height = size;
  const aCtx = aCanvas.getContext('2d')!;

  const hCanvas = document.createElement('canvas');
  hCanvas.width = size;
  hCanvas.height = size;
  const hCtx = hCanvas.getContext('2d')!;

  aCtx.fillStyle = '#2d3442';
  aCtx.fillRect(0, 0, size, size);
  hCtx.fillStyle = '#929292';
  hCtx.fillRect(0, 0, size, size);

  const cells = 2;
  const cell = size / cells;
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const x = col * cell;
      const y = row * cell;
      const tint = (row + col) % 2 === 0 ? '#363f4f' : '#2a313e';
      aCtx.fillStyle = tint;
      aCtx.fillRect(x + 3, y + 3, cell - 6, cell - 6);

      // Subtle inner carved bevel groove
      aCtx.strokeStyle = 'rgba(130, 148, 178, 0.14)';
      aCtx.lineWidth = 1.5;
      aCtx.strokeRect(x + 9, y + 9, cell - 18, cell - 18);

      // Deep dark mortar seam
      aCtx.strokeStyle = '#151922';
      aCtx.lineWidth = 4;
      aCtx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);

      hCtx.strokeStyle = '#262626';
      hCtx.lineWidth = 5;
      hCtx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);

      hCtx.strokeStyle = '#5c5c5c';
      hCtx.lineWidth = 2;
      hCtx.strokeRect(x + 9, y + 9, cell - 18, cell - 18);
    }
  }

  // Granite mineral speckles & weathered pitting
  for (let i = 0; i < 1100; i++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    aCtx.fillStyle = i % 3 === 0 ? 'rgba(155,175,205,0.09)' : 'rgba(12,15,22,0.16)';
    aCtx.fillRect(px, py, 2, 1.5);
    hCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.12)';
    hCtx.fillRect(px, py, 2, 2);
  }

  const map = new THREE.CanvasTexture(aCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeat, repeat);

  const normalMap = createNormalMapFromHeightCanvas(hCanvas, 2.2, maxAnisotropy, repeat);
  return { map, normalMap };
}

/**
 * Stitched Pebbled Leather Texture + Normal Map
 */
function createLeatherMaps(
  baseHex: string,
  grainHex: string,
  stitchHex: string,
  maxAnisotropy: number
): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  const size = 256;
  const aCanvas = document.createElement('canvas');
  aCanvas.width = size;
  aCanvas.height = size;
  const aCtx = aCanvas.getContext('2d')!;

  const hCanvas = document.createElement('canvas');
  hCanvas.width = size;
  hCanvas.height = size;
  const hCtx = hCanvas.getContext('2d')!;

  aCtx.fillStyle = baseHex;
  aCtx.fillRect(0, 0, size, size);
  hCtx.fillStyle = '#787878';
  hCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1300; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1.1 + Math.random() * 2.2;
    aCtx.fillStyle = i % 2 === 0 ? grainHex : 'rgba(255,225,190,0.05)';
    aCtx.beginPath();
    aCtx.arc(x, y, r, 0, Math.PI * 2);
    aCtx.fill();

    hCtx.fillStyle = i % 2 === 0 ? '#a8a8a8' : '#4a4a4a';
    hCtx.beginPath();
    hCtx.arc(x, y, r, 0, Math.PI * 2);
    hCtx.fill();
  }

  // Subtle stitched seam lines along strap borders
  for (const sy of [18, size - 18]) {
    for (let sx = 6; sx < size; sx += 14) {
      aCtx.fillStyle = stitchHex;
      aCtx.fillRect(sx, sy, 7, 2.2);
      hCtx.fillStyle = '#d8d8d8';
      hCtx.fillRect(sx, sy, 7, 2.2);
    }
  }

  const map = new THREE.CanvasTexture(aCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);

  const normalMap = createNormalMapFromHeightCanvas(hCanvas, 2.0, maxAnisotropy, 2);
  return { map, normalMap };
}

/**
 * Rippled Water Moat Normal Map (linear space)
 */
function createWaterRippleNormalMap(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const hCanvas = document.createElement('canvas');
  hCanvas.width = size;
  hCanvas.height = size;
  const hCtx = hCanvas.getContext('2d')!;

  hCtx.fillStyle = '#808080';
  hCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 240; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const rx = 10 + Math.random() * 24;
    const ry = 4 + Math.random() * 10;
    const g = hCtx.createRadialGradient(cx, cy, 1, cx, cy, rx);
    g.addColorStop(0, i % 2 === 0 ? 'rgba(220,220,220,0.18)' : 'rgba(30,30,30,0.18)');
    g.addColorStop(1, 'rgba(128,128,128,0)');
    hCtx.fillStyle = g;
    hCtx.beginPath();
    hCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    hCtx.fill();
  }

  return createNormalMapFromHeightCanvas(hCanvas, 1.4, maxAnisotropy, 6);
}

/**
 * Procedural PBR Metal Maps
 */
function createArmorTextureMaps(
  baseHex: string,
  etchHex: string,
  maxAnisotropy: number
): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 256;
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext('2d')!;

  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = size;
  heightCanvas.height = size;
  const hCtx = heightCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  aCtx.fillStyle = baseHex;
  aCtx.fillRect(0, 0, size, size);

  hCtx.fillStyle = '#828282';
  hCtx.fillRect(0, 0, size, size);

  rCtx.fillStyle = '#484848';
  rCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 650; i++) {
    const y = Math.random() * size;
    const x = Math.random() * size;
    const len = 18 + Math.random() * 64;
    const bright = i % 2 === 0;
    aCtx.strokeStyle = bright ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
    aCtx.lineWidth = 0.7 + Math.random() * 1.1;
    aCtx.beginPath();
    aCtx.moveTo(x, y);
    aCtx.lineTo(x + len, y + (Math.random() - 0.5) * 2);
    aCtx.stroke();

    hCtx.strokeStyle = bright ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)';
    hCtx.lineWidth = 0.8;
    hCtx.beginPath();
    hCtx.moveTo(x, y);
    hCtx.lineTo(x + len, y);
    hCtx.stroke();

    rCtx.strokeStyle = bright ? 'rgba(130,130,130,0.16)' : 'rgba(40,40,40,0.16)';
    rCtx.beginPath();
    rCtx.moveTo(x, y);
    rCtx.lineTo(x + len, y);
    rCtx.stroke();
  }

  for (let i = 0; i < 110; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const rad = 4 + Math.random() * 8;
    const g = hCtx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, 'rgba(0,0,0,0.14)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    hCtx.fillStyle = g;
    hCtx.beginPath();
    hCtx.arc(cx, cy, rad, 0, Math.PI * 2);
    hCtx.fill();
  }

  for (const bandY of [size * 0.14, size * 0.86]) {
    aCtx.strokeStyle = etchHex;
    aCtx.globalAlpha = 0.25;
    aCtx.lineWidth = 2;
    aCtx.beginPath();
    aCtx.moveTo(0, bandY);
    aCtx.lineTo(size, bandY);
    aCtx.stroke();

    hCtx.strokeStyle = '#383838';
    hCtx.lineWidth = 2.5;
    hCtx.beginPath();
    hCtx.moveTo(0, bandY);
    hCtx.lineTo(size, bandY);
    hCtx.stroke();

    rCtx.strokeStyle = '#a0a0a0';
    rCtx.lineWidth = 2.5;
    rCtx.beginPath();
    rCtx.moveTo(0, bandY);
    rCtx.lineTo(size, bandY);
    rCtx.stroke();

    for (let x = 8; x < size; x += 24) {
      aCtx.beginPath();
      aCtx.arc(x, bandY + (bandY < size / 2 ? 10 : -10), 6, 0, Math.PI * 2);
      aCtx.stroke();
      hCtx.beginPath();
      hCtx.arc(x, bandY + (bandY < size / 2 ? 10 : -10), 6, 0, Math.PI * 2);
      hCtx.stroke();
    }
    aCtx.globalAlpha = 1;
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const normalMap = createNormalMapFromHeightCanvas(heightCanvas, 2.2, maxAnisotropy, 1);

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.anisotropy = maxAnisotropy;
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  return { map, normalMap, roughnessMap };
}

function createChainmailMaps(
  ringHex: string,
  darkGapHex: string,
  maxAnisotropy: number
): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  const size = 256;
  const aCanvas = document.createElement('canvas');
  aCanvas.width = size;
  aCanvas.height = size;
  const aCtx = aCanvas.getContext('2d')!;

  const hCanvas = document.createElement('canvas');
  hCanvas.width = size;
  hCanvas.height = size;
  const hCtx = hCanvas.getContext('2d')!;

  aCtx.fillStyle = darkGapHex;
  aCtx.fillRect(0, 0, size, size);
  hCtx.fillStyle = '#202020';
  hCtx.fillRect(0, 0, size, size);

  const stepX = 16;
  const stepY = 12;
  for (let row = -1; row <= size / stepY + 1; row++) {
    const offsetX = (row % 2) * (stepX * 0.5);
    for (let col = -1; col <= size / stepX + 1; col++) {
      const cx = col * stepX + offsetX;
      const cy = row * stepY;

      aCtx.strokeStyle = ringHex;
      aCtx.lineWidth = 3.2;
      aCtx.beginPath();
      aCtx.ellipse(cx, cy, 7.2, 5.2, row % 2 === 0 ? 0.25 : -0.25, 0, Math.PI * 2);
      aCtx.stroke();

      hCtx.strokeStyle = '#dcdcdc';
      hCtx.lineWidth = 3.4;
      hCtx.beginPath();
      hCtx.ellipse(cx, cy, 7.2, 5.2, row % 2 === 0 ? 0.25 : -0.25, 0, Math.PI * 2);
      hCtx.stroke();
    }
  }

  const map = new THREE.CanvasTexture(aCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);

  const normalMap = createNormalMapFromHeightCanvas(hCanvas, 2.8, maxAnisotropy, 3);
  return { map, normalMap };
}

function createRoyalClothMaps(
  baseHex: string,
  patternHex: string,
  trimHex: string,
  maxAnisotropy: number
): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  const size = 256;
  const aCanvas = document.createElement('canvas');
  aCanvas.width = size;
  aCanvas.height = size;
  const aCtx = aCanvas.getContext('2d')!;

  const hCanvas = document.createElement('canvas');
  hCanvas.width = size;
  hCanvas.height = size;
  const hCtx = hCanvas.getContext('2d')!;

  aCtx.fillStyle = baseHex;
  aCtx.fillRect(0, 0, size, size);
  hCtx.fillStyle = '#7c7c7c';
  hCtx.fillRect(0, 0, size, size);

  aCtx.lineWidth = 1;
  hCtx.lineWidth = 1.5;
  for (let i = 0; i < size; i += 4) {
    aCtx.strokeStyle = 'rgba(255,255,255,0.03)';
    aCtx.beginPath();
    aCtx.moveTo(i, 0);
    aCtx.lineTo(i, size);
    aCtx.stroke();

    hCtx.strokeStyle = i % 8 === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)';
    hCtx.beginPath();
    hCtx.moveTo(i, 0);
    hCtx.lineTo(i, size);
    hCtx.stroke();

    hCtx.beginPath();
    hCtx.moveTo(0, i);
    hCtx.lineTo(size, i);
    hCtx.stroke();
  }

  aCtx.strokeStyle = patternHex;
  aCtx.globalAlpha = 0.22;
  aCtx.lineWidth = 1.6;
  hCtx.strokeStyle = '#a8a8a8';
  hCtx.lineWidth = 1.6;
  const cell = 32;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const cx = x + cell / 2;
      const cy = y + cell / 2;
      for (const ctx of [aCtx, hCtx]) {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 11);
        ctx.lineTo(cx + 9, cy);
        ctx.lineTo(cx, cy + 11);
        ctx.lineTo(cx - 9, cy);
        ctx.closePath();
        ctx.stroke();
      }
    }
  }
  aCtx.globalAlpha = 1;

  // Embroidered golden hem border
  aCtx.fillStyle = trimHex;
  aCtx.fillRect(0, size - 22, size, 12);
  aCtx.fillRect(0, size - 6, size, 3);
  hCtx.fillStyle = '#c8c8c8';
  hCtx.fillRect(0, size - 22, size, 12);

  const map = new THREE.CanvasTexture(aCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;

  const normalMap = createNormalMapFromHeightCanvas(hCanvas, 1.5, maxAnisotropy, 1);
  normalMap.wrapT = THREE.ClampToEdgeWrapping;
  return { map, normalMap };
}

function createFleurTabardTexture(
  bgHex: string,
  emblemHex: string,
  borderHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, size, size);

  // Subtle woven fabric shading
  for (let i = 0; i < size; i += 4) {
    ctx.fillStyle = i % 8 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(i, 0, 2, size);
  }

  // Gold/bronze side trim & hem
  ctx.fillStyle = borderHex;
  ctx.fillRect(0, 0, 12, size);
  ctx.fillRect(size - 12, 0, 12, size);
  ctx.fillRect(0, size - 16, size, 16);

  // Draw crisp Fleur-de-Lis motifs vertically (top and lower)
  const drawFleur = (cx: number, cy: number, sc: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    ctx.fillStyle = emblemHex;
    // Center spearhead petal
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.bezierCurveTo(13, -12, 10, 8, 4, 16);
    ctx.lineTo(-4, 16);
    ctx.bezierCurveTo(-10, 8, -13, -12, 0, -34);
    ctx.fill();
    // Side curling petals
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 3, 12);
      ctx.bezierCurveTo(s * 24, -10, s * 30, 10, s * 16, 20);
      ctx.bezierCurveTo(s * 12, 12, s * 6, 15, s * 4, 22);
      ctx.fill();
    }
    // Crossbar & base
    ctx.fillRect(-16, 14, 32, 5);
    ctx.fillRect(-5, 19, 10, 12);
    ctx.restore();
  };

  drawFleur(size / 2, size * 0.34, 0.85);
  drawFleur(size / 2, size * 0.72, 1.05);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createScoutCoatMaps(
  baseHex: string,
  pipingHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Subtle fabric panel stitch shading
  ctx.strokeStyle = 'rgba(0,0,0,0.09)';
  ctx.lineWidth = 2;
  for (let x = 32; x < size; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  // Crimson red assassin/crusader hem & border trim
  ctx.fillStyle = pipingHex;
  ctx.fillRect(0, size - 18, size, 12);
  ctx.fillRect(0, 0, 10, size);
  ctx.fillRect(size - 10, 0, 10, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createShieldFaceTexture(
  isWhite: boolean,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 14, size / 2, size / 2, size * 0.6);
  if (isWhite) {
    // Crisp White Crusader / Royal Ivory & Gold Crest matching photo!
    grad.addColorStop(0, '#f4f1e8');
    grad.addColorStop(1, '#cfc8b8');
  } else {
    // Dark Obsidian & Bronze Wood/Iron Crest
    grad.addColorStop(0, '#302728');
    grad.addColorStop(1, '#141115');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Quartered cross / chevron accent
  ctx.fillStyle = isWhite ? '#d4a846' : '#7d2028';
  ctx.fillRect(size / 2 - 12, 14, 24, size - 28);
  ctx.fillRect(14, size / 2 - 12, size - 28, 24);

  const cx = size / 2;
  const cy = size / 2;
  ctx.fillStyle = isWhite ? '#e8bd54' : '#b87c42';
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = isWhite ? '#fff7dc' : '#e0a46c';
  ctx.lineWidth = 4;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createProceduralBumpTexture(
  mode: 'cloth' | 'leather' | 'skin' | 'hair' | 'wood',
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  if (mode === 'cloth') {
    ctx.lineWidth = 2;
    for (let i = 0; i < size; i += 5) {
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0,0,0,0.14)';
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
  } else if (mode === 'leather') {
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.16)';
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, 1.3 + Math.random() * 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (mode === 'skin') {
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.055)';
      ctx.fillRect(Math.random() * size, Math.random() * size, 1.2, 1.2);
    }
  } else if (mode === 'hair' || mode === 'wood') {
    const count = mode === 'hair' ? 750 : 420;
    for (let i = 0; i < count; i++) {
      const x = Math.random() * size;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)';
      ctx.lineWidth = mode === 'hair' ? 1.2 : 1.6;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 5, size * 0.33, x - 5, size * 0.66, x, size);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = maxAnisotropy;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function createIrisTexture(
  outerHex: string,
  innerHex: string,
  collaretteHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.45;

  // Clean off-white sclera margin around the iris limbal ring so white sclera frames the eye cleanly
  ctx.fillStyle = '#ede7df';
  ctx.fillRect(0, 0, size, size);

  // Dark limbal outer ring
  ctx.fillStyle = '#090e18';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  const grad = ctx.createRadialGradient(cx, cy, r * 0.22, cx, cy, r * 0.94);
  grad.addColorStop(0, collaretteHex);
  grad.addColorStop(0.42, innerHex);
  grad.addColorStop(0.84, outerHex);
  grad.addColorStop(1, '#0b111c');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.94, 0, Math.PI * 2);
  ctx.fill();

  // Crisp radial iris stromal fibers
  for (let i = 0; i < 84; i++) {
    const ang = (i / 84) * Math.PI * 2;
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.24)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * r * 0.34, cy + Math.sin(ang) * r * 0.34);
    ctx.lineTo(cx + Math.cos(ang) * r * 0.88, cy + Math.sin(ang) * r * 0.88);
    ctx.stroke();
  }

  // Deep black pupil
  ctx.fillStyle = '#040508';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.36, 0, Math.PI * 2);
  ctx.fill();

  // Crisp primary & secondary cornea-like catchlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.beginPath();
  ctx.arc(cx - r * 0.17, cy - r * 0.19, r * 0.115, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
  ctx.beginPath();
  ctx.arc(cx + r * 0.14, cy + r * 0.15, r * 0.05, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

type SkinArchetype = 'king' | 'queen' | 'warrior' | 'mage' | 'young';

function createFaceSkinMaps(
  baseHex: string,
  blushHex: string,
  shadowHex: string,
  highlightHex: string,
  archetype: SkinArchetype,
  maxAnisotropy: number
): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const texSize = 256;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = texSize;
  canvas.height = texSize;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(0.5, 0.5);

  const hCanvas = document.createElement('canvas');
  hCanvas.width = texSize;
  hCanvas.height = texSize;
  const hCtx = hCanvas.getContext('2d')!;
  hCtx.scale(0.5, 0.5);

  const rCanvas = document.createElement('canvas');
  rCanvas.width = texSize;
  rCanvas.height = texSize;
  const rCtx = rCanvas.getContext('2d')!;
  rCtx.scale(0.5, 0.5);

  const isFemale = archetype === 'queen';
  const isMature = archetype === 'king' || archetype === 'mage';
  const isRugged = archetype === 'warrior';

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);
  hCtx.fillStyle = '#808080';
  hCtx.fillRect(0, 0, size, size);
  // Matte non-plastic cheek/jaw base roughness (~0.62)
  rCtx.fillStyle = '#9f9f9f';
  rCtx.fillRect(0, 0, size, size);

  const fx = size * 0.25;
  const fy = size * 0.5;

  // Forehead & nose bridge natural warm specular highlight + satin T-zone (~0.43)
  const noseHi = ctx.createRadialGradient(fx, fy - 4, 2, fx, fy - 4, 38);
  noseHi.addColorStop(0, highlightHex);
  noseHi.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = noseHi;
  ctx.fillRect(0, 0, size, size);

  const tZoneR = rCtx.createRadialGradient(fx, fy - 12, 4, fx, fy - 12, 46);
  tZoneR.addColorStop(0, '#6e6e6e');
  tZoneR.addColorStop(1, 'rgba(159,159,159,0)');
  rCtx.fillStyle = tZoneR;
  rCtx.fillRect(0, 0, size, size);

  // Forehead expression creases (stronger on mature king/mage, faint on young/queen)
  hCtx.strokeStyle = isMature ? 'rgba(32,32,32,0.34)' : 'rgba(40,40,40,0.14)';
  hCtx.lineWidth = isMature ? 2.4 : 1.5;
  for (const row of [-58, -48]) {
    hCtx.beginPath();
    hCtx.moveTo(fx - 34, fy + row);
    hCtx.quadraticCurveTo(fx, fy + row - 3, fx + 34, fy + row);
    hCtx.stroke();
  }

  for (const side of [-1, 1]) {
    const ex = fx + side * 26;
    const ey = fy - 12;

    // Orbital ambient shadow + crease
    const socket = ctx.createRadialGradient(ex, ey, 2, ex, ey, 24);
    socket.addColorStop(0, shadowHex);
    socket.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = isFemale ? 0.28 : 0.42;
    ctx.fillStyle = socket;
    ctx.fillRect(0, 0, size, size);

    // Upper eyelid crease fold
    hCtx.strokeStyle = 'rgba(20,20,20,0.36)';
    hCtx.lineWidth = 2.2;
    hCtx.beginPath();
    hCtx.arc(ex, ey + 2, 13, Math.PI * 1.15, Math.PI * 1.85);
    hCtx.stroke();

    // Crow's-feet expression lines for mature king & mage
    if (isMature) {
      hCtx.strokeStyle = 'rgba(30,30,30,0.28)';
      hCtx.lineWidth = 1.4;
      for (const a of [-0.25, 0.15]) {
        hCtx.beginPath();
        hCtx.moveTo(ex + side * 14, ey);
        hCtx.lineTo(ex + side * 23, ey + a * 18);
        hCtx.stroke();
      }
    }

    // Sub-orbital & cheekbone warm flush
    const cx = fx + side * 34;
    const cy = fy + 24;
    const cheek = ctx.createRadialGradient(cx, cy, 4, cx, cy, 34);
    cheek.addColorStop(0, blushHex);
    cheek.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = isFemale ? 0.36 : 0.26;
    ctx.fillStyle = cheek;
    ctx.fillRect(0, 0, size, size);

    // Nasolabial fold beside nostrils
    ctx.strokeStyle = shadowHex;
    ctx.globalAlpha = isFemale ? 0.1 : isMature ? 0.28 : 0.18;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(fx + side * 12, fy + 16);
    ctx.quadraticCurveTo(fx + side * 24, fy + 34, fx + side * 22, fy + 50);
    ctx.stroke();

    hCtx.strokeStyle = 'rgba(30,30,30,0.28)';
    hCtx.lineWidth = 2.4;
    hCtx.beginPath();
    hCtx.moveTo(fx + side * 12, fy + 16);
    hCtx.quadraticCurveTo(fx + side * 24, fy + 34, fx + side * 22, fy + 50);
    hCtx.stroke();
  }

  // Subtle weathered battle scar on rugged warrior (Rook / Knight) cheek
  if (isRugged) {
    ctx.strokeStyle = blushHex;
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(fx - 34, fy - 4);
    ctx.lineTo(fx - 22, fy + 26);
    ctx.stroke();

    hCtx.strokeStyle = '#383838';
    hCtx.lineWidth = 2.6;
    hCtx.beginPath();
    hCtx.moveTo(fx - 34, fy - 4);
    hCtx.lineTo(fx - 22, fy + 26);
    hCtx.stroke();
  }

  // Subtle 5-o'clock jaw stubble for rugged warrior & young soldier
  if (archetype === 'warrior' || archetype === 'young') {
    const stubble = ctx.createRadialGradient(fx, fy + 62, 12, fx, fy + 62, 58);
    stubble.addColorStop(0, shadowHex);
    stubble.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = archetype === 'warrior' ? 0.28 : 0.14;
    ctx.fillStyle = stubble;
    ctx.fillRect(0, 0, size, size);
  }

  // Under-jaw & neck ambient shadow
  const jawShadow = ctx.createRadialGradient(fx, fy + 88, 10, fx, fy + 88, 68);
  jawShadow.addColorStop(0, shadowHex);
  jawShadow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = jawShadow;
  ctx.fillRect(0, 0, size, size);

  // Fine organic skin pores & micro-tone variation
  for (let i = 0; i < 2600; i++) {
    const px = fx + (Math.random() - 0.5) * 210;
    const py = fy + (Math.random() - 0.5) * 220;
    ctx.globalAlpha = 0.045;
    ctx.fillStyle = i % 2 === 0 ? shadowHex : highlightHex;
    ctx.fillRect(px, py, 1.3, 1.3);

    hCtx.fillStyle = i % 2 === 0 ? 'rgba(65,65,65,0.24)' : 'rgba(185,185,185,0.16)';
    hCtx.fillRect(px, py, 1.2, 1.2);
  }
  ctx.globalAlpha = 1;

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;

  const normalMap = createNormalMapFromHeightCanvas(hCanvas, 1.4, maxAnisotropy, 1);

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.anisotropy = maxAnisotropy;

  return { map, normalMap, roughnessMap };
}

function createBodySkinTexture(
  baseHex: string,
  shadowHex: string,
  highlightHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const texSize = 256;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = texSize;
  canvas.height = texSize;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(0.5, 0.5);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Subtle muscular highlight & anatomical ambient occlusion bands along torso UV (u=0.25 front, 0.75 back)
  const fx = size * 0.25;
  const pecHi = ctx.createRadialGradient(fx, size * 0.34, 8, fx, size * 0.34, 72);
  pecHi.addColorStop(0, highlightHex);
  pecHi.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = pecHi;
  ctx.fillRect(0, 0, size, size);

  // Center sternum / linea alba soft muscle shadow
  ctx.strokeStyle = shadowHex;
  ctx.globalAlpha = 0.26;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(fx, size * 0.22);
  ctx.lineTo(fx, size * 0.78);
  ctx.stroke();

  // Horizontal pectoral underline & abdominal definition
  for (const yFrac of [0.42, 0.54, 0.65, 0.76]) {
    ctx.globalAlpha = yFrac === 0.42 ? 0.32 : 0.18;
    ctx.lineWidth = yFrac === 0.42 ? 5 : 3.5;
    ctx.beginPath();
    ctx.moveTo(fx - 46, size * yFrac);
    ctx.quadraticCurveTo(fx, size * (yFrac + 0.02), fx + 46, size * yFrac);
    ctx.stroke();
  }

  // Natural skin grain
  ctx.globalAlpha = 0.045;
  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = i % 2 === 0 ? shadowHex : highlightHex;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createHorseCoatTexture(isWhite: boolean, maxAnisotropy: number): THREE.CanvasTexture {
  const texSize = 256;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = texSize;
  canvas.height = texSize;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(0.5, 0.5);

  ctx.fillStyle = isWhite ? '#784e34' : '#1b1d24';
  ctx.fillRect(0, 0, size, size);

  // Muscular coat sheen & subtle dapple variations
  for (let i = 0; i < 160; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const r = 10 + Math.random() * 24;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
    if (isWhite) {
      g.addColorStop(0, 'rgba(164, 114, 78, 0.24)');
      g.addColorStop(1, 'rgba(64, 38, 22, 0.0)');
    } else {
      g.addColorStop(0, 'rgba(58, 66, 82, 0.26)');
      g.addColorStop(1, 'rgba(12, 14, 18, 0.0)');
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine directional equine hair sheen strokes
  for (let i = 0; i < 2200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.strokeStyle = isWhite ? 'rgba(255,235,215,0.12)' : 'rgba(125,135,155,0.09)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 9, y + 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
  grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.52)');
  grad.addColorStop(0.78, 'rgba(0, 0, 0, 0.16)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createEmberTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255, 252, 224, 0.95)');
  grad.addColorStop(0.4, 'rgba(245, 224, 150, 0.55)');
  grad.addColorStop(1, 'rgba(245, 224, 150, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Engraved Dark Stone Coordinate Letters / Numbers packed into a single 4x4 texture atlas (1 draw call total)
 */
function createCoordinateAtlasTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const cell = 128;
  const cols = 4;
  const size = cell * cols;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);
  ctx.font = '700 72px Cinzel, Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const glyphs = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', '1', '2', '3', '4', '5', '6', '7', '8'];
  for (let idx = 0; idx < glyphs.length; idx++) {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = col * cell + cell / 2;
    const cy = row * cell + cell / 2;

    ctx.fillStyle = 'rgba(8, 12, 20, 0.85)';
    ctx.fillText(glyphs[idx], cx + 1.5, cy + 3.5);
    ctx.fillStyle = 'rgba(222, 210, 184, 0.9)';
    ctx.fillText(glyphs[idx], cx, cy + 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

interface CachedTexSpec {
  image: HTMLCanvasElement;
  colorSpace: string;
  wrapS: THREE.Wrapping;
  wrapT: THREE.Wrapping;
  repeatX: number;
  repeatY: number;
}

interface CachedSceneTextureSet {
  lightMarbleTex: CachedTexSpec;
  darkObsidianTex: CachedTexSpec;
  citadelStoneMap: CachedTexSpec;
  citadelStoneNormal: CachedTexSpec;
  ruinStoneMap: CachedTexSpec;
  ruinStoneNormal: CachedTexSpec;
  whiteLeatherMap: CachedTexSpec;
  whiteLeatherNormal: CachedTexSpec;
  blackLeatherMap: CachedTexSpec;
  blackLeatherNormal: CachedTexSpec;
  waterNormalMap: CachedTexSpec;
  contactTex: CachedTexSpec;
  emberTexture: CachedTexSpec;
  whiteArmorMap: CachedTexSpec;
  whiteArmorNormal: CachedTexSpec;
  whiteArmorRoughness: CachedTexSpec;
  blackArmorMap: CachedTexSpec;
  blackArmorNormal: CachedTexSpec;
  blackArmorRoughness: CachedTexSpec;
  goldArmorMap: CachedTexSpec;
  goldArmorNormal: CachedTexSpec;
  goldArmorRoughness: CachedTexSpec;
  bronzeArmorMap: CachedTexSpec;
  bronzeArmorNormal: CachedTexSpec;
  bronzeArmorRoughness: CachedTexSpec;
  whiteMailMap: CachedTexSpec;
  whiteMailNormal: CachedTexSpec;
  blackMailMap: CachedTexSpec;
  blackMailNormal: CachedTexSpec;
  whiteCapeMap: CachedTexSpec;
  whiteCapeNormal: CachedTexSpec;
  blackCapeMap: CachedTexSpec;
  blackCapeNormal: CachedTexSpec;
  whiteQueenMap: CachedTexSpec;
  whiteQueenNormal: CachedTexSpec;
  blackQueenMap: CachedTexSpec;
  blackQueenNormal: CachedTexSpec;
  whiteKingTabardTex: CachedTexSpec;
  blackKingTabardTex: CachedTexSpec;
  whiteScoutCoatTex: CachedTexSpec;
  blackScoutCoatTex: CachedTexSpec;
  whiteShieldTex: CachedTexSpec;
  blackShieldTex: CachedTexSpec;
  clothBump: CachedTexSpec;
  skinBump: CachedTexSpec;
  hairBump: CachedTexSpec;
  woodBump: CachedTexSpec;
  whiteKingSkinMap: CachedTexSpec;
  whiteKingSkinNormal: CachedTexSpec;
  whiteKingSkinRoughness: CachedTexSpec;
  whiteQueenSkinMap: CachedTexSpec;
  whiteQueenSkinNormal: CachedTexSpec;
  whiteQueenSkinRoughness: CachedTexSpec;
  whiteWarriorSkinMap: CachedTexSpec;
  whiteWarriorSkinNormal: CachedTexSpec;
  whiteWarriorSkinRoughness: CachedTexSpec;
  whiteMageSkinMap: CachedTexSpec;
  whiteMageSkinNormal: CachedTexSpec;
  whiteMageSkinRoughness: CachedTexSpec;
  whiteYoungSkinMap: CachedTexSpec;
  whiteYoungSkinNormal: CachedTexSpec;
  whiteYoungSkinRoughness: CachedTexSpec;
  blackKingSkinMap: CachedTexSpec;
  blackKingSkinNormal: CachedTexSpec;
  blackKingSkinRoughness: CachedTexSpec;
  blackQueenSkinMap: CachedTexSpec;
  blackQueenSkinNormal: CachedTexSpec;
  blackQueenSkinRoughness: CachedTexSpec;
  blackWarriorSkinMap: CachedTexSpec;
  blackWarriorSkinNormal: CachedTexSpec;
  blackWarriorSkinRoughness: CachedTexSpec;
  blackMageSkinMap: CachedTexSpec;
  blackMageSkinNormal: CachedTexSpec;
  blackMageSkinRoughness: CachedTexSpec;
  blackYoungSkinMap: CachedTexSpec;
  blackYoungSkinNormal: CachedTexSpec;
  blackYoungSkinRoughness: CachedTexSpec;
  whiteBodySkinTex: CachedTexSpec;
  blackBodySkinTex: CachedTexSpec;
  whiteIrisTex: CachedTexSpec;
  blackIrisTex: CachedTexSpec;
  whiteHorseTex: CachedTexSpec;
  blackHorseTex: CachedTexSpec;
  coordAtlasTex: CachedTexSpec;
}

let _cachedTextureSet: CachedSceneTextureSet | null = null;

function toTexSpec(tex: THREE.CanvasTexture): CachedTexSpec {
  return {
    image: tex.image as HTMLCanvasElement,
    colorSpace: tex.colorSpace,
    wrapS: tex.wrapS,
    wrapT: tex.wrapT,
    repeatX: tex.repeat.x,
    repeatY: tex.repeat.y,
  };
}

function getCachedSceneTextureSet(maxAniso: number): CachedSceneTextureSet {
  if (_cachedTextureSet) return _cachedTextureSet;

  const citadelStoneMaps = createDarkCitadelStoneMaps(maxAniso, 5);
  const ruinStoneMaps = createDarkCitadelStoneMaps(maxAniso, 2);
  const whiteLeatherMaps = createLeatherMaps('#5e3a22', '#422614', '#8f6b47', maxAniso);
  const blackLeatherMaps = createLeatherMaps('#251c19', '#140f0d', '#543c2c', maxAniso);
  const whiteArmorMaps = createArmorTextureMaps('#e2e7ef', '#a3b3c7', maxAniso);
  const blackArmorMaps = createArmorTextureMaps('#282d38', '#4f5a70', maxAniso);
  const goldArmorMaps = createArmorTextureMaps('#ecc45d', '#a87d24', maxAniso);
  const bronzeArmorMaps = createArmorTextureMaps('#a8743f', '#5a391c', maxAniso);
  const whiteMailMaps = createChainmailMaps('#b4bec9', '#454e5c', maxAniso);
  const blackMailMaps = createChainmailMaps('#464e5c', '#14171f', maxAniso);
  const whiteCapeMaps = createRoyalClothMaps('#ede8dc', '#d6cbb5', '#d9b14c', maxAniso);
  const blackCapeMaps = createRoyalClothMaps('#1d1e24', '#38303b', '#9c6e3b', maxAniso);
  const whiteQueenMaps = createRoyalClothMaps('#5b2868', '#8e4ea3', '#e0b854', maxAniso);
  const blackQueenMaps = createRoyalClothMaps('#281230', '#631d3a', '#b58146', maxAniso);

  const whiteKingSkin = createFaceSkinMaps('#e3b192', '#d27c68', '#996751', '#f7d5bc', 'king', maxAniso);
  const whiteQueenSkin = createFaceSkinMaps('#f1c5ac', '#db8377', '#aa7767', '#fde2cf', 'queen', maxAniso);
  const whiteWarriorSkin = createFaceSkinMaps('#dca688', '#c86f5b', '#8e5c48', '#f0c7ad', 'warrior', maxAniso);
  const whiteMageSkin = createFaceSkinMaps('#e8baa0', '#cf8272', '#9c6f5e', '#fae0cc', 'mage', maxAniso);
  const whiteYoungSkin = createFaceSkinMaps('#ecc0a4', '#df8b7b', '#a87864', '#fce2ce', 'young', maxAniso);
  const blackKingSkin = createFaceSkinMaps('#c8967b', '#a05e54', '#6b4339', '#dcb096', 'king', maxAniso);
  const blackQueenSkin = createFaceSkinMaps('#d3a38b', '#ae6460', '#794a44', '#e5bda4', 'queen', maxAniso);
  const blackWarriorSkin = createFaceSkinMaps('#be8b70', '#96564c', '#613c33', '#d4a68d', 'warrior', maxAniso);
  const blackMageSkin = createFaceSkinMaps('#cca088', '#a46960', '#6e4941', '#e0baa2', 'mage', maxAniso);
  const blackYoungSkin = createFaceSkinMaps('#d2a186', '#ad6a5f', '#754b42', '#e4b9a0', 'young', maxAniso);

  _cachedTextureSet = {
    lightMarbleTex: toTexSpec(createMarbleTexture('#d2c9b8', '#a89f8e', '#eae3d5', maxAniso)),
    darkObsidianTex: toTexSpec(createMarbleTexture('#1a202b', '#0d1118', '#2f3848', maxAniso)),
    citadelStoneMap: toTexSpec(citadelStoneMaps.map),
    citadelStoneNormal: toTexSpec(citadelStoneMaps.normalMap),
    ruinStoneMap: toTexSpec(ruinStoneMaps.map),
    ruinStoneNormal: toTexSpec(ruinStoneMaps.normalMap),
    whiteLeatherMap: toTexSpec(whiteLeatherMaps.map),
    whiteLeatherNormal: toTexSpec(whiteLeatherMaps.normalMap),
    blackLeatherMap: toTexSpec(blackLeatherMaps.map),
    blackLeatherNormal: toTexSpec(blackLeatherMaps.normalMap),
    waterNormalMap: toTexSpec(createWaterRippleNormalMap(maxAniso)),
    contactTex: toTexSpec(createContactShadowTexture()),
    emberTexture: toTexSpec(createEmberTexture()),
    whiteArmorMap: toTexSpec(whiteArmorMaps.map),
    whiteArmorNormal: toTexSpec(whiteArmorMaps.normalMap),
    whiteArmorRoughness: toTexSpec(whiteArmorMaps.roughnessMap),
    blackArmorMap: toTexSpec(blackArmorMaps.map),
    blackArmorNormal: toTexSpec(blackArmorMaps.normalMap),
    blackArmorRoughness: toTexSpec(blackArmorMaps.roughnessMap),
    goldArmorMap: toTexSpec(goldArmorMaps.map),
    goldArmorNormal: toTexSpec(goldArmorMaps.normalMap),
    goldArmorRoughness: toTexSpec(goldArmorMaps.roughnessMap),
    bronzeArmorMap: toTexSpec(bronzeArmorMaps.map),
    bronzeArmorNormal: toTexSpec(bronzeArmorMaps.normalMap),
    bronzeArmorRoughness: toTexSpec(bronzeArmorMaps.roughnessMap),
    whiteMailMap: toTexSpec(whiteMailMaps.map),
    whiteMailNormal: toTexSpec(whiteMailMaps.normalMap),
    blackMailMap: toTexSpec(blackMailMaps.map),
    blackMailNormal: toTexSpec(blackMailMaps.normalMap),
    whiteCapeMap: toTexSpec(whiteCapeMaps.map),
    whiteCapeNormal: toTexSpec(whiteCapeMaps.normalMap),
    blackCapeMap: toTexSpec(blackCapeMaps.map),
    blackCapeNormal: toTexSpec(blackCapeMaps.normalMap),
    whiteQueenMap: toTexSpec(whiteQueenMaps.map),
    whiteQueenNormal: toTexSpec(whiteQueenMaps.normalMap),
    blackQueenMap: toTexSpec(blackQueenMaps.map),
    blackQueenNormal: toTexSpec(blackQueenMaps.normalMap),
    whiteKingTabardTex: toTexSpec(createFleurTabardTexture('#8c161e', '#f2ece1', '#e0b854', maxAniso)),
    blackKingTabardTex: toTexSpec(createFleurTabardTexture('#3a0d14', '#d49d56', '#9e6e36', maxAniso)),
    whiteScoutCoatTex: toTexSpec(createScoutCoatMaps('#eae5db', '#9e1c24', maxAniso)),
    blackScoutCoatTex: toTexSpec(createScoutCoatMaps('#1d1f26', '#8a1824', maxAniso)),
    whiteShieldTex: toTexSpec(createShieldFaceTexture(true, maxAniso)),
    blackShieldTex: toTexSpec(createShieldFaceTexture(false, maxAniso)),
    clothBump: toTexSpec(createProceduralBumpTexture('cloth', maxAniso)),
    skinBump: toTexSpec(createProceduralBumpTexture('skin', maxAniso)),
    hairBump: toTexSpec(createProceduralBumpTexture('hair', maxAniso)),
    woodBump: toTexSpec(createProceduralBumpTexture('wood', maxAniso)),
    whiteKingSkinMap: toTexSpec(whiteKingSkin.map),
    whiteKingSkinNormal: toTexSpec(whiteKingSkin.normalMap),
    whiteKingSkinRoughness: toTexSpec(whiteKingSkin.roughnessMap),
    whiteQueenSkinMap: toTexSpec(whiteQueenSkin.map),
    whiteQueenSkinNormal: toTexSpec(whiteQueenSkin.normalMap),
    whiteQueenSkinRoughness: toTexSpec(whiteQueenSkin.roughnessMap),
    whiteWarriorSkinMap: toTexSpec(whiteWarriorSkin.map),
    whiteWarriorSkinNormal: toTexSpec(whiteWarriorSkin.normalMap),
    whiteWarriorSkinRoughness: toTexSpec(whiteWarriorSkin.roughnessMap),
    whiteMageSkinMap: toTexSpec(whiteMageSkin.map),
    whiteMageSkinNormal: toTexSpec(whiteMageSkin.normalMap),
    whiteMageSkinRoughness: toTexSpec(whiteMageSkin.roughnessMap),
    whiteYoungSkinMap: toTexSpec(whiteYoungSkin.map),
    whiteYoungSkinNormal: toTexSpec(whiteYoungSkin.normalMap),
    whiteYoungSkinRoughness: toTexSpec(whiteYoungSkin.roughnessMap),
    blackKingSkinMap: toTexSpec(blackKingSkin.map),
    blackKingSkinNormal: toTexSpec(blackKingSkin.normalMap),
    blackKingSkinRoughness: toTexSpec(blackKingSkin.roughnessMap),
    blackQueenSkinMap: toTexSpec(blackQueenSkin.map),
    blackQueenSkinNormal: toTexSpec(blackQueenSkin.normalMap),
    blackQueenSkinRoughness: toTexSpec(blackQueenSkin.roughnessMap),
    blackWarriorSkinMap: toTexSpec(blackWarriorSkin.map),
    blackWarriorSkinNormal: toTexSpec(blackWarriorSkin.normalMap),
    blackWarriorSkinRoughness: toTexSpec(blackWarriorSkin.roughnessMap),
    blackMageSkinMap: toTexSpec(blackMageSkin.map),
    blackMageSkinNormal: toTexSpec(blackMageSkin.normalMap),
    blackMageSkinRoughness: toTexSpec(blackMageSkin.roughnessMap),
    blackYoungSkinMap: toTexSpec(blackYoungSkin.map),
    blackYoungSkinNormal: toTexSpec(blackYoungSkin.normalMap),
    blackYoungSkinRoughness: toTexSpec(blackYoungSkin.roughnessMap),
    whiteBodySkinTex: toTexSpec(createBodySkinTexture('#e3b293', '#9d6a52', '#f7d3b8', maxAniso)),
    blackBodySkinTex: toTexSpec(createBodySkinTexture('#c59277', '#6a4238', '#dab096', maxAniso)),
    whiteIrisTex: toTexSpec(createIrisTexture('#255ea3', '#5baef5', '#c8e4ff', maxAniso)),
    blackIrisTex: toTexSpec(createIrisTexture('#8a1d26', '#d94534', '#ffb184', maxAniso)),
    whiteHorseTex: toTexSpec(createHorseCoatTexture(true, maxAniso)),
    blackHorseTex: toTexSpec(createHorseCoatTexture(false, maxAniso)),
    coordAtlasTex: toTexSpec(createCoordinateAtlasTexture(maxAniso)),
  };

  return _cachedTextureSet;
}

export function createSceneMaterialBank(
  renderer: THREE.WebGLRenderer,
  initialCharacterSet: CharacterSetId = 'human'
): SceneMaterialBank {
  const maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 2);
  const disposables: Array<{ dispose: () => void }> = [];
  const setDisposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };
  const trackSet = <T extends { dispose: () => void }>(item: T): T => {
    setDisposables.push(item);
    return item;
  };

  const specs = getCachedSceneTextureSet(maxAniso);
  const cloneTex = (spec: CachedTexSpec): THREE.CanvasTexture => {
    const tex = new THREE.CanvasTexture(spec.image);
    tex.colorSpace = spec.colorSpace;
    tex.wrapS = spec.wrapS;
    tex.wrapT = spec.wrapT;
    tex.repeat.set(spec.repeatX, spec.repeatY);
    tex.anisotropy = maxAniso;
    return track(tex);
  };

  const lightMarbleTex = cloneTex(specs.lightMarbleTex);
  const darkObsidianTex = cloneTex(specs.darkObsidianTex);
  const citadelStoneMaps = {
    map: cloneTex(specs.citadelStoneMap),
    normalMap: cloneTex(specs.citadelStoneNormal),
  };
  const ruinStoneMaps = {
    map: cloneTex(specs.ruinStoneMap),
    normalMap: cloneTex(specs.ruinStoneNormal),
  };
  const whiteLeatherMaps = {
    map: cloneTex(specs.whiteLeatherMap),
    normalMap: cloneTex(specs.whiteLeatherNormal),
  };
  const blackLeatherMaps = {
    map: cloneTex(specs.blackLeatherMap),
    normalMap: cloneTex(specs.blackLeatherNormal),
  };

  const waterNormalMap = cloneTex(specs.waterNormalMap);
  const contactTex = cloneTex(specs.contactTex);
  const emberTexture = cloneTex(specs.emberTexture);

  const whiteArmorMaps = {
    map: cloneTex(specs.whiteArmorMap),
    normalMap: cloneTex(specs.whiteArmorNormal),
    roughnessMap: cloneTex(specs.whiteArmorRoughness),
  };
  const blackArmorMaps = {
    map: cloneTex(specs.blackArmorMap),
    normalMap: cloneTex(specs.blackArmorNormal),
    roughnessMap: cloneTex(specs.blackArmorRoughness),
  };
  const goldArmorMaps = {
    map: cloneTex(specs.goldArmorMap),
    normalMap: cloneTex(specs.goldArmorNormal),
    roughnessMap: cloneTex(specs.goldArmorRoughness),
  };
  const bronzeArmorMaps = {
    map: cloneTex(specs.bronzeArmorMap),
    normalMap: cloneTex(specs.bronzeArmorNormal),
    roughnessMap: cloneTex(specs.bronzeArmorRoughness),
  };

  const whiteMailMaps = {
    map: cloneTex(specs.whiteMailMap),
    normalMap: cloneTex(specs.whiteMailNormal),
  };
  const blackMailMaps = {
    map: cloneTex(specs.blackMailMap),
    normalMap: cloneTex(specs.blackMailNormal),
  };

  const whiteCapeMaps = {
    map: cloneTex(specs.whiteCapeMap),
    normalMap: cloneTex(specs.whiteCapeNormal),
  };
  const blackCapeMaps = {
    map: cloneTex(specs.blackCapeMap),
    normalMap: cloneTex(specs.blackCapeNormal),
  };
  const whiteQueenMaps = {
    map: cloneTex(specs.whiteQueenMap),
    normalMap: cloneTex(specs.whiteQueenNormal),
  };
  const blackQueenMaps = {
    map: cloneTex(specs.blackQueenMap),
    normalMap: cloneTex(specs.blackQueenNormal),
  };

  const whiteKingTabardTex = cloneTex(specs.whiteKingTabardTex);
  const blackKingTabardTex = cloneTex(specs.blackKingTabardTex);
  const whiteScoutCoatTex = cloneTex(specs.whiteScoutCoatTex);
  const blackScoutCoatTex = cloneTex(specs.blackScoutCoatTex);

  const whiteShieldTex = cloneTex(specs.whiteShieldTex);
  const blackShieldTex = cloneTex(specs.blackShieldTex);

  const clothBump = cloneTex(specs.clothBump);
  const skinBump = cloneTex(specs.skinBump);
  const hairBump = cloneTex(specs.hairBump);
  const woodBump = cloneTex(specs.woodBump);

  const whiteKingSkin = {
    map: cloneTex(specs.whiteKingSkinMap),
    normalMap: cloneTex(specs.whiteKingSkinNormal),
    roughnessMap: cloneTex(specs.whiteKingSkinRoughness),
  };
  const whiteQueenSkin = {
    map: cloneTex(specs.whiteQueenSkinMap),
    normalMap: cloneTex(specs.whiteQueenSkinNormal),
    roughnessMap: cloneTex(specs.whiteQueenSkinRoughness),
  };
  const whiteWarriorSkin = {
    map: cloneTex(specs.whiteWarriorSkinMap),
    normalMap: cloneTex(specs.whiteWarriorSkinNormal),
    roughnessMap: cloneTex(specs.whiteWarriorSkinRoughness),
  };
  const whiteMageSkin = {
    map: cloneTex(specs.whiteMageSkinMap),
    normalMap: cloneTex(specs.whiteMageSkinNormal),
    roughnessMap: cloneTex(specs.whiteMageSkinRoughness),
  };
  const whiteYoungSkin = {
    map: cloneTex(specs.whiteYoungSkinMap),
    normalMap: cloneTex(specs.whiteYoungSkinNormal),
    roughnessMap: cloneTex(specs.whiteYoungSkinRoughness),
  };

  const blackKingSkin = {
    map: cloneTex(specs.blackKingSkinMap),
    normalMap: cloneTex(specs.blackKingSkinNormal),
    roughnessMap: cloneTex(specs.blackKingSkinRoughness),
  };
  const blackQueenSkin = {
    map: cloneTex(specs.blackQueenSkinMap),
    normalMap: cloneTex(specs.blackQueenSkinNormal),
    roughnessMap: cloneTex(specs.blackQueenSkinRoughness),
  };
  const blackWarriorSkin = {
    map: cloneTex(specs.blackWarriorSkinMap),
    normalMap: cloneTex(specs.blackWarriorSkinNormal),
    roughnessMap: cloneTex(specs.blackWarriorSkinRoughness),
  };
  const blackMageSkin = {
    map: cloneTex(specs.blackMageSkinMap),
    normalMap: cloneTex(specs.blackMageSkinNormal),
    roughnessMap: cloneTex(specs.blackMageSkinRoughness),
  };
  const blackYoungSkin = {
    map: cloneTex(specs.blackYoungSkinMap),
    normalMap: cloneTex(specs.blackYoungSkinNormal),
    roughnessMap: cloneTex(specs.blackYoungSkinRoughness),
  };

  const whiteBodySkinTex = cloneTex(specs.whiteBodySkinTex);
  const blackBodySkinTex = cloneTex(specs.blackBodySkinTex);

  const whiteIrisTex = cloneTex(specs.whiteIrisTex);
  const blackIrisTex = cloneTex(specs.blackIrisTex);

  const whiteHorseTex = cloneTex(specs.whiteHorseTex);
  const blackHorseTex = cloneTex(specs.blackHorseTex);

  const coordAtlasTex = cloneTex(specs.coordAtlasTex);

  const buildHumanPalettes = (): { white: KingdomMaterials; black: KingdomMaterials } => {
  const white: KingdomMaterials = {
    armorPrimary: trackSet(
      new THREE.MeshStandardMaterial({
        map: whiteArmorMaps.map,
        normalMap: whiteArmorMaps.normalMap,
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughnessMap: whiteArmorMaps.roughnessMap,
        metalness: 0.9,
        roughness: 0.42,
        envMapIntensity: 1.4,
      })
    ),
    armorDarkSteel: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackArmorMaps.map,
        normalMap: blackArmorMaps.normalMap,
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughnessMap: blackArmorMaps.roughnessMap,
        color: 0x5c6472,
        metalness: 0.9,
        roughness: 0.44,
        envMapIntensity: 1.38,
      })
    ),
    armorSecondary: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0xaab6c4,
        normalMap: whiteArmorMaps.normalMap,
        normalScale: new THREE.Vector2(0.4, 0.4),
        metalness: 0.84,
        roughness: 0.32,
      })
    ),
    armorTrim: trackSet(
      new THREE.MeshStandardMaterial({
        map: goldArmorMaps.map,
        normalMap: goldArmorMaps.normalMap,
        normalScale: new THREE.Vector2(0.45, 0.45),
        roughnessMap: goldArmorMaps.roughnessMap,
        metalness: 0.95,
        roughness: 0.34,
        envMapIntensity: 1.48,
      })
    ),
    chainmail: trackSet(
      new THREE.MeshStandardMaterial({
        map: whiteMailMaps.map,
        normalMap: whiteMailMaps.normalMap,
        normalScale: new THREE.Vector2(0.95, 0.95),
        metalness: 0.85,
        roughness: 0.38,
      })
    ),
    cloth: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0xf0ebe0,
        metalness: 0.02,
        roughness: 0.82,
        bumpMap: clothBump,
        bumpScale: 0.012,
      })
    ),
    tabard: trackSet(
      new THREE.MeshStandardMaterial({
        map: whiteCapeMaps.map,
        normalMap: whiteCapeMaps.normalMap,
        normalScale: new THREE.Vector2(0.45, 0.45),
        metalness: 0.02,
        roughness: 0.78,
      })
    ),
    royalTabard: trackSet(
      new THREE.MeshStandardMaterial({
        map: whiteKingTabardTex,
        normalMap: whiteCapeMaps.normalMap,
        normalScale: new THREE.Vector2(0.45, 0.45),
        metalness: 0.06,
        roughness: 0.68,
        side: THREE.DoubleSide,
      })
    ),
    pawnCoat: trackSet(
      new THREE.MeshStandardMaterial({
        map: whiteScoutCoatTex,
        normalMap: whiteCapeMaps.normalMap,
        normalScale: new THREE.Vector2(0.35, 0.35),
        metalness: 0.02,
        roughness: 0.74,
        side: THREE.DoubleSide,
      })
    ),
    crimsonAccent: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0xa11d28,
        normalMap: whiteCapeMaps.normalMap,
        normalScale: new THREE.Vector2(0.45, 0.45),
        metalness: 0.04,
        roughness: 0.68,
        side: THREE.DoubleSide,
      })
    ),
    cape: trackSet(
      new THREE.MeshStandardMaterial({
        map: whiteCapeMaps.map,
        normalMap: whiteCapeMaps.normalMap,
        normalScale: new THREE.Vector2(0.55, 0.55),
        metalness: 0.03,
        roughness: 0.75,
        side: THREE.DoubleSide,
      })
    ),
    gown: trackSet(
      new THREE.MeshStandardMaterial({
        map: whiteCapeMaps.map,
        normalMap: whiteCapeMaps.normalMap,
        normalScale: new THREE.Vector2(0.45, 0.45),
        metalness: 0.05,
        roughness: 0.66,
        side: THREE.DoubleSide,
      })
    ),
    queenGown: trackSet(
      new THREE.MeshStandardMaterial({
        map: whiteQueenMaps.map,
        normalMap: whiteQueenMaps.normalMap,
        normalScale: new THREE.Vector2(0.45, 0.45),
        metalness: 0.12,
        roughness: 0.52,
        side: THREE.DoubleSide,
      })
    ),
    crownVelvet: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x992233,
        roughness: 0.85,
        metalness: 0.03,
      })
    ),
    furTrim: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0xf2ece2,
        roughness: 0.94,
        metalness: 0.0,
        bumpMap: hairBump,
        bumpScale: 0.022,
      })
    ),
    shieldFace: trackSet(
      new THREE.MeshStandardMaterial({
        map: whiteShieldTex,
        normalMap: whiteArmorMaps.normalMap,
        normalScale: new THREE.Vector2(0.3, 0.3),
        metalness: 0.28,
        roughness: 0.38,
        envMapIntensity: 1.25,
      })
    ),
    skin: trackSet(
      new THREE.MeshStandardMaterial({
        map: whiteKingSkin.map,
        normalMap: whiteKingSkin.normalMap,
        normalScale: new THREE.Vector2(0.32, 0.32),
        roughnessMap: whiteKingSkin.roughnessMap,
        metalness: 0.0,
        roughness: 0.88,
      })
    ),
    skinFemale: trackSet(
      new THREE.MeshStandardMaterial({
        map: whiteQueenSkin.map,
        normalMap: whiteQueenSkin.normalMap,
        normalScale: new THREE.Vector2(0.24, 0.24),
        roughnessMap: whiteQueenSkin.roughnessMap,
        metalness: 0.0,
        roughness: 0.84,
      })
    ),
    skinWarrior: trackSet(
      new THREE.MeshStandardMaterial({
        map: whiteWarriorSkin.map,
        normalMap: whiteWarriorSkin.normalMap,
        normalScale: new THREE.Vector2(0.36, 0.36),
        roughnessMap: whiteWarriorSkin.roughnessMap,
        metalness: 0.0,
        roughness: 0.88,
      })
    ),
    skinMage: trackSet(
      new THREE.MeshStandardMaterial({
        map: whiteMageSkin.map,
        normalMap: whiteMageSkin.normalMap,
        normalScale: new THREE.Vector2(0.34, 0.34),
        roughnessMap: whiteMageSkin.roughnessMap,
        metalness: 0.0,
        roughness: 0.88,
      })
    ),
    skinYoung: trackSet(
      new THREE.MeshStandardMaterial({
        map: whiteYoungSkin.map,
        normalMap: whiteYoungSkin.normalMap,
        normalScale: new THREE.Vector2(0.26, 0.26),
        roughnessMap: whiteYoungSkin.roughnessMap,
        metalness: 0.0,
        roughness: 0.86,
      })
    ),
    skinBody: trackSet(
      new THREE.MeshStandardMaterial({
        map: whiteBodySkinTex,
        bumpMap: skinBump,
        bumpScale: 0.003,
        metalness: 0.0,
        roughness: 0.58,
      })
    ),
    lips: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0xb25f58,
        roughness: 0.42,
        metalness: 0.0,
      })
    ),
    sclera: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0xf2ece4,
        roughness: 0.12,
        metalness: 0.02,
        envMapIntensity: 1.4,
      })
    ),
    iris: trackSet(
      new THREE.MeshStandardMaterial({
        map: whiteIrisTex,
        roughness: 0.1,
        metalness: 0.06,
        envMapIntensity: 1.45,
      })
    ),
    lashLine: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x201512,
        roughness: 0.72,
        metalness: 0.0,
      })
    ),
    eyebrow: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x4a301e,
        roughness: 0.78,
        metalness: 0.0,
        bumpMap: hairBump,
        bumpScale: 0.012,
      })
    ),
    leather: trackSet(
      new THREE.MeshStandardMaterial({
        map: whiteLeatherMaps.map,
        normalMap: whiteLeatherMaps.normalMap,
        normalScale: new THREE.Vector2(0.75, 0.75),
        metalness: 0.04,
        roughness: 0.64,
      })
    ),
    trousers: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x28262b,
        metalness: 0.02,
        roughness: 0.84,
        bumpMap: clothBump,
        bumpScale: 0.012,
      })
    ),
    wood: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x6b4628,
        metalness: 0.02,
        roughness: 0.74,
        bumpMap: woodBump,
        bumpScale: 0.016,
      })
    ),
    weaponBlade: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0xf2f7fc,
        normalMap: whiteArmorMaps.normalMap,
        normalScale: new THREE.Vector2(0.2, 0.2),
        metalness: 0.96,
        roughness: 0.14,
        envMapIntensity: 1.55,
      })
    ),
    gem: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x54adff,
        emissive: 0x1c6ee8,
        emissiveIntensity: 1.35,
        metalness: 0.15,
        roughness: 0.12,
      })
    ),
    horseCoat: trackSet(
      new THREE.MeshStandardMaterial({
        map: whiteHorseTex,
        metalness: 0.04,
        roughness: 0.54,
        bumpMap: hairBump,
        bumpScale: 0.005,
      })
    ),
    horseMane: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0xd4cab8,
        metalness: 0.02,
        roughness: 0.8,
        bumpMap: hairBump,
        bumpScale: 0.016,
      })
    ),
    horseCaparison: trackSet(
      new THREE.MeshStandardMaterial({
        map: whiteCapeMaps.map,
        normalMap: whiteCapeMaps.normalMap,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughness: 0.74,
        side: THREE.DoubleSide,
      })
    ),
    hair: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x624028,
        metalness: 0.04,
        roughness: 0.6,
        bumpMap: hairBump,
        bumpScale: 0.016,
      })
    ),
    hairAuburn: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x7d2f1e,
        metalness: 0.05,
        roughness: 0.52,
        bumpMap: hairBump,
        bumpScale: 0.016,
      })
    ),
    hairSilver: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0xd6d2ca,
        metalness: 0.06,
        roughness: 0.55,
        bumpMap: hairBump,
        bumpScale: 0.016,
      })
    ),
    accentGlow: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x54adff,
        emissive: 0x1c6ee8,
        emissiveIntensity: 1.25,
        metalness: 0.15,
        roughness: 0.18,
      })
    ),
  };

  const black: KingdomMaterials = {
    armorPrimary: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackArmorMaps.map,
        normalMap: blackArmorMaps.normalMap,
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughnessMap: blackArmorMaps.roughnessMap,
        metalness: 0.88,
        roughness: 0.45,
        envMapIntensity: 1.35,
      })
    ),
    armorDarkSteel: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackArmorMaps.map,
        normalMap: blackArmorMaps.normalMap,
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughnessMap: blackArmorMaps.roughnessMap,
        color: 0x222631,
        metalness: 0.9,
        roughness: 0.42,
        envMapIntensity: 1.35,
      })
    ),
    armorSecondary: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x161920,
        normalMap: blackArmorMaps.normalMap,
        normalScale: new THREE.Vector2(0.4, 0.4),
        metalness: 0.82,
        roughness: 0.34,
      })
    ),
    armorTrim: trackSet(
      new THREE.MeshStandardMaterial({
        map: bronzeArmorMaps.map,
        normalMap: bronzeArmorMaps.normalMap,
        normalScale: new THREE.Vector2(0.45, 0.45),
        roughnessMap: bronzeArmorMaps.roughnessMap,
        metalness: 0.94,
        roughness: 0.36,
        envMapIntensity: 1.4,
      })
    ),
    chainmail: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackMailMaps.map,
        normalMap: blackMailMaps.normalMap,
        normalScale: new THREE.Vector2(0.95, 0.95),
        metalness: 0.84,
        roughness: 0.42,
      })
    ),
    cloth: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x1f1d24,
        metalness: 0.03,
        roughness: 0.82,
        bumpMap: clothBump,
        bumpScale: 0.012,
      })
    ),
    tabard: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackCapeMaps.map,
        normalMap: blackCapeMaps.normalMap,
        normalScale: new THREE.Vector2(0.45, 0.45),
        metalness: 0.04,
        roughness: 0.78,
      })
    ),
    royalTabard: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackKingTabardTex,
        normalMap: blackCapeMaps.normalMap,
        normalScale: new THREE.Vector2(0.45, 0.45),
        metalness: 0.07,
        roughness: 0.68,
        side: THREE.DoubleSide,
      })
    ),
    pawnCoat: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackScoutCoatTex,
        normalMap: blackCapeMaps.normalMap,
        normalScale: new THREE.Vector2(0.35, 0.35),
        metalness: 0.04,
        roughness: 0.74,
        side: THREE.DoubleSide,
      })
    ),
    crimsonAccent: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x6b151e,
        normalMap: blackCapeMaps.normalMap,
        normalScale: new THREE.Vector2(0.45, 0.45),
        metalness: 0.05,
        roughness: 0.7,
        side: THREE.DoubleSide,
      })
    ),
    cape: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackCapeMaps.map,
        normalMap: blackCapeMaps.normalMap,
        normalScale: new THREE.Vector2(0.55, 0.55),
        metalness: 0.04,
        roughness: 0.75,
        side: THREE.DoubleSide,
      })
    ),
    gown: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackCapeMaps.map,
        normalMap: blackCapeMaps.normalMap,
        normalScale: new THREE.Vector2(0.45, 0.45),
        metalness: 0.06,
        roughness: 0.68,
        side: THREE.DoubleSide,
      })
    ),
    queenGown: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackQueenMaps.map,
        normalMap: blackQueenMaps.normalMap,
        normalScale: new THREE.Vector2(0.45, 0.45),
        metalness: 0.14,
        roughness: 0.52,
        side: THREE.DoubleSide,
      })
    ),
    crownVelvet: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x47101c,
        roughness: 0.85,
        metalness: 0.03,
      })
    ),
    furTrim: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x262228,
        roughness: 0.94,
        metalness: 0.0,
        bumpMap: hairBump,
        bumpScale: 0.022,
      })
    ),
    shieldFace: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackShieldTex,
        normalMap: blackArmorMaps.normalMap,
        normalScale: new THREE.Vector2(0.3, 0.3),
        metalness: 0.32,
        roughness: 0.4,
        envMapIntensity: 1.25,
      })
    ),
    skin: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackKingSkin.map,
        normalMap: blackKingSkin.normalMap,
        normalScale: new THREE.Vector2(0.32, 0.32),
        roughnessMap: blackKingSkin.roughnessMap,
        metalness: 0.0,
        roughness: 0.88,
      })
    ),
    skinFemale: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackQueenSkin.map,
        normalMap: blackQueenSkin.normalMap,
        normalScale: new THREE.Vector2(0.24, 0.24),
        roughnessMap: blackQueenSkin.roughnessMap,
        metalness: 0.0,
        roughness: 0.84,
      })
    ),
    skinWarrior: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackWarriorSkin.map,
        normalMap: blackWarriorSkin.normalMap,
        normalScale: new THREE.Vector2(0.36, 0.36),
        roughnessMap: blackWarriorSkin.roughnessMap,
        metalness: 0.0,
        roughness: 0.88,
      })
    ),
    skinMage: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackMageSkin.map,
        normalMap: blackMageSkin.normalMap,
        normalScale: new THREE.Vector2(0.34, 0.34),
        roughnessMap: blackMageSkin.roughnessMap,
        metalness: 0.0,
        roughness: 0.88,
      })
    ),
    skinYoung: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackYoungSkin.map,
        normalMap: blackYoungSkin.normalMap,
        normalScale: new THREE.Vector2(0.26, 0.26),
        roughnessMap: blackYoungSkin.roughnessMap,
        metalness: 0.0,
        roughness: 0.86,
      })
    ),
    skinBody: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackBodySkinTex,
        bumpMap: skinBump,
        bumpScale: 0.003,
        metalness: 0.0,
        roughness: 0.6,
      })
    ),
    lips: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x8f464a,
        roughness: 0.44,
        metalness: 0.0,
      })
    ),
    sclera: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0xede6de,
        roughness: 0.12,
        metalness: 0.02,
        envMapIntensity: 1.4,
      })
    ),
    iris: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackIrisTex,
        roughness: 0.1,
        metalness: 0.06,
        envMapIntensity: 1.45,
      })
    ),
    lashLine: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x120d10,
        roughness: 0.72,
        metalness: 0.0,
      })
    ),
    eyebrow: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x19151b,
        roughness: 0.78,
        metalness: 0.0,
        bumpMap: hairBump,
        bumpScale: 0.012,
      })
    ),
    leather: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackLeatherMaps.map,
        normalMap: blackLeatherMaps.normalMap,
        normalScale: new THREE.Vector2(0.75, 0.75),
        metalness: 0.04,
        roughness: 0.68,
      })
    ),
    trousers: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x151418,
        metalness: 0.02,
        roughness: 0.86,
        bumpMap: clothBump,
        bumpScale: 0.012,
      })
    ),
    wood: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x2d1f19,
        metalness: 0.03,
        roughness: 0.78,
        bumpMap: woodBump,
        bumpScale: 0.016,
      })
    ),
    weaponBlade: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0xa4adba,
        normalMap: blackArmorMaps.normalMap,
        normalScale: new THREE.Vector2(0.2, 0.2),
        metalness: 0.96,
        roughness: 0.16,
        envMapIntensity: 1.45,
      })
    ),
    gem: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0xff4048,
        emissive: 0xc41828,
        emissiveIntensity: 1.35,
        metalness: 0.15,
        roughness: 0.14,
      })
    ),
    horseCoat: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackHorseTex,
        metalness: 0.06,
        roughness: 0.52,
        bumpMap: hairBump,
        bumpScale: 0.005,
      })
    ),
    horseMane: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x3b181d,
        metalness: 0.04,
        roughness: 0.78,
        bumpMap: hairBump,
        bumpScale: 0.016,
      })
    ),
    horseCaparison: trackSet(
      new THREE.MeshStandardMaterial({
        map: blackCapeMaps.map,
        normalMap: blackCapeMaps.normalMap,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughness: 0.74,
        side: THREE.DoubleSide,
      })
    ),
    hair: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x1a171f,
        metalness: 0.04,
        roughness: 0.62,
        bumpMap: hairBump,
        bumpScale: 0.016,
      })
    ),
    hairAuburn: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x26181c,
        metalness: 0.05,
        roughness: 0.55,
        bumpMap: hairBump,
        bumpScale: 0.016,
      })
    ),
    hairSilver: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0x525764,
        metalness: 0.06,
        roughness: 0.58,
        bumpMap: hairBump,
        bumpScale: 0.016,
      })
    ),
    accentGlow: trackSet(
      new THREE.MeshStandardMaterial({
        color: 0xff4048,
        emissive: 0xc41828,
        emissiveIntensity: 1.25,
        metalness: 0.15,
        roughness: 0.2,
      })
    ),
  };
  return { white, black };
  };

  const basePalettes = buildHumanPalettes();
  type SavedMatColors = Array<{
    mat: THREE.MeshStandardMaterial;
    colorHex: number;
    emissiveHex: number;
    emissiveIntensity: number;
  }>;
  const capturePaletteColors = (palette: KingdomMaterials): SavedMatColors => {
    const out: SavedMatColors = [];
    for (const val of Object.values(palette)) {
      const m = val as THREE.MeshStandardMaterial;
      out.push({
        mat: m,
        colorHex: m.color.getHex(),
        emissiveHex: m.emissive.getHex(),
        emissiveIntensity: m.emissiveIntensity,
      });
    }
    return out;
  };
  const savedHumanWhite = capturePaletteColors(basePalettes.white);
  const savedHumanBlack = capturePaletteColors(basePalettes.black);

  const restoreHumanDefaults = (saved: SavedMatColors) => {
    for (let i = 0; i < saved.length; i++) {
      const entry = saved[i];
      entry.mat.color.setHex(entry.colorHex);
      entry.mat.emissive.setHex(entry.emissiveHex);
      entry.mat.emissiveIntensity = entry.emissiveIntensity;
    }
  };

  const applyCharacterSetToPalettes = (setId: CharacterSetId): { white: KingdomMaterials; black: KingdomMaterials } => {
    restoreHumanDefaults(savedHumanWhite);
    restoreHumanDefaults(savedHumanBlack);
    if (setId === 'human') {
      return basePalettes;
    }

    const tuneMat = (mat: THREE.MeshStandardMaterial, colorHex: number, emissiveHex?: number, emissiveIntensity = 1.3) => {
      mat.color.setHex(colorHex);
      if (emissiveHex !== undefined) {
        mat.emissive.setHex(emissiveHex);
        mat.emissiveIntensity = emissiveIntensity;
      }
    };

    const { white, black } = basePalettes;

    if (setId === 'titan') {
      // Titan Vanguard: White = Garrison Slate & Cream-Olive Tactical Coats; Black = Obsidian & Crimson Corps
      tuneMat(white.armorPrimary, 0xc7d2cb);
      tuneMat(white.armorDarkSteel, 0x3b4844);
      tuneMat(white.armorSecondary, 0x8ea096);
      tuneMat(white.armorTrim, 0xb89658);
      tuneMat(white.cloth, 0xd8dfd5);
      tuneMat(white.tabard, 0x4b6352);
      tuneMat(white.royalTabard, 0x3a5241);
      tuneMat(white.pawnCoat, 0x4d6352);
      tuneMat(white.crimsonAccent, 0x2d5e48);
      tuneMat(white.cape, 0x364f40);
      tuneMat(white.gown, 0x3e5948);
      tuneMat(white.queenGown, 0x354d3f);
      tuneMat(white.crownVelvet, 0x2a4538);
      tuneMat(white.furTrim, 0xc5ccbe);
      tuneMat(white.leather, 0x6b472b);
      tuneMat(white.trousers, 0xe8e4d8);
      tuneMat(white.weaponBlade, 0xe2e8f0);
      tuneMat(white.gem, 0x4ade80, 0x16a34a, 1.15);
      tuneMat(white.accentGlow, 0x86efac, 0x22c55e, 1.25);
      tuneMat(white.hair, 0x26211d);
      tuneMat(white.hairAuburn, 0x4a3122);
      tuneMat(white.hairSilver, 0x8b929c);

      tuneMat(black.armorPrimary, 0x30363b);
      tuneMat(black.armorDarkSteel, 0x181c20);
      tuneMat(black.armorSecondary, 0x424a52);
      tuneMat(black.armorTrim, 0x8a724d);
      tuneMat(black.cloth, 0x22262b);
      tuneMat(black.tabard, 0x2b3036);
      tuneMat(black.royalTabard, 0x451a22);
      tuneMat(black.pawnCoat, 0x2a2f36);
      tuneMat(black.crimsonAccent, 0x6d1b26);
      tuneMat(black.cape, 0x23272e);
      tuneMat(black.gown, 0x262a33);
      tuneMat(black.queenGown, 0x20252c);
      tuneMat(black.crownVelvet, 0x4f1722);
      tuneMat(black.furTrim, 0x333840);
      tuneMat(black.leather, 0x382419);
      tuneMat(black.trousers, 0x262930);
      tuneMat(black.weaponBlade, 0x9aa6b4);
      tuneMat(black.gem, 0x34d399, 0x059669, 1.2);
      tuneMat(black.accentGlow, 0x6ee7b7, 0x10b981, 1.3);
      tuneMat(black.hair, 0x14151a);
      tuneMat(black.hairAuburn, 0x321d1a);
      tuneMat(black.hairSilver, 0x656c78);
    } else if (setId === 'inferno') {
      // Inferno Empire: White = Forged Brass & Molten Orange; Black = Obsidian & Crimson Magma
      tuneMat(white.armorPrimary, 0x9c7b62);
      tuneMat(white.armorDarkSteel, 0x3c2c26);
      tuneMat(white.armorSecondary, 0xba8b5e);
      tuneMat(white.armorTrim, 0xe89b3c);
      tuneMat(white.cloth, 0x4f1f18);
      tuneMat(white.tabard, 0x96321a);
      tuneMat(white.royalTabard, 0xb83718);
      tuneMat(white.pawnCoat, 0x7d2916);
      tuneMat(white.crimsonAccent, 0xd9480f);
      tuneMat(white.cape, 0x8a2414);
      tuneMat(white.gown, 0x7a2214);
      tuneMat(white.queenGown, 0x9c2816);
      tuneMat(white.crownVelvet, 0xb83718);
      tuneMat(white.furTrim, 0x402924);
      tuneMat(white.weaponBlade, 0xfbd38d, 0xd97706, 0.45);
      tuneMat(white.gem, 0xff9f2e, 0xff5a00, 1.65);
      tuneMat(white.accentGlow, 0xffb347, 0xff6200, 1.85);
      tuneMat(white.horseCoat, 0x452a24);
      tuneMat(white.horseMane, 0xe05418, 0xc2410c, 0.55);
      tuneMat(white.hair, 0x3a1c16);
      tuneMat(white.hairAuburn, 0x9c2e14);
      tuneMat(white.hairSilver, 0xc97b50);

      tuneMat(black.armorPrimary, 0x1d1719);
      tuneMat(black.armorDarkSteel, 0x120d0f);
      tuneMat(black.armorSecondary, 0x2c2022);
      tuneMat(black.armorTrim, 0xb85228);
      tuneMat(black.cloth, 0x1f1113);
      tuneMat(black.tabard, 0x5c1114);
      tuneMat(black.royalTabard, 0x7a1216);
      tuneMat(black.pawnCoat, 0x3d1215);
      tuneMat(black.crimsonAccent, 0xb91c1c);
      tuneMat(black.cape, 0x450f14);
      tuneMat(black.gown, 0x380d12);
      tuneMat(black.queenGown, 0x541118);
      tuneMat(black.crownVelvet, 0x6b1016);
      tuneMat(black.furTrim, 0x211417);
      tuneMat(black.weaponBlade, 0x6e4742, 0xb91c1c, 0.48);
      tuneMat(black.gem, 0xff3b2f, 0xdc2626, 1.7);
      tuneMat(black.accentGlow, 0xff4d2e, 0xe11d48, 1.9);
      tuneMat(black.horseCoat, 0x161214);
      tuneMat(black.horseMane, 0xb91c1c, 0x991b1b, 0.65);
      tuneMat(black.hair, 0x140e12);
      tuneMat(black.hairAuburn, 0x5c1914);
      tuneMat(black.hairSilver, 0x6e4f52);
    } else if (setId === 'shadow') {
      // Shadow Dominion: White = Spectral Silver-Slate & Ice Cyan; Black = Abyssal Night & Violet Soulfire
      tuneMat(white.armorPrimary, 0x9ca8c2);
      tuneMat(white.armorDarkSteel, 0x2c344a);
      tuneMat(white.armorSecondary, 0x6f7d9e);
      tuneMat(white.armorTrim, 0xa5b4fc);
      tuneMat(white.cloth, 0x2d354d);
      tuneMat(white.tabard, 0x2b3b5c);
      tuneMat(white.royalTabard, 0x1e2c4a);
      tuneMat(white.pawnCoat, 0x303c58);
      tuneMat(white.crimsonAccent, 0x0ea5e9);
      tuneMat(white.cape, 0x24314c);
      tuneMat(white.gown, 0x26324d);
      tuneMat(white.queenGown, 0x1d2b48);
      tuneMat(white.crownVelvet, 0x1e3a5f);
      tuneMat(white.furTrim, 0x8f9bb8);
      tuneMat(white.weaponBlade, 0xcbe8ff, 0x0284c7, 0.35);
      tuneMat(white.gem, 0x38bdf8, 0x0ea5e9, 1.65);
      tuneMat(white.accentGlow, 0x67e8f9, 0x06b6d4, 1.85);
      tuneMat(white.horseCoat, 0x525d78);
      tuneMat(white.horseMane, 0x7dd3fc, 0x0284c7, 0.4);
      tuneMat(white.hair, 0x28324a);
      tuneMat(white.hairSilver, 0xcbd5e1);

      tuneMat(black.armorPrimary, 0x1c1a2c);
      tuneMat(black.armorDarkSteel, 0x110f1c);
      tuneMat(black.armorSecondary, 0x2d2745);
      tuneMat(black.armorTrim, 0x7c5ca8);
      tuneMat(black.cloth, 0x171424);
      tuneMat(black.tabard, 0x281942);
      tuneMat(black.royalTabard, 0x381d5c);
      tuneMat(black.pawnCoat, 0x211836);
      tuneMat(black.crimsonAccent, 0x7e22ce);
      tuneMat(black.cape, 0x1b132e);
      tuneMat(black.gown, 0x1d1430);
      tuneMat(black.queenGown, 0x2e1748);
      tuneMat(black.crownVelvet, 0x4c1d95);
      tuneMat(black.furTrim, 0x241d33);
      tuneMat(black.weaponBlade, 0x867aa8, 0x6d28d9, 0.42);
      tuneMat(black.gem, 0xc084fc, 0x9333ea, 1.75);
      tuneMat(black.accentGlow, 0xd8b4fe, 0xa855f7, 1.9);
      tuneMat(black.horseCoat, 0x12101c);
      tuneMat(black.horseMane, 0x7e22ce, 0x6b21a8, 0.55);
      tuneMat(black.hair, 0x151120);
      tuneMat(black.hairSilver, 0x73698c);
    } else if (setId === 'celestial') {
      // Celestial Kingdom: White = Pearl-Silver, Sun-Gold & Azure Light; Black = Astral Sapphire, Bronze-Gold & Starlight
      tuneMat(white.armorPrimary, 0xe8eef7);
      tuneMat(white.armorDarkSteel, 0x637696);
      tuneMat(white.armorSecondary, 0xd4dfef);
      tuneMat(white.armorTrim, 0xf2ca52);
      tuneMat(white.cloth, 0xf4f7fc);
      tuneMat(white.tabard, 0xdbeafe);
      tuneMat(white.royalTabard, 0x1d4ed8);
      tuneMat(white.pawnCoat, 0xe2e8f6);
      tuneMat(white.crimsonAccent, 0x2563eb);
      tuneMat(white.cape, 0x2563eb);
      tuneMat(white.gown, 0xeef4fc);
      tuneMat(white.queenGown, 0x1e40af);
      tuneMat(white.crownVelvet, 0x1d4ed8);
      tuneMat(white.furTrim, 0xf8fafc);
      tuneMat(white.weaponBlade, 0xf0f9ff, 0x38bdf8, 0.3);
      tuneMat(white.gem, 0x38bdf8, 0x0ea5e9, 1.65);
      tuneMat(white.accentGlow, 0x7dd3fc, 0x38bdf8, 1.85);
      tuneMat(white.horseCoat, 0xedf2fa);
      tuneMat(white.horseMane, 0xfacc15, 0xca8a04, 0.3);
      tuneMat(white.hair, 0xcba14a);
      tuneMat(white.hairAuburn, 0xd9a74e);
      tuneMat(white.hairSilver, 0xf1f5f9);

      tuneMat(black.armorPrimary, 0x273452);
      tuneMat(black.armorDarkSteel, 0x172036);
      tuneMat(black.armorSecondary, 0x394a72);
      tuneMat(black.armorTrim, 0xd9a441);
      tuneMat(black.cloth, 0x1e2945);
      tuneMat(black.tabard, 0x1d2b4f);
      tuneMat(black.royalTabard, 0x312e81);
      tuneMat(black.pawnCoat, 0x223054);
      tuneMat(black.crimsonAccent, 0xd97706);
      tuneMat(black.cape, 0x1e1b4b);
      tuneMat(black.gown, 0x1d2547);
      tuneMat(black.queenGown, 0x2c2459);
      tuneMat(black.crownVelvet, 0x3730a3);
      tuneMat(black.furTrim, 0x2d3a59);
      tuneMat(black.weaponBlade, 0xb8c6e0, 0x4f46e5, 0.35);
      tuneMat(black.gem, 0xfde047, 0xf59e0b, 1.7);
      tuneMat(black.accentGlow, 0xfef08a, 0xeab308, 1.85);
      tuneMat(black.horseCoat, 0x1b233a);
      tuneMat(black.horseMane, 0xd9a441, 0xb45309, 0.35);
      tuneMat(black.hair, 0x191f33);
      tuneMat(black.hairSilver, 0x8ea0c4);
    }

    return basePalettes;
  };

  let activeCharacterSet: CharacterSetId = initialCharacterSet;
  const activePalettes = applyCharacterSetToPalettes(activeCharacterSet);

  const bank: SceneMaterialBank = {
    characterSet: activeCharacterSet,
    white: activePalettes.white,
    black: activePalettes.black,
    lightTile: track(
      new THREE.MeshStandardMaterial({
        map: lightMarbleTex,
        roughness: 0.34,
        metalness: 0.04,
      })
    ),
    darkTile: track(
      new THREE.MeshStandardMaterial({
        map: darkObsidianTex,
        roughness: 0.4,
        metalness: 0.1,
      })
    ),
    stoneApron: track(
      new THREE.MeshStandardMaterial({
        map: citadelStoneMaps.map,
        normalMap: citadelStoneMaps.normalMap,
        normalScale: new THREE.Vector2(0.7, 0.7),
        roughness: 0.74,
        metalness: 0.08,
      })
    ),
    boardFrame: track(
      new THREE.MeshStandardMaterial({
        map: citadelStoneMaps.map,
        normalMap: citadelStoneMaps.normalMap,
        normalScale: new THREE.Vector2(0.75, 0.75),
        color: 0x8e98ab,
        roughness: 0.78,
        metalness: 0.1,
      })
    ),
    boardGoldTrim: track(
      new THREE.MeshStandardMaterial({
        color: 0xb8965c,
        metalness: 0.78,
        roughness: 0.3,
        envMapIntensity: 1.35,
      })
    ),
    waterMoat: track(
      new THREE.MeshStandardMaterial({
        color: 0x0c1d2b,
        normalMap: waterNormalMap,
        normalScale: new THREE.Vector2(0.36, 0.36),
        roughness: 0.08,
        metalness: 0.24,
        envMapIntensity: 1.65,
      })
    ),
    waterNormalMap,
    citadelGround: track(
      new THREE.MeshStandardMaterial({
        color: 0x161c26,
        normalMap: ruinStoneMaps.normalMap,
        normalScale: new THREE.Vector2(0.45, 0.45),
        roughness: 0.92,
        metalness: 0.04,
      })
    ),
    ruinStone: track(
      new THREE.MeshStandardMaterial({
        map: ruinStoneMaps.map,
        normalMap: ruinStoneMaps.normalMap,
        normalScale: new THREE.Vector2(0.7, 0.7),
        color: 0x8f9ab0,
        roughness: 0.85,
        metalness: 0.06,
      })
    ),
    brazierIron: track(
      new THREE.MeshStandardMaterial({
        color: 0x20252f,
        normalMap: blackArmorMaps.normalMap,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughness: 0.56,
        metalness: 0.82,
      })
    ),
    brazierEmber: track(
      new THREE.MeshStandardMaterial({
        color: 0x3b1308,
        emissive: 0xff5a12,
        emissiveIntensity: 2.2,
        roughness: 0.85,
      })
    ),
    brazierFlame: track(
      new THREE.MeshBasicMaterial({
        color: 0xffa638,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    ),
    contactShadowMat: track(
      new THREE.MeshBasicMaterial({
        map: contactTex,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    ),
    hitProxyMat: track(new THREE.MeshBasicMaterial({ visible: false })),
    emberTexture,
    coordAtlasTex,
    switchCharacterSet: (nextSet: CharacterSetId) => {
      if (nextSet === activeCharacterSet) return;
      activeCharacterSet = nextSet;
      applyCharacterSetToPalettes(nextSet);
      bank.characterSet = nextSet;
    },
    dispose: () => {
      for (const item of setDisposables) {
        item.dispose();
      }
      setDisposables.length = 0;
      for (const item of disposables) {
        item.dispose();
      }
    },
  };
  return bank;
}

export function getKingdomPalette(bank: SceneMaterialBank, color: PieceColor): KingdomMaterials {
  return color === 'w' ? bank.white : bank.black;
}
