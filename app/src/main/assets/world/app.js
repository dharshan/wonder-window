// Entry point of the 3D world layer. The Android host (WorldActivity / MainActivity) loads
// https://appassets.androidplatform.net/world/index.html?screen=home from APK assets (offline).
import { router, start, fontsReady, CFG, camera } from './core/engine.js';
import { setMascotCamera } from './core/mascot.js';
import { HomeScreen } from './screens/home.js';
import { PlaylistScreen } from './screens/playlist.js';
import { GameScreen, loadGames } from './screens/game.js';
import { TryScreen } from './screens/try.js';

await fontsReady();
setMascotCamera(camera);
const D = await loadGames();
PlaylistScreen.D = D;
Object.assign(router.screens, { home: HomeScreen, playlist: PlaylistScreen, game: GameScreen, try: TryScreen });
const Q = new URLSearchParams(location.search);
const first = Q.get('screen') || 'home';
router.go(first, first === 'game' ? { id: Q.get('id') || D.list[0].id } : {});
start();
