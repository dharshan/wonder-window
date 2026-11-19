// Shared building blocks for every 3D game engine: choice pods, a board tray, a celebration burst,
// the reward garden, Astro's speech bubble, progress seeds and HUD buttons. All D-pad driven.
import { THREE, CFG, hud, itemTex, pillTex, canvasTex, clamp, ease, easeOutBack, glow, time } from './engine.js';

// ---------- geometry ----------
export function roundedBox(w, h, d, r) { const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: .1, bevelSize: .09, bevelSegments: 3, curveSegments: 6 }); g.center(); return g; }
const POD_GEO = roundedBox(2.05, 2.05, .42, .42), PED_GEO = new THREE.CylinderGeometry(1.05, 1.25, .5, 32), RING_GEO = new THREE.TorusGeometry(1.08, .07, 8, 48);
export const PALETTE = [0xFFC94A, 0x4DD6FF, 0xFF7AA8, 0x7CF2B0, 0xB49CFF, 0xFF9F5A];

// ---------- choice pods on pedestals ----------
/** pods(items, {spacing}) → { group, list, focus, setFocus(i), lift, wiggle(i), pulse(i), fly(i,to,cb), update(t,dt), sink() }
 *  items: strings (letters, numbers, words or emoji). Disabled pods are skipped by left/right. */
export function makePods(items, { spacing = 3.1, y = -.2, z = 1.2, colors = PALETTE, small = false } = {}) {
  const group = new THREE.Group(); const n = items.length, sc = n > 4 ? 4 / n * 1.05 : 1;
  const list = items.map((txt, i) => {
    const base = new THREE.Group(); base.position.set((i - (n - 1) / 2) * spacing * sc, y, z); base.scale.setScalar(sc * (small ? .8 : 1)); group.add(base);
    const ped = new THREE.Mesh(PED_GEO, new THREE.MeshLambertMaterial({ color: 0x3A2A9E })); ped.position.y = -1.15; base.add(ped);
    const ring = new THREE.Mesh(RING_GEO, new THREE.MeshBasicMaterial({ color: 0x8C7BFF })); ring.rotation.x = Math.PI / 2; ring.position.y = -.88; base.add(ring);
    const pod = new THREE.Group(); base.add(pod);
    const body = new THREE.Mesh(POD_GEO, new THREE.MeshLambertMaterial({ color: colors[i % colors.length] })); pod.add(body);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.75), new THREE.MeshBasicMaterial({ map: itemTex(String(txt)), transparent: true })); face.position.z = .33; pod.add(face);
    return { i, txt, base, pod, body, face, ring, lift: 0, wig: -9, pulse: 0, off: false, hidden: false, born: time(), fly: null };
  });
  const P = { group, list, focus: 0, flying: null,
    setFocus(i) { if (i >= 0 && i < n && !list[i].off) P.focus = i; },
    move(dir) { let i = P.focus + dir; while (i >= 0 && i < n && list[i].off) i += dir; if (i >= 0 && i < n) { P.focus = i; return true; } return false; },
    wiggle(i) { list[i].wig = time(); }, pulse(i) { list[i].pulse = 1; },
    dim(i) { list[i].off = true; list[i].body.material.color.multiplyScalar(.45); list[i].face.material.opacity = .45; if (P.focus === i) { if (!P.move(1)) P.move(-1); } },
    fly(i, toWorld, cb) { const p = list[i]; p.fly = { t0: time(), from: new THREE.Vector3(0, p.lift * .6, p.lift * .5), to: toWorld.clone().sub(p.base.getWorldPosition(new THREE.Vector3())).divideScalar(p.base.scale.x), cb }; },
    update(t, dt) {
      list.forEach((p, i) => {
        if (p.hidden) { p.pod.visible = false; return; }
        const pop = CFG.reduced ? 1 : Math.max(.001, easeOutBack(clamp((t - p.born - i * .1) / .55)));
        const want = (P.focus === i && !p.off) ? 1 : 0; p.lift += (want - p.lift) * (CFG.reduced ? 1 : clamp(dt * 12));
        if (p.fly) { const u = clamp((t - p.fly.t0) / (CFG.reduced ? .01 : .7)), e = ease(u);
          p.pod.position.lerpVectors(p.fly.from, p.fly.to, e); p.pod.position.y += Math.sin(Math.PI * e) * 1.6 / p.base.scale.x; p.pod.rotation.set(0, e * 6.283, 0); p.pod.scale.setScalar(1.1 * (1 - e * .8));
          if (u >= 1) { const cb = p.fly.cb; p.fly = null; p.hidden = true; cb && cb(); } return; }
        const wig = t - p.wig < .6 ? Math.sin((t - p.wig) * 38) * .22 * (1 - (t - p.wig) / .6) : 0;
        p.pod.position.set(0, p.lift * .6 + Math.sin(t * 1.6 + i) * .05, p.lift * .5);
        p.pod.rotation.set(-.18 * p.lift + Math.sin(t * 1.1 + i) * .03, Math.sin(t * .9 + i * 2) * .06, wig);
        p.pod.scale.setScalar(pop * (1 + p.lift * .1 + (p.pulse ? .07 * Math.sin(t * 7) : 0)));
        p.ring.material.color.setHex(t - p.wig < .6 ? 0xFFB347 : (p.pulse ? (Math.sin(t * 7) > 0 ? 0xFFE29A : 0x8C7BFF) : (p.lift > .5 ? 0xFFE29A : 0x8C7BFF)));
      });
    } };
  return P;
}

