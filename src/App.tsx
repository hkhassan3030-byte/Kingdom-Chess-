import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Chess, type Move, type Square } from 'chess.js';
import { audioManager } from './audio/AudioManager';
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
import { PromotionModal } from './components/PromotionModal';
import { SettingsModal } from './components/SettingsModal';
import { computeAIMoveAsync } from './engine/aiController';
import { CHARACTER_SET_ORDER } from './three/characterSets';
import type { ChessSceneController } from './three/ChessSceneController';
import type { CombatSoundEvent } from './three/combatChoreography';
import { DevPerfOverlay } from './utils/devPerfMonitor';
import {
  PIECE_LABELS,
  type BoardPiece,
  type CapturedState,
  type CharacterSetId,
  type GameSettings,
  type GameStatus,
  type MoveAnimationPayload,
  type PendingPromotion,
  type PieceColor,
  type PieceType,
  type ScreenView,
} from './types/chess';

const SETTINGS_STORAGE_KEY = 'kingdom-chess-settings-v2';

const DEFAULT_SETTINGS: GameSettings = {
  mode: 'ai',
  difficulty: 'normal',
  playerColor: 'w',
  characterSet: 'human',
  timeControlSeconds: 600,
  soundEnabled: true,
  musicEnabled: true,
  showCoordinates: true,
  quality: 'high',
  autoFlipPvP: false,
};

