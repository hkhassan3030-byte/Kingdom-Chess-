import type {
  AIDifficulty,
  GameMode,
  GameStatus,
  PieceColor,
  PlayerProfile,
} from '../types/chess';
import {
  AI_PROFILES,
} from '../types/chess';
import type {
  CurrencyWallet,
  FirstTimeBonusEntry,
  MatchRewardSummary,
  MilestoneDefinition,
  MilestoneProgress,
  ProgressionState,
  ProgressionTransaction,
} from '../types/progression';
import { STARTER_UNLOCKED_IDS, UNLOCKABLE_BY_ID } from './unlockables';

export const STARTER_WALLET: CurrencyWallet = {
  coins: 150,
  gems: 5,
};

export const REWARD_CONFIG = {
  minMovesForCheckmateOrDraw: 4,
  minMovesForResignOrTimeoutWin: 6,
  minMovesForDefeatValor: 12,
  minMovesForPvPReward: 10,
  aiWinCoins: {
    easy: 40,
    normal: 65,
    hard: 95,
    expert: 130,
    grandmaster: 180,
  } as Record<AIDifficulty, number>,
  aiWinGems: {
    easy: 0,
    normal: 1,
    hard: 2,
    expert: 4,
    grandmaster: 7,
  } as Record<AIDifficulty, number>,
  aiCheckmateBonusCoins: 15,
  aiDrawCoins: {
    easy: 15,
    normal: 25,
    hard: 35,
    expert: 45,
    grandmaster: 60,
  } as Record<AIDifficulty, number>,
  aiDefeatValorCoins: 10,
  pvpCompletionCoins: 20,
  firstTime: {
    firstMatch: { id: 'first:match', label: 'First Battle Completed', coins: 50, gems: 2 },
    firstAiWin: { id: 'first:ai_win', label: 'First AI Victory', coins: 75, gems: 3 },
    firstPvpMatch: { id: 'first:pvp_match', label: 'First Local 1 vs 1 Match', coins: 40, gems: 0 },
    firstCheckmate: { id: 'first:checkmate', label: 'First Checkmate Victory', coins: 60, gems: 2 },
    perDifficultyWin: {
      easy: { coins: 40, gems: 1 },
      normal: { coins: 70, gems: 2 },
      hard: { coins: 110, gems: 3 },
      expert: { coins: 160, gems: 5 },
      grandmaster: { coins: 250, gems: 10 },
    } as Record<AIDifficulty, { coins: number; gems: number }>,
  },
} as const;

export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  {
    id: 'milestone:wins_3',
    title: 'Seasoned Tactician',
    description: 'Win 3 AI battles to prove your command.',
    rewardCoins: 90,
    rewardGems: 2,
    targetValue: 3,
  },
  {
    id: 'milestone:wins_10',
    title: 'Kingdom Champion',
    description: 'Achieve 10 victories against the AI.',
    rewardCoins: 180,
    rewardGems: 5,
    targetValue: 10,
  },
  {
    id: 'milestone:wins_25',
    title: 'High Sovereign',
    description: 'Claim 25 AI victories across any Kingdom.',
    rewardCoins: 350,
    rewardGems: 10,
    targetValue: 25,
  },
  {
    id: 'milestone:streak_3',
    title: 'Unbroken Vanguard',
    description: 'Reach a 3-win streak against AI opponents.',
    rewardCoins: 100,
    rewardGems: 3,
    targetValue: 3,
  },
  {
    id: 'milestone:streak_5',
    title: 'Royal Conqueror',
    description: 'Reach a 5-win streak against AI opponents.',
    rewardCoins: 200,
    rewardGems: 6,
    targetValue: 5,
  },
  {
    id: 'milestone:rating_1300',
    title: 'Silver Strategist',
    description: 'Reach 1300 Commander Rating.',
    rewardCoins: 120,
    rewardGems: 4,
    targetValue: 1300,
  },
  {
    id: 'milestone:rating_1450',
    title: 'Golden Grandmaster',
    description: 'Reach 1450 Commander Rating.',
    rewardCoins: 250,
    rewardGems: 8,
    targetValue: 1450,
  },
  {
    id: 'milestone:unlock_2',
    title: 'Collector of Crowns',
    description: 'Unlock 2 additional Kingdoms, Piece Skins, Arenas, or Crests.',
    rewardCoins: 80,
    rewardGems: 3,
    targetValue: 2,
  },
  {
    id: 'milestone:unlock_5',
    title: 'Realm Collector',
    description: 'Unlock 5 additional Kingdoms, Piece Skins, Arenas, or Crests.',
    rewardCoins: 160,
    rewardGems: 5,
    targetValue: 5,
  },
];

