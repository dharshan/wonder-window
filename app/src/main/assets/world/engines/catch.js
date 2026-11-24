// STAR CATCHER engine (variant "catch"): a Go/No-Go game for impulse control.
// Gold stars (go) and space rocks (no-go) drift down past Astro's net. OK catches; waiting lets a rock float by.
// Later levels: 3 lanes (LEFT/RIGHT move the net) and a colour rule ("only blue stars now").
// Child rules: no score, no lives, no "wrong"; a pressed rock just bonks away; a missed star twinkles off.
// Difficulty is continuous (core/adapt.js): the OK window, drift speed, rock share, lanes and the rule,
// tuned so the child succeeds about 70-85% of the time. Nothing flashes faster than 2 Hz.
import { THREE, CFG, bridge, clamp, ease } from '../core/engine.js';
import { makeAdapt, tune, makeTrials, itemInNet } from '../core/adapt.js';

const TOP = 5.4, NET_Y = 0.35, HALF = 0.95, BOTTOM = -1.9, LANES3 = [-3.3, 0, 3.3], JAR = new THREE.Vector3(-4.9, -0.75, 1.4);
const ITEMS_PER_ROUND = 12;

function starShape(ro = .62, ri = .27) { const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? ri : ro, a = Math.PI / 2 + i * Math.PI / 5; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  s.closePath(); return s; }
const STAR_GEO = new THREE.ExtrudeGeometry(starShape(), { depth: .16, bevelEnabled: true, bevelThickness: .06, bevelSize: .05, bevelSegments: 2 }); STAR_GEO.center();
const MINI_GEO = new THREE.ExtrudeGeometry(starShape(.22, .1), { depth: .06, bevelEnabled: false }); MINI_GEO.center();
const ROCK_GEO = new THREE.IcosahedronGeometry(.62, 0);
const NET_GEO = new THREE.TorusGeometry(1.15, .1, 10, 48), NET_GLOW = new THREE.TorusGeometry(1.32, .05, 6, 48), DISC = new THREE.CircleGeometry(1.08, 40);
const GOLD = 0xFFC94A, BLUE = 0x4DD6FF;

