import { ArrowLeft, Clock, Shield, Star, Swords } from 'lucide-react';
import { CHARACTER_SETS } from '../three/characterSets';
import {
  AI_PROFILES,
  TIME_CONTROLS,
  type GameSettings,
  type TimerOption,
} from '../types/chess';

interface MatchSetupScreenProps {
  settings: GameSettings;
  onChangeTimeControl: (seconds: TimerOption) => void;
  onChangeAutoFlip: (autoFlip: boolean) => void;
  onChangeKingdom?: () => void;
  onStartBattle: () => void;
  onBack: () => void;
}

export function MatchSetupScreen({
  settings,
  onChangeTimeControl,
  onChangeAutoFlip,
  onChangeKingdom,
  onStartBattle,
  onBack,
}: MatchSetupScreenProps) {
  const aiProfile = AI_PROFILES[settings.difficulty];
  const characterSetCfg = CHARACTER_SETS[settings.characterSet];
  const isAI = settings.mode === 'ai';

  return (
    <section className="flex h-dvh w-full max-w-full flex-col overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_50%_12%,#1b2438_0%,#0b0f18_75%)] px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        {/* Top Bar */}
        <header className="flex items-center justify-between gap-3 border-b border-amber-400/20 pb-4">
          <button
            type="button"
            onClick={onBack}
            className="fantasy-btn-secondary flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          >
            <ArrowLeft className="h-4 w-4 text-amber-300" />
            <span>Back</span>
          </button>

          <div className="text-center">
            <h1 className="font-display text-lg font-bold tracking-[0.12em] text-amber-100 sm:text-2xl">
              KINGDOM CHESS
            </h1>
            <p className="text-xs text-amber-200/75">Match Setup</p>
          </div>

          <div className="w-[84px]" aria-hidden="true" />
        </header>

        {/* Match Summary Panel */}
        <div className="my-auto py-5 space-y-5">
          <div className="fantasy-panel rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-2.5 border-b border-white/10 pb-3.5">
              <Shield className="h-5 w-5 text-amber-300" />
              <h2 className="font-display text-base font-bold tracking-wider text-amber-100 uppercase">
                Battle Dossier
              </h2>
            </div>

            <dl className="mt-4 divide-y divide-white/8 text-sm">
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-400">Game Mode</dt>
                <dd className="font-semibold text-slate-100">
                  {isAI ? 'Player vs AI' : '1 vs 1 (Local)'}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-2 py-2.5">
                <dt className="text-slate-400">Character Set</dt>
                <dd className="flex items-center gap-2">
                  <span className={`font-semibold ${characterSetCfg.badgeTextClass}`}>
                    {characterSetCfg.name}
                  </span>
                  {onChangeKingdom && (
                    <button
                      type="button"
                      onClick={onChangeKingdom}
                      className="rounded-lg border border-amber-400/35 bg-amber-400/10 px-2 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-400/20"
                    >
                      Change
                    </button>
                  )}
                </dd>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-400">
                  {isAI ? 'Your Kingdom' : 'Player 1 / Player 2'}
                </dt>
                <dd className="font-semibold text-amber-200">
                  {isAI
                    ? settings.playerColor === 'w'
                      ? 'White Kingdom'
                      : 'Black Kingdom'
                    : 'White vs Black'}
                </dd>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-400">Opponent</dt>
                <dd className={`font-semibold ${isAI ? aiProfile.badgeColor : 'text-slate-100'}`}>
                  {isAI ? aiProfile.persona : 'Local Challenger'}
                </dd>
              </div>

              {isAI && (
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-400">Difficulty</dt>
                  <dd className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100">{aiProfile.label}</span>
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < aiProfile.stars
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-600'
                          }`}
                        />
                      ))}
                    </span>
                  </dd>
                </div>
              )}

              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-400">Time</dt>
                <dd className="font-mono-tabular font-semibold text-amber-200">
                  {TIME_CONTROLS.find((t) => t.seconds === settings.timeControlSeconds)?.label ??
                    '10 MIN'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Time Control Selection */}
          <div className="fantasy-panel rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-2 text-amber-100">
              <Clock className="h-4 w-4 text-amber-300" />
              <h2 className="font-display text-sm font-bold tracking-wider uppercase">
                Select Chess Timer
              </h2>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {TIME_CONTROLS.map((t) => {
                const selected = settings.timeControlSeconds === t.seconds;
                return (
                  <button
                    key={t.seconds}
                    type="button"
                    onClick={() => onChangeTimeControl(t.seconds)}
                    className={`flex min-h-[58px] flex-col items-center justify-center rounded-xl border px-3 py-2 text-center transition-all active:scale-[0.98] ${
                      selected
                        ? 'border-amber-400 bg-amber-400/18 text-amber-100 shadow-[0_0_18px_rgba(245,180,65,0.2)]'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-amber-400/40'
                    }`}
                  >
                    <span className="font-mono-tabular text-sm font-bold">{t.label}</span>
                    <span className="text-[11px] text-slate-400">{t.sublabel}</span>
                  </button>
                );
              })}
            </div>

            {!isAI && (
              <label className="mt-4 flex min-h-[46px] cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/4 px-3.5 py-2">
                <span className="text-xs font-medium text-slate-200 sm:text-sm">
                  Auto-Flip Side Between Turns
                </span>
                <input
                  type="checkbox"
                  checked={settings.autoFlipPvP}
                  onChange={(e) => onChangeAutoFlip(e.target.checked)}
                  className="h-4 w-4 accent-amber-400"
                />
              </label>
            )}
          </div>
        </div>

        {/* Start Battle CTA */}
        <div className="pb-2">
          <button
            type="button"
            onClick={onStartBattle}
            className="fantasy-btn-primary flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-2xl px-6 text-base font-bold tracking-[0.1em] uppercase"
          >
            <Swords className="h-5 w-5" />
            <span className="font-display">Start Battle</span>
          </button>
        </div>
      </div>
    </section>
  );
}
