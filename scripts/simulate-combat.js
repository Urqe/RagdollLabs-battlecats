import { createGame } from "../src/game.js";
import { LEVEL_ONE, LEVEL_TWO } from "../src/levels.js";
import { createAim, createRescueAim } from "../tests/helpers/strategies.js";
import { purrapultAim } from "../tests/helpers/purrapult.js";

export function traceBattle(level, strategy, hz = 60, reaction = 0.55) {
  const collapse = strategy === "collapse-fixture";
  const rescue = strategy === "rescue" || strategy === "ignore"
    ? createRescueAim(strategy === "rescue", reaction) : null;
  const aim = collapse ? () => level.battlefield.maxX
    : rescue?.aim ?? (level.number === 1 ? createAim(strategy) : purrapultAim(strategy, level));
  let joined = 0;
  let fired, spawned, arrived, reversed, warningSample;
  const spawnedAfterSwitch = new WeakSet();
  const game = createGame({
    level,
    random: () => 0.5,
    onEffect(kind, at, value) {
      if (kind === "arrival") joined += value.count;
      if (rescue?.timing.switchAt === undefined) return;
      if (kind === "fire") fired ??= at;
      if (kind === "multiply" && value === 99) {
        spawned ??= at;
        spawnedAfterSwitch.add(game.state.squads.at(-1));
      }
      if (kind === "arrival" && spawnedAfterSwitch.has(value)) arrived ??= at;
    },
  });
  game.reset();
  const s = game.state;
  if (collapse) Object.assign(s, { blueTotal: 1000, redTotal: 50000, redEntryOpen: false });
  const samples = [];
  let sampleAt = 0;
  let blueLoss = 0;
  let redLoss = 0;
  let previousDanger;
  const alerts = [];
  while (s.mode === "playing" && s.t < 240) {
    const blue = s.blueTotal;
    const red = s.redTotal;
    const front = s.front;
    const before = joined;
    s.gunX = aim(s);
    if (rescue?.timing.warning !== undefined && !warningSample) {
      warningSample = { blue, red, front, forecast: s.danger.survival, rescueTime: s.danger.rescueTime };
    }
    const redEntryOpen = s.redEntryOpen;
    game.update(1 / hz);
    const lostBlue = Math.max(0, blue + joined - before - s.blueTotal);
    const { combat, objective } = level;
    // The cutoff tick can admit a fractional reserve before closing the entrance.
    const influx = redEntryOpen && !s.redEntryOpen
      ? Math.max(0, Math.min(1, (front - objective.reinforcementCutoff) / combat.reinforcementApproach))
        * Math.min(combat.maxRedReinforcements, combat.redReinforcements + combat.redReinforcementGrowth * s.t)
      : s.redEntryRate;
    const lostRed = Math.max(0, red + influx / hz - s.redTotal);
    if (arrived !== undefined && s.danger.velocity < 0) reversed ??= s.t;
    blueLoss += lostBlue;
    redLoss += lostRed;
    const danger = s.danger?.level ?? "stable";
    if (danger !== previousDanger && danger !== "stable") alerts.push(s.t);
    previousDanger = danger;
    if (s.t >= sampleAt - 1e-8 || s.mode !== "playing") {
      samples.push({
        t: s.t, blue: s.blueTotal, red: s.redTotal, front: s.front,
        velocity: (s.front - front) * hz, blueLossRate: lostBlue * hz,
        redLossRate: lostRed * hz, gunX: s.gunX,
        forecast: s.danger?.survival, reliefETA: s.danger?.rescueTime,
        incoming: s.squads.reduce((total, squad) => total + squad.count, 0),
        survival: lostBlue > 0 ? s.blueTotal / (lostBlue * hz) : null, danger,
      });
      sampleAt++;
    }
  }
  return {
    level: level.number, strategy, hz, result: s.mode, time: s.t,
    blueLoss, redLoss, artillery: s.support?.damage ?? 0,
    alerts, warningSample, ...rescue?.timing, fired, spawned, arrived, reversed,
    final: { blue: s.blueTotal, red: s.redTotal, front: s.front }, samples,
  };
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) {
  const cases = [
    [LEVEL_ONE, ["A", "B", "C", "D", "99", "Rush", "rescue", "ignore", "collapse-fixture"]],
    [LEVEL_TWO, ["passive", "artillery-rush", "gates", "artillery-first", "gates-first"]],
  ];
  console.log(JSON.stringify(cases.flatMap(([level, strategies]) =>
    strategies.flatMap((strategy) => [30, 60, 120].map((hz) => traceBattle(level, strategy, hz)))), null, 2));
}
