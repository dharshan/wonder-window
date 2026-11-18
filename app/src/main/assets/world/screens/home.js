// HOME: three planets for the three pillars (PLAY → TRY → WATCH order is fixed, D1). Tara rides the rocket;
// LEFT/RIGHT flies to the next planet with a cinematic camera, OK dives in. Budget-safe on the TV:
// no atmosphere shells, no tone mapping, small sprites only, one baked sky.
import { THREE, CFG, camera, router, bridge, time, clamp, ease, canvasTex, pillTex, rnd, reseed, glow } from '../core/engine.js';
import { makeSpace } from '../core/space.js';
import { roundedBox, PALETTE } from '../core/kit.js';
import { makeMascot } from '../core/mascot.js';

const R = 3.2;
const WORLDS = [
  { key: 'play', name: 'Play', sub: 'Puzzle Planet', color: '#FFB04A', pos: new THREE.Vector3(-11, -1.2, 0), tilt: .35 },
  { key: 'try', name: 'Try', sub: 'Maker Planet', color: '#3FE0A8', pos: new THREE.Vector3(0, 1.4, -5), tilt: -.25 },
  { key: 'watch', name: 'Watch', sub: 'Story Moon', color: '#A98BFF', pos: new THREE.Vector3(11, -.6, 0), tilt: .15 },
];
function planetTex(key) { reseed(key.length * 13);
  if (key === 'play') return canvasTex(1024, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#FFB36B'); gr.addColorStop(.5, '#FF8A3D'); gr.addColorStop(1, '#E2582A'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const cols = ['#FFC94A', '#FF9F5A', '#F2724A', '#FFD27A'], s = 64; for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) { g.globalAlpha = .55; g.fillStyle = cols[((x / s) * 3 + (y / s) * 5) % 4]; g.fillRect(x + 3, y + 3, s - 6, s - 6);
      g.beginPath(); g.arc(x + s, y + s / 2, 10, 0, 6.3); g.fill(); g.globalAlpha = 1; g.strokeStyle = 'rgba(120,40,10,.3)'; g.lineWidth = 3; g.strokeRect(x + 3, y + 3, s - 6, s - 6); } });
  if (key === 'try') return canvasTex(1024, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7FF0C2'); gr.addColorStop(.5, '#2FBF8F'); gr.addColorStop(1, '#1C8A72'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.10)' : 'rgba(10,80,70,.18)'; g.fillRect(0, i * 58 + 10, w, 22 + (i % 3) * 8); }
    const paint = ['#FF6B6B', '#FFC94A', '#4DA3FF', '#B47CFF', '#FF8FD1']; for (let i = 0; i < 46; i++) { const x = rnd() * w, y = 60 + rnd() * (h - 120), r = 8 + rnd() * 26; g.fillStyle = paint[i % 5]; g.beginPath(); for (let a = 0; a < 6.28; a += .5) { const rr = r * (.75 + rnd() * .5); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); } });
  return canvasTex(1024, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#C9B8FF'); gr.addColorStop(.5, '#9479F2'); gr.addColorStop(1, '#5B45D6'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const x = rnd() * w, y = rnd() * h, r = 6 + Math.pow(rnd(), 2) * 46, cg = g.createRadialGradient(x - r * .2, y - r * .2, r * .1, x, y, r); cg.addColorStop(0, 'rgba(60,30,140,.45)'); cg.addColorStop(.8, 'rgba(90,60,190,.25)'); cg.addColorStop(1, 'rgba(255,255,255,.35)'); g.fillStyle = cg; g.beginPath(); g.arc(x, y, r, 0, 6.28); g.fill(); } });
}
const v = (x, y, z) => new THREE.Vector3(x, y, z);
const park = i => WORLDS[i].pos.clone().add(v(-R - 1.6, .9, 2.6));
const camFor = (i, out, look) => { out.copy(WORLDS[i].pos).add(v(1.6, 2.4, 17.5)); look.copy(WORLDS[i].pos).add(v(-.8, .4, 0)); };
function bez(p0, p1, p2, p3, u, o) { const w = 1 - u; return o.set(0, 0, 0).addScaledVector(p0, w * w * w).addScaledVector(p1, 3 * w * w * u).addScaledVector(p2, 3 * w * u * u).addScaledVector(p3, u * u * u); }

