"use client";

import { FormEvent, useEffect, useState } from "react";

import GeneratingScreen from "@/components/GeneratingScreen";
import GuessingScreen from "@/components/GuessingScreen";
import IntermissionScreen from "@/components/IntermissionScreen";
import Lobby from "@/components/Lobby";
import PlayerHUD from "@/components/PlayerHUD";
import PromptingScreen from "@/components/PromptingScreen";
import RevealScreen from "@/components/RevealScreen";
import {
  advancePhase,
  createGame,
  joinGame,
  playCard,
  pollGameState,
  submitGuess,
  submitPrompt,
  toggleCardReady,
  toggleReady,
  type GameState,
} from "@/services/gameService";

const PLAYER_ID_KEY = "what-the-prompt.playerId";
const DISPLAY_NAME_KEY = "what-the-prompt.displayName";
const GAME_ID_KEY = "what-the-prompt.gameId";

const NAME_ADJECTIVES = ["Neon", "Velvet", "Cosmic", "Static", "Golden"];
const NAME_NOUNS = ["Painter", "Wizard", "Comet", "Pixel", "Oracle"];

export default function Game() {
  const [localPlayerId, setLocalPlayerId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gameId, setGameId] = useState("");
  const [joinGameId, setJoinGameId] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [guessingTimeLimit, setGuessingTimeLimit] = useState(60);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    window.setTimeout(() => {
      if (cancelled) {
        return;
      }

      const identity = getOrCreateLocalIdentity();
      const savedGameId = window.localStorage.getItem(GAME_ID_KEY) ?? "";
      const gameIdFromUrl = new URLSearchParams(window.location.search).get(
        "gameId",
      );
      const initialGameId = gameIdFromUrl || savedGameId;

      setLocalPlayerId(identity.playerId);
      setDisplayName(identity.displayName);

      if (initialGameId) {
        setGameId(initialGameId);
        setJoinGameId(initialGameId);
      }
    }, 0);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!gameId || !localPlayerId || !displayName) {
      return;
    }

    let cancelled = false;

    async function loadGameState() {
      try {
        const nextState = await pollGameState(gameId);
        const localPlayerInGame = nextState.players.some(
          (player) => player.player_id === localPlayerId,
        );
        const joinedState = localPlayerInGame
          ? nextState
          : await joinGame({
              gameId,
              playerId: localPlayerId,
              displayName,
            });

        if (!cancelled) {
          setGameState(joinedState);
          setError("");
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(getErrorMessage(caughtError));
        }
      }
    }

    loadGameState();
    const intervalId = window.setInterval(loadGameState, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [displayName, gameId, localPlayerId]);

  const isPrompter = gameState?.game.current_prompter_id === localPlayerId;
  const currentPrompterName =
    gameState?.players.find(
      (player) => player.player_id === gameState.game.current_prompter_id,
    )?.display_name ?? "";
  const hasSubmittedGuess =
    gameState?.guesses.some((guess) => guess.player_id === localPlayerId) ?? false;
  const guesserCount =
    gameState?.players.filter(
      (player) => player.player_id !== gameState.game.current_prompter_id,
    ).length ?? 0;
  const nextPrompterName = gameState
    ? getPrompterNameForRound(gameState, gameState.game.current_round + 1)
    : "";

  async function handleCreateGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async () => {
      const nextState = await createGame({
        hostPlayerId: localPlayerId,
        displayName,
        maxPlayers,
        guessingTimeLimit,
      });
      rememberGame(nextState.game.id);
      setGameState(nextState);
    });
  }

  async function handleJoinGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async () => {
      const nextState = await joinGame({
        gameId: joinGameId,
        playerId: localPlayerId,
        displayName,
      });
      rememberGame(nextState.game.id);
      setGameState(nextState);
    });
  }

  async function handleAdvancePhase() {
    if (!gameState) {
      return;
    }

    await runAction(async () => {
      setGameState(
        await advancePhase({
          gameId: gameState.game.id,
          playerId: localPlayerId,
        }),
      );
    });
  }

  async function handleSubmitPrompt(promptText: string) {
    if (!gameState) {
      return;
    }

    await runAction(async () => {
      setGameState(
        await submitPrompt({
          gameId: gameState.game.id,
          playerId: localPlayerId,
          promptText,
        }),
      );
    });
  }

  async function handleSubmitGuess(rawGuess: string) {
    if (!gameState) {
      return;
    }

    await runAction(async () => {
      setGameState(
        await submitGuess({
          gameId: gameState.game.id,
          playerId: localPlayerId,
          rawGuess,
        }),
      );
    });
  }

  async function handleToggleReady() {
    if (!gameState) {
      return;
    }

    await runAction(async () => {
      setGameState(
        await toggleReady({
          gameId: gameState.game.id,
          playerId: localPlayerId,
        }),
      );
    });
  }

  async function handleToggleCardReady() {
    if (!gameState) {
      return;
    }

    await runAction(async () => {
      setGameState(
        await toggleCardReady({
          gameId: gameState.game.id,
          playerId: localPlayerId,
        }),
      );
    });
  }

  async function handlePlayCard(cardId: string, targetPlayerId: string) {
    if (!gameState) {
      return;
    }

    await runAction(async () => {
      await playCard({
        gameId: gameState.game.id,
        playerId: localPlayerId,
        cardId,
        targetPlayerId,
      });
      setGameState(
        await toggleCardReady({
          gameId: gameState.game.id,
          playerId: localPlayerId,
        }),
      );
    });
  }

  async function runAction(action: () => Promise<void>) {
    setIsBusy(true);
    setError("");

    try {
      await action();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsBusy(false);
    }
  }

  function rememberGame(nextGameId: string) {
    window.localStorage.setItem(GAME_ID_KEY, nextGameId);
    window.history.replaceState(null, "", `/?gameId=${nextGameId}`);
    setGameId(nextGameId);
    setJoinGameId(nextGameId);
  }

  function leaveLocalGame() {
    window.localStorage.removeItem(GAME_ID_KEY);
    window.history.replaceState(null, "", "/");
    setGameId("");
    setJoinGameId("");
    setGameState(null);
    setError("");
  }

  function renderGameContent() {
    if (!gameState) {
      return (
        <section className="grid gap-4 md:grid-cols-2">
          <form
            className="flex flex-col gap-4 rounded border border-zinc-800 bg-zinc-900 p-4"
            onSubmit={handleCreateGame}
          >
            <h2 className="text-xl font-semibold">Create Game</h2>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-zinc-300">Max Players</span>
              <input
                className="rounded border border-zinc-700 bg-zinc-950 p-2 text-zinc-100"
                max={8}
                min={2}
                onChange={(event) => setMaxPlayers(Number(event.target.value))}
                type="number"
                value={maxPlayers}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-zinc-300">Guessing Timer</span>
              <select
                className="rounded border border-zinc-700 bg-zinc-950 p-2 text-zinc-100"
                onChange={(event) =>
                  setGuessingTimeLimit(Number(event.target.value))
                }
                value={guessingTimeLimit}
              >
                <option value={30}>30 seconds</option>
                <option value={45}>45 seconds</option>
                <option value={60}>60 seconds</option>
                <option value={90}>90 seconds</option>
              </select>
            </label>
            <button
              className="rounded bg-cyan-400 px-4 py-2 font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              disabled={isBusy || !localPlayerId}
              type="submit"
            >
              Create
            </button>
          </form>

          <form
            className="flex flex-col gap-4 rounded border border-zinc-800 bg-zinc-900 p-4"
            onSubmit={handleJoinGame}
          >
            <h2 className="text-xl font-semibold">Join Game</h2>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-zinc-300">Game ID</span>
              <input
                className="rounded border border-zinc-700 bg-zinc-950 p-2 text-zinc-100"
                onChange={(event) => setJoinGameId(event.target.value)}
                placeholder="paste a game UUID"
                required
                value={joinGameId}
              />
            </label>
            <button
              className="rounded bg-cyan-400 px-4 py-2 font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              disabled={isBusy || !joinGameId.trim() || !localPlayerId}
              type="submit"
            >
              Join
            </button>
          </form>
        </section>
      );
    }

    if (gameState.game.status === "lobby") {
      return (
        <Lobby
          game={gameState.game}
          isBusy={isBusy}
          isHost={gameState.game.host_player_id === localPlayerId}
          localPlayerId={localPlayerId}
          onStartGame={handleAdvancePhase}
          players={gameState.players}
        />
      );
    }

    if (gameState.game.status === "prompting") {
      return (
        <PromptingScreen
          game={gameState.game}
          isBusy={isBusy}
          isPrompter={Boolean(isPrompter)}
          onSubmitPrompt={handleSubmitPrompt}
          prompterName={currentPrompterName}
        />
      );
    }

    if (gameState.game.status === "generating") {
      return <GeneratingScreen />;
    }

    if (gameState.game.status === "guessing") {
      return (
        <GuessingScreen
          game={gameState.game}
          guesses={gameState.guesses}
          guesserCount={guesserCount}
          hasSubmittedGuess={hasSubmittedGuess}
          isBusy={isBusy}
          isPrompter={Boolean(isPrompter)}
          localPlayerId={localPlayerId}
          onSubmitGuess={handleSubmitGuess}
        />
      );
    }

    if (gameState.game.status === "reveal") {
      return (
        <RevealScreen
          game={gameState.game}
          guesses={gameState.guesses}
          isBusy={isBusy}
          localPlayerId={localPlayerId}
          onReady={handleToggleReady}
          players={gameState.players}
        />
      );
    }

    if (gameState.game.status === "intermission") {
      return (
        <IntermissionScreen
          game={gameState.game}
          isBusy={isBusy}
          localPlayerId={localPlayerId}
          nextPrompterName={nextPrompterName}
          onPlayCard={handlePlayCard}
          onReady={handleToggleCardReady}
          players={gameState.players}
        />
      );
    }

    return (
      <section className="rounded border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-xl font-semibold">Game Over</h2>
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="border-b border-zinc-800 pb-4">
          <p className="text-sm uppercase tracking-wider text-cyan-300">
            What The Prompt
          </p>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Multiplayer Test</h1>
              <p className="mt-1 text-sm text-zinc-400">
                {displayName ? `${displayName} - ${localPlayerId}` : "Loading..."}
              </p>
            </div>
            {gameState ? (
              <button
                className="w-fit rounded border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-cyan-400"
                onClick={leaveLocalGame}
                type="button"
              >
                Leave Local Game
              </button>
            ) : null}
          </div>
        </header>

        {error ? (
          <div className="rounded border border-red-500/50 bg-red-950/40 p-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {gameState &&
        gameState.game.status !== "lobby" &&
        gameState.game.status !== "intermission" ? (
          <PlayerHUD
            localPlayerId={localPlayerId}
            players={gameState.players}
          />
        ) : null}

        {renderGameContent()}
      </div>
    </main>
  );
}

function getOrCreateLocalIdentity() {
  const existingPlayerId = window.localStorage.getItem(PLAYER_ID_KEY);
  const existingDisplayName = window.localStorage.getItem(DISPLAY_NAME_KEY);
  const playerId = existingPlayerId || window.crypto.randomUUID();
  const displayName = existingDisplayName || randomDisplayName();

  window.localStorage.setItem(PLAYER_ID_KEY, playerId);
  window.localStorage.setItem(DISPLAY_NAME_KEY, displayName);

  return { playerId, displayName };
}

function randomDisplayName() {
  const adjective =
    NAME_ADJECTIVES[Math.floor(Math.random() * NAME_ADJECTIVES.length)];
  const noun = NAME_NOUNS[Math.floor(Math.random() * NAME_NOUNS.length)];
  const suffix = Math.floor(100 + Math.random() * 900);

  return `${adjective} ${noun} ${suffix}`;
}

function getPrompterNameForRound(state: GameState, roundNumber: number): string {
  const turnOrder = state.game.turn_order.filter((playerId) =>
    state.players.some((player) => player.player_id === playerId),
  );
  const fallbackTurnOrder = state.players.map((player) => player.player_id);
  const usableTurnOrder = turnOrder.length > 0 ? turnOrder : fallbackTurnOrder;

  if (usableTurnOrder.length === 0) {
    return "";
  }

  const nextPrompterId =
    usableTurnOrder[roundNumber % usableTurnOrder.length] ?? "";

  return (
    state.players.find((player) => player.player_id === nextPrompterId)
      ?.display_name ?? ""
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}