export default function starCatcher(ctx, r) {
  const root = ctx.root;
  const A = makeAdapt({ level: +bridge.get(ctx.adaptKey, 0.15) || 0.15 });
  const L = A.level;
  const lanes = L >= 0.45 ? LANES3 : [0];
  const rule = (L >= 0.7 && Math.random() < 0.5) ? 'blue' : 'gold';        // which stars are "go" this round
  const W = tune(1.8, 0.9, L);                                             // seconds an item spends inside the net band
  const speed = (2 * HALF) / W, gap = tune(2.6, 1.35, L), noGoShare = tune(0.2, 0.4, L);
  const trials = makeTrials((Date.now() & 0xffff) + 1);

  // ---- scene: the net (always clearly lit = visible focus), the jar beside Astro ----
  const net = new THREE.Group(); net.position.set(0, NET_Y, 0.4); root.add(net);
  const ring = new THREE.Mesh(NET_GEO, new THREE.MeshLambertMaterial({ color: GOLD, emissive: 0x6A4A00 })); net.add(ring);
  const glow = new THREE.Mesh(NET_GLOW, new THREE.MeshBasicMaterial({ color: 0xFFE29A })); net.add(glow);
  const disc = new THREE.Mesh(DISC, new THREE.MeshBasicMaterial({ color: 0x3A2A9E, transparent: true, opacity: .35, depthWrite: false })); disc.position.z = -.05; net.add(disc);
  const laneMarks = lanes.length > 1 ? lanes.map(x => { const m = new THREE.Mesh(new THREE.PlaneGeometry(.08, TOP - BOTTOM), new THREE.MeshBasicMaterial({ color: 0x8C7BFF, transparent: true, opacity: .25, depthWrite: false }));
    m.position.set(x, (TOP + BOTTOM) / 2, -.6); root.add(m); return m; }) : [];
  const jar = new THREE.Group(); jar.position.copy(JAR); root.add(jar);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(.85, .75, 1.7, 28, 1, true), new THREE.MeshLambertMaterial({ color: 0xA8E0FF, transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false })); jar.add(glass);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.76, .76, .1, 28), new THREE.MeshLambertMaterial({ color: 0x6B55E0 })); base.position.y = -.85; jar.add(base);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(.92, .92, .18, 28), new THREE.MeshLambertMaterial({ color: 0xFF9F5A })); lid.position.y = 1.4; lid.visible = false; jar.add(lid);
  let jarCount = 0;

  let lane = Math.floor(lanes.length / 2), netX = lanes[lane];
  const items = []; let spawned = 0, nextSpawn = 0.9, resolved = 0, hintShown = false, waitedGood = 0, ended = false, endT = 0, okRound = 0;
  const goColor = rule === 'blue' ? BLUE : GOLD, otherStar = rule === 'blue' ? GOLD : BLUE;
  if (rule === 'blue') { ctx.bubble('Only blue stars now!', '#4DD6FF'); ctx.say('Only blue stars now! Let the gold ones go.'); }

  function spawn() {
    const noGo = trials.next(noGoShare);
    // a no-go item is a rock, or (under the blue rule) sometimes a star of the other colour: harder, so only half the time
    const kind = noGo ? (rule === 'blue' && trials.rnd() < 0.5 ? 'other' : 'rock') : 'go';
    const mesh = kind === 'rock' ? new THREE.Mesh(ROCK_GEO, new THREE.MeshLambertMaterial({ color: 0x8A8FA8, flatShading: true }))
                                 : new THREE.Mesh(STAR_GEO, new THREE.MeshLambertMaterial({ color: kind === 'go' ? goColor : otherStar, emissive: (kind === 'go' ? goColor : otherStar) === GOLD ? 0x8A6400 : 0x0E5C78 }));
    const li = Math.floor(trials.rnd() * lanes.length);
    mesh.position.set(lanes[li], TOP, 0.4); root.add(mesh);
    items.push({ mesh, go: kind === 'go', kind, li, y: TOP, done: false, state: 'fall', t0: 0, spin: (trials.rnd() - .5) * 2 });
    spawned++;
  }

  function outcome(ok) { A.record(ok); resolved++; if (ok) okRound++; }

  function press() {
    if (ended) return;
    const inLane = items.filter(it => it.li === lane && it.state === 'fall');
    const it = itemInNet(inLane, NET_Y, HALF);
    net.userData.swish = clock;
    if (!it) return;                                                     // early or empty: nothing happens, no penalty
    it.done = true;
    if (it.go) {
      it.state = 'fly'; it.t0 = clock; it.from = it.mesh.position.clone(); outcome(true);
      ctx.correct(it.mesh.position.clone()); ctx.sfx('twinkle');
    } else {
      it.state = 'bonk'; it.t0 = clock; it.vx = (netX >= 0 ? 1 : -1) * 3.2; outcome(false); ctx.sfx('bump');
      if (!hintShown) { hintShown = true; ctx.bubble(r.hint || (it.kind === 'rock' ? 'Rocks float by. Wait for stars!' : 'Wait for the blue stars!'), '#FFB347'); ctx.say(r.hint || 'Rocks float by. Wait for the stars.'); }
      ctx.tara.userData.setMood && ctx.tara.userData.setMood('think', clock);
    }
  }

  let clock = 0;
  return {
    pausable: true,
    key(k, rep) {
      if (rep) return true;                                              // one press = one action; holding never auto-fires
      if (k === 'ok') { press(); return true; }
      if (lanes.length > 1 && (k === 'left' || k === 'right')) {
        const n = clamp(lane + (k === 'left' ? -1 : 1), 0, lanes.length - 1);
        if (n === lane) ctx.sfx('bump'); else { lane = n; ctx.sfx('pop'); }
        return true;
      }
      return k === 'left' || k === 'right' || k === 'down';
    },
    focusX() { return netX * .5; },
    lookX() { return clamp(netX / 4, -1, 1); },
    update(t, dt) {
      clock = t;
      netX += (lanes[lane] - netX) * (CFG.reduced ? 1 : clamp(dt * 14));
      net.position.x = netX;
      const sw = clamp((t - (net.userData.swish ?? -9)) / .25);
      net.scale.setScalar(1 + Math.sin(sw * Math.PI) * .08);
      glow.material.color.setHex(Math.sin(t * Math.PI * 2 * 0.8) > 0 ? 0xFFE29A : 0xFFF2C8);   // gentle 0.8 Hz breathing, never a flash

      if (!ended && spawned < ITEMS_PER_ROUND && t >= nextSpawn) { spawn(); nextSpawn = t + gap * (0.85 + trials.rnd() * 0.3); }

      for (const it of items) {
        const m = it.mesh;
        if (it.state === 'fall') {
          it.y -= speed * dt; m.position.y = it.y; if (!CFG.reduced) { m.rotation.z += it.spin * dt; m.rotation.y = Math.sin(t * 1.5 + it.li) * .4; }
          if (it.y < BOTTOM) {                                           // left the screen without a press
            it.state = 'gone'; it.t0 = t; it.done = true;
            if (it.go) outcome(false);                                    // a star that floated by: no sound, it just twinkles off
            else { outcome(true); waitedGood++; if (waitedGood % 3 === 0) { ctx.bubble('Good waiting!', '#7CF2B0'); ctx.sfx('chirp'); } }
          }
        } else if (it.state === 'fly') {
          const u = clamp((t - it.t0) / (CFG.reduced ? .01 : .75)), e = ease(u);
          m.position.lerpVectors(it.from, JAR, e); m.position.y += Math.sin(Math.PI * e) * 1.4; m.scale.setScalar(1 - e * .65); m.rotation.z += dt * 8;
          if (u >= 1) { it.state = 'jar'; root.remove(m);
            const mini = new THREE.Mesh(MINI_GEO, m.material); const k = jarCount++;
            mini.position.set(((k % 4) - 1.5) * .34, -.62 + Math.floor(k / 4) * .3, .2); mini.rotation.z = k * .7; jar.add(mini); }
        } else if (it.state === 'bonk') {
          const k = t - it.t0; m.position.x += it.vx * dt; m.position.y += (1.4 - k * 4) * dt; m.rotation.x += dt * 6;
          if (k > 1.2) { it.state = 'removed'; root.remove(m); }
        } else if (it.state === 'gone') {
          const k = clamp((t - it.t0) / .5); m.scale.setScalar(Math.max(.001, 1 - k)); if (k >= 1) { it.state = 'removed'; root.remove(m); }
        }
      }

      if (!ended && spawned >= ITEMS_PER_ROUND && resolved >= ITEMS_PER_ROUND) {
        ended = true; endT = t; lid.visible = true; ctx.sfx('chime');
        bridge.set(ctx.adaptKey, Math.round(A.level * 1000) / 1000);
      }
      if (ended) {
        const u = clamp((t - endT) / .6); lid.position.y = 1.4 - ease(u) * .48;
        if (t - endT > 1.0 && !this._fin) { this._fin = true; ctx.finish({ firstTry: okRound / ITEMS_PER_ROUND >= 0.7, why: r.why }); }
      }
    },
    dispose() { if (!ended) bridge.set(ctx.adaptKey, Math.round(A.level * 1000) / 1000); laneMarks.length = 0; },
    // exposed for the headless test harness only
    _debug() { return { level: A.level, lanes: lanes.length, rule, W, items: items.map(i => ({ y: +i.y.toFixed(2), go: i.go, state: i.state, li: i.li })), resolved, okRound }; },
  };
}