// ---------- board tray: the thing to look at (target letter, a sum, a pattern...) ----------
export function makeBoard(items, { y = 3.3, z = -1.4, max = 8 } = {}) {
  const g = new THREE.Group(); g.position.set(0, y, z); const n = Math.min(items.length, 12), s = n > max ? max / n : 1, step = 1.6 * s;
  const w = Math.max(2.4, n * step + .6);
  const tray = new THREE.Mesh(roundedBox(w, 2.1 * s + .4, .3, .5), new THREE.MeshLambertMaterial({ color: 0x2A1E7A })); tray.position.z = -.25; g.add(tray);
  const cells = items.slice(0, n).map((txt, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.55 * s, 1.55 * s), new THREE.MeshBasicMaterial({ map: itemTex(String(txt), { fg: '#ffffff' }), transparent: true }));
    m.position.set((i - (n - 1) / 2) * step, 0, 0); g.add(m); return m; });
  g.userData = { cells, tray, pulseT: -9, fade(idx) { (idx || []).forEach(k => { if (cells[k]) cells[k].material.opacity = .2; }); } };
  return g;
}

// ---------- celebration burst (one Points object, re-used) ----------
export function makeBurst(n = 140) {
  const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), col = new Float32Array(n * 3); let t0 = -9;
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: .28, vertexColors: true, transparent: true, depthWrite: false })); pts.frustumCulled = false; pts.visible = false;
  const pal = [[1, .8, .3], [.5, 1, .7], [1, .5, .7], [.5, .8, 1], [.8, .6, 1]]; let s = 3;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  pts.userData = {
    fire(at) { t0 = time(); for (let i = 0; i < n; i++) { pos[i * 3] = at.x; pos[i * 3 + 1] = at.y; pos[i * 3 + 2] = at.z; const u = r() * 2 - 1, th = r() * 6.283, q = Math.sqrt(1 - u * u), v = 3 + r() * 5;
      vel[i * 3] = q * Math.cos(th) * v; vel[i * 3 + 1] = u * v + 2.5; vel[i * 3 + 2] = q * Math.sin(th) * v * .6; const c = pal[i % 5]; col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; }
      geo.attributes.color.needsUpdate = true; pts.visible = !CFG.reduced; },
    update(t, dt) { if (!pts.visible) return; const k = t - t0; if (k > 1.8) { pts.visible = false; return; }
      for (let i = 0; i < n; i++) { vel[i * 3 + 1] -= 6 * dt; pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt; }
      geo.attributes.position.needsUpdate = true; pts.material.opacity = 1 - k / 1.8; } };
  return pts;
}

