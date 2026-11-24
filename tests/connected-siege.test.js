import assert from "node:assert/strict";
import test from "node:test";
import { simulateDual } from "../scripts/simulate-dual.js";
import { connectedSiegeRules, siegePopulation, siegeStatus } from "../src/connected-siege.js";
import { createDualFront } from "../src/dual-front.js";
import { LEVEL_FOUR } from "../src/levels.js";

const tick = 1 / 60;

function fixture({ left = {}, right = {}, phalanx = {} } = {}) {
  const events = [];
  const { crossings } = LEVEL_FOUR;
  const sim = createDualFront({
    left: { ...crossings.left, ...left },
    right: { ...crossings.right, ...right },
  }, {
    phalanx: { ...LEVEL_FOUR.phalanx, ...phalanx },
    connectedRules: connectedSiegeRules,
    onEvent: event => events.push(event),
  });
  return { ...sim, events, step(ticks = 1) {
    for (let i = 0; i < ticks; i++) sim.advance(tick);
  } };
}

function checkClose(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} differs from ${expected}`);
}

test("both fronts fight until the phalanx locks and the shield wall keeps fighting", () => {
  const sim = fixture({ left: { combat: {
    ...LEVEL_FOUR.crossings.left.combat, initialRed: 1300,
  } } });
  const { left, right } = sim.state.lanes;
  assert.equal(sim.state.phalanx.phase, "locked");
  sim.step();
  assert.ok(left.blueTotal < LEVEL_FOUR.crossings.left.initialBlue);
  assert.ok(right.blueTotal < LEVEL_FOUR.crossings.right.initialBlue);
  sim.unlockPhalanx();
  sim.unlockPhalanx();
  sim.step();
  assert.equal(sim.state.phalanx.phase, "marching");
  sim.step(145);
  assert.equal(sim.state.phalanx.phase, "deploying");
  const blue = left.blueTotal;
  sim.step();
  assert.ok(left.blueTotal < blue);
  while (sim.state.phalanx.phase !== "pushing") sim.step();
  const frontline = left.front;
  assert.equal(siegeStatus(sim.state).west, "LEFT — SHIELDS LOCKED");
  sim.clock.pause();
  sim.step(60);
  assert.equal(left.front, frontline);
  sim.clock.resume();
  const impactStart = sim.events.length;
  while (sim.state.phalanx.phase === "pushing") {
    const previous = left.front;
    sim.step();
    assert.ok(left.front <= previous && previous - left.front <= LEVEL_FOUR.phalanx.pushSpeed * tick + 1e-9);
    if (sim.state.phalanx.phase === "pushing") assert.equal(sim.state.siege.transfers.length, 0);
  }
  const pushImpacts = sim.events.slice(impactStart).filter(event => event.type === "shieldImpact");
  assert.ok(pushImpacts.length >= 2 && pushImpacts[0].front > pushImpacts.at(-1).front);
  const pushCasualties = sim.events.slice(impactStart)
    .filter(event => event.type === "casualties" && event.laneId === "left");
  assert.deepEqual(pushImpacts.map(event => event.front), pushCasualties.map(event => event.front));
  assert.equal(siegeStatus(sim.state).west, "LEFT — SECURED");
  assert.deepEqual(sim.events.filter(event => event.type.startsWith("phalanx")).map(event => event.type),
    ["phalanxUnlocked", "phalanxMarching", "phalanxDeploying", "phalanxPushing", "phalanxSecured"]);
  const startRed = left.redTotal;
  const startIndex = sim.events.length;
  sim.step(360);
  assert.equal(left.front, LEVEL_FOUR.phalanx.holdFront);
  assert.equal(left.blueTotal, 0);
  assert.equal(left.breached, false);
  const events = sim.events.slice(startIndex).filter(event => event.laneId === "left");
  const thumps = events.filter(event => event.type === "shieldImpact");
  assert.ok(thumps.length >= 10 && thumps.length <= 15);
  assert.ok(thumps.some(event => event.surge && event.intensity > 1));
  assert.ok(thumps.every(event => event.repelled > 0 && event.redLost === undefined));
  const casualtyEvents = events.filter(event => event.type === "casualties");
  assert.equal(casualtyEvents.length, thumps.length);
  assert.ok(casualtyEvents.every(event => event.blueLost === 0));
  assert.deepEqual(events.filter(event => event.type === "spearThrust").map(event => event.redLost),
    casualtyEvents.map(event => event.redLost));
  checkClose(left.redTotal, events.reduce((total, event) =>
    total + (event.type === "arrival" ? event.count : 0) -
      (event.type === "casualties" ? event.redLost : 0), startRed));
});

test("the exposed left crossing can breach during marching or deployment", () => {
  for (const [marchTime, expected] of [[2.4, "marching"], [0, "deploying"]]) {
    const left = { objective: { ...LEVEL_FOUR.crossings.left.objective, castleFront: 335.5 },
      initialBlue: 0 };
    const sim = fixture({ left, phalanx: { marchTime } });
    sim.unlockPhalanx();
    sim.step(22);
    assert.equal(sim.state.outcome, "defeat");
    assert.equal(sim.state.phalanx.phase, expected);
    assert.equal(sim.state.lanes.left.breached, true);
  }
});

test("left infantry and cannon squads redeploy once through the junction on the battle clock", () => {
  const sim = fixture();
  const { left, right } = sim.state.lanes;
  sim.unlockPhalanx();
  while (sim.state.phalanx.phase !== "deploying") sim.step();
  while (sim.state.phalanx.phase !== "pushing") sim.step();
  while (left.front - LEVEL_FOUR.phalanx.holdFront > 12) sim.step();
  sim.launchVolley("left", { multiplier: 99 });
  const pending = left.squads[0];
  while (sim.state.phalanx.phase !== "secured") sim.step();
  assert.equal(left.blueTotal, 0);
  const [infantry] = sim.state.siege.transfers;
  assert.equal(infantry.route, "withdrawal");
  assert.equal(infantry.leg, 0);
  checkClose(infantry.count, LEVEL_FOUR.crossings.left.initialBlue - sim.events.filter(event =>
    event.laneId === "left" && event.type === "casualties")
    .reduce((sum, event) => sum + event.blueLost, 0));
  assert.equal(left.squads[0], pending);

  const snapshot = structuredClone(sim.state);
  const eventCount = sim.events.length;
  sim.clock.pause();
  sim.step(180);
  assert.deepEqual(sim.state, snapshot);
  assert.equal(sim.events.length, eventCount);
  sim.clock.resume();

  sim.launchVolley("left", { multiplier: 20 });
  sim.launchVolley("left", { multiplier: 99 });
  sim.launchVolley("right", { multiplier: 999 });
  const [redirect, redirect99, siege] = right.squads;
  for (const squad of [redirect, redirect99])
    assert.deepEqual([squad.gateLane, squad.route], ["left", "eastEntry"]);
  assert.equal(redirect99.count, 297);
  assert.equal(siege.count, 2997);
  while (sim.events.filter(event => event.type === "transferArrival").length < 2) {
    const population = siegePopulation(sim.state).blue;
    const previous = sim.events.length;
    sim.step();
    const losses = sim.events.slice(previous).filter(event => event.type === "casualties")
      .reduce((total, event) => total + event.blueLost, 0);
    checkClose(siegePopulation(sim.state).blue, population - losses);
    assert.equal(left.blueTotal, 0);
    assert.ok(sim.state.time < 12);
  }
  const arrivals = sim.events.filter(event => event.type === "transferArrival");
  assert.deepEqual(arrivals.map(event => [event.id, event.count]),
    [[infantry.id, infantry.count], [pending.id, pending.count]]);
  assert.ok(arrivals[0].time - infantry.departedAt >= 2.6);
  assert.ok(arrivals[1].time - arrivals[1].departedAt >= 2.24);
  assert.ok(sim.events.some(event => event.type === "transferProgress" && event.from === "rearJunction"));
  assert.deepEqual(sim.events.filter(event => event.type === "arrival" && event.side === "blue")
    .map(event => [event.id, event.laneId]), [[redirect.id, "right"], [redirect99.id, "right"], [siege.id, "right"]]);
  assert.equal(left.squads.length, 0);
  assert.equal(sim.state.siege.transfers.length, 0);
});

test("restart and level switching clear movement, pause and cohort identity", () => {
  const sim = fixture();
  for (const exit of [sim.reset, sim.clear]) {
    sim.reset();
    sim.unlockPhalanx();
    while (sim.state.phalanx.phase !== "secured") sim.step();
    const oldTransfer = sim.state.siege.transfers[0];
    sim.clock.pause();
    exit();
    assert.equal(sim.state.time, 0);
    assert.equal(sim.state.outcome, null);
    assert.equal(sim.clock.paused, false);
    assert.notEqual(sim.state.siege?.transfers[0], oldTransfer);
  }
  const count = sim.events.length;
  sim.step(60);
  assert.equal(sim.events.length, count);
  assert.equal(sim.state.siege, null);
  sim.reset();
  sim.launchVolley("left", { multiplier: 20 });
  assert.equal(sim.state.lanes.left.squads[0].id, 1);
});

test("victory requires a secured wall and a cleared main army", () => {
  const wonRight = { objective: { ...LEVEL_FOUR.crossings.right.objective, reinforcementCutoff: 350 },
    combat: { ...LEVEL_FOUR.crossings.right.combat, initialRed: 0 }, initialBlue: 4000 };
  const sim = fixture({ right: wonRight });
  sim.step(300);
  assert.equal(sim.state.lanes.right.redEntryOpen, false);
  assert.equal(sim.state.lanes.right.redTotal, 0);
  assert.equal(sim.state.outcome, null);
  assert.equal(sim.state.lanes.left.redEntryOpen, true);
  assert.equal(sim.state.siege.flank, null);

  const wallOnly = fixture();
  wallOnly.unlockPhalanx();
  wallOnly.step(2200);
  assert.equal(wallOnly.state.phalanx.phase, "secured");
  assert.equal(wallOnly.state.outcome, "defeat");
  assert.ok(wallOnly.state.lanes.right.breached && wallOnly.state.lanes.right.redEntryOpen);
  assert.deepEqual(siegeStatus(wallOnly.state), { west: "LEFT — SECURED", east: "RIGHT — BREACHED" });
});

test("a real cannon replay conserves troops through breakthrough, flank movement and rout", () => {
  function run(hz) {
    const events = [];
    let final;
    let checkedAt, rearFront;
    const result = simulateDual("adaptive-imperfect", hz, { onEvent(event, state) {
      events.push(event);
      if (checkedAt !== event.time && event.type !== "launch" && event.type !== "phalanxUnlocked") {
        checkedAt = event.time;
        const { left, right } = state.lanes;
        const { transfers, flank } = state.siege;
        const moving = [...left.squads, ...right.squads, ...transfers];
        if (flank) moving.push(flank);
        if (state.siege.phase === "flanking") rearFront = undefined;
        if (state.siege.phase === "encirclement") {
          const front = state.siege.rearFront;
          assert.ok(front >= (rearFront ?? 173) && front <= left.front - 28);
          rearFront = front;
        }
        assert.equal(new Set(moving.map(cohort => cohort.id)).size, moving.length);
        assert.ok([left.blueTotal, right.blueTotal, left.redTotal, right.redTotal,
          ...moving.map(cohort => cohort.count)].every(count => count >= 0));
      }
      if (event.type === "encirclementStarted") assert.equal(siegeStatus(state).east, "RIGHT — BREAKTHROUGH");
      if (event.type === "encirclementArrival") assert.equal(siegeStatus(state).east, "ENCIRCLEMENT");
      if (event.type === "victory") final = structuredClone(state);
    } });
    return { result, events, final };
  }
  const baseline = run(60);
  const { result, events, final } = baseline;
  assert.deepEqual(run(30), baseline);
  assert.deepEqual(run(120), baseline);
  assert.equal(result.outcome, "victory");
  assert.ok(result.duration >= 100 && result.duration <= 150);

  const names = ["phalanxSecured", "infantryWithdrawal", "transferArrival", "supplyCutoff",
    "mainBreakthrough", "encirclementStarted", "encirclementArrival", "rearAttack",
    "enemyRouted", "victory"];
  const milestones = names.map(type => events.findIndex(event => event.type === type));
  assert.ok(milestones.every((index, i) => index > (milestones[i - 1] ?? -1)));
  const [breakthrough, departure, arrival, rear, routed, victory] = milestones.slice(4)
    .map(index => events[index]);
  assert.ok(departure.count > breakthrough.count / 2 && departure.count < breakthrough.count);
  assert.equal(arrival.count, departure.count);
  assert.ok(arrival.time - departure.time >= 4.87);
  assert.ok(rear.time > arrival.time && routed.time - rear.time > 2);
  assert.equal(victory.time, routed.time);
  assert.ok(result.retreated > 0);
  assert.equal(final.lanes.left.redTotal, 0);
  assert.equal(final.lanes.right.redTotal, 0);
  assert.ok(final.lanes.right.blueTotal >= breakthrough.count - departure.count);
  assert.ok(final.siege.flank.count < departure.count);
  assert.ok(final.siege.rearFront > 173);
  assert.equal(siegeStatus(final).east, "VICTORY");
  assert.equal(siegePopulation(final).red, 0);
  const casualties = events.filter(event => event.type === "casualties");
  const sum = (type, side) => events.filter(event => event.type === type && event.side === side)
    .reduce((total, event) => total + event.count, 0);
  const startingBlue = LEVEL_FOUR.crossings.left.initialBlue + LEVEL_FOUR.crossings.right.initialBlue;
  const startingRed = LEVEL_FOUR.crossings.left.combat.initialRed +
    LEVEL_FOUR.crossings.right.combat.initialRed;
  checkClose(siegePopulation(final).blue, startingBlue + sum("launch", "blue") -
    casualties.reduce((total, event) => total + event.blueLost, 0));
  checkClose(startingRed + sum("arrival", "red"),
    result.retreated + casualties.reduce((total, event) => total + event.redLost, 0));
  assert.ok(events.some(event => event.type === "rearAttack" && event.redLost > 0 && event.blueLost > 0));
  assert.ok(events.some(event => event.type === "arrival" && event.side === "blue" &&
    event.multiplier === 999 && event.laneId === "right"));
});

test("the shield lock protects an endangered flank on its authoritative tick", () => {
  const sim = fixture();
  sim.unlockPhalanx();
  while (sim.state.phalanx.phase !== "deploying") sim.step();
  const { left } = sim.state.lanes;
  while (sim.state.time - sim.state.phalanx.since < LEVEL_FOUR.phalanx.deployTime - tick)
    sim.step();
  Object.assign(left, { front: left.objective.castleFront - 0.01,
    frontVelocity: 10, blueTotal: 0, redTotal: 2000 });
  sim.step();
  assert.equal(sim.state.phalanx.phase, "pushing");
  assert.equal(left.breached, false);
  assert.ok(left.frontVelocity < 0);
  const lock = sim.events.find(e => e.type === "phalanxPushing");
  const impact = sim.events.find(e => e.type === "shieldImpact");
  assert.equal(lock.time, impact.time);
});
