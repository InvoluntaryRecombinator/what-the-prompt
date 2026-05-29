"use client";

import type { CardDefinition } from "@/features/cards/cardDefinitions";
import type { PlayerRecord } from "@/services/gameService";

type FeatureCardProps = {
  card: CardDefinition;
  targets: PlayerRecord[];
  selectedTargetId: string;
  isBusy: boolean;
  isDisabled?: boolean;
  onTargetChange: (targetPlayerId: string) => void;
  onActivate: () => void;
};

export default function FeatureCard({
  card,
  targets,
  selectedTargetId,
  isBusy,
  isDisabled = false,
  onTargetChange,
  onActivate,
}: FeatureCardProps) {
  return (
    <article className="rounded border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-cyan-400/40 bg-cyan-400/10 text-xs font-semibold text-cyan-300">
          {card.icon}
        </div>
        <div>
          <h3 className="font-semibold text-zinc-100">{card.name}</h3>
          <p className="mt-1 text-sm text-zinc-400">{card.description}</p>
        </div>
      </div>

      <label className="mt-4 flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-300">Target</span>
        <select
          className="rounded border border-zinc-700 bg-zinc-900 p-2 text-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-500"
          disabled={isBusy || isDisabled || targets.length === 0}
          onChange={(event) => onTargetChange(event.target.value)}
          value={selectedTargetId}
        >
          {targets.map((target) => (
            <option key={target.id} value={target.player_id}>
              {target.display_name} - {target.score}
            </option>
          ))}
        </select>
      </label>

      <button
        className="mt-4 rounded bg-cyan-400 px-4 py-2 font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        disabled={isBusy || isDisabled || !selectedTargetId}
        onClick={onActivate}
        type="button"
      >
        Play Card
      </button>
    </article>
  );
}
