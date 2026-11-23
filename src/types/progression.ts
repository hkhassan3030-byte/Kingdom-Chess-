import type {
  AIDifficulty,
  BoardThemeId,
  CharacterSetId,
  CommanderAvatarId,
  PieceSkinId,
} from './chess';

export type CurrencyType = 'coins' | 'gems';

export interface CurrencyWallet {
  coins: number;
  gems: number;
}

export type UnlockableCategory =
  | 'character_set'
  | 'piece_skin'
  | 'board_theme'
  | 'avatar_crest';

export interface UnlockableItem {
  id: string;
  category: UnlockableCategory;
  targetId: CharacterSetId | PieceSkinId | BoardThemeId | CommanderAvatarId;
  name: string;
  subtitle: string;
  description: string;
  currency: CurrencyType;
  cost: number;
  starterUnlocked?: boolean;
  swatchColors: [string, string];
  badgeTextClass: string;
}

export interface MilestoneDefinition {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  rewardGems: number;
  targetValue: number;
}

export interface MilestoneProgress {
  definition: MilestoneDefinition;
  currentValue: number;
  completed: boolean;
  claimed: boolean;
  claimable: boolean;
}

export type RewardTransactionSource =
  | 'starter_grant'
  | 'match_reward'
  | 'first_time_bonus'
  | 'milestone_claim'
  | 'unlock_purchase';

export interface ProgressionTransaction {
  id: string;
  source: RewardTransactionSource;
  label: string;
  coinsDelta: number;
  gemsDelta: number;
  createdAt: number;
}

export interface FirstTimeBonusEntry {
  id: string;
  label: string;
  coins: number;
  gems: number;
}

export interface MatchRewardSummary {
  matchId: string;
  eligible: boolean;
  ineligibleReason?: string;
  baseCoins: number;
  baseGems: number;
  firstTimeBonuses: FirstTimeBonusEntry[];
  totalCoins: number;
  totalGems: number;
  newlyReadyMilestones: string[];
}

export interface ProgressionState {
  version: 1;
  wallet: CurrencyWallet;
  unlockedIds: string[];
  equippedBoardTheme: BoardThemeId;
  equippedPieceSkin: PieceSkinId;
  claimedMatchIds: string[];
  claimedFirstTimeIds: string[];
  claimedMilestones: string[];
  firstWinDifficulties: AIDifficulty[];
  bestRecordedWinStreak: number;
  pvpCompletedCount: number;
  checkmateWinCount: number;
  transactions: ProgressionTransaction[];
}