export interface CompletedMatchInput {
  matchId: string;
  mode: GameMode;
  difficulty: AIDifficulty;
  playerColor: PieceColor;
  status: GameStatus;
}

export function getUnlockedNonStarterCount(unlockedIds: readonly string[]): number {
  let count = 0;
  for (const id of unlockedIds) {
    const item = UNLOCKABLE_BY_ID[id];
    if (item && !item.starterUnlocked && !STARTER_UNLOCKED_IDS.includes(id)) {
      count++;
    }
  }
  return count;
}

export function evaluateMilestones(
  profile: PlayerProfile,
  state: ProgressionState
): MilestoneProgress[] {
  const unlockedExtras = getUnlockedNonStarterCount(state.unlockedIds);

  return MILESTONE_DEFINITIONS.map((definition) => {
    let currentValue = 0;
    switch (definition.id) {
      case 'milestone:wins_3':
      case 'milestone:wins_10':
      case 'milestone:wins_25':
        currentValue = profile.wins;
        break;
      case 'milestone:streak_3':
      case 'milestone:streak_5':
        currentValue = state.bestRecordedWinStreak;
        break;
      case 'milestone:rating_1300':
      case 'milestone:rating_1450':
        currentValue = profile.rating;
        break;
      case 'milestone:unlock_2':
      case 'milestone:unlock_5':
        currentValue = unlockedExtras;
        break;
      default:
        currentValue = 0;
    }

    const completed = currentValue >= definition.targetValue;
    const claimed = state.claimedMilestones.includes(definition.id);
    return {
      definition,
      currentValue: Math.min(currentValue, definition.targetValue),
      completed,
      claimed,
      claimable: completed && !claimed,
    };
  });
}

export function countClaimableMilestones(
  profile: PlayerProfile,
  state: ProgressionState
): number {
  const list = evaluateMilestones(profile, state);
  let count = 0;
  for (const m of list) {
    if (m.claimable) count++;
  }
  return count;
}

