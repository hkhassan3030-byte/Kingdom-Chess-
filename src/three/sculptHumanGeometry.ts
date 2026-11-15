import * as THREE from 'three';

export type FaceVariant = 'king' | 'queen' | 'warrior' | 'mage' | 'young';

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function gaussian2D(x: number, y: number, cx: number, cy: number, sx: number, sy: number): number {
  const dx = (x - cx) / sx;
  const dy = (y - cy) / sy;
  return Math.exp(-(dx * dx + dy * dy));
}

function finalizeGeometry(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  geo.computeVertexNormals();
  if (geo.attributes.uv) {
    geo.setAttribute('uv2', geo.attributes.uv);
  }
  return geo;
}

/**
 * Helper: Tapered sculpted tube along a 3D spline (used for flowing hair curls,
 * handlebar moustaches, equine tail locks, and crown arches).
 */
export function buildTaperedCurveGeometry(
  points: THREE.Vector3[],
  tubularSegments: number,
  radialSegments: number,
  radiusFn: (t: number) => number
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const verts: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const P = new THREE.Vector3();
  const N = new THREE.Vector3();
  const B = new THREE.Vector3();
  const v = new THREE.Vector3();

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    curve.getPointAt(t, P);
    N.copy(frames.normals[i]);
    B.copy(frames.binormals[i]);
    const r = Math.max(0.0005, radiusFn(t));

    for (let j = 0; j <= radialSegments; j++) {
      const u = (j / radialSegments) * Math.PI * 2;
      const sin = Math.sin(u);
      const cos = -Math.cos(u);
      v.copy(P)
        .addScaledVector(N, r * cos)
        .addScaledVector(B, r * sin);
      verts.push(v.x, v.y, v.z);
      uvs.push(j / radialSegments, t);
    }
  }

  const stride = radialSegments + 1;
  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return finalizeGeometry(geo);
}

/**
 * High-resolution anatomically sculpted human head BufferGeometry:
 * - Cranium, temples, cheekbones, tapered jawline & chin
 * - Deep orbital eye sockets
 * - Nasal bridge, dorsum, tip, and flared nostril wings
 * - Philtrum, Cupid's bow upper lip, full lower lip, mentolabial crease
 */
export function buildSculptedHeadGeometry(variant: FaceVariant): THREE.BufferGeometry {
  const segW = 48;
  const segH = 36;
  const geo = new THREE.SphereGeometry(0.118, segW, segH);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  const isFemale = variant === 'queen';
  const isKing = variant === 'king';
  const isWarrior = variant === 'warrior';
  const isMage = variant === 'mage';

  const jawWidth = isFemale ? 0.74 : isWarrior ? 1.02 : isKing ? 0.96 : isMage ? 0.82 : 0.85;
  const browStrength = isFemale ? 0.28 : isWarrior ? 1.16 : isKing ? 1.08 : isMage ? 0.92 : 0.68;
  const noseWidth = isFemale ? 0.082 : isWarrior ? 0.112 : isMage ? 0.09 : 0.096;
  const cheekStrength = isFemale ? 0.018 : isMage ? 0.015 : 0.012;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const r = Math.sqrt(x * x + y * y + z * z) || 1;
    const nx = x / r;
    const ny = y / r;
    const nz = z / r;

    y *= 1.19;
    if (nz > 0) {
      const lowerMask = smoothstep(0.15, -0.85, ny);
      x *= THREE.MathUtils.lerp(0.95, jawWidth * 0.71, lowerMask);
      z *= THREE.MathUtils.lerp(0.98, 0.84, lowerMask);

      // Subtle natural left/right organic asymmetry (prevents identical mannequin look)
      const asymBrow = nx < 0 ? 0.0014 : -0.0006;
      const asymCheek = nx > 0 ? 0.0012 : -0.0005;

      // Jaw angle definition
      const jawCorner =
        gaussian2D(Math.abs(nx), ny, 0.56, -0.52, 0.16, 0.16) * (isFemale ? 0.32 : isWarrior ? 1.15 : 1.0);
      x += Math.sign(nx) * jawCorner * 0.0085;

      // Chin projection
      const chin = gaussian2D(nx, ny, 0, -0.78, isFemale ? 0.19 : 0.23, 0.15);
      z += chin * (isFemale ? 0.015 : isWarrior ? 0.025 : 0.022);
      y -= chin * (isMage ? 0.012 : 0.009);

      // Cheekbones & subtle sub-malar hollow (stronger hollow for lean scholar/mage)
      const cheekL = gaussian2D(nx, ny, -0.5, -0.14, 0.22, 0.16);
      const cheekR = gaussian2D(nx, ny, 0.5, -0.14, 0.22, 0.16);
      const cheeks = cheekL + cheekR;
      z += cheeks * cheekStrength + (cheeks > 0.2 ? asymCheek : 0);
      x += Math.sign(nx) * cheeks * 0.0065;

      const hollowL = gaussian2D(nx, ny, -0.46, -0.36, 0.15, 0.13);
      const hollowR = gaussian2D(nx, ny, 0.46, -0.36, 0.15, 0.13);
      z -= (hollowL + hollowR) * (isMage ? 0.01 : 0.006);

      // Brow ridge & glabella
      const brow = gaussian2D(nx, ny, 0, 0.24, 0.5, 0.1);
      z += brow * 0.0145 * browStrength + (brow > 0.2 ? asymBrow : 0);

      // Deep orbital eye sockets
      const eyeSocketL = gaussian2D(nx, ny, -0.34, 0.08, 0.16, 0.11);
      const eyeSocketR = gaussian2D(nx, ny, 0.34, 0.08, 0.16, 0.11);
      z -= (eyeSocketL + eyeSocketR) * (isFemale ? 0.02 : 0.024);

      // Nasal bridge, dorsum, tip & nostril wings
      const noseBridge =
        gaussian2D(nx, ny, 0, -0.04, noseWidth, 0.24) * smoothstep(-0.32, 0.12, ny);
      const noseTip = gaussian2D(nx, ny, 0, -0.22, noseWidth * 1.05, 0.09);
      const nostrilL = gaussian2D(nx, ny, -0.115, -0.26, 0.065, 0.055);
      const nostrilR = gaussian2D(nx, ny, 0.115, -0.26, 0.065, 0.055);
      const noseTilt = isFemale ? -0.002 : isWarrior ? 0.002 : 0;
      z += noseBridge * 0.024 + noseTip * 0.034 + (nostrilL + nostrilR) * 0.011 + noseTilt;

      // Philtrum groove
      const philtrum = gaussian2D(nx, ny, 0, -0.37, 0.055, 0.065);
      z -= philtrum * 0.0055;

      // Lips & mentolabial crease
      const mouthWidth = isFemale ? 0.195 : isWarrior ? 0.23 : 0.215;
      const upperLip = gaussian2D(nx, ny, 0, -0.45, mouthWidth, 0.04);
      const mouthCrease = gaussian2D(nx, ny, 0, -0.5, mouthWidth * 0.92, 0.016);
      const lowerLip = gaussian2D(nx, ny, 0, -0.55, mouthWidth * 0.85, 0.046);
      const underLipHollow = gaussian2D(nx, ny, 0, -0.63, 0.17, 0.052);

      z += upperLip * 0.0135 + lowerLip * 0.0125 - mouthCrease * 0.0115 - underLipHollow * 0.0095;
    } else {
      const backLower = smoothstep(0.0, -0.9, ny);
      z *= THREE.MathUtils.lerp(1.06, 0.72, backLower);
      x *= THREE.MathUtils.lerp(0.95, 0.68, backLower);
    }

    pos.setXYZ(i, x, y, z);
  }

  return finalizeGeometry(geo);
}

