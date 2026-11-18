# Review evidence for PR #12 (not for merge)

Real captures from a OnePlus Android TV (Android 10, 1920×1080), taken 18 Nov 2026 with **public-edition debug builds** installed as separate review packages (`org.wonderwindow.tv.base`, `org.wonderwindow.tv.pr12`), then removed. No family data, no child data. Default buddy Pip, child name blank ("friend").

- `01` base `product/play-try-watch-order` @ 3263166, home, PLAY focused
- `02–04` PR #12 @ ca22858, home with focus on PLAY / TRY / WATCH (RIGHT at WATCH and DOWN do not move focus)
- `05` PR #12 home with the display forced to 1280×720 (`wm size`), restored afterwards
- `06–12` PR #12 build: Play list, an All About Me round, TRY home, a TRY family, preview and first step
- `13` WATCH stop sheet on the PR #12 base: still shows "Picked for you", because the base does not contain PR #7

Capture script: `adb exec-out screencap -p` after `am start` and `input keyevent` steps, only while the TV was idle on its launcher.

## `design-74458e5/`: PR #12 design-package SVGs rendered
Rendered with headless Chrome and the app's own bundled Fredoka and Andika fonts at 1920×1080, plus the home concept at 1280×720. The SVG files are unchanged.

## `design-92350ba/`: revised PR #12 concepts rendered the same way

## `design-e1f71ce/`: PR #12 concepts at e1f71ce, rendered at 1080 and 720

## `design-7ce3b5e/`: PR #12 concepts at 7ce3b5e, rendered at 1080 and 720

## `design-7d6f550/`: PR #12 concepts at 7d6f550, rendered at 1080 and 720
