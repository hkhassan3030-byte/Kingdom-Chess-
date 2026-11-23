import type { BoardThemeId, CharacterSetId, CommanderAvatarId, PieceSkinId } from '../types/chess';
import type {
  CurrencyWallet,
  ProgressionState,
  ProgressionTransaction,
  UnlockableCategory,
  UnlockableItem,
} from '../types/progression';

export const STARTER_UNLOCKED_IDS: string[] = [
  'set:human',
  'skin:royal-standard',
  'board:classic-citadel',
  'avatar:crown',
  'avatar:knight',
  'avatar:sword',
  'avatar:shield',
];

export const UNLOCKABLE_CATALOG: UnlockableItem[] = [
  // Hero Kingdoms (5)
  {
    id: 'set:human',
    category: 'character_set',
    targetId: 'human',
    name: 'Human Royal Kingdom',
    subtitle: 'Starter Hero Set',
    description:
      'Classic medieval sovereigns, arcane queens, paladin bishops, centaur lancers, and shield wardens.',
    currency: 'coins',
    cost: 0,
    starterUnlocked: true,
    swatchColors: ['#e7dfd2', '#d4a345'],
    badgeTextClass: 'text-amber-300',
  },
  {
    id: 'set:titan',
    category: 'character_set',
    targetId: 'titan',
    name: 'Titan Vanguard',
    subtitle: 'Wall Garrison Corps',
    description:
      'Disciplined garrison regiments wielding twin tempered blades and tactical field coats.',
    currency: 'coins',
    cost: 120,
    swatchColors: ['#cbd5c0', '#3f624d'],
    badgeTextClass: 'text-emerald-300',
  },
  {
    id: 'set:inferno',
    category: 'character_set',
    targetId: 'inferno',
    name: 'Inferno Empire',
    subtitle: 'Obsidian & Ember Forge',
    description:
      'Volcanic emperors and magma champions armored in blackened iron and molten ember cores.',
    currency: 'coins',
    cost: 280,
    swatchColors: ['#fb923c', '#991b1b'],
    badgeTextClass: 'text-orange-300',
  },
  {
    id: 'set:shadow',
    category: 'character_set',
    targetId: 'shadow',
    name: 'Shadow Dominion',
    subtitle: 'Void Veil & Dread Steel',
    description:
      'Gothic dread monarchs and midnight shadow-blades wreathed in violet spirit fire.',
    currency: 'coins',
    cost: 450,
    swatchColors: ['#c084fc', '#4f46e5'],
    badgeTextClass: 'text-purple-300',
  },
  {
    id: 'set:celestial',
    category: 'character_set',
    targetId: 'celestial',
    name: 'Celestial Kingdom',
    subtitle: 'Prestige Astral Set',
    description:
      'Luminescent sovereigns, seraphic queens, and astral paladins in silver-gold armor.',
    currency: 'gems',
    cost: 18,
    swatchColors: ['#e0f2fe', '#facc15'],
    badgeTextClass: 'text-sky-300',
  },
  {
    id: 'set:frostguard',
    category: 'character_set',
    targetId: 'frostguard',
    name: 'Frostborn Citadel',
    subtitle: 'Cryo Rune Assault',
    description:
      'Northern jarls, frost valkyries, and glacial bastions forged in enchanted rune-steel and ermine.',
    currency: 'coins',
    cost: 520,
    swatchColors: ['#cffafe', '#0284c7'],
    badgeTextClass: 'text-cyan-300',
  },
  {
    id: 'set:sylvan',
    category: 'character_set',
    targetId: 'sylvan',
    name: 'Sylvan Elderwood',
    subtitle: 'Grove Warden Strike',
    description:
      'Antler-crowned grove monarchs, dual-blade thornwardens, and living oak bastions.',
    currency: 'coins',
    cost: 640,
    swatchColors: ['#d9f99d', '#15803d'],
    badgeTextClass: 'text-lime-300',
  },
  {
    id: 'set:storm',
    category: 'character_set',
    targetId: 'storm',
    name: 'Tempest Valkyrie',
    subtitle: 'Tempest Lightning Surge',
    description:
      'Wing-crested storm sovereigns and lightning valkyries clad in stormforged bronze and cobalt.',
    currency: 'gems',
    cost: 24,
    swatchColors: ['#fde047', '#4338ca'],
    badgeTextClass: 'text-indigo-300',
  },

  // Character Piece Skins (5)
  {
    id: 'skin:royal-standard',
    category: 'piece_skin',
    targetId: 'royal-standard',
    name: 'Royal Citadel Finish',
    subtitle: 'Starter Piece Skin',
    description:
      'Classic Kingdom forged armor, linen cloaks, and tempered steel balanced for crisp contrast.',
    currency: 'coins',
    cost: 0,
    starterUnlocked: true,
    swatchColors: ['#e2d9c8', '#334155'],
    badgeTextClass: 'text-amber-200',
  },
  {
    id: 'skin:gilded-champion',
    category: 'piece_skin',
    targetId: 'gilded-champion',
    name: 'Gilded Sovereign Finish',
    subtitle: 'Character Piece Skin',
    description:
      'Burnished gold filigree trim with sun-gleaming blades over deep iron and ivory armor.',
    currency: 'coins',
    cost: 180,
    swatchColors: ['#fef3c7', '#d97706'],
    badgeTextClass: 'text-amber-300',
  },
  {
    id: 'skin:ivory-marble',
    category: 'piece_skin',
    targetId: 'ivory-marble',
    name: 'Sculpted Marble Finish',
    subtitle: 'Character Piece Skin',
    description:
      'Polished alabaster and carved basalt plate finish inspired by grand cathedral statues.',
    currency: 'coins',
    cost: 240,
    swatchColors: ['#f8fafc', '#475569'],
    badgeTextClass: 'text-slate-200',
  },
  {
    id: 'skin:runed-cobalt',
    category: 'piece_skin',
    targetId: 'runed-cobalt',
    name: 'Runed Cobalt Finish',
    subtitle: 'Character Piece Skin',
    description:
      'Arcane sapphire-glazed steel with luminous rune edges on blades, shields, and crowns.',
    currency: 'coins',
    cost: 320,
    swatchColors: ['#bae6fd', '#1d4ed8'],
    badgeTextClass: 'text-cyan-300',
  },
  {
    id: 'skin:obsidian-crimson',
    category: 'piece_skin',
    targetId: 'obsidian-crimson',
    name: 'Bloodmoon Forged Finish',
    subtitle: 'Prestige Piece Skin',
    description:
      'Darkened tournament steel and crimson-gold accents glowing cleanly on White and Black forces.',
    currency: 'gems',
    cost: 10,
    swatchColors: ['#e2e8f0', '#991b1b'],
    badgeTextClass: 'text-rose-300',
  },

  // 3D Battle Arenas (7)
  {
    id: 'board:classic-citadel',
    category: 'board_theme',
    targetId: 'classic-citadel',
    name: 'Citadel Alabaster',
    subtitle: 'Starter Battle Arena',
    description: 'Moonlit ivory marble paired with deep obsidian stone and warm royal brass trim.',
    currency: 'coins',
    cost: 0,
    starterUnlocked: true,
    swatchColors: ['#ded7cb', '#2a303c'],
    badgeTextClass: 'text-amber-200',
  },
  {
    id: 'board:emerald-bastion',
    category: 'board_theme',
    targetId: 'emerald-bastion',
    name: 'Verdant Bastion',
    subtitle: '3D Battle Arena',
    description: 'Frosted sage stone squares framed by dark jade slate and antiqued bronze.',
    currency: 'coins',
    cost: 160,
    swatchColors: ['#c2d9cb', '#1d362d'],
    badgeTextClass: 'text-emerald-300',
  },
  {
    id: 'board:obsidian-forge',
    category: 'board_theme',
    targetId: 'obsidian-forge',
    name: 'Obsidian Forge',
    subtitle: '3D Battle Arena',
    description: 'Smoked volcanic ash squares inlaid with scorched basalt and ember-copper trim.',
    currency: 'coins',
    cost: 320,
    swatchColors: ['#cfc2b8', '#2a1816'],
    badgeTextClass: 'text-orange-300',
  },
  {
    id: 'board:astral-sanctuary',
    category: 'board_theme',
    targetId: 'astral-sanctuary',
    name: 'Astral Sanctuary',
    subtitle: 'Prestige Battle Arena',
    description: 'Starlight frost marble over midnight sapphire tiles with gilded celestial trim.',
    currency: 'gems',
    cost: 12,
    swatchColors: ['#dce8f7', '#182444'],
    badgeTextClass: 'text-sky-300',
  },
  {
    id: 'board:frostpeak-glacier',
    category: 'board_theme',
    targetId: 'frostpeak-glacier',
    name: 'Frostpeak Glacier',
    subtitle: '3D Battle Arena',
    description: 'Glacial snowstone squares and deep ice-slate over a frozen northern moat.',
    currency: 'coins',
    cost: 260,
    swatchColors: ['#e0f2fe', '#16354d'],
    badgeTextClass: 'text-cyan-300',
  },
  {
    id: 'board:sylvan-glade',
    category: 'board_theme',
    targetId: 'sylvan-glade',
    name: 'Sylvan Glade',
    subtitle: '3D Battle Arena',
    description: 'Sun-dappled limestone squares bordered by mossy elderwood and emerald springs.',
    currency: 'coins',
    cost: 360,
    swatchColors: ['#e2ead3', '#233622'],
    badgeTextClass: 'text-lime-300',
  },
  {
    id: 'board:storm-spires',
    category: 'board_theme',
    targetId: 'storm-spires',
    name: 'Stormvault Spires',
    subtitle: 'Prestige Battle Arena',
    description: 'Thunderhead granite and storm-indigo slate lit by crackling skyfire braziers.',
    currency: 'gems',
    cost: 14,
    swatchColors: ['#d7e0f2', '#1d223f'],
    badgeTextClass: 'text-indigo-300',
  },

  // Commander Royal Crests (2 unlockable prestige crests alongside 4 starters)
  {
    id: 'avatar:crown',
    category: 'avatar_crest',
    targetId: 'crown',
    name: 'Sovereign Crown',
    subtitle: 'Starter Crest',
    description: 'Royal sovereign emblem.',
    currency: 'coins',
    cost: 0,
    starterUnlocked: true,
    swatchColors: ['#f5c451', '#78350f'],
    badgeTextClass: 'text-amber-300',
  },
  {
    id: 'avatar:knight',
    category: 'avatar_crest',
    targetId: 'knight',
    name: 'Champion Trophy',
    subtitle: 'Starter Crest',
    description: 'Tournament victor crest.',
    currency: 'coins',
    cost: 0,
    starterUnlocked: true,
    swatchColors: ['#f5c451', '#78350f'],
    badgeTextClass: 'text-amber-300',
  },
  {
    id: 'avatar:sword',
    category: 'avatar_crest',
    targetId: 'sword',
    name: 'Warlord Blades',
    subtitle: 'Starter Crest',
    description: 'Crossed vanguard steel.',
    currency: 'coins',
    cost: 0,
    starterUnlocked: true,
    swatchColors: ['#f5c451', '#78350f'],
    badgeTextClass: 'text-amber-300',
  },
  {
    id: 'avatar:shield',
    category: 'avatar_crest',
    targetId: 'shield',
    name: 'Citadel Aegis',
    subtitle: 'Starter Crest',
    description: 'Defender bastion crest.',
    currency: 'coins',
    cost: 0,
    starterUnlocked: true,
    swatchColors: ['#f5c451', '#78350f'],
    badgeTextClass: 'text-amber-300',
  },
  {
    id: 'avatar:flame',
    category: 'avatar_crest',
    targetId: 'flame',
    name: 'Ember Phoenix',
    subtitle: 'Commander Crest',
    description: 'Blazing warcrest forged in the Imperial Citadel.',
    currency: 'coins',
    cost: 100,
    swatchColors: ['#fb923c', '#9a3412'],
    badgeTextClass: 'text-orange-300',
  },
  {
    id: 'avatar:astral',
    category: 'avatar_crest',
    targetId: 'astral',
    name: 'Astral Halo',
    subtitle: 'Prestige Crest',
    description: 'Radiant starlight crest reserved for master commanders.',
    currency: 'gems',
    cost: 8,
    swatchColors: ['#38bdf8', '#1e3a8a'],
    badgeTextClass: 'text-sky-300',
  },
];

