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

## Current status (v0.9.0-test, Nov 2026) — pre-reorder baseline

This import is the **v0.9 baseline as it ran on the family TV, before the review decisions in issue #1** (home order is still WATCH first; the open-source decision is PLAY → TRY → WATCH, see follow-up PRs). It contains a working prototype, not only the blueprint: a single-activity Java Android TV app (`app/`, API 26–34, no AndroidX) tested on one OnePlus TV (Android 10). It has WATCH (parent-curated channel rows, YouTube IFrame player), PLAY (7 core games plus 65 catalogue games and 13 modes), TRY v3 (10 reviewed activities across 7 families) and one shared daily screen-time limit. Pre-recorded voice clips are generated locally with `tools/make_voice.py` and are not committed. Not yet done: parent settings screen on the TV, release signing, Android CI build, broad device testing. See open issues.

Build (Linux, headless; no Mac, TV or voice clips needed): install JDK 17 and the Android SDK (platform 34), then run `./gradlew assemblePublicDebug lintPublicRelease`. The `public` edition ignores `family.properties` and ships only defaults; CI runs this plus `tools/check_public_apk.py`. A personalised `family` edition (`./gradlew assembleFamilyDebug`, reads `family.properties`) is local-only and must never be uploaded or attached to a release. Local macOS helpers (`tools/build-install.sh`, `tools/build-only.sh`, `tools/install-when-ready.sh`, `tools/make_voice.py`) install on a TV and generate optional `say` voice clips; they are not used by CI.

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
