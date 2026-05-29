"use client";

import { supabase } from "@/lib/supabase";
import { cardDefinitions } from "@/features/cards/cardDefinitions";
import { scoreGuess } from "@/utils/scoringLogic";
import { countWords, type WordMatch } from "@/utils/wordUtils";

export type GameStatus =
  | "lobby"
  | "prompting"
  | "generating"
  | "guessing"
  | "reveal"
  | "intermission"
  | "game_over";

export type ActiveModifier = {
  type: string;
  source: string;
  target: string;
};

export type GameRecord = {
  id: string;
  created_at: string;
  status: GameStatus;
  host_player_id: string;
  max_players: number;
  guessing_time_limit: number;
  current_prompter_id: string | null;
  current_round: number;
  phase_end_time: string | null;
  prompt_text: string | null;
  prompt_word_count: number | null;
  image_url: string | null;
  ready_player_ids: string[];
  turn_order: string[];
  active_modifiers: ActiveModifier[];
  card_phase_done_player_ids: string[];
};

export type PlayerRecord = {
  id: string;
  created_at: string;
  game_id: string;
  player_id: string;
  display_name: string;
  score: number;
  is_host: boolean;
  joined_at: string;
  inventory_cards: string[];
};

export type GuessRecord = {
  id: string;
  created_at: string;
  game_id: string;
  round_number: number;
  player_id: string;
  raw_guess: string;
  score: number;
  matched_words_json: WordMatch[];
};

export type GameState = {
  game: GameRecord;
  players: PlayerRecord[];
  guesses: GuessRecord[];
};

type GameRow = Omit<
  GameRecord,
  | "ready_player_ids"
  | "turn_order"
  | "active_modifiers"
  | "card_phase_done_player_ids"
> & {
  ready_player_ids: unknown;
  turn_order: unknown;
  active_modifiers?: unknown;
  card_phase_done_player_ids?: unknown;
};

type PlayerRow = Omit<PlayerRecord, "inventory_cards" | "is_host"> & {
  inventory_cards?: unknown;
  is_host?: unknown;
};

type GuessRow = Omit<GuessRecord, "matched_words_json"> & {
  matched_words_json: unknown;
};

export async function createGame({
  hostPlayerId,
  displayName,
  maxPlayers = 4,
  guessingTimeLimit = 60,
}: {
  hostPlayerId: string;
  displayName: string;
  maxPlayers?: number;
  guessingTimeLimit?: number;
}): Promise<GameState> {
  const { data: game, error: gameError } = await supabase
    .from("games")
    .insert({
      status: "lobby",
      host_player_id: hostPlayerId,
      max_players: maxPlayers,
      guessing_time_limit: guessingTimeLimit,
      current_round: 0,
      ready_player_ids: [],
      turn_order: [hostPlayerId],
      active_modifiers: [],
      card_phase_done_player_ids: [],
    })
    .select("*")
    .single();

  throwIfError(gameError);

  const { error: playerError } = await supabase.from("players").insert({
    game_id: game.id,
    player_id: hostPlayerId,
    display_name: displayName,
    score: 0,
    is_host: true,
    inventory_cards: [],
  });

  throwIfError(playerError);

  return pollGameState(game.id);
}

export async function joinGame({
  gameId,
  playerId,
  displayName,
}: {
  gameId: string;
  playerId: string;
  displayName: string;
}): Promise<GameState> {
  const state = await pollGameState(gameId);

  if (state.players.some((player) => player.player_id === playerId)) {
    return state;
  }

  if (state.game.status !== "lobby") {
    throw new Error("This game has already started.");
  }

  if (state.players.length >= state.game.max_players) {
    throw new Error("This game is full.");
  }

  const { error: playerError } = await supabase.from("players").insert({
    game_id: state.game.id,
    player_id: playerId,
    display_name: displayName,
    score: 0,
    is_host: false,
    inventory_cards: [],
  });

  throwIfError(playerError);

  const turnOrder = state.game.turn_order.includes(playerId)
    ? state.game.turn_order
    : [...state.game.turn_order, playerId];

  const { error: gameError } = await supabase
    .from("games")
    .update({ turn_order: turnOrder })
    .eq("id", state.game.id);

  throwIfError(gameError);

  return pollGameState(state.game.id);
}

