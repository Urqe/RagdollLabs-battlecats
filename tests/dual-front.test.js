import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { createDualFront } from "../src/dual-front.js";
import { createBattleClock, createGame } from "../src/game.js";
import { LEVEL_ONE, LEVEL_TWO, LEVEL_THREE } from "../src/levels.js";
import { meowmenAim } from "./helpers/meowmen.js";
import { purrapultAim } from "./helpers/purrapult.js";

const tick = 1 / 60;

function crossing(combat = {}, options = {}) {
  return {
    marchSpeed: LEVEL_ONE.battlefield.marchSpeed,
    ...options,
    combat: {
      ...LEVEL_ONE.combat,
      initialFront: 300,
      initialRed: 0,
      redReinforcements: 0,
      redReinforcementGrowth: 0,
      ...combat,
    },
    objective: { ...LEVEL_ONE.objective, ...options.objective },
  };
}

function battle(left, right) {
  const events = [];
  const sim = createDualFront({ left, right }, { onEvent: (event) => events.push(event) });
  return { ...sim, events };
}

test("both contested crossings resolve casualties and move independently on the same tick", () => {
  const sim = battle(
    crossing({ initialRed: 80 }, { initialBlue: 600 }),
    crossing({ initialRed: 650 }, { initialBlue: 25 }),
  );
  sim.advance(tick);
  const { left, right } = sim.state.lanes;
  assert.ok(left.front < 300);
  assert.ok(right.front > 300);
  const losses = sim.events.filter(({ type }) => type === "casualties");
  assert.deepEqual(losses.map(({ laneId }) => laneId), ["left", "right"]);
  for (const [lane, red, blue] of [[left, 80, 600], [right, 650, 25]]) {
    const event = losses.find(({ laneId }) => laneId === lane.id);
    const contact = Math.min(blue, red);
    const engagedRed = Math.min(red, contact * lane.combat.redEngagementRatio);
    assert.equal(event.redLost, blue * lane.combat.redLossPerBlue * tick);
    assert.equal(event.blueLost,
      (engagedRed * lane.combat.blueLossPerRed + contact * lane.combat.blueContactLoss) * tick);
    assert.equal(lane.redTotal, red - event.redLost);
    assert.equal(lane.blueTotal, blue - event.blueLost);
    assert.equal(event.time, tick);
  }
  assert.deepEqual(sim.events.filter(({ type }) => type === "clash").map(({ laneId }) => laneId),
    ["left", "right"]);
});

test("a volley marches and contributes exactly once to its assigned crossing", () => {
  const setup = crossing({ spawnY: 300, minMarchTime: 2 * tick });
  const sim = battle(setup, setup);
  assert.throws(() => sim.launchVolley("center", { multiplier: 20 }), RangeError);
  assert.throws(() => sim.launchVolley("left", { multiplier: 99, hits: 4 }), RangeError);
  sim.launchVolley("right", { multiplier: 99, hits: 2 });
  sim.launchVolley("right", { multiplier: 20 });
  const { left, right } = sim.state.lanes;
  assert.equal(left.squads.length, 0);
  assert.deepEqual(right.squads.map(({ laneId, count }) => [laneId, count]),
    [["right", 198], ["right", 60]]);
  sim.advance(tick);
  assert.equal(right.blueTotal, 0);
  sim.advance(tick);
  sim.advance(tick);
  assert.equal(right.blueTotal, 258);
  assert.equal(left.blueTotal, 0);
  assert.equal(left.front, 300);
  assert.deepEqual(sim.events.filter(({ type }) => ["launch", "arrival"].includes(type))
    .map(({ type, laneId, id, time }) => [type, laneId, id, time]), [
    ["launch", "right", 1, 0], ["launch", "right", 2, 0],
    ["arrival", "right", 1, 2 * tick], ["arrival", "right", 2, 2 * tick],
  ]);
});

