// Shared bits for the place / sort / order / echo engines: cached geometries, face and label planes,
// a tiny time-based tween runner (no setTimeout, so headless capture stays deterministic) and the wiggle curve.
import { THREE, CFG, itemTex, canvasTex, FONT, clamp } from '../core/engine.js';
import { roundedBox } from '../core/kit.js';

export const CARD_GEO = roundedBox(2.0, 2.0, .42, .42);
export const CARD_TALL_GEO = roundedBox(2.0, 2.55, .42, .42);
export const PED_GEO = new THREE.CylinderGeometry(1.0, 1.2, .45, 32);
export const RING_GEO = new THREE.TorusGeometry(1.05, .07, 8, 48);
export const BALL_GEO = new THREE.SphereGeometry(1, 24, 16);
export const BOX_GEO = new THREE.BoxGeometry(1, 1, 1);
export const CYL_GEO = new THREE.CylinderGeometry(1, 1, 1, 20);
const planes = new Map();
export function planeGeo(w, h = w) { const k = w + 'x' + h; if (!planes.has(k)) planes.set(k, new THREE.PlaneGeometry(w, h)); return planes.get(k); }

/** Emoji / letter / number on a transparent plane. */
export function faceMesh(txt, size, opts) {
  const m = new THREE.Mesh(planeGeo(size), new THREE.MeshBasicMaterial({ map: itemTex(String(txt), opts), transparent: true }));
  m.renderOrder = 2; return m;
}
/** Short word on a dark rounded pill (bin and card labels; big enough to read from the sofa). */
export function labelMesh(text, w = 2.3, h = .62) {
  const m = new THREE.Mesh(planeGeo(w, h), new THREE.MeshBasicMaterial({ map: labelTex(String(text), Math.round(512 * h / w)), transparent: true }));
  m.renderOrder = 2; return m;
}
const labCache = new Map();
function labelTex(text, H) { const k = text + '|' + H; if (labCache.has(k)) return labCache.get(k);
  const t = canvasTex(512, H, (g, w, h) => { g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(3, 3, w - 6, h - 6, h / 2 - 3); g.fill();
    g.fillStyle = '#16113F'; g.beginPath(); g.roundRect(10, 10, w - 20, h - 20, h / 2 - 10); g.fill();
    let fs = Math.round(h * .5); g.font = `600 ${fs}px ${FONT}`; while (g.measureText(text).width > w - 50 && fs > 20) { fs -= 2; g.font = `600 ${fs}px ${FONT}`; }
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2); });
  labCache.set(k, t); return t; }
export const lam = (color, extra) => new THREE.MeshLambertMaterial(Object.assign({ color }, extra || {}));
export const basic = color => new THREE.MeshBasicMaterial({ color });

/** Decaying side-to-side shake used for every "not this one" reaction. */
export const wig = (t, t0) => t - t0 < .6 ? Math.sin((t - t0) * 38) * .22 * (1 - (t - t0) / .6) : 0;

/** Tween runner: run(dur, fn(u), done) → fn gets 0..1 each frame; reduced motion collapses it to one step. */
export function tweens() {
  const list = [];
  return {
    run(t0, dur, fn, done) { list.push({ t0, dur: CFG.reduced ? .001 : dur, fn, done }); },
    at(t0, done) { list.push({ t0, dur: 0, fn: null, done }); },
    update(t) { for (let i = 0; i < list.length; i++) { const w = list[i]; if (t < w.t0) continue; const u = w.dur ? clamp((t - w.t0) / w.dur) : 1;
      w.fn && w.fn(u); if (u >= 1) { list.splice(i--, 1); w.done && w.done(); } } },
    get busy() { return list.length > 0; },
  };
}
