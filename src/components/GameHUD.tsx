import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Flag,
  Loader2,
  Pause,
  RotateCcw,
  Settings,
  Undo2,
  Video,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  AI_PROFILES,
  PIECE_GLYPHS,
  PIECE_VALUES,
  type CapturedState,
  type GameSettings,
  type GameStatus,
  type PieceType,
} from '../types/chess';

interface GameHUDProps {
  status: GameStatus;
  settings: GameSettings;
  captured: CapturedState;
  whiteTime: number;
  blackTime: number;
  isAIThinking: boolean;
  aiMessage: string | null;
  combatLabel: string | null;
  canUndo: boolean;
  onPause: () => void;
  onRestart: () => void;
  onUndo: () => void;
  onResign: () => void;
  onResetCamera: () => void;
  onInspectCharacter: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onOpenSettings: () => void;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function computeMaterialValue(pieces: PieceType[]): number {
  return pieces.reduce((acc, p) => acc + PIECE_VALUES[p], 0);
}

export function GameHUD({
  status,
  settings,
  captured,
  whiteTime,
  blackTime,
  isAIThinking,
  aiMessage,
  combatLabel,
  canUndo,
  onPause,
  onRestart,
  onUndo,
  onResign,
  onResetCamera,
  onInspectCharacter,
  onZoomIn,
  onZoomOut,
  onOpenSettings,
}: GameHUDProps) {
  const [dockOpen, setDockOpen] = useState(true);
  const [confirmResign, setConfirmResign] = useState(false);

  const whiteMatScore = computeMaterialValue(captured.b);
  const blackMatScore = computeMaterialValue(captured.w);
  const whiteAdv = whiteMatScore - blackMatScore;
  const blackAdv = blackMatScore - whiteMatScore;

  const aiProfile = AI_PROFILES[settings.difficulty];
  const aiSideLabel = settings.playerColor === 'w' ? 'BLACK KINGDOM' : 'WHITE KINGDOM';

  const turnLabel = status.isGameOver
    ? status.winner === 'draw'
      ? 'Draw'
      : status.winner === 'w'
      ? 'White Victory'
      : 'Black Victory'
    : isAIThinking
    ? `${aiSideLabel} IS THINKING...`
    : status.isCheck
    ? `${status.turn === 'w' ? 'White' : 'Black'} in Check`
    : `${status.turn === 'w' ? 'White' : 'Black'} Turn`;

  const modeSummary =
    settings.mode === 'ai'
      ? `${aiProfile.persona} (${aiProfile.label})`
      : '1 vs 1 Local';

  return (
    <>
      {/* Top Compact Status & Timer Bar */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-col items-center px-2.5 pt-2 sm:px-5 sm:pt-3">
        <div className="pointer-events-auto flex w-full max-w-5xl items-center justify-between gap-2 rounded-2xl border border-amber-400/25 bg-[#0f1522]/94 px-3 py-1.5 shadow-lg shadow-black/50 sm:px-4 sm:py-2">
          {/* Left: Pause & Turn Status */}
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={onPause}
              aria-label="Pause Game"
              title="Pause Game"
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-white/6 text-amber-200 transition-colors hover:border-amber-400/50 hover:bg-white/12 active:scale-95"
            >
              <Pause className="h-4 w-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-display truncate text-xs font-bold tracking-wider text-amber-100 sm:text-sm">
                  KINGDOM CHESS
                </h1>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300 sm:text-xs">
                {isAIThinking && (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-300" />
                )}
                <span
                  className={`truncate font-semibold ${
                    status.isCheck
                      ? 'text-rose-400'
                      : isAIThinking
                      ? 'text-amber-300'
                      : status.turn === 'w'
                      ? 'text-amber-200'
                      : 'text-sky-300'
                  }`}
                >
                  {turnLabel}
                </span>
                <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
                  ·
                </span>
                <span className="hidden truncate text-slate-400 sm:inline">{modeSummary}</span>
              </div>
            </div>
          </div>

          {/* Center: Kingdom Clocks & Captured Material */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* White Kingdom Clock */}
            <div
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-1 transition-colors ${
                status.turn === 'w' && !status.isGameOver
                  ? 'border-amber-400/65 bg-amber-400/14 text-amber-100'
                  : 'border-white/10 bg-white/5 text-slate-300'
              }`}
            >
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5 text-[11px] font-medium">
                  <span className="text-slate-200">White</span>
                  <span className="font-mono-tabular text-xs font-semibold text-amber-100">
                    {settings.timeControlSeconds > 0 ? formatTime(whiteTime) : '∞'}
                  </span>
                </div>
                {(captured.b.length > 0 || whiteAdv > 0) && (
                  <div className="hidden max-w-[110px] items-center gap-0.5 truncate text-[11px] text-slate-300 md:flex">
                    <span>{captured.b.slice(-5).map((p) => PIECE_GLYPHS.b[p]).join('')}</span>
                    {whiteAdv > 0 && (
                      <span className="font-mono-tabular ml-0.5 text-[10px] text-amber-300">
                        +{whiteAdv}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Black Kingdom Clock */}
            <div
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-1 transition-colors ${
                status.turn === 'b' && !status.isGameOver
                  ? 'border-rose-400/65 bg-rose-500/16 text-rose-100'
                  : 'border-white/10 bg-white/5 text-slate-300'
              }`}
            >
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1.5 text-[11px] font-medium">
                  <span className="text-slate-200">Black</span>
                  <span className="font-mono-tabular text-xs font-semibold text-rose-100">
                    {settings.timeControlSeconds > 0 ? formatTime(blackTime) : '∞'}
                  </span>
                </div>
                {(captured.w.length > 0 || blackAdv > 0) && (
                  <div className="hidden max-w-[110px] items-center gap-0.5 truncate text-[11px] text-slate-300 md:flex">
                    <span>{captured.w.slice(-5).map((p) => PIECE_GLYPHS.w[p]).join('')}</span>
                    {blackAdv > 0 && (
                      <span className="font-mono-tabular ml-0.5 text-[10px] text-rose-300">
                        +{blackAdv}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open Game Settings"
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/6 text-slate-200 transition-colors hover:border-amber-400/40 hover:bg-white/12 hover:text-amber-100 active:scale-95"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Captured Strip */}
        {(captured.b.length > 0 || captured.w.length > 0) && (
          <div className="mt-1 flex w-full max-w-5xl items-center justify-between px-2 text-[11px] text-slate-300 md:hidden">
            <span className="truncate">
              {captured.b.length > 0 && (
                <>
                  <span className="text-amber-200/80">W:</span>{' '}
                  {captured.b.map((p) => PIECE_GLYPHS.b[p]).join('')}
                  {whiteAdv > 0 ? ` +${whiteAdv}` : ''}
                </>
              )}
            </span>
            <span className="truncate">
              {captured.w.length > 0 && (
                <>
                  <span className="text-rose-200/80">B:</span>{' '}
                  {captured.w.map((p) => PIECE_GLYPHS.w[p]).join('')}
                  {blackAdv > 0 ? ` +${blackAdv}` : ''}
                </>
              )}
            </span>
          </div>
        )}

        {/* Active Capture Combat Banner */}
        {combatLabel && !status.isGameOver && (
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-amber-400/45 bg-[#16121b]/95 px-4 py-1.5 text-xs font-bold tracking-wider text-amber-200 uppercase shadow-lg shadow-black/50">
            <span aria-hidden="true">⚔</span>
            <span>{combatLabel}</span>
          </div>
        )}

        {/* Non-Spammy AI Thinking / Personality Status Callout */}
        {!combatLabel && (isAIThinking || aiMessage) && !status.isGameOver && (
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-amber-400/25 bg-[#0f1522]/92 px-3.5 py-1.5 text-xs text-amber-100 shadow-md">
            {isAIThinking ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" />
                <span>
                  <strong className={aiProfile.badgeColor}>{aiProfile.persona}</strong> is
                  calculating...
                </span>
              </>
            ) : (
              <span>
                <strong className={aiProfile.badgeColor}>{aiProfile.persona}:</strong>{' '}
                {aiMessage}
              </span>
            )}
          </div>
        )}
      </header>

      {/* Resign Confirmation Dialog */}
      {confirmResign && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <div className="fantasy-panel w-full max-w-xs rounded-2xl p-5 text-center">
            <h2 className="font-display text-base font-bold text-amber-100">RESIGN MATCH?</h2>
            <p className="mt-1.5 text-xs text-slate-300">
              Conceding will declare the opposing Kingdom victorious.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmResign(false)}
                className="fantasy-btn-secondary min-h-[44px] flex-1 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmResign(false);
                  onResign();
                }}
                className="min-h-[44px] flex-1 rounded-xl border border-rose-400/50 bg-rose-600 text-xs font-bold text-white hover:bg-rose-500"
              >
                Resign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Bottom Thumb-Zone Control Dock */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex flex-col items-center px-2.5 pb-2.5 sm:pb-4">
        <button
          type="button"
          onClick={() => setDockOpen((v) => !v)}
          aria-label={dockOpen ? 'Hide Controls' : 'Show Controls'}
          className="pointer-events-auto mb-1 flex min-h-[32px] items-center gap-1 rounded-t-xl border border-b-0 border-amber-400/25 bg-[#0f1522]/94 px-3.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:text-amber-100"
        >
          {dockOpen ? (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              <span>Hide Controls</span>
            </>
          ) : (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              <span>Show Controls</span>
            </>
          )}
        </button>

        {dockOpen && (
          <nav
            aria-label="Game Controls"
            className="pointer-events-auto flex w-full max-w-[740px] items-center justify-between gap-1.5 overflow-x-auto rounded-2xl border border-amber-400/25 bg-[#0f1522]/94 p-1.5 shadow-xl shadow-black/55 sm:gap-2 sm:p-2"
          >
            <button
              type="button"
              onClick={onRestart}
              className="flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-amber-400/30 bg-amber-400/12 px-3 py-2 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-400/22 active:scale-[0.98]"
            >
              <RotateCcw className="h-4 w-4 text-amber-300" />
              <span>Restart</span>
            </button>

            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-white/12 bg-white/6 px-3 py-2 text-xs font-medium text-slate-100 transition-colors hover:bg-white/12 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Undo2 className="h-4 w-4" />
              <span>Undo</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmResign(true)}
              disabled={status.isGameOver}
              className="flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Flag className="h-4 w-4" />
              <span>Resign</span>
            </button>

            <div className="flex shrink-0 items-center gap-1 border-l border-white/10 pl-1.5 sm:pl-2">
              <button
                type="button"
                onClick={onInspectCharacter}
                aria-label="Inspect Character Close-Up"
                title="Close-Up Character Inspect"
                className="flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-amber-400/25 bg-amber-400/10 px-2.5 py-2 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-400/20 active:scale-[0.98]"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Inspect</span>
              </button>

              <button
                type="button"
                onClick={onResetCamera}
                aria-label="Reset Camera"
                title="Battlefield Overview"
                className="flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-white/12 bg-white/6 px-2.5 py-2 text-xs font-medium text-slate-100 transition-colors hover:bg-white/12 active:scale-[0.98]"
              >
                <Video className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </button>

              <button
                type="button"
                onClick={onZoomIn}
                aria-label="Zoom In"
                title="Zoom In"
                className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/6 text-slate-100 transition-colors hover:bg-white/12 active:scale-[0.98]"
              >
                <ZoomIn className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onZoomOut}
                aria-label="Zoom Out"
                title="Zoom Out"
                className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/6 text-slate-100 transition-colors hover:bg-white/12 active:scale-[0.98]"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
            </div>
          </nav>
        )}
      </div>
    </>
  );
}
