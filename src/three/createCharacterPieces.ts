import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CharacterSetId, PieceColor, PieceType } from '../types/chess';
import { getKingdomPalette, type KingdomMaterials, type SceneMaterialBank } from './materials';
import {
  buildAnatomicalArmGeometry,
  buildAnatomicalShinGeometry,
  buildAnatomicalThighGeometry,
  buildArmorCopGeometry,
  buildBandolierStrapGeometry,
  buildBareMuscularTorsoGeometry,
  buildBeardGeometry,
  buildBishopMitreGeometry,
  buildBootGeometry,
  buildCelestialHaloGeometry,
  buildChestCrestGeometry,
  buildContouredLimbGeometry,
  buildCrossguardGeometry,
  buildCurvedStripGeometry,
  buildDrapedCapeGeometry,
  buildDualScoutBladeGeometry,
  buildEarGeometry,
  buildEquineFrontLegGeometry,
  buildEquineHindLegGeometry,
  buildFemaleCorsetGeometry,
  buildFlameSwordBladeGeometry,
  buildFlowingHairLockGeometry,
  buildFlutedSwordBladeGeometry,
  buildFurMantleGeometry,
  buildGauntletPalmGeometry,
  buildGlaiveBladeGeometry,
  buildGorgetGeometry,
  buildHairClumpGeometry,
  buildHeavySiegeTorsoGeometry,
  buildHighRoyalCollarGeometry,
  buildHornedHelmCrestGeometry,
  buildHorseCaparisonGeometry,
  buildHorseManeGeometry,
  buildHorseTailGeometry,
  buildIrisDomeGeometry,
  buildKingCrownHelmGeometry,
  buildManeuverHarnessPackGeometry,
  buildMilitaryJacketGeometry,
  buildMoustacheWingGeometry,
  buildOrnateCrownGeometry,
  buildPauldronGeometry,
  buildPushedBackCowlGeometry,
  buildQueenGownGeometry,
  buildQueenSlitGownGeometry,
  buildRoundShieldFaceGeometry,
  buildRoundShieldGeometry,
  buildRoyalFleurTabardGeometry,
  buildSculptedCuirassGeometry,
  buildSculptedHairCapGeometry,
  buildSculptedHeadGeometry,
  buildSculptedHorseBodyGeometry,
  buildSculptedHorseHeadGeometry,
  buildSculptedHorseNeckGeometry,
  buildSculptedLipsGeometry,
  buildShieldFaceInsertGeometry,
  buildShoulderMantleGeometry,
  buildSpartanHornedHelmGeometry,
  buildSpearHalberdHeadGeometry,
  buildSplitFrontCoatGeometry,
  buildWarhammerHeadGeometry,
  type FaceVariant,
} from './sculptHumanGeometry';

const _footBox = new THREE.Box3();
const _tmpFootBox = new THREE.Box3();

export interface CharacterRig {
  root: THREE.Group;
  body: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  rightArm: THREE.Group;
  leftArm: THREE.Group;
  legs: THREE.Group[];
  cape?: THREE.Mesh;
  crystal?: THREE.Mesh;
  horse?: {
    group: THREE.Group;
    neck: THREE.Group;
    legs: THREE.Group[];
    tail: THREE.Group;
  };
  contactShadow: THREE.Mesh;
  hitProxy: THREE.Mesh;
  disposableGeos: THREE.BufferGeometry[];
  baseY: number;
  torsoBaseY: number;
  phaseOffset: number;
  type: PieceType;
  color: PieceColor;
  characterSet: CharacterSetId;
}

export interface CharacterGeometryBank {
  contactShadow: THREE.PlaneGeometry;
  hitCylinder: THREE.CylinderGeometry;

  // Sculpted Human Face & Head Parts
  headKing: THREE.BufferGeometry;
  headQueen: THREE.BufferGeometry;
  headWarrior: THREE.BufferGeometry;
  headMage: THREE.BufferGeometry;
  headYoung: THREE.BufferGeometry;
  ear: THREE.BufferGeometry;
  eyeball: THREE.SphereGeometry;
  irisDome: THREE.BufferGeometry;
  eyelidUpper: THREE.BufferGeometry;
  eyelidLower: THREE.BufferGeometry;
  lashLine: THREE.BufferGeometry;
  eyebrow: THREE.BufferGeometry;
  lipUpper: THREE.BufferGeometry;
  lipLower: THREE.BufferGeometry;
  hairShort: THREE.BufferGeometry;
  hairLong: THREE.BufferGeometry;
  hairLock: THREE.BufferGeometry;
  hairClump: THREE.BufferGeometry;
  beardFull: THREE.BufferGeometry;
  moustacheWing: THREE.BufferGeometry;

  // Sculpted Anatomy & Multi-Layer Armor
  neck: THREE.CylinderGeometry;
  gorget: THREE.BufferGeometry;
  cuirass: THREE.BufferGeometry;
  heavyCuirass: THREE.BufferGeometry;
  femaleCorset: THREE.BufferGeometry;
  bareTorso: THREE.BufferGeometry;
  chestCrest: THREE.BufferGeometry;
  waistBelt: THREE.CylinderGeometry;
  beltBuckle: THREE.ExtrudeGeometry;
  tassetPlate: THREE.ExtrudeGeometry;
  mailSkirt: THREE.CylinderGeometry;
  splitFrontCoat: THREE.BufferGeometry;
  shoulderMantle: THREE.BufferGeometry;
  bandolierStrap: THREE.BufferGeometry;
  royalFleurTabard: THREE.BufferGeometry;
  highRoyalCollar: THREE.BufferGeometry;
  pauldron: THREE.BufferGeometry;
  upperArm: THREE.BufferGeometry;
  forearm: THREE.BufferGeometry;
  elbowCop: THREE.BufferGeometry;
  palm: THREE.BufferGeometry;
  fingerSeg: THREE.CapsuleGeometry;
  thigh: THREE.BufferGeometry;
  shin: THREE.BufferGeometry;
  kneeCop: THREE.BufferGeometry;
  boot: THREE.BufferGeometry;
  capeDraped: THREE.BufferGeometry;
  furMantle: THREE.BufferGeometry;

  // Headgear & Weapons
  crownRoyal: THREE.BufferGeometry;
  crownDark: THREE.BufferGeometry;
  kingCrownHelm: THREE.BufferGeometry;
  spartanHelm: THREE.BufferGeometry;
  pushedBackCowl: THREE.BufferGeometry;
  crownVelvetCap: THREE.SphereGeometry;
  queenDiadem: THREE.TorusGeometry;
  rookHelm: THREE.LatheGeometry;
  bishopMitre: THREE.BufferGeometry;
  knightHelm: THREE.LatheGeometry;
  knightPlume: THREE.TubeGeometry;
  pawnHelm: THREE.LatheGeometry;
  mageHood: THREE.LatheGeometry;
  hornedCrest: THREE.BufferGeometry;
  celestialHalo: THREE.BufferGeometry;
  militaryJacket: THREE.BufferGeometry;
  maneuverPack: THREE.BufferGeometry;

  swordBlade: THREE.BufferGeometry;
  dualScoutBlade: THREE.BufferGeometry;
  flameSwordBlade: THREE.BufferGeometry;
  warhammerHead: THREE.BufferGeometry;
  swordGuard: THREE.BufferGeometry;
  swordGrip: THREE.CylinderGeometry;
  glaiveBlade: THREE.BufferGeometry;
  spearHalberdHead: THREE.BufferGeometry;
  shieldHeater: THREE.ExtrudeGeometry;
  shieldHeaterFace: THREE.BufferGeometry;
  shieldTower: THREE.ExtrudeGeometry;
  shieldTowerFace: THREE.BufferGeometry;
  roundShield: THREE.BufferGeometry;
  roundShieldFace: THREE.BufferGeometry;
  shieldBoss: THREE.SphereGeometry;
  axeHead: THREE.ExtrudeGeometry;
  staffShaft: THREE.CylinderGeometry;
  staffCollarRing: THREE.TorusGeometry;
  orbCrystal: THREE.OctahedronGeometry;
  queenGown: THREE.BufferGeometry;
  queenSlitGown: THREE.BufferGeometry;
  mageRobe: THREE.LatheGeometry;
  mageStole: THREE.ExtrudeGeometry;
  lanceCone: THREE.ConeGeometry;
  lanceGuard: THREE.ConeGeometry;
  fetlockGreave: THREE.CylinderGeometry;

  // Sculpted Equine Warhorse
  horseBody: THREE.BufferGeometry;
  horseNeck: THREE.BufferGeometry;
  horseHead: THREE.BufferGeometry;
  horseMane: THREE.BufferGeometry;
  horseEar: THREE.ExtrudeGeometry;
  horseEyeball: THREE.SphereGeometry;
  horseIrisDome: THREE.BufferGeometry;
  horseLegUpper: THREE.BufferGeometry;
  horseLegLower: THREE.BufferGeometry;
  horseFrontLeg: THREE.BufferGeometry;
  horseHindLeg: THREE.BufferGeometry;
  horseHoof: THREE.CylinderGeometry;
  horseTail: THREE.BufferGeometry;
  horseChanfron: THREE.ExtrudeGeometry;
  horseCaparison: THREE.BufferGeometry;
  horseSaddle: THREE.ExtrudeGeometry;

  dispose: () => void;
}

let _cachedCharGeoBank: CharacterGeometryBank | null = null;

export function createCharacterGeometryBank(): CharacterGeometryBank {
  if (_cachedCharGeoBank) {
    return _cachedCharGeoBank;
  }
  const track = <T extends THREE.BufferGeometry>(g: T): T => g;

  // Belt buckle
  const buckleShape = new THREE.Shape();
  buckleShape.moveTo(-0.03, 0.025);
  buckleShape.lineTo(0.03, 0.025);
  buckleShape.lineTo(0.036, 0);
  buckleShape.lineTo(0.024, -0.028);
  buckleShape.lineTo(-0.024, -0.028);
  buckleShape.lineTo(-0.036, 0);
  buckleShape.closePath();
  const beltBuckle = track(
    new THREE.ExtrudeGeometry(buckleShape, {
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
    })
  );
  beltBuckle.center();

  // Tasset waist armor plate
  const tassetShape = new THREE.Shape();
  tassetShape.moveTo(-0.075, 0.08);
  tassetShape.lineTo(0.075, 0.08);
  tassetShape.lineTo(0.09, -0.09);
  tassetShape.lineTo(0, -0.125);
  tassetShape.lineTo(-0.09, -0.09);
  tassetShape.closePath();
  const tassetPlate = track(
    new THREE.ExtrudeGeometry(tassetShape, {
      depth: 0.016,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 2,
    })
  );
  tassetPlate.center();

  // Heater shield frame
  const heaterShape = new THREE.Shape();
  heaterShape.moveTo(-0.15, 0.21);
  heaterShape.lineTo(0.15, 0.21);
  heaterShape.lineTo(0.14, -0.02);
  heaterShape.quadraticCurveTo(0.09, -0.18, 0, -0.25);
  heaterShape.quadraticCurveTo(-0.09, -0.18, -0.14, -0.02);
  heaterShape.closePath();
  const shieldHeater = track(
    new THREE.ExtrudeGeometry(heaterShape, {
      depth: 0.028,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 2,
    })
  );
  shieldHeater.center();

  // Heavy Tower Shield frame
  const towerShape = new THREE.Shape();
  towerShape.moveTo(-0.19, 0.35);
  towerShape.lineTo(0.19, 0.35);
  towerShape.lineTo(0.19, -0.25);
  towerShape.lineTo(0.1, -0.35);
  towerShape.lineTo(-0.1, -0.35);
  towerShape.lineTo(-0.19, -0.25);
  towerShape.closePath();
  const shieldTower = track(
    new THREE.ExtrudeGeometry(towerShape, {
      depth: 0.036,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.014,
      bevelSegments: 2,
    })
  );
  shieldTower.center();

  // Heavy Battleaxe / Halberd head
  const axeShape = new THREE.Shape();
  axeShape.moveTo(-0.05, -0.035);
  axeShape.lineTo(0.17, -0.17);
  axeShape.quadraticCurveTo(0.25, 0, 0.17, 0.17);
  axeShape.lineTo(-0.05, 0.035);
  axeShape.lineTo(-0.12, 0.015);
  axeShape.lineTo(-0.12, -0.015);
  axeShape.closePath();
  const axeHead = track(
    new THREE.ExtrudeGeometry(axeShape, {
      depth: 0.026,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
    })
  );
  axeHead.translate(0, 0, -0.013);

  // Open-faced Guard Helmet (cut high above brow & wide around cheekbones so full rugged face is visible)
  const rookHelmPts = [
    new THREE.Vector2(0.12, 0.045),
    new THREE.Vector2(0.134, 0.088),
    new THREE.Vector2(0.138, 0.165),
    new THREE.Vector2(0.124, 0.225),
    new THREE.Vector2(0.06, 0.245),
    new THREE.Vector2(0.0, 0.252),
  ];
  const rookHelm = track(new THREE.LatheGeometry(rookHelmPts, 26, Math.PI * 0.28, Math.PI * 1.44));
  rookHelm.rotateY(Math.PI / 2);

  // Draped Mage Hood
  const hoodPts = [
    new THREE.Vector2(0.126, -0.02),
    new THREE.Vector2(0.148, 0.055),
    new THREE.Vector2(0.154, 0.155),
    new THREE.Vector2(0.124, 0.245),
    new THREE.Vector2(0.042, 0.285),
    new THREE.Vector2(0.0, 0.295),
  ];
  const mageHood = track(new THREE.LatheGeometry(hoodPts, 24, Math.PI * 0.24, Math.PI * 1.52));
  mageHood.rotateY(Math.PI / 2);

  // Mage embroidered stole sash
  const stoleShape = new THREE.Shape();
  stoleShape.moveTo(-0.05, 0.15);
  stoleShape.lineTo(0.05, 0.15);
  stoleShape.lineTo(0.065, -0.25);
  stoleShape.lineTo(0, -0.32);
  stoleShape.lineTo(-0.065, -0.25);
  stoleShape.closePath();
  const mageStole = track(
    new THREE.ExtrudeGeometry(stoleShape, {
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
    })
  );
  mageStole.center();

  // Open-face Knight Sallet Helmet + flowing plume curve
  const knightHelmPts = [
    new THREE.Vector2(0.12, 0.01),
    new THREE.Vector2(0.136, 0.082),
    new THREE.Vector2(0.136, 0.172),
    new THREE.Vector2(0.082, 0.232),
    new THREE.Vector2(0.0, 0.244),
  ];
  const knightHelm = track(new THREE.LatheGeometry(knightHelmPts, 24, Math.PI * 0.2, Math.PI * 1.6));
  knightHelm.rotateY(Math.PI / 2);

  const plumeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.24, 0.02),
    new THREE.Vector3(0, 0.31, -0.09),
    new THREE.Vector3(0, 0.2, -0.21),
    new THREE.Vector3(0, 0.05, -0.26),
  ]);
  const knightPlume = track(new THREE.TubeGeometry(plumeCurve, 16, 0.034, 10, false));

  // Soldier Kettle Helmet
  const pawnHelmPts = [
    new THREE.Vector2(0.178, 0.09),
    new THREE.Vector2(0.132, 0.116),
    new THREE.Vector2(0.124, 0.182),
    new THREE.Vector2(0.076, 0.228),
    new THREE.Vector2(0.0, 0.24),
  ];
  const pawnHelm = track(new THREE.LatheGeometry(pawnHelmPts, 26));

  // Queen flared armored battle skirt
  const skirtPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.275, 0.0),
    new THREE.Vector2(0.225, 0.22),
    new THREE.Vector2(0.15, 0.45),
    new THREE.Vector2(0.0, 0.45),
  ];
  const queenSkirt = track(new THREE.LatheGeometry(skirtPts, 26, Math.PI * 0.15, Math.PI * 1.7));
  queenSkirt.rotateY(Math.PI / 2);

  // Mage ceremonial layered robes
  const robePts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.265, 0.0),
    new THREE.Vector2(0.215, 0.34),
    new THREE.Vector2(0.16, 0.62),
    new THREE.Vector2(0.0, 0.62),
  ];
  const mageRobe = track(new THREE.LatheGeometry(robePts, 26));

  // Horse chanfron armor plate
  const chanShape = new THREE.Shape();
  chanShape.moveTo(-0.046, 0.125);
  chanShape.lineTo(0.046, 0.125);
  chanShape.lineTo(0.032, -0.14);
  chanShape.lineTo(0, -0.195);
  chanShape.lineTo(-0.032, -0.14);
  chanShape.closePath();
  const horseChanfron = track(
    new THREE.ExtrudeGeometry(chanShape, {
      depth: 0.015,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
    })
  );

  // Sculpted concave equine ear
  const earShape = new THREE.Shape();
  earShape.moveTo(-0.018, 0);
  earShape.quadraticCurveTo(-0.022, 0.055, 0, 0.095);
  earShape.quadraticCurveTo(0.022, 0.055, 0.018, 0);
  earShape.closePath();
  const horseEar = track(
    new THREE.ExtrudeGeometry(earShape, {
      depth: 0.01,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
    })
  );
  horseEar.translate(0, 0, -0.005);

  // Sculpted saddle with pommel and cantle
  const saddleShape = new THREE.Shape();
  saddleShape.moveTo(-0.18, 0);
  saddleShape.lineTo(-0.15, 0.08);
  saddleShape.quadraticCurveTo(0, 0.02, 0.14, 0.065);
  saddleShape.lineTo(0.17, 0);
  saddleShape.closePath();
  const horseSaddle = track(
    new THREE.ExtrudeGeometry(saddleShape, {
      depth: 0.23,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.014,
      bevelSegments: 2,
    })
  );
  horseSaddle.translate(0, 0, -0.115);
  horseSaddle.rotateY(Math.PI / 2);

  const bankFromBuild: CharacterGeometryBank = {
    contactShadow: track(new THREE.PlaneGeometry(0.92, 0.92)),
    hitCylinder: track(new THREE.CylinderGeometry(0.45, 0.45, 1.85, 12)),

    headKing: track(buildSculptedHeadGeometry('king')),
    headQueen: track(buildSculptedHeadGeometry('queen')),
    headWarrior: track(buildSculptedHeadGeometry('warrior')),
    headMage: track(buildSculptedHeadGeometry('mage')),
    headYoung: track(buildSculptedHeadGeometry('young')),
    ear: track(buildEarGeometry()),
    eyeball: track(new THREE.SphereGeometry(0.0165, 16, 14)),
    irisDome: track(buildIrisDomeGeometry(0.017)),
    eyelidUpper: track(buildCurvedStripGeometry(0.036, 0.014, 0.01)),
    eyelidLower: track(buildCurvedStripGeometry(0.032, 0.0075, 0.009)),
    lashLine: track(buildCurvedStripGeometry(0.038, 0.0042, 0.0105)),
    eyebrow: track(buildCurvedStripGeometry(0.042, 0.0095, 0.011)),
    lipUpper: track(buildSculptedLipsGeometry(true)),
    lipLower: track(buildSculptedLipsGeometry(false)),
    hairShort: track(buildSculptedHairCapGeometry(false)),
    hairLong: track(buildSculptedHairCapGeometry(true)),
    hairLock: track(buildFlowingHairLockGeometry()),
    hairClump: track(buildHairClumpGeometry()),
    beardFull: track(buildBeardGeometry()),
    moustacheWing: track(buildMoustacheWingGeometry()),

    neck: track(new THREE.CylinderGeometry(0.044, 0.058, 0.14, 16)),
    gorget: track(buildGorgetGeometry()),
    cuirass: track(buildSculptedCuirassGeometry()),
    heavyCuirass: track(buildHeavySiegeTorsoGeometry()),
    femaleCorset: track(buildFemaleCorsetGeometry()),
    bareTorso: track(buildBareMuscularTorsoGeometry()),
    chestCrest: track(buildChestCrestGeometry()),
    waistBelt: track(new THREE.CylinderGeometry(0.135, 0.14, 0.058, 20)),
    beltBuckle,
    tassetPlate,
    mailSkirt: track(new THREE.CylinderGeometry(0.14, 0.185, 0.22, 20, 1, true)),
    splitFrontCoat: track(buildSplitFrontCoatGeometry()),
    shoulderMantle: track(buildShoulderMantleGeometry()),
    bandolierStrap: track(buildBandolierStrapGeometry()),
    royalFleurTabard: track(buildRoyalFleurTabardGeometry()),
    highRoyalCollar: track(buildHighRoyalCollarGeometry()),
    pauldron: track(buildPauldronGeometry()),
    upperArm: track(buildAnatomicalArmGeometry(true, 0.21)),
    forearm: track(buildAnatomicalArmGeometry(false, 0.2)),
    elbowCop: track(buildArmorCopGeometry(0.042)),
    palm: track(buildGauntletPalmGeometry()),
    fingerSeg: track(new THREE.CapsuleGeometry(0.0068, 0.024, 3, 6)),
    thigh: track(buildAnatomicalThighGeometry(0.3)),
    shin: track(buildAnatomicalShinGeometry(0.3)),
    kneeCop: track(buildArmorCopGeometry(0.052)),
    boot: track(buildBootGeometry()),
    capeDraped: track(buildDrapedCapeGeometry(0.48, 0.98)),
    furMantle: track(buildFurMantleGeometry()),

    crownRoyal: track(buildOrnateCrownGeometry(false)),
    crownDark: track(buildOrnateCrownGeometry(true)),
    kingCrownHelm: track(buildKingCrownHelmGeometry()),
    spartanHelm: track(buildSpartanHornedHelmGeometry()),
    pushedBackCowl: track(buildPushedBackCowlGeometry()),
    crownVelvetCap: track(new THREE.SphereGeometry(0.102, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55)),
    queenDiadem: track(new THREE.TorusGeometry(0.108, 0.013, 10, 24, Math.PI * 1.25)),
    rookHelm,
    bishopMitre: track(buildBishopMitreGeometry()),
    knightHelm,
    knightPlume,
    pawnHelm,
    mageHood,
    hornedCrest: track(buildHornedHelmCrestGeometry()),
    celestialHalo: track(buildCelestialHaloGeometry()),
    militaryJacket: track(buildMilitaryJacketGeometry()),
    maneuverPack: track(buildManeuverHarnessPackGeometry()),

    swordBlade: track(buildFlutedSwordBladeGeometry()),
    dualScoutBlade: track(buildDualScoutBladeGeometry()),
    flameSwordBlade: track(buildFlameSwordBladeGeometry()),
    warhammerHead: track(buildWarhammerHeadGeometry()),
    swordGuard: track(buildCrossguardGeometry()),
    swordGrip: track(new THREE.CylinderGeometry(0.016, 0.018, 0.14, 12)),
    glaiveBlade: track(buildGlaiveBladeGeometry()),
    spearHalberdHead: track(buildSpearHalberdHeadGeometry()),
    shieldHeater,
    shieldHeaterFace: track(buildShieldFaceInsertGeometry(false)),
    shieldTower,
    shieldTowerFace: track(buildShieldFaceInsertGeometry(true)),
    roundShield: track(buildRoundShieldGeometry(0.19, 0.022)),
    roundShieldFace: track(buildRoundShieldFaceGeometry(0.168)),
    shieldBoss: track(new THREE.SphereGeometry(0.04, 14, 10)),
    axeHead,
    staffShaft: track(new THREE.CylinderGeometry(0.017, 0.021, 1.44, 14)),
    staffCollarRing: track(new THREE.TorusGeometry(0.075, 0.016, 10, 24)),
    orbCrystal: track(new THREE.OctahedronGeometry(0.078, 1)),
    queenGown: track(buildQueenGownGeometry()),
    queenSlitGown: track(buildQueenSlitGownGeometry()),
    mageRobe,
    mageStole,
    lanceCone: track(new THREE.ConeGeometry(0.034, 0.88, 14)),
    lanceGuard: track(new THREE.ConeGeometry(0.068, 0.08, 16)),
    fetlockGreave: track(new THREE.CylinderGeometry(0.036, 0.042, 0.14, 14)),

    horseBody: track(buildSculptedHorseBodyGeometry()),
    horseNeck: track(buildSculptedHorseNeckGeometry()),
    horseHead: track(buildSculptedHorseHeadGeometry()),
    horseMane: track(buildHorseManeGeometry()),
    horseEar,
    horseEyeball: track(new THREE.SphereGeometry(0.016, 14, 12)),
    horseIrisDome: track(buildIrisDomeGeometry(0.0165)),
    horseLegUpper: track(buildContouredLimbGeometry(0.054, 0.045, 0.034, 0.22)),
    horseLegLower: track(buildContouredLimbGeometry(0.035, 0.03, 0.025, 0.22)),
    horseFrontLeg: track(buildEquineFrontLegGeometry()),
    horseHindLeg: track(buildEquineHindLegGeometry()),
    horseHoof: track(new THREE.CylinderGeometry(0.028, 0.036, 0.046, 12)),
    horseTail: track(buildHorseTailGeometry()),
    horseChanfron,
    horseCaparison: track(buildHorseCaparisonGeometry()),
    horseSaddle,

    dispose: () => {
      // Cached module-level geometry bank persists across UI screens & matches to eliminate rebuild stalls.
    },
  };
  _cachedCharGeoBank = bankFromBuild;
  return bankFromBuild;
}

