import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Chess, type Move, type Square } from 'chess.js';
import { audioManager, type MusicScene } from './audio/AudioManager';
import { AISetupScreen } from './components/AISetupScreen';
import { ChessViewport } from './components/ChessViewport';
import { GameHUD } from './components/GameHUD';
import { GameOverModal } from './components/GameOverModal';
import { HomeScreen } from './components/HomeScreen';
import { HowToPlayModal } from './components/HowToPlayModal';
import { KingdomSelectScreen } from './components/KingdomSelectScreen';
import { MatchSetupScreen } from './components/MatchSetupScreen';
import { ModeSelectScreen } from './components/ModeSelectScreen';
import { PauseModal } from './components/PauseModal';
import { ProfileModal } from './components/ProfileModal';
import { PromotionModal } from './components/PromotionModal';
import { SettingsModal } from './components/SettingsModal';
import { computeAIMoveAsync } from './engine/aiController';
import { CHARACTER_SET_ORDER } from './three/characterSets';
import type { ChessSceneController } from './three/ChessSceneController';
import type { CombatSoundEvent } from './three/combatChoreography';
import { DevPerfOverlay } from './utils/devPerfMonitor';
import {
  AI_PROFILES,
  PIECE_LABELS,
  type BoardPiece,
  type CapturedState,
  type CharacterSetId,
  type GameSettings,
  type GameStatus,
  type MatchHistoryEntry,
  type MoveAnimationPayload,
  type PendingPromotion,
  type PieceColor,
  type PieceType,
  type PlayerProfile,
  type ScreenView,
} from './types/chess';

const SETTINGS_STORAGE_KEY = 'kingdom-chess-settings-v2';
const PROFILE_STORAGE_KEY = 'kingdom-chess-profile-v1';
const MAX_RECENT_MATCHES = 20;

const DEFAULT_PROFILE: PlayerProfile = {
  name: 'Commander',
  avatarId: 'crown',
  level: 1,
  rating: 1200,
  wins: 0,
  draws: 0,
  losses: 0,
  recentMatches: [],
};

function sanitizeRecentMatches(raw: unknown): MatchHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const valid: MatchHistoryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Partial<MatchHistoryEntry>;
    if (
      typeof entry.id === 'string' &&
      (entry.mode === 'ai' || entry.mode === 'pvp') &&
      typeof entry.opponent === 'string' &&
      (entry.playerColor === 'w' || entry.playerColor === 'b') &&
      (entry.result === 'win' || entry.result === 'loss' || entry.result === 'draw') &&
      typeof entry.playedAt === 'number'
    ) {
      valid.push({
        id: entry.id,
        mode: entry.mode,
        opponent: entry.opponent,
        playerColor: entry.playerColor,
        winner:
          entry.winner === 'w' || entry.winner === 'b' || entry.winner === 'draw'
            ? entry.winner
            : null,
        result: entry.result,
        reason: entry.reason ?? null,
        moveCount: typeof entry.moveCount === 'number' ? Math.max(0, Math.floor(entry.moveCount)) : 0,
        ratingDelta: typeof entry.ratingDelta === 'number' ? Math.round(entry.ratingDelta) : 0,
        playedAt: entry.playedAt,
      });
    }
    if (valid.length >= MAX_RECENT_MATCHES) break;
  }
  return valid;
}

