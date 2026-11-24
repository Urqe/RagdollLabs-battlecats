import assert from "node:assert/strict";
import { test } from "node:test";
import { createDualBattlefield } from "../src/dual-battlefield.js";
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

function until(fixture, condition, limit = 30) {
  for (let i = 0; i < limit * 60 && !condition(); i++) fixture.advance(tick);
  assert.ok(condition(), "condition was reached before the tick limit");
}

function starterCover(fixture, state) {
  state.gunX = state.gates[2].x;
  run(fixture, 5);
  state.gunX = state.gates[3].x;
  run(fixture, 3);
  state.gunX = state.gates[0].x;
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
  starterCover(fixture, state);
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
  const capacity = LEVEL_FOUR.phalanx.queueCapacity;
  assert.ok(left.redTotal <= capacity && left.redTotal > capacity - 4);
  assert.equal(left.blueTotal, 0);
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
  starterCover(fixture, state);
  until(fixture, () => fixture.state.phalanx.phase === "deploying");
  Object.assign(left, { front: left.objective.castleFront - 0.01, blueTotal: 0 });
  fixture.advance(tick);
  assert.equal(fixture.state.phalanx.phase, "deploying");
  assert.equal(fixture.state.outcome, "defeat");
  assert.equal(left.breached, true);
});

test("frontlines, arrivals, casualty effects and danger stay local", () => {
  const events = [];
  const { fixture, left, right } = start({ onEvent: event => events.push(event) });
  until(fixture, () => fixture.feedback.right.danger);
  assert.ok(left.front < right.front);
  assert.equal(fixture.feedback.left.danger, false);
  assert.equal(fixture.feedback.right.danger, true);
  assert.equal(fixture.feedback.right.arrivalAt, -Infinity);
  assert.ok(fixture.feedback.left.arrivalAt > 0);
  for (const laneId of ["left", "right"]) {
    assert.ok(events.some(event => event.laneId === laneId && event.type === "casualties"));
    assert.ok(events.some(event => event.laneId === laneId && event.type === "frontline"));
  }
});

test("both crossings can warn simultaneously and either can end the battle", () => {
  const events = [];
  const { fixture, state, left, right } = start({ onEvent: event => events.push(event) });
  left.front = right.front = 442;
  left.blueTotal = right.blueTotal = 0;
  run(fixture, 0.1);
  assert.ok(fixture.feedback.left.danger && fixture.feedback.right.danger);
  left.front = right.front = 509.9;
  fixture.advance(tick);
  assert.ok(left.breached && right.breached);
  assert.equal(state.mode, "defeat");
  const frozen = structuredClone(fixture.state);
  const eventCount = events.length;
  fixture.pause();
  run(fixture, 3);
  assert.equal(state.defeatElapsed, 0);
  fixture.resume();
  run(fixture, 1);
  assert.equal(state.mode, "end");
  assert.deepEqual(fixture.state, frozen);
  assert.equal(state.shots.length, 0);
  assert.equal(events.length, eventCount);
});