test("red reinforcement rates escalate and cap independently", () => {
  const sim = battle(crossing({ redReinforcements: 60, maxRedReinforcements: 60 }),
    crossing({ redReinforcementGrowth: 3600, maxRedReinforcements: 180 }));
  sim.advance(2 * tick);
  const { left, right } = sim.state.lanes;
  assert.equal(left.redTotal, 2);
  assert.equal(right.redTotal, 3);
  assert.equal(left.redEntryRate, 60);
  assert.equal(right.redEntryRate, 120);
  sim.advance(2 * tick);
  assert.equal(left.redTotal, 4);
  assert.equal(right.redTotal, 9);
  assert.equal(right.redEntryRate, 180);
  assert.deepEqual(sim.events.filter(({ type, side }) => type === "arrival" && side === "red")
    .map(({ laneId, count }) => [laneId, count]),
    [["left", 1], ["right", 1], ["left", 1], ["right", 2],
      ["left", 1], ["right", 3], ["left", 1], ["right", 3]]);
});

for (const laneId of ["left", "right"]) {
  test(`defeat when the ${laneId} crossing breaches and the other holds`, () => {
    const crossingUnderPressure = crossing({ initialRed: 70 }, { objective: { castleFront: 300.005 } });
    const lanes = { left: crossing(), right: crossing(), [laneId]: crossingUnderPressure };
    const sim = battle(lanes.left, lanes.right);
    sim.advance(tick);
    assert.equal(sim.state.outcome, "defeat");
    assert.equal(sim.state.lanes[laneId].breached, true);
    const other = sim.state.lanes[laneId === "left" ? "right" : "left"];
    assert.equal(other.front, 300);
    assert.equal(other.breached, false);
    sim.advance(3 * tick);
    assert.equal(sim.state.time, tick);
    assert.deepEqual(sim.events.filter(({ type }) => type === "breach").map((e) => e.laneId), [laneId]);
  });
}

test("both lanes finish the terminal tick, including simultaneous breaches", () => {
  const threatened = crossing({ initialRed: 1 }, { objective: { castleFront: 300.005 } });
  const sim = battle(threatened, threatened);
  sim.advance(2 * tick);
  assert.equal(sim.state.outcome, "defeat");
  assert.equal(sim.state.time, tick);
  assert.deepEqual(sim.events.filter(({ type }) => type === "breach")
    .map(({ laneId, time }) => [laneId, time]), [["left", tick], ["right", tick]]);
});

test("zero red with open supply can refill after blue losses", () => {
  const sim = battle(crossing({ redReinforcements: 60 }), crossing());
  const { left, right } = sim.state.lanes;
  assert.equal(left.redTotal, 0);
  assert.equal(right.redTotal, 0);
  sim.advance(tick);
  assert.equal(left.redTotal, 1);
  assert.equal(right.redTotal, 0);
  assert.equal(sim.state.outcome, null);

  const contested = battle(crossing({
    initialRed: 1,
    redLossPerBlue: 100,
    blueContactLoss: 60,
    blueLossPerRed: 0,
    redReinforcementGrowth: 30,
    redAdvance: 0,
  }, { initialBlue: 1 }), crossing());
  contested.advance(tick);
  assert.equal(contested.state.lanes.left.redTotal, 0);
  assert.equal(contested.state.lanes.left.redEntryOpen, true);
  assert.equal(contested.state.outcome, null);
  contested.advance(tick);
  assert.ok(contested.state.lanes.left.redTotal > 0);
});

test("one cutoff leaves the other supply active and victory waits for both armies to clear", () => {
  const cutoff = { objective: { reinforcementCutoff: 300 } };
  const sim = battle(
    crossing({ initialRed: 1, redReinforcements: 60 }, { ...cutoff, initialBlue: 2000 }),
    crossing({ initialFront: 300.001, spawnY: 300, minMarchTime: tick,
      redReinforcements: 6000, maxRedReinforcements: 6000, initialRed: 25, redAdvance: 0 }, cutoff),
  );
  sim.advance(tick);
  const { left, right } = sim.state.lanes;
  assert.equal(left.redEntryOpen, false);
  assert.equal(left.redTotal, 0);
  assert.equal(right.redEntryOpen, true);
  assert.ok(right.redTotal > 25);
  assert.equal(sim.state.outcome, null);

  sim.launchVolley("right", { multiplier: 999 });
  sim.advance(tick);
  assert.equal(sim.state.lanes.right.redEntryOpen, false);
  assert.ok(sim.state.lanes.right.redTotal > 0);
  assert.equal(sim.state.outcome, null);
  for (let i = 0; i < 20 && !sim.state.outcome; i++) sim.advance(tick);
  assert.equal(sim.state.outcome, "victory");
  assert.equal(sim.state.lanes.right.redTotal, 0);
  assert.deepEqual(sim.events.filter(({ type }) => type === "supplyCutoff").map((e) => e.laneId),
    ["left", "right"]);
});

