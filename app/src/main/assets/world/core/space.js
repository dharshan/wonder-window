// Cheap space backdrop: one baked sky sphere (texture drawn once) + a small-star point cloud.
// Measured on the TV: this costs about the same as the bench scene (steady 20 ms at 1080p).
import { THREE, canvasTex, rnd, reseed } from './engine.js';

let skyTex = null;
function bakeSky() {
  if (skyTex) return skyTex; reseed(5);
  skyTex = canvasTex(2048, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#04031A'); gr.addColorStop(.45, '#140B44'); gr.addColorStop(.55, '#2A1466'); gr.addColorStop(1, '#0C0630');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { const x = rnd() * w, y = 200 + rnd() * 620, r = 80 + rnd() * 260, col = ['rgba(150,80,255,', 'rgba(60,140,255,', 'rgba(255,90,170,'][i % 3];
      const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col + '.2)'); rg.addColorStop(1, col + '0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    for (let i = 0; i < 1400; i++) { const a = rnd(); g.fillStyle = `rgba(255,255,255,${.25 + a * .75})`; const s = a > .96 ? 3 : a > .8 ? 2 : 1; g.fillRect(rnd() * w, rnd() * h, s, s); }
  });
  skyTex.generateMipmaps = true; skyTex.minFilter = THREE.LinearMipmapLinearFilter; skyTex.needsUpdate = true;
  return skyTex;
}

export function makeSpace({ stars = 900 } = {}) {
  const g = new THREE.Group();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 32), new THREE.MeshBasicMaterial({ map: bakeSky(), side: THREE.BackSide, depthWrite: false }));
  sky.renderOrder = -10; g.add(sky); g.userData.sky = sky;
  if (stars) { reseed(9); const p = new Float32Array(stars * 3);
    for (let i = 0; i < stars; i++) { const u = rnd() * 2 - 1, th = rnd() * 6.283, r = 140 + rnd() * 120, s = Math.sqrt(1 - u * u); p[i * 3] = r * s * Math.cos(th); p[i * 3 + 1] = r * u; p[i * 3 + 2] = r * s * Math.sin(th); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.4, sizeAttenuation: false, color: 0xE6EBFF, transparent: true, opacity: .9, depthWrite: false }));
    g.add(pts); g.userData.stars = pts; }
  g.add(new THREE.HemisphereLight(0x9c8cff, 0x2a1450, 1.25));
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.4); sun.position.set(-6, 10, 8); g.add(sun);
  const rim = new THREE.DirectionalLight(0x66ccff, 1.3); rim.position.set(8, 3, -10); g.add(rim);
  g.userData.follow = cam => { sky.position.copy(cam.position); if (g.userData.stars) g.userData.stars.position.copy(cam.position); };
  return g;
}

/** Big curved planet surface the child stands on (game screens). Texture is a tiled pattern in the realm colour. */
const groundCache = {};
export function makeGround(hex = '#F08A3E', pattern = 'puzzle') {
  const key = hex + pattern;
  if (!groundCache[key]) {
    const base = new THREE.Color(hex), c2 = base.clone().offsetHSL(0, 0, .07), c3 = base.clone().offsetHSL(.02, 0, -.05), c4 = base.clone().offsetHSL(-.02, .05, .03);
    const cols = [base, c2, c3, c4].map(c => '#' + c.getHexString());
    const t = canvasTex(1024, 512, (g, w, h) => { g.fillStyle = hex; g.fillRect(0, 0, w, h); const s = 64;
      for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) { g.fillStyle = cols[((x / s) + (y / s) * 3) % 4]; g.fillRect(x + 2, y + 2, s - 4, s - 4);
        if (pattern === 'puzzle') { g.fillStyle = cols[((x / s) * 2 + (y / s)) % 4]; g.beginPath(); g.arc(x + s, y + s / 2, s * .16, 0, 6.3); g.fill(); g.beginPath(); g.arc(x + s / 2, y + s, s * .16, 0, 6.3); g.fill(); }
        else if (pattern === 'craters') { g.fillStyle = 'rgba(0,0,0,.08)'; g.beginPath(); g.arc(x + s * .5, y + s * .5, s * .3 * ((x * 7 + y * 3) % 5) / 5 + 4, 0, 6.3); g.fill(); } } });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 3); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true;
    groundCache[key] = t;
  }
  const m = new THREE.Mesh(new THREE.SphereGeometry(60, 72, 36), new THREE.MeshLambertMaterial({ map: groundCache[key] }));
  m.position.set(0, -61.6, -10); m.rotation.x = Math.PI / 2; return m;
}