export function calculateMatchReward(
  input: CompletedMatchInput,
  state: ProgressionState
): MatchRewardSummary {
  const { matchId, mode, difficulty, playerColor, status } = input;

  if (!status.isGameOver || !status.winner || !status.reason) {
    return {
      matchId,
      eligible: false,
      ineligibleReason: 'Incomplete match',
      baseCoins: 0,
      baseGems: 0,
      firstTimeBonuses: [],
      totalCoins: 0,
      totalGems: 0,
      newlyReadyMilestones: [],
    };
  }

  if (state.claimedMatchIds.includes(matchId)) {
    return {
      matchId,
      eligible: false,
      ineligibleReason: 'Reward already claimed for this match',
      baseCoins: 0,
      baseGems: 0,
      firstTimeBonuses: [],
      totalCoins: 0,
      totalGems: 0,
      newlyReadyMilestones: [],
    };
  }

  const moveCount = Math.max(0, status.moveCount);
  const isDraw = status.winner === 'draw';
  const didAiWin = mode === 'ai' && !isDraw && status.winner === playerColor;
  const isCheckmate = status.reason === 'checkmate';

  // Strict validity rules so instant resigns, aborted boards, or ultra-short shuffles cannot be farmed
  if (mode === 'pvp') {
    if (status.reason === 'resignation' && moveCount < REWARD_CONFIG.minMovesForPvPReward) {
      return {
        matchId,
        eligible: false,
        ineligibleReason: 'Local 1 vs 1 resignations require at least 10 moves to earn rewards.',
        baseCoins: 0,
        baseGems: 0,
        firstTimeBonuses: [],
        totalCoins: 0,
        totalGems: 0,
        newlyReadyMilestones: [],
      };
    }
    if (moveCount < REWARD_CONFIG.minMovesForPvPReward && !isCheckmate) {
      return {
        matchId,
        eligible: false,
        ineligibleReason: 'Play at least 10 moves in Local 1 vs 1 to earn match Coins.',
        baseCoins: 0,
        baseGems: 0,
        firstTimeBonuses: [],
        totalCoins: 0,
        totalGems: 0,
        newlyReadyMilestones: [],
      };
    }
    if (moveCount < REWARD_CONFIG.minMovesForCheckmateOrDraw) {
      return {
        matchId,
        eligible: false,
        ineligibleReason: 'Match too short for reward eligibility.',
        baseCoins: 0,
        baseGems: 0,
        firstTimeBonuses: [],
        totalCoins: 0,
        totalGems: 0,
        newlyReadyMilestones: [],
      };
    }

    const baseCoins = REWARD_CONFIG.pvpCompletionCoins;
    const firstTimeBonuses: FirstTimeBonusEntry[] = [];
    if (!state.claimedFirstTimeIds.includes(REWARD_CONFIG.firstTime.firstMatch.id)) {
      firstTimeBonuses.push({ ...REWARD_CONFIG.firstTime.firstMatch });
    }
    if (!state.claimedFirstTimeIds.includes(REWARD_CONFIG.firstTime.firstPvpMatch.id)) {
      firstTimeBonuses.push({ ...REWARD_CONFIG.firstTime.firstPvpMatch });
    }

    const bonusCoins = firstTimeBonuses.reduce((sum, b) => sum + b.coins, 0);
    const bonusGems = firstTimeBonuses.reduce((sum, b) => sum + b.gems, 0);

    return {
      matchId,
      eligible: true,
      baseCoins,
      baseGems: 0,
      firstTimeBonuses,
      totalCoins: baseCoins + bonusCoins,
      totalGems: bonusGems,
      newlyReadyMilestones: [],
    };
  }

  // Player vs AI eligibility
  if (status.reason === 'resignation' && !didAiWin) {
    return {
      matchId,
      eligible: false,
      ineligibleReason: 'Resigned matches do not award Coins or Gems.',
      baseCoins: 0,
      baseGems: 0,
      firstTimeBonuses: [],
      totalCoins: 0,
      totalGems: 0,
      newlyReadyMilestones: [],
    };
  }

  if (isCheckmate && moveCount < REWARD_CONFIG.minMovesForCheckmateOrDraw) {
    return {
      matchId,
      eligible: false,
      ineligibleReason: 'Match too short for reward eligibility.',
      baseCoins: 0,
      baseGems: 0,
      firstTimeBonuses: [],
      totalCoins: 0,
      totalGems: 0,
      newlyReadyMilestones: [],
    };
  }

  if (!isCheckmate && !isDraw && didAiWin && moveCount < REWARD_CONFIG.minMovesForResignOrTimeoutWin) {
    return {
      matchId,
      eligible: false,
      ineligibleReason: 'Play at least 6 moves to qualify for timeout rewards.',
      baseCoins: 0,
      baseGems: 0,
      firstTimeBonuses: [],
      totalCoins: 0,
      totalGems: 0,
      newlyReadyMilestones: [],
    };
  }

  if (isDraw && moveCount < REWARD_CONFIG.minMovesForPvPReward) {
    return {
      matchId,
      eligible: false,
      ineligibleReason: 'Draws require at least 10 moves to earn rewards.',
      baseCoins: 0,
      baseGems: 0,
      firstTimeBonuses: [],
      totalCoins: 0,
      totalGems: 0,
      newlyReadyMilestones: [],
    };
  }

  if (!didAiWin && !isDraw && moveCount < REWARD_CONFIG.minMovesForDefeatValor) {
    return {
      matchId,
      eligible: false,
      ineligibleReason: 'Defeats under 12 moves do not earn Valor Coins.',
      baseCoins: 0,
      baseGems: 0,
      firstTimeBonuses: [],
      totalCoins: 0,
      totalGems: 0,
      newlyReadyMilestones: [],
    };
  }

  let baseCoins = 0;
  let baseGems = 0;

  if (didAiWin) {
    baseCoins =
      REWARD_CONFIG.aiWinCoins[difficulty] +
      (isCheckmate ? REWARD_CONFIG.aiCheckmateBonusCoins : 0);
    baseGems = REWARD_CONFIG.aiWinGems[difficulty];
  } else if (isDraw) {
    baseCoins = REWARD_CONFIG.aiDrawCoins[difficulty];
  } else {
    baseCoins = REWARD_CONFIG.aiDefeatValorCoins;
  }

  const firstTimeBonuses: FirstTimeBonusEntry[] = [];
  if (!state.claimedFirstTimeIds.includes(REWARD_CONFIG.firstTime.firstMatch.id)) {
    firstTimeBonuses.push({ ...REWARD_CONFIG.firstTime.firstMatch });
  }
  if (didAiWin) {
    if (!state.claimedFirstTimeIds.includes(REWARD_CONFIG.firstTime.firstAiWin.id)) {
      firstTimeBonuses.push({ ...REWARD_CONFIG.firstTime.firstAiWin });
    }
    if (isCheckmate && !state.claimedFirstTimeIds.includes(REWARD_CONFIG.firstTime.firstCheckmate.id)) {
      firstTimeBonuses.push({ ...REWARD_CONFIG.firstTime.firstCheckmate });
    }
    const diffBonusId = `first:win_${difficulty}`;
    if (!state.claimedFirstTimeIds.includes(diffBonusId)) {
      const diffReward = REWARD_CONFIG.firstTime.perDifficultyWin[difficulty];
      firstTimeBonuses.push({
        id: diffBonusId,
        label: `First ${AI_PROFILES[difficulty].label} Victory`,
        coins: diffReward.coins,
        gems: diffReward.gems,
      });
    }
  }

  const bonusCoins = firstTimeBonuses.reduce((sum, b) => sum + b.coins, 0);
  const bonusGems = firstTimeBonuses.reduce((sum, b) => sum + b.gems, 0);

  return {
    matchId,
    eligible: true,
    baseCoins,
    baseGems,
    firstTimeBonuses,
    totalCoins: baseCoins + bonusCoins,
    totalGems: baseGems + bonusGems,
    newlyReadyMilestones: [],
  };
}

