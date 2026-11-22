import { MAX_AIRBORNE_CATS } from "../src/airborne-cats.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game.js";
import { GATE_HIT_Y } from "../src/config.js";
import {
  createMotion,
  waveDuration,
  waveProfile,
  waveRelease,
  waveY,
} from "../src/motion.js";
import { createFigures } from "../src/figures.js";
import { armyScale, FIELD_LIMIT, RESERVE_LIMIT } from "../src/army-visual.js";
import { updateArtillery } from "../src/artillery.js";
import { LEVEL_ONE, LEVEL_TWO } from "../src/levels.js";
import { IMPACT_LIFE, gapShift, gapStrength } from "../src/formation.js";

test("gate releases are ordered, bounded and start on the projectile crossing", () => {
  const quick = waveProfile(20);
  const broad = waveProfile(99);
  const flood = waveProfile(999);
  assert.ok(quick.count < broad.count && broad.count < flood.count);
  assert.ok(quick.spread < broad.spread && broad.laneOffset < flood.laneOffset);
  assert.ok(flood.count <= 24);
  assert.ok(waveDuration(quick) < 0.1);
  assert.ok(waveDuration(broad) > 0.2 && waveDuration(broad) < 0.35);
  assert.ok(waveDuration(flood) > 0.5 && waveDuration(flood) < 1);

  for (const profile of [quick, broad, flood]) {
    assert.equal(waveRelease(profile, 0), 0);
    for (let i = 1; i < profile.count; i++) {
      assert.ok(waveRelease(profile, i) > waveRelease(profile, i - 1));
    }
    assert.equal(waveY(GATE_HIT_Y, 0), GATE_HIT_Y);
    const durations = [30, 60, 120].map((hz) => {
      let frame = 0;
      while (frame / hz < waveDuration(profile)) frame++;
      return frame / hz;
    });
    for (const duration of durations) {
      assert.ok(duration - waveDuration(profile) < 1 / 30);
      const lead = waveY(GATE_HIT_Y, duration);
      const trailing = waveY(GATE_HIT_Y, duration - waveDuration(profile));
      assert.ok(lead < trailing && trailing <= GATE_HIT_Y);
    }
  }
});

for (const hz of [30, 60, 120]) {
  test(`visual waves can outlast their logical march without changing combat at ${hz} Hz`, () => {
    const arrivals = [];
    const motion = createMotion();
    const visual = createGame({
      random: () => 0.5,
      onEffect(kind, time, value, front, redLoss, blueLoss) {
        motion.receive(kind, time, value, front, redLoss, blueLoss);
        if (kind === "arrival") arrivals.push(value);
      },
    });
    const plain = createGame({ random: () => 0.5 });
    for (const game of [plain, visual]) {
      game.reset();
      game.state.front = 550;
      game.state.gunX = 329;
      game.state.gates[2].open = true;
    }
    for (let frame = 0; frame < hz * 2; frame++) {
      const before = visual.state.front;
      visual.update(1 / hz);
      motion.step(visual.state.t, (visual.state.front - before) * hz);
      plain.update(1 / hz);
      assert.deepEqual(visual.state, plain.state);
    }
    assert.ok(arrivals.length >= 3);
    assert.equal(
      arrivals.slice(0, 3).reduce((sum, q) => sum + q.count, 0),
      2997,
    );
    assert.ok(arrivals[0].marchTime < waveDuration(waveProfile(999)));
    assert.ok(motion.tails.length <= 12);
    assert.ok(motion.falls.length <= 12);
  });
}

test("contact, casualties, reversals and reset are driven by the live battle", () => {
  const directions = [];
  const motion = createMotion((direction) => directions.push(direction));
  motion.contact.redArmy.population = 200;
  motion.contact.blueArmy.population = 200;
  for (let frame = 1; frame <= 70; frame++) {
    const time = frame / 20;
    motion.receive("clash", time, 220, 300, 50, 30);
    motion.step(time, frame < 25 ? 11 : frame < 37 ? 0 : -10);
  }
  assert.deepEqual(directions, [-1]);
  assert.ok(motion.contact.surgeAt > 1.85);
  assert.ok(motion.contact.pressure < 0);
  assert.ok(motion.airborne.active.some(cat => cat.defeated));
  motion.receive("multiply", 3.5, 999);
  motion.receive("arrival", 3.5, { mult: 999, marchTime: 0.25 });
  motion.reset();
  assert.deepEqual(motion.tails, []);
  assert.deepEqual(motion.airborne.active, []);
  assert.equal(motion.pulses[2], -Infinity);
  assert.equal(motion.arrivals[2], -Infinity);
  assert.equal(motion.contact.pressure, 0);
  assert.equal(motion.contact.foughtAt, -1);
});

