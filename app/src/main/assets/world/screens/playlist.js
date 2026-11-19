// PLAYLIST on Puzzle Planet: every game is a floating game-cube on a curved shelf. LEFT/RIGHT browse,
// UP/DOWN jump a category, OK plays. Games whose engines are not yet ported open in the native shell.
import { THREE, CFG, camera, router, bridge, time, clamp, itemTex, pillTex } from '../core/engine.js';
import { makeSpace, makeGround } from '../core/space.js';
import { roundedBox } from '../core/kit.js';
import { makeMascot } from '../core/mascot.js';
import { loadGames } from './game.js';
import { gameSupported } from '../engines/index.js';

const CUBE = roundedBox(2.2, 2.2, 1.2, .45), SPACING = 3.4;
export const PlaylistScreen = {
  enter({ focus } = {}) {
    const D = this.D; this.root = new THREE.Group(); this.hudRoot = new THREE.Group();
    this.space = makeSpace(); this.root.add(this.space); this.root.add(makeGround('#F08A3E', 'puzzle'));
    this.tara = makeMascot(); this.tara.position.set(-8.2, 1.2, 2); this.tara.scale.setScalar(1.6); this.root.add(this.tara);
    // order: by category then id, so UP/DOWN can jump categories
    this.games = D.list.slice().sort((a, b) => String(a.category || '').localeCompare(String(b.category || '')) || a.id.localeCompare(b.id));
    this.shelf = new THREE.Group(); this.root.add(this.shelf);
    this.cubes = this.games.map((g, i) => { const grp = new THREE.Group(); grp.position.set(i * SPACING, 0, 0); this.shelf.add(grp);
      const body = new THREE.Mesh(CUBE, new THREE.MeshLambertMaterial({ color: new THREE.Color(g.color || '#6B4BF0') })); grp.add(body);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshBasicMaterial({ map: itemTex(g.icon || '★', { fg: '#ffffff' }), transparent: true })); face.position.z = .72; grp.add(face);
      grp.userData = { lift: 0, ok: gameSupported(g) }; return grp; });
    this.focus = clamp(focus ?? bridge.get('lastGame', 0), 0, this.games.length - 1) | 0; this.scroll = this.focus * SPACING;
    this.title = new THREE.Mesh(new THREE.PlaneGeometry(1200, 150), new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, toneMapped: false })); this.title.position.set(960, 1080 - 110, 0); this.hudRoot.add(this.title);
    this.sub = new THREE.Mesh(new THREE.PlaneGeometry(1000, 90), new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, toneMapped: false })); this.sub.position.set(960, 120, 0); this.hudRoot.add(this.sub);
    this.setTitle();
  },
  setTitle() { const g = this.games[this.focus]; this.title.material.map = pillTex(g.name, { w: 1600, h: 200, accent: g.color || '#FFC94A', font: 80 }); this.title.material.needsUpdate = true;
    this.sub.material.map = pillTex((g.tagline || g.category || '') + (this.cubes[this.focus].userData.ok ? '' : '  ·  classic'), { w: 1600, h: 144, bg: '#2A1E7A', ring: null, font: 54 }); this.sub.material.needsUpdate = true; this.tT = time(); },
  move(d) { const n = this.focus + d; if (n < 0 || n >= this.games.length) { bridge.sfx('bump'); return; } this.focus = n; this.setTitle(); bridge.sfx('pop'); },
  jumpCat(d) { const c = this.games[this.focus].category; let i = this.focus; while (i >= 0 && i < this.games.length && this.games[i].category === c) i += d;
    if (i < 0 || i >= this.games.length) { bridge.sfx('bump'); return; } if (d < 0) { const c2 = this.games[i].category; while (i > 0 && this.games[i - 1].category === c2) i--; } this.focus = i; this.setTitle(); bridge.sfx('pop'); },
  key(k) { if (k === 'left') this.move(-1); else if (k === 'right') this.move(1); else if (k === 'up') this.jumpCat(-1); else if (k === 'down') this.jumpCat(1);
    else if (k === 'ok') { const g = this.games[this.focus]; bridge.set('lastGame', this.focus); bridge.sfx('twinkle'); if (this.cubes[this.focus].userData.ok) router.go('game', { id: g.id }); else bridge.open('native-game:' + g.id); }
    else if (k === 'back') { router.go('home', { focus: 0 }); } else return false; return true; },
  update(t, dt) {
    this.scroll += (this.focus * SPACING - this.scroll) * (CFG.reduced ? 1 : clamp(dt * 7));
    this.shelf.position.x = -this.scroll;
    const lo = Math.max(0, this.focus - 6), hi = Math.min(this.cubes.length - 1, this.focus + 6);
    this.cubes.forEach((c, i) => { const vis = i >= lo && i <= hi; c.visible = vis; if (!vis) return; const f = i === this.focus ? 1 : 0; c.userData.lift += (f - c.userData.lift) * clamp(dt * 10);
      const x = i * SPACING - this.scroll; c.position.y = .4 + c.userData.lift * .9 + Math.sin(t * 1.4 + i) * .06; c.position.z = 1.4 - Math.abs(x) * Math.abs(x) * .06 + c.userData.lift * 1.2;
      c.rotation.set(-.12 * c.userData.lift, -x * .06 + Math.sin(t * .8 + i) * .05, 0); c.scale.setScalar(.85 + .25 * c.userData.lift); });
    const k = clamp((t - this.tT) / .25); this.title.scale.setScalar(.92 + .08 * k);
    this.tara.userData.update(t, .5);
    camera.fov = 42; camera.updateProjectionMatrix(); camera.position.set(0, 3.2 + Math.sin(t * .37) * .1, 14.5); camera.lookAt(0, 1.4, 0); this.space.userData.follow(camera);
  },
};
