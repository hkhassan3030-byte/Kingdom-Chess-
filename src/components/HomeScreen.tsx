import { BookOpen, Play, Settings, Swords } from 'lucide-react';
import { HomeDioramaCanvas } from '../three/HomeDioramaCanvas';
import type { GraphicsQuality } from '../types/chess';

interface HomeScreenProps {
  quality: GraphicsQuality;
  onStartGame: () => void;
  onOpenModes: () => void;
  onOpenSettings: () => void;
  onOpenHowToPlay: () => void;
}

export function HomeScreen({
  quality,
  onStartGame,
  onOpenModes,
  onOpenSettings,
  onOpenHowToPlay,
}: HomeScreenProps) {
  return (
    <section className="relative flex h-dvh w-full max-w-full flex-col justify-between overflow-hidden bg-[#0b101c]">
      {/* Live 3D Rival Kings & Ancient Castle Diorama */}
      <HomeDioramaCanvas quality={quality} />

      {/* Measured Top & Bottom Contrast Scrims (leaves central 3D Kings unobstructed) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,transparent_24%,rgba(8,12,20,0.72)_88%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#080c15]/92 via-[#080c15]/55 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-[#080c15]/96 via-[#080c15]/78 to-transparent"
      />

      {/* Top Title Header */}
      <header className="relative z-10 flex flex-col items-center px-5 pt-7 text-center sm:pt-10">
        <div className="mb-2 h-px w-28 bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />
        <h1 className="font-display text-balance text-3xl font-bold tracking-[0.14em] text-amber-100 drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)] sm:text-5xl">
          KINGDOM CHESS
        </h1>
        <p className="mt-2 max-w-md text-sm font-medium tracking-wide text-amber-200/85 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] sm:text-base">
          Rule the Kingdom. Master the Board.
        </p>
        <div className="mt-2.5 h-px w-40 bg-gradient-to-r from-transparent via-amber-500/45 to-transparent" />
      </header>

      {/* Bottom Thumb-Zone Menu Actions */}
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-3 px-5 pb-7 sm:max-w-lg sm:pb-10">
        <button
          type="button"
          onClick={onStartGame}
          className="fantasy-btn-primary flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-2xl px-6 py-3.5 text-base font-bold tracking-[0.08em] uppercase"
        >
          <Play className="h-5 w-5 fill-current" />
          <span className="font-display">Start Game</span>
        </button>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <button
            type="button"
            onClick={onOpenModes}
            className="fantasy-btn-secondary flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-wide"
          >
            <Swords className="h-4 w-4 text-amber-300" />
            <span className="whitespace-nowrap">Game Modes</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="fantasy-btn-secondary flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-wide"
          >
            <Settings className="h-4 w-4 text-amber-300" />
            <span className="whitespace-nowrap">Settings</span>
          </button>

          <button
            type="button"
            onClick={onOpenHowToPlay}
            className="fantasy-btn-secondary flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-wide"
          >
            <BookOpen className="h-4 w-4 text-amber-300" />
            <span className="whitespace-nowrap">How To Play</span>
          </button>
        </div>
      </div>
    </section>
  );
}
