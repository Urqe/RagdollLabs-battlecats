import assert from "node:assert/strict";
import { test } from "node:test";
import { createDualBattlefield } from "../src/dual-battlefield.js";
import { frontlineGeometry } from "../src/dual-render.js";
import { simulateDual } from "../scripts/simulate-dual.js";
import { dualStrategies } from "./helpers/dual-strategies.js";
import { createState } from "../src/state.js";

function start(callbacks = {}) {
  const state = createState();
  const fixture = createDualBattlefield({ state, ...callbacks });
  fixture.reset();
  return { state, fixture, ...fixture.state.lanes };
}

function run(fixture, seconds, hz = 60) {
  for (let frame = 0; frame < seconds * hz; frame++) fixture.advance(1 / hz);
}

test("the three straight shot paths independently resolve across the center gap", () => {
  const { fixture, state, left, right } = start();
  state.gunX = 210;
  run(fixture, 0.2);
  assert.deepEqual(state.shots.map(shot => shot.x), [201, 210, 219]);
  // Keep sliding before the previous volley lands.
  state.gunX = 352;
  run(fixture, 0.15);
  state.gunX = 68;
  run(fixture, 0.15);
  assert.deepEqual(left.squads.map(({ origin, count }) => [origin, count]), [[201, 20]]);
  assert.deepEqual(right.squads.map(({ origin, count }) => [origin, count]), [[219, 20]]);
  assert.equal(state.shots.length, 0);
  assert.deepEqual(state.work, [0, 0]);
});

test("each closed gate consumes shots until its own upgrade opens", () => {
  const { fixture, state, left, right } = start();
  state.gunX = 68;
  run(fixture, 6.25);
  assert.deepEqual(state.work, [42, 0]);
  assert.equal(left.squads.length, 0);
  assert.equal(right.squads.length, 0);
  run(fixture, 0.6);
  assert.deepEqual(left.squads.map(s => s.count), [60, 60, 60]);
  assert.equal(right.squads.length, 0);
  state.gunX = 352;
  run(fixture, 7);
  assert.deepEqual(state.work, [42, 42]);
  assert.ok(right.squads.length > 0);
  assert.ok(right.squads.every(s => s.count === 60 && s.origin > 300));
});

test("frontlines, arrivals, casualty effects and danger stay local", () => {
  const { fixture, left, right } = start();
  run(fixture, 15);
  const west = frontlineGeometry(left);
  const east = frontlineGeometry(right);
  assert.ok(west.x + west.width < east.x);
  assert.ok(west.y < 335 && east.y > 432);
  assert.equal(fixture.feedback.left.danger, false);
  assert.equal(fixture.feedback.right.danger, true);
  assert.equal(fixture.feedback.right.arrivalAt, -Infinity);
  assert.ok(fixture.feedback.left.arrivalAt > 0);
  for (const [id, local] of Object.entries(fixture.feedback)) {
    assert.ok(local.redIntake >= 0);
    assert.ok(local.flights.active.length <= 4);
    for (const flight of local.flights.active)
      assert.equal(flight.x < 210, id === "left");
  }
});

test("both crossings can warn simultaneously and either can end the battle", () => {
  const { fixture, state, left, right } = start();
  state.gunX = 210;
  left.front = right.front = 442;
  left.blueTotal = right.blueTotal = 0;
  run(fixture, 0.1);
  assert.ok(fixture.feedback.left.danger && fixture.feedback.right.danger);
  left.front = right.front = 509.9;
  run(fixture, 1 / 60);
  assert.equal(fixture.state.outcome, "defeat");
  assert.ok(left.breached && right.breached);
  assert.equal(state.mode, "defeat");
  const frozen = structuredClone(fixture.state);
  fixture.pause();
  run(fixture, 3);
  assert.equal(state.defeatElapsed, 0);
  fixture.resume();
  run(fixture, 1);
  assert.equal(state.mode, "end");
  assert.deepEqual(fixture.state, frozen);
  assert.equal(state.shots.length, 0);
  assert.equal(fixture.feedback.left.flights.active.length + fixture.feedback.right.flights.active.length, 0);
});

test("pause, restart and clear discard no active time and leak no transients", () => {
  const { fixture, state } = start();
  run(fixture, 0.25);
  fixture.pause();
  const paused = structuredClone({ state, battle: fixture.state });
  run(fixture, 60);
  assert.deepEqual({ state, battle: fixture.state }, paused);
  fixture.resume();
  run(fixture, 0.25);
  assert.ok(fixture.state.lanes.left.squads.length);
  fixture.reset();
  assert.equal(state.t, 0);
  assert.equal(state.shots.length, 0);
  assert.equal(fixture.feedback.left.launchAt, -Infinity);
  assert.equal(fixture.state.lanes.left.squads.length, 0);
  fixture.clear();
  run(fixture, 1);
  assert.equal(fixture.state.lanes, null);
});

test("the six strategies agree at 30, 60 and 120 Hz and neither crossing can be ignored", () => {
  const baseline = dualStrategies.map(strategy => simulateDual(strategy, 60));
  for (const hz of [30, 120])
    assert.deepEqual(dualStrategies.map(strategy => simulateDual(strategy, hz)), baseline);
  assert.deepEqual(baseline.map(result => result.outcome),
    ["defeat", "defeat", "victory", "victory", "victory", "victory"]);
  assert.deepEqual(baseline.slice(0, 2).map(result => result.breached), [["right"], ["left"]]);
  assert.ok(baseline[2].duration >= 60 && baseline[2].duration <= 100);
  assert.equal(baseline[2].crossings.left.gateUnlockedAt, null);
  assert.ok(baseline[4].crossings.right.gateUnlockedAt > baseline[4].crossings.left.gateUnlockedAt);
});

test("both supplies must be secured and the fixed-step victory sequence fires once", () => {
  const events = [];
  const { fixture, state, left, right } = start({
    onEnd: won => events.push(won),
    onEffect: kind => events.push(kind),
  });
  for (const lane of [left, right]) {
    lane.redTotal = 0;
    lane.blueTotal = 2000;
  }
  left.redEntryOpen = false;
  run(fixture, 0.1);
  assert.equal(fixture.state.outcome, null);
  assert.equal(right.redTotal, 0);
  right.front = right.objective.reinforcementCutoff;
  run(fixture, 1 / 60);
  assert.equal(state.mode, "victory");
  const combat = structuredClone(fixture.state);
  run(fixture, 0.5);
  fixture.pause();
  run(fixture, 5);
  assert.ok(state.victoryElapsed < 0.6);
  assert.deepEqual(events, ["victory"]);
  fixture.resume();
  run(fixture, 1);
  assert.deepEqual(events, ["victory", "flagCapture"]);
  assert.equal(state.mode, "victory");
  run(fixture, 4, 30);
  assert.equal(state.mode, "end");
  assert.deepEqual(fixture.state, combat);
  assert.deepEqual(events, ["victory", "flagCapture", true]);
});
