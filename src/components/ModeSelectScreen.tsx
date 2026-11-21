import { memo } from 'react';
import { ArrowLeft, Bot, ChevronRight, Swords } from 'lucide-react';
import { ModePreviewCanvas } from '../three/ModePreviewCanvas';
import type { GameMode } from '../types/chess';

interface ModeSelectScreenProps {
  onSelectMode: (mode: GameMode) => void;
  onBack: () => void;
}

export const ModeSelectScreen = memo(function ModeSelectScreen({ onSelectMode, onBack }: ModeSelectScreenProps) {
  return (
    <section className="animate-screen-in flex h-dvh w-full max-w-full flex-col overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_50%_15%,#1b2438_0%,#0b0f18_75%)] px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
        {/* Top Bar */}
        <header className="flex items-center justify-between gap-4 border-b border-amber-400/20 pb-4">
          <button
            type="button"
            onClick={onBack}
            className="fantasy-btn-secondary flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          >
            <ArrowLeft className="h-4 w-4 text-amber-300" />
            <span>Back</span>
          </button>

          <h1 className="font-display text-center text-lg font-bold tracking-[0.1em] text-amber-100 sm:text-2xl">
            SELECT GAME MODE
          </h1>

          <div className="w-[84px]" aria-hidden="true" />
        </header>

        {/* Two Mode Cards */}
        <div className="my-auto grid grid-cols-1 gap-5 py-6 md:grid-cols-2">
          {/* 1 VS 1 Local Card */}
          <button
            type="button"
            onClick={() => onSelectMode('pvp')}
            className="fantasy-panel group flex flex-col overflow-hidden rounded-2xl text-left transition-transform duration-150 hover:border-amber-300/70 active:scale-[0.985]"
          >
            <div className="relative h-44 w-full overflow-hidden border-b border-amber-400/20 bg-[#0d1321] sm:h-56">
              <ModePreviewCanvas mode="pvp" />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0d1321] to-transparent"
              />
            </div>

            <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/35 bg-amber-400/12 text-amber-300">
                    <Swords className="h-5 w-5" />
                  </div>
                  <h2 className="font-display text-xl font-bold tracking-wide text-amber-100 sm:text-2xl">
                    1 VS 1
                  </h2>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                  Challenge another player
                </p>
                <p className="mt-1.5 text-xs text-slate-400">
                  Pass-and-play on the same device · White Kingdom vs Black Kingdom
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3.5 text-xs font-semibold tracking-wider text-amber-300 uppercase">
                <span>Local Battle</span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </button>

          {/* Player VS AI Card */}
          <button
            type="button"
            onClick={() => onSelectMode('ai')}
            className="fantasy-panel group flex flex-col overflow-hidden rounded-2xl text-left transition-transform duration-150 hover:border-amber-300/70 active:scale-[0.985]"
          >
            <div className="relative h-44 w-full overflow-hidden border-b border-amber-400/20 bg-[#0d1321] sm:h-56">
              <ModePreviewCanvas mode="ai" delayMs={45} />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0d1321] to-transparent"
              />
            </div>

            <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-400/35 bg-rose-500/12 text-rose-300">
                    <Bot className="h-5 w-5" />
                  </div>
                  <h2 className="font-display text-xl font-bold tracking-wide text-amber-100 sm:text-2xl">
                    PLAYER VS AI
                  </h2>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                  Battle the Kingdom&apos;s smartest warrior
                </p>
                <p className="mt-1.5 text-xs text-slate-400">
                  5 tactical difficulty tiers · Young Squire to The Ancient King
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3.5 text-xs font-semibold tracking-wider text-amber-300 uppercase">
                <span>Choose Opponent</span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
});
