import { Home, Play, RotateCcw, Settings } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onMainMenu: () => void;
}

export function PauseModal({
  onResume,
  onRestart,
  onOpenSettings,
  onMainMenu,
}: PauseModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div className="fantasy-panel w-full max-w-sm rounded-2xl p-6 text-center">
        <h2 className="font-display text-xl font-bold tracking-wider text-amber-100">
          BATTLE PAUSED
        </h2>
        <p className="mt-1 text-xs text-slate-400">Chess clocks are suspended while paused.</p>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="fantasy-btn-primary flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl text-sm font-bold tracking-wide uppercase"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Resume Battle</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="fantasy-btn-secondary flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold"
          >
            <RotateCcw className="h-4 w-4 text-amber-300" />
            <span>Restart Match</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="fantasy-btn-secondary flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold"
          >
            <Settings className="h-4 w-4 text-amber-300" />
            <span>Battlefield Settings</span>
          </button>

          <button
            type="button"
            onClick={onMainMenu}
            className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/12 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/20"
          >
            <Home className="h-4 w-4" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