export async function pollGameState(gameId: string): Promise<GameState> {
  const normalizedGameId = gameId.trim();

  const { data: gameData, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", normalizedGameId)
    .single();

  throwIfError(gameError);

  const game = normalizeGame(gameData as GameRow);

  const { data: playerData, error: playerError } = await supabase
    .from("players")
    .select("*")
    .eq("game_id", game.id)
    .order("joined_at", { ascending: true });

  throwIfError(playerError);

  const { data: guessData, error: guessError } = await supabase
    .from("guesses")
    .select("*")
    .eq("game_id", game.id)
    .eq("round_number", game.current_round)
    .order("created_at", { ascending: true });

  throwIfError(guessError);

  const state = {
    game,
    players: (playerData ?? []).map((player) =>
      normalizePlayer(player as PlayerRow),
    ),
    guesses: (guessData ?? []).map((guess) => normalizeGuess(guess as GuessRow)),
  };

  if (shouldAutoReveal(state)) {
    return revealRound(state);
  }

  return state;
}

export async function submitPrompt({
  gameId,
  playerId,
  promptText,
}: {
  gameId: string;
  playerId: string;
  promptText: string;
}): Promise<GameState> {
  const state = await pollGameState(gameId);
  const prompt = promptText.trim();

  if (state.game.status !== "prompting") {
    throw new Error("This game is not accepting prompts right now.");
  }

  if (state.game.current_prompter_id !== playerId) {
    throw new Error("Only the current prompter can submit a prompt.");
  }

  if (!prompt) {
    throw new Error("Prompt is required.");
  }

  if (prompt.length > 400) {
    throw new Error("Prompt must be 400 characters or fewer.");
  }

  const { error: generatingError } = await supabase
    .from("games")
    .update({
      status: "generating",
      prompt_text: prompt,
      prompt_word_count: countWords(prompt),
      image_url: null,
      ready_player_ids: [],
      card_phase_done_player_ids: [],
      phase_end_time: null,
    })
    .eq("id", state.game.id);

  throwIfError(generatingError);

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });
    const data = (await response.json()) as {
      imageUrl?: string;
      error?: string;
      detail?: string;
    };

    if (!response.ok || !data.imageUrl) {
      throw new Error(data.detail || data.error || "Image generation failed.");
    }

    const phaseEndTime = getPhaseEndTimeFromResponse(
      response,
      state.game.guessing_time_limit,
    );
    const { error: guessingError } = await supabase
      .from("games")
      .update({
        status: "guessing",
        image_url: data.imageUrl,
        phase_end_time: phaseEndTime,
      })
      .eq("id", state.game.id);

    throwIfError(guessingError);
  } catch (error) {
    await supabase
      .from("games")
      .update({ status: "prompting", phase_end_time: null })
      .eq("id", state.game.id);
    throw error;
  }

  return pollGameState(state.game.id);
}

export async function submitGuess({
  gameId,
  playerId,
  rawGuess,
}: {
  gameId: string;
  playerId: string;
  rawGuess: string;
}): Promise<GameState> {
  const state = await pollGameState(gameId);
  const guess = rawGuess.trim();

  if (state.game.status === "reveal") {
    return state;
  }

  if (state.game.status !== "guessing") {
    throw new Error("This game is not accepting guesses right now.");
  }

  if (state.game.current_prompter_id === playerId) {
    throw new Error("The prompter cannot submit a guess.");
  }

  const { error: deleteError } = await supabase
    .from("guesses")
    .delete()
    .match({
      game_id: state.game.id,
      round_number: state.game.current_round,
      player_id: playerId,
    });

  throwIfError(deleteError);

  const { error } = await supabase.from("guesses").insert({
    game_id: state.game.id,
    round_number: state.game.current_round,
    player_id: playerId,
    raw_guess: guess,
    score: 0,
    matched_words_json: [],
  });

  throwIfError(error);

  const nextState = await pollGameState(state.game.id);

  if (allGuessersSubmitted(nextState)) {
    return revealRound(nextState);
  }

  return nextState;
}

