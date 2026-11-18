// Tara: Wonder Window's space buddy (replaces Pip the sparrow). An original little star-creature
// in a bubble helmet with a tiny jet-pack. Built from primitives so it stays cheap on a Mali-G52.
// moods: 'idle' | 'happy' | 'think' | 'wave' | 'fly'
import * as THREE from '../vendor/three.module.min.js';

function starShape(R, r, round) {
  const s = new THREE.Shape(), pts = [];
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  // rounded corners: start at the midpoint of the last edge, curve through each vertex
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let m = mid(pts[9], pts[0]); s.moveTo(m[0], m[1]);
  for (let i = 0; i < 10; i++) { const p = pts[i], n = pts[(i + 1) % 10], q = mid(p, n);
    const k = i % 2 ? round * .5 : round; // tips rounder than valleys
    const a = [p[0] + (m[0] - p[0]) * k, p[1] + (m[1] - p[1]) * k], b = [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
    s.lineTo(a[0], a[1]); s.quadraticCurveTo(p[0], p[1], b[0], b[1]); m = q; }
  return s;
}

export function makeMascot(opts = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const lam = c => new THREE.MeshLambertMaterial({ color: c });
  // star body
  const geo = new THREE.ExtrudeGeometry(starShape(1, .5, .55), { depth: .42, bevelEnabled: true, bevelThickness: .16, bevelSize: .12, bevelSegments: 4, curveSegments: 6 });
  geo.center();
  const star = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0xFFC233, emissive: 0x7a3d00, emissiveIntensity: .35 })); body.add(star);
  // belly glow patch
  const belly = new THREE.Mesh(new THREE.CircleGeometry(.36, 32), new THREE.MeshBasicMaterial({ color: 0xFFE7A6 })); belly.position.set(0, -.12, .34); body.add(belly);
  // face
  const face = new THREE.Group(); face.position.set(0, .02, .36); body.add(face);
  const eyes = [-1, 1].map(sx => { const g = new THREE.Group(); g.position.set(sx * .22, .12, 0); face.add(g);
    const w = new THREE.Mesh(new THREE.SphereGeometry(.19, 20, 14), lam(0xffffff)); w.scale.z = .5; g.add(w);
    const p = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 12), new THREE.MeshBasicMaterial({ color: 0x1F2547 })); p.position.z = .06; p.scale.z = .5; g.add(p);
    const sp = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); sp.position.set(.05, .06, .13); g.add(sp);
    return { g, p }; });
  const cheekM = new THREE.MeshBasicMaterial({ color: 0xFF8FA3, transparent: true, opacity: .75 });
  [-1, 1].forEach(sx => { const c = new THREE.Mesh(new THREE.CircleGeometry(.09, 16), cheekM); c.position.set(sx * .4, -.1, .02); face.add(c); });
  const smile = new THREE.Mesh(new THREE.TorusGeometry(.12, .03, 8, 24, Math.PI), new THREE.MeshBasicMaterial({ color: 0x1F2547 })); smile.rotation.z = Math.PI; smile.position.set(0, -.06, .02); face.add(smile);
  const mouthO = new THREE.Mesh(new THREE.CircleGeometry(.07, 20), new THREE.MeshBasicMaterial({ color: 0x7A2E3A })); mouthO.position.set(0, -.11, .02); mouthO.visible = false; face.add(mouthO);
  // bubble helmet (single transparent sphere, back faces culled)
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(1.32, 32, 24), new THREE.MeshPhongMaterial({ color: 0xBFE8FF, transparent: true, opacity: .16, shininess: 140, specular: 0xffffff, depthWrite: false }));
  helmet.position.z = .05; root.add(helmet);
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(1.0, .07, 10, 48), lam(0x6B4BF0)); rimRing.rotation.x = Math.PI / 2; rimRing.position.y = -1.05; rimRing.scale.set(1, 1, .55); root.add(rimRing);
  // jet-pack + flames
  const pack = new THREE.Group(); pack.position.set(0, -.15, -.42); body.add(pack);
  [-1, 1].forEach(sx => { const c = new THREE.Mesh(new THREE.CylinderGeometry(.13, .16, .55, 16), lam(0xE9E4FF)); c.position.x = sx * .24; pack.add(c);
    const n = new THREE.Mesh(new THREE.CylinderGeometry(.1, .14, .12, 16), lam(0x6B4BF0)); n.position.set(sx * .24, -.33, 0); pack.add(n); });
  const flames = [-1, 1].map(sx => { const f = new THREE.Mesh(new THREE.ConeGeometry(.11, .45, 12), new THREE.MeshBasicMaterial({ color: 0xFF9A3D, transparent: true, opacity: .9 }));
    f.rotation.x = Math.PI; f.position.set(sx * .24, -.62, 0); pack.add(f); return f; });
  // antenna with a tiny glowing star
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .38, 6), lam(0x6B4BF0)); ant.position.set(0, 1.42, 0); root.add(ant);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(.08, 12, 8), new THREE.MeshBasicMaterial({ color: 0xFFE07A })); tip.position.set(0, 1.63, 0); root.add(tip);

  let mood = 'idle', moodT = 0, blinkAt = 1.3;
  root.userData = {
    setMood(m, t) { mood = m; moodT = t; },
    update(t, lookX = 0) {
      const mt = t - moodT;
      // float + gentle sway; bigger, bouncier when happy
      const hop = mood === 'happy' && mt < .8 ? Math.sin(mt / .8 * Math.PI) * .7 : 0;
      body.position.y = Math.sin(t * 2.1) * .06 + hop;
      body.rotation.z = Math.sin(t * 1.3) * .06 + (mood === 'wave' ? Math.sin(mt * 9) * .22 * Math.max(0, 1 - mt / 1.6) : 0) + (mood === 'happy' && mt < .8 ? mt / .8 * Math.PI * 2 * .0 : 0);
      body.rotation.y = lookX * .35 + (mood === 'happy' && mt < .8 ? mt / .8 * Math.PI * 2 : 0);
      if (mood === 'think') body.rotation.z += .12;
      // eyes: look, blink
      eyes.forEach(e => { e.p.position.x = lookX * .04; });
      if (t > blinkAt) { const b = t - blinkAt; const s = b < .12 ? 1 - b / .12 * .9 : (b < .24 ? .1 + (b - .12) / .12 * .9 : 1); eyes.forEach(e => e.g.scale.y = s); if (b > .24) blinkAt = t + 2.2 + (Math.sin(t * 7.3) * .5 + .5) * 2.5; }
      smile.visible = mood !== 'think' && !(mood === 'happy' && mt < .8); mouthO.visible = !smile.visible && mood !== 'think';
      const thrust = mood === 'fly' ? 1.4 : .55; flames.forEach((f, i) => { f.scale.set(1, thrust * (.8 + .25 * Math.sin(t * 31 + i * 2)), 1); });
      tip.scale.setScalar(.85 + .25 * Math.sin(t * 4));
    }
  };
  if (opts.scale) root.scale.setScalar(opts.scale);
  return root;
}
