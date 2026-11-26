import assert from "node:assert/strict";
import test from "node:test";
import { advanceLaneCombat, casualtyRates, effectiveStrength } from "../src/lane-combat.js";
import { createBattleClock } from "../src/battle-clock.js";
import { createDualFront } from "../src/dual-front.js";
import { LEVEL_ONE, LEVEL_FOUR } from "../src/levels.js";

const east = LEVEL_FOUR.crossings.right;
const combat = { ...east.combat, redReinforcements: 4, redReinforcementGrowth: 0 };
const dt = 1 / 60;

function replay(hz, redTotal = 0) {
  const state = { front: 240, blueTotal: 300000, redTotal, redEntryOpen: true };
  let time = 0, arrived = 0, losses = 0;
  const frames = [];
  const clock = createBattleClock(step => {
    time += step;
    const result = advanceLaneCombat(state, combat, east.objective, time, step);
    arrived += result.redArrived;
    losses += result.redLost;
    frames.push({ ...state });
  });
  for (let i = 0; i < hz * 13; i++) clock.advance(1 / hz);
  assert.ok(Math.abs(state.redTotal - (redTotal + arrived - losses)) < 1e-6);
  return frames;
}

test("a continuous trickle cannot stop an organized advance or cut supply early", () => {
  const frames = replay(60);
  assert.deepEqual(replay(30), frames);
  assert.deepEqual(replay(120), frames);
  const cutoff = frames.findIndex(frame => !frame.redEntryOpen);
  assert.ok(cutoff > 0 && cutoff < 770);
  assert.ok(frames[cutoff - 1].front > east.objective.reinforcementCutoff);
  assert.ok(frames[0].redEntryOpen, "zero standing opposition cannot cut supply");
  for (let i = 1; i <= cutoff; i++) {
    assert.equal(frames[i].advanceMode, "marching");
    assert.ok(frames[i].front < frames[i - 1].front);
    assert.ok(Math.abs(frames[i].frontVelocity - frames[i - 1].frontVelocity) <= 32 * dt + 1e-8);
  }
  const resistance = replay(60, 30000);
  assert.equal(resistance[cutoff].advanceMode, "contested");
  assert.ok(resistance[cutoff].front > frames[cutoff].front + 35);
});

test("renewed opposition gradually slows breakthrough without reacting to a trickle", () => {
  const state = { front: 240, blueTotal: 300000, redTotal: 0, redEntryOpen: true };
  for (let i = 0; i < 60; i++) advanceLaneCombat(state, combat, east.objective, i * dt, dt);
  const march = state.frontVelocity;
  state.redTotal = 2;
  advanceLaneCombat(state, combat, east.objective, 1, dt);
  assert.ok(Math.abs(state.frontVelocity - march) < 0.1);
  const before = state.frontVelocity;
  state.redTotal = 30000;
  advanceLaneCombat(state, combat, east.objective, 1 + dt, dt);
  assert.equal(state.advanceMode, "contested");
  assert.ok(state.frontVelocity > before && state.frontVelocity <= before + 32 * dt + 1e-8);
  assert.ok(state.frontVelocity < -east.combat.blueAdvance);
});

test("frontage changes marginal strength and both casualty rates stay bounded", () => {
  const narrow = LEVEL_FOUR.crossings.left.combat;
  const wide = LEVEL_ONE.combat;
  for (const rules of [narrow, wide]) {
    let previous = 0;
    for (const n of [1, 100, 500, 850, 1000, 10000, 100000, 300000, 1e9]) {
      const pressure = effectiveStrength(n, rules.frontage);
      assert.ok(Number.isFinite(pressure) && pressure > previous);
      previous = pressure;
      const losses = casualtyRates(n, n, rules);
      assert.ok(losses.blue <= rules.maxBlueLoss && losses.red <= rules.maxRedLoss);
    }
    const loss = casualtyRates(100000, 1000, rules);
    assert.ok(loss.red * dt < 1000);
  }
  const increment = (from, by, frontage) =>
    effectiveStrength(from + by, frontage) - effectiveStrength(from, frontage);
  assert.ok(increment(100000, 1000, narrow.frontage) < increment(1000, 1000, narrow.frontage));
  assert.ok(increment(1000, 1000, narrow.frontage) < increment(1000, 1000, wide.frontage));
});

test("arriving reserves slow, stabilize and reverse a retreat in proportion to the wave", () => {
  function run(hz, multiplier) {
    const { crossings, phalanx } = LEVEL_FOUR;
    const sim = createDualFront(crossings, { phalanx });
    const { left } = sim.state.lanes;
    for (let i = 0; i < hz * 9; i++) sim.advance(1 / hz);
    const initialVelocity = left.frontVelocity;
    if (multiplier) sim.launchVolley("left", { multiplier });
    for (let i = 0; i < hz; i++) sim.advance(1 / hz);
    const inTransit = left.squads.length;
    const beforeArrival = left.frontVelocity;
    for (let i = 0; i < hz; i++) sim.advance(1 / hz);
    return { initialVelocity, inTransit, beforeArrival, velocity: left.frontVelocity,
      blue: left.blueTotal, red: left.redTotal, front: left.front };
  }
  const multipliers = [0, 5, 25, 100];
  const flows = multipliers.map(multiplier => run(60, multiplier));
  for (const hz of [30, 120]) assert.deepEqual(multipliers.map(m => run(hz, m)), flows);
  const [none, relief, stabilization, recovery] = flows;
  assert.ok(none.initialVelocity > 0 && none.velocity > none.initialVelocity);
  assert.ok(relief.inTransit && relief.beforeArrival === none.beforeArrival);
  assert.ok(relief.velocity > 0 && relief.velocity < relief.initialVelocity);
  assert.ok(stabilization.velocity >= 0 && stabilization.velocity < relief.velocity / 2);
  assert.ok(recovery.velocity < 0 && recovery.front < stabilization.front);
  assert.ok(recovery.blue > stabilization.blue && recovery.red >= 0);
});
