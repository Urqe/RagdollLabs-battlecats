import test from "node:test";
import assert from "node:assert/strict";
import { armyScale } from "../src/army-visual.js";
import {
  createArmyPresentation,
  stepArmyPresentation,
} from "../src/army-continuity.js";
import { createFigures } from "../src/figures.js";
import { createMotion } from "../src/motion.js";
import { createState } from "../src/state.js";

for (const hz of [30, 60, 120]) {
  test(`arrivals grow progressively and depleted ranks converge at ${hz} Hz`, () => {
    const army = createArmyPresentation();
    const dt = 1 / hz;
    stepArmyPresentation(army, 20, 0);
    assert.equal(army.field, 20);
    assert.equal(army.reserve, 0);
    const target = armyScale(3020);
    let visible = 20;
    for (let i = 0; i < Math.ceil(hz * 1.15); i++) {
      stepArmyPresentation(army, 3020, dt);
      const next = army.field + army.reserve;
      assert.ok(next >= visible && army.field <= target.field && army.reserve <= target.reserve);
      assert.ok(next - visible < 60);
      visible = next;
    }
    assert.ok(visible > (target.field + target.reserve) * 0.9);

    stepArmyPresentation(army, 200000, 2.5);
    const before = army.reserve;
    const remaining = armyScale(150000);
    stepArmyPresentation(army, 150000, dt);
    assert.equal(army.reserve, remaining.reserve);
    assert.ok(army.reserveExtent >= before);
    for (let i = 0; i < Math.ceil(hz * 1.15); i++) {
      const extent = army.reserveExtent;
      stepArmyPresentation(army, 150000, dt);
      assert.ok(army.reserveExtent <= extent && army.reserveExtent >= remaining.reserve);
    }
    assert.equal(army.reserveExtent, remaining.reserve);
  });
}

test("literal threshold keeps living slots and catastrophic loss quickly clears fallen slots", () => {
  const army = createArmyPresentation();
  stepArmyPresentation(army, 99, 0);
  stepArmyPresentation(army, 100, 1 / 60);
  assert.equal(army.field, 100);
  stepArmyPresentation(army, 105, 1 / 60);
  assert.ok(army.field >= 100 && army.field <= armyScale(105).field);
  stepArmyPresentation(army, 200000, 3);
  const former = army.fieldExtent + army.reserveExtent;
  stepArmyPresentation(army, 0, 1 / 60);
  assert.equal(army.field + army.reserve, 0);
  assert.ok(army.fieldExtent + army.reserveExtent >= former - 1);
  for (let i = 0; i < 36; i++) stepArmyPresentation(army, 0, 1 / 60);
  assert.ok(army.fieldExtent + army.reserveExtent < former * 0.026);
  stepArmyPresentation(army, 0, 1);
  assert.equal(army.fieldExtent + army.reserveExtent, 0);
});

function painter() {
  const draws = [];
  const atlasContext = new Proxy({}, { get: () => () => {} });
  const ctx = {
    globalAlpha: 1,
    drawImage(atlas, sx, sy, sw, sh, x, y, w, h) {
      draws.push({ x: x + w / 2, y: y + h / 2, h, w, alpha: this.globalAlpha, tile: sh === 32 });
    },
  };
  const figures = createFigures(ctx, { createElement: () => ({ getContext: () => atlasContext }) });
  return { figures, draws };
}

function step(state, motion, dt = 1 / 60) {
  state.t += dt;
  motion.step(state.t, 0, state.blueTotal, state.redEntryOpen, state.level, state);
}

test("lost blue reserve slots become grounded, inactive sprites without reshuffling surviving bands", () => {
  const state = createState();
  state.mode = "playing";
  state.blueTotal = 200000;
  state.redTotal = 50000;
  const motion = createMotion();
  const { figures, draws } = painter();
  step(state, motion);
  figures.setClock(state.t);
  figures.blueArmy(state, 0, motion.contact, []);
  const former = draws.splice(0).filter((draw) => draw.tile).slice(0, 14);

  state.blueTotal = 10000;
  step(state, motion);
  figures.setClock(state.t);
  figures.blueArmy(state, 0, motion.contact, []);
  const current = draws.splice(0);
  const survivors = current.filter((draw) => draw.tile && draw.alpha === 1).slice(0, 14);
  assert.equal(survivors.length, former.length);
  for (const [i, draw] of survivors.entries()) {
    assert.ok(Math.abs(draw.x - former[i].x) < 3);
    assert.ok(Math.abs(draw.y - former[i].y) < 15);
  }
  assert.ok(current.some((draw) => draw.tile && draw.alpha <= 0.91));
  assert.ok(current.filter((draw) => !draw.tile).every((draw) => draw.y > state.front));

  state.blueTotal = 0;
  step(state, motion);
  figures.blueArmy(state, 0, motion.contact, []);
  assert.ok(draws.length > 0 && draws.every((draw) => draw.alpha <= 0.91));
  assert.ok(draws.filter((draw) => !draw.tile).every((draw) => draw.h < draw.w));
  motion.reset();
  draws.length = 0;
  figures.blueArmy(state, 0, motion.contact, []);
  assert.equal(draws.length, 0);
});

test("victory fades extant waves without an entry-frame cut or active red casualties", () => {
  const state = createState();
  state.mode = "playing";
  state.front = 65;
  state.blueTotal = 180000;
  state.redTotal = 5;
  const motion = createMotion();
  const { figures, draws } = painter();
  step(state, motion, 2);
  const wave = { mult: 999, x: 310, entryY: 565, phase: 1, marchTime: 0.9, count: 999 };
  state.squads.push(wave);
  motion.receive("arrival", state.t, wave);
  figures.setClock(state.t);
  figures.blueArmy(state, 0, motion.contact, motion.tails);
  const before = draws.length;

  state.mode = "victory";
  state.redTotal = 0;
  state.victoryElapsed = 1 / 60;
  const elapsed = state.t + state.victoryElapsed;
  motion.step(elapsed, 0, state.blueTotal, false, state.level, state);
  figures.setClock(elapsed);
  draws.length = 0;
  figures.blueArmy(state, 0.022, motion.contact, motion.tails);
  assert.ok(draws.length >= before - 2);
  draws.length = 0;
  figures.redArmy(state, motion.contact, motion.impact);
  assert.equal(draws.length, 0);

  state.mode = "end";
  state.victoryElapsed = state.level.combat.victoryDuration;
  motion.step(state.t + state.victoryElapsed, 0, state.blueTotal, false, state.level, state);
  assert.equal(motion.tails.length, 0);
  assert.equal(motion.falls.length, 0);
  figures.blueArmy(state, 1, motion.contact, motion.tails);
  assert.ok(draws.length < before);
  assert.equal(state.squads.length, 1);
});