/**
 * Sculpted anatomical ear pinna
 */
export function buildEarGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.028);
  shape.bezierCurveTo(0.018, 0.032, 0.024, 0.01, 0.018, -0.012);
  shape.bezierCurveTo(0.014, -0.028, 0.002, -0.032, -0.005, -0.02);
  shape.bezierCurveTo(-0.008, -0.005, -0.006, 0.02, 0, 0.028);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.008,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

/**
 * Curved spherical-cap Iris Dome (calibrated cap angle so crisp white sclera borders both sides of iris)
 */
export function buildIrisDomeGeometry(radius = 0.0168): THREE.BufferGeometry {
  const capAngle = Math.PI * 0.27;
  const geo = new THREE.SphereGeometry(radius, 20, 14, 0, Math.PI * 2, 0, capAngle);
  geo.rotateX(Math.PI / 2); // Align cap pole toward +Z
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const maxR = radius * Math.sin(capAngle);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uv.setXY(i, 0.5 + (x / maxR) * 0.49, 0.5 + (y / maxR) * 0.49);
  }
  return finalizeGeometry(geo);
}

/**
 * Sculpted curved eyelid / eyebrow crescent geometry
 */
export function buildCurvedStripGeometry(
  width: number,
  height: number,
  curveDepth: number
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, height, 12, 4);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const nx = x / (width * 0.5);
    const arch = (1 - nx * nx) * height * 0.48;
    const wrapZ = -(nx * nx) * curveDepth;
    pos.setXYZ(i, x, y + arch, wrapZ);
  }
  return finalizeGeometry(geo);
}

/**
 * Sculpted 3D Upper & Lower Lips with Cupid's Bow
 */
export function buildSculptedLipsGeometry(upper: boolean): THREE.BufferGeometry {
  const w = upper ? 0.044 : 0.039;
  const h = upper ? 0.0085 : 0.0095;
  const geo = new THREE.PlaneGeometry(w, h, 14, 4);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const nx = x / (w * 0.5);
    const ny = y / (h * 0.5);
    const envelope = Math.max(0, 1 - nx * nx);
    // Cupid's bow dip at x=0 for upper lip, soft full curve for lower lip
    const bow = upper ? (Math.cos(nx * Math.PI * 2.2) * 0.0014 + 0.0015) * envelope : -0.002 * envelope;
    const bulgeZ = (1 - ny * ny * 0.7) * envelope * 0.006 - nx * nx * 0.01;
    pos.setXYZ(i, x, y * (0.45 + 0.55 * envelope) + bow, bulgeZ);
  }
  return finalizeGeometry(geo);
}

/**
 * Sculpted Gorget (armored steel/gold collar around neck base)
 */
export function buildGorgetGeometry(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.155, -0.025),
    new THREE.Vector2(0.135, 0.01),
    new THREE.Vector2(0.088, 0.045),
    new THREE.Vector2(0.072, 0.078),
    new THREE.Vector2(0.064, 0.082),
  ];
  const geo = new THREE.LatheGeometry(pts, 24);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Dip slightly downward at front sternum (+Z) and back
    const frontDip = z > 0 ? Math.abs(z) * 0.14 : 0;
    pos.setXYZ(i, x * 1.12, y - frontDip, z * 0.9);
  }
  return finalizeGeometry(geo);
}

/**
 * Sculpted contoured royal breastplate / cuirass with pectoral curve, sternum ridge, and waist taper
 */
export function buildSculptedCuirassGeometry(): THREE.BufferGeometry {
  const segR = 28;
  const segH = 20;
  const geo = new THREE.CylinderGeometry(0.16, 0.13, 0.44, segR, segH, false);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);

    const ny = (y + 0.22) / 0.44;
    const angle = Math.atan2(z, x);
    const isFront = z > 0;

    const waistCurve = 0.83 + 0.35 * smoothstep(0.05, 0.72, ny) - 0.08 * smoothstep(0.72, 1.0, ny);
    x *= waistCurve * 1.18;
    z *= waistCurve * 0.87;

    if (isFront) {
      const pec = gaussian2D(Math.abs(Math.cos(angle)), ny, 0.48, 0.68, 0.34, 0.19);
      const ridge = gaussian2D(Math.cos(angle), ny, 0, 0.56, 0.14, 0.38);
      // Segmented abdominal armor ribs
      const abRibs = ny < 0.42 ? Math.sin(ny * Math.PI * 12) * 0.0035 * Math.max(0, z / 0.14) : 0;
      z += pec * 0.034 + ridge * 0.024 + abRibs;
    } else {
      const back = gaussian2D(Math.abs(Math.cos(angle)), ny, 0.45, 0.72, 0.32, 0.22);
      z -= back * 0.024;
    }

    pos.setXYZ(i, x, y, z);
  }

  return finalizeGeometry(geo);
}

/**
 * Engraved Heraldic Chest Emblem / Crest Plate
 */
export function buildChestCrestGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.055);
  shape.lineTo(0.042, 0.024);
  shape.lineTo(0.026, -0.045);
  shape.lineTo(0, -0.068);
  shape.lineTo(-0.026, -0.045);
  shape.lineTo(-0.042, 0.024);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.005,
    bevelSegments: 2,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

/**
 * Curved scalloped shoulder pauldron plate with raised central crest
 */
export function buildPauldronGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.128, 22, 14, 0, Math.PI * 1.32, 0, Math.PI * 0.64);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const flare = y < 0.02 ? 1.14 : 1.0;
    const ridge = Math.exp(-(z * z) / 0.0012) * 0.012;
    pos.setXYZ(i, x * 1.1 * flare, y * 0.94 + ridge, z * 1.2 * flare);
  }
  return finalizeGeometry(geo);
}

