import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game.js";
import { GATE_HIT_Y } from "../src/config.js";
import {
  createMotion,
  waveDuration,
  waveProfile,
  waveRelease,
  waveY,
} from "../src/motion.js";
import { redFormationSize } from "../src/figures.js";

test("gate releases are ordered, bounded and start on the projectile crossing", () => {
  const quick = waveProfile(20);
  const broad = waveProfile(99);
  const flood = waveProfile(999);
  assert.ok(quick.count < broad.count && broad.count < flood.count);
  assert.ok(quick.spread < broad.spread && broad.laneOffset < flood.laneOffset);
  assert.ok(flood.count <= 24);
  assert.ok(waveDuration(quick) < 0.1);
  assert.ok(waveDuration(broad) > 0.2 && waveDuration(broad) < 0.35);
  assert.ok(waveDuration(flood) > 0.5 && waveDuration(flood) < 1);

  for (const profile of [quick, broad, flood]) {
    assert.equal(waveRelease(profile, 0), 0);
    for (let i = 1; i < profile.count; i++) {
      assert.ok(waveRelease(profile, i) > waveRelease(profile, i - 1));
    }
    assert.equal(waveY(GATE_HIT_Y, 0), GATE_HIT_Y);
    const durations = [30, 60, 120].map((hz) => {
      let frame = 0;
      while (frame / hz < waveDuration(profile)) frame++;
      return frame / hz;
    });
    for (const duration of durations) {
      assert.ok(duration - waveDuration(profile) < 1 / 30);
      const lead = waveY(GATE_HIT_Y, duration);
      const trailing = waveY(GATE_HIT_Y, duration - waveDuration(profile));
      assert.ok(lead < trailing && trailing <= GATE_HIT_Y);
    }
  }
});

for (const hz of [30, 60, 120]) {
  test(`visual waves can outlast their logical march without changing combat at ${hz} Hz`, () => {
    const arrivals = [];
    const motion = createMotion();
    const visual = createGame({
      random: () => 0.5,
      onEffect(kind, time, value, front, redLoss, blueLoss) {
        motion.receive(kind, time, value, front, redLoss, blueLoss);
        if (kind === "arrival") arrivals.push(value);
      },
    });
    const plain = createGame({ random: () => 0.5 });
    for (const game of [plain, visual]) {
      game.reset();
      game.state.front = 550;
      game.state.gunX = 329;
      game.state.gates[2].open = true;
    }
    for (let frame = 0; frame < hz * 2; frame++) {
      const before = visual.state.front;
      visual.update(1 / hz);
      motion.step(visual.state.t, (visual.state.front - before) * hz);
      plain.update(1 / hz);
      assert.deepEqual(visual.state, plain.state);
    }
    assert.ok(arrivals.length >= 3);
    assert.equal(
      arrivals.slice(0, 3).reduce((sum, q) => sum + q.count, 0),
      2997,
    );
    assert.ok(arrivals[0].marchTime < waveDuration(waveProfile(999)));
    assert.ok(motion.tails.length <= 12);
    assert.ok(motion.falls.length <= 12);
  });
}

test("contact, casualties, reversals and reset are driven by the live battle", () => {
  const directions = [];
  const motion = createMotion((direction) => directions.push(direction));
  for (let frame = 1; frame <= 70; frame++) {
    const time = frame / 20;
    motion.receive("clash", time, 220, 300, 50, 30);
    motion.step(time, frame < 25 ? 11 : frame < 37 ? 0 : -10);
  }
  assert.deepEqual(directions, [-1]);
  assert.ok(motion.falls.length > 0 && motion.falls.length <= 12);
  motion.receive("multiply", 3.5, 999);
  motion.receive("arrival", 3.5, { mult: 999, marchTime: 0.25 });
  motion.reset();
  assert.deepEqual(motion.tails, []);
  assert.deepEqual(motion.falls, []);
  assert.equal(motion.pulses[2], -Infinity);
  assert.equal(motion.arrivals[2], -Infinity);
  assert.equal(motion.contact.pressure, 0);
  assert.equal(motion.contact.foughtAt, -1);
});

test("blue ranks ease outward from a new arrival lane at every tested frame rate", () => {
  const end = [30, 60, 120].map((hz) => {
    const motion = createMotion();
    motion.receive("arrival", 0, { mult: 999, marchTime: 0.25, x: 329 });
    for (let frame = 1; frame <= hz / 2; frame++) {
      motion.step(frame / hz, -11, 2997, false);
    }
    const { blueStrength, blueAnchor } = motion.contact;
    assert.ok(blueStrength > 0 && blueStrength < 2997);
    assert.ok(blueAnchor > 210 && blueAnchor < 329);
    motion.step(0.51, 0, 0, false);
    assert.equal(motion.contact.blueStrength, 0);
    return blueStrength;
  });
  assert.ok(Math.max(...end) - Math.min(...end) < 1e-8);
});

test("the red population scales down to the last visible remnant", () => {
  assert.equal(redFormationSize(0), 0);
  assert.equal(redFormationSize(1), 1);
  const remaining = [1, 500, 2000, 7000, 16000, 65000].map(redFormationSize);
  assert.deepEqual(
    remaining,
    [...new Set(remaining)].sort((a, b) => a - b),
  );
  assert.ok(redFormationSize(1_000_000) <= 1230);
});