export function applyMatchRewardToState(
  prevState: ProgressionState,
  input: CompletedMatchInput,
  updatedProfile: PlayerProfile,
  now = Date.now(),
  prevProfile?: PlayerProfile
): { nextState: ProgressionState; summary: MatchRewardSummary } {
  const summary = calculateMatchReward(input, prevState);

  if (prevState.claimedMatchIds.includes(input.matchId)) {
    return { nextState: prevState, summary };
  }

  // Update lifetime best AI win streak reliably using recentMatches newest-first
  let currentWinStreak = 0;
  for (const m of updatedProfile.recentMatches) {
    if (m.mode !== 'ai') continue;
    if (m.result === 'win') {
      currentWinStreak++;
    } else {
      break;
    }
  }
  const nextBestStreak = Math.max(prevState.bestRecordedWinStreak, currentWinStreak);

  const isValidCheckmateWin =
    input.mode === 'ai' &&
    input.status.winner === input.playerColor &&
    input.status.reason === 'checkmate' &&
    summary.eligible;

  const isValidAiWin =
    input.mode === 'ai' &&
    input.status.winner === input.playerColor &&
    summary.eligible;

  const nextTransactions: ProgressionTransaction[] = [...prevState.transactions];

  if (summary.eligible && (summary.baseCoins > 0 || summary.baseGems > 0)) {
    const modeLabel =
      input.mode === 'ai'
        ? `${AI_PROFILES[input.difficulty].label} AI ${
            input.status.winner === 'draw'
              ? 'Draw'
              : input.status.winner === input.playerColor
              ? 'Victory'
              : 'Battle'
          }`
        : 'Local 1 vs 1 Match';

    nextTransactions.unshift({
      id: `match:${input.matchId}`,
      source: 'match_reward',
      label: modeLabel,
      coinsDelta: summary.baseCoins,
      gemsDelta: summary.baseGems,
      createdAt: now,
    });
  }

  for (const bonus of summary.firstTimeBonuses) {
    nextTransactions.unshift({
      id: `bonus:${bonus.id}`,
      source: 'first_time_bonus',
      label: bonus.label,
      coinsDelta: bonus.coins,
      gemsDelta: bonus.gems,
      createdAt: now,
    });
  }

  const nextFirstTimeIds = [...prevState.claimedFirstTimeIds];
  for (const bonus of summary.firstTimeBonuses) {
    if (!nextFirstTimeIds.includes(bonus.id)) {
      nextFirstTimeIds.push(bonus.id);
    }
  }

  const nextFirstWinDiffs =
    isValidAiWin && !prevState.firstWinDifficulties.includes(input.difficulty)
      ? [...prevState.firstWinDifficulties, input.difficulty]
      : prevState.firstWinDifficulties;

  const candidateState: ProgressionState = {
    ...prevState,
    wallet: {
      coins: Math.max(0, prevState.wallet.coins + summary.totalCoins),
      gems: Math.max(0, prevState.wallet.gems + summary.totalGems),
    },
    claimedMatchIds: [input.matchId, ...prevState.claimedMatchIds].slice(0, 200),
    claimedFirstTimeIds: nextFirstTimeIds,
    firstWinDifficulties: nextFirstWinDiffs,
    bestRecordedWinStreak: nextBestStreak,
    pvpCompletedCount:
      prevState.pvpCompletedCount + (input.mode === 'pvp' && summary.eligible ? 1 : 0),
    checkmateWinCount: prevState.checkmateWinCount + (isValidCheckmateWin ? 1 : 0),
    transactions: nextTransactions.slice(0, 40),
  };

  // Report milestones that just became claimable due to this match
  const preMatchProfile: PlayerProfile = prevProfile ?? {
    ...updatedProfile,
    wins:
      input.mode === 'ai' && input.status.winner === input.playerColor
        ? Math.max(0, updatedProfile.wins - 1)
        : updatedProfile.wins,
  };
  const prevClaimable = new Set(
    evaluateMilestones(preMatchProfile, prevState)
      .filter((m) => m.claimable)
      .map((m) => m.definition.id)
  );
  const newlyReadyMilestones = evaluateMilestones(updatedProfile, candidateState)
    .filter((m) => m.claimable && !prevClaimable.has(m.definition.id))
    .map((m) => m.definition.title);

  return {
    nextState: candidateState,
    summary: {
      ...summary,
      newlyReadyMilestones,
    },
  };
}

