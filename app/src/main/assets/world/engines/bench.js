// BENCH engine (variant "bench"): Phase 2 stress spike, never shown to the child. Reached only with ?bench (adb/runner).
// Same reference load for every technology we measure: a cursor steered with held arrows (our own speed-up curve)
// drawing a freehand line, 30 moving sprites with collision against the cursor, a particle burst + sound per hit.
// BACK opens the shared pause menu (game shell). Frame timing comes from the world's WWPERF/WWTICK probe (?perf).
import { THREE, CFG, held } from '../core/engine.js';
import { heldSpeed } from '../core/adapt.js';

const N = 30, TRAIL = 2400, X0 = -7, X1 = 8, Y0 = -2.2, Y1 = 5.2;
const GEO = new THREE.IcosahedronGeometry(.42, 0), CUR = new THREE.TorusGeometry(.5, .1, 8, 32);
export default function bench(ctx) {
  const root = ctx.root; let s = 9; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const sprites = []; for (let i = 0; i < N; i++) { const m = new THREE.Mesh(GEO, new THREE.MeshLambertMaterial({ color: [0xFFC94A, 0x4DD6FF, 0xFF7AA8, 0x7CF2B0][i % 4], flatShading: true }));
    m.position.set(X0 + rnd() * (X1 - X0), Y0 + rnd() * (Y1 - Y0), .3); root.add(m); sprites.push({ m, vx: (rnd() - .5) * 4, vy: (rnd() - .5) * 3, cool: 0 }); }
  const cur = new THREE.Mesh(CUR, new THREE.MeshBasicMaterial({ color: 0xFFE29A })); cur.position.set(0, 1.5, .5); root.add(cur);
  const pos = new Float32Array(TRAIL * 3); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setDrawRange(0, 0);
  const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x7CF2B0 })); line.frustumCulled = false; root.add(line); let n = 0;
  const since = {}; let hits = 0;
  return {
    pausable: true,
    hold(k, down) { since[k] = down ? 0 : -1; },
    key(k) { return ['left', 'right', 'up', 'down', 'ok'].includes(k); },
    update(t, dt) {
      let vx = 0, vy = 0;
      for (const k of ['left', 'right', 'up', 'down']) { if (!held(k)) { since[k] = -1; continue; } if (since[k] < 0) since[k] = 0; since[k] += dt;
        const v = heldSpeed(since[k], { top: 7 }); if (k === 'left') vx -= v; if (k === 'right') vx += v; if (k === 'up') vy += v; if (k === 'down') vy -= v; }
      // scripted mode for unattended runs on the TV: the cursor sweeps a figure-eight
      if (CFG.perf && !vx && !vy) { cur.position.set(Math.sin(t * .9) * 6, 1.5 + Math.sin(t * 1.8) * 2.6, .5); }
      else { cur.position.x = Math.min(X1, Math.max(X0, cur.position.x + vx * dt)); cur.position.y = Math.min(Y1, Math.max(Y0, cur.position.y + vy * dt)); }
      if (n < TRAIL) { pos[n * 3] = cur.position.x; pos[n * 3 + 1] = cur.position.y; pos[n * 3 + 2] = .4; n++; g.setDrawRange(0, n); g.attributes.position.needsUpdate = true; }
      for (const p of sprites) { const m = p.m; m.position.x += p.vx * dt; m.position.y += p.vy * dt; m.rotation.x += dt; m.rotation.y += dt * .7;
        if (m.position.x < X0 || m.position.x > X1) p.vx *= -1; if (m.position.y < Y0 || m.position.y > Y1) p.vy *= -1;
        p.cool -= dt; const dx = m.position.x - cur.position.x, dy = m.position.y - cur.position.y;
        if (p.cool <= 0 && dx * dx + dy * dy < .85) { p.cool = 1; hits++; ctx.correct(m.position.clone()); p.vx *= -1; p.vy *= -1; } }
    },
    dispose() { console.log('WWBENCH hits=' + hits + ' trail=' + n); },
  };
}
