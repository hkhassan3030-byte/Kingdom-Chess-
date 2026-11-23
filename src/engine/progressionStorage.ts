import type { AIDifficulty, BoardThemeId, GameSettings, PieceSkinId, PlayerProfile } from '../types/chess';
import type { ProgressionState, ProgressionTransaction } from '../types/progression';
import { STARTER_WALLET } from './rewards';
import {
  UNLOCKABLE_BY_ID,
  STARTER_UNLOCKED_IDS,
  getAvatarUnlockId,
  getBoardThemeUnlockId,
  getCharacterSetUnlockId,
  getPieceSkinUnlockId,
} from './unlockables';

export const PROGRESSION_STORAGE_KEY = 'kingdom-chess-progression-v1';

const VALID_BOARD_THEMES: BoardThemeId[] = [
  'classic-citadel',
  'emerald-bastion',
  'obsidian-forge',
  'astral-sanctuary',
  'frostpeak-glacier',
  'sylvan-glade',
  'storm-spires',
];

const VALID_PIECE_SKINS: PieceSkinId[] = [
  'royal-standard',
  'gilded-champion',
  'ivory-marble',
  'runed-cobalt',
  'obsidian-crimson',
];

const VALID_DIFFICULTIES: AIDifficulty[] = [
  'easy',
  'normal',
  'hard',
  'expert',
  'grandmaster',
];

function computeInitialStreakFromProfile(profile: PlayerProfile): number {
  let maxWins = 0;
  let running = 0;
  const recent = profile.recentMatches ?? [];
  for (let i = recent.length - 1; i >= 0; i--) {
    const m = recent[i];
    if (m.mode !== 'ai') continue;
    if (m.result === 'win') {
      running++;
      if (running > maxWins) maxWins = running;
    } else {
      running = 0;
    }
  }
  return maxWins;
}

export function createInitialProgressionState(
  existingProfile?: PlayerProfile,
  existingSettings?: GameSettings
): ProgressionState {
  const unlockedSet = new Set<string>(STARTER_UNLOCKED_IDS);

  // Preserve any Kingdom set or Avatar Crest a returning Phase 3 user already had active
  if (existingSettings?.characterSet) {
    const setUnlockId = getCharacterSetUnlockId(existingSettings.characterSet);
    if (UNLOCKABLE_BY_ID[setUnlockId]) {
      unlockedSet.add(setUnlockId);
    }
  }
  if (existingSettings?.boardTheme) {
    const boardUnlockId = getBoardThemeUnlockId(existingSettings.boardTheme);
    if (UNLOCKABLE_BY_ID[boardUnlockId]) {
      unlockedSet.add(boardUnlockId);
    }
  }
  if (existingSettings?.pieceSkin) {
    const skinUnlockId = getPieceSkinUnlockId(existingSettings.pieceSkin);
    if (UNLOCKABLE_BY_ID[skinUnlockId]) {
      unlockedSet.add(skinUnlockId);
    }
  }
  if (existingProfile?.avatarId) {
    const avatarUnlockId = getAvatarUnlockId(existingProfile.avatarId);
    if (UNLOCKABLE_BY_ID[avatarUnlockId]) {
      unlockedSet.add(avatarUnlockId);
    }
  }

  const equippedBoardTheme: BoardThemeId =
    existingSettings?.boardTheme && VALID_BOARD_THEMES.includes(existingSettings.boardTheme)
      ? existingSettings.boardTheme
      : 'classic-citadel';

  const equippedPieceSkin: PieceSkinId =
    existingSettings?.pieceSkin && VALID_PIECE_SKINS.includes(existingSettings.pieceSkin)
      ? existingSettings.pieceSkin
      : 'royal-standard';

  const starterTx: ProgressionTransaction = {
    id: 'starter:treasury_v1',
    source: 'starter_grant',
    label: 'Royal Treasury Starter Grant',
    coinsDelta: STARTER_WALLET.coins,
    gemsDelta: STARTER_WALLET.gems,
    createdAt: Date.now(),
  };

  return {
    version: 1,
    wallet: {
      coins: STARTER_WALLET.coins,
      gems: STARTER_WALLET.gems,
    },
    unlockedIds: Array.from(unlockedSet),
    equippedBoardTheme,
    equippedPieceSkin,
    claimedMatchIds: [],
    claimedFirstTimeIds: [],
    claimedMilestones: [],
    firstWinDifficulties: [],
    bestRecordedWinStreak: existingProfile
      ? computeInitialStreakFromProfile(existingProfile)
      : 0,
    pvpCompletedCount: 0,
    checkmateWinCount: 0,
    transactions: [starterTx],
  };
}

function sanitizeTransactions(raw: unknown): ProgressionTransaction[] {
  if (!Array.isArray(raw)) return [];
  const valid: ProgressionTransaction[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const t = entry as Partial<ProgressionTransaction>;
    if (
      typeof t.id === 'string' &&
      typeof t.label === 'string' &&
      typeof t.coinsDelta === 'number' &&
      Number.isFinite(t.coinsDelta) &&
      typeof t.gemsDelta === 'number' &&
      Number.isFinite(t.gemsDelta) &&
      typeof t.createdAt === 'number' &&
      Number.isFinite(t.createdAt)
    ) {
      valid.push({
        id: t.id,
        source:
          t.source === 'starter_grant' ||
          t.source === 'match_reward' ||
          t.source === 'first_time_bonus' ||
          t.source === 'milestone_claim' ||
          t.source === 'unlock_purchase'
            ? t.source
            : 'match_reward',
        label: t.label,
        coinsDelta: Math.round(t.coinsDelta),
        gemsDelta: Math.round(t.gemsDelta),
        createdAt: t.createdAt,
      });
    }
    if (valid.length >= 40) break;
  }
  return valid;
}

