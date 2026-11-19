// RECITE engine. Native: MainActivity.showRecite.
// He says it aloud; a grown-up presses ✅ or 🔁. Nothing is recorded or stored (no microphone is used).
// Round fields: prompt, parent_prompt, buttons [ok, again] (default ✅ 🔁), labels (default "Said it!",
// "Practise more"), practise_say, why.
// Rules kept from native: ✅ always finishes the round as first try; 🔁 just shows/speaks practise_say and stays.
// 3D: a little stage where Astro's sound rings pulse while he speaks; two big buttons (left/right + OK).
import { THREE, CFG, time, clamp, bridge } from '../core/engine.js';
import { lam, face, label3d, bigButton, wig , makeTimers } from './bkit.js';

export default function recite(ctx, r) {
  const T = makeTimers();
  const bs = r.buttons || ['✅', '🔁'], ls = r.labels || ['Said it!', 'Practise more'];
  // stage: podium + speaking star + sound rings (opaque thin tori, no transparency)
  const stage = new THREE.Group(); stage.position.set(.6, 1.7, -.8); ctx.root.add(stage);
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.3, .6, 40), lam(0x3A2A9E)); pod.position.y = -.6; stage.add(pod);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, .08, 40), lam(0xFFC94A)); top.position.y = -.27; stage.add(top);
  const rings = [0, 1, 2].map(i => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, .07, 6, 48, Math.PI * .6), new THREE.MeshBasicMaterial({ color: [0x7CF2B0, 0x4DD6FF, 0xFF7AA8][i] }));
    m.rotation.z = -Math.PI * .3; m.position.set(-.3, 1.5, 0); stage.add(m); return m; });
  const speaker = face('🗣️', 2.6); speaker.position.set(-1.0, 1.4, 0); stage.add(speaker);
  // grown-up line (he can't read it; it's for the adult) on a card under the stage
  let pp = null; if (r.parent_prompt) { pp = label3d('👫 ' + ctx.fill(r.parent_prompt), 9.5, 1.0, { bg: '#2A1E7A', font: 64 }); pp.position.set(.6, -.2, .4); ctx.root.add(pp); }
  const ok = bigButton(bs[0] + '  ' + ls[0], { w: 4.2, h: 1.15 }), again = bigButton(bs[1] + '  ' + ls[1], { w: 4.2, h: 1.15, color: 0x5B4BC0, bg: '#2A1E7A' });
  ok.group.position.set(-1.7, -1.45, 1.0); again.group.position.set(2.9, -1.45, 1.0); ctx.root.add(ok.group, again.group);
  let focus = 0, finished = false, practiseT = -9;
  return {
    key(k) {
      if (k === 'left' || k === 'right') { const n = k === 'left' ? 0 : 1; if (n === focus) { (focus ? again : ok).group.userData.wig = time(); ctx.sfx('bump'); } focus = n; return true; }
      if (k !== 'ok') return false; if (finished) return true;
      if (focus === 0) { finished = true; ctx.correct(stage.getWorldPosition(new THREE.Vector3()).setY(2.5)); ctx.sfx('fanfare');
        T.after((CFG.reduced ? 300 : 900) / 1000, () => ctx.finish({ firstTry: true, why: r.why })); }
      else { ctx.sfx('pop'); practiseT = time(); if (r.practise_say) { ctx.bubble('🔁 ' + r.practise_say, '#B49CFF'); if (bridge.get('autovoice', false)) ctx.say(r.practise_say); } }
      return true;
    },
    focusX() { return focus ? 3.0 : -1.8; },
    lookX() { return focus ? .5 : -.2; },
    update(t) { T.tick(t);
      ok.set(focus === 0 && !finished, t); again.set(focus === 1 && !finished, t);
      [ok, again].forEach(b => { b.group.rotation.z = wig(t, b.group.userData.wig || -9, .1); });
      const talk = CFG.reduced ? .5 : .5 + .5 * Math.sin(t * 9) * Math.sin(t * 2.3);
      speaker.scale.setScalar(1 + talk * .06); speaker.rotation.z = (talk - .5) * .06;
      rings.forEach((m, i) => { const k = CFG.reduced ? .4 + i * .3 : ((t * .7 + i / 3) % 1); m.scale.setScalar(.7 + k * 1.6); m.position.x = -.3 + k * .6; m.visible = CFG.reduced || k < .92; });
      if (!CFG.reduced && t - practiseT < .8) stage.rotation.y = Math.sin((t - practiseT) * 12) * .08 * (1 - (t - practiseT) / .8); else stage.rotation.y = 0;
      if (finished && !CFG.reduced) stage.position.y = 1.7 + Math.abs(Math.sin(t * 6)) * .2;
    },
    dispose() { T.clear();},
  };
}
