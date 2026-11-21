import React from 'react';
import { ArrowLeft, Trophy, Star, Gamepad2, Shield, Swords, History } from 'lucide-react';
import { loadPlayerProfile } from '../profile/profile';

interface ProfileScreenProps {
  onLeaderboard: () => void;
  onHistory: () => void;
  onBack: () => void;
}

export function ProfileScreen({ onBack, onLeaderboard, onHistory }: ProfileScreenProps) {
  const profile = loadPlayerProfile();

  const winRate =
    profile.gamesPlayed > 0
      ? Math.round((profile.wins / profile.gamesPlayed) * 100)
      : 0;

  return (
    <section className="relative bg-[#080c15] px-5 py-6 text-amber-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(180,120,40,0.18),transparent_45%)]" />

      <div className="relative z-10 mx-auto w-full max-w-lg">
        <button
          type="button"
          onClick={onBack}
          className="fantasy-btn-secondary mb-6 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full border-2 border-amber-400/60 bg-amber-950/40 shadow-[0_0_35px_rgba(245,158,11,0.18)]">
            <Shield className="h-12 w-12 text-amber-300" />
          </div>

          <h1 className="font-display text-3xl font-bold tracking-wide text-amber-100">
            {profile.name}
          </h1>

          <p className="mt-1 text-sm text-amber-200/70">
            Level {profile.level} • Kingdom Player
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-amber-400/20 bg-white/5 p-4 text-center">
            <Trophy className="mx-auto mb-2 h-6 w-6 text-amber-300" />
            <p className="text-xs uppercase tracking-wider text-amber-200/60">
              Rating
            </p>
            <p className="mt-1 text-2xl font-bold">{profile.rating}</p>
          </div>

          <div className="rounded-2xl border border-amber-400/20 bg-white/5 p-4 text-center">
            <Star className="mx-auto mb-2 h-6 w-6 text-amber-300" />
            <p className="text-xs uppercase tracking-wider text-amber-200/60">
              Win Rate
            </p>
            <p className="mt-1 text-2xl font-bold">{winRate}%</p>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-400/20 bg-white/5 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-amber-300" />
            <h2 className="font-display text-lg font-bold">Battle Record</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Games Played" value={profile.gamesPlayed} />
            <Stat label="Wins" value={profile.wins} />
            <Stat label="Losses" value={profile.losses} />
            <Stat label="Draws" value={profile.draws} />
          </div>
        </div>

        <button type="button" onClick={onLeaderboard} className="mt-4 w-full rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 font-semibold text-amber-200 transition hover:bg-amber-500/20">Leaderboard</button>
        <button type="button" onClick={onHistory} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 font-semibold text-amber-200 transition hover:bg-amber-500/20"><History className="h-4 w-4" />Game History</button>
        <div className="mt-4 rounded-2xl border border-amber-400/20 bg-white/5 p-5 text-center">
          <Swords className="mx-auto mb-2 h-6 w-6 text-amber-300" />
          <p className="text-sm text-amber-200/70">
            More achievements and kingdom progression are coming soon.
          </p>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-black/20 p-3 text-center">
      <p className="text-xs text-amber-200/60">{label}</p>
      <p className="mt-1 text-xl font-bold text-amber-100">{value}</p>
    </div>
  );
}
