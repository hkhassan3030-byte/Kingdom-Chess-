import { memo } from 'react';
import { BookOpen, Play, Settings, Swords } from 'lucide-react';
import { HomeDioramaCanvas } from '../three/HomeDioramaCanvas';
import { HomeResourceArea } from './HomeResourceArea';
import { renderProfileAvatarIcon } from './ProfileModal';
import type { GraphicsQuality, PlayerProfile } from '../types/chess';

interface HomeScreenProps {
  quality: GraphicsQuality;
  profile: PlayerProfile;
  onOpenProfile: () => void;
  onStartGame: () => void;
  onOpenModes: () => void;
  onOpenSettings: () => void;
  onOpenHowToPlay: () => void;
}

export const HomeScreen = memo(function HomeScreen({
  quality,
  profile,
  onOpenProfile,
  onStartGame,
  onOpenModes,
  onOpenSettings,
  onOpenHowToPlay,
}: HomeScreenProps) {
  return (
    <section className="relative flex h-dvh w-full max-w-full flex-col justify-between overflow-hidden bg-[#0b101c]">
      {/* Live 3D Rival Kings & Moonlit Medieval Castle Diorama */}
      <HomeDioramaCanvas quality={quality} />

      {/* Measured Edge & Vertical Scrims leaving center 3D Kings and Castle unobstructed */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,transparent_32%,rgba(7,11,20,0.62)_92%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#070b14]/88 via-[#070b14]/42 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#070b14]/94 via-[#070b14]/68 to-transparent sm:h-56"
      />

      {/* Top Navigation & Title Region */}
      <div className="relative z-10 flex flex-col px-4 pt-[max(0.85rem,env(safe-area-inset-top))] sm:px-6 sm:pt-5">
        {/* Top Bar: Profile Card (left) + Reserved Expandable Resource Zone (right) */}
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onOpenProfile}
            aria-label={`Open commander profile for ${profile.name}`}
            className="group relative flex min-h-[46px] min-w-0 max-w-[232px] flex-1 items-center gap-2.5 rounded-xl border border-amber-400/45 bg-gradient-to-b from-[#131c2e]/92 to-[#0b111d]/95 px-2.5 py-1.5 pr-3.5 text-left shadow-[0_10px_26px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,232,175,0.2)] transition-transform duration-150 hover:border-amber-300/70 active:scale-[0.98] sm:max-w-[264px]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-300/50 bg-gradient-to-b from-amber-500/25 to-amber-900/35 text-amber-200 ring-1 ring-amber-400/20 shadow-[inset_0_1px_0_rgba(255,235,185,0.28)]">
              {renderProfileAvatarIcon(profile.avatarId, 'h-4 w-4')}
            </div>
            <div className="min-w-0">
              <div className="font-display truncate text-xs font-bold tracking-wider text-amber-100 sm:text-sm">
                {profile.name}
              </div>
              <div className="font-mono-tabular mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
                <span className="text-amber-300/95">Lv. {profile.level}</span>
                <span aria-hidden="true" className="text-amber-400/50">
                  ·
                </span>
                <span>{profile.rating}</span>
              </div>
            </div>
          </button>

          {/* Reserved top-right zone for future Coins / Gems */}
          <HomeResourceArea />
        </div>

        {/* Upper-Center Royal Title Lockup (compact & refined so the castle remains clear and dominant) */}
        <header className="mt-2.5 flex flex-col items-center text-center sm:mt-3.5">
          <div className="mb-1 flex items-center gap-2 sm:mb-1.5">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-400/75 sm:w-16" />
            <span className="h-1.5 w-1.5 rotate-45 border border-amber-300/80 bg-amber-400/50" />
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-400/75 sm:w-16" />
          </div>
          <h1 className="font-display bg-gradient-to-b from-[#fff6de] via-[#f1cf88] to-[#c79137] bg-clip-text text-[1.45rem] leading-[1.08] font-bold tracking-[0.13em] text-transparent drop-shadow-[0_3px_14px_rgba(0,0,0,0.96)] sm:text-[2.35rem]">
            KINGDOM CHESS
          </h1>
          <p className="mt-1 max-w-sm text-[11px] font-medium tracking-[0.08em] text-amber-100/80 drop-shadow-[0_2px_8px_rgba(0,0,0,0.96)] sm:text-sm">
            Rule the Kingdom. Master the Board.
          </p>
          <div className="mt-1.5 h-px w-28 bg-gradient-to-r from-transparent via-amber-500/45 to-transparent sm:w-36" />
        </header>
      </div>

      {/* Bottom Thumb-Zone Action Dock */}
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-2.5 px-4 pb-[max(1.1rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:px-5 sm:pb-8">
        <button
          type="button"
          onClick={onStartGame}
          className="fantasy-btn-primary relative flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-xl px-6 py-3 text-[15px] font-bold tracking-[0.12em] uppercase ring-1 ring-amber-200/35"
        >
          <Play className="h-4.5 w-4.5 fill-current" />
          <span className="font-display">START BATTLE</span>
        </button>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onOpenModes}
            className="fantasy-btn-secondary flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl border-amber-400/35 px-2 py-1.5 text-[11px] font-semibold tracking-wide sm:flex-row sm:gap-2 sm:px-3 sm:text-sm"
          >
            <Swords className="h-4 w-4 shrink-0 text-amber-300" />
            <span className="whitespace-nowrap">Modes</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="fantasy-btn-secondary flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl border-amber-400/35 px-2 py-1.5 text-[11px] font-semibold tracking-wide sm:flex-row sm:gap-2 sm:px-3 sm:text-sm"
          >
            <Settings className="h-4 w-4 shrink-0 text-amber-300" />
            <span className="whitespace-nowrap">Settings</span>
          </button>

          <button
            type="button"
            onClick={onOpenHowToPlay}
            className="fantasy-btn-secondary flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl border-amber-400/35 px-2 py-1.5 text-[11px] font-semibold tracking-wide sm:flex-row sm:gap-2 sm:px-3 sm:text-sm"
          >
            <BookOpen className="h-4 w-4 shrink-0 text-amber-300" />
            <span className="whitespace-nowrap">How To Play</span>
          </button>
        </div>
      </div>
    </section>
  );
});
