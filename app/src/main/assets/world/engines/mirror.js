// MIRROR engine (symmetry butterfly). Native: MainActivity.showMirror.
// Round fields: rows, cols, left (rows×cols emoji), palette, hint, why.
// Rules kept from native: every right-wing tile starts empty; OK cycles it through the palette; Done checks that
// right[i][j] == left[i][cols-1-j] for every tile; a miss wiggles the wrong tiles + hint and may be retried;
// firstTry = no failed Done.
// 3D: a butterfly whose right wing is painted tile by tile (tiles fold over as they change); when both wings
// match it flaps and flies a loop.
import { THREE, CFG, time, clamp } from '../core/engine.js';
import { rbox, lam, face, setFace, focusFrame, bigButton, wig, pop, prog, gridStep , makeTimers } from './bkit.js';

const WING_GEO = new THREE.CircleGeometry(1, 40);
export default function mirror(ctx, r) {
  const TM = makeTimers();
  const rows = r.rows || 2, cols = r.cols || 1, left = r.left || [], pal = (r.palette || []).map(String);
  const T = Math.min(1.3, 4.4 / rows / 1.1, 3.6 / cols / 1.1), gap = T * 1.12, bodyW = .9;
  const fly = new THREE.Group(); fly.position.set(.8, 1.75, 0); ctx.root.add(fly);
  // body: segmented caterpillar-like body, head with eyes, antennae
  const bodyM = lam(0x3B2A7A), body = new THREE.Group(); fly.add(body);
  const H = rows * gap;
  for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(SEG, bodyM); const sc = .42 - k * .03; s.scale.set(sc, sc * 1.1, sc); s.position.y = H / 2 - .25 - k * (H - .2) / 5; body.add(s); }
  const head = new THREE.Mesh(SEG, lam(0x4D3AA0)); head.scale.setScalar(.52); head.position.y = H / 2 + .35; body.add(head);
  [-1, 1].forEach(sx => { const e = new THREE.Mesh(SEG, EYE_W); e.scale.setScalar(.15); e.position.set(sx * .18, H / 2 + .42, .4); body.add(e);
    const p = new THREE.Mesh(SEG, EYE_P); p.scale.setScalar(.08); p.position.set(sx * .18, H / 2 + .42, .53); body.add(p);
    const a = new THREE.Mesh(ANT, bodyM); a.position.set(sx * .25, H / 2 + 1.0, 0); a.rotation.z = -sx * .35; body.add(a);
    const tip = new THREE.Mesh(SEG, lam(0xFFC94A)); tip.scale.setScalar(.11); tip.position.set(sx * .45, H / 2 + 1.42, 0); body.add(tip); });
  // two wings, each pivoting on the body; tiles sit on the wing panels
  const mkWing = (side) => { const pivot = new THREE.Group(); pivot.position.x = side * bodyW / 2; fly.add(pivot);
    const w = cols * gap + .5, cy = 0;
    [[.55, 1.0, 0xFF8FC8], [.45, .75, 0xFFB86B]].forEach(([fy, s, c], k) => { const m = new THREE.Mesh(WING_GEO, lam(c));
      m.scale.set(w * .62 * s + .25, H * .38 * s + .3, 1); m.position.set(side * (w / 2 + .05), cy + (k ? -H * .22 : H * .12), -.25 - k * .02); pivot.add(m); });
    return pivot; };
  const lw = mkWing(-1), rw = mkWing(1);
  const tileGeo = rbox(T, T, .2, T * .2);
  const ty = i => ((rows - 1) / 2 - i) * gap;
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const g = new THREE.Group(); g.position.set(-(.1 + gap / 2 + (cols - 1 - j) * gap), ty(i), 0); lw.add(g);
    g.add(new THREE.Mesh(tileGeo, lam(0xFFE9F2))); const f = face((left[i] || [])[j], T * .8); f.position.z = .25; g.add(f); }
  const tiles = [];
  for (let i = 0; i < rows; i++) { tiles.push([]); for (let j = 0; j < cols; j++) {
    const g = new THREE.Group(); g.position.set(.1 + gap / 2 + j * gap, ty(i), 0); rw.add(g);
    const inner = new THREE.Group(); g.add(inner);
    const body2 = new THREE.Mesh(tileGeo, lam(0x5A4AA8)); inner.add(body2);
    const f = face("?", T * .7, { fg: "#CFC6FF" }); f.position.z = .25; inner.add(f);
    const ring = focusFrame(T + .3, T + .3, 0xFFE29A, .13); ring.position.z = .12; ring.visible = false; g.add(ring);
    tiles[i].push({ i, j, g, inner, body: body2, f, ring, pick: -1, flipT: -9, wig: -9, bad: false }); } }
  const done = bigButton('✅  Done', { w: 3.2, h: 1.0 }); done.group.position.set(.8, -1.55, .6); ctx.root.add(done.group);
  let fr = 0, fc = 0, onDone = false, misses = 0, won = 0, finished = false;

  function cycle(t) { t.pick = (t.pick + 1) % pal.length; t.flipT = time(); ctx.sfx('pop');
    TM.after((CFG.reduced ? 0 : 130) / 1000, () => { setFace(t.f, pal[t.pick]); t.body.material.color.setHex(0xFFF3D6); t.bad = false; }); }
  function check() {
    if (finished) return; let ok = true;
    tiles.forEach(row => row.forEach(t => { const want = String(((left[t.i] || [])[cols - 1 - t.j]) ?? ''); const got = t.pick < 0 ? '' : pal[t.pick];
      if (want !== got) { ok = false; t.wig = time(); t.bad = true; t.body.material.color.setHex(0xFFB347); } }));
    if (ok) { finished = true; won = time(); ctx.correct(fly.getWorldPosition(new THREE.Vector3())); ctx.sfx('twinkle');
      TM.after((CFG.reduced ? 600 : 2200) / 1000, () => ctx.finish({ firstTry: misses === 0, why: r.why })); }
    else { misses++; done.group.userData.wig = time(); ctx.wrong(r.hint); }
  }
  return {
    wantsUp: true,
    key(k) {
      if (finished) return k !== 'up';
      if (k === 'ok') { if (onDone) check(); else cycle(tiles[fr][fc]); return true; }
      if (k === 'down' && !onDone && fr === rows - 1) { onDone = true; return true; }
      if (k === 'up' && onDone) { onDone = false; return true; }
      if (onDone) { if (k === 'left' || k === 'right') { ctx.sfx('bump'); return true; } return false; }
      if (k !== 'left' && k !== 'right' && k !== 'up' && k !== 'down') return false;
      const n = gridStep(fr, fc, k, rows, cols); if (n) { fr = n[0]; fc = n[1]; } else { tiles[fr][fc].wig = time(); ctx.sfx('bump'); }
      return true;
    },
    focusX() { return onDone ? .8 : .8 + tiles[fr][fc].g.position.x + bodyW / 2; },
    lookX() { return onDone ? 0 : clamp(.3 + fc * .3, -1, 1); },
    update(t) { TM.tick(t);
      tiles.forEach(row => row.forEach(p => { const foc = !onDone && !finished && p.i === fr && p.j === fc;
        const u = prog(t, p.flipT, .26); p.inner.rotation.x = u < 1 ? Math.sin(u * Math.PI) * 1.4 : 0; p.inner.rotation.z = wig(t, p.wig);
        p.inner.position.z = foc ? .3 : 0; p.g.scale.setScalar(foc ? 1.1 : 1);
        p.ring.visible = foc; if (foc) p.ring.userData.mat.color.setHex(Math.sin(t * 6) > 0 ? 0xFFE29A : 0xFFC94A); }));
      done.set(onDone && !finished, t); done.group.rotation.z = wig(t, done.group.userData.wig || -9, .12); done.group.visible = !finished;
      // gentle idle flutter; after a win: strong flaps, then a loop through the sky and back
      let flap = CFG.reduced ? 0 : Math.sin(t * 2.2) * .08;
      if (won) { const k = t - won; flap = CFG.reduced ? .5 : Math.abs(Math.sin(k * 9)) * .9;
        if (!CFG.reduced) { const u = clamp((k - .5) / 1.6); fly.position.set(.8 + Math.sin(u * Math.PI * 2) * 3.5, 1.75 + Math.sin(u * Math.PI) * 1.6, -Math.sin(u * Math.PI) * 3); fly.rotation.z = -Math.cos(u * Math.PI * 2) * .25 * Math.sin(u * Math.PI); } }
      lw.rotation.y = flap; rw.rotation.y = -flap;
      body.rotation.z = CFG.reduced ? 0 : Math.sin(t * 1.4) * .03;
    },
    dispose() { TM.clear();},
  };
}
const SEG = new THREE.SphereGeometry(1, 18, 14), ANT = new THREE.CylinderGeometry(.03, .03, .9, 6);
const EYE_W = new THREE.MeshLambertMaterial({ color: 0xffffff }), EYE_P = new THREE.MeshBasicMaterial({ color: 0x1F2547 });
