// PICK engine (47+ catalogue games): look at the board, choose the matching pod.
// Round fields used: board (array|string), choices, answer (index, -1 = any), labels, hint, why, oops,
// peek_board (shown first, then hidden), board_fade, count_with_me.
// Feedback ladder (no punishment): 1st miss → that pod wiggles + dims, hint; 2nd miss → the right pod pulses
// and the child presses it himself (learning by doing), counted as not-first-try.
import { THREE, CFG, time, clamp, itemTex } from '../core/engine.js';
import { makePods, makeBoard } from '../core/kit.js';

export default function pick(ctx, r) {
  const root = ctx.root; const choices = (r.choices || []).map(String); const ans = r.answer == null ? 0 : r.answer;
  const boardItems = Array.isArray(r.board) ? r.board.map(String) : (r.board ? [String(r.board)] : []);
  let board = null, orb = null, peekUntil = 0, misses = 0, done = false;
  // single target → a glowing Wonder Orb; several → a board tray
  if (boardItems.length === 1) {
    orb = new THREE.Group(); orb.position.set(0, 3.2, -1.5); root.add(orb);
    orb.add(new THREE.Mesh(new THREE.SphereGeometry(1.45, 32, 24), new THREE.MeshLambertMaterial({ color: 0x5B3BC8, emissive: 0x2A1466 })));
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), new THREE.MeshBasicMaterial({ map: itemTex(boardItems[0], { fg: '#ffffff' }), transparent: true, depthTest: false })); card.renderOrder = 5; orb.add(card); orb.userData.card = card;
    [0, 1].forEach(i => { const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8 + i * .28, .045, 6, 64), new THREE.MeshBasicMaterial({ color: i ? 0xFFC94A : 0x7CF2B0 })); ring.userData.ring = i; orb.add(ring); });
  } else if (boardItems.length) { board = makeBoard(boardItems); root.add(board); board.userData.fade(r.board_fade); }
  if (r.peek_board && !r._peeked) peekUntil = time() + 3.2;              // look, then it hides: memory rounds
  const pods = makePods(choices.length ? choices : ['?']); root.add(pods.group);
  if (r.oops) ctx.bubble(`${ctx.fill('{buddy}')} picked ${r.oops}. Which is right?`, '#FFB347');
  const target = new THREE.Vector3(0, 3.2, -1.5);

  function press() {
    if (done || time() < peekUntil) return;
    const i = pods.focus;
    if (ans < 0 || i === ans) {
      done = true; ctx.correct(null); ctx.sfx('pop');
      pods.fly(i, target, () => { ctx.correct(target); if (orb) orb.userData.pop = time(); ctx.finish({ firstTry: misses === 0, why: r.why }); });
    } else {
      misses++; pods.wiggle(i); ctx.wrong(r.hint);
      if (misses === 1) setTimeout(() => pods.dim(i), 450);
      else { pods.dim(i); pods.pulse(ans); }
    }
  }
  return {
    key(k) { if (k === 'left') pods.move(-1); else if (k === 'right') pods.move(1); else if (k === 'ok') press(); else return false; return true; },
    focusX() { return pods.list[pods.focus] ? pods.list[pods.focus].base.position.x : 0; },
    lookX() { return clamp((pods.focus - (choices.length - 1) / 2) / 2, -1, 1); },
    update(t, dt) {
      pods.update(t, dt);
      const hidden = t < peekUntil ? 0 : (r.peek_board ? 1 : 0);
      if (orb) { orb.position.y = 3.2 + Math.sin(t * 1.3) * .08; orb.rotation.y = Math.sin(t * .6) * .25;
        orb.children.forEach(c => { if (c.userData.ring !== undefined) c.rotation.set(t * (c.userData.ring ? -.5 : .7), t * (c.userData.ring ? .8 : .4), c.userData.ring * .6); });
        const p = orb.userData.pop ? clamp((t - orb.userData.pop) / .8) : 1; orb.scale.setScalar(1 + Math.sin(p * Math.PI) * .18);
        if (r.peek_board) orb.userData.card.visible = t < peekUntil || done; }
      if (board) { board.position.y = 3.3 + Math.sin(t * 1.2) * .06; if (r.peek_board) board.userData.cells.forEach(c => c.visible = t < peekUntil || done); }
      if (r.peek_board && t >= peekUntil && !this._hidSaid && !done) { this._hidSaid = true; ctx.bubble(r.prompt || 'What did you see?'); }
      if (r.count_with_me && board) board.userData.cells.forEach((c, i) => { const k = (t * 1.4) % (board.userData.cells.length + 2); c.scale.setScalar(Math.abs(k - i) < .5 ? 1.25 : 1); });
      void hidden;
    },
    dispose() { },
  };
}
