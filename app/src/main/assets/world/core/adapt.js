// Shared logic for real-time PLAY games (Star Catcher, Fuel Up, Docking Run, Comet Trace).
// Pure functions and small state objects: no three.js, no DOM, so tools/tests/test_action_adapt.mjs can run them in Node.

/**
 * Difficulty engine. `level` runs 0 (easiest) .. 1 (hardest). It watches a rolling window of outcomes and keeps the
 * child succeeding about 70-85% of the time: above the band it steps up a little, below it steps down faster.
 * It never moves until a full window of outcomes is in (a short window makes an 80% child look like 86%), and moves at most once per `cooldown` outcomes, so it doesn't swing.
 * Stored on the TV only (via the host's SharedPreferences), one number per game: no profile, no history.
 */
export function makeAdapt({ level = 0.15, low = 0.70, high = 0.85, up = 0.05, down = 0.08, window = 10, minSamples = 10, cooldown = 3 } = {}) {
  const outcomes = [];
  let since = 0;
  const A = {
    get level() { return level; },
    set level(v) { level = clamp01(v); },
    rate() { return outcomes.length ? outcomes.filter(Boolean).length / outcomes.length : null; },
    /** Record one trial (true = success). Returns -1, 0 or +1: the direction the level moved. */
    record(ok) {
      outcomes.push(!!ok); if (outcomes.length > window) outcomes.shift(); since++;
      if (outcomes.length < minSamples || since < cooldown) return 0;
      const r = A.rate();
      if (r > high && level < 1) { level = clamp01(level + up); since = 0; return 1; }
      if (r < low && level > 0) { level = clamp01(level - down); since = 0; return -1; }
      return 0;
    },
    samples() { return outcomes.length; },
  };
  return A;
}

/** Linear blend for a tuning value: easy value at level 0, hard value at level 1. */
export const tune = (easy, hard, level) => easy + (hard - easy) * clamp01(level);
export const clamp01 = x => Math.min(1, Math.max(0, +x || 0));

/**
 * Speed while a direction is held: the system repeat (12 a second on our TV) is far too fast for a 5-year-old,
 * so movement follows our own curve instead: starts at `startFrac` of top speed and eases up over `rampS` seconds.
 */
export function heldSpeed(heldForS, { top = 1, startFrac = 0.3, rampS = 1.2 } = {}) {
  if (heldForS <= 0) return 0;
  const u = Math.min(1, heldForS / rampS);
  return top * (startFrac + (1 - startFrac) * u * u * (3 - 2 * u));
}

/**
 * Go/No-Go trial generator for Star Catcher. Deterministic with a seed so tests and replays are stable.
 * Never more than 2 no-go items in a row, and never more than 4 go items in a row, so the child can't
 * settle into "always press" or "never press".
 */
export function makeTrials(seed = 1) {
  let s = seed >>> 0 || 1, runGo = 0, runNo = 0;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return {
    rnd,
    next(noGoShare) {
      let noGo = rnd() < noGoShare;
      if (noGo && runNo >= 2) noGo = false;
      if (!noGo && runGo >= 4) noGo = true;
      if (noGo) { runNo++; runGo = 0; } else { runGo++; runNo = 0; }
      return noGo;
    },
  };
}

/**
 * Judge one Star Catcher press against the items currently in the net. Items: [{ y, go, done }].
 * The net is a band [netY - half, netY + half]. Returns the item pressed (closest to the net centre) or null.
 */
export function itemInNet(items, netY, half) {
  let best = null, bd = Infinity;
  for (const it of items) { if (it.done) continue; const d = Math.abs(it.y - netY); if (d <= half && d < bd) { bd = d; best = it; } }
  return best;
}
