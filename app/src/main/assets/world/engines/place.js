// PLACE engine (MainActivity.showPlace): items float in one at a time from a queue in the sky. The current item
// hovers over the focused bin; LEFT/RIGHT carries it from bin to bin (the lid under it opens), OK drops it in.
// Round fields: items, bins [{face, label}], answers (bin index per item), hint, why.
// Answer rule (same as native): item i goes in bin answers[i]. A wrong bin snaps its lid shut, the item bounces
// back up and wiggles, ctx.wrong(hint); from the 2nd miss on the same item the right bin pulses.
// The same core also runs SORT rounds (see sort.js), which add native pick rules: wrong bins dim, `fade`,
// `oops`, `answer`, `also_ok`, `any_ok`.
import { THREE, CFG, time, clamp, ease, easeOutBack } from '../core/engine.js';
import { PALETTE } from '../core/kit.js';
import { CARD_GEO, RING_GEO, faceMesh, labelMesh, lam, basic, wig, tweens } from './parts.js';

const BUCKET_GEO = new THREE.CylinderGeometry(1.2, .95, 1.7, 32, 1, true), BOTTOM_GEO = new THREE.CircleGeometry(.95, 32);
const RIM_GEO = new THREE.TorusGeometry(1.2, .09, 8, 40), LID_GEO = new THREE.CylinderGeometry(1.28, 1.28, .16, 32), KNOB_GEO = new THREE.SphereGeometry(.2, 12, 8);
const DISC_GEO = new THREE.CircleGeometry(.52, 32), QDISC_GEO = new THREE.CircleGeometry(.42, 24);

/** cfg: { items, bins:[{face,label}], ok(itemIdx, binIdx) → bool, right(itemIdx) → bin index to point at,
 *        dimWrong, fade, focus, big } */
