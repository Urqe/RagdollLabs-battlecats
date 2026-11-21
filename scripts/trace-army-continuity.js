import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.argv[2] ?? ".");
const from = (name) => import(pathToFileURL(resolve(root, name)));
const [{ createGame }, { createMotion }, { createFigures }, { LEVEL_ONE, LEVEL_TWO },
  { createAim }, { purrapultAim }] = await Promise.all([
  from("src/game.js"), from("src/motion.js"), from("src/figures.js"),
  from("src/levels.js"), from("tests/helpers/strategies.js"), from("tests/helpers/purrapult.js"),
]);

const hz = 60;
const dt = 1 / hz;
const round = (x) => Number(x.toFixed(2));
let represented = 0;
let coverage = 0;
const noop = () => {};
const context = new Proxy({
  globalAlpha: 1,
  drawImage(atlas, sx, sy, sw, sh) {
    const cats = sw === 48 && sh === 32 ? sx / sw + 1 : 1;
    represented += cats;
    coverage += cats * this.globalAlpha;
  },
}, { get: (ctx, name) => ctx[name] ?? noop });
const figures = createFigures(context, { createElement: () => ({ getContext: () => context }) });

function count(state, motion, team, march = false) {
  represented = coverage = 0;
  figures.setClock(state.t + state.victoryElapsed);
  if (team === "red") figures.redArmy(state, motion.contact, motion.impact);
  else {
    const celebration = state.victoryElapsed / state.level.combat.victoryDuration;
    figures.blueArmy(
      march ? state : { ...state, squads: [] },
      1 - (1 - celebration) ** 2,
      motion.contact,
      march ? motion.tails : [],
    );
  }
  return represented;
}

function trace(level, aim) {
  const motion = createMotion();
  let arrived = 0;
  const game = createGame({
    level, random: () => 0.5,
    onEffect(...args) {
      if (args[0] === "arrival") arrived += args[2].count;
      motion.receive(...args);
    },
  });
  game.reset();
  const s = game.state;
  const samples = [];
  let worstDrop = null;
  let worstPlayingDrop = null;
  let worstWeightedDrop = 0;
  let victoryEntry = null;
  let firstCelebrationFrame = null;
  let peakBlue = 0;
  let peakBlueLossInFrame = 0;
  let peakRedLossInFrame = 0;
  let peakBlueLossInSecond = 0;
  let losses = 0;
  const recent = new Float64Array(hz);
  let previousVisible = 0;
  let previousCoverage = 0;
  for (let i = 0; i < 18000 && s.mode !== "end"; i++) {
    const before = { blue: s.blueTotal, red: s.redTotal, front: s.front, t: s.t, time: s.t + s.victoryElapsed, mode: s.mode };
    arrived = 0;
    s.gunX = aim(s);
    game.update(dt);
    if (s.t + s.victoryElapsed > before.time)
      motion.step(s.t + s.victoryElapsed, (s.front - before.front) * hz, s.blueTotal, s.redEntryOpen, level, s);
    const blueLoss = Math.max(0, before.blue + arrived - s.blueTotal);
    const redLoss = Math.max(0, before.red + (s.t > before.t ? s.redEntryRate * dt : 0) - s.redTotal);
    peakBlue = Math.max(peakBlue, s.blueTotal);
    peakBlueLossInFrame = Math.max(peakBlueLossInFrame, blueLoss);
    peakRedLossInFrame = Math.max(peakRedLossInFrame, redLoss);
    losses += blueLoss - recent[i % hz];
    recent[i % hz] = blueLoss;
    peakBlueLossInSecond = Math.max(peakBlueLossInSecond, losses);
    const blueVisible = count(s, motion, "blue", true);
    const drop = previousVisible - blueVisible;
    const weightedDrop = previousCoverage - coverage;
    worstWeightedDrop = Math.max(worstWeightedDrop, weightedDrop);
    if (before.mode === "playing" && s.mode === "victory") {
      victoryEntry = { from: previousVisible, to: blueVisible, weightedDrop: round(weightedDrop) };
    }
    if (before.mode === "victory" && before.time === before.t && s.victoryElapsed > 0) {
      firstCelebrationFrame = { from: previousVisible, to: blueVisible, weightedDrop: round(weightedDrop) };
    }
    previousCoverage = coverage;
    if (drop > (worstDrop?.drop ?? 0) || (s.mode === "playing" && drop > (worstPlayingDrop?.drop ?? 0))) {
      const event = {
        t: round(s.t), drop: previousVisible - blueVisible,
        from: previousVisible, to: blueVisible, blue: round(s.blueTotal),
        lost: round(blueLoss), arrived, front: round(s.front), mode: s.mode,
      };
      if (drop > (worstDrop?.drop ?? 0)) worstDrop = event;
      if (s.mode === "playing" && drop > (worstPlayingDrop?.drop ?? 0)) worstPlayingDrop = event;
    }
    previousVisible = blueVisible;
    if (i % 15 === 0 || s.mode !== before.mode) {
      samples.push([
        round(s.t + s.victoryElapsed), round(s.blueTotal), round(s.redTotal),
        blueVisible, count(s, motion, "blue"), count(s, motion, "red"),
        round(s.front), s.support?.impacts ?? 0, s.mode,
      ]);
    }
  }
  return {
    summary: {
      peakBlue: round(peakBlue), peakBlueLossInFrame: round(peakBlueLossInFrame),
      peakBlueLossInSecond: round(peakBlueLossInSecond),
      peakRedLossInFrame: round(peakRedLossInFrame), victoryEntry, firstCelebrationFrame,
      worstWeightedDrop: round(worstWeightedDrop), worstDrop, worstPlayingDrop,
    },
    samples,
  };
}

function decline() {
  const state = createGame().state;
  state.mode = "playing";
  const motion = createMotion();
  const samples = [];
  for (let i = 0; i <= 9 * hz; i++) {
    const populations = [200000, 150000, 100000, 50000, 10000, 1000];
    state.t = i * dt;
    state.blueTotal = populations[Math.min(5, Math.floor(i / (1.4 * hz)))];
    motion.step(state.t, 0, state.blueTotal, true, state.level, state);
    const sprites = count(state, motion, "blue");
    samples.push([round(state.t), state.blueTotal, sprites, round(coverage)]);
  }
  return samples;
}

function terrainSweep() {
  const state = createGame().state;
  state.mode = "playing";
  state.blueTotal = 200000;
  const motion = createMotion();
  let min = Infinity;
  let max = 0;
  let largestStep = 0;
  let previous;
  for (let i = 0; i < 1770; i++) {
    state.t = i * dt;
    state.front = 60 + i * 0.35;
    motion.step(state.t, 0, state.blueTotal, true, state.level, state);
    if (i < 100) continue;
    const next = count(state, motion, "blue");
    if (previous !== undefined) largestStep = Math.max(largestStep, Math.abs(next - previous));
    min = Math.min(min, next);
    max = Math.max(max, next);
    previous = next;
  }
  return { min, max, largestStep };
}

const results = {
  sampleColumns: ["s", "blue", "red", "blueWithMarchers", "blueFormation", "redFormation", "front", "impacts", "mode"],
  wins: trace(LEVEL_ONE, createAim("C")),
  defeats: trace(LEVEL_ONE, createAim("A")),
  purrapult: trace(LEVEL_TWO, purrapultAim("artillery-first")),
  fixtureColumns: ["s", "blue", "blueFormation", "opacityWeightedSlots"],
  fixture: decline(),
  constant200000AcrossTerrain: terrainSweep(),
};
console.log(JSON.stringify(results));
