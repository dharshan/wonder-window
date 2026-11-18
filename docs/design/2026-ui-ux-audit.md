# 2026 UI/UX audit — full screen inventory and design direction

**Baseline:** `main` at `2d3f89fabfb07b2211f938f8476f3d033d63f4a3`.  
**Implementation:** Native Android Java; local JSON catalogues/learning banks; shared session meter; optional WebView WATCH boundary.  
**Device evidence:** Claude Code's PR #12 real-TV review and 13 captures on `review/pr12-evidence`; evidence applies to the reviewed earlier head, not future code.

## Strengths to preserve

- Working native Android TV host and standard remote dispatch.
- Sky Garden sky/hills/clouds, day/night scenes, original Pip vector poses and gentle animation.
- Fredoka/Andika font assets and existing large cards/picture tiles.
- PLAY→TRY→WATCH order, shared session architecture, PLAY shelves, TRY browse/preview/step-away, WATCH provider boundary.
- Public/family edition split and D8/D9/D10/D11 decisions merged to `main`.

## Review findings

| Severity | Finding | Impact | Recommendation |
|---|---|---|---|
| Blocker | Masthead, section label and remote hint added while cards/icons/Pip shrank | More reading, less picture-led orientation | Remove header/section/hint; restore large imagery |
| Blocker | WATCH resting state lost moon cue and card opacity reduced | State unclear; contrast fails | Retain moon/sleepy Pip; night tint; full contrast |
| Blocker | Initial PR did not include merged #7 baseline | Integration drift | Build only from current `main` |
| Blocker | System emoji used as nav icons; 👯 connotation in TRY | Inconsistent and unsuitable icon | Original flat pictograms; emoji only as game content |
| Major | Gold glow alone ~1.0–1.2:1 on sky | Focus unclear | 4 px INK + 8 px SUN ring |
| Major | PLAY orange/supporting copy contrast low | TV-distance readability | Rework surfaces and measure final combinations |
| Major | Motion/reduced motion docs-only | Accessibility gap | Shared motion system and static animator-scale 0 |
| Major | Tokens only in docs; literals in host | Drift | Tokens class before screen expansion |
| Major | Public edition silent without optional voice clips | Instructions may not be spoken | Optional verified offline TTS; first focus stays answer |
| Major | PLAY cards use generic placeholders/missing taglines | Catalogue unfinished | Validator requires art/tagline; pictogram shelf headings |
| Major | Pip copy inconsistent | Character voice unclear | One copy table; sentence case |
| Follow-up | Disabled-TRY path not device-tested | Configuration path unverified | Test family review build with TRY disabled |
| Follow-up | Non-home screens lack complete captures | Whole product consistency unknown | Capture each screen family at 1080p/720p |

## Screen inventory

| Family | Main risk | Priority |
|---|---|---|
| Launch/splash | Blocking/indefinite loading | Medium |
| Child home | Zero-reading, focus, resting WATCH | Blocker |
| PLAY catalogue | Placeholder art, taglines, emoji | High |
| Game instruction/detail | Missing voice; focus order | High |
| Game round | Speaker control stealing first focus | High |
| Game completion | Reward/score pressure | Medium |
| TRY families/list | Emoji, age density, safety cues | High |
| TRY preview/prepare | Materials, supervision, hazards | High |
| TRY step-away/return | Shared meter integrity | High |
| WATCH library/player | Parent-curated order, provider errors | High |
| Pause/stop/end/resting | Calm exit, full contrast, no reset | High |
| Parent gate/settings | Parent-only access and destructive actions | High |

## Chosen direction

**Sky Garden evolved — picture-led magical world × premium playroom.** The child home is three illustrated windows, not a text-heavy menu: PLAY puzzle garden, TRY meadow workshop, WATCH dusk story hill. Pip orients without pressure; parent controls remain separate.

This is source inspection plus heuristic review, not a usability study, child-development assessment, safety certification or broad compatibility claim. New code must be retested on the actual TV.
