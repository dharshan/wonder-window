# 2026 UI/UX audit — full screen inventory and design direction

**Baseline:** public screenshots on current `main`, seven captures at 1920×1080.  
**Implementation:** Native Android Java; local JSON catalogues/learning banks; shared session meter; optional WebView WATCH boundary.  
**Device evidence:** The screenshots are existing captures from a OnePlus Android TV (Android 10). They are evidence of those captured states only, not a fresh test of this design branch.

## Strengths to preserve

- Working native Android TV host and standard remote dispatch.
- Sky Garden sky/hills/clouds, day/night scenes, original Pip vector poses and gentle animation.
- Fredoka/Andika font assets and existing large cards/picture tiles.
- PLAY→TRY→WATCH order, shared session architecture, PLAY shelves, TRY browse/preview/step-away, WATCH provider boundary.
- Public/family edition split and D8/D9/D10/D11 decisions merged to `main`.

## Direct visual audit of the seven screenshots

| Capture | What is visibly working | What weakens the experience | Design response |
|---|---|---|---|
| `home.jpg` | Three large doors; clear PLAY/TRY/WATCH order; sky/hills/clouds; friendly Pip; selected PLAY card is obvious. | Dice, flask and clapperboard read like mixed system/emoji assets; three solid colour panels do not yet feel like doors into distinct places; focus relies heavily on a bright light/gold outline. | Keep the three-door composition; give each door a landmark illustration and realm identity; use a dark+gold focus edge. |
| `play-games.jpg` | Large picture cards and shelf structure; strong title/tagline hierarchy; selected card is easy to locate. | Mixed emoji, glossy 3D-like symbols and flat vector surfaces; some game concepts use generic baskets/numbers/microscope imagery; one star motif is ambiguous. | Use semantic game art in one cut-paper vector grammar; give each game a unique object/scene and consistent shelf pictograms. |
| `play-round.jpg` | Clear question, four large picture answers and visible round progress; landscape backdrop is calm. | Fruit choices are emoji-style art; speaker control is visibly ringed/focused in the capture, competing with the answer task; no written answer labels are shown. | Make answer art consistent and semantically exact; first focus the first answer; keep replay/sound secondary and visibly labelled where needed. |
| `play-shelves.jpg` | Shelf grouping and large cards make catalogue browsing spatial. | Repeated icon style inconsistency; repeated landscape does not help distinguish game families; screenshot crop means top-row context is not fully represented. | Preserve shelves and spatial DPAD model; use themed landmarks as subtle shelf headers, not more text. |
| `try-families.jpg` | Seven useful real-world activity families; large tiles; the purpose is explicit; selected family stands out. | Category icons are mostly emoji-style and vary in rendering/style; seven coloured tiles compete equally; the shared background is reused without a distinct meadow workshop feel. | Create a coherent seven-pictogram family; use age-appropriate grouping/density without changing the seven families. |
| `try-preview.jpg` | Good task title, one-line invitation, materials, duration and supervision/help information; clear primary “Show me how” action. | The elephant symbol is a generic emoji rather than a scene illustration; materials and duration read as text rows; secondary action hierarchy is less clear. | Add one recognisable activity illustration; turn materials into pictograms; keep adult-help cue explicit and safety reviewed. |
| `try-step.jpg` | One instruction per step, large visual, progress dots, Back/Next controls; a strong focus ring on Next. | The main animal is again an emoji; the TV screen remains visually dominant even though the purpose is to step away; speaker control occupies a prominent action slot. | Use original animal illustration; make the final step-away message the visual endpoint; keep sound optional and secondary. |

## Cross-screen findings

| Severity | Finding | Impact | Recommendation |
|---|---|---|---|
| Blocker | UI imagery mixes system emoji, glossy 3D symbols, flat vectors and generic placeholders | The product has a recognisable colour world but not yet one illustration identity | Use one original storybook cut-paper vector grammar for UI art; keep content emoji only as a temporary reviewed data fallback |
| Blocker | PLAY round capture shows focus on the sound control rather than the first answer | Focus does not immediately support the primary task | First answer must receive initial focus; keep sound/replay secondary (runtime issue #14 remains separate) |
| Major | Three home doors are colour-coded but not yet distinct illustrated places | Child sees three coloured buttons, not three invitations into one world | Puzzle Grove, Maker Meadow and Dusk Story Hill |
| Major | Gold/light focus edge is not consistently separated from bright backdrops | Focus may weaken on sky and white surfaces | 4 px INK outer edge + 8 px SUN inner band; validate every final combination |
| Major | Background is repeated across most screens | World continuity becomes wallpaper rather than meaningful orientation | Reuse sky/horizon, vary foreground landmarks and local realm atmosphere |
| Major | Some catalogue art is generic or stylistically mismatched | Semantic clarity and perceived quality drop | One unique, semantically accurate image per game/activity |
| Major | Pip is charming but often a static corner decoration | Mascot does not yet help communicate the experience | Five restrained, canonical acting states; react only to meaningful events |
| Major | Motion and reduced motion are not evidenced by still captures | Static screenshot cannot validate timing, interruption or accessibility | Specify purpose-based motion and static equivalents; validate on device |
| Follow-up | Disabled-TRY path not device-tested | Configuration path unverified | Test family review build with TRY disabled |
| Follow-up | Non-home screens lack a complete current-head capture set | Whole product consistency remains unverified | Capture every screen family at 1080p/720p after implementation |

## Screen inventory

| Family | Main risk | Priority |
|---|---|---|
| Launch/splash | Blocking/indefinite loading | Medium |
| Child home | Focus, three-realm clarity, resting WATCH | Blocker |
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

**Sky Garden evolved — one illustrated world, three distinct invitations.** The child home is three illustrated windows: PLAY Puzzle Grove, TRY Maker Meadow, WATCH Dusk Story Hill. Pip orients without pressure; parent controls remain separate.

The reusable art, motion and animation principles are specified in [Wonder System](2026-wonder-system.md). The three-discipline scores are design critique, not external human ratings or runtime certification.

This is screenshot inspection plus source/heuristic review, not a usability study, child-development assessment, safety certification or broad compatibility claim. New code must be retested on the actual TV.