test("blue ranks ease outward from a new arrival lane at every tested frame rate", () => {
  const end = [30, 60, 120].map((hz) => {
    const motion = createMotion();
    motion.step(0, 0, 0, false);
    motion.receive("arrival", 0, { mult: 999, marchTime: 0.25, x: 329 });
    for (let frame = 1; frame <= hz / 2; frame++) {
      motion.step(frame / hz, -11, 2997, false);
    }
    const { blueArmy, blueAnchor } = motion.contact;
    assert.ok(blueArmy.field > 0 && blueArmy.field < blueArmy.target.field);
    assert.ok(blueArmy.reserve > 0 && blueArmy.reserve < blueArmy.target.reserve);
    assert.ok(blueAnchor > 210 && blueAnchor < 329);
    const visibleReserve = blueArmy.reserve;
    motion.step(0.51, 0, 0, false);
    assert.equal(blueArmy.field + blueArmy.reserve, 0);
    assert.ok(blueArmy.fieldExtent + blueArmy.reserveExtent > 0);
    return visibleReserve;
  });
  assert.ok(Math.max(...end) - Math.min(...end) < 1e-8);
});

test("the red population scales down to the last visible remnant", () => {
  const redFormationSize = (population) => {
    const { field, reserve } = armyScale(population);
    return field + reserve;
  };
  assert.equal(redFormationSize(0), 0);
  assert.equal(redFormationSize(1), 1);
  const remaining = [1, 500, 2000, 7000, 16000, 65000].map(redFormationSize);
  assert.deepEqual(
    remaining,
    [...new Set(remaining)].sort((a, b) => a - b),
  );
  assert.ok(redFormationSize(1_000_000) <= FIELD_LIMIT + RESERVE_LIMIT);
});

test("only resolved losses launch bounded casualties at the simulation's impact point", () => {
  const motion = createMotion();
  const game = createGame({ level: LEVEL_TWO, onEffect: motion.receive });
  game.reset();
  const { state } = game;
  state.support.open = true;
  state.support.readyAt = 0;
  state.redTotal = 21000;
  motion.step(0, 0, state.blueTotal, state.redEntryOpen, state.level, state);
  updateArtillery(state, motion.receive);
  const { x, y, impactAt } = state.support.shot;
  state.t = impactAt;
  updateArtillery(state, motion.receive);
  const hit = state.support.impact;
  assert.deepEqual([hit.x, hit.y, hit.at], [x, y, impactAt]);
  assert.equal(hit.loss, LEVEL_TWO.support.damage);
  assert.equal(state.redTotal, 21000 - hit.loss);
  assert.equal(motion.impact.loss, hit.loss);
  assert.deepEqual([motion.impact.x, motion.impact.y, motion.impact.at], [x, y, impactAt]);
  assert.equal(motion.airborne.active.length, MAX_AIRBORNE_CATS);
  assert.ok(motion.airborne.active.some(cat => cat.defeated));
  assert.ok(motion.airborne.active.some(cat => !cat.defeated && cat.slot !== undefined));

  // The battle can move far enough during flight to leave the window empty.
  state.t = state.support.readyAt;
  updateArtillery(state, motion.receive);
  state.front = 620;
  state.t = state.support.shot.impactAt;
  updateArtillery(state, motion.receive);
  assert.equal(state.support.impact.loss, 0);
  assert.equal(motion.impact.at, impactAt);

  motion.reset();
  game.reset(LEVEL_ONE);
  assert.deepEqual(motion.airborne.active, []);
  assert.equal(gapStrength(game.state.t - motion.impact.at), 0);
  assert.equal(motion.contact.surgeAt, -Infinity);
});

