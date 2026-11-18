// COMPOSE engine (Maker Bench). Native: MainActivity.showCompose + showSlots. Handles variant "compose" and
// "scene_canvas", modes "build" (copy a target or free build), "canvas" (free scene on a backdrop) and "slots".
// Never wrong: there is no miss in any mode, so firstTry is always true (as in native).
// build/canvas fields: rows/cols or grid {rows, cols}, parts or palette, target (rows×cols, null = empty),
//   must_include, min_parts (else min_items, default 1), max_items (default rows×cols), finish (Done label),
//   backdrop, story_say, why.
//   Rules kept from native: OK on a tray part holds it; OK on a cell places the held part (replacing), or removes
//   it if the cell already holds that same part; a new part beyond max_items bumps. With a target the round ends
//   by itself the moment the grid matches; otherwise Done appears once placed >= min parts and every
//   must_include part is used.
// slots fields: who/where/what (arrays of {face|pic,label} or strings) or slots [{name, options}], story,
//   story_say, why. Pick one in each row; then "Tell my story" appears and the story is told.
// Needs 'up' (wantsUp) and 'down' to move between the tray, the grid rows and the slot rows.
import { THREE, CFG, time, clamp, bridge } from '../core/engine.js';
import { rbox, lam, face, setFace, focusFrame, bigButton, wig, pop, prog, gridStep , makeTimers } from './bkit.js';

const PART_COLS = [0xFFC94A, 0x4DD6FF, 0xFF7AA8, 0x7CF2B0, 0xB49CFF, 0xFF9F5A, 0x9BE15D, 0xF2F2F2, 0x6FA8FF, 0xFFB3D9];
const EYE = new THREE.SphereGeometry(.22, 16, 12), PUPIL = new THREE.SphereGeometry(.11, 12, 8);
const EYE_W = new THREE.MeshLambertMaterial({ color: 0xffffff }), EYE_P = new THREE.MeshBasicMaterial({ color: 0x1F2547 });
function googly(parent, x, y, z, s = 1) { const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(.001); parent.add(g);
  [-1, 1].forEach(k => { const e = new THREE.Mesh(EYE, EYE_W); e.position.x = k * .26 * s; e.scale.setScalar(s); g.add(e); const p = new THREE.Mesh(PUPIL, EYE_P); p.position.set(k * .26 * s, 0, .16 * s); p.scale.setScalar(s); g.add(p); });
  return g; }

