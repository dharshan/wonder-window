// Wonder Window world engine: one WebGL renderer for the whole child-facing world (home, PLAY, TRY).
// Rules learned on the TV (Mali-G52, 50 Hz panel, 32-bit WebView):
//  * nothing drawn in the DOM over the canvas: every label, bubble and button lives in the WebGL HUD;
//  * no per-frame allocations (pre-allocate vectors; no clone()/new in update paths);
//  * opaque canvas, no MSAA, Lambert/Basic materials, few small additive sprites;
//  * all materials compiled before the first frame of a screen.
import * as THREE from '../vendor/three.module.min.js';
export { THREE };

const Q = new URLSearchParams(location.search);
export const CFG = {
  pr: +(Q.get('pr') || 1), reduced: Q.has('reduced') || matchMedia('(prefers-reduced-motion: reduce)').matches,
  scripted: Q.has('scripted'), perf: Q.has('perf'), W: 1920, H: 1080,
};

export const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: CFG.scripted });
renderer.setPixelRatio(CFG.pr); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NoToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.autoClear = false;
document.body.prepend(renderer.domElement);
export const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 600);
export const hud = new THREE.Scene(), hudCam = new THREE.OrthographicCamera(0, CFG.W, CFG.H, 0, -100, 100);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

// ---------- shared helpers ----------
let seed = 7; export const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; export const reseed = s => { seed = s; };
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutBack = t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
export const lerp = (a, b, t) => a + (b - a) * t;

export function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; return t; }
export const GLOW = canvasTex(128, 128, g => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.3, 'rgba(255,255,255,.4)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
export function glow(color, size, opacity = 1) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.setScalar(size); return s; }

// ---------- text & item textures (cached; drawn once) ----------
const texCache = new Map();
export const FONT = 'Fredoka';
export async function fontsReady() { await Promise.all(['700 120px Fredoka', '600 60px Fredoka'].map(f => document.fonts.load(f))); }
/** A single content item (letter, numeral, word or emoji) on a transparent square texture. */
export function itemTex(txt, { fg = '#1F2547', size = 256, scale = 1 } = {}) {
  const key = 'i|' + txt + '|' + fg + '|' + scale; if (texCache.has(key)) return texCache.get(key);
  const t = canvasTex(size, size, g => { g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const n = [...txt].length; const fs = (n <= 2 ? 176 : n <= 4 ? 118 : n <= 7 ? 74 : 54) * scale * size / 256;
    g.font = `700 ${fs}px ${FONT}, "Noto Color Emoji", sans-serif`; g.fillText(txt, size / 2, size / 2 + fs * .06, size * .94); });
  texCache.set(key, t); return t;
}
/** Rounded "pill" with optional accent dot: used for speech bubbles, titles and buttons. */
export function pillTex(text, { w = 1024, h = 200, bg = '#16113F', fg = '#ffffff', ring = '#ffffff', accent = null, font = 64 } = {}) {
  const key = 'p|' + text + w + h + bg + fg + ring + accent + font; if (texCache.has(key)) return texCache.get(key);
  const t = canvasTex(w, h, g => { const r = h / 2 - 8;
    if (ring) { g.fillStyle = ring; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, r + 4); g.fill(); }
    g.fillStyle = bg; g.beginPath(); g.roundRect(12, 12, w - 24, h - 24, r - 4); g.fill();
    let x = 48; if (accent) { g.fillStyle = accent; g.beginPath(); g.arc(12 + r, h / 2, r - 22, 0, 6.283); g.fill(); x = 12 + 2 * r + 8; }
    g.fillStyle = fg; g.textBaseline = 'middle'; let fs = font; g.font = `600 ${fs}px ${FONT}`;
    while (g.measureText(text).width > w - x - 48 && fs > 26) { fs -= 2; g.font = `600 ${fs}px ${FONT}`; }
    g.fillText(text, x, h / 2 + 3); });
  texCache.set(key, t); return t;
}
/** HUD quad (pixel units, origin bottom-left) whose texture can be swapped. */
export function hudQuad(tex, w, h, x, y) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false }));
  m.position.set(x, y, 0); hud.add(m); return m; }

// ---------- screen router ----------
let current = null, nextReq = null; const fade = new THREE.Mesh(new THREE.PlaneGeometry(CFG.W, CFG.H), new THREE.MeshBasicMaterial({ color: 0x05041a, transparent: true, opacity: 0, depthTest: false, toneMapped: false }));
fade.position.set(CFG.W / 2, CFG.H / 2, 50); fade.renderOrder = 999; hud.add(fade);
let fadeT = -1, fadeDir = 0;
export const router = {
  screens: {}, get current() { return current; },
  go(name, params = {}) { nextReq = { name, params }; fadeDir = 1; fadeT = 0; if (CFG.reduced) fadeT = 1; },
};
function swap() { if (current) { current.exit?.(); current.root && current.root.removeFromParent(); current.hudRoot && current.hudRoot.removeFromParent(); }
  const S = router.screens[nextReq.name]; current = S; S.name = nextReq.name; S.enter(nextReq.params); if (S.root) { scene0.add(S.root); } if (S.hudRoot) hud.add(S.hudRoot);
  renderer.compile(scene0, camera); renderer.compile(hud, hudCam); lastSwap = performance.now(); nextReq = null; fadeDir = -1; fadeT = 0; }
export const scene0 = new THREE.Scene();

