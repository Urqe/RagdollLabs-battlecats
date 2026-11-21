import { createGame } from "../../src/game.js";
// Policies observe state and aim only. They never grant troops, damage or gates.
export function createAim(strategy) {
  let gate99At = null;
  return (s) => {
    if (strategy === "A") return 210;
    if (s.gates[2].open) return 329;
    if (strategy === "B") {
      if (!s.gates[1].open) return 90;
      gate99At ??= s.t;
      if (s.t - gate99At < 4) return 90;
      return 329;
    }
    if (!s.gates[1].open) return s.t % 4 < 2 ? 210 : 90;
    // Refill the combat reserve before spending more volleys on wood.
    return s.blueTotal < 1800 ? 90 : 329;
  };
}
export function simulate(
  strategy,
  { dt = 1 / 60, delay = 0, aimOffset = 0 } = {},
) {
  const aim = createAim(strategy);
  let won = null;
  const game = createGame({
    onEnd: (value) => (won = value),
    random: () => 0.5,
  });
  game.reset();
  const s = game.state;
  let furthest = s.front,
    activation = null,
    minAfterActivation = Infinity,
    atActivation = null;
  const milestones = [];
  while (s.mode === "playing" && s.t < 240) {
    const target = s.t < delay ? 210 : aim(s);
    s.gunX = target + aimOffset;
    const before = s.gates.map((g) => g.open);
    game.update(dt);
    for (let i = 1; i < 3; i++)
      if (!before[i] && s.gates[i].open)
        milestones.push({ gate: s.gates[i].mult, time: +s.t.toFixed(2) });
    furthest = Math.max(furthest, s.front);
    if (s.finalActivated) {
      if (activation === null) {
        activation = s.t;
        atActivation = s.front;
      }
      minAfterActivation = Math.min(minAfterActivation, s.front);
    }
  }
  return {
    strategy,
    won,
    seconds: +s.t.toFixed(2),
    furthest: +furthest.toFixed(2),
    activation: activation === null ? null : +activation.toFixed(2),
    pushback:
      activation === null ? 0 : +(atActivation - minAfterActivation).toFixed(2),
    milestones,
    red: s.redTotal,
    blue: s.blueTotal,
    state: s,
  };
}