function loadInitialProfile(): PlayerProfile {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    const validAvatars: Array<PlayerProfile['avatarId']> = ['crown', 'knight', 'sword', 'shield'];
    const avatarId = validAvatars.includes(parsed.avatarId as PlayerProfile['avatarId'])
      ? (parsed.avatarId as PlayerProfile['avatarId'])
      : DEFAULT_PROFILE.avatarId;
    const name =
      typeof parsed.name === 'string' && parsed.name.trim().length > 0
        ? parsed.name.trim().slice(0, 18)
        : DEFAULT_PROFILE.name;
    return {
      name,
      avatarId,
      level: typeof parsed.level === 'number' && parsed.level >= 1 ? Math.floor(parsed.level) : 1,
      rating:
        typeof parsed.rating === 'number' && parsed.rating >= 400
          ? Math.floor(parsed.rating)
          : 1200,
      wins: typeof parsed.wins === 'number' && parsed.wins >= 0 ? Math.floor(parsed.wins) : 0,
      draws: typeof parsed.draws === 'number' && parsed.draws >= 0 ? Math.floor(parsed.draws) : 0,
      losses:
        typeof parsed.losses === 'number' && parsed.losses >= 0 ? Math.floor(parsed.losses) : 0,
      recentMatches: sanitizeRecentMatches(parsed.recentMatches),
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

const DEFAULT_SETTINGS: GameSettings = {
  mode: 'ai',
  difficulty: 'normal',
  playerColor: 'w',
  characterSet: 'human',
  timeControlSeconds: 600,
  soundEnabled: true,
  musicEnabled: true,
  musicVolume: 70,
  sfxVolume: 85,
  muteAll: false,
  showCoordinates: true,
  quality: 'high',
  autoFlipPvP: false,
};

function clampVolume(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function loadInitialSettings(): GameSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    const validSet = CHARACTER_SET_ORDER.includes(parsed.characterSet as CharacterSetId)
      ? (parsed.characterSet as CharacterSetId)
      : DEFAULT_SETTINGS.characterSet;

    let musicVolume = clampVolume(parsed.musicVolume, DEFAULT_SETTINGS.musicVolume);
    let sfxVolume = clampVolume(parsed.sfxVolume, DEFAULT_SETTINGS.sfxVolume);
    let muteAll = typeof parsed.muteAll === 'boolean' ? parsed.muteAll : false;

    if (parsed.muteAll === undefined) {
      if (parsed.soundEnabled === false && parsed.musicEnabled === false) {
        muteAll = true;
      } else {
        if (parsed.sfxVolume === undefined && parsed.soundEnabled === false) {
          sfxVolume = 0;
        }
        if (parsed.musicVolume === undefined && parsed.musicEnabled === false) {
          musicVolume = 0;
        }
      }
    }

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      characterSet: validSet,
      musicVolume,
      sfxVolume,
      muteAll,
      soundEnabled: !muteAll && sfxVolume > 0,
      musicEnabled: !muteAll && musicVolume > 0,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function extractPieces(chess: Chess): BoardPiece[] {
  const board = chess.board();
  const list: BoardPiece[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      list.push({
        id: `${cell.color}-${cell.type}-${cell.square}`,
        type: cell.type as PieceType,
        color: cell.color as PieceColor,
        square: cell.square,
      });
    }
  }
  return list;
}

function buildStatus(
  chess: Chess,
  forcedEnd: { winner: PieceColor; reason: 'timeout' | 'resignation' } | null,
  prebuiltHistory?: Move[]
): GameStatus {
  const history = prebuiltHistory ?? chess.history({ verbose: true });
  const last = history.length > 0 ? history[history.length - 1] : null;
  const turn = chess.turn() as PieceColor;

  if (forcedEnd) {
    return {
      turn,
      isCheck: chess.inCheck(),
      isCheckmate: false,
      isStalemate: false,
      isDraw: false,
      isGameOver: true,
      winner: forcedEnd.winner,
      reason: forcedEnd.reason,
      moveCount: history.length,
      lastMove: last ? { from: last.from, to: last.to } : null,
    };
  }

  let winner: PieceColor | 'draw' | null = null;
  let reason: GameStatus['reason'] = null;

  if (chess.isCheckmate()) {
    winner = turn === 'w' ? 'b' : 'w';
    reason = 'checkmate';
  } else if (chess.isStalemate()) {
    winner = 'draw';
    reason = 'stalemate';
  } else if (chess.isThreefoldRepetition()) {
    winner = 'draw';
    reason = 'repetition';
  } else if (chess.isInsufficientMaterial()) {
    winner = 'draw';
    reason = 'insufficient';
  } else if (chess.isDraw()) {
    winner = 'draw';
    reason = 'fifty-move';
  }

  return {
    turn,
    isCheck: chess.inCheck(),
    isCheckmate: chess.isCheckmate(),
    isStalemate: chess.isStalemate(),
    isDraw: chess.isDraw(),
    isGameOver: chess.isGameOver(),
    winner,
    reason,
    moveCount: history.length,
    lastMove: last ? { from: last.from, to: last.to } : null,
  };
}

function findCheckSquare(chess: Chess): string | null {
  if (!chess.inCheck()) return null;
  const turn = chess.turn();
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (cell && cell.type === 'k' && cell.color === turn) {
        return cell.square;
      }
    }
  }
  return null;
}

function extractCapturedFromHistory(history: Move[]): CapturedState {
  const wCaptured: PieceType[] = [];
  const bCaptured: PieceType[] = [];
  for (let i = 0; i < history.length; i++) {
    const m = history[i];
    if (m.captured) {
      if (m.color === 'w') {
        bCaptured.push(m.captured as PieceType);
      } else {
        wCaptured.push(m.captured as PieceType);
      }
    }
  }
  return { w: wCaptured, b: bCaptured };
}

function moveToAnimationPayload(move: Move): MoveAnimationPayload {
  const isEnPassant = move.flags.includes('e');
  const capturedSquare = isEnPassant ? `${move.to[0]}${move.from[1]}` : move.to;

  let isCastle: 'k' | 'q' | undefined;
  let rookFrom: string | undefined;
  let rookTo: string | undefined;

  if (move.flags.includes('k')) {
    isCastle = 'k';
    const rank = move.color === 'w' ? '1' : '8';
    rookFrom = `h${rank}`;
    rookTo = `f${rank}`;
  } else if (move.flags.includes('q')) {
    isCastle = 'q';
    const rank = move.color === 'w' ? '1' : '8';
    rookFrom = `a${rank}`;
    rookTo = `d${rank}`;
  }

  return {
    from: move.from,
    to: move.to,
    piece: move.piece as PieceType,
    color: move.color as PieceColor,
    captured: move.captured as PieceType | undefined,
    capturedColor: move.captured ? (move.color === 'w' ? 'b' : 'w') : undefined,
    capturedSquare: move.captured ? capturedSquare : undefined,
    promotion: move.promotion as PieceType | undefined,
    san: move.san,
    isCastle,
    rookFrom,
    rookTo,
    isEnPassant,
  };
}

