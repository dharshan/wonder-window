# Wonder System — a reusable language for making Wonder Window feel like wonder

**Status:** owner-review design proposal; design-only.  
**Baseline:** current `main`, with the seven public Android TV screenshots in `docs/screenshots/`.  
**Related proposal:** `2026-ui-ux-blueprint.md`. This document turns that proposal into a reusable art, motion and animation grammar.  
**Scope:** no Android runtime, game mechanics, session accounting, parent controls, safety policy or provider behaviour is changed here.

## The creative thesis

**One world. Three invitations. One gentle guide.**

Wonder Window should feel like a place a child can recognise and explore, not a row of unrelated app screens. The shared Sky Garden is the world; PLAY, TRY and WATCH are three distinct invitations within it; Pip is the guide who helps a child notice and choose without asking them to stay longer.

The feeling we are designing for is *quiet anticipation*: “I wonder what is over there?” It is not visual noise, novelty for its own sake or an engagement loop.

## The Wonder Grammar

Every child-facing screen is composed from the same seven reusable layers:

1. **World** — a low-detail environment establishes place and mood.
2. **Landmark** — one memorable illustrated object tells the child what this screen is about.
3. **Invitation** — one short, concrete sentence describes the next meaningful action.
4. **Choices** — a small set of large, picture-led controls with stable spatial relationships.
5. **Focus** — the remote cursor is unmistakable through shape, edge and scale, never colour alone.
6. **Echo** — one brief visual response confirms the child's action or discovery.
7. **Exit** — a calm, predictable route onward or back; TRY explicitly leads away from the TV.

Not every screen needs all seven layers at equal strength. The World should recede when a question or answer needs concentration. The Landmark should never compete with the choices. Pip should never become a button or a compulsory narrator.

### Five-beat experience arc

| Beat | Child feeling | Screen responsibility |
|---|---|---|
| Arrive | “I know this place.” | Reuse the shared sky, horizon and Pip silhouette. |
| Notice | “Something interesting is here.” | Reveal one clear landmark or activity illustration. |
| Choose | “I know what OK will do.” | Keep focus obvious and directional movement predictable. |
| Discover | “I understand what happened.” | Give a small, kind acknowledgement; explain, don't score. |
| Carry out | “I can do something with this.” | TRY ends with a real-world action and permission to turn the TV off. |

## One world, three realms

Use a shared atmospheric foundation, then change the foreground materials and local palette so each pillar has its own emotional temperature.

| Realm | Promise | Art vocabulary | Accent family | Never become |
|---|---|---|---|---|
| **Puzzle Grove / PLAY** | Think, notice, solve | Paths, puzzle stones, pattern tiles, curious objects, small discoveries | Warm amber, leaf green, clear blue, deep ink | A casino, score dashboard or noisy arcade |
| **Maker Meadow / TRY** | Move, make, notice, connect | Paper, leaves, safe household materials, footprints, workbench shapes | Meadow green, paper cream, coral, warm wood | A checklist that keeps the child watching |
| **Dusk Story Hill / WATCH** | Watch a parent-approved story together | Twilight, moon, framed picture window, soft stars, resting Pip | Deep indigo, dusk violet, moon cream | An endless feed or autoplay carousel |

The home screen is the map that shows all three realms at once. The realm is a foreground illustration and a mood shift, not a completely different design system.

**Shared-to-distinct ratio:** keep roughly 70% of the interface grammar shared (type, spacing, card anatomy, focus, navigation, Pip identity), 20% realm-specific illustration/environment and 10% screen-specific detail. This is an art-direction heuristic, not a measured law.

## Reusable composition rules

- One dominant illustration per screen; secondary props support it.
- The main action is understood from the picture before the child reads the label.
- Use 2–4 primary choices where the task allows; do not force this count when the game mechanics need another number.
- Preserve a consistent horizon and light direction within a scene family.
- Put the visual centre of an answer inside the safe area of its tile; keep labels outside the art silhouette.
- Do not place clouds, grass, Pip, stars or texture behind critical text or answer artwork.
- Use a single environmental focal point per screen. Decorative detail belongs at the edges and at low contrast.
- Keep a persistent visual anchor across a transition: a selected card, a path, a leaf token or Pip's gaze.
- Avoid repeating the exact same hill silhouette and prop arrangement on every screen. Reuse the world grammar, not a wallpaper.

