# Technical implementation and performance guidance

**Target baseline:** existing native Java Android TV host, **minSdk 26** (Android 8.0); Android 10/API 29 is the initial physical test device, not the minimum supported platform. Approximately 1.77 GB RAM.

## Preserve the working platform
- Keep native Java and current Gradle/Android compatibility. No Kotlin/Compose/framework migration for visual reasons.
- Reuse existing host, session manager, navigation, parent gate, data formats and provider boundary.
- No new SDK, account, backend, analytics, tracking or network dependency for the design system.
- Keep PLAY and TRY usable offline wherever their content is local. WATCH failures must not block other pillars.

## API 26 compatibility contract
- Read `Settings.Global.ANIMATOR_DURATION_SCALE` defensively; tolerate unavailable settings and default safely to normal animation.
- Do not depend on a platform reduced-motion preference API. Animator scale zero is the project's static-mode signal on API 26+.
- VectorDrawable, `View.setElevation`, `ViewPropertyAnimator`, `AnimatorSet`, `ObjectAnimator` and `PathInterpolator` are available at API 26. Guard later APIs with SDK checks.
- Avoid AndroidX dependencies unless separately justified and verified against the current build.

## Asset and rendering strategy
| Asset class | Preferred format | Initial budget target | Notes |
|---|---|---:|---|
| Simple icons | VectorDrawable XML | ≤10 KB | Semantic tokens; modest path count |
| Mascot poses | VectorDrawable XML | ≤40 KB | Reuse shared shapes |
| Complex background | Optimised WebP/layered vector | ≤300 KB | Controls on separate surfaces |
| Content thumbnail | WebP/JPEG near display size | ≤100 KB source target | Sample to tile size off UI thread |
| Design prototype | SVG | 1920×1080 | Design-only; never ship directly |

Budgets are targets, not benchmarks. Measure APK size, decoded memory, frame time and memory pressure on the OnePlus Android 10 target.

## Runtime performance
- Disk/network I/O and image decode off main thread; update views on UI thread.
- Bound caches by memory; release references when rows/screens detach.
- Prefer transform/alpha animation over layout re-measure. Stop ambient animation on stop/detach.
- Reduced motion removes non-essential animation without changing layout/focus semantics.
- Avoid filter/shadow stacks on every tile and background requests merely to decorate a screen.

## Focus and verification
- Shared focus/card/button implementation; transform-only scale; safe-area bounds.
- Preserve focus IDs and restore opener after modal dismissal.
- Test 720p/1080p/4K, long labels, largest type setting, enabled/disabled combinations, cold launch, resume, sleep/wake, process recreation, offline/error, animator scale 0 and normal.
- Record model, Android/API, variant/build, resolution, steps and captures. Profile startup, memory and jank; SVG mockups/CI are not device proof.

## Dependencies and licences
Record licence, maintenance, APK size, permissions, network behaviour and API compatibility before adding libraries. Prefer platform APIs and existing project assets.
