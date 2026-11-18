// Small shared helpers for the grid-style engines (compose, mirror, pairs, grid_path, keypad, recite).
// Everything here is built once per round; update paths only move transforms.
import { THREE, CFG, itemTex, pillTex, canvasTex, clamp, easeOutBack, time } from '../core/engine.js';
import { roundedBox } from '../core/kit.js';

const geoCache = new Map();
/** Cached rounded box geometry (shared across rounds). */
export function rbox(w, h, d, r) { const k = [w, h, d, r].join('|'); if (!geoCache.has(k)) geoCache.set(k, roundedBox(w, h, d, r)); return geoCache.get(k); }
const planeCache = new Map();
export function plane(w, h = w) { const k = w + '|' + h; if (!planeCache.has(k)) planeCache.set(k, new THREE.PlaneGeometry(w, h)); return planeCache.get(k); }

export const lam = (color, extra = {}) => new THREE.MeshLambertMaterial(Object.assign({ color }, extra));
/** Emoji / text face on a transparent plane. */
export function face(txt, size, { fg = '#1F2547', z = 0 } = {}) {
  const m = new THREE.Mesh(plane(size), new THREE.MeshBasicMaterial({ map: itemTex(String(txt || ' '), { fg }), transparent: true, depthWrite: false }));
  m.position.z = z; m.renderOrder = 2; return m;
}
export function setFace(m, txt, fg = '#1F2547') { m.material.map = itemTex(String(txt || ' '), { fg }); m.material.needsUpdate = true; }
/** A pill label (HUD-style texture) placed in the world. */
export function label3d(text, w, h, { accent = null, bg = '#16113F', font = 80 } = {}) {
  const m = new THREE.Mesh(plane(w, h), new THREE.MeshBasicMaterial({ map: pillTex(text, { w: Math.round(w / h * 240), h: 240, accent, bg, font }), transparent: true, depthWrite: false }));
  m.renderOrder = 3; return m;
}

// five-point star shape (rounded), used for rewards and pair creatures
export function starShape(R = 1, r = .5) {
  const s = new THREE.Shape();
  for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  return s;
}
export const STAR_GEO = (() => { const g = new THREE.ExtrudeGeometry(starShape(1, .5), { depth: .28, bevelEnabled: true, bevelThickness: .1, bevelSize: .08, bevelSegments: 2, curveSegments: 4 }); g.center(); return g; })();
export const RING_GEO = new THREE.TorusGeometry(1, .06, 6, 40);

/** wiggle offset for an object last wiggled at t0 */
export const wig = (t, t0, amp = .22) => (t - t0 < .6 ? Math.sin((t - t0) * 38) * amp * (1 - (t - t0) / .6) : 0);
/** pop-in scale */
export const pop = (t, t0, dur = .4) => CFG.reduced ? 1 : Math.max(.001, easeOutBack(clamp((t - t0) / dur)));
/** 0..1 progress with reduced-motion snapping */
export const prog = (t, t0, dur) => CFG.reduced ? 1 : clamp((t - t0) / dur);

/** Flat glowing focus frame (a rounded ring made of a thin box outline) behind a tile. */
export function focusFrame(w, h, color = 0xFFE29A, th = .09) {
  const g = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color });
  [[0, h / 2, w + th, th], [0, -h / 2, w + th, th], [w / 2, 0, th, h + th], [-w / 2, 0, th, h + th]].forEach(([x, y, ww, hh]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, .08), m); b.position.set(x, y, 0); g.add(b); });
  g.userData.mat = m; return g;
}

/** A chunky 3D button with a pill label: { group, body, set(focused,t) } */
export function bigButton(text, { w = 3.6, h = 1.05, color = 0x2F9E5A, accent = '#7CF2B0' } = {}) {
  const group = new THREE.Group(); const body = new THREE.Mesh(rbox(w, h, .35, h * .45), lam(color)); group.add(body);
  const lab = label3d(text, w * .92, h * .8, { accent, bg: '#14402A', font: 84 }); lab.position.z = .3; group.add(lab);
  const ring = focusFrame(w + .25, h + .25); ring.position.z = -.12; group.add(ring);
  return { group, body, lab, ring, born: time(), set(f, t) { ring.visible = f; ring.userData.mat.color.setHex(Math.sin(t * 6) > 0 ? 0xFFE29A : 0xFFC94A);
    group.scale.setScalar(pop(t, this.born) * (f ? 1.08 + .02 * Math.sin(t * 4) : 1)); group.rotation.x = f ? -.12 : 0; } };
}

/** Crater pattern texture for card backs (drawn once). */
let craterTex = null;
export function craterTexture() {
  if (craterTex) return craterTex;
  craterTex = canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#7E63F0'); gr.addColorStop(1, '#4B34B8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    [[70, 80, 34], [180, 70, 22], [150, 170, 44], [60, 190, 18], [215, 215, 14]].forEach(([x, y, r]) => {
      g.fillStyle = 'rgba(30,16,90,.55)'; g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill();
      g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(x - r * .18, y - r * .18, r * .78, 0, 6.3); g.fill(); });
    g.fillStyle = '#FFE29A'; g.font = '700 70px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', w / 2, h / 2 + 4);
  });
  return craterTex;
}

/** Move a focus index on a rows×cols grid. Edges hold (no wrap). Returns new [r,c] or null if blocked. */
export function gridStep(r, c, k, rows, cols) {
  const dr = k === 'up' ? -1 : k === 'down' ? 1 : 0, dc = k === 'left' ? -1 : k === 'right' ? 1 : 0;
  const nr = r + dr, nc = c + dc; if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) return null; return [nr, nc];
}
