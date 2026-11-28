import test from "node:test";
import assert from "node:assert/strict";
import { updateArtillery } from "../src/artillery.js";
import { barrierIndex } from "../src/barricades.js";
import { createGame } from "../src/game.js";
import { LEVELS, LEVEL_ONE, LEVEL_TWO, LEVEL_THREE, LEVEL_FOUR, LEVEL_FIVE, playableLevel } from "../src/levels.js";
import { readProgress, saveProgress } from "../src/progress.js";
import { updateProjectiles } from "../src/projectiles.js";
import { PURRAPULT_STRATEGIES, simulatePurrapult } from "./helpers/purrapult.js";

const noop = () => {};
function fixture() {
  const game = createGame({ level: LEVEL_TWO, random: () => 0.5 });
  game.reset();
  return game;
}

function unlock(game) {
  const { state } = game;
  const slot = barrierIndex(state, state.level.support.barricadeId);
  const barrier = state.level.barricades[slot];
  state.work[slot] = barrier.hits - 1;
  state.shots.push({ x: state.level.support.x, y: barrier.hitY + 1 });
  updateProjectiles(
    state,
    0.01,
    () => assert.fail("wood produced a squad"),
    noop,
    noop,
  );
}

test("five playable levels are available while five registry entries are disabled", () => {
  assert.equal(LEVELS.length, 10);
  assert.equal(new Set(LEVELS.map(({ id }) => id)).size, 10);
  assert.deepEqual(
    LEVELS.filter(({ id }) => playableLevel(id)),
    [LEVEL_ONE, LEVEL_TWO, LEVEL_THREE, LEVEL_FOUR, LEVEL_FIVE],
  );
  for (const level of LEVELS.filter(({ status }) => status !== "implemented")) {
    assert.equal(playableLevel(level.id), undefined);
  }
  for (const level of [LEVEL_ONE, LEVEL_TWO, LEVEL_THREE, LEVEL_FOUR, LEVEL_FIVE]) {
    const targets = [...level.gates, ...(level.support ? [level.support] : [])];
    const ids = targets.flatMap(({ barricadeId }) =>
      barricadeId ? [barricadeId] : [],
    );
    assert.deepEqual(ids.sort(), level.barricades.map(({ id }) => id).sort());
  }
});

test("settings keep valid completion records and handle bad or unavailable storage", () => {
  let value;
  const browser = () => ({
    getItem: () => value,
    setItem: (_, data) => {
      value = data;
    },
  });
  const defaults = { selected: LEVEL_ONE.id, completed: [] };
  assert.deepEqual(readProgress(browser), defaults);
  value = "corrupt";
  assert.deepEqual(readProgress(browser), defaults);
  value = JSON.stringify({ version: 9, selected: LEVEL_TWO.id });
  assert.deepEqual(readProgress(browser), defaults);
  saveProgress(
    {
      selected: LEVELS[5].id,
      completed: [LEVEL_TWO.id, LEVEL_TWO.id, LEVEL_THREE.id, LEVEL_FOUR.id, "missing"],
    },
    browser,
  );
  assert.deepEqual(readProgress(browser), {
    selected: LEVEL_ONE.id,
    completed: [LEVEL_TWO.id, LEVEL_THREE.id, LEVEL_FOUR.id],
  });
  saveProgress({ selected: LEVEL_TWO.id, completed: [] }, browser);
  assert.deepEqual(readProgress(browser), {
    selected: LEVEL_TWO.id,
    completed: [],
  });
  const denied = () => {
    throw new Error("unavailable");
  };
  assert.deepEqual(readProgress(denied), defaults);
  assert.doesNotThrow(() => saveProgress(defaults, denied));
});

test("catapult wood responds to direct crossings and remembers damage after a miss", () => {
  const game = fixture();
  const { state } = game;
  const { x, barricadeId } = state.level.support;
  const slot = barrierIndex(state, barricadeId);
  const y = state.level.barricades[slot].hitY;
  state.shots.push({ x, y: y + 1 });
  updateProjectiles(state, 0.01, noop, noop, noop);
  assert.deepEqual(state.work, [0, 0, 1]);
  state.shots.push({ x: 312, y: y + 1 }, { x, y: y - 5 });
  updateProjectiles(state, 0.2, noop, noop, noop);
  assert.deepEqual(state.work, [0, 0, 1]);
  unlock(game);
  assert.ok(state.support.open);
  assert.equal(state.support.readyAt, state.level.support.openingDelay);
  assert.equal(state.squads.length, 0);
  assert.equal(state.support.shotsFired, 0);
  state.shots.push({ x, y: y + 1 });
  updateProjectiles(
    state,
    0.2,
    () => assert.fail("emplacement produced a squad"),
    noop,
    noop,
  );
  assert.equal(state.work[slot], state.level.barricades[slot].hits);
});

