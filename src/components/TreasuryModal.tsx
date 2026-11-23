import { useMemo, useState } from 'react';
import {
  Award,
  Check,
  Coins,
  Gem,
  History,
  Lock,
  Shield,
  Sparkles,
  Unlock,
  X,
} from 'lucide-react';
import { audioManager } from '../audio/AudioManager';
import { evaluateMilestones, REWARD_CONFIG } from '../engine/rewards';
import {
  UNLOCKABLE_CATALOG,
  canAffordUnlock,
  isItemUnlocked,
} from '../engine/unlockables';
import { AI_DIFFICULTY_ORDER, AI_PROFILES, type BoardThemeId, type CharacterSetId, type CommanderAvatarId, type GameSettings, type PieceSkinId, type PlayerProfile } from '../types/chess';
import type { ProgressionState, UnlockableCategory, UnlockableItem } from '../types/progression';

interface TreasuryModalProps {
  progression: ProgressionState;
  profile: PlayerProfile;
  settings: GameSettings;
  onClaimMilestone: (milestoneId: string) => void;
  onUnlockItem: (itemId: string) => void;
  onEquipCharacterSet: (setId: CharacterSetId) => void;
  onEquipPieceSkin: (skinId: PieceSkinId) => void;
  onEquipBoardTheme: (themeId: BoardThemeId) => void;
  onEquipAvatar: (avatarId: CommanderAvatarId) => void;
  onClose: () => void;
}

type TreasuryTab = 'rewards' | 'armory' | 'ledger';
type ArmoryFilter = 'all' | UnlockableCategory;

