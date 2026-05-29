# What The Prompt - MVP Blueprint

## 1. Core Game Flow
1. Host creates a lobby (selects max players and guessing timer: 30, 45, 60, or 90s).
2. Players join. Each gets a random display name and a stable `playerId` stored in localStorage.
3. Lobby fills -> Game starts. 
4. Prompter Selection: We use the `turn_order` array to rotate prompters. The current prompter is selected based on the `current_round` index. (Players do not volunteer).
5. Prompter writes an image prompt (maxLength=400).
6. The frontend securely calls the backend `/api/generate`.
7. The resulting image URL is saved to the Supabase game state.
8. Guessers see the image and the original prompt's word count. 
9. Timer ends -> auto-submit guesses. 
10. Host client calculates points via exact string matching (indexOf + splice) and updates phase to `reveal`.
11. Reveal screen shows original prompt, guesses, highlighted matched words, and points.
12. Players click "Ready". When all are ready, `current_round` increments, and the next player in `turn_order` becomes prompter.

## 2. Database Schema (Supabase)
* **games:** id (uuid), created_at, status (text: lobby | prompting | generating | guessing | reveal | game_over), host_player_id (text), max_players (int), guessing_time_limit (int), current_prompter_id (text), current_round (int), phase_end_time (timestamp), prompt_text (text), prompt_word_count (int), image_url (text), ready_player_ids (jsonb array), turn_order (jsonb array of playerIds).
* **players:** id (uuid), created_at, game_id (uuid), player_id (text), display_name (text), score (int), is_host (boolean), joined_at (timestamp).
* **guesses:** id (uuid), created_at, game_id (uuid), round_number (int), player_id (text), raw_guess (text), score (int), matched_words_json (jsonb).