export default function App() {
  const chessRef = useRef<Chess>(new Chess());
  const sceneControllerRef = useRef<ChessSceneController | null>(null);

  const [screen, setScreen] = useState<ScreenView>('home');
  const [settings, setSettings] = useState<GameSettings>(loadInitialSettings);
  const [profile, setProfile] = useState<PlayerProfile>(loadInitialProfile);
  const [pieces, setPieces] = useState<BoardPiece[]>(() => extractPieces(chessRef.current));
  const [captured, setCaptured] = useState<CapturedState>({ w: [], b: [] });
  const [forcedEnd, setForcedEnd] = useState<{
    winner: PieceColor;
    reason: 'timeout' | 'resignation';
  } | null>(null);
  const [status, setStatus] = useState<GameStatus>(() => buildStatus(chessRef.current, null));
  const [checkSquare, setCheckSquare] = useState<string | null>(null);

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [pendingAnimation, setPendingAnimation] = useState<MoveAnimationPayload | null>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  const [matchClockKey, setMatchClockKey] = useState(0);

  const [isPaused, setIsPaused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dismissedGameOver, setDismissedGameOver] = useState(false);

  const matchEpochRef = useRef(0);
  const animStartEpochRef = useRef(0);
  const checkmateAnnouncedEpochRef = useRef(-1);
  const recordedOutcomeEpochRef = useRef(-1);
  const pendingPromotionMoveRef = useRef(false);
  const aiAbortRef = useRef<AbortController | null>(null);
  const camResetTimerRef = useRef(0);
  const profileMountedRef = useRef(false);
  const forcedEndRef = useRef<{
    winner: PieceColor;
    reason: 'timeout' | 'resignation';
  } | null>(null);

  // Persist user preferences safely (debounced so rapid toggles never block UI frames)
  useEffect(() => {
    const saveTimer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // Ignore storage quota errors
      }
    }, 150);
    return () => window.clearTimeout(saveTimer);
  }, [settings]);

  useEffect(() => {
    if (!profileMountedRef.current) {
      profileMountedRef.current = true;
      return;
    }
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore storage quota errors
    }
  }, [profile]);

  // Record finished match outcome & history once per match epoch (abandoned games never set isGameOver)
  useEffect(() => {
    if (!status.isGameOver || pendingAnimation) return;
    if (recordedOutcomeEpochRef.current === matchEpochRef.current) return;
    recordedOutcomeEpochRef.current = matchEpochRef.current;

    const isAI = settings.mode === 'ai';
    const isDraw = status.winner === 'draw';
    const didWin = isAI ? status.winner === settings.playerColor : status.winner === 'w';
    const result: MatchHistoryEntry['result'] = isDraw ? 'draw' : didWin ? 'win' : 'loss';
    const ratingDelta = isAI ? (didWin ? 18 : isDraw ? 2 : -12) : 0;
    const aiProfile = AI_PROFILES[settings.difficulty];
    const opponent = isAI ? `${aiProfile.label} · ${aiProfile.persona}` : 'Local 1 vs 1';

    const matchEntry: MatchHistoryEntry = {
      id: `match-${Date.now()}-${matchEpochRef.current}`,
      mode: settings.mode,
      opponent,
      playerColor: isAI ? settings.playerColor : 'w',
      winner: status.winner,
      result,
      reason: status.reason,
      moveCount: status.moveCount,
      ratingDelta,
      playedAt: Date.now(),
    };

    setProfile((prev) => {
      const nextRecentMatches = [matchEntry, ...(prev.recentMatches ?? [])].slice(
        0,
        MAX_RECENT_MATCHES
      );

      if (!isAI) {
        return {
          ...prev,
          recentMatches: nextRecentMatches,
        };
      }

      const nextWins = prev.wins + (didWin ? 1 : 0);
      const nextDraws = prev.draws + (isDraw ? 1 : 0);
      const nextLosses = prev.losses + (!didWin && !isDraw ? 1 : 0);
      const nextRating = Math.max(800, prev.rating + ratingDelta);
      const nextLevel = Math.max(prev.level, 1 + Math.floor((nextWins * 2 + nextDraws) / 3));
      return {
        ...prev,
        level: nextLevel,
        rating: nextRating,
        wins: nextWins,
        draws: nextDraws,
        losses: nextLosses,
        recentMatches: nextRecentMatches,
      };
    });
  }, [
    status.isGameOver,
    status.winner,
    status.reason,
    status.moveCount,
    pendingAnimation,
    settings.mode,
    settings.playerColor,
    settings.difficulty,
  ]);

  // Sync independent audio volumes & mute state (paused while SettingsModal live-previews)
  useEffect(() => {
    if (settingsOpen) return;
    audioManager.applyAudioSettings({
      musicVolume: settings.musicVolume,
      sfxVolume: settings.sfxVolume,
      muteAll: settings.muteAll,
      soundEnabled: settings.soundEnabled,
      musicEnabled: settings.musicEnabled,
    });
  }, [
    settingsOpen,
    settings.musicVolume,
    settings.sfxVolume,
    settings.muteAll,
    settings.soundEnabled,
    settings.musicEnabled,
  ]);

  // Context-aware background music (home, kingdoms, gameplay, victory, defeat)
  useEffect(() => {
    let scene: MusicScene = 'home';
    if (screen === 'home' || screen === 'modes') {
      scene = 'home';
    } else if (screen === 'kingdoms' || screen === 'ai-setup' || screen === 'match-setup') {
      scene = 'kingdoms';
    } else if (screen === 'playing') {
      if (status.isGameOver && !pendingAnimation) {
        if (status.winner === 'draw') {
          scene = 'kingdoms';
        } else if (settings.mode === 'ai' && status.winner !== settings.playerColor) {
          scene = 'defeat';
        } else {
          scene = 'victory';
        }
      } else {
        scene = 'gameplay';
      }
    }
    audioManager.setMusicScene(scene);
  }, [
    screen,
    status.isGameOver,
    status.winner,
    pendingAnimation,
    settings.mode,
    settings.playerColor,
  ]);

  useEffect(() => {
    audioManager.preloadSetAsync(settings.characterSet);
  }, [settings.characterSet]);

  // Unlock & preload Web Audio buffers on first user interaction; pause music when backgrounded
  useEffect(() => {
    const handleUnlock = () => {
      audioManager.unlock();
    };
    const handleVisibility = () => {
      audioManager.handleVisibilityChange(document.hidden);
    };
    window.addEventListener('pointerdown', handleUnlock, { once: true, passive: true });
    window.addEventListener('keydown', handleUnlock, { once: true });
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pointerdown', handleUnlock);
      window.removeEventListener('keydown', handleUnlock);
      document.removeEventListener('visibilitychange', handleVisibility);
      audioManager.cleanup();
    };
  }, []);

  // Auto-clear non-spammy AI status bark after 3.8s
  useEffect(() => {
    if (!aiMessage) return;
    const id = window.setTimeout(() => setAiMessage(null), 3800);
    return () => window.clearTimeout(id);
  }, [aiMessage]);

  const backStateRef = useRef({
    screen,
    mode: settings.mode,
    howToPlayOpen,
    settingsOpen,
    profileOpen,
    hasPendingPromotion: Boolean(pendingPromotion),
    isPaused,
    isGameOver: status.isGameOver,
    dismissedGameOver,
  });
  backStateRef.current = {
    screen,
    mode: settings.mode,
    howToPlayOpen,
    settingsOpen,
    profileOpen,
    hasPendingPromotion: Boolean(pendingPromotion),
    isPaused,
    isGameOver: status.isGameOver,
    dismissedGameOver,
  };

  // Capacitor Android StatusBar + Hardware Back Button support
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      void StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      void StatusBar.setBackgroundColor({ color: '#0b0f18' }).catch(() => {});
    }

    let listenerHandle: { remove: () => Promise<void> } | null = null;
    void CapacitorApp.addListener('backButton', () => {
      const st = backStateRef.current;
      if (st.profileOpen) {
        audioManager.playModalClose();
        setProfileOpen(false);
        return;
      }
      if (st.howToPlayOpen) {
        audioManager.playModalClose();
        setHowToPlayOpen(false);
        return;
      }
      if (st.settingsOpen) {
        audioManager.playModalClose();
        setSettingsOpen(false);
        return;
      }
      if (st.hasPendingPromotion) {
        audioManager.playModalClose();
        setPendingPromotion(null);
        setSelectedSquare(null);
        return;
      }
      if (st.screen === 'playing') {
        if (st.isGameOver) {
          if (st.dismissedGameOver) {
            setDismissedGameOver(false);
            return;
          }
          matchEpochRef.current++;
          checkmateAnnouncedEpochRef.current = -1;
          pendingPromotionMoveRef.current = false;
          aiAbortRef.current?.abort();
          window.clearTimeout(camResetTimerRef.current);
          audioManager.stopAllCombatSfx();
          sceneControllerRef.current?.abortActiveAnimation(false);
          setIsAIThinking(false);
          setPendingAnimation(null);
          setSelectedSquare(null);
          setIsPaused(false);
          setScreen('home');
        } else {
          setIsPaused((prev) => {
            if (prev) {
              audioManager.playModalClose();
            } else {
              audioManager.playModalOpen();
            }
            return !prev;
          });
        }
        return;
      }
      if (st.screen === 'match-setup') {
        setScreen(st.mode === 'ai' ? 'ai-setup' : 'kingdoms');
        return;
      }
      if (st.screen === 'ai-setup') {
        setScreen('kingdoms');
        return;
      }
      if (st.screen === 'kingdoms') {
        setScreen('modes');
        return;
      }
      if (st.screen === 'modes') {
        setScreen('home');
        return;
      }
      if (st.screen === 'home' && Capacitor.isNativePlatform()) {
        void CapacitorApp.exitApp();
      }
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      if (listenerHandle) {
        void listenerHandle.remove();
      }
    };
  }, []);

  const refreshReactFromChess = useCallback(
    (nextForcedEnd: { winner: PieceColor; reason: 'timeout' | 'resignation' } | null = null) => {
      const chess = chessRef.current;
      const history = chess.history({ verbose: true });
      setPieces(extractPieces(chess));
      setCaptured(extractCapturedFromHistory(history));
      setCheckSquare(findCheckSquare(chess));
      setStatus(buildStatus(chess, nextForcedEnd, history));
    },
    []
  );

  const legalTargets = useMemo(() => {
    if (!selectedSquare || pendingAnimation || status.isGameOver || isPaused) return [];
    const moves = chessRef.current.moves({
      square: selectedSquare as Square,
      verbose: true,
    });
    const unique = new Map<string, boolean>();
    for (const m of moves) {
      const isCap = Boolean(m.captured);
      const prev = unique.get(m.to);
      unique.set(m.to, Boolean(prev || isCap));
    }
    return Array.from(unique.entries()).map(([square, isCapture]) => ({
      square,
      isCapture,
    }));
  }, [selectedSquare, pendingAnimation, status.isGameOver, isPaused]);

  const executeMove = useCallback(
    (from: string, to: string, promotion?: Exclude<PieceType, 'p' | 'k'>) => {
      const chess = chessRef.current;
      if (forcedEndRef.current || chess.isGameOver()) return false;
      let move: Move;
      try {
        move = chess.move({ from, to, promotion });
      } catch {
        return false;
      }

      setSelectedSquare(null);
      setPendingPromotion(null);

      const payload = moveToAnimationPayload(move);
      pendingPromotionMoveRef.current = Boolean(payload.promotion);
      if (!payload.captured) {
        audioManager.playPieceMove(settings.characterSet, payload.piece);
      }
      animStartEpochRef.current = matchEpochRef.current;
      setPendingAnimation(payload);
      return true;
    },
    [settings.characterSet]
  );

  const handleAnimationComplete = useCallback(
    () => {
      if (animStartEpochRef.current !== matchEpochRef.current) return;
      const wasPromotion = pendingPromotionMoveRef.current;
      pendingPromotionMoveRef.current = false;

      const chess = chessRef.current;
      setPendingAnimation(null);
      refreshReactFromChess(forcedEnd);

      if (wasPromotion) {
        audioManager.playPromotion();
      }

      if (chess.isGameOver()) {
        const nextStatus = buildStatus(chess, forcedEnd);
        const isDraw = nextStatus.winner === 'draw';
        const isHumanWin =
          settings.mode === 'pvp' || nextStatus.winner === settings.playerColor;
        if (nextStatus.reason === 'checkmate' || chess.isCheckmate()) {
          if (checkmateAnnouncedEpochRef.current !== matchEpochRef.current) {
            checkmateAnnouncedEpochRef.current = matchEpochRef.current;
            audioManager.playCheckmateAnnouncement(isHumanWin);
          }
        } else if (isDraw) {
          audioManager.playDraw();
        } else {
          audioManager.playGameOver(isHumanWin ? 'victory' : 'defeat');
        }
        setDismissedGameOver(false);
      } else if (chess.inCheck()) {
        audioManager.playCheckAnnouncement();
      }

      if (settings.mode === 'pvp' && settings.autoFlipPvP && !chess.isGameOver()) {
        sceneControllerRef.current?.resetCamera(chess.turn() as PieceColor);
      }
    },
    [refreshReactFromChess, settings, forcedEnd]
  );

  const handleSquareTap = useCallback(
    (square: string) => {
      const chess = chessRef.current;
      if (
        screen !== 'playing' ||
        pendingAnimation ||
        status.isGameOver ||
        pendingPromotion ||
        settingsOpen ||
        isPaused
      ) {
        return;
      }

      if (settings.mode === 'ai' && chess.turn() !== settings.playerColor) return;

      const clickedPiece = chess.get(square as Square);

      if (selectedSquare) {
        if (selectedSquare === square) {
          setSelectedSquare(null);
          return;
        }

        const legalMovesFromSelected = chess.moves({
          square: selectedSquare as Square,
          verbose: true,
        });
        const matchingMoves = legalMovesFromSelected.filter((m) => m.to === square);

        if (matchingMoves.length > 0) {
          const isPromo = matchingMoves.some((m) => Boolean(m.promotion));
          if (isPromo) {
            audioManager.playModalOpen();
            setPendingPromotion({
              from: selectedSquare,
              to: square,
              color: chess.turn() as PieceColor,
            });
            return;
          }
          executeMove(selectedSquare, square);
          return;
        }

        if (clickedPiece && clickedPiece.color === chess.turn()) {
          audioManager.playHeroSelect(settings.characterSet, clickedPiece.type);
          setSelectedSquare(square);
          return;
        }

        setSelectedSquare(null);
        return;
      }

      if (clickedPiece && clickedPiece.color === chess.turn()) {
        audioManager.playHeroSelect(settings.characterSet, clickedPiece.type);
        setSelectedSquare(square);
      }
    },
    [
      screen,
      pendingAnimation,
      status.isGameOver,
      pendingPromotion,
      settingsOpen,
      isPaused,
      settings.mode,
      settings.playerColor,
      settings.characterSet,
      selectedSquare,
      executeMove,
    ]
  );

  // Trigger non-blocking Web Worker AI turn
  useEffect(() => {
    const chess = chessRef.current;
    if (
      screen !== 'playing' ||
      settings.mode !== 'ai' ||
      status.isGameOver ||
      pendingAnimation ||
      pendingPromotion ||
      settingsOpen ||
      isPaused ||
      chess.turn() === settings.playerColor
    ) {
      setIsAIThinking(false);
      return;
    }

    const epochAtStart = matchEpochRef.current;
    const abortController = new AbortController();
    aiAbortRef.current = abortController;
    setIsAIThinking(true);
    const fen = chess.fen();

    const timer = window.setTimeout(() => {
      void computeAIMoveAsync(fen, settings.difficulty, abortController.signal).then((res) => {
        if (abortController.signal.aborted || epochAtStart !== matchEpochRef.current) return;
        setIsAIThinking(false);
        if (res) {
          if (res.insight) {
            setAiMessage(res.insight);
          }
          executeMove(
            res.from,
            res.to,
            res.promotion as Exclude<PieceType, 'p' | 'k'> | undefined
          );
        }
      });
    }, 240);

    return () => {
      window.clearTimeout(timer);
      abortController.abort();
      if (aiAbortRef.current === abortController) {
        aiAbortRef.current = null;
      }
    };
  }, [
    screen,
    settings.mode,
    settings.playerColor,
    settings.difficulty,
    status.isGameOver,
    status.turn,
    status.moveCount,
    pendingAnimation,
    pendingPromotion,
    settingsOpen,
    isPaused,
    executeMove,
  ]);

  const handleTimeout = useCallback(
    (winner: PieceColor) => {
      if (forcedEndRef.current || chessRef.current.isGameOver()) return;
      aiAbortRef.current?.abort();
      aiAbortRef.current = null;
      setIsAIThinking(false);
      setPendingPromotion(null);
      setSelectedSquare(null);
      const endState = { winner, reason: 'timeout' as const };
      forcedEndRef.current = endState;
      setForcedEnd(endState);
      setStatus(buildStatus(chessRef.current, endState));
      setDismissedGameOver(false);
      audioManager.playGameOver(
        settings.mode === 'ai'
          ? settings.playerColor === winner
            ? 'victory'
            : 'defeat'
          : 'victory'
      );
    },
    [settings.mode, settings.playerColor]
  );

  const startFreshMatch = useCallback(
    (nextSettings: GameSettings) => {
      const epoch = ++matchEpochRef.current;
      checkmateAnnouncedEpochRef.current = -1;
      pendingPromotionMoveRef.current = false;
      aiAbortRef.current?.abort();
      aiAbortRef.current = null;
      window.clearTimeout(camResetTimerRef.current);
      audioManager.stopAllCombatSfx();
      audioManager.preloadSetAsync(nextSettings.characterSet);

      const freshChess = new Chess();
      chessRef.current = freshChess;
      const freshPieces = extractPieces(freshChess);

      setPendingAnimation(null);
      setPendingPromotion(null);
      setSelectedSquare(null);
      setIsAIThinking(false);
      setAiMessage(null);
      forcedEndRef.current = null;
      setForcedEnd(null);
      setIsPaused(false);
      setSettingsOpen(false);
      setHowToPlayOpen(false);
      setDismissedGameOver(false);
      setMatchClockKey((k) => k + 1);

      setPieces(freshPieces);
      setCaptured({ w: [], b: [] });
      setCheckSquare(null);
      setStatus(buildStatus(freshChess, null, []));
      setScreen('playing');
      audioManager.playGameStart();

      const camSide: PieceColor =
        nextSettings.mode === 'ai' ? nextSettings.playerColor : 'w';

      if (sceneControllerRef.current) {
        sceneControllerRef.current.resetGame(camSide, freshPieces);
      } else {
        camResetTimerRef.current = window.setTimeout(() => {
          if (epoch === matchEpochRef.current) {
            sceneControllerRef.current?.resetCamera(camSide, true);
          }
        }, 40);
      }
    },
    []
  );

  const handleRestart = useCallback(() => {
    startFreshMatch(settings);
  }, [settings, startFreshMatch]);

  const handleResign = useCallback(() => {
    if (
      forcedEndRef.current ||
      status.isGameOver ||
      chessRef.current.isGameOver() ||
      pendingAnimation
    ) {
      return;
    }
    aiAbortRef.current?.abort();
    aiAbortRef.current = null;
    setIsAIThinking(false);
    setPendingPromotion(null);
    setSelectedSquare(null);
    const loser: PieceColor =
      settings.mode === 'ai' ? settings.playerColor : status.turn;
    const winner: PieceColor = loser === 'w' ? 'b' : 'w';
    const endState = { winner, reason: 'resignation' as const };
    forcedEndRef.current = endState;
    setForcedEnd(endState);
    setStatus(buildStatus(chessRef.current, endState));
    setDismissedGameOver(false);
    audioManager.playGameOver('defeat');
  }, [status.isGameOver, status.turn, pendingAnimation, settings.mode, settings.playerColor]);

  const handleUndo = useCallback(() => {
    if (status.isGameOver || pendingAnimation || isAIThinking || isPaused) return;
    const chess = chessRef.current;
    const historyLen = chess.history().length;
    if (historyLen === 0) return;

    if (settings.mode === 'ai') {
      if (chess.turn() === settings.playerColor && historyLen >= 2) {
        chess.undo();
        chess.undo();
      } else {
        chess.undo();
      }
    } else {
      chess.undo();
    }

    setSelectedSquare(null);
    setPendingPromotion(null);
    forcedEndRef.current = null;
    setForcedEnd(null);
    setAiMessage(null);
    setDismissedGameOver(false);
    checkmateAnnouncedEpochRef.current = -1;
    pendingPromotionMoveRef.current = false;
    refreshReactFromChess(null);
    audioManager.playUndo();
  }, [
    status.isGameOver,
    pendingAnimation,
    isAIThinking,
    isPaused,
    settings.mode,
    settings.playerColor,
    refreshReactFromChess,
  ]);

  const handleResetCamera = useCallback(() => {
    const side: PieceColor =
      settings.mode === 'ai'
        ? settings.playerColor
        : settings.autoFlipPvP
        ? status.turn
        : 'w';
    sceneControllerRef.current?.resetCamera(side);
  }, [settings.mode, settings.playerColor, settings.autoFlipPvP, status.turn]);

  const handleReturnToMenu = useCallback(() => {
    matchEpochRef.current++;
    checkmateAnnouncedEpochRef.current = -1;
    pendingPromotionMoveRef.current = false;
    aiAbortRef.current?.abort();
    aiAbortRef.current = null;
    window.clearTimeout(camResetTimerRef.current);
    audioManager.stopAllCombatSfx();
    sceneControllerRef.current?.abortActiveAnimation(false);

    setIsAIThinking(false);
    setPendingAnimation(null);
    setPendingPromotion(null);
    setSelectedSquare(null);
    forcedEndRef.current = null;
    setForcedEnd(null);
    setAiMessage(null);
    setIsPaused(false);
    setSettingsOpen(false);
    setScreen('home');
  }, []);

  const canUndo =
    !status.isGameOver &&
    !pendingAnimation &&
    !isAIThinking &&
    !isPaused &&
    status.moveCount > 0 &&
    (settings.mode === 'pvp' ||
      status.moveCount >= 2 ||
      chessRef.current.turn() !== settings.playerColor);

  const handleCombatSound = useCallback((event: CombatSoundEvent) => {
    audioManager.playCombatSound(event.characterSet, event.characterClass, event.action, {
      defenderClass: event.defenderClass,
    });
  }, []);

  const combatLabel =
    pendingAnimation?.captured
      ? `${PIECE_LABELS[pendingAnimation.piece]} strikes ${PIECE_LABELS[pendingAnimation.captured]}`
      : null;

  const handleGlobalClickCapture = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      audioManager.unlock(settings.characterSet);
      const target = e.target as HTMLElement | null;
      if (target?.closest('button[data-sfx]')) {
        return;
      }
      if (target?.closest('button:not(:disabled)')) {
        audioManager.playButtonClick();
      }
    },
    [settings.characterSet]
  );

  const handleOpenProfile = useCallback(() => {
    audioManager.playModalOpen();
    setProfileOpen(true);
  }, []);

  const handleCloseProfile = useCallback(() => {
    audioManager.playModalClose();
    setProfileOpen(false);
  }, []);

  const handleGoModes = useCallback(() => setScreen('modes'), []);
  const handleGoHome = useCallback(() => setScreen('home'), []);

  const handleOpenSettings = useCallback(() => {
    audioManager.playModalOpen();
    setSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    audioManager.playModalClose();
    setSettingsOpen(false);
  }, []);

  const handleOpenHowToPlay = useCallback(() => {
    audioManager.playModalOpen();
    setHowToPlayOpen(true);
  }, []);

  const handleCloseHowToPlay = useCallback(() => {
    audioManager.playModalClose();
    setHowToPlayOpen(false);
  }, []);

  const handleSelectMode = useCallback((mode: GameSettings['mode']) => {
    setSettings((s) => ({ ...s, mode }));
    setScreen('kingdoms');
  }, []);

  const handleSelectSet = useCallback((characterSet: CharacterSetId) => {
    audioManager.playKingdomSelect(characterSet);
    setSettings((s) => ({ ...s, characterSet }));
  }, []);

  const handleKingdomContinue = useCallback(() => {
    setScreen(settings.mode === 'ai' ? 'ai-setup' : 'match-setup');
  }, [settings.mode]);

  const handlePauseGame = useCallback(() => {
    audioManager.playModalOpen();
    setIsPaused(true);
  }, []);

  const handleResumeGame = useCallback(() => {
    audioManager.playModalClose();
    setIsPaused(false);
  }, []);

  const handleShowGameOver = useCallback(() => setDismissedGameOver(false), []);
  const handleInspectBoard = useCallback(() => setDismissedGameOver(true), []);

  const handleInspectCharacter = useCallback(() => {
    const targetSq =
      selectedSquare ??
      pieces.find((p) => p.type === 'k' && p.color === status.turn)?.square ??
      'e1';
    sceneControllerRef.current?.focusCharacter(targetSq);
  }, [selectedSquare, pieces, status.turn]);

  const handleZoomIn = useCallback(() => sceneControllerRef.current?.adjustZoom(0.84), []);
  const handleZoomOut = useCallback(() => sceneControllerRef.current?.adjustZoom(1.18), []);

  const isClockRunning =
    screen === 'playing' &&
    settings.timeControlSeconds > 0 &&
    !status.isGameOver &&
    status.moveCount > 0 &&
    !pendingAnimation &&
    !settingsOpen &&
    !isPaused;

  return (
    <main
      onClickCapture={handleGlobalClickCapture}
      className="relative h-dvh w-full max-w-full overflow-hidden bg-[#0b0f18]"
    >
      {screen === 'home' && (
        <HomeScreen
          quality={settings.quality}
          profile={profile}
          onOpenProfile={handleOpenProfile}
          onStartGame={handleGoModes}
          onOpenModes={handleGoModes}
          onOpenSettings={handleOpenSettings}
          onOpenHowToPlay={handleOpenHowToPlay}
        />
      )}

      {screen === 'modes' && (
        <ModeSelectScreen
          onSelectMode={handleSelectMode}
          onBack={handleGoHome}
        />
      )}

      {screen === 'kingdoms' && (
        <KingdomSelectScreen
          selectedSet={settings.characterSet}
          quality={settings.quality}
          onSelectSet={handleSelectSet}
          onContinue={handleKingdomContinue}
          onBack={handleGoModes}
        />
      )}

      {screen === 'ai-setup' && (
        <AISetupScreen
          playerColor={settings.playerColor}
          difficulty={settings.difficulty}
          onChangeColor={(playerColor) => setSettings((s) => ({ ...s, playerColor }))}
          onChangeDifficulty={(difficulty) => setSettings((s) => ({ ...s, difficulty }))}
          onContinue={() => setScreen('match-setup')}
          onBack={() => setScreen('kingdoms')}
        />
      )}

      {screen === 'match-setup' && (
        <MatchSetupScreen
          settings={settings}
          onChangeTimeControl={(timeControlSeconds) =>
            setSettings((s) => ({ ...s, timeControlSeconds }))
          }
          onChangeAutoFlip={(autoFlipPvP) => setSettings((s) => ({ ...s, autoFlipPvP }))}
          onChangeKingdom={() => setScreen('kingdoms')}
          onStartBattle={() => startFreshMatch(settings)}
          onBack={() => setScreen(settings.mode === 'ai' ? 'ai-setup' : 'kingdoms')}
        />
      )}

      {screen === 'playing' && (
        <>
          <ChessViewport
            pieces={pieces}
            selectedSquare={selectedSquare}
            legalTargets={legalTargets}
            lastMove={status.lastMove}
            checkSquare={checkSquare}
            pendingAnimation={pendingAnimation}
            showCoordinates={settings.showCoordinates}
            quality={settings.quality}
            characterSet={settings.characterSet}
            initialSide={settings.mode === 'ai' ? settings.playerColor : 'w'}
            onSquareTap={handleSquareTap}
            onAnimationComplete={handleAnimationComplete}
            onCombatSound={handleCombatSound}
            controllerRef={sceneControllerRef}
          />

          <GameHUD
            status={status}
            settings={settings}
            captured={captured}
            clockResetKey={matchClockKey}
            isClockRunning={isClockRunning}
            onTimeout={handleTimeout}
            isAIThinking={isAIThinking}
            aiMessage={aiMessage}
            combatLabel={combatLabel}
            canUndo={canUndo}
            isInspectingGameOver={status.isGameOver && dismissedGameOver && !pendingAnimation}
            onShowGameOver={handleShowGameOver}
            onPause={handlePauseGame}
            onRestart={handleRestart}
            onUndo={handleUndo}
            onResign={handleResign}
            onResetCamera={handleResetCamera}
            onInspectCharacter={handleInspectCharacter}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onOpenSettings={handleOpenSettings}
          />

          {pendingPromotion && (
            <PromotionModal
              color={pendingPromotion.color}
              targetSquare={pendingPromotion.to}
              onSelect={(piece) => {
                executeMove(pendingPromotion.from, pendingPromotion.to, piece);
              }}
              onCancel={() => {
                audioManager.playModalClose();
                setPendingPromotion(null);
                setSelectedSquare(null);
              }}
            />
          )}

          {isPaused && !settingsOpen && (
            <PauseModal
              onResume={handleResumeGame}
              onRestart={() => {
                setIsPaused(false);
                handleRestart();
              }}
              onOpenSettings={handleOpenSettings}
              onMainMenu={handleReturnToMenu}
            />
          )}

          {status.isGameOver && !dismissedGameOver && !pendingAnimation && (
            <GameOverModal
              status={status}
              settings={settings}
              onRematch={handleRestart}
              onMainMenu={handleReturnToMenu}
              onInspectBoard={handleInspectBoard}
            />
          )}
        </>
      )}

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          inGame={screen === 'playing'}
          onApplyAndStart={(next) => {
            setSettings(next);
            startFreshMatch(next);
          }}
          onUpdateLiveSettings={setSettings}
          onClose={handleCloseSettings}
        />
      )}

      {howToPlayOpen && <HowToPlayModal onClose={handleCloseHowToPlay} />}

      {profileOpen && (
        <ProfileModal
          profile={profile}
          onUpdateProfile={setProfile}
          onClose={handleCloseProfile}
        />
      )}

      {screen !== 'home' && <DevPerfOverlay />}
    </main>
  );
}