// ---------- reward garden: a space crystal grows for every finished round ----------
const SPOTS = [[-7.5, -1.25, -3.5], [7.6, -1.25, -3.2], [-6.1, -1.4, -6.5], [6.4, -1.4, -6.8], [0, -1.6, -8], [-9.4, -1.6, -1], [9.5, -1.6, -1.2], [-3.4, -1.7, -8.6], [3.6, -1.7, -8.8], [0, -1.8, -11]];
const CRYSTAL = new THREE.OctahedronGeometry(.5, 0);
export function makeGarden() { const g = new THREE.Group(); let n = -1;
  g.userData = { grow(color = 0x7CF2B0) { const c = new THREE.Group(); const p = SPOTS[Math.max(0, n++) % SPOTS.length]; c.position.set(p[0], p[1], p[2]);
      [[0, 1.0, 0, 1.3], [.45, .6, .1, .8], [-.4, .55, -.1, .7]].forEach(([x, y, z, s]) => { const m = new THREE.Mesh(CRYSTAL, new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: .35, flatShading: true }));
        m.position.set(x, y, z); m.scale.set(s * .7, s * 1.6, s * .7); m.rotation.z = -x * .5; c.add(m); });
      c.userData.born = time(); c.scale.setScalar(.001); g.add(c); },
    update(t) { g.children.forEach(c => { const u = clamp((t - c.userData.born) / 1); c.scale.setScalar(Math.max(.001, CFG.reduced ? 1 : easeOutBack(u))); c.rotation.y = Math.sin(t * .6 + c.position.x) * .2; }); } };
  return g; }

// ---------- HUD: speech bubble, progress seeds, buttons ----------
export function makeBubble(hudRoot) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1200, 150), new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, toneMapped: false }));
  m.position.set(960, 1080 - 100, 0); hudRoot.add(m); let last = '';
  return { set(text, accent = '#FFC94A') { if (text === last) return; last = text; m.material.map = pillTex(text, { w: 1600, h: 200, accent, font: 62 }); m.material.needsUpdate = true; m.userData.t0 = time(); },
    update(t) { const k = clamp((t - (m.userData.t0 || 0)) / .25); m.scale.setScalar(.92 + .08 * easeOutBack(k)); }, mesh: m };
}
const DOT = new THREE.CircleGeometry(16, 24), RINGD = new THREE.RingGeometry(14, 19, 24);
export function makeSeeds(hudRoot, n) { const g = new THREE.Group(); g.position.set(960, 54, 0); hudRoot.add(g);
  const dots = []; for (let i = 0; i < n; i++) { const d = new THREE.Mesh(DOT, new THREE.MeshBasicMaterial({ color: 0x7CF2B0, transparent: true, depthTest: false, toneMapped: false })), r = new THREE.Mesh(RINGD, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .7, depthTest: false, toneMapped: false }));
    d.position.x = r.position.x = (i - (n - 1) / 2) * 56; g.add(d); g.add(r); dots.push([d, r]); }
  return { set(done, now) { dots.forEach(([d, r], i) => { d.visible = i < done; r.material.color.setHex(i === now ? 0xFFC94A : 0xffffff); d.scale.setScalar(i < done ? 1.15 : 1); }); } };
}
/** Row of HUD buttons (D-pad left/right, OK). labels: [{text, accent, act}] */
export function makeButtons(hudRoot, labels, { y = 200 } = {}) { const g = new THREE.Group(); hudRoot.add(g); let focus = 0;
  const bs = labels.map((L, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(440, 120), new THREE.MeshBasicMaterial({ map: pillTex(L.text, { w: 880, h: 240, accent: L.accent || '#FFC94A', font: 80 }), transparent: true, depthTest: false, toneMapped: false }));
    m.position.set(960 + (i - (labels.length - 1) / 2) * 500, y, 0); g.add(m); return m; });
  return { group: g, get focus() { return focus; },
    key(k) { if (k === 'left' && focus > 0) focus--; else if (k === 'right' && focus < bs.length - 1) focus++; else if (k === 'ok') { labels[focus].act(); return true; } else return false; return true; },
    update(t) { bs.forEach((m, i) => { const f = i === focus; m.scale.setScalar(f ? 1.12 + .02 * Math.sin(t * 4) : .92); m.material.opacity = f ? 1 : .7; }); } };
}
export { glow };
