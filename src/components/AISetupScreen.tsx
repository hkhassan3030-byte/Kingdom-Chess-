import { ArrowLeft, ChevronRight, Crown, Star } from 'lucide-react';
import { audioManager } from '../audio/AudioManager';
import {
  AI_DIFFICULTY_ORDER,
  AI_PROFILES,
  type AIDifficulty,
  type PieceColor,
} from '../types/chess';

interface AISetupScreenProps {
  playerColor: PieceColor;
  difficulty: AIDifficulty;
  onChangeColor: (color: PieceColor) => void;
  onChangeDifficulty: (difficulty: AIDifficulty) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function AISetupScreen({
  playerColor,
  difficulty,
  onChangeColor,
  onChangeDifficulty,
  onContinue,
  onBack,
}: AISetupScreenProps) {
  return (
    <section className="animate-screen-in flex h-dvh w-full max-w-full flex-col overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_50%_10%,#1b2438_0%,#0b0f18_75%)] px-4 py-5 sm:px-8 sm:py-7">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-amber-400/20 pb-4">
          <button
            type="button"
            onClick={onBack}
            className="fantasy-btn-secondary flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          >
            <ArrowLeft className="h-4 w-4 text-amber-300" />
            <span>Back</span>
          </button>

          <h1 className="font-display text-center text-lg font-bold tracking-[0.1em] text-amber-100 sm:text-2xl">
            PLAYER VS AI
          </h1>

          <div className="w-[84px]" aria-hidden="true" />
        </header>

        <div className="mt-5 flex-1 space-y-6 pb-4">
          {/* Kingdom Selection */}
          <div>
            <h2 className="font-display text-xs font-bold tracking-[0.14em] text-amber-200/90 uppercase sm:text-sm">
              1. Choose Your Kingdom
            </h2>
            <div className="mt-2.5 grid grid-cols-2 gap-3">
              <button
                type="button"
                data-sfx="tab"
                onClick={() => {
                  audioManager.playTabSwitch();
                  onChangeColor('w');
                }}
                className={`flex min-h-[68px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.985] ${
                  playerColor === 'w'
                    ? 'border-amber-400 bg-amber-400/14 shadow-[0_0_24px_rgba(245,180,65,0.2)]'
                    : 'border-white/12 bg-[#121826]/85 hover:border-amber-400/40'
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-300/40 bg-amber-100/12 text-2xl text-amber-100">
                  ♔
                </div>
                <div className="min-w-0">
                  <div className="font-display truncate text-sm font-bold text-amber-100 sm:text-base">
                    WHITE KINGDOM
                  </div>
                  <div className="text-xs text-slate-300">Moves first · Silver &amp; Gold</div>
                </div>
              </button>

              <button
                type="button"
                data-sfx="tab"
                onClick={() => {
                  audioManager.playTabSwitch();
                  onChangeColor('b');
                }}
                className={`flex min-h-[68px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.985] ${
                  playerColor === 'b'
                    ? 'border-amber-400 bg-rose-500/14 shadow-[0_0_24px_rgba(245,180,65,0.2)]'
                    : 'border-white/12 bg-[#121826]/85 hover:border-amber-400/40'
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-400/40 bg-rose-500/15 text-2xl text-rose-200">
                  ♚
                </div>
                <div className="min-w-0">
                  <div className="font-display truncate text-sm font-bold text-amber-100 sm:text-base">
                    BLACK KINGDOM
                  </div>
                  <div className="text-xs text-slate-300">Moves second · Crimson &amp; Iron</div>
                </div>
              </button>
            </div>
          </div>

          {/* 5-Tier Difficulty Selector */}
          <div>
            <h2 className="font-display text-xs font-bold tracking-[0.14em] text-amber-200/90 uppercase sm:text-sm">
              2. Select AI Challenger
            </h2>

            <div className="mt-2.5 flex flex-col gap-2.5">
              {AI_DIFFICULTY_ORDER.map((id) => {
                const profile = AI_PROFILES[id];
                const selected = difficulty === id;
                return (
                  <button
                    key={id}
                    type="button"
                    data-sfx="tab"
                    onClick={() => {
                      audioManager.playTabSwitch();
                      onChangeDifficulty(id);
                    }}
                    className={`flex w-full items-start justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all active:scale-[0.99] ${
                      selected
                        ? 'border-amber-400 bg-gradient-to-r from-amber-500/18 via-[#172033] to-[#121826] shadow-[0_0_24px_rgba(235,175,65,0.22)]'
                        : 'border-white/10 bg-[#111725]/88 hover:border-amber-400/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span
                          className={`font-display text-sm font-bold tracking-wider uppercase sm:text-base ${
                            selected ? 'text-amber-200' : 'text-slate-100'
                          }`}
                        >
                          {profile.label}
                        </span>
                        <span className="text-slate-500" aria-hidden="true">
                          ·
                        </span>
                        <span className={`text-xs font-semibold sm:text-sm ${profile.badgeColor}`}>
                          {profile.persona}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-300 sm:text-sm">
                        {profile.description}
                      </p>
                    </div>

                    {/* Star Rating Indicator */}
                    <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                      <div
                        className="flex items-center gap-0.5"
                        aria-label={`${profile.stars} out of 5 stars`}
                      >
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                              idx < profile.stars
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                      {selected && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                          <Crown className="h-3 w-3" />
                          Selected
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky Bottom Continue CTA */}
        <div className="sticky bottom-0 border-t border-amber-400/15 bg-[#0b0f18]/95 pt-3 pb-1">
          <button
            type="button"
            onClick={onContinue}
            className="fantasy-btn-primary flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-6 text-sm font-bold tracking-[0.08em] uppercase sm:text-base"
          >
            <span className="font-display">Continue to Match Setup</span>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
