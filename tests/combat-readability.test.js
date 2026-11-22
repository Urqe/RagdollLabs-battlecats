import test from "node:test";
import assert from "node:assert/strict";
import { casualtyRates } from "../src/army.js";
import { createGame } from "../src/game.js";
import { LEVEL_ONE } from "../src/levels.js";
import { createDanger, reinforcementTime, updateDanger } from "../src/danger.js";
import { createMotion } from "../src/motion.js";
import { exchangeOffset, exchangeSeam } from "../src/formation-dynamics.js";
import { traceBattle } from "../scripts/simulate-combat.js";

test("red reserves add territorial pressure beyond their direct engagement limit", () => {
  const { combat } = LEVEL_ONE;
  assert.deepEqual(casualtyRates(1000, 50000, combat), { blue: 267, red: 111 });
  assert.deepEqual(casualtyRates(1000, 500000, combat), casualtyRates(1000, 50000, combat));
  assert.equal(casualtyRates(1000, 3000, combat).blue, 202);
  assert.equal(casualtyRates(0, 500000, combat).blue, 0);
  assert.equal(casualtyRates(500000, 0, combat).blue, 0);
  assert.equal(casualtyRates(500000, 500000, combat).red, combat.maxRedLoss);

  const fronts = [50000, 500000].map(redTotal => {
    const game = createGame();
    game.reset();
    Object.assign(game.state, { blueTotal: 1000, redTotal });
    game.update(1 / 60);
    assert.ok(game.state.blueTotal >= 0);
    assert.ok(game.state.redTotal >= 0);
    return game.state.front;
  });
  assert.ok(fronts[1] > fronts[0]);
});

test("the danger forecast credits only timely arrivals and uses hysteresis", () => {
  const game = createGame();
  game.reset();
  const s = game.state;
  Object.assign(s, { front: 335, redTotal: 50000, blueTotal: 1000, danger: createDanger() });
  function forecast(loss, velocity = 0) {
    s.t += 0.25;
    s.danger.lossRate = loss;
    s.danger.velocity = velocity;
    updateDanger(s, 0.25, loss, velocity);
  }
  forecast(120);
  assert.equal(s.danger.level, "stable");
  forecast(230);
  assert.equal(s.danger.level, "pressure");
  const firstFlash = s.danger.flashUntil;
  forecast(190);
  assert.equal(s.danger.level, "pressure");
  assert.equal(s.danger.flashUntil, firstFlash);
  s.squads.push({ y: 640, marchTime: 0, count: 1000 });
  forecast(400);
  assert.equal(s.danger.level, "critical");
  const criticalFlash = s.danger.flashUntil;
  forecast(400);
  assert.equal(s.danger.flashUntil, criticalFlash);
  s.squads[0].y = 400;
  forecast(400);
  assert.equal(s.danger.level, "pressure");
  s.squads[0].count = 2000;
  forecast(400);
  assert.equal(s.danger.level, "stable");
  assert.equal(s.danger.flashUntil, 0);
  assert.ok(reinforcementTime(s, 532, 0, 0.55, -10) > reinforcementTime(s, 532, 0, 0.55, 10));
  game.reset();
  assert.deepEqual(s.danger, createDanger());
});

test("local lane openings are event-backed, temporary, and independent of the frontline", () => {
  const motion = createMotion();
  const game = createGame();
  game.reset();
  const s = game.state;
  Object.assign(s, { blueTotal: 140, redTotal: 1800 });
  motion.step(0, 0, s.blueTotal, true, s.level, s);
  const front = s.front;
  const [red, blue] = motion.contact.exchanges;
  motion.receive("clash", 1, 210, front, 0, 8);
  assert.equal(red.at, -Infinity);
  assert.equal(blue.at, 1);
  assert.ok(motion.falls.every(fall => !fall.red));
  motion.receive("clash", 1.5, 210, front, 8, 0);
  const time = 1.75;
  const redRecoil = exchangeOffset(red, time, red.x, 0, true);
  const blueStep = exchangeOffset(red, time, red.x, 0, false);
  assert.ok(redRecoil < blueStep && redRecoil >= -14);
  assert.ok(blueStep < 0 && blueStep >= -8);
  assert.ok(exchangeSeam(red, time, red.x) < 0);
  assert.equal(exchangeOffset(red, time, red.x + 30, 0, false), 0);
  assert.equal(exchangeOffset(red, 2, red.x, 0, false), 0);
  assert.equal(s.front, front);
  motion.receive("artilleryImpact", time, { at: time, x: 210, y: front - 30, loss: 80 });
  assert.equal(red.at, 1.5);
  assert.equal(motion.impact.loss, 80);
  s.mode = "victory";
  s.redTotal = 0;
  motion.step(2, 0, s.blueTotal, false, s.level, s);
  assert.equal(red.at, -Infinity);
  assert.equal(blue.at, -Infinity);
  assert.equal(motion.contact.foughtAt, -Infinity);
});

for (const hz of [30, 60, 120]) {
  test(`a warned player can rescue the same barricade attack at ${hz} Hz`, () => {
    const ignored = traceBattle(LEVEL_ONE, "ignore", hz);
    const rescued = traceBattle(LEVEL_ONE, "rescue", hz, 4.5);
    assert.deepEqual(rescued, traceBattle(LEVEL_ONE, "rescue", hz, 4.5));
    assert.deepEqual(rescued.warningSample, ignored.warningSample);
    assert.equal(rescued.warning, ignored.warning);
    assert.ok(rescued.warningSample.forecast >= 3 && rescued.warningSample.forecast <= 5);
    assert.equal(ignored.result, "end");
    assert.equal(rescued.result, "victory");
    assert.ok(rescued.arrived - rescued.switchAt < 1.2);
    assert.ok(rescued.reversed < ignored.time);
    assert.ok(rescued.samples.every(sample => sample.blue >= 0 && sample.red >= 0));
  });
}
