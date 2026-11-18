// Game shell: runs any catalogue game (games.json + catalogue_games.json) in the 3D world.
// Same rules as the native shell it replaces (MainActivity.startGame/nextRound/adapt/endGame):
//  * SET rounds per session (rounds_per_session, default 5); level from 'glevel:<id>';
//  * fresh rounds first via 'gseen:<id>' (last ~1500 chars of ids), never the same round twice in a set;
//  * adaptive: 3 first-try in a row climbs a level mid-set, 2 misses steps down once; 4+ first-try promotes;
//  * personal rounds are resolved by the Android host (bridge.resolve) so child data never lives in JS;
//  * no timers, no streak counters on screen, no punishment; a wrong answer wiggles and gives a hint.
import { THREE, CFG, camera, router, bridge, time, clamp, ease } from '../core/engine.js';
import { makeSpace, makeGround } from '../core/space.js';
import { makeBurst, makeGarden, makeBubble, makeSeeds, makeButtons } from '../core/kit.js';
import { makeMascot } from '../core/mascot.js';
import { ENGINES, engineFor } from '../engines/index.js';

let DATA = null;
export async function loadGames() {
  if (DATA) return DATA;
  const [a, b] = await Promise.all([fetch('../games.json').then(r => r.json()).catch(() => ({ games: [] })), fetch('../catalogue_games.json').then(r => r.json()).catch(() => ({ games: [] }))]);
  // same filtering as MainActivity.onCreate: merged games are hidden, merged modes are shown, unbuilt variants skipped
  const BUILT = new Set(['pick', 'sort', 'grid_path', 'keypad', 'recite', 'place', 'echo', 'order', 'peek', 'mirror', 'pairs', 'compose', 'scene_canvas', 'slots']);
  const modes = (b.merged_modes || []).map(m => Object.assign({}, m, { id: m.id || m.mode_id || (m.alias_of + '-' + String(m.name || '').toLowerCase()) }));
  const cat = (b.games || []).filter(g => !g.merged_into && !(g.needs_variant && !BUILT.has(g.needs_variant)));
  const list = [...(a.games || []), ...modes, ...cat].filter(g => g && g.id && g.levels);
  DATA = { list, byId: Object.fromEntries(list.map(g => [g.id, g])) }; return DATA;
}
const BUDDY = () => bridge.buddy();
const fill = s => String(s || '').replace(/\{buddy\}/g, BUDDY());

function usable(r) { const dyn = r.dynamic || ''; if (dyn && !bridge.canResolve(dyn)) return false; if (r.variant === 'keypad' && r.check !== 'literal') return false; return true; }