// ---------- input: D-pad keys + BACK (delivered by Java via WWWorld.key) ----------
const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Enter: 'ok', ' ': 'ok', Escape: 'back', Backspace: 'back' };
export function key(k) { if (nextReq || fadeDir === 1) return; if (k === 'back' && !(current && current.key && current.key('back'))) { bridge.back(); return; } current && current.key && current.key(k); }
addEventListener('keydown', e => { const k = KEYMAP[e.key]; if (k) { e.preventDefault(); key(k); } });

// ---------- bridge to the Android app (falls back to no-ops in a browser) ----------
const N = window.WWN || null;
export const bridge = {
  say(text) { try { N ? N.say(String(text || '')) : 0; } catch (e) { } },
  sfx(name) { try { N ? N.sfx(name) : 0; } catch (e) { } },
  get(k, d = null) { try { if (N) { const v = N.get(k); return v == null || v === '' ? d : JSON.parse(v); } const v = localStorage.getItem('ww:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { const s = JSON.stringify(v); N ? N.set(k, s) : localStorage.setItem('ww:' + k, s); } catch (e) { } },
  event(name, data) { try { N ? N.event(name, JSON.stringify(data || {})) : console.log('event', name, data); } catch (e) { } },
  back() { try { N ? N.back() : console.log('back to app'); } catch (e) { } },
  open(where) { try { N ? N.open(where) : console.log('open', where); } catch (e) { } },
  /** Personal rounds ({name}, {age_candles}, dynamic=name/age) are filled in by the Android host, never in JS. */
  resolve(r) { try { return N && N.resolve ? JSON.parse(N.resolve(JSON.stringify(r))) : r; } catch (e) { return r; } },
  canResolve(dyn) { try { return !!(N && N.canResolve && N.canResolve(dyn)); } catch (e) { return false; } },
  buddy() { try { return (N && N.buddy && N.buddy()) || 'Astro'; } catch (e) { return 'Astro'; } },
};
window.WWWorld = { key, go: (n, p) => router.go(n, typeof p === 'string' ? JSON.parse(p) : p), pause() { paused = true; }, resume() { paused = false; lastMs = performance.now(); } };

// ---------- frame loop (fixed render order, perf probe) ----------
const dynWin = []; let lastSwap = performance.now();
let T = 0, lastMs = 0, paused = false, perfT0 = performance.now(), prevNow = performance.now(), lastTick = performance.now(); const win = []; const perf = []; let perfDone = false, dynAcc = 0, dynN = 0, dynPR = CFG.pr;
export const time = () => T;
export function frame(dt) {
  T += dt;
  if (fadeDir) { fadeT = clamp(fadeT + dt / .28); fade.material.opacity = fadeDir > 0 ? fadeT : 1 - fadeT; if (fadeDir > 0 && fadeT >= 1) swap(); else if (fadeDir < 0 && fadeT >= 1) { fadeDir = 0; fade.material.opacity = 0; } }
  current && current.update && current.update(T, dt);
  renderer.clear(); renderer.render(scene0, camera); renderer.render(hud, hudCam);
}
export function start() {
  if (CFG.scripted) { window.step = n => { for (let i = 0; i < n; i++) frame(1 / 30); return T; }; window.ready = () => !!current; return; }
  lastMs = performance.now();
  (function loop(now) { requestAnimationFrame(loop); if (paused) return; const d = Math.min(.05, Math.max(0, (now - lastMs) / 1000)); lastMs = now; frame(d);
    // safety net: if a screen goes over budget, render it at a lower internal resolution (0.75 measured smooth on the TV)
    if (!Q.has('fixedpr') && now - lastSwap > 2500) { const ms = (now - prevNow); dynWin.push(ms); if (dynWin.length === 90) {   // works at 50 or 60 Hz: compare against this TV's own frame interval
        const srt = dynWin.slice().sort((x, y) => x - y), vsync = srt[Math.floor(srt.length * .3)], slipped = dynWin.filter(x => x > vsync * 1.5).length / dynWin.length; dynWin.length = 0;
        if (slipped > .06 && dynPR > .71) { dynPR = Math.max(.7, Math.round((dynPR - .1) * 100) / 100); renderer.setPixelRatio(dynPR); console.log('WWDYN pr=' + dynPR.toFixed(2) + ' slipped=' + (slipped * 100).toFixed(0) + '%'); } } }
    if (CFG.perf) { const nowS = (now - perfT0) / 1000; if (nowS > 1.5) { perf.push(now - prevNow); win.push(now - prevNow); }
      if (perfDone === false && Q.has('dynlog') && dynWin.length === 0 && nowS > 3) { }
      if (now - lastTick > 5000) { lastTick = now; const a = win.splice(0); if (a.length) console.log(`WWTICK t=${nowS.toFixed(0)} screen=${router.current && router.current.name || ''} n=${a.length} avg=${(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1)} max=${Math.max(...a).toFixed(0)} pr=${dynPR.toFixed(2)}`); }
      if (!perfDone && nowS > +(Q.get('secs') || 24)) { perfDone = true; const a = perf.slice().sort((x, y) => x - y), p = q => a[Math.floor(q * (a.length - 1))];
        console.log(`WWPERF tag=world pr=${dynPR.toFixed(2)} screen=${Q.get('screen') || ''} frames=${a.length} p50=${p(.5).toFixed(1)} p95=${p(.95).toFixed(1)} p99=${p(.99).toFixed(1)} jank=${a.filter(x => x > 30).length}`); } }
    prevNow = now; } )(lastMs);
}
