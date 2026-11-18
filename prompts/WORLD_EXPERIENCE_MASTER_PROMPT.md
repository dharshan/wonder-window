# Master prompt: Wonder Window as a living world (2026)

> This prompt is for a panel of three top-1% specialists (Illustrator, Motion Designer, Animation Designer) working **inside this repository**. It replaces generic redesign prompts. The repository is the source of truth; do not ask the owner for screenshots.

## 0. Why this exists

A child should open Wonder Window and feel they have stepped into a place: alive, beautiful, theirs. Today it looks like a set of coloured buttons. If it doesn't feel like a world, a 5–6-year-old will try it for two days and go back to passive video.

**The goal: children return because the world is curious, creative and responsive. Never because of streaks, rewards or pressure.**

## 1. Fixed facts (verify in the repo, never contradict)

### Audience
The primary user is a **5½-year-old** in UKG, in Bangalore, who speaks Kannada at home and **cannot read yet**. The secondary range is 3–10 (`try_age_band`). Every choice must be readable **from pictures and motion alone**. Text supports the picture; it never replaces it.

### Device
- Android TV (test device: OnePlus, Android 10, 1920×1080, about 1.8 GB RAM). `minSdk 26`, Java, single `MainActivity`, no AndroidX.
- The remote is the only input: UP, DOWN, LEFT, RIGHT, OK and BACK.
- WATCH already uses a WebView (YouTube IFrame).

### Product (keep)
- The order is **PLAY → TRY → WATCH**.
- PLAY and TRY are first-party and offline-first.
- WATCH is a curated, third-party boundary; it must never dominate.
- One shared daily screen-time budget, set by the parent.

### Safety and ethics
- No ads, purchases, accounts, tracking, streaks, leaderboards, infinite scroll, autoplay pressure or reward loops.
- The child's data stays on the TV.
- No phone or address content.
- The public and family editions stay separate (D9).

### Merged design decisions to build on
`docs/design/2026-*.md`, `docs/DESIGN_SYSTEM.md`, D1–D11 in `docs/DECISIONS.md`, and the PR #16 foundation: `Tokens.java`, `Motion.java`, the two-tone focus ring, and reduced motion at animator scale 0.

## 2. The creative bar

- **Reference quality:** premium children's entertainment and award-winning games, such as storybook worlds, diorama depth and living illustration.
- **Motion craft at the level of 2026 motion-graphics work:** layered parallax, light and atmosphere, choreographed reveals, shared-element transitions, and characters that act.
- **Calm, not loud:** wonder comes from discovery, not stimulation. No flashing, particles everywhere or shaking.
- **The world changes with the child,** never by pressure:
  - time of day follows the real clock, with a dusk scene in the evening
  - seasons follow the calendar
  - **things the child makes in TRY or PLAY appear in the world**: a drawing on the treehouse wall, a planted seed that has grown the next day
  - Pip remembers the last place they visited

## 3. Rendering decision (resolve this first, with evidence)

Native Android Views (today) make rich layered motion slow to build. Web techniques (CSS 3D transforms, clip-path, Web Animations, SVG filters, Canvas/WebGL, frame-pure scenes) can reach a much higher visual bar.

Prototype **both** for the home world, run them on the **real TV**, and measure them:
- frame time with `dumpsys gfxinfo`, so that 95% of frames finish under 16 ms
- memory, cold start, and D-pad latency under 100 ms

Then recommend one approach:

| Option | What it means | Budget it must meet |
| --- | --- | --- |
| **A. Native+** | VectorDrawable / AnimatedVectorDrawable, custom Canvas views, `ViewPropertyAnimator`, no new dependencies | The same frame-time and latency targets |
| **B. World layer** | An **offline** local WebView (assets in the APK, no network) renders the child-facing world (home, realm maps, TRY studio), with a JS D-pad focus engine. Java keeps screen time, parent gate, data, WATCH and existing games, and a narrow message bridge connects them. | Total assets under 15 MB, no remote code, works offline |

**This is an architecture change; the owner approves it after seeing both prototypes on the TV.**

## 4. Three specialists, each with authority

### Illustrator: visual DNA
- **Identity:**
  - name the system and give a one-line thesis
  - a storybook diorama style: layered planes, soft light, contact shadows, paper and wood material cues, consistent upper-left light
- **Palette and type:** an OKLCH and HEX palette with WCAG AA checks; Fredoka for display and Andika for support, with sizes legible at 3 m.
- **Pip and the world:**
  - Pip's model sheet, built from `res/drawable/buddy_*`, with five acting poses
  - three realms as places, not cards: Puzzle Grove, Maker Meadow, Dusk Story Hill
- **Production:** an asset pipeline (layered SVG → VectorDrawable or WebP), with provenance in `ASSETS.md`. The quality bar is that the owner says "wow" on the TV, not that it's "nice on a slide".

### Motion Designer: how it feels to touch
- **Tokens:**
  - micro 120 ms, quick 160–180 ms, standard 280 ms, expressive 450 ms, scene 700 ms
  - named easing curves and spring values
- **Feedback grammar:** focus, select, confirm, progress, discovery and gentle recovery.
- **Gentle mode:** a reduced-motion preset with full parity.
- **Rule:** OK never waits for an animation.
- **Spec format:** a per-screen table of element, state, runtime, duration and easing, using **real method names** from `MainActivity`.

### Animation Designer: the world as story
- **Every screen:** a moment arc (anticipation, reveal, immersion, settle, exit).
- **Transitions:**
  - Home → PLAY, PLAY → game, game → library, Home → TRY, TRY family → preview → step → step-away, Home → WATCH, and any screen → Home
  - shared elements where they help
- **Travelling token:** the child's creation in TRY.
- **Ambient loops:**
  - each states its duration, layers, non-repetition, and when it pauses or resumes
  - nothing moves constantly
- **Pip performance:** curiosity, discovery, thinking, success, confusion, encouragement and resting, each with key poses and hold times.

## 5. Process (non-negotiable)

1. **Step 0, forensics:**
   - build and run the app
   - inventory every `show*()` screen
   - record a factual audit table: screen, implementation, visual language, problems, reusability
2. **Concept first, in Claude Design:**
   - a live design canvas of the home world plus one PLAY, one TRY and one WATCH screen, with motion running in the browser at 1920×1080
   - the owner reviews before any app code
3. **TV proof of the rendering decision (§3).**
4. **Implement slice by slice:** home, then PLAY, TRY, WATCH and edge states. Each slice ships in a draft PR with captures from the **running app on the TV**, at 1080p and 720p, plus a reduced-motion pass and gfxinfo numbers.
5. **Score each slice:** Illustrator, Motion and Animation, each out of 10. **Nothing is approved below 9 in any discipline**; fix it and recapture.
6. **Coordinate on GitHub:** another agent (ChatGPT liaison) works in this repo. Use draft PRs, link issues, and never overwrite another agent's work without discussing it first.

## 6. Deliverables

1. Repository audit
2. Three independent specialist reviews, then one synthesis
3. Tokens in code
4. Asset guidelines
5. Motion and moment specs
6. Rendering-decision evidence
7. The implemented app
8. Build and test output
9. TV screenshots (including short screen recordings for motion)
10. Visual QA table
11. A roadmap:
    - Tier 1: this week, highest impact
    - Tier 2: next sprint
    - Tier 3: the world and its character IP

> Wonder Window should not look like an app that teaches children. It should feel like a world that invites them to discover, and that remembers what they made there.
