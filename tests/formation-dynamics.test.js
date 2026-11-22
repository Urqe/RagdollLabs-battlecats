import assert from "node:assert/strict";
import test from "node:test";
import { LEVEL_ONE } from "../src/levels.js";
import { breakthroughOffset, createFormationDynamics, formationLag } from "../src/formation-dynamics.js";

function record(hz) {
  const { pose, step } = createFormationDynamics();
  const frames = [];
  for (let i = 0; i <= hz * 3; i++) {
    const time = i / hz;
    const front = 300 + Math.min(1, Math.max(0, time - 1)) * 32 - Math.max(0, time - 2) * 40;
    step(time, front, LEVEL_ONE, true, 0.2, 0.3, 0.9);
    if (i % (hz / 30) === 0) {
      frames.push({
        front,
        compression: pose.compression,
        opening: pose.opening,
        ranks: [0, 1 / 3, 2 / 3, 1].map((depth) => front + formationLag(pose, front, depth)),
      });
    }
  }
  return frames;
}

test("the same observed battle produces byte-identical motion at 30, 60 and 120 Hz", () => {
  assert.deepEqual(record(30), record(60));
  assert.deepEqual(record(30), record(120));
});

test("retreat and counterattack first move the lead, then the supporting ranks", () => {
  const frames = record(120);
  const recoil = frames[35].ranks;
  assert.ok(recoil[0] > recoil[1] && recoil[1] > recoil[2] && recoil[2] > recoil[3]);
  for (let rank = 0; rank < 4; rank++) {
    const reversal = frames.findIndex(({ ranks }, i) => i > 60 && ranks[rank] < frames[i - 1].ranks[rank]);
    const prior = rank ? frames.findIndex(({ ranks }, i) => i > 60 && ranks[rank - 1] < frames[i - 1].ranks[rank - 1]) : 60;
    assert.ok(reversal > prior);
  }
  frames.slice(1).forEach(({ front, ranks }, i) => ranks.forEach((y, rank) => {
    assert.ok(Math.abs(y - front) <= 18);
    assert.ok(Math.abs(y - frames[i].ranks[rank]) < 3);
  }));
});

test("local openings are bounded, share the winning direction and fade by the sixth rank", () => {
  for (let i = 0; i < 600; i++) {
    const time = i / 120;
    for (let x = 130; x <= 290; x += 5) {
      for (const pressure of [-1, 0, 1]) {
        for (const red of [true, false]) {
          const near = breakthroughOffset(time, x, 0, pressure, red);
          const behind = breakthroughOffset(time, x, 4, pressure, red);
          assert.ok(Math.abs(near) <= 15);
          assert.ok(near * pressure <= 0);
          assert.ok(Math.abs(behind) <= Math.abs(near));
          assert.equal(breakthroughOffset(time, x, 6, pressure, red), 0);
          if (!pressure) assert.equal(near, 0);
          if (i) assert.ok(Math.abs(near - breakthroughOffset(time - 1 / 120, x, 0, pressure, red)) < 0.7);
        }
      }
    }
  }
});
