import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game.js";
import { createState } from "../src/state.js";
import { createFigures } from "../src/figures.js";
import { LEVEL_ONE, LEVEL_TWO } from "../src/levels.js";
import { fieldColumn, fieldRow, fieldSpacing } from "../src/army-visual.js";
import { createMotion, MAX_TAILS } from "../src/motion.js";
import {
  FLAG_CAPTURE_TIME, mergeProgress, receivingY, victoryAdvance, victoryWaveVisibility,
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
      figures.setClock(state.t + state.victoryElapsed);
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

test("frontage grows before rear depth and remains bounded by the throat", () => {
  assert.deepEqual(Array.from({ length: 9 }, (_, slot) => fieldRow(slot)), Array(9).fill(0));
  const shoulder = Math.max(...Array.from({ length: 9 }, (_, slot) => Math.abs(fieldColumn(slot))));
  assert.equal(shoulder, 4);
  assert.ok(shoulder * fieldSpacing(120, 0, 140, 12.5) >
    shoulder * fieldSpacing(120, 0, 18, 12.5));
  for (const count of [18, 60, 140, 232]) {
    assert.ok(shoulder * fieldSpacing(25, 0, count, 12.5) <= 25);
  }
});

test("a small volley draws continuously at the arrival frame and gives each claimed slot one owner", () => {
  const state = createState();
  state.mode = "playing";
  state.blueTotal = 44;
  state.t = 2;
  const motion = createMotion();
  const probe = renderProbe();
  step(motion, state, 2);
  const incoming = wave(5);
  state.squads.push(incoming);
  const before = probe.blue(state, motion).slice(-5);

  state.squads.length = 0;
  state.blueTotal += incoming.count;
  motion.receive("arrival", state.t, incoming, state.front);
  step(motion, state, 2);
  const after = probe.blue(state, motion).slice(-5);
  assert.deepEqual(after, before);
  const tail = motion.tails[0];
  assert.deepEqual(motion.contact.reinforcements.field.slice(44, 49), tail.members);

  let previous = 44;
  for (let i = 1; i <= 37; i++) {
    state.t = 2 + i / 60;
    step(motion, state, state.t);
    const drawn = probe.blue(state, motion);
    assert.ok(motion.contact.blueArmy.field >= previous);
    assert.ok(motion.contact.blueArmy.field <= state.blueTotal);
    previous = motion.contact.blueArmy.field;
    if (i === 10) {
      assert.ok(tail.members.some(member => member.painted));
      assert.ok(drawn.length <= 49);
    }
  }
  assert.equal(state.blueTotal, 49);
  for (let i = 38; i <= 126; i++) {
    state.t = 2 + i / 60;
    step(motion, state, state.t);
    probe.blue(state, motion);
  }
  assert.equal(motion.tails.length, 0);
  assert.deepEqual(motion.contact.reinforcements.field.slice(44, 49), tail.members);
});

test("the relay adds representatives without resetting the first gate's cats", () => {
  const state = createState();
  const motion = createMotion();
  const probe = renderProbe();
  state.mode = "playing";
  state.blueTotal = 0;
  state.t = 2;
  const q = wave(100, 329);
  state.squads.push(q);
  const before = probe.blue(state, motion);
  assert.equal(before.length, 32);
  q.relay = { y: 465, at: q.marchTime - 0.45 };
  q.count = 500;
  const after = probe.blue(state, motion);
  assert.deepEqual(after.slice(0, before.length), before);
  assert.equal(after.length, 48);
});

test("a representative beyond an obstructed gate travels to its receiving slot", () => {
  const state = createState();
  state.mode = "playing";
  state.front = 536;
  state.blueTotal = 44;
  state.t = 2;
  const motion = createMotion();
  const probe = renderProbe();
  step(motion, state, state.t);
  probe.blue(state, motion);

  const q = { ...wave(5, 329), marchTime: 0.25 };
  state.blueTotal += q.count;
  motion.receive("arrival", state.t, q, state.front);
  step(motion, state, state.t);
  const tail = motion.tails[0];
  const observed = [];
  for (let i = 1; i <= 100; i++) {
    state.t = 2 + i / 60;
    step(motion, state, state.t);
    probe.blue(state, motion);
    const { x, y } = tail.members[0];
    if (x !== undefined) observed.push([x, y]);
  }
  assert.ok(observed.length > 40);
  assert.ok(tail.members[0].settled);
  for (let i = 1; i < observed.length; i++) {
    assert.ok(Math.hypot(observed[i][0] - observed[i - 1][0],
      observed[i][1] - observed[i - 1][1]) <= 135 / 60 + 1e-8);
  }
});

test("overlapping ×25 and ×100 handoffs stay bounded and reset when leaving a level", () => {
  const motion = createMotion();
  const state = createState();
  state.mode = "playing";
  state.blueTotal = 1000;
  step(motion, state, 0);
  for (let i = 0; i < 28; i++) {
    const q = wave(i % 2 ? 25 : 100, i % 2 ? 90 : 329);
    state.blueTotal += q.count;
    motion.receive("arrival", 0.1, q, state.front);
  }
  step(motion, state, 0.1);
  const { field, reserve } = motion.contact.reinforcements;
  const occupied = [...field, ...reserve].filter(Boolean);
  assert.ok(motion.tails.length <= MAX_TAILS);
  assert.equal(new Set(occupied).size, occupied.length);
  assert.ok(reserve.filter(Boolean).length <= 144);
  assert.ok(motion.tails.every(q => q.members.length <= 32));
  motion.reset();
  assert.equal(motion.tails.length, 0);
  assert.equal(motion.contact.formation, null);
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
    for (let i = 1; i <= Math.round(duration * 60); i++) {
      game.update(1 / 60);
      step(motion, state, state.t + state.victoryElapsed);
      const advance = (depth = 0) => victoryAdvance(stand.front, level.objective.flagY, state.victoryElapsed, depth);
      const ahead = advance();
      assert.ok(ahead >= previous && ahead - previous < 3.2);
      if (i === 1) {
        assert.ok(ahead > 0);
        assert.equal(advance(1), 0);
      }
      if (i === 15) {
        assert.ok(ahead > level.combat.blueAdvance * 0.25 * 4);
      }
      if (i === 45) {
        assert.ok(ahead > level.combat.blueAdvance * 0.75);
        assert.ok(advance(1) < ahead);
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
    assert.equal(stand.front + 6 - previous, level.objective.flagY);
    assert.equal(victoryAdvance(stand.front, level.objective.flagY, FLAG_CAPTURE_TIME), previous);
    assert.equal(victoryWaveVisibility(duration, duration), 0);
    motion.reset();
    game.reset(LEVEL_ONE);
    assert.equal(state.victoryElapsed, 0);
    assert.equal(motion.contact.foughtAt, -1);
  });
}

test("pressure packs a stalled formation after a wave and releases it into an advance", () => {
  const motion = createMotion();
  const state = createState(LEVEL_TWO);
  Object.assign(state, { mode: "playing", front: 310, blueTotal: 1000, redTotal: 1800 });
  step(motion, state, 0);
  const tick = (i, velocity = 0) => {
    state.t = i / 60;
    state.front += velocity / 60;
    motion.step(state.t, velocity, state.blueTotal, true, state.level, state);
  };
  for (let i = 1; i <= 60; i++) tick(i);
  const holding = motion.contact.formation.compression;
  motion.receive("arrival", 1, wave(999), state.front);
  state.blueTotal += 999;
  for (let i = 61; i <= 90; i++) tick(i);
  const packed = motion.contact.formation.compression;
  assert.ok(packed > holding + 0.25);
  for (let i = 91; i <= 150; i++) tick(i, -24);
  assert.ok(motion.contact.formation.compression < 0);
  assert.equal(state.blueTotal, 1999);
});

test("artillery and casualties preserve continuous slot geometry and opposing sides", () => {
  const motion = createMotion();
  const state = createState(LEVEL_TWO);
  const probe = renderProbe();
  Object.assign(state, { mode: "playing", front: 250, blueTotal: 3100, redTotal: 9000 });
  step(motion, state, 0);
  let previous;
  let lastMembers;
  for (let i = 1; i <= 100; i++) {
    state.t = i / 60;
    const velocity = i < 45 ? 23 : -26;
    state.front += velocity / 60;
    if (i === 45) {
      state.redTotal -= 3000;
      state.blueTotal -= 450;
      motion.receive("artilleryImpact", state.t, { at: state.t, x: 210, y: 235, loss: 3000 });
      motion.receive("clash", state.t, 210, state.front, 35, 26);
    }
    motion.step(state.t, velocity, state.blueTotal, true, state.level, state);
    const red = probe.red(state, motion);
    const blue = probe.blue(state, motion);
    assert.ok(red.every(({ y }) => y < state.front));
    assert.ok(blue.every(({ y }) => y > state.front));
    // The lowest-index blue sprites are painted last in stable slot order.
    const frontRank = blue.slice(-5);
    const members = motion.contact.reinforcements.field.slice(0, 5);
    if (previous) frontRank.forEach(({ x, y }, slot) => {
      const index = frontRank.length - 1 - slot;
      if (members[index] !== lastMembers[index]) {
        assert.ok(members[index].moving);
        return;
      }
      assert.ok(Math.abs(x - previous[slot].x) < 3);
      assert.ok(Math.abs(y - previous[slot].y) < 5.5);
    });
    previous = frontRank;
    lastMembers = members;
  }
  assert.equal(motion.impact.loss, 3000);
  assert.equal(motion.contact.blueArmy.population, 2650);
  state.mode = "victory";
  state.redTotal = 0;
  step(motion, state, state.t);
  assert.equal(motion.contact.foughtAt, -Infinity);
  const occupation = probe.blue(state, motion);
  motion.contact.formation.drive = -1;
  assert.deepEqual(probe.blue(state, motion), occupation);
  motion.reset();
  state.level = LEVEL_ONE;
  state.mode = "playing";
  state.front = 399;
  step(motion, state, 0);
  assert.deepEqual([...motion.contact.formation.anchors], [399, 399, 399]);
  assert.equal(motion.contact.formation.compression, 0);
  assert.equal(motion.impact.at, -Infinity);
});

test("opposing field sprites respect the shared lane seam during an exchange", () => {
  const game = createGame();
  game.reset();
  const s = game.state;
  Object.assign(s, { blueTotal: 75, redTotal: 75, front: 280 });
  const motion = createMotion();
  const probe = renderProbe();
  step(motion, s, 0);
  motion.receive("clash", 0.1, 210, s.front, 8, 0);
  const opening = motion.contact.exchanges[0];
  s.t = 0.32;
  step(motion, s, s.t);
  const red = probe.red(s, motion);
  const blue = probe.blue(s, motion);
  const nearestBlue = blue.reduce((nearest, cat) => cat.y < nearest.y ? cat : nearest);
  assert.ok(nearestBlue.y < s.front + 5);
  assert.ok(Math.abs(nearestBlue.x - opening.x) < 18);
  for (const b of blue) {
    for (const r of red) {
      if (Math.abs(b.x - r.x) < 5) assert.ok(b.y - r.y > 9);
    }
  }
  assert.equal(s.front, 280);
});
