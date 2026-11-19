// The space buddy: an original kid astronaut (big round helmet with an open visor, white suit with a purple
// chest panel and star badge, purple gloves and boots, small jet-pack). Built from primitives, Lambert/Basic
// materials only, so it stays cheap on the Mali-G52. Same API as before:
//   makeMascot({ scale, seated }) → Object3D with userData.setMood(mood, t) and userData.update(t, lookX)
//   moods: 'idle' | 'happy' | 'think' | 'wave' | 'fly'
import * as THREE from '../vendor/three.module.min.js';

const lam = c => new THREE.MeshLambertMaterial({ color: c });
const basic = c => new THREE.MeshBasicMaterial({ color: c });
const SPH = new THREE.SphereGeometry(1, 28, 20), CAP = new THREE.CapsuleGeometry(1, 1, 6, 14);

export function makeMascot(opts = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const WHITE = 0xF4F2FF, PURPLE = 0x6B4BF0, SKIN = 0xB97A52, HAIR = 0x2B1A14;
  const mesh = (geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); return m; };

  // ---- torso, belt, chest panel, badge
  const torso = mesh(CAP, lam(WHITE), 0, -.95, 0, .52, .32, .44); body.add(torso);
  const belt = mesh(new THREE.TorusGeometry(.5, .07, 8, 28), lam(PURPLE), 0, -1.12, 0, 1, 1, .85); belt.rotation.x = Math.PI / 2; body.add(belt);
  const panel = mesh(new THREE.BoxGeometry(.42, .3, .06), lam(0x3A2A9E), 0, -.86, .42); body.add(panel);
  [[-.1, 0xFF6B6B], [0, 0xFFC94A], [.1, 0x7CF2B0]].forEach(([x, c]) => body.add(mesh(new THREE.SphereGeometry(.035, 10, 8), basic(c), x, -.82, .46)));
  const star = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .045 : .11; i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  body.add(mesh(new THREE.ShapeGeometry(star), basic(0xFFC94A), -.28, -.72, .38));

  // ---- arms (pivot at shoulder) with gloves
  const arm = side => { const p = new THREE.Group(); p.position.set(side * .55, -.72, 0); body.add(p);
    p.add(mesh(CAP, lam(WHITE), 0, -.24, 0, .15, .17, .15)); p.add(mesh(SPH, lam(PURPLE), 0, -.52, 0, .17)); p.rotation.z = side * .35; return p; };
  const armL = arm(-1), armR = arm(1);
  // ---- legs with boots
  const legs = new THREE.Group(); body.add(legs);
  [-1, 1].forEach(s => { legs.add(mesh(CAP, lam(WHITE), s * .2, -1.5, 0, .17, .14, .17)); legs.add(mesh(SPH, lam(PURPLE), s * .2, -1.78, .05, .2, .13, .25)); });
  if (opts.seated) legs.visible = false;
  // ---- jet-pack + flames
  const pack = new THREE.Group(); pack.position.set(0, -.85, -.42); body.add(pack);
  pack.add(mesh(new THREE.BoxGeometry(.6, .62, .26), lam(0xE6E1FF)));
  const flames = [-1, 1].map(s => { pack.add(mesh(new THREE.CylinderGeometry(.08, .11, .14, 12), lam(PURPLE), s * .18, -.38, 0));
    const f = mesh(new THREE.ConeGeometry(.08, .34, 10), basic(0xFFA54A), s * .18, -.6, 0); f.rotation.x = Math.PI; pack.add(f); return f; });

  // ---- head: helmet shell with an open front visor, the kid's face inside
  const head = new THREE.Group(); head.position.set(0, .12, 0); body.add(head);
  // shell with a real round opening at the front: the sphere's pole is turned to +z and a cap is left out
  const shellGeo = new THREE.SphereGeometry(1, 32, 24, 0, Math.PI * 2, .78, Math.PI - .78); shellGeo.rotateX(Math.PI / 2);
  const shell = mesh(shellGeo, new THREE.MeshLambertMaterial({ color: WHITE, side: THREE.DoubleSide }), 0, 0, -.06, .98, .94, .9); head.add(shell);
  head.add(mesh(SPH, lam(0x1B1446), 0, 0, -.12, .8, .78, .6));                               // dark helmet inside, behind the face
  // visor opening: a dark navy "hole" disc ring + the face sits in front of the shell
  head.add(mesh(new THREE.TorusGeometry(.7, .09, 10, 40), lam(PURPLE), 0, 0, .64, 1, .95, 1));
  const face = new THREE.Group(); face.position.set(0, -.04, .38); head.add(face);
  face.add(mesh(SPH, lam(SKIN), 0, 0, 0, .64, .6, .34));                                    // face
  face.add(mesh(SPH, lam(HAIR), 0, .4, -.02, .62, .26, .3));                                // fringe
  [-.3, .3].forEach(x => face.add(mesh(SPH, lam(HAIR), x, .28, .02, .2, .14, .12)));
  const eyes = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * .22, .02, .3); face.add(g);
    g.add(mesh(SPH, lam(0xffffff), 0, 0, 0, .12, .14, .05)); const p = mesh(SPH, basic(0x1F2547), 0, -.01, .03, .085, .1, .04); g.add(p);
    g.add(mesh(SPH, basic(0xffffff), .035, .045, .06, .028, .028, .02)); return { g, p }; });
  [-1, 1].forEach(s => face.add(mesh(new THREE.CircleGeometry(.07, 16), new THREE.MeshBasicMaterial({ color: 0xFF8FA3, transparent: true, opacity: .7 }), s * .38, -.14, .3)));
  const smile = mesh(new THREE.TorusGeometry(.1, .025, 8, 20, Math.PI), basic(0x5A2A2A), 0, -.17, .33); smile.rotation.z = Math.PI; face.add(smile);
  const mouthO = mesh(new THREE.CircleGeometry(.07, 16), basic(0x7A2E3A), 0, -.2, .33); mouthO.visible = false; face.add(mouthO);
  // small glass glint (tiny transparent cap only over the visor: cheap)
  const glint = mesh(new THREE.SphereGeometry(.72, 24, 16, -.4, 1.2, .5, .9), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .14, depthWrite: false }), 0, .02, .42, 1, .95, .6); head.add(glint);
  // antenna with a light
  head.add(mesh(new THREE.CylinderGeometry(.02, .02, .3, 6), lam(PURPLE), .45, .95, -.1)); const tip = mesh(SPH, basic(0xFFE07A), .45, 1.12, -.1, .07); head.add(tip);

  let mood = 'idle', moodT = 0, blinkAt = 1.4;
  root.userData = {
    setMood(m, t) { mood = m; moodT = t; },
    update(t, lookX = 0) {
      const mt = t - moodT, happyHop = mood === 'happy' && mt < .9 ? Math.sin(mt / .9 * Math.PI) : 0;
      body.position.y = Math.sin(t * 2.1) * .05 + happyHop * .6;
      body.rotation.z = Math.sin(t * 1.3) * .04;
      head.rotation.y = lookX * .45; head.rotation.z = mood === 'think' ? .18 : Math.sin(t * 1.1) * .03; head.rotation.x = mood === 'think' ? .08 : 0;
      // arms
      let l = .35, r = -.35;
      if (mood === 'happy' && mt < 1.2) { l = 2.6 + Math.sin(mt * 14) * .15; r = -2.6 - Math.sin(mt * 14) * .15; }
      else if (mood === 'wave' && mt < 2) { r = -2.5 + Math.sin(mt * 10) * .35; }
      else if (mood === 'think') { r = -1.9; }
      else if (mood === 'fly') { l = .9; r = -.9; }
      armL.rotation.z += (l - armL.rotation.z) * .25; armR.rotation.z += (r - armR.rotation.z) * .25;
      // eyes look and blink
      eyes.forEach(e => { e.p.position.x = lookX * .03; });
      if (t > blinkAt) { const b = t - blinkAt, s = b < .1 ? 1 - b / .1 * .9 : b < .2 ? .1 + (b - .1) / .1 * .9 : 1; eyes.forEach(e => e.g.scale.y = s); if (b > .2) blinkAt = t + 2.4 + (Math.sin(t * 7.3) * .5 + .5) * 2.4; }
      smile.visible = !(mood === 'happy' && mt < .9) && mood !== 'think'; mouthO.visible = !smile.visible && mood !== 'think';
      const thrust = mood === 'fly' ? 1.5 : .5; flames.forEach((f, i) => f.scale.set(1, thrust * (.8 + .25 * Math.sin(t * 31 + i * 2)), 1));
      tip.scale.setScalar(.07 * (.8 + .3 * Math.sin(t * 4)));
    }
  };
  if (opts.scale) root.scale.setScalar(opts.scale);
  return root;
}
