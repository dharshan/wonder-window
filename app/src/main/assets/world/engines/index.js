// Registry of 3D game engines. A game is shown in the 3D world only if its engine exists here;
// everything else keeps running in the native shell (bridge.open('native-game:<id>')) until ported.
import pick from './pick.js';
export const ENGINES = { pick };
const variantOf = (game, r) => (game.variant === 'grid_path' || (r && r.grid)) ? 'grid_path' : ((r && r.variant) || game.variant || 'pick');
export function engineFor(game, r) { const v = variantOf(game, r); return ENGINES[v === 'peek' ? 'pick' : v] || null; }
/** True when every round variant used by this game has a 3D engine. */
export function gameSupported(game) { const vs = new Set([variantOf(game, null)]); (game.levels || []).forEach(l => (l.rounds || []).forEach(r => vs.add(variantOf(game, r))));
  return [...vs].every(v => ENGINES[v === 'peek' ? 'pick' : v]); }
