import assert from "node:assert/strict";
import { test } from "node:test";
import { createDualBattlefield } from "../src/dual-battlefield.js";
import { frontlineGeometry } from "../src/dual-render.js";
import { LEVEL_FOUR } from "../src/levels.js";
import { simulateDual } from "../scripts/simulate-dual.js";
import { dualStrategies } from "./helpers/dual-strategies.js";
import { createState } from "../src/state.js";

const tick = 1 / 60;

function start(callbacks = {}) {
  const state = createState();
  const fixture = createDualBattlefield({ state, ...callbacks });
  fixture.reset();
  return { state, fixture, ...fixture.state.lanes };
}

function run(fixture, seconds, hz = 60) {
  for (let frame = 0; frame < seconds * hz; frame++) fixture.advance(1 / hz);
}

function until(fixture, condition, limit = 15) {
  for (let i = 0; i < limit * 60 && !condition(); i++) fixture.advance(tick);
  assert.ok(condition(), "condition was reached before the tick limit");
}

test("in-flight shots at the center gap feed both crossings independently", () => {
  const { fixture, state, left, right } = start();
  state.gunX = 184.5;
  run(fixture, 0.2);
  assert.deepEqual(state.shots.map(shot => shot.x), [175.5, 184.5, 193.5]);
  state.gunX = 362;
  run(fixture, 0.3);
  assert.deepEqual(left.squads.map(({ origin, count }) => [origin, count]), [[175.5, 20]]);
  assert.deepEqual(right.squads.map(({ origin, count }) => [origin, count]), [[193.5, 20]]);
  assert.deepEqual(state.work, [0, 0, 0, 0]);
});

test("each upgrade consumes its own barricade hits and routes its exact multiplier", () => {
  for (const [index, id, expected] of [[1, "left", 99], [4, "right", 99], [5, "right", 999]]) {
    const { fixture, state } = start();
    const gate = state.gates[index];
    const slot = state.level.barricades.findIndex(barrier => barrier.id === gate.barricadeId);
    state.gunX = gate.x;
    until(fixture, () => gate.open);
    assert.equal(state.work[slot], state.level.barricades[slot].hits);
    assert.equal(state.work.filter(Boolean).length, 1);
    assert.equal(fixture.state.phalanx.phase, "locked");
    const lane = fixture.state.lanes[id];
    assert.equal(lane.squads.length, 0);
    until(fixture, () => lane.squads.length > 0);
    assert.deepEqual(lane.squads.map(squad => squad.count), Array(3).fill(expected));
  }
});

test("wood, marching and deploying expose the west before the shield wall locks", () => {
  const { fixture, state, left } = start();
  const [gate] = state.gates;
  state.gunX = gate.x;
  until(fixture, () => state.work[0] === LEVEL_FOUR.barricades[0].hits - 3);
  assert.equal(gate.open, false);
  assert.equal(fixture.state.phalanx.phase, "locked");
  assert.ok(left.front > left.combat.initialFront);
  assert.ok(left.blueTotal < LEVEL_FOUR.crossings.left.initialBlue);

  for (const phase of ["unlocked", "marching", "deploying"]) {
    until(fixture, () => fixture.state.phalanx.phase === phase);
    assert.equal(gate.open, true);
    assert.equal(left.squads.length, 0);
    assert.equal(left.breached, false);
  }
  const pushing = left.front;
  run(fixture, 0.6);
  assert.equal(fixture.state.phalanx.phase, "deploying");
  assert.ok(left.front > pushing);

  const paused = structuredClone({ state, combat: fixture.state });
  fixture.pause();
  run(fixture, 60);
  assert.deepEqual({ state, combat: fixture.state }, paused);
  fixture.resume();
  until(fixture, () => fixture.state.phalanx.phase === "secured");
  assert.equal(fixture.state.outcome, null);
  assert.equal(left.redEntryOpen, true);
  assert.ok(left.redTotal > 0);

  // Give the right a static front to test the shield wall well beyond the
  // normal battle duration, without launching reinforcements in either lane.
  fixture.state.lanes.right.combat = {
    ...fixture.state.lanes.right.combat, blueAdvance: 0, redAdvance: 0,
    redReinforcements: 0, redReinforcementGrowth: 0,
  };
  const blue = left.blueTotal;
  run(fixture, 120);
  assert.equal(left.front, LEVEL_FOUR.phalanx.holdFront);
  assert.equal(left.blueTotal, blue);
  assert.equal(left.breached, false);
  assert.equal(left.redEntryOpen, true);
  assert.equal(left.redEntryRate, 0);
  assert.equal(left.redTotal, LEVEL_FOUR.phalanx.queueCapacity);
  assert.equal(left.squads.length, 0);
  assert.equal(fixture.state.outcome, null);

  fixture.reset();
  assert.deepEqual(fixture.state.phalanx, { phase: "locked", since: 0 });
  assert.equal(state.gates[0].open, false);
  assert.deepEqual(state.work, [0, 0, 0, 0]);
  fixture.clear();
  run(fixture, 1);
  assert.equal(fixture.state.lanes, null);
  assert.equal(fixture.state.phalanx, null);
});

test("the west can still breach during deployment", () => {
  const { fixture, state, left } = start();
  state.gunX = state.gates[0].x;
  until(fixture, () => fixture.state.phalanx.phase === "deploying");
  Object.assign(left, { front: left.objective.castleFront - 0.01, blueTotal: 0 });
  fixture.advance(tick);
  assert.equal(fixture.state.phalanx.phase, "deploying");
  assert.equal(fixture.state.outcome, "defeat");
  assert.equal(left.breached, true);
});