export const HomeScreen = {
  enter({ focus = 0 } = {}) {
    const root = this.root = new THREE.Group(); this.hudRoot = new THREE.Group();
    this.space = makeSpace(); root.add(this.space);
    WORLDS.forEach((w, i) => { const g = new THREE.Group(); g.position.copy(w.pos); root.add(g); w.g = g; const sp = new THREE.Group(); sp.rotation.z = w.tilt; g.add(sp);
      w.planet = new THREE.Mesh(new THREE.SphereGeometry(R, 56, 40), new THREE.MeshLambertMaterial({ map: w.tex || (w.tex = planetTex(w.key)), emissive: new THREE.Color(w.color), emissiveIntensity: .05 })); sp.add(w.planet);
      w.orb = new THREE.Group(); sp.add(w.orb);
      if (w.key === 'try') PALETTE.forEach((c, k) => { const t = new THREE.Mesh(new THREE.TorusGeometry(4.3 + k * .22, .08, 6, 120), new THREE.MeshBasicMaterial({ color: c })); t.rotation.x = Math.PI / 2; w.orb.add(t); });
      else for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(w.key === 'play' ? roundedBox(.8, .8, .25, .2) : new THREE.SphereGeometry(.35, 16, 12), new THREE.MeshLambertMaterial({ color: w.key === 'play' ? PALETTE[k] : 0xE9E2FF, emissive: w.key === 'watch' ? 0x443388 : 0 }));
        const a = k / 6 * 6.283; m.position.set(Math.cos(a) * 5, Math.sin(a * 2) * .4, Math.sin(a) * 5); w.orb.add(m); }
      w.halo = glow(new THREE.Color(w.color), R * 3.2, 0); g.add(w.halo); w.focus = i === focus ? 1 : 0; });
    // rocket with Tara in a glass cockpit
    const rocket = this.rocket = new THREE.Group(); root.add(rocket); const body = this.body = new THREE.Group(); rocket.add(body);
    const prof = []; for (let i = 0; i <= 18; i++) { const t = i / 18; prof.push(new THREE.Vector2(Math.max(.001, .62 * Math.sin(Math.PI * Math.pow(t, .78)) * (1 - .25 * t)), t * 2.4 - 1.1)); }
    body.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 32), new THREE.MeshLambertMaterial({ color: 0xFBF7FF })));
    const band = new THREE.Mesh(new THREE.CylinderGeometry(.6, .61, .22, 32, 1, true), new THREE.MeshLambertMaterial({ color: 0x6B4BF0 })); band.position.y = -.25; body.add(band);
    for (let k = 0; k < 3; k++) { const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.quadraticCurveTo(.75, -.2, .8, -.95); fs.lineTo(.1, -.55); fs.lineTo(0, -.6); fs.closePath();
      const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(fs, { depth: .08, bevelEnabled: false }), new THREE.MeshLambertMaterial({ color: 0xFF5D73 })); const h = new THREE.Group(); h.rotation.y = k * 2.094; fin.position.set(.42, -.35, -.04); h.add(fin); body.add(h); }
    this.tara = makeMascot(); this.tara.scale.setScalar(.42); this.tara.position.set(0, 1.55, 0); rocket.add(this.tara);
    this.flame = new THREE.Mesh(new THREE.ConeGeometry(.32, 1.1, 16), new THREE.MeshBasicMaterial({ color: 0xFFA54A })); this.flame.rotation.x = Math.PI; this.flame.position.y = -1.6; rocket.add(this.flame);
    this.flameCore = new THREE.Mesh(new THREE.ConeGeometry(.17, .7, 12), new THREE.MeshBasicMaterial({ color: 0xFFF1C2 })); this.flameCore.rotation.x = Math.PI; this.flameCore.position.y = -1.45; rocket.add(this.flameCore);
    // HUD label
    this.pills = WORLDS.map(w => { const m = new THREE.Mesh(new THREE.PlaneGeometry(760, 190), new THREE.MeshBasicMaterial({ map: pillTex(w.name + '  ·  ' + w.sub, { w: 1520, h: 380, accent: w.color, font: 110 }), transparent: true, depthTest: false, toneMapped: false, opacity: 0 }));
      m.position.set(960, 1080 * .82, 0); this.hudRoot.add(m); return m; });
    this.cur = focus; this.from = focus; this.flyT = -9; this.diveT = -9; this.labelT = time();
    this.rp = park(focus); this.tmp = new THREE.Vector3(); this.cp = new THREE.Vector3(); this.cl = new THREE.Vector3(); this.cp2 = new THREE.Vector3(); this.cl2 = new THREE.Vector3(); this.q = new THREE.Quaternion(); this.up = v(0, 1, 0); this.dir = new THREE.Vector3();
    this.P = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    bridge.event('home', {});
  },
  key(k) { const t = time(); if (t - this.diveT < 2.5) return true; if (t - this.flyT < 1.4) return true;
    if (k === 'right' && this.cur < 2) this.go(this.cur + 1); else if (k === 'left' && this.cur > 0) this.go(this.cur - 1);
    else if (k === 'ok') { if (WORLDS[this.cur].key === 'watch' && bridge.get('watchResting', false)) { this.resting(); return true; } this.diveT = t; bridge.sfx('twinkle'); } else if (k === 'back') return false; else return false; return true; },
  go(i) { this.from = this.cur; this.cur = i; this.flyT = time(); this.labelT = time() + 2.6; bridge.sfx('pop'); },
  update(t, dt) {
    const FLY = CFG.reduced ? .01 : 2.6, DIVE = CFG.reduced ? .2 : 2.2;
    WORLDS.forEach((w, i) => { w.planet.rotation.y = t * .12 + i; w.orb.rotation.y = t * (w.key === 'try' ? .05 : .35); w.focus += ((i === this.cur ? 1 : 0) - w.focus) * clamp(dt * 4);
      w.g.scale.setScalar(.82 + .18 * w.focus); w.halo.material.opacity = .22 * w.focus; });
    const flyU = clamp((t - this.flyT) / FLY), diveU = t - this.diveT < DIVE ? (t - this.diveT) / DIVE : -1; const P = this.P;
    if (flyU < 1) { const u = ease(flyU); P[0].copy(park(this.from)); P[3].copy(park(this.cur)); P[1].copy(P[0]).add(this.tmp.set((P[3].x - P[0].x) * .15, 5.5, 7)); P[2].copy(P[3]).add(this.tmp.set((P[0].x - P[3].x) * .15, 5.5, 7));
      bez(P[0], P[1], P[2], P[3], u, this.rp); bez(P[0], P[1], P[2], P[3], Math.min(1, u + .01), this.dir).sub(this.rp).normalize(); }
    else { this.rp.copy(park(this.cur)); this.rp.y += Math.sin(t * 1.6) * .18; this.dir.set(.18, 1, .08).normalize(); }
    if (diveU >= 0) { const w = WORLDS[this.cur]; this.tmp.copy(w.pos); this.rp.lerp(this.tmp, Math.pow(diveU, 1.6) * .9); this.dir.copy(this.tmp).sub(this.rp).normalize();
      if (diveU > .95 && !this.entered) { this.entered = true; this.enterRealm(w.key); } }
    this.rocket.position.copy(this.rp); this.q.setFromUnitVectors(this.up, this.dir); this.rocket.quaternion.slerp(this.q, CFG.reduced ? 1 : clamp(dt * 10));
    this.body.rotation.y = flyU < 1 ? t * 5 : t * .6; const th = (flyU < 1 || diveU >= 0) ? 1.3 : .6;
    this.flame.scale.set(1, th * (.85 + .2 * Math.sin(t * 37)), 1); this.flameCore.scale.set(1, th * (.85 + .2 * Math.sin(t * 23)), 1);
    this.tara.userData.update(t, 0);
    // camera
    camFor(this.cur, this.cp, this.cl);
    if (flyU < 1) { const u = ease(flyU), s = Math.sin(Math.PI * u); camFor(this.from, this.cp2, this.cl2); this.cp2.lerp(this.cp, u); this.cl2.lerp(this.cl, u);
      this.cp.copy(this.cp2).add(this.tmp.set(0, 2.5 * s, 6 * s)); this.cl.copy(this.cl2).lerp(this.rp, .55 * s); }
    else this.cp.x += Math.sin(t * .23) * .6;
    if (diveU >= 0) { const k = ease(Math.min(1, diveU * 1.3)); this.cp.lerp(this.tmp.copy(this.rp).add(this.cp2.set(1.5, 1.4, 5.5)), k); this.cl.lerp(WORLDS[this.cur].pos, k); camera.fov = 42 + 20 * diveU * diveU; }
    else camera.fov = 42;
    camera.updateProjectionMatrix(); camera.position.copy(this.cp); camera.lookAt(this.cl); this.space.userData.follow(camera);
    const lk = clamp((t - this.labelT) / .35); this.pills.forEach((p, i) => { const on = i === this.cur && flyU >= 1 && diveU < 0; p.visible = on; p.material.opacity = on ? lk : 0; p.scale.setScalar(.9 + .1 * lk); });
  },
  resting() { bridge.sfx('bump'); this.tara.userData.setMood('think', time()); const p = this.pills[2]; p.material.map = pillTex('Videos are resting. Try Play or Try!', { w: 1520, h: 380, accent: WORLDS[2].color, font: 90 }); p.material.needsUpdate = true; this.labelT = time(); },
  enterRealm(key) { if (key === 'play') router.go('playlist', {}); else bridge.open(key); setTimeout(() => { this.entered = false; this.diveT = -9; }, 600); },
};