test("Purrapult scales radial launches, reclaims the shared budget and clears between strikes", () => {
  const motion = createMotion();
  const { state } = createGame({ level: LEVEL_TWO });
  Object.assign(state, { redTotal: 21000, blueTotal: 1500 });
  const step = (time) => motion.step(time, 0, state.blueTotal, true, state.level, state);
  const hit = (at, loss) => motion.receive("artilleryImpact", at,
    { x: 210, y: state.front - 32, at, loss });
  step(0);
  hit(0, 0);
  assert.deepEqual(motion.airborne.active, []);
  assert.equal(motion.impact.at, -Infinity);
  hit(0, 0.8);
  assert.ok(motion.airborne.active.length > 0);
  assert.ok(motion.airborne.active.every(cat => !cat.defeated && cat.slot !== undefined));
  step(2);

  hit(2, 25);
  const small = [...motion.airborne.active];
  assert.ok(small.length >= 2 && small.length < MAX_AIRBORNE_CATS);
  step(4);
  assert.deepEqual(motion.airborne.active, []);

  const { airborne } = motion;
  for (let slot = 0; slot < MAX_AIRBORNE_CATS; slot++) {
    airborne.launch({ at: 4, x: 210, y: 300, vx: 0, vy: 0, lift: 90, spin: 8, slot });
  }
  hit(4, 2250);
  const large = [...airborne.active];
  assert.equal(large.length, MAX_AIRBORNE_CATS);
  assert.ok(large.every(cat => cat.red && cat.priority));
  assert.ok(airborne.slots[0].every(cat => cat === undefined));
  assert.ok(large.some(cat => cat.vx < -70) && large.some(cat => cat.vx > 70));
  assert.ok(large.some(cat => cat.vy < -20) && large.some(cat => cat.vy > 20));
  assert.ok(new Set(large.map(cat => cat.y)).size > 4);
  assert.ok(Math.max(...large.map(cat => cat.lift)) > Math.max(...small.map(cat => cat.lift)) + 65);
  assert.ok(large.some(cat => cat.defeated) && large.some(cat => !cat.defeated && cat.rebound > 0));

  step(6);
  assert.deepEqual(airborne.active, []);
  hit(7.4, 2250);
  assert.equal(airborne.active.length, MAX_AIRBORNE_CATS);
  for (const mode of ["victory", "end", "menu"]) {
    state.mode = mode;
    step(8);
    assert.deepEqual(airborne.active, []);
    assert.equal(motion.impact.at, -Infinity);
    hit(8, 2250);
  }
  motion.reset();
  assert.deepEqual(airborne.active, []);
  assert.equal(motion.impact.at, -Infinity);
});

test("surviving red ranks open and refill a local pocket at each refresh rate", () => {
  const motion = createMotion();
  const state = createGame().state;
  state.redTotal = 7500;
  state.front = 318;
  motion.receive("artilleryImpact", 0, { x: 210, y: 289, loss: 2250, at: 0 });
  const { impact } = motion;
  const measure = (seconds) =>
    gapShift(210, 294, impact, gapStrength(seconds), 2);
  assert.ok(measure(0.2) > 16);
  assert.equal(gapShift(320, 294, impact, gapStrength(0.2), 2), 0);
  for (const hz of [30, 60, 120]) {
    for (let frame = 0; frame <= hz * 1.4; frame++) {
      motion.step(frame / hz, 0);
      assert.equal(state.redTotal, 7500);
    }
    assert.ok(measure(0.77) > 0 && measure(0.77) < measure(0.4));
    assert.equal(measure(Math.ceil(IMPACT_LIFE * hz) / hz), 0);
  }
  const positions = [];
  const atlasContext = new Proxy({}, { get: () => () => {} });
  const plot = createFigures(
    {
      drawImage(atlas, sx, sy, sw, sh, x, y, w, h) {
        positions.push([x + w / 2, y + h / 2]);
      },
    },
    { createElement: () => ({ getContext: () => atlasContext }) },
  );
  plot.setClock(0.2);
  plot.redArmy(state, motion.contact, impact);
  const displaced = positions.splice(0);
  plot.redArmy(state, motion.contact);
  const inside = ([x, y]) => Math.abs(x - impact.x) < 14 && Math.abs(y - impact.y) < 11;
  assert.equal(displaced.length, positions.length);
  assert.ok(positions.some(inside));
  assert.ok(displaced.filter(inside).length < positions.filter(inside).length);
  state.redTotal = 1500;
  positions.length = 0;
  plot.redArmy(state, motion.contact, impact);
  assert.ok(positions.length < displaced.length);
});
