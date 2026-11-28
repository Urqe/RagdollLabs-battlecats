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
    assert.ok(a.samples.some((s) => s.front < LEVEL.initialFront - 10));
    const stalemate = a.samples.find((s) => s.time >= 22);
    const next = a.samples.find((s) => s.time > stalemate.time);
    assert.ok(Math.abs(next.front - stalemate.front) < 4);
    assert.ok(a.red > stalemate.red * 2);
    assert.deepEqual(
      a.reversals.map((r) => r.toward),
      ["entry", "castle"],
    );

    assert.equal(b.won, true);
    assert.ok(b.state.gates[2].open);
    assert.ok(b.activation > b.milestones[1].time);
    assert.ok(b.furthest > LEVEL.initialFront + 100);
    assert.equal(simulate("Rush", { dt }).won, false);

    assert.equal(intermediate.won, true);
    const [gate99] = intermediate.milestones;
    const relieved = intermediate.samples.find(
      (s) => s.time > gate99.time && s.front < gate99.front - 100,
    );
    assert.ok(relieved, "arrived ×99 troops reverse the retreat");
    assert.equal(intermediate.activation, null);
    assert.equal(intermediate.red, 0);

    for (const policy of ["C", "D"]) {
      const result = simulate(policy, { dt });
      const [left, right] = result.milestones;
      assert.equal(result.won, true);
      assert.ok(result.seconds >= 60 && result.seconds <= 120);
      assert.equal(result.red, 0);
      assert.ok(result.samples.some(s => s.red > 15000 && s.blue > 10000));
      assert.equal(result.state.mode, "victory");
      assert.equal(result.state.redEntryOpen, false);
      assert.ok(result.cutoff > result.activation);
      assert.ok(result.cutoff <= result.seconds);
      assert.ok(result.furthest < LEVEL.castleFront - 30);
      assert.deepEqual([left.gate, right.gate], [25, 100]);
      assert.ok(
        result.activation > right.time,
        "×100 must travel before joining",
      );
      assert.ok(result.pushback > 250);
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
    assert.equal(simulate("Rush", { aimOffset }).won, false);
    for (const delay of [0, 1, 2]) {
      assert.equal(simulate("C", { aimOffset, delay }).won, true);
      assert.equal(simulate("D", { aimOffset, delay }).won, true);
    }
  }
});
