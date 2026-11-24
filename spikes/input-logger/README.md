# Spike: remote input logger (Phase 0) — THROWAWAY, never merged

Separate package `org.wonderwindow.tv.spike` ("WW Key Test", orange arrow tile), so the child's app and its data are never touched. No permissions.

Walks an adult through 5 remote tests (tap, hold RIGHT, hold OK, fast LEFT/RIGHT, BACK) and shows a summary:
tap echo, held-key repeat delay and interval, long-press flag, press rate, dispatch delay, event-to-next-frame latency, measured frame rate.

Output: logcat tag `WWKEY`, and CSV + summary in `/sdcard/Android/data/org.wonderwindow.tv.spike/files/`.
Exit: hold BACK 2 s, BACK ×3 on the summary, or HOME.

Build (Mac toolchain): copy `gradlew` + `gradle/wrapper/` from the app, then `./gradlew assembleRelease` (debug-signed release).
Remove from the TV: `adb uninstall org.wonderwindow.tv.spike`.
