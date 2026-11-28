import assert from "node:assert/strict";
import test from "node:test";
import { createAirborneCats, MAX_AIRBORNE_CATS } from "../src/airborne-cats.js";
import { createGame } from "../src/game.js";
import { LEVEL_FIVE, LEVEL_ONE } from "../src/levels.js";
import { launchArmorImpact, PAWTORIAN_SLOT_START } from "../src/pawtorian-visual.js";
import { engagedArmor, marchPawtorians, redCleared, removeRed } from "../src/pawtorians.js";
import { simulatePawtorians, strategies } from "./helpers/pawtorians.js";

test("the finite vanguard marches, enters combat once, and resets across levels", () => {
  const game = createGame({ level: LEVEL_FIVE, random: () => 0.5 });
  game.reset();
  const { state } = game;
  const config = LEVEL_FIVE.pawtorians;
  while (state.t < config.spawnAt) game.update(1 / 60);
  const wave = state.pawtorians;
  assert.equal(wave.count, config.population);
  assert.equal(engagedArmor(state), 0);
  assert.equal(wave.arrivedAt, null);
  state.redEntryOpen = false;
  state.redTotal = 0;
  assert.equal(redCleared(state), false);
  assert.equal(removeRed(state, 100, "artillery"), 0);
  assert.equal(wave.count, config.population);
  const before = wave.y;
  marchPawtorians(state, 1);
  assert.equal(wave.y - before, config.marchSpeed);
  marchPawtorians(state, 30);
  assert.equal(engagedArmor(state), config.population);
  const arrival = wave.arrivedAt;
  marchPawtorians(state, 30);
  assert.equal(wave.arrivedAt, arrival);
  assert.equal(state.redTotal, config.population);

  game.reset(LEVEL_ONE);
  assert.equal(state.pawtorians, null);
  game.reset(LEVEL_FIVE);
  assert.notEqual(state.pawtorians, wave);
  assert.deepEqual(state.pawtorians, createGame({ level: LEVEL_FIVE }).state.pawtorians);
});

test("melee resistance and artillery exposure allocate bounded losses to real populations", () => {
  const { state } = createGame({ level: LEVEL_FIVE });
  state.pawtorians.arrivedAt = 0;
  state.pawtorians.count = 50;
  state.redTotal = 100;
  assert.equal(removeRed(state, 20, "melee"), 14.2);
  assert.deepEqual(state.pawtorians.melee, { ordinary: 10, armored: 4.2 });

  const armorBefore = engagedArmor(state);
  const artilleryLoss = removeRed(state, 25, "artillery");
  assert.ok(Math.abs(artilleryLoss - 25) < 1e-12);
  const { artillery } = state.pawtorians;
  assert.ok(artillery.armored > artillery.ordinary);
  assert.ok(Math.abs(engagedArmor(state) + artillery.armored - armorBefore) < 1e-12);
  assert.equal(removeRed(state, 1000, "artillery"), state.pawtorians.artillery.ordinary +
    state.pawtorians.artillery.armored - artilleryLoss);
  assert.equal(state.redTotal, 0);
  assert.equal(engagedArmor(state), 0);
});

test("a resolved strike gives armored survivors bounded flights in their own slots", () => {
  const airborne = createAirborneCats();
  launchArmorImpact(airborne, { x: 210, y: 285, radiusX: 78, radiusY: 48, at: 12, force: 1 },
    { loss: 120, remaining: 800, population: 1500, lead: 312 });
  assert.ok(airborne.active.length > 0 && airborne.active.length <= MAX_AIRBORNE_CATS);
  assert.ok(airborne.active.every(cat => cat.armored && cat.fromImpact));
  assert.ok(airborne.active.some(cat => cat.slot >= PAWTORIAN_SLOT_START));
  airborne.step(14);
  assert.equal(airborne.active.length, 0);
  assert.ok(!airborne.slots[1].some(Boolean));
});

for (const alternate of [false, true]) {
  test(`Level 5 strategy outcomes and telemetry are identical at 30, 60 and 120 Hz (schedule ${alternate ? "B" : "A"})`, () => {
    const results = Object.fromEntries(strategies.map(strategy => [
      strategy, simulatePawtorians(strategy, 60, LEVEL_FIVE, alternate),
    ]));
    for (const strategy of strategies) {
      const result = results[strategy];
      for (const hz of [30, 120]) assert.deepEqual(simulatePawtorians(strategy, hz, LEVEL_FIVE, alternate), result);
      assert.ok(result.conservationError < 1e-7, strategy);
      assert.ok(result.arrivedAt > result.spawnedAt + 8, strategy);
      const victory = strategy === "gates" || strategy === "gates-support";
      assert.equal(result.outcome, victory ? "victory" : "defeat", strategy);
      if (victory) {
        assert.ok(result.gates[100] < result.arrivals[500] && result.arrivals[500] < result.cutoff);
        assert.ok(result.cutoff < result.seconds);
        assert.ok(result.peak > result.samples.find(s => s.t === result.arrivedAt).front + 130);
        assert.equal(result.samples.at(-1).armored, 0);
        assert.equal(result.samples.at(-1).ordinary, 0);
        assert.ok(result.samples.at(-1).blue > 25000);
      } else assert.equal(result.cutoff, null);
    }

    const hold = results["strong-only"];
    const before = hold.samples.findLast(s => s.t < hold.arrivedAt);
    const after = hold.samples.find(s => s.t > hold.arrivedAt + 2);
    assert.ok(before.velocity < -5 && after.velocity > 5);
    const supported = results["gates-support"];
    assert.ok(supported.artillery.armored > 800);
    assert.ok(supported.cutoff < results.gates.cutoff - 10);
    const inert = { ...LEVEL_FIVE, support: { ...LEVEL_FIVE.support, damage: 0 } };
    const withoutDamage = simulatePawtorians("gates-support", 60, inert, alternate);
    assert.ok(supported.peak < withoutDamage.peak - 35);
    assert.ok(supported.cutoff < withoutDamage.cutoff - 30);
    assert.ok(results.late.arrivals[100] === undefined);
  });
}
