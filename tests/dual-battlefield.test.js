import assert from "node:assert/strict";
import { test } from "node:test";
import { createDualBattlefield } from "../src/dual-battlefield.js";
import { frontlineGeometry } from "../src/dual-render.js";
import { createState } from "../src/state.js";

function start() {
  const state = createState();
  const fixture = createDualBattlefield({ state });
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
  run(fixture, 2.25);
  assert.deepEqual(state.work, [15, 0]);
  assert.equal(left.squads.length, 0);
  assert.equal(right.squads.length, 0);
  run(fixture, 0.5);
  assert.deepEqual(left.squads.map(s => s.count), [65, 65, 65]);
  assert.equal(right.squads.length, 0);
  state.gunX = 352;
  run(fixture, 2.75);
  assert.deepEqual(state.work, [15, 15]);
  assert.ok(right.squads.length > 0);
  assert.ok(right.squads.every(s => s.count === 65 && s.origin > 300));
});

test("frontlines, arrivals, casualty effects and danger stay local", () => {
  const { fixture, left, right } = start();
  run(fixture, 6);
  const west = frontlineGeometry(left);
  const east = frontlineGeometry(right);
  assert.ok(west.x + west.width < east.x);
  assert.ok(west.y < 310 && east.y > 378);
  assert.equal(fixture.feedback.left.danger, false);
  assert.equal(fixture.feedback.right.danger, true);
  assert.equal(fixture.feedback.right.arrivalAt, -Infinity);
  assert.ok(fixture.feedback.left.arrivalAt > 0);
  for (const [id, local] of Object.entries(fixture.feedback)) {
    assert.ok(local.redIntake > 0);
    assert.ok(local.flights.active.length > 0 && local.flights.active.length <= 4);
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
  run(fixture, 4);
  assert.equal(fixture.state.outcome, "defeat");
  assert.equal(state.mode, "end");
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

function replay(hz) {
  const { fixture, state } = start();
  for (let stage = 0; stage < 10; stage++) {
    state.gunX = stage % 2 ? 352 : 68;
    run(fixture, 3, hz);
  }
  return { battle: fixture.state, shots: state.shots, gates: state.gates, feedback:
    Object.values(fixture.feedback).map(({ flights, ...local }) => local) };
}

test("matching fixed-step commands agree across 30, 60 and 120 Hz", () => {
  const baseline = replay(60);
  assert.equal(baseline.battle.outcome, "victory");
  assert.deepEqual(replay(30), baseline);
  assert.deepEqual(replay(120), baseline);
});
