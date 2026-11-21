import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game.js";
import { createState } from "../src/state.js";
import { createFigures } from "../src/figures.js";
import { LEVEL_ONE, LEVEL_TWO } from "../src/levels.js";
import { createMotion } from "../src/motion.js";
import {
  mergeProgress, receivingY, victoryAdvance, victoryWaveVisibility,
} from "../src/army-movement.js";

const wave = (mult, x = 210) => ({
  x, y: 351, entryY: 565, slot: 0, phase: 2, count: mult, mult, marchTime: 1.74,
});

function renderProbe() {
  const draws = [];
  const atlas = new Proxy({}, { get: () => () => {} });
  const ctx = {
    globalAlpha: 1,
    drawImage(canvas, sx, sy, sw, sh, x, y, width, height) {
      draws.push({ x: x + width / 2, y: y + height / 2, alpha: this.globalAlpha });
    },
  };
  const figures = createFigures(ctx, { createElement: () => ({ getContext: () => atlas }) });
  return {
    blue(state, motion) {
      draws.length = 0;
      figures.setClock(state.t + state.victoryElapsed);
      figures.blueArmy(state, 0, motion.contact, motion.tails);
      return draws.slice();
    },
    red(state, motion) {
      draws.length = 0;
      figures.redArmy(state, motion.contact, motion.impact);
      return draws.slice();
    },
  };
}

function step(motion, state, time) {
  motion.step(time, 0, state.blueTotal, state.redEntryOpen, state.level, state);
}

test("the march eases into the receiving edge without crossing the live front", () => {
  let previous = receivingY(565, 430, 335, 565);
  assert.equal(previous, 565);
  for (let y = 564; y >= 190; y--) {
    const next = receivingY(y, 430, 335, 565);
    assert.ok(next <= previous && previous - next <= 1.001 && next >= 344);
    previous = next;
  }
  assert.equal(mergeProgress(0), 0);
  assert.equal(mergeProgress(0.34), 1);
});

test("a small volley draws continuously at the arrival frame and gives each claimed slot one owner", () => {
  const state = createState();
  state.mode = "playing";
  state.blueTotal = 44;
  state.t = 2;
  const motion = createMotion();
  const probe = renderProbe();
  step(motion, state, 2);
  const incoming = wave(20);
  state.squads.push(incoming);
  const before = probe.blue(state, motion).slice(-3);

  state.squads.length = 0;
  state.blueTotal += incoming.count;
  motion.receive("arrival", state.t, incoming, state.front);
  step(motion, state, 2);
  const after = probe.blue(state, motion).slice(-3);
  assert.deepEqual(after, before);
  const tail = motion.tails[0];
  assert.equal(tail.join.field, 44);
  assert.equal(tail.join.fieldCount, 3);

  let previous = 44;
  for (let i = 1; i <= 37; i++) {
    state.t = 2 + i / 60;
    step(motion, state, state.t);
    const drawn = probe.blue(state, motion);
    assert.ok(motion.contact.blueArmy.field >= previous);
    assert.ok(motion.contact.blueArmy.field <= state.blueTotal);
    previous = motion.contact.blueArmy.field;
    if (i === 10) {
      assert.equal(tail.painted, 7);
      assert.ok(drawn.length <= 64);
    }
  }
  assert.equal(state.blueTotal, 64);
});

test("a receiving slot beyond an obstructed gate uses a complementary fade", () => {
  const state = createState();
  state.mode = "playing";
  state.front = 536;
  state.blueTotal = 44;
  state.t = 2;
  const motion = createMotion();
  const probe = renderProbe();
  step(motion, state, state.t);
  probe.blue(state, motion);

  const q = { ...wave(20, 329), marchTime: 0.25 };
  state.blueTotal += q.count;
  motion.receive("arrival", state.t, q, state.front);
  step(motion, state, state.t);
  const tail = motion.tails[0];
  for (let i = 1; i <= 23; i++) {
    state.t = 2 + i / 60;
    step(motion, state, state.t);
    probe.blue(state, motion);
  }
  assert.ok(tail.join.remote & 1);
  assert.ok(tail.join.started[0] >= 2.26);
});

test("overlapping ×99 and ×999 handoffs stay bounded and reset when leaving a level", () => {
  const motion = createMotion();
  const state = createState();
  state.mode = "playing";
  state.blueTotal = 1000;
  step(motion, state, 0);
  for (let i = 0; i < 28; i++) {
    const q = wave(i % 2 ? 99 : 999, i % 2 ? 90 : 329);
    state.blueTotal += q.count;
    motion.receive("arrival", 0.1, q, state.front);
  }
  step(motion, state, 0.1);
  const occupied = new Set();
  assert.ok(motion.tails.length <= 12);
  for (const { join } of motion.tails) {
    assert.ok(join.fieldCount + join.reserveCount <= 24);
    for (const [prefix, start, length] of [
      ["f", join.field, join.fieldCount], ["r", join.reserve, join.reserveCount],
    ]) {
      for (let i = start; i < start + length; i++) {
        assert.ok(!occupied.has(prefix + i));
        occupied.add(prefix + i);
      }
    }
  }
  motion.reset();
  assert.equal(motion.tails.length, 0);
  assert.equal(motion.contact.supportFront, null);
  assert.equal(motion.contact.blueArmy.population, null);
});

for (const level of [LEVEL_ONE, LEVEL_TWO]) {
  test(`${level.title} advances in presentation immediately after authoritative victory`, () => {
    const motion = createMotion();
    const game = createGame({ level, onEffect: motion.receive });
    game.reset();
    const { state } = game;
    state.front = 85;
    state.blueTotal = 2000;
    state.redTotal = 1;
    state.redEntryOpen = false;
    if (state.support) {
      state.support.open = true;
      state.support.shot = { impactAt: 0.8 };
    }
    step(motion, state, 0);
    game.update(1 / 60);
    step(motion, state, state.t);
    const stand = { front: state.front, time: state.t, blue: state.blueTotal };
    const probe = renderProbe();
    const firstY = Math.min(...probe.blue(state, motion).map((d) => d.y));
    const duration = level.combat.victoryDuration;
    assert.equal(state.mode, "victory");
    assert.equal(state.redTotal, 0);
    assert.equal(motion.contact.foughtAt, -Infinity);
    if (state.support) assert.equal(state.support.shot, null);
    let previous = 0;
    for (let i = 1; i <= 90; i++) {
      game.update(1 / 60);
      step(motion, state, state.t + state.victoryElapsed);
      const ahead = victoryAdvance(stand.front, state.victoryElapsed, duration);
      assert.ok(ahead >= previous && ahead - previous < 2.1);
      if (i === 1) assert.ok(ahead > 0);
      if (i === 45) {
        assert.ok(ahead > level.combat.blueAdvance * 0.75);
        assert.ok(victoryAdvance(stand.front, state.victoryElapsed, duration, 1) < ahead);
        assert.ok(Math.min(...probe.blue(state, motion).map((d) => d.y)) < firstY - 20);
        assert.deepEqual(probe.red(state, motion), []);
      }
      previous = ahead;
      assert.deepEqual({ front: state.front, time: state.t, blue: state.blueTotal }, stand);
      assert.equal(state.redTotal, 0);
      assert.equal(state.support?.impacts ?? 0, 0);
    }
    game.update(0.01);
    assert.equal(state.mode, "end");
    assert.ok(stand.front - previous < 23);
    assert.equal(victoryWaveVisibility(duration, duration), 0);
    motion.reset();
    game.reset(LEVEL_ONE);
    assert.equal(state.victoryElapsed, 0);
    assert.equal(motion.contact.foughtAt, -1);
  });
}
