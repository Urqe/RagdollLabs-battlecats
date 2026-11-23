import assert from "node:assert/strict";
import { test } from "node:test";
import { createAirborneCats, MAX_AIRBORNE_CATS } from "../src/airborne-cats.js";
import { createGame } from "../src/game.js";
import { LEVELS } from "../src/levels.js";
import { createMotion } from "../src/motion.js";
import { meowmenAim } from "./helpers/meowmen.js";
import { purrapultAim } from "./helpers/purrapult.js";
import { createAim } from "./helpers/strategies.js";

const launch = { at: 0, x: 195, y: 320, vx: -35, vy: 21, lift: 115, spin: -9, red: false };
const stepMotion = (motion, s) =>
  motion.step(s.t + s.victoryElapsed, 0, s.blueTotal, s.redEntryOpen, s.level, s);

test("bounded flights prioritize strong impacts, bounce and recover or fade", () => {
  const effects = createAirborneCats(2);
  assert.ok(effects.launch({ ...launch, slot: 0, bounce: 0.25 }));
  assert.equal(effects.launch({ ...launch, slot: 0 }), false);
  assert.ok(effects.launch({ ...launch, defeated: true }));
  assert.equal(effects.launch(launch), false);
  assert.ok(effects.launch({ ...launch, defeated: true, intensity: 2 }));
  assert.equal(effects.active.length, 2);
  const [living, defeated] = effects.active;
  assert.equal(effects.slots[0][0], living);
  effects.step(0.25);
  assert.ok(living.dy < -8 && living.dx < 0 && living.angle < -2);
  const landingDy = living.vy * living.flight;
  effects.step(living.flight + living.rebound / 2);
  assert.ok(living.dy < landingDy);
  assert.ok(defeated.alpha < 1);
  effects.step(living.flight + living.rebound + 0.31);
  assert.equal(living.alpha, 1);
  assert.ok(Math.abs(living.dx) < 0.1);
  effects.step(1.6);
  assert.deepEqual(effects.active, []);
  assert.equal(effects.slots[0][0], undefined);
});

test("melee reactions obey the event's casualty side and clear at battle boundaries", () => {
  const motion = createMotion();
  const { state } = createGame();
  Object.assign(state, { mode: "playing", redTotal: 200, blueTotal: 220 });
  stepMotion(motion, state);
  motion.receive("clash", 0.2, 230, state.front, 0, 0);
  assert.deepEqual(motion.airborne.active, []);
  motion.receive("clash", 0.4, 230, state.front, 0, 8);
  const [defeated, living] = motion.airborne.active;
  assert.ok(defeated.defeated && !defeated.red && defeated.x < 210);
  assert.ok(!living.defeated && living.red && Number.isInteger(living.slot));
  assert.equal(state.redTotal, 200);
  assert.equal(state.blueTotal, 220);

  for (const mode of ["victory", "end", "menu"]) {
    state.mode = mode;
    state.t += 1;
    if (!motion.airborne.active.length) motion.airborne.launch(launch);
    stepMotion(motion, state);
    assert.deepEqual(motion.airborne.active, []);
    assert.deepEqual(motion.airborne.slots, [[], []]);
  }
  motion.airborne.launch(launch);
  motion.reset();
  assert.deepEqual(motion.airborne.active, []);
});

for (const hz of [30, 60, 120]) {
  test(`each single-front level preserves the complete battle state with combat visuals at ${hz} Hz`, () => {
    for (const level of LEVELS.filter(level => level.status === "implemented" && !level.crossings)) {
      const motion = createMotion();
      const baseline = createGame({ level, random: () => 0.5 });
      let knockback = false;
      let casualty = false;
      const animated = createGame({
        level,
        random: () => 0.5,
        onEffect(...event) {
          motion.receive(...event);
        },
      });
      const aim = level.number === 2 ? purrapultAim("artillery-first", level)
        : level.number === 3 ? meowmenAim("balanced") : createAim("C");
      baseline.reset();
      animated.reset();
      stepMotion(motion, animated.state);
      let frames = 0;
      let purrapult = false;
      while (baseline.state.mode !== "end" && baseline.state.t < 240) {
        const x = aim(baseline.state);
        baseline.state.gunX = animated.state.gunX = x;
        baseline.update(1 / hz);
        animated.update(1 / hz);
        stepMotion(motion, animated.state);
        if (++frames % hz === 0) assert.deepEqual(animated.state, baseline.state);
        assert.ok(motion.airborne.active.length <= MAX_AIRBORNE_CATS);
        for (const cat of motion.airborne.active) {
          knockback ||= !cat.defeated;
          casualty ||= cat.defeated;
          purrapult ||= cat.priority;
        }
      }
      if (level.number === 1) assert.ok(knockback && casualty);
      if (level.number === 2) {
        assert.ok(purrapult);
        assert.ok(animated.state.support.impacts > 1);
      }
      assert.deepEqual(animated.state, baseline.state);
      assert.equal(animated.state.mode, "end");
      assert.deepEqual(motion.airborne.active, []);
    }
  });
}
