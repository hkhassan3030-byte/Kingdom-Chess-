import React from 'react';
import { ArrowLeft, Trophy, Crown } from 'lucide-react';
import { loadPlayerProfile } from '../profile/profile';

interface LeaderboardScreenProps {
  onBack: () => void;
}

export function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
  const profile = loadPlayerProfile();

  return (
    <section className="relative min-h-full bg-[#080c15] px-5 py-6 text-amber-100">
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
          <Trophy className="mx-auto mb-2 h-10 w-10 text-amber-300" />
          <h1 className="font-display text-3xl font-bold tracking-wide text-amber-100">
            Leaderboard
          </h1>
          <p className="mt-1 text-sm text-amber-200/60">
            Kingdom rankings
          </p>
        </div>

        <div className="rounded-2xl border border-amber-400/20 bg-white/5 p-5">
          <div className="mb-4 flex items-center gap-3">
            <Crown className="h-6 w-6 text-amber-300" />
            <div>
              <p className="font-display font-bold">{profile.name}</p>
              <p className="text-xs text-amber-200/60">
                Your current rating
              </p>
            </div>
            <div className="ml-auto text-2xl font-bold">
              {profile.rating}
            </div>
          </div>

          <div className="rounded-xl bg-black/20 p-4 text-center">
            <p className="text-sm text-amber-200/60">
              Online rankings will appear here when multiplayer is available.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
