// PAIRS engine (memory cards). Native: MainActivity.showPairs.
// Round fields: cards (faces; each appears twice), cols (default 4), hint, why.
// Rules kept from native: OK flips a card; two the same stay open; a miss flips back after ~1.1 s (no penalty);
// done when every pair is found; firstTry = misses <= number of pairs.
// 3D: crater cards that flip in 3D; a matched pair turns into two little star creatures holding the picture.
import { THREE, CFG, time, clamp, ease } from '../core/engine.js';
import { rbox, lam, face, focusFrame, craterTexture, STAR_GEO, wig, pop, prog, plane, gridStep } from './bkit.js';

export default function pairs(ctx, r) {
  const cards = (r.cards || []).map(String); const deck = [];
  cards.forEach(c => { deck.push(c); deck.push(c); });
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  const cols = Math.max(1, Math.min(r.cols || 4, deck.length)), rows = Math.ceil(deck.length / cols);
  const S = Math.min(1.85, 9.6 / cols / 1.12, 5.6 / rows / 1.12), gap = S * 1.14;
  const board = new THREE.Group(); board.position.set(.6, 1.35, -.2); ctx.root.add(board);
  // moon-rock tray under the cards
  const tray = new THREE.Mesh(rbox(cols * gap + .5, rows * gap + .5, .3, .5), lam(0x2A1E7A)); tray.position.z = -.45; board.add(tray);
  const backMat = new THREE.MeshLambertMaterial({ map: craterTexture() });
  const CARD = rbox(S, S, .22, S * .18);
  const list = deck.map((txt, i) => {
    const rr = Math.floor(i / cols), cc = i % cols, inRow = Math.min(cols, deck.length - rr * cols);
    const slot = new THREE.Group(); slot.position.set((cc - (inRow - 1) / 2) * gap, ((rows - 1) / 2 - rr) * gap, 0); board.add(slot);
    const card = new THREE.Group(); slot.add(card);
    const body = new THREE.Mesh(CARD, lam(0xFFF6E3)); card.add(body);
    const back = new THREE.Mesh(plane(S * .9), backMat); back.position.z = .25; card.add(back);           // crater side (face down)
    const front = face(txt, S * .82); front.position.z = -.25; front.rotation.y = Math.PI; card.add(front);  // picture side
    const ring = focusFrame(S + .5, S + .5, 0xFFE29A, .16); ring.position.z = .05; ring.visible = false; slot.add(ring);
    // star creature (hidden until matched)
    const crit = new THREE.Group(); crit.visible = false; slot.add(crit);
    const st = new THREE.Mesh(STAR_GEO, lam(0xFFC233, { emissive: 0x7a3d00, emissiveIntensity: .35 })); st.scale.setScalar(S * .5); crit.add(st);
    const cf = face(txt, S * .44); cf.position.set(0, -S * .06, S * .15); crit.add(cf);
    const eyes = [-1, 1].map(sx => { const e = new THREE.Mesh(EYE, EYE_M); e.position.set(sx * S * .09, S * .2, S * .13); e.scale.setScalar(S * .6); crit.add(e); return e; });
    return { i, txt, rr, cc, slot, card, body, ring, crit, eyes, flip: 0, want: 0, wig: -9, done: false, doneT: 0, born: time() + i * .04 };
  });
  let fr = 0, fc = 0, open = null, busyUntil = 0, found = 0, misses = 0, finished = false, finishAt = 0;
  const at = (r2, c2) => list.find(p => p.rr === r2 && p.cc === c2);
  const cur = () => at(fr, fc);
  const tmp = new THREE.Vector3();

  function press() {
    const p = cur(); const t = time();
    if (finished || !p || t < busyUntil || p.done || p === open || p.want) return;
    p.want = 1; ctx.sfx('pop');
    if (!open) { open = p; return; }
    const a = open; open = null;
    if (a.txt === p.txt) {
      a.done = p.done = true; a.doneT = p.doneT = t + .35; found++;
      ctx.correct(p.slot.getWorldPosition(tmp)); ctx.sfx('twinkle');
      if (found === cards.length) { finished = true; finishAt = t + 1.4; }
    } else {
      misses++; busyUntil = t + 1.1;
      setTimeout(() => { a.wig = p.wig = time(); ctx.wrong(r.hint); }, 450);
      setTimeout(() => { a.want = 0; p.want = 0; }, 1100);
    }
  }
  return {
    wantsUp: true,
    key(k) {
      if (k === 'ok') { press(); return true; }
      if (k !== 'left' && k !== 'right' && k !== 'up' && k !== 'down') return false;
      let n = gridStep(fr, fc, k, rows, cols); if (n && !at(n[0], n[1]) && k === 'down') n = [n[0], Math.min(n[1], deck.length - 1 - n[0] * cols)];
      if (n && at(n[0], n[1])) { fr = n[0]; fc = n[1]; } else { const p = cur(); if (p) p.wig = time(); ctx.sfx('bump'); }
      return true;
    },
    focusX() { const p = cur(); return p ? p.slot.position.x + board.position.x : 0; },
    lookX() { return clamp((fc - (cols - 1) / 2) / 2, -1, 1); },
    update(t, dt) {
      const f = cur();
      list.forEach(p => {
        const foc = p === f && !finished; const sp = CFG.reduced ? 1 : clamp(dt * 7);
        p.flip += (p.want - p.flip) * sp;
        const k = ease(clamp(p.flip));
        if (p.done && t > p.doneT) {                       // the pair becomes two little star creatures
          const u = prog(t, p.doneT, .5); p.card.scale.setScalar(Math.max(.001, 1 - u)); p.card.visible = u < 1;
          p.crit.visible = true; p.crit.scale.setScalar(pop(t, p.doneT + .2, .5));
          const hop = CFG.reduced ? 0 : Math.abs(Math.sin(t * 3 + p.i)) * .18;
          p.crit.position.set(0, hop, .3); p.crit.rotation.set(0, CFG.reduced ? 0 : Math.sin(t * 1.7 + p.i) * .35, CFG.reduced ? 0 : Math.sin(t * 2.3 + p.i) * .12);
          const bl = (t + p.i * .7) % 3.1 < .12 ? .15 : 1; p.eyes.forEach(e => e.scale.y = bl);
        } else {
          const lift = foc ? 1 : 0;
          p.card.position.set(0, Math.sin(k * Math.PI) * .25, lift * .35 + Math.sin(k * Math.PI) * .6);
          p.card.rotation.set(-.15 * lift, k * Math.PI, wig(t, p.wig));
          p.card.scale.setScalar(pop(t, p.born, .45) * (1 + lift * .08));
        }
        p.ring.visible = foc; if (foc) p.ring.userData.mat.color.setHex(Math.sin(t * 6) > 0 ? 0xFFE29A : 0xFFC94A);
      });
      if (finished && finishAt && t > finishAt) { finishAt = 0; ctx.finish({ firstTry: misses <= cards.length, why: r.why }); }
    },
    dispose() { backMat.dispose(); },
  };
}
const EYE = new THREE.SphereGeometry(.09, 10, 8), EYE_M = new THREE.MeshBasicMaterial({ color: 0x1F2547 });
