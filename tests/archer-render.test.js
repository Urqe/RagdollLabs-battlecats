import assert from "node:assert/strict";
import test from "node:test";
import { archerPose, arrowPosition, drawArcherVolley } from "../src/archer-render.js";
import { activateArtillery, updateArtillery } from "../src/artillery.js";
import { ARCHER_SUPPORT, LEVEL_TWO } from "../src/levels.js";
import { createMotion } from "../src/motion.js";
import { resetState } from "../src/state.js";

const level = { ...LEVEL_TWO, support: ARCHER_SUPPORT };

function fixture() {
  const state = {};
  resetState(state, level);
  const motion = createMotion();
  state.support.open = true;
  activateArtillery(state);
  function tick(time) {
    state.t = time;
    updateArtillery(state, motion.receive);
    motion.step(time, 0, state.blueTotal, state.redEntryOpen, level, state);
  }
  return { state, motion, tick };
}

test("crew draws toward the deadline and releases and recovers on the scheduled launch", () => {
  const { state, motion, tick } = fixture();
  const { readyAt } = state.support;
  assert.deepEqual(archerPose(0, readyAt, null), { draw: 0, release: 0 });
  assert.ok(archerPose(readyAt - 0.08, readyAt, null).draw > 0.5);
  tick(readyAt);
  const { launch } = motion.archers;
  assert.deepEqual(launch, state.support.shot);
  assert.deepEqual(archerPose(readyAt, readyAt, launch), { draw: 0, release: 1 });
  assert.deepEqual(archerPose(readyAt + 0.2, readyAt, launch), { draw: 0, release: 0 });
});

test("the fan interpolates between real event coordinates with a bounded number of arrows", () => {
  const { motion, tick } = fixture();
  tick(0.6);
  const { launch } = motion.archers;
  for (const fan of [-27.5, 0, 27.5]) {
    const start = arrowPosition(launch, launch.launchedAt, fan);
    const end = arrowPosition(launch, launch.impactAt, fan);
    assert.deepEqual([start.x, start.y], [launch.originX, launch.originY]);
    assert.deepEqual([end.x, end.y], [launch.x, launch.y]);
  }
  const middle = (launch.launchedAt + launch.impactAt) / 2;
  assert.ok(arrowPosition(launch, middle, -27.5).x < arrowPosition(launch, middle, 27.5).x);

  const positions = [];
  const context = new Proxy({ translate: (...point) => positions.push(point) }, {
    get: (target, key) => target[key] ?? (() => {}),
  });
  drawArcherVolley(context, middle, { ...launch, arrows: 12 }, null);
  assert.equal(positions.length, 6);
  positions.length = 0;
  drawArcherVolley(context, launch.impactAt, launch, null);
  assert.equal(positions.length, 0);
});

test("misses retain their impact without adding casualties, and a later hit uses its own event", () => {
  const { state, motion, tick } = fixture();
  tick(0.6);
  const front = state.front;
  state.front += 150;
  const red = state.redTotal;
  tick(0.8);
  assert.equal(motion.archers.impact.loss, 0);
  assert.equal(state.redTotal, red);
  assert.equal(motion.falls.length, 0);
  const tips = [];
  const context = new Proxy({ translate: (...point) => tips.push(point) }, {
    get: (target, key) => target[key] ?? (() => {}),
  });
  drawArcherVolley(context, 0.81, motion.archers.launch, motion.archers.impact);
  assert.deepEqual(tips, Array.from({ length: 6 }, () => [motion.archers.impact.x, motion.archers.impact.y]));

  state.front = front;
  tick(1.4);
  assert.equal(motion.archers.launch.launchedAt, 1.4);
  tick(1.6);
  assert.equal(motion.archers.impact.loss, 48);
  assert.equal(state.redTotal, red - 48);
});

test("victory, defeat and reset discard presentation data", () => {
  for (const mode of ["victory", "end", "reset"]) {
    const { state, motion, tick } = fixture();
    tick(0.6);
    tick(0.8);
    tick(1.4);
    assert.ok(motion.archers.launch);
    assert.ok(motion.archers.impact);
    if (mode === "reset") motion.reset();
    else {
      state.mode = mode;
      tick(1.45);
    }
    assert.deepEqual(motion.archers, { launch: null, impact: null });
  }
});
