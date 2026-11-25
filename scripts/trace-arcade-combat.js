import { createDualFront } from "../src/dual-front.js";
import { createGame, createBattleClock } from "../src/game.js";
import { casualtyRates } from "../src/lane-combat.js";
import { LEVEL_ONE, LEVEL_TWO, LEVEL_THREE, LEVEL_FOUR } from "../src/levels.js";
import { createAim } from "../tests/helpers/strategies.js";
import { purrapultAim } from "../tests/helpers/purrapult.js";
import { meowmenAim } from "../tests/helpers/meowmen.js";

const hz = Number(process.argv[2] ?? 60);
const total = squads => squads.reduce((sum, { count }) => sum + count, 0);

function sample(lane, combat, objective, window, t, phase) {
  const { front, blueTotal: blue, redTotal: red } = lane;
  const { blue: blueRate, red: redRate } = casualtyRates(blue, red, combat);
  return {
    t, blue, red, inTransit: total(lane.squads), blueArrived: window.arrived,
    redIntakeRate: lane.redEntryRate, blueLossRate: window.blueLoss,
    redLossRate: window.redLoss, supportDamage: window.support ?? 0,
    bluePressure: lane.bluePressure ?? Math.min(blue, combat.bluePressureCapacity ?? Infinity),
    redPressure: lane.redPressure ?? red * combat.redPressurePerCat,
    front, velocity: (front - window.front) / (t - window.t),
    mode: lane.advanceMode ?? "contested",
    limits: {
      bluePressure: blue >= combat.bluePressureCapacity,
      redLoss: redRate >= combat.maxRedLoss,
      blueLoss: blueRate >= combat.maxBlueLoss,
      defenderExposure: lane.redEntryOpen && red * combat.redLossPerDefender < redRate,
    },
    toBreach: objective.castleFront - front, toCutoff: front - objective.reinforcementCutoff,
    phase, supplyOpen: lane.redEntryOpen,
  };
}

function windowFor(lane, t = 0) {
  return { t, front: lane.front, arrived: 0, blueLoss: 0, redLoss: 0, support: 0 };
}

function dual(scenario) {
  const windows = {};
  const crossings = LEVEL_FOUR.crossings;
  const battle = createDualFront(crossings, {
    phalanx: LEVEL_FOUR.phalanx,
    onEvent(e) {
      const w = windows[e.laneId];
      if (e.type === "arrival" && e.side === "blue") w.arrived += e.count;
      if (e.type === "casualties") {
        w.blueLoss += e.blueLost;
        w.redLoss += e.redLost;
      }
      if (e.type.startsWith("phalanx")) events.push(e);
    },
  });
  const { lanes, phalanx } = battle.state;
  const events = [];
  if (scenario === "overwhelming") {
    Object.assign(lanes.right, { front: 240, blueTotal: 300000, redTotal: 0,
      combat: { ...lanes.right.combat, redReinforcements: 4, redReinforcementGrowth: 0 } });
  }
  const samples = { left: [], right: [] };
  for (const id of Object.keys(lanes)) windows[id] = windowFor(lanes[id]);
  for (let t = 0; t < 55 && !battle.state.outcome; t++) {
    battle.launchVolley("right", { multiplier: 99 });
    if (scenario === "repeated" && t >= 6) battle.launchVolley("left", { multiplier: 999 });
    if (scenario === "recovery" && t === 9) battle.launchVolley("left", { multiplier: 2500 });
    if (scenario === "late-wall" && t === 17) battle.unlockPhalanx();
    for (let i = 0; i < hz; i++) battle.advance(1 / hz);
    for (const [id, lane] of Object.entries(lanes)) {
      const w = windows[id];
      const elapsed = battle.state.time - w.t;
      samples[id].push(sample(lane, lane.combat, lane.objective,
        { ...w, blueLoss: w.blueLoss / elapsed, redLoss: w.redLoss / elapsed },
        battle.state.time, phalanx.phase));
      windows[id] = windowFor(lane, battle.state.time);
    }
  }
  return { scenario, samples, events, outcome: battle.state.outcome };
}

function single(level, strategy, aim) {
  let w;
  const game = createGame({ level, random: () => 0.5, onEffect(type, time, value) {
    if (type === "arrival") w.arrived += value.count;
    if (type === "artilleryImpact" || type === "archerImpact") w.support += value.loss;
  } });
  game.reset();
  const { state } = game;
  const { combat, objective } = level;
  let cutoff;
  const clock = createBattleClock(dt => {
    const { blueTotal, redTotal, front, redEntryOpen } = state;
    const previousTime = state.t;
    const before = w.arrived;
    const support = w.support;
    state.gunX = aim(state);
    game.update(dt);
    if (state.t === previousTime) return;
    if (!state.redEntryOpen) cutoff ??= state.t;
    const access = redEntryOpen ? Math.max(0, Math.min(1,
      (front - objective.reinforcementCutoff) / combat.reinforcementApproach)) : 0;
    const intake = access * Math.min(combat.maxRedReinforcements,
      combat.redReinforcements + combat.redReinforcementGrowth * state.t);
    w.blueLoss += blueTotal + w.arrived - before - state.blueTotal;
    w.redLoss += redTotal + intake * dt - state.redTotal - (w.support - support);
  });
  const samples = [];
  w = windowFor(state);
  for (let second = 0; second < 200 && state.mode === "playing"; second++) {
    for (let i = 0; i < hz && state.mode === "playing"; i++) clock.advance(1 / hz);
    const elapsed = state.t - w.t;
    samples.push(sample(state, combat, objective,
      { ...w, blueLoss: w.blueLoss / elapsed, redLoss: w.redLoss / elapsed }, state.t));
    w = windowFor(state, state.t);
  }
  return { level: level.number, strategy, samples, outcome: state.mode, cutoff };
}

console.log(JSON.stringify({
  dual: ["repeated", "recovery", "late-wall", "overwhelming"].map(dual),
  single: [
    single(LEVEL_ONE, "C", createAim("C")),
    single(LEVEL_TWO, "artillery-first", purrapultAim("artillery-first", LEVEL_TWO)),
    single(LEVEL_THREE, "balanced", meowmenAim("balanced", LEVEL_THREE)),
  ],
}, null, 2));