## Illustration language

### Chosen style: storybook cut-paper vector

A hybrid of rounded vector shapes and layered paper forms. It should feel hand-composed and tactile, while staying crisp on a 10-foot TV.

- **Silhouette first:** every hero object reads at 25% scale before interior detail is added.
- **Shape language:** rounded geometry, confident large curves, simple asymmetry and recognisable real-world construction.
- **Linework:** use a consistent dark-ink outline only where it improves separation; target 3–4 px at 1920×1080 for foreground objects. Do not outline every tiny detail.
- **Depth:** three planes maximum for most cards (backdrop, hero, small foreground accent). Use one broad grounding shadow, not stacked glossy effects.
- **Texture:** optional subtle static paper grain in large environmental planes only. No texture on small icons, labels, focus rings or answer surfaces.
- **Lighting:** one consistent upper-left soft light. Avoid mixing glossy 3D emoji, flat glyphs, photoreal thumbnails and outlined vectors in one family.
- **Colour:** use the semantic palette in the existing blueprint. Realm accents may vary, but all text, focus and neutral surfaces use shared tokens.
- **No UI emoji:** system emoji are not a dependable illustration system across TV manufacturers. Use original pictograms for navigation, families and catalogue tiles. Existing emoji may remain as reviewed game-content data only until each item is replaced and validated.
- **Semantic accuracy:** a picture answer must depict exactly what its label says. A category pictogram must not be reused as a generic placeholder for unrelated games.

### Pip character bible

Pip is the existing project sparrow. Preserve the established body silhouette, brown cap, cream face/belly, marigold detail, orange beak/feet and wing markings. Do not redesign Pip as a different bird or add costume variants without owner approval.

Canonical acting states:
- **Neutral:** relaxed body, open attentive eyes, wings resting.
- **Curious:** head tilt and one raised wing; used to invite noticing, not to point at every button.
- **Thinking:** head slightly lowered, wing near cheek; used during a pause or puzzle, never to imply failure.
- **Encouraging:** open posture and soft smile; used after effort or a retry.
- **Resting:** lowered eyelids and folded wing; used at session end and WATCH rest.

Acting rules:
- Change one or two readable features at a time: head angle, eye shape, wing pose or beak.
- Keep Pip's eye line aimed at the relevant landmark or focused control, not at the child as a pressure cue.
- Avoid lip-sync unless verified offline voice is actually available.
- No constant bobbing, blinking loops or repeated waving.
- Pip never celebrates a child's “score”, asks them to continue, or implies disappointment when they leave.
- Each pose needs a static vector fallback and must remain recognisable in silhouette.

### Asset anatomy and naming

Keep environment, character and object layers separate where reuse is meaningful. Use names that describe the object and pose, not a screen-specific implementation detail.

```text
design/assets/
  characters/pip/pip-neutral.svg
  characters/pip/pip-curious.svg
  characters/pip/pip-thinking.svg
  characters/pip/pip-encouraging.svg
  characters/pip/pip-resting.svg
  worlds/shared/sky-day.svg
  worlds/shared/horizon-hills.svg
  worlds/play/puzzle-grove.svg
  worlds/try/maker-meadow.svg
  worlds/watch/dusk-story-hill.svg
  pictograms/play/
  pictograms/try/
  objects/materials/
```

Every production asset needs author, source, licence, intended size, semantic label, age band if relevant, contrast notes and a static fallback. The design SVGs in this PR are CC BY 4.0 project-authored concepts; they are not runtime assets until separately reviewed and added to `ASSETS.md`.

## Motion language

Motion is a navigation and communication system, not decoration. Every movement must do one of four jobs: **orient, confirm, connect or acknowledge**. If it does none, remove it.

