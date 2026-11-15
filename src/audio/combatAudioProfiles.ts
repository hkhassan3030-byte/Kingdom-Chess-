import type { CharacterSetId, PieceType } from '../types/chess';

export type CombatAction =
  | 'swing'
  | 'swingSecondary'
  | 'weaponImpact'
  | 'finisherImpact'
  | 'armorBlock'
  | 'magicCharge'
  | 'magicRelease'
  | 'magicImpact'
  | 'horseMove'
  | 'movement'
  | 'deathVocal'
  | 'defenderReaction';

export type SoundPriority = 1 | 2 | 3 | 4 | 5;

export type WeaponClass =
  | 'sword'
  | 'heavySword'
  | 'axe'
  | 'hammer'
  | 'spear'
  | 'dagger'
  | 'glaive'
  | 'staff'
  | 'magicStaff'
  | 'bow'
  | 'arrow';

export type ArmorDefenseClass = 'shield' | 'heavyArmor' | 'lightArmor' | 'robes' | 'wood';

export type SwingTimbre =
  | 'medievalHeavy'
  | 'medievalAgile'
  | 'medievalLight'
  | 'titanBlade'
  | 'titanHeavy'
  | 'infernoHeavy'
  | 'shadowSharp'
  | 'celestialClean'
  | 'magicSweep';

export type ImpactTimbre =
  | 'medievalHeavy'
  | 'medievalSharp'
  | 'medievalSiege'
  | 'medievalLight'
  | 'titanSlice'
  | 'titanHeavy'
  | 'infernoForge'
  | 'shadowDark'
  | 'celestialDivine'
  | 'magicArcane';

export type MovementTimbre =
  | 'none'
  | 'horseHoof'
  | 'heavyPlate'
  | 'lightCloth'
  | 'titanGear';

export type VocalTone =
  | 'baritoneHeavy'
  | 'baritoneWarrior'
  | 'elderRaspy'
  | 'altoSharp'
  | 'soldierTenor';

export interface CharacterAudioProfile {
  setId: CharacterSetId;
  pieceType: PieceType;
  label: string;
  weaponClass: WeaponClass;
  defenseClass: ArmorDefenseClass;
  swingTimbre: SwingTimbre;
  impactTimbre: ImpactTimbre;
  movementTimbre: MovementTimbre;
  vocalTone: VocalTone;
  /** Fundamental frequency (Hz) for short dark-fantasy death vocal breath/groan */
  vocalBaseHz: number;
  /** Scales pitch/brightness: lower = heavier/slower (<1.0), higher = faster/sharper (>1.0) */
  pitchScale: number;
  /** Scales low-end body & metallic ring duration (0.75 - 1.35) */
  weight: number;
  /** Volume trim relative to action priority hierarchy (0.75 - 1.15) */
  classGain: number;
  /** True only when character visually casts magic spells */
  usesMagic: boolean;
  /** True only when character visually uses an actual melee blade/weapon */
  usesWeapon: boolean;
  /** True only when character is riding a horse */
  isMounted: boolean;
}

/**
 * Battlefield priority tiers:
 * 1: Checkmate announcement (AudioManager)
 * 2: Death vocal
 * 3: Weapon impact & shield block
 * 4: Weapon movement (swing, cast release, hooves, footsteps)
 * 5: Secondary / environmental / charge / fall / UI
 */
export const ACTION_PRIORITY: Record<CombatAction, SoundPriority> = {
  // 2. Death vocal
  deathVocal: 2,
  // 3. Weapon impact & block
  finisherImpact: 3,
  weaponImpact: 3,
  magicImpact: 3,
  armorBlock: 3,
  // 4. Weapon movement / swing / hooves / armor footsteps
  swing: 4,
  swingSecondary: 4,
  magicRelease: 4,
  horseMove: 4,
  movement: 4,
  // 5. Secondary / charge / body fall
  magicCharge: 5,
  defenderReaction: 5,
};

/**
 * Sound volume hierarchy multipliers (Priority 1 loudest -> Priority 5 subtlest).
 */