function sanitizeStringArray(raw: unknown, maxLen: number): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.length > 0 && !seen.has(item)) {
      seen.add(item);
      out.push(item);
      if (out.length >= maxLen) break;
    }
  }
  return out;
}

export function migrateProgressionState(
  raw: unknown,
  existingProfile?: PlayerProfile,
  existingSettings?: GameSettings
): ProgressionState {
  if (!raw || typeof raw !== 'object') {
    return createInitialProgressionState(existingProfile, existingSettings);
  }

  const parsed = raw as Partial<ProgressionState>;
  const fallback = createInitialProgressionState(existingProfile, existingSettings);

  const coins =
    typeof parsed.wallet?.coins === 'number' && Number.isFinite(parsed.wallet.coins)
      ? Math.max(0, Math.floor(parsed.wallet.coins))
      : fallback.wallet.coins;
  const gems =
    typeof parsed.wallet?.gems === 'number' && Number.isFinite(parsed.wallet.gems)
      ? Math.max(0, Math.floor(parsed.wallet.gems))
      : fallback.wallet.gems;

  const unlockedSet = new Set<string>(STARTER_UNLOCKED_IDS);
  for (const id of sanitizeStringArray(parsed.unlockedIds, 64)) {
    if (UNLOCKABLE_BY_ID[id]) {
      unlockedSet.add(id);
    }
  }

  // Ensure active settings characterSet & avatar remain unlocked if previously equipped
  if (existingSettings?.characterSet) {
    const activeSetId = getCharacterSetUnlockId(existingSettings.characterSet);
    if (UNLOCKABLE_BY_ID[activeSetId] && parsed.version === undefined) {
      unlockedSet.add(activeSetId);
    }
  }

  const equippedBoardTheme: BoardThemeId =
    typeof parsed.equippedBoardTheme === 'string' &&
    VALID_BOARD_THEMES.includes(parsed.equippedBoardTheme as BoardThemeId) &&
    unlockedSet.has(getBoardThemeUnlockId(parsed.equippedBoardTheme as BoardThemeId))
      ? (parsed.equippedBoardTheme as BoardThemeId)
      : 'classic-citadel';

  const equippedPieceSkin: PieceSkinId =
    typeof parsed.equippedPieceSkin === 'string' &&
    VALID_PIECE_SKINS.includes(parsed.equippedPieceSkin as PieceSkinId) &&
    unlockedSet.has(getPieceSkinUnlockId(parsed.equippedPieceSkin as PieceSkinId))
      ? (parsed.equippedPieceSkin as PieceSkinId)
      : 'royal-standard';

  const firstWinDifficulties = Array.isArray(parsed.firstWinDifficulties)
    ? parsed.firstWinDifficulties.filter((d): d is AIDifficulty =>
        VALID_DIFFICULTIES.includes(d as AIDifficulty)
      )
    : [];

  return {
    version: 1,
    wallet: { coins, gems },
    unlockedIds: Array.from(unlockedSet),
    equippedBoardTheme,
    equippedPieceSkin,
    claimedMatchIds: sanitizeStringArray(parsed.claimedMatchIds, 200),
    claimedFirstTimeIds: sanitizeStringArray(parsed.claimedFirstTimeIds, 64),
    claimedMilestones: sanitizeStringArray(parsed.claimedMilestones, 64),
    firstWinDifficulties: Array.from(new Set(firstWinDifficulties)),
    bestRecordedWinStreak:
      typeof parsed.bestRecordedWinStreak === 'number' &&
      Number.isFinite(parsed.bestRecordedWinStreak) &&
      parsed.bestRecordedWinStreak >= 0
        ? Math.max(fallback.bestRecordedWinStreak, Math.floor(parsed.bestRecordedWinStreak))
        : fallback.bestRecordedWinStreak,
    pvpCompletedCount:
      typeof parsed.pvpCompletedCount === 'number' &&
      Number.isFinite(parsed.pvpCompletedCount) &&
      parsed.pvpCompletedCount >= 0
        ? Math.floor(parsed.pvpCompletedCount)
        : 0,
    checkmateWinCount:
      typeof parsed.checkmateWinCount === 'number' &&
      Number.isFinite(parsed.checkmateWinCount) &&
      parsed.checkmateWinCount >= 0
        ? Math.floor(parsed.checkmateWinCount)
        : 0,
    transactions: sanitizeTransactions(parsed.transactions),
  };
}

export function loadProgressionState(
  existingProfile?: PlayerProfile,
  existingSettings?: GameSettings
): ProgressionState {
  try {
    const raw = window.localStorage.getItem(PROGRESSION_STORAGE_KEY);
    if (!raw) {
      return createInitialProgressionState(existingProfile, existingSettings);
    }
    return migrateProgressionState(JSON.parse(raw), existingProfile, existingSettings);
  } catch {
    return createInitialProgressionState(existingProfile, existingSettings);
  }
}

export function saveProgressionState(state: ProgressionState): void {
  try {
    window.localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors cleanly
  }
}