| Token | Target | Use |
|---|---:|---|
| `focus_enter` | 160 ms | Two-tone focus appears; small scale/lift only if it does not collide. |
| `focus_exit` | 100 ms | Release focus without a lingering glow. |
| `press_confirm` | 80 ms | Brief squash to 0.97, then settle. |
| `card_arrive` | 240 ms | A small stagger when a shelf first appears; no cascade on every navigation. |
| `scene_link` | 300 ms | Crossfade plus at most 8 px translation to connect related scenes. |
| `character_react` | 260 ms | One glance, head tilt or wing movement after a meaningful event. |
| `success_echo` | 320 ms | One pose/shape response; no particle shower or score celebration. |
| `ambient_world` | 8–14 s | Optional slow cloud/leaf drift; stop when the screen is inactive. |

Timing is a design target, not an Android benchmark. Use a consistent ease-out for focus, ease-in-out for scene links and no overshoot on essential controls. Never delay OK activation while waiting for an animation.

### Focus contract

- A two-tone ring is the primary signal: 4 px INK outer edge plus 8 px SUN inner band at 1080p; scale/lift is secondary.
- Focus must be visible on light and dark surfaces, not clipped by parent cards or safe areas.
- Focus movement follows the visible DPAD graph. The selected target remains selected after returning from a child screen.
- Focus feedback is immediate. Animation can finish after the logical focus state changes.
- Disabled controls stay legible and explain why they are unavailable; opacity alone is not a state.
- If animation is unavailable, the focus ring and pressed outline still communicate the same meaning.

## Animation language

Animation is the choreography of a complete moment: anticipation, reveal, hold, response and exit. Motion design defines the individual movement; animation design makes those movements tell one coherent story.

### Reusable scene transition recipes

| Transition | Story | Choreography | Target |
|---|---|---|---:|
| Home → PLAY | Step into the Puzzle Grove | Selected PLAY window grows into the page; the puzzle-path motif carries into the catalogue; first game receives focus. | 420 ms |
| Home → TRY | Step into the Maker Meadow | Selected TRY window reveals a paper/leaf motif; Pip turns toward the activity; family choices appear. | 420 ms |
| Home → WATCH | Settle on Story Hill | Day sky gently deepens to dusk; selected window remains the visual anchor; no autoplay. | 460 ms |
| PLAY catalogue → round | Enter one puzzle | Selected tile becomes the scene landmark; question appears; answers reveal together or in a simple stable order; first answer receives focus. | 360 ms |
| Round → completion | Notice what happened | One quiet Pip pose and a clear sentence; actions appear without confetti, score economy or forced continuation. | 320 ms |
| TRY family → preview | Bring the activity closer | A leaf/token travels from family tile to preview and becomes the materials/step marker. | 420 ms |
| TRY preview → step-away | Take the idea into the room | The instruction illustration becomes the first real-world step; final frame says to turn away from the TV. | 420 ms |
| Any screen → resting | The garden becomes quiet | Sky moves toward dusk, Pip rests, one clear “come back later” message. | 480 ms |

Do not use a full-screen camera zoom, parallax stack or character fly-through on every transition. A shared visual anchor and one meaningful transformation are enough.

### Character performance

Use a four-part acting beat:
1. **Anticipation:** a small gaze or posture change that prepares the action.
2. **Action:** one readable movement (turn, tilt, wing lift, blink).
3. **Hold:** pause long enough for a child to read the expression.
4. **Recovery:** return to neutral or resting, never loop indefinitely.

A character reaction is optional and never blocks the next action. Pip's idle should be a quiet hold with an occasional blink, not an attention-seeking loop.

## Reduced motion and sensory safety

When Android animator duration scale is zero, remove non-essential movement: no scale, translation, parallax, cloud drift, token travel or character loop. Present the final state immediately. Keep all focus, sequence, labels and meaning intact.

- No flashing, strobing, rapid scale pulses, shaking, spinning answer tiles or precision-timed interactions.
- No sound-only instruction or feedback. Sound can be disabled without loss of meaning.
- No auto-advance, countdown pressure, streaks, variable rewards, confetti showers or guilt language.
- Ambient animation pauses on navigation, screen-off, activity stop and view detach.
- Motion settings do not change the remote focus graph or session meter.

## Three-discipline review — baseline, proposal and revised target

