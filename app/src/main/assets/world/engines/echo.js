// ECHO engine (MainActivity.showEcho): star pods hang in the sky like a constellation. They light up one by
// one (each with its own sound), then the child repeats the run: LEFT/RIGHT to move, OK to light a star.
// Every right star draws a golden constellation line from the last one; the full run makes the whole
// constellation shine. Round fields: pool (faces), sequence (indices into pool), show_ms (default 900), hint, why.
// Answer rule (same as native): press sequence[pos]; OK is ignored while the sequence is playing.
// A wrong star wiggles, ctx.wrong(hint), the lines fold away and the sequence plays again (pos back to 0).
import { THREE, CFG, time, clamp, glow } from '../core/engine.js';
import { PALETTE } from '../core/kit.js';
import { BALL_GEO, CYL_GEO, faceMesh, lam, basic, wig, tweens } from './parts.js';

const HALO_GEO = new THREE.TorusGeometry(1.32, .07, 8, 48);
const STAR_GEO = (() => { const s = new THREE.Shape(), pts = [];                 // puffy rounded 5-point star
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? .78 : 1.28; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; let m = mid(pts[9], pts[0]); s.moveTo(m[0], m[1]);
  for (let i = 0; i < 10; i++) { const p = pts[i], q = mid(p, pts[(i + 1) % 10]), k = i % 2 ? .3 : .55;
    s.lineTo(p[0] + (m[0] - p[0]) * k, p[1] + (m[1] - p[1]) * k); s.quadraticCurveTo(p[0], p[1], p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k); m = q; }
  const g = new THREE.ExtrudeGeometry(s, { depth: .4, bevelEnabled: true, bevelThickness: .14, bevelSize: .1, bevelSegments: 3, curveSegments: 6 }); g.center(); return g; })();
const SFX = ['pop', 'chirp', 'twinkle', 'bump', 'pop', 'chirp'];
const HEIGHTS = [.35, 1.55, .55, 1.75, .3, 1.45];

