# UI/UX transformation acceptance matrix

“Documented” is not “implemented”. Each item needs linked evidence and owner/independent review.

| ID | Requirement | Design evidence | Implementation evidence | Status |
|---|---|---|---|---|
| A01 | Full repository/UI audit | Audit and screen inventory | File-by-file rationale | Design submitted |
| A02 | Product direction/identity | Sky Garden evolution + three worlds | Production artwork | Design submitted |
| A03 | Age bands 3–5/6–8/9–10 | Adaptation matrix | Parent-configured behaviour and tests | Code pending |
| A04 | Research synthesis | Apple TV, Netflix Kids, YouTube Kids, Duolingo, Khan Academy Kids | Verify, do not copy | Design submitted |
| A05 | Palette/type/contrast | Semantic palette, type scale, thresholds | Measured every final state/resolution | Code pending |
| A06 | Reusable component states | Default/focus/press/disabled specs | Tokens + shared Android components | Later phase |
| A07 | Home concept | Original 1920×1080 SVG | TV captures | Concept submitted |
| A08 | Navigation/focus/BACK | Screen map + per-screen graph | DPAD tests/device evidence | Code pending |
| A09 | Environments | Original concept sheet | Production art/licensing | Concepts submitted |
| A10 | Mascot concepts | Pip pose/family direction + original character-family SVG | Original vectors/lifecycle tests | Design submitted |
| A11 | Motion/reduced motion | Timing/static fallback | Animator scale 0 implementation/tests | Code pending |
| A12 | All screen specs | 11 screen families + edge states; missing prototype compositions mapped in coverage supplement | Reviewed implementation per family | Design submitted |
| A13 | Performance guidance | Native Java/minSdk 26 (API 29 initial physical test device), asset budgets, rendering/lifecycle guidance | Profiling on target TV | Design submitted; profiling pending |
| A14 | Review blockers | Home reading load, moon cue, contrast, icon direction | Device screenshots | Concept addressed; code pending |
| A15 | Focus contrast | Two-tone INK/SUN ring | ≥3:1 measured on all surfaces | Code pending |
| A16 | Emoji consistency | Original pictogram direction | Replace navigation emoji incl. unsuitable 👯 | Code pending |
| A17 | Public-edition voice | Offline TTS fallback spec | Engine/language test on TV | Code pending |
| A18 | PLAY artwork/taglines | Required art/tagline spec | Validator + complete catalogue | Code pending |
| A19 | Pip copy consistency | Voice/copy principles | Central copy table/check | Code pending |
| A20 | Device proof | Test plan | 1080p/720p captures per slice | Earlier Claude captures only; exact-current-head renders pending |
| A21 | Safety/privacy | Explicit constraints | Human review + public/family tests | Release gate |
| A22 | CI/API compatibility | Native incremental plan | Green CI + target build | Later code phase |
| A23 | Achievements/gamification | Explicitly excluded by product constraints | No streaks, badge economy, leaderboard or time rewards | Excluded / guardrail |\n| A24 | Initial game-round focus | Spec: first answer receives initial focus, not sound control | Runtime correction tracked in issue #14; no Android change in this design PR | Implementation pending |

## Merge gate

No merge until blockers are closed, CI is green, Claude has submitted an approving review of the final code diff, owner accepts design and implementation, and real-TV evidence is available. Safety, privacy, time integrity, remote navigation and readability failures block release.