export const PRIORITY_VOLUME: Record<SoundPriority, number> = {
  1: 1.0,
  2: 0.9,
  3: 0.84,
  4: 0.62,
  5: 0.42,
};

export const CHARACTER_AUDIO_PROFILES: Record<
  CharacterSetId,
  Record<PieceType, CharacterAudioProfile>
> = {
  human: {
    k: {
      setId: 'human',
      pieceType: 'k',
      label: 'Human Sovereign King',
      weaponClass: 'heavySword',
      defenseClass: 'shield',
      swingTimbre: 'medievalHeavy',
      impactTimbre: 'medievalHeavy',
      movementTimbre: 'heavyPlate',
      vocalTone: 'baritoneHeavy',
      vocalBaseHz: 102,
      pitchScale: 0.85,
      weight: 1.26,
      classGain: 1.06,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
    q: {
      setId: 'human',
      pieceType: 'q',
      label: 'Human Sovereign Queen',
      weaponClass: 'glaive',
      defenseClass: 'robes',
      swingTimbre: 'medievalAgile',
      impactTimbre: 'medievalSharp',
      movementTimbre: 'lightCloth',
      vocalTone: 'altoSharp',
      vocalBaseHz: 222,
      pitchScale: 1.16,
      weight: 0.94,
      classGain: 0.98,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
    r: {
      setId: 'human',
      pieceType: 'r',
      label: 'Human Siege Warden',
      weaponClass: 'axe',
      defenseClass: 'shield',
      swingTimbre: 'medievalHeavy',
      impactTimbre: 'medievalSiege',
      movementTimbre: 'heavyPlate',
      vocalTone: 'baritoneHeavy',
      vocalBaseHz: 94,
      pitchScale: 0.76,
      weight: 1.35,
      classGain: 1.08,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
    b: {
      setId: 'human',
      pieceType: 'b',
      label: 'Human High Prelate',
      weaponClass: 'magicStaff',
      defenseClass: 'robes',
      swingTimbre: 'magicSweep',
      impactTimbre: 'magicArcane',
      movementTimbre: 'lightCloth',
      vocalTone: 'elderRaspy',
      vocalBaseHz: 118,
      pitchScale: 1.0,
      weight: 0.95,
      classGain: 0.96,
      usesMagic: true,
      usesWeapon: false,
      isMounted: false,
    },
    n: {
      setId: 'human',
      pieceType: 'n',
      label: 'Human Centaur Lancer',
      weaponClass: 'spear',
      defenseClass: 'shield',
      swingTimbre: 'medievalAgile',
      impactTimbre: 'medievalHeavy',
      movementTimbre: 'horseHoof',
      vocalTone: 'baritoneWarrior',
      vocalBaseHz: 116,
      pitchScale: 0.96,
      weight: 1.12,
      classGain: 1.0,
      usesMagic: false,
      usesWeapon: true,
      isMounted: true,
    },
    p: {
      setId: 'human',
      pieceType: 'p',
      label: 'Human Vanguard Footman',
      weaponClass: 'sword',
      defenseClass: 'shield',
      swingTimbre: 'medievalLight',
      impactTimbre: 'medievalLight',
      movementTimbre: 'lightCloth',
      vocalTone: 'soldierTenor',
      vocalBaseHz: 142,
      pitchScale: 1.08,
      weight: 0.8,
      classGain: 0.88,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
  },
  titan: {
    k: {
      setId: 'titan',
      pieceType: 'k',
      label: 'Titan Garrison Commander',
      weaponClass: 'heavySword',
      defenseClass: 'lightArmor',
      swingTimbre: 'titanHeavy',
      impactTimbre: 'titanHeavy',
      movementTimbre: 'titanGear',
      vocalTone: 'baritoneWarrior',
      vocalBaseHz: 110,
      pitchScale: 0.92,
      weight: 1.16,
      classGain: 1.04,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
    q: {
      setId: 'titan',
      pieceType: 'q',
      label: 'Titan Elite Scout Captain',
      weaponClass: 'dagger',
      defenseClass: 'lightArmor',
      swingTimbre: 'titanBlade',
      impactTimbre: 'titanSlice',
      movementTimbre: 'titanGear',
      vocalTone: 'altoSharp',
      vocalBaseHz: 232,
      pitchScale: 1.24,
      weight: 0.88,
      classGain: 1.0,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
    r: {
      setId: 'titan',
      pieceType: 'r',
      label: 'Titan Bastion Sentinel',
      weaponClass: 'heavySword',
      defenseClass: 'shield',
      swingTimbre: 'titanHeavy',
      impactTimbre: 'titanHeavy',
      movementTimbre: 'heavyPlate',
      vocalTone: 'baritoneHeavy',
      vocalBaseHz: 98,
      pitchScale: 0.8,
      weight: 1.3,
      classGain: 1.06,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
    b: {
      setId: 'titan',
      pieceType: 'b',
      label: 'Titan Tactical Officer',
      weaponClass: 'dagger',
      defenseClass: 'lightArmor',
      swingTimbre: 'titanBlade',
      impactTimbre: 'titanSlice',
      movementTimbre: 'titanGear',
      vocalTone: 'soldierTenor',
      vocalBaseHz: 134,
      pitchScale: 1.12,
      weight: 0.88,
      classGain: 0.94,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
    n: {
      setId: 'titan',
      pieceType: 'n',
      label: 'Titan Aerial Vanguard',
      weaponClass: 'dagger',
      defenseClass: 'lightArmor',
      swingTimbre: 'titanBlade',
      impactTimbre: 'titanSlice',
      movementTimbre: 'titanGear',
      vocalTone: 'soldierTenor',
      vocalBaseHz: 146,
      pitchScale: 1.22,
      weight: 0.95,
      classGain: 1.0,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
    p: {
      setId: 'titan',
      pieceType: 'p',
      label: 'Titan Wall Recruit',
      weaponClass: 'dagger',
      defenseClass: 'lightArmor',
      swingTimbre: 'titanBlade',
      impactTimbre: 'titanSlice',
      movementTimbre: 'titanGear',
      vocalTone: 'soldierTenor',
      vocalBaseHz: 152,
      pitchScale: 1.14,
      weight: 0.78,
      classGain: 0.86,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
  },
  inferno: {
    k: {
      setId: 'inferno',
      pieceType: 'k',
      label: 'Inferno Fire Emperor',
      weaponClass: 'heavySword',
      defenseClass: 'shield',
      swingTimbre: 'infernoHeavy',
      impactTimbre: 'infernoForge',
      movementTimbre: 'heavyPlate',
      vocalTone: 'baritoneHeavy',
      vocalBaseHz: 92,
      pitchScale: 0.8,
      weight: 1.32,
      classGain: 1.08,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
    q: {
      setId: 'inferno',
      pieceType: 'q',
      label: 'Inferno Empress',
      weaponClass: 'glaive',
      defenseClass: 'heavyArmor',
      swingTimbre: 'infernoHeavy',
      impactTimbre: 'infernoForge',
      movementTimbre: 'lightCloth',
      vocalTone: 'altoSharp',
      vocalBaseHz: 205,
      pitchScale: 1.08,
      weight: 1.02,
      classGain: 1.0,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
    r: {
      setId: 'inferno',
      pieceType: 'r',
      label: 'Inferno Magma Juggernaut',
      weaponClass: 'hammer',
      defenseClass: 'shield',
      swingTimbre: 'infernoHeavy',
      impactTimbre: 'infernoForge',
      movementTimbre: 'heavyPlate',
      vocalTone: 'baritoneHeavy',
      vocalBaseHz: 86,
      pitchScale: 0.72,
      weight: 1.38,
      classGain: 1.1,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
    b: {
      setId: 'inferno',
      pieceType: 'b',
      label: 'Inferno Pyromancer Magus',
      weaponClass: 'magicStaff',
      defenseClass: 'robes',
      swingTimbre: 'magicSweep',
      impactTimbre: 'infernoForge',
      movementTimbre: 'lightCloth',
      vocalTone: 'elderRaspy',
      vocalBaseHz: 112,
      pitchScale: 0.88,
      weight: 1.12,
      classGain: 0.98,
      usesMagic: true,
      usesWeapon: false,
      isMounted: false,
    },
    n: {
      setId: 'inferno',
      pieceType: 'n',
      label: 'Inferno Ashen Outrider',
      weaponClass: 'spear',
      defenseClass: 'shield',
      swingTimbre: 'infernoHeavy',
      impactTimbre: 'infernoForge',
      movementTimbre: 'horseHoof',
      vocalTone: 'baritoneWarrior',
      vocalBaseHz: 112,
      pitchScale: 0.9,
      weight: 1.18,
      classGain: 1.02,
      usesMagic: false,
      usesWeapon: true,
      isMounted: true,
    },
    p: {
      setId: 'inferno',
      pieceType: 'p',
      label: 'Inferno Cinder Legionnaire',
      weaponClass: 'sword',
      defenseClass: 'shield',
      swingTimbre: 'infernoHeavy',
      impactTimbre: 'infernoForge',
      movementTimbre: 'lightCloth',
      vocalTone: 'soldierTenor',
      vocalBaseHz: 132,
      pitchScale: 1.04,
      weight: 0.84,
      classGain: 0.9,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
  },
  shadow: {
    k: {
      setId: 'shadow',
      pieceType: 'k',
      label: 'Shadow Dread Sovereign',
      weaponClass: 'heavySword',
      defenseClass: 'shield',
      swingTimbre: 'shadowSharp',
      impactTimbre: 'shadowDark',
      movementTimbre: 'heavyPlate',
      vocalTone: 'baritoneHeavy',
      vocalBaseHz: 90,
      pitchScale: 0.84,
      weight: 1.24,
      classGain: 1.06,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
    q: {
      setId: 'shadow',
      pieceType: 'q',
      label: 'Shadow Queen',
      weaponClass: 'dagger',
      defenseClass: 'lightArmor',
      swingTimbre: 'shadowSharp',
      impactTimbre: 'shadowDark',
      movementTimbre: 'lightCloth',
      vocalTone: 'altoSharp',
      vocalBaseHz: 212,
      pitchScale: 1.22,
      weight: 0.9,
      classGain: 1.0,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
    r: {
      setId: 'shadow',
      pieceType: 'r',
      label: 'Shadow Crypt Guardian',
      weaponClass: 'axe',
      defenseClass: 'shield',
      swingTimbre: 'shadowSharp',
      impactTimbre: 'shadowDark',
      movementTimbre: 'heavyPlate',
      vocalTone: 'baritoneHeavy',
      vocalBaseHz: 84,
      pitchScale: 0.74,
      weight: 1.34,
      classGain: 1.08,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
    b: {
      setId: 'shadow',
      pieceType: 'b',
      label: 'Shadow Void Necromancer',
      weaponClass: 'magicStaff',
      defenseClass: 'robes',
      swingTimbre: 'magicSweep',
      impactTimbre: 'shadowDark',
      movementTimbre: 'lightCloth',
      vocalTone: 'elderRaspy',
      vocalBaseHz: 104,
      pitchScale: 0.84,
      weight: 1.05,
      classGain: 0.98,
      usesMagic: true,
      usesWeapon: false,
      isMounted: false,
    },
    n: {
      setId: 'shadow',
      pieceType: 'n',
      label: 'Shadow Nightfall Rider',
      weaponClass: 'spear',
      defenseClass: 'shield',
      swingTimbre: 'shadowSharp',
      impactTimbre: 'shadowDark',
      movementTimbre: 'horseHoof',
      vocalTone: 'baritoneWarrior',
      vocalBaseHz: 108,
      pitchScale: 0.94,
      weight: 1.12,
      classGain: 1.0,
      usesMagic: false,
      usesWeapon: true,
      isMounted: true,
    },
    p: {
      setId: 'shadow',
      pieceType: 'p',
      label: 'Shadow Shade Footman',
      weaponClass: 'dagger',
      defenseClass: 'shield',
      swingTimbre: 'shadowSharp',
      impactTimbre: 'shadowDark',
      movementTimbre: 'lightCloth',
      vocalTone: 'soldierTenor',
      vocalBaseHz: 128,
      pitchScale: 1.14,
      weight: 0.8,
      classGain: 0.88,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
  },
  celestial: {
    k: {
      setId: 'celestial',
      pieceType: 'k',
      label: 'Celestial King',
      weaponClass: 'heavySword',
      defenseClass: 'shield',
      swingTimbre: 'celestialClean',
      impactTimbre: 'celestialDivine',
      movementTimbre: 'heavyPlate',
      vocalTone: 'baritoneWarrior',
      vocalBaseHz: 106,
      pitchScale: 0.88,
      weight: 1.22,
      classGain: 1.06,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
    q: {
      setId: 'celestial',
      pieceType: 'q',
      label: 'Celestial Seraphic Queen',
      weaponClass: 'glaive',
      defenseClass: 'heavyArmor',
      swingTimbre: 'celestialClean',
      impactTimbre: 'celestialDivine',
      movementTimbre: 'lightCloth',
      vocalTone: 'altoSharp',
      vocalBaseHz: 228,
      pitchScale: 1.18,
      weight: 0.96,
      classGain: 1.0,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
    r: {
      setId: 'celestial',
      pieceType: 'r',
      label: 'Celestial Aegis Guardian',
      weaponClass: 'hammer',
      defenseClass: 'shield',
      swingTimbre: 'celestialClean',
      impactTimbre: 'celestialDivine',
      movementTimbre: 'heavyPlate',
      vocalTone: 'baritoneHeavy',
      vocalBaseHz: 96,
      pitchScale: 0.76,
      weight: 1.32,
      classGain: 1.08,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
    b: {
      setId: 'celestial',
      pieceType: 'b',
      label: 'Celestial High Cleric',
      weaponClass: 'magicStaff',
      defenseClass: 'robes',
      swingTimbre: 'magicSweep',
      impactTimbre: 'celestialDivine',
      movementTimbre: 'lightCloth',
      vocalTone: 'elderRaspy',
      vocalBaseHz: 122,
      pitchScale: 1.08,
      weight: 0.96,
      classGain: 0.98,
      usesMagic: true,
      usesWeapon: false,
      isMounted: false,
    },
    n: {
      setId: 'celestial',
      pieceType: 'n',
      label: 'Celestial Astral Paladin',
      weaponClass: 'spear',
      defenseClass: 'shield',
      swingTimbre: 'celestialClean',
      impactTimbre: 'celestialDivine',
      movementTimbre: 'horseHoof',
      vocalTone: 'baritoneWarrior',
      vocalBaseHz: 118,
      pitchScale: 0.98,
      weight: 1.12,
      classGain: 1.02,
      usesMagic: false,
      usesWeapon: true,
      isMounted: true,
    },
    p: {
      setId: 'celestial',
      pieceType: 'p',
      label: 'Celestial Dawn Squire',
      weaponClass: 'sword',
      defenseClass: 'shield',
      swingTimbre: 'celestialClean',
      impactTimbre: 'celestialDivine',
      movementTimbre: 'lightCloth',
      vocalTone: 'soldierTenor',
      vocalBaseHz: 146,
      pitchScale: 1.1,
      weight: 0.8,
      classGain: 0.88,
      usesMagic: false,
      usesWeapon: true,
      isMounted: false,
    },
  },
};

export function getCharacterAudioProfile(
  characterSet: CharacterSetId,
  pieceType: PieceType
): CharacterAudioProfile {
  return (
    CHARACTER_AUDIO_PROFILES[characterSet]?.[pieceType] ??
    CHARACTER_AUDIO_PROFILES.human[pieceType]
  );
}