export default function compose(ctx, r) {
  const T = makeTimers();
  const mode = r.mode || (r.backdrop ? 'canvas' : 'build');
  if (mode === 'slots') return slots(ctx, r);
  const gobj = r.grid && !Array.isArray(r.grid) && typeof r.grid === 'object' ? r.grid : null;
  const rows = (gobj ? gobj.rows : r.rows) || 3, cols = (gobj ? gobj.cols : r.cols) || 3;
  const parts = (r.palette || r.parts || []).map(String); const target = Array.isArray(r.target) ? r.target : null;
  const must = (r.must_include || []).map(String);
  const minParts = r.min_parts != null ? r.min_parts : (r.min_items != null ? r.min_items : 1), maxParts = r.max_items || rows * cols;
  const canvas = mode === 'canvas' || !!r.backdrop;
  const colorOf = p => PART_COLS[Math.max(0, parts.indexOf(p)) % PART_COLS.length];
  // ---- the target blueprint (copy mode) ----
  let bp = null;
  if (target) { const c = Math.min(.78, 3.0 / Math.max(rows, 1), 2.6 / cols);
    bp = new THREE.Group(); bp.position.set(-3.7, 2.2, -.6); bp.rotation.y = .25; ctx.root.add(bp);
    const board = new THREE.Mesh(rbox(cols * c + .5, rows * c + .5, .2, .3), lam(0x2E6FD8)); board.position.z = -.15; bp.add(board);
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const w = (target[i] || [])[j]; const x = (j - (cols - 1) / 2) * c, y = ((rows - 1) / 2 - i) * c;
      const cellB = new THREE.Mesh(rbox(c * .9, c * .9, .06, .08), lam(0x5B9BF0)); cellB.position.set(x, y, 0); bp.add(cellB);
      if (w != null) { const f = face(w, c * .82); f.position.set(x, y, .2); bp.add(f); } } }
  // ---- the bench / canvas with sockets ----
  const C = Math.min(1.35, 4.1 / rows, (target ? 5.4 : 7.4) / cols), gx = target ? 2.4 : .9, gy = 2.05;
  const bench = new THREE.Group(); bench.position.set(gx, gy, 0); ctx.root.add(bench);
  const model = new THREE.Group(); bench.add(model);
  const slab = new THREE.Mesh(rbox(cols * C + .6, rows * C + .6, .35, .4), lam(canvas ? 0x8FD3FF : 0x6B4BB0, canvas ? { emissive: 0x2A5A88 } : {})); slab.position.z = -.3; bench.add(slab);
  if (canvas && r.backdrop) { const bd = face(r.backdrop, Math.min(cols, rows * 1.6) * C * .9); bd.position.z = .1; bd.material.opacity = .7; bench.add(bd); }
  const cells = [];
  for (let i = 0; i < rows; i++) { cells.push([]); for (let j = 0; j < cols; j++) {
    const x = (j - (cols - 1) / 2) * C, y = ((rows - 1) / 2 - i) * C;
    const sock = new THREE.Mesh(rbox(C * .88, C * .88, .08, C * .14), lam(canvas ? 0xA8E0FF : 0x4A3696)); sock.position.set(x, y, -.08); bench.add(sock);
    const piece = new THREE.Group(); piece.position.set(x, y, .12); model.add(piece); piece.visible = false;
    const blk = new THREE.Mesh(rbox(C * .86, C * .86, .3, C * .16), lam(0xffffff)); if (canvas) blk.visible = false; piece.add(blk);
    const f = face(' ', C * .8); f.position.z = .28; piece.add(f);
    const ring = focusFrame(C + .12, C + .12, 0xFFE29A, .09); ring.position.set(x, y, .05); ring.visible = false; bench.add(ring);
    cells[i].push({ i, j, x, y, piece, blk, f, ring, val: null, t0: -9, wig: -9 }); } }
  const eyes = googly(model, 0, rows * C / 2 + .5, .3, Math.min(1.7, C * 1.3));
  // ---- parts tray ----
  const n = parts.length, sp = Math.min(1.55, 11.5 / (n + .5)), P = sp * .82;
  const tray = new THREE.Group(); tray.position.set(.4, -1.35, 1.0); ctx.root.add(tray);
  const trayBase = new THREE.Mesh(rbox(n * sp + .4, P + .4, .25, .3), lam(0x2A1E7A)); trayBase.position.z = -.3; tray.add(trayBase);
  const pods = parts.map((p, k) => { const g = new THREE.Group(); g.position.set((k - (n - 1) / 2) * sp, 0, 0); tray.add(g);
    const inner = new THREE.Group(); g.add(inner);
    const body = new THREE.Mesh(rbox(P, P, .32, P * .2), lam(colorOf(p))); inner.add(body);
    const f = face(p, P * .78); f.position.z = .3; inner.add(f);
    const ring = focusFrame(P + .16, P + .16, 0xFFE29A, .09); ring.position.z = .02; ring.visible = false; g.add(ring);
    return { p, g, inner, ring, wig: -9, born: time() + k * .05 }; });
  const ghost = new THREE.Group(); const gb = new THREE.Mesh(rbox(C * .55, C * .55, .2, C * .1), lam(0xffffff)); ghost.add(gb); const gf = face(' ', C * .5); gf.position.z = .27; ghost.add(gf); bench.add(ghost);
  const done = bigButton('✅  ' + (r.finish || 'Done'), { w: 2.9, h: 1.0 }); done.group.position.set(gx + cols * C / 2 + 2.0, gy - .4, .4); done.group.visible = false; ctx.root.add(done.group);
  let held = parts[0], zone = 'tray', ti = 0, fr = 0, fc = 0, doneOn = false, finished = 0, doneShownT = -9;
  const setHeld = p => { held = p; setFace(gf, p); gb.material.color.setHex(colorOf(p)); };
  setHeld(held);

  const placed = () => cells.reduce((a, row) => a + row.filter(c => c.val != null).length, 0);
  function check() {
    let match = !!target; const used = new Set(); let cnt = 0;
    cells.forEach(row => row.forEach(c => { if (c.val != null) { cnt++; used.add(c.val); }
      if (target) { const w = (target[c.i] || [])[c.j]; if (w == null ? c.val != null : String(w) !== c.val) match = false; } }));
    let ok = target ? match : cnt >= minParts; must.forEach(m => { if (!used.has(m)) ok = false; });
    if (ok && target) return win(false);
    if (ok && !doneOn) doneShownT = time();
    doneOn = ok; done.group.visible = ok; if (!ok && zone === 'done') zone = 'grid';
  }
  function win(viaDone) {
    if (finished) return; finished = time(); done.group.visible = false; ctx.sfx(viaDone ? 'fanfare' : 'twinkle');
    ctx.correct(bench.getWorldPosition(new THREE.Vector3()));
    if (r.story_say && bridge.get('autovoice', false)) ctx.say(r.story_say);
    T.after((CFG.reduced ? 800 : 2400) / 1000, () => ctx.finish({ firstTry: true, why: r.why }));
  }
  function place() {
    const c = cells[fr][fc];
    if (c.val != null && c.val === held) { c.val = null; c.piece.visible = false; ctx.sfx('pop'); }
    else { if (c.val == null && placed() >= maxParts) { c.wig = time(); ctx.sfx('bump'); return; }
      c.val = held; setFace(c.f, held); c.blk.material.color.setHex(colorOf(held)); c.piece.visible = true; c.t0 = time(); ctx.sfx('pop'); }
    check();
  }
  const nearestPod = x => { let b = 0, d = 1e9; pods.forEach((p, k) => { const dd = Math.abs(p.g.position.x + tray.position.x - x); if (dd < d) { d = dd; b = k; } }); return b; };
  const nearestCol = x => clamp(Math.round((x - gx) / C + (cols - 1) / 2), 0, cols - 1);
  return {
    wantsUp: true,
    key(k) {
      if (finished) return true;
      if (k === 'ok') {
        if (zone === 'tray') { setHeld(parts[ti]); ctx.sfx('pop'); pods[ti].wig = time(); zone = 'grid'; }
        else if (zone === 'grid') place();
        else if (zone === 'done') win(true);
        return true;
      }
      if (k !== 'left' && k !== 'right' && k !== 'up' && k !== 'down') return false;
      if (zone === 'tray') {
        if (k === 'left' && ti > 0) ti--; else if (k === 'right' && ti < n - 1) ti++;
        else if (k === 'right' && doneOn) zone = 'done';
        else if (k === 'up') { zone = 'grid'; fr = rows - 1; fc = nearestCol(pods[ti].g.position.x + tray.position.x); }
        else { pods[ti].wig = time(); ctx.sfx('bump'); }
      } else if (zone === 'grid') {
        const nx = gridStep(fr, fc, k, rows, cols);
        if (nx) { fr = nx[0]; fc = nx[1]; }
        else if (k === 'down') { zone = 'tray'; ti = nearestPod(gx + cells[fr][fc].x); }
        else if (k === 'right' && doneOn) zone = 'done';
        else { cells[fr][fc].wig = time(); ctx.sfx('bump'); }
      } else if (zone === 'done') {
        if (k === 'left') zone = 'grid'; else if (k === 'down') zone = 'tray'; else ctx.sfx('bump');
      }
      return true;
    },
    focusX() { return zone === 'done' ? done.group.position.x : zone === 'tray' ? tray.position.x + pods[ti].g.position.x : gx + cells[fr][fc].x; },
    lookX() { return clamp(this.focusX() / 6, -1, 1); },
    update(t, dt) { T.tick(t);
      const live = !finished;
      cells.forEach(row => row.forEach(c => { const foc = live && zone === 'grid' && c.i === fr && c.j === fc;
        c.ring.visible = foc; if (foc) c.ring.userData.mat.color.setHex(Math.sin(t * 6) > 0 ? 0xFFE29A : 0xFFC94A);
        const u = prog(t, c.t0, .32); // snap: drop in from the front, squash, settle
        c.piece.position.z = .12 + (1 - u) * 1.2 + (foc ? .18 : 0); c.piece.scale.setScalar(u < 1 ? .5 + .5 * u + Math.sin(u * Math.PI) * .15 : 1);
        c.piece.rotation.z = wig(t, c.wig);
        if (finished && !CFG.reduced) { const k = t - finished - (c.i * cols + c.j) * .06; c.piece.position.z += k > 0 && k < .5 ? Math.sin(k / .5 * Math.PI) * .6 : 0; } }));
      pods.forEach((p, k) => { const foc = live && zone === 'tray' && k === ti, sel = p.p === held;
        p.ring.visible = foc; if (foc) p.ring.userData.mat.color.setHex(Math.sin(t * 6) > 0 ? 0xFFE29A : 0xFFC94A);
        p.inner.position.set(0, sel ? .22 : 0, foc ? .3 : 0); p.inner.rotation.set(foc ? -.15 : 0, 0, wig(t, p.wig, .15));
        p.g.scale.setScalar(pop(t, p.born, .4) * (sel ? 1.08 : .92)); });
      // the held part hovers over the focused cell
      ghost.visible = live && zone === 'grid';
      if (ghost.visible) { const c = cells[fr][fc]; ghost.position.set(c.x + C * .32, c.y + C * .32, .75 + (CFG.reduced ? 0 : Math.sin(t * 3) * .06)); }
      done.set(live && zone === 'done', t); if (doneOn && live) done.group.scale.multiplyScalar(pop(t, doneShownT, .4) * (zone === 'done' ? 1 : 1 + .05 * Math.sin(t * 5)));
      if (finished) { done.group.visible = false; const k = t - finished;   // the model comes alive: eyes pop on, it hops and wiggles
        eyes.scale.setScalar(pop(t, finished + .3, .4)); eyes.children.forEach((e, i) => { if (i % 2) e.position.x = (i < 2 ? -1 : 1) * .26 * Math.min(1.7, C * 1.3) + Math.sin(t * 3) * .05; });
        if (!CFG.reduced) { model.position.y = Math.abs(Math.sin(k * 5)) * .3 * clamp(k - .4); model.rotation.z = Math.sin(k * 7) * .06 * clamp(k - .4); model.rotation.y = Math.sin(k * 2.5) * .25 * clamp(k - .4); } }
    },
    dispose() { T.clear();},
  };
}