export interface MilestoneClaimResult {
  claimed: boolean;
  reason?: 'not_found' | 'already_claimed' | 'not_completed';
  nextState: ProgressionState;
  rewardCoins: number;
  rewardGems: number;
  title?: string;
}

export function claimMilestoneReward(
  state: ProgressionState,
  profile: PlayerProfile,
  milestoneId: string,
  now = Date.now()
): MilestoneClaimResult {
  const evalList = evaluateMilestones(profile, state);
  const target = evalList.find((m) => m.definition.id === milestoneId);
  if (!target) {
    return { claimed: false, reason: 'not_found', nextState: state, rewardCoins: 0, rewardGems: 0 };
  }
  if (target.claimed) {
    return {
      claimed: false,
      reason: 'already_claimed',
      nextState: state,
      rewardCoins: 0,
      rewardGems: 0,
    };
  }
  if (!target.completed) {
    return {
      claimed: false,
      reason: 'not_completed',
      nextState: state,
      rewardCoins: 0,
      rewardGems: 0,
    };
  }

  const { rewardCoins, rewardGems, title } = target.definition;
  const tx: ProgressionTransaction = {
    id: `claim:${milestoneId}`,
    source: 'milestone_claim',
    label: `Milestone: ${title}`,
    coinsDelta: rewardCoins,
    gemsDelta: rewardGems,
    createdAt: now,
  };

  return {
    claimed: true,
    rewardCoins,
    rewardGems,
    title,
    nextState: {
      ...state,
      wallet: {
        coins: Math.max(0, state.wallet.coins + rewardCoins),
        gems: Math.max(0, state.wallet.gems + rewardGems),
      },
      claimedMilestones: [...state.claimedMilestones, milestoneId],
      transactions: [tx, ...state.transactions].slice(0, 40),
    },
  };
}
