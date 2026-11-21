import { PIECE_GLYPHS, PIECE_LABELS, type PieceColor, type PieceType } from '../types/chess';

interface PromotionModalProps {
  color: PieceColor;
  targetSquare?: string;
  onSelect: (piece: Exclude<PieceType, 'p' | 'k'>) => void;
  onCancel: () => void;
}

const OPTIONS: Array<{ piece: Exclude<PieceType, 'p' | 'k'>; role: string }> = [
  { piece: 'q', role: 'Strongest Commander' },
  { piece: 'r', role: 'Siege Fortress' },
  { piece: 'b', role: 'Royal Strategist' },
  { piece: 'n', role: 'Armored Lancer' },
];

export function PromotionModal({
  color,
  targetSquare,
  onSelect,
  onCancel,
}: PromotionModalProps) {
  const kingdomLabel = color === 'w' ? 'White' : 'Black';

  return (
    <div className="animate-modal-backdrop fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="promotion-modal-title"
        className="fantasy-panel animate-modal-panel w-full max-w-sm rounded-2xl p-5 sm:p-6"
      >
        <p className="font-display text-center text-[11px] font-bold tracking-[0.2em] text-amber-300 uppercase">
          Pawn Ascension{targetSquare ? ` · ${targetSquare.toUpperCase()}` : ''}
        </p>
        <h2
          id="promotion-modal-title"
          className="font-display mt-1 text-center text-lg font-bold tracking-wide text-amber-100"
        >
          PROMOTE CHAMPION
        </h2>
        <p className="mt-1 text-center text-xs text-slate-300">
          Choose which rank your {kingdomLabel} soldier ascends to.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {OPTIONS.map(({ piece, role }) => (
            <button
              key={piece}
              type="button"
              onClick={() => onSelect(piece)}
              aria-label={`Promote to ${PIECE_LABELS[piece]}`}
              className="fantasy-btn-secondary group flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-xl border border-amber-400/30 p-3 text-slate-100 hover:border-amber-400 hover:bg-amber-400/15"
            >
              <span className="text-3xl leading-none text-amber-100 transition-transform duration-150 group-hover:scale-110">
                {PIECE_GLYPHS[color][piece]}
              </span>
              <span className="font-display text-xs font-bold tracking-wide text-amber-100">
                {PIECE_LABELS[piece]}
              </span>
              <span className="text-[10px] text-slate-400">{role}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          data-sfx="custom"
          onClick={onCancel}
          className="fantasy-btn-secondary mt-3.5 flex min-h-[44px] w-full items-center justify-center rounded-xl text-xs font-semibold tracking-wider uppercase"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
