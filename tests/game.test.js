import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game.js";
import { updateProjectiles, fire } from "../src/projectiles.js";
import { createMultipliers } from "../src/multipliers.js";
import { updateArmy } from "../src/army.js";
import { createRenderer } from "../src/render.js";
const noop = () => {};
function fixture() {
  const game = createGame();
  game.reset();
  return game;
}
function advance(game, seconds) {
  for (let i = 0; i < Math.round(seconds / 0.01); i++) game.update(0.01);
}
test("startup and restart restore all mutable gameplay state", () => {
  const game = createGame();
  assert.equal(game.state.mode, "menu");
  game.update(1);
  assert.equal(game.state.t, 0);
  game.reset();
  const expected = structuredClone(game.state);
  advance(game, 3);
  game.state.gates[2].open = true;
  game.state.work[1] = 126;
  game.state.mode = "end";
  game.reset();
  assert.deepEqual(game.state, expected);
  const other = createGame();
  assert.notEqual(game.state.gates, other.state.gates);
});
test("automatic fire produces three projectiles per .28 second volley without input", () => {
  const game = fixture();
  game.update(0.09);
  assert.equal(game.state.shots.length, 0);
  game.update(0.02);
  assert.equal(game.state.shots.length, 3);
  assert.deepEqual(
    game.state.shots.map((s) => s.x),
    [201, 210, 219],
  );
  advance(game, 0.28);
  assert.equal(game.state.shots.length, 3);
  assert.equal(game.state.squads.length, 3);
});
test("barricades require direct crossing cannon hits; time, marching cats and misses cannot damage them", () => {
  const game = fixture(),
    s = game.state;
  s.gunX = 150;
  s.squads.push({ x: 90, y: 550, count: 99, mult: 99, phase: 0 });
  advance(game, 1);
  assert.deepEqual(s.work, [0, 0]);
  s.shots = [{ x: 90, y: 560 }];
  game.update(0.01);
  assert.equal(s.work[0], 0);
  game.update(0.045);
  assert.equal(s.work[0], 1);
  assert.equal(s.shots.length, 0);
  assert.equal(s.gates[1].open, false);
});
for (const [index, needed] of [
  [1, 54],
  [2, 126],
])
  test(`gate ${index} opens on hit ${needed} with no soldiers from blocked shots`, () => {
    const { state: s } = fixture();
    for (let i = 0; i < needed; i++) {
      s.shots.push({ x: s.gates[index].x, y: 546 });
      updateProjectiles(
        s,
        0.01,
        () => assert.fail("blocked shot multiplied"),
        noop,
        noop,
      );
      assert.equal(s.gates[index].open, i === needed - 1);
    }
    assert.equal(s.work[index - 1], needed);
  });
for (const mult of [20, 99, 999])
  test(`three cats through ×${mult} produce ${3 * mult} marching cats`, () => {
    const { state: s } = fixture(),
      gate = s.gates.find((g) => g.mult === mult);
    gate.open = true;
    s.gunX = gate.x;
    const { spawnSquad } = createMultipliers(s, noop, noop);
    fire(s, noop);
    updateProjectiles(s, 0.21, spawnSquad, noop, noop);
    assert.equal(s.squads.length, 3);
    assert.equal(
      s.squads.reduce((n, q) => n + q.count, 0),
      3 * mult,
    );
    assert.equal(s.blueTotal, 0);
  });
test("reinforcements move, render blue cats, then join combat at the front", () => {
  const { state: s } = fixture();
  createMultipliers(s, noop, noop).spawnSquad(s.gates[0], 210);
  const start = s.squads[0].y;
  updateArmy(s, 0.1, noop, noop);
  assert.ok(s.squads[0].y < start);
  assert.equal(s.blueTotal, 0);
  let bluePaints = 0;
  const ctx = new Proxy(
    {},
    {
      get: (_, key) =>
        key === "createLinearGradient" ? () => ({ addColorStop: noop }) : noop,
      set: (_, key, value) => {
        if (key === "fillStyle" && value === "#379aff") bluePaints++;
        return true;
      },
    },
  );
  createRenderer(s, { getContext: () => ctx }).draw();
  assert.ok(bluePaints > 0);
  s.squads[0].y = s.front + 18;
  s.redTotal = 0;
  s.finalActivated = true;
  updateArmy(s, 0.02, noop, noop);
  assert.equal(s.squads.length, 0);
  assert.equal(s.blueTotal, 20);
});
test("victory requires final gate activation, enemy elimination and clearing the front", () => {
  const results = [],
    game = createGame({ onEnd: (won) => results.push(won) });
  game.reset();
  const s = game.state;
  s.redTotal = 0;
  s.front = 29;
  game.update(0.01);
  assert.equal(s.mode, "playing");
  s.finalActivated = true;
  s.redTotal = 1;
  s.front = 50;
  game.update(0.01);
  assert.equal(s.mode, "playing");
  s.redTotal = 0;
  game.update(0.01);
  assert.equal(s.mode, "playing");
  s.front = 29;
  game.update(0.01);
  assert.equal(s.mode, "end");
  assert.deepEqual(results, [true]);
  game.update(1);
  assert.deepEqual(results, [true]);
});
test("castle breach causes defeat and restart resumes play", () => {
  const results = [],
    game = createGame({ onEnd: (won) => results.push(won) });
  game.reset();
  game.state.front = 689.99;
  game.update(0.01);
  assert.equal(game.state.mode, "end");
  assert.deepEqual(results, [false]);
  game.reset();
  assert.equal(game.state.mode, "playing");
});
