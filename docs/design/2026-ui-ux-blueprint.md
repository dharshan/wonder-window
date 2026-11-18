# Wonder Window — 2026 UI/UX transformation blueprint

**Status:** Design proposal for owner and independent review; not an implementation claim.  
**Baseline:** `main` at `2d3f89fabfb07b2211f938f8476f3d033d63f4a3`.  
**Platform:** Native Android TV; standard remote only.  
**Direction:** Sky Garden evolved — picture-led magical world with premium living-room clarity.  
**Reusable creative system:** [Wonder System](2026-wonder-system.md) defines the shared world grammar, three realm identities, illustration language, Pip acting states, motion tokens, animation arcs and discipline scorecards. The [direct screenshot audit](2026-ui-ux-audit.md) records what is visible in the current baseline captures.

## 1. Product and design constraints

Wonder Window is a free, open-source, local-first Android TV experience for parent-approved media and short optional learning interactions. The child gets a calm, picture-led interface. Parents control content and screen-time settings. It is not an endless feed, commercial streaming service, general AI tutor or engagement-maximising product.

- Home order remains **PLAY → TRY → WATCH**. PLAY and TRY are first-party; WATCH is an optional provider boundary.
- Remote only: UP, DOWN, LEFT, RIGHT, OK, BACK. No child flow depends on touch, pointer, keyboard, voice recognition or phone.
- One shared screen-time manager owns the parent-configured budget. Warm-up, learning, game success and TRY completion never earn, unlock, extend or reduce minutes.
- Preserve D8/D9/D10/D11 decisions on `main`, public/family edition isolation, parent gate, provider terms and privacy constraints.
- No ads, purchases, tracking, profiling, child accounts, public chat, leaderboards, streaks, loot boxes, engagement manipulation or unnecessary data collection.
- No personal family data in design assets, mockups, tests or commits. Human review is mandatory for child-facing content.
- Do not claim educational, developmental, safety or accessibility validation without evidence.

## 2. Audience and age adaptation

Age bands are editorial guidance, not universal developmental claims. Use only parent-configured age band; never infer it from behaviour.

| Band | Interface | Content and feedback |
|---|---|---|
| **3–5** | One dominant task; 2–3 large choices; picture-first; short spoken sentence with visible equivalent; generous spacing | Concrete familiar objects; no timed response; neutral retry; adult-help cue |
| **6–8** | 3–4 choices where useful; short sentence-case labels; optional detail line; visible step cue | More varied puzzles and practical tasks; optional hint; concise explanation |
| **9–10** | Slightly denser shelves only when tested; optional detail; simple challenge selector | Multi-step reasoning and creation; no profile inferred from performance |

Keep one shared three-door home. Adapt content density and task complexity inside PLAY/TRY, not the primary home mental model. Parent accessibility settings override age defaults.

## 3. Experience principles

1. Picture before words; words reinforce rather than carry the only meaning.
2. One obvious next action; OK must have a predictable outcome.
3. Focus is the cursor: unmistakable through shape, edge, scale and contrast, not colour alone.
4. Stable geography: directional movement follows visible spatial relationships.
5. Calm, never coercive: no urgency, countdown pressure, autoplay previews, variable rewards or guilt copy.
6. Speech supplements the screen; audio is never the only route.
7. Parent controls remain separate from child navigation.
8. Offline honesty: distinguish loading, empty, offline and provider-error states.
9. Respect the living room: large targets, safe margins, restrained animation and no fine print.
10. Reuse the working native host; no framework rewrite for aesthetics.

## 4. Research synthesis — patterns to borrow, not copy

This is desk research and heuristic analysis, not field research or evidence of developmental efficacy.

