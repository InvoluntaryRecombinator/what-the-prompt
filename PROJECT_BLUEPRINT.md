# What The Prompt - Architecture Blueprint

## 1. Core Game Flow
1. Host creates lobby (selects max players, guessing timer).
2. Players join. Each gets a random display name and stable `playerId`.
3. Lobby fills -> Game starts. (Host privileges cease to exist here. All UI is universal).
4. Prompting Phase: The `turn_order` array rotates prompters based on `current_round`. 
5. Prompter writes image prompt. Frontend securely calls backend `/api/generate`.
6. Guessing Phase: Guessers see image. Ticking clock auto-submits guesses at 00:00.
7. Reveal Phase: Shows original prompt, guesses, highlighted matched words, and updates scores universally.
8. Intermission Phase: Players click "Ready" on Reveal and move here. Bottom 50% of players receive 1 Attack Card. Players can target others or skip.
9. Round Cycles: When all players ready up in Intermission, `current_round` increments, prompter cycles, and active modifiers are cleared.

## 2. Database Schema (Supabase)
* **games:** id, created_at, status (lobby | prompting | generating | guessing | reveal | intermission | game_over), max_players, guessing_time_limit, current_prompter_id, current_round, phase_end_time, prompt_text, prompt_word_count, image_url, ready_player_ids, turn_order, active_modifiers (jsonb), card_phase_done_player_ids (jsonb).
* **players:** id, created_at, game_id, player_id, display_name, score, joined_at, inventory_cards (jsonb).
* **guesses:** id, created_at, game_id, round_number, player_id, raw_guess, score, matched_words_json (jsonb).