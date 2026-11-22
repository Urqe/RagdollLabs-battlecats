import { createGame } from "../src/game.js";
import { LEVEL_TWO, LEVEL_THREE } from "../src/levels.js";
import { meowmenAim } from "../tests/helpers/meowmen.js";
import { purrapultAim } from "../tests/helpers/purrapult.js";

const plans = [
  [LEVEL_TWO, purrapultAim, "gates", "artillery-first", "gates-first", "artillery-rush"],
  [LEVEL_THREE, meowmenAim, "gates", "archer-first", "balanced", "support-only"],
];

function measure(level, aimFor, strategy, hz, inert = false) {
  const support = inert ? { ...level.support, damage: 0, damagePerArrow: 0 } : level.support;
  let gate99Arrivals = 0;
  let firstHit = null;
  const game = createGame({
    level: { ...level, support },
    random: () => 0.5,
    onEffect(kind, at, value) {
      if (kind === "arrival" && value.mult === 99) gate99Arrivals += value.count;
      if ((kind === "artilleryImpact" || kind === "archerImpact") && value.loss > 0) {
        firstHit ??= { at, loss: value.loss };
      }
    },
  });
  game.reset();
  const { state } = game;
  const aim = aimFor(strategy, level);
  while (state.mode === "playing" && state.t < 200) {
    state.gunX = aim(state);
    game.update(1 / hz);
  }
  return {
    level: level.number, strategy, hz, inert, outcome: state.mode,
    seconds: state.t, blue: state.blueTotal, red: state.redTotal,
    unlocked: state.support.unlockedAt, firstHit,
    damage: state.support.damage, impacts: state.support.impacts, gate99Arrivals,
  };
}

const results = [];
for (const [level, aimFor, gates, first, balanced, only] of plans) {
  for (const hz of [30, 60, 120]) {
    for (const strategy of [gates, first, balanced, only]) {
      results.push(measure(level, aimFor, strategy, hz));
    }
    for (const strategy of [first, balanced]) {
      results.push(measure(level, aimFor, strategy, hz, true));
    }
  }
}
console.log(JSON.stringify(results, null, 2));