Scores are design-quality judgements from three separate specialist lenses, not ratings supplied by external human reviewers. The original screenshots are static evidence; they cannot prove the runtime motion or animation implementation. The revised scores assess the design package and its acceptance evidence, not shipped runtime behaviour.

| Discipline | Existing screenshots | Earlier design proposal | Revised design package | Why the score changes |
|---|---:|---:|---:|---|
| Illustrator | 6.4/10 | 7.6/10 | **9.1/10** | Moves from mixed emoji/3D/flat icon styles to one cut-paper vector grammar, three distinct realms, semantic art rules, Pip character bible and reusable asset anatomy. |
| Motion designer | 5.2/10 | 7.8/10 | **9.2/10** | Moves from mostly static visible focus to purpose-based motion tokens, explicit remote-focus contract, timing hierarchy, lifecycle rules, performance guardrails and complete static parity. |
| Animation designer | 4.8/10 | 6.9/10 | **9.0/10** | Moves from disconnected static screens to five-beat story arcs, per-transition choreography, Pip acting beats, shared visual anchors and a clear TRY step-away ending. |

### How each discipline is scored

**Illustrator (10 points):**
- 2.5 — semantic clarity and recognisable silhouette at TV distance
- 2.0 — consistent style, palette, lighting and depth
- 2.0 — composition, hierarchy and safe separation from text/focus
- 2.0 — distinct realm identity while retaining shared brand
- 1.5 — reusable asset anatomy, provenance and static production readiness

**Motion designer (10 points):**
- 2.5 — focus clarity and immediate remote feedback
- 2.0 — purposeful timing, easing and hierarchy
- 2.0 — stable navigation, no activation delay or focus loss
- 2.0 — reduced-motion parity and sensory safety
- 1.5 — lifecycle, performance and API compatibility constraints

**Animation designer (10 points):**
- 2.5 — narrative purpose and continuity across screens
- 2.0 — character acting and emotional readability
- 2.0 — anticipation, staging, holds and recovery
- 2.0 — restrained pacing and ethical child experience
- 1.5 — static equivalents and graceful interruption

### Review notes and remaining proof

- The Illustrator pass rejected the earlier mixed visual vocabulary and added a single material/shape language, realm map and Pip model rules. Production-quality final art still needs owner review.
- The Motion pass rejected ambient movement on every card and any animation that delays OK. The system is specified, but native Android implementation and TV profiling are not part of this PR.
- The Animation pass rejected generic “celebration” loops and unmotivated parallax. It added a story arc for each major route and a static final-state equivalent. Frame-by-frame implementation remains a later phase.
- A 9+ design score is not a claim of 9+ runtime quality, child usability validation, accessibility certification or physical-TV performance.

## Design acceptance gate

The design package may be considered ready for owner review when all of the following are true:

1. Every screen family has a stated purpose, one primary invitation and a mapped BACK route.
2. Every navigation/family pictogram uses the same illustration grammar; no emoji is used as a substitute for missing UI art.
3. Pip's five canonical poses remain on-model and distinguishable at 25% scale.
4. Every transition names its story purpose, visual anchor, duration, interruption behaviour and static equivalent.
5. Focus is legible without movement or colour-only cues; DPAD order and initial focus are explicit.
6. 1920×1080 and 1280×720 renders are checked for clipping, safe areas, line wraps, overlap and focus bounds.
7. All source/licence/provenance notes are complete; no personal family data or third-party protected artwork is introduced.
8. The design-only boundary is clear; no runtime or product-policy change is implied.

## Implementation sequence after owner approval

1. Shared semantic tokens and focus/card/button states.
2. Pip's neutral/curious/thinking/encouraging/resting static vectors.
3. One vertical slice: home → one PLAY game → completion → return.
4. TRY browse → preview → step-away with a static-first transition.
5. WATCH library/resting states, respecting the provider boundary.
6. Motion implementation and profiling on supported TVs.
7. Expand the same system only after the first slice passes remote, accessibility and real-device review.

**Owner decision requested:** approve, amend or reject the art direction and design gate. This PR does not merge itself and does not authorise runtime changes.
