import { createGame } from "../../src/game.js";
import { LEVEL_TWO } from "../../src/levels.js";
import { createAim } from "./strategies.js";

export const PURRAPULT_STRATEGIES = [
  "passive",
  "artillery-rush",
  "strong-only",
  "strong-rush",
  "artillery-rush-then-strong",
  "strong-rush-then-artillery",
  "artillery-first-no-final",
  "gates-first-no-final",
  "final-unused",
  "gates",
  "artillery-first",
  "gates-first",
];

export function purrapultAim(strategy, level = LEVEL_TWO, variant = "C") {
  const [starter, strong, final] = level.gates.map((gate) => gate.x);
  const artillery = level.support.x;
  const aimedGates = createAim(variant);
  const positions = { 210: starter, 90: strong, 329: final };
  const earlyArtillery = strategy.startsWith("artillery-first");
  const noFinal = strategy.endsWith("-no-final");
  const alternate = variant === "D";
  const opening = alternate ? 7 : 6;
  const buildup = alternate ? 4 : 5;
  let strongAt;
  return (s) => {
    if (strategy === "passive") return starter;
    if (strategy === "artillery-rush") return artillery;
    if (strategy === "strong-rush") return strong;
    if (strategy === "artillery-rush-then-strong") return s.support.open ? strong : artillery;
    if (strategy === "strong-rush-then-artillery")
      return s.gates[1].open && !s.support.open ? artillery : strong;
    if (strategy === "gates") return positions[aimedGates(s)];
    if (s.gates[2].open) return strategy === "final-unused" ? strong : final;

    if (earlyArtillery && !s.support.open) {
      if (s.t < opening) return starter;
      return (s.t - opening) % 3 < (alternate ? 1 : 1.3) ? starter : artillery;
    }
    if (!s.gates[1].open) {
      const start = s.support.unlockedAt ?? opening;
      if (s.t < start) return starter;
      return (s.t - start) % (alternate ? 3.4 : 4) < (alternate ? 1 : 0.9) ? starter : strong;
    }

    strongAt ??= s.t;
    const reserve = s.t - strongAt;
    if (reserve < buildup || strategy === "strong-only") return strong;
    if (!s.support.open) {
      return (reserve - buildup) % 4 < (alternate ? 1.8 : 2.1) ? strong : artillery;
    }
    if (noFinal) return strong;
    const attack = s.t - Math.max(strongAt + buildup, s.support.unlockedAt);
    return attack % (alternate ? 4 : 5.1) < (alternate ? 1.25 : 1.85) ? strong : final;
  };
}

const round = (n) => (n === null ? null : Math.round(n * 100) / 100);

export function simulatePurrapult(strategy, hz = 60, level = LEVEL_TWO, variant = "C") {
  const arrivals = {};
  let finalCombat = null;
  let finalArrival = null;
  const game = createGame({
    level,
    random: () => 0.5,
    onEffect(type, time, cohort, _front, redLoss) {
      if (type === "arrival") {
        arrivals[cohort.mult] ??= round(time);
        if (cohort.mult === 100) finalArrival ??= time;
      }
      // Wait for a complete clash window with the ×100 cohort in the melee pool.
      if (type === "clash" && finalArrival !== null &&
          time - finalArrival >= level.combat.combatEffectInterval && redLoss > 0)
        finalCombat ??= round(time);
    },
  });
  game.reset();
  const s = game.state;
  const aim = purrapultAim(strategy, level, variant);
  let furthest = s.front;
  let firstImpact = null;
  const gateTimes = [];
  let cutoff = null;
  const sample = () => ({
    time: round(s.t), blue: round(s.blueTotal), red: round(s.redTotal), front: round(s.front),
  });
  const samples = [sample()];
  let nextSample = 5;
  while (s.mode === "playing" && s.t < 200) {
    s.gunX = aim(s);
    game.update(1 / hz);
    if (!s.redEntryOpen) cutoff ??= round(s.t);
    if (s.t >= nextSample - 1e-8) {
      samples.push(sample());
      nextSample += 5;
    }
    furthest = Math.max(furthest, s.front);
    if (s.support.impacts > 0) firstImpact ??= s.support.impact.at;
    for (let i = 1; i < s.gates.length; i++) {
      if (s.gates[i].open) gateTimes[i - 1] ??= round(s.t);
    }
  }
  if (samples.at(-1).time !== round(s.t)) samples.push(sample());
  return {
    strategy,
    variant,
    hz,
    outcome: s.mode === "victory" ? "victory" : s.mode === "end" ? "defeat" : "timeout",
    won: s.mode === "victory",
    seconds: round(s.t),
    furthest: round(furthest),
    unlocked: round(s.support.unlockedAt),
    firstImpact: round(firstImpact),
    gateTimes,
    arrivals,
    finalCombat,
    cutoff,
    samples,
    shots: s.support.shotsFired,
    impacts: s.support.impacts,
    artilleryLoss: round(s.support.damage),
  };
}
