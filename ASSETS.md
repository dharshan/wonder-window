# Asset provenance and licences

Every non-code file the app ships, where it came from and its licence. Add a row when you add an asset.

| Asset | Path | Source | Licence |
|---|---|---|---|
| Fredoka (variable) | `app/src/main/assets/fonts/Fredoka.ttf` | Google Fonts, Fredoka project | SIL Open Font License 1.1 |
| Andika Bold | `app/src/main/assets/fonts/Andika-Bold.ttf` | SIL International | SIL Open Font License 1.1 |
| Sound effects | `app/src/main/assets/sfx/*.wav` | Synthesized by project code | MIT |
| Buddy poses, clouds, hills, banner, launcher | `app/src/main/res/drawable/*.xml`, `res/mipmap-anydpi-v26/` | Original project vectors | CC BY 4.0; mascot/name also covered by TRADEMARKS.md |
| Emoji in game content | TV system emoji font | Not shipped | Device font licence |
| Game, TRY and warm-up text | `app/src/main/assets/*.json` | Written for this project | CC BY 4.0 |
| Channel list | `catalog/channels_v2.json` | Public channel IDs + project-authored row text | Row text CC BY 4.0 |

Not shipped: macOS `say` voice clips (redistribution rights unverified); RSS titles/thumbnails (locally fetched into git-ignored catalogue).

## Design prototypes
All are original project-authored CC BY 4.0 design-only vectors. Pip reuses the existing project bird silhouette, brown cap, cream face, marigold and wing markings from the CC BY 4.0 `buddy_*.xml` assets on `main`; no mascot redesign or third-party character artwork is introduced.

| Asset | Path | Source / status |
|---|---|---|
| Home | `docs/design/prototypes/home-1920x1080.svg` | Existing Pip anatomy + original illustrated windows; concept only |
| PLAY catalogue | `docs/design/prototypes/play-catalogue-1920x1080.svg` | Distinct original activity illustrations; concept only |
| PLAY round | `docs/design/prototypes/play-round-1920x1080.svg` | Frog/fish/duck semantic answer art; concept only |
| TRY | `docs/design/prototypes/try-activity-1920x1080.svg` | Original material pictograms and steps; concept only |
| WATCH | `docs/design/prototypes/watch-library-1920x1080.svg` | Varied sample 16:9 thumbnails modelling RSS layout; concept only |
| Parent | `docs/design/prototypes/parent-settings-1920x1080.svg` | Adult-flow concept; concept only |
| Environments | `docs/design/prototypes/environments-1920x1080.svg` | Six differentiated worlds; concept only |
| Pip poses | `docs/design/prototypes/character-family-1920x1080.svg` | Existing Pip anatomy and reaction study; concept only |
| Screen states | `docs/design/prototypes/screen-states-1920x1080.svg` | Splash/instruction/feedback/loading/empty/offline/error/onboarding; concept only |
| Motion storyboard | `docs/design/prototypes/motion-storyboard-1920x1080.svg` | Focus/press/transition/Pip/static fallback; concept only |

“DESIGN CONCEPT” labels are documentation-only and must never become runtime chrome. Production assets require separate accessibility, performance, provenance and licensing review.
