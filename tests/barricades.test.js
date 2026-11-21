import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game.js";
import { barrierStatus } from "../src/barricades.js";
import { updateProjectiles } from "../src/projectiles.js";
import { createMultipliers } from "../src/multipliers.js";
import { updateArmy } from "../src/army.js";
import { createRenderer } from "../src/render.js";
import { workNeeded } from "../src/config.js";
const noop = () => {};
function fixture() {
  const game = createGame();
  game.reset();
  return game;
}
test("independent barriers, open gates and marching armies cannot cross-damage wood", () => {
  const { state: s } = fixture();
  s.shots = [{ x: 90, y: 546 }];
  updateProjectiles(s, 0.01, noop, noop, noop);
  assert.deepEqual(s.work, [1, 0]);
  s.shots = [{ x: 329, y: 546 }];
  updateProjectiles(s, 0.01, noop, noop, noop);
  assert.deepEqual(s.work, [1, 1]);
  s.gates[1].open = true;
  s.work[0] = workNeeded[0];
  for (const x of [90, 210]) {
    s.shots = [{ x, y: 566 }];
    updateProjectiles(s, 0.01, noop, noop, noop);
  }
  assert.deepEqual(s.work, [workNeeded[0], 1]);
  s.squads = [{ x: 329, y: 550, count: 999, mult: 999, phase: 0 }];
  updateArmy(s, 1, noop, noop);
  assert.deepEqual(s.work, [workNeeded[0], 1]);
});
test("visible wood, HUD progress and state change together on the final hit", () => {
  const { state: s } = fixture();
  s.work[0] = workNeeded[0] - 1;
  const labels = [],
    ctx = new Proxy(
      {},
      {
        get: (_, key) =>
          key === "createLinearGradient"
            ? () => ({ addColorStop: noop })
            : key === "fillText"
              ? (text) => labels.push(text)
              : noop,
        set: () => true,
      },
    );
  const renderer = createRenderer(s, { getContext: () => ctx });
  renderer.draw();
  assert.ok(labels.includes(barrierStatus(s, 0).label));
  assert.ok(labels.includes("SHOOT TO BREAK"));
  s.shots = [{ x: 90, y: 546 }];
  updateProjectiles(s, 0.01, noop, noop, noop);
  assert.deepEqual(barrierStatus(s, 0), {
    progress: 1,
    remaining: 0,
    open: true,
    label: "OPEN",
  });
  labels.length = 0;
  renderer.draw();
  assert.ok(labels.includes("×99"));
  assert.equal(
    labels.filter((t) => t === "SHOOT TO BREAK").length,
    1,
    "only ×999 wood remains",
  );
});
test("marching ×999 cats do not activate combat or affect frontline before arrival", () => {
  const game = fixture(),
    s = game.state;
  const control = fixture();
  createMultipliers(s, noop).spawnSquad(s.gates[2], 329);
  game.update(0.01);
  control.update(0.01);
  assert.equal(s.finalActivated, false);
  assert.equal(s.blueTotal, 0);
  assert.equal(s.front, control.state.front);
  assert.equal(s.redTotal, control.state.redTotal);
  s.front = 600;
  s.squads[0].y = 532;
  game.update(0.1);
  assert.equal(
    s.finalActivated,
    false,
    "even an advanced horde must allow visible marching",
  );
  game.update(0.15);
  assert.equal(s.finalActivated, true);
  assert.ok(s.blueTotal > 900);
});
test("opening wood mid-volley consumes every sibling exactly once", () => {
  const { state: s } = fixture();
  s.work[0] = workNeeded[0] - 1;
  s.shots = [
    { x: 81, y: 546 },
    { x: 90, y: 546 },
    { x: 99, y: 546 },
  ];
  let generated = 0;
  updateProjectiles(s, 0.01, () => generated++, noop, noop);
  assert.equal(s.work[0], workNeeded[0]);
  assert.equal(s.shots.length, 0);
  assert.equal(generated, 2);
  updateProjectiles(s, 1, () => generated++, noop, noop);
  assert.equal(generated, 2);
});
