export type GameResult = 'win' | 'loss' | 'draw';

export interface GameHistoryEntry {
  id: string;
  mode: 'ai' | 'pvp';
  opponent: string;
  result: GameResult;
  ratingChange: number;
  ratingAfter: number;
  playedAt: number;
}

const HISTORY_STORAGE_KEY = 'kingdom-chess-history-v1';

export function loadGameHistory(): GameHistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGameHistory(history: GameHistoryEntry[]): void {
  window.localStorage.setItem(
    HISTORY_STORAGE_KEY,
    JSON.stringify(history.slice(0, 100)),
  );
}
