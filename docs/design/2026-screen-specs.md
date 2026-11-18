# Screen-by-screen UX specifications

These specifications describe intended behaviour, not implemented features.

## Visual prototype mapping
- Splash, loading, empty, offline, error, first-run nudge, success and resting: `prototypes/screen-states-1920x1080.svg`.
- Game instruction, game completion, WATCH player/pause and TRY family browse: `prototypes/coverage-supplement-1920x1080.svg`.
- Parent gate/settings: `prototypes/parent-settings-1920x1080.svg`.
- Motion/reduced-motion: `prototypes/motion-storyboard-1920x1080.svg`.

## Prototype coverage and render evidence
The coverage supplement supplies five compositions identified in review: game instruction (Start/Hear again/Back), game completion (Play again/Choose another/Home), WATCH player, WATCH pause and TRY family browse. The eight remaining state concepts are shown on the screen-states board. These are design compositions, not runtime captures. Exact-head 1920×1080 and 1280×720 raster captures remain pending independent review; source dimensions alone are not render evidence.

## Parent gate interaction proposal (not implementation approval)
The gate must be adult-directed, not a child-facing arithmetic puzzle. Proposed sequence: hold OK for 3 seconds on a clearly labelled “For grown-ups” entry; show a parent-set 4-digit PIN entered with the D-pad; accept D-pad input; BACK always returns to child home. Do not expose settings before success. This proposal collects no PIN, phone number, account or personal data. A first-run addition prompt may be offered only as a temporary fallback; it is not a sufficient security boundary for older children; owner/security approval is required before implementation, and a configurable parent PIN would require a separate privacy/security decision.

## Shared shell
- 16:9 TV canvas; 1920×1080 design target; critical content within 5% safe margin pending device overscan test. At 1280×720, essential child-facing labels, WATCH titles/metadata and parent controls are at least 18 px rendered (27 px at 1920×1080 under uniform 2/3 scaling). Smaller decorative copy is non-critical only.
- Low-detail Sky Garden atmosphere, one focused item at a time.
- UP/DOWN/LEFT/RIGHT move among visible enabled controls; OK activates; BACK follows the map.
- First focus is the first useful action. Every state has a static equivalent.
- 720p/1080p/4K scaling preserves readable type and focus bounds.

## 1. Launch / splash
Static familiar welcome, no mandatory sign-in/profile/tutorial. No personal data or network needed. Reconcile session meter before home. Catalogue failure moves to explicit empty/offline state.

## 2. Child home
Pip welcome + three illustrated windows, fixed PLAY → TRY → WATCH order. No masthead, choose heading or text-only remote hint. Picture carries meaning; sentence-case labels support it. Initial focus PLAY. TRY enabled: PLAY RIGHT→TRY→WATCH; disabled: PLAY RIGHT→WATCH. Boundaries stay; UP/DOWN do not jump to decoration. BACK is safe/no-op, never reset. Resting WATCH retains moon/sleepy Pip and full-contrast text.

## 3. PLAY catalogue
Distinct original pictograms, real game art and short taglines. No generic dice, lone star or blank art. Focus enlarges modestly without collision; scrolling keeps it visible. Initial focus first game. LEFT/RIGHT within shelf; UP/DOWN nearest adjacent shelf. BACK restores PLAY. Every real tile maps to its actual title/art/tagline; prototype art is not substitute catalogue metadata.

## 4. Game detail / instruction
One large scene, one short goal, 1–3 visual steps. Start is initial focus; Hear again secondary; Back returns to catalogue and restores selection. Voice optional; visible instruction remains complete.

## 5. Game round
One task per screen; large picture answers with short labels. Initial focus first answer, not sound. Prompt spoken on entry only if sound enabled and offline voice engine ready. Wrong answers allow kind retry/hint. No timer pressure, score-first layout, streak, leaderboard or reward currency. Age bands change choice count/density/task depth. Every answer image must match its semantic label.

## 6. Game completion
One calm acknowledgement and optional reflection. Actions Play again / Choose another / Home; no score economy or pressure. Default focus Choose another or Home.

## 6A. Achievements / badges — intentionally no dedicated screen
No streaks, leaderboards, loot boxes, reward currency, badge shelf or engagement pressure. Completion may show a brief non-transactional acknowledgement only; no persistent performance profile, unlocks or pressure to return.

## 7. TRY browse
Families: move, make, nature, think, help, connect, calm. Distinct pictograms; age band controls density/copy. BACK returns home preserving TRY.

## 8. TRY preview / prepare
One illustration, concise invitation, material pictograms and explicit supervision cue (“Grown-up nearby”, “Grown-up helps” or “Do together”). Hazards and safe alternatives explicit.

## 9. TRY step-away / return
Visual sequence and “Now try it away from the TV”. Away-from-TV activity time is not charged; TV instructions/navigation remain charged by shared meter. Return optional; no proof, score or countdown.

## 10. WATCH library / player / pause / stop
Parent-curated row order; no “Picked for you”, behavioural ranking or hidden preference model. Actual RSS thumbnails are 16:9; clamp titles and protect text over busy images. Distinguish empty/offline/provider error. Pause/stop sheet has reversible first action. No open search/autoplay path.

## 11. Session end / resting / parent
Night palette, moon/sleepy Pip, full-contrast text; no guilt/reward. No child-reachable reset. Parent gate proposal requires owner/security approval before implementation. Parent settings group child experience, limits, WATCH library, TRY, accessibility, privacy/data and about; destructive actions require second confirmation.

## Cross-screen states
| State | Required design | Acceptance |
|---|---|---|
| Loading | Calm Pip/skeleton, honest label | No indefinite spinner/fake focus |
| Empty | Explain and offer safe action | No blank screen |
| Offline | Preserve local features | Retry/BACK only |
| Error | Plain language | Recoverable without data loss |
| Disabled | Full contrast + symbol/reason | Never opacity-only |
| Reduced motion | Static focus/transition/mascot | Same navigation/meaning |
| Long text | Bounded wrap | No critical clipping |
| Resolutions | 720p/1080p/4K | No overlap; same focus graph |