export async function toggleReady({
  gameId,
  playerId,
}: {
  gameId: string;
  playerId: string;
}): Promise<GameState> {
  const state = await pollGameState(gameId);

  if (state.game.status !== "reveal") {
    return state;
  }

  const readyPlayerIds = state.game.ready_player_ids.includes(playerId)
    ? state.game.ready_player_ids
    : [...state.game.ready_player_ids, playerId];
  const playerIds = state.players.map((player) => player.player_id);
  const readyCount = readyPlayerIds.filter((readyPlayerId) =>
    playerIds.includes(readyPlayerId),
  ).length;

  if (readyCount >= state.players.length && state.players.length > 0) {
    return enterIntermission(state);
  }

  const { error } = await supabase
    .from("games")
    .update({ ready_player_ids: readyPlayerIds })
    .eq("id", state.game.id);

  throwIfError(error);

  return pollGameState(state.game.id);
}

export async function toggleCardReady({
  gameId,
  playerId,
}: {
  gameId: string;
  playerId: string;
}): Promise<GameState> {
  const state = await pollGameState(gameId);

  if (state.game.status !== "intermission") {
    return state;
  }

  const donePlayerIds = state.game.card_phase_done_player_ids.includes(playerId)
    ? state.game.card_phase_done_player_ids
    : [...state.game.card_phase_done_player_ids, playerId];
  const playerIds = state.players.map((player) => player.player_id);
  const doneCount = donePlayerIds.filter((donePlayerId) =>
    playerIds.includes(donePlayerId),
  ).length;

  if (doneCount >= state.players.length && state.players.length > 0) {
    return startPromptingRound(state, state.game.current_round + 1);
  }

  const { error } = await supabase
    .from("games")
    .update({ card_phase_done_player_ids: donePlayerIds })
    .eq("id", state.game.id);

  throwIfError(error);

  return pollGameState(state.game.id);
}

export async function playCard({
  gameId,
  playerId,
  cardId,
  targetPlayerId,
}: {
  gameId: string;
  playerId: string;
  cardId: string;
  targetPlayerId: string;
}): Promise<GameState> {
  const state = await pollGameState(gameId);

  if (state.game.status !== "intermission") {
    throw new Error("Cards can only be played during intermission.");
  }

  if (!cardDefinitions[cardId]) {
    throw new Error("Unknown card.");
  }

  if (playerId === targetPlayerId) {
    throw new Error("Choose another player as the target.");
  }

  const player = state.players.find(
    (candidate) => candidate.player_id === playerId,
  );
  const targetPlayer = state.players.find(
    (candidate) => candidate.player_id === targetPlayerId,
  );

  if (!player) {
    throw new Error("Player not found.");
  }

  if (!targetPlayer) {
    throw new Error("Target player not found.");
  }

  const cardIndex = player.inventory_cards.indexOf(cardId);

  if (cardIndex === -1) {
    throw new Error("You do not have that card.");
  }

  const nextInventoryCards = [...player.inventory_cards];
  nextInventoryCards.splice(cardIndex, 1);

  const { error: playerError } = await supabase
    .from("players")
    .update({ inventory_cards: nextInventoryCards })
    .eq("id", player.id);

  throwIfError(playerError);

  const nextModifiers = [
    ...state.game.active_modifiers,
    { type: cardId, source: playerId, target: targetPlayerId },
  ];
  const { error: gameError } = await supabase
    .from("games")
    .update({ active_modifiers: nextModifiers })
    .eq("id", state.game.id);

  throwIfError(gameError);

  return pollGameState(state.game.id);
}