| Reference | Useful pattern | Wonder Window translation | Do not copy |
|---|---|---|---|
| Apple TV / tvOS | Focused artwork, focus enlargement, safe areas, remote-first spatial navigation | TV-distance layout, safe margins, explicit focus map, large picture tiles | tvOS gestures/platform assumptions |
| Netflix Kids | Simplified child surface, parent-controlled profile/maturity boundary | Separate child and parent surfaces; parent owns content access | Endless recommendations, autoplay previews, account assumptions |
| YouTube Kids | Parent-managed content settings and age/content modes | Make parent approval legible; preserve provider boundary | Open search or uncontrolled recommendations |
| Duolingo | Small task framing and immediate understandable feedback | One task per screen; kind retry; progress as orientation | Streaks, gems, daily-return pressure, reward loops |
| Khan Academy Kids | Warm illustration, varied learning domains, supportive character | Pip as a quiet guide; distinct subject families | Dense curriculum UI or unsupported outcome claims |

Sources and caveats:
- Apple: [Designing for tvOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-tvos), [tvOS safe areas](https://developer.apple.com/design/human-interface-guidelines/layout), [focusable elements](https://developer.apple.com/documentation/UIKit/adding-user-focusable-elements-to-a-tvos-app).
- Netflix: [Parental controls](https://help.netflix.com/en/node/53045), [Kids profile](https://help.netflix.com/en/node/114275).
- Google: [Designing engaging apps for kids](https://developers.google.com/building-for-kids/designing-engaging-apps).
- YouTube: [YouTube Kids parent guide](https://support.google.com/youtubekids/answer/6130541).
- Duolingo ABC: [official product overview](https://abc.duolingo.com/) describes bite-sized phonics, stories and hands-on reading lessons; use task chunking and visual instruction as inspiration, not reward loops.
- Khan Academy Kids: [official product overview](https://en.khanacademy.org/kids) describes guided characters, varied learning domains and playful activities; use warmth and subject variety, not personalised learning paths or tracking assumptions.
- The six illustrated environment thumbnails are in `prototypes/environments-1920x1080.svg`: Dusk cinema hill, Puzzle garden, Meadow workbench, Underwater discovery, Space observatory and Forest trail.

These are heuristic references for task framing, feedback and illustration tone; no claim about Wonder Window achieving the same learning outcomes is made.
- Interfaces change. Recheck at implementation time. This is not an exhaustive competitive audit or a usability study.

## 5. Creative direction and visual identity

### Sky Garden

Keep the open blue sky, warm horizon, layered green hills, soft clouds, Pip the sparrow, Fredoka/Andika and gentle day/night transition. Foreground cards/windows must remain legible against the atmospheric backdrop. Pip is a guide, not a persistent prompt to continue.

### Three illustrated windows

- **PLAY — Puzzle Garden:** paths, patterns, oversized geometric pieces and discoveries. Orange identity.
- **TRY — Meadow Workshop:** paper, safe household materials, movement and nature observation. Green identity.
- **WATCH — Story Hill at dusk:** a quiet cinema window with a parent-approved collection cue. Violet identity.

### Environment concepts

| Environment | Best fit | Visual grammar | Guardrail |
|---|---|---|---|
| Sky Garden | Home/shared navigation | Sky, hills, clouds, warm horizon | Low detail behind text |
| Puzzle Kingdom | Logic/pattern games | Rounded paths, oversized shapes | No decorative clutter around answers |
| Nature Meadow | TRY/nature | Grass, leaves, daylight | Show safe, supervised materials only |
| Space Observatory | Science/space | Deep navy, planets, observatory | High-contrast answer surfaces |
| Dusk cinema hill | WATCH/resting | Deep dusk sky, framed screen, layered hill | No autoplay or busy motion |
| Underwater Discovery | Animals/nature | Teal, coral silhouettes, bubbles | No flashing or busy motion |
| Forest trail | Nature/observation | Layered trees, winding path, leaf canopy | Keep path and labels clear |
| Maker Studio/Lab | TRY making/science | Warm workbench, paper, cardboard | Materials and adult help explicit |

Pip remains the default original sparrow. Future original archetypes may include patient elephant, curious robot, brave lion, astronaut or inventor; these are concepts, not assets authorised for runtime use. Each character needs consistent silhouette, idle, welcome, thinking/help, focus-reaction and quiet poses. No copyrighted film characters, logos, voices or imitation artwork. Continue using `{buddy}` as the shared content placeholder.

## 6. Colour, contrast and type

### Semantic palette candidates

| Token | Value | Use |
|---|---|---|
| Ink | `#1F2547` | Primary text and outer focus edge |
| Ink soft | `#3D466A` | Supporting text on light surfaces |
| Sky / horizon | `#7CC6F2` / `#FFF3D6` | Day backdrop |
| PLAY | `#C24708` | PLAY surface candidate |
| TRY | `#286B43` | TRY surface candidate |
| WATCH | `#5140B8` | WATCH surface candidate |
| Focus sun | `#FFC94A` | Inner focus band |
| Focus glow | `#FFE07A` | Ambient halo only |
| Night | `#0F1638` / `#28306A` | Resting state |
| Paper | `#FFFFFF` | Cards/sheets |

Contrast acceptance: normal text ≥4.5:1; large text ≥3:1; meaningful focus/control boundaries ≥3:1 against adjacent colours. The following values are computed from the sRGB candidates using the WCAG relative-luminance formula; they are colour-pair calculations, not a claim that every UI state has been tested.

| Foreground | Background | Contrast | Decision |
|---|---|---:|---|
| INK `#1F2547` | Sky `#7CC6F2` | **7.93:1** | Pass normal text |
| INK `#1F2547` | Horizon `#FFF3D6` | **13.47:1** | Pass normal text |
| INK `#1F2547` | Paper `#FFFFFF` | **14.85:1** | Pass normal text |
| INK_SOFT `#3D466A` | Sky `#7CC6F2` | **4.91:1** | Pass normal text |
| INK_SOFT `#3D466A` | Horizon `#FFF3D6` | **8.34:1** | Pass normal text |
| White `#FFFFFF` | PLAY `#C24708` | **5.00:1** | Pass normal text |
| White `#FFFFFF` | TRY `#286B43` | **6.41:1** | Pass normal text |
| White `#FFFFFF` | WATCH `#5140B8` | **7.57:1** | Pass normal text |
| INK `#1F2547` | SUN `#FFC94A` | **9.69:1** | Pass; inner band/edge contrast |
| INK `#1F2547` | Sky `#7CC6F2` | **7.93:1** | Outer focus edge pass |
| INK `#1F2547` | Paper `#FFFFFF` | **14.85:1** | Outer focus edge pass |
| White `#FFFFFF` | Night `#0F1638` | **17.61:1** | Pass normal text |
| White `#FFFFFF` | Night lower `#28306A` | **12.20:1** | Pass normal text |

The gold band alone against white is only about 1.53:1; the dark outer edge is essential and must remain visible. White text on the previous PLAY candidate `#CC4E0A` is only 4.50:1 (no margin), so use the darker `#C24708` candidate. Do not use INK text on TRY/WATCH coloured fills. Recalculate after opacity, overlays, gradients, text rendering and TV calibration; final-state screenshots remain the acceptance evidence. Disabled is not unreadable: preserve text contrast and use an explicit icon/reason, not opacity alone.

### Type scale at 1920×1080

| Role | Size | Typeface |
|---|---:|---|
| Greeting | 52–60 px | Fredoka Semibold |
| Screen title | 48–56 px | Fredoka Bold |
| Primary card label | 44–52 px | Fredoka Bold |
| Card support | 28–34 px | Andika/Fredoka |
| Instructions | 32–40 px | Andika |
| Metadata | 24–28 px | Andika |
| Parent controls | 28–36 px | Andika |

Scale proportionally to 720p; critical text must not fall below 18 px rendered. Recheck 4K/OS scaling. Sentence case for child-facing copy; avoid all-caps primary labels.

## 7. Components and states

| Component | Default | Focused | Pressed | Disabled |
|---|---|---|---|---|
| Adventure door | 470–500 px square; picture first; short label + one line | 4 px INK outer + 8 px SUN inner; shadow; scale 1.04–1.06 | 80 ms squash to .97 then release | Full-contrast label; clear unavailable cue; no opacity wash |
| Picture tile | Paper surface, large art, title/tagline | Same two-tone ring; no clipping | Brief squash | Preserve image/text; explain unavailable |
| Primary action | Filled semantic surface, icon + verb | Two-tone ring | Same press timing | Legible; not focusable if unavailable |
| Secondary action | Paper surface, ink text/outline | Two-tone ring | Same press timing | Visible reason if child-relevant |
| Modal/sheet | Dim backdrop, one question | Initial focus on safe/reversible action; focus contained | Standard response | N/A |
| Progress | Dots/steps, orientation only | Current step distinguished by shape/label | No reward animation | Static when reduced motion |
| Pip | Small original pose, optional voice | Turns toward focused item once | One brief pose | Static idle/rest pose |

### Focus ring

Use a **4 px INK outer edge** plus an **8 px SUN inner band**, with a soft low-opacity shadow. The dark edge supplies luminance separation; gold preserves brand continuity. Apply across doors, tiles, game answers, sheets and parent controls. Keep the focus envelope inside safe areas and never clip it.

## 8. Home concept decision after review

The first home attempt added a masthead, “choose” label and text-only remote hint, shrinking the pictures. Reverse that decision:

- Remove masthead and section heading from child home; brand identity belongs in launcher artwork/app identity.
- Remove the text-only remote hint. Teach first-run remote use with an optional Pip-guided spoken/animated nudge, never a mandatory tutorial.
- Restore large doors, illustrations/icons, Pip and greeting. Three picture-led windows: puzzle garden, meadow workshop, story hill.
- Sentence-case labels and one short descriptor; text is subordinate.
- Resting WATCH retains moon/sleepy-Pip cue. Use night tint, full-contrast text; never fade the whole card.
- OK on resting WATCH shows large sleepy Pip and optional voice cue; do not rely on small amber text.
- Initial focus PLAY; explicit PLAY→TRY→WATCH graph; if TRY disabled, PLAY→WATCH.
- Pip may react once to the focused door after a short dwell.

See [home prototype](prototypes/home-1920x1080.svg).

## 9. Original prototype set

- [Home](prototypes/home-1920x1080.svg)
- [PLAY catalogue](prototypes/play-catalogue-1920x1080.svg)
- [PLAY round](prototypes/play-round-1920x1080.svg)
- [TRY activity](prototypes/try-activity-1920x1080.svg)
- [WATCH library](prototypes/watch-library-1920x1080.svg)
- [Parent settings](prototypes/parent-settings-1920x1080.svg)
- [Environment concepts](prototypes/environments-1920x1080.svg)
- [Character family and Pip poses](prototypes/character-family-1920x1080.svg)

These are original design concepts, not runtime screenshots or proof of implementation. See [technical implementation guidance](2026-technical-guidance.md) for rendering, asset and performance constraints.

## 10. Delivery phases and merge gate

1. **Design gate (this PR):** full audit, research, age-band direction, identity, palette/type, component states, screen specs, focus/BACK maps, motion and original mockups.
2. **Tokens/components PR:** implement semantic tokens, shared focus/card/button and reduced-motion behaviour with tests.
3. **Home reference PR:** picture-led windows, two-tone focus, Pip reaction and accessible resting WATCH.
4. **Screen-family PRs:** PLAY catalogue/rounds; TRY browse/preview/steps; WATCH library/player/pause/stop/resting; parent gate/settings; loading/error/offline.
5. **Device refinement:** CI plus separate review build and 1080p/720p captures for each slice; record exact device/API/remote paths.
6. **Merge:** green CI, Claude approval of final code diff, owner acceptance, safety/privacy review and real-TV evidence. CI alone is insufficient.

This design phase does not claim implementation, reduced-motion support, spoken public edition, completed child research or physical-TV validation by the author. Claude's previous device evidence applies to the earlier reviewed head and must be repeated after code changes.

## 11. Questions to validate

- Is the three-window home understood without text hints by non-readers?
- Does the two-tone ring remain distinct on multiple TV panels and themed backdrops?
- Which age-band adaptations genuinely help rather than add density?
- Is offline Android TextToSpeech present and acceptable on target TVs?
- Which themed environments improve orientation rather than add decorative noise?
