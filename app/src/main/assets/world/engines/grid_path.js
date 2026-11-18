// GRID_PATH engine (maze). Native: MainActivity.showMaze + mazeKey.
// Round fields: grid (array of strings: S start, G goal, # wall, * star, . path), legend {S,G,#,*}, need_star,
// hint, hint_after_bumps (default 3), first_move, say, prompt, why.
// Rules kept from native: arrows move one tile; walls/edges block (bump, no penalty); OK replays the voice line;
// stepping on * collects the star; G wins only when the star is collected (if need_star);
// firstTry = bumps <= 2. No time limit.
// NOTE: engines/index.js sends every round that has a truthy `grid` here, but scene_canvas rounds use
// grid: {rows, cols} (an object) — native routes those to compose, so this engine hands them to compose too.
// 3D: a tilted tile maze on the planet surface; Tara hops tile to tile with the hero and collects the star.
// Needs 'up' (wantsUp) and 'down' for movement.
import { THREE, CFG, time, clamp } from '../core/engine.js';
import { rbox, lam, face, STAR_GEO, RING_GEO, wig, prog } from './bkit.js';
import compose from './compose.js';

const TILT = .85;
const DIRS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
export default function gridPath(ctx, r) {
  if (!Array.isArray(r.grid)) return compose(ctx, r);
  const g = r.grid.map(String), rows = g.length, cols = Math.max(1, ...g.map(l => l.length));
  const lg = r.legend || {}, hero = lg.S || '🚗', goal = lg.G || '🏫', wallE = lg['#'] || '🌳';
  const s = Math.min(1.4, 6.2 / Math.max(rows, cols * .9));
  const board = new THREE.Group(); board.position.set(.9, .75, -.8); board.rotation.x = TILT; ctx.root.add(board);
  const base = new THREE.Mesh(rbox(cols * s + .5, rows * s + .5, .4, .45), lam(0x3C2C8E)); base.rotation.x = -Math.PI / 2; base.position.y = -.28; board.add(base);
  const TILE = rbox(s * .92, s * .92, .22, s * .16), WALL = rbox(s * .86, s * .86, s * .32, s * .2);
  const pathM = lam(0xFFF3D6), wallM = lam(0x6FC48A), goalM = lam(0xFFE29A);
  const pos = (i, j, y = 0, out = new THREE.Vector3()) => out.set((j - (cols - 1) / 2) * s, y, (i - (rows - 1) / 2) * s);
  const cell = []; let sr = 0, sc = 0, starObj = null, goalObj = null;
  const billboard = (txt, size, i, j, lift) => { const f = face(txt, size); f.rotation.x = -TILT; pos(i, j, lift, f.position); f.position.z += s * .1; board.add(f); return f; };
  for (let i = 0; i < rows; i++) { cell.push([]); for (let j = 0; j < cols; j++) {
    const c = j < g[i].length ? g[i][j] : '#'; cell[i].push(c);
    const tile = new THREE.Mesh(TILE, c === '#' ? wallM : c === 'G' ? goalM : pathM); tile.rotation.x = -Math.PI / 2; pos(i, j, 0, tile.position); board.add(tile);
    if (c === '#') { const w = new THREE.Mesh(WALL, wallM); w.rotation.x = -Math.PI / 2; pos(i, j, s * .2, w.position); board.add(w); billboard(wallE, s * .85, i, j, s * .62); }
    if (c === 'G') { goalObj = new THREE.Group(); pos(i, j, .26, goalObj.position); board.add(goalObj);
      const ring = new THREE.Mesh(RING_GEO, new THREE.MeshBasicMaterial({ color: 0xFFC94A })); ring.rotation.x = Math.PI / 2; ring.scale.setScalar(s * .42); goalObj.add(ring);
      goalObj.userData.f = billboard(goal, s * .9, i, j, s * .5); }
    if (c === '*') { starObj = new THREE.Mesh(STAR_GEO, lam(0xFFC233, { emissive: 0x7a3d00, emissiveIntensity: .5 })); starObj.scale.setScalar(s * .3); pos(i, j, s * .45, starObj.position); starObj.rotation.x = -TILT; board.add(starObj); starObj.userData.home = starObj.position.clone(); }
    if (c === 'S') { sr = i; sc = j; } } }
  // footprints (one small disc per path tile, shown once walked)
  const steps = []; const STEP = new THREE.CircleGeometry(s * .1, 12), stepM = new THREE.MeshBasicMaterial({ color: 0xE0B07A });
  for (let i = 0; i < rows; i++) { steps.push([]); for (let j = 0; j < cols; j++) { if (cell[i][j] === '#') { steps[i].push(null); continue; }
    const d = new THREE.Group(); [-1, 1].forEach(k => { const m = new THREE.Mesh(STEP, stepM); m.rotation.x = -Math.PI / 2; m.position.set(k * s * .12, .25, k * s * .08); d.add(m); });
    pos(i, j, 0, d.position); d.visible = false; board.add(d); steps[i].push(d); } }
  // walker: the hero (legend S) riding along with a mini Tara
  const walker = new THREE.Group(); board.add(walker);
  const heroF = face(hero, s * .78); heroF.renderOrder = 4; heroF.rotation.x = -TILT; heroF.position.set(-s * .08, s * .42, s * .12); walker.add(heroF);
  const pad = new THREE.Mesh(RING_GEO, new THREE.MeshBasicMaterial({ color: 0x7CF2B0 })); pad.rotation.x = Math.PI / 2; pad.scale.setScalar(s * .38); pad.position.y = .26; walker.add(pad);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(s * .16, s * .34, 12), new THREE.MeshBasicMaterial({ color: 0xFFC94A })); arrow.visible = false; board.add(arrow);
  const tara = ctx.tara, taraHome = { p: tara.position.clone(), s: tara.scale.x };
  let wr = sr, wc = sc, moveT = -9, bumpT = -9, bumpDir = [0, 0], bumps = 0, hasStar = false, starT = 0, won = 0, finished = false;
  const from = pos(sr, sc, 0), to = from.clone(), cur = from.clone(), tmp = new THREE.Vector3();
  steps[sr][sc] && (steps[sr][sc].visible = true);
  const needStar = !!r.need_star;
  if (needStar && !String(r.prompt || '').includes('⭐')) ctx.bubble((r.prompt || 'Find the way!') + '   ⭐ first!');
  const hintAfter = r.hint_after_bumps || 3;

  function move(k) {
    const [dr, dc] = DIRS[k]; const nr = wr + dr, nc = wc + dc;
    if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || cell[nr][nc] === '#') {
      ctx.sfx('bump'); bumps++; bumpT = time(); bumpDir = [dr, dc];
      if (bumps === hintAfter - 1) ctx.wrong();
      if (bumps === hintAfter) { ctx.wrong(r.hint || 'Try another way. Look for the open path.'); if (hintAfter < 2) ctx.bubble(r.hint || 'Try another way.', '#FFB347');
        if (wr === sr && wc === sc && DIRS[r.first_move]) showArrow(r.first_move); }
      return;
    }
    ctx.sfx('pop'); arrow.visible = false;
    from.copy(cur); wr = nr; wc = nc; pos(wr, wc, 0, to); moveT = time();
    if (steps[wr][wc]) steps[wr][wc].visible = true;
    if (cell[wr][wc] === '*' && !hasStar) { hasStar = true; starT = time() + .25; ctx.sfx('twinkle'); ctx.correct(board.localToWorld(tmp.copy(to).setY(s * .6))); }
    if (cell[wr][wc] === 'G') {
      if (needStar && !hasStar) { setTimeout(() => ctx.bubble('⭐ Get the star first!', '#FFC94A'), 300); if (starObj) starObj.userData.nudge = time(); }
      else { finished = true; won = time() + .3; setTimeout(() => { ctx.sfx('fanfare'); ctx.correct(board.localToWorld(tmp.copy(to).setY(s * .6))); goalObj && (goalObj.userData.pop = time()); }, 300);
        setTimeout(() => ctx.finish({ firstTry: bumps <= 2, why: r.why || 'You made it!' }), CFG.reduced ? 700 : 1500); }
    }
  }
  function showArrow(k) { const [dr, dc] = DIRS[k]; arrow.visible = true; pos(sr + dr * .62, sc + dc * .62, s * .3, arrow.position);
    arrow.rotation.set(0, 0, 0); if (dc) arrow.rotation.z = -dc * Math.PI / 2; else arrow.rotation.x = dr * Math.PI / 2; arrow.userData.home = arrow.position.clone(); }

  return {
    wantsUp: true,
    key(k) {
      if (k === 'ok') { ctx.say(r.say || r.prompt); return true; }
      if (!DIRS[k]) return false; if (finished) return true; move(k); return true;
    },
    focusX() { return board.position.x + cur.x; },
    lookX() { return clamp(cur.x / 4, -1, 1); },
    update(t) {
      const u = prog(t, moveT, .26); cur.lerpVectors(from, to, u);
      const hop = CFG.reduced ? 0 : Math.sin(u * Math.PI) * s * .45;
      const b = t - bumpT < .3 ? Math.sin((t - bumpT) / .3 * Math.PI) * s * .18 : 0;
      walker.position.set(cur.x + bumpDir[1] * b, cur.y + hop, cur.z + bumpDir[0] * b);
      walker.rotation.z = wig(t, bumpT, .25);
      const sq = CFG.reduced ? 1 : 1 + (u < 1 ? -.08 * Math.sin(u * Math.PI) : 0); heroF.scale.set(1 / sq, sq, 1);
      if (won && !CFG.reduced && t > won) walker.position.y += Math.abs(Math.sin((t - won) * 7)) * s * .35;
      // mini Tara rides just behind-right of the hero
      board.localToWorld(tmp.set(walker.position.x + s * .42, walker.position.y + s * .9, walker.position.z - s * .15));
      tara.position.copy(tmp); tara.scale.setScalar(s * .3);
      pad.material.color.setHex(Math.sin(t * 5) > 0 ? 0x7CF2B0 : 0xB8FFD8);
      if (starObj) { if (hasStar) { const k = prog(t, starT, .5); if (t >= starT) { starObj.position.lerpVectors(starObj.userData.home, walker.position, k); starObj.position.y += s * (.6 + k * .4); starObj.scale.setScalar(Math.max(.001, s * .3 * (1 - k))); } }
        else { const n = starObj.userData.nudge ? t - starObj.userData.nudge : 9; starObj.rotation.y = CFG.reduced ? 0 : t * 1.8; starObj.position.y = starObj.userData.home.y + (CFG.reduced ? 0 : Math.sin(t * 2.4) * s * .06);
          starObj.scale.setScalar(s * .3 * (n < 1.2 ? 1 + .3 * Math.abs(Math.sin(n * 8)) : 1)); } }
      if (goalObj) { goalObj.children[0].rotation.z = t * .8; const p = goalObj.userData.pop ? clamp((t - goalObj.userData.pop) / .6) : 1; goalObj.userData.f.scale.setScalar(1 + Math.sin(p * Math.PI) * .3); }
      if (arrow.visible) { arrow.position.copy(arrow.userData.home); if (!CFG.reduced) arrow.position.y += Math.abs(Math.sin(t * 4)) * s * .15; }
    },
    dispose() { tara.position.copy(taraHome.p); tara.scale.setScalar(taraHome.s); },
  };
}
