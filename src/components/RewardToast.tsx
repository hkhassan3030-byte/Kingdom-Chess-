import { Coins, Gem, Sparkles, X } from 'lucide-react';

export interface RewardToastNotice {
  id: number;
  title: string;
  subtitle?: string;
  coins?: number;
  gems?: number;
}

interface RewardToastProps {
  notice: RewardToastNotice | null;
  onDismiss: () => void;
}

export function RewardToast({ notice, onDismiss }: RewardToastProps) {
  if (!notice) return null;

  const hasCoins = Boolean(notice.coins && notice.coins > 0);
  const hasGems = Boolean(notice.gems && notice.gems > 0);

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-banner-in pointer-events-auto fixed top-[max(0.85rem,env(safe-area-inset-top))] left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2"
    >
      <div className="fantasy-panel flex items-center justify-between gap-3 rounded-2xl border border-amber-300/60 bg-gradient-to-r from-[#182238]/96 via-[#121a2b]/96 to-[#182238]/96 px-3.5 py-2.5 shadow-[0_14px_34px_rgba(0,0,0,0.68),0_0_24px_rgba(245,180,65,0.22)]">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/45 bg-amber-400/18 text-amber-200">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="font-display truncate text-xs font-bold tracking-wider text-amber-100 uppercase">
              {notice.title}
            </div>
            {notice.subtitle ? (
              <div className="truncate text-[11px] text-slate-300">{notice.subtitle}</div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {(hasCoins || hasGems) && (
            <div className="font-mono-tabular flex items-center gap-1.5 text-xs font-bold">
              {hasCoins && (
                <span className="flex items-center gap-1 text-amber-300">
                  <Coins className="h-3.5 w-3.5" />+{notice.coins}
                </span>
              )}
              {hasGems && (
                <span className="flex items-center gap-1 text-sky-300">
                  <Gem className="h-3.5 w-3.5" />+{notice.gems}
                </span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss reward notification"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
