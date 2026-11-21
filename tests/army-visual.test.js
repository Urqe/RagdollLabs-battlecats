import test from "node:test";
import assert from "node:assert/strict";
import {
  FIELD_LIMIT, RESERVE_LIMIT, armyScale, encounterBalance, encounterOffset,
  entryRepresentation,
} from "../src/army-visual.js";
import { createFigures } from "../src/figures.js";
import { createMotion } from "../src/motion.js";
import { createState } from "../src/state.js";

const samples = [1, 5, 20, 50, 100, 500, 2000, 10000, 50000, 200000, 500000];

test("both sides share a literal opening and a smooth, bounded scale curve", () => {
  let previous = 0;
  const scale = {};
  for (let n = 0; n <= 500000; n++) {
    const { field, reserve } = armyScale(n, scale);
    const visible = field + reserve;
    assert.ok(visible >= previous && visible <= n && visible - previous <= 2);
    if (n <= 100) assert.deepEqual(scale, { field: n, reserve: 0 });
    previous = visible;
  }
  for (let i = 1; i < samples.length; i++) {
    const before = armyScale(samples[i - 1]);
    const after = armyScale(samples[i]);
    assert.ok(after.field + after.reserve > before.field + before.reserve);
  }
  const huge = armyScale(50_000_000);
  assert.ok(huge.field <= FIELD_LIMIT && huge.reserve <= RESERVE_LIMIT);
});

test("equal cats trade symmetrical lunges while outnumbered cats recoil farther", () => {
  const even = encounterBalance(20, 20);
  const favored = encounterBalance(20, 5);
  const outnumbered = encounterBalance(5, 20);
  const crest = Math.PI / 20;
  assert.equal(even, 0);
  assert.ok(favored > 0 && outnumbered < 0);
  assert.ok(Math.abs(
    encounterOffset(crest, 0, 0, true, even, 0, 0)
      - encounterOffset(crest * 3, 0, 0, false, even, 0, 0),
  ) < 1e-9);
  assert.ok(encounterOffset(crest, 0, 0, true, favored, 0, 0) > 3.3);
  assert.ok(encounterOffset(crest, 0, 0, false, outnumbered, 0, 0) < -2.5);
  assert.equal(encounterOffset(crest, 0, 4, true, even, 0, 0), 0);
});

function painter() {
  const draws = [];
  const atlasContext = new Proxy({}, { get: () => () => {} });
  const figures = createFigures(
    {
      drawImage(atlas, sx, sy, sw, sh, x, y, w, h) {
        draws.push({ y: y + h / 2, x: x + w / 2, represented: sw === 48 && sh === 32 ? sx / sw + 1 : 1 });
      },
    },
    { createElement: () => ({ getContext: () => atlasContext }) },
  );
  return { figures, draws };
}

test("literal cats stay on their side of the live frontline and formations deplete", () => {
  const state = createState();
  state.mode = "playing";
  state.redTotal = state.blueTotal = 20;
  const { figures, draws } = painter();
  const { contact } = createMotion();
  figures.setClock(0.2);
  figures.redArmy(state, contact);
  assert.equal(draws.length, 20);
  assert.ok(draws.every((p) => p.y < state.front));
  draws.length = 0;
  figures.blueArmy(state, 0, contact, []);
  assert.equal(draws.length, 20);
  assert.ok(draws.every((p) => p.y > state.front));

  state.front += 30;
  draws.length = 0;
  state.redTotal = 1;
  figures.redArmy(state, contact);
  assert.equal(draws.length, 1);
  assert.ok(draws[0].y > 350 && draws[0].y < state.front);
  state.redTotal = 0;
  draws.length = 0;
  figures.redArmy(state, contact);
  assert.equal(draws.length, 0);
});

test("cached reserves cover more ground and keep dense battles within a draw budget", () => {
  const state = createState();
  state.redEntryRate = 1900;
  const { figures, draws } = painter();
  const { contact } = createMotion();
  figures.setClock(0.4);

  const measure = (population) => {
    state.redTotal = population;
    draws.length = 0;
    figures.redArmy(state, contact);
    return {
      represented: draws.reduce((sum, draw) => sum + draw.represented, 0),
      distant: draws.filter((draw) => draw.y <= 100).length,
      calls: draws.length,
    };
  };
  const medium = measure(2000);
  const large = measure(50000);
  const enormous = measure(200000);
  const maximum = measure(500000);
  assert.ok(medium.distant < enormous.distant);
  assert.ok(medium.represented < large.represented);
  assert.ok(large.represented < enormous.represented);
  assert.ok(enormous.represented < maximum.represented);
  assert.ok(enormous.represented >= 1500);

  state.blueTotal = 500000;
  figures.blueArmy(state, 0, contact, []);
  assert.ok(draws.length <= 2 * (FIELD_LIMIT + Math.ceil(RESERVE_LIMIT / 6)) + 30);
  assert.equal(state.redTotal, 500000);
  assert.equal(state.blueTotal, 500000);
});

test("entry files use the reserve budget and fade after a cutoff", () => {
  assert.equal(entryRepresentation(0, 2000, 0), 0);
  assert.equal(entryRepresentation(200, 0, 0), 0);
  assert.equal(entryRepresentation(200, 2000, 0), 30);
  assert.ok(entryRepresentation(200, 2000, 0.4) < 30);
  assert.equal(entryRepresentation(200, 2000, 0.65), 0);

  const battle = createState();
  const motion = createMotion();
  battle.redTotal = 5;
  battle.blueTotal = 5;
  motion.step(0.1, 0, battle.blueTotal, true, battle.level, battle);
  battle.redTotal = 4;
  motion.step(0.2, 0, battle.blueTotal, true, battle.level, battle);
  assert.equal(motion.falls.length, 1);
  assert.equal(motion.falls[0].red, true);
  assert.equal(battle.redTotal, 4);
  motion.reset();
  assert.equal(motion.falls.length, 0);
  assert.equal(motion.contact.entryRate, 0);
});
