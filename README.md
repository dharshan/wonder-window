# Wonder Window

**WATCH · PLAY · TRY — Discover. Think. Experience.**

Wonder Window is an open-source, offline-first Android TV experience designed to make screen time more meaningful for children aged 3–10.

## Experience order

1. **PLAY** — first-party interactive educational games.
2. **TRY** — first-party offline real-world activities that invite children to step away from the TV.
3. **WATCH** — provider-neutral video integrations.

PLAY and TRY are first-party. WATCH is a third-party integration boundary and remains isolated from core.

## Principles

- Offline-first/local-first; no account or backend required for core PLAY and TRY.
- No ads, in-app purchases, behavioural tracking, streaks, leaderboards or manipulative engagement loops.
- Parent-configured shared screen-time budget. One shared session manager owns accounting.
- Standard TV remote only: UP, DOWN, LEFT, RIGHT, OK and BACK.
- Parent controls, child safety, accessibility and human content review are release requirements.
- TRY should lead to activity away from the TV. Time away from the TV is not charged as screen use.

## Start with your coding agent

Read `AGENTS.md`, then `PROMPT.md`, the product and architecture docs, and the task prompt matching your contribution. Inspect the existing Android project before making architectural changes. This repository is a contribution blueprint, not a replacement app or a mandate for a framework rewrite.

## Contribution areas

- [PLAY](features/play/README.md)
- [TRY](features/try/README.md)
- [WATCH](features/watch/README.md)
- [Design system](design/README.md)
- [Shared core](core/README.md)

## Validate

```bash
python3 -m pip install jsonschema
python3 tools/validate_content.py
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/ROADMAP.md](docs/ROADMAP.md).

## License

Source code: MIT. Original written documentation/content: CC BY 4.0 where indicated. Third-party materials retain their own licences.