export const UNLOCKABLE_BY_ID: Record<string, UnlockableItem> = Object.fromEntries(
  UNLOCKABLE_CATALOG.map((item) => [item.id, item])
);

export function getCharacterSetUnlockId(setId: CharacterSetId): string {
  return `set:${setId}`;
}

export function getPieceSkinUnlockId(skinId: PieceSkinId): string {
  return `skin:${skinId}`;
}

export function getBoardThemeUnlockId(themeId: BoardThemeId): string {
  return `board:${themeId}`;
}

export function getAvatarUnlockId(avatarId: CommanderAvatarId): string {
  return `avatar:${avatarId}`;
}

export function isItemUnlocked(unlockedIds: readonly string[], itemId: string): boolean {
  const item = UNLOCKABLE_BY_ID[itemId];
  if (item?.starterUnlocked) return true;
  return unlockedIds.includes(itemId);
}

export function isCharacterSetUnlocked(
  unlockedIds: readonly string[],
  setId: CharacterSetId
): boolean {
  return isItemUnlocked(unlockedIds, getCharacterSetUnlockId(setId));
}

export function isPieceSkinUnlocked(
  unlockedIds: readonly string[],
  skinId: PieceSkinId
): boolean {
  return isItemUnlocked(unlockedIds, getPieceSkinUnlockId(skinId));
}

