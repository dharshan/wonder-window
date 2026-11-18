# Agent rules

Read this file and PROMPT.md first. Inspect the repository and current Android source before editing. Preserve working behaviour and make the smallest safe change.

## Product order
Home order is PLAY → TRY → WATCH. PLAY and TRY are first-party; WATCH is an optional third-party provider boundary. Never couple PLAY/TRY to WATCH SDKs.

## Android TV
Standard remote only: UP, DOWN, LEFT, RIGHT, OK, BACK. No child-facing flow may require touch, pointer, keyboard or voice. Focus must be visible, predictable and restored after navigation. Preserve existing SDK/device compatibility; do not migrate frameworks for aesthetics.

## Architecture
Shared host owns global navigation, remote dispatch, focus, session lifecycle, parent gate and screen-time accounting. Feature modules cannot add global timers or bypass parent controls. Core is offline-first and must not depend on provider SDKs. Do not dynamically load arbitrary contributed executable code.

## Child safety/privacy
No ads, purchases, tracking, profiling, child accounts, unnecessary data collection, streaks, leaderboards, loot boxes or engagement manipulation. Child-facing content needs age fit, clear instructions, accessibility and human review. TRY needs materials, supervision, hazards and safe alternatives. Never collect or commit children's personal information.

## Screen-time policy
One shared session manager owns the parent-configured screen budget. On-TV navigation and instructions count. TRY activity away from TV does not. Games cannot earn extra time.

## Quality
Use schemas/templates and unique IDs. Include provenance and exact asset licences. Add tests. Don't claim developmental validation without evidence. Report exact validation results and untested device limits. Never overwrite user work without approval. Human review is mandatory for child-facing release content.
