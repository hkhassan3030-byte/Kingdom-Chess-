import type { BoardThemeId, PieceSkinId } from '../types/chess';

export interface PieceSkinConfig {
  id: PieceSkinId;
  name: string;
  tagline: string;
  description: string;
  badgeTextClass: string;
  swatchColors: [string, string];
  wArmorTint: number | null;
  bArmorTint: number | null;
  wTrimTint: number | null;
  bTrimTint: number | null;
  wBladeTint: number | null;
  bBladeTint: number | null;
  wClothTint: number | null;
  bClothTint: number | null;
  wGlowTint: number | null;
  bGlowTint: number | null;
  metalnessDelta: number;
  roughnessDelta: number;
  envIntensityBoost: number;
  emissiveBoost: number;
}

export const PIECE_SKIN_ORDER: PieceSkinId[] = [
  'royal-standard',
  'gilded-champion',
  'ivory-marble',
  'runed-cobalt',
  'obsidian-crimson',
];

export const PIECE_SKINS: Record<PieceSkinId, PieceSkinConfig> = {
  'royal-standard': {
    id: 'royal-standard',
    name: 'Kingdom Standard',
    tagline: 'Authentic Citadel Finish',
    description:
      'Preserves each Kingdom’s signature forged armor, heraldic cloths, and martial sheen.',
    badgeTextClass: 'text-amber-200',
    swatchColors: ['#d8dee8', '#333b4d'],
    wArmorTint: null,
    bArmorTint: null,
    wTrimTint: null,
    bTrimTint: null,
    wBladeTint: null,
    bBladeTint: null,
    wClothTint: null,
    bClothTint: null,
    wGlowTint: null,
    bGlowTint: null,
    metalnessDelta: 0,
    roughnessDelta: 0,
    envIntensityBoost: 0,
    emissiveBoost: 0,
  },
  'gilded-champion': {
    id: 'gilded-champion',
    name: 'Gilded Champion',
    tagline: 'Royal Burnished Gold',
    description:
      'Brushed sovereign gold trim, sun-kissed ivory armor luster, and darkened bronze filigree.',
    badgeTextClass: 'text-amber-300',
    swatchColors: ['#f5d26b', '#7c5821'],
    wArmorTint: 0xf4e3b8,
    bArmorTint: 0x3b2f24,
    wTrimTint: 0xfad15a,
    bTrimTint: 0xd49b3b,
    wBladeTint: 0xfff5d6,
    bBladeTint: 0xd9b87a,
    wClothTint: null,
    bClothTint: null,
    wGlowTint: 0xfde047,
    bGlowTint: 0xf59e0b,
    metalnessDelta: 0.08,
    roughnessDelta: -0.1,
    envIntensityBoost: 0.24,
    emissiveBoost: 0.15,
  },
  'ivory-marble': {
    id: 'ivory-marble',
    name: 'Ivory & Onyx Enamel',
    tagline: 'Porcelain & Lacquer',
    description:
      'High-contrast pearl-ivory armor and deep sculpted onyx lacquer with crisp satin clarity.',
    badgeTextClass: 'text-slate-200',
    swatchColors: ['#f8f5ef', '#14171f'],
    wArmorTint: 0xf7f3eb,
    bArmorTint: 0x161922,
    wTrimTint: 0xe6c878,
    bTrimTint: 0x9aa3b4,
    wBladeTint: 0xffffff,
    bBladeTint: 0x9fb0c8,
    wClothTint: 0xede6da,
    bClothTint: 0x1d2029,
    wGlowTint: 0xe2e8f0,
    bGlowTint: 0xf87171,
    metalnessDelta: -0.22,
    roughnessDelta: -0.06,
    envIntensityBoost: 0.14,
    emissiveBoost: 0,
  },
  'runed-cobalt': {
    id: 'runed-cobalt',
    name: 'Runed Astral Cobalt',
    tagline: 'Sapphire Runeforge',
    description:
      'Anodized sapphire steel and deep indigo plate etched with cool arcane rune highlights.',
    badgeTextClass: 'text-sky-300',
    swatchColors: ['#bae6fd', '#1d3b78'],
    wArmorTint: 0xd7e8ff,
    bArmorTint: 0x1d2c4f,
    wTrimTint: 0x93c5fd,
    bTrimTint: 0x60a5fa,
    wBladeTint: 0xe0f2fe,
    bBladeTint: 0x93c5fd,
    wClothTint: null,
    bClothTint: null,
    wGlowTint: 0x38bdf8,
    bGlowTint: 0x818cf8,
    metalnessDelta: 0.06,
    roughnessDelta: -0.08,
    envIntensityBoost: 0.2,
    emissiveBoost: 0.35,
  },
  'obsidian-crimson': {
    id: 'obsidian-crimson',
    name: 'Bloodforged Obsidian',
    tagline: 'Crimson Tempered Steel',
    description:
      'Silver-edged gunmetal and darkened volcanic steel accented with ruby warforge trims.',
    badgeTextClass: 'text-rose-300',
    swatchColors: ['#e2d4d8', '#6b1420'],
    wArmorTint: 0xdfd4d8,
    bArmorTint: 0x1d1419,
    wTrimTint: 0xd96b76,
    bTrimTint: 0xb91c1c,
    wBladeTint: 0xfce7f3,
    bBladeTint: 0xb8868f,
    wClothTint: null,
    bClothTint: 0x3b0f18,
    wGlowTint: 0xfb7185,
    bGlowTint: 0xef4444,
    metalnessDelta: 0.08,
    roughnessDelta: -0.06,
    envIntensityBoost: 0.18,
    emissiveBoost: 0.3,
  },
};

