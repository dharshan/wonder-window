# Evidence: `impl/wonder-system-ui` @ ac1dc82 (slice 1: foundation + home)

- **Device:** OnePlus Android TV, Android 10, 1920×1080 (`07` forced to 1280×720 with `wm size`, then restored).
- **Build:** **public** edition debug, installed as a separate review package `org.wonderwindow.tv.review` (default buddy Pip, no family data), uninstalled after capture.
- **Capture:** `adb exec-out screencap -p` on 18 Nov 2026, 22:24–22:29 IST, with keys sent by `adb shell input keyevent`.
- **Reduced motion:** `settings put global animator_duration_scale 0`, then restored to 1.
- **Checks on the same build:** `./gradlew assemblePublicDebug lintPublicRelease testPublicDebugUnitTest` passed on the Mac.

| File | Shows |
| --- | --- |
| 01–05 | Home focus PLAY → TRY → WATCH; RIGHT at WATCH holds; LEFT returns to TRY. Pip turns toward the focused door. |
| 06 | Reduced motion: two-tone ring, no scale |
| 07 | Home at 1280×720 |
| 08 | PLAY list: first card focused with the two-tone ring (cards are not yet redesigned) |
| 10 | #14 fixed: the round opens with the **first answer** focused (voice off), not the speaker |
| 09 | Same round after two answers (answered tiles fade; follow-up: keep the ring at full contrast on faded tiles) |
| 11 | WATCH pause sheet: shared button with the two-tone ring |
| 12 | BACK from PLAY returns home with PLAY focused |
