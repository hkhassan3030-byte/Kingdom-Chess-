import { Crown, Eye, Hand, ShieldAlert, Swords, X } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export function HowToPlayModal({ onClose }: HowToPlayModalProps) {
  return (
    <div className="animate-modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/75 sm:items-center sm:p-4">
      <div className="fantasy-panel animate-sheet-panel max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-5 sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-amber-400/20 pb-3.5">
          <h2 className="font-display text-lg font-bold tracking-wider text-amber-100 sm:text-xl">
            HOW TO PLAY
          </h2>
          <button
            type="button"
            data-sfx="custom"
            onClick={onClose}
            aria-label="Close How To Play"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/12 bg-white/5 text-slate-300 transition-colors hover:text-white active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm text-slate-200">
          <div className="rounded-xl border border-white/10 bg-white/4 p-4">
            <div className="flex items-center gap-2 font-display text-sm font-bold text-amber-200">
              <Hand className="h-4 w-4 text-amber-300" />
              <span>Touch &amp; Camera Controls</span>
            </div>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
              <li>Tap any warrior of your Kingdom to highlight legal moves and capture targets.</li>
              <li>Fixed battlefield camera keeps the board steady for crisp, accurate moves.</li>
              <li>Pinch with two fingers (or use Zoom buttons) to zoom in and out smoothly.</li>
              <li>Tap <strong className="text-amber-200">Inspect</strong> to zoom smoothly closer while keeping the full chessboard centered, or <strong className="text-amber-200">Overview</strong> to reset zoom.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/4 p-4">
            <div className="flex items-center gap-2 font-display text-sm font-bold text-amber-200">
              <Crown className="h-4 w-4 text-amber-300" />
              <span>Royal Chess Rules</span>
            </div>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
              <li><strong className="text-slate-100">Objective:</strong> Place the opposing King in Checkmate so it cannot escape capture.</li>
              <li><strong className="text-slate-100">Castling:</strong> Move your King two squares toward an unmoved Rook when no pieces stand between and neither is under attack.</li>
              <li><strong className="text-slate-100">En Passant &amp; Promotion:</strong> Captures in passing and pawn ascension to Queen, Rook, Bishop, or Knight are fully supported.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/4 p-4">
            <div className="flex items-center gap-2 font-display text-sm font-bold text-amber-200">
              <Swords className="h-4 w-4 text-amber-300" />
              <span>Cinematic Combat &amp; AI Challengers</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
              Every capture triggers a unique duel choreography for Kings, Queens, Rooks, Bishops, Knights, and Soldiers. Challenge five AI ranks from <strong className="text-emerald-300">Young Squire</strong> to <strong className="text-amber-300">The Ancient King</strong>, or battle a friend in local 1 vs 1 mode.
            </p>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-amber-400/20 bg-amber-500/8 px-3.5 py-2.5 text-xs text-amber-100/90">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-300" />
            <span>When the chess timer reaches 00:00, the opposing Kingdom wins on time.</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/4 px-3.5 py-2.5 text-xs text-slate-300">
            <Eye className="h-4 w-4 shrink-0 text-sky-300" />
            <span>You can switch between High and Balanced 3D quality anytime in Settings.</span>
          </div>
        </div>

        <button
          type="button"
          data-sfx="custom"
          onClick={onClose}
          className="fantasy-btn-primary mt-5 flex min-h-[48px] w-full items-center justify-center rounded-xl text-sm font-bold tracking-wider uppercase"
        >
          Return
        </button>
      </div>
    </div>
  );
}
