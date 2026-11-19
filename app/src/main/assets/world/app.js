// Entry point of the 3D world layer. The Android host (WorldActivity / MainActivity) loads
// https://appassets.androidplatform.net/world/index.html?screen=home from APK assets (offline).
import { router, start, fontsReady, CFG, camera } from './core/engine.js';
import { setMascotCamera } from './core/mascot.js';
import { setProps } from './core/kit.js';
import { GLTFLoader } from './vendor/jsm/loaders/GLTFLoader.js';
import { THREE } from './core/engine.js';
async function loadProps() {
  if (new URLSearchParams(location.search).has('procedural')) return;
  try { const g = await new GLTFLoader().loadAsync('models/props.glb'); const t = g.scene.getObjectByName('tile'), p = g.scene.getObjectByName('pedestal');
    const fix = m => { m.material.map.colorSpace = THREE.SRGBColorSpace; return m.material.map; };
    setProps({ tileGeo: t.geometry, tileTex: fix(t), pedGeo: p.geometry, pedTex: fix(p) }); } catch (e) { console.log('props unavailable: ' + e); } }
import { HomeScreen, loadBlenderAssets } from './screens/home.js';
import { PlaylistScreen } from './screens/playlist.js';
import { GameScreen, loadGames } from './screens/game.js';
import { TryScreen } from './screens/try.js';

// Intro film (Blender, 6 s) once per app start; any remote key skips it. The 3D world starts after it.
const intro = document.getElementById('intro');
const playIntro = () => new Promise(res => {
  const Qs = new URLSearchParams(location.search);
  if (!intro || Qs.has('perf') || Qs.has('scripted') || Qs.has('nointro') || (Qs.get('screen') || 'home') !== 'home') { intro && intro.remove(); return res(); }
  let done = false; const end = () => { if (done) return; done = true; window.__introSkip = null; intro.remove(); res(); };
  window.__introSkip = end; intro.onended = end; intro.onerror = end; setTimeout(end, 9000);
  intro.play().catch(end);
});
const introDone = playIntro();
await fontsReady();
setMascotCamera(camera);
const [D] = await Promise.all([loadGames(), loadBlenderAssets(), loadProps()]);
PlaylistScreen.D = D;
Object.assign(router.screens, { home: HomeScreen, playlist: PlaylistScreen, game: GameScreen, try: TryScreen });
const Q = new URLSearchParams(location.search);
const first = Q.get('screen') || 'home';
router.go(first, first === 'game' ? { id: Q.get('id') || D.list[0].id } : {});
await introDone;
start();
