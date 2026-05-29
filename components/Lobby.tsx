"use client";

import type { GameRecord, PlayerRecord } from "@/services/gameService";

type LobbyProps = {
  game: GameRecord;
  players: PlayerRecord[];
  isHost: boolean;
  localPlayerId: string;
  isBusy: boolean;
  onStartGame: () => void;
};

export default function Lobby({
  game,
  players,
  isHost,
  localPlayerId,
  isBusy,
  onStartGame,
}: LobbyProps) {
  return (
    <section className="rounded border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex flex-col gap-2 border-b border-zinc-800 pb-4">
        <h2 className="text-xl font-semibold">Lobby</h2>
        <p className="text-sm text-zinc-400">Game ID: {game.id}</p>
        <p className="text-sm text-zinc-400">
          {players.length}/{game.max_players} players - {game.guessing_time_limit}
          s guesses
        </p>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {players.map((player) => (
          <li
            className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-950 px-3 py-2"
            key={player.id}
          >
            <span>{player.display_name}</span>
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              {player.is_host ? "Host" : null}
              {player.player_id === localPlayerId ? " You" : null}
            </span>
          </li>
        ))}
      </ul>

      {isHost ? (
        <button
          className="mt-4 rounded bg-cyan-400 px-4 py-2 font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          disabled={isBusy || players.length === 0}
          onClick={onStartGame}
          type="button"
        >
          Start Game
        </button>
      ) : (
        <p className="mt-4 text-sm text-zinc-400">
          Waiting for the host to start.
        </p>
      )}
    </section>
  );
}