export default function echo(ctx, r) {
  const root = ctx.root, pool = (r.pool || []).map(String), seq = (r.sequence || []).map(Number), n = pool.length;
  const ms = Math.max(.35, (r.show_ms || 900) / 1000); const tw = tweens();
  let focus = 0, pos = 0, misses = 0, done = false, showing = true, doneT = -1;
  const sc = n > 4 ? 4 / n * 1.08 : 1, stepX = 3.15 * sc;

  const pods = pool.map((txt, i) => {
    const g = new THREE.Group(); g.position.set(.8 + (i - (n - 1) / 2) * stepX, HEIGHTS[i % HEIGHTS.length] + .2, 0); g.scale.setScalar(sc); root.add(g);
    const col = PALETTE[i % PALETTE.length];
    const orb = new THREE.Mesh(STAR_GEO, lam(col, { emissive: col, emissiveIntensity: .12 })); g.add(orb);
    const face = faceMesh(txt, 1.2); face.position.set(0, -.05, .36); g.add(face);
    const halo = new THREE.Mesh(HALO_GEO, basic(0x8C7BFF)); g.add(halo);
    const gl = glow(col, 2.6, .85); gl.position.z = -.4; gl.visible = false; g.add(gl);
    return { g, orb, face, halo, gl, col, lit: -9, wig: -9, lift: 0 };
  });
  // constellation lines (one per step, built once; shown as the child gets each step right)
  const lines = seq.slice(1).map(() => { const m = new THREE.Mesh(CYL_GEO, basic(0xFFE29A)); m.visible = false; m.userData.t0 = 0; root.add(m); return m; });
  // progress beads above the sky
  const beads = seq.map((_, i) => { const b = new THREE.Mesh(BALL_GEO, basic(0x4A3C9E)); b.scale.setScalar(.2); b.position.set(.8 + (i - (seq.length - 1) / 2) * .7, 4.05, -1.2); root.add(b); return b; });

  const A = new THREE.Vector3(), B = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), Q = new THREE.Quaternion();
  function link(i) {                                    // line from seq[i-1] to seq[i]
    const m = lines[i - 1]; if (!m) return; const a = pods[seq[i - 1]].g.position, b = pods[seq[i]].g.position;
    if (seq[i - 1] === seq[i]) { m.visible = false; return; }
    A.copy(a); B.copy(b); A.z = B.z = -.35; const len = A.distanceTo(B);
    m.position.addVectors(A, B).multiplyScalar(.5); Q.setFromUnitVectors(UP, B.sub(A).normalize()); m.quaternion.copy(Q);
    m.userData.len = len; m.userData.t0 = time(); m.visible = true;
  }
  function light(i, snd = true) { pods[i].lit = time(); if (snd) ctx.sfx(SFX[i % SFX.length]); }
  function play(at) {                                   // show the sequence, then hand over
    showing = true; pos = 0; lines.forEach(l => l.visible = false);
    seq.forEach((k, j) => tw.at(at + j * ms, () => { light(k); beads.forEach((b, q) => b.material.color.setHex(q <= j ? 0xFFC94A : 0x4A3C9E)); }));
    tw.at(at + seq.length * ms + .2, () => { showing = false; beads.forEach(b => b.material.color.setHex(0x4A3C9E)); ctx.sfx('chirp'); if (misses < 2) ctx.bubble('Your turn!', '#7CF2B0'); });
  }
  play(time() + 1.3);

  function press() {
    if (done || showing) return;
    const i = focus;
    if (seq[pos] === i) {
      light(i); if (pos > 0) link(pos); beads[pos].material.color.setHex(0x7CF2B0); pos++;
      if (pos >= seq.length) { done = true; doneT = time(); ctx.correct(pods[i].g.position);
        tw.at(doneT + .9, () => ctx.finish({ firstTry: misses === 0, why: r.why })); }
    } else {
      misses++; pods[i].wig = time(); ctx.wrong(r.hint);
      beads.forEach(b => b.material.color.setHex(0x4A3C9E));
      showing = true; play(time() + 1.1);           // watch again (native replays after ~0.9 s)
    }
  }
  return {
    key(k) {
      if (k === 'left' && focus > 0) { focus--; return true; } if (k === 'right' && focus < n - 1) { focus++; return true; }
      if (k === 'left' || k === 'right') return true;
      if (k === 'ok') { press(); return true; } return false;
    },
    focusX() { return pods[focus] ? pods[focus].g.position.x : 0; },
    lookX() { return clamp((focus - (n - 1) / 2) / 2, -1, 1); },
    update(t, dt) {
      tw.update(t);
      pods.forEach((p, i) => {
        const k = t - p.lit, on = k < Math.max(.5, ms * .72) || done, f = i === focus && !showing && !done;
        p.lift += ((f ? 1 : 0) - p.lift) * (CFG.reduced ? 1 : clamp(dt * 12));
        const pop = on && !CFG.reduced ? 1 + .3 * Math.sin(clamp(k / .45) * Math.PI) : 1;
        p.g.scale.setScalar(sc * pop * (1 + p.lift * .12));
        p.g.position.z = p.lift * .6; p.g.rotation.set(-.12 * p.lift, CFG.reduced ? 0 : Math.sin(t * .8 + i) * .1, wig(t, p.wig));
        p.orb.material.emissiveIntensity = on ? .7 : (showing ? .05 : .15);
        p.face.material.opacity = on || !showing ? 1 : .55;
        p.gl.visible = on && !CFG.reduced;
        p.halo.material.color.setHex(t - p.wig < .6 ? 0xFFB347 : on ? 0xFFFFFF : f ? 0xFFE29A : (showing ? 0x3A2E80 : 0x8C7BFF));
        p.halo.scale.setScalar(f ? 1.08 + (CFG.reduced ? 0 : .04 * Math.sin(t * 5)) : 1);
      });
      lines.forEach(m => { if (!m.visible) return; const u = CFG.reduced ? 1 : clamp((t - m.userData.t0) / .35);
        const w = done && !CFG.reduced ? .09 + .04 * Math.sin((t - doneT) * 8) : .07; m.scale.set(w, m.userData.len * u, w); });
      if (done && !CFG.reduced) beads.forEach((b, i) => b.scale.setScalar(.2 + .06 * Math.sin((t - doneT) * 8 - i)));
    },
    dispose() { },
  };
}
