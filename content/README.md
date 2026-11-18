# Content

Version and review content before child-facing inclusion: play/, try/, watch/, packs/, schemas/ and review/. Draft/needs_review items never appear in production. Schema validity is not safety approval.

## Runtime files and their status

| File the app loads | Schema | Status |
| --- | --- | --- |
| `app/src/main/assets/games.json` | `schemas/runtime/games.v3.schema.json` | current (core PLAY bank) |
| `app/src/main/assets/catalogue_games.json` | `schemas/runtime/catalogue_games.v1.schema.json` | current (catalogue games, merged modes, aliases) |
| `app/src/main/assets/try_activities.json` | `schemas/runtime/try_activities.v1.schema.json` | current (TRY v3) |
| `app/src/main/assets/warmup_bank.json` | `schemas/runtime/warmup_bank.v1.schema.json` | current |
| `app/src/main/assets/aboutme_bank.json` | `schemas/runtime/aboutme_bank.v1.schema.json` | current |
| `app/src/main/assets/try.json` | `schemas/runtime/try.v2.legacy.schema.json` | legacy, used only when `try_v3=false` |

`tools/validate_content.py` validates every record of every file above. The scaffold schemas (`game.schema.json`, `activity.schema.json`, …) are a separate **design-intake** format for proposals; there is no automatic conversion yet, and the runtime formats are the source of truth. Shared content uses `{buddy}` for the guide's name (default `Pip`).
