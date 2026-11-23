import { Award, Coins, Crown, Eye, Gem, Home, RotateCcw, Shield, Skull, Sparkles } from 'lucide-react';
import { AI_PROFILES, TIME_CONTROLS, type GameSettings, type GameStatus } from '../types/chess';
import type { MatchRewardSummary } from '../types/progression';

interface GameOverModalProps {
  status: GameStatus;
  settings: GameSettings;
  rewardSummary?: MatchRewardSummary | null;
  onOpenTreasury?: () => void;
  onRematch: () => void;
  onMainMenu: () => void;
  onInspectBoard: () => void;
}

export function GameOverModal({
  status,
  settings,
  rewardSummary,
  onOpenTreasury,
  onRematch,
  onMainMenu,
  onInspectBoard,
}: GameOverModalProps) {
  if (!status.isGameOver) return null;

  const isDraw = status.winner === 'draw';
  const isAIDefeat =
    !isDraw && settings.mode === 'ai' && status.winner !== settings.playerColor;

  const bannerLabel = isDraw ? 'DRAW' : isAIDefeat ? 'DEFEAT' : 'VICTORY';

  const headline = (() => {
    if (isDraw) return 'THE KINGDOMS REMAIN LOCKED IN BATTLE';
    if (isAIDefeat) {
      return settings.playerColor === 'w'
        ? 'THE WHITE KINGDOM HAS FALLEN'
        : 'THE BLACK KINGDOM HAS FALLEN';
    }
    return status.winner === 'w'
      ? 'THE WHITE KINGDOM PREVAILS'
      : 'THE BLACK KINGDOM PREVAILS';
  })();

  const reasonText = (() => {
    switch (status.reason) {
      case 'checkmate':
        return isAIDefeat ? 'Defeat by Checkmate' : 'Decisive Victory by Checkmate';
      case 'resignation':
        return isAIDefeat ? 'You Resigned the Match' : 'Match Concluded by Resignation';
      case 'timeout':
        return isAIDefeat ? 'Defeat — Time Expired' : 'Victory on Time';
      case 'stalemate':
        return 'Stalemate — No Legal Moves Remaining';
      case 'repetition':
        return 'Draw by Threefold Repetition';
      case 'insufficient':
        return 'Draw by Insufficient Material';
      case 'fifty-move':
        return 'Draw by Fifty-Move Rule';
      default:
        return 'Battle Concluded';
    }
  })();

  const winnerName =
    status.winner === 'draw'
      ? 'Draw'
      : status.winner === 'w'
      ? 'White Kingdom'
      : 'Black Kingdom';

  const aiProfile = AI_PROFILES[settings.difficulty];
  const timeLabel =
    TIME_CONTROLS.find((t) => t.seconds === settings.timeControlSeconds)?.label ?? '10 MIN';

  return (
    <div className="animate-modal-backdrop fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div className="fantasy-panel animate-modal-panel max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl p-5 text-center sm:p-6">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border ${
            isDraw
              ? 'border-sky-400/40 bg-sky-400/12 text-sky-200'
              : isAIDefeat
              ? 'border-rose-400/45 bg-rose-500/15 text-rose-300'
              : 'border-amber-400/45 bg-amber-400/15 text-amber-300'
          }`}
        >
          {isDraw ? (
            <Shield className="h-7 w-7" />
          ) : isAIDefeat ? (
            <Skull className="h-7 w-7" />
          ) : (
            <Crown className="h-7 w-7" />
          )}
        </div>

        <p
          className={`font-display mt-3 text-xs font-bold tracking-[0.22em] uppercase ${
            isDraw ? 'text-sky-300' : isAIDefeat ? 'text-rose-300' : 'text-amber-300'
          }`}
        >
          {bannerLabel}
        </p>
        <h2 className="font-display mt-1 text-balance text-xl font-bold tracking-wide text-amber-100 sm:text-2xl">
          {headline}
        </h2>
        <p className="mt-1.5 text-sm text-slate-300">{reasonText}</p>

        {/* Earned Currency & Progression Summary */}
        {rewardSummary && (
          <div className="mt-4 rounded-xl border border-amber-400/30 bg-[#0d1422]/85 p-3 text-left">
            {rewardSummary.eligible &&
            (rewardSummary.totalCoins > 0 || rewardSummary.totalGems > 0) ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-amber-200 uppercase">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    Rewards Earned
                  </span>
                  <div className="font-mono-tabular flex items-center gap-3 text-sm font-bold">
                    {rewardSummary.totalCoins > 0 && (
                      <span className="flex items-center gap-1 text-amber-300">
                        <Coins className="h-4 w-4" />+{rewardSummary.totalCoins}
                      </span>
                    )}
                    {rewardSummary.totalGems > 0 && (
                      <span className="flex items-center gap-1 text-sky-300">
                        <Gem className="h-4 w-4" />+{rewardSummary.totalGems}
                      </span>
                    )}
                  </div>
                </div>

                {rewardSummary.firstTimeBonuses.length > 0 && (
                  <ul className="mt-2 space-y-1 border-t border-white/10 pt-2 text-[11px]">
                    {rewardSummary.firstTimeBonuses.map((bonus) => (
                      <li
                        key={bonus.id}
                        className="flex items-center justify-between text-emerald-300"
                      >
                        <span className="truncate">{bonus.label}</span>
                        <span className="font-mono-tabular shrink-0 font-bold">
                          +{bonus.coins}c{bonus.gems > 0 ? ` +${bonus.gems}g` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {rewardSummary.newlyReadyMilestones.length > 0 && (
                  <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/10 pt-2">
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-[11px] font-semibold text-amber-200">
                      <Award className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                      Milestone Ready: {rewardSummary.newlyReadyMilestones[0]}
                    </span>
                    {onOpenTreasury && (
                      <button
                        type="button"
                        onClick={onOpenTreasury}
                        className="shrink-0 rounded-lg border border-amber-400/50 bg-amber-400/15 px-2.5 py-1 text-[10px] font-bold tracking-wider text-amber-100 uppercase hover:bg-amber-400/25"
                      >
                        Claim
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-[11px] text-slate-400">
                {rewardSummary.ineligibleReason ?? 'No Coins or Gems earned for this match.'}
              </p>
            )}
          </div>
        )}

        {/* Match Stats Dossier */}
        <dl className="mt-4 divide-y divide-white/8 rounded-xl border border-white/10 bg-[#0b0f18]/75 px-4 py-1 text-left text-xs sm:text-sm">
          <div className="flex items-center justify-between py-2">
            <dt className="text-slate-400">Winner</dt>
            <dd className="font-semibold text-amber-100">{winnerName}</dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-slate-400">Game Mode</dt>
            <dd className="font-semibold text-slate-200">
              {settings.mode === 'ai' ? 'Player vs AI' : '1 vs 1 (Local)'}
            </dd>
          </div>
          {settings.mode === 'ai' && (
            <div className="flex items-center justify-between py-2">
              <dt className="text-slate-400">Difficulty</dt>
              <dd className={`font-semibold ${aiProfile.badgeColor}`}>
                {aiProfile.label} · {aiProfile.persona}
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between py-2">
            <dt className="text-slate-400">Time Control</dt>
            <dd className="font-mono-tabular font-semibold text-slate-200">{timeLabel}</dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-slate-400">Move Count</dt>
            <dd className="font-mono-tabular font-semibold text-slate-200">
              {status.moveCount}
            </dd>
          </div>
        </dl>

        {/* Actions */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onRematch}
            className="fantasy-btn-primary flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-bold tracking-wider uppercase sm:text-sm"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Rematch</span>
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="fantasy-btn-secondary flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-semibold tracking-wider uppercase sm:text-sm"
          >
            <Home className="h-4 w-4 text-amber-300" />
            <span>Main Menu</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onInspectBoard}
          className="mt-2.5 flex min-h-[40px] w-full items-center justify-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-amber-200"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Inspect Final Board</span>
        </button>
      </div>
    </div>
  );
}
