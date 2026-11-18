// Registry of 3D game engines. A game is shown in the 3D world only if its engine exists here;
// everything else keeps running in the native shell (bridge.open('native-game:<id>')) until ported.
import pick from './pick.js';
import order from './order.js'; import place from './place.js'; import echo from './echo.js'; import sort from './sort.js';
import compose from './compose.js'; import mirror from './mirror.js'; import pairs from './pairs.js'; import grid_path from './grid_path.js'; import keypad from './keypad.js'; import recite from './recite.js';
export const ENGINES = { pick, order, place, echo, sort, compose, scene_canvas: compose, slots: compose, mirror, pairs, grid_path, keypad, recite };
const variantOf = (game, r) => (game.variant === 'grid_path' || (r && Array.isArray(r.grid))) ? 'grid_path' : ((r && r.variant) || game.variant || 'pick');
export function engineFor(game, r) { const v = variantOf(game, r); return ENGINES[v === 'peek' ? 'pick' : v] || null; }
/** True when every round variant used by this game has a 3D engine. */
export function gameSupported(game) { const vs = new Set([variantOf(game, null)]); (game.levels || []).forEach(l => (l.rounds || []).forEach(r => vs.add(variantOf(game, r))));
  return [...vs].every(v => ENGINES[v === 'peek' ? 'pick' : v]); }
