import test from "node:test";
import assert from "node:assert/strict";
import { simulate } from "./helpers/strategies.js";
import { LEVEL } from "../src/config.js";

for (const hz of [30, 60, 120]) {
  test(`escalation and strategic outcomes at ${hz} Hz`, () => {
    const dt = 1 / hz;
    const a = simulate("A", { dt });
    const b = simulate("B", { dt });
    const intermediate = simulate("99", { dt });

    assert.equal(a.won, false);
    assert.ok(a.state.front >= LEVEL.castleFront);
    assert.deepEqual(a.state.work, [0, 0]);
    assert.equal(a.activation, null);
    assert.ok(a.samples.some((s) => s.front < LEVEL.initialFront - 30));
    const stalemate = a.samples.find((s) => s.time >= 22);
    const next = a.samples.find((s) => s.time > stalemate.time);
    assert.ok(Math.abs(next.front - stalemate.front) < 2);
    assert.ok(a.red > stalemate.red * 2);
    assert.deepEqual(
      a.reversals.map((r) => r.toward),
      ["entry", "castle"],
    );

    assert.equal(b.won, false);
    assert.ok(b.state.gates[2].open);
    assert.equal(b.activation, null);
    assert.ok(b.seconds < a.seconds);
    assert.equal(simulate("Rush", { dt }).won, false);

    assert.equal(intermediate.won, false);
    const [gate99] = intermediate.milestones;
    const relieved = intermediate.samples.find(
      (s) => s.time > gate99.time && s.front < gate99.front - 100,
    );
    assert.ok(relieved, "arrived ×99 troops reverse the retreat");
    assert.ok(
      intermediate.red > relieved.red * 2,
      "the horde eventually overwhelms ×99",
    );
    assert.ok(
      intermediate.reversals.some(
        (r) => r.time > relieved.time && r.toward === "castle",
      ),
    );

    for (const policy of ["C", "D"]) {
      const result = simulate(policy, { dt });
      const [left, right] = result.milestones;
      assert.equal(result.won, true);
      assert.ok(result.seconds >= 60 && result.seconds <= 120);
      assert.equal(result.red, 0);
      assert.ok(result.state.front <= LEVEL.clearedFront);
      assert.ok(result.furthest < LEVEL.castleFront - 30);
      assert.deepEqual([left.gate, right.gate], [99, 999]);
      assert.ok(
        result.activation > right.time,
        "×999 must travel before joining",
      );
      assert.ok(result.pushback > 300);
      assert.ok(
        result.reversals.some(
          (r) =>
            r.time > left.time && r.time < right.time && r.toward === "entry",
        ),
      );
      assert.ok(
        result.reversals.some(
          (r) =>
            r.time > left.time && r.time < right.time && r.toward === "castle",
        ),
      );
      assert.ok(
        result.reversals.some(
          (r) => r.time > right.time && r.toward === "entry",
        ),
      );
      const finalBattle = result.samples.filter(
        (s) => s.time >= result.activation + 4,
      );
      assert.ok(finalBattle[0].red > 0);
      assert.ok(
        finalBattle.some(
          (s) =>
            s.front < finalBattle[0].front - 150 &&
            s.red < finalBattle[0].red / 2,
        ),
      );
    }
  });
}

test("balanced play tolerates modest aiming errors and decision delays", () => {
  for (const aimOffset of [-20, 0, 20]) {
    assert.equal(simulate("A", { aimOffset }).won, false);
    assert.equal(simulate("B", { aimOffset }).won, false);
    for (const delay of [0, 1, 2]) {
      assert.equal(simulate("C", { aimOffset, delay }).won, true);
      assert.equal(simulate("D", { aimOffset, delay }).won, true);
    }
  }
});
