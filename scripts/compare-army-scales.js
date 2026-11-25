import { scaleCandidate } from "./army-scale-candidates.js";
import { armyScale, CROSSING_LITERAL_ARMY } from "../src/army-visual.js";
import { siegePopulation } from "../src/connected-siege.js";
import { createDualBattlefield } from "../src/dual-battlefield.js";
import { createBattleClock, createGame } from "../src/game.js";
import { LEVELS } from "../src/levels.js";
import { createState } from "../src/state.js";
import { createAim } from "../tests/helpers/strategies.js";
import { dualAim } from "../tests/helpers/dual-strategies.js";
import { purrapultAim } from "../tests/helpers/purrapult.js";
import { meowmenAim } from "../tests/helpers/meowmen.js";
import { pathToFileURL } from "node:url";

const round = value => +value.toFixed(2);

export function replay(level, strategy, hz = 60, scale = armyScale, crossingLiteral = CROSSING_LITERAL_ARMY) {
  const dual = level.number === 4;
  const state = createState(level);
  const checkpoints = {};
  const peaks = {};
  const previous = {};
  const gates = {};
  const stats = {};
  let arrived = 0, launched = 0, redLoss = 0, blueLoss = 0, damage = 0;
  let sampleCount = 0;
  let firstSpawn = false, finalArrival = false;
  const game = dual ? createDualBattlefield({ state, level, onEvent(event) {
    if (event.type === "launch") { launched += event.count; firstSpawn = true; }
    if (event.type === "arrival" && event.side === "blue") {
      arrived += event.count;
      finalArrival ||= event.multiplier === level.gates.at(-1).mult;
    }
    if (event.type === "casualties") {
      redLoss += event.redLost;
      blueLoss += event.blueLost;
    }
    if (["phalanxSecured", "mainBreakthrough", "encirclementStarted"].includes(event.type))
      gates[event.type] ??= round(event.time);
  } }) : createGame({ level, random: () => 0.5, onEffect(type, time, value) {
    if (type === "arrival") {
      arrived += value.count;
      finalArrival ||= value.mult === level.gates.at(-1).mult;
    }
    if (type === "multiply") firstSpawn = true;
    if (type === "artilleryImpact" || type === "archerImpact") damage += value.loss;
  } });
  game.reset();
  const s = dual ? state : game.state;
  const lanes = dual ? game.state.lanes : { main: s };
  const aim = dual ? () => dualAim(strategy, Math.floor(s.t + 1e-8), lanes, s.gates, game.state.phalanx)
    : level.number === 1 ? createAim(strategy)
    : level.number === 2 ? purrapultAim(strategy, level) : meowmenAim(strategy, level);
  function snapshot() {
    return Object.fromEntries(Object.entries(lanes).map(([id, lane]) => {
      const sides = [lane.blueTotal, lane.redTotal].map(population => {
        const { field, reserve } = dual
          ? scale(population, {}, crossingLiteral, 144)
          : scale(population);
        const visibleField = dual ? Math.min(field, 144) : field;
        const silhouettes = dual ? Math.min(588, reserve + field - visibleField) : reserve;
        const count = Math.ceil(population);
        return { count, field: visibleField, reserve: silhouettes, ratio: count ? (visibleField + silhouettes) / count : 1 };
      });
      return [id, { front: round(lane.front), blue: sides[0], red: sides[1] }];
    }));
  }
  function sample() {
    const view = snapshot();
    for (const [lane, entry] of Object.entries(view)) {
      for (const side of ["blue", "red"]) {
        const key = lane + "." + side;
        const { count, field, ratio } = entry[side];
        if (count > (peaks[key] ?? -1)) {
          peaks[key] = count;
          checkpoints["peak." + key] = { time: round(s.t), ...view };
        }
        const stat = stats[key] ??= { present: 0, individual: 0, ratio: 0 };
        if (!count) continue;
        stat.present++;
        stat.individual += Number(count === field);
        stat.ratio += ratio;
      }
    }
    sampleCount++;
    return { time: round(s.t), ...view };
  }
  checkpoints.start = sample();
  let ticks = 0;
  const clock = createBattleClock(dt => {
    if (s.mode !== "playing") return;
    const oldBlue = s.blueTotal, oldRed = s.redTotal, oldArrived = arrived, oldDamage = damage;
    const beforeFront = s.front, entryWasOpen = s.redEntryOpen;
    s.gunX = aim(s);
    if (dual) game.advance(dt);
    else {
      game.update(dt);
      blueLoss += oldBlue + arrived - oldArrived - s.blueTotal;
      const { combat, objective } = level;
      const access = entryWasOpen ? Math.max(0, Math.min(1,
        (beforeFront - objective.reinforcementCutoff) / combat.reinforcementApproach)) : 0;
      const influx = access * Math.min(combat.maxRedReinforcements,
        combat.redReinforcements + combat.redReinforcementGrowth * s.t);
      redLoss += oldRed + influx * dt - s.redTotal - (damage - oldDamage);
    }
    for (const gate of s.gates) {
      if (gate.open && gate.barricadeId && previous[gate.barricadeId] === undefined) {
        previous[gate.barricadeId] = round(s.t);
        checkpoints[gate.barricadeId] = { time: round(s.t), ...snapshot() };
      }
    }
    if (firstSpawn) checkpoints.firstSpawn ??= { time: round(s.t), ...snapshot() };
    if (arrived > 0) checkpoints.firstArrival ??= { time: round(s.t), ...snapshot() };
    if (finalArrival) checkpoints.finalArrival ??= { time: round(s.t), ...snapshot() };
    for (const [id, lane] of Object.entries(lanes)) {
      if (!lane.redEntryOpen) gates[id + ".cutoff"] ??= round(s.t);
    }
    if (++ticks % 60 === 0 && s.mode === "playing") {
      const view = sample();
      if (ticks === 1800) checkpoints.midgame = view;
    }
  });
  for (let frame = 1; s.mode === "playing" && frame <= hz * 240; frame++) clock.advance(1 / hz);
  checkpoints.end = sample();
  return { level: level.number, strategy, outcome: s.mode === "end" ? "defeat" : s.mode, time: round(s.t), checkpoints,
    peaks, gates: { ...previous, ...gates }, arrived, launched: dual ? launched : undefined,
    finalBlue: round(dual ? siegePopulation(game.state).blue : s.blueTotal),
    damage: round(damage), blueLoss: round(blueLoss), redLoss: round(redLoss),
    blueLossPerSecond: round(blueLoss / s.t), redLossPerSecond: round(redLoss / s.t),
    fullVolley: level.gates.filter(gate => gate.mult).map(gate => gate.mult * 3), sampleCount,
    representation: Object.fromEntries(Object.entries(stats).map(([id, stat]) => [id, {
      individualSeconds: stat.individual, individualPercent: round(stat.individual * 100 / stat.present),
      meanRatio: round(stat.ratio / stat.present),
    }])) };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , rate, candidate, baselineRoot] = process.argv;
  const source = candidate ? new URL("./src/", pathToFileURL(baselineRoot + "/")) : null;
  const inputLevels = source ? (await import(new URL("levels.js", source))).LEVELS : LEVELS;
  const renderer = source ? await import(new URL("army-visual.js", source)) : null;
  const cases = [["C", "A", "B", "99", "Rush"], ["artillery-first", "gates-first", "gates"], ["balanced", "archer-first"],
    ["adaptive-imperfect", "double-upgrade", "no-phalanx", "phalanx-rush", "even-alternation"]];
  console.log(JSON.stringify(inputLevels.slice(0, 4).flatMap((level, i) =>
    cases[i].map(strategy => replay(candidate ? scaleCandidate(level, candidate) : level,
      strategy, Number(rate ?? 60), renderer?.armyScale, renderer?.LITERAL_ARMY))), null, 2));
}
