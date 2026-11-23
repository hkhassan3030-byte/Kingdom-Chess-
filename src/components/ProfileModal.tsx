import { useMemo, useState } from 'react';
import {
  ChevronRight,
  Coins,
  Crown,
  Flame,
  Gem,
  History,
  Lock,
  Pencil,
  Shield,
  Sparkles,
  Swords,
  TrendingUp,
  Trophy,
  X,
} from 'lucide-react';
import type { MatchHistoryEntry, PlayerProfile } from '../types/chess';
import type { CurrencyWallet } from '../types/progression';
import { audioManager } from '../audio/AudioManager';
import { isAvatarUnlocked } from '../engine/unlockables';
import { deriveOfflineProfileStats } from '../utils/profileStats';

interface ProfileModalProps {
  profile: PlayerProfile;
  wallet?: CurrencyWallet;
  unlockedIds?: readonly string[];
  onUpdateProfile: (next: PlayerProfile) => void;
  onOpenLeaderboard?: () => void;
  onOpenGameHistory?: () => void;
  onClose: () => void;
}

const AVATAR_OPTIONS: Array<{
  id: PlayerProfile['avatarId'];
  label: string;
  Icon: typeof Crown;
}> = [
  { id: 'crown', label: 'Sovereign', Icon: Crown },
  { id: 'knight', label: 'Champion', Icon: Trophy },
  { id: 'sword', label: 'Warlord', Icon: Swords },
  { id: 'shield', label: 'Warden', Icon: Shield },
  { id: 'flame', label: 'Phoenix', Icon: Flame },
  { id: 'astral', label: 'Astral', Icon: Sparkles },
];

export function renderProfileAvatarIcon(avatarId: PlayerProfile['avatarId'], className = 'h-5 w-5') {
  const entry = AVATAR_OPTIONS.find((opt) => opt.id === avatarId) ?? AVATAR_OPTIONS[0];
  const Icon = entry.Icon;
  return <Icon className={className} />;
}

function formatResultLabel(match: MatchHistoryEntry): { label: string; colorClass: string } {
  if (match.result === 'draw') {
    return { label: 'Draw', colorClass: 'text-slate-300' };
  }
  if (match.mode === 'pvp') {
    return {
      label: match.winner === 'b' ? 'Black Won' : 'White Won',
      colorClass: 'text-amber-300',
    };
  }
  if (match.result === 'win') {
    return { label: 'Victory', colorClass: 'text-emerald-300' };
  }
  return { label: 'Defeat', colorClass: 'text-rose-300' };
}

function formatReasonLabel(reason: MatchHistoryEntry['reason']): string {
  switch (reason) {
    case 'checkmate':
      return 'Checkmate';
    case 'stalemate':
      return 'Stalemate';
    case 'repetition':
      return 'Repetition';
    case 'insufficient':
      return 'Insufficient Material';
    case 'fifty-move':
      return '50-Move Rule';
    case 'timeout':
      return 'Timeout';
    case 'resignation':
      return 'Resignation';
    default:
      return 'Completed';
  }
}