test("frontlines, arrivals, casualty effects and danger stay local", () => {
  const { fixture, left, right } = start();
  run(fixture, 22);
  const west = frontlineGeometry(left);
  const east = frontlineGeometry(right);
  assert.ok(west.x + west.width < east.x);
  assert.ok(west.y < east.y);
  assert.equal(fixture.feedback.left.danger, false);
  assert.equal(fixture.feedback.right.danger, true);
  assert.equal(fixture.feedback.right.arrivalAt, -Infinity);
  assert.ok(fixture.feedback.left.arrivalAt > 0);
  for (const [id, local] of Object.entries(fixture.feedback)) {
    assert.ok(local.flights.active.length <= 4);
    for (const flight of local.flights.active)
      assert.equal(flight.x < 210, id === "left");
  }
});

test("both crossings can warn simultaneously and either can end the battle", () => {
  const { fixture, state, left, right } = start();
  left.front = right.front = 442;
  left.blueTotal = right.blueTotal = 0;
  run(fixture, 0.1);
  assert.ok(fixture.feedback.left.danger && fixture.feedback.right.danger);
  left.front = right.front = 509.9;
  fixture.advance(tick);
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

test("the eight strategies agree at 30, 60 and 120 Hz", () => {
  const baseline = dualStrategies.map(strategy => simulateDual(strategy, 60));
  for (const hz of [30, 120])
    assert.deepEqual(dualStrategies.map(strategy => simulateDual(strategy, hz)), baseline);
  assert.deepEqual(baseline.slice(0, 6).map(result => result.breached),
    [["right"], ["left"], ["left"], ["left"], ["left"], ["right"]]);
  assert.ok(baseline.slice(0, 6).every(result => result.outcome === "defeat"));
  assert.ok(baseline[4].unlocked.siege > 0 && baseline[4].securedAt === null);
  assert.ok(baseline[5].securedAt > 0 && baseline[5].supplyCutoffAt === null);
  for (const win of baseline.slice(6)) {
    assert.equal(win.outcome, "victory");
    assert.ok(win.duration >= 60 && win.duration <= 110);
    assert.ok(win.unlocked.phalanx < win.securedAt);
    assert.ok(win.securedAt < win.supplyCutoffAt);
    assert.ok(win.retreated > 0);
    const smallerPush = simulateDual(win.strategy, 60, { useSiege: false });
    assert.equal(smallerPush.outcome, "victory");
    assert.equal(smallerPush.securedAt, win.securedAt);
    assert.ok(smallerPush.duration - win.duration > 8, "×999 repays the opening time");
  }
});

test("even the best possible ordinary west defense breaches before the earliest east cutoff", () => {
  const { left, right } = LEVEL_FOUR.crossings;
  const { combat: west, objective } = left;
  assert.ok(west.minFront >= objective.reinforcementCutoff + west.reinforcementApproach,
    "west red arrivals have full access at every reachable ordinary frontline");
  const earliestCutoff = (right.combat.initialFront - right.objective.reinforcementCutoff) /
    right.combat.blueAdvance;
  let front = west.initialFront;
  let red = west.initialRed;
  for (let i = 1; i * tick < earliestCutoff; i++) {
    // Relax all cannon, travel and blue loss limits. Assume the west always
    // has maximum pressure and inflicts maximum possible red casualties.
    red = Math.max(0, red + (Math.min(west.maxRedReinforcements,
      west.redReinforcements + west.redReinforcementGrowth * i * tick) - west.maxRedLoss) * tick);
    const pressure = red * west.redPressurePerCat;
    const momentum = (pressure - west.bluePressureCapacity) / (pressure + west.bluePressureCapacity);
    const speed = momentum > 0 ? west.redAdvance : west.blueAdvance;
    front = Math.max(west.minFront, front + momentum * speed * tick);
    if (front >= objective.castleFront) break;
  }
  assert.ok(front >= objective.castleFront);
});

test("permanent east cutoff and clearing the main army cause retreat, followed by one flag capture", () => {
  const events = [];
  const { fixture, state, left, right } = start({
    onEnd: won => events.push(won),
    onEffect: kind => { if (kind === "victory" || kind === "flagCapture") events.push(kind); },
  });
  state.gunX = state.gates[0].x;
  until(fixture, () => fixture.state.phalanx.phase === "secured");
  events.length = 0;
  Object.assign(right, { redTotal: 0, blueTotal: 3000 });
  run(fixture, 0.1);
  assert.equal(fixture.state.outcome, null);
  assert.equal(right.redTotal, 0);
  assert.equal(left.redEntryOpen, true);
  Object.assign(right, { front: right.objective.reinforcementCutoff, redTotal: 100 });
  fixture.advance(tick);
  assert.equal(right.redEntryOpen, false);
  assert.ok(right.redTotal > 0);
  assert.equal(fixture.state.outcome, null);
  left.redTotal = LEVEL_FOUR.phalanx.queueCapacity + 400;
  const survivors = left.redTotal;
  until(fixture, () => fixture.state.outcome === "victory");
  assert.equal(state.mode, "victory");
  assert.equal(left.redTotal, 0);
  assert.equal(left.redEntryOpen, false);
  assert.equal(fixture.state.retreat.count, survivors);
  assert.equal(fixture.state.phalanx.phase, "secured");
  const combat = structuredClone(fixture.state);
  run(fixture, 0.5);
  fixture.pause();
  run(fixture, 5);
  assert.ok(state.victoryElapsed < 0.6);
  assert.deepEqual(events, ["victory"]);
  fixture.resume();
  run(fixture, 1);
  assert.deepEqual(events, ["victory", "flagCapture"]);
  run(fixture, 4, 30);
  assert.equal(state.mode, "end");
  assert.deepEqual(fixture.state, combat);
  assert.deepEqual(events, ["victory", "flagCapture", true]);
});
