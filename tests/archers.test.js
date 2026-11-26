import test from 'node:test';
import assert from 'node:assert/strict';
import { activateArtillery, updateArtillery } from '../src/artillery.js';
import { createGame } from '../src/game.js';
import { ARCHER_SUPPORT, LEVEL_ONE, LEVEL_TWO } from '../src/levels.js';
import { updateProjectiles } from '../src/projectiles.js';

const level = {
  ...LEVEL_TWO,
  id: 'archer-fixture',
  support: ARCHER_SUPPORT,
  barricades: [...LEVEL_TWO.barricades.slice(0, 2), { id: 'archers', hits: 1, hitY: 545, message: 'Ready' }],
};
function fixture(unlocked = true, config = {}) {
  const events = [];
  const game = createGame({ level: { ...level, support: { ...ARCHER_SUPPORT, ...config } }, onEffect: (...args) => events.push(args) });
  game.reset();
  const state = game.state;
  if (unlocked) {
    state.support.open = true;
    activateArtillery(state);
  }
  const tick = (t) => { state.t = t; updateArtillery(state, (...args) => events.push(args)); };
  return { game, state, events, tick };
}

test('locked crew is inert; existing barricade lifecycle unlocks automatic volleys', () => {
  const { state, tick } = fixture(false);
  tick(1);
  assert.equal(state.support.shotsFired, 0);
  state.shots.push({ x: ARCHER_SUPPORT.x, y: 546 });
  updateProjectiles(state, 0.01, () => assert.fail('support produced troops'), () => {}, () => {});
  assert.equal(state.support.open, true);
  tick(1.59);
  assert.equal(state.support.shot, null);
  tick(1.6);
  assert.equal(state.support.shot.arrows, 6);
  tick(1.8);
  assert.equal(state.support.damage, 48);
});

test('fixed aim misses a departing army, hits within the band, and never duplicates damage', () => {
  const { state, tick, events } = fixture();
  tick(0.6);
  const front = state.front;
  state.front += 150;
  tick(0.8);
  assert.equal(state.support.damage, 0);
  assert.equal(events.at(-1)[0], 'archerImpact');
  assert.equal(events.at(-1)[2].loss, 0);
  state.front = front;
  tick(1.4);
  state.front += 10;
  const red = state.redTotal;
  tick(1.6);
  tick(1.6);
  assert.equal(state.redTotal, red - 48);
  assert.equal(state.support.impacts, 2);
  assert.equal(state.front, front + 10);
});

test('empty or out-of-range army cannot launch; eliminated targets resolve without invented losses', () => {
  const { state, tick } = fixture();
  state.redTotal = 0;
  tick(4);
  assert.equal(state.support.shotsFired, 0);
  state.redTotal = 20;
  tick(4);
  state.redTotal = 0;
  tick(4.2);
  assert.equal(state.support.damage, 0);
  state.redTotal = 20;
  tick(4.8);
  tick(5);
  assert.equal(state.support.damage, 20);
  assert.equal(state.redTotal, 0);
  const ranged = fixture(true, { range: 10 });
  ranged.tick(10);
  assert.equal(ranged.state.support.shotsFired, 0);
});

test('scheduled cadence, aggregate damage and events agree at 30/60/120 Hz', () => {
  const results = [30, 60, 120].map(hz => {
    const { state, tick, events } = fixture();
    state.redTotal = 600;
    for (let i = 1; i <= hz * 8; i++) tick(i / hz);
    assert.equal(state.support.shotsFired, 10);
    assert.equal(state.support.impacts, 10);
    assert.equal(state.support.damage, 480);
    return events;
  });
  assert.deepEqual(results[0], results[1]);
  assert.deepEqual(results[1], results[2]);
  const bounded = fixture(true, { arrows: 1000 });
  bounded.tick(0.6);
  assert.equal(bounded.state.support.shot.arrows, 12);
});

test('game loop resolves a final casualty and clears flight on defeat, reset and level switches', () => {
  const { game, state, tick } = fixture();
  tick(0.6);
  state.redEntryOpen = false;
  state.redTotal = 1;
  state.t = 0.8;
  game.update(0);
  assert.equal(state.mode, 'victory');
  assert.equal(state.redTotal, 0);
  game.reset();
  state.support.open = true;
  activateArtillery(state);
  tick(0.6);
  state.front = level.objective.castleFront;
  game.update(0);
  assert.equal(state.mode, 'end');
  assert.equal(state.support.shot, null);
  game.reset(LEVEL_ONE);
  assert.equal(state.support, null);
  game.reset(LEVEL_TWO);
  assert.equal(state.support.open, false);
  assert.equal(state.support.damage, 0);
  game.reset(level);
  assert.equal(state.support.shot, null);
  assert.equal(state.support.shotsFired, 0);
});
