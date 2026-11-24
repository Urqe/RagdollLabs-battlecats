import assert from "node:assert/strict";
import test from "node:test";
import { createConnectedPresentation, routePoint } from "../src/connected-render.js";
import { createDualBattlefield } from "../src/dual-battlefield.js";
import { createState } from "../src/state.js";
import { dualAim } from "./helpers/dual-strategies.js";

test("east reserve path stays on the apron and follows the outside of the ridge", () => {
  const anchors = { rearJunction: [209, 478], eastContact: [316, 190] };
  const cohort = { route: "westRally", leg: 1, distance: 0 };
  const sample = {};
  for (let i = 0; i <= 22; i++) {
    cohort.distance = i;
    routePoint(cohort, 0, anchors, sample);
    if (sample.y < 421) assert.ok(sample.x >= 280);
  }
  assert.deepEqual([sample.x, sample.y], anchors.eastContact);
});

test("the presentation leaves connected outcomes and events identical at all render cadences", () => {
  function replay(hz) {
    const state = createState();
    const events = [];
    const noOp = () => {};
    const ctx = new Proxy({}, { get: () => noOp });
    const figures = { soldier: noOp, reserveStamp: noOp, airborne: noOp };
    let visual;
    const sim = createDualBattlefield({ state, onEvent(event, battle) {
      events.push(event);
      visual.receive(event, battle);
    } });
    sim.reset();
    visual = createConnectedPresentation(ctx, figures, state, sim);
    const { lanes, phalanx } = sim.state;
    let mostCohorts = 0, mostFlights = 0, mostJoins = 0;
    for (let second = 0; second < 160 && !sim.state.outcome; second++) {
      state.gunX = dualAim("adaptive-imperfect", second, lanes, state.gates, phalanx);
      for (let frame = 0; frame < hz && !sim.state.outcome; frame++) {
        sim.advance(1 / hz);
        visual.draw();
        const metrics = visual.frame();
        mostCohorts = Math.max(mostCohorts, metrics.cohorts);
        mostFlights = Math.max(mostFlights, metrics.flights);
        mostJoins = Math.max(mostJoins, metrics.joins);
      }
    }
    assert.equal(sim.state.outcome, "victory");
    assert.ok(mostCohorts > 10 && mostCohorts < 36);
    assert.ok(mostFlights >= 8 && mostFlights <= 24);
    assert.ok(mostJoins > 0 && mostJoins <= 12);
    visual.reset();
    assert.equal(visual.frame().joins, 0);
    return { state: sim.state, events };
  }

  const baseline = replay(60);
  assert.deepEqual(replay(30), baseline);
  assert.deepEqual(replay(120), baseline);
});

test("east reinforcements survive and render before ×999, then clear at real defeat", () => {
  const state = createState();
  const sim = createDualBattlefield({ state });
  sim.reset();
  const noOp = () => {};
  const ctx = new Proxy({}, { get: () => noOp });
  const eastRed = [];
  const westRed = [];
  const westBlue = [];
  function record(x, y, red) {
    if (red && x > 230) eastRed.push([x, y]);
    if (x < 175) (red ? westRed : westBlue).push(y);
  }
  const visual = createConnectedPresentation(ctx, {
    soldier: record,
    reserveStamp: (x, y, count, red) => record(x, y, red),
    airborne: noOp,
  }, state, sim);
  const { lanes, phalanx } = sim.state;
  let sawTwenty = false, sawNinetyNine = false, sawSiege = false, sawCleared = false, sawRearContact = false;
  for (let second = 0; second < 145 && !sim.state.outcome; second++) {
    state.gunX = dualAim("adaptive-imperfect", second, lanes, state.gates, phalanx);
    for (let frame = 0; frame < 60 && !sim.state.outcome; frame++) {
      sim.advance(1 / 60);
      const { right } = lanes;
      if (right.redEntryRate > 0) assert.ok(right.redTotal > 0, `east wiped at ${sim.state.time}s`);
      if (frame % 10 !== 0) continue;
      eastRed.length = westRed.length = westBlue.length = 0;
      visual.draw();
      if (sim.state.siege.phase === "encirclement") {
        const { rearFront } = sim.state.siege;
        const attackers = westBlue.filter(y => y < lanes.left.front);
        assert.ok(attackers.length > 0 && attackers.every(y => y < rearFront));
        assert.ok(westRed.every(y => y > rearFront));
        assert.ok(westRed.some(y => y < rearFront + 12), "red rear ranks reach the combat boundary");
        sawRearContact = true;
      }
      if (right.redTotal > 0) {
        assert.ok(eastRed.length > 0);
        assert.ok(eastRed.every(([x, y]) => x < 420 && y >= 50 && y < right.front));
        sawTwenty ||= !state.gates[4].open;
        sawNinetyNine ||= state.gates[4].open && !state.gates[5].open;
        sawSiege ||= state.gates[5].open;
      } else if (!right.redEntryOpen) {
        assert.equal(eastRed.length, 0);
        sawCleared = true;
      }
    }
  }
  assert.deepEqual([sawTwenty, sawNinetyNine, sawSiege, sawCleared, sawRearContact],
    [true, true, true, true, true]);
});


test("west reinforcement finishes at the occupied rear shoulder beside the ridge", () => {
  const anchors = {
    rearJunction: [209, 478], westRally: [99, 397], westBend: [135, 436], westReceiver: [91, 350],
  };
  const cohort = { route: "westEntry", leg: 1, distance: 0 };
  const point = {};
  let previousY = anchors.rearJunction[1];
  for (let i = 0; i <= 140; i++) {
    cohort.distance = i / 10;
    routePoint(cohort, 0, anchors, point);
    assert.ok(point.y <= previousY && previousY - point.y < 2);
    if (point.y < 421) assert.ok(point.x < 135);
    previousY = point.y;
  }
  assert.deepEqual([point.x, point.y], anchors.westReceiver);
  cohort.dock = [...anchors.westReceiver];
  anchors.westReceiver[1] -= 10;
  routePoint(cohort, 0, anchors, point);
  assert.deepEqual([point.x, point.y], cohort.dock);
});
