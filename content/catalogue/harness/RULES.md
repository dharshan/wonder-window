# Wonder Window — rules every agent follows (short)

Child: 5½ y, UKG, Bangalore, Kannada at home (understands English/Hindi), cannot read, D-pad remote (UP DOWN LEFT RIGHT OK BACK).
Voice plays only when he presses 🔊 (then stays on for that set). Short non-speech sfx are allowed.
Graphics: emoji Unicode ≤ 11, no ZWJ sequences; Sky Garden design system (candy buttons, white cards, Cherry the sparrow).
Spoken lines are pre-recorded with macOS `say` (Rishi): never an isolated letter or vowel; write sounds as "buh", "sss".
Prompts ≤ 8 words; sessions = 5 rounds ≈ 1.5–4 min; no timers, no streaks, no daily rewards, no FOMO, no punitive feedback.
Shared screen-time budget is owned by the app shell; games never add time.
Privacy: never show/speak phone, address or other people's names; child's own name/age only via engine placeholders.
Catalogue: preserve WW ids; dedup = same objective AND same player action → "merged_into"; status in catalogue/status.json.

Engine variants (MainActivity): pick, sort(labels), grid_path, keypad, recite, dynamic, place, echo, order, peek, silhouette, mirror, pairs, grid_path (catalogue too), compose (modes build|canvas|slots; scene_canvas = compose canvas; schemas in specs/WW-133.md, WW-213.md, WW-238.md, WW-106.md).
Files: content → spec/games.json (core 7) and catalogue/catalogue_games.json (WW games); specs → catalogue/specs/WW-xxx.md.