const _tmpShadowPos = new THREE.Vector3();
const _tmpShadowQuat = new THREE.Quaternion();
const _tmpMaxScale = new THREE.Vector3();

function enableShadows(obj: THREE.Object3D) {
  obj.updateMatrixWorld(true);
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (!mesh.geometry.boundingSphere) {
        mesh.geometry.computeBoundingSphere();
      }
      mesh.matrixWorld.decompose(
        _tmpShadowPos,
        _tmpShadowQuat,
        _tmpMaxScale
      );
      const maxScale = Math.max(
        Math.abs(_tmpMaxScale.x),
        Math.abs(_tmpMaxScale.y),
        Math.abs(_tmpMaxScale.z)
      );
      const worldRadius = (mesh.geometry.boundingSphere?.radius ?? 0.2) * maxScale;
      // Skip shadow casting on sub-6.5cm micro-details (eyeballs, lashes, brows, lips, fingers, small gems)
      mesh.castShadow = worldRadius >= 0.065;
      mesh.receiveShadow = true;
    }
  });
}

const _invRootMat = new THREE.Matrix4();
const _relMat = new THREE.Matrix4();

function normalizeGeometryForMerge(
  srcGeo: THREE.BufferGeometry,
  relMat: THREE.Matrix4,
  keepUv2: boolean
): THREE.BufferGeometry {
  const g = srcGeo.index ? srcGeo.toNonIndexed() : srcGeo.clone();
  for (const name of Object.keys(g.attributes)) {
    if (name === 'position' || name === 'normal' || name === 'uv') continue;
    if (name === 'uv2' && keepUv2) continue;
    g.deleteAttribute(name);
  }
  if (!g.attributes.normal) {
    g.computeVertexNormals();
  }
  if (!g.attributes.uv && g.attributes.position) {
    const count = g.attributes.position.count;
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  g.applyMatrix4(relMat);

  if (relMat.determinant() < 0) {
    const count = g.attributes.position.count;
    for (const name of Object.keys(g.attributes)) {
      const attr = g.attributes[name] as THREE.BufferAttribute;
      const itemSize = attr.itemSize;
      const arr = attr.array as Float32Array;
      for (let k = 0; k < count; k += 3) {
        const i1 = (k + 1) * itemSize;
        const i2 = (k + 2) * itemSize;
        for (let s = 0; s < itemSize; s++) {
          const tmp = arr[i1 + s];
          arr[i1 + s] = arr[i2 + s];
          arr[i2 + s] = tmp;
        }
      }
      attr.needsUpdate = true;
    }
  }
  return g;
}

function mergeStaticBoneGroup(
  boneRoot: THREE.Object3D,
  protectedNodes: Set<THREE.Object3D>,
  disposableGeos: THREE.BufferGeometry[]
) {
  boneRoot.updateMatrixWorld(true);
  _invRootMat.copy(boneRoot.matrixWorld).invert();

  const buckets = new Map<
    string,
    { material: THREE.Material; castShadow: boolean; meshes: THREE.Mesh[] }
  >();

  const collect = (node: THREE.Object3D) => {
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (protectedNodes.has(child) || !child.visible) continue;
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (!Array.isArray(mesh.material) && mesh.geometry) {
          const mat = mesh.material;
          const key = mat.uuid;
          let bucket = buckets.get(key);
          if (!bucket) {
            bucket = { material: mat, castShadow: mesh.castShadow, meshes: [] };
            buckets.set(key, bucket);
          } else if (mesh.castShadow) {
            bucket.castShadow = true;
          }
          bucket.meshes.push(mesh);
        }
      } else {
        collect(child);
      }
    }
  };

  collect(boneRoot);

  buckets.forEach((bucket) => {
    let hasNegativeDet = false;
    if (bucket.meshes.length === 1) {
      _relMat.multiplyMatrices(_invRootMat, bucket.meshes[0].matrixWorld);
      hasNegativeDet = _relMat.determinant() < 0;
      if (!hasNegativeDet) return;
    }
    const allHaveUv2 = bucket.meshes.every((m) => Boolean(m.geometry.attributes.uv2));
    const prepared: THREE.BufferGeometry[] = [];
    for (let i = 0; i < bucket.meshes.length; i++) {
      const mesh = bucket.meshes[i];
      _relMat.multiplyMatrices(_invRootMat, mesh.matrixWorld);
      prepared.push(normalizeGeometryForMerge(mesh.geometry, _relMat, allHaveUv2));
    }
    const merged = mergeGeometries(prepared, false);
    for (let i = 0; i < prepared.length; i++) {
      prepared[i].dispose();
    }
    if (!merged) return;

    merged.computeBoundingSphere();
    disposableGeos.push(merged);

    for (let i = 0; i < bucket.meshes.length; i++) {
      const m = bucket.meshes[i];
      m.parent?.remove(m);
    }

    const combined = new THREE.Mesh(merged, bucket.material);
    combined.castShadow = bucket.castShadow;
    combined.receiveShadow = true;
    boneRoot.add(combined);
  });

  // Prune empty non-protected wrapper groups
  const pruneEmpty = (node: THREE.Object3D) => {
    for (let i = node.children.length - 1; i >= 0; i--) {
      const ch = node.children[i];
      if (protectedNodes.has(ch) || (ch as THREE.Mesh).isMesh) continue;
      pruneEmpty(ch);
      if (ch.children.length === 0) {
        node.remove(ch);
      }
    }
  };
  pruneEmpty(boneRoot);
}

function optimizeRigDrawCalls(
  rigParts: {
    body: THREE.Group;
    torso: THREE.Group;
    head: THREE.Group;
    rightArm: THREE.Group;
    leftArm: THREE.Group;
    legs: THREE.Group[];
    cape?: THREE.Mesh;
    crystal?: THREE.Mesh;
    horse?: CharacterRig['horse'];
  },
  disposableGeos: THREE.BufferGeometry[]
) {
  const protectedNodes = new Set<THREE.Object3D>();
  protectedNodes.add(rigParts.body);
  protectedNodes.add(rigParts.torso);
  protectedNodes.add(rigParts.head);
  protectedNodes.add(rigParts.rightArm);
  protectedNodes.add(rigParts.leftArm);
  for (let i = 0; i < rigParts.legs.length; i++) {
    protectedNodes.add(rigParts.legs[i]);
  }
  if (rigParts.cape) protectedNodes.add(rigParts.cape);
  if (rigParts.crystal) protectedNodes.add(rigParts.crystal);
  if (rigParts.horse) {
    protectedNodes.add(rigParts.horse.group);
    protectedNodes.add(rigParts.horse.neck);
    protectedNodes.add(rigParts.horse.tail);
    for (let i = 0; i < rigParts.horse.legs.length; i++) {
      protectedNodes.add(rigParts.horse.legs[i]);
    }
  }

  mergeStaticBoneGroup(rigParts.head, protectedNodes, disposableGeos);
  mergeStaticBoneGroup(rigParts.rightArm, protectedNodes, disposableGeos);
  mergeStaticBoneGroup(rigParts.leftArm, protectedNodes, disposableGeos);
  mergeStaticBoneGroup(rigParts.torso, protectedNodes, disposableGeos);
  for (let i = 0; i < rigParts.legs.length; i++) {
    mergeStaticBoneGroup(rigParts.legs[i], protectedNodes, disposableGeos);
  }
  if (rigParts.horse) {
    for (let i = 0; i < rigParts.horse.legs.length; i++) {
      mergeStaticBoneGroup(rigParts.horse.legs[i], protectedNodes, disposableGeos);
    }
    mergeStaticBoneGroup(rigParts.horse.group, protectedNodes, disposableGeos);
  }
  mergeStaticBoneGroup(rigParts.body, protectedNodes, disposableGeos);
}