export async function getNextPrompter(
  gameId: string,
): Promise<PlayerRecord | null> {
  const state = await pollGameState(gameId);
  const nextPrompterId = getPrompterIdForRound(
    state,
    state.game.current_round + 1,
  );

  return (
    state.players.find((player) => player.player_id === nextPrompterId) ?? null
  );
}

export async function advancePhase({
  gameId,
  playerId,
}: {
  gameId: string;
  playerId: string;
}): Promise<GameState> {
  const state = await pollGameState(gameId);

  if (state.game.status === "lobby") {
    if (state.game.host_player_id !== playerId) {
      throw new Error("Only the host can start the lobby.");
    }

    return startPromptingRound(state, state.game.current_round);
  }

  if (state.game.status === "guessing") {
    return revealRound(state);
  }

  return state;
}

async function enterIntermission(state: GameState): Promise<GameState> {
  const { data: claimedGame, error: claimError } = await supabase
    .from("games")
    .update({
      status: "intermission",
      ready_player_ids: [],
      card_phase_done_player_ids: [],
      phase_end_time: null,
    })
    .eq("id", state.game.id)
    .eq("status", "reveal")
    .select("*")
    .maybeSingle();

  throwIfError(claimError);

  if (!claimedGame) {
    return pollGameState(state.game.id);
  }

  const playersToReward = getBottomHalfPlayers(state.players);

  await Promise.all(
    playersToReward.map(async (player) => {
      const { error } = await supabase
        .from("players")
        .update({
          inventory_cards: [...player.inventory_cards, getRandomCardId()],
        })
        .eq("id", player.id);

      throwIfError(error);
    }),
  );

  return pollGameState(state.game.id);
}

async function revealRound(state: GameState): Promise<GameState> {
  if (!state.game.prompt_text) {
    throw new Error("Cannot score without a prompt.");
  }

  if (state.game.status !== "guessing") {
    return state;
  }

  const { data: claimedGame, error: claimError } = await supabase
    .from("games")
    .update({
      status: "reveal",
      phase_end_time: null,
      active_modifiers: [],
      card_phase_done_player_ids: [],
    })
    .eq("id", state.game.id)
    .eq("status", "guessing")
    .select("*")
    .maybeSingle();

  throwIfError(claimError);

  if (!claimedGame) {
    return pollGameState(state.game.id);
  }

  await Promise.all(
    state.guesses.map(async (guess) => {
      const scoredGuess = scoreGuess(state.game.prompt_text ?? "", guess.raw_guess);
      const player = state.players.find(
        (candidate) => candidate.player_id === guess.player_id,
      );

      const { error: guessError } = await supabase
        .from("guesses")
        .update({
          score: scoredGuess.score,
          matched_words_json: scoredGuess.guessWords,
        })
        .eq("id", guess.id);

      throwIfError(guessError);

      if (!player) {
        return;
      }

      const { error: playerError } = await supabase
        .from("players")
        .update({ score: player.score + scoredGuess.score })
        .eq("id", player.id);

      throwIfError(playerError);
    }),
  );

  return pollGameState(state.game.id);
}

async function startPromptingRound(
  state: GameState,
  roundNumber: number,
): Promise<GameState> {
  const turnOrder = getTurnOrder(state);
  const currentPrompterId = getPrompterIdForRound(state, roundNumber);

  const { error } = await supabase
    .from("games")
    .update({
      status: "prompting",
      current_round: roundNumber,
      current_prompter_id: currentPrompterId,
      prompt_text: null,
      prompt_word_count: null,
      image_url: null,
      ready_player_ids: [],
      card_phase_done_player_ids: [],
      phase_end_time: null,
      turn_order: turnOrder,
    })
    .eq("id", state.game.id);

  throwIfError(error);

  return pollGameState(state.game.id);
}

