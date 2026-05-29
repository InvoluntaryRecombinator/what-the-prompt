"use client";

import { useMemo, useState } from "react";

import FeatureCard from "@/components/FeatureCard";
import PlayerHUD from "@/components/PlayerHUD";
import { cardDefinitions } from "@/features/cards/cardDefinitions";
import type { PlayerRecord } from "@/services/gameService";

type IntermissionScreenProps = {
  players: PlayerRecord[];
  localPlayerId: string;
  nextPrompterName: string;
  isBusy: boolean;
  onPlayCard: (cardId: string, targetPlayerId: string) => void;
  onReady: () => void;
};

export default function IntermissionScreen({
  players,
  localPlayerId,
  nextPrompterName,
  isBusy,
  onPlayCard,
  onReady,
}: IntermissionScreenProps) {
  const localPlayer = players.find(
    (player) => player.player_id === localPlayerId,
  );
  const targets = useMemo(
    () => players.filter((player) => player.player_id !== localPlayerId),
    [localPlayerId, players],
  );
  const inventoryCards = localPlayer?.inventory_cards ?? [];
  const [selectedTargets, setSelectedTargets] = useState<Record<string, string>>(
    {},
  );
  const isLocalReady = Boolean(localPlayer?.is_card_phase_done);
  const readyCount = players.filter(
    (player) => player.is_card_phase_done,
  ).length;

  function getSelectedTarget(cardKey: string): string {
    return selectedTargets[cardKey] ?? targets[0]?.player_id ?? "";
  }

  return (
    <section className="flex flex-col gap-4">
      <PlayerHUD localPlayerId={localPlayerId} players={players} />

      <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-sm uppercase tracking-wider text-cyan-300">
          Intermission
        </p>
        <h2 className="mt-1 text-2xl font-semibold">
          Next Prompter: {nextPrompterName || "Unknown"}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {readyCount}/{players.length} Players Ready
        </p>
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="text-xl font-semibold">Your Cards</h3>

        {inventoryCards.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {inventoryCards.map((cardId, index) => {
              const card = cardDefinitions[cardId];
              const cardKey = `${cardId}-${index}`;

              if (!card) {
                return null;
              }

              return (
                <FeatureCard
                  card={card}
                  isBusy={isBusy}
                  isDisabled={isLocalReady}
                  key={cardKey}
                  onActivate={() => onPlayCard(card.id, getSelectedTarget(cardKey))}
                  onTargetChange={(targetPlayerId) =>
                    setSelectedTargets((currentTargets) => ({
                      ...currentTargets,
                      [cardKey]: targetPlayerId,
                    }))
                  }
                  selectedTargetId={getSelectedTarget(cardKey)}
                  targets={targets}
                />
              );
            })}
          </div>
        ) : null}

        <button
          className="mt-5 rounded border border-zinc-700 px-4 py-2 font-semibold text-zinc-100 hover:border-cyan-400 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-500"
          disabled={isBusy || isLocalReady}
          onClick={onReady}
          type="button"
        >
          {isLocalReady ? "Ready" : "Skip & Ready"}
        </button>
      </div>
    </section>
  );
}