export interface BoardArenaPreset {
  id: BoardThemeId;
  name: string;
  subtitle: string;
  description: string;
  badgeTextClass: string;
  swatchColors: [string, string];
  lightTile: number;
  darkTile: number;
  lightRoughness: number;
  darkRoughness: number;
  stoneApron: number;
  boardFrame: number;
  boardGoldTrim: number;
  waterMoat: number;
  citadelGround: number;
  ruinStone: number;
  bg: number;
  fog: number;
  hemiSky: number;
  hemiGround: number;
  keyLight: number;
  fillRim: number;
  flame: number;
  ember: number;
}

export const BOARD_ARENA_ORDER: BoardThemeId[] = [
  'classic-citadel',
  'emerald-bastion',
  'obsidian-forge',
  'astral-sanctuary',
  'frostpeak-glacier',
  'sylvan-glade',
  'storm-spires',
];

export const BOARD_ARENAS: Record<BoardThemeId, BoardArenaPreset> = {
  'classic-citadel': {
    id: 'classic-citadel',
    name: 'Citadel Alabaster',
    subtitle: 'Starter Battle Arena',
    description:
      'Moonlit ivory marble and obsidian basalt stone framed by royal brass and a reflecting citadel moat.',
    badgeTextClass: 'text-amber-200',
    swatchColors: ['#ded7cb', '#2a303c'],
    lightTile: 0xffffff,
    darkTile: 0xffffff,
    lightRoughness: 0.34,
    darkRoughness: 0.4,
    stoneApron: 0xffffff,
    boardFrame: 0x8e98ab,
    boardGoldTrim: 0xc29e60,
    waterMoat: 0x0c1d2b,
    citadelGround: 0x161c26,
    ruinStone: 0x8f9ab0,
    bg: 0x131a28,
    fog: 0x161f2f,
    hemiSky: 0x7c9ad0,
    hemiGround: 0x2f2622,
    keyLight: 0xcce0ff,
    fillRim: 0xffe1c4,
    flame: 0xffa638,
    ember: 0xff5a12,
  },
  'emerald-bastion': {
    id: 'emerald-bastion',
    name: 'Verdant Bastion',
    subtitle: '3D Battle Arena',
    description:
      'Frosted sage stone squares framed by mossy jade slate, antiqued bronze, and tranquil forest waters.',
    badgeTextClass: 'text-emerald-300',
    swatchColors: ['#c2d9cb', '#1d362d'],
    lightTile: 0xd0e6d8,
    darkTile: 0x5c856f,
    lightRoughness: 0.36,
    darkRoughness: 0.44,
    stoneApron: 0x7e998b,
    boardFrame: 0x627a6f,
    boardGoldTrim: 0xa49262,
    waterMoat: 0x0a221c,
    citadelGround: 0x121d1a,
    ruinStone: 0x6f8779,
    bg: 0x0e1a1b,
    fog: 0x122220,
    hemiSky: 0x89c4ae,
    hemiGround: 0x223026,
    keyLight: 0xd9f2e6,
    fillRim: 0xbff2cf,
    flame: 0xfbbf24,
    ember: 0xd97706,
  },
  'obsidian-forge': {
    id: 'obsidian-forge',
    name: 'Obsidian Forge',
    subtitle: '3D Battle Arena',
    description:
      'Smoked volcanic ash tiles inlaid with scorched basalt, ember-copper trim, and glowing furnace braziers.',
    badgeTextClass: 'text-orange-300',
    swatchColors: ['#cfc2b8', '#2a1816'],
    lightTile: 0xe6d0c3,
    darkTile: 0x593228,
    lightRoughness: 0.38,
    darkRoughness: 0.46,
    stoneApron: 0x7a5950,
    boardFrame: 0x543c37,
    boardGoldTrim: 0xd97f3c,
    waterMoat: 0x210d0c,
    citadelGround: 0x1c1211,
    ruinStone: 0x6b4f4a,
    bg: 0x191014,
    fog: 0x241517,
    hemiSky: 0xb8867a,
    hemiGround: 0x3b1b12,
    keyLight: 0xf2cfc2,
    fillRim: 0xff9f68,
    flame: 0xff7b1c,
    ember: 0xff2f0a,
  },
  'astral-sanctuary': {
    id: 'astral-sanctuary',
    name: 'Astral Sanctuary',
    subtitle: 'Prestige 3D Arena',
    description:
      'Starlight frost marble over midnight sapphire squares with gilded celestial trim and radiant mist.',
    badgeTextClass: 'text-sky-300',
    swatchColors: ['#dce8f7', '#182444'],
    lightTile: 0xe6f1ff,
    darkTile: 0x455ea3,
    lightRoughness: 0.28,
    darkRoughness: 0.34,
    stoneApron: 0x788ab8,
    boardFrame: 0x546899,
    boardGoldTrim: 0xf2ca52,
    waterMoat: 0x0c1e3b,
    citadelGround: 0x111a30,
    ruinStone: 0x7789b5,
    bg: 0x0e182e,
    fog: 0x142240,
    hemiSky: 0x94bbf5,
    hemiGround: 0x252a45,
    keyLight: 0xe4f1ff,
    fillRim: 0xfde68a,
    flame: 0x7dd3fc,
    ember: 0x0ea5e9,
  },
  'frostpeak-glacier': {
    id: 'frostpeak-glacier',
    name: 'Frostpeak Glacier',
    subtitle: '3D Battle Arena',
    description:
      'Translucent glacier-quartz tiles set against deep arctic slate, frost-silver borders, and boreal fires.',
    badgeTextClass: 'text-cyan-300',
    swatchColors: ['#d6f3ff', '#1c3b52'],
    lightTile: 0xdff5ff,
    darkTile: 0x3d6a87,
    lightRoughness: 0.22,
    darkRoughness: 0.3,
    stoneApron: 0x7aa3bd,
    boardFrame: 0x4c6e85,
    boardGoldTrim: 0xbbe6fa,
    waterMoat: 0x0a2538,
    citadelGround: 0x10202e,
    ruinStone: 0x7c9cb3,
    bg: 0x0d1c2b,
    fog: 0x13283d,
    hemiSky: 0xa2dcfa,
    hemiGround: 0x1c3142,
    keyLight: 0xe6f8ff,
    fillRim: 0xa5f3fc,
    flame: 0x67e8f9,
    ember: 0x06b6d4,
  },
  'sylvan-glade': {
    id: 'sylvan-glade',
    name: 'Elderwood Glade',
    subtitle: '3D Battle Arena',
    description:
      'Sun-dappled limestone and ancient heartwood slate surrounded by mossy ruins and golden spirit lanterns.',
    badgeTextClass: 'text-lime-300',
    swatchColors: ['#e8e4c8', '#2c4028'],
    lightTile: 0xebe6cf,
    darkTile: 0x526b46,
    lightRoughness: 0.42,
    darkRoughness: 0.48,
    stoneApron: 0x878d6e,
    boardFrame: 0x5d6449,
    boardGoldTrim: 0xd4ad56,
    waterMoat: 0x0f261b,
    citadelGround: 0x172116,
    ruinStone: 0x7a8568,
    bg: 0x111c14,
    fog: 0x18261b,
    hemiSky: 0xa9d19c,
    hemiGround: 0x2d291a,
    keyLight: 0xf7f2d7,
    fillRim: 0xbeeb88,
    flame: 0xd9f99d,
    ember: 0x84cc16,
  },
  'storm-spires': {
    id: 'storm-spires',
    name: 'Tempest Storm Spires',
    subtitle: 'Prestige 3D Arena',
    description:
      'Storm-polished cloudstone squares over thunderhead basalt, electrum trim, and arcing lightning braziers.',
    badgeTextClass: 'text-indigo-300',
    swatchColors: ['#d7e0f5', '#232842'],
    lightTile: 0xdde5f7,
    darkTile: 0x3b446e,
    lightRoughness: 0.3,
    darkRoughness: 0.36,
    stoneApron: 0x6e7899,
    boardFrame: 0x454d6e,
    boardGoldTrim: 0xb4c6fc,
    waterMoat: 0x0f1630,
    citadelGround: 0x14182b,
    ruinStone: 0x6a7294,
    bg: 0x111529,
    fog: 0x191f3b,
    hemiSky: 0x99a8eb,
    hemiGround: 0x242138,
    keyLight: 0xe3ebff,
    fillRim: 0xa5b4fc,
    flame: 0x93c5fd,
    ember: 0x6366f1,
  },
};
