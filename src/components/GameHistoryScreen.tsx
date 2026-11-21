import React from 'react';
import { ArrowLeft, History, Trophy, Swords } from 'lucide-react';
import { loadGameHistory } from '../profile/history';

interface GameHistoryScreenProps {
  onBack: () => void;
}

export function GameHistoryScreen({ onBack }: GameHistoryScreenProps) {
  const games = loadGameHistory();

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
          <History className="mx-auto mb-2 h-10 w-10 text-amber-300" />
          <h1 className="font-display text-3xl font-bold tracking-wide">
            Game History
          </h1>
          <p className="mt-1 text-sm text-amber-200/60">
            Your previous battles
          </p>
        </div>

        {games.length === 0 ? (
          <div className="rounded-2xl border border-amber-400/20 bg-white/5 p-8 text-center">
            <Swords className="mx-auto mb-3 h-10 w-10 text-amber-300/60" />
            <p className="font-semibold">No battles yet</p>
            <p className="mt-2 text-sm text-amber-200/60">
              Complete your first match to see it here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {games.map((game) => (
              <div
                key={game.id}
                className="rounded-2xl border border-amber-400/20 bg-white/5 p-4"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="h-6 w-6 text-amber-300" />
                  <div>
                    <p className="font-bold capitalize">{game.result}</p>
                    <p className="text-xs text-amber-200/60">
                      {game.mode === 'ai' ? 'AI Match' : 'Local PvP'} · {game.opponent}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className={`font-bold ${game.ratingChange > 0 ? 'text-green-400' : game.ratingChange < 0 ? 'text-red-400' : 'text-amber-200'}`}>
                      {game.ratingChange > 0 ? '+' : ''}{game.ratingChange}
                    </p>
                    <p className="text-xs text-amber-200/50">Rating</p>
                  </div>
                </div>

                <div className="mt-3 flex justify-between border-t border-amber-400/10 pt-3 text-xs text-amber-200/60">
                  <span>Rating after: {game.ratingAfter}</span>
                  <span>{new Date(game.playedAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