export const GameScreen = {
  root: null, hudRoot: null,
  enter({ id }) {
    const g = DATA.byId[id]; this.game = g; this.root = new THREE.Group(); this.hudRoot = new THREE.Group();
    this.space = makeSpace(); this.root.add(this.space);
    this.root.add(makeGround(g.color || '#F08A3E', 'puzzle'));
    this.tara = makeMascot(); this.tara.position.set(-7.6, 2.2, -1.2); this.tara.scale.setScalar(.95); this.root.add(this.tara);
    this.burst = makeBurst(); this.root.add(this.burst); this.garden = makeGarden(); this.root.add(this.garden);
    this.bubble = makeBubble(this.hudRoot);
    const levels = g.levels || []; this.maxLevel = Math.max(1, ...levels.map(l => l.level || 1));
    this.level = Math.min(bridge.get('glevel:' + id, 1), this.maxLevel); this.cur = this.level;
    this.SET = g.rounds_per_session || 5; this.seeds = makeSeeds(this.hudRoot, this.SET); this.seeds.set(0, -1);
    this.used = new Set(); this.idx = 0; this.firstTry = 0; this.streak = 0; this.miss = 0; this.upDone = this.downDone = false;
    this.engine = null; this.phase = 'intro'; this.phaseT = time(); this.buttons = null; this.camX = 0;
    this.bubble.set(fill(g.story || g.say_intro || g.name));
    if (bridge.get('autovoice', false)) bridge.say(fill(g.say_intro || g.story));
    bridge.event('game_start', { id }); this.startMs = Date.now();
  },
  exit() { this.engine && this.engine.dispose && this.engine.dispose(); bridge.event('game_end', { id: this.game.id, ms: Date.now() - this.startMs }); },
  roundsAt(lv) { const L = (this.game.levels || []).find(l => (l.level || 1) === lv); return (L && L.rounds) || ((this.game.levels || [])[0] || {}).rounds || []; },
  nextRound() {
    const rs = this.roundsAt(this.cur); let free = rs.filter(r => !this.used.has(r.id) && usable(r)); if (!free.length) free = rs.filter(usable);
    const seen = bridge.get('gseen:' + this.game.id, '') || ''; const fresh = free.filter(r => !seen.includes('|' + r.id + '|'));
    const pool = fresh.length ? fresh : free; const r = pool[Math.floor(Math.random() * pool.length)]; this.used.add(r.id);
    let s2 = seen + '|' + r.id + '|'; if (s2.length > 1500) s2 = s2.slice(-1500); bridge.set('gseen:' + this.game.id, s2);
    return bridge.resolve(r);
  },
  startRound() {
    this.engine && this.engine.dispose && this.engine.dispose(); if (this.engineRoot) this.engineRoot.removeFromParent(); if (this.engineHud) this.engineHud.removeFromParent();
    if (this.idx >= this.SET) return this.end();
    const r = this.nextRound(); this.round = r; this.tries = 0;
    this.engineRoot = new THREE.Group(); this.root.add(this.engineRoot); this.engineHud = new THREE.Group(); this.hudRoot.add(this.engineHud);
    const make = engineFor(this.game, r); const self = this;
    const ctx = { root: this.engineRoot, hudRoot: this.engineHud, game: this.game, round: r, tara: this.tara, fill,
      bubble: (t, a) => self.bubble.set(fill(t), a), say: t => bridge.say(fill(t)), sfx: n => bridge.sfx(n),
      correct(at) { bridge.sfx('chime'); if (at) self.burst.userData.fire(at); self.tara.userData.setMood('happy', time()); },
      wrong(hint) { self.tries++; bridge.sfx('boing'); self.tara.userData.setMood('think', time()); self.bubble.set(fill(self.tries >= 2 && hint ? hint : (r.retry || 'Hmm, look again!')), '#FFB347'); },
      finish({ firstTry = self.tries === 0, why } = {}) { self.finishRound(firstTry, why); } };
    this.engine = make(ctx, r); this.phase = 'play'; this.phaseT = time();
    this.bubble.set(fill(r.prompt || r.say || ''), '#FFC94A'); if (bridge.get('autovoice', false)) bridge.say(fill(r.say || r.prompt));
    this.seeds.set(this.idx, this.idx);
  },
  finishRound(firstTry, why) {
    if (this.phase !== 'play') return; this.phase = 'reward'; this.phaseT = time();
    if (firstTry) this.firstTry++;
    if (this.game.adaptive !== false) { if (firstTry) { this.streak++; this.miss = 0; } else { this.miss++; this.streak = 0; }
      if (this.streak >= 3 && this.cur < this.maxLevel && !this.upDone) { this.cur++; this.streak = 0; this.upDone = true; }
      else if (this.miss >= 2 && this.cur > 1 && !this.downDone) { this.cur--; this.miss = 0; this.downDone = true; } }
    this.garden.userData.grow(firstTry ? 0x7CF2B0 : 0xB49CFF);
    const cheer = (this.game.cheers || ['Well done!'])[Math.floor(Math.random() * (this.game.cheers || [1]).length)];
    this.bubble.set(fill(why || this.round.why || cheer), '#7CF2B0'); if (bridge.get('autovoice', false)) bridge.say(fill(why || this.round.why || cheer));
    this.idx++; this.seeds.set(this.idx, this.idx);
  },
  end() {
    this.phase = 'end'; this.phaseT = time();
    let next = this.cur; if (this.firstTry >= 4 && this.cur === this.level && this.cur < this.maxLevel && this.game.adaptive !== false) next = this.cur + 1;
    bridge.set('glevel:' + this.game.id, next); bridge.sfx('fanfare');
    const lines = this.game.end_lines || ['You finished ' + this.game.name + '!']; this.bubble.set(fill(lines[Math.floor(Math.random() * lines.length)]), '#7CF2B0');
    this.tara.userData.setMood('happy', time()); this.burst.userData.fire(new THREE.Vector3(0, 2.5, 0));
    this.buttons = makeButtons(this.hudRoot, [
      { text: 'Again', accent: '#7CF2B0', act: () => router.go('game', { id: this.game.id }) },
      { text: 'More games', accent: '#FFC94A', act: () => router.go('playlist', {}) },
      { text: 'Home', accent: '#B49CFF', act: () => router.go('home', {}) }], { y: 260 });
  },
  key(k) {
    if (k === 'back') { router.go('playlist', {}); return true; }
    if (k === 'up' && this.phase === 'play' && this.engine && this.engine.wantsUp) return this.engine.key(k);
    if (k === 'up' && this.phase !== 'end') { bridge.say(fill(this.phase === 'intro' ? (this.game.say_intro || this.game.story) : (this.round && (this.round.say || this.round.prompt)))); return true; }
    if (this.phase === 'intro') { if (k === 'ok') this.startRound(); return true; }
    if (this.phase === 'reward') { if (k === 'ok' && time() - this.phaseT > .6) this.startRound(); return true; }
    if (this.phase === 'end') return this.buttons.key(k);
    return this.engine && this.engine.key ? this.engine.key(k) : false;
  },
  update(t, dt) {
    if (this.phase === 'intro' && t - this.phaseT > (CFG.reduced ? .2 : 2.2)) this.startRound();
    if (this.phase === 'reward' && t - this.phaseT > 3.0) this.startRound();
    this.engine && this.engine.update && this.engine.update(t, dt);
    this.burst.userData.update(t, dt); this.garden.userData.update(t); this.bubble.update(t); this.buttons && this.buttons.update(t);
    this.tara.userData.update(t, this.engine && this.engine.lookX ? this.engine.lookX() : 0);
    const fx = this.engine && this.engine.focusX ? this.engine.focusX() : 0; this.camX += (fx * .12 - this.camX) * clamp(dt * 3);
    camera.position.set(this.camX + Math.sin(t * .3) * .2, 2.7 + Math.sin(t * .37) * .1, 13.5); camera.lookAt(this.camX * .5, 1.35, 0);
    this.space.userData.follow(camera);
  },
};
