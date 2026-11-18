# Decision record

Decisions made in issue #1 (scaffold review, 18 Nov 2026). Newest last. A change to any of these needs a new entry and a linked issue.

| # | Decision | Date | PR |
| --- | --- | --- | --- |
| D1 | Home order is **PLAY → TRY → WATCH**. PLAY and TRY are first-party; WATCH is an optional provider boundary. Supersedes the WATCH-first order of brief v1.1. | 18 Nov 2026 | this PR |
| D2 | The app's runtime content formats are the source of truth; each loaded file has a versioned schema and every record is validated. The scaffold intake schemas are a separate authoring format. | 18 Nov 2026 | #4 |
| D3 | Add TRADEMARKS.md, YouTube compliance notes, release signing with SHA-256 checksums, and an Android build in CI (merge gate for the import). | 18 Nov 2026 | #3, #4, signing pending |
| D4 | No family data in the repository; shared content uses `{buddy}`, default mascot Pip; every asset has provenance in ASSETS.md; generated voice is not redistributed. | 18 Nov 2026 | #4 |
| D5 | Public content contains no address recital and no real-phone-number exercise; no phone value is read, hashed or embedded in any edition. The public 1-1-2 help-number round stays. | 18 Nov 2026 | #3 |
| D6 | Quizzes and the warm-up never set, unlock or extend minutes. WATCH sessions use the parent's fixed length within the one shared daily budget; the warm-up is an optional PLAY activity. | 18 Nov 2026 | this PR |
| D7 | macOS voice and TV-install helpers are local-only; CI builds on Linux without voice or a TV. | 18 Nov 2026 | #3 |
| D8 | No behavioural ranking. Parent-curated channel and row order; no "Picked for you" row; no completion, half-watch, early-exit, 👍 or 👎 signals stored. Only IDs and launch times of started videos are kept, to avoid repeats for 7 days, purged after 14. Clearing it needs the parent-authenticated reset (not built yet). Any future thumbs-based personalisation needs a new decision. | 18 Nov 2026 | #7 |
| D10 | No child-reachable reset of the screen-time budget (issue #6). Only the midnight roll-over clears it; a parent-authenticated reset comes with the parent gate. | 18 Nov 2026 | #7 |
| D11 | No home-location learning: no rounds that ask or assume the child's city, state, country or area. Generic map and safety rounds only. | 18 Nov 2026 | #7 |
| D9 | Two editions: `public` never reads family.properties and is the only release artifact; `family` is local-only; CI fails closed if a public APK carries family values. | 18 Nov 2026 | #3 |
| D12 | **Proposed, needs owner approval.** The child-facing world (home, PLAY games, then TRY) moves to an offline three.js r170 layer in a WebView, served from APK assets with no network (`WorldView`). Native Java keeps navigation hand-offs, screen time, voice, WATCH and child data; personal rounds are resolved by the host. Chosen by an on-TV bake-off (Mali-G52, 50 Hz): three.js matched raw OpenGL ES (p95 20.4 ms vs 20.7 ms at 1080p) and beat Babylon.js, PlayCanvas and Filament. Classic screens stay behind `world3d=false`. Default mascot becomes Tara (space theme), replacing Pip. | 19 Nov 2026 | draft |