function buildContactShadowBase(
  geo: CharacterGeometryBank,
  bank: SceneMaterialBank
): THREE.Mesh {
  const shadowPlane = new THREE.Mesh(geo.contactShadow, bank.contactShadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.004;
  shadowPlane.renderOrder = 1;
  shadowPlane.castShadow = false;
  shadowPlane.receiveShadow = false;
  return shadowPlane;
}

/**
 * Detailed Gauntlet / Gloved Hand with sculpted palm, armored knuckle plate, thumb & 4 fingers
 */
function buildDetailedHand(
  geo: CharacterGeometryBank,
  mat: KingdomMaterials,
  isLeft: boolean,
  gloveMat?: THREE.Material
): THREE.Group {
  const hand = new THREE.Group();
  const baseMat = gloveMat ?? mat.leather;
  const palm = new THREE.Mesh(geo.palm, baseMat);
  palm.position.y = -0.02;
  hand.add(palm);

  const armorBack = new THREE.Mesh(geo.palm, mat.armorPrimary);
  armorBack.scale.set(1.04, 0.85, 0.52);
  armorBack.position.set(isLeft ? 0.007 : -0.007, -0.017, 0.007);
  hand.add(armorBack);

  const fingerScales = [0.92, 1.0, 0.94, 0.78];
  for (let i = 0; i < 4; i++) {
    const finger = new THREE.Mesh(geo.fingerSeg, baseMat);
    const zOff = (i - 1.5) * 0.0115;
    finger.scale.set(0.95, fingerScales[i], 0.95);
    finger.position.set(isLeft ? -0.014 : 0.014, -0.048 - fingerScales[i] * 0.004, zOff);
    finger.rotation.z = isLeft ? -0.78 : 0.78;
    hand.add(finger);
  }

  const thumb = new THREE.Mesh(geo.fingerSeg, baseMat);
  thumb.scale.setScalar(0.92);
  thumb.position.set(isLeft ? -0.015 : 0.015, -0.025, 0.02);
  thumb.rotation.x = 0.72;
  thumb.rotation.z = isLeft ? -0.52 : 0.52;
  hand.add(thumb);

  return hand;
}

/**
 * Heraldic Two-Tone Shield (Metallic Bezel + Painted Emblem Insert + Raised Center Boss)
 */
function buildHeraldicShield(
  geo: CharacterGeometryBank,
  mat: KingdomMaterials,
  variant: 'heater' | 'tower' | 'round'
): THREE.Group {
  const group = new THREE.Group();
  if (variant === 'round') {
    const frame = new THREE.Mesh(geo.roundShield, mat.armorTrim);
    group.add(frame);

    const face = new THREE.Mesh(geo.roundShieldFace, mat.shieldFace);
    group.add(face);

    const boss = new THREE.Mesh(geo.shieldBoss, mat.armorTrim);
    boss.scale.set(0.92, 0.92, 0.52);
    boss.position.z = 0.044;
    group.add(boss);
    return group;
  }

  const tower = variant === 'tower';
  const frame = new THREE.Mesh(tower ? geo.shieldTower : geo.shieldHeater, mat.armorTrim);
  group.add(frame);

  const face = new THREE.Mesh(tower ? geo.shieldTowerFace : geo.shieldHeaterFace, mat.shieldFace);
  face.position.z = tower ? 0.018 : 0.014;
  group.add(face);

  const boss = new THREE.Mesh(geo.shieldBoss, mat.armorTrim);
  boss.scale.set(tower ? 1.15 : 0.88, tower ? 1.15 : 0.88, 0.55);
  boss.position.z = tower ? 0.024 : 0.02;
  group.add(boss);

  return group;
}

/**
 * Anatomically sculpted human head with:
 * - Sculpted face geometry + UV-aligned portrait skin map
 * - Spherical-cap 3D eyes (sclera + textured iris dome + glossy wet cornea + wrapping upper/lower eyelids)
 * - Sculpted eyebrows, 3D Cupid's-bow lips, ears
 * - Flowing S-curved hair curls, beard, and handlebar moustache
 */
function buildDetailedHumanHead(
  geo: CharacterGeometryBank,
  mat: KingdomMaterials,
  variant: FaceVariant,
  options: {
    beard?: boolean;
    longHair?: boolean;
    silverHair?: boolean;
    auburnHair?: boolean;
    visibleHair?: boolean;
    sweptHair?: boolean;
    hairSeed?: number;
  }
): THREE.Group {
  const headGroup = new THREE.Group();

  const skinMat =
    variant === 'queen'
      ? mat.skinFemale
      : variant === 'warrior'
      ? mat.skinWarrior
      : variant === 'mage'
      ? mat.skinMage
      : variant === 'young'
      ? mat.skinYoung
      : mat.skin;

  const neckMat = variant === 'queen' ? mat.skinFemale : mat.skinBody;
  const hairMat = options.silverHair
    ? mat.hairSilver
    : options.auburnHair
    ? mat.hairAuburn
    : mat.hair;

  const neck = new THREE.Mesh(geo.neck, neckMat);
  neck.position.y = 0.03;
  headGroup.add(neck);

  const headGeo =
    variant === 'king'
      ? geo.headKing
      : variant === 'queen'
      ? geo.headQueen
      : variant === 'mage'
      ? geo.headMage
      : variant === 'young'
      ? geo.headYoung
      : geo.headWarrior;

  const faceCenter = new THREE.Group();
  faceCenter.position.y = 0.145;
  headGroup.add(faceCenter);

  const cranium = new THREE.Mesh(headGeo, skinMat);
  faceCenter.add(cranium);

  // Ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(geo.ear, skinMat);
    ear.position.set(side * 0.104, -0.008, -0.008);
    ear.rotation.y = side * Math.PI * 0.42;
    ear.rotation.z = side * -0.08;
    faceCenter.add(ear);
  }

  // Multi-Part Spherical-Cap Eyes inside deep orbital sockets + Dark Upper Lash Line + Wet Cornea + Eyelids + Eyebrows
  for (const side of [-1, 1]) {
    const eyeSocket = new THREE.Group();
    eyeSocket.position.set(side * 0.036, 0.011, 0.089);
    eyeSocket.rotation.y = side * 0.14;
    faceCenter.add(eyeSocket);

    const sclera = new THREE.Mesh(geo.eyeball, mat.sclera);
    eyeSocket.add(sclera);

    const iris = new THREE.Mesh(geo.irisDome, mat.iris);
    eyeSocket.add(iris);

    const upperLid = new THREE.Mesh(geo.eyelidUpper, skinMat);
    upperLid.position.set(0, 0.0078, 0.0145);
    upperLid.rotation.x = -0.35;
    upperLid.rotation.z = variant === 'queen' ? side * 0.06 : side * -0.1;
    eyeSocket.add(upperLid);

    const lashRim = new THREE.Mesh(geo.lashLine, mat.lashLine);
    lashRim.position.set(0, 0.0044, 0.0158);
    lashRim.rotation.x = -0.25;
    lashRim.rotation.z = upperLid.rotation.z;
    eyeSocket.add(lashRim);

    const lowerLid = new THREE.Mesh(geo.eyelidLower, skinMat);
    lowerLid.position.set(0, -0.0095, 0.0135);
    lowerLid.rotation.x = 0.25;
    eyeSocket.add(lowerLid);

    const brow = new THREE.Mesh(geo.eyebrow, options.silverHair ? mat.hairSilver : mat.eyebrow);
    brow.position.set(side * 0.036, 0.034, 0.106);
    brow.rotation.y = side * 0.18;
    brow.rotation.z = variant === 'queen' ? side * 0.1 : side * -0.14;
    faceCenter.add(brow);
  }

  // Sculpted 3D Upper & Lower Lips
  const lipUpper = new THREE.Mesh(geo.lipUpper, mat.lips);
  lipUpper.position.set(0, -0.056, 0.104);
  lipUpper.rotation.x = -0.15;
  faceCenter.add(lipUpper);

  const lipLower = new THREE.Mesh(geo.lipLower, mat.lips);
  lipLower.position.set(0, -0.065, 0.101);
  lipLower.rotation.x = 0.18;
  faceCenter.add(lipLower);

  // Layered Multi-Clump Sculpted Hair (natural hairline, temple clumps, crown sweep & back locks)
  if (options.visibleHair !== false) {
    const hairCap = new THREE.Mesh(options.longHair ? geo.hairLong : geo.hairShort, hairMat);
    hairCap.position.set(0, 0.009, -0.004);
    faceCenter.add(hairCap);

    // Temple sideburns / framing hair clumps
    for (const side of [-1, 1]) {
      const templeClump = new THREE.Mesh(geo.hairClump, hairMat);
      templeClump.position.set(side * 0.095, 0.048, 0.025);
      templeClump.rotation.set(0.12, side * 0.35, side * -0.18);
      templeClump.scale.set(side * 0.9, 1.05, 0.9);
      faceCenter.add(templeClump);
    }

    if (options.sweptHair) {
      // Swept sculpted forehead hair clumps for unhelmeted/hoodless warriors & pawns
      const seedTilt = options.hairSeed ? Math.sin(options.hairSeed) * 0.14 : 0.08;
      const clumpSpecs: Array<[number, number, number, number, number]> = [
        [-0.048, 0.086, 0.082, -0.25 + seedTilt, 1.0],
        [-0.012, 0.094, 0.088, -0.18 + seedTilt, 1.1],
        [0.028, 0.092, 0.085, 0.22 + seedTilt, 1.02],
        [0.062, 0.078, 0.068, 0.32, 0.92],
      ];
      for (const [cx, cy, cz, rz, sc] of clumpSpecs) {
        const clump = new THREE.Mesh(geo.hairClump, hairMat);
        clump.position.set(cx, cy, cz);
        clump.rotation.set(-0.28, 0, rz);
        clump.scale.set(0.85 * sc, 0.72 * sc, 0.85 * sc);
        faceCenter.add(clump);
      }
    }

    if (options.longHair) {
      for (const side of [-1, 1]) {
        const lock = new THREE.Mesh(geo.hairLock, hairMat);
        lock.position.set(side * 0.092, -0.015, 0.015);
        lock.scale.x = side;
        faceCenter.add(lock);

        const backTress = new THREE.Mesh(geo.hairLock, hairMat);
        backTress.position.set(side * 0.054, -0.028, -0.088);
        backTress.rotation.x = -0.12;
        backTress.scale.set(side * 1.15, 1.25, 1.15);
        faceCenter.add(backTress);
      }
    }
  }

  // Royal Full Beard & Curved Handlebar Moustache
  if (options.beard) {
    const beard = new THREE.Mesh(geo.beardFull, hairMat);
    beard.position.set(0, -0.012, 0.004);
    faceCenter.add(beard);

    for (const side of [-1, 1]) {
      const stache = new THREE.Mesh(geo.moustacheWing, hairMat);
      stache.position.set(0, -0.047, 0.111);
      stache.scale.x = side;
      faceCenter.add(stache);
    }
  }

  return headGroup;
}

function createSword(geo: CharacterGeometryBank, mat: KingdomMaterials, scale = 1): THREE.Group {
  const sword = new THREE.Group();
  const grip = new THREE.Mesh(geo.swordGrip, mat.leather);
  grip.position.y = 0.06;
  sword.add(grip);

  const guard = new THREE.Mesh(geo.swordGuard, mat.armorTrim);
  guard.position.y = 0.14;
  sword.add(guard);

  const blade = new THREE.Mesh(geo.swordBlade, mat.weaponBlade);
  blade.position.y = 0.145;
  sword.add(blade);

  const pommel = new THREE.Mesh(geo.orbCrystal, mat.armorTrim);
  pommel.scale.setScalar(0.32);
  pommel.position.y = -0.015;
  sword.add(pommel);

  sword.scale.setScalar(scale);
  return sword;
}

function buildSculptedWarriorBody(
  geo: CharacterGeometryBank,
  mat: KingdomMaterials,
  variant: FaceVariant,
  options: {
    scale: number;
    hasQueenGown?: boolean;
    hasFemaleCorset?: boolean;
    hasCoatSkirt?: boolean;
    hasShoulderMantle?: boolean;
    hasBandolier?: boolean;
    hasPauldrons?: boolean;
    hasCape?: boolean;
    capeMaterial?: THREE.Material;
    torsoMaterial?: THREE.Material;
    sleeveMaterial?: THREE.Material;
    bracerMaterial?: THREE.Material;
    thighMaterial?: THREE.Material;
    greaveMaterial?: THREE.Material;
    pauldronMaterial?: THREE.Material;
    hasBareTorso?: boolean;
    hasHeavyTorso?: boolean;
    hasMailSkirt?: boolean;
    hasChestCrest?: boolean;
    broadShoulders?: number;
    beard?: boolean;
    longHair?: boolean;
    silverHair?: boolean;
    auburnHair?: boolean;
    visibleHair?: boolean;
    sweptHair?: boolean;
    hairSeed?: number;
  }
): {
  body: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  rightArm: THREE.Group;
  leftArm: THREE.Group;
  legs: THREE.Group[];
  cape?: THREE.Mesh;
} {
  const body = new THREE.Group();
  body.position.y = 0;
  body.scale.setScalar(options.scale);

  const legs: THREE.Group[] = [];

  if (options.hasQueenGown) {
    const gown = new THREE.Mesh(geo.queenSlitGown, mat.queenGown);
    gown.position.y = 0.004;
    body.add(gown);
    // Slender draped inner underskirt + legs visible inside front slit
    for (const side of [-1, 1]) {
      const legPivot = new THREE.Group();
      legPivot.position.set(side * 0.068, 0.6, 0.015);
      const thigh = new THREE.Mesh(geo.thigh, mat.trousers);
      thigh.scale.set(0.76, 1.0, 0.76);
      legPivot.add(thigh);
      const shin = new THREE.Mesh(geo.shin, mat.trousers);
      shin.scale.set(0.76, 1.0, 0.76);
      shin.position.y = -0.28;
      legPivot.add(shin);
      const boot = new THREE.Mesh(geo.boot, mat.armorTrim);
      boot.scale.setScalar(0.72);
      boot.position.set(0, -0.6, 0.01);
      legPivot.add(boot);
      body.add(legPivot);
      legs.push(legPivot);
    }
  } else {
    for (const side of [-1, 1]) {
      const legPivot = new THREE.Group();
      legPivot.position.set(side * 0.095, 0.6, 0);

      const thigh = new THREE.Mesh(geo.thigh, options.thighMaterial ?? mat.chainmail);
      legPivot.add(thigh);

      const knee = new THREE.Mesh(geo.kneeCop, mat.armorTrim);
      knee.position.set(0, -0.29, 0.028);
      legPivot.add(knee);

      const shin = new THREE.Mesh(geo.shin, options.greaveMaterial ?? mat.armorPrimary);
      shin.position.set(0, -0.28, 0);
      legPivot.add(shin);

      const boot = new THREE.Mesh(geo.boot, mat.leather);
      boot.scale.setScalar(0.84);
      boot.position.set(0, -0.6, 0.01);
      boot.rotation.y = side * 0.1;
      legPivot.add(boot);

      body.add(legPivot);
      legs.push(legPivot);
    }
  }

  const torso = new THREE.Group();
  torso.position.y = 0.6;
  body.add(torso);

  // Sculpted Anatomical Torso (Female Corset, Bare Muscular, Heavy Siege, or Knight Cuirass)
  const torsoGeo = options.hasFemaleCorset
    ? geo.femaleCorset
    : options.hasBareTorso
    ? geo.bareTorso
    : options.hasHeavyTorso
    ? geo.heavyCuirass
    : geo.cuirass;
  const torsoMat = options.hasBareTorso
    ? mat.skinBody
    : options.torsoMaterial ?? mat.armorPrimary;
  const cuirass = new THREE.Mesh(torsoGeo, torsoMat);
  cuirass.position.y = 0.24;
  if (!options.hasFemaleCorset) {
    if (variant === 'queen') cuirass.scale.set(0.82, 1.04, 0.84);
    else cuirass.scale.set(0.95, 1.06, 0.92);
  }
  torso.add(cuirass);

  // Draped Cloth Shoulder Mantle (Pawn) or Gorget Collar (Armored Knights/King/Rook/Bishop)
  if (options.hasShoulderMantle) {
    const mantle = new THREE.Mesh(geo.shoulderMantle, options.torsoMaterial ?? mat.pawnCoat);
    mantle.position.set(0, 0.4, 0);
    torso.add(mantle);
  } else if (!options.hasBareTorso && !options.hasFemaleCorset) {
    const gorget = new THREE.Mesh(geo.gorget, mat.armorTrim);
    gorget.position.set(0, 0.445, 0.005);
    gorget.scale.setScalar(0.92);
    torso.add(gorget);
  }

  // Diagonal Leather Bandolier / Baldric Strap across chest
  if (options.hasBandolier) {
    const bandolier = new THREE.Mesh(geo.bandolierStrap, mat.leather);
    bandolier.position.set(0, 0.25, 0.01);
    bandolier.rotation.z = -0.62;
    bandolier.rotation.y = 0.12;
    torso.add(bandolier);
  }

  // Heraldic Chest Crest
  if (options.hasChestCrest) {
    const crest = new THREE.Mesh(geo.chestCrest, mat.armorTrim);
    crest.position.set(0, 0.32, options.hasFemaleCorset ? 0.132 : options.hasHeavyTorso ? 0.185 : 0.152);
    if (options.hasFemaleCorset) crest.scale.setScalar(0.72);
    torso.add(crest);
  }

  // Waist belt + ornate buckle + coat/chainmail skirt
  const belt = new THREE.Mesh(geo.waistBelt, mat.leather);
  belt.position.y = 0.04;
  if (options.hasFemaleCorset || variant === 'queen') belt.scale.set(0.76, 0.9, 0.76);
  else if (options.hasHeavyTorso) belt.scale.set(1.16, 1.05, 1.06);
  torso.add(belt);

  const buckle = new THREE.Mesh(geo.beltBuckle, mat.armorTrim);
  buckle.position.set(0, 0.04, options.hasFemaleCorset || variant === 'queen' ? 0.112 : options.hasHeavyTorso ? 0.165 : 0.145);
  buckle.scale.setScalar(0.88);
  torso.add(buckle);

  if (options.hasCoatSkirt) {
    const coat = new THREE.Mesh(geo.splitFrontCoat, mat.pawnCoat);
    coat.position.y = 0.03;
    torso.add(coat);
  } else if (!options.hasQueenGown && !options.hasBareTorso) {
    if (options.hasMailSkirt) {
      const mailSkirt = new THREE.Mesh(geo.mailSkirt, mat.chainmail);
      mailSkirt.position.y = -0.065;
      if (options.hasHeavyTorso) mailSkirt.scale.set(1.14, 1.0, 1.06);
      torso.add(mailSkirt);
    }
    for (const side of [-1, 1]) {
      const frontTasset = new THREE.Mesh(geo.tassetPlate, mat.armorTrim);
      frontTasset.position.set(side * 0.09, -0.03, 0.11);
      frontTasset.rotation.x = -0.18;
      frontTasset.rotation.y = side * 0.3;
      frontTasset.scale.setScalar(0.9);
      torso.add(frontTasset);
    }
  }

  // Realistic Adult-Proportioned Sculpted Head (~0.75 scale on anatomical neck)
  const head = buildDetailedHumanHead(geo, mat, variant, {
    beard: options.beard,
    longHair: options.longHair,
    silverHair: options.silverHair,
    auburnHair: options.auburnHair,
    visibleHair: options.visibleHair,
    sweptHair: options.sweptHair,
    hairSeed: options.hairSeed,
  });
  head.scale.setScalar(0.75);
  head.position.set(0, 0.47, 0);
  torso.add(head);

  // Arms with anatomical musculature, optional pauldrons, elbow cops, bracers & curled fingers
  const shoulderScale = options.broadShoulders ?? 1;
  const shoulderX = 0.195 * shoulderScale * (variant === 'queen' ? 0.78 : 1);

  const buildArm = (isLeft: boolean) => {
    const arm = new THREE.Group();
    arm.position.set(isLeft ? shoulderX : -shoulderX, 0.42, 0);
    torso.add(arm);

    if (options.hasPauldrons !== false) {
      const pOuter = new THREE.Mesh(geo.pauldron, options.pauldronMaterial ?? mat.armorPrimary);
      pOuter.rotation.y = isLeft ? -Math.PI * 0.15 : Math.PI * 0.85;
      pOuter.rotation.z = isLeft ? -0.15 : 0.15;
      pOuter.scale.setScalar(shoulderScale * (variant === 'queen' ? 0.74 : 0.92));
      arm.add(pOuter);

      const pTrim = new THREE.Mesh(geo.pauldron, mat.armorTrim);
      pTrim.scale.setScalar(shoulderScale * 0.72 * (variant === 'queen' ? 0.74 : 0.92));
      pTrim.position.y = 0.028;
      pTrim.rotation.y = pOuter.rotation.y;
      arm.add(pTrim);
    }

    const upper = new THREE.Mesh(
      geo.upperArm,
      options.sleeveMaterial ?? (options.hasBareTorso ? mat.skinBody : mat.chainmail)
    );
    if (options.hasHeavyTorso) upper.scale.set(1.2, 1.0, 1.2);
    else if (variant === 'queen') upper.scale.set(0.8, 1.0, 0.8);
    arm.add(upper);

    const elbow = new THREE.Mesh(geo.elbowCop, mat.armorTrim);
    elbow.position.set(0, -0.21, -0.02);
    elbow.rotation.y = Math.PI;
    if (variant === 'queen') elbow.scale.setScalar(0.75);
    arm.add(elbow);

    const fore = new THREE.Mesh(geo.forearm, options.bracerMaterial ?? mat.armorPrimary);
    fore.position.y = -0.2;
    if (options.hasHeavyTorso) fore.scale.set(1.14, 1.0, 1.14);
    else if (variant === 'queen') fore.scale.set(0.8, 1.0, 0.8);
    arm.add(fore);

    const hand = buildDetailedHand(
      geo,
      mat,
      isLeft,
      variant === 'queen' ? mat.skinFemale : undefined
    );
    hand.scale.setScalar(variant === 'queen' ? 0.7 : 0.78);
    hand.position.y = -0.39;
    arm.add(hand);

    return arm;
  };

  const rightArm = buildArm(false);
  const leftArm = buildArm(true);

  let cape: THREE.Mesh | undefined;
  if (options.hasCape) {
    cape = new THREE.Mesh(geo.capeDraped, options.capeMaterial ?? mat.cape);
    cape.position.set(0, 0.02, -0.15);
    cape.rotation.x = 0.12;
    torso.add(cape);
  }

  return { body, torso, head, rightArm, leftArm, legs, cape };
}

