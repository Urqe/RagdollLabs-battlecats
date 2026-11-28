import { createBattleClock, createGame } from "../../src/game.js";
import { LEVEL_FIVE } from "../../src/levels.js";
import { engagedArmor } from "../../src/pawtorians.js";

export const strategies = ["passive", "strong-only", "strong-support", "gates", "gates-support", "late"];

export function pawtorianAim(strategy, state, alternate = false) {
  const [starter, strong, final] = state.gates;
  const t = state.t;
  if (strategy === "passive" || t < 6) return starter.x;
  if (!strong.open) return (t - 6) % 4 < 1 ? starter.x : strong.x;
  if (t < 22) return strong.x;
  if (strategy.endsWith("support") && !state.support.open) return state.level.support.x;
  if (strategy.startsWith("strong") || (strategy === "late" && t < 42)) return strong.x;
  if (final.open) return final.x;
  return (t - 22) % 4 < (alternate ? 1.55 : 1.25) ? strong.x : final.x;
}

export function simulatePawtorians(strategy, hz = 60, level = LEVEL_FIVE, alternate = false) {
  const arrivals = {};
  const gates = {};
  let blueArrivals = 0;
  const game = createGame({
    level,
    random: () => 0.5,
    onEffect(type, time, value) {
      if (type === "arrival") {
        arrivals[value.count] ??= time;
        blueArrivals += value.count;
      }
    },
  });
  game.reset();
  const state = game.state;
  const wave = state.pawtorians;
  const samples = [];
  let nextSample = 0;
  let cutoff = null;
  let peak = state.front;
  let firstImpact = null;
  let conservationError = 0;
  const sample = () => ({
    t: state.t, front: state.front, velocity: state.frontVelocity,
    ordinary: state.redTotal - engagedArmor(state), armored: engagedArmor(state),
    marching: wave.count - engagedArmor(state), blue: state.blueTotal,
    vanguardY: wave.spawnedAt !== null && wave.arrivedAt === null ? wave.y : null,
    melee: { ...wave.melee, blue: level.combat.initialBlue + blueArrivals - state.blueTotal },
    artillery: { ...wave.artillery },
  });
  const clock = createBattleClock(dt => {
    if (state.mode !== "playing") return;
    state.gunX = pawtorianAim(strategy, state, alternate);
    game.update(dt);
    peak = Math.max(peak, state.front);
    if (!state.redEntryOpen) cutoff ??= state.t;
    if (state.support.impacts) firstImpact ??= state.support.impact.at;
    for (const gate of state.gates)
      if (gate.open) gates[gate.mult] ??= state.t;
    const ordinary = state.redTotal - engagedArmor(state);
    conservationError = Math.max(conservationError,
      Math.abs(ordinary + wave.melee.ordinary + wave.artillery.ordinary - level.combat.initialRed - wave.ordinaryArrivals),
      Math.abs(wave.count + wave.melee.armored + wave.artillery.armored - (wave.spawnedAt === null ? 0 : level.pawtorians.population)),
    );
    if (state.t >= nextSample - 1e-8 || state.t === wave.arrivedAt || state.t === wave.spawnedAt) {
      samples.push(sample());
      if (state.t >= nextSample - 1e-8) nextSample += 2;
    }
  });
  while (state.mode === "playing" && state.t < 180) clock.advance(1 / hz);
  samples.push(sample());
  return {
    strategy, outcome: state.mode === "victory" ? "victory" : state.mode === "end" ? "defeat" : "timeout",
    seconds: state.t, peak, spawnedAt: wave.spawnedAt, arrivedAt: wave.arrivedAt,
    gates, arrivals, cutoff, supportAt: state.support.unlockedAt, firstImpact,
    impacts: state.support.impacts, melee: samples.at(-1).melee, artillery: wave.artillery, samples, conservationError,
  };
}
