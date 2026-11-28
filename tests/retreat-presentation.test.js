import assert from "node:assert/strict";
import test from "node:test";
import { LEVEL_ONE, LEVEL_TWO, LEVEL_THREE, LEVEL_FOUR, LEVEL_FIVE } from "../src/levels.js";
import { createMotion } from "../src/motion.js";
import { gateGroundEdge, retreatProjection } from "../src/retreat-presentation.js";
import { createState } from "../src/state.js";

test("a retreat preserves the upper battlefield and reaches the first gate footprint on the defeat tick", () => {
  for (const level of [LEVEL_ONE, LEVEL_TWO, LEVEL_THREE, LEVEL_FIVE]) {
    const { boundary, front, position } = retreatProjection(level);
    const castle = level.objective.castleFront;
    assert.equal(boundary, Math.min(...level.gates.map(gateGroundEdge)));
    assert.equal(front(level.combat.initialFront), level.combat.initialFront);
    assert.equal(front(level.objective.reinforcementCutoff), level.objective.reinforcementCutoff);
    assert.equal(front(castle - 0.01) < boundary, true);
    assert.equal(front(castle), boundary);
    assert.equal(front(castle + 0.3), boundary);
    let previousSpeed = 1;
    for (let y = 51; y <= castle; y++) {
      const speed = front(y) - front(y - 1);
      assert.ok(speed > 0 && speed <= previousSpeed + 1e-9);
      assert.ok(previousSpeed - speed < 0.003);
      previousSpeed = speed;
    }
    assert.ok(Math.abs(position(castle + 0.01) - 2 * boundary + position(castle - 0.01)) < 1e-6);
    // The advancing army traverses the exact same positions in reverse.
    const raw = [342, 408, 524, 637, castle - 1];
    assert.deepEqual(raw.map(front), [...raw].reverse().map(front).reverse());
  }
  assert.equal(retreatProjection(LEVEL_FOUR).front(690), 690);
});

test("artillery, Pawtorian impacts, and archer aims use the same screen space as the frontline", () => {
  const motion = createMotion();
  const state = createState(LEVEL_FIVE);
  state.mode = "playing";
  state.front = 659;
  motion.step(1, 10, state.blueTotal, true, state.level, state);
  const { position, boundary } = retreatProjection(state.level);
  motion.receive("artilleryImpact", 1, {
    x: 210, y: 630, at: 1, loss: 35, damageBudget: 235,
    armor: { lead: 650, loss: 30, remaining: 300, population: 1500 },
  });
  assert.equal(motion.impact.y, position(630));
  assert.ok(motion.airborne.active.some(cat => cat.armored && cat.y < boundary));
  motion.reset();
  const archers = createState(LEVEL_THREE);
  archers.mode = "playing";
  archers.front = 659;
  motion.step(1, 10, archers.blueTotal, true, archers.level, archers);
  motion.receive("archerLaunch", 1, { x: 210, y: 630, arrows: 6, launchedAt: 1 });
  motion.step(1.1, 10, archers.blueTotal, true, archers.level, archers);
  assert.equal(motion.archers.launch.y, position(630));
  assert.ok(motion.archers.launch.points.every(point => point.y < boundary));
});
