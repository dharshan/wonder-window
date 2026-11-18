// SORT engine (games.json "sort"; natively it runs through the pick round, MainActivity.roundAnswer).
// One object (board[0]) floats over the bins (choices + labels); LEFT/RIGHT carries it, OK drops it in.
// Same answer rules as native pick: answer (index, -1 or any_ok = any bin), also_ok (extra right bins);
// 1st miss dims that bin and the `fade` bin, hint; 2nd miss dims every other bin and the right one pulses.
// `oops` (the buddy's wrong pick) starts the object hovering over that bin; the round prompt tells the story.
import { placeCore } from './place.js';

export default function sort(ctx, r) {
  const choices = (r.choices || []).map(String), labels = Array.isArray(r.labels) ? r.labels : [];
  const board = Array.isArray(r.board) ? r.board : (r.board != null ? [r.board] : ['?']);
  const ans = r.answer == null ? 0 : +r.answer, also = (r.also_ok || []).map(Number);
  const ok = (i, b) => r.any_ok || ans < 0 || b === ans || also.includes(b);
  let focus = 0;
  if (r.oops != null) { const k = choices.indexOf(String(r.oops)); if (k >= 0) focus = k; }   // the prompt says the buddy got it wrong
  return placeCore(ctx, r, { items: [String(board[0])], bins: choices.map((c, i) => ({ face: c, label: labels[i] })),
    ok, right: () => (ans >= 0 && ans < choices.length ? ans : 0), dimWrong: true, fade: r.fade, focus, big: true });
}
