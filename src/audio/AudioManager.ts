import type { CharacterSetId, PieceType } from '../types/chess';
import {
  ACTION_PRIORITY,
  PRIORITY_VOLUME,
  getCharacterAudioProfile,
  type ArmorDefenseClass,
  type CharacterAudioProfile,
  type CombatAction,
  type SoundPriority,
  type WeaponClass,
} from './combatAudioProfiles';

interface ActiveVoice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  endTime: number;
  priority: SoundPriority;
  isCombat: boolean;
}

const SWING_MIN_INTERVAL_MS = 60;
const IMPACT_MIN_INTERVAL_MS = 55;
const MOVEMENT_MIN_INTERVAL_MS = 90;
const DEATH_VOCAL_MIN_INTERVAL_MS = 180;

/**
 * Deterministic fast PRNG for coherent, crackle-free buffer synthesis.
 */
function makeRng(seed: number): () => number {
  let s = (seed | 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) / 4294967296) * 2 - 1;
  };
}

/**
 * Soft-saturating peak normalizer that guarantees zero digital clipping.
 */
function normalizeBuffer(data: Float32Array, targetPeak = 0.88) {
  let maxAbs = 0;
  for (let i = 0; i < data.length; i++) {
    const a = Math.abs(data[i]);
    if (a > maxAbs) maxAbs = a;
  }
  if (maxAbs > 0.0001) {
    const scale = targetPeak / maxAbs;
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.tanh(data[i] * scale * 1.15) * 0.92;
    }
  }
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private sfxBus: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private preloadedSet: CharacterSetId | null = null;

  // Cached physically synthesized or decoded Foley AudioBuffers (0 allocation during combat!)
  private foleyCache = new Map<string, AudioBuffer>();
  // Optional external licensed audio asset registry (e.g. '/assets/audio/sword_hit.ogg')
  private externalAssetUrls = new Map<string, string>();
  private loadingAssets = new Set<string>();

  private enabled = true;
  private musicEnabled = true;
  private unlocked = false;

  // Cooldown, anti-repetition & active voice tracking
  private lastPlayed = new Map<string, number>();
  private lastVariation = new Map<string, number>();
  private activeVoices: ActiveVoice[] = [];
  private readonly maxConcurrentVoices = 12;

  // Ambient music state
  private musicGain: GainNode | null = null;
  private droneOscA: OscillatorNode | null = null;
  private droneOscB: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private musicTimerId = 0;
  private musicStep = 0;
  private musicRunning = false;

  private readonly musicNotes = [
    146.83, 220.0, 261.63, 293.66, 261.63, 220.0, 174.61, 196.0,
    146.83, 220.0, 329.63, 293.66, 220.0, 174.61, 164.81, 220.0,
  ];

  /**
   * Optional hook to register real licensed audio files (.ogg/.wav/.mp3) by cue key
   * (e.g., 'death:human:k:0' or 'impact:human:heavySword:shield:hit:0').
   * Falls back safely to procedural physical Foley if not present or still loading.
   */
  public registerExternalAsset(cueKey: string, url: string) {
    this.externalAssetUrls.set(cueKey, url);
    if (this.ctx && this.enabled) {
      this.fetchAndDecodeExternalAsset(this.ctx, cueKey, url);
    }
  }

  private fetchAndDecodeExternalAsset(ctx: AudioContext, cueKey: string, url: string) {
    if (this.loadingAssets.has(cueKey)) return;
    this.loadingAssets.add(cueKey);
    void fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Audio fetch failed');
        return res.arrayBuffer();
      })
      .then((arr) => ctx.decodeAudioData(arr))
      .then((decoded) => {
        this.foleyCache.set(cueKey, decoded);
      })
      .catch(() => {
        // Keep procedural fallback intact on missing/unusable external file
      })
      .finally(() => {
        this.loadingAssets.delete(cueKey);
      });
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (!val) {
      this.stopAllCombatSfx();
      this.stopMusic();
    } else if (this.musicEnabled && this.unlocked && !document.hidden) {
      this.startMusic();
    }
  }

  public setMusicEnabled(val: boolean) {
    this.musicEnabled = val;
    if (!val || !this.enabled) {
      this.stopMusic();
    } else if (this.unlocked && !document.hidden) {
      this.startMusic();
    }
  }

  public unlock(activeSet: CharacterSetId = 'human') {
    this.unlocked = true;
    this.preload(activeSet);
    if (this.enabled && this.musicEnabled && !document.hidden) {
      this.startMusic();
    }
  }

  public preload(activeSet: CharacterSetId = 'human') {
    if (!this.enabled || typeof window === 'undefined') return;
    const ctx = this.getContext();
    if (!ctx) return;
    this.getSfxOutput(ctx);
    this.warmCoreFoleyCache(ctx, activeSet);
    this.preloadedSet = activeSet;
  }

  /**
   * Asynchronously warms Foley + death vocal buffers for a newly selected Kingdom set
   * without stalling UI transitions or active gameplay frames.
   */
  public preloadSetAsync(setId: CharacterSetId) {
    if (!this.enabled || typeof window === 'undefined') return;
    if (this.preloadedSet === setId) return;
    const run = () => {
      if (!this.enabled) return;
      const ctx = this.getContext();
      if (!ctx) return;
      this.warmSetFoleyCache(ctx, setId);
      this.preloadedSet = setId;
    };
    const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(run);
    } else {
      window.setTimeout(run, 16);
    }
  }

  public handleVisibilityChange(hidden: boolean) {
    if (hidden) {
      this.stopAllCombatSfx();
      this.stopMusic();
      if (this.ctx && this.ctx.state === 'running') {
        void this.ctx.suspend().catch(() => {});
      }
    } else {
      if (this.ctx && this.ctx.state === 'suspended' && this.enabled) {
        void this.ctx.resume().catch(() => {});
      }
      if (this.enabled && this.musicEnabled && this.unlocked) {
        this.startMusic();
      }
    }
  }

  /**
   * Immediately halts any currently ringing combat swings, impacts, or death vocals
   * (called on rematch, restart, abort, or character removal).
   */
  public stopAllCombatSfx() {
    this.cancelSpeech();
    const now = this.ctx?.currentTime ?? 0;
    let write = 0;
    for (let i = 0; i < this.activeVoices.length; i++) {
      const v = this.activeVoices[i];
      if (v.isCombat) {
        try {
          v.gain.gain.cancelScheduledValues(now);
          v.gain.gain.setTargetAtTime(0.0001, now, 0.015);
          v.source.stop(now + 0.045);
        } catch {
          // Ignore already-stopped nodes
        }
      } else {
        this.activeVoices[write++] = v;
      }
    }
    this.activeVoices.length = write;
  }

  private cancelSpeech() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      const synth = window.speechSynthesis;
      if (synth && (synth.speaking || synth.pending)) {
        synth.cancel();
      }
    } catch {
      // Ignore WebView speechSynthesis cancel edge cases
    }
  }

  private speakRoyalAnnouncement(
    text: string,
    options: { pitch: number; rate: number; volume: number; requireReadyVoices?: boolean }
  ) {
    if (!this.enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;

      const voices = synth.getVoices ? synth.getVoices() : [];
      if (options.requireReadyVoices && voices.length === 0) {
        return;
      }

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-GB';
      utter.pitch = options.pitch;
      utter.rate = options.rate;
      utter.volume = Math.max(0, Math.min(1, options.volume));

      if (voices.length > 0) {
        const preferred =
          voices.find(
            (v) =>
              /^en[-_](GB|US|AU)/i.test(v.lang) &&
              /male|daniel|arthur|oliver|george|ryan|david|baritone|uk/i.test(v.name)
          ) ??
          voices.find((v) => /^en[-_]GB/i.test(v.lang) && v.localService) ??
          voices.find((v) => /^en/i.test(v.lang) && v.localService) ??
          voices.find((v) => /^en/i.test(v.lang));
        if (preferred) {
          utter.voice = preferred;
          utter.lang = preferred.lang;
        }
      }

      if (synth.speaking || synth.pending) {
        synth.cancel();
        window.setTimeout(() => {
          if (this.enabled) {
            try {
              synth.speak(utter);
            } catch {
              // Ignore blocked speech
            }
          }
        }, 28);
      } else {
        synth.speak(utter);
      }
    } catch {
      // Never block or throw if WebView TTS is unavailable
    }
  }

  private duckLowerVoices(minPriorityToDuck: SoundPriority, duckFactor = 0.25) {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < this.activeVoices.length; i++) {
      const v = this.activeVoices[i];
      if (v.priority >= minPriorityToDuck) {
        try {
          const cur = Math.max(0.001, v.gain.gain.value);
          v.gain.gain.cancelScheduledValues(now);
          v.gain.gain.setTargetAtTime(cur * duckFactor, now, 0.025);
        } catch {
          // Ignore already ending voices
        }
      }
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getSfxOutput(ctx: AudioContext): AudioNode {
    if (!this.sfxBus || this.sfxBus.context !== ctx) {
      this.limiter = ctx.createDynamicsCompressor();
      this.limiter.threshold.setValueAtTime(-11, ctx.currentTime);
      this.limiter.knee.setValueAtTime(9, ctx.currentTime);
      this.limiter.ratio.setValueAtTime(5.0, ctx.currentTime);
      this.limiter.attack.setValueAtTime(0.002, ctx.currentTime);
      this.limiter.release.setValueAtTime(0.12, ctx.currentTime);
      this.limiter.connect(ctx.destination);

      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.setValueAtTime(1.0, ctx.currentTime);
      this.sfxBus.connect(this.limiter);
    }
    return this.sfxBus;
  }

  private warmCoreFoleyCache(ctx: AudioContext, activeSet: CharacterSetId) {
    for (let v = 0; v < 3; v++) {
      this.getOrCreateBuffer(ctx, `ui:click:${v}`, () => this.bakeUiClickBuffer(ctx, false, v));
      this.getOrCreateBuffer(ctx, `ui:select:${v}`, () => this.bakeUiClickBuffer(ctx, true, v));
      this.getOrCreateBuffer(ctx, `move:stone:light:${v}`, () =>
        this.bakeStoneMoveBuffer(ctx, 0.85, v)
      );
      this.getOrCreateBuffer(ctx, `move:stone:medium:${v}`, () =>
        this.bakeStoneMoveBuffer(ctx, 1.0, v)
      );
      this.getOrCreateBuffer(ctx, `move:stone:heavy:${v}`, () =>
        this.bakeStoneMoveBuffer(ctx, 1.25, v)
      );
      this.getOrCreateBuffer(ctx, `hoof:${activeSet}:${v}`, () =>
        this.bakeHoofBuffer(ctx, activeSet, v)
      );
    }
    this.getOrCreateBuffer(ctx, 'stinger:check', () => this.bakeCheckHornBuffer(ctx));
    this.getOrCreateBuffer(ctx, 'stinger:checkmate:victory', () =>
      this.bakeCheckmateHeraldBuffer(ctx, true)
    );
    this.getOrCreateBuffer(ctx, 'stinger:checkmate:defeat', () =>
      this.bakeCheckmateHeraldBuffer(ctx, false)
    );
    this.getOrCreateBuffer(ctx, 'stinger:victory', () =>
      this.bakeGameOverChordBuffer(ctx, true)
    );
    this.getOrCreateBuffer(ctx, 'stinger:defeat', () =>
      this.bakeGameOverChordBuffer(ctx, false)
    );
    this.warmSetFoleyCache(ctx, activeSet);
  }

  private warmSetFoleyCache(ctx: AudioContext, setId: CharacterSetId) {
    const pieces: PieceType[] = ['k', 'q', 'r', 'b', 'n', 'p'];
    for (let pIdx = 0; pIdx < pieces.length; pIdx++) {
      const piece = pieces[pIdx];
      const profile = getCharacterAudioProfile(setId, piece);
      const v = 0; // Pre-bake variation 0 immediately; variations 1-2 cache on first play
      if (profile.usesMagic) {
        this.getOrCreateBuffer(ctx, `magic:charge:${setId}:${v}`, () =>
          this.bakeArcaneStaffBuffer(ctx, 'charge', setId, v)
        );
        this.getOrCreateBuffer(ctx, `magic:release:${setId}:${v}`, () =>
          this.bakeArcaneStaffBuffer(ctx, 'release', setId, v)
        );
        this.getOrCreateBuffer(ctx, `magic:impact:${setId}:${v}`, () =>
          this.bakeArcaneStaffBuffer(ctx, 'impact', setId, v)
        );
      } else {
        this.getOrCreateBuffer(ctx, `swing:${setId}:${profile.weaponClass}:p:${v}`, () =>
          this.bakeWeaponSwingBuffer(ctx, setId, profile.weaponClass, false, v)
        );
        this.getOrCreateBuffer(
          ctx,
          `impact:${setId}:${profile.weaponClass}:heavyArmor:fin:${v}`,
          () => this.bakeWeaponImpactBuffer(ctx, setId, profile.weaponClass, 'heavyArmor', true, v)
        );
      }
      this.getOrCreateBuffer(ctx, `death:${setId}:${piece}:${v}`, () =>
        this.bakeDeathVocalBuffer(ctx, profile, v)
      );
    }
  }

  private getOrCreateBuffer(
    ctx: AudioContext,
    key: string,
    factory: () => AudioBuffer
  ): AudioBuffer {
    const externalUrl = this.externalAssetUrls.get(key);
    if (externalUrl && !this.foleyCache.has(key)) {
      this.fetchAndDecodeExternalAsset(ctx, key, externalUrl);
    }
    const existing = this.foleyCache.get(key);
    if (existing && existing.sampleRate === ctx.sampleRate) {
      return existing;
    }
    const created = factory();
    this.foleyCache.set(key, created);
    return created;
  }

  private playCachedBuffer(
    ctx: AudioContext,
    buffer: AudioBuffer,
    gainLevel: number,
    playbackRate = 1.0,
    priority: SoundPriority = 3,
    isCombat = true,
    delaySec = 0
  ) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const startAt = ctx.currentTime + delaySec;
    if (playbackRate !== 1.0) {
      src.playbackRate.setValueAtTime(playbackRate, startAt);
    }
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainLevel, startAt);
    src.connect(gain);
    gain.connect(this.getSfxOutput(ctx));
    src.start(startAt);

    const voice: ActiveVoice = {
      source: src,
      gain,
      endTime: startAt + buffer.duration / Math.max(0.5, playbackRate) + 0.02,
      priority,
      isCombat,
    };
    this.activeVoices.push(voice);

    src.onended = () => {
      const idx = this.activeVoices.indexOf(voice);
      if (idx !== -1) {
        this.activeVoices.splice(idx, 1);
      }
      try {
        src.disconnect();
        gain.disconnect();
      } catch {
        // Ignore teardown
      }
    };
  }

  private pruneVoices(ctx: AudioContext | null): number {
    if (!ctx) return this.activeVoices.length;
    const now = ctx.currentTime;
    let write = 0;
    for (let i = 0; i < this.activeVoices.length; i++) {
      if (this.activeVoices[i].endTime > now) {
        this.activeVoices[write++] = this.activeVoices[i];
      }
    }
    this.activeVoices.length = write;
    return write;
  }

  private canPlayWithPriority(
    cueKey: string,
    minIntervalMs: number,
    priority: SoundPriority
  ): boolean {
    if (!this.enabled) return false;
    const activeCount = this.pruneVoices(this.ctx);

    // Priority 1 (Checkmate) & Priority 2 (Death Vocal) are never dropped by minor sound caps
    if (activeCount >= this.maxConcurrentVoices && priority >= 4) {
      return false;
    }
    if (activeCount >= this.maxConcurrentVoices + 3 && priority === 3) {
      return false;
    }

    const nowMs = performance.now();
    const prev = this.lastPlayed.get(cueKey);
    if (prev !== undefined && nowMs - prev < minIntervalMs) {
      return false;
    }
    this.lastPlayed.set(cueKey, nowMs);
    return true;
  }

  private pickVariation(key: string): number {
    const prev = this.lastVariation.get(key) ?? -1;
    let next = Math.floor(Math.random() * 3);
    if (next === prev) {
      next = (next + 1 + Math.floor(Math.random() * 2)) % 3;
    }
    this.lastVariation.set(key, next);
    return next;
  }

  /**
   * Centralized physical weapon-based combat audio dispatcher.
   * Uses pre-baked multi-layered acoustic Foley AudioBuffers matched to:
   * - Active character set (Human, Titan, Inferno, Shadow, Celestial)
   * - Attacker's equipped weapon (heavySword, sword, axe, hammer, spear, dagger, glaive, staff, magicStaff, bow, arrow)
   * - Defender's physical defense material (shield, heavyArmor, lightArmor, robes, wood)
   * - Defender's class & set vocal tone on lethal defeat ('deathVocal')
   */
  public playCombatSound(
    characterSet: CharacterSetId,
    characterClass: PieceType,
    action: CombatAction,
    options?: {
      defenderClass?: PieceType;
      targetMaterial?: ArmorDefenseClass;
      weaponOverride?: WeaponClass;
    }
  ) {
    if (!this.enabled) return;
    if (this.preloadedSet !== characterSet) {
      this.preload(characterSet);
    }
    const ctx = this.getContext();
    if (!ctx) return;

    const attacker = getCharacterAudioProfile(characterSet, characterClass);
    const defenderPiece: PieceType = options?.defenderClass ?? characterClass;
    const defender = getCharacterAudioProfile(characterSet, defenderPiece);
    const weapon: WeaponClass = options?.weaponOverride ?? attacker.weaponClass;

    const priority = ACTION_PRIORITY[action];
    const minInterval =
      action === 'deathVocal'
        ? DEATH_VOCAL_MIN_INTERVAL_MS
        : priority <= 3
        ? IMPACT_MIN_INTERVAL_MS
        : action === 'swing' || action === 'swingSecondary'
        ? SWING_MIN_INTERVAL_MS
        : MOVEMENT_MIN_INTERVAL_MS;

    const cueKey =
      action === 'deathVocal'
        ? `${characterSet}:${defenderPiece}:${action}`
        : `${characterSet}:${characterClass}:${weapon}:${action}`;
    if (!this.canPlayWithPriority(cueKey, minInterval, priority)) return;

    const vIdx = this.pickVariation(cueKey);
    const vol = PRIORITY_VOLUME[priority] * attacker.classGain;
    const rateJitter = [0.96, 1.0, 1.05][vIdx];
    const rate = attacker.pitchScale * rateJitter;

    if (action === 'deathVocal') {
      // Slightly duck ongoing lower-priority movement/swing tails so the death vocal reads cleanly
      this.duckLowerVoices(4, 0.38);
    }

    switch (action) {
      case 'swing':
      case 'swingSecondary': {
        const secondary = action === 'swingSecondary';
        const key = `swing:${characterSet}:${weapon}:${secondary ? 's' : 'p'}:${vIdx}`;
        const buf = this.getOrCreateBuffer(ctx, key, () =>
          this.bakeWeaponSwingBuffer(ctx, characterSet, weapon, secondary, vIdx)
        );
        this.playCachedBuffer(ctx, buf, 0.38 * vol, rate, priority, true);
        break;
      }

      case 'weaponImpact':
      case 'finisherImpact': {
        const isFinisher = action === 'finisherImpact';
        const defArmor: ArmorDefenseClass = options?.targetMaterial ?? defender.defenseClass;
        const key = `impact:${characterSet}:${weapon}:${defArmor}:${
          isFinisher ? 'fin' : 'hit'
        }:${vIdx}`;
        const buf = this.getOrCreateBuffer(ctx, key, () =>
          this.bakeWeaponImpactBuffer(ctx, characterSet, weapon, defArmor, isFinisher, vIdx)
        );
        this.playCachedBuffer(ctx, buf, (isFinisher ? 0.62 : 0.48) * vol, rate, priority, true);
        break;
      }

      case 'armorBlock': {
        const blockClass: ArmorDefenseClass =
          options?.targetMaterial ??
          (defender.defenseClass === 'robes' ? 'lightArmor' : defender.defenseClass);
        const key = `block:${characterSet}:${blockClass}:${weapon}:${vIdx}`;
        const buf = this.getOrCreateBuffer(ctx, key, () =>
          this.bakeShieldBlockBuffer(
            ctx,
            characterSet,
            defender.weight,
            vIdx,
            weapon,
            blockClass
          )
        );
        this.playCachedBuffer(ctx, buf, 0.5 * vol, rate, priority, true);
        break;
      }

      case 'magicCharge': {
        if (!attacker.usesMagic) return;
        const key = `magic:charge:${characterSet}:${vIdx}`;
        const buf = this.getOrCreateBuffer(ctx, key, () =>
          this.bakeArcaneStaffBuffer(ctx, 'charge', characterSet, vIdx)
        );
        this.playCachedBuffer(ctx, buf, 0.34 * vol, rate, priority, true);
        break;
      }

      case 'magicRelease': {
        if (!attacker.usesMagic) return;
        const key = `magic:release:${characterSet}:${vIdx}`;
        const buf = this.getOrCreateBuffer(ctx, key, () =>
          this.bakeArcaneStaffBuffer(ctx, 'release', characterSet, vIdx)
        );
        this.playCachedBuffer(ctx, buf, 0.4 * vol, rate, priority, true);
        break;
      }

      case 'magicImpact': {
        if (!attacker.usesMagic) return;
        const key = `magic:impact:${characterSet}:${vIdx}`;
        const buf = this.getOrCreateBuffer(ctx, key, () =>
          this.bakeArcaneStaffBuffer(ctx, 'impact', characterSet, vIdx)
        );
        this.playCachedBuffer(ctx, buf, 0.58 * vol, rate, priority, true);
        break;
      }

      case 'horseMove': {
        if (!attacker.isMounted) return;
        const key = `hoof:${characterSet}:${vIdx}`;
        const buf = this.getOrCreateBuffer(ctx, key, () =>
          this.bakeHoofBuffer(ctx, characterSet, vIdx)
        );
        this.playCachedBuffer(ctx, buf, 0.4 * vol, rateJitter, priority, true);
        break;
      }

      case 'movement': {
        const key = `move:armor:${characterSet}:${attacker.movementTimbre}:${vIdx}`;
        const buf = this.getOrCreateBuffer(ctx, key, () =>
          this.bakeArmorMoveBuffer(ctx, attacker, vIdx)
        );
        this.playCachedBuffer(ctx, buf, 0.34 * vol, rateJitter, priority, true);
        break;
      }

      case 'deathVocal': {
        const defVol = PRIORITY_VOLUME[priority] * defender.classGain;
        const key = `death:${characterSet}:${defenderPiece}:${vIdx}`;
        const buf = this.getOrCreateBuffer(ctx, key, () =>
          this.bakeDeathVocalBuffer(ctx, defender, vIdx)
        );
        this.playCachedBuffer(ctx, buf, 0.56 * defVol, rateJitter, priority, true);
        break;
      }

      case 'defenderReaction': {
        const key = `defend:fall:${characterSet}:${defender.defenseClass}:${vIdx}`;
        const buf = this.getOrCreateBuffer(ctx, key, () =>
          this.bakeBodyFallBuffer(ctx, characterSet, defender.defenseClass, vIdx)
        );
        this.playCachedBuffer(ctx, buf, 0.4 * PRIORITY_VOLUME[priority], 1.0, priority, true);
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Offline Stone-Courtyard Reflection & Acoustic Foley Builders
  // ---------------------------------------------------------------------------

  /**
   * Adds lightweight 5-tap medieval stone courtyard early reflections to an offline buffer.
   * Zero runtime CPU cost during combat!
   */
  private applyCourtyardReflections(
    data: Float32Array,
    sr: number,
    wetLevel = 0.24,
    spreadScale = 1.0
  ) {
    const taps: Array<[number, number]> = [
      [0.013 * spreadScale, 0.48],
      [0.027 * spreadScale, -0.36],
      [0.043 * spreadScale, 0.27],
      [0.067 * spreadScale, -0.19],
      [0.097 * spreadScale, 0.13],
    ];
    const dry = new Float32Array(data);
    for (let tIdx = 0; tIdx < taps.length; tIdx++) {
      const delaySamples = Math.floor(taps[tIdx][0] * sr);
      const tapGain = taps[tIdx][1] * wetLevel;
      if (delaySamples <= 0 || delaySamples >= data.length) continue;
      let lp = 0;
      for (let i = delaySamples; i < data.length; i++) {
        const x = dry[i - delaySamples];
        // Slight stone air absorption on reflections
        lp = lp * 0.48 + x * 0.52;
        data[i] += lp * tapGain;
      }
    }
  }

  private bakeWeaponSwingBuffer(
    ctx: AudioContext,
    setId: CharacterSetId,
    weapon: WeaponClass,
    secondary: boolean,
    vIdx: number
  ): AudioBuffer {
    const sr = ctx.sampleRate;
    const rng = makeRng(
      1009 +
        setId.charCodeAt(0) * 149 +
        weapon.charCodeAt(0) * 97 +
        vIdx * 31 +
        (secondary ? 7 : 0)
    );

    const dur =
      weapon === 'hammer' || weapon === 'axe'
        ? 0.34
        : weapon === 'heavySword'
        ? 0.3
        : weapon === 'glaive'
        ? 0.29
        : weapon === 'dagger'
        ? 0.16
        : weapon === 'arrow'
        ? 0.21
        : weapon === 'bow'
        ? 0.26
        : weapon === 'spear'
        ? 0.2
        : 0.24;

    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    let lpA = 0;
    let bpA = 0;
    let lpB = 0;
    let bpB = 0;
    let xPrev = 0;
    let hpPrev = 0;
    let bowPhase = 0;

    const setPitch =
      setId === 'shadow'
        ? 0.85
        : setId === 'inferno'
        ? 0.9
        : setId === 'celestial'
        ? 1.08
        : setId === 'titan'
        ? 1.06
        : 1.0;

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const p = i / len;
      // Asymmetric physical acceleration curve: quick build -> crisp peak at 45% -> natural air fade
      const env = Math.sin(Math.pow(p, 0.58) * Math.PI) * Math.exp(-Math.max(0, p - 0.55) * 2.2);

      // Dual-band aerodynamic vortex frequencies (NO synthetic sine chimes!)
      let fLow = 210;
      let fEdge = 1350;
      let qLow = 0.42;
      let qEdge = 0.24;
      let edgeMix = 0.45;

      if (weapon === 'heavySword') {
        fLow = (165 + Math.sin(p * Math.PI) * 320) * setPitch;
        fEdge = (950 + Math.sin(p * Math.PI) * 1550) * setPitch;
        qLow = 0.45;
        qEdge = 0.26;
        edgeMix = 0.52;
      } else if (weapon === 'sword') {
        fLow = (240 + Math.sin(p * Math.PI) * 420) * setPitch;
        fEdge = (1280 + Math.sin(p * Math.PI) * 2100) * setPitch;
        qLow = 0.42;
        qEdge = 0.23;
        edgeMix = 0.58;
      } else if (weapon === 'dagger') {
        fLow = (420 + Math.sin(p * Math.PI) * 680) * setPitch;
        fEdge = (2200 + Math.sin(p * Math.PI) * 2800) * setPitch;
        qLow = 0.36;
        qEdge = 0.2;
        edgeMix = 0.72;
      } else if (weapon === 'axe') {
        fLow = (130 + Math.sin(p * Math.PI) * 260) * setPitch;
        fEdge = (620 + Math.sin(p * Math.PI) * 980) * setPitch;
        qLow = 0.48;
        qEdge = 0.32;
        edgeMix = 0.38;
      } else if (weapon === 'hammer') {
        fLow = (96 + Math.sin(p * Math.PI) * 190) * setPitch;
        fEdge = (420 + Math.sin(p * Math.PI) * 580) * setPitch;
        qLow = 0.52;
        qEdge = 0.38;
        edgeMix = 0.26;
      } else if (weapon === 'spear') {
        fLow = (300 + p * 520) * setPitch;
        fEdge = (1450 + p * 2100) * setPitch;
        qLow = 0.38;
        qEdge = 0.22;
        edgeMix = 0.64;
      } else if (weapon === 'glaive') {
        fLow = (185 + Math.sin(p * Math.PI) * 380) * setPitch;
        fEdge = (1120 + Math.sin(p * Math.PI) * 1850) * setPitch;
        qLow = 0.4;
        qEdge = 0.23;
        edgeMix = 0.56;
      } else if (weapon === 'arrow') {
        // High-speed fletching Doppler air zip (2600 -> 1150 Hz)
        fLow = 580 * (1.2 - p * 0.45) * setPitch;
        fEdge = 2500 * (1.15 - p * 0.55) * setPitch;
        qLow = 0.34;
        qEdge = 0.16;
        edgeMix = 0.85;
      } else if (weapon === 'bow') {
        fLow = 280 * setPitch;
        fEdge = (1650 - p * 950) * setPitch;
        qLow = 0.36;
        qEdge = 0.2;
        edgeMix = 0.6;
      } else if (weapon === 'staff' || weapon === 'magicStaff') {
        fLow = (170 + Math.sin(p * Math.PI) * 290) * setPitch;
        fEdge = (760 + Math.sin(p * Math.PI) * 950) * setPitch;
        qLow = 0.46;
        qEdge = 0.3;
        edgeMix = 0.4;
      }

      const noise = rng();
      const cA = Math.min(0.84, 2 * Math.sin((Math.PI * fLow) / sr));
      lpA += cA * bpA;
      bpA += cA * (noise - lpA - qLow * bpA);

      const cB = Math.min(0.84, 2 * Math.sin((Math.PI * fEdge) / sr));
      lpB += cB * bpB;
      bpB += cB * (noise - lpB - qEdge * bpB);

      const diff = noise - xPrev;
      xPrev = noise;
      hpPrev = hpPrev * 0.68 + diff * 0.32;

      // Stage 1: Subtle glove leather grip / cloak fabric draw at swing onset (0-32ms)
      const leatherEnv = Math.exp(-t * 88) * Math.min(1, t / 0.004);
      const leatherShift = (lpA * 0.4 + hpPrev * 0.3) * leatherEnv * 0.42;

      // Weapon-specific physical mechanical accents
      let bowString = 0;
      if (weapon === 'bow') {
        const strEnv = Math.exp(-t * 28);
        const fStr = 165 * (1 + Math.exp(-t * 85) * 0.42);
        bowPhase += fStr / sr;
        const woodKnock = Math.sin(2 * Math.PI * 310 * t) * Math.exp(-t * 52) * 0.32;
        bowString =
          (Math.sin(2 * Math.PI * bowPhase) * 0.6 +
            Math.sin(4 * Math.PI * bowPhase) * 0.35 +
            Math.sin(6 * Math.PI * bowPhase) * 0.16) *
            strEnv *
            0.55 +
          woodKnock;
      }

      // Kingdom set aerodynamic character (all broadband/physical — zero arcade buzz!)
      let setLayer = 0;
      if (setId === 'titan') {
        // High-tension grappling steel wire hiss
        setLayer = hpPrev * Math.sin(Math.pow(p, 0.5) * Math.PI) * 0.24;
      } else if (setId === 'inferno') {
        // Dry heated gust + sparse ember snap
        const ember = Math.abs(noise) > 0.91 ? noise * 0.35 : 0;
        setLayer = (lpA * 0.25 + ember) * env;
      } else if (setId === 'shadow') {
        // Cold hollow wind shear
        setLayer = lpA * 0.3 * env;
      } else if (setId === 'celestial') {
        // Clean crisp high air sheen
        setLayer = bpB * 0.2 * env;
      }

      const whoosh = (bpA * 0.72 + bpB * edgeMix + hpPrev * 0.18) * env;
      data[i] = leatherShift + whoosh + bowString + setLayer;
    }

    this.applyCourtyardReflections(data, sr, 0.18, 0.75);
    normalizeBuffer(data, 0.84);
    return buf;
  }

  private bakeWeaponImpactBuffer(
    ctx: AudioContext,
    setId: CharacterSetId,
    weapon: WeaponClass,
    defense: ArmorDefenseClass,
    isFinisher: boolean,
    vIdx: number
  ): AudioBuffer {
    const sr = ctx.sampleRate;
    const rng = makeRng(
      3037 +
        setId.charCodeAt(0) * 167 +
        weapon.charCodeAt(0) * 131 +
        defense.charCodeAt(0) * 53 +
        (isFinisher ? 19 : 0) +
        vIdx * 17
    );

    const dur = isFinisher ? 0.62 : 0.45;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    const setFreq =
      setId === 'shadow'
        ? 0.87
        : setId === 'inferno'
        ? 0.9
        : setId === 'celestial'
        ? 1.11
        : setId === 'titan'
        ? 1.07
        : 1.0;

    // Inharmonic paired steel/wood/armor modes (paired detuned modes eliminate flat sine tone!)
    const modes: Array<{ freq: number; amp: number; decay: number }> = [];

    if (weapon === 'heavySword') {
      modes.push(
        { freq: (1160 + vIdx * 38) * setFreq, amp: 0.26, decay: 15 },
        { freq: (1182 + vIdx * 38) * setFreq, amp: 0.2, decay: 16 },
        { freq: (2080 + vIdx * 55) * setFreq, amp: 0.18, decay: 22 },
        { freq: 3420 * setFreq, amp: 0.1, decay: 32 }
      );
    } else if (weapon === 'sword') {
      modes.push(
        { freq: (1740 + vIdx * 48) * setFreq, amp: 0.24, decay: 18 },
        { freq: (1769 + vIdx * 48) * setFreq, amp: 0.19, decay: 19 },
        { freq: (2860 + vIdx * 65) * setFreq, amp: 0.17, decay: 26 },
        { freq: 4320 * setFreq, amp: 0.1, decay: 35 }
      );
    } else if (weapon === 'dagger') {
      modes.push(
        { freq: (2840 + vIdx * 85) * setFreq, amp: 0.26, decay: 26 },
        { freq: (2888 + vIdx * 85) * setFreq, amp: 0.2, decay: 28 },
        { freq: 4520 * setFreq, amp: 0.18, decay: 38 }
      );
    } else if (weapon === 'axe') {
      modes.push(
        { freq: (840 + vIdx * 32) * setFreq, amp: 0.24, decay: 22 },
        { freq: (1520 + vIdx * 40) * setFreq, amp: 0.14, decay: 28 },
        { freq: 325 * setFreq, amp: 0.28, decay: 17 }
      );
    } else if (weapon === 'hammer') {
      modes.push(
        { freq: (195 + vIdx * 14) * setFreq, amp: 0.36, decay: 13 },
        { freq: (490 + vIdx * 20) * setFreq, amp: 0.24, decay: 17 },
        { freq: 1120 * setFreq, amp: 0.12, decay: 24 }
      );
    } else if (weapon === 'spear') {
      modes.push(
        { freq: (1480 + vIdx * 45) * setFreq, amp: 0.22, decay: 24 },
        { freq: 2540 * setFreq, amp: 0.16, decay: 32 },
        { freq: 460 * setFreq, amp: 0.2, decay: 21 }
      );
    } else if (weapon === 'glaive') {
      modes.push(
        { freq: (1540 + vIdx * 45) * setFreq, amp: 0.24, decay: 18 },
        { freq: (1564 + vIdx * 45) * setFreq, amp: 0.18, decay: 19 },
        { freq: 2710 * setFreq, amp: 0.16, decay: 26 }
      );
    } else if (weapon === 'bow' || weapon === 'arrow') {
      // Piercing arrow shaft flex + sharp fletch stop
      modes.push(
        { freq: (380 + vIdx * 20) * setFreq, amp: 0.26, decay: 28 },
        { freq: 720 * setFreq, amp: 0.16, decay: 36 },
        { freq: 1620 * setFreq, amp: 0.14, decay: 44 }
      );
    } else if (weapon === 'staff' || weapon === 'magicStaff') {
      modes.push(
        { freq: (285 + vIdx * 18) * setFreq, amp: 0.3, decay: 24 },
        { freq: 620 * setFreq, amp: 0.18, decay: 30 }
      );
    }

    // Target-specific physical material resonance
    if (defense === 'shield') {
      modes.push(
        { freq: (410 + vIdx * 18) * setFreq, amp: 0.32, decay: 14 },
        { freq: (765 + vIdx * 26) * setFreq, amp: 0.24, decay: 18 },
        { freq: 1440 * setFreq, amp: 0.18, decay: 24 }
      );
    } else if (defense === 'heavyArmor') {
      modes.push(
        { freq: (305 + vIdx * 16) * setFreq, amp: 0.34, decay: 15 },
        { freq: (690 + vIdx * 24) * setFreq, amp: 0.24, decay: 20 },
        { freq: 1360 * setFreq, amp: 0.15, decay: 26 }
      );
    } else if (defense === 'lightArmor') {
      modes.push(
        { freq: 185 * setFreq, amp: 0.26, decay: 26 },
        { freq: 390 * setFreq, amp: 0.12, decay: 34 }
      );
    } else if (defense === 'wood') {
      modes.push(
        { freq: (245 + vIdx * 16) * setFreq, amp: 0.36, decay: 27 },
        { freq: 525 * setFreq, amp: 0.22, decay: 35 }
      );
    } else if (defense === 'robes') {
      modes.push({ freq: 148 * setFreq, amp: 0.22, decay: 30 });
    }

    const bodyStartHz =
      weapon === 'hammer'
        ? 145
        : weapon === 'heavySword' || weapon === 'axe'
        ? 175
        : weapon === 'arrow' || weapon === 'bow'
        ? 210
        : 185;
    const bodyEndHz =
      weapon === 'hammer'
        ? 54
        : weapon === 'heavySword' || weapon === 'axe'
        ? 64
        : weapon === 'dagger'
        ? 92
        : 72;

    const metallicScale =
      defense === 'shield'
        ? 1.1
        : defense === 'heavyArmor'
        ? 1.0
        : defense === 'lightArmor'
        ? 0.46
        : defense === 'wood'
        ? 0.44
        : 0.24;

    const hasChainRattle = defense === 'heavyArmor' || defense === 'shield';
    let bodyPhase = 0;
    let lowNoise = 0;
    let midNoise = 0;
    let hiPrev = 0;

    for (let i = 0; i < len; i++) {
      const t = i / sr;

      // 1. Pitch-dropping kinetic body punch (feels like real mass collision, not sine beep!)
      const fBody = bodyEndHz + (bodyStartHz - bodyEndHz) * Math.exp(-t * 95);
      bodyPhase += fBody / sr;
      const thudEnv = Math.exp(-t * (isFinisher ? 11.5 : 16.5)) * Math.min(1, t / 0.0018);
      const thud =
        (Math.sin(2 * Math.PI * bodyPhase) * 0.76 +
          Math.sin(4 * Math.PI * bodyPhase) * 0.24) *
        thudEnv *
        (isFinisher ? 0.98 : 0.78);

      // 2. Broadband physical crunch & material tear
      const n = rng();
      lowNoise = lowNoise * 0.8 + n * 0.2;
      midNoise = midNoise * 0.56 + n * 0.44;
      const hiCrunch = n - hiPrev;
      hiPrev = hiPrev * 0.3 + n * 0.7;

      const snapEnv = Math.exp(-t * (weapon === 'hammer' ? 28 : 58));
      const crunchEnv = Math.exp(-t * (defense === 'robes' ? 24 : 18));
      const materialCrunch =
        hiCrunch * snapEnv * (weapon === 'dagger' || weapon === 'arrow' ? 0.78 : 0.95) +
        (midNoise - lowNoise) * crunchEnv * 0.65 +
        lowNoise *
          Math.exp(-t * 14) *
          (defense === 'robes' || defense === 'lightArmor' || defense === 'wood' ? 0.85 : 0.52);

      // 3. Clustered modal blade & defense resonance
      let modal = 0;
      for (let m = 0; m < modes.length; m++) {
        const mode = modes[m];
        modal +=
          Math.sin(2 * Math.PI * mode.freq * t + m * 0.85) *
          mode.amp *
          Math.exp(-t * mode.decay);
      }

      // 4. Post-contact armor chainmail rattle / wood splintering (25ms..120ms)
      let secondaryFoley = 0;
      if (hasChainRattle && t > 0.024 && t < 0.15) {
        const tc = t - 0.024;
        const pulse = Math.pow(Math.max(0, Math.sin(tc * 115)), 2);
        secondaryFoley =
          hiCrunch * pulse * Math.exp(-tc * 20) * (isFinisher ? 0.34 : 0.22);
      } else if (defense === 'wood' && t > 0.008 && t < 0.09) {
        const tw = t - 0.008;
        const crackle = Math.abs(n) > 0.82 ? n * 0.55 : 0;
        secondaryFoley = crackle * Math.exp(-tw * 28);
      }

      // 5. Subtle Kingdom combat flavor + finisher ground follow-through
      let setFlavor = 0;
      if (setId === 'inferno') {
        const spark = Math.abs(n) > 0.87 && t < 0.14 ? n * 0.45 : 0;
        setFlavor = (lowNoise * 0.25 + spark) * Math.exp(-t * 14);
      } else if (setId === 'shadow') {
        setFlavor = lowNoise * Math.exp(-t * 9.5) * 0.26;
      } else if (setId === 'celestial') {
        setFlavor =
          Math.sin(2 * Math.PI * 1940 * t) * Math.exp(-t * 16) * 0.12;
      }

      let followThrough = 0;
      if (isFinisher && t > 0.028) {
        const t2 = t - 0.028;
        followThrough =
          (Math.sin(2 * Math.PI * (bodyEndHz * 0.88) * t2) * 0.36 + lowNoise * 0.58) *
          Math.exp(-t2 * 13);
      }

      data[i] =
        thud +
        materialCrunch +
        modal * metallicScale +
        secondaryFoley +
        setFlavor +
        followThrough * 0.65;
    }

    this.applyCourtyardReflections(data, sr, isFinisher ? 0.28 : 0.22, isFinisher ? 1.1 : 0.9);
    normalizeBuffer(data, 0.9);
    return buf;
  }

  private bakeShieldBlockBuffer(
    ctx: AudioContext,
    setId: CharacterSetId,
    defenderWeight: number,
    vIdx: number,
    attackerWeapon: WeaponClass = 'sword',
    blockClass: ArmorDefenseClass = 'shield'
  ): AudioBuffer {
    const sr = ctx.sampleRate;
    const rng = makeRng(
      5011 + setId.charCodeAt(0) * 83 + vIdx * 43 + attackerWeapon.charCodeAt(0) * 19
    );
    const dur = 0.42;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    const setPitch = setId === 'shadow' ? 0.89 : setId === 'celestial' ? 1.09 : 1.0;
    const pitch = (1 / Math.max(0.75, defenderWeight)) * [0.96, 1.0, 1.05][vIdx] * setPitch;
    const isShield = blockClass === 'shield';
    const partials = isShield
      ? [
          { f: 395 * pitch, a: 0.38, d: 14 },
          { f: 406 * pitch, a: 0.24, d: 15 },
          { f: 790 * pitch, a: 0.28, d: 17 },
          { f: 1420 * pitch, a: 0.2, d: 23 },
          { f: 2440 * pitch, a: 0.12, d: 31 },
        ]
      : [
          { f: 310 * pitch, a: 0.34, d: 17 },
          { f: 680 * pitch, a: 0.22, d: 23 },
          { f: 1290 * pitch, a: 0.12, d: 31 },
        ];

    let bodyPhase = 0;
    let scrapePrev = 0;
    let lowN = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const fBody = 72 + 125 * Math.exp(-t * 85);
      bodyPhase += fBody / sr;
      const braceThud = Math.sin(2 * Math.PI * bodyPhase) * Math.exp(-t * 21) * 0.58;

      let metallic = 0;
      for (let m = 0; m < partials.length; m++) {
        metallic +=
          Math.sin(2 * Math.PI * partials[m].f * t + m * 0.7) *
          partials[m].a *
          Math.exp(-t * partials[m].d);
      }
      const n = rng();
      lowN = lowN * 0.76 + n * 0.24;
      const hp = n - scrapePrev * 0.84;
      scrapePrev = n;
      const scrapeEnv = Math.exp(-Math.max(0, t - 0.012) * 34) * (t < 0.14 ? 1 : 0.25);
      const scrape = hp * scrapeEnv * (isShield ? 0.44 : 0.28) + lowN * Math.exp(-t * 22) * 0.32;

      data[i] = braceThud + metallic + scrape;
    }

    this.applyCourtyardReflections(data, sr, 0.22, 0.9);
    normalizeBuffer(data, 0.86);
    return buf;
  }

  private bakeArcaneStaffBuffer(
    ctx: AudioContext,
    phase: 'charge' | 'release' | 'impact',
    setId: CharacterSetId,
    vIdx: number
  ): AudioBuffer {
    const sr = ctx.sampleRate;
    const rng = makeRng(7001 + setId.charCodeAt(0) * 61 + phase.charCodeAt(0) * 13 + vIdx);

    const dur = phase === 'charge' ? 0.36 : phase === 'release' ? 0.3 : 0.56;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    const rootFreq =
      setId === 'inferno' ? 132 : setId === 'shadow' ? 108 : setId === 'celestial' ? 196 : 164;

    let lp = 0;
    let bp = 0;
    let bodyPhase = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const p = i / len;
      const n = rng();

      if (phase === 'charge') {
        const env = Math.sin(p * Math.PI) * (0.35 + p * 0.65);
        const fCut = 260 + p * 1650;
        const fc = Math.min(0.8, 2 * Math.sin((Math.PI * fCut) / sr));
        lp += fc * bp;
        bp += fc * (n - lp - 0.24 * bp);
        // Wooden staff ground tap + deep low arcane vortex
        const woodTap = Math.sin(2 * Math.PI * 240 * t) * Math.exp(-t * 24) * 0.3;
        const subSwell =
          (Math.sin(2 * Math.PI * rootFreq * (0.88 + p * 0.26) * t) * 0.26 +
            Math.sin(2 * Math.PI * rootFreq * 1.5 * t) * 0.14) *
          env;
        data[i] = (bp * 0.88 + subSwell) * env + woodTap;
      } else if (phase === 'release') {
        const env = Math.exp(-t * 12) * Math.min(1, t / 0.004);
        const fCut = 2200 * Math.exp(-t * 8.0) + 240;
        const fc = Math.min(0.82, 2 * Math.sin((Math.PI * fCut) / sr));
        lp += fc * bp;
        bp += fc * (n - lp - 0.22 * bp);
        const fDrop = 110 + 180 * Math.exp(-t * 60);
        bodyPhase += fDrop / sr;
        const airSnap = Math.sin(2 * Math.PI * bodyPhase) * Math.exp(-t * 28) * 0.55;
        data[i] = (bp * 0.92 + airSnap) * env;
      } else {
        // Concussive dark-fantasy shockwave + shattering stone/crystal + courtyard tail
        const fDrop = 48 + 135 * Math.exp(-t * 58);
        bodyPhase += fDrop / sr;
        const sub = Math.sin(2 * Math.PI * bodyPhase) * Math.exp(-t * 9.5) * 0.88;
        const crack = (n - lp) * Math.exp(-t * 30) * 0.72;
        lp = lp * 0.68 + n * 0.32;
        const blastWind = lp * Math.exp(-t * 10.0) * 0.78;
        const shatter =
          (Math.sin(2 * Math.PI * (rootFreq * 4.1) * t) * 0.16 +
            Math.sin(2 * Math.PI * (rootFreq * 5.8) * t) * 0.11) *
          Math.exp(-t * 17);
        data[i] = sub + crack + blastWind + shatter;
      }
    }

    this.applyCourtyardReflections(data, sr, phase === 'impact' ? 0.28 : 0.2, 1.0);
    normalizeBuffer(data, 0.88);
    return buf;
  }

  /**
   * Multi-phase human dark-fantasy death cry / gasp / groan.
   * Uses phase-integrated pitch drop, natural vocal-fold jitter, 2-stage moving
   * pharynx/mouth formants, throat aspiration breath, and courtyard reflections.
   */
  private bakeDeathVocalBuffer(
    ctx: AudioContext,
    defender: CharacterAudioProfile,
    vIdx: number
  ): AudioBuffer {
    const sr = ctx.sampleRate;
    const rng = makeRng(
      8821 +
        defender.setId.charCodeAt(0) * 193 +
        defender.pieceType.charCodeAt(0) * 71 +
        vIdx * 37
    );

    const dur =
      defender.pieceType === 'k' || defender.pieceType === 'r'
        ? 0.48
        : defender.pieceType === 'q'
        ? 0.42
        : 0.38;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    const f0Start = defender.vocalBaseHz * [0.97, 1.0, 1.04][vIdx];
    const f0End = f0Start * (defender.pieceType === 'q' ? 0.62 : 0.56);

    const isFemale = defender.pieceType === 'q';
    // Moving 2-stage vowel trajectory ("AAH!" shock opening -> "UHH" collapsed exhale)
    const fStart = isFemale
      ? [
          { f: 780, bw: 95, amp: 0.92 },
          { f: 1540, bw: 130, amp: 0.64 },
          { f: 2780, bw: 190, amp: 0.26 },
        ]
      : defender.vocalTone === 'elderRaspy'
      ? [
          { f: 590, bw: 90, amp: 0.88 },
          { f: 1220, bw: 125, amp: 0.56 },
          { f: 2290, bw: 185, amp: 0.22 },
        ]
      : [
          { f: 640, bw: 85, amp: 0.96 },
          { f: 1310, bw: 120, amp: 0.62 },
          { f: 2420, bw: 180, amp: 0.24 },
        ];

    const fEnd = isFemale
      ? [510, 1140, 2320]
      : defender.vocalTone === 'elderRaspy'
      ? [410, 940, 1980]
      : [430, 990, 2060];

    const y1 = new Float32Array(fStart.length);
    const y2 = new Float32Array(fStart.length);

    let phase = 0;
    let breathLp = 0;
    let breathHp = 0;
    let prevNoise = 0;
    let jitterLp = 0;

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const p = i / len;

      // Fast shocked glottal onset (~12ms), brief peak around 60ms, collapsing breath exhale
      const onset = Math.min(1, t / 0.012);
      const chestEnv = onset * Math.exp(-Math.pow(p, 1.15) * (defender.setId === 'titan' ? 4.2 : 3.4));
      const breathEnv = Math.min(1, t / 0.02) * Math.exp(-p * 2.5);

      const n = rng();
      jitterLp = jitterLp * 0.94 + n * 0.06;

      // Natural vocal tremor + slight shock inflection peak around t=0.04s then downward collapse
      const shockLift = Math.exp(-Math.pow((t - 0.035) / 0.045, 2)) * 0.14;
      const f0 =
        (f0Start * (1 + shockLift) + (f0End - f0Start) * Math.pow(p, 0.76)) *
        (1 + jitterLp * 0.08 + Math.sin(t * 36) * 0.018);
      phase = (phase + Math.max(40, f0) / sr) % 1;

      // Natural asymmetric glottal pulse (richer low-mid chest harmonics without harsh sawtooth buzz)
      const glottal =
        Math.sin(2 * Math.PI * phase) * 0.56 +
        Math.sin(4 * Math.PI * phase) * 0.27 +
        Math.sin(6 * Math.PI * phase) * 0.13 +
        Math.sin(8 * Math.PI * phase) * 0.05;

      // Throat aspiration & gravel rasp
      breathLp = breathLp * 0.64 + n * 0.36;
      breathHp = breathHp * 0.5 + (n - prevNoise) * 0.5;
      prevNoise = n;

      const raspBase =
        defender.setId === 'inferno'
          ? 0.58
          : defender.vocalTone === 'elderRaspy'
          ? 0.52
          : 0.34;
      const voicedShare = Math.max(0.22, 1 - p * 0.68);
      const excitation =
        glottal * chestEnv * voicedShare +
        (n - breathLp * 0.7 + breathHp * 0.25) * breathEnv * (raspBase + p * 0.48);

      let voiced = 0;
      for (let fIdx = 0; fIdx < fStart.length; fIdx++) {
        const fm = fStart[fIdx];
        const fc = fm.f + (fEnd[fIdx] - fm.f) * Math.pow(p, 0.75);
        const r = Math.exp((-Math.PI * fm.bw) / sr);
        const w = (2 * Math.PI * fc) / sr;
        const a1 = -2 * r * Math.cos(w);
        const a2 = r * r;
        const out = excitation - a1 * y1[fIdx] - a2 * y2[fIdx];
        y2[fIdx] = y1[fIdx];
        y1[fIdx] = out;
        voiced += out * fm.amp * 0.082;
      }

      // Initial throat hit consonant burst ("khh/guh") in first 16ms
      const throatBurst =
        t < 0.018 ? (n - breathLp) * Math.sin((t / 0.018) * Math.PI) * 0.22 : 0;

      // Subtle Kingdom acoustic space tail
      const mood =
        defender.setId === 'inferno'
          ? (n - breathLp) * breathEnv * 0.12
          : defender.setId === 'shadow'
          ? breathLp * breathEnv * 0.14
          : 0;

      data[i] = voiced + throatBurst + mood;
    }

    this.applyCourtyardReflections(data, sr, 0.22, 0.85);
    normalizeBuffer(data, 0.86);
    return buf;
  }

  private bakeHoofBuffer(
    ctx: AudioContext,
    setId: CharacterSetId,
    vIdx: number
  ): AudioBuffer {
    const sr = ctx.sampleRate;
    const rng = makeRng(8101 + setId.charCodeAt(0) * 41 + vIdx * 29);
    const dur = 0.26;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    const taps = [0.004, 0.088 + vIdx * 0.008];
    const pitchScale = setId === 'inferno' ? 0.9 : setId === 'celestial' ? 1.07 : 1.0;
    const tapFreqs = [(340 + vIdx * 22) * pitchScale, (295 + vIdx * 18) * pitchScale];

    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const n = rng();
      lp = lp * 0.72 + n * 0.28;
      let sample = 0;

      for (let k = 0; k < taps.length; k++) {
        const dt = t - taps[k];
        if (dt >= 0) {
          const env = Math.exp(-dt * 48);
          const f1 = tapFreqs[k] * (0.75 + 0.45 * Math.exp(-dt * 95));
          const clop =
            (Math.sin(2 * Math.PI * f1 * dt) * 0.52 +
              Math.sin(2 * Math.PI * (f1 * 1.88) * dt) * 0.28) *
            env;
          const stoneGrit = (n * 0.52 + lp * 0.48) * Math.exp(-dt * 36) * 0.58;
          sample += (clop + stoneGrit) * (k === 0 ? 1.0 : 0.82);
        }
      }
      data[i] = sample;
    }

    this.applyCourtyardReflections(data, sr, 0.16, 0.7);
    normalizeBuffer(data, 0.84);
    return buf;
  }

  private bakeArmorMoveBuffer(
    ctx: AudioContext,
    profile: CharacterAudioProfile,
    vIdx: number
  ): AudioBuffer {
    const sr = ctx.sampleRate;
    const rng = makeRng(
      9103 + profile.setId.charCodeAt(0) * 59 + profile.pieceType.charCodeAt(0) * 37 + vIdx * 11
    );
    const dur = 0.22;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    const heavy = profile.movementTimbre === 'heavyPlate' || profile.weight >= 1.15;
    const isTitanGear = profile.movementTimbre === 'titanGear';
    let lp = 0;
    let bodyPhase = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const n = rng();
      lp = lp * (heavy ? 0.84 : 0.55) + n * (heavy ? 0.16 : 0.45);
      const stepEnv = Math.exp(-t * (heavy ? 24 : 34)) * Math.min(1, t / 0.006);
      const fBody = 60 + 85 * Math.exp(-t * 95);
      bodyPhase += fBody / sr;
      const chink = heavy
        ? (Math.sin(2 * Math.PI * (610 + vIdx * 32) * t) * 0.22 +
            Math.sin(2 * Math.PI * 1190 * t) * 0.12) *
          Math.exp(-t * 28)
        : isTitanGear
        ? Math.sin(2 * Math.PI * (1380 + vIdx * 38) * t) * Math.exp(-t * 40) * 0.18
        : 0;
      const thump = heavy ? Math.sin(2 * Math.PI * bodyPhase) * Math.exp(-t * 24) * 0.45 : 0;
      data[i] = (heavy ? lp * 0.64 : (n - lp) * 0.48) * stepEnv + chink + thump;
    }

    this.applyCourtyardReflections(data, sr, 0.15, 0.65);
    normalizeBuffer(data, 0.74);
    return buf;
  }

  private bakeBodyFallBuffer(
    ctx: AudioContext,
    setId: CharacterSetId,
    defense: ArmorDefenseClass,
    vIdx: number
  ): AudioBuffer {
    const sr = ctx.sampleRate;
    const rng = makeRng(9601 + setId.charCodeAt(0) * 31 + defense.charCodeAt(0) * 23 + vIdx);
    const dur = 0.34;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    const hasMetal = defense === 'shield' || defense === 'heavyArmor';
    let lp = 0;
    let bodyPhase = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const n = rng();
      lp = lp * 0.85 + n * 0.15;
      const fDrop = 48 + 76 * Math.exp(-t * 70);
      bodyPhase += fDrop / sr;
      const thud = Math.sin(2 * Math.PI * bodyPhase) * Math.exp(-t * 14.5) * 0.78;
      const grit = lp * Math.exp(-t * 14) * 0.55;
      const clatter =
        hasMetal && t > 0.025
          ? (Math.sin(2 * Math.PI * 485 * (t - 0.025)) * 0.24 +
              Math.sin(2 * Math.PI * 1020 * (t - 0.025)) * 0.14) *
            Math.exp(-(t - 0.025) * 20)
          : 0;
      data[i] = thud + grit + clatter;
    }

    this.applyCourtyardReflections(data, sr, 0.22, 0.85);
    normalizeBuffer(data, 0.82);
    return buf;
  }

  private bakeStoneMoveBuffer(
    ctx: AudioContext,
    weight: number,
    vIdx: number
  ): AudioBuffer {
    const sr = ctx.sampleRate;
    const rng = makeRng(4409 + Math.round(weight * 100) + vIdx * 17);
    const dur = 0.16;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    const clackFreq = (480 / Math.max(0.75, weight)) * [0.96, 1.0, 1.05][vIdx];
    let bodyPhase = 0;
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const n = rng();
      lp = lp * 0.76 + n * 0.24;
      const fDrop = 75 + (95 / Math.max(0.75, weight)) * Math.exp(-t * 85);
      bodyPhase += fDrop / sr;
      const clack =
        (Math.sin(2 * Math.PI * clackFreq * t) * 0.36 +
          Math.sin(2 * Math.PI * (clackFreq * 2.12) * t) * 0.18) *
        Math.exp(-t * 58);
      const thump = Math.sin(2 * Math.PI * bodyPhase) * Math.exp(-t * 28) * 0.68;
      const stoneGrit = (n - lp) * Math.exp(-t * 48) * 0.42;
      data[i] = clack + thump + stoneGrit;
    }

    this.applyCourtyardReflections(data, sr, 0.14, 0.65);
    normalizeBuffer(data, 0.76);
    return buf;
  }

  private bakeUiClickBuffer(ctx: AudioContext, select: boolean, vIdx: number): AudioBuffer {
    const sr = ctx.sampleRate;
    const rng = makeRng(2111 + (select ? 97 : 13) + vIdx);
    const dur = 0.045;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    const f = (select ? 860 : 620) * [0.95, 1.0, 1.06][vIdx];
    let prev = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const n = rng();
      const hp = n - prev * 0.75;
      prev = n;
      const tap = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 145) * 0.5;
      const crisp = hp * Math.exp(-t * 180) * 0.48;
      data[i] = tap + crisp;
    }

    normalizeBuffer(data, 0.6);
    return buf;
  }

  private bakeCheckHornBuffer(ctx: AudioContext): AudioBuffer {
    const sr = ctx.sampleRate;
    const rng = makeRng(6113);
    const dur = 0.62;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    let hornLp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const n = rng();
      const env = Math.min(1, t / 0.035) * Math.exp(-t * 4.4);
      // Warm brass horn harmonic stack + breath turbulence
      const f0 = 146.83 * (0.985 + 0.015 * Math.min(1, t / 0.08));
      const rawBrass =
        Math.sin(2 * Math.PI * f0 * t) * 0.5 +
        Math.sin(4 * Math.PI * f0 * t) * 0.3 +
        Math.sin(6 * Math.PI * f0 * t) * 0.2 +
        Math.sin(8 * Math.PI * f0 * t) * 0.12 +
        Math.sin(10 * Math.PI * f0 * t) * 0.06 +
        n * 0.08;
      hornLp = hornLp * 0.74 + rawBrass * 0.26;
      const bell =
        (Math.sin(2 * Math.PI * 587.33 * t) * 0.18 +
          Math.sin(2 * Math.PI * 1192 * t) * 0.08) *
        Math.exp(-t * 9.5);
      data[i] = hornLp * env + bell;
    }

    this.applyCourtyardReflections(data, sr, 0.28, 1.2);
    normalizeBuffer(data, 0.78);
    return buf;
  }

  private bakeCheckmateHeraldBuffer(ctx: AudioContext, victory: boolean): AudioBuffer {
    const sr = ctx.sampleRate;
    const rng = makeRng(victory ? 7711 : 7719);
    const dur = 1.45;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    // Royal dark-fantasy iron cathedral bell & low brass fifth cadence behind voice
    const bellRoot = victory ? 146.83 : 130.81;
    const fifth = bellRoot * 1.498;
    const octave = bellRoot * 2.0;

    let brassLp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const n = rng();
      const bellEnv = Math.min(1, t / 0.012) * Math.exp(-t * 2.35);
      const bell =
        (Math.sin(2 * Math.PI * bellRoot * t) * 0.48 +
          Math.sin(2 * Math.PI * fifth * t) * 0.26 +
          Math.sin(2 * Math.PI * octave * t) * 0.22 +
          Math.sin(2 * Math.PI * (bellRoot * 2.756) * t) * 0.14) *
        bellEnv;

      // Low brass swell entering at 180ms so the spoken "Checkmate!" stays crisp on beat 1
      let brass = 0;
      if (t >= 0.14) {
        const dt = t - 0.14;
        const swEnv = Math.min(1, dt / 0.14) * Math.exp(-dt * 1.9);
        const fB = victory ? 220.0 : 174.61;
        const raw =
          Math.sin(2 * Math.PI * fB * dt) * 0.45 +
          Math.sin(4 * Math.PI * fB * dt) * 0.28 +
          Math.sin(6 * Math.PI * fB * dt) * 0.16 +
          n * 0.05;
        brassLp = brassLp * 0.78 + raw * 0.22;
        brass = brassLp * swEnv * 0.75;
      }

      data[i] = bell + brass;
    }

    this.applyCourtyardReflections(data, sr, 0.32, 1.35);
    normalizeBuffer(data, 0.8);
    return buf;
  }

  private bakeGameOverChordBuffer(ctx: AudioContext, victory: boolean): AudioBuffer {
    const sr = ctx.sampleRate;
    const rng = makeRng(victory ? 8801 : 8807);
    const dur = 1.25;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    // Somber cinematic brass/bell cadence (D major heroic for victory, D minor solemn for defeat)
    const freqs = victory ? [146.83, 220.0, 293.66, 369.99] : [146.83, 174.61, 220.0, 277.18];
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const n = rng();
      let s = 0;
      for (let k = 0; k < freqs.length; k++) {
        const onset = k * 0.075;
        if (t >= onset) {
          const dt = t - onset;
          const env = Math.min(1, dt / 0.06) * Math.exp(-dt * 2.25);
          const f = freqs[k];
          s +=
            (Math.sin(2 * Math.PI * f * dt) * 0.54 +
              Math.sin(2 * Math.PI * f * 2 * dt) * 0.26 +
              Math.sin(2 * Math.PI * f * 3 * dt) * 0.12 +
              n * 0.03) *
            env;
        }
      }
      lp = lp * 0.6 + s * 0.4;
      data[i] = lp;
    }

    this.applyCourtyardReflections(data, sr, 0.3, 1.25);
    normalizeBuffer(data, 0.8);
    return buf;
  }

  // ---------------------------------------------------------------------------
  // Ambient Music & Non-Combat Board/UI Calls
  // ---------------------------------------------------------------------------

  public startMusic() {
    if (this.musicRunning || !this.enabled || !this.musicEnabled || document.hidden) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.musicRunning = true;
    const now = ctx.currentTime;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 1.8);
    gain.connect(ctx.destination);
    this.musicGain = gain;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, now);
    filter.connect(gain);
    this.droneFilter = filter;

    const oscA = ctx.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.setValueAtTime(73.42, now);
    oscA.connect(filter);
    oscA.start(now);
    this.droneOscA = oscA;

    const oscB = ctx.createOscillator();
    oscB.type = 'triangle';
    oscB.frequency.setValueAtTime(110.0, now);
    const fifthGain = ctx.createGain();
    fifthGain.gain.setValueAtTime(0.35, now);
    oscB.connect(fifthGain);
    fifthGain.connect(filter);
    oscB.start(now);
    this.droneOscB = oscB;

    this.musicTimerId = window.setInterval(() => {
      if (!this.musicRunning || !this.enabled || !this.musicEnabled || document.hidden) return;
      const c = this.ctx;
      const master = this.musicGain;
      if (!c || !master || c.state !== 'running') return;

      const t = c.currentTime;
      const freq = this.musicNotes[this.musicStep % this.musicNotes.length];
      this.musicStep++;

      const pluck = c.createOscillator();
      const pluckGain = c.createGain();
      const pluckFilter = c.createBiquadFilter();
      pluck.type = 'triangle';
      pluck.frequency.setValueAtTime(freq, t);

      pluckFilter.type = 'lowpass';
      pluckFilter.frequency.setValueAtTime(freq * 3.1, t);
      pluckFilter.frequency.exponentialRampToValueAtTime(freq * 1.1, t + 1.3);

      pluckGain.gain.setValueAtTime(0.0001, t);
      pluckGain.gain.linearRampToValueAtTime(0.26, t + 0.04);
      pluckGain.gain.exponentialRampToValueAtTime(0.0008, t + 1.45);

      pluck.connect(pluckFilter);
      pluckFilter.connect(pluckGain);
      pluckGain.connect(master);
      pluck.start(t);
      pluck.stop(t + 1.5);
    }, 1150);
  }

  public stopMusic() {
    this.musicRunning = false;
    if (this.musicTimerId) {
      window.clearInterval(this.musicTimerId);
      this.musicTimerId = 0;
    }
    const ctx = this.ctx;
    if (this.musicGain && ctx) {
      try {
        const now = ctx.currentTime;
        this.musicGain.gain.cancelScheduledValues(now);
        this.musicGain.gain.setValueAtTime(Math.max(0.0001, this.musicGain.gain.value), now);
        this.musicGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      } catch {
        // Ignore teardown edge cases
      }
    }
    const oscA = this.droneOscA;
    const oscB = this.droneOscB;
    this.droneOscA = null;
    this.droneOscB = null;
    this.droneFilter = null;
    this.musicGain = null;

    if (oscA || oscB) {
      window.setTimeout(() => {
        try {
          oscA?.stop();
          oscA?.disconnect();
        } catch {
          // ignore
        }
        try {
          oscB?.stop();
          oscB?.disconnect();
        } catch {
          // ignore
        }
      }, 220);
    }
  }

  public playButtonClick() {
    if (!this.canPlayWithPriority('ui:button', 65, 5)) return;
    if (!this.preloadedSet) this.preload();
    const ctx = this.getContext();
    if (!ctx) return;
    const vIdx = this.pickVariation('ui:click');
    const buf = this.getOrCreateBuffer(ctx, `ui:click:${vIdx}`, () =>
      this.bakeUiClickBuffer(ctx, false, vIdx)
    );
    this.playCachedBuffer(ctx, buf, 0.16, 1.0, 5, false);
  }

  public playSelect() {
    if (!this.canPlayWithPriority('ui:select', 70, 5)) return;
    if (!this.preloadedSet) this.preload();
    const ctx = this.getContext();
    if (!ctx) return;
    const vIdx = this.pickVariation('ui:select');
    const buf = this.getOrCreateBuffer(ctx, `ui:select:${vIdx}`, () =>
      this.bakeUiClickBuffer(ctx, true, vIdx)
    );
    this.playCachedBuffer(ctx, buf, 0.2, 1.0, 5, false);
  }

  /**
   * Non-capture chess piece placement / stride matched to active Kingdom & piece weight.
   */
  public playPieceMove(characterSet: CharacterSetId, pieceType: PieceType) {
    const profile = getCharacterAudioProfile(characterSet, pieceType);
    if (profile.isMounted) {
      this.playCombatSound(characterSet, pieceType, 'horseMove');
      return;
    }
    if (!this.canPlayWithPriority('chess:move', 85, 4)) return;
    if (this.preloadedSet !== characterSet) this.preload(characterSet);
    const ctx = this.getContext();
    if (!ctx) return;

    const bucket = profile.weight >= 1.15 ? 'heavy' : profile.weight <= 0.88 ? 'light' : 'medium';
    const targetWeight = bucket === 'heavy' ? 1.25 : bucket === 'light' ? 0.85 : 1.0;
    const vIdx = this.pickVariation(`move:${bucket}`);
    const buf = this.getOrCreateBuffer(ctx, `move:stone:${bucket}:${vIdx}`, () =>
      this.bakeStoneMoveBuffer(ctx, targetWeight, vIdx)
    );
    this.playCachedBuffer(ctx, buf, 0.3, 1.0, 4, false);
  }

  public playMove() {
    this.playPieceMove('human', 'p');
  }

  public playHorseGallop() {
    this.playCombatSound('human', 'n', 'horseMove');
  }

  /**
   * Restrained dark-fantasy Check alert (never triggers Checkmate voice).
   */
  public playCheckAnnouncement() {
    if (!this.canPlayWithPriority('chess:check', 350, 2)) return;
    if (!this.preloadedSet) this.preload();
    const ctx = this.getContext();
    if (ctx) {
      const extKey = 'voice:check';
      if (this.externalAssetUrls.has(extKey) && this.foleyCache.has(extKey)) {
        const extBuf = this.foleyCache.get(extKey);
        if (extBuf) {
          this.playCachedBuffer(ctx, extBuf, 0.44, 1.0, 2, false);
        }
      } else {
        const buf = this.getOrCreateBuffer(ctx, 'stinger:check', () =>
          this.bakeCheckHornBuffer(ctx)
        );
        this.playCachedBuffer(ctx, buf, 0.28, 1.0, 2, false);
        this.speakRoyalAnnouncement('Check.', {
          pitch: 0.82,
          rate: 0.94,
          volume: 0.66,
          requireReadyVoices: true,
        });
      }
    }
  }

  public playCheck() {
    this.playCheckAnnouncement();
  }

  /**
   * Priority 1 Royal authoritative "Checkmate!" announcement.
   * Must be invoked strictly once per actual checkmate match outcome.
   */
  public playCheckmateAnnouncement(victory: boolean) {
    if (!this.canPlayWithPriority('chess:checkmate', 1200, 1)) return;
    if (!this.preloadedSet) this.preload();
    this.duckLowerVoices(2, 0.22);

    const ctx = this.getContext();
    if (ctx) {
      const extKey = 'voice:checkmate';
      const stingerKey = victory ? 'stinger:checkmate:victory' : 'stinger:checkmate:defeat';
      const stingerBuf = this.getOrCreateBuffer(ctx, stingerKey, () =>
        this.bakeCheckmateHeraldBuffer(ctx, victory)
      );

      if (this.externalAssetUrls.has(extKey) && this.foleyCache.has(extKey)) {
        const voiceBuf = this.foleyCache.get(extKey);
        if (voiceBuf) {
          this.playCachedBuffer(ctx, voiceBuf, 0.72, 1.0, 1, false);
          this.playCachedBuffer(ctx, stingerBuf, 0.26, 1.0, 1, false, 0.08);
          return;
        }
      }

      this.playCachedBuffer(ctx, stingerBuf, 0.34, 1.0, 1, false);
    }

    this.speakRoyalAnnouncement('Checkmate!', {
      pitch: 0.78,
      rate: 0.85,
      volume: 0.92,
    });
  }

  public playGameOver(victory: boolean) {
    if (!this.canPlayWithPriority('chess:gameover', 400, 1)) return;
    if (!this.preloadedSet) this.preload();
    const ctx = this.getContext();
    if (!ctx) return;
    const key = victory ? 'stinger:victory' : 'stinger:defeat';
    const buf = this.getOrCreateBuffer(ctx, key, () =>
      this.bakeGameOverChordBuffer(ctx, victory)
    );
    this.playCachedBuffer(ctx, buf, 0.34, 1.0, 1, false);
  }

  public cleanup() {
    this.stopAllCombatSfx();
    this.stopMusic();
    this.lastPlayed.clear();
    this.lastVariation.clear();
    this.activeVoices.length = 0;
    this.foleyCache.clear();
    this.loadingAssets.clear();
    this.preloadedSet = null;
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.sfxBus = null;
    this.limiter = null;
  }
}

export const audioManager = new AudioManager();
