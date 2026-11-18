// TRY on Maker Planet (TRY v3 flow): families → activities → preview → steps → "go and try it" (TV quiet) → return.
// The Android host decides what is visible (safety status, supervision flag, families, age band, recent rotation)
// and owns the screen-time meter: try_enter/try_open/try_away/try_return/try_exit events.
import { THREE, CFG, camera, router, bridge, time, clamp, itemTex, pillTex } from '../core/engine.js';
import { makeSpace, makeGround } from '../core/space.js';
import { roundedBox, makeButtons } from '../core/kit.js';
import { makeMascot } from '../core/mascot.js';

const CARD = roundedBox(2.6, 2.6, .5, .5), BIG = roundedBox(5.2, 4.2, .4, .6);
const hudPill = (root, w, h, x, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, toneMapped: false })); m.position.set(x, y, 0); root.add(m); return m; };
const setPill = (m, text, o) => { m.material.map = pillTex(text, o); m.material.needsUpdate = true; m.visible = !!text; };

export const TryScreen = {
  enter(params = {}) {
    const data = bridge.get('try3', null);
    if (!data || !data.families || !data.families.length) { bridge.open('try'); router.go('home', { focus: 1 }); return; }
    this.data = data; this.root = new THREE.Group(); this.hudRoot = new THREE.Group();
    this.space = makeSpace(); this.root.add(this.space); this.root.add(makeGround('#2FBF8F', 'craters'));
    this.tara = makeMascot(); this.tara.position.set(-8, 1.8, 0); this.tara.scale.setScalar(.85); this.root.add(this.tara);
    this.stage = new THREE.Group(); this.root.add(this.stage);
    this.title = hudPill(this.hudRoot, 1300, 150, 960, 1080 - 105); this.line = hudPill(this.hudRoot, 1500, 120, 960, 300); this.dots = hudPill(this.hudRoot, 600, 70, 960, 1080 - 205);
    this.dimQ = new THREE.Mesh(new THREE.PlaneGeometry(1920, 1080), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, toneMapped: false })); this.dimQ.position.set(960, 540, 5); this.hudRoot.add(this.dimQ);
    this.buttons = null; bridge.event('try_enter', {});
    this.show(params.mode || 'home', params);
  },
  exit() { bridge.event('try_exit', {}); },
  clearStage() { this.stage.clear(); if (this.buttons) { this.buttons.group.removeFromParent(); this.buttons = null; } this.items = []; this.focus = 0; setPill(this.line, ''); setPill(this.dots, ''); },
  row(list, make) { // floating cards in a row, D-pad left/right
    this.items = list.map((it, i) => { const g = new THREE.Group(); g.position.set((i - (list.length - 1) / 2) * 3.3, .6, 0); this.stage.add(g); make(g, it); g.userData.lift = 0; return g; }); },
  show(mode, p = {}) {
    this.mode = mode; this.clearStage(); this.t0 = time(); const D = this.data, L = D.lines || {};
    if (mode === 'home') {
      setPill(this.title, L.home || "Let's do something in the real world!", { w: 1700, h: 200, accent: '#3FE0A8', font: 64 });
      this.row(D.families, (g, f) => { g.add(new THREE.Mesh(CARD, new THREE.MeshLambertMaterial({ color: new THREE.Color(f.color || '#2F7D4A') })));
        const face = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), new THREE.MeshBasicMaterial({ map: itemTex(f.icon || '★', { fg: '#fff' }), transparent: true })); face.position.z = .5; g.add(face); });
      this.focus = Math.max(0, D.families.findIndex(f => f.id === this.fam)); this.say = L.home; this.updateLine();
    } else if (mode === 'list') {
      this.fam = p.fam; const f = D.families.find(x => x.id === p.fam); this.acts = f.acts;
      setPill(this.title, f.name, { w: 1300, h: 200, accent: f.color || '#3FE0A8', font: 80 });
      this.row(f.acts, (g, a) => { g.add(new THREE.Mesh(CARD, new THREE.MeshLambertMaterial({ color: new THREE.Color(f.color || '#2F7D4A').offsetHSL(0, 0, .08) })));
        const face = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), new THREE.MeshBasicMaterial({ map: itemTex(a.pic || '★'), transparent: true })); face.position.z = .5; g.add(face); });
      this.focus = Math.max(0, f.acts.findIndex(a => a.activity_id === (this.act && this.act.activity_id))); this.updateLine();
    } else if (mode === 'preview') {
      const a = this.act = p.act; bridge.event('try_open', { id: a.activity_id });
      setPill(this.title, a.title, { w: 1300, h: 200, accent: '#3FE0A8', font: 80 });
      const card = new THREE.Group(); card.position.set(0, 1.6, 0); this.stage.add(card); card.add(new THREE.Mesh(BIG, new THREE.MeshLambertMaterial({ color: 0xFBF7FF })));
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: itemTex(a.pic || '★'), transparent: true })); pic.position.z = .45; card.add(pic); card.userData.lift = 0; this.items = [card];
      const need = (a.materials || []).map(m => (m.pic || '') + ' ' + (m.name || '')).join('   ').trim();
      const adult = a.adult_support === 'required' ? 'Do this with a grown-up' : a.adult_support === 'recommended' ? 'Ask a grown-up to help' : 'You can do this yourself';
      setPill(this.line, (need ? need + '  ·  ' : '') + 'About ' + ((a.duration_minutes || {}).max || 5) + ' min  ·  ' + adult, { w: 2400, h: 190, bg: '#2A1E7A', accent: a.adult_support === 'required' ? '#FF9F5A' : '#7CF2B0', font: 60 });
      this.line.position.y = 330; this.say = a.say;
      this.buttons = makeButtons(this.hudRoot, [{ text: 'Show me how', accent: '#7CF2B0', act: () => { this.step = 0; this.show('step'); } }, { text: 'Another one', accent: '#FFC94A', act: () => this.show('list', { fam: this.fam }) }], { y: 150 });
    } else if (mode === 'step') {
      const steps = this.act.child_steps || []; if (this.step >= steps.length) return this.show('away');
      const s = steps[this.step]; setPill(this.title, (this.act.pic || '') + '  ' + this.act.title, { w: 1300, h: 200, accent: '#3FE0A8', font: 70 });
      setPill(this.dots, steps.map((_, i) => i < this.step ? '●' : i === this.step ? '◉' : '○').join(' '), { w: 1200, h: 140, bg: '#2A1E7A', ring: null, font: 70 });
      const card = new THREE.Group(); card.position.set(0, 1.7, 0); this.stage.add(card); card.add(new THREE.Mesh(BIG, new THREE.MeshLambertMaterial({ color: 0xFBF7FF })));
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: itemTex(s.pic || '★'), transparent: true })); pic.position.z = .45; card.add(pic); card.userData.lift = 0; this.items = [card];
      setPill(this.line, s.text || '', { w: 2400, h: 190, bg: '#16113F', accent: '#FFC94A', font: 72 }); this.line.position.y = 330; this.say = s.say || s.text;
      if (bridge.get('autovoice', false)) bridge.say(this.say);
      const last = this.step === steps.length - 1;
      this.buttons = makeButtons(this.hudRoot, [{ text: 'Back', accent: '#B49CFF', act: () => { if (this.step > 0) { this.step--; this.show('step'); } else this.show('preview', { act: this.act }); } },
        { text: last ? "Let's go!" : 'Next', accent: '#7CF2B0', act: () => { this.step++; this.show('step'); } }, { text: 'Skip', accent: '#FFC94A', act: () => this.show('away') }], { y: 150 });
      this.buttons.key('right');                                          // focus "Next"
    } else if (mode === 'away' || mode === 'rest') {
      bridge.event('try_away', {}); this.awayT = time();
      setPill(this.title, mode === 'rest' ? (L.rest || 'Time to rest.') : (L.away || "Now go and try it. You don't need to stay here."), { w: 2200, h: 200, bg: '#0B0830', accent: '#3A2A9E', font: 62 });
      this.tara.userData.setMood('idle', time());
    } else if (mode === 'return') {
      bridge.event('try_return', {});
      setPill(this.title, L.notice || 'What did you notice?', { w: 1300, h: 200, accent: '#FFC94A', font: 80 });
      setPill(this.line, 'Tell someone, if you like.', { w: 1300, h: 150, bg: '#2A1E7A', ring: null, font: 56 }); this.line.position.y = 520;
      this.buttons = makeButtons(this.hudRoot, [{ text: 'Try another', accent: '#7CF2B0', act: () => this.show('home') }, { text: 'Home', accent: '#B49CFF', act: () => router.go('home', { focus: 1 }) }, { text: 'Rest', accent: '#FFC94A', act: () => this.show('rest') }], { y: 260 });
    }
  },
  updateLine() { const it = this.mode === 'home' ? this.data.families[this.focus] : this.acts && this.acts[this.focus]; if (!it) return;
    const label = this.mode === 'home' ? it.name : it.title + (it.adult_support === 'required' || it.adult_support === 'recommended' ? '  ·  with a grown-up' : '');
    setPill(this.line, label, { w: 1500, h: 170, bg: '#16113F', accent: this.mode === 'home' ? (it.color || '#3FE0A8') : '#FFC94A', font: 70 }); this.line.position.y = 230; this.say = this.mode === 'home' ? it.name : it.say; },
  key(k) {
    const m = this.mode;
    if (m === 'away' || m === 'rest') { if (time() - this.awayT > .8) this.show('return'); return true; }
    if (k === 'up') { if (this.say) bridge.say(this.say); return true; }
    if (k === 'back') { if (m === 'home') router.go('home', { focus: 1 }); else if (m === 'list') this.show('home'); else if (m === 'preview') this.show('list', { fam: this.fam });
      else if (m === 'step') { if (this.step > 0) { this.step--; this.show('step'); } else this.show('preview', { act: this.act }); } else if (m === 'return') this.show('home'); return true; }
    if (this.buttons) return this.buttons.key(k);
    if (k === 'left' && this.focus > 0) { this.focus--; bridge.sfx('pop'); this.updateLine(); }
    else if (k === 'right' && this.focus < this.items.length - 1) { this.focus++; bridge.sfx('pop'); this.updateLine(); }
    else if (k === 'ok') { bridge.sfx('twinkle'); if (m === 'home') this.show('list', { fam: this.data.families[this.focus].id }); else if (m === 'list') this.show('preview', { act: this.acts[this.focus] }); }
    return true;
  },
  update(t, dt) {
    const quiet = this.mode === 'away' || this.mode === 'rest';
    (this.items || []).forEach((g, i) => { const f = (!this.buttons && i === this.focus) ? 1 : 0; g.userData.lift += (f - g.userData.lift) * (CFG.reduced ? 1 : clamp(dt * 10));
      g.position.y = (this.mode === 'preview' || this.mode === 'step' ? 2.3 : .6) + g.userData.lift * .8 + (quiet ? 0 : Math.sin(t * 1.4 + i) * .06); g.position.z = g.userData.lift * 1.2;
      g.rotation.set(-.12 * g.userData.lift, Math.sin(t * .8 + i) * .05, 0); g.scale.setScalar(.9 + .2 * g.userData.lift); });
    this.buttons && this.buttons.update(t);
    this.tara.userData.update(t, 0);
    // away: the screen goes quiet and dim after a minute (same as the classic dim-away screen)
    const dim = quiet ? clamp((t - this.awayT - 60) / 3) * .65 : 0; this.space.visible = true;
    this.dimQ.material.opacity = dim; this.dimQ.visible = dim > 0; camera.position.set(0, 3 + Math.sin(t * .37) * (quiet ? 0 : .1), 14.5); camera.lookAt(0, 1.4, 0); camera.fov = 42; camera.updateProjectionMatrix(); this.space.userData.follow(camera);
  },
};