function loadInitialSettings(): GameSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    const validSet = CHARACTER_SET_ORDER.includes(parsed.characterSet as CharacterSetId)
      ? (parsed.characterSet as CharacterSetId)
      : DEFAULT_SETTINGS.characterSet;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      characterSet: validSet,
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

  const [whiteTime, setWhiteTime] = useState<number>(settings.timeControlSeconds);
  const [blackTime, setBlackTime] = useState<number>(settings.timeControlSeconds);

  const [isPaused, setIsPaused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [dismissedGameOver, setDismissedGameOver] = useState(false);

  const matchEpochRef = useRef(0);
  const animStartEpochRef = useRef(0);
  const checkmateAnnouncedEpochRef = useRef(-1);
  const aiAbortRef = useRef<AbortController | null>(null);
  const camResetTimerRef = useRef(0);

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

  // Sync audio & music preferences
  useEffect(() => {
    audioManager.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  useEffect(() => {
    audioManager.setMusicEnabled(settings.musicEnabled);
  }, [settings.musicEnabled]);

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
      if (st.howToPlayOpen) {
        setHowToPlayOpen(false);
        return;
      }
      if (st.settingsOpen) {
        setSettingsOpen(false);
        return;
      }
      if (st.hasPendingPromotion) {
        setPendingPromotion(null);
        setSelectedSquare(null);
        return;
      }
      if (st.screen === 'playing') {
        if (st.isGameOver) {
          matchEpochRef.current++;
          checkmateAnnouncedEpochRef.current = -1;
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
          setIsPaused((prev) => !prev);
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
      let move: Move;
      try {
        move = chess.move({ from, to, promotion });
      } catch {
        return false;
      }

      setSelectedSquare(null);
      setPendingPromotion(null);

      const payload = moveToAnimationPayload(move);
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
      const chess = chessRef.current;
      setPendingAnimation(null);
      refreshReactFromChess(forcedEnd);

      if (chess.isGameOver()) {
        const nextStatus = buildStatus(chess, forcedEnd);
        const isHumanWin =
          settings.mode === 'pvp' || nextStatus.winner === settings.playerColor;
        if (nextStatus.reason === 'checkmate' || chess.isCheckmate()) {
          if (checkmateAnnouncedEpochRef.current !== matchEpochRef.current) {
            checkmateAnnouncedEpochRef.current = matchEpochRef.current;
            audioManager.playCheckmateAnnouncement(isHumanWin);
          }
        } else {
          audioManager.playGameOver(false);
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
          audioManager.playSelect();
          setSelectedSquare(square);
          return;
        }

        setSelectedSquare(null);
        return;
      }

      if (clickedPiece && clickedPiece.color === chess.turn()) {
        audioManager.playSelect();
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
    isPaused,
    executeMove,
  ]);

  // Chess Clocks
  useEffect(() => {
    if (
      screen !== 'playing' ||
      settings.timeControlSeconds === 0 ||
      status.isGameOver ||
      status.moveCount === 0 ||
      pendingAnimation ||
      settingsOpen ||
      isPaused
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      if (status.turn === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            const endState = { winner: 'b' as PieceColor, reason: 'timeout' as const };
            setForcedEnd(endState);
            setStatus(buildStatus(chessRef.current, endState));
            setDismissedGameOver(false);
            audioManager.playGameOver(settings.mode === 'ai' ? settings.playerColor === 'b' : true);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            const endState = { winner: 'w' as PieceColor, reason: 'timeout' as const };
            setForcedEnd(endState);
            setStatus(buildStatus(chessRef.current, endState));
            setDismissedGameOver(false);
            audioManager.playGameOver(settings.mode === 'ai' ? settings.playerColor === 'w' : true);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [
    screen,
    settings.timeControlSeconds,
    settings.mode,
    settings.playerColor,
    status.isGameOver,
    status.moveCount,
    status.turn,
    pendingAnimation,
    settingsOpen,
    isPaused,
  ]);

  const startFreshMatch = useCallback(
    (nextSettings: GameSettings) => {
      const epoch = ++matchEpochRef.current;
      checkmateAnnouncedEpochRef.current = -1;
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
      setForcedEnd(null);
      setIsPaused(false);
      setSettingsOpen(false);
      setHowToPlayOpen(false);
      setDismissedGameOver(false);
      setWhiteTime(nextSettings.timeControlSeconds);
      setBlackTime(nextSettings.timeControlSeconds);

      setPieces(freshPieces);
      setCaptured({ w: [], b: [] });
      setCheckSquare(null);
      setStatus(buildStatus(freshChess, null, []));
      setScreen('playing');

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
    if (status.isGameOver || pendingAnimation) return;
    const loser: PieceColor =
      settings.mode === 'ai' ? settings.playerColor : status.turn;
    const winner: PieceColor = loser === 'w' ? 'b' : 'w';
    const endState = { winner, reason: 'resignation' as const };
    setForcedEnd(endState);
    setStatus(buildStatus(chessRef.current, endState));
    setDismissedGameOver(false);
    audioManager.playGameOver(false);
  }, [status.isGameOver, status.turn, pendingAnimation, settings.mode, settings.playerColor]);

  const handleUndo = useCallback(() => {
    if (pendingAnimation || isAIThinking || isPaused) return;
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
    setForcedEnd(null);
    setAiMessage(null);
    setDismissedGameOver(false);
    checkmateAnnouncedEpochRef.current = -1;
    refreshReactFromChess(null);
    audioManager.playSelect();
  }, [
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
    aiAbortRef.current?.abort();
    aiAbortRef.current = null;
    window.clearTimeout(camResetTimerRef.current);
    audioManager.stopAllCombatSfx();
    sceneControllerRef.current?.abortActiveAnimation(false);

    setIsAIThinking(false);
    setPendingAnimation(null);
    setPendingPromotion(null);
    setSelectedSquare(null);
    setForcedEnd(null);
    setAiMessage(null);
    setIsPaused(false);
    setSettingsOpen(false);
    setScreen('home');
  }, []);

  const canUndo =
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
      if (target?.closest('button:not(:disabled)')) {
        audioManager.playButtonClick();
      }
    },
    [settings.characterSet]
  );

  return (
    <main
      onClickCapture={handleGlobalClickCapture}
      className="relative h-dvh w-full max-w-full overflow-hidden bg-[#0b0f18]"
    >
      {screen === 'home' && (
        <HomeScreen
          quality={settings.quality}
          onStartGame={() => setScreen('modes')}
          onOpenModes={() => setScreen('modes')}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenHowToPlay={() => setHowToPlayOpen(true)}
        />
      )}

      {screen === 'modes' && (
        <ModeSelectScreen
          onSelectMode={(mode) => {
            setSettings((s) => ({ ...s, mode }));
            setScreen('kingdoms');
          }}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'kingdoms' && (
        <KingdomSelectScreen
          selectedSet={settings.characterSet}
          quality={settings.quality}
          onSelectSet={(characterSet) => setSettings((s) => ({ ...s, characterSet }))}
          onContinue={() =>
            setScreen(settings.mode === 'ai' ? 'ai-setup' : 'match-setup')
          }
          onBack={() => setScreen('modes')}
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
            whiteTime={whiteTime}
            blackTime={blackTime}
            isAIThinking={isAIThinking}
            aiMessage={aiMessage}
            combatLabel={combatLabel}
            canUndo={canUndo}
            onPause={() => setIsPaused(true)}
            onRestart={handleRestart}
            onUndo={handleUndo}
            onResign={handleResign}
            onResetCamera={handleResetCamera}
            onInspectCharacter={() => {
              const targetSq =
                selectedSquare ??
                pieces.find((p) => p.type === 'k' && p.color === status.turn)?.square ??
                'e1';
              sceneControllerRef.current?.focusCharacter(targetSq);
            }}
            onZoomIn={() => sceneControllerRef.current?.adjustZoom(0.84)}
            onZoomOut={() => sceneControllerRef.current?.adjustZoom(1.18)}
            onOpenSettings={() => setSettingsOpen(true)}
          />

          {pendingPromotion && (
            <PromotionModal
              color={pendingPromotion.color}
              onSelect={(piece) => {
                executeMove(pendingPromotion.from, pendingPromotion.to, piece);
              }}
              onCancel={() => {
                setPendingPromotion(null);
                setSelectedSquare(null);
              }}
            />
          )}

          {isPaused && !settingsOpen && (
            <PauseModal
              onResume={() => setIsPaused(false)}
              onRestart={() => {
                setIsPaused(false);
                handleRestart();
              }}
              onOpenSettings={() => setSettingsOpen(true)}
              onMainMenu={handleReturnToMenu}
            />
          )}

          {status.isGameOver && !dismissedGameOver && !pendingAnimation && (
            <GameOverModal
              status={status}
              settings={settings}
              onRematch={handleRestart}
              onMainMenu={handleReturnToMenu}
              onInspectBoard={() => setDismissedGameOver(true)}
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
          onUpdateLiveSettings={(next) => {
            setSettings(next);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {howToPlayOpen && <HowToPlayModal onClose={() => setHowToPlayOpen(false)} />}

      <DevPerfOverlay />
    </main>
  );
}
