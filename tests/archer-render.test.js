import assert from "node:assert/strict";
import test from "node:test";
import { archerPose, arrowPosition, arrowSpread, drawArcherVolley, MAX_VISUAL_ARROWS } from "../src/archer-render.js";
import { activateArtillery, updateArtillery } from "../src/artillery.js";
import { ARCHER_SUPPORT, LEVEL_ONE, LEVEL_TWO } from "../src/levels.js";
import { MAX_AIRBORNE_CATS } from "../src/airborne-cats.js";
import { createFigures } from "../src/figures.js";
import { laneHalfWidth } from "../src/terrain.js";
import { createMotion } from "../src/motion.js";
import { resetState } from "../src/state.js";

const level = { ...LEVEL_TWO, support: ARCHER_SUPPORT };

function fixture() {
  const state = {};
  resetState(state, level);
  const motion = createMotion();
  state.support.open = true;
  activateArtillery(state);
  function tick(time) {
    state.t = time;
    updateArtillery(state, motion.receive);
    motion.step(time, 0, state.blueTotal, state.redEntryOpen, level, state);
  }
  return { state, motion, tick };
}

test("crew draws toward the deadline and releases and recovers on the scheduled launch", () => {
  const { state, motion, tick } = fixture();
  const { readyAt } = state.support;
  assert.deepEqual(archerPose(0, readyAt, null), { draw: 0, release: 0 });
  assert.ok(archerPose(readyAt - 0.08, readyAt, null).draw > 0.5);
  tick(readyAt);
  const { points, ...launch } = motion.archers.launch;
  assert.deepEqual(launch, state.support.shot);
  assert.deepEqual(archerPose(readyAt, readyAt, launch), { draw: 0, release: 1 });
  assert.equal(archerPose(readyAt, readyAt, launch, 5).release, 0);
  assert.ok(archerPose(readyAt + 0.12, readyAt, launch, 5).release > 0.9);
  assert.deepEqual(archerPose(readyAt + 0.2, readyAt, launch), { draw: 0, release: 0 });
});

test("a bounded spread selects reproducible occupied lanes and ranks", () => {
  const { state, motion, tick } = fixture();
  tick(0.6);
  const { launch } = motion.archers;
  const { points } = launch;
  assert.deepEqual(points, arrowSpread(launch, state.front, state.redTotal));
  assert.equal(arrowSpread({ ...launch, arrows: 99 }, state.front, state.redTotal).length,
    MAX_VISUAL_ARROWS);
  assert.notDeepEqual(points, arrowSpread({ ...launch, launchedAt: 1.4 }, state.front, state.redTotal));
  assert.equal(new Set(points.map(({ slot }) => slot)).size, 12);
  assert.ok(Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x)) > 50);
  assert.ok(new Set(points.map(p => p.y)).size >= 3);
  for (const { x, y } of points) {
    assert.ok(Math.abs(x - launch.x) <= laneHalfWidth(y));
    assert.ok(y < state.front && Math.abs(y - launch.y) <= 45);
  }
  assert.ok(arrowSpread(launch, state.front, 1).every(p => p.slot === 0));

  assert.ok(arrowPosition(launch, launch.launchedAt, 0));
  assert.equal(arrowPosition(launch, launch.launchedAt, 5), null);
  for (let i = 0; i < points.length; i++) {
    const { x, y } = arrowPosition(launch, launch.impactAt, i);
    assert.deepEqual([x, y], [points[i].x, points[i].y]);
  }
  const positions = [];
  const ctx = new Proxy({ translate: (...point) => positions.push(point) }, {
    get: (target, key) => target[key] ?? (() => {}),
  });
  drawArcherVolley(ctx, launch.impactAt - 0.01, launch, null);
  assert.equal(positions.length, MAX_VISUAL_ARROWS);
  positions.length = 0;
  drawArcherVolley(ctx, launch.impactAt, launch, null);
  assert.equal(positions.length, 0);
});

test("arrows land at their launch destinations when the frontline moves", () => {
  for (const { advance, loss } of [{ advance: 18, loss: 48 }, { advance: 150, loss: 0 }]) {
    const { state, motion, tick } = fixture();
    tick(0.6);
    const { launch } = motion.archers;
    const destinations = structuredClone(launch.points);
    state.front += advance;
    const red = state.redTotal;
    const expected = structuredClone(state);
    expected.t = launch.impactAt;
    updateArtillery(expected);

    tick(launch.impactAt);
    const { impact } = motion.archers;
    assert.deepEqual(state, expected);
    assert.equal(impact.loss, loss);
    assert.equal(state.redTotal, red - loss);
    assert.deepEqual(launch.points, destinations);
    assert.deepEqual(impact.points, destinations);
    for (const [i, { x, y }] of impact.points.entries()) {
      const tip = arrowPosition(launch, impact.at, i);
      assert.deepEqual([tip.x, tip.y], [x, y]);
    }

    const cats = motion.airborne.active;
    assert.equal(cats.length, loss ? 4 : 0);
    assert.equal(cats.filter(cat => cat.defeated).length, loss ? 1 : 0);
    for (const cat of cats)
      assert.ok(destinations.some(({ x, y }) => cat.x === x && cat.y === y));
  }
});

