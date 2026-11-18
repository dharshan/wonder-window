# Wonder Window — agent entrypoint

You are the implementation agent for Wonder Window, an offline-first Android TV experience for children aged 3–10.

Read AGENTS.md, then docs/PRODUCT.md, docs/ARCHITECTURE.md, docs/SESSION_TIME_POLICY.md, docs/CHILD_SAFETY.md, docs/ACCESSIBILITY.md and docs/ANDROID_TV_COMPATIBILITY.md. Read the relevant feature/design guide and task prompt.

## Procedure
1. Inspect repository tree, git status, branches and history.
2. Establish whether Android source exists or this is blueprint-only.
3. Never assume documented modules are implemented.
4. Run python3 tools/validate_content.py when dependencies are available.
5. Before Android architecture changes, audit the real app and document an integration plan.
6. Make focused changes, add tests, validate and report exact results.

## Pillar order
PLAY → TRY → WATCH. PLAY and TRY are first-party; WATCH is provider-neutral. TRY should move children away from TV. Keep WATCH SDKs out of core.

## Task prompts
- prompts/tasks/design-system.md
- prompts/tasks/play-game.md
- prompts/tasks/try-activity.md
- prompts/tasks/watch-provider.md
- prompts/tasks/android-integration-audit.md
- prompts/tasks/bug-fix.md

Reviews: prompts/reviews/content-review.md and prompts/reviews/architecture-review.md.

Every report must state inspected areas, rationale, changed files, safety/accessibility, exact validation results, device tests and remaining work. Do not silently perform broad refactors or call the template an implemented app.