/**
 * Sculpted Medieval Pointed Armor Cop (Couter / Poleyn for elbows and knees — replaces SphereGeometry)
 */
export function buildArmorCopGeometry(radius = 0.052): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(radius, 14, 10, -Math.PI * 0.45, Math.PI * 0.9, 0.15, Math.PI - 0.3);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const point = Math.exp(-(x * x + y * y) / (radius * radius * 0.45)) * radius * 0.42;
    pos.setXYZ(i, x * 1.18, y * 0.88, z + point);
  }
  return finalizeGeometry(geo);
}

/**
 * Sculpted Ergonomic Armored Gauntlet Hand Base (replaces BoxGeometry palm)
 */
export function buildGauntletPalmGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.022, 0.032);
  shape.lineTo(0.022, 0.032);
  shape.lineTo(0.026, -0.018);
  shape.lineTo(0.016, -0.032);
  shape.lineTo(-0.016, -0.032);
  shape.lineTo(-0.026, -0.018);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 2,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

/**
 * Contoured arm or leg armor segment (wider muscle swell near top, tapered joint)
 */
export function buildContouredLimbGeometry(
  topR: number,
  midR: number,
  botR: number,
  length: number
): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(botR, 0.02),
    new THREE.Vector2(midR, length * 0.48),
    new THREE.Vector2(topR, length * 0.88),
    new THREE.Vector2(topR * 0.72, length),
    new THREE.Vector2(0.0, length),
  ];
  const geo = new THREE.LatheGeometry(pts, 18);
  geo.translate(0, -length, 0);
  return finalizeGeometry(geo);
}

/**
 * True Asymmetrical Human Thigh Geometry (quadriceps forward sweep, lateral outer sweep, hamstring taper)
 */
export function buildAnatomicalThighGeometry(length = 0.3): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.068, 0.045, length, 22, 14, false);
  geo.translate(0, -length * 0.5, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);
    const v = -y / length; // 0 hip -> 1 knee
    const quad = Math.sin(v * Math.PI * 0.85) * 0.014;
    if (z > 0) z += quad; // Forward quadriceps bulge
    const ham = Math.sin(v * Math.PI * 0.7) * 0.008;
    if (z < 0) z -= ham;
    x *= 0.94 + Math.sin(v * Math.PI * 0.8) * 0.14;
    pos.setXYZ(i, x, y, z);
  }
  return finalizeGeometry(geo);
}

/**
 * True Asymmetrical Human Shin / Calf Geometry (posterior gastrocnemius swell, crisp anterior shinbone)
 */
export function buildAnatomicalShinGeometry(length = 0.3): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.05, 0.034, length, 22, 14, false);
  geo.translate(0, -length * 0.5, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);
    const v = -y / length; // 0 knee -> 1 ankle
    // Prominent calf muscle swell in upper-back 35%
    const calf = Math.exp(-Math.pow((v - 0.34) / 0.22, 2)) * 0.018;
    if (z < 0) z -= calf;
    // Slight inward/outward muscular taper
    x *= 0.92 + Math.exp(-Math.pow((v - 0.32) / 0.24, 2)) * 0.18;
    // Slight S-curve backward at ankle Achilles
    z += (0.5 - v) * 0.008;
    pos.setXYZ(i, x, y, z);
  }
  return finalizeGeometry(geo);
}

/**
 * True Asymmetrical Human Upper Arm & Forearm Geometry (deltoid/bicep swell or muscular oval forearm)
 */
export function buildAnatomicalArmGeometry(upper: boolean, length = 0.21): THREE.BufferGeometry {
  const topR = upper ? 0.048 : 0.042;
  const botR = upper ? 0.036 : 0.028;
  const geo = new THREE.CylinderGeometry(topR, botR, length, 20, 12, false);
  geo.translate(0, -length * 0.5, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);
    const v = -y / length; // 0 top -> 1 bottom
    if (upper) {
      const deltoid = Math.exp(-Math.pow((v - 0.18) / 0.2, 2)) * 0.011;
      const bicep = Math.sin(v * Math.PI) * 0.007;
      x *= 1 + deltoid * 8;
      if (z > 0) z += bicep;
    } else {
      const swell = Math.exp(-Math.pow((v - 0.28) / 0.24, 2)) * 0.01;
      x *= 0.92 + swell * 8;
      z *= 1.06 + swell * 6;
      // Flatten slightly toward wrist
      if (v > 0.7) {
        x *= THREE.MathUtils.lerp(1.0, 0.8, (v - 0.7) / 0.3);
      }
    }
    pos.setXYZ(i, x, y, z);
  }
  return finalizeGeometry(geo);
}

/**
 * Detailed Armored Boot with heel, arch, and armored toe sabaton
 */
export function buildBootGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.045, 0);
  shape.lineTo(0.088, 0);
  shape.lineTo(0.102, 0.026);
  shape.lineTo(0.056, 0.062);
  shape.lineTo(0.034, 0.112);
  shape.lineTo(-0.042, 0.112);
  shape.lineTo(-0.048, 0.025);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.072,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.036);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Flowing draped pleated cape with natural fabric folds & shoulder wrap
 */
export function buildDrapedCapeGeometry(width = 0.48, height = 0.8): THREE.BufferGeometry {
  const segX = 20;
  const segY = 22;
  const geo = new THREE.PlaneGeometry(width, height, segX, segY);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const v = 0.5 - y / height;
    const u = x / (width * 0.5);

    const spread = 0.62 + v * 0.58;
    const pleat = Math.sin(u * Math.PI * 4.0) * 0.024 * (0.2 + v * 0.9);
    const shoulderWrap = -(u * u) * 0.075 * (1 - v * 0.42);
    const drapeZ = -v * 0.15 + pleat + shoulderWrap;

    pos.setXYZ(i, x * spread, y - v * 0.02, drapeZ);
  }

  return finalizeGeometry(geo);
}

/**
 * Sculpted Royal Shoulder Fur Mantle Collar
 */
export function buildFurMantleGeometry(): THREE.BufferGeometry {
  const geo = new THREE.TorusGeometry(0.185, 0.045, 10, 24, Math.PI * 1.45);
  geo.rotateX(Math.PI * 0.52);
  geo.rotateZ(-Math.PI * 0.725);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const tuft = Math.sin(Math.atan2(z, x) * 18) * 0.007;
    pos.setXYZ(i, x * 1.12 + tuft, y * 0.82 + tuft * 0.5, z * 0.92);
  }
  return finalizeGeometry(geo);
}

/**
 * Fluted Double-Edged Fantasy Sword Blade with central ridge + beveled tip
 */
export function buildFlutedSwordBladeGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.025, 0);
  shape.lineTo(0.025, 0);
  shape.lineTo(0.017, 0.53);
  shape.lineTo(0, 0.65);
  shape.lineTo(-0.017, 0.53);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.009,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.0045);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Swept Curved Sword Crossguard (replaces BoxGeometry crossguard)
 */
export function buildCrossguardGeometry(): THREE.BufferGeometry {
  return buildTaperedCurveGeometry(
    [
      new THREE.Vector3(-0.095, 0.022, 0),
      new THREE.Vector3(-0.045, 0.003, 0),
      new THREE.Vector3(0, -0.005, 0),
      new THREE.Vector3(0.045, 0.003, 0),
      new THREE.Vector3(0.095, 0.022, 0),
    ],
    16,
    8,
    (t) => 0.011 + 0.006 * Math.sin(t * Math.PI)
  );
}

/**
 * Curved Queen Arcane Glaive / Halberd Blade
 */
export function buildGlaiveBladeGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.012, 0);
  shape.lineTo(0.014, 0);
  shape.bezierCurveTo(0.055, 0.08, 0.065, 0.22, 0.018, 0.34);
  shape.lineTo(0, 0.41);
  shape.bezierCurveTo(-0.022, 0.24, -0.02, 0.09, -0.012, 0);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.008,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.004);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sculpted Shield Face Insert (sits neatly inside metallic shield bezel for two-tone heraldic detail)
 */
export function buildShieldFaceInsertGeometry(tower: boolean): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  if (tower) {
    shape.moveTo(-0.155, 0.31);
    shape.lineTo(0.155, 0.31);
    shape.lineTo(0.155, -0.22);
    shape.lineTo(0.08, -0.31);
    shape.lineTo(-0.08, -0.31);
    shape.lineTo(-0.155, -0.22);
  } else {
    shape.moveTo(-0.125, 0.18);
    shape.lineTo(0.125, 0.18);
    shape.lineTo(0.115, -0.02);
    shape.quadraticCurveTo(0.075, -0.15, 0, -0.21);
    shape.quadraticCurveTo(-0.075, -0.15, -0.115, -0.02);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.012,
    bevelEnabled: false,
  });
  geo.center();
  // Normalize UVs cleanly into [0,1] so heraldic crest sits dead center!
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const w = bb.max.x - bb.min.x || 1;
  const h = bb.max.y - bb.min.y || 1;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - bb.min.x) / w, (pos.getY(i) - bb.min.y) / h);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sculpted Fantasy Warhorse / Centaur Lower Body with muscular chest, ribcage, shoulder swell, croup, and raised front waist collar
 */
export function buildSculptedHorseBodyGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.24, 34, 24);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const nz = z / 0.24;
    const ny = y / 0.24;
    z *= 1.94;
    x *= 0.79;
    y *= 0.9;

    const chest = smoothstep(0.15, 0.92, nz) * 0.072;
    const croup = smoothstep(-0.2, -0.88, nz) * 0.058;
    const saddleDip = gaussian2D(nz, ny, -0.08, 0.72, 0.34, 0.42) * 0.032;
    const withers = gaussian2D(nz, ny, 0.48, 0.82, 0.24, 0.34) * 0.052;
    // Muscular chest crease & shoulder flare
    const pectoralSplit = nz > 0.68 && ny < 0.2 ? Math.exp(-(x * x) / 0.0012) * -0.015 : 0;

    y += chest * 0.45 + croup * 0.44 - saddleDip + withers;
    x *= 1 + chest * 0.86 + croup * 0.82;
    z += pectoralSplit;

    pos.setXYZ(i, x, y, z);
  }

  return finalizeGeometry(geo);
}

/**
 * Jointed Anatomical Equine Front Leg (muscular shoulder-forearm -> knee -> slender cannon -> fetlock -> pastern)
 */
export function buildEquineFrontLegGeometry(): THREE.BufferGeometry {
  return buildTaperedCurveGeometry(
    [
      new THREE.Vector3(0, 0.02, 0.02),
      new THREE.Vector3(0, -0.14, 0.015),
      new THREE.Vector3(0, -0.23, 0.028), // Knee
      new THREE.Vector3(0, -0.37, 0.012), // Fetlock
      new THREE.Vector3(0, -0.43, 0.024), // Pastern to hoof
    ],
    16,
    14,
    (t) => {
      if (t < 0.38) return THREE.MathUtils.lerp(0.068, 0.038, t / 0.38);
      if (t < 0.52) return THREE.MathUtils.lerp(0.038, 0.033, (t - 0.38) / 0.14);
      if (t < 0.85) return THREE.MathUtils.lerp(0.033, 0.025, (t - 0.52) / 0.33);
      return THREE.MathUtils.lerp(0.025, 0.032, (t - 0.85) / 0.15);
    }
  );
}

/**
 * Jointed Anatomical Equine Hind Leg (muscular thigh/stifle -> angled backward hock -> cannon -> fetlock -> pastern)
 */
export function buildEquineHindLegGeometry(): THREE.BufferGeometry {
  return buildTaperedCurveGeometry(
    [
      new THREE.Vector3(0, 0.04, 0.01),
      new THREE.Vector3(0, -0.11, 0.045), // Stifle forward
      new THREE.Vector3(0, -0.25, -0.055), // Angled hock back
      new THREE.Vector3(0, -0.37, -0.025), // Cannon / fetlock
      new THREE.Vector3(0, -0.43, -0.005), // Pastern to hoof
    ],
    18,
    14,
    (t) => {
      if (t < 0.32) return THREE.MathUtils.lerp(0.086, 0.056, t / 0.32);
      if (t < 0.55) return THREE.MathUtils.lerp(0.056, 0.036, (t - 0.32) / 0.23);
      if (t < 0.86) return THREE.MathUtils.lerp(0.036, 0.025, (t - 0.55) / 0.31);
      return THREE.MathUtils.lerp(0.025, 0.032, (t - 0.86) / 0.14);
    }
  );
}

/**
 * Sculpted S-Curved Arched Equine Neck (replaces tilted straight cylinder)
 */
export function buildSculptedHorseNeckGeometry(): THREE.BufferGeometry {
  return buildTaperedCurveGeometry(
    [
      new THREE.Vector3(0, -0.02, -0.06),
      new THREE.Vector3(0, 0.14, 0.06),
      new THREE.Vector3(0, 0.28, 0.14),
      new THREE.Vector3(0, 0.35, 0.21),
    ],
    18,
    16,
    (t) => THREE.MathUtils.lerp(0.128, 0.072, smoothstep(0, 1, t))
  );
}

/**
 * Sculpted Equine Head with brow, cheekbones, nasal dish, flared nostrils & lower jaw
 */
export function buildSculptedHorseHeadGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.11, 28, 20);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const nz = z / 0.11;
    z *= 2.18;
    const taper = smoothstep(-0.32, 1.0, nz);
    x *= THREE.MathUtils.lerp(0.84, 0.46, taper);
    y *= THREE.MathUtils.lerp(0.96, 0.54, taper);

    const cheek = gaussian2D(Math.abs(x) / 0.1, nz, 0.5, -0.35, 0.34, 0.34);
    x += Math.sign(x) * cheek * 0.02;
    y -= cheek * 0.016;

    // Eye socket hollow
    const eyeHollow = gaussian2D(Math.abs(x) / 0.1, nz, 0.65, 0.12, 0.22, 0.2);
    x -= Math.sign(x) * eyeHollow * 0.008;

    // Flared nostrils at muzzle
    if (nz > 0.68 && Math.abs(x) > 0.015 && y > -0.02) {
      x += Math.sign(x) * 0.012;
    }

    pos.setXYZ(i, x, y, z);
  }

  return finalizeGeometry(geo);
}

/**
 * Flowing Sculpted Horse Mane Crest & Tail Lock
 */
export function buildHorseManeGeometry(): THREE.BufferGeometry {
  return buildTaperedCurveGeometry(
    [
      new THREE.Vector3(0, 0.36, 0.17),
      new THREE.Vector3(0, 0.28, 0.07),
      new THREE.Vector3(0, 0.15, -0.02),
      new THREE.Vector3(0, 0.02, -0.09),
    ],
    16,
    10,
    (t) => 0.032 * Math.sin(t * Math.PI * 0.85 + 0.25)
  );
}

export function buildHorseTailGeometry(): THREE.BufferGeometry {
  return buildTaperedCurveGeometry(
    [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -0.08, -0.1),
      new THREE.Vector3(0, -0.23, -0.14),
      new THREE.Vector3(0, -0.36, -0.09),
    ],
    16,
    10,
    (t) => 0.048 * Math.sin(t * Math.PI * 0.88 + 0.2)
  );
}

/**
 * Draped Cloth Caparison Blanket for the Warhorse
 */
export function buildHorseCaparisonGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.245, 0.28, 0.44, 22, 8, true, Math.PI * 0.12, Math.PI * 1.76);
  geo.rotateZ(Math.PI / 2);
  geo.rotateY(Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const drape = y < 0 ? Math.sin(z * 16) * 0.012 : 0;
    pos.setXYZ(i, x * 0.92 + drape, y * 0.88 - 0.04, z * 1.15);
  }
  return finalizeGeometry(geo);
}

/**
 * Curved Royal Crown with sculpted arches and fleur-de-lis/spiked points
 */
export function buildOrnateCrownGeometry(spiky: boolean): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.112, 0),
    new THREE.Vector2(0.118, 0.022),
    new THREE.Vector2(0.112, 0.046),
    new THREE.Vector2(0.128, 0.082),
    new THREE.Vector2(0.124, 0.092),
    new THREE.Vector2(0.106, 0.07),
    new THREE.Vector2(0.105, 0.0),
  ];
  const geo = new THREE.LatheGeometry(pts, spiky ? 20 : 28);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y > 0.05) {
      const ang = Math.atan2(z, x);
      const peaks = spiky ? 8 : 6;
      const wave = Math.pow((Math.cos(ang * peaks) + 1) * 0.5, spiky ? 2.2 : 1.4);
      pos.setY(i, y + wave * (spiky ? 0.058 : 0.044));
    }
  }
  return finalizeGeometry(geo);
}

/**
 * Sculpted Hair Cap with flowing crown volume & natural strand contour
 */
export function buildSculptedHairCapGeometry(longBack: boolean): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.127, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.68);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const ang = Math.atan2(x, z);
    if (z > 0.04 && y < 0.05) {
      y += 0.045 * smoothstep(0.04, 0.11, z);
    }
    if (z < 0.0 && y < 0.03) {
      const drop = longBack ? 0.18 : 0.065;
      y -= drop * smoothstep(0.0, -0.1, z);
      z -= (longBack ? 0.038 : 0.012) * smoothstep(0.0, -0.1, z);
    }
    const wave = Math.sin(ang * 16) * 0.005;
    x += Math.sin(ang) * wave;
    z += Math.cos(ang) * wave;

    pos.setXYZ(i, x, y * 1.14, z);
  }
  return finalizeGeometry(geo);
}

/**
 * Sculpted Individual Hair Lock / Clump for multi-layered natural hairline & locks
 */
export function buildHairClumpGeometry(): THREE.BufferGeometry {
  return buildTaperedCurveGeometry(
    [
      new THREE.Vector3(0, 0.04, 0.0),
      new THREE.Vector3(0.01, 0.0, 0.016),
      new THREE.Vector3(0.014, -0.055, 0.012),
      new THREE.Vector3(0.008, -0.1, -0.004),
    ],
    12,
    8,
    (t) => 0.022 * Math.sin(t * Math.PI * 0.82 + 0.32)
  );
}

/**
 * Flowing S-Curved Side Hair Tress (replaces plain ConeGeometry locks)
 */
export function buildFlowingHairLockGeometry(): THREE.BufferGeometry {
  return buildTaperedCurveGeometry(
    [
      new THREE.Vector3(0, 0.06, -0.02),
      new THREE.Vector3(0.016, -0.02, 0.01),
      new THREE.Vector3(0.008, -0.1, -0.015),
      new THREE.Vector3(0.018, -0.17, 0.015),
    ],
    14,
    8,
    (t) => 0.026 * (1 - t * 0.72)
  );
}

/**
 * Sculpted Full Royal Beard wrapping lower jaw with layered locks
 */
export function buildBeardGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(
    0.123,
    24,
    18,
    -Math.PI * 0.42,
    Math.PI * 0.84,
    Math.PI * 0.46,
    Math.PI * 0.46
  );
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    const z = pos.getZ(i);
    const lower = smoothstep(-0.02, -0.11, y);
    y -= lower * 0.078;
    const strand = Math.sin(x * 110) * 0.0045;
    x *= 1 - lower * 0.28;
    pos.setXYZ(i, x, y, z + lower * 0.022 + strand);
  }
  geo.rotateY(Math.PI / 2);
  return finalizeGeometry(geo);
}

/**
 * Curved Handlebar Moustache Wing (replaces ConeGeometry moustache)
 */
export function buildMoustacheWingGeometry(): THREE.BufferGeometry {
  return buildTaperedCurveGeometry(
    [
      new THREE.Vector3(0, 0, 0.004),
      new THREE.Vector3(0.016, -0.003, 0.002),
      new THREE.Vector3(0.032, -0.012, -0.008),
      new THREE.Vector3(0.044, -0.02, -0.018),
    ],
    10,
    8,
    (t) => 0.011 * (1 - t * 0.75)
  );
}

