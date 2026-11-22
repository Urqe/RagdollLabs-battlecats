import assert from "node:assert/strict";
import { test } from "node:test";
import { createGame } from "../src/game.js";
import { LEVEL_THREE } from "../src/levels.js";
import { meowmenAim } from "./helpers/meowmen.js";

function simulate(strategy, hz, level = LEVEL_THREE) {
  const aim = meowmenAim(strategy);
  const notices = [];
  let result;
  const game = createGame({
    level,
    notify: (message) => notices.push(message),
    onEnd: (won) => { result = won; },
    random: () => 0.5,
  });
  game.reset();
  const { state } = game;
  let furthest = state.front;
  let openingFront;
  let warned = false;
  while (state.mode === "playing" && state.t < 150) {
    state.gunX = aim(state);
    const previous = state.support.impacts;
    game.update(1 / hz);
    furthest = Math.max(furthest, state.front);
    if (state.t >= 6) openingFront ??= state.front;
    warned ||= state.danger.flashUntil > state.t;
    if (state.support.impacts > previous) {
      const hit = state.support.impact;
      assert.equal(hit.originX, level.support.x);
      assert.equal(hit.originY, level.support.y);
      assert.equal(hit.x, level.battlefield.width / 2);
      assert.ok(Math.abs(hit.y - hit.originY) <= level.support.range);
      assert.ok(hit.loss >= 0 && hit.loss <= hit.arrows * level.support.damagePerArrow);
    }
  }
  while (state.mode === "victory") game.update(1 / hz);
  assert.notEqual(result, undefined, `${strategy} must finish`);
  assert.equal(state.support.shot, null);
  return { state, result, furthest, openingFront, warned, notices };
}

for (const hz of [30, 60, 120]) {
  test(`The Meowmen rewards sustained support with reinforcement at ${hz} Hz`, () => {
    for (const strategy of ["starter", "final-rush", "support-only"]) {
      const run = simulate(strategy, hz);
      assert.equal(run.result, false, strategy);
      assert.equal(run.warned, true, strategy);
      assert.equal(run.state.finalActivated, false, strategy);
      if (strategy === "support-only") assert.ok(run.state.support.damage > 0);
    }

    const gates = simulate("gates", hz);
    const late = simulate("gates-first", hz);
    const early = simulate("archer-first", hz);
    const balanced = simulate("balanced", hz);
    for (const run of [gates, late, early, balanced]) {
      assert.equal(run.result, true);
      assert.equal(run.state.finalActivated, true);
      assert.equal(run.state.redEntryOpen, false);
    }
    assert.equal(gates.state.support.impacts, 0);
    assert.ok(late.state.support.damage > 0);
    assert.ok(early.openingFront > balanced.openingFront + 30);
    assert.ok(balanced.notices.includes("MEOWMEN ARCHERS READY!"));
    assert.ok(balanced.state.support.impacts >= 50);
    assert.ok(balanced.state.t < gates.state.t - 10);

    // Same cannon decisions, including the shots spent on the crew barricade.
    const inert = simulate("balanced", hz, {
      ...LEVEL_THREE,
      support: { ...LEVEL_THREE.support, damagePerArrow: 0 },
    });
    assert.equal(inert.state.support.damage, 0);
    assert.equal(inert.state.support.unlockedAt, balanced.state.support.unlockedAt);
    assert.ok(balanced.state.t < inert.state.t - 8);
    assert.ok(balanced.furthest < inert.furthest - 20);
  });
}
