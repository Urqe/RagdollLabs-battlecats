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
    let mostCohorts = 0, mostFlights = 0;
    for (let second = 0; second < 160 && !sim.state.outcome; second++) {
      state.gunX = dualAim("adaptive-seven", second, lanes, state.gates, phalanx);
      for (let frame = 0; frame < hz && !sim.state.outcome; frame++) {
        sim.advance(1 / hz);
        visual.draw();
        const metrics = visual.frame();
        mostCohorts = Math.max(mostCohorts, metrics.cohorts);
        mostFlights = Math.max(mostFlights, metrics.flights);
      }
    }
    assert.equal(sim.state.outcome, "victory");
    assert.ok(mostCohorts > 10 && mostCohorts < 36);
    assert.ok(mostFlights >= 8 && mostFlights <= 24);
    return { state: sim.state, events };
  }

  const baseline = replay(60);
  assert.deepEqual(replay(30), baseline);
  assert.deepEqual(replay(120), baseline);
});