function createDualScoutSword(
  geo: CharacterGeometryBank,
  mat: KingdomMaterials,
  scale = 1,
  useGlow = false
): THREE.Group {
  const sword = new THREE.Group();
  const grip = new THREE.Mesh(geo.swordGrip, mat.leather);
  grip.scale.set(0.85, 0.9, 0.85);
  grip.position.y = 0.055;
  sword.add(grip);

  const guard = new THREE.Mesh(geo.swordGuard, mat.armorDarkSteel);
  guard.scale.set(0.7, 0.85, 0.85);
  guard.position.y = 0.13;
  sword.add(guard);

  const blade = new THREE.Mesh(
    geo.dualScoutBlade,
    useGlow ? mat.accentGlow : mat.weaponBlade
  );
  blade.position.y = 0.135;
  sword.add(blade);

  sword.scale.setScalar(scale);
  return sword;
}

function createFlameSword(
  geo: CharacterGeometryBank,
  mat: KingdomMaterials,
  scale = 1
): THREE.Group {
  const sword = new THREE.Group();
  const grip = new THREE.Mesh(geo.swordGrip, mat.leather);
  grip.position.y = 0.06;
  sword.add(grip);

  const guard = new THREE.Mesh(geo.swordGuard, mat.armorTrim);
  guard.scale.set(1.15, 1.1, 1.1);
  guard.position.y = 0.14;
  sword.add(guard);

  const blade = new THREE.Mesh(geo.flameSwordBlade, mat.weaponBlade);
  blade.position.y = 0.145;
  sword.add(blade);

  const coreGem = new THREE.Mesh(geo.orbCrystal, mat.accentGlow);
  coreGem.scale.set(0.32, 0.52, 0.32);
  coreGem.position.y = 0.18;
  sword.add(coreGem);

  sword.scale.setScalar(scale);
  return sword;
}

function createWarhammer(
  geo: CharacterGeometryBank,
  mat: KingdomMaterials,
  scale = 1
): THREE.Group {
  const hammer = new THREE.Group();
  const haft = new THREE.Mesh(geo.staffShaft, mat.wood);
  haft.scale.set(1.12, 0.72, 1.12);
  haft.position.set(0, 0.22, 0);
  hammer.add(haft);

  const head = new THREE.Mesh(geo.warhammerHead, mat.armorPrimary);
  head.position.set(0, 0.7, 0);
  hammer.add(head);

  const band = new THREE.Mesh(geo.staffCollarRing, mat.armorTrim);
  band.rotation.x = Math.PI / 2;
  band.position.set(0, 0.7, 0);
  hammer.add(band);

  hammer.scale.setScalar(scale);
  return hammer;
}

function buildMountedRiderKnight(
  geo: CharacterGeometryBank,
  mat: KingdomMaterials,
  phaseOffset: number,
  options: {
    armorMat?: THREE.Material;
    trimMat?: THREE.Material;
    capeMat?: THREE.Material;
    hasBarding?: boolean;
    hasHornedHelm?: boolean;
    hasPlume?: boolean;
    hasLanceGlow?: boolean;
  }
): {
  body: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  rightArm: THREE.Group;
  leftArm: THREE.Group;
  legs: THREE.Group[];
  cape?: THREE.Mesh;
  crystal?: THREE.Mesh;
  horse: CharacterRig['horse'];
  torsoBaseY: number;
} {
  const body = new THREE.Group();
  body.position.y = 0;

  const horseGroup = new THREE.Group();
  horseGroup.position.y = 0.45;
  body.add(horseGroup);

  const barrel = new THREE.Mesh(geo.horseBody, mat.horseCoat);
  barrel.position.set(0, 0.05, -0.04);
  horseGroup.add(barrel);

  // Draped caparison & sculpted saddle
  const caparison = new THREE.Mesh(geo.horseCaparison, options.capeMat ?? mat.horseCaparison);
  caparison.position.set(0, 0.06, -0.05);
  horseGroup.add(caparison);

  const saddle = new THREE.Mesh(geo.horseSaddle, mat.leather);
  saddle.position.set(0, 0.24, -0.08);
  horseGroup.add(saddle);

  // Sculpted equine neck, head, ears, mane, eyes & armored chanfron
  const neck = new THREE.Mesh(geo.horseNeck, mat.horseCoat);
  neck.position.set(0, 0.16, 0.28);
  horseGroup.add(neck);

  const mane = new THREE.Mesh(geo.horseMane, mat.horseMane);
  mane.position.set(0, 0.17, 0.27);
  horseGroup.add(mane);

  const hHeadGroup = new THREE.Group();
  hHeadGroup.position.set(0, 0.51, 0.51);
  hHeadGroup.rotation.x = 0.46;
  horseGroup.add(hHeadGroup);

  const hHead = new THREE.Mesh(geo.horseHead, mat.horseCoat);
  hHeadGroup.add(hHead);

  if (options.hasBarding) {
    const chanfron = new THREE.Mesh(geo.horseChanfron, options.trimMat ?? mat.armorTrim);
    chanfron.position.set(0, 0.095, 0.07);
    chanfron.rotation.x = -Math.PI * 0.46;
    hHeadGroup.add(chanfron);
  }

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(geo.horseEar, mat.horseCoat);
    ear.position.set(side * 0.052, 0.09, -0.06);
    ear.rotation.z = side * -0.22;
    hHeadGroup.add(ear);

    const eye = new THREE.Mesh(geo.horseEyeball, mat.accentGlow);
    eye.scale.setScalar(0.85);
    eye.position.set(side * 0.062, 0.028, 0.045);
    hHeadGroup.add(eye);
  }

  // 4 Equine legs
  const horseLegs: THREE.Group[] = [];
  const legOffsets: Array<[number, number, boolean]> = [
    [-0.105, 0.23, true],
    [0.105, 0.23, true],
    [-0.105, -0.26, false],
    [0.105, -0.26, false],
  ];
  for (const [lx, lz, isFront] of legOffsets) {
    const lPivot = new THREE.Group();
    lPivot.position.set(lx, 0, lz);
    const legMesh = new THREE.Mesh(isFront ? geo.horseFrontLeg : geo.horseHindLeg, mat.horseCoat);
    lPivot.add(legMesh);
    const greave = new THREE.Mesh(geo.fetlockGreave, options.trimMat ?? mat.armorTrim);
    greave.position.set(0, -0.35, isFront ? 0.015 : -0.022);
    lPivot.add(greave);
    const hoof = new THREE.Mesh(geo.horseHoof, mat.armorSecondary);
    hoof.position.set(0, -0.43, isFront ? 0.024 : -0.005);
    lPivot.add(hoof);
    horseGroup.add(lPivot);
    horseLegs.push(lPivot);
  }

  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 0.13, -0.44);
  const tailMesh = new THREE.Mesh(geo.horseTail, mat.horseMane);
  tailGroup.add(tailMesh);
  horseGroup.add(tailGroup);

  // Seated Rider Upper Body + Stirrup Legs
  const rider = buildSculptedWarriorBody(geo, mat, 'warrior', {
    scale: 0.9,
    hasCape: true,
    capeMaterial: options.capeMat ?? mat.cape,
    torsoMaterial: options.armorMat ?? mat.armorPrimary,
    pauldronMaterial: options.trimMat ?? mat.armorTrim,
    bracerMaterial: options.armorMat ?? mat.armorPrimary,
    hasMailSkirt: true,
    hasChestCrest: true,
    broadShoulders: 1.06,
    visibleHair: true,
    hairSeed: phaseOffset,
  });

  // Position rider seated neatly in saddle
  for (const l of rider.legs) {
    l.scale.set(0.84, 0.86, 0.84);
    l.rotation.x = -0.58;
    l.position.y = 0.67;
    l.position.z = -0.06;
    l.position.x = Math.sign(l.position.x) * 0.14;
    body.add(l);
  }

  const torsoBaseY = 0.72;
  rider.torso.position.set(0, torsoBaseY, -0.07);
  rider.torso.scale.setScalar(0.9);
  body.add(rider.torso);

  const helm = new THREE.Mesh(
    options.hasHornedHelm ? geo.spartanHelm : geo.knightHelm,
    options.armorMat ?? mat.armorPrimary
  );
  helm.position.set(0, 0.12, -0.004);
  rider.head.add(helm);

  if (options.hasHornedHelm) {
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(geo.hornedCrest, options.trimMat ?? mat.armorTrim);
      horn.scale.set(side * 0.75, 0.8, 0.8);
      horn.position.set(side * 0.09, 0.21, 0.01);
      rider.head.add(horn);
    }
  } else if (options.hasPlume) {
    const plume = new THREE.Mesh(geo.knightPlume, options.capeMat ?? mat.armorTrim);
    plume.position.set(0, 0.02, -0.02);
    rider.head.add(plume);
  }

  // War-Lance in right arm
  const lance = new THREE.Mesh(
    geo.lanceCone,
    options.hasLanceGlow ? mat.accentGlow : mat.armorTrim
  );
  lance.position.set(0, -0.25, 0.36);
  lance.rotation.x = Math.PI * 0.45;
  rider.rightArm.add(lance);

  const vamplate = new THREE.Mesh(geo.lanceGuard, options.armorMat ?? mat.armorPrimary);
  vamplate.position.set(0, -0.29, 0.14);
  vamplate.rotation.x = Math.PI * 0.45;
  rider.rightArm.add(vamplate);
  rider.rightArm.rotation.set(-0.24, 0, -0.14);

  const shield = buildHeraldicShield(geo, mat, 'heater');
  shield.scale.setScalar(0.86);
  shield.position.set(0.06, -0.24, 0.08);
  shield.rotation.y = Math.PI * 0.4;
  rider.leftArm.add(shield);
  rider.leftArm.rotation.set(-0.22, 0, 0.14);

  return {
    body,
    torso: rider.torso,
    head: rider.head,
    rightArm: rider.rightArm,
    leftArm: rider.leftArm,
    legs: rider.legs,
    cape: rider.cape,
    horse: {
      group: horseGroup,
      neck: rider.torso,
      legs: horseLegs,
      tail: tailGroup,
    },
    torsoBaseY,
  };
}

