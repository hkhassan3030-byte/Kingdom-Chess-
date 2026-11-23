import { memo, useEffect, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Coins, Gem, Lock, Shield, Swords } from 'lucide-react';
import {
  UNLOCKABLE_BY_ID,
  canAffordUnlock,
  getCharacterSetUnlockId,
  isCharacterSetUnlocked,
} from '../engine/unlockables';
import { CHARACTER_SETS, CHARACTER_SET_ORDER } from '../three/characterSets';
import { KingdomPreviewCanvas } from '../three/KingdomPreviewCanvas';
import type { BoardThemeId, CharacterSetId, GraphicsQuality, PieceSkinId, PieceType } from '../types/chess';
import type { CurrencyWallet } from '../types/progression';

interface KingdomSelectScreenProps {
  selectedSet: CharacterSetId;
  pieceSkin?: PieceSkinId;
  boardTheme?: BoardThemeId;
  unlockedIds: readonly string[];
  wallet: CurrencyWallet;
  quality: GraphicsQuality;
  onSelectSet: (setId: CharacterSetId) => void;
  onUnlockSet: (setId: CharacterSetId) => void;
  onContinue: () => void;
  onBack: () => void;
}

const ROSTER_ORDER: Array<{ type: PieceType; label: string }> = [
  { type: 'k', label: 'King' },
  { type: 'q', label: 'Queen' },
  { type: 'b', label: 'Bishop' },
  { type: 'n', label: 'Knight' },
  { type: 'r', label: 'Rook' },
  { type: 'p', label: 'Pawn' },
];

