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
| D8 | Local WATCH ranking from viewing behaviour: **pending** — recommended option (a) off by default, ID/date rotation only. | pending | — |
| D9 | Two editions: `public` never reads family.properties and is the only release artifact; `family` is local-only; CI fails closed if a public APK carries family values. | 18 Nov 2026 | #3 |
