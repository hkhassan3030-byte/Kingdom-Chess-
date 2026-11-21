import type { MatchHistoryEntry, PlayerProfile } from '../types/chess';

export interface RatingProgressionPoint {
  rating: number;
  delta: number;
  playedAt: number;
  result: MatchHistoryEntry['result'];
}

export interface OfflineProfileStats {
  totalMatches: number;
  winRate: number;
  winPct: number;
  drawPct: number;
  lossPct: number;
  recordedAiMatchesCount: number;
  hasFullAiHistory: boolean;
  /**
   * True when career AI match count is > 0 but no AI matches exist in recentMatches
   * (e.g., a legacy profile saved before recentMatches tracking existed).
   */
  hasUnrecordedHistoryOnly: boolean;
  currentStreak: {
    type: 'win' | 'loss' | 'none';
    count: number;
    capped: boolean;
  } | null;
  bestWinStreak: {
    count: number;
    capped: boolean;
    scopedToRecent: boolean;
  } | null;
  ratingHistory: {
    points: RatingProgressionPoint[];
    startRating: number;
    currentRating: number;
    netDelta: number;
    latestDelta: number | null;
    minRating: number;
    maxRating: number;
    scopedToRecent: boolean;
  };
}

export function deriveOfflineProfileStats(profile: PlayerProfile): OfflineProfileStats {
  const totalMatches = profile.wins + profile.draws + profile.losses;
  const winRate = totalMatches > 0 ? Math.round((profile.wins / totalMatches) * 100) : 0;
  const winPct = totalMatches > 0 ? (profile.wins / totalMatches) * 100 : 0;
  const drawPct = totalMatches > 0 ? (profile.draws / totalMatches) * 100 : 0;
  const lossPct = totalMatches > 0 ? (profile.losses / totalMatches) * 100 : 0;

  // Game History (recentMatches) is newest-first; only AI matches affect Commander streaks & rating.
  const aiMatches = (profile.recentMatches ?? []).filter((m) => m.mode === 'ai');
  const recordedAiMatchesCount = aiMatches.length;
  const hasFullAiHistory = totalMatches === recordedAiMatchesCount;
  const hasUnrecordedHistoryOnly = totalMatches > 0 && recordedAiMatchesCount === 0;

  let currentStreak: OfflineProfileStats['currentStreak'] = null;
  let bestWinStreak: OfflineProfileStats['bestWinStreak'] = null;

  if (!hasUnrecordedHistoryOnly) {
    if (recordedAiMatchesCount === 0) {
      currentStreak = { type: 'none', count: 0, capped: false };
      bestWinStreak = { count: 0, capped: false, scopedToRecent: false };
    } else {
      const latestResult = aiMatches[0].result;
      if (latestResult === 'win' || latestResult === 'loss') {
        let count = 0;
        for (const match of aiMatches) {
          if (match.result === latestResult) {
            count++;
          } else {
            break;
          }
        }
        currentStreak = {
          type: latestResult,
          count,
          capped: count === recordedAiMatchesCount && !hasFullAiHistory,
        };
      } else {
        currentStreak = { type: 'none', count: 0, capped: false };
      }

      // Compute longest win streak across recorded AI matches in chronological order
      let maxWins = 0;
      let runningWins = 0;
      for (let i = aiMatches.length - 1; i >= 0; i--) {
        if (aiMatches[i].result === 'win') {
          runningWins++;
          if (runningWins > maxWins) {
            maxWins = runningWins;
          }
        } else {
          runningWins = 0;
        }
      }

      bestWinStreak = {
        count: maxWins,
        capped: maxWins === recordedAiMatchesCount && !hasFullAiHistory,
        scopedToRecent: !hasFullAiHistory,
      };
    }
  }

  // Reconstruct rating progression backwards from current profile.rating using recorded deltas
  const pointsReversed: RatingProgressionPoint[] = [];
  let runningRating = profile.rating;
  let netDelta = 0;

  for (const match of aiMatches) {
    pointsReversed.push({
      rating: runningRating,
      delta: match.ratingDelta,
      playedAt: match.playedAt,
      result: match.result,
    });
    netDelta += match.ratingDelta;
    runningRating = Math.max(800, runningRating - match.ratingDelta);
  }

  const points = pointsReversed.reverse();
  const startRating = points.length > 0 ? runningRating : profile.rating;
  const allRatingValues = [startRating, ...points.map((p) => p.rating)];
  const minRating = Math.min(...allRatingValues);
  const maxRating = Math.max(...allRatingValues);

  return {
    totalMatches,
    winRate,
    winPct,
    drawPct,
    lossPct,
    recordedAiMatchesCount,
    hasFullAiHistory,
    hasUnrecordedHistoryOnly,
    currentStreak,
    bestWinStreak,
    ratingHistory: {
      points,
      startRating,
      currentRating: profile.rating,
      netDelta,
      latestDelta: aiMatches.length > 0 ? aiMatches[0].ratingDelta : null,
      minRating,
      maxRating,
      scopedToRecent: !hasFullAiHistory && recordedAiMatchesCount > 0,
    },
  };
}