test("automatic artillery launches on the opening deadline, applies a bounded impact once, and can miss a moving front", () => {
  const game = fixture();
  unlock(game);
  const { state } = game;
  const config = state.level.support;
  state.t = config.openingDelay - 0.01;
  updateArtillery(state);
  assert.equal(state.support.shot, null);
  state.t = config.openingDelay;
  updateArtillery(state);
  const first = state.support.shot;
  assert.ok(first);
  updateArtillery(state);
  assert.equal(state.support.shotsFired, 1);
  state.redTotal = 20;
  state.t = first.impactAt - 0.01;
  updateArtillery(state);
  assert.equal(state.redTotal, 20);
  state.t = first.impactAt;
  updateArtillery(state);
  assert.equal(state.support.damage, 20);
  assert.equal(state.support.impact.opening, true);
  assert.equal(state.redTotal, 0);
  assert.equal(state.support.shot, null);
  updateArtillery(state);
  assert.equal(state.support.impacts, 1);
  assert.equal(state.support.readyAt, first.impactAt + config.reload);
  state.t = state.support.readyAt + 0.02;
  updateArtillery(state);
  assert.equal(state.support.shotsFired, 1);
  state.redTotal = 6000;
  updateArtillery(state);
  state.front = 560;
  state.t = state.support.shot.impactAt;
  updateArtillery(state);
  assert.equal(state.redTotal, 6000);
  assert.equal(state.support.impact.loss, 0);
  assert.equal(state.support.impact.opening, false);
});

test("the final artillery casualty can win, and an in-flight ball is discarded at defeat or reset", () => {
  const game = fixture();
  const { state } = game;
  unlock(game);
  state.redEntryOpen = false;
  state.front = 90;
  state.redTotal = 18;
  state.t = state.support.readyAt;
  updateArtillery(state);
  state.t = state.support.shot.impactAt;
  game.update(0.01);
  assert.equal(state.mode, "victory");
  assert.equal(state.redTotal, 0);
  assert.equal(state.support.damage, 18);
  game.update(10);
  assert.equal(state.support.impacts, 1);
  game.reset(LEVEL_TWO);
  unlock(game);
  state.t = state.support.readyAt;
  updateArtillery(state);
  assert.ok(state.support.shot);
  state.front = state.level.objective.castleFront;
  game.update(0.01);
  assert.equal(state.mode, "end");
  assert.equal(state.support.shot, null);
  game.update(10);
  assert.equal(state.support.impacts, 0);
  game.reset();
  unlock(game);
  state.t = state.support.readyAt;
  updateArtillery(state);
  assert.ok(state.support.shot);
  game.reset(LEVEL_ONE);
  assert.equal(state.support, null);
  assert.deepEqual(state.work, [0, 0]);
  assert.equal(state.gunX, LEVEL_ONE.battlefield.startX);
  game.reset(LEVEL_TWO);
  assert.equal(state.support.open, false);
  assert.equal(state.support.shot, null);
  assert.equal(state.support.damage, 0);
  assert.deepEqual(state.work, [0, 0, 0]);
});

const wins = new Set(["gates", "artillery-first", "gates-first"]);

for (const hz of [30, 60, 120]) {
  for (const schedule of ["C", "D"]) {
    test(`Purrapult progression at ${hz} Hz, schedule ${schedule}`, () => {
      const results = Object.fromEntries(PURRAPULT_STRATEGIES.map((policy) =>
        [policy, simulatePurrapult(policy, hz, LEVEL_TWO, schedule)]));
      for (const [policy, result] of Object.entries(results)) {
        assert.equal(result.outcome, wins.has(policy) ? "victory" : "defeat", policy);
        if (wins.has(policy)) {
          assert.ok(result.gateTimes[1] < result.arrivals[100], policy);
          assert.ok(result.finalCombat >= result.arrivals[100], policy);
          assert.ok(result.finalCombat < result.cutoff && result.cutoff <= result.seconds, policy);
        } else {
          assert.equal(result.cutoff, null, policy);
          assert.equal(result.arrivals[100], undefined, policy);
          assert.equal(result.finalCombat, null, policy);
          assert.equal(result.gateTimes[1] !== undefined, policy === "final-unused", policy);
        }
      }

      assert.equal(results.gates.shots, 0);
      assert.ok(results["artillery-rush"].artilleryLoss > 0);
      for (const policy of ["artillery-first", "gates-first"]) {
        const result = results[policy];
        assert.ok(result.firstImpact > result.unlocked);
        assert.ok(result.firstImpact - result.unlocked < 1.2);
        assert.ok(result.artilleryLoss > 1000);
      }

      const hold = results["artillery-first-no-final"];
      const frontAt = (time) => hold.samples.find((sample) => sample.time === time).front;
      assert.ok(frontAt(40) < frontAt(30));
      assert.ok(frontAt(60) > frontAt(40) + 25);

      const inert = { ...LEVEL_TWO, support: { ...LEVEL_TWO.support, damage: 0 } };
      const artillery = results["artillery-first"];
      const withoutDamage = simulatePurrapult("artillery-first", hz, inert, schedule);
      assert.ok(artillery.furthest < withoutDamage.furthest - 100);
      assert.ok(artillery.cutoff < withoutDamage.cutoff - 15 || !withoutDamage.won);
    });
  }
}
