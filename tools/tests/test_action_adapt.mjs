// Unit tests for the shared real-time game logic (app/src/main/assets/world/core/adapt.js).
// Run: node --test tools/tests/*.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeAdapt, tune, heldSpeed, makeTrials, itemInNet } from '../../app/src/main/assets/world/core/adapt.js';

test('difficulty does not move before enough samples', () => {
  const a = makeAdapt({ level: 0.5 });
  for (let i = 0; i < 9; i++) assert.equal(a.record(true), 0);
  assert.equal(a.level, 0.5);
});

test('all successes climb, all failures fall faster, both stay in 0..1', () => {
  const a = makeAdapt({ level: 0.5 });
  for (let i = 0; i < 60; i++) a.record(true);
  assert.equal(a.level, 1);
  const b = makeAdapt({ level: 0.5, up: 0.05, down: 0.08 });
  let ups = 0, downs = 0;
  for (let i = 0; i < 15; i++) { const d = b.record(true); if (d > 0) ups++; }
  const c = makeAdapt({ level: 0.5, up: 0.05, down: 0.08 });
  for (let i = 0; i < 15; i++) { const d = c.record(false); if (d < 0) downs++; }
  assert.ok(0.5 - c.level > b.level - 0.5, 'steps down faster than up');
  for (let i = 0; i < 80; i++) c.record(false);
  assert.equal(c.level, 0);
  assert.ok(ups > 0 && downs > 0);
});

test('a child inside the 70-85% band is left alone', () => {
  const a = makeAdapt({ level: 0.4 });
  const pattern = [true, true, true, false, true, true, true, true, false, true]; // 80%
  for (let r = 0; r < 5; r++) pattern.forEach(p => a.record(p));
  assert.equal(a.level, 0.4);
});

test('tune blends and clamps', () => {
  assert.equal(tune(1.8, 0.9, 0), 1.8);
  assert.equal(tune(1.8, 0.9, 1), 0.9);
  assert.equal(tune(1.8, 0.9, 7), 0.9);
  assert.ok(Math.abs(tune(0.2, 0.4, 0.5) - 0.3) < 1e-9);
});

test('held speed starts gentle, ramps smoothly, never exceeds top', () => {
  assert.equal(heldSpeed(0), 0);
  assert.ok(Math.abs(heldSpeed(0.0001, { top: 10 }) - 3) < 0.01);
  let prev = 0;
  for (let t = 0.05; t <= 2; t += 0.05) { const v = heldSpeed(t, { top: 10 }); assert.ok(v >= prev - 1e-9 && v <= 10 + 1e-9); prev = v; }
  assert.equal(heldSpeed(5, { top: 10 }), 10);
});

test('trials avoid long runs and roughly follow the no-go share', () => {
  const g = makeTrials(42); let runGo = 0, runNo = 0, no = 0; const N = 2000;
  for (let i = 0; i < N; i++) {
    const x = g.next(0.3);
    if (x) { no++; runNo++; runGo = 0; } else { runGo++; runNo = 0; }
    assert.ok(runNo <= 2 && runGo <= 4);
  }
  assert.ok(no / N > 0.22 && no / N < 0.4, `share ${no / N}`);
  const a = makeTrials(7), b = makeTrials(7);
  for (let i = 0; i < 50; i++) assert.equal(a.next(0.3), b.next(0.3));
});

test('itemInNet picks the closest live item inside the band', () => {
  const items = [{ y: 2, go: true }, { y: 0.3, go: false }, { y: -0.1, go: true }, { y: 0, go: true, done: true }];
  assert.equal(itemInNet(items, 0, 0.5), items[2]);
  assert.equal(itemInNet(items, 5, 0.5), null);
  assert.equal(itemInNet([], 0, 1), null);
});