test("misses retain their impact without adding casualties, and a later hit uses its own event", () => {
  const { state, motion, tick } = fixture();
  tick(0.6);
  const front = state.front;
  state.front += 150;
  const red = state.redTotal;
  tick(0.8);
  assert.equal(motion.archers.impact.loss, 0);
  assert.equal(state.redTotal, red);
  assert.equal(motion.falls.length, 0);
  assert.equal(motion.airborne.active.length, 0);
  assert.deepEqual(motion.archers.impact.points, motion.archers.launch.points);

  state.front = front;
  tick(1.4);
  assert.equal(motion.archers.launch.launchedAt, 1.4);
  tick(1.6);
  assert.equal(motion.archers.impact.loss, 48);
  assert.equal(state.redTotal, red - 48);
  const { impact } = motion.archers;
  assert.equal(motion.airborne.active.length, 3);
  assert.equal(motion.airborne.active.filter(cat => cat.defeated).length, 1);
  assert.equal(new Set(motion.airborne.active.map(cat => cat.x + "," + cat.y)).size, 3);
  const tips = [], puffs = [];
  const ctx = new Proxy({
    translate: (...point) => tips.push(point),
    ellipse: (...args) => puffs.push(args.slice(0, 2)),
  }, { get: (target, key) => target[key] ?? (() => {}) });
  drawArcherVolley(ctx, 1.65, motion.archers.launch, impact);
  assert.equal(new Set(tips.map(String)).size, 3);
  assert.equal(new Set(puffs.map(String)).size, 12);
});

test("victory, defeat and reset discard presentation data", () => {
  for (const mode of ["victory", "end", "menu", "reset", "switch"]) {
    const { state, motion, tick } = fixture();
    tick(0.6);
    tick(0.8);
    assert.ok(motion.archers.launch);
    assert.ok(motion.archers.impact);
    assert.ok(motion.airborne.active.length);
    if (mode === "reset" || mode === "switch") {
      motion.reset();
      if (mode === "switch") resetState(state, LEVEL_ONE);
    }
    else {
      state.mode = mode;
      tick(0.82);
    }
    assert.deepEqual(motion.archers, { launch: null, impact: null, aftermath: [] });
    assert.equal(motion.airborne.active.length, 0);
  }
});

test("sustained melee leaves room for a volley and its survivors start at the strikes", () => {
  const { state, motion, tick } = fixture();
  state.blueTotal = state.redTotal = 220;
  tick(0.6);
  const { airborne } = motion;
  for (let slot = 0; slot < MAX_AIRBORNE_CATS - 2; slot++) {
    airborne.launch({ at: 0.6, x: 210, y: state.front, vx: 0, vy: 0,
      lift: 90, spin: 8, slot });
  }
  motion.receive("clash", 0.75, 210, state.front, 15, 15);
  assert.equal(airborne.active.length, MAX_AIRBORNE_CATS - 2);
  state.front += 18;
  tick(0.8);
  assert.equal(airborne.active.length, MAX_AIRBORNE_CATS);
  const survivor = airborne.active.find(cat => cat.red && !cat.defeated);
  assert.ok(survivor);
  const strike = [survivor.x, survivor.y];
  const translations = [];
  const ctx = new Proxy({ globalAlpha: 1, translate: (x, y) => translations.push([x, y]) },
    { get: (target, key) => target[key] ?? (() => {}) });
  const atlasContext = new Proxy({}, { get: () => () => {} });
  const figures = createFigures(ctx, { createElement: () => ({ getContext: () => atlasContext }) });
  figures.setClock(state.t);
  figures.redArmy(state, motion.contact, motion.impact, airborne.slots[1]);
  figures.airborne([survivor]);
  assert.deepEqual(translations.at(-1), strike);
});

test("a saturated volley prioritizes one living reaction without displacing an airborne survivor", () => {
  const { state, motion, tick } = fixture();
  tick(0.6);
  const { airborne } = motion;
  const flight = { at: 0.6, x: 210, y: state.front, vx: 0, vy: 0, lift: 90, spin: 8 };
  for (let slot = 0; slot < MAX_AIRBORNE_CATS - 2; slot++)
    airborne.launch({ ...flight, slot });
  const meleeSurvivors = airborne.active.slice();
  for (let i = 0; i < 2; i++)
    airborne.launch({ ...flight, defeated: true, intensity: 3 });

  tick(0.8);
  assert.equal(airborne.active.length, MAX_AIRBORNE_CATS);
  assert.ok(meleeSurvivors.every(cat => airborne.active.includes(cat)));
  assert.equal(airborne.active.filter(cat => cat.fromImpact && !cat.defeated).length, 1);
});

test("support losses get one presentation while same-frame melee losses still show", () => {
  for (const meleeLoss of [0, 1]) {
    const { state, motion, tick } = fixture();
    state.redTotal = 60;
    tick(0.6);
    state.redTotal -= meleeLoss;
    tick(0.82);
    assert.equal(motion.archers.impact.loss, 48);
    assert.equal(motion.falls.length, meleeLoss);
    state.mode = "victory";
    tick(0.83);
    assert.equal(motion.falls.length, 0);
  }
});

test("repeated and fractional impacts respect the shared budget and expire", () => {
  const { state, motion, tick } = fixture();
  for (let i = 0; i < 80; i++) {
    const time = i * 0.8 + 0.6;
    state.redTotal = 500;
    tick(time);
    tick(time + 0.2);
    assert.ok(motion.airborne.active.length <= MAX_AIRBORNE_CATS);
    assert.ok(motion.airborne.active.some(cat => cat.at >= time));
  }

  const hit = motion.archers.impact;
  motion.reset();
  motion.receive("archerImpact", hit.at, { ...state.support.impact, loss: 0.5 });
  motion.step(hit.at, 0, 0, true, level, state);
  assert.ok(motion.airborne.active.length);
  assert.ok(motion.airborne.active.every(cat => !cat.defeated));
  motion.step(hit.at + 2, 0, 0, true, level, state);
  assert.equal(motion.archers.impact, null);
  assert.equal(motion.airborne.active.length, 0);
});