/**
 * Domed Round Crusader / Viking Shield Body + Rim
 */
export function buildRoundShieldGeometry(radius = 0.2, thickness = 0.024): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(radius, radius * 0.98, thickness, 28, 2);
  geo.rotateX(Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const rNorm = Math.min(1, Math.hypot(x, y) / radius);
    // Subtle convex dome toward +Z
    const dome = (1 - rNorm * rNorm) * 0.032;
    pos.setZ(i, z + dome);
  }
  return finalizeGeometry(geo);
}

/**
 * Circular Heraldic Shield Face Insert with centered planar UVs
 */
export function buildRoundShieldFaceGeometry(radius = 0.178): THREE.BufferGeometry {
  const geo = new THREE.CircleGeometry(radius, 28);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const rNorm = Math.min(1, Math.hypot(x, y) / radius);
    const dome = (1 - rNorm * rNorm) * 0.032;
    pos.setZ(i, dome + 0.014);
    uv.setXY(i, 0.5 + (x / (radius * 2)), 0.5 + (y / (radius * 2)));
  }
  return finalizeGeometry(geo);
}

/**
 * Tall Ornate Bishop Mitre Headdress (sculpted pointed crest & brow band)
 */
export function buildBishopMitreGeometry(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.118, 0.0),
    new THREE.Vector2(0.125, 0.035),
    new THREE.Vector2(0.132, 0.095),
    new THREE.Vector2(0.114, 0.175),
    new THREE.Vector2(0.068, 0.245),
    new THREE.Vector2(0.022, 0.285),
    new THREE.Vector2(0.0, 0.295),
  ];
  const geo = new THREE.LatheGeometry(pts, 24);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const ny = y / 0.295;
    // Compress slightly side-to-side above brow so it forms a classic bishop mitre peak
    if (ny > 0.25) {
      const t = smoothstep(0.25, 1.0, ny);
      x *= THREE.MathUtils.lerp(1.0, 0.72, t);
      z *= THREE.MathUtils.lerp(1.0, 1.18, t);
      // Slight central dip between front & back peaks
      const dip = Math.exp(-(z * z) / 0.0025) * t * 0.042;
      y -= dip;
    }
    pos.setXYZ(i, x, y, z);
  }
  return finalizeGeometry(geo);
}

/**
 * Floor-length Flowing Pleated Royal Queen Gown (waist to marble floor y=0)
 */
export function buildQueenGownGeometry(): THREE.BufferGeometry {
  const segR = 32;
  const segH = 22;
  const height = 0.54;
  const geo = new THREE.CylinderGeometry(0.128, 0.34, height, segR, segH, true);
  geo.translate(0, height / 2, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);
    const v = 1 - y / height; // 0 at waist, 1 at floor hem
    const ang = Math.atan2(x, z);
    const pleat = Math.sin(ang * 9) * 0.018 * v;
    const train = z < 0 ? Math.pow(v, 1.4) * 0.14 * Math.max(0, -Math.cos(ang)) : 0;
    x *= 1 + pleat;
    z = z * (1 + pleat) - train;
    pos.setXYZ(i, x, y, z);
  }
  return finalizeGeometry(geo);
}

/**
 * Broad-Shouldered Heavy Siege-Guardian Torso (Rook silhouette matching photo corner warriors)
 */
export function buildHeavySiegeTorsoGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.195, 0.158, 0.46, 28, 18, false);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);

    const ny = (y + 0.23) / 0.46;
    const ang = Math.atan2(z, x);
    const swell = 0.88 + 0.36 * smoothstep(0.05, 0.68, ny) - 0.1 * smoothstep(0.75, 1.0, ny);
    x *= swell * 1.24;
    z *= swell * 1.02;

    if (z > 0) {
      const chest = gaussian2D(Math.abs(Math.cos(ang)), ny, 0.45, 0.65, 0.36, 0.22);
      const belly = gaussian2D(Math.cos(ang), ny, 0, 0.28, 0.55, 0.25);
      z += chest * 0.042 + belly * 0.028;
    } else {
      const trapezius = gaussian2D(Math.abs(Math.cos(ang)), ny, 0.4, 0.74, 0.38, 0.24);
      z -= trapezius * 0.032;
    }
    pos.setXYZ(i, x, y, z);
  }
  return finalizeGeometry(geo);
}

/**
 * Pointed Assassin / Crusader Cowl Hood with soft draped cloth folds & pointed brow beak
 */
export function buildAssassinHoodGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.138, 28, 22, Math.PI * 0.14, Math.PI * 1.72, 0.06, Math.PI * 0.78);
  geo.rotateY(Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Iconic forward assassin hood beak pointing gently over brow
    if (z > 0.04 && y > 0.02) {
      const peak = smoothstep(0.04, 0.135, z) * smoothstep(0.02, 0.13, y);
      z += peak * 0.058;
      y -= peak * 0.018;
      x *= 1 - peak * 0.4;
    }
    // Natural draped cloth folds down back of neck
    if (z < -0.03) {
      const back = smoothstep(-0.03, -0.135, z);
      z -= back * 0.045;
      if (y < -0.02) {
        y -= back * 0.055;
        x *= 1 + back * 0.12;
      }
    }
    const crease = Math.sin(Math.atan2(x, z) * 10) * 0.004;
    pos.setXYZ(i, x + crease, y * 1.16, z);
  }
  return finalizeGeometry(geo);
}

/**
 * Draped Cloth Shoulder Capelet / Mantle connecting Pawn's hood seamlessly over shoulders & chest
 */
export function buildShoulderMantleGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.095, 0.215, 0.17, 26, 8, true);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const v = 0.5 - y / 0.17; // 0 neck -> 1 shoulders
    x *= 1.15;
    z *= 0.86;
    // Gentle point down front chest & upper back
    const chestDip = (z > 0 ? 1 : 0.7) * Math.exp(-(x * x) / 0.018) * v * 0.045;
    const pleat = Math.sin(Math.atan2(x, z) * 12) * 0.005 * v;
    pos.setXYZ(i, x * (1 + pleat), y - chestDip, z * (1 + pleat));
  }
  return finalizeGeometry(geo);
}

/**
 * Diagonal Leather Bandolier / Baldric Strap across chest
 */
export function buildBandolierStrapGeometry(): THREE.BufferGeometry {
  const geo = new THREE.TorusGeometry(0.195, 0.016, 8, 28);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    pos.setXYZ(i, x * 0.88, y * 1.18, z * 0.72);
  }
  return finalizeGeometry(geo);
}

/**
 * Lower-Face Crimson Cloth Mask / Scarf hugging nose bridge, cheekbones & chin
 */
