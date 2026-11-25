import test from "node:test";
import assert from "node:assert/strict";
import { LEVEL, workNeeded } from "../src/config.js";
import { createBattleClock, createGame } from "../src/game.js";
import { updateProjectiles, fire } from "../src/projectiles.js";
import { createMultipliers } from "../src/multipliers.js";
import { updateArmy } from "../src/army.js";
import { FLAG_CAPTURE_TIME } from "../src/army-movement.js";
import { LEVEL_ONE, LEVEL_TWO, LEVEL_THREE } from "../src/levels.js";
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
  [1, workNeeded[0]],
  [2, workNeeded[1]],
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
for (const mult of [5, 25, 100])
  test(`three cats through ×${mult} produce ${3 * mult} marching cats`, () => {
    const { state: s } = fixture(),
      gate = s.gates.find((g) => g.mult === mult);
    gate.open = true;
    s.gunX = gate.x;
    const { spawnSquad } = createMultipliers(s, noop);
    fire(s, noop);
    updateProjectiles(s, 0.21, spawnSquad, noop, noop);
    assert.equal(s.squads.length, 3);
    assert.equal(
      s.squads.reduce((n, q) => n + q.count, 0),
      3 * mult,
    );
    assert.equal(s.blueTotal, LEVEL_ONE.combat.initialBlue);
  });
test("reinforcements move, render blue cats, then join combat at the front", () => {
  const { state: s } = fixture();
  createMultipliers(s, noop).spawnSquad(s.gates[0], 210);
  s.blueTotal = 0;
  const start = s.squads[0].y;
  const paintedAt = [];
  let y;
  const ctx = new Proxy(
    {},
    {
      get: (_, key) => {
        if (key === "createLinearGradient")
          return () => ({ addColorStop: noop });
        if (key === "translate")
          return (_, screenY) => {
            y = screenY;
          };
        return noop;
      },
      set: (_, key, value) => {
        if (key === "fillStyle" && value === "#379aff") paintedAt.push(y);
        return true;
      },
    },
  );
  const renderer = createRenderer(s, { getContext: () => ctx });
  renderer.draw();
  assert.ok(Math.abs(paintedAt[0] - s.squads[0].entryY) < 1);
  const firstY = paintedAt[0];
  paintedAt.length = 0;

  updateArmy(s, 0.1, noop, noop);
  assert.ok(s.squads[0].y < start);
  assert.equal(s.blueTotal, 0);
  renderer.draw();
  assert.ok(paintedAt[0] < firstY && paintedAt[0] > s.front);

  const expandingY = paintedAt[0];
  paintedAt.length = 0;
  updateArmy(s, 0.15, noop, noop);
  renderer.draw();
  assert.ok(paintedAt[0] < expandingY && paintedAt[0] > s.front);
  assert.equal(s.blueTotal, 0);
  s.squads[0].marchTime = 1;
  s.redTotal = 0;
  s.front = LEVEL.reinforcementCutoff;
  s.squads[0].y = s.front + 18;
  updateArmy(s, 0.02, noop, noop);
  assert.equal(s.squads.length, 0);
  assert.equal(s.blueTotal, 5);
});
test("controlling the supply entrance cuts reinforcements while the remaining horde still fights", () => {
  const game = fixture();
  const s = game.state;
  s.front = LEVEL.reinforcementCutoff + 0.005;
  s.redTotal = 100;
  s.blueTotal = 100;
  game.update(0.02);
  assert.equal(s.mode, "playing");
  assert.equal(s.redEntryOpen, false);
  assert.ok(s.redTotal > 0 && s.redTotal < 100);
  assert.ok(s.blueTotal < 1000);
  assert.equal(s.redEntryRate, 0);

  // A shift in the line after securing the entrance cannot reopen recruitment.
  s.front += 30;
  s.redTotal = 0.1;
  game.update(0.02);
  assert.equal(s.redTotal, 0);
  assert.equal(s.mode, "victory");
  assert.ok(s.front > LEVEL.reinforcementCutoff);
});