export function placeCore(ctx, r, cfg) {
  const root = ctx.root, items = cfg.items.map(String), bins = cfg.bins, nb = bins.length, tw = tweens();
  let cur = 0, misses = 0, itemMiss = 0, done = false, busy = false, doneT = -1, focus = clamp(cfg.focus || 0, 0, nb - 1);
  const bs = nb > 3 ? 3 / nb * 1.08 : 1, stepX = 3.75 * bs, BX = i => .8 + (i - (nb - 1) / 2) * stepX;
  const BY = -.2, BZ = 1.0;

  // ---------- bins ----------
  const B = bins.map((b, i) => {
    const g = new THREE.Group(); g.position.set(BX(i), BY, BZ); g.scale.setScalar(bs); root.add(g);
    const col = i % 2 ? 0x9C8EEA : 0xB4A8F4;   // neutral: the badge carries the meaning (colour-sorting rounds!)
    const body = new THREE.Mesh(BUCKET_GEO, lam(col, { side: THREE.DoubleSide })); g.add(body);
    const inner = new THREE.Mesh(BOTTOM_GEO, basic(0x1A1150)); inner.rotation.x = -Math.PI / 2; inner.position.y = -.8; g.add(inner);
    const rim = new THREE.Mesh(RIM_GEO, lam(0xF4F0FF)); rim.rotation.x = Math.PI / 2; rim.position.y = .85; g.add(rim);
    const ring = new THREE.Mesh(RING_GEO, basic(0x8C7BFF)); ring.rotation.x = Math.PI / 2; ring.position.y = -.95; ring.scale.setScalar(1.05); g.add(ring);
    const hinge = new THREE.Group(); hinge.position.set(0, .9, -1.2); g.add(hinge);
    const lid = new THREE.Mesh(LID_GEO, lam(col)); lid.position.set(0, 0, 1.2); hinge.add(lid);
    const knob = new THREE.Mesh(KNOB_GEO, lam(0xF4F0FF)); knob.position.set(0, .15, 1.2); hinge.add(knob);
    const disc = new THREE.Mesh(DISC_GEO, basic(0xFFFFFF)); disc.position.set(0, .3, 1.3); disc.rotation.x = -.14; g.add(disc);
    const face = faceMesh(b.face || '', .85); face.position.set(0, .3, 1.33); face.rotation.x = -.14; g.add(face);
    let label = null; if (b.label) { label = labelMesh(b.label, 2.4, .64); label.position.set(0, -1.45, 1.1); g.add(label); }
    const minis = new THREE.Group(); minis.position.set(0, -.56, 1.14); g.add(minis);
    return { g, body, lid, hinge, ring, disc, face, label, minis, col, open: 0, lift: 0, wig: -9, slam: -9, pulse: false, off: false, cheer: -9 };
  });

  // ---------- current item (held above the focused bin) and the queue ----------
  const held = new THREE.Group(); root.add(held);
  const hs = cfg.big ? .95 : .72;
  const heldBody = new THREE.Mesh(CARD_GEO, lam(0xFFF6E0, { emissive: 0x4A4060 })); heldBody.scale.setScalar(hs); held.add(heldBody);
  let heldFace = null;
  const setHeld = i => { if (heldFace) held.remove(heldFace); heldFace = faceMesh(items[i], 1.65 * hs); heldFace.position.z = .32 * hs; held.add(heldFace); };
  const HY = 3.0, hp = new THREE.Vector3(BX(focus), HY, BZ); held.position.copy(hp);
  let heldMode = 'hover', heldWig = -9, heldBorn = time();
  const queue = items.map((txt, i) => { if (i === 0) return null; const g = new THREE.Group(); root.add(g);
    const d = new THREE.Mesh(QDISC_GEO, basic(0x2A1E7A)); g.add(d); const f = faceMesh(txt, .7); f.position.z = .02; g.add(f); g.userData.k = i; return g; });
  const qx = j => 3.5 + j * Math.min(1.0, 6.2 / Math.max(1, items.length - 1)), QY = 4.3, QZ = -1.2;
  function layoutQueue(t) { queue.forEach((q, i) => { if (!q) return; const j = i - cur - 1; q.visible = j >= 0; if (j < 0) return;
    const tx = qx(j); q.position.x += (tx - q.position.x) * (CFG.reduced ? 1 : .15); q.position.y = QY + (CFG.reduced ? 0 : Math.sin(t * 1.4 + i) * .08); q.position.z = QZ; }); }
  queue.forEach((q, i) => { if (q) q.position.set(qx(i - 1) + 4, QY, QZ); });
  setHeld(0);

  function move(d) { let i = focus + d; while (i >= 0 && i < nb && B[i].off) i += d; if (i >= 0 && i < nb) focus = i; return true; }
  function dim(i) { const b = B[i]; if (b.off || i === cfg.right(cur) || cfg.ok(cur, i)) return; b.off = true; b.body.material.color.multiplyScalar(.4); b.lid.material.color.multiplyScalar(.4); b.face.material.opacity = .35;
    if (b.label) b.label.material.opacity = .45; b.disc.material.color.setHex(0x8A86A8); if (focus === i) { if (!move(1) || focus === i) move(-1); } }
  const TMP = new THREE.Vector3();

  function press() {
    if (done || busy) return;
    const bi = focus, b = B[bi]; if (b.off) return;
    busy = true; const t0 = time(), from = held.position.clone();
    if (cfg.ok(cur, bi)) {
      heldMode = 'drop'; b.open = 1; ctx.sfx('pop');
      const to = TMP.set(b.g.position.x, BY + .55 * bs, BZ).clone();
      tw.run(t0, .45, u => { const e = ease(u); held.position.lerpVectors(from, to, e); held.scale.setScalar(1 - e * .7); held.rotation.y = e * 3.14; }, () => {
        held.visible = false; ctx.correct(TMP.set(b.g.position.x, BY + 1.2, BZ)); b.cheer = time();
        const m = faceMesh(items[cur], .44); b.minis.add(m); const k = b.minis.children.length, sp = Math.min(.46, 1.75 / k);
        b.minis.children.forEach((c, j) => c.position.set((j - (k - 1) / 2) * sp, 0, 0));
        cur++; itemMiss = 0; B.forEach(x => x.pulse = false);
        if (cur >= items.length) { done = true; doneT = time(); tw.at(doneT + .8, () => ctx.finish({ firstTry: misses === 0, why: r.why })); busy = false; return; }
        // next item flies in from the queue
        const q = queue[cur], qf = q.position.clone(); q.visible = false; q.userData.gone = true; setHeld(cur);
        held.visible = true; held.rotation.set(0, 0, 0); heldMode = 'arrive';
        tw.run(time() + .15, .45, u => { const e = ease(u); held.position.lerpVectors(qf, TMP.set(B[focus].g.position.x, HY, BZ), e); held.scale.setScalar(.45 + .55 * easeOutBack(u)); },
          () => { heldMode = 'hover'; busy = false; });
      });
    } else {
      heldMode = 'drop'; b.slam = t0; misses++; itemMiss++;
      const to = from.clone(); to.y = BY + 1.55 * bs;
      tw.run(t0, .22, u => { held.position.lerpVectors(from, to, u * u); }, () => {
        ctx.sfx('bump'); heldWig = time(); b.wig = time(); ctx.wrong(r.hint);
        if (cfg.dimWrong) dim(bi);
        if (misses === 1 && cfg.fade != null && cfg.fade >= 0 && cfg.fade < nb) dim(cfg.fade);
        if (cfg.dimWrong && misses >= 2) B.forEach((x, i) => { if (i !== cfg.right(cur)) dim(i); });
        if (itemMiss >= 2 || (cfg.dimWrong && misses >= 2)) { const ri = cfg.right(cur); B.forEach((x, i) => x.pulse = i === ri); }
        tw.run(time(), .35, u => { held.position.lerpVectors(to, from, ease(u)); }, () => { heldMode = 'hover'; busy = false; });
      });
    }
  }

  return {
    key(k) { if (k === 'left') return move(-1); if (k === 'right') return move(1); if (k === 'ok') { press(); return true; } return false; },
    focusX() { return B[focus].g.position.x * .7; },
    lookX() { return clamp((focus - (nb - 1) / 2) / 1.5, -1, 1); },
    update(t, dt) {
      tw.update(t); layoutQueue(t);
      const k = CFG.reduced ? 1 : clamp(dt * 10);
      if (heldMode === 'hover') { held.position.x += (B[focus].g.position.x - held.position.x) * k; held.position.y = HY + (CFG.reduced ? 0 : Math.sin(t * 2) * .1); held.position.z = BZ;
        const pop = CFG.reduced ? 1 : Math.max(.001, easeOutBack(clamp((t - heldBorn) / .5)));
        held.scale.setScalar(pop); held.rotation.set(.12, CFG.reduced ? 0 : Math.sin(t * 1.2) * .2, wig(t, heldWig)); }
      B.forEach((b, i) => {
        const f = i === focus && !done && !b.off;
        b.lift += ((f ? 1 : 0) - b.lift) * k;
        const slam = t - b.slam < .35, cheer = t - b.cheer < .5 || (done && !b.off && t - doneT < 1.2);
        const want = slam ? 0 : (heldMode === 'drop' && f) || cheer ? 1.25 : f ? .35 : 0;
        b.open += (want - b.open) * (CFG.reduced ? 1 : clamp(dt * (slam ? 30 : 9)));
        b.hinge.rotation.x = -b.open;
        b.g.position.y = BY + b.lift * .3; b.g.rotation.set(-.08 * b.lift, 0, wig(t, b.wig));
        const s = bs * (1 + b.lift * .06 + (b.pulse && !CFG.reduced ? .05 * Math.sin(t * 7) : 0) + (cheer && !CFG.reduced ? .08 * Math.sin(clamp((t - b.cheer) / .5) * Math.PI) : 0));
        b.g.scale.setScalar(s);
        b.ring.material.color.setHex(t - b.wig < .6 ? 0xFFB347 : b.pulse ? (Math.sin(t * 7) > 0 ? 0xFFE29A : 0x8C7BFF) : b.off ? 0x3A2E80 : f ? 0xFFE29A : 0x8C7BFF);
      });
    },
    dispose() { },
  };
}

export default function place(ctx, r) {
  const items = r.items || [], answers = (r.answers || []).map(Number);
  return placeCore(ctx, r, { items, bins: (r.bins || []).map(b => typeof b === 'string' ? { face: b } : b),
    ok: (i, b) => answers[i] === b, right: i => answers[i] });
}