function getPrompterIdForRound(state: GameState, roundNumber: number): string {
  const turnOrder = getTurnOrder(state);

  return turnOrder[roundNumber % turnOrder.length];
}

function getTurnOrder(state: GameState): string[] {
  const currentTurnOrder = state.game.turn_order.filter((playerId) =>
    state.players.some((player) => player.player_id === playerId),
  );

  if (currentTurnOrder.length > 0) {
    return currentTurnOrder;
  }

  const fallbackTurnOrder = state.players.map((player) => player.player_id);

  if (fallbackTurnOrder.length === 0) {
    throw new Error("Cannot start a game without players.");
  }

  return fallbackTurnOrder;
}

function getPhaseEndTimeFromResponse(
  response: Response,
  guessingTimeLimit: number,
): string {
  const serverDate = response.headers.get("date");
  const serverNow = serverDate ? Date.parse(serverDate) : Number.NaN;
  const startTime = Number.isNaN(serverNow) ? Date.now() : serverNow;

  return new Date(startTime + guessingTimeLimit * 1000).toISOString();
}

function shouldAutoReveal(state: GameState): boolean {
  if (state.game.status !== "guessing") {
    return false;
  }

  return isPhaseExpired(state.game) || allGuessersSubmitted(state);
}

function isPhaseExpired(game: GameRecord): boolean {
  if (!game.phase_end_time) {
    return false;
  }

  return Date.now() >= new Date(game.phase_end_time).getTime() + 1500;
}

function allGuessersSubmitted(state: GameState): boolean {
  const guesserIds = state.players
    .map((player) => player.player_id)
    .filter((playerId) => playerId !== state.game.current_prompter_id);

  if (guesserIds.length === 0) {
    return false;
  }

  return guesserIds.every((playerId) =>
    state.guesses.some((guess) => guess.player_id === playerId),
  );
}

function getBottomHalfPlayers(players: PlayerRecord[]): PlayerRecord[] {
  const sortedPlayers = [...players].sort((first, second) => {
    if (first.score === second.score) {
      return first.joined_at.localeCompare(second.joined_at);
    }

    return first.score - second.score;
  });
  const rewardCount = Math.ceil(sortedPlayers.length / 2);

  return sortedPlayers.slice(0, rewardCount);
}

function getRandomCardId(): string {
  const cardIds = Object.keys(cardDefinitions);

  return cardIds[Math.floor(Math.random() * cardIds.length)] ?? "ddos";
}

function normalizeGame(game: GameRow): GameRecord {
  return {
    ...game,
    ready_player_ids: asStringArray(game.ready_player_ids),
    turn_order: asStringArray(game.turn_order),
    active_modifiers: asActiveModifiers(game.active_modifiers),
    card_phase_done_player_ids: asStringArray(game.card_phase_done_player_ids),
  };
}

function normalizePlayer(player: PlayerRow): PlayerRecord {
  return {
    ...player,
    is_host: Boolean(player.is_host),
    inventory_cards: asStringArray(player.inventory_cards),
  };
}

function normalizeGuess(guess: GuessRow): GuessRecord {
  return {
    ...guess,
    matched_words_json: asWordMatches(guess.matched_words_json),
  };
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asWordMatches(value: unknown): WordMatch[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is WordMatch =>
        typeof item === "object" &&
        item !== null &&
        "word" in item &&
        "matched" in item,
    )
    .map((item) => ({
      word: String(item.word),
      matched: Boolean(item.matched),
    }));
}

function asActiveModifiers(value: unknown): ActiveModifier[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is ActiveModifier =>
        typeof item === "object" &&
        item !== null &&
        "type" in item &&
        "source" in item &&
        "target" in item,
    )
    .map((item) => ({
      type: String(item.type),
      source: String(item.source),
      target: String(item.target),
    }));
}

function throwIfError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}
