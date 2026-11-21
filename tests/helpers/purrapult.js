import { createGame } from "../../src/game.js";
import { LEVEL_TWO } from "../../src/levels.js";
import { createAim } from "./strategies.js";

export const PURRAPULT_STRATEGIES = [
  "passive",
  "artillery-rush",
  "gates",
  "artillery-first",
  "gates-first",
];

export function purrapultAim(strategy, level = LEVEL_TWO) {
  const [starter, strong, final] = level.gates.map((gate) => gate.x);
  const artillery = level.support.x;
  const aimedGates = createAim("C");
  const positions = { 210: starter, 90: strong, 329: final };
  let strongAt;
  return (s) => {
    if (strategy === "passive") return starter;
    if (strategy === "artillery-rush") return artillery;
    if (strategy === "gates") return positions[aimedGates(s)];
    if (s.gates[2].open) return final;

    if (strategy === "artillery-first" && !s.support.open) {
      if (s.t < 6) return starter;
      return (s.t - 6) % 3.0 < 1.3 ? starter : artillery;
    }
    if (!s.gates[1].open) {
      const start = s.support.unlockedAt ?? 6;
      if (s.t < start) return starter;
      return (s.t - start) % 4 < 0.9 ? starter : strong;
    }

    strongAt ??= s.t;
    const reserve = s.t - strongAt;
    if (reserve < 5) return strong;
    if (!s.support.open) {
      return (reserve - 5) % 4 < 2.1 ? strong : artillery;
    }
    const attack = s.t - Math.max(strongAt + 5, s.support.unlockedAt);
    return attack % 5.1 < 1.85 ? strong : final;
  };
}

const round = (n) => (n === null ? null : Math.round(n * 100) / 100);

export function simulatePurrapult(strategy, hz = 60, level = LEVEL_TWO) {
  const game = createGame({ level, random: () => 0.5 });
  game.reset();
  const s = game.state;
  const aim = purrapultAim(strategy, level);
  let furthest = s.front;
  let firstImpact = null;
  const gateTimes = [];
  while (s.mode === "playing" && s.t < 200) {
    s.gunX = aim(s);
    game.update(1 / hz);
    furthest = Math.max(furthest, s.front);
    if (s.support.impacts > 0) firstImpact ??= s.support.impact.at;
    for (let i = 1; i < s.gates.length; i++) {
      if (s.gates[i].open) gateTimes[i - 1] ??= round(s.t);
    }
  }
  return {
    strategy,
    hz,
    won: s.mode === "victory",
    seconds: round(s.t),
    furthest: round(furthest),
    unlocked: round(s.support.unlockedAt),
    firstImpact: round(firstImpact),
    gateTimes,
    shots: s.support.shotsFired,
    impacts: s.support.impacts,
    artilleryLoss: round(s.support.damage),
  };
}
