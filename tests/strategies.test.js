import test from "node:test";
import assert from "node:assert/strict";
import { simulate } from "./helpers/strategies.js";
import { createGame } from "../src/game.js";
import { LEVEL } from "../src/config.js";
for (const dt of [1 / 30, 1 / 60, 1 / 120])
  test(`three strategies at ${1 / dt} Hz`, () => {
    const a = simulate("A", { dt }),
      b = simulate("B", { dt }),
      c = simulate("C", { dt });
    assert.equal(a.won, false);
    assert.equal(a.state.front >= LEVEL.castleFront, true);
    assert.deepEqual(a.state.work, [0, 0]);
    assert.equal(a.activation, null);
    const undefended = createGame();
    undefended.reset();
    undefended.state.gunX = 150;
    while (undefended.state.mode === "playing") undefended.update(dt);
    assert.ok(a.seconds > undefended.state.t + 30, "×20 must buy real time");
    for (const r of [b, c]) {
      assert.equal(r.won, true);
      assert.ok(r.seconds >= 60 && r.seconds <= 120);
      assert.equal(r.red, 0);
      assert.ok(r.state.front <= LEVEL.clearedFront);
      assert.ok(r.pushback > 250);
      assert.deepEqual(
        r.milestones.map((m) => m.gate),
        [99, 999],
      );
      assert.ok(
        r.activation > r.milestones[1].time,
        "counterattack begins after troops travel",
      );
    }
    assert.ok(
      c.furthest < b.furthest - 20,
      "balanced defense protects more castle distance",
    );
  });
test("balanced defense survives a late decision that defeats aggressive unlocking", () => {
  for (const dt of [1 / 30, 1 / 60, 1 / 120]) {
    assert.equal(simulate("B", { dt, delay: 80 }).won, false);
    assert.equal(simulate("C", { dt, delay: 80 }).won, true);
  }
});
test("modest aim errors and decision delays preserve all intended outcomes", () => {
  for (const aimOffset of [-20, 0, 20])
    for (const delay of [0, 5, 10]) {
      assert.equal(simulate("A", { aimOffset, delay }).won, false);
      for (const strategy of ["B", "C"])
        assert.equal(simulate(strategy, { aimOffset, delay }).won, true);
    }
});
