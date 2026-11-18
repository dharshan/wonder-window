// ORDER engine (MainActivity.showOrder): a space train with numbered empty carriages waits on a rail; the
// cards float below, shuffled. LEFT/RIGHT chooses a card, OK sends it up into the next lit carriage.
// Round fields: items (already in the right order), labels (optional word under each card),
// scales (optional per-item size, e.g. smallest → biggest), direction (informational only), hint, why.
// Answer rule (same as native): the card for position `pos` must be chosen next. Identical cards (same item,
// same scale) are interchangeable, so a duplicate letter or picture is never refused.
// Ladder: a wrong card wiggles + ctx.wrong(hint); from the 2nd miss the right card pulses. Never a dead end.
import { THREE, CFG, time, clamp, ease, easeOutBack, itemTex } from '../core/engine.js';
import { PALETTE } from '../core/kit.js';
import { CARD_GEO, CARD_TALL_GEO, PED_GEO, RING_GEO, BOX_GEO, CYL_GEO, BALL_GEO, faceMesh, labelMesh, lam, basic, wig, tweens, planeGeo } from './parts.js';

const DISC_GEO = new THREE.CircleGeometry(.95, 40);
const SOCKET_GEO = new THREE.TorusGeometry(.95, .07, 6, 40);

export default function order(ctx, r) {
  const root = ctx.root, items = (r.items || []).map(String), n = items.length;
  const labels = Array.isArray(r.labels) ? r.labels.map(String) : null, scales = Array.isArray(r.scales) ? r.scales.map(Number) : null;
  const scaleOf = k => scales && scales[k] != null && !isNaN(scales[k]) ? scales[k] : 1;
  const tall = !!labels; const tw = tweens();
  let pos = 0, misses = 0, done = false, busy = false, doneT = -1;

  // ---------- the train (top row) ----------
  const train = new THREE.Group(); root.add(train);
  const step = 2.55, locoW = 2.7, W = n * step + locoW, s = Math.min(1, 12.6 / W);
  train.scale.setScalar(s); train.position.set(.7, 2.55, -1.3);
  const x0 = -W / 2 + locoW;                       // carriage 0 centre is x0 + step/2
  const rail = new THREE.Mesh(BOX_GEO, lam(0x8C7BFF)); rail.scale.set(W + 3, .12, .25); rail.position.set(.6, -.98, .2); train.add(rail);
  const rail2 = rail.clone(); rail2.position.z = -.35; train.add(rail2);
  const wheels = [];
  const wheel = (g, x, rad = .32) => { const w = new THREE.Mesh(CYL_GEO, lam(0x2A1E5A)); w.rotation.x = Math.PI / 2; w.scale.set(rad, .9, rad); w.position.set(x, -.65, 0); g.add(w);
    const hub = new THREE.Mesh(CYL_GEO, basic(0xFFC94A)); hub.rotation.x = Math.PI / 2; hub.scale.set(rad * .4, .94, rad * .4); hub.position.copy(w.position); g.add(hub); wheels.push(w); };
  // locomotive
  const loco = new THREE.Group(); loco.position.x = -W / 2 + locoW / 2 - .1; train.add(loco);
  const boiler = new THREE.Mesh(CYL_GEO, lam(0xFF5D7A)); boiler.rotation.z = Math.PI / 2; boiler.scale.set(.62, 1.5, .62); boiler.position.set(-.35, .05, 0); loco.add(boiler);
  const cab = new THREE.Mesh(BOX_GEO, lam(0xFFC94A)); cab.scale.set(1.0, 1.55, 1.25); cab.position.set(.75, .35, 0); loco.add(cab);
  const roof = new THREE.Mesh(BOX_GEO, lam(0x4DD6FF)); roof.scale.set(1.25, .18, 1.45); roof.position.set(.75, 1.2, 0); loco.add(roof);
  const win = new THREE.Mesh(planeGeo(.55), basic(0xE6F6FF)); win.position.set(.75, .6, .63); loco.add(win);
  const chimney = new THREE.Mesh(CYL_GEO, lam(0x3A2A9E)); chimney.scale.set(.2, .6, .2); chimney.position.set(-.8, .85, 0); loco.add(chimney);
  const nose = new THREE.Mesh(CYL_GEO, lam(0xFFC94A)); nose.rotation.z = Math.PI / 2; nose.scale.set(.5, .12, .5); nose.position.set(-1.1, .05, 0); loco.add(nose);
  const base0 = new THREE.Mesh(BOX_GEO, lam(0x3A2A9E)); base0.scale.set(2.5, .3, 1.2); base0.position.set(0, -.42, 0); loco.add(base0);
  [-.75, .1, .85].forEach(x => wheel(loco, x, x < 0 ? .3 : .36));
  const puffs = [0, 1, 2, 3].map(i => { const p = new THREE.Mesh(BALL_GEO, lam(0xF2EEFF)); p.position.set(-.8, 1.3, 0); p.visible = false; p.userData.k = i; loco.add(p); return p; });
  // carriages with numbered sockets
  const cars = items.map((_, i) => {
    const g = new THREE.Group(); g.position.x = x0 + step * (i + .5); train.add(g);
    const bed = new THREE.Mesh(BOX_GEO, lam(PALETTE[(i + 1) % PALETTE.length])); bed.scale.set(2.25, .32, 1.2); bed.position.y = -.42; g.add(bed);
    [-.65, .65].forEach(x => wheel(g, x));
    const cpl = new THREE.Mesh(BOX_GEO, lam(0x2A1E5A)); cpl.scale.set(.4, .12, .2); cpl.position.set(-1.25, -.42, 0); g.add(cpl);
    const slot = new THREE.Mesh(DISC_GEO, basic(0x221863)); slot.position.set(0, .72, -.25); slot.scale.set(1, tall ? 1.18 : 1, 1); g.add(slot);
    const num = faceMesh(String(i + 1), 1.2, { fg: '#8C7BFF' }); num.position.set(0, .72, -.2); g.add(num);
    const ring = new THREE.Mesh(SOCKET_GEO, basic(0x5A4AC8)); ring.position.set(0, .72, -.22); ring.scale.set(1, tall ? 1.18 : 1, 1); g.add(ring);
    return { g, bed, slot, num, ring, lit: -9, card: null };
  });

  // ---------- the cards (bottom row, shuffled; never already sorted) ----------
  const idx = items.map((_, i) => i);
  for (let tries = 0; tries < 20; tries++) { for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    if (n < 2 || idx.some((k, i) => k !== i)) break; }
  const cs = n > 4 ? 4 / n * 1.06 : 1, cstep = 3.0 * cs;
  const cards = idx.map((k, i) => {
    const base = new THREE.Group(); base.position.set(.7 + (i - (n - 1) / 2) * cstep, -.35, 1.3); base.scale.setScalar(cs); root.add(base);
    const ped = new THREE.Mesh(PED_GEO, lam(0x3A2A9E)); ped.position.y = -1.2; base.add(ped);
    const ring = new THREE.Mesh(RING_GEO, basic(0x8C7BFF)); ring.rotation.x = Math.PI / 2; ring.position.y = -.95; base.add(ring);
    const card = new THREE.Group(); base.add(card);
    const body = new THREE.Mesh(tall ? CARD_TALL_GEO : CARD_GEO, lam(PALETTE[i % PALETTE.length])); card.add(body);
    const sc = scaleOf(k), fsz = (tall ? 1.55 : 1.75) * (scales ? sc : 1);
    const face = faceMesh(items[k], fsz); face.position.set(0, (tall ? .3 : 0) - ((tall ? 1.55 : 1.75) - fsz) * .42, .33); card.add(face);   // sizes stand on one floor
    if (labels && labels[k] != null) { const L = labelMesh(labels[k], 1.85, .5); L.position.set(0, -.88, .34); card.add(L); }
    return { k, base, ring, card, body, face, born: time(), lift: 0, wig: -9, pulse: false, placed: false, fly: null };
  });
  let focus = 0;
  const live = () => cards.filter(c => !c.placed);
  function move(d) { let i = focus + d; while (i >= 0 && i < cards.length && cards[i].placed) i += d; if (i >= 0 && i < cards.length) { focus = i; ctx.sfx('bump'); } return true; }
  const same = (a, b) => items[a] === items[b] && scaleOf(a) === scaleOf(b);
  cars[0].lit = time();

  const WP = new THREE.Vector3();
  function press() {
    if (done || busy) return;
    const c = cards[focus]; if (!c || c.placed) return;
    if (!same(c.k, pos)) {                      // not the next one: wiggle, hint, try again
      misses++; c.wig = time(); ctx.wrong(r.hint);
      if (misses >= 2) { const right = cards.find(x => !x.placed && same(x.k, pos)); cards.forEach(x => x.pulse = x === right); }
      return;
    }
    // fly up into carriage `pos`
    const car = cars[pos], slot = pos; busy = true; c.placed = true; cards.forEach(x => x.pulse = false); ctx.sfx('pop');
    const from = c.card.getWorldPosition(new THREE.Vector3()), q0 = c.card.getWorldQuaternion(new THREE.Quaternion());
    root.attach(c.card); c.card.position.copy(from); c.card.quaternion.copy(q0); c.card.scale.setScalar(cs * 1.1);
    car.g.getWorldPosition(WP); const to = WP.clone(); to.y += .72 * s; to.z += .1;
    const s1 = .8 * s, t0 = time();
    tw.run(t0, .65, u => { const e = ease(u); c.card.position.lerpVectors(from, to, e); c.card.position.y += Math.sin(Math.PI * e) * 1.4;
      c.card.rotation.set(0, (1 - e) * 0 + e * Math.PI * 2, 0); c.card.scale.setScalar(cs * 1.1 + (s1 - cs * 1.1) * e); }, () => {
      car.g.attach(c.card); c.card.position.set(0, .72, .1); c.card.rotation.set(0, 0, 0); c.card.scale.setScalar(.8);
      car.card = c.card; car.lit = time(); ctx.correct(to); busy = false; pos++;
      if (pos >= n) return complete();
      cars[pos].lit = time();
      if (cards[focus].placed) { let best = -1; cards.forEach((x, i) => { if (!x.placed && (best < 0 || Math.abs(i - focus) < Math.abs(best - focus))) best = i; }); focus = best; }
      void slot;
    });
  }
  function complete() {
    done = true; doneT = time(); ctx.sfx('twinkle');
    tw.at(doneT + .9, () => ctx.finish({ firstTry: misses === 0, why: r.why }));
    cards.forEach(c => { c.base.userData.sink = time(); });
  }

  return {
    key(k) { if (k === 'left') return move(-1); if (k === 'right') return move(1); if (k === 'ok') { press(); return true; } return false; },
    focusX() { return done ? 1 : (cards[focus] ? cards[focus].base.position.x * .6 : 0); },
    lookX() { return done ? 1 : clamp((focus - (n - 1) / 2) / 2, -1, 1); },
    update(t, dt) {
      tw.update(t);
      // cards
      cards.forEach((c, i) => {
        if (c.base.userData.sink) { const u = clamp((t - c.base.userData.sink) / .5); c.base.position.y = -.35 - u * 3; return; }
        if (c.placed) { c.ring.material.color.setHex(0x3A2E80); return; }
        const pop = CFG.reduced ? 1 : Math.max(.001, easeOutBack(clamp((t - c.born - i * .08) / .5)));
        const want = i === focus && !done ? 1 : 0; c.lift += (want - c.lift) * (CFG.reduced ? 1 : clamp(dt * 12));
        c.card.position.set(0, (tall ? .3 : 0) + c.lift * .55 + (CFG.reduced ? 0 : Math.sin(t * 1.6 + i) * .05), c.lift * .5);
        c.card.rotation.set(-.18 * c.lift, CFG.reduced ? 0 : Math.sin(t * .9 + i * 2) * .06, wig(t, c.wig));
        c.card.scale.setScalar(pop * (1 + c.lift * .1 + (c.pulse && !CFG.reduced ? .07 * Math.sin(t * 7) : 0)));
        c.ring.material.color.setHex(t - c.wig < .6 ? 0xFFB347 : c.pulse ? (Math.sin(t * 7) > 0 ? 0xFFE29A : 0x8C7BFF) : c.lift > .5 ? 0xFFE29A : 0x8C7BFF);
      });
      // sockets: the next one breathes gold, filled ones glow mint
      cars.forEach((cr, i) => {
        const next = i === pos && !done, filled = i < pos;
        cr.ring.material.color.setHex(filled ? 0x7CF2B0 : next ? (CFG.reduced || Math.sin(t * 5) > -.3 ? 0xFFC94A : 0xB89020) : 0x5A4AC8);
        const k = clamp((t - cr.lit) / .4); cr.ring.scale.x = (1 + (next ? .06 * Math.sin(t * 5) : 0) + (filled && !CFG.reduced ? Math.sin(k * Math.PI) * .25 : 0)); cr.ring.scale.y = cr.ring.scale.x * (tall ? 1.18 : 1);
        cr.num.visible = !cr.card;
        if (cr.card && !CFG.reduced) cr.card.rotation.z = done ? Math.sin(t * 9 + i) * .05 : 0;
      });
      // train: idle bob, then the "choo choo" run when complete (no travel in reduced motion)
      if (done && !CFG.reduced) { const u = clamp((t - doneT - .3) / 2.4);
        train.position.x = .7 + Math.sin(u * Math.PI) * 1.6; if (u < 1) wheels.forEach(w => w.rotation.y = -(t - doneT) * 9);
        puffs.forEach(p => { const a = ((t - doneT) * 1.4 + p.userData.k / 4) % 1; p.visible = u < 1; p.position.set(-.8 - a * 1.2, 1.3 + a * 1.6, 0); p.scale.setScalar(.14 + a * .26); });
      } else if (!CFG.reduced) train.position.y = 2.55 + Math.sin(t * 1.3) * .04;
    },
    dispose() { },
  };
}
