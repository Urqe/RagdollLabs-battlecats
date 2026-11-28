import test from "node:test";
import assert from "node:assert/strict";
import { createBattleClock, createGame } from "../src/game.js";
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

function saturatedFixture(occupied = 144, population = 30000) {
  const state = createState();
  Object.assign(state, { mode: "playing", blueTotal: population, redTotal: 30000, front: 335, t: 2 });
  const motion = createMotion();
  const probe = renderProbe();
  step(motion, state, state.t);
  const { reinforcements, blueArmy } = motion.contact;
  if (occupied) {
    const seed = { ...wave(100), born: 0 };
    reinforcements.admit(seed, occupied, blueArmy.target.field, blueArmy.target.reserve, blueArmy.target);
    for (const member of seed.members) member.settled = true;
  }
  probe.blue(state, motion);
  function receive(count = 3) {
    for (let slot = 0; slot < count; slot++) {
      const q = { ...wave(100, 329), slot: slot % 3 - 1, count: 500,
        relay: { y: 486, at: 0.8 } };
      state.blueTotal += q.count;
      motion.receive("arrival", state.t, q, state.front);
    }
    step(motion, state, state.t);
    return motion.tails.slice(-count);
  }
  function draw(dt = 1 / 60) {
    state.t += dt;
    step(motion, state, state.t);
    return probe.blue(state, motion);
  }
  return { state, motion, reinforcements, receive, draw };
}

for (const vacancies of [0, 3]) {
  test(`compound arrival completes at the occupied rank with ${vacancies} detailed vacancies`, () => {
    const fixture = saturatedFixture(144 - vacancies);
    const { state, motion, reinforcements } = fixture;
    const arrivals = fixture.receive();
    const members = arrivals.flatMap(q => q.members);
    const receiving = members.filter(m => !m.assigned);
    assert.equal(state.blueTotal, 31500);
    assert.equal(members.length, 144);
    assert.equal(receiving.length, 144 - vacancies);
    assert.equal(reinforcements.reserve.filter(Boolean).length, 144);

    const before = new Map();
    const docking = new Set();
    for (let frame = 0; frame < 150; frame++) {
      fixture.draw();
      for (const member of receiving) {
        if (member.x === undefined) continue;
        const previous = before.get(member);
        if (previous)
          assert.ok(Math.hypot(member.x - previous.x, member.y - previous.y) <= 135 / 60 + 1e-8);
        before.set(member, { x: member.x, y: member.y });
        if (member.docked && !member.settled) docking.add(member);
        if (!member.aggregatedAt) continue;
        assert.ok(docking.has(member));
        assert.ok(member.y <= member.cohort.relay.y - 10);
        assert.equal(member.retired, undefined);
      }
    }
    assert.ok(receiving.every(member => member.settled && member.aggregatedAt > member.cohort.at));
    assert.equal(motion.tails.length, 0);
  });
}

test("overlapping saturated cohorts drain, hold during pause, and reuse a casualty vacancy", () => {
  const fixture = saturatedFixture();
  const { state, motion, reinforcements } = fixture;
  const waves = [];
  for (let volley = 0; volley < 8; volley++) {
    waves.push(...fixture.receive());
    fixture.draw();
  }
  const member = waves[0].members[0];
  const pause = { x: member.x, y: member.y, settled: member.settled };
  for (let i = 0; i < 4; i++) fixture.draw(0);
  assert.deepEqual({ x: member.x, y: member.y, settled: member.settled }, pause);

  const oldFront = reinforcements.field[0];
  state.blueTotal -= 10;
  motion.receive("clash", state.t, 210, state.front, 0, 10);
  fixture.draw();
  assert.ok(oldFront.retired);
  assert.notEqual(reinforcements.field[0], oldFront);
  const newWave = fixture.receive();
  assert.equal(newWave.flatMap(q => q.members).filter(m => m.assigned).length, 1);
  const positions = [...reinforcements.field, ...reinforcements.reserve].filter(Boolean);
  assert.equal(new Set(positions).size, positions.length);

  for (let i = 0; i < 150; i++) fixture.draw();
  assert.equal(motion.tails.length, 0);
  assert.ok(waves.every(q => q.members.every(m => m.settled)));
  fixture.receive();
  motion.reset();
  state.level = LEVEL_TWO;
  assert.equal(motion.tails.length, 0);
  assert.ok(reinforcements.reserve.every(m => m === null));
});

test("spillover batches on the inbound route while already integrating cohorts keep their places", () => {
  const fixture = saturatedFixture();
  const { state, motion } = fixture;
  for (let i = 0; i < MAX_TAILS / 3; i++) fixture.receive();
  fixture.draw();
  const oldest = motion.tails[0];
  fixture.receive();
  assert.equal(motion.tails.length, MAX_TAILS);
  assert.equal(motion.tails[0], oldest);
  assert.ok(motion.tails.some(q => q.grouped && q.overflow > 0));
  for (let i = 0; i < 150; i++) fixture.draw();
  assert.equal(motion.tails.length, 0);
  assert.equal(state.blueTotal, 30000 + 500 * (MAX_TAILS + 3));
});

test("saturated receiving and render frequency leave fixed-tick authority identical", () => {
  function play(hz, draw) {
    const motion = createMotion();
    const arrivals = [];
    const game = createGame({ random: () => 0.5, onEffect(kind, time, value, ...args) {
      if (draw) motion.receive(kind, time, value, ...args);
      if (kind === "arrival") arrivals.push([time, value.count]);
    } });
    game.reset();
    const { state } = game;
    Object.assign(state, { blueTotal: 30000, redTotal: 10000, front: 365, gunX: 329 });
    state.gates[2].open = true;
    const clock = createBattleClock(step => {
      if (state.mode === "playing") game.update(step);
    });
    const probe = draw ? renderProbe() : null;
    let integrated = false;
    for (let frame = 0; frame < hz * 20 && state.mode === "playing"; frame++) {
      const front = state.front;
      clock.advance(1 / hz);
      if (!probe) continue;
      motion.step(state.t, (state.front - front) * hz, state.blueTotal, state.redEntryOpen, state.level, state);
      probe.blue(state, motion);
      integrated ||= motion.tails.some(q => q.members.some(m => m.aggregatedAt !== undefined));
    }
    if (draw) assert.ok(integrated);
    assert.ok(arrivals.filter(([, count]) => count === 500).length > 3);
    assert.equal(state.mode, "victory");
    return { state, arrivals };
  }
  const authority = play(60, false);
  for (const hz of [30, 60, 120]) assert.deepEqual(play(hz, true), authority);
});

test("an older grouped wave starts receiving at its last rendered stamp", () => {
  const fixture = saturatedFixture();
  const { state, motion } = fixture;
  const baseline = fixture.draw(0).length;
  const q = { ...wave(100, 329), count: 500, marchTime: 0.65, relay: { y: 492, at: 0.55 } };
  state.squads.push(q);
  fixture.draw(0);
  for (let i = 0; i < 6; i++) state.squads.push({ ...q, phase: i });
  q.marchTime = 1.74;
  const [stamp] = fixture.draw(0).slice(baseline);
  assert.ok(stamp);

  state.squads.shift();
  state.blueTotal += q.count;
  motion.receive("arrival", state.t, q, state.front);
  fixture.draw(0);
  const firstPacket = motion.tails[0].members.slice(0, 6);
  const midpoint = coordinate => firstPacket.reduce((sum, member) => sum + member[coordinate], 0) / firstPacket.length;
  assert.ok(Math.hypot(midpoint("x") - stamp.x, midpoint("y") - stamp.y) < 1);
});
