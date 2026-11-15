import type { CharacterSetId, PieceType } from '../types/chess';

export type CombatStyleId =
  | 'classic'
  | 'dualBlade'
  | 'infernoHeavy'
  | 'shadowFast'
  | 'celestialDivine';

export interface HeroPieceConfig {
  type: PieceType;
  roleTitle: string;
  archetype: string;
  weaponLabel: string;
  dualWield?: boolean;
  mounted?: boolean;
}

export interface SetCombatProfile {
  style: CombatStyleId;
  styleLabel: string;
  wTrailHex: number;
  bTrailHex: number;
  wFlashHex: number;
  bFlashHex: number;
  wSparkHex: number;
  bSparkHex: number;
  wMagicHex: number;
  bMagicHex: number;
  wShockHex: number;
  bShockHex: number;
}

export interface CharacterSetConfig {
  id: CharacterSetId;
  number: number;
  name: string;
  tagline: string;
  description: string;
  accentHex: string;
  badgeTextClass: string;
  borderActiveClass: string;
  cardBgClass: string;
  swatchColors: [string, string, string];
  combat: SetCombatProfile;
  pieces: Record<PieceType, HeroPieceConfig>;
}

export const CHARACTER_SET_ORDER: CharacterSetId[] = [
  'human',
  'titan',
  'inferno',
  'shadow',
  'celestial',
];