test("victory freezes combat on elimination and shows the result after the capture sequence", () => {
  const results = [];
  const game = createGame({ onEnd: (won) => results.push(won) });
  game.reset();
  const s = game.state;
  s.redTotal = 0;
  s.blueTotal = 100;
  game.update(0.01);
  assert.equal(s.mode, "playing");
  assert.ok(s.redTotal > 0);
  s.redEntryOpen = false;
  s.redTotal = 1;
  s.front = LEVEL.reinforcementCutoff - 4;
  game.update(0.15);
  assert.equal(s.mode, "victory");
  assert.equal(s.redTotal, 0);
  const frozen = structuredClone(s);
  game.update(LEVEL.victoryDuration - 0.25);
  assert.equal(s.mode, "victory");
  assert.deepEqual(results, []);
  assert.deepEqual({ ...s, victoryElapsed: 0 }, frozen);
  game.update(0.25);
  assert.equal(s.mode, "end");
  assert.equal(s.front, frozen.front);
  assert.deepEqual(results, [true]);
  game.update(1);
  assert.deepEqual(results, [true]);
});

test("recruitment and combat do not depend on gate access or the ×999 arrival banner", () => {
  const { state: s } = fixture(),
    { state: control } = fixture();
  s.gates[1].open = s.gates[2].open = s.finalActivated = true;
  s.t = control.t = 40;
  s.blueTotal = control.blueTotal = 2000;
  updateArmy(s, 0.02, noop, noop);
  updateArmy(control, 0.02, noop, noop);
  for (const key of ["front", "redTotal", "blueTotal", "redEntryRate"]) {
    assert.equal(s[key], control[key]);
  }
  assert.ok(s.redEntryRate > LEVEL.redReinforcements);
  assert.ok(s.blueTotal < 2000);
});
test("a small red remnant can engage only a small part of the blue army", () => {
  const { state: s } = fixture();
  s.front = LEVEL.reinforcementCutoff;
  s.redTotal = 1;
  s.blueTotal = 10000;
  updateArmy(s, 0.01, noop, noop);
  assert.equal(s.redTotal, 0);
  assert.ok(s.blueTotal < 10000 && s.blueTotal > 9999.99);
});
test("visible formations grow, shrink and disappear with actual troop counts", () => {
  const { state: s } = fixture();
  const paints = { red: 0, blue: 0, final: 0 };
  const ctx = new Proxy(
    {},
    {
      get: (_, key) =>
        key === "createLinearGradient" ? () => ({ addColorStop: noop }) : noop,
      set: (_, key, value) => {
        if (key === "fillStyle" && value === "#df544b") paints.red++;
        if (key === "fillStyle" && value === "#379aff") paints.blue++;
        if (key === "fillStyle" && value === "#83d9ff") paints.final++;
        return true;
      },
    },
  );
  const renderer = createRenderer(s, { getContext: () => ctx });
  renderer.draw();
  const early = paints.red;
  s.redTotal *= 10;
  s.blueTotal = 6000;
  paints.red = 0;
  renderer.draw();
  assert.ok(paints.red > early);
  const peak = paints.red;
  s.redTotal *= 0.4;
  paints.red = 0;
  renderer.draw();
  assert.ok(paints.red < peak && paints.red > early);
  const blue = paints.blue;
  s.redTotal = s.blueTotal = 0;
  paints.red = paints.blue = 0;
  renderer.draw();
  assert.equal(paints.red, 0);
  assert.equal(paints.blue, 0);
  let previous = 0;
  const { spawnSquad } = createMultipliers(s, noop);
  for (const gate of s.gates) {
    s.squads.length = 0;
    paints.blue = paints.final = 0;
    spawnSquad(gate, gate.x);
    renderer.draw();
    const entering = paints.blue + paints.final;
    assert.ok(entering > 0);
    paints.blue = paints.final = 0;
    s.squads[0].marchTime = 0.65;
    renderer.draw();
    const count = paints.blue + paints.final;
    assert.ok(count > entering && count > previous && count < blue);
    previous = count;
  }
});
test("castle breach causes defeat and restart resumes play", () => {
  const results = [],
    game = createGame({ onEnd: (won) => results.push(won) });
  game.reset();
  game.state.front = LEVEL.castleFront;
  game.update(0.01);
  assert.equal(game.state.mode, "end");
  assert.deepEqual(results, [false]);
  game.reset();
  assert.equal(game.state.mode, "playing");
});