export const KingdomSelectScreen = memo(function KingdomSelectScreen({
  selectedSet,
  pieceSkin = 'royal-standard',
  boardTheme = 'classic-citadel',
  unlockedIds,
  wallet,
  quality,
  onSelectSet,
  onUnlockSet,
  onContinue,
  onBack,
}: KingdomSelectScreenProps) {
  const [focusPiece, setFocusPiece] = useState<PieceType>('n');
  const [previewSet, setPreviewSet] = useState<CharacterSetId>(selectedSet);

  useEffect(() => {
    setPreviewSet(selectedSet);
  }, [selectedSet]);

  const activeCfg = CHARACTER_SETS[previewSet];
  const focusedHero = activeCfg.pieces[focusPiece];
  const previewUnlocked = isCharacterSetUnlocked(unlockedIds, previewSet);
  const unlockCatalogItem = UNLOCKABLE_BY_ID[getCharacterSetUnlockId(previewSet)];
  const canAfford = unlockCatalogItem ? canAffordUnlock(wallet, unlockCatalogItem) : false;

  const handleCardTap = (id: CharacterSetId) => {
    setPreviewSet(id);
    if (isCharacterSetUnlocked(unlockedIds, id)) {
      onSelectSet(id);
    }
  };

  return (
    <section className="animate-screen-in flex h-dvh w-full max-w-full flex-col overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_50%_10%,#1b2438_0%,#0b0f18_75%)] px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(0.85rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
        {/* Top Bar */}
        <header className="flex items-center justify-between gap-2.5 border-b border-amber-400/20 pb-3.5">
          <button
            type="button"
            onClick={onBack}
            className="fantasy-btn-secondary flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold sm:px-4"
          >
            <ArrowLeft className="h-4 w-4 text-amber-300" />
            <span>Back</span>
          </button>

          <div className="min-w-0 flex-1 text-center">
            <h1 className="font-display truncate text-sm font-bold tracking-[0.1em] text-amber-100 sm:text-2xl">
              CHOOSE YOUR KINGDOM
            </h1>
            <p className="truncate text-[11px] text-amber-200/75 sm:text-xs">
              Select or Unlock a 3D Hero Character Set
            </p>
          </div>

          <div className="font-mono-tabular flex shrink-0 items-center gap-2 rounded-xl border border-amber-400/30 bg-[#0b111d]/80 px-2.5 py-1.5 text-xs font-bold">
            <span className="flex items-center gap-1 text-amber-300">
              <Coins className="h-3.5 w-3.5" />
              {wallet.coins}
            </span>
            <span className="flex items-center gap-1 text-sky-300">
              <Gem className="h-3.5 w-3.5" />
              {wallet.gems}
            </span>
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="mt-4 grid flex-1 grid-cols-1 gap-4 pb-4 lg:grid-cols-[1.05fr_1fr] lg:items-start">
          {/* Left: Single Lightweight 3D Preview + Interactive Hero Roster */}
          <div
            className="fantasy-panel flex flex-col overflow-hidden rounded-2xl transition-colors duration-200"
            style={{ borderColor: `${activeCfg.accentHex}55` }}
          >
            <div className="relative h-52 w-full overflow-hidden border-b border-amber-400/20 bg-[#0f1523] sm:h-64">
              <KingdomPreviewCanvas
                characterSet={previewSet}
                pieceSkin={pieceSkin}
                boardTheme={boardTheme}
                quality={quality}
                focusPiece={focusPiece}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0b0f1a] via-[#0b0f1a]/65 to-transparent"
              />
              <div className="pointer-events-none absolute top-2.5 right-3 flex items-center gap-1.5 rounded-md border border-white/10 bg-[#0b0f18]/78 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-slate-300">
                {!previewUnlocked && <Lock className="h-3 w-3 text-amber-300" />}
                <span>{focusedHero.roleTitle}</span>
              </div>
              <div className="pointer-events-none absolute bottom-2.5 left-4 right-4 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <div className={`truncate text-[11px] font-bold uppercase tracking-wider ${activeCfg.badgeTextClass}`}>
                    {activeCfg.tagline}
                  </div>
                  <div className="font-display truncate text-lg font-bold text-amber-100 sm:text-xl">
                    {activeCfg.name}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 pb-1" aria-hidden="true">
                  {activeCfg.swatchColors.map((hex) => (
                    <span
                      key={hex}
                      className="h-3.5 w-3.5 rounded-sm border border-white/25"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3.5 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Swords className="h-3.5 w-3.5 text-amber-300" />
                  Combat Style
                </span>
                <span className={`text-xs font-bold ${activeCfg.badgeTextClass}`}>
                  {activeCfg.combat.styleLabel}
                </span>
              </div>

              <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
                {activeCfg.description}
              </p>

              {/* 6-Piece Class Roster (tap any class to preview in 3D) */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-bold tracking-wider text-amber-200/80 uppercase">
                  <span className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-amber-300" />
                    <span>Full 6-Piece Hero Roster</span>
                  </span>
                  <span className="text-[10px] font-medium tracking-normal text-slate-400 normal-case">
                    Tap hero to inspect
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {ROSTER_ORDER.map(({ type, label }) => {
                    const hero = activeCfg.pieces[type];
                    const isFocused = focusPiece === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFocusPiece(type)}
                        className={`min-h-[54px] rounded-xl border px-2.5 py-2 text-left transition-colors duration-150 ${
                          isFocused
                            ? 'border-amber-300/65 bg-amber-400/10'
                            : 'border-white/8 bg-white/4 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          <span>{label}</span>
                          {isFocused ? (
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: activeCfg.accentHex }}
                            />
                          ) : null}
                        </div>
                        <div className="truncate text-xs font-semibold text-slate-100">
                          {hero.roleTitle}
                        </div>
                        <div className="truncate text-[10px] text-slate-400">
                          {hero.weaponLabel}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right: 8 Selectable Character Sets */}
          <div className="flex flex-col gap-2 lg:max-h-[calc(100dvh-13.5rem)] lg:overflow-y-auto lg:pr-1">
            {CHARACTER_SET_ORDER.map((id) => {
              const cfg = CHARACTER_SETS[id];
              const isSelected = previewSet === id;
              const isEquipped = selectedSet === id;
              const unlocked = isCharacterSetUnlocked(unlockedIds, id);
              const catalogItem = UNLOCKABLE_BY_ID[getCharacterSetUnlockId(id)];

              return (
                <button
                  key={id}
                  type="button"
                  data-sfx="custom"
                  onClick={() => handleCardTap(id)}
                  className={`flex min-h-[68px] w-full items-center justify-between gap-3 rounded-2xl border bg-gradient-to-r px-4 py-3 text-left transition-all duration-150 active:scale-[0.99] ${
                    isSelected
                      ? `${cfg.borderActiveClass} ${cfg.cardBgClass} shadow-[0_0_24px_rgba(245,180,65,0.18)]`
                      : 'border-white/10 from-[#121826]/90 to-[#0e131e]/90 hover:border-amber-400/40'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 font-display text-base font-bold text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
                      style={{
                        background: `linear-gradient(135deg, ${cfg.swatchColors[0]} 0%, ${cfg.swatchColors[1]} 100%)`,
                      }}
                    >
                      {unlocked ? cfg.number : <Lock className="h-4.5 w-4.5 text-slate-950" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-display truncate text-sm font-bold sm:text-base ${
                            isSelected ? 'text-amber-100' : 'text-slate-100'
                          }`}
                        >
                          {cfg.name}
                        </span>
                        {isEquipped && unlocked && (
                          <span className="text-[10px] font-bold tracking-wider text-emerald-300 uppercase">
                            Equipped
                          </span>
                        )}
                      </div>
                      <div className={`truncate text-xs font-medium ${cfg.badgeTextClass}`}>
                        {cfg.tagline}
                      </div>
                      <div className="truncate text-[11px] text-slate-400">
                        {cfg.combat.styleLabel}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {!unlocked && catalogItem ? (
                      <span
                        className={`font-mono-tabular flex items-center gap-1 rounded-xl border border-white/10 bg-[#0b0f18]/85 px-2.5 py-1 text-xs font-bold ${
                          catalogItem.currency === 'coins' ? 'text-amber-300' : 'text-sky-300'
                        }`}
                      >
                        {catalogItem.currency === 'coins' ? (
                          <Coins className="h-3.5 w-3.5" />
                        ) : (
                          <Gem className="h-3.5 w-3.5" />
                        )}
                        {catalogItem.cost}
                      </span>
                    ) : isSelected ? (
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-400/50 bg-amber-400/20 text-amber-200">
                        <Check className="h-4 w-4" />
                      </span>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Primary CTA */}
        <div className="sticky bottom-0 border-t border-amber-400/15 bg-[#0b0f18]/95 pt-3 pb-1">
          {previewUnlocked ? (
            <button
              type="button"
              onClick={onContinue}
              className="fantasy-btn-primary flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-6 text-sm font-bold tracking-[0.08em] uppercase sm:text-base"
            >
              <span className="font-display">Continue with {activeCfg.name}</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!canAfford}
              data-sfx="custom"
              onClick={() => onUnlockSet(previewSet)}
              className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-6 text-sm font-bold tracking-[0.08em] uppercase sm:text-base ${
                canAfford
                  ? 'fantasy-btn-primary'
                  : 'cursor-not-allowed border border-white/12 bg-white/6 text-slate-400'
              }`}
            >
              <Lock className="h-4.5 w-4.5" />
              <span className="font-display">
                {canAfford && unlockCatalogItem
                  ? `Unlock ${activeCfg.name} · ${unlockCatalogItem.cost} ${
                      unlockCatalogItem.currency === 'coins' ? 'Coins' : 'Gems'
                    }`
                  : unlockCatalogItem
                  ? `Locked · Need ${unlockCatalogItem.cost} ${
                      unlockCatalogItem.currency === 'coins' ? 'Coins' : 'Gems'
                    } (Win Matches to Earn)`
                  : 'Locked'}
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
});
