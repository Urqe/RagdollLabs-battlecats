import assert from "node:assert/strict";
import test from "node:test";
import { advanceLaneCombat } from "../src/lane-combat.js";
import { createBattleClock } from "../src/battle-clock.js";
import { LEVEL_FOUR } from "../src/levels.js";

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
  assert.ok(cutoff > 0 && cutoff < 660);
  assert.ok(frames[cutoff - 1].front > east.objective.reinforcementCutoff);
  assert.ok(frames[0].redEntryOpen, "zero standing opposition cannot cut supply");
  for (let i = 1; i <= cutoff; i++) {
    assert.equal(frames[i].advanceMode, "marching");
    assert.ok(frames[i].front < frames[i - 1].front);
    assert.ok(Math.abs(frames[i].advanceBonus - frames[i - 1].advanceBonus) <= 18 * dt + 1e-9);
  }
  const resistance = replay(60, 30000);
  assert.equal(resistance[cutoff].advanceMode, "contested");
  assert.ok(resistance[cutoff].front > frames[cutoff].front + 35);
});

test("renewed opposition ends the march and hysteresis absorbs a small pulse", () => {
  const state = { front: 240, blueTotal: 300000, redTotal: 0, redEntryOpen: true };
  for (let i = 0; i < 60; i++) advanceLaneCombat(state, combat, east.objective, i * dt, dt);
  assert.equal(state.advanceMode, "marching");
  state.redTotal = 20;
  advanceLaneCombat(state, combat, east.objective, 1, dt);
  assert.equal(state.advanceMode, "marching");
  state.redTotal = 40;
  advanceLaneCombat(state, combat, east.objective, 1 + dt, dt);
  assert.equal(state.advanceMode, "overwhelming");
  const before = state.advanceBonus;
  state.redTotal = 1000;
  advanceLaneCombat(state, combat, east.objective, 1 + 2 * dt, dt);
  assert.equal(state.advanceMode, "contested");
  assert.ok(state.advanceBonus > before);
  assert.ok(state.advanceBonus < 0, "the marching bonus decelerates progressively");
});
