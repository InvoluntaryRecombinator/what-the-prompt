"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

import type { GameRecord, GuessRecord } from "@/services/gameService";
import { countWords } from "@/utils/wordUtils";

type GuessingScreenProps = {
  game: GameRecord;
  guesses: GuessRecord[];
  isHost: boolean;
  isPrompter: boolean;
  hasSubmittedGuess: boolean;
  guesserCount: number;
  isBusy: boolean;
  onSubmitGuess: (rawGuess: string) => void;
  onReveal: () => void;
};

export default function GuessingScreen({
  game,
  guesses,
  isHost,
  isPrompter,
  hasSubmittedGuess,
  guesserCount,
  isBusy,
  onSubmitGuess,
  onReveal,
}: GuessingScreenProps) {
  const [rawGuess, setRawGuess] = useState("");
  const guessWordCount = countWords(rawGuess);
  const targetWordCount = game.prompt_word_count ?? 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmitGuess(rawGuess);
  }

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
        <div className="rounded border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300">
          Original prompt word count: {game.prompt_word_count ?? 0}
        </div>
        <p className="mt-3 text-sm text-zinc-400">
          Guesses submitted: {guesses.length}/{guesserCount}
        </p>

        {isPrompter ? (
          <p className="mt-4 text-zinc-400">
            You wrote the prompt. Waiting for guesses.
          </p>
        ) : hasSubmittedGuess ? (
          <p className="mt-4 text-zinc-400">Guess submitted. Waiting for reveal.</p>
        ) : (
          <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-300">Guess</span>
              <textarea
                className="min-h-28 rounded border border-zinc-700 bg-zinc-950 p-3 text-zinc-100 outline-none focus:border-cyan-400"
                maxLength={400}
                onChange={(event) => setRawGuess(event.target.value)}
                placeholder="type the prompt you think made this image"
                required
                value={rawGuess}
              />
            </label>
            <div className="flex flex-col gap-1 rounded border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
              <span>Characters: {rawGuess.length} / 400</span>
              <span>
                Words: {guessWordCount} / {targetWordCount}
              </span>
            </div>
            <button
              className="rounded bg-cyan-400 px-4 py-2 font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              disabled={isBusy || !rawGuess.trim()}
              type="submit"
            >
              Submit Guess
            </button>
          </form>
        )}

        {isHost ? (
          <button
            className="mt-4 rounded border border-zinc-700 px-4 py-2 font-semibold text-zinc-100 hover:border-cyan-400 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-500"
            disabled={isBusy}
            onClick={onReveal}
            type="button"
          >
            Reveal
          </button>
        ) : null}
      </div>
    </section>
  );
}
