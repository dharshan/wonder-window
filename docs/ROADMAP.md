# Roadmap and release gates

0. Baseline: document current app build, navigation, focus, remote, timers, parent controls and tested devices. Gate: existing app builds and primary flows are recorded.
1. Shared host contracts: navigation, input, focus, session/time, parent gate, local data. Gate: vertical slice with no regressions.
2. PLAY: schema/review workflow and one complete remote-controlled game. Gate: real-device validation, offline, accessible, no feature timer.
3. TRY: schema/safety workflow and 3–5 activities. Test preview → instructions → step away → optional return. Gate: activity can happen with TV off.
4. WATCH: provider-neutral boundary and one compliant integration only after rights/terms review. Gate: PLAY/TRY work if provider disappears.
5. Community: schemas, examples, CI, provenance checks, human review and tested device matrix. Gate: newcomer can validate sample unaided.
