import assert from "node:assert/strict";
import test from "node:test";
import { createBattleClock, createGame } from "../src/game.js";
import { LEVEL_ONE, LEVEL_TWO, LEVEL_THREE } from "../src/levels.js";
import { createAim } from "./helpers/strategies.js";
import { purrapultAim } from "./helpers/purrapult.js";
import { meowmenAim } from "./helpers/meowmen.js";

test("pausing preserves fractional time and reset clears a paused clock", () => {
  let steps = 0;
  const clock = createBattleClock(() => steps++);
  clock.advance(1 / 120);
  for (let i = 0; i < 20; i++) {
    clock.pause();
    clock.advance(3600);
    assert.equal(steps, i);
    clock.resume();
    clock.advance(1 / 120);
    assert.equal(steps, i + 1);
    clock.advance(1 / 120);
  }
  clock.pause();
  clock.reset();
  assert.equal(clock.paused, false);
  clock.advance(1 / 120);
  assert.equal(steps, 20);
  clock.advance(1 / 120);
  assert.equal(steps, 21);
});

for (const [level, aimStrategy, checkpoints] of [
  [LEVEL_ONE, () => createAim("C"), {
    combat: (s) => s.blueTotal > 0 && s.redTotal > 0 && s.t >= 6,
    charge: (s) => s.mode === "victory" && s.victoryElapsed > 0.25,
    capture: (s) => s.mode === "victory" && s.victoryElapsed > 1,
  }],
  [LEVEL_TWO, () => purrapultAim("artillery-first"), {
    yarn: (s) => !!s.support.shot,
  }],
  [LEVEL_THREE, () => meowmenAim("archer-first"), {
    arrows: (s) => !!s.support.shot,
  }],
]) {
  test(`${level.title} reaches the same outcome with pauses at 30, 60 and 120 Hz`, () => {
    function run(hz, insertPauses) {
      const events = [];
      const game = createGame({
        level,
        random: () => 0.5,
        onEffect: (...event) => events.push(structuredClone(event)),
        onEnd: (won) => events.push(["result", won]),
      });
      game.reset();
      const { state } = game;
      const aim = aimStrategy();
      const clock = createBattleClock((dt) => {
        if (state.mode === "playing") state.gunX = aim(state);
        game.update(dt);
      });
      const pauses = new Set();
      for (let frame = 0; state.mode !== "end" && frame < 200 * hz; frame++) {
        clock.advance(1 / hz);
        if (!insertPauses) continue;
        for (const [name, ready] of Object.entries(checkpoints)) {
          if (pauses.has(name) || !ready(state)) continue;
          pauses.add(name);
          const before = structuredClone(state);
          const eventCount = events.length;
          clock.pause();
          clock.advance(3600);
          clock.advance(1 / hz);
          assert.deepEqual(state, before);
          assert.equal(events.length, eventCount);
          clock.resume();
        }
      }
      assert.equal(state.mode, "end");
      if (insertPauses) assert.deepEqual([...pauses], Object.keys(checkpoints));
      return { state, events };
    }

    const uninterrupted = run(60, false);
    for (const hz of [30, 60, 120]) {
      assert.deepEqual(run(hz, false), uninterrupted);
      assert.deepEqual(run(hz, true), uninterrupted);
    }
  });
}