// ---------------- slots: pick who / where / what (or named parts), then it comes alive ----------------
function slots(ctx, r) {
  const T = makeTimers();
  let rowsD;
  if (Array.isArray(r.slots) && r.slots.length) rowsD = r.slots.map(s => ({ key: s.name || '', icon: '', opts: (s.options || []).map(o => typeof o === 'object' ? { pic: String(o.face || o.pic || ''), label: o.label || '' } : { pic: String(o), label: '' }) }));
  else rowsD = ['who', 'where', 'what'].filter(k => Array.isArray(r[k])).map((k, i) => ({ key: k, icon: { who: '🧒', where: '📍', what: '🎬' }[k], opts: r[k].map(o => typeof o === 'object' ? { pic: String(o.face || o.pic || ''), label: o.label || '' } : { pic: String(o), label: '' }) }));
  const story = !r.slots && rowsD.some(d => d.key === 'where');
  const nR = rowsD.length, rowStep = Math.min(1.35, 5.0 / Math.max(1, nR)), maxO = Math.max(1, ...rowsD.map(d => d.opts.length)), osp = Math.min(1.5, 6.6 / maxO), O = Math.min(osp * .8, rowStep * .74);
  const topY = 4.0 - (rowStep - O) / 2;
  // the model on the left: a totem (named parts, top to bottom) or a story stage (where behind, who in front, what as a badge)
  const stage = new THREE.Group(); stage.position.set(-3.3, 1.2, -.4); ctx.root.add(stage);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.75, .5, 32), lam(0x3A2A9E)); ped.position.y = -1.2; stage.add(ped);
  const pedTop = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, .06, 32), lam(0xFFC94A)); pedTop.position.y = -.93; stage.add(pedTop);
  const mfaces = rowsD.map((d, i) => { let f;
    if (story) { const sz = d.key === 'where' ? 3.0 : d.key === 'who' ? 1.8 : 1.2; f = face(' ', sz); f.position.set(d.key === 'what' ? 1.3 : d.key === 'who' ? -.5 : 0, d.key === 'where' ? 1.1 : d.key === 'who' ? 0 : 2.4, d.key === 'where' ? -.3 : .2 + i * .05); }
    else { const h = Math.min(1.15, 3.5 / nR); f = face(' ', h * 1.25); f.position.set(0, -.45 + h / 2 + (nR - 1 - i) * h, .1 + i * .01); }
    f.userData.t0 = -9; stage.add(f); return f; });
  // option rows on the right
  const rows = rowsD.map((d, i) => { const y = topY - i * rowStep; const g = new THREE.Group(); g.position.set(2.8, y, .3); ctx.root.add(g);
    if (d.icon) { const ic = face(d.icon, O * .8); ic.position.set(-(maxO / 2) * osp - .45, 0, 0); g.add(ic); }
    const opts = d.opts.map((o, k) => { const og = new THREE.Group(); og.position.x = (k - (d.opts.length - 1) / 2) * osp; g.add(og);
      const inner = new THREE.Group(); og.add(inner);
      const body = new THREE.Mesh(rbox(O, O, .3, O * .2), lam(PART_COLS[(i * 3 + k) % PART_COLS.length])); inner.add(body);
      const f = face(o.pic, O * .78); f.position.z = .28; inner.add(f);
      const ring = focusFrame(O + .16, O + .16, 0xFFE29A, .09); ring.position.z = .02; ring.visible = false; og.add(ring);
      return { o, og, inner, body, ring, wig: -9, born: time() + i * .1 + k * .04 }; });
    return { d, g, opts, chosen: -1 }; });
  const done = bigButton(story ? '📖  Tell my story' : '✨  Bring it alive!', { w: 4.2, h: 1.05 }); done.group.position.set(2.8, -1.55, .9); done.group.visible = false; ctx.root.add(done.group);
  let fr = 0, fo = 0, onDone = false, ready = false, finished = 0, readyT = -9;
  const allChosen = () => rows.every(x => x.chosen >= 0);
  function choose() {
    const R = rows[fr], k = fo; R.chosen = k; R.opts[k].wig = time(); ctx.sfx('pop');
    setFace(mfaces[fr], R.opts[k].o.pic); mfaces[fr].userData.t0 = time();
    if (allChosen()) { if (!ready) { ready = true; readyT = time(); done.group.visible = true; onDone = true; } }   // native focuses the button
    else if (fr < rows.length - 1) { fr++; fo = Math.min(fo, rows[fr].opts.length - 1); }
  }
  function tell() {
    finished = time(); done.group.visible = false; ctx.sfx('fanfare'); ctx.correct(stage.getWorldPosition(new THREE.Vector3()).setY(2.4));
    let txt;
    if (story) { txt = r.story || '{who} · {where} · {what}'; rows.forEach(x => { const o = x.opts[x.chosen].o; txt = txt.replace('{' + x.d.key + '}', (o.pic + ' ' + o.label).trim()); }); }
    else txt = rows.map(x => x.opts[x.chosen].o.pic).join('  ') + '  ✨';
    ctx.bubble(txt, '#7CF2B0');
    if (r.story_say && bridge.get('autovoice', false)) ctx.say(r.story_say);
    T.after((CFG.reduced ? 1200 : 3000) / 1000, () => ctx.finish({ firstTry: true, why: r.why }));
  }
  return {
    wantsUp: true,
    key(k) {
      if (finished) return true;
      if (k === 'ok') { if (onDone) tell(); else choose(); return true; }
      if (onDone) { if (k === 'up') { onDone = false; fr = rows.length - 1; fo = Math.min(fo, rows[fr].opts.length - 1); } else if (k === 'left' || k === 'right' || k === 'down') ctx.sfx('bump'); else return false; return true; }
      const R = rows[fr];
      if (k === 'left' || k === 'right') { const n2 = fo + (k === 'left' ? -1 : 1); if (n2 >= 0 && n2 < R.opts.length) fo = n2; else { R.opts[fo].wig = time(); ctx.sfx('bump'); } }
      else if (k === 'up') { if (fr > 0) { fr--; fo = Math.min(fo, rows[fr].opts.length - 1); } else { R.opts[fo].wig = time(); ctx.sfx('bump'); } }
      else if (k === 'down') { if (fr < rows.length - 1) { fr++; fo = Math.min(fo, rows[fr].opts.length - 1); } else if (ready) onDone = true; else { R.opts[fo].wig = time(); ctx.sfx('bump'); } }
      else return false;
      return true;
    },
    focusX() { return onDone ? 2.8 : 2.8 + rows[fr].opts[fo].og.position.x; },
    lookX() { return onDone ? .3 : clamp(.2 + fo * .2, -1, 1); },
    update(t) { T.tick(t);
      const live = !finished;
      rows.forEach((R, i) => R.opts.forEach((p, k) => { const foc = live && !onDone && i === fr && k === fo, sel = R.chosen === k;
        p.ring.visible = foc; if (foc) p.ring.userData.mat.color.setHex(Math.sin(t * 6) > 0 ? 0xFFE29A : 0xFFC94A);
        p.inner.position.set(0, sel ? .12 : 0, foc ? .3 : 0); p.inner.rotation.set(foc ? -.15 : 0, 0, wig(t, p.wig, .15));
        p.og.scale.setScalar(pop(t, p.born, .4) * (sel ? 1.1 : (R.chosen >= 0 ? .82 : .95)));
        p.body.material.emissive && p.body.material.emissive.setHex(sel ? 0x553300 : 0x000000); }));
      mfaces.forEach((f, i) => { f.scale.setScalar(pop(t, f.userData.t0, .45));
        if (finished && !CFG.reduced) { const k = t - finished; f.rotation.z = Math.sin(k * 6 + i * 1.3) * .14; f.position.x += (Math.sin(k * 3 + i) * .004); } });
      done.set(onDone && live, t); if (ready && live) done.group.scale.multiplyScalar(pop(t, readyT, .4));
      if (finished && !CFG.reduced) { const k = t - finished; stage.position.y = 1.2 + Math.abs(Math.sin(k * 4.5)) * .35; stage.rotation.y = Math.sin(k * 2) * .3; }
    },
    dispose() { T.clear();},
  };
}