test("restart and clearing for a level switch discard squads, outcomes, and partial ticks", () => {
  const sim = battle(crossing({ initialRed: 1 }, { objective: { castleFront: 300.005 } }), crossing());
  sim.launchVolley("right", { multiplier: 20 });
  sim.advance(1.5 * tick);
  assert.equal(sim.state.outcome, "defeat");
  sim.reset();
  assert.equal(sim.state.outcome, null);
  assert.equal(sim.state.lanes.left.breached, false);
  assert.equal(sim.state.lanes.right.squads.length, 0);
  sim.advance(tick / 2);
  assert.equal(sim.state.time, 0);
  sim.launchVolley("left", { multiplier: 99 });
  assert.equal(sim.state.lanes.left.squads[0].id, 1);
  sim.clear();
  sim.advance(3 * tick);
  sim.launchVolley("right", { multiplier: 20 });
  assert.deepEqual(sim.state, { time: 0, lanes: null, outcome: null });
  sim.reset({ left: crossing(), right: crossing({}, { initialBlue: 77 }) });
  sim.advance(tick);
  assert.equal(sim.state.lanes.right.blueTotal, 77);
  assert.equal(sim.state.lanes.left.squads.length, 0);
  assert.equal(sim.state.outcome, null);
});

test("30, 60 and 120 Hz rendering produce identical state and event streams", () => {
  function run(hz) {
    const sim = battle(
      crossing({ initialRed: 220, redReinforcements: 8 }, { initialBlue: 25 }),
      crossing({ initialRed: 115, redReinforcementGrowth: 3 }, { initialBlue: 100 }),
    );
    for (let frame = 0; frame < 6 * hz; frame++) {
      if (frame === 0) sim.launchVolley("left", { multiplier: 20 });
      if (frame === hz) sim.launchVolley("right", { multiplier: 99 });
      if (frame === 2 * hz) sim.launchVolley("left", { multiplier: 999 });
      sim.advance(1 / hz);
    }
    return { state: sim.state, events: sim.events };
  }
  const baseline = run(60);
  assert.equal(baseline.state.time, Array.from({ length: 360 }).reduce((time) => time + tick, 0));
  assert.equal(baseline.events.filter(({ type, side }) => type === "arrival" && side === "blue").length, 3);
  assert.deepEqual(run(30), baseline);
  assert.deepEqual(run(120), baseline);
});

test("campaign outcomes and support events match across render rates", () => {
  const scenarios = [
    {
      level: LEVEL_ONE, createAim: () => () => LEVEL_ONE.gates[0].x,
      won: false,
    },
    {
      level: LEVEL_TWO, createAim: () => purrapultAim("artillery-first", LEVEL_TWO),
      won: true,
    },
    {
      level: LEVEL_THREE, createAim: () => meowmenAim("balanced"),
      won: true,
    },
  ];
  for (const { level, createAim, ...expected } of scenarios) {
    let baseline;
    for (const hz of [30, 60, 120]) {
      let ticks = 0;
      let resolvedTick;
      let won;
      const aim = createAim();
      const events = createHash("sha256");
      const game = createGame({
        level, random: () => 0.5, onEnd: (value) => { won = value; },
        onEffect: (...event) => events.update(JSON.stringify(event) + "\n"),
      });
      const clock = createBattleClock((dt) => {
        if (won !== undefined) return;
        ticks++;
        game.state.gunX = aim(game.state);
        game.update(dt);
        if (game.state.mode !== "playing") resolvedTick ??= ticks;
      });
      game.reset();
      while (won === undefined && ticks < 12000) clock.advance(1 / hz);
      const { blueTotal, redTotal, support, redEntryOpen } = game.state;
      assert.equal(won, expected.won);
      assert.equal(redEntryOpen, !expected.won);
      assert.ok(blueTotal >= 0 && redTotal >= 0);
      if (support) assert.ok(support.damage > 0 && support.impacts > 0 && ticks > resolvedTick);
      const result = { resolvedTick, ticks, blueTotal, redTotal, damage: support?.damage,
        events: events.digest("hex") };
      baseline ??= result;
      assert.deepEqual(result, baseline, `${level.title} at ${hz} Hz`);
    }
  }
});