test("zero red with supply open can be followed by fresh red arrivals", () => {
  const game = fixture();
  const s = game.state;
  s.front = LEVEL.reinforcementCutoff + 2;
  s.redTotal = 0;
  s.blueTotal = 3000;
  game.update(1 / 60);
  assert.equal(s.redTotal, 0);
  assert.equal(s.redEntryOpen, true);
  assert.equal(s.mode, "playing");
  s.blueTotal = 1;
  game.update(1 / 60);
  assert.ok(s.redTotal > 0);
  assert.equal(s.victoryElapsed, 0);
});

for (const [level, blue, killer] of [
  [LEVEL_ONE, 1, "melee"],
  [LEVEL_ONE, 500000, "melee"],
  [LEVEL_TWO, 15, "artilleryImpact"],
  [LEVEL_THREE, 15, "archerImpact"],
]) {
  test(`${killer} with ${blue} blue starts victory on the decisive tick at 30/60/120 Hz`, () => {
    const runs = [30, 60, 120].map((hz) => {
      const events = [];
      const game = createGame({
        level,
        onEffect: (kind, time) => events.push([kind, time]),
        onEnd: (won) => events.push(["result", won]),
      });
      const clock = createBattleClock(game.update);
      game.reset();
      const s = game.state;
      s.redEntryOpen = false;
      s.front = 98;
      s.redTotal = killer === "melee" ? 0.001 : 5;
      s.blueTotal = blue;
      s.squads.push({ count: 20, y: s.front + LEVEL.arrivalOffset + 2, marchTime: 1 });
      if (s.support) {
        s.support.open = true;
        s.support.shot = { x: 210, y: 96, impactAt: 1 / 60, arrows: 6 };
      }

      while (s.mode === "playing") {
        clock.advance(1 / hz);
        assert.ok(s.t <= 1 / 60);
      }
      assert.equal(s.mode, "victory");
      assert.equal(s.redTotal, 0);
      assert.equal(s.squads.length, 1);
      assert.ok(s.blueTotal > 0);
      assert.equal(s.support?.shot ?? null, null);
      if (s.support) {
        assert.equal(s.support.damage, 5);
        assert.equal(s.support.impacts, 1);
      }
      const frozen = { front: s.front, time: s.t, blue: s.blueTotal, squads: structuredClone(s.squads) };
      assert.deepEqual(events.map(([kind]) => kind), s.support ? [killer, "victory"] : ["victory"]);
      for (let frame = 0; frame < Math.ceil((level.combat.victoryDuration + 0.1) * hz); frame++)
        clock.advance(1 / hz);
      assert.equal(s.mode, "end");
      assert.equal(s.victoryElapsed, level.combat.victoryDuration);
      assert.deepEqual({ front: s.front, time: s.t, blue: s.blueTotal, squads: s.squads }, frozen);
      const tail = events.slice(-2);
      assert.deepEqual(tail, [["flagCapture", s.t + FLAG_CAPTURE_TIME], ["result", true]]);
      assert.equal(events.length, s.support ? 4 : 3);
      return { frozen, events };
    });
    assert.deepEqual(runs[0], runs[1]);
    assert.deepEqual(runs[1], runs[2]);
  });
}

test("restarting or switching levels during the charge cancels its capture and result", () => {
  const events = [];
  const game = createGame({
    onEffect: (kind) => events.push(kind),
    onEnd: () => events.push("result"),
  });
  for (const nextLevel of [LEVEL_ONE, LEVEL_TWO]) {
    game.reset();
    game.state.redTotal = 0;
    game.state.redEntryOpen = false;
    game.update(1 / 60);
    game.update(0.4);
    assert.equal(game.state.mode, "victory");
    game.reset(nextLevel);
    assert.equal(game.state.victoryElapsed, 0);
    assert.equal(game.state.mode, "playing");
    game.update(1 / 60);
    assert.equal(game.state.level, nextLevel);
    assert.equal(game.state.redEntryOpen, true);
  }
  assert.deepEqual(events, ["victory", "victory"]);
});