test("release strategies preserve all outcomes and authoritative events at 30, 60 and 120 Hz", () => {
  const baseline = dualStrategies.map(strategy => simulateDual(strategy, 60));
  for (const hz of [30, 120])
    assert.deepEqual(dualStrategies.map(strategy => simulateDual(strategy, hz)), baseline);
  const byName = Object.fromEntries(baseline.map(outcome => [outcome.strategy, outcome]));
  assert.deepEqual(baseline.slice(0, 6).map(result => result.breached),
    [["right"], ["left"], ["left"], ["left"], ["left"], ["left"]]);
  assert.ok(baseline.slice(0, 6).every(result => result.outcome === "defeat"));
  assert.ok(byName["east-siege-first"].unlocked.siege > 0 && byName["east-siege-first"].securedAt === null);
  const rush = byName["phalanx-rush"];
  assert.equal(rush.securedAt, null);
  assert.equal(rush.unlocked.left, undefined);
  assert.deepEqual(byName["starter-fed-rush"].breached, ["left"]);
  const sustained = byName["sustained-starter-rush"];
  assert.equal(sustained.outcome, "victory");
  assert.equal(sustained.unlocked.left, undefined);
  assert.ok(sustained.duration > byName.adaptive.duration + 25);
  assert.ok(sustained.withdrawal < 10);
  for (const strategy of ["double-upgrade", "adaptive", "flank-first", "adaptive-seven", "adaptive-imperfect"]) {
    const win = byName[strategy];
    assert.equal(win.outcome, "victory", strategy);
    assert.ok(win.duration >= 95 && win.duration <= 150, strategy);
    assert.ok(win.unlocked.left < win.unlocked.phalanx);
    assert.ok(win.unlocked.phalanx < win.deployingAt && win.deployingAt < win.securedAt);
    assert.ok(win.securedAt < win.supplyCutoffAt && win.supplyCutoffAt <= win.breakthroughAt);
    assert.ok(win.encirclementDuration > 7 && win.transferred >= win.withdrawal && win.withdrawal > 300);
    assert.ok(win.retreated > 0 && win.redCasualties > win.retreated);
  }
  const both = byName["double-upgrade"];
  assert.ok(both.unlocked.right < both.unlocked.phalanx);
  assert.ok(byName["flank-first"].unlocked.right > byName["flank-first"].securedAt);
  const plain = byName["no-siege"];
  assert.equal(plain.outcome, "victory");
  assert.equal(plain.unlocked.siege, undefined);
  assert.equal(plain.securedAt, both.securedAt);
  assert.ok(plain.breakthroughAt - both.breakthroughAt > 10, "×999 repays the opening time");
  const noWest = byName["skip-west99"];
  assert.equal(noWest.unlocked.left, undefined);
  assert.ok(noWest.outcome === "defeat" || noWest.duration - both.duration > 25);
  assert.ok(both.withdrawal > noWest.withdrawal * 4, "west ×99 preserves the redeploying infantry");
  const noEast = byName["skip-east99"];
  assert.equal(noEast.unlocked.right, undefined);
  assert.deepEqual(noEast.breached, ["right"]);
  assert.deepEqual(byName["no-phalanx"].breached, ["left"]);
});

test("even an impossible maximum-pressure west army eventually loses without the shield wall", () => {
  const { combat: west, objective } = LEVEL_FOUR.crossings.left;
  assert.ok(west.minFront >= objective.reinforcementCutoff + west.reinforcementApproach,
    "west red arrivals have full access at every reachable ordinary frontline");
  assert.ok(west.maxRedReinforcements > west.maxRedLoss && west.redAdvance > 0);
  let front = west.initialFront;
  let red = west.initialRed;
  for (let i = 1; i * tick <= 79; i++) {
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

test("east cutoff and flank combat cause a conserved retreat, followed by one flag capture", () => {
  const events = [];
  let redLost = 0;
  let tracking = false;
  const { fixture, state, left, right } = start({
    onEvent(event) {
      if (tracking && event.type === "casualties" && event.laneId === "left") redLost += event.redLost;
    },
    onEnd: won => events.push(won),
    onEffect: kind => { if (kind === "victory" || kind === "flagCapture") events.push(kind); },
  });
  starterCover(fixture, state);
  until(fixture, () => fixture.state.phalanx.phase === "secured", 40);
  events.length = 0;
  Object.assign(right, { redTotal: 0, blueTotal: 10000 });
  run(fixture, 0.1);
  assert.equal(fixture.state.outcome, null);
  assert.ok(right.redTotal > 0, "fresh arrivals survive their first combat tick");
  assert.equal(left.redEntryOpen, true);
  Object.assign(right, { front: right.objective.reinforcementCutoff, redTotal: 100 });
  fixture.advance(tick);
  assert.equal(right.redEntryOpen, false);
  assert.ok(right.redTotal > 0);
  assert.equal(fixture.state.outcome, null);
  left.redTotal = LEVEL_FOUR.phalanx.queueCapacity + 400;
  const before = left.redTotal;
  tracking = true;
  until(fixture, () => fixture.state.siege.phase === "flanking");
  assert.ok(left.redTotal > 0);
  assert.equal(fixture.state.outcome, null);
  until(fixture, () => fixture.state.outcome === "victory", 45);
  assert.equal(state.mode, "victory");
  assert.equal(left.redTotal, 0);
  assert.equal(left.redEntryOpen, false);
  assert.ok(fixture.state.retreat.count > 0 && fixture.state.retreat.count < before);
  assert.ok(Math.abs(fixture.state.retreat.count + redLost - before) < 1e-6);
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
