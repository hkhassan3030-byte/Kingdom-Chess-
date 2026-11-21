export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type GameMode = 'ai' | 'pvp';
export type AIDifficulty = 'easy' | 'normal' | 'hard' | 'expert' | 'grandmaster';
export type TimerOption = 0 | 180 | 300 | 600;
export type GraphicsQuality = 'high' | 'balanced';
export type CharacterSetId = 'human' | 'titan' | 'inferno' | 'shadow' | 'celestial';
export type ScreenView = 'home' | 'modes' | 'kingdoms' | 'ai-setup' | 'match-setup' | 'playing';

export interface GameSettings {
  mode: GameMode;
  difficulty: AIDifficulty;
  playerColor: PieceColor;
  timeControlSeconds: TimerOption;
  characterSet: CharacterSetId;
  soundEnabled: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  muteAll: boolean;
  showCoordinates: boolean;
  quality: GraphicsQuality;
  autoFlipPvP: boolean;
}

export type MatchResult = 'win' | 'loss' | 'draw';

export interface MatchHistoryEntry {
  id: string;
  mode: GameMode;
  opponent: string;
  playerColor: PieceColor;
  winner: PieceColor | 'draw' | null;
  result: MatchResult;
  reason: GameStatus['reason'];
  moveCount: number;
  ratingDelta: number;
  playedAt: number;
}

export interface PlayerProfile {
  name: string;
  avatarId: 'crown' | 'knight' | 'sword' | 'shield';
  level: number;
  rating: number;
  wins: number;
  draws: number;
  losses: number;
  recentMatches: MatchHistoryEntry[];
}

export interface AIProfile {
  id: AIDifficulty;
  label: string;
  persona: string;
  stars: number;
  description: string;
  badgeColor: string;
  ringColor: string;
}

export const AI_PROFILES: Record<AIDifficulty, AIProfile> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    persona: 'Young Squire',
    stars: 1,
    description: 'Beginner opponent. Makes simple moves and occasionally makes obvious mistakes.',
    badgeColor: 'text-emerald-300',
    ringColor: 'border-emerald-400/50',
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    persona: 'Royal Guard',
    stars: 2,
    description: 'Balanced opponent. Uses basic tactical reasoning and protects key pieces.',
    badgeColor: 'text-sky-300',
    ringColor: 'border-sky-400/50',
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    persona: "King's Champion",
    stars: 3,
    description: 'Strong tactical opponent. Looks several moves ahead for captures, checks and threats.',
    badgeColor: 'text-violet-300',
    ringColor: 'border-violet-400/50',
  },
  expert: {
    id: 'expert',
    label: 'Expert',
    persona: 'Master Strategist',
    stars: 4,
    description: 'Deep alpha-beta search evaluating king safety, center control, pawn structure and tactics.',
    badgeColor: 'text-rose-300',
    ringColor: 'border-rose-400/50',
  },
  grandmaster: {
    id: 'grandmaster',
    label: 'Grandmaster',
    persona: 'The Ancient King',
    stars: 5,
    description: 'Strongest mobile AI using alpha-beta pruning, transposition tables and move ordering.',
    badgeColor: 'text-amber-300',
    ringColor: 'border-amber-400/70',
  },
};

export const AI_DIFFICULTY_ORDER: AIDifficulty[] = [
  'easy',
  'normal',
  'hard',
  'expert',
  'grandmaster',
];

export const TIME_CONTROLS: Array<{ seconds: TimerOption; label: string; sublabel: string }> = [
  { seconds: 600, label: '10 MIN', sublabel: 'Classic' },
  { seconds: 300, label: '5 MIN', sublabel: 'Blitz' },
  { seconds: 180, label: '3 MIN', sublabel: 'Rapid Duel' },
  { seconds: 0, label: 'UNLIMITED', sublabel: 'No Clock' },
];

export interface BoardPiece {
  id: string;
  type: PieceType;
  color: PieceColor;
  square: string;
}

export interface MoveAnimationPayload {
  from: string;
  to: string;
  piece: PieceType;
  color: PieceColor;
  captured?: PieceType;
  capturedColor?: PieceColor;
  capturedSquare?: string;
  promotion?: PieceType;
  san: string;
  isCastle?: 'k' | 'q';
  rookFrom?: string;
  rookTo?: string;
  isEnPassant?: boolean;
}

export interface PendingPromotion {
  from: string;
  to: string;
  color: PieceColor;
}

export interface GameStatus {
  turn: PieceColor;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  isGameOver: boolean;
  winner: PieceColor | 'draw' | null;
  reason:
    | 'checkmate'
    | 'stalemate'
    | 'repetition'
    | 'insufficient'
    | 'fifty-move'
    | 'timeout'
    | 'resignation'
    | null;
  moveCount: number;
  lastMove: { from: string; to: string } | null;
}

export interface CapturedState {
  w: PieceType[]; // White pieces captured by Black
  b: PieceType[]; // Black pieces captured by White
}

export const PIECE_VALUES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export const PIECE_LABELS: Record<PieceType, string> = {
  k: 'King',
  q: 'Queen',
  r: 'Rook',
  b: 'Bishop',
  n: 'Knight',
  p: 'Pawn',
};

export const PIECE_GLYPHS: Record<PieceColor, Record<PieceType, string>> = {
  w: {
    k: '♔',
    q: '♕',
    r: '♖',
    b: '♗',
    n: '♘',
    p: '♙',
  },
  b: {
    k: '♚',
    q: '♛',
    r: '♜',
    b: '♝',
    n: '♞',
    p: '♟',
  },
};