function buildThemedCharacterRig(
  type: PieceType,
  color: PieceColor,
  geo: CharacterGeometryBank,
  mat: KingdomMaterials,
  phaseOffset: number,
  characterSet: Exclude<CharacterSetId, 'human'>
): {
  rigParts: {
    body: THREE.Group;
    torso: THREE.Group;
    head: THREE.Group;
    rightArm: THREE.Group;
    leftArm: THREE.Group;
    legs: THREE.Group[];
    cape?: THREE.Mesh;
    crystal?: THREE.Mesh;
    horse?: CharacterRig['horse'];
  };
  torsoBaseY: number;
} {
  let torsoBaseY = 0.6;

  if (characterSet === 'titan') {
    // SET 2 — TITAN VANGUARD (Original giant-wall military garrison & twin-blade scout corps)
    if (type === 'k') {
      const h = buildSculptedWarriorBody(geo, mat, 'king', {
        scale: 1.15,
        hasCape: true,
        capeMaterial: mat.cape,
        hasCoatSkirt: true,
        hasBandolier: true,
        hasPauldrons: false,
        torsoMaterial: mat.tabard,
        sleeveMaterial: mat.tabard,
        bracerMaterial: mat.leather,
        thighMaterial: mat.trousers,
        greaveMaterial: mat.leather,
        broadShoulders: 1.04,
        beard: false,
        visibleHair: true,
        sweptHair: true,
        hairSeed: phaseOffset,
      });
      // Replace cuirass visually with tailored military jacket collar silhouette
      const jacketCollar = new THREE.Mesh(geo.militaryJacket, mat.royalTabard);
      jacketCollar.position.y = 0.24;
      jacketCollar.scale.set(0.98, 1.07, 0.95);
      h.torso.add(jacketCollar);

      const sash = new THREE.Mesh(geo.mageStole, mat.armorTrim);
      sash.scale.set(0.72, 0.78, 0.9);
      sash.position.set(0, 0.27, 0.145);
      sash.rotation.z = 0.24;
      h.torso.add(sash);

      const sword = createSword(geo, mat, 1.08);
      sword.position.set(0, -0.4, 0.04);
      sword.rotation.x = Math.PI * 0.4;
      h.rightArm.add(sword);
      h.rightArm.rotation.set(-0.3, 0, -0.14);
      h.leftArm.rotation.set(-0.14, 0, 0.16);
      return { rigParts: h, torsoBaseY };
    }

    if (type === 'q') {
      // Elite female scout bladeswoman with dual scout blades & agile harness
      const h = buildSculptedWarriorBody(geo, mat, 'queen', {
        scale: 1.09,
        hasCape: true,
        capeMaterial: mat.cape,
        hasCoatSkirt: true,
        hasBandolier: true,
        hasPauldrons: false,
        torsoMaterial: mat.pawnCoat,
        sleeveMaterial: mat.pawnCoat,
        bracerMaterial: mat.leather,
        thighMaterial: mat.trousers,
        greaveMaterial: mat.leather,
        broadShoulders: 0.86,
        longHair: false,
        sweptHair: true,
        hairSeed: phaseOffset + 1.2,
      });
      const pack = new THREE.Mesh(geo.maneuverPack, mat.armorDarkSteel);
      pack.position.set(0, 0.14, -0.16);
      h.torso.add(pack);

      const rightBlade = createDualScoutSword(geo, mat, 0.98);
      rightBlade.position.set(0, -0.39, 0.04);
      rightBlade.rotation.x = Math.PI * 0.42;
      h.rightArm.add(rightBlade);
      h.rightArm.rotation.set(-0.34, 0, -0.18);

      const leftBlade = createDualScoutSword(geo, mat, 0.96);
      leftBlade.position.set(0, -0.39, 0.04);
      leftBlade.rotation.x = Math.PI * 0.44;
      h.leftArm.add(leftBlade);
      h.leftArm.rotation.set(-0.3, 0, 0.18);
      return { rigParts: h, torsoBaseY };
    }

    if (type === 'b') {
      // Tactical field strategist in military coat & sash
      const h = buildSculptedWarriorBody(geo, mat, 'mage', {
        scale: 1.07,
        hasCape: true,
        capeMaterial: mat.cape,
        hasCoatSkirt: true,
        hasBandolier: true,
        hasPauldrons: false,
        torsoMaterial: mat.tabard,
        sleeveMaterial: mat.tabard,
        bracerMaterial: mat.leather,
        thighMaterial: mat.trousers,
        greaveMaterial: mat.leather,
        broadShoulders: 0.94,
        visibleHair: true,
        sweptHair: true,
        silverHair: color === 'w',
        hairSeed: phaseOffset + 0.5,
      });
      const coat = new THREE.Mesh(geo.militaryJacket, mat.tabard);
      coat.position.y = 0.24;
      coat.scale.set(0.95, 1.07, 0.93);
      h.torso.add(coat);

      const rapier = createDualScoutSword(geo, mat, 0.95);
      rapier.position.set(0, -0.4, 0.04);
      rapier.rotation.x = Math.PI * 0.38;
      h.rightArm.add(rapier);
      h.rightArm.rotation.set(-0.24, 0, -0.12);

      const folio = new THREE.Mesh(geo.tassetPlate, mat.leather);
      folio.scale.set(1.05, 1.15, 1.6);
      folio.position.set(0.02, -0.38, 0.06);
      folio.rotation.x = -0.4;
      h.leftArm.add(folio);
      h.leftArm.rotation.set(-0.35, 0, 0.14);
      return { rigParts: h, torsoBaseY };
    }

    if (type === 'n') {
      // Aerial Vanguard Swordsman: dual blades + maneuvering harness pack (distinct compact airborne scout!)
      const h = buildSculptedWarriorBody(geo, mat, 'warrior', {
        scale: 1.04,
        hasCape: true,
        capeMaterial: mat.cape,
        hasCoatSkirt: true,
        hasBandolier: true,
        hasPauldrons: false,
        torsoMaterial: mat.pawnCoat,
        sleeveMaterial: mat.pawnCoat,
        bracerMaterial: mat.armorDarkSteel,
        thighMaterial: mat.trousers,
        greaveMaterial: mat.leather,
        broadShoulders: 0.96,
        visibleHair: true,
        sweptHair: true,
        hairSeed: phaseOffset + 2.1,
      });
      const pack = new THREE.Mesh(geo.maneuverPack, mat.armorDarkSteel);
      pack.position.set(0, 0.2, -0.17);
      pack.scale.set(1.2, 1.1, 1.15);
      h.torso.add(pack);

      for (const side of [-1, 1]) {
        const canister = new THREE.Mesh(geo.swordGrip, mat.armorSecondary);
        canister.scale.set(2.2, 1.8, 2.2);
        canister.position.set(side * 0.16, 0.02, -0.06);
        canister.rotation.x = 0.35;
        h.torso.add(canister);
      }

      const rightBlade = createDualScoutSword(geo, mat, 1.02);
      rightBlade.position.set(0, -0.4, 0.04);
      rightBlade.rotation.x = Math.PI * 0.44;
      h.rightArm.add(rightBlade);
      h.rightArm.rotation.set(-0.42, 0, -0.2);

      const leftBlade = createDualScoutSword(geo, mat, 1.0);
      leftBlade.position.set(0, -0.4, 0.04);
      leftBlade.rotation.x = Math.PI * 0.44;
      h.leftArm.add(leftBlade);
      h.leftArm.rotation.set(-0.36, 0, 0.2);
      return { rigParts: h, torsoBaseY };
    }

    if (type === 'r') {
      // Bastion Frontline Sentinel
      const h = buildSculptedWarriorBody(geo, mat, 'warrior', {
        scale: 1.1,
        hasHeavyTorso: true,
        hasBandolier: true,
        torsoMaterial: mat.armorDarkSteel,
        pauldronMaterial: mat.armorPrimary,
        bracerMaterial: mat.armorPrimary,
        greaveMaterial: mat.armorPrimary,
        hasMailSkirt: true,
        hasChestCrest: true,
        broadShoulders: 1.18,
        visibleHair: true,
        sweptHair: true,
        hairSeed: phaseOffset,
      });
      const buckler = buildHeraldicShield(geo, mat, 'tower');
      buckler.scale.setScalar(0.95);
      buckler.position.set(0.08, -0.22, 0.11);
      buckler.rotation.y = Math.PI * 0.36;
      h.leftArm.add(buckler);
      h.leftArm.rotation.set(-0.32, 0, 0.1);

      const claymore = createSword(geo, mat, 1.12);
      claymore.position.set(0, -0.41, 0.05);
      claymore.rotation.x = Math.PI * 0.38;
      h.rightArm.add(claymore);
      h.rightArm.rotation.set(-0.28, 0, -0.14);
      return { rigParts: h, torsoBaseY };
    }

    // Pawn: Young Elite Garrison Cadet
    const h = buildSculptedWarriorBody(geo, mat, 'young', {
      scale: 0.98,
      hasCoatSkirt: true,
      hasShoulderMantle: true,
      hasBandolier: true,
      hasPauldrons: false,
      torsoMaterial: mat.pawnCoat,
      sleeveMaterial: mat.pawnCoat,
      bracerMaterial: mat.leather,
      thighMaterial: mat.trousers,
      greaveMaterial: mat.leather,
      broadShoulders: 0.9,
      visibleHair: true,
      sweptHair: true,
      auburnHair: Math.sin(phaseOffset * 2.7) > 0.3,
      hairSeed: phaseOffset,
    });
    const blade = createDualScoutSword(geo, mat, 0.84);
    blade.position.set(0, -0.39, 0.04);
    blade.rotation.x = Math.PI * 0.4;
    h.rightArm.add(blade);
    h.rightArm.rotation.set(-0.24, 0, -0.12);
    h.leftArm.rotation.set(-0.18, 0, 0.12);
    return { rigParts: h, torsoBaseY };
  }

  if (characterSet === 'inferno') {
    // SET 3 — INFERNO EMPIRE
    if (type === 'k') {
      const h = buildSculptedWarriorBody(geo, mat, 'king', {
        scale: 1.18,
        hasCape: true,
        capeMaterial: mat.cape,
        torsoMaterial: mat.armorDarkSteel,
        pauldronMaterial: mat.armorPrimary,
        bracerMaterial: mat.armorDarkSteel,
        greaveMaterial: mat.armorPrimary,
        hasMailSkirt: true,
        hasChestCrest: true,
        broadShoulders: 1.14,
        beard: true,
        visibleHair: true,
        hairSeed: phaseOffset,
      });
      const crown = new THREE.Mesh(geo.crownDark, mat.armorTrim);
      crown.scale.setScalar(1.06);
      crown.position.set(0, 0.215, -0.004);
      h.head.add(crown);
      for (const side of [-1, 1]) {
        const horn = new THREE.Mesh(geo.hornedCrest, mat.accentGlow);
        horn.scale.set(side * 0.72, 0.82, 0.82);
        horn.position.set(side * 0.095, 0.21, 0.01);
        h.head.add(horn);
      }
      const flameBlade = createFlameSword(geo, mat, 1.16);
      flameBlade.position.set(0, -0.42, 0.04);
      flameBlade.rotation.x = Math.PI * 0.4;
      h.rightArm.add(flameBlade);
      h.rightArm.rotation.set(-0.34, 0, -0.14);

      const shield = buildHeraldicShield(geo, mat, 'heater');
      shield.scale.setScalar(0.95);
      shield.position.set(0.06, -0.25, 0.08);
      shield.rotation.y = Math.PI * 0.42;
      h.leftArm.add(shield);
      h.leftArm.rotation.set(-0.24, 0, 0.12);
      return { rigParts: h, torsoBaseY };
    }

    if (type === 'q') {
      const h = buildSculptedWarriorBody(geo, mat, 'queen', {
        scale: 1.12,
        hasQueenGown: true,
        hasFemaleCorset: true,
        hasPauldrons: true,
        hasCape: true,
        capeMaterial: mat.cape,
        torsoMaterial: mat.queenGown,
        pauldronMaterial: mat.armorTrim,
        sleeveMaterial: mat.armorDarkSteel,
        bracerMaterial: mat.armorTrim,
        hasChestCrest: true,
        broadShoulders: 0.88,
        longHair: true,
        sweptHair: true,
        auburnHair: true,
        hairSeed: phaseOffset,
      });
      const crown = new THREE.Mesh(geo.crownDark, mat.armorTrim);
      crown.position.set(0, 0.23, 0);
      h.head.add(crown);

      const staff = new THREE.Mesh(geo.staffShaft, mat.armorDarkSteel);
      staff.position.set(0, 0.04, 0.05);
      h.rightArm.add(staff);

      const glaive = new THREE.Mesh(geo.glaiveBlade, mat.accentGlow);
      glaive.position.set(0, 0.74, 0.05);
      glaive.rotation.y = Math.PI * 0.5;
      h.rightArm.add(glaive);

      const crystal = new THREE.Mesh(geo.orbCrystal, mat.gem);
      crystal.scale.set(0.85, 1.35, 0.85);
      crystal.position.set(0, 0.8, 0.05);
      h.rightArm.add(crystal);
      h.rightArm.rotation.set(-0.24, 0, -0.1);
      h.leftArm.rotation.set(0.08, 0, 0.16);
      return { rigParts: { ...h, crystal }, torsoBaseY };
    }

    if (type === 'b') {
      const h = buildSculptedWarriorBody(geo, mat, 'mage', {
        scale: 1.08,
        hasCape: true,
        capeMaterial: mat.cape,
        torsoMaterial: mat.tabard,
        sleeveMaterial: mat.cloth,
        bracerMaterial: mat.armorPrimary,
        thighMaterial: mat.trousers,
        greaveMaterial: mat.armorDarkSteel,
        hasMailSkirt: true,
        hasChestCrest: true,
        broadShoulders: 1.02,
        beard: true,
        visibleHair: true,
        auburnHair: true,
        hairSeed: phaseOffset,
      });
      const hood = new THREE.Mesh(geo.mageHood, mat.crimsonAccent);
      hood.position.set(0, 0.125, -0.01);
      h.head.add(hood);

      const staff = new THREE.Mesh(geo.staffShaft, mat.armorDarkSteel);
      staff.scale.set(1.05, 1.12, 1.05);
      staff.position.set(0, 0.08, 0.06);
      h.rightArm.add(staff);

      const ring = new THREE.Mesh(geo.staffCollarRing, mat.armorTrim);
      ring.position.set(0, 0.82, 0.06);
      h.rightArm.add(ring);

      const crystal = new THREE.Mesh(geo.orbCrystal, mat.accentGlow);
      crystal.scale.setScalar(0.95);
      crystal.position.set(0, 0.84, 0.06);
      h.rightArm.add(crystal);
      h.rightArm.rotation.set(-0.2, 0, -0.1);
      h.leftArm.rotation.set(-0.26, 0, 0.14);
      return { rigParts: { ...h, crystal }, torsoBaseY };
    }

    if (type === 'n') {
      const mounted = buildMountedRiderKnight(geo, mat, phaseOffset, {
        armorMat: mat.armorDarkSteel,
        trimMat: mat.armorTrim,
        capeMat: mat.crimsonAccent,
        hasBarding: true,
        hasHornedHelm: true,
        hasLanceGlow: true,
      });
      return { rigParts: mounted, torsoBaseY: mounted.torsoBaseY };
    }

    if (type === 'r') {
      const h = buildSculptedWarriorBody(geo, mat, 'warrior', {
        scale: 1.12,
        hasHeavyTorso: true,
        torsoMaterial: mat.armorDarkSteel,
        pauldronMaterial: mat.armorPrimary,
        bracerMaterial: mat.armorPrimary,
        greaveMaterial: mat.armorDarkSteel,
        hasMailSkirt: true,
        hasChestCrest: true,
        broadShoulders: 1.26,
        beard: true,
        visibleHair: true,
        hairSeed: phaseOffset,
      });
      const helm = new THREE.Mesh(geo.rookHelm, mat.armorDarkSteel);
      helm.position.set(0, 0.118, -0.004);
      h.head.add(helm);
      for (const side of [-1, 1]) {
        const horn = new THREE.Mesh(geo.hornedCrest, mat.accentGlow);
        horn.scale.set(side * 0.78, 0.78, 0.78);
        horn.position.set(side * 0.11, 0.18, 0);
        h.head.add(horn);
      }
      const shield = buildHeraldicShield(geo, mat, 'tower');
      shield.scale.setScalar(1.06);
      shield.position.set(0.08, -0.22, 0.12);
      shield.rotation.y = Math.PI * 0.36;
      h.leftArm.add(shield);
      h.leftArm.rotation.set(-0.34, 0, 0.1);

      const hammer = createWarhammer(geo, mat, 1.05);
      hammer.position.set(0, -0.25, 0.08);
      hammer.rotation.x = Math.PI * 0.38;
      h.rightArm.add(hammer);
      h.rightArm.rotation.set(-0.28, 0, -0.14);
      return { rigParts: h, torsoBaseY };
    }

    // Inferno Pawn
    const h = buildSculptedWarriorBody(geo, mat, 'young', {
      scale: 0.99,
      hasMailSkirt: true,
      torsoMaterial: mat.armorDarkSteel,
      sleeveMaterial: mat.cloth,
      bracerMaterial: mat.armorPrimary,
      thighMaterial: mat.trousers,
      greaveMaterial: mat.armorDarkSteel,
      broadShoulders: 0.96,
      visibleHair: true,
      hairSeed: phaseOffset,
    });
    const helm = new THREE.Mesh(geo.pawnHelm, mat.armorDarkSteel);
    helm.position.set(0, 0.118, -0.004);
    h.head.add(helm);

    const sword = createFlameSword(geo, mat, 0.82);
    sword.position.set(0, -0.4, 0.04);
    sword.rotation.x = Math.PI * 0.4;
    h.rightArm.add(sword);
    h.rightArm.rotation.set(-0.24, 0, -0.12);

    const buckler = buildHeraldicShield(geo, mat, 'round');
    buckler.scale.setScalar(0.78);
    buckler.position.set(0.055, -0.24, 0.075);
    buckler.rotation.y = Math.PI * 0.42;
    h.leftArm.add(buckler);
    h.leftArm.rotation.set(-0.28, 0, 0.1);
    return { rigParts: h, torsoBaseY };
  }

  if (characterSet === 'shadow') {
    // SET 4 — SHADOW DOMINION
    if (type === 'k') {
      const h = buildSculptedWarriorBody(geo, mat, 'king', {
        scale: 1.17,
        hasCape: true,
        capeMaterial: mat.cape,
        torsoMaterial: mat.armorDarkSteel,
        pauldronMaterial: mat.armorPrimary,
        bracerMaterial: mat.armorDarkSteel,
        greaveMaterial: mat.armorPrimary,
        hasMailSkirt: true,
        hasChestCrest: true,
        broadShoulders: 1.12,
        beard: true,
        visibleHair: true,
        silverHair: color === 'w',
        hairSeed: phaseOffset,
      });
      const dreadCrown = new THREE.Mesh(geo.crownDark, mat.armorTrim);
      dreadCrown.scale.setScalar(1.06);
      dreadCrown.position.set(0, 0.215, -0.004);
      h.head.add(dreadCrown);

      const soulGem = new THREE.Mesh(geo.orbCrystal, mat.accentGlow);
      soulGem.scale.setScalar(0.42);
      soulGem.position.set(0, 0.26, 0.115);
      h.head.add(soulGem);

      const dreadBlade = createFlameSword(geo, mat, 1.15);
      dreadBlade.position.set(0, -0.42, 0.04);
      dreadBlade.rotation.x = Math.PI * 0.4;
      h.rightArm.add(dreadBlade);
      h.rightArm.rotation.set(-0.34, 0, -0.14);

      const shield = buildHeraldicShield(geo, mat, 'heater');
      shield.scale.setScalar(0.94);
      shield.position.set(0.06, -0.25, 0.08);
      shield.rotation.y = Math.PI * 0.42;
      h.leftArm.add(shield);
      h.leftArm.rotation.set(-0.22, 0, 0.12);
      return { rigParts: h, torsoBaseY };
    }

    if (type === 'q') {
      // Shadow Assassin Queen with Dual Shadow Blades
      const h = buildSculptedWarriorBody(geo, mat, 'queen', {
        scale: 1.11,
        hasQueenGown: true,
        hasFemaleCorset: true,
        hasPauldrons: false,
        hasCape: true,
        capeMaterial: mat.cape,
        torsoMaterial: mat.queenGown,
        sleeveMaterial: mat.armorDarkSteel,
        bracerMaterial: mat.armorTrim,
        hasChestCrest: true,
        broadShoulders: 0.86,
        longHair: true,
        sweptHair: true,
        silverHair: color === 'w',
        hairSeed: phaseOffset,
      });
      const collar = new THREE.Mesh(geo.highRoyalCollar, mat.armorDarkSteel);
      collar.position.set(0, 0.415, -0.01);
      h.torso.add(collar);

      const circlet = new THREE.Mesh(geo.queenDiadem, mat.armorTrim);
      circlet.rotation.x = Math.PI / 2;
      circlet.position.set(0, 0.23, 0);
      h.head.add(circlet);

      const crystal = new THREE.Mesh(geo.orbCrystal, mat.accentGlow);
      crystal.scale.setScalar(0.45);
      crystal.position.set(0, 0.27, 0.105);
      h.head.add(crystal);

      const rDagger = createDualScoutSword(geo, mat, 0.98, true);
      rDagger.position.set(0, -0.39, 0.04);
      rDagger.rotation.x = Math.PI * 0.42;
      h.rightArm.add(rDagger);
      h.rightArm.rotation.set(-0.34, 0, -0.16);

      const lDagger = createDualScoutSword(geo, mat, 0.95, true);
      lDagger.position.set(0, -0.39, 0.04);
      lDagger.rotation.x = Math.PI * 0.42;
      h.leftArm.add(lDagger);
      h.leftArm.rotation.set(-0.3, 0, 0.16);
      return { rigParts: { ...h, crystal }, torsoBaseY };
    }

    if (type === 'b') {
      // Hooded Void Necromancer with Soul-Crystal Staff
      const h = buildSculptedWarriorBody(geo, mat, 'mage', {
        scale: 1.08,
        hasCape: true,
        capeMaterial: mat.cape,
        torsoMaterial: mat.tabard,
        sleeveMaterial: mat.cloth,
        bracerMaterial: mat.armorDarkSteel,
        thighMaterial: mat.trousers,
        greaveMaterial: mat.armorDarkSteel,
        hasMailSkirt: true,
        broadShoulders: 1.0,
        visibleHair: false,
      });
      const hood = new THREE.Mesh(geo.mageHood, mat.cape);
      hood.position.set(0, 0.125, -0.01);
      h.head.add(hood);

      const staff = new THREE.Mesh(geo.staffShaft, mat.armorDarkSteel);
      staff.scale.set(1.02, 1.12, 1.02);
      staff.position.set(0, 0.08, 0.06);
      h.rightArm.add(staff);

      const crown = new THREE.Mesh(geo.staffCollarRing, mat.armorTrim);
      crown.position.set(0, 0.82, 0.06);
      h.rightArm.add(crown);

      const crystal = new THREE.Mesh(geo.orbCrystal, mat.accentGlow);
      crystal.scale.set(0.95, 1.25, 0.95);
      crystal.position.set(0, 0.85, 0.06);
      h.rightArm.add(crystal);
      h.rightArm.rotation.set(-0.2, 0, -0.1);
      h.leftArm.rotation.set(-0.24, 0, 0.14);
      return { rigParts: { ...h, crystal }, torsoBaseY };
    }

    if (type === 'n') {
      const mounted = buildMountedRiderKnight(geo, mat, phaseOffset, {
        armorMat: mat.armorDarkSteel,
        trimMat: mat.armorTrim,
        capeMat: mat.cape,
        hasBarding: true,
        hasPlume: true,
        hasLanceGlow: true,
      });
      return { rigParts: mounted, torsoBaseY: mounted.torsoBaseY };
    }

    if (type === 'r') {
      // Crypt Guardian with Reaper Halberd & Horned Dread Helm
      const h = buildSculptedWarriorBody(geo, mat, 'warrior', {
        scale: 1.11,
        hasHeavyTorso: true,
        torsoMaterial: mat.armorDarkSteel,
        pauldronMaterial: mat.armorPrimary,
        bracerMaterial: mat.armorDarkSteel,
        greaveMaterial: mat.armorPrimary,
        hasMailSkirt: true,
        hasChestCrest: true,
        broadShoulders: 1.24,
        visibleHair: true,
        hairSeed: phaseOffset,
      });
      const helm = new THREE.Mesh(geo.rookHelm, mat.armorDarkSteel);
      helm.position.set(0, 0.118, -0.004);
      h.head.add(helm);
      for (const side of [-1, 1]) {
        const horn = new THREE.Mesh(geo.hornedCrest, mat.armorTrim);
        horn.scale.set(side * 0.75, 0.78, 0.78);
        horn.position.set(side * 0.1, 0.19, 0);
        h.head.add(horn);
      }

      const shield = buildHeraldicShield(geo, mat, 'tower');
      shield.scale.setScalar(1.06);
      shield.position.set(0.08, -0.22, 0.12);
      shield.rotation.y = Math.PI * 0.36;
      h.leftArm.add(shield);
      h.leftArm.rotation.set(-0.34, 0, 0.1);

      const haft = new THREE.Mesh(geo.staffShaft, mat.armorDarkSteel);
      haft.scale.set(1.06, 0.85, 1.06);
      haft.position.set(0, -0.22, 0.06);
      haft.rotation.x = Math.PI * 0.36;
      h.rightArm.add(haft);

      const reaper = new THREE.Mesh(geo.axeHead, mat.weaponBlade);
      reaper.position.set(0, -0.22, 0.46);
      reaper.rotation.y = Math.PI / 2;
      h.rightArm.add(reaper);
      h.rightArm.rotation.set(-0.28, 0, -0.14);
      return { rigParts: h, torsoBaseY };
    }

    // Shadow Pawn: Hooded Dark Footman
    const h = buildSculptedWarriorBody(geo, mat, 'young', {
      scale: 0.98,
      hasCoatSkirt: true,
      hasShoulderMantle: true,
      hasBandolier: true,
      hasPauldrons: false,
      torsoMaterial: mat.pawnCoat,
      sleeveMaterial: mat.pawnCoat,
      bracerMaterial: mat.armorDarkSteel,
      thighMaterial: mat.trousers,
      greaveMaterial: mat.leather,
      broadShoulders: 0.92,
      visibleHair: false,
    });
    const hood = new THREE.Mesh(geo.mageHood, mat.cape);
    hood.position.set(0, 0.125, -0.01);
    h.head.add(hood);

    const sword = createDualScoutSword(geo, mat, 0.86);
    sword.position.set(0, -0.4, 0.04);
    sword.rotation.x = Math.PI * 0.4;
    h.rightArm.add(sword);
    h.rightArm.rotation.set(-0.22, 0, -0.12);

    const buckler = buildHeraldicShield(geo, mat, 'round');
    buckler.scale.setScalar(0.76);
    buckler.position.set(0.055, -0.24, 0.075);
    buckler.rotation.y = Math.PI * 0.42;
    h.leftArm.add(buckler);
    h.leftArm.rotation.set(-0.28, 0, 0.1);
    return { rigParts: h, torsoBaseY };
  }

  if (characterSet === 'frostguard') {
    // SET 6 — FROSTBORN CITADEL (Glacier Warlords, Frostmancers & Arctic Cavalry)
    if (type === 'k') {
      const h = buildSculptedWarriorBody(geo, mat, 'king', {
        scale: 1.18,
        hasCape: true,
        capeMaterial: mat.cape,
        torsoMaterial: mat.armorPrimary,
        pauldronMaterial: mat.armorTrim,
        bracerMaterial: mat.armorDarkSteel,
        greaveMaterial: mat.armorPrimary,
        hasHeavyTorso: true,
        hasMailSkirt: true,
        hasChestCrest: true,
        broadShoulders: 1.18,
        beard: true,
        visibleHair: true,
        silverHair: true,
        hairSeed: phaseOffset,
      });
      const furMantle = new THREE.Mesh(geo.furMantle, mat.furTrim);
      furMantle.position.set(0, 0.43, -0.02);
      furMantle.scale.set(1.08, 1.0, 1.08);
      h.torso.add(furMantle);

      const crown = new THREE.Mesh(geo.kingCrownHelm, mat.armorTrim);
      crown.scale.setScalar(1.04);
      crown.position.set(0, 0.12, -0.004);
      h.head.add(crown);

      const blade = createFlameSword(geo, mat, 1.16);
      blade.position.set(0, -0.42, 0.04);
      blade.rotation.x = Math.PI * 0.4;
      h.rightArm.add(blade);
      h.rightArm.rotation.set(-0.34, 0, -0.14);

      const shield = buildHeraldicShield(geo, mat, 'heater');
      shield.scale.setScalar(0.98);
      shield.position.set(0.06, -0.25, 0.08);
      shield.rotation.y = Math.PI * 0.42;
      h.leftArm.add(shield);
      h.leftArm.rotation.set(-0.24, 0, 0.12);
      return { rigParts: h, torsoBaseY };
    }

    if (type === 'q') {
      const h = buildSculptedWarriorBody(geo, mat, 'queen', {
        scale: 1.12,
        hasQueenGown: true,
        hasFemaleCorset: true,
        hasPauldrons: false,
        hasCape: true,
        capeMaterial: mat.cape,
        torsoMaterial: mat.queenGown,
        sleeveMaterial: mat.armorPrimary,
        bracerMaterial: mat.armorTrim,
        hasChestCrest: true,
        broadShoulders: 0.88,
        longHair: true,
        sweptHair: true,
        silverHair: true,
        hairSeed: phaseOffset,
      });
      const furMantle = new THREE.Mesh(geo.furMantle, mat.furTrim);
      furMantle.position.set(0, 0.4, -0.02);
      furMantle.scale.set(0.86, 0.84, 0.86);
      h.torso.add(furMantle);

      const diadem = new THREE.Mesh(geo.queenDiadem, mat.armorTrim);
      diadem.rotation.x = Math.PI / 2;
      diadem.position.set(0, 0.23, 0);
      h.head.add(diadem);

      const staff = new THREE.Mesh(geo.staffShaft, mat.armorTrim);
      staff.position.set(0, 0.04, 0.05);
      h.rightArm.add(staff);

      const glaive = new THREE.Mesh(geo.glaiveBlade, mat.weaponBlade);
      glaive.position.set(0, 0.74, 0.05);
      glaive.rotation.y = Math.PI * 0.5;
      h.rightArm.add(glaive);

      const crystal = new THREE.Mesh(geo.orbCrystal, mat.accentGlow);
      crystal.scale.set(0.9, 1.35, 0.9);
      crystal.position.set(0, 0.82, 0.05);
      h.rightArm.add(crystal);
      h.rightArm.rotation.set(-0.24, 0, -0.1);
      h.leftArm.rotation.set(0.08, 0, 0.16);
      return { rigParts: { ...h, crystal }, torsoBaseY };
    }

    if (type === 'b') {
      const h = buildSculptedWarriorBody(geo, mat, 'mage', {
        scale: 1.08,
        hasCape: true,
        capeMaterial: mat.cape,
        torsoMaterial: mat.tabard,
        sleeveMaterial: mat.cloth,
        bracerMaterial: mat.armorPrimary,
        thighMaterial: mat.trousers,
        greaveMaterial: mat.armorDarkSteel,
        hasMailSkirt: true,
        hasChestCrest: true,
        broadShoulders: 1.0,
        beard: true,
        visibleHair: true,
        silverHair: true,
        hairSeed: phaseOffset,
      });
      const cowl = new THREE.Mesh(geo.mageHood, mat.furTrim);
      cowl.position.set(0, 0.125, -0.01);
      h.head.add(cowl);

      const staff = new THREE.Mesh(geo.staffShaft, mat.armorDarkSteel);
      staff.scale.set(1.04, 1.12, 1.04);
      staff.position.set(0, 0.08, 0.06);
      h.rightArm.add(staff);

      const ring = new THREE.Mesh(geo.staffCollarRing, mat.armorTrim);
      ring.position.set(0, 0.82, 0.06);
      h.rightArm.add(ring);

      const crystal = new THREE.Mesh(geo.orbCrystal, mat.accentGlow);
      crystal.scale.set(0.95, 1.2, 0.95);
      crystal.position.set(0, 0.85, 0.06);
      h.rightArm.add(crystal);
      h.rightArm.rotation.set(-0.2, 0, -0.1);
      h.leftArm.rotation.set(-0.26, 0, 0.14);
      return { rigParts: { ...h, crystal }, torsoBaseY };
    }

    if (type === 'n') {
      const mounted = buildMountedRiderKnight(geo, mat, phaseOffset, {
        armorMat: mat.armorPrimary,
        trimMat: mat.armorTrim,
        capeMat: mat.cape,
        hasBarding: true,
        hasHornedHelm: true,
        hasLanceGlow: true,
      });
      return { rigParts: mounted, torsoBaseY: mounted.torsoBaseY };
    }

    if (type === 'r') {
      const h = buildSculptedWarriorBody(geo, mat, 'warrior', {
        scale: 1.13,
        hasHeavyTorso: true,
        torsoMaterial: mat.armorDarkSteel,
        pauldronMaterial: mat.armorPrimary,
        bracerMaterial: mat.armorPrimary,
        greaveMaterial: mat.armorDarkSteel,
        hasMailSkirt: true,
        hasChestCrest: true,
        broadShoulders: 1.25,
        beard: true,
        visibleHair: true,
        silverHair: true,
        hairSeed: phaseOffset,
      });
      const helm = new THREE.Mesh(geo.rookHelm, mat.armorPrimary);
      helm.position.set(0, 0.118, -0.004);
      h.head.add(helm);

      const shield = buildHeraldicShield(geo, mat, 'tower');
      shield.scale.setScalar(1.08);
      shield.position.set(0.08, -0.22, 0.12);
      shield.rotation.y = Math.PI * 0.36;
      h.leftArm.add(shield);
      h.leftArm.rotation.set(-0.34, 0, 0.1);

      const hammer = createWarhammer(geo, mat, 1.08);
      hammer.position.set(0, -0.25, 0.08);
      hammer.rotation.x = Math.PI * 0.38;
      h.rightArm.add(hammer);
      h.rightArm.rotation.set(-0.28, 0, -0.14);
      return { rigParts: h, torsoBaseY };
    }

    // Frostguard Pawn: Fur-Trimmed Glacier Footman
    const h = buildSculptedWarriorBody(geo, mat, 'young', {
      scale: 0.99,
      hasMailSkirt: true,
      torsoMaterial: mat.pawnCoat,
      sleeveMaterial: mat.cloth,
      bracerMaterial: mat.armorPrimary,
      thighMaterial: mat.trousers,
      greaveMaterial: mat.armorDarkSteel,
      broadShoulders: 0.96,
      visibleHair: true,
      silverHair: true,
      hairSeed: phaseOffset,
    });
    const furCollar = new THREE.Mesh(geo.furMantle, mat.furTrim);
    furCollar.position.set(0, 0.39, -0.01);
    furCollar.scale.set(0.82, 0.78, 0.82);
    h.torso.add(furCollar);

    const helm = new THREE.Mesh(geo.pawnHelm, mat.armorPrimary);
    helm.position.set(0, 0.118, -0.004);
    h.head.add(helm);

    const axeHaft = new THREE.Mesh(geo.staffShaft, mat.wood);
    axeHaft.scale.set(0.9, 0.56, 0.9);
    axeHaft.position.set(0, -0.28, 0.05);
    axeHaft.rotation.x = Math.PI * 0.38;
    h.rightArm.add(axeHaft);

    const axe = new THREE.Mesh(geo.axeHead, mat.weaponBlade);
    axe.scale.setScalar(0.8);
    axe.position.set(0, -0.26, 0.36);
    axe.rotation.y = Math.PI / 2;
    h.rightArm.add(axe);
    h.rightArm.rotation.set(-0.24, 0, -0.12);

    const buckler = buildHeraldicShield(geo, mat, 'round');
    buckler.scale.setScalar(0.8);
    buckler.position.set(0.055, -0.24, 0.075);
    buckler.rotation.y = Math.PI * 0.42;
    h.leftArm.add(buckler);
    h.leftArm.rotation.set(-0.28, 0, 0.1);
    return { rigParts: h, torsoBaseY };
  }

  if (characterSet === 'sylvan') {
    // SET 7 — SYLVAN ELDERWOOD (Grove Wardens, Dual-Blade Huntress & Druidic Casters)
    if (type === 'k') {
      const h = buildSculptedWarriorBody(geo, mat, 'king', {
        scale: 1.16,
        hasCape: true,
        capeMaterial: mat.cape,
        torsoMaterial: mat.royalTabard,
        pauldronMaterial: mat.armorTrim,
        bracerMaterial: mat.armorPrimary,
        greaveMaterial: mat.armorDarkSteel,
        hasMailSkirt: true,
        hasChestCrest: true,
        broadShoulders: 1.1,
        beard: true,
        visibleHair: true,
        auburnHair: color === 'b',
        silverHair: color === 'w',
        hairSeed: phaseOffset,
      });
      const crown = new THREE.Mesh(geo.crownRoyal, mat.armorTrim);
      crown.scale.setScalar(1.02);
      crown.position.set(0, 0.215, -0.004);
      h.head.add(crown);

      for (const side of [-1, 1]) {
        const antlerCrest = new THREE.Mesh(geo.hornedCrest, mat.armorTrim);
        antlerCrest.scale.set(side * 0.68, 0.85, 0.72);
        antlerCrest.position.set(side * 0.09, 0.22, 0.01);
        h.head.add(antlerCrest);
      }

      const sword = createSword(geo, mat, 1.14);
      sword.position.set(0, -0.42, 0.04);
      sword.rotation.x = Math.PI * 0.4;
      h.rightArm.add(sword);
      h.rightArm.rotation.set(-0.32, 0, -0.14);

      const shield = buildHeraldicShield(geo, mat, 'round');
      shield.scale.setScalar(0.94);
      shield.position.set(0.06, -0.25, 0.08);
      shield.rotation.y = Math.PI * 0.42;
      h.leftArm.add(shield);
      h.leftArm.rotation.set(-0.22, 0, 0.12);
      return { rigParts: h, torsoBaseY };
    }

    if (type === 'q') {
      // Thornward Huntress: Agile Dual-Blade Ranger Queen
      const h = buildSculptedWarriorBody(geo, mat, 'queen', {
        scale: 1.1,
        hasQueenGown: true,
        hasFemaleCorset: true,
        hasPauldrons: false,
        hasCape: true,
        capeMaterial: mat.cape,
        torsoMaterial: mat.queenGown,
        sleeveMaterial: mat.cloth,
        bracerMaterial: mat.armorTrim,
        hasBandolier: true,
        hasChestCrest: true,
        broadShoulders: 0.86,
        longHair: true,
        sweptHair: true,
        auburnHair: true,
        hairSeed: phaseOffset,
      });
      const diadem = new THREE.Mesh(geo.queenDiadem, mat.armorTrim);
      diadem.rotation.x = Math.PI / 2;
      diadem.position.set(0, 0.23, 0);
      h.head.add(diadem);

      const rBlade = createDualScoutSword(geo, mat, 1.0, true);
      rBlade.position.set(0, -0.39, 0.04);
      rBlade.rotation.x = Math.PI * 0.42;
      h.rightArm.add(rBlade);
      h.rightArm.rotation.set(-0.34, 0, -0.18);

      const lBlade = createDualScoutSword(geo, mat, 0.96, true);
      lBlade.position.set(0, -0.39, 0.04);
      lBlade.rotation.x = Math.PI * 0.44;
      h.leftArm.add(lBlade);
      h.leftArm.rotation.set(-0.3, 0, 0.18);
      return { rigParts: h, torsoBaseY };
    }

    if (type === 'b') {
      const h = buildSculptedWarriorBody(geo, mat, 'mage', {
        scale: 1.08,
        hasCape: true,
        capeMaterial: mat.cape,
        torsoMaterial: mat.tabard,
        sleeveMaterial: mat.cloth,
        bracerMaterial: mat.leather,
        thighMaterial: mat.trousers,
        greaveMaterial: mat.leather,
        hasMailSkirt: true,
        broadShoulders: 0.98,
        beard: true,
        visibleHair: true,
        silverHair: color === 'w',
        hairSeed: phaseOffset,
      });
      const cowl = new THREE.Mesh(geo.pushedBackCowl, mat.cape);
      cowl.position.set(0, 0.11, -0.03);
      h.head.add(cowl);

      const staff = new THREE.Mesh(geo.staffShaft, mat.wood);
      staff.scale.set(1.06, 1.12, 1.06);
      staff.position.set(0, 0.08, 0.06);
      h.rightArm.add(staff);

      const ring = new THREE.Mesh(geo.staffCollarRing, mat.armorTrim);
      ring.position.set(0, 0.82, 0.06);
      h.rightArm.add(ring);

      const crystal = new THREE.Mesh(geo.orbCrystal, mat.accentGlow);
      crystal.scale.set(0.95, 1.25, 0.95);
      crystal.position.set(0, 0.85, 0.06);
      h.rightArm.add(crystal);
      h.rightArm.rotation.set(-0.2, 0, -0.1);
      h.leftArm.rotation.set(-0.24, 0, 0.14);
      return { rigParts: { ...h, crystal }, torsoBaseY };
    }

    if (type === 'n') {
      const mounted = buildMountedRiderKnight(geo, mat, phaseOffset, {
        armorMat: mat.armorPrimary,
        trimMat: mat.armorTrim,
        capeMat: mat.cape,
        hasBarding: true,
        hasPlume: true,
        hasLanceGlow: true,
      });
      return { rigParts: mounted, torsoBaseY: mounted.torsoBaseY };
    }

    if (type === 'r') {
      const h = buildSculptedWarriorBody(geo, mat, 'warrior', {
        scale: 1.12,
        hasHeavyTorso: true,
        torsoMaterial: mat.armorPrimary,
        pauldronMaterial: mat.armorTrim,
        bracerMaterial: mat.armorPrimary,
        greaveMaterial: mat.armorDarkSteel,
        hasMailSkirt: true,
        hasChestCrest: true,
        broadShoulders: 1.22,
        beard: true,
        visibleHair: true,
        hairSeed: phaseOffset,
      });
      const helm = new THREE.Mesh(geo.knightHelm, mat.armorPrimary);
      helm.position.set(0, 0.12, -0.004);
      h.head.add(helm);

      const shield = buildHeraldicShield(geo, mat, 'tower');
      shield.scale.setScalar(1.05);
      shield.position.set(0.08, -0.22, 0.12);
      shield.rotation.y = Math.PI * 0.36;
      h.leftArm.add(shield);
      h.leftArm.rotation.set(-0.34, 0, 0.1);

      const haft = new THREE.Mesh(geo.staffShaft, mat.wood);
      haft.scale.set(1.04, 0.86, 1.04);
      haft.position.set(0, -0.22, 0.06);
      haft.rotation.x = Math.PI * 0.36;
      h.rightArm.add(haft);

      const spear = new THREE.Mesh(geo.spearHalberdHead, mat.weaponBlade);
      spear.position.set(0, -0.22, 0.56);
      spear.rotation.x = Math.PI * 0.5;
      h.rightArm.add(spear);
      h.rightArm.rotation.set(-0.28, 0, -0.14);
      return { rigParts: h, torsoBaseY };
    }

    // Sylvan Pawn: Forest Scout
    const h = buildSculptedWarriorBody(geo, mat, 'young', {
      scale: 0.97,
      hasCoatSkirt: true,
      hasShoulderMantle: true,
      hasBandolier: true,
      hasPauldrons: false,
      torsoMaterial: mat.pawnCoat,
      sleeveMaterial: mat.cloth,
      bracerMaterial: mat.leather,
      thighMaterial: mat.trousers,
      greaveMaterial: mat.leather,
      broadShoulders: 0.92,
      visibleHair: true,
      auburnHair: Math.sin(phaseOffset * 3.1) > 0,
      hairSeed: phaseOffset,
    });
    const blade = createDualScoutSword(geo, mat, 0.88);
    blade.position.set(0, -0.4, 0.04);
    blade.rotation.x = Math.PI * 0.4;
    h.rightArm.add(blade);
    h.rightArm.rotation.set(-0.24, 0, -0.12);

    const buckler = buildHeraldicShield(geo, mat, 'round');
    buckler.scale.setScalar(0.76);
    buckler.position.set(0.055, -0.24, 0.075);
    buckler.rotation.y = Math.PI * 0.42;
    h.leftArm.add(buckler);
    h.leftArm.rotation.set(-0.28, 0, 0.1);
    return { rigParts: h, torsoBaseY };
  }

  if (characterSet === 'storm') {
    // SET 8 — TEMPEST VALKYRIE (Thunder Sovereigns, Dual-Blade Skybreaker & Storm Lancers)
    if (type === 'k') {
      const h = buildSculptedWarriorBody(geo, mat, 'king', {
        scale: 1.17,
        hasCape: true,
        capeMaterial: mat.cape,
        torsoMaterial: mat.armorPrimary,
        pauldronMaterial: mat.armorTrim,
        bracerMaterial: mat.armorPrimary,
        greaveMaterial: mat.armorTrim,
        hasMailSkirt: true,
        hasChestCrest: true,
        broadShoulders: 1.14,
        beard: true,
        visibleHair: true,
        silverHair: color === 'w',
        hairSeed: phaseOffset,
      });
      const crown = new THREE.Mesh(geo.crownRoyal, mat.armorTrim);
      crown.scale.setScalar(1.06);
      crown.position.set(0, 0.215, -0.004);
      h.head.add(crown);

      const halo = new THREE.Mesh(geo.celestialHalo, mat.accentGlow);
      halo.scale.setScalar(0.95);
      halo.position.set(0, 0.62, -0.14);
      h.torso.add(halo);

      const stormBlade = createFlameSword(geo, mat, 1.16);
      stormBlade.position.set(0, -0.42, 0.04);
      stormBlade.rotation.x = Math.PI * 0.4;
      h.rightArm.add(stormBlade);
      h.rightArm.rotation.set(-0.34, 0, -0.14);

      const shield = buildHeraldicShield(geo, mat, 'heater');
      shield.scale.setScalar(0.96);
      shield.position.set(0.06, -0.25, 0.08);
      shield.rotation.y = Math.PI * 0.42;
      h.leftArm.add(shield);
      h.leftArm.rotation.set(-0.22, 0, 0.12);
      return { rigParts: h, torsoBaseY };
    }

    if (type === 'q') {
      // Skybreaker Empress: Dual-Wield Valkyrie Blades + Storm Halo
      const h = buildSculptedWarriorBody(geo, mat, 'queen', {
        scale: 1.12,
        hasQueenGown: true,
        hasFemaleCorset: true,
        hasPauldrons: true,
        hasCape: true,
        capeMaterial: mat.cape,
        torsoMaterial: mat.queenGown,
        pauldronMaterial: mat.armorTrim,
        sleeveMaterial: mat.armorPrimary,
        bracerMaterial: mat.armorTrim,
        hasChestCrest: true,
        broadShoulders: 0.9,
        longHair: true,
        sweptHair: true,
        silverHair: color === 'w',
        hairSeed: phaseOffset,
      });
      const halo = new THREE.Mesh(geo.celestialHalo, mat.accentGlow);
      halo.scale.setScalar(0.84);
      halo.position.set(0, 0.56, -0.13);
      h.torso.add(halo);

      const diadem = new THREE.Mesh(geo.queenDiadem, mat.armorTrim);
      diadem.rotation.x = Math.PI / 2;
      diadem.position.set(0, 0.23, 0);
      h.head.add(diadem);

      const rBlade = createDualScoutSword(geo, mat, 1.0, true);
      rBlade.position.set(0, -0.39, 0.04);
      rBlade.rotation.x = Math.PI * 0.42;
      h.rightArm.add(rBlade);
      h.rightArm.rotation.set(-0.34, 0, -0.18);

      const lBlade = createDualScoutSword(geo, mat, 0.98, true);
      lBlade.position.set(0, -0.39, 0.04);
      lBlade.rotation.x = Math.PI * 0.44;
      h.leftArm.add(lBlade);
      h.leftArm.rotation.set(-0.3, 0, 0.18);
      return { rigParts: h, torsoBaseY };
    }

    if (type === 'b') {
      const h = buildSculptedWarriorBody(geo, mat, 'mage', {
        scale: 1.09,
        hasCape: true,
        capeMaterial: mat.cape,
        torsoMaterial: mat.tabard,
        sleeveMaterial: mat.cloth,
        bracerMaterial: mat.armorTrim,
        thighMaterial: mat.trousers,
        greaveMaterial: mat.armorPrimary,
        hasMailSkirt: true,
        hasChestCrest: true,
        broadShoulders: 1.02,
        visibleHair: true,
        silverHair: color === 'w',
        hairSeed: phaseOffset,
      });
      const mitre = new THREE.Mesh(geo.bishopMitre, mat.armorTrim);
      mitre.scale.setScalar(0.92);
      mitre.position.set(0, 0.225, -0.01);
      h.head.add(mitre);

      const staff = new THREE.Mesh(geo.staffShaft, mat.armorTrim);
      staff.scale.set(1.05, 1.12, 1.05);
      staff.position.set(0, 0.08, 0.06);
      h.rightArm.add(staff);

      const ring = new THREE.Mesh(geo.staffCollarRing, mat.armorTrim);
      ring.position.set(0, 0.83, 0.06);
      h.rightArm.add(ring);

      const crystal = new THREE.Mesh(geo.orbCrystal, mat.accentGlow);
      crystal.scale.set(0.95, 1.3, 0.95);
      crystal.position.set(0, 0.85, 0.06);
      h.rightArm.add(crystal);
      h.rightArm.rotation.set(-0.18, 0, -0.1);
      h.leftArm.rotation.set(-0.28, 0, 0.14);
      return { rigParts: { ...h, crystal }, torsoBaseY };
    }

    if (type === 'n') {
      const mounted = buildMountedRiderKnight(geo, mat, phaseOffset, {
        armorMat: mat.armorPrimary,
        trimMat: mat.armorTrim,
        capeMat: mat.cape,
        hasBarding: true,
        hasPlume: true,
        hasLanceGlow: true,
      });
      return { rigParts: mounted, torsoBaseY: mounted.torsoBaseY };
    }

    if (type === 'r') {
      const h = buildSculptedWarriorBody(geo, mat, 'warrior', {
        scale: 1.11,
        hasHeavyTorso: true,
        torsoMaterial: mat.armorPrimary,
        pauldronMaterial: mat.armorTrim,
        bracerMaterial: mat.armorPrimary,
        greaveMaterial: mat.armorDarkSteel,
        hasMailSkirt: true,
        hasChestCrest: true,
        broadShoulders: 1.24,
        beard: true,
        visibleHair: true,
        silverHair: color === 'w',
        hairSeed: phaseOffset,
      });
      const helm = new THREE.Mesh(geo.spartanHelm, mat.armorTrim);
      helm.position.set(0, 0.118, -0.004);
      h.head.add(helm);

      const shield = buildHeraldicShield(geo, mat, 'tower');
      shield.scale.setScalar(1.06);
      shield.position.set(0.08, -0.22, 0.12);
      shield.rotation.y = Math.PI * 0.36;
      h.leftArm.add(shield);
      h.leftArm.rotation.set(-0.34, 0, 0.1);

      const hammer = createWarhammer(geo, mat, 1.06);
      hammer.position.set(0, -0.25, 0.08);
      hammer.rotation.x = Math.PI * 0.38;
      h.rightArm.add(hammer);
      h.rightArm.rotation.set(-0.28, 0, -0.14);
      return { rigParts: h, torsoBaseY };
    }

    // Storm Pawn: Tempest Lancer
    const h = buildSculptedWarriorBody(geo, mat, 'young', {
      scale: 0.99,
      hasMailSkirt: true,
      torsoMaterial: mat.pawnCoat,
      sleeveMaterial: mat.cloth,
      bracerMaterial: mat.armorTrim,
      thighMaterial: mat.trousers,
      greaveMaterial: mat.armorPrimary,
      broadShoulders: 0.96,
      visibleHair: true,
      hairSeed: phaseOffset,
    });
    const helm = new THREE.Mesh(geo.pawnHelm, mat.armorPrimary);
    helm.position.set(0, 0.118, -0.004);
    h.head.add(helm);

    const blade = createDualScoutSword(geo, mat, 0.88, true);
    blade.position.set(0, -0.4, 0.04);
    blade.rotation.x = Math.PI * 0.4;
    h.rightArm.add(blade);
    h.rightArm.rotation.set(-0.22, 0, -0.12);

    const shield = buildHeraldicShield(geo, mat, 'round');
    shield.scale.setScalar(0.78);
    shield.position.set(0.055, -0.24, 0.075);
    shield.rotation.y = Math.PI * 0.42;
    h.leftArm.add(shield);
    h.leftArm.rotation.set(-0.28, 0, 0.1);
    return { rigParts: h, torsoBaseY };
  }

  // SET 5 — CELESTIAL KINGDOM
  if (type === 'k') {
    const h = buildSculptedWarriorBody(geo, mat, 'king', {
      scale: 1.17,
      hasCape: true,
      capeMaterial: mat.cape,
      torsoMaterial: mat.armorPrimary,
      pauldronMaterial: mat.armorTrim,
      bracerMaterial: mat.armorPrimary,
      greaveMaterial: mat.armorTrim,
      hasMailSkirt: true,
      hasChestCrest: true,
      broadShoulders: 1.1,
      beard: true,
      visibleHair: true,
      silverHair: color === 'w',
      hairSeed: phaseOffset,
    });
    const crown = new THREE.Mesh(geo.crownRoyal, mat.armorTrim);
    crown.scale.setScalar(1.04);
    crown.position.set(0, 0.215, -0.004);
    h.head.add(crown);

    const halo = new THREE.Mesh(geo.celestialHalo, mat.accentGlow);
    halo.position.set(0, 0.62, -0.14);
    h.torso.add(halo);

    const sword = createSword(geo, mat, 1.16);
    sword.position.set(0, -0.42, 0.04);
    sword.rotation.x = Math.PI * 0.4;
    h.rightArm.add(sword);
    h.rightArm.rotation.set(-0.34, 0, -0.14);

    const shield = buildHeraldicShield(geo, mat, 'round');
    shield.scale.setScalar(0.96);
    shield.position.set(0.06, -0.25, 0.08);
    shield.rotation.y = Math.PI * 0.42;
    h.leftArm.add(shield);
    h.leftArm.rotation.set(-0.22, 0, 0.12);
    return { rigParts: h, torsoBaseY };
  }

  if (type === 'q') {
    const h = buildSculptedWarriorBody(geo, mat, 'queen', {
      scale: 1.13,
      hasQueenGown: true,
      hasFemaleCorset: true,
      hasPauldrons: false,
      hasCape: true,
      capeMaterial: mat.cape,
      torsoMaterial: mat.queenGown,
      sleeveMaterial: mat.armorPrimary,
      bracerMaterial: mat.armorTrim,
      hasChestCrest: true,
      broadShoulders: 0.86,
      longHair: true,
      sweptHair: true,
      silverHair: color === 'w',
      hairSeed: phaseOffset,
    });
    const halo = new THREE.Mesh(geo.celestialHalo, mat.armorTrim);
    halo.scale.setScalar(0.85);
    halo.position.set(0, 0.56, -0.12);
    h.torso.add(halo);

    const crown = new THREE.Mesh(geo.crownRoyal, mat.armorTrim);
    crown.position.set(0, 0.23, 0);
    h.head.add(crown);

    const staff = new THREE.Mesh(geo.staffShaft, mat.armorTrim);
    staff.position.set(0, 0.04, 0.05);
    h.rightArm.add(staff);

    const glaive = new THREE.Mesh(geo.glaiveBlade, mat.weaponBlade);
    glaive.position.set(0, 0.74, 0.05);
    glaive.rotation.y = Math.PI * 0.5;
    h.rightArm.add(glaive);

    const crystal = new THREE.Mesh(geo.orbCrystal, mat.accentGlow);
    crystal.scale.set(0.85, 1.35, 0.85);
    crystal.position.set(0, 0.8, 0.05);
    h.rightArm.add(crystal);
    h.rightArm.rotation.set(-0.22, 0, -0.1);
    h.leftArm.rotation.set(0.08, 0, 0.16);
    return { rigParts: { ...h, crystal }, torsoBaseY };
  }

  if (type === 'b') {
    const h = buildSculptedWarriorBody(geo, mat, 'mage', {
      scale: 1.09,
      hasCape: true,
      capeMaterial: mat.cape,
      torsoMaterial: mat.tabard,
      sleeveMaterial: mat.cloth,
      bracerMaterial: mat.armorTrim,
      thighMaterial: mat.trousers,
      greaveMaterial: mat.armorPrimary,
      hasMailSkirt: true,
      hasChestCrest: true,
      broadShoulders: 1.02,
      beard: true,
      visibleHair: true,
      silverHair: color === 'w',
      hairSeed: phaseOffset,
    });
    const mitre = new THREE.Mesh(geo.bishopMitre, mat.armorTrim);
    mitre.scale.setScalar(0.92);
    mitre.position.set(0, 0.225, -0.01);
    h.head.add(mitre);

    const staff = new THREE.Mesh(geo.staffShaft, mat.armorTrim);
    staff.scale.set(1.05, 1.12, 1.05);
    staff.position.set(0, 0.08, 0.06);
    h.rightArm.add(staff);

    const ring = new THREE.Mesh(geo.staffCollarRing, mat.armorTrim);
    ring.position.set(0, 0.83, 0.06);
    h.rightArm.add(ring);

    const crystal = new THREE.Mesh(geo.orbCrystal, mat.accentGlow);
    crystal.scale.setScalar(0.95);
    crystal.position.set(0, 0.84, 0.06);
    h.rightArm.add(crystal);
    h.rightArm.rotation.set(-0.18, 0, -0.1);
    h.leftArm.rotation.set(-0.28, 0, 0.14);
    return { rigParts: { ...h, crystal }, torsoBaseY };
  }

  if (type === 'n') {
    const mounted = buildMountedRiderKnight(geo, mat, phaseOffset, {
      armorMat: mat.armorPrimary,
      trimMat: mat.armorTrim,
      capeMat: mat.cape,
      hasBarding: true,
      hasPlume: true,
      hasLanceGlow: false,
    });
    return { rigParts: mounted, torsoBaseY: mounted.torsoBaseY };
  }

  if (type === 'r') {
    const h = buildSculptedWarriorBody(geo, mat, 'warrior', {
      scale: 1.1,
      hasHeavyTorso: true,
      torsoMaterial: mat.armorPrimary,
      pauldronMaterial: mat.armorTrim,
      bracerMaterial: mat.armorPrimary,
      greaveMaterial: mat.armorTrim,
      hasMailSkirt: true,
      hasChestCrest: true,
      broadShoulders: 1.24,
      beard: true,
      visibleHair: true,
      silverHair: color === 'w',
      hairSeed: phaseOffset,
    });
    const helm = new THREE.Mesh(geo.spartanHelm, mat.armorTrim);
    helm.position.set(0, 0.118, -0.004);
    h.head.add(helm);

    const shield = buildHeraldicShield(geo, mat, 'tower');
    shield.scale.setScalar(1.06);
    shield.position.set(0.08, -0.22, 0.12);
    shield.rotation.y = Math.PI * 0.36;
    h.leftArm.add(shield);
    h.leftArm.rotation.set(-0.34, 0, 0.1);

    const hammer = createWarhammer(geo, mat, 1.04);
    hammer.position.set(0, -0.25, 0.08);
    hammer.rotation.x = Math.PI * 0.38;
    h.rightArm.add(hammer);
    h.rightArm.rotation.set(-0.28, 0, -0.14);
    return { rigParts: h, torsoBaseY };
  }

  // Celestial Pawn
  const h = buildSculptedWarriorBody(geo, mat, 'young', {
    scale: 0.99,
    hasMailSkirt: true,
    torsoMaterial: mat.armorPrimary,
    sleeveMaterial: mat.cloth,
    bracerMaterial: mat.armorTrim,
    thighMaterial: mat.trousers,
    greaveMaterial: mat.armorPrimary,
    broadShoulders: 0.96,
    visibleHair: true,
    hairSeed: phaseOffset,
  });
  const helm = new THREE.Mesh(geo.pawnHelm, mat.armorPrimary);
  helm.position.set(0, 0.118, -0.004);
  h.head.add(helm);

  const sword = createSword(geo, mat, 0.84);
  sword.position.set(0, -0.4, 0.04);
  sword.rotation.x = Math.PI * 0.4;
  h.rightArm.add(sword);
  h.rightArm.rotation.set(-0.22, 0, -0.12);

  const shield = buildHeraldicShield(geo, mat, 'round');
  shield.scale.setScalar(0.78);
  shield.position.set(0.055, -0.24, 0.075);
  shield.rotation.y = Math.PI * 0.42;
  h.leftArm.add(shield);
  h.leftArm.rotation.set(-0.28, 0, 0.1);
  return { rigParts: h, torsoBaseY };
}

