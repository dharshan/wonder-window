# Wonder Window 3D world (`assets/world/`)

This is an offline three.js r170 layer, rendered in a WebView by `WorldView.java` and hosted by `MainActivity`. It is served from `https://appassets.androidplatform.net/` (APK assets only, no network).

## TV performance rules (measured on the target TV: Mali-G52, 50 Hz panel, 32-bit WebView)
A frame must take ≤ 20 ms. The bench scene holds a p95 of 20.4 ms at 1080p, and every screen has to stay at that cost.
- No tone mapping. `NoToneMapping` is the default; ACES alone pushed p95 to 43 ms.
- No large additive sprites or glows. The `glow()` helper is for small accents only (screen size under about 15%).
- No DOM elements over the canvas. Text, bubbles, buttons and progress go in the WebGL HUD (`hud` scene, 1920×1080 pixel units, origin at bottom left; see `core/kit.js`).
- Materials: `MeshLambertMaterial` and `MeshBasicMaterial`. Avoid `MeshStandardMaterial`/`MeshPhysicalMaterial`, transparency over large areas, and full-screen shader passes.
- Build meshes once, in `build`/`enter`, and animate transforms only. Re-use geometries (module-level constants). Per-frame allocations are cheap but keep them modest.
- Respect `CFG.reduced`: no travel, flying or looping motion when it is set; state changes become instant.

## Child rules
- Remote only: left, right, up, down, ok, back.
- He can't read: every prompt is in the bubble, and **UP plays the voice line** (game shell).
- No timers, scores, streaks or punishment. A wrong answer wiggles, gives a hint, and offers a way to try again.
- Focus is always visible: a lifted, tilted object with a lit ring. Edges hold: there is no wrap-around.

## Game engine API (`engines/<variant>.js`)
```js
export default function myEngine(ctx, round) {
  // build 3D objects under ctx.root (THREE.Group) and HUD objects under ctx.hudRoot
  return {
    key(k) { /* 'left'|'right'|'up'|'down'|'ok' → return true if handled ('up' is taken by the shell for voice) */ },
    update(t, dt) { /* animate */ },
    focusX() { return 0; },  // world x of the focused thing (camera leans toward it)
    lookX() { return 0; },   // -1..1 where Tara looks
    dispose() {},
  };
}
```
`ctx` provides:
- `root`, `hudRoot`, `game`, `round`, `tara`, `fill(text)` (replaces `{buddy}`);
- `bubble(text, accentColor)` and `say(text)` (voice; the host plays recorded clips);
- `sfx(name)`, where name is one of chime, pop, boing, bump, twinkle, fanfare, chirp;
- `correct(worldPos?)`: chime, Tara happy, and a burst at `worldPos`;
- `wrong(hint?)`: boing, Tara thinking, and a bubble with the hint after the second miss;
- `finish({ firstTry, why })`: ends the round. The shell grows a reward crystal, shows `why` and moves to the next round after 3 s.

Shared kit (`core/kit.js`):
- `makePods(items)`: choice pods with focus, lift, wiggle, dim, pulse and fly-to;
- `makeBoard(items)`: a tray of items to look at;
- `roundedBox()`, `PALETTE`, `makeButtons()`;
- `itemTex(text)` in `core/engine.js`: letters, numbers, short words or emoji on a transparent texture (cached).

Register an engine in `engines/index.js` (`ENGINES`). A game appears in 3D only when every round variant it uses has an engine; otherwise the shelf opens it in the classic native shell.

## Testing in a desktop browser
Serve `app/src/main/assets/` and open `world/index.html?screen=game&id=<gameId>`. Arrow keys and Enter drive it. For deterministic headless capture, add `&scripted`, then call `step(n)` and `WWWorld.key('right')`. See `/home/claude/wtest/wcap.py`.
