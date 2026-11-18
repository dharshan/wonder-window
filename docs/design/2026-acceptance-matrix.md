# UI/UX transformation acceptance matrix

“Documented” is not “implemented”. Each item needs linked evidence and owner/independent review.

| ID | Requirement | Design evidence | Implementation evidence | Status |
|---|---|---|---|---|
| A01 | Full repository/UI audit | Audit and screen inventory | File-by-file rationale | Design submitted |
| A02 | Product direction/identity | Sky Garden evolution + three worlds | Production artwork | Design submitted |
| A03 | Age bands 3–5/6–8/9–10 | Adaptation matrix | Parent-configured behaviour and tests | Design submitted; code pending |
| A04 | Research synthesis | Apple TV, Netflix Kids, YouTube Kids, Duolingo, Khan Academy Kids | Verify, do not copy | Design submitted |
| A05 | Palette/type/contrast | Semantic palette, type scale, candidate contrast calculations | Measured every final state/resolution | Code/render pending |
| A06 | Reusable component states | Default/focus/press/disabled specs | Tokens + shared Android components | Later phase |
| A07 | Home concept | Original 1920×1080 SVG | TV captures | Concept submitted |
| A08 | Navigation/focus/BACK | Screen map + per-screen graph | DPAD tests/device evidence | Code pending |
| A09 | Environments | Original concepts + three-realm atlas | Production art/licensing | Concepts submitted |
| A10 | Mascot concepts | Pip pose direction + five-state acting sheet | Original vectors/lifecycle tests | Design submitted |
| A11 | Motion/reduced motion | Timing tokens, purpose rules and static fallback | Animator scale 0 implementation/tests | Code pending |
| A12 | All screen specs | 11 screen families + edge states + coverage supplement | Reviewed implementation per family | Design submitted |
| A13 | Performance guidance | Native Java/minSdk 26, asset budgets, rendering/lifecycle guidance | Profiling on target TV | Design submitted; profiling pending |
| A14 | Review blockers | Home reading load, moon cue, contrast, icon direction | Device screenshots | Concept addressed; code pending |
| A15 | Focus contrast | Two-tone INK/SUN ring | ≥3:1 measured on all surfaces | Code/render pending |
| A16 | Emoji consistency | Original pictogram family and no-emoji UI rule | Replace UI emoji without changing content data | Code pending |
| A17 | Public-edition voice | Offline TTS fallback spec | Engine/language test on TV | Code pending |
| A18 | PLAY artwork/taglines | Required semantic art/tagline spec | Complete catalogue assets + validator | Code pending |
| A19 | Pip copy consistency | Voice/copy principles | Central copy table/check | Code pending |
| A20 | Device proof | 1080p/720p render and TV test plan | Exact-head captures | Earlier evidence only; current-head proof pending |
| A21 | Safety/privacy | Explicit constraints | Human review + public/family tests | Release gate |
| A22 | CI/API compatibility | Native incremental plan | Green CI + target build | Later phase |
| A23 | Achievements/gamification | Explicitly excluded by product constraints | No streaks, badge economy, leaderboard or time rewards | Excluded / guardrail |
| A24 | Initial game-round focus | First answer receives initial focus, not sound control | Runtime correction tracked in issue #14 | Implementation pending |
| A25 | Reusable illustration grammar | World atlas, pictogram family, Pip acting sheet and asset bible | Production asset pipeline and provenance checks | Design submitted |
| A26 | Three-discipline quality review | Weighted illustrator, motion and animation rubrics | Independent review and evidence on final assets | Self-review ≥9/10; independent review pending |
| A27 | Narrative continuity | Five-beat story arc and per-route transition recipes | Implemented transitions with static fallback | Design submitted; code pending |
| A28 | Baseline evidence retention | Seven original screenshots remain on main and in this PR | Before/after capture set | Preserved |
| A29 | Multi-resolution visual quality | 1920×1080 source prototypes and 720p scaling rules | Raster review at 1920×1080 and 1280×720 | Render check pending |
| A30 | Design/runtime boundary | Explicit design-only status and staged implementation sequence | Separate implementation PRs and tests | Design-only |

## Merge gate

No merge until design blockers are closed, the owner accepts the creative direction, all SVGs parse and render at 1920×1080 and 1280×720, and the review package clearly distinguishes design evidence from runtime evidence. Runtime implementation remains a separate gate requiring green CI, remote/focus tests, safety/privacy review and real-TV evidence.
