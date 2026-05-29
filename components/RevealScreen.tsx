"use client";

import Image from "next/image";

import type {
  GameRecord,
  GuessRecord,
  PlayerRecord,
} from "@/services/gameService";
import { scoreGuess } from "@/utils/scoringLogic";
import type { WordMatch } from "@/utils/wordUtils";

type RevealScreenProps = {
  game: GameRecord;
  guesses: GuessRecord[];
  players: PlayerRecord[];
  isBusy: boolean;
  localPlayerId: string;
  onReady: () => void;
};

export default function RevealScreen({
  game,
  guesses,
  players,
  isBusy,
  localPlayerId,
  onReady,
}: RevealScreenProps) {
  const localPlayer = players.find(
    (player) => player.player_id === localPlayerId,
  );
  const readyCount = players.filter((player) => player.is_ready).length;
  const isLocalReady = Boolean(localPlayer?.is_ready);

  return (
    <section className="flex flex-col gap-4">
      {game.image_url ? (
        <div className="overflow-hidden rounded border border-zinc-800 bg-zinc-900">
          <Image
            alt="Generated prompt result"
            className="h-auto w-full"
            height={1024}
            priority
            src={game.image_url}
            unoptimized
            width={1024}
          />
        </div>
      ) : null}

      <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-xl font-semibold">Reveal</h2>
        <div className="mt-4 rounded border border-zinc-800 bg-zinc-950 p-3">
          <h3 className="text-sm font-medium text-zinc-400">Original Prompt</h3>
          <p className="mt-2 text-zinc-100">{game.prompt_text}</p>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {guesses.length === 0 ? (
            <p className="text-zinc-400">No guesses were submitted.</p>
          ) : null}

          {guesses.map((guess) => {
            const player = players.find(
              (candidate) => candidate.player_id === guess.player_id,
            );
            const scoredGuess = scoreGuess(game.prompt_text ?? "", guess.raw_guess);

            return (
              <article
                className="rounded border border-zinc-800 bg-zinc-950 p-3"
                key={guess.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">
                    {player?.display_name ?? guess.player_id}
                  </h3>
                  <span className="rounded bg-cyan-400 px-3 py-1 text-sm font-semibold text-zinc-950">
                    {guess.score} points
                  </span>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-zinc-400">
                    Prompt Matches
                  </h4>
                  <WordList
                    fallback={game.prompt_text ?? ""}
                    words={scoredGuess.promptWords}
                  />
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-zinc-400">Guess</h4>
                  <WordList
                    fallback={guess.raw_guess}
                    words={
                      scoredGuess.guessWords.length > 0
                        ? scoredGuess.guessWords
                        : guess.matched_words_json
                    }
                  />
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded border border-zinc-800 bg-zinc-950 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-400">
            {readyCount}/{players.length} Players Ready
          </p>
          <button
            className="rounded bg-cyan-400 px-4 py-2 font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            disabled={isBusy || isLocalReady}
            onClick={onReady}
            type="button"
          >
            {isLocalReady ? "Ready" : "Ready for Next Round"}
          </button>
        </div>
      </div>
    </section>
  );
}

function WordList({ words, fallback }: { words: WordMatch[]; fallback: string }) {
  if (words.length === 0) {
    return <p className="mt-2 text-zinc-300">{fallback}</p>;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {words.map((word, index) => (
        <span
          className={
            word.matched
              ? "rounded bg-emerald-400 px-2 py-1 text-sm font-medium text-zinc-950"
              : "rounded bg-zinc-800 px-2 py-1 text-sm text-zinc-300"
          }
          key={`${word.word}-${index}`}
        >
          {word.word}
        </span>
      ))}
    </div>
  );
}
