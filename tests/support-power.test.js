import assert from "node:assert/strict";
import test from "node:test";
import { createBattleClock, createGame } from "../src/game.js";
import { LEVEL_TWO, LEVEL_THREE } from "../src/levels.js";
import { createMotion } from "../src/motion.js";
import { MAX_AIRBORNE_CATS } from "../src/airborne-cats.js";
import { purrapultAim } from "./helpers/purrapult.js";
import { meowmenAim } from "./helpers/meowmen.js";

for (const [level, plan] of [
  [LEVEL_TWO, () => purrapultAim("artillery-first")],
  [LEVEL_THREE, () => meowmenAim("balanced")],
]) {
  test(`${level.title} resolves the same battle and events at 30, 60 and 120 render Hz`, () => {
    function run(hz, present = false) {
      const aim = plan();
      const events = [];
      const motion = createMotion();
      const game = createGame({ level, random: () => 0.5, onEffect: (...event) => {
        if (event[0].startsWith("archer") || event[0].startsWith("artillery")) events.push(event);
        if (present) motion.receive(...event);
      } });
      game.reset();
      const { state } = game;
      const clock = createBattleClock((dt) => {
        if (state.mode !== "playing") return;
        state.gunX = aim(state);
        game.update(dt);
        if (present) {
          motion.step(state.t, 0, state.blueTotal, state.redEntryOpen, level, state);
          assert.ok(motion.airborne.active.length <= MAX_AIRBORNE_CATS);
          assert.ok(motion.archers.aftermath.length <= 2);
        }
      });
      for (let i = 0; i < 150 * hz && state.mode === "playing"; i++) clock.advance(1 / hz);
      assert.equal(state.mode, "victory");
      assert.equal(state.support.shot, null);
      const impacts = events.filter(([kind]) => kind.endsWith("Impact"));
      assert.equal(state.support.damage, impacts.reduce((total, [, , hit]) => total + hit.loss, 0));
      assert.equal(motion.archers.aftermath.length, 0);
      return { state, events };
    }
    const expected = run(60);
    assert.deepEqual(run(30), expected);
    assert.deepEqual(run(120), expected);
    assert.deepEqual(run(60, true), expected);
  });
}

test("Meowmen open within a tenth of a second and keep three resolved volleys visible", () => {
  const motion = createMotion();
  const events = [];
  const game = createGame({ level: LEVEL_THREE, onEffect: (...event) => {
    if (event[0].startsWith("archer")) events.push(event);
    motion.receive(...event);
  } });
  game.reset();
  const { state } = game;
  state.gunX = LEVEL_THREE.support.x;
  let overlapping = false;
  for (let i = 0; i < 360; i++) {
    game.update(1 / 60);
    motion.step(state.t, 0, state.blueTotal, state.redEntryOpen, state.level, state);
    overlapping ||= motion.archers.aftermath.length === 2 &&
      motion.archers.impact?.points && state.support.shot !== null;
  }
  const launches = events.filter(([kind]) => kind === "archerLaunch");
  const impacts = events.filter(([kind]) => kind === "archerImpact");
  assert.ok(Math.abs(launches[0][1] - state.support.unlockedAt - 0.1) < 1e-9);
  assert.ok(launches.length > 12);
  assert.equal(impacts[0][2].loss, LEVEL_THREE.support.damagePerArrow * LEVEL_THREE.support.arrows);
  for (let i = 1; i < launches.length; i++) {
    assert.ok(Math.abs(launches[i][1] - launches[i - 1][1] - 0.24) < 1e-9);
    assert.equal(impacts[i - 1][2].launchedAt, launches[i - 1][1]);
  }
  assert.ok(overlapping);
  motion.reset();
  assert.deepEqual(motion.archers, { launch: null, impact: null, aftermath: [] });
});
