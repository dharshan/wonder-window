// KEYPAD engine (big 3D number pad). Native: MainActivity.showKeypad / checkKeypad / keypadResult.
// Round fields: target, check ('literal' only: the shell skips other keypad rounds), chunks (group sizes for
// the dots), max_tries (default 2), hint, on_miss_say, parent_help, why.
// Rules kept from native: digits fill up to `need` (sum of chunks, else target length); the entry is checked
// automatically when full, or with ✅ (✅ before full = bump); ⌫ deletes one. Typed digits only show as dots and a
// miss never shows the right number; dots reset after a miss. Miss < max_tries → hint and retry;
// miss == max_tries → 👫 parent_help and the round ends (not first try). firstTry = right on the first check.
// Needs 'up' (wantsUp) and 'down' to move on the 4×3 pad.
import { THREE, CFG, time, clamp, bridge } from '../core/engine.js';
import { rbox, lam, face, focusFrame, wig, pop, gridStep } from './bkit.js';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✅'];
export default function keypad(ctx, r) {
  const chunks = Array.isArray(r.chunks) && r.chunks.length ? r.chunks.map(Number) : [String(r.target || '').length];
  const need = chunks.reduce((a, b) => a + b, 0) || String(r.target || '').length || 1;
  const maxTries = r.max_tries || 2;
  const pad = new THREE.Group(); pad.position.set(1.2, .95, 0); ctx.root.add(pad);
  const K = 1.12, G = 1.3;
  const shell = new THREE.Mesh(rbox(3 * G + .5, 4 * G + .45, .45, .55), lam(0x2A1E7A)); shell.position.z = -.4; pad.add(shell);
  const KEY = rbox(K, K * .86, .4, .26);
  const keys = KEYS.map((txt, i) => { const rr = Math.floor(i / 3), cc = i % 3;
    const g = new THREE.Group(); g.position.set((cc - 1) * G, (1.5 - rr) * G, 0); pad.add(g);
    const cap = new THREE.Group(); g.add(cap);
    const col = txt === '✅' ? 0x2F9E5A : txt === '⌫' ? 0x6B5BC8 : 0xFFF3D6;
    const body = new THREE.Mesh(KEY, lam(col, { emissive: col, emissiveIntensity: .18 })); cap.add(body);
    const f = face(txt, K * .78, { fg: txt === '✅' || txt === '⌫' ? '#ffffff' : '#1F2547' }); f.position.z = .34; cap.add(f);
    const ring = focusFrame(K + .22, K * .86 + .22, 0xFFE29A, .1); ring.position.z = .05; ring.visible = false; g.add(ring);
    return { txt, rr, cc, g, cap, ring, press: -9, born: time() + i * .03 }; });
  // the code screen: one socket per digit, grouped by chunk; a typed digit lights a gem (never the digit itself)
  const scr = new THREE.Group(); scr.position.set(5.7, 2.4, 0); scr.scale.setScalar(1.6); ctx.root.add(scr);
  const gems = []; let x = 0; const step = .62, cgap = .5; const total = need * step + (chunks.length - 1) * cgap;
  chunks.forEach((n, ci) => { for (let k = 0; k < n; k++) { const sock = new THREE.Mesh(SOCK, lam(0x1A1250)); sock.rotation.x = Math.PI / 2; sock.position.x = x - total / 2 + step / 2; scr.add(sock);
      const gem = new THREE.Mesh(GEM, lam(0x7CF2B0, { emissive: 0x2A8A5A, flatShading: true })); gem.position.set(sock.position.x, 0, .2); gem.visible = false; scr.add(gem); gems.push(gem); x += step; } x += cgap; });
  const plate = new THREE.Mesh(rbox(total + .6, .85, .2, .3), lam(0x3C2C8E)); plate.position.z = -.25; scr.add(plate);
  let fr = 0, fc = 0, typed = '', tries = 0, finished = false, shakeT = -9, litT = [];

  function setDots() { gems.forEach((g, i) => { const on = i < typed.length; if (on && !g.visible) litT[i] = time(); g.visible = on; }); }
  function checkEntry() {
    if (typed.length < need) { ctx.sfx('bump'); shakeT = time(); return; }
    const entry = typed; typed = ''; tries++;
    const ok = r.check === 'literal' && entry === String(r.target);
    if (ok) { finished = true; setDots(); gems.forEach(g => g.visible = true); ctx.correct(scr.getWorldPosition(new THREE.Vector3())); ctx.sfx('twinkle');
      setTimeout(() => ctx.finish({ firstTry: tries === 1, why: r.why }), CFG.reduced ? 500 : 1300); return; }
    shakeT = time(); setTimeout(setDots, 350);
    if (tries >= maxTries) { finished = true; ctx.wrong(r.hint); ctx.bubble('👫 ' + (r.parent_help || 'Practise with a grown-up.'), '#B49CFF');
      if (r.on_miss_say && bridge.get('autovoice', false)) ctx.say(r.on_miss_say);
      setTimeout(() => ctx.finish({ firstTry: false, why: '👫 ' + (r.parent_help || 'Practise with a grown-up.') }), 2600); }
    else { ctx.wrong(r.hint); if (r.hint) ctx.bubble('🤔 ' + r.hint, '#FFB347'); }   // native shows the hint on the first miss
  }
  function press() {
    if (finished) return; const k = keys[fr * 3 + fc]; k.press = time();
    if (k.txt === '✅') return checkEntry();
    if (k.txt === '⌫') { if (typed.length) typed = typed.slice(0, -1); ctx.sfx('pop'); setDots(); return; }
    if (typed.length < need) { typed += k.txt; ctx.sfx('pop'); setDots(); }
    if (typed.length === need) setTimeout(checkEntry, 250);
  }
  return {
    wantsUp: true,
    key(k) {
      if (k === 'ok') { press(); return true; }
      if (k !== 'left' && k !== 'right' && k !== 'up' && k !== 'down') return false;
      const n = gridStep(fr, fc, k, 4, 3); if (n) { fr = n[0]; fc = n[1]; } else { keys[fr * 3 + fc].press = -9; keys[fr * 3 + fc].wig = time(); ctx.sfx('bump'); }
      return true;
    },
    focusX() { return pad.position.x + (fc - 1) * G; },
    lookX() { return clamp(.4 + (fc - 1) * .3, -1, 1); },
    update(t) {
      keys.forEach((k, i) => { const foc = !finished && i === fr * 3 + fc; const pr = t - k.press < .18 ? Math.sin((t - k.press) / .18 * Math.PI) : 0;
        k.cap.position.z = (foc ? .3 : 0) - pr * .28; k.cap.rotation.set(foc ? -.15 : 0, 0, wig(t, k.wig || -9, .15));
        k.g.scale.setScalar(pop(t, k.born, .4) * (foc ? 1.08 : 1));
        k.ring.visible = foc; if (foc) k.ring.userData.mat.color.setHex(Math.sin(t * 6) > 0 ? 0xFFE29A : 0xFFC94A); });
      scr.position.x = 5.7 + (t - shakeT < .5 ? Math.sin((t - shakeT) * 40) * .15 * (1 - (t - shakeT) / .5) : 0);
      gems.forEach((g, i) => { g.rotation.y = CFG.reduced ? .6 : t * 2 + i; g.scale.setScalar(pop(t, litT[i] || 0, .3) * (finished && tries && typed === '' && g.visible ? 1 + .15 * Math.abs(Math.sin(t * 5 + i)) : 1)); });
    },
    dispose() {},
  };
}
const SOCK = new THREE.CylinderGeometry(.24, .24, .12, 20), GEM = new THREE.OctahedronGeometry(.24, 0);
