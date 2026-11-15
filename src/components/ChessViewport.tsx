import { memo, useEffect, useRef, useState } from 'react';
import { ChessSceneController } from '../three/ChessSceneController';
import type { CombatSoundEvent } from '../three/combatChoreography';
import type {
  BoardPiece,
  CharacterSetId,
  GraphicsQuality,
  MoveAnimationPayload,
  PieceColor,
} from '../types/chess';

interface ChessViewportProps {
  pieces: BoardPiece[];
  selectedSquare: string | null;
  legalTargets: Array<{ square: string; isCapture: boolean }>;
  lastMove: { from: string; to: string } | null;
  checkSquare: string | null;
  pendingAnimation: MoveAnimationPayload | null;
  showCoordinates: boolean;
  quality: GraphicsQuality;
  characterSet: CharacterSetId;
  initialSide: PieceColor;
  onSquareTap: (square: string) => void;
  onAnimationComplete: () => void;
  onCombatSound: (event: CombatSoundEvent) => void;
  controllerRef: React.MutableRefObject<ChessSceneController | null>;
}

export const ChessViewport = memo(function ChessViewport({
  pieces,
  selectedSquare,
  legalTargets,
  lastMove,
  checkSquare,
  pendingAnimation,
  showCoordinates,
  quality,
  characterSet,
  initialSide,
  onSquareTap,
  onAnimationComplete,
  onCombatSound,
  controllerRef,
}: ChessViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const onSquareTapRef = useRef(onSquareTap);
  const onAnimCompleteRef = useRef(onAnimationComplete);
  const onCombatSoundRef = useRef(onCombatSound);

  useEffect(() => {
    onSquareTapRef.current = onSquareTap;
  }, [onSquareTap]);

  useEffect(() => {
    onAnimCompleteRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  useEffect(() => {
    onCombatSoundRef.current = onCombatSound;
  }, [onCombatSound]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctrl = new ChessSceneController(container, {
      initialSide,
      characterSet,
      onSquareTap: (sq) => onSquareTapRef.current(sq),
      onCombatSound: (cue) => onCombatSoundRef.current(cue),
      onContextLost: () => setContextLost(true),
      onContextRestored: () => setContextLost(false),
    });

    controllerRef.current = ctrl;

    return () => {
      controllerRef.current = null;
      ctrl.dispose();
    };
    // Mount WebGL scene once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync board pieces when not mid-animation
  useEffect(() => {
    if (!pendingAnimation) {
      controllerRef.current?.syncBoard(pieces);
    }
  }, [pieces, pendingAnimation, controllerRef]);

  // Trigger move/capture animation
  useEffect(() => {
    if (pendingAnimation && controllerRef.current) {
      controllerRef.current.playMoveAnimation(pendingAnimation, () => {
        onAnimCompleteRef.current();
      });
    }
  }, [pendingAnimation, controllerRef]);

  // Update tile highlights
  useEffect(() => {
    controllerRef.current?.updateHighlights({
      selectedSquare,
      legalTargets,
      lastMove,
      checkSquare,
    });
  }, [selectedSquare, legalTargets, lastMove, checkSquare, controllerRef]);

  // Sync visual settings
  useEffect(() => {
    controllerRef.current?.setShowCoordinates(showCoordinates);
  }, [showCoordinates, controllerRef]);

  useEffect(() => {
    controllerRef.current?.setQuality(quality);
  }, [quality, controllerRef]);

  useEffect(() => {
    controllerRef.current?.setCharacterSet(characterSet);
  }, [characterSet, controllerRef]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#131a28]">
      <div ref={mountRef} className="w-full h-full touch-canvas" />
      {contextLost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0d111a]/95 p-6 text-center">
          <div className="max-w-sm rounded-2xl border border-amber-500/30 bg-[#151b29] p-6">
            <h2 className="font-display text-lg font-bold text-amber-200">
              3D Battlefield Suspended
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              The graphics context was temporarily interrupted. Reloading the scene automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
});