export function TreasuryModal({
  progression,
  profile,
  settings,
  onClaimMilestone,
  onUnlockItem,
  onEquipCharacterSet,
  onEquipPieceSkin,
  onEquipBoardTheme,
  onEquipAvatar,
  onClose,
}: TreasuryModalProps) {
  const [activeTab, setActiveTab] = useState<TreasuryTab>('rewards');
  const [armoryFilter, setArmoryFilter] = useState<ArmoryFilter>('all');
  const [recentlyClaimedId, setRecentlyClaimedId] = useState<string | null>(null);
  const [recentlyUnlockedId, setRecentlyUnlockedId] = useState<string | null>(null);

  const milestones = useMemo(
    () => evaluateMilestones(profile, progression),
    [profile, progression]
  );

  const claimableCount = useMemo(
    () => milestones.filter((m) => m.claimable).length,
    [milestones]
  );

  const filteredCatalog = useMemo(() => {
    if (armoryFilter === 'all') return UNLOCKABLE_CATALOG;
    return UNLOCKABLE_CATALOG.filter((item) => item.category === armoryFilter);
  }, [armoryFilter]);

  const isEquipped = (item: UnlockableItem): boolean => {
    if (item.category === 'character_set') {
      return settings.characterSet === item.targetId;
    }
    if (item.category === 'piece_skin') {
      return progression.equippedPieceSkin === item.targetId;
    }
    if (item.category === 'board_theme') {
      return progression.equippedBoardTheme === item.targetId;
    }
    if (item.category === 'avatar_crest') {
      return profile.avatarId === item.targetId;
    }
    return false;
  };

  const handleEquip = (item: UnlockableItem) => {
    if (item.category === 'character_set') {
      onEquipCharacterSet(item.targetId as CharacterSetId);
    } else if (item.category === 'piece_skin') {
      onEquipPieceSkin(item.targetId as PieceSkinId);
    } else if (item.category === 'board_theme') {
      onEquipBoardTheme(item.targetId as BoardThemeId);
    } else if (item.category === 'avatar_crest') {
      onEquipAvatar(item.targetId as CommanderAvatarId);
    }
  };

  const firstTimeItems = useMemo(() => {
    const entries = [
      REWARD_CONFIG.firstTime.firstMatch,
      REWARD_CONFIG.firstTime.firstAiWin,
      REWARD_CONFIG.firstTime.firstCheckmate,
      REWARD_CONFIG.firstTime.firstPvpMatch,
      ...AI_DIFFICULTY_ORDER.map((diff) => ({
        id: `first:win_${diff}`,
        label: `First ${AI_PROFILES[diff].label} AI Win`,
        coins: REWARD_CONFIG.firstTime.perDifficultyWin[diff].coins,
        gems: REWARD_CONFIG.firstTime.perDifficultyWin[diff].gems,
      })),
    ];
    return entries.map((entry) => ({
      ...entry,
      done: progression.claimedFirstTimeIds.includes(entry.id),
    }));
  }, [progression.claimedFirstTimeIds]);

  return (
    <div className="animate-modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/75 sm:items-center sm:p-4">
      <div className="fantasy-panel animate-sheet-panel flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-400/20 px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-lg font-bold tracking-wider text-amber-100">
              ROYAL TREASURY
            </h2>
            <div className="font-mono-tabular mt-1 flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-amber-300">
                <Coins className="h-3.5 w-3.5" />
                {progression.wallet.coins.toLocaleString()} Coins
              </span>
              <span aria-hidden="true" className="text-white/20">
                ·
              </span>
              <span className="flex items-center gap-1.5 text-sky-300">
                <Gem className="h-3.5 w-3.5" />
                {progression.wallet.gems.toLocaleString()} Gems
              </span>
            </div>
          </div>
          <button
            type="button"
            data-sfx="custom"
            onClick={onClose}
            aria-label="Close Royal Treasury"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1.5 border-b border-white/10 bg-[#0b0f18]/65 px-5 py-2.5 sm:px-6">
          <button
            type="button"
            data-sfx="tab"
            onClick={() => {
              audioManager.playTabSwitch();
              setActiveTab('rewards');
            }}
            className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition-colors ${
              activeTab === 'rewards'
                ? 'border-amber-400 bg-amber-400/18 text-amber-100'
                : 'border-white/8 bg-white/4 text-slate-300 hover:bg-white/8'
            }`}
          >
            <Award className="h-3.5 w-3.5 text-amber-300" />
            <span>Rewards</span>
            {claimableCount > 0 && (
              <span className="font-mono-tabular rounded bg-amber-400 px-1.5 py-0.5 text-[10px] leading-none font-bold text-slate-950">
                {claimableCount}
              </span>
            )}
          </button>

          <button
            type="button"
            data-sfx="tab"
            onClick={() => {
              audioManager.playTabSwitch();
              setActiveTab('armory');
            }}
            className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition-colors ${
              activeTab === 'armory'
                ? 'border-amber-400 bg-amber-400/18 text-amber-100'
                : 'border-white/8 bg-white/4 text-slate-300 hover:bg-white/8'
            }`}
          >
            <Shield className="h-3.5 w-3.5 text-amber-300" />
            <span>Armory</span>
          </button>

          <button
            type="button"
            data-sfx="tab"
            onClick={() => {
              audioManager.playTabSwitch();
              setActiveTab('ledger');
            }}
            className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition-colors ${
              activeTab === 'ledger'
                ? 'border-amber-400 bg-amber-400/18 text-amber-100'
                : 'border-white/8 bg-white/4 text-slate-300 hover:bg-white/8'
            }`}
          >
            <History className="h-3.5 w-3.5 text-amber-300" />
            <span>Ledger</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
          {activeTab === 'rewards' && (
            <>
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-amber-200/85">
                  <span>Commander Milestones</span>
                  <span className="font-mono-tabular text-[11px] text-slate-400">
                    {milestones.filter((m) => m.claimed).length}/{milestones.length} Claimed
                  </span>
                </div>

                <div className="mt-2.5 space-y-2.5">
                  {milestones.map((m) => {
                    const pct = Math.min(
                      100,
                      Math.round((m.currentValue / Math.max(1, m.definition.targetValue)) * 100)
                    );
                    const isJustClaimed = recentlyClaimedId === m.definition.id;

                    return (
                      <div
                        key={m.definition.id}
                        className={`rounded-xl border p-3 transition-transform duration-200 ${
                          m.claimable
                            ? 'border-amber-400/65 bg-amber-500/10 shadow-[0_0_20px_rgba(245,180,65,0.12)]'
                            : m.claimed
                            ? 'border-emerald-400/25 bg-emerald-500/6'
                            : 'border-white/10 bg-white/4'
                        } ${isJustClaimed ? 'scale-[1.01]' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="font-display text-sm font-bold text-amber-100">
                              {m.definition.title}
                            </div>
                            <p className="mt-0.5 text-xs text-slate-300">
                              {m.definition.description}
                            </p>
                          </div>

                          <div className="font-mono-tabular flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-[#0b0f18]/80 px-2 py-1 text-[11px] font-bold">
                            {m.definition.rewardCoins > 0 && (
                              <span className="flex items-center gap-1 text-amber-300">
                                <Coins className="h-3 w-3" />+{m.definition.rewardCoins}
                              </span>
                            )}
                            {m.definition.rewardGems > 0 && (
                              <span className="flex items-center gap-1 text-sky-300">
                                <Gem className="h-3 w-3" />+{m.definition.rewardGems}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                              <div
                                style={{ width: `${pct}%` }}
                                className={`h-full transition-all duration-300 ${
                                  m.claimed
                                    ? 'bg-emerald-400'
                                    : m.claimable
                                    ? 'bg-amber-400'
                                    : 'bg-sky-400/75'
                                }`}
                              />
                            </div>
                            <div className="font-mono-tabular mt-1 text-[10px] text-slate-400">
                              {m.currentValue} / {m.definition.targetValue}
                            </div>
                          </div>

                          {m.claimable ? (
                            <button
                              type="button"
                              data-sfx="custom"
                              onClick={() => {
                                setRecentlyClaimedId(m.definition.id);
                                onClaimMilestone(m.definition.id);
                              }}
                              className="fantasy-btn-primary flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold uppercase"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Claim Reward</span>
                            </button>
                          ) : m.claimed ? (
                            <span className="flex min-h-[34px] shrink-0 items-center gap-1 text-xs font-semibold text-emerald-300">
                              <Check className="h-3.5 w-3.5" />
                              <span>Claimed</span>
                            </span>
                          ) : (
                            <span className="shrink-0 text-[11px] font-medium text-slate-400">
                              In Progress
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* First-Time Bonuses Checklist */}
              <div className="border-t border-white/10 pt-3.5">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-200/85">
                  <span>First-Time Victory Bonuses</span>
                  <span className="font-mono-tabular text-[11px] text-slate-400">
                    {firstTimeItems.filter((i) => i.done).length}/{firstTimeItems.length} Earned
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {firstTimeItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-xs ${
                        item.done
                          ? 'border-emerald-400/25 bg-emerald-500/6 text-emerald-200'
                          : 'border-white/8 bg-white/4 text-slate-300'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        {item.done ? (
                          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-300/75" />
                        )}
                        <span className="truncate font-medium">{item.label}</span>
                      </div>
                      <span className="font-mono-tabular shrink-0 text-[10px] font-bold text-amber-300">
                        +{item.coins}c{item.gems > 0 ? ` +${item.gems}g` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'armory' && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'character_set', label: 'Kingdoms' },
                    { id: 'piece_skin', label: 'Piece Skins' },
                    { id: 'board_theme', label: 'Battle Arenas' },
                    { id: 'avatar_crest', label: 'Crests' },
                  ] as Array<{ id: ArmoryFilter; label: string }>
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    data-sfx="tab"
                    onClick={() => {
                      audioManager.playTabSwitch();
                      setArmoryFilter(cat.id);
                    }}
                    className={`min-h-[36px] rounded-xl border px-3 py-1 text-xs font-semibold transition-colors ${
                      armoryFilter === cat.id
                        ? 'border-amber-400 bg-amber-400/18 text-amber-100'
                        : 'border-white/10 bg-white/4 text-slate-300 hover:bg-white/8'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2.5">
                {filteredCatalog.map((item) => {
                  const unlocked = isItemUnlocked(progression.unlockedIds, item.id);
                  const equipped = isEquipped(item);
                  const affordable = canAffordUnlock(progression.wallet, item);
                  const deficit =
                    item.currency === 'coins'
                      ? Math.max(0, item.cost - progression.wallet.coins)
                      : Math.max(0, item.cost - progression.wallet.gems);
                  const justUnlocked = recentlyUnlockedId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-3 transition-transform duration-200 ${
                        equipped
                          ? 'border-amber-400/70 bg-amber-500/10'
                          : unlocked
                          ? 'border-white/15 bg-white/5'
                          : 'border-white/10 bg-[#0b0f18]/75'
                      } ${justUnlocked ? 'scale-[1.01]' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20"
                            style={{
                              background: `linear-gradient(135deg, ${item.swatchColors[0]} 0%, ${item.swatchColors[1]} 100%)`,
                            }}
                          >
                            {!unlocked ? (
                              <Lock className="h-4 w-4 text-slate-950/90" />
                            ) : equipped ? (
                              <Check className="h-4 w-4 text-slate-950" />
                            ) : (
                              <Unlock className="h-4 w-4 text-slate-950/85" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-display text-sm font-bold text-amber-100">
                                {item.name}
                              </span>
                              <span className={`text-[10px] font-bold uppercase ${item.badgeTextClass}`}>
                                {item.subtitle}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs leading-relaxed text-slate-300">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/8 pt-2.5">
                        {unlocked ? (
                          <>
                            <span className="text-[11px] font-medium text-emerald-300">
                              {equipped ? 'Currently Equipped' : 'Unlocked'}
                            </span>
                            {equipped ? (
                              <span className="flex min-h-[36px] items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-400/15 px-3 text-xs font-bold text-amber-200">
                                <Check className="h-3.5 w-3.5" />
                                Equipped
                              </span>
                            ) : (
                              <button
                                type="button"
                                data-sfx="tab"
                                onClick={() => {
                                  audioManager.playTabSwitch();
                                  handleEquip(item);
                                }}
                                className="fantasy-btn-secondary min-h-[36px] rounded-lg px-3.5 text-xs font-semibold uppercase"
                              >
                                Equip
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="font-mono-tabular flex items-center gap-1.5 text-xs font-bold">
                              {item.currency === 'coins' ? (
                                <span className="flex items-center gap-1 text-amber-300">
                                  <Coins className="h-3.5 w-3.5" />
                                  {item.cost} Coins
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-sky-300">
                                  <Gem className="h-3.5 w-3.5" />
                                  {item.cost} Gems
                                </span>
                              )}
                              {!affordable && (
                                <span className="text-[10px] font-medium text-slate-400">
                                  (Need {deficit} more)
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={!affordable}
                              data-sfx="custom"
                              onClick={() => {
                                setRecentlyUnlockedId(item.id);
                                onUnlockItem(item.id);
                              }}
                              className={`min-h-[38px] rounded-lg px-3.5 text-xs font-bold uppercase transition-opacity ${
                                affordable
                                  ? 'fantasy-btn-primary'
                                  : 'cursor-not-allowed border border-white/10 bg-white/5 text-slate-500'
                              }`}
                            >
                              Unlock
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'ledger' && (
            <div className="space-y-2">
              {progression.transactions.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/4 px-3.5 py-4 text-center text-xs text-slate-400">
                  No treasury activity recorded yet. Complete matches to earn Coins and Gems.
                </p>
              ) : (
                progression.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/4 px-3 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-100">{tx.label}</div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="font-mono-tabular flex shrink-0 items-center gap-2 font-bold">
                      {tx.coinsDelta !== 0 && (
                        <span
                          className={
                            tx.coinsDelta > 0 ? 'text-amber-300' : 'text-rose-300'
                          }
                        >
                          {tx.coinsDelta > 0 ? `+${tx.coinsDelta}` : tx.coinsDelta}c
                        </span>
                      )}
                      {tx.gemsDelta !== 0 && (
                        <span
                          className={
                            tx.gemsDelta > 0 ? 'text-sky-300' : 'text-rose-300'
                          }
                        >
                          {tx.gemsDelta > 0 ? `+${tx.gemsDelta}` : tx.gemsDelta}g
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