export const CHARACTER_SETS: Record<CharacterSetId, CharacterSetConfig> = {
  human: {
    id: 'human',
    number: 1,
    name: 'Human Royal Kingdom',
    tagline: 'Royal Crown & Steel',
    description:
      'Classic medieval sovereigns, arcane queens, paladin bishops, centaur lancers, and shield-bearing wardens.',
    accentHex: '#e6b84d',
    badgeTextClass: 'text-amber-300',
    borderActiveClass: 'border-amber-400/80',
    cardBgClass: 'from-amber-950/35 to-slate-900/90',
    swatchColors: ['#e7dfd2', '#d4a345', '#8a1c22'],
    combat: {
      style: 'classic',
      styleLabel: 'Classic Sword & Steel',
      wTrailHex: 0xffe4a0,
      bTrailHex: 0xff5a4a,
      wFlashHex: 0xffcf70,
      bFlashHex: 0xff4538,
      wSparkHex: 0xffe490,
      bSparkHex: 0xff6b4a,
      wMagicHex: 0x38bdf8,
      bMagicHex: 0xd946ef,
      wShockHex: 0xfbbf24,
      bShockHex: 0xef4444,
    },
    pieces: {
      k: {
        type: 'k',
        roleTitle: 'Sovereign King',
        archetype: 'Royal Armored Monarch',
        weaponLabel: 'Royal Greatsword',
      },
      q: {
        type: 'q',
        roleTitle: 'Sovereign Queen',
        archetype: 'High Arcane Monarch',
        weaponLabel: 'Arcane Glaive',
      },
      b: {
        type: 'b',
        roleTitle: 'High Prelate',
        archetype: 'Mitred Battle Cleric',
        weaponLabel: 'Crystal Halberd',
      },
      n: {
        type: 'n',
        roleTitle: 'Centaur Lancer',
        archetype: 'Armored Warhorse Centaur',
        weaponLabel: 'Cavalry Lance',
        mounted: true,
      },
      r: {
        type: 'r',
        roleTitle: 'Siege Warden',
        archetype: 'Tower Shield Juggernaut',
        weaponLabel: 'Battleaxe & Round Shield',
      },
      p: {
        type: 'p',
        roleTitle: 'Vanguard Footman',
        archetype: 'Hooded Royal Blade',
        weaponLabel: 'Steel Sword & Buckler',
      },
    },
  },
  titan: {
    id: 'titan',
    number: 2,
    name: 'Titan Vanguard',
    tagline: 'Wall Garrison & Twin-Blade Corps',
    description:
      'Original disciplined wall-defense regiments armed with split-tail military coats, maneuvering harnesses, and twin tempered blades.',
    accentHex: '#4ade80',
    badgeTextClass: 'text-emerald-300',
    borderActiveClass: 'border-emerald-400/80',
    cardBgClass: 'from-emerald-950/35 to-slate-900/90',
    swatchColors: ['#cbd5c0', '#3f624d', '#8b5e34'],
    combat: {
      style: 'dualBlade',
      styleLabel: 'Rapid Dual-Blade Combo',
      wTrailHex: 0xd9f99d,
      bTrailHex: 0x34d399,
      wFlashHex: 0xecfccb,
      bFlashHex: 0x6ee7b7,
      wSparkHex: 0xfef08a,
      bSparkHex: 0x6ee7b7,
      wMagicHex: 0xa7f3d0,
      bMagicHex: 0x34d399,
      wShockHex: 0x84cc16,
      bShockHex: 0x10b981,
    },
    pieces: {
      k: {
        type: 'k',
        roleTitle: 'Garrison Commander',
        archetype: 'Veteran Military Strategist',
        weaponLabel: 'Commander Sabre',
      },
      q: {
        type: 'q',
        roleTitle: 'Elite Scout Captain',
        archetype: 'Agile Twin-Blade Warrior',
        weaponLabel: 'Dual Scout Blades',
        dualWield: true,
      },
      b: {
        type: 'b',
        roleTitle: 'Tactical Officer',
        archetype: 'Field Coat Commander',
        weaponLabel: 'Officer Rapier & Folio',
      },
      n: {
        type: 'n',
        roleTitle: 'Aerial Vanguard',
        archetype: 'Harnessed Sky Swordsman',
        weaponLabel: 'Twin Aerial Blades',
        dualWield: true,
      },
      r: {
        type: 'r',
        roleTitle: 'Bastion Sentinel',
        archetype: 'Heavy Frontline Trooper',
        weaponLabel: 'Siege Claymore & Buckler',
      },
      p: {
        type: 'p',
        roleTitle: 'Wall Recruit',
        archetype: 'Garrison Cadet Soldier',
        weaponLabel: 'Tempered Shortsword',
      },
    },
  },
  inferno: {
    id: 'inferno',
    number: 3,
    name: 'Inferno Empire',
    tagline: 'Obsidian Forge & Ember Flame',
    description:
      'Volcanic emperors and magma-forged champions armored in blackened iron, scorched crimson robes, and glowing ember cores.',
    accentHex: '#f97316',
    badgeTextClass: 'text-orange-300',
    borderActiveClass: 'border-orange-400/80',
    cardBgClass: 'from-orange-950/40 to-slate-900/90',
    swatchColors: ['#fb923c', '#991b1b', '#27201e'],
    combat: {
      style: 'infernoHeavy',
      styleLabel: 'Heavy Fire Cleave',
      wTrailHex: 0xffb347,
      bTrailHex: 0xff4500,
      wFlashHex: 0xfdba74,
      bFlashHex: 0xf97316,
      wSparkHex: 0xfef08a,
      bSparkHex: 0xfb7185,
      wMagicHex: 0xfb923c,
      bMagicHex: 0xef4444,
      wShockHex: 0xf97316,
      bShockHex: 0xdc2626,
    },
    pieces: {
      k: {
        type: 'k',
        roleTitle: 'Fire Emperor',
        archetype: 'Obsidian Crown Sovereign',
        weaponLabel: 'Ember Greatsword',
      },
      q: {
        type: 'q',
        roleTitle: 'Inferno Empress',
        archetype: 'Blaze Warrior Queen',
        weaponLabel: 'Flame Glaive',
      },
      b: {
        type: 'b',
        roleTitle: 'Pyromancer Magus',
        archetype: 'Volcanic Flame Priest',
        weaponLabel: 'Ember Orb Staff',
      },
      n: {
        type: 'n',
        roleTitle: 'Ashen Outrider',
        archetype: 'Mounted Obsidian Rider',
        weaponLabel: 'Scorched War-Lance',
        mounted: true,
      },
      r: {
        type: 'r',
        roleTitle: 'Magma Juggernaut',
        archetype: 'Heavy Volcanic Guardian',
        weaponLabel: 'Forge Warhammer & Shield',
      },
      p: {
        type: 'p',
        roleTitle: 'Cinder Legionnaire',
        archetype: 'Fire-Tempered Infantry',
        weaponLabel: 'Heated Blade & Buckler',
      },
    },
  },
  shadow: {
    id: 'shadow',
    number: 4,
    name: 'Shadow Dominion',
    tagline: 'Void Veil & Dread Steel',
    description:
      'Gothic dread monarchs, swift shadow-blade queens, and void necromancers wreathed in midnight steel and violet spirit fire.',
    accentHex: '#a855f7',
    badgeTextClass: 'text-purple-300',
    borderActiveClass: 'border-purple-400/80',
    cardBgClass: 'from-purple-950/40 to-slate-900/90',
    swatchColors: ['#c084fc', '#4f46e5', '#181826'],
    combat: {
      style: 'shadowFast',
      styleLabel: 'Shadow Dash & Strike',
      wTrailHex: 0x67e8f9,
      bTrailHex: 0xc084fc,
      wFlashHex: 0xa5f3fc,
      bFlashHex: 0xa855f7,
      wSparkHex: 0x7dd3fc,
      bSparkHex: 0xd8b4fe,
      wMagicHex: 0x38bdf8,
      bMagicHex: 0x9333ea,
      wShockHex: 0x06b6d4,
      bShockHex: 0x7e22ce,
    },
    pieces: {
      k: {
        type: 'k',
        roleTitle: 'Dread Sovereign',
        archetype: 'Gothic Dark Plate Ruler',
        weaponLabel: 'Runed Dreadblade',
      },
      q: {
        type: 'q',
        roleTitle: 'Shadow Queen',
        archetype: 'Nightblade Assassin Monarch',
        weaponLabel: 'Twin Shadow Blades',
        dualWield: true,
      },
      b: {
        type: 'b',
        roleTitle: 'Void Necromancer',
        archetype: 'Hooded Dark Sorcerer',
        weaponLabel: 'Soul-Crystal Staff',
      },
      n: {
        type: 'n',
        roleTitle: 'Nightfall Rider',
        archetype: 'Mounted Black Charger',
        weaponLabel: 'Dread Lance',
        mounted: true,
      },
      r: {
        type: 'r',
        roleTitle: 'Crypt Guardian',
        archetype: 'Undead Plate Colossus',
        weaponLabel: 'Reaper Halberd & Shield',
      },
      p: {
        type: 'p',
        roleTitle: 'Shade Footman',
        archetype: 'Masked Dark Infantry',
        weaponLabel: 'Night Sabre & Buckler',
      },
    },
  },
  celestial: {
    id: 'celestial',
    number: 5,
    name: 'Celestial Kingdom',
    tagline: 'Radiant Gold & Starlight',
    description:
      'Luminescent sovereigns, seraphic queens, and astral paladins clad in silver-gold armor and sky-azure divine energy.',
    accentHex: '#38bdf8',
    badgeTextClass: 'text-sky-300',
    borderActiveClass: 'border-sky-400/80',
    cardBgClass: 'from-sky-950/35 to-slate-900/90',
    swatchColors: ['#e0f2fe', '#facc15', '#2563eb'],
    combat: {
      style: 'celestialDivine',
      styleLabel: 'Divine Radiant Assault',
      wTrailHex: 0x7dd3fc,
      bTrailHex: 0xfde047,
      wFlashHex: 0xe0f2fe,
      bFlashHex: 0xfef08a,
      wSparkHex: 0xbae6fd,
      bSparkHex: 0xfde047,
      wMagicHex: 0x38bdf8,
      bMagicHex: 0xf59e0b,
      wShockHex: 0x0ea5e9,
      bShockHex: 0xeab308,
    },
    pieces: {
      k: {
        type: 'k',
        roleTitle: 'Celestial King',
        archetype: 'Sunburst Crown Monarch',
        weaponLabel: 'Dawnlight Greatsword',
      },
      q: {
        type: 'q',
        roleTitle: 'Seraphic Queen',
        archetype: 'Astral Warrior Monarch',
        weaponLabel: 'Starlight Glaive',
      },
      b: {
        type: 'b',
        roleTitle: 'High Cleric',
        archetype: 'Divine Light Priest',
        weaponLabel: 'Radiant Orb Staff',
      },
      n: {
        type: 'n',
        roleTitle: 'Astral Paladin',
        archetype: 'Mounted Silver Steed',
        weaponLabel: 'Holy War-Lance',
        mounted: true,
      },
      r: {
        type: 'r',
        roleTitle: 'Aegis Guardian',
        archetype: 'Heavy Angelic Sentinel',
        weaponLabel: 'Sun Hammer & Aegis Shield',
      },
      p: {
        type: 'p',
        roleTitle: 'Dawn Squire',
        archetype: 'Royal Celestial Soldier',
        weaponLabel: 'Silver Blade & Buckler',
      },
    },
  },
};