export function ProfileModal({
  profile,
  wallet,
  unlockedIds,
  onUpdateProfile,
  onOpenLeaderboard,
  onOpenGameHistory,
  onClose,
}: ProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name);
  const [avatarDraft, setAvatarDraft] = useState<PlayerProfile['avatarId']>(profile.avatarId);

  const stats = useMemo(() => deriveOfflineProfileStats(profile), [profile]);
  const { totalMatches, winRate } = stats;
  const recentMatches = profile.recentMatches ?? [];

  const ratingChartData = useMemo(() => {
    const rh = stats.ratingHistory;
    if (rh.points.length < 2) return null;
    const series = [rh.startRating, ...rh.points.map((p) => p.rating)];
    const minVal = Math.min(...series);
    const maxVal = Math.max(...series);
    const span = Math.max(10, maxVal - minVal);
    const width = 240;
    const height = 40;
    const padX = 4;
    const padY = 5;
    const coords = series.map((val, idx) => {
      const x = padX + (idx / Math.max(1, series.length - 1)) * (width - padX * 2);
      const y =
        maxVal === minVal
          ? height / 2
          : height - padY - ((val - minVal) / span) * (height - padY * 2);
      return { x, y };
    });
    return {
      width,
      height,
      polylinePoints: coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' '),
      last: coords[coords.length - 1],
    };
  }, [stats.ratingHistory]);

  const handleEnterEdit = () => {
    setNameDraft(profile.name);
    setAvatarDraft(profile.avatarId);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setNameDraft(profile.name);
    setAvatarDraft(profile.avatarId);
    setIsEditing(false);
  };

  const handleSave = () => {
    const trimmed = nameDraft.trim().slice(0, 18) || 'Commander';
    onUpdateProfile({
      ...profile,
      name: trimmed,
      avatarId: avatarDraft,
    });
    setIsEditing(false);
  };

  const activeAvatar = isEditing ? avatarDraft : profile.avatarId;
  const activeName = isEditing ? nameDraft.trim() || 'Commander' : profile.name;

  return (
    <div className="animate-modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/75 sm:items-center sm:p-4">
      <div className="fantasy-panel animate-sheet-panel max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl p-5 sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-amber-400/20 pb-3">
          <h2 className="font-display text-lg font-bold tracking-wider text-amber-100">
            COMMANDER PROFILE
          </h2>
          <button
            type="button"
            data-sfx="custom"
            onClick={onClose}
            aria-label="Close Profile"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          {/* Crest & Summary */}
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-400/45 bg-gradient-to-b from-amber-500/20 to-amber-900/25 text-amber-200 shadow-[inset_0_1px_0_rgba(255,229,168,0.2)]">
                {renderProfileAvatarIcon(activeAvatar, 'h-7 w-7')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display truncate text-base font-bold text-amber-100">
                  {activeName}
                </div>
                <div className="font-mono-tabular mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-300">
                  <span>Level {profile.level}</span>
                  <span aria-hidden="true" className="text-amber-400/50">·</span>
                  <span>Rating {profile.rating}</span>
                  <span aria-hidden="true" className="text-amber-400/50">·</span>
                  <span>{winRate}% WR</span>
                </div>
              </div>
            </div>

            {!isEditing && (
              <button
                type="button"
                onClick={handleEnterEdit}
                className="fantasy-btn-secondary flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-amber-400/35 px-3 py-1.5 text-xs font-semibold text-amber-100"
              >
                <Pencil className="h-3.5 w-3.5 text-amber-300" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          {/* Editing Controls (hidden in normal viewing mode) */}
          {isEditing && (
            <div className="space-y-4 border-b border-white/10 pb-4">
              <div>
                <label htmlFor="profile-name-input" className="block text-xs font-semibold text-slate-300">
                  Commander Name
                </label>
                <input
                  id="profile-name-input"
                  type="text"
                  maxLength={18}
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="Commander"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0b0f18]/80 px-3.5 text-sm font-medium text-amber-50 outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-300">Royal Crest</span>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {AVATAR_OPTIONS.map(({ id, label, Icon }) => {
                    const selected = avatarDraft === id;
                    const unlocked = unlockedIds ? isAvatarUnlocked(unlockedIds, id) : true;
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={!unlocked}
                        data-sfx="tab"
                        onClick={() => {
                          if (!unlocked) return;
                          audioManager.playTabSwitch();
                          setAvatarDraft(id);
                        }}
                        className={`flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-1.5 text-[11px] font-medium transition-colors ${
                          !unlocked
                            ? 'cursor-not-allowed border-white/6 bg-white/3 text-slate-500'
                            : selected
                            ? 'border-amber-400 bg-amber-400/18 text-amber-100'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {unlocked ? (
                          <Icon className="h-4 w-4 text-amber-300" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-slate-500" />
                        )}
                        <span className="truncate">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Royal Treasury Wallet Summary */}
          {wallet && (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between rounded-xl border border-amber-400/25 bg-amber-500/8 px-3 py-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-200">
                  <Coins className="h-4 w-4 text-amber-300" />
                  Coins
                </span>
                <span className="font-mono-tabular text-sm font-bold text-amber-100">
                  {wallet.coins.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-sky-400/25 bg-sky-500/8 px-3 py-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-sky-200">
                  <Gem className="h-4 w-4 text-sky-300" />
                  Gems
                </span>
                <span className="font-mono-tabular text-sm font-bold text-sky-100">
                  {wallet.gems.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Local Record */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Battle Record</span>
              <span className="font-mono-tabular text-xs font-semibold text-amber-200">
                {winRate}% Win Rate
              </span>
            </div>
            <dl className="font-mono-tabular mt-2 grid grid-cols-4 gap-2 text-center">
              <div className="rounded-xl border border-white/10 bg-white/4 py-2.5">
                <dt className="text-[10px] text-slate-400 uppercase">Played</dt>
                <dd className="mt-0.5 text-sm font-bold text-slate-100">{totalMatches}</dd>
              </div>
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/8 py-2.5">
                <dt className="text-[10px] text-emerald-300/80 uppercase">Wins</dt>
                <dd className="mt-0.5 text-sm font-bold text-emerald-300">{profile.wins}</dd>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/4 py-2.5">
                <dt className="text-[10px] text-slate-400 uppercase">Draws</dt>
                <dd className="mt-0.5 text-sm font-bold text-slate-200">{profile.draws}</dd>
              </div>
              <div className="rounded-xl border border-rose-400/20 bg-rose-500/8 py-2.5">
                <dt className="text-[10px] text-rose-300/80 uppercase">Losses</dt>
                <dd className="mt-0.5 text-sm font-bold text-rose-300">{profile.losses}</dd>
              </div>
            </dl>

            {/* Proportional W / D / L Bar */}
            {totalMatches > 0 && (
              <div
                aria-label={`Win ${Math.round(stats.winPct)}%, Draw ${Math.round(stats.drawPct)}%, Loss ${Math.round(stats.lossPct)}%`}
                className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-white/8"
              >
                {stats.winPct > 0 && (
                  <div
                    style={{ width: `${stats.winPct}%` }}
                    className="h-full bg-emerald-400/85"
                  />
                )}
                {stats.drawPct > 0 && (
                  <div
                    style={{ width: `${stats.drawPct}%` }}
                    className="h-full bg-slate-400/70"
                  />
                )}
                {stats.lossPct > 0 && (
                  <div
                    style={{ width: `${stats.lossPct}%` }}
                    className="h-full bg-rose-400/85"
                  />
                )}
              </div>
            )}
          </div>

          {/* Offline Streaks & Rating Progression */}
          <div className="space-y-2.5 border-t border-white/10 pt-3">
            {/* Streaks */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/10 bg-white/4 px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  <Flame className="h-3.5 w-3.5 text-amber-300" />
                  <span>Current Streak</span>
                </div>
                <div className="font-mono-tabular mt-1 text-sm font-bold">
                  {stats.currentStreak === null ? (
                    <span className="text-slate-400">—</span>
                  ) : stats.currentStreak.type === 'win' ? (
                    <span className="text-emerald-300">
                      {stats.currentStreak.count}
                      {stats.currentStreak.capped ? '+' : ''} Win
                      {stats.currentStreak.count === 1 ? '' : 's'}
                    </span>
                  ) : stats.currentStreak.type === 'loss' ? (
                    <span className="text-rose-300">
                      {stats.currentStreak.count}
                      {stats.currentStreak.capped ? '+' : ''} Loss
                      {stats.currentStreak.count === 1 ? '' : 'es'}
                    </span>
                  ) : (
                    <span className="text-slate-300">None</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/4 px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  <Trophy className="h-3.5 w-3.5 text-amber-300" />
                  <span>
                    {stats.bestWinStreak?.scopedToRecent
                      ? `Best (Last ${stats.recordedAiMatchesCount})`
                      : 'Best Win Streak'}
                  </span>
                </div>
                <div className="font-mono-tabular mt-1 text-sm font-bold">
                  {stats.bestWinStreak === null ? (
                    <span className="text-slate-400">—</span>
                  ) : stats.bestWinStreak.count > 0 ? (
                    <span className="text-amber-200">
                      {stats.bestWinStreak.count}
                      {stats.bestWinStreak.capped ? '+' : ''} Win
                      {stats.bestWinStreak.count === 1 ? '' : 's'}
                    </span>
                  ) : (
                    <span className="text-slate-300">0 Wins</span>
                  )}
                </div>
              </div>
            </div>

            {/* Rating Progression */}
            <div className="rounded-xl border border-white/10 bg-white/4 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  <TrendingUp className="h-3.5 w-3.5 text-amber-300" />
                  <span>
                    Rating Progression
                    {stats.ratingHistory.scopedToRecent
                      ? ` (Last ${stats.recordedAiMatchesCount} AI)`
                      : ''}
                  </span>
                </div>
                <div className="font-mono-tabular flex items-center gap-1.5 text-xs font-bold">
                  <span className="text-amber-100">{profile.rating}</span>
                  {stats.ratingHistory.points.length > 0 && (
                    <span
                      className={
                        stats.ratingHistory.netDelta > 0
                          ? 'text-emerald-300'
                          : stats.ratingHistory.netDelta < 0
                          ? 'text-rose-300'
                          : 'text-slate-400'
                      }
                    >
                      ({stats.ratingHistory.netDelta > 0 ? '+' : ''}
                      {stats.ratingHistory.netDelta})
                    </span>
                  )}
                </div>
              </div>

              {stats.ratingHistory.points.length === 0 ? (
                <p className="mt-1.5 text-[11px] text-slate-400">
                  {stats.hasUnrecordedHistoryOnly
                    ? 'New AI matches will record rating progression here.'
                    : 'Play an AI match to track rating progression.'}
                </p>
              ) : stats.ratingHistory.points.length === 1 ? (
                <div className="font-mono-tabular mt-1.5 flex items-center justify-between text-[11px] text-slate-300">
                  <span>
                    {stats.ratingHistory.startRating} → {stats.ratingHistory.currentRating}
                  </span>
                  <span className="text-slate-400">1 recorded AI match</span>
                </div>
              ) : (
                ratingChartData && (
                  <div className="mt-2">
                    <svg
                      viewBox={`0 0 ${ratingChartData.width} ${ratingChartData.height}`}
                      className="h-10 w-full overflow-visible"
                      role="img"
                      aria-label={`Rating progression from ${stats.ratingHistory.startRating} to ${stats.ratingHistory.currentRating}`}
                    >
                      <polyline
                        fill="none"
                        stroke="#f5c451"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={ratingChartData.polylinePoints}
                      />
                      <circle
                        cx={ratingChartData.last.x}
                        cy={ratingChartData.last.y}
                        r="3.2"
                        fill="#fde68a"
                        stroke="#0b0f18"
                        strokeWidth="1.2"
                      />
                    </svg>
                    <div className="font-mono-tabular mt-1 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Start {stats.ratingHistory.startRating}</span>
                      <span>
                        Range {stats.ratingHistory.minRating}–{stats.ratingHistory.maxRating}
                      </span>
                      <span>Now {stats.ratingHistory.currentRating}</span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Recent Matches */}
          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Recent Matches</span>
              {recentMatches.length > 0 && (
                <span className="font-mono-tabular text-[11px] text-slate-400">
                  Last {Math.min(recentMatches.length, 3)}
                </span>
              )}
            </div>
            {recentMatches.length === 0 ? (
              <p className="mt-2 rounded-xl border border-white/10 bg-white/4 px-3 py-2.5 text-xs text-slate-400">
                Complete a match to record your battlefield history.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {recentMatches.slice(0, 3).map((match) => {
                  const outcome = formatResultLabel(match);
                  return (
                    <li
                      key={match.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-100">
                          {match.opponent}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatReasonLabel(match.reason)} · {match.moveCount} moves
                        </div>
                      </div>
                      <div className="font-mono-tabular shrink-0 text-right">
                        <div className={`font-bold ${outcome.colorClass}`}>{outcome.label}</div>
                        {match.ratingDelta !== 0 && (
                          <div className="text-[11px] text-slate-400">
                            {match.ratingDelta > 0 ? `+${match.ratingDelta}` : match.ratingDelta}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Navigation Actions (UI Ready for Repository Integration) */}
          <div className="space-y-2.5 border-t border-white/10 pt-3.5">
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="fantasy-btn-secondary group flex min-h-[54px] w-full items-center justify-between gap-3 rounded-xl border border-amber-400/35 px-3.5 py-2.5 text-left"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/40 bg-gradient-to-b from-amber-500/20 to-amber-900/25 text-amber-300 shadow-[inset_0_1px_0_rgba(255,229,168,0.2)]">
                  <Trophy className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-display truncate text-sm font-bold tracking-wide text-amber-100">
                    Leaderboard
                  </div>
                  <div className="truncate text-[11px] text-slate-400">
                    Kingdom standings &amp; top commanders
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-amber-300/80 transition-transform duration-150 group-hover:translate-x-0.5" />
            </button>

            <button
              type="button"
              onClick={onOpenGameHistory}
              className="fantasy-btn-secondary group flex min-h-[54px] w-full items-center justify-between gap-3 rounded-xl border border-amber-400/35 px-3.5 py-2.5 text-left"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/40 bg-gradient-to-b from-amber-500/20 to-amber-900/25 text-amber-300 shadow-[inset_0_1px_0_rgba(255,229,168,0.2)]">
                  <History className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-display truncate text-sm font-bold tracking-wide text-amber-100">
                    Game History
                  </div>
                  <div className="truncate text-[11px] text-slate-400">
                    Recent battles &amp; match outcomes
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-amber-300/80 transition-transform duration-150 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        <div className="mt-5 flex gap-2.5">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="fantasy-btn-secondary min-h-[48px] flex-1 rounded-xl text-xs font-semibold uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="fantasy-btn-primary min-h-[48px] flex-1 rounded-xl text-xs font-bold uppercase"
              >
                Save Profile
              </button>
            </>
          ) : (
            <button
              type="button"
              data-sfx="custom"
              onClick={onClose}
              className="fantasy-btn-secondary min-h-[48px] w-full rounded-xl text-xs font-semibold uppercase"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
