# Wonder Window design system — design gate

See `docs/design/2026-ui-ux-blueprint.md`, `2026-screen-specs.md` and `2026-navigation-motion.md` for the full specification.

- **Direction:** Sky Garden evolved; picture-led illustrated world with calm premium living-room finish.
- **Home:** three illustrated doors; no masthead, extra heading or text-only remote hint.
- **Order:** PLAY → TRY → WATCH.
- **Remote:** UP/DOWN/LEFT/RIGHT/OK/BACK only.
- **Focus:** proposed 4 px INK outer + 8 px SUN inner ring; no colour-only state.
- **Copy:** sentence case; picture before words; one short support line.
- **States:** default/focus/press/disabled/loading/empty/error/resting as applicable.
- **Voice:** optional; visual parity is mandatory.
- **Safety:** no pressure, ads, tracking, streaks, rewards or child-reachable reset.
- **Assets:** provenance and licence in `ASSETS.md`.

Proposed palette: INK `#1F2547`, INK_SOFT `#3D466A`, SKY `#7CC6F2`, HORIZON `#FFF3D6`, PLAY `#C24708`, TRY `#286B43`, WATCH `#5140B8`, SUN `#FFC94A`, NIGHT `#0F1638/#28306A`, PAPER `#FFFFFF`. Computed candidate-pair contrast values are documented in the blueprint; every final rendered state still requires measurement and device review.

At 1920×1080: greeting 52–60 px, screen title 48–56 px, primary labels 44–52 px, support 28–34 px, instructions 32–40 px, metadata 24–28 px. Fredoka for greeting, screen titles, card labels and short display text; Andika for instructions, supporting copy and metadata. 720p critical text ≥18 px rendered; essential labels are authored at ≥27 px in 1080p SVGs for the 2/3 720p scale.

Motion: focus 160 ms; press 80 ms; transition 220 ms + 8 px rise; Pip reacts once; clouds ≤8 px/s. Animator duration scale 0 means static.

Implementation sequence: approve design package first; then tokens/shared focus/card/button; then home reference; then screen families. CI and real-TV evidence are required per implementation slice.
