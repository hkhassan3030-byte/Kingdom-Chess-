export interface PlayerProfile {
  name: string;
  level: number;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

export const DEFAULT_PROFILE: PlayerProfile = {
  name: 'Kingdom Player',
  level: 1,
  rating: 1000,
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
};

const PROFILE_STORAGE_KEY = 'kingdom-chess-profile-v1';

export function loadPlayerProfile(): PlayerProfile {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;

    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;

    return {
      ...DEFAULT_PROFILE,
      ...parsed,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function savePlayerProfile(profile: PlayerProfile): void {
  window.localStorage.setItem(
    PROFILE_STORAGE_KEY,
    JSON.stringify(profile),
  );
}

const AI_RATINGS: Record<string, number> = {
  easy: 800,
  normal: 1000,
  hard: 1200,
  expert: 1400,
  grandmaster: 1600,
};

export function calculateEloRating(
  playerRating: number,
  opponentDifficulty: string,
  result: 'win' | 'loss' | 'draw',
): number {
  const opponentRating = AI_RATINGS[opponentDifficulty] ?? 1000;
  const expectedScore =
    1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));

  const actualScore =
    result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;

  return Math.max(
    100,
    Math.round(playerRating + 32 * (actualScore - expectedScore)),
  );
}
