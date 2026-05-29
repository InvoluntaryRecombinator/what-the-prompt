"use client";

import type { PlayerRecord } from "@/services/gameService";

type PlayerHUDProps = {
  players: PlayerRecord[];
  localPlayerId: string;
};

export default function PlayerHUD({ players, localPlayerId }: PlayerHUDProps) {
  return (
    <section className="overflow-x-auto rounded border border-zinc-800 bg-zinc-900 p-3">
      <div className="flex min-w-full gap-2">
        {players.map((player) => (
          <div
            className="min-w-36 rounded border border-zinc-800 bg-zinc-950 px-3 py-2"
            key={player.id}
          >
            <p className="truncate text-sm font-medium text-zinc-100">
              {player.display_name}
              {player.player_id === localPlayerId ? " (you)" : ""}
            </p>
            <p className="mt-1 text-lg font-semibold text-cyan-300">
              {player.score}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