export function buildFaceMaskGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.112, 0.092, 0.128, 24, 8, true, -Math.PI * 0.44, Math.PI * 0.88);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);
    const noseBridge = Math.exp(-(x * x) / 0.0014) * smoothstep(-0.02, 0.06, y);
    const fold = Math.sin(y * 85) * 0.003;
    z += noseBridge * 0.028 + fold;
    x *= 0.91;
    pos.setXYZ(i, x, y, z);
  }
  return finalizeGeometry(geo);
}

/**
 * Tailored Split-Front Assassin/Scout Coat Skirt (open inverted-V at front so legs & boots read cleanly)
 */
export function buildSplitFrontCoatGeometry(): THREE.BufferGeometry {
  const height = 0.48;
  const geo = new THREE.CylinderGeometry(0.138, 0.228, height, 30, 14, true, 0.26, Math.PI * 2 - 0.52);
  geo.translate(0, -height / 2, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);
    const v = -y / height; // 0 waist -> 1 hem
    if (z > 0.05 && Math.abs(x) < 0.15) {
      x += Math.sign(x || 1) * v * 0.062;
    }
    const pleat = Math.sin(Math.atan2(x, z) * 9) * 0.01 * v;
    pos.setXYZ(i, x * (1 + pleat), y, z * (1 + pleat));
  }
  return finalizeGeometry(geo);
}

/**
 * Sculpted Female Hourglass Corset Bodice for the Queen
 */
export function buildFemaleCorsetGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.135, 0.102, 0.42, 28, 18, false);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);
    const ny = (y + 0.21) / 0.42; // 0 waist -> 1 shoulders
    const ang = Math.atan2(z, x);

    // Narrow sculpted waist at ny ~ 0.18, graceful bust curve at ny ~ 0.65, delicate shoulders
    const hourglass = 0.78 + 0.34 * smoothstep(0.12, 0.68, ny) - 0.12 * smoothstep(0.75, 1.0, ny);
    x *= hourglass * 1.08;
    z *= hourglass * 0.84;

    if (z > 0) {
      const bust = gaussian2D(Math.abs(Math.cos(ang)), ny, 0.44, 0.65, 0.3, 0.16);
      z += bust * 0.044;
    } else {
      const spine = Math.exp(-(x * x) / 0.0012) * 0.008;
      z += spine;
    }
    pos.setXYZ(i, x, y, z);
  }
  return finalizeGeometry(geo);
}

/**
 * Dramatic Winged V-Pointed Standing Royal Collar framing the Queen's neck & jaw
 */
export function buildHighRoyalCollarGeometry(): THREE.BufferGeometry {
  const height = 0.24;
  const geo = new THREE.CylinderGeometry(0.195, 0.098, height, 28, 10, true, Math.PI * 0.32, Math.PI * 1.36);
  geo.translate(0, height / 2, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const v = y / height;
    const ang = Math.atan2(x, -z); // 0 directly behind head, +-PI/2 at sides
    // Two tall dramatic winged peaks curving beside cheeks
    const wingPeak = Math.exp(-Math.pow((Math.abs(ang) - 0.95) / 0.52, 2));
    const scaleH = 0.72 + wingPeak * 0.45;
    y *= scaleH;
    z -= v * 0.045;
    x *= 1 + wingPeak * v * 0.14;
    pos.setXYZ(i, x, y, z);
  }
  return finalizeGeometry(geo);
}

/**
 * Contoured Floor-Length Queen Gown with Actual Open Front V-Slit & Flowing Damask Train
 */
export function buildQueenSlitGownGeometry(): THREE.BufferGeometry {
  const height = 0.64;
  // Open front slit centered at +Z (theta=0)
  const geo = new THREE.CylinderGeometry(0.108, 0.275, height, 32, 18, true, 0.22, Math.PI * 2 - 0.44);
  geo.translate(0, height / 2, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);
    const v = 1 - y / height; // 0 waist -> 1 floor
    const ang = Math.atan2(x, z);
    const hipCurve = Math.sin(v * Math.PI * 0.65) * 0.045;
    const pleat = Math.sin(ang * 11) * 0.016 * v;
    const train = z < 0 ? Math.pow(v, 1.3) * 0.21 * Math.max(0, -Math.cos(ang)) : 0;
    if (z > 0.05 && Math.abs(x) < 0.14) {
      x += Math.sign(x || 1) * v * 0.055; // Part front slit gracefully
    }
    x *= 1 + hipCurve + pleat;
    z = z * (1 + hipCurve + pleat) - train;
    pos.setXYZ(i, x, y, z);
  }
  return finalizeGeometry(geo);
}

/**
 * Royal Crimson Fleur-de-lis Front Tabard Banner for the King
 */
export function buildRoyalFleurTabardGeometry(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(0.21, 0.56, 8, 14);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const v = 0.5 - y / 0.56; // 0 top -> 1 bottom
    const wrapZ = -(x * x) * 1.3 + Math.sin(v * Math.PI) * 0.018;
    const taper = 0.78 + v * 0.28;
    pos.setXYZ(i, x * taper, y, wrapZ);
  }
  return finalizeGeometry(geo);
}

/**
 * Pushed-back draped scout cowl resting on back of neck & collar (leaves young soldier's hair & face completely open)
 */
export function buildPushedBackCowlGeometry(): THREE.BufferGeometry {
  const geo = new THREE.TorusGeometry(0.108, 0.032, 10, 22, Math.PI * 1.45);
  geo.rotateX(Math.PI * 0.56);
  geo.rotateZ(-Math.PI * 0.725);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const backDrop = z < 0 ? Math.abs(z) * 0.35 : 0;
    pos.setXYZ(i, x * 1.12, y - backDrop, z * 1.05 - 0.02);
  }
  return finalizeGeometry(geo);
}

/**
 * Ornate Golden Sovereign Open Crown-Helm with sculpted brow band & spiked crown crest
 * (wide-open front cutout leaving eyes, nose, cheeks, lips & royal beard 100% clear)
 */
export function buildKingCrownHelmGeometry(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.118, 0.075),
    new THREE.Vector2(0.132, 0.115),
    new THREE.Vector2(0.134, 0.17),
    new THREE.Vector2(0.126, 0.22),
    new THREE.Vector2(0.142, 0.265),
    new THREE.Vector2(0.088, 0.272),
    new THREE.Vector2(0.0, 0.282),
  ];
  const geo = new THREE.LatheGeometry(pts, 32, Math.PI * 0.28, Math.PI * 1.44);
  geo.rotateY(Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);
    if (y > 0.215) {
      const ang = Math.atan2(z, x);
      const spikes = Math.pow((Math.cos(ang * 8) + 1) * 0.5, 2.0);
      pos.setY(i, y + spikes * 0.054);
    } else {
      pos.setXYZ(i, x, y, z);
    }
  }
  return finalizeGeometry(geo);
}

