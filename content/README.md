# Content

Version and review content before child-facing inclusion: play/, try/, watch/, packs/, schemas/ and review/. Draft/needs_review items never appear in production. Schema validity is not safety approval.

## Two schema layers
- `game.schema.json`, `activity.schema.json`, `provider.schema.json`, `theme.schema.json`: the **design-intake** format for proposing new content (see `examples/`).
- `games.app.schema.json`, `try-activities.app.schema.json`: the **runtime** files the Android app actually loads (`app/src/main/assets/`). These are the source of truth for what ships; `tools/content/validate_games.py` and `validate_try_activities.py` add the deeper child-safety and TTS rules.
