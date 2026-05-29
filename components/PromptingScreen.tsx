"use client";

import { FormEvent, useMemo, useState } from "react";

import type { GameRecord } from "@/services/gameService";
import { countWords } from "@/utils/wordUtils";

type PromptingScreenProps = {
  game: GameRecord;
  isPrompter: boolean;
  prompterName: string;
  isBusy: boolean;
  onSubmitPrompt: (promptText: string) => void;
};

export default function PromptingScreen({
  game,
  isPrompter,
  prompterName,
  isBusy,
  onSubmitPrompt,
}: PromptingScreenProps) {
  const [promptText, setPromptText] = useState("");
  const wordCount = useMemo(() => countWords(promptText), [promptText]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmitPrompt(promptText);
  }

  if (!isPrompter) {
    return (
      <section className="rounded border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-xl font-semibold">Prompting</h2>
        <p className="mt-2 text-zinc-400">
          Waiting for {prompterName || "the prompter"} to write the image prompt.
        </p>
      </section>
    );
  }

  return (
    <form
      className="flex flex-col gap-4 rounded border border-zinc-800 bg-zinc-900 p-4"
      onSubmit={handleSubmit}
    >
      <div>
        <h2 className="text-xl font-semibold">Your Prompt</h2>
        <p className="mt-1 text-sm text-zinc-400">Round {game.current_round + 1}</p>
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-300">Prompt</span>
        <textarea
          className="min-h-32 rounded border border-zinc-700 bg-zinc-950 p-3 text-zinc-100 outline-none focus:border-cyan-400"
          maxLength={400}
          onChange={(event) => setPromptText(event.target.value)}
          placeholder="a glass castle floating over a neon swamp"
          required
          value={promptText}
        />
      </label>
      <div className="flex items-center justify-between gap-3 text-sm text-zinc-400">
        <span>{promptText.length}/400 characters</span>
        <span>{wordCount} words</span>
      </div>
      <button
        className="rounded bg-cyan-400 px-4 py-2 font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        disabled={isBusy || !promptText.trim()}
        type="submit"
      >
        Generate Image
      </button>
    </form>
  );
}
