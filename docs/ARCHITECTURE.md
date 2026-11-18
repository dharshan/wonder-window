# Architecture

One Android TV app with a shared host and three experience areas. This is a target architecture for contribution, not a requirement to rewrite the existing app.

- app/: host/composition root.
- core/: shared contracts and foundations.
- features/play/: game catalogue/runtime.
- features/try/: activity catalogue/experience flow.
- features/watch/: provider interfaces and playback integration.
- design/: tokens, components, themes.
- content/: versioned content, schemas, provenance and review.

Host owns navigation, remote dispatch, focus restoration, session lifecycle, parent gate and screen-time accounting. Features use narrow host contracts. Core must not depend on feature modules or provider SDKs.

Before changing Android code, capture build/runtime baseline; map navigation/focus/remote/timer ownership; record SDK/language/Gradle/device constraints; identify the smallest safe seam; propose incremental extraction; implement one vertical slice.

Do not force Kotlin, Compose, DI or Gradle multi-module solely for aesthetics. Initially use reviewed source contributions or data-driven content. No arbitrary dynamic code loading.