export function createCharacterPiece(
  type: PieceType,
  color: PieceColor,
  geo: CharacterGeometryBank,
  bank: SceneMaterialBank,
  phaseOffset = 0,
  characterSet: CharacterSetId = bank.characterSet
): CharacterRig {
  const mat = getKingdomPalette(bank, color);
  const root = new THREE.Group();

  const contactShadow = buildContactShadowBase(geo, bank);
  root.add(contactShadow);

  const hitProxy = new THREE.Mesh(
    geo.hitCylinder,
    bank.hitProxyMat
  );
  hitProxy.position.y = 0.88;
  hitProxy.layers.set(1);
  root.add(hitProxy);

  const facingAngle = color === 'w' ? Math.PI : 0;

  let rigParts: {
    body: THREE.Group;
    torso: THREE.Group;
    head: THREE.Group;
    rightArm: THREE.Group;
    leftArm: THREE.Group;
    legs: THREE.Group[];
    cape?: THREE.Mesh;
    crystal?: THREE.Mesh;
    horse?: CharacterRig['horse'];
  };
  let torsoBaseY = 0.6;

  if (characterSet !== 'human') {
    const built = buildThemedCharacterRig(type, color, geo, mat, phaseOffset, characterSet);
    rigParts = built.rigParts;
    torsoBaseY = built.torsoBaseY;
  } else if (type === 'k') {
    // KING: Burnished Gunmetal & Gold Filigree Plate, Open Sovereign Royal Crown over Layered Hair, Full Beard, Crimson Fleur-de-lis Tabard & Cape
    const h = buildSculptedWarriorBody(geo, mat, 'king', {
      scale: 1.16,
      hasCape: true,
      capeMaterial: mat.crimsonAccent,
      torsoMaterial: mat.armorDarkSteel,
      pauldronMaterial: mat.armorTrim,
      bracerMaterial: mat.armorDarkSteel,
      greaveMaterial: mat.armorTrim,
      hasMailSkirt: true,
      hasChestCrest: true,
      broadShoulders: 1.08,
      beard: true,
      visibleHair: true,
      sweptHair: true,
      silverHair: color === 'w',
      hairSeed: phaseOffset,
    });

    // Iconic Crimson Fleur-de-lis Royal Tabard hanging in front
    const fleurTabard = new THREE.Mesh(geo.royalFleurTabard, mat.royalTabard);
    fleurTabard.position.set(0, -0.18, 0.16);
    fleurTabard.rotation.x = -0.04;
    h.torso.add(fleurTabard);

    // Royal Crown & Velvet Cap perched atop visible royal hair (full face 100% open!)
    const velvetCap = new THREE.Mesh(geo.crownVelvetCap, mat.crownVelvet);
    velvetCap.position.set(0, 0.215, -0.004);
    h.head.add(velvetCap);

    const crown = new THREE.Mesh(
      color === 'w' ? geo.crownRoyal : geo.crownDark,
      mat.armorTrim
    );
    crown.scale.setScalar(1.02);
    crown.position.set(0, 0.212, -0.004);
    h.head.add(crown);

    const crownGem = new THREE.Mesh(geo.orbCrystal, mat.gem);
    crownGem.scale.setScalar(0.36);
    crownGem.position.set(0, 0.252, 0.114);
    h.head.add(crownGem);

    const sword = createSword(geo, mat, 1.15);
    sword.position.set(0, -0.42, 0.04);
    sword.rotation.x = Math.PI * 0.4;
    h.rightArm.add(sword);
    h.rightArm.rotation.set(-0.34, 0, -0.14);

    const shield = buildHeraldicShield(geo, mat, 'round');
    shield.scale.setScalar(0.95);
    shield.position.set(0.06, -0.25, 0.08);
    shield.rotation.y = Math.PI * 0.42;
    h.leftArm.add(shield);
    h.leftArm.rotation.set(-0.22, 0, 0.12);

    rigParts = h;
  } else if (type === 'q') {
    // QUEEN: Hourglass Plum-Violet & Gold Corset, Open V-Slit Damask Gown, Winged High Royal Collar, Crown & Scepter
    const h = buildSculptedWarriorBody(geo, mat, 'queen', {
      scale: 1.12,
      hasQueenGown: true,
      hasFemaleCorset: true,
      hasPauldrons: false,
      hasCape: true,
      capeMaterial: mat.crimsonAccent,
      torsoMaterial: mat.queenGown,
      sleeveMaterial: mat.armorSecondary,
      bracerMaterial: mat.armorTrim,
      hasChestCrest: true,
      broadShoulders: 0.84,
      longHair: true,
      sweptHair: true,
      auburnHair: color === 'w',
      hairSeed: phaseOffset,
    });

    // Dramatic Winged High Standing Royal Collar framing her neck & cheeks
    const highCollar = new THREE.Mesh(geo.highRoyalCollar, mat.armorSecondary);
    highCollar.position.set(0, 0.415, -0.01);
    h.torso.add(highCollar);

    const collarTrim = new THREE.Mesh(geo.highRoyalCollar, mat.armorTrim);
    collarTrim.scale.setScalar(1.03);
    collarTrim.position.set(0, 0.42, -0.012);
    h.torso.add(collarTrim);

    // Tall Pointed Gold Royal Crown
    const crown = new THREE.Mesh(
      color === 'w' ? geo.crownRoyal : geo.crownDark,
      mat.armorTrim
    );
    crown.position.set(0, 0.23, 0);
    h.head.add(crown);

    const tiaraGem = new THREE.Mesh(geo.orbCrystal, mat.gem);
    tiaraGem.scale.setScalar(0.42);
    tiaraGem.position.set(0, 0.275, 0.11);
    h.head.add(tiaraGem);

    // Ornate Slender Royal Crystal Scepter / Glaive
    const staff = new THREE.Mesh(geo.staffShaft, mat.armorTrim);
    staff.position.set(0, 0.04, 0.05);
    h.rightArm.add(staff);

    const glaiveBlade = new THREE.Mesh(geo.glaiveBlade, mat.weaponBlade);
    glaiveBlade.position.set(0, 0.74, 0.05);
    glaiveBlade.rotation.y = Math.PI * 0.5;
    h.rightArm.add(glaiveBlade);

    const crystal = new THREE.Mesh(geo.orbCrystal, mat.gem);
    crystal.scale.set(0.8, 1.35, 0.8);
    crystal.position.set(0, 0.8, 0.05);
    h.rightArm.add(crystal);

    h.rightArm.rotation.set(-0.22, 0, -0.1);
    h.leftArm.rotation.set(0.08, 0, 0.16);

    rigParts = { ...h, crystal };
  } else if (type === 'r') {
    // ROOK: Heavy Broad-Shouldered Siege Guardian with Forged Steel Plate, Open-Faced Brow Helm, Visible Hair & Rugged Beard
    const h = buildSculptedWarriorBody(geo, mat, 'warrior', {
      scale: 1.09,
      hasHeavyTorso: true,
      hasCape: false,
      torsoMaterial: mat.armorDarkSteel,
      hasMailSkirt: true,
      hasChestCrest: true,
      broadShoulders: 1.24,
      beard: true,
      visibleHair: true,
      hairSeed: phaseOffset,
    });

    const helm = new THREE.Mesh(geo.rookHelm, mat.armorPrimary);
    helm.position.set(0, 0.118, -0.004);
    h.head.add(helm);

    const roundShield = buildHeraldicShield(geo, mat, 'round');
    roundShield.scale.setScalar(1.15);
    roundShield.position.set(0.08, -0.22, 0.12);
    roundShield.rotation.y = Math.PI * 0.36;
    h.leftArm.add(roundShield);
    h.leftArm.rotation.set(-0.35, 0, 0.08);

    const haft = new THREE.Mesh(geo.staffShaft, mat.wood);
    haft.scale.set(1.08, 0.74, 1.08);
    haft.position.set(0, -0.22, 0.06);
    haft.rotation.x = Math.PI * 0.35;
    h.rightArm.add(haft);

    const axeBlade = new THREE.Mesh(geo.axeHead, mat.weaponBlade);
    axeBlade.position.set(0, -0.22, 0.38);
    axeBlade.rotation.y = Math.PI / 2;
    h.rightArm.add(axeBlade);
    h.rightArm.rotation.set(-0.28, 0, -0.14);

    rigParts = h;
  } else if (type === 'b') {
    // BISHOP: Bearded Warrior-Cleric / Mage-Priest with Visible Mature Face, Layered Hair, Mitre Crown & Tall Arcane Polearm
    const h = buildSculptedWarriorBody(geo, mat, 'mage', {
      scale: 1.08,
      hasCape: false,
      hasBandolier: true,
      torsoMaterial: mat.tabard,
      sleeveMaterial: mat.chainmail,
      bracerMaterial: mat.armorPrimary,
      thighMaterial: mat.trousers,
      greaveMaterial: mat.armorSecondary,
      hasMailSkirt: true,
      hasChestCrest: true,
      broadShoulders: 1.02,
      beard: true,
      visibleHair: true,
      sweptHair: true,
      silverHair: color === 'w',
      hairSeed: phaseOffset,
    });

    // Ceremonial Bishop Mitre sitting neatly above forehead hairline so brows & hair temples show cleanly
    const mitre = new THREE.Mesh(geo.bishopMitre, mat.crimsonAccent);
    mitre.scale.setScalar(0.92);
    mitre.position.set(0, 0.225, -0.01);
    h.head.add(mitre);

    const mitreBand = new THREE.Mesh(geo.queenDiadem, mat.armorTrim);
    mitreBand.rotation.x = Math.PI / 2;
    mitreBand.rotation.z = Math.PI * 0.38;
    mitreBand.position.set(0, 0.228, -0.008);
    h.head.add(mitreBand);

    // Crimson Heraldic Cleric Chest Sash
    const sash = new THREE.Mesh(geo.mageStole, mat.crimsonAccent);
    sash.scale.set(0.95, 0.9, 1.0);
    sash.position.set(0, 0.24, 0.15);
    sash.rotation.z = 0.28;
    h.torso.add(sash);

    // Tall Ornate Golden Spear / Halberd Polearm Staff
    const staff = new THREE.Mesh(geo.staffShaft, mat.wood);
    staff.scale.set(1.05, 1.12, 1.05);
    staff.position.set(0, 0.08, 0.06);
    h.rightArm.add(staff);

    const spearTip = new THREE.Mesh(geo.spearHalberdHead, mat.armorTrim);
    spearTip.position.set(0, 0.88, 0.06);
    h.rightArm.add(spearTip);

    const crystal = new THREE.Mesh(geo.orbCrystal, mat.gem);
    crystal.scale.setScalar(0.68);
    crystal.position.set(0, 0.82, 0.06);
    h.rightArm.add(crystal);

    h.rightArm.rotation.set(-0.18, 0, -0.1);

    // Sacred Tome / Buckler
    const tome = new THREE.Mesh(geo.tassetPlate, mat.armorTrim);
    tome.scale.set(1.0, 1.15, 1.9);
    tome.position.set(0.02, -0.38, 0.06);
    tome.rotation.x = -0.45;
    h.leftArm.add(tome);
    h.leftArm.rotation.set(-0.38, 0, 0.14);

    rigParts = { ...h, crystal };
  } else if (type === 'n') {
    // KNIGHT: Muscular Armored Centaur Warrior with Jointed Equine Front/Hind Legs & Open Corinthian Horned Helm
    const body = new THREE.Group();
    body.position.y = 0;

    const horseGroup = new THREE.Group();
    horseGroup.position.y = 0.45;
    body.add(horseGroup);

    const barrel = new THREE.Mesh(geo.horseBody, mat.horseCoat);
    barrel.position.set(0, 0.06, -0.06);
    horseGroup.add(barrel);

    // 4 Jointed Anatomical Equine Legs (front knee + hind angled hock) with Golden Fetlock Greaves
    const horseLegs: THREE.Group[] = [];
    const legOffsets: Array<[number, number, boolean]> = [
      [-0.105, 0.24, true],
      [0.105, 0.24, true],
      [-0.105, -0.26, false],
      [0.105, -0.26, false],
    ];
    for (const [lx, lz, isFront] of legOffsets) {
      const lPivot = new THREE.Group();
      lPivot.position.set(lx, 0.0, lz);
      const legMesh = new THREE.Mesh(isFront ? geo.horseFrontLeg : geo.horseHindLeg, mat.horseCoat);
      lPivot.add(legMesh);
      const greave = new THREE.Mesh(geo.fetlockGreave, mat.armorTrim);
      greave.position.set(0, -0.35, isFront ? 0.015 : -0.022);
      lPivot.add(greave);
      const hoof = new THREE.Mesh(geo.horseHoof, mat.armorSecondary);
      hoof.position.set(0, -0.43, isFront ? 0.024 : -0.005);
      lPivot.add(hoof);
      horseGroup.add(lPivot);
      horseLegs.push(lPivot);
    }

    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.14, -0.45);
    const tailMesh = new THREE.Mesh(geo.horseTail, mat.horseMane);
    tailGroup.add(tailMesh);
    horseGroup.add(tailGroup);

    // Muscular Bare-Chested Human Upper Torso rising seamlessly from front equine chest
    const centaurUpper = buildSculptedWarriorBody(geo, mat, 'warrior', {
      scale: 0.96,
      hasBareTorso: true,
      pauldronMaterial: mat.armorTrim,
      sleeveMaterial: mat.skinBody,
      bracerMaterial: mat.armorPrimary,
      broadShoulders: 1.08,
      visibleHair: true,
      hairSeed: phaseOffset,
    });
    centaurUpper.legs.forEach((l) => (l.visible = false));
    torsoBaseY = 0.61;
    centaurUpper.torso.position.set(0, torsoBaseY, 0.21);
    body.add(centaurUpper.torso);

    // Open-faced Gold Corinthian / Spartan War Helm over visible sculpted warrior face
    const spartanHelm = new THREE.Mesh(geo.spartanHelm, mat.armorTrim);
    spartanHelm.position.set(0, 0.118, -0.004);
    centaurUpper.head.add(spartanHelm);

    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(geo.lanceGuard, mat.armorTrim);
      horn.scale.set(0.32, 1.35, 0.32);
      horn.position.set(side * 0.1, 0.26, 0.02);
      horn.rotation.z = side * -0.42;
      horn.rotation.x = 0.22;
      centaurUpper.head.add(horn);
    }

    const lance = new THREE.Mesh(geo.lanceCone, mat.armorTrim);
    lance.position.set(0, -0.25, 0.36);
    lance.rotation.x = Math.PI * 0.45;
    centaurUpper.rightArm.add(lance);

    const vamplate = new THREE.Mesh(geo.lanceGuard, mat.armorPrimary);
    vamplate.position.set(0, -0.29, 0.14);
    vamplate.rotation.x = Math.PI * 0.45;
    centaurUpper.rightArm.add(vamplate);
    centaurUpper.rightArm.rotation.set(-0.26, 0, -0.14);

    const shield = buildHeraldicShield(geo, mat, 'round');
    shield.scale.setScalar(0.92);
    shield.position.set(0.06, -0.24, 0.08);
    shield.rotation.y = Math.PI * 0.4;
    centaurUpper.leftArm.add(shield);
    centaurUpper.leftArm.rotation.set(-0.24, 0, 0.14);

    rigParts = {
      body,
      torso: centaurUpper.torso,
      head: centaurUpper.head,
      rightArm: centaurUpper.rightArm,
      leftArm: centaurUpper.leftArm,
      legs: [],
      horse: {
        group: horseGroup,
        neck: centaurUpper.torso,
        legs: horseLegs,
        tail: tailGroup,
      },
    };
  } else {
    // PAWN: Unmasked Young Soldier / Vanguard Crusader with Swept Sculpted Hair Clumps, Pushed-Back Cowl, Bandolier & Split-Front Coat
    const h = buildSculptedWarriorBody(geo, mat, 'young', {
      scale: 0.98,
      hasCoatSkirt: true,
      hasShoulderMantle: true,
      hasBandolier: true,
      hasPauldrons: false,
      torsoMaterial: mat.pawnCoat,
      sleeveMaterial: mat.pawnCoat,
      bracerMaterial: mat.leather,
      thighMaterial: mat.trousers,
      greaveMaterial: mat.leather,
      broadShoulders: 0.9,
      visibleHair: true,
      sweptHair: true,
      auburnHair: Math.sin(phaseOffset * 3.1) > 0.45,
      hairSeed: phaseOffset,
    });

    // Pushed-back draped cloth cowl resting at collar so young soldier's face & hair remain 100% uncovered
    const cowl = new THREE.Mesh(geo.pushedBackCowl, mat.pawnCoat);
    cowl.position.set(0, 0.028, -0.008);
    h.head.add(cowl);

    // Diagonal Sword Scabbard across back
    const backSword = createSword(geo, mat, 0.92);
    backSword.position.set(-0.14, 0.46, -0.14);
    backSword.rotation.set(-0.18, 0, -2.55);
    h.torso.add(backSword);

    const sword = createSword(geo, mat, 0.82);
    sword.position.set(0, -0.4, 0.04);
    sword.rotation.x = Math.PI * 0.4;
    h.rightArm.add(sword);
    h.rightArm.rotation.set(-0.22, 0, -0.12);

    const shield = buildHeraldicShield(geo, mat, 'round');
    shield.scale.setScalar(0.76);
    shield.position.set(0.055, -0.24, 0.075);
    shield.rotation.y = Math.PI * 0.42;
    h.leftArm.add(shield);
    h.leftArm.rotation.set(-0.28, 0, 0.1);

    rigParts = h;
  }

  rigParts.body.rotation.y = facingAngle;
  enableShadows(rigParts.body);
  root.add(rigParts.body);

  const disposableGeos: THREE.BufferGeometry[] = [];
  optimizeRigDrawCalls(rigParts, disposableGeos);

  // Calibrate exact vertical grounding so boots/hooves rest flush on the tile surface (y = 0)
  root.updateMatrixWorld(true);
  _footBox.makeEmpty();
  if (rigParts.horse) {
    for (let i = 0; i < rigParts.horse.legs.length; i++) {
      _tmpFootBox.setFromObject(rigParts.horse.legs[i]);
      _footBox.union(_tmpFootBox);
    }
    contactShadow.scale.set(0.86, 1.18, 1);
    contactShadow.rotation.z = facingAngle;
  } else {
    for (let i = 0; i < rigParts.legs.length; i++) {
      _tmpFootBox.setFromObject(rigParts.legs[i]);
      _footBox.union(_tmpFootBox);
    }
    const footprint = type === 'q' ? 0.88 : type === 'k' || type === 'r' ? 0.85 : 0.78;
    contactShadow.scale.setScalar(footprint);
  }

  const baseY = Number.isFinite(_footBox.min.y)
    ? -_footBox.min.y - (rigParts.horse ? 0.001 : 0.003)
    : 0;
  rigParts.body.position.y = baseY;

  const rig: CharacterRig = {
    root,
    body: rigParts.body,
    torso: rigParts.torso,
    head: rigParts.head,
    rightArm: rigParts.rightArm,
    leftArm: rigParts.leftArm,
    legs: rigParts.legs,
    cape: rigParts.cape,
    crystal: rigParts.crystal,
    horse: rigParts.horse,
    contactShadow,
    hitProxy,
    disposableGeos,
    baseY,
    torsoBaseY,
    phaseOffset,
    type,
    color,
    characterSet,
  };

  root.userData.rig = rig;
  return rig;
}
