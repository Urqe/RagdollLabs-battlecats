import assert from "node:assert/strict";
import test from "node:test";
import { createMultipliers, crossRelayGates } from "../src/multipliers.js";
import { createBattleClock, createGame } from "../src/game.js";
import { LEVEL_ONE, LEVEL_TWO } from "../src/levels.js";
import { fire, updateProjectiles } from "../src/projectiles.js";
import { createAim } from "./helpers/strategies.js";

const relay = { id: "relay", after: "starter", x: 210, width: 60, hitY: 500, mult: 25 };
const noop = () => {};

function replayVolley(initial, relays) {
  const level = { ...LEVEL_ONE, gates: [{ ...LEVEL_ONE.gates[0], mult: initial }], relayGates: relays };
  const arrivals = [];
  const game = createGame({ level, random: () => 0.5, onEffect(type, time, value) {
    if (type === "arrival") arrivals.push(value);
  } });
  game.reset();
  const state = game.state;
  state.nextShot = Infinity;
  const { spawnSquad } = createMultipliers(state, noop, () => 0.5);
  for (let i = 0; i < 2; i++) fire(state, noop);
  updateProjectiles(state, 0.15, spawnSquad, noop, noop);
  assert.equal(state.squads.length, 6);
  assert.equal(state.blueTotal, level.combat.initialBlue);
  for (let i = 0; i < 180; i++) game.update(1 / 60);
  assert.equal(state.squads.length, 0);
  return arrivals;
}

for (const [initial, factor, total] of [[5, null, 15], [5, 25, 375], [99, 99, 29403]]) {
  test(`two simultaneous volleys retain ownership for ×${initial}${factor ? " → ×" + factor : ""}`, () => {
    const arrivals = replayVolley(initial, factor ? [{ ...relay, mult: factor }] : []);
    assert.equal(arrivals.length, 6);
    for (const volley of [0, 1]) {
      const cohorts = arrivals.filter(q => q.volley === volley);
      assert.equal(cohorts.reduce((sum, q) => sum + q.count, 0), total);
      assert.deepEqual(new Set(cohorts.map(q => q.slot)), new Set([-1, 0, 1]));
      assert.ok(cohorts.every(q => q.target === "blue" &&
        q.gates.length === (factor ? 2 : 1)));
    }
  });
}

test("swept relays choose the first physical plane, then apply each traversed gate once", () => {
  const level = { ...LEVEL_ONE, relayGates: [
    { ...relay, id: "far", after: "relay", hitY: 480, mult: 2 },
    relay,
    { ...relay, id: "overlap", mult: 100 },
  ] };
  const { state } = createGame({ level });
  const cohort = { x: 210, y: 460, marchTime: 1, count: 5, gates: [{ id: "starter" }] };
  crossRelayGates(state, cohort, 530, 400);
  crossRelayGates(state, cohort, 530, 400);
  assert.equal(cohort.count, 250);
  assert.deepEqual(cohort.gates.map(gate => gate.id), ["starter", "relay", "far"]);
});

test("a relay can open during travel and a cohort can reach the army before the relay", () => {
  const game = createGame({ level: { ...LEVEL_ONE, relayGates: [{ ...relay, requires: "strong" }] } });
  const { state } = game;
  const cohort = { x: 210, y: 504, marchTime: 0.4, count: 5, gates: [{ id: "starter" }] };
  crossRelayGates(state, cohort, 520, 400);
  state.gates[1].open = true;
  cohort.y = 496;
  crossRelayGates(state, cohort, 504, 502);
  assert.equal(cohort.count, 5);
  crossRelayGates(state, cohort, 504, 480);
  assert.equal(cohort.count, 125);
  const unsafe = { ...cohort, count: Number.MAX_SAFE_INTEGER, gates: [{ id: "starter" }] };
  assert.throws(() => crossRelayGates(state, unsafe, 504, 480), RangeError);
});

function battle(hz) {
  const events = [];
  const game = createGame({ random: () => 0.5, onEffect(type, time, value) {
    if (type === "compound") events.push({ time, ...value });
  } });
  game.reset();
  const { state } = game;
  const aim = createAim("C");
  const clock = createBattleClock(dt => {
    if (state.mode !== "playing") return;
    state.gunX = aim(state);
    game.update(dt);
  });
  while (state.mode === "playing" && state.t < 160) {
    const before = events.length;
    clock.advance(1 / hz);
    if (!before && events.length) {
      const frozen = structuredClone(state);
      clock.pause();
      for (let i = 0; i < hz; i++) clock.advance(1 / hz);
      assert.deepEqual(state, frozen);
      clock.resume();
    }
  }
  assert.equal(state.mode, "victory");
  assert.ok(events.some(event => event.count === 500));
  assert.equal(state.redEntryOpen, false);
  const result = { state: structuredClone(state), events };
  game.reset();
  assert.equal(state.nextVolley, 0);
  assert.deepEqual(state.relayFlashes, {});
  assert.deepEqual(state.squads, []);
  game.reset(LEVEL_TWO);
  assert.equal(state.level.relayGates, undefined);
  assert.deepEqual(state.squads, []);
  return result;
}

test("compound combat, supply cutoff and victory match at 30, 60 and 120 Hz", () => {
  const expected = battle(60);
  assert.deepEqual(battle(30), expected);
  assert.deepEqual(battle(120), expected);
});

test("arrival rejects an unsafe aggregate instead of rounding away soldiers", () => {
  const game = createGame({ random: () => 0.5 });
  game.reset();
  const { state } = game;
  state.nextShot = Infinity;
  state.blueTotal = Number.MAX_SAFE_INTEGER;
  state.squads.push({ x: 210, y: state.front + 15, count: 5, mult: 5, marchTime: 1 });
  assert.throws(() => game.update(1 / 60), /Unsafe active blue population/);
  assert.equal(state.blueTotal, Number.MAX_SAFE_INTEGER);
  assert.equal(state.squads.length, 1);
});
