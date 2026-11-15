import { PIECE_GLYPHS, PIECE_LABELS, type PieceColor, type PieceType } from '../types/chess';

interface PromotionModalProps {
  color: PieceColor;
  onSelect: (piece: Exclude<PieceType, 'p' | 'k'>) => void;
  onCancel: () => void;
}

const OPTIONS: Array<Exclude<PieceType, 'p' | 'k'>> = ['q', 'r', 'b', 'n'];

export function PromotionModal({ color, onSelect, onCancel }: PromotionModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-amber-400/35 bg-[#121826] p-5 shadow-2xl">
        <h2 className="font-display text-center text-lg font-bold text-amber-100">
          Promote Champion
        </h2>
        <p className="mt-1 text-center text-xs text-slate-300">
          Choose which rank your {color === 'w' ? 'White' : 'Black'} soldier ascends to.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {OPTIONS.map((piece) => (
            <button
              key={piece}
              type="button"
              onClick={() => onSelect(piece)}
              className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border border-amber-400/25 bg-white/5 p-3 text-slate-100 transition-colors hover:border-amber-400 hover:bg-amber-400/15 active:scale-[0.98]"
            >
              <span className="text-2xl leading-none">{PIECE_GLYPHS[color][piece]}</span>
              <span className="text-xs font-semibold">{PIECE_LABELS[piece]}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