/**
 * Sculpted Golden Corinthian / Spartan War Helm with open front brow cutout, cheek-wings & central crest for Centaur Knight
 */
export function buildSpartanHornedHelmGeometry(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.12, 0.04),
    new THREE.Vector2(0.132, 0.095),
    new THREE.Vector2(0.136, 0.172),
    new THREE.Vector2(0.108, 0.236),
    new THREE.Vector2(0.0, 0.254),
  ];
  const geo = new THREE.LatheGeometry(pts, 28, Math.PI * 0.28, Math.PI * 1.44);
  geo.rotateY(Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    // Central raised dorsal helm crest
    if (y > 0.14) {
      const ridge = Math.exp(-(x * x) / 0.00055) * smoothstep(0.14, 0.24, y);
      y += ridge * 0.026;
      z += ridge * 0.012;
    }
    pos.setXYZ(i, x, y, z);
  }
  return finalizeGeometry(geo);
}

/**
 * Bare Sculpted Muscular Human Upper Torso (pectorals, sternum, ribcage & 6-pack abs for Centaur Knight)
 */
export function buildBareMuscularTorsoGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.168, 0.122, 0.45, 28, 20, false);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);

    const ny = (y + 0.225) / 0.45;
    const angle = Math.atan2(z, x);
    const vTaper = 0.78 + 0.4 * smoothstep(0.05, 0.78, ny) - 0.1 * smoothstep(0.82, 1.0, ny);
    x *= vTaper * 1.18;
    z *= vTaper * 0.86;

    if (z > 0) {
      const pec = gaussian2D(Math.abs(Math.cos(angle)), ny, 0.46, 0.7, 0.3, 0.17);
      const ab1 = gaussian2D(Math.abs(Math.cos(angle)), ny, 0.22, 0.42, 0.16, 0.08);
      const ab2 = gaussian2D(Math.abs(Math.cos(angle)), ny, 0.2, 0.26, 0.15, 0.08);
      z += pec * 0.038 + (ab1 + ab2) * 0.018;
    } else {
      const lats = gaussian2D(Math.abs(Math.cos(angle)), ny, 0.45, 0.68, 0.34, 0.24);
      z -= lats * 0.026;
    }
    pos.setXYZ(i, x, y, z);
  }
  return finalizeGeometry(geo);
}

/**
 * Ornate Pointed Spear / Halberd Crystal Tip for the Bishop's Polearm
 */
export function buildSpearHalberdHeadGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.015, 0);
  shape.lineTo(0.015, 0);
  shape.lineTo(0.055, 0.11);
  shape.lineTo(0.018, 0.24);
  shape.lineTo(0, 0.36);
  shape.lineTo(-0.018, 0.24);
  shape.lineTo(-0.055, 0.11);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.005,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.006);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sleek Single-Edged Curved Scout / Assassin Blade (used for Dual-Wield Titan & Shadow Queens/Knights)
 */
export function buildDualScoutBladeGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.011, 0);
  shape.lineTo(0.014, 0);
  shape.lineTo(0.016, 0.36);
  shape.bezierCurveTo(0.014, 0.48, 0.004, 0.56, -0.012, 0.6);
  shape.lineTo(-0.014, 0.34);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.007,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.0035);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Jagged / Runed Fantasy Greatsword Blade (Inferno & Shadow Kings)
 */
export function buildFlameSwordBladeGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.028, 0);
  shape.lineTo(0.028, 0);
  shape.lineTo(0.036, 0.16);
  shape.lineTo(0.022, 0.25);
  shape.lineTo(0.032, 0.42);
  shape.lineTo(0.018, 0.54);
  shape.lineTo(0, 0.69);
  shape.lineTo(-0.018, 0.54);
  shape.lineTo(-0.032, 0.42);
  shape.lineTo(-0.022, 0.25);
  shape.lineTo(-0.036, 0.16);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.01,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.005);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Tailored Military Trench / Field Coat Torso (Titan Vanguard)
 */
export function buildMilitaryJacketGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.164, 0.132, 0.45, 24, 14, false);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const ny = (y + 0.225) / 0.45;
    const taper = 0.85 + 0.3 * smoothstep(0.08, 0.78, ny) - 0.06 * smoothstep(0.84, 1.0, ny);
    x *= taper * 1.15;
    z *= taper * 0.86;
    // Standing collar ridge at top back & sides
    if (ny > 0.88 && z < 0.06) {
      y += 0.035;
      x *= 1.05;
    }
    // Subtle lapel opening at front top
    if (z > 0.05 && ny > 0.6) {
      const lapel = gaussian2D(Math.abs(x) / 0.14, ny, 0.42, 0.78, 0.22, 0.16);
      z += lapel * 0.018;
    }
    pos.setXYZ(i, x, y, z);
  }
  return finalizeGeometry(geo);
}

/**
 * Original Compact Maneuvering Harness Pack (Titan Aerial Vanguard Knight)
 */
export function buildManeuverHarnessPackGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(0.18, 0.16, 0.09, 4, 4, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    // Chamfer corners slightly for sleek mechanical pack silhouette
    const edge = Math.abs(x) / 0.09;
    z *= 1 - edge * 0.25;
    if (y < -0.02) x *= 0.86;
    pos.setXYZ(i, x, y, z);
  }
  return finalizeGeometry(geo);
}

/**
 * Heavy Twin-Faced Siege Warhammer Head (Inferno & Celestial Rooks)
 */
export function buildWarhammerHeadGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.068, 0.075, 0.26, 12, 4);
  geo.rotateZ(Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const ax = Math.abs(x);
    if (ax > 0.06) {
      const flare = (ax - 0.06) / 0.07;
      y *= 1 + flare * 0.28;
      z *= 1 + flare * 0.18;
    }
    pos.setXYZ(i, x, y, z);
  }
  return finalizeGeometry(geo);
}

/**
 * Swept Curved Horn (Inferno & Shadow Helm / Pauldron Crests)
 */
export function buildHornedHelmCrestGeometry(): THREE.BufferGeometry {
  return buildTaperedCurveGeometry(
    [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.045, 0.032, 0.015),
      new THREE.Vector3(0.088, 0.088, 0.028),
      new THREE.Vector3(0.098, 0.148, 0.01),
    ],
    12,
    8,
    (t) => 0.024 * (1 - t * 0.82)
  );
}

/**
 * Radiant Celestial Halo / Winged Sun-Crest Arch
 */
export function buildCelestialHaloGeometry(): THREE.BufferGeometry {
  const geo = new THREE.TorusGeometry(0.185, 0.012, 8, 28, Math.PI * 1.38);
  geo.rotateZ(-Math.PI * 0.19);
  return finalizeGeometry(geo);
}