export function isBoardThemeUnlocked(
  unlockedIds: readonly string[],
  themeId: BoardThemeId
): boolean {
  return isItemUnlocked(unlockedIds, getBoardThemeUnlockId(themeId));
}

export function isAvatarUnlocked(
  unlockedIds: readonly string[],
  avatarId: CommanderAvatarId
): boolean {
  return isItemUnlocked(unlockedIds, getAvatarUnlockId(avatarId));
}

export function canAffordUnlock(wallet: CurrencyWallet, item: UnlockableItem): boolean {
  if (item.cost <= 0) return true;
  return item.currency === 'coins' ? wallet.coins >= item.cost : wallet.gems >= item.cost;
}

export function getItemsByCategory(category: UnlockableCategory): UnlockableItem[] {
  return UNLOCKABLE_CATALOG.filter((item) => item.category === category);
}

export interface UnlockAttemptResult {
  success: boolean;
  reason?: 'not_found' | 'already_unlocked' | 'insufficient_funds';
  nextState: ProgressionState;
  unlockedItem?: UnlockableItem;
}

export function unlockCatalogItem(
  state: ProgressionState,
  itemId: string,
  now = Date.now()
): UnlockAttemptResult {
  const item = UNLOCKABLE_BY_ID[itemId];
  if (!item) {
    return { success: false, reason: 'not_found', nextState: state };
  }
  if (isItemUnlocked(state.unlockedIds, itemId)) {
    return { success: false, reason: 'already_unlocked', nextState: state };
  }
  if (!canAffordUnlock(state.wallet, item)) {
    return { success: false, reason: 'insufficient_funds', nextState: state };
  }

  const coinsDelta = item.currency === 'coins' ? -item.cost : 0;
  const gemsDelta = item.currency === 'gems' ? -item.cost : 0;

  const nextWallet: CurrencyWallet = {
    coins: Math.max(0, state.wallet.coins + coinsDelta),
    gems: Math.max(0, state.wallet.gems + gemsDelta),
  };

  const tx: ProgressionTransaction = {
    id: `unlock:${item.id}:${now}`,
    source: 'unlock_purchase',
    label: `Unlocked ${item.name}`,
    coinsDelta,
    gemsDelta,
    createdAt: now,
  };

  const nextUnlockedIds = state.unlockedIds.includes(item.id)
    ? state.unlockedIds
    : [...state.unlockedIds, item.id];

  return {
    success: true,
    unlockedItem: item,
    nextState: {
      ...state,
      wallet: nextWallet,
      unlockedIds: nextUnlockedIds,
      transactions: [tx, ...state.transactions].slice(0, 40),
    },
  };
}
