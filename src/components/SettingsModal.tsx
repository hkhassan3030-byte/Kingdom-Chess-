import { useEffect, useState } from 'react';
import { Music, Volume2, VolumeX, X } from 'lucide-react';
import { audioManager } from '../audio/AudioManager';
import { CHARACTER_SETS, CHARACTER_SET_ORDER } from '../three/characterSets';
import { getBuildVersionInfo, getInstalledAppVersionInfo } from '../utils/appVersion';
import {
  AI_DIFFICULTY_ORDER,
  AI_PROFILES,
  TIME_CONTROLS,
  type GameMode,
  type GameSettings,
  type GraphicsQuality,
  type PieceColor,
} from '../types/chess';

interface SettingsModalProps {
  settings: GameSettings;
  inGame: boolean;
  onApplyAndStart: (next: GameSettings) => void;
  onUpdateLiveSettings: (next: GameSettings) => void;
  onClose: () => void;
}

export function SettingsModal({
  settings,
  inGame,
  onApplyAndStart,
  onUpdateLiveSettings,
  onClose,
}: SettingsModalProps) {
  const [draft, setDraft] = useState<GameSettings>({ ...settings });
  const [versionInfo, setVersionInfo] = useState(() => getBuildVersionInfo());

  useEffect(() => {
    let active = true;
    void getInstalledAppVersionInfo().then((info) => {
      if (active) setVersionInfo(info);
    });
    return () => {
      active = false;
    };
  }, []);

  // Apply live audio preview immediately when adjusting Mute All, Music Volume, or SFX Volume
  useEffect(() => {
    audioManager.applyAudioSettings({
      musicVolume: draft.musicVolume,
      sfxVolume: draft.sfxVolume,
      muteAll: draft.muteAll,
    });
  }, [draft.musicVolume, draft.sfxVolume, draft.muteAll]);

  const matchChanged =
    inGame &&
    (draft.mode !== settings.mode ||
      draft.difficulty !== settings.difficulty ||
      draft.playerColor !== settings.playerColor ||
      draft.timeControlSeconds !== settings.timeControlSeconds);

  const handleCancel = () => {
    // Restore previously saved audio settings if user cancels
    audioManager.applyAudioSettings({
      musicVolume: settings.musicVolume,
      sfxVolume: settings.sfxVolume,
      muteAll: settings.muteAll,
    });
    onClose();
  };

  const handleSave = () => {
    const finalized: GameSettings = {
      ...draft,
      soundEnabled: !draft.muteAll && draft.sfxVolume > 0,
      musicEnabled: !draft.muteAll && draft.musicVolume > 0,
    };
    if (matchChanged) {
      onApplyAndStart(finalized);
    } else {
      onUpdateLiveSettings(finalized);
    }
    onClose();
  };

  const handleToggleMuteAll = () => {
    const nextMute = !draft.muteAll;
    setDraft((d) => ({ ...d, muteAll: nextMute }));
    if (!nextMute) {
      audioManager.applyAudioSettings({
        musicVolume: draft.musicVolume,
        sfxVolume: draft.sfxVolume,
        muteAll: false,
      });
      audioManager.playTabSwitch();
    }
  };

  return (
    <div className="animate-modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/75 sm:items-center sm:p-4">
      <div className="fantasy-panel animate-sheet-panel max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl p-5 sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-amber-400/20 pb-3">
          <h2 className="font-display text-lg font-bold tracking-wider text-amber-100">
            {inGame ? 'BATTLEFIELD SETTINGS' : 'GAME SETTINGS'}
          </h2>
          <button
            type="button"
            data-sfx="custom"
            onClick={handleCancel}
            aria-label="Close Settings"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:text-white active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          {inGame && (
            <>
              {/* Game Mode */}
              <div>
                <label className="block text-xs font-semibold text-slate-300">Game Mode</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'ai', label: 'Player vs AI' },
                      { id: 'pvp', label: '1 vs 1 (Local)' },
                    ] as Array<{ id: GameMode; label: string }>
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      data-sfx="tab"
                      onClick={() => {
                        audioManager.playTabSwitch();
                        setDraft((d) => ({ ...d, mode: opt.id }));
                      }}
                      className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                        draft.mode === opt.id
                          ? 'border-amber-400 bg-amber-400/18 text-amber-100'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {draft.mode === 'ai' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300">
                      AI Difficulty
                    </label>
                    <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {AI_DIFFICULTY_ORDER.map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          data-sfx="tab"
                          onClick={() => {
                            audioManager.playTabSwitch();
                            setDraft((d) => ({ ...d, difficulty: diff }));
                          }}
                          className={`min-h-[44px] rounded-xl border px-2.5 py-2 text-xs font-semibold transition-colors ${
                            draft.difficulty === diff
                              ? 'border-amber-400 bg-amber-400/18 text-amber-100'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {AI_PROFILES[diff].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300">
                      Your Kingdom
                    </label>
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                      {(
                        [
                          { id: 'w', label: 'White Kingdom' },
                          { id: 'b', label: 'Black Kingdom' },
                        ] as Array<{ id: PieceColor; label: string }>
                      ).map((side) => (
                        <button
                          key={side.id}
                          type="button"
                          data-sfx="tab"
                          onClick={() => {
                            audioManager.playTabSwitch();
                            setDraft((d) => ({ ...d, playerColor: side.id }));
                          }}
                          className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                            draft.playerColor === side.id
                              ? 'border-amber-400 bg-amber-400/18 text-amber-100'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {side.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Chess Timer */}
              <div>
                <label className="block text-xs font-semibold text-slate-300">Chess Timer</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {TIME_CONTROLS.map((t) => (
                    <button
                      key={t.seconds}
                      type="button"
                      data-sfx="tab"
                      onClick={() => {
                        audioManager.playTabSwitch();
                        setDraft((d) => ({ ...d, timeControlSeconds: t.seconds }));
                      }}
                      className={`min-h-[44px] rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                        draft.timeControlSeconds === t.seconds
                          ? 'border-amber-400 bg-amber-400/18 text-amber-100'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Hero Character Set Selector (live-switchable) */}
          <div className={inGame ? 'border-t border-white/10 pt-3' : ''}>
            <label className="block text-xs font-semibold text-slate-300">
              Kingdom Character Set
            </label>
            <div className="mt-1.5 grid grid-cols-1 gap-1.5">
              {CHARACTER_SET_ORDER.map((setId) => {
                const cfg = CHARACTER_SETS[setId];
                const active = draft.characterSet === setId;
                return (
                  <button
                    key={setId}
                    type="button"
                    data-sfx="custom"
                    onClick={() => {
                      audioManager.playKingdomSelect(setId);
                      setDraft((d) => ({ ...d, characterSet: setId }));
                    }}
                    className={`flex min-h-[44px] items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                      active
                        ? 'border-amber-400 bg-amber-400/18 text-amber-100'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="font-semibold">{cfg.name}</span>
                    <span className={`text-[11px] font-medium ${cfg.badgeTextClass}`}>
                      {cfg.combat.styleLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audio Controls: Music Volume, SFX Volume, Mute All */}
          <div className="space-y-2.5 border-t border-white/10 pt-3">
            <div className="flex min-h-[50px] items-center justify-between rounded-xl border border-white/10 bg-white/4 px-3.5 py-2">
              <div className="flex items-center gap-2.5">
                {draft.muteAll ? (
                  <VolumeX className="h-4 w-4 text-rose-300" />
                ) : (
                  <Volume2 className="h-4 w-4 text-amber-300" />
                )}
                <div>
                  <span className="block text-xs font-medium text-slate-200 sm:text-sm">
                    Mute All Audio
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    Immediately silences both music and sound effects
                  </span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draft.muteAll}
                aria-label="Mute All Audio"
                data-sfx="custom"
                onClick={handleToggleMuteAll}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
                  draft.muteAll
                    ? 'border-rose-400/70 bg-rose-500/80'
                    : 'border-white/20 bg-white/12'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-amber-50 shadow transition-transform ${
                    draft.muteAll ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Music Volume Slider (0-100%) */}
            <div
              className={`rounded-xl border border-white/10 bg-white/4 px-3.5 py-2.5 transition-opacity ${
                draft.muteAll ? 'opacity-55' : 'opacity-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <label
                  htmlFor="music-volume-slider"
                  className="flex items-center gap-2 text-xs font-medium text-slate-200 sm:text-sm"
                >
                  <Music className="h-4 w-4 text-amber-300" />
                  <span>Music Volume</span>
                </label>
                <span className="font-mono-tabular text-xs font-semibold text-amber-200">
                  {draft.musicVolume}%
                </span>
              </div>
              <input
                id="music-volume-slider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={draft.musicVolume}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, musicVolume: Number(e.target.value) }))
                }
                style={{
                  background: `linear-gradient(to right, #e5b85c 0%, #e5b85c ${draft.musicVolume}%, rgba(255,255,255,0.14) ${draft.musicVolume}%, rgba(255,255,255,0.14) 100%)`,
                }}
                className="fantasy-slider mt-2.5 w-full"
              />
            </div>

            {/* SFX Volume Slider (0-100%) */}
            <div
              className={`rounded-xl border border-white/10 bg-white/4 px-3.5 py-2.5 transition-opacity ${
                draft.muteAll ? 'opacity-55' : 'opacity-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <label
                  htmlFor="sfx-volume-slider"
                  className="flex items-center gap-2 text-xs font-medium text-slate-200 sm:text-sm"
                >
                  <Volume2 className="h-4 w-4 text-amber-300" />
                  <span>SFX Volume</span>
                </label>
                <span className="font-mono-tabular text-xs font-semibold text-amber-200">
                  {draft.sfxVolume}%
                </span>
              </div>
              <input
                id="sfx-volume-slider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={draft.sfxVolume}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, sfxVolume: Number(e.target.value) }))
                }
                onPointerUp={() => {
                  if (!draft.muteAll && draft.sfxVolume > 0) {
                    audioManager.playSelect();
                  }
                }}
                onKeyUp={() => {
                  if (!draft.muteAll && draft.sfxVolume > 0) {
                    audioManager.playSelect();
                  }
                }}
                style={{
                  background: `linear-gradient(to right, #e5b85c 0%, #e5b85c ${draft.sfxVolume}%, rgba(255,255,255,0.14) ${draft.sfxVolume}%, rgba(255,255,255,0.14) 100%)`,
                }}
                className="fantasy-slider mt-2.5 w-full"
              />
            </div>

            {/* Board & Graphics Preferences */}
            <label className="flex min-h-[48px] cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/4 px-3.5 py-2">
              <span className="text-xs font-medium text-slate-200 sm:text-sm">
                Board Coordinates (A–H, 1–8)
              </span>
              <input
                type="checkbox"
                checked={draft.showCoordinates}
                onChange={(e) => {
                  audioManager.playTabSwitch();
                  setDraft((d) => ({ ...d, showCoordinates: e.target.checked }));
                }}
                className="h-4 w-4 accent-amber-400"
              />
            </label>

            {(!inGame || draft.mode === 'pvp') && (
              <label className="flex min-h-[48px] cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/4 px-3.5 py-2">
                <span className="text-xs font-medium text-slate-200 sm:text-sm">
                  Auto-Flip Side in 1 vs 1
                </span>
                <input
                  type="checkbox"
                  checked={draft.autoFlipPvP}
                  onChange={(e) => {
                    audioManager.playTabSwitch();
                    setDraft((d) => ({ ...d, autoFlipPvP: e.target.checked }));
                  }}
                  className="h-4 w-4 accent-amber-400"
                />
              </label>
            )}

            <div className="flex min-h-[50px] items-center justify-between rounded-xl border border-white/10 bg-white/4 px-3.5 py-2">
              <div>
                <span className="block text-xs font-medium text-slate-200 sm:text-sm">
                  3D Graphics Quality
                </span>
                <span className="block text-[11px] text-slate-400">
                  Balanced optimizes performance on Android
                </span>
              </div>
              <div className="flex gap-1">
                {(['balanced', 'high'] as GraphicsQuality[]).map((q) => (
                  <button
                    key={q}
                    type="button"
                    data-sfx="tab"
                    onClick={() => {
                      audioManager.playTabSwitch();
                      setDraft((d) => ({ ...d, quality: q }));
                    }}
                    className={`min-h-[36px] rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                      draft.quality === q
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-white/8 text-slate-300'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* About / Installed Version */}
          <div className="border-t border-white/10 pt-3">
            <div className="rounded-xl border border-amber-400/20 bg-white/4 px-3.5 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-display text-xs font-bold tracking-wider text-amber-100 uppercase">
                    {versionInfo.appName}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    Version {versionInfo.versionName} (Build {versionInfo.versionCode})
                  </div>
                </div>
                <span className="font-mono-tabular text-[10px] text-slate-500">
                  {versionInfo.packageId}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            data-sfx="custom"
            onClick={handleCancel}
            className="fantasy-btn-secondary min-h-[48px] flex-1 rounded-xl text-xs font-semibold uppercase"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="fantasy-btn-primary min-h-[48px] flex-1 rounded-xl text-xs font-bold uppercase"
          >
            {matchChanged ? 'Start New Match' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